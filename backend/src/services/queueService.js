const queueRepository = require('../repositories/queueRepository');
const serviceRepository = require('../repositories/serviceRepository');
const { httpError } = require('../utils/httpError');
const { generateQueueId } = require('../utils/idGenerator');
const { validateJoinQueuePayload } = require('../validators/queueValidators');
const notificationService = require('./notificationService');

class QueueService {
  buildQueueSnapshotByUser(queueRows) {
    const map = new Map();
    queueRows
      .filter(row => row.status === 'waiting' || row.status === 'serving')
      .forEach(row => {
        map.set(row.userId, {
          queueId: row.id,
          serviceName: row.serviceName,
          position: row.position,
          estimatedWaitMin: row.estimatedWaitMin,
          status: row.status,
        });
      });
    return map;
  }

  async notifyQueueProgressChanges(previousByUser) {
    const current = await this.getCurrentQueueWithEstimates();
    const currentByUser = this.buildQueueSnapshotByUser(current);

    const notifications = [];
    for (const [userId, before] of previousByUser.entries()) {
      const after = currentByUser.get(userId);
      if (!after || after.status !== 'waiting') continue;

      const movedUp =
        Number.isFinite(before.position) &&
        Number.isFinite(after.position) &&
        after.position < before.position;
      const etaChanged =
        Number.isFinite(before.estimatedWaitMin) &&
        Number.isFinite(after.estimatedWaitMin) &&
        after.estimatedWaitMin !== before.estimatedWaitMin;

      if (!movedUp && !etaChanged) continue;

      const movementPart = movedUp
        ? `You moved up in line to #${after.position}.`
        : `Your queue position is #${after.position}.`;
      const etaPart = etaChanged
        ? ` Updated wait time: ${after.estimatedWaitMin} min.`
        : '';

      notifications.push(
        notificationService.createNotification({
          userId,
          queueId: after.queueId,
          type: 'queue_progress',
          title: 'Queue update',
          message: `${movementPart}${etaPart}`,
          meta: {
            previousPosition: before.position,
            position: after.position,
            previousEstimatedWaitMin: before.estimatedWaitMin,
            estimatedWaitMin: after.estimatedWaitMin,
            serviceName: after.serviceName,
          },
        })
      );
    }

    await Promise.all(notifications);
  }

  getPriorityRank(priority) {
    const ranks = {
      high: 0,
      medium: 1,
      normal: 2,
      low: 3
    };

    return ranks[priority] ?? 2;
  }

  sortQueue(queueItems) {
    return [...queueItems].sort((a, b) => {
      const priorityDiff =
        this.getPriorityRank(a.priority) - this.getPriorityRank(b.priority);

      if (priorityDiff !== 0) return priorityDiff;

      return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
    });
  }

  async getCurrentQueue() {
    const items = await queueRepository.findAll();
    const activeItems = items.filter(item => item.status === 'waiting' || item.status === 'serving');
    return this.sortQueue(activeItems);
  }

  async getCurrentQueueWithEstimates() {
    const sorted = await this.getCurrentQueue();
    const services = await serviceRepository.findAll();
    const durationByServiceId = new Map(
      services.map(s => [String(s.id), Number(s.expectedDurationMin ?? 20)])
    );

    const getDuration = (serviceId) => {
      const d = durationByServiceId.get(String(serviceId));
      return Number.isFinite(d) && d > 0 ? d : 20;
    };

    let cumulative = 0;
    return sorted.map((item, idx) => {
      const estimatedWaitMin =
        item.status === 'serving' ? 0 : Math.max(0, cumulative);

      cumulative += getDuration(item.serviceId);

      return {
        ...item,
        position: idx + 1,
        estimatedWaitMin,
      };
    });
  }

  async getSmartWaitEstimate(serviceId) {
  if (!serviceId) {
    throw httpError(400, 'serviceId is required.');
  }

  const services = await serviceRepository.findAll();

  const selectedService = services.find(
    s => String(s.id) === String(serviceId) || String(s.serviceId) === String(serviceId)
  );

  if (!selectedService) {
    throw httpError(404, 'Service not found.');
  }

    const currentQueue = await this.getCurrentQueueWithEstimates();

    const sameServiceQueue = currentQueue.filter(
      item =>
        String(item.serviceId) === String(serviceId) &&
        (item.status === 'waiting' || item.status === 'serving')
    );

    const peopleAhead = sameServiceQueue.length;

    const expectedDurationMin = Number(
  selectedService.expectedDurationMin ??
  selectedService.expected_duration_min ??
  20
);
    const safeExpectedDurationMin =
      Number.isFinite(expectedDurationMin) && expectedDurationMin > 0
        ? expectedDurationMin
        : 20;

    const estimatedWaitMin = peopleAhead * safeExpectedDurationMin;

    let recommendation = 'This is a good time to join the queue.';

    if (estimatedWaitMin === 0) {
      recommendation = 'There is currently no wait for this service.';
    } else if (estimatedWaitMin >= 45) {
      recommendation = 'The wait is currently long. Consider joining later if your issue is not urgent.';
    } else if (estimatedWaitMin >= 20) {
      recommendation = 'The queue is moderately busy. You can join now, but expect a short wait.';
    }

    return {
      serviceId: String(serviceId),
      serviceName: selectedService.name || selectedService.serviceName || selectedService.service_name,
      estimatedWaitMin,
      peopleAhead,
      expectedDurationMin: safeExpectedDurationMin,
      recommendation,
    };
  }

  /** Active queue row for a user (waiting or serving), with computed position and ETA minutes. */
  async getActiveQueueEntryForUser(userId) {
    if (!userId || typeof userId !== 'string') {
      throw httpError(400, 'userId is required.');
    }

    const withEst = await this.getCurrentQueueWithEstimates();
    const found = withEst.find(i => i.userId === userId);
    if (!found) return null;

    return {
      queueItem: {
        id: found.id,
        userId: found.userId,
        name: found.name,
        studentId: found.studentId,
        serviceId: found.serviceId,
        serviceName: found.serviceName,
        priority: found.priority,
        status: found.status,
        joinedAt: found.joinedAt,
        notes: found.notes,
      },
      position: found.position,
      estimatedWaitMin: found.estimatedWaitMin,
    };
  }

  async joinQueue(payload) {
    const previousSnapshot = this.buildQueueSnapshotByUser(
      await this.getCurrentQueueWithEstimates()
    );
    const validationErrors = validateJoinQueuePayload(payload);
    if (validationErrors.length > 0) {
      throw httpError(400, validationErrors.join(' '));
    }

    const normalizedUserId =
      typeof payload.userId === 'string' ? payload.userId.trim() : '';

    const normalizedStudentId =
      typeof payload.studentId === 'string' && payload.studentId.trim().length > 0
        ? payload.studentId.trim()
        : normalizedUserId;

    const normalizedName =
      typeof payload.name === 'string' ? payload.name.trim() : '';

    const normalizedServiceId =
      typeof payload.serviceId === 'string' ? payload.serviceId.trim() : '';

    const normalizedServiceName =
      typeof payload.serviceName === 'string' && payload.serviceName.trim().length > 0
        ? payload.serviceName.trim()
        : normalizedServiceId;

    const existingQueueEntry = await queueRepository.findByStudentId(normalizedStudentId);

    if (
      existingQueueEntry &&
      (existingQueueEntry.status === 'waiting' || existingQueueEntry.status === 'serving')
    ) {
      throw httpError(409, 'Student is already in the queue.');
    }

    const notes =
      typeof payload.notes === 'string' && payload.notes.trim().length > 0
        ? payload.notes.trim().slice(0, 500)
        : undefined;

    const newQueueItem = {
      id: generateQueueId(),
      userId: normalizedUserId,
      name: normalizedName,
      studentId: normalizedStudentId,
      serviceId: normalizedServiceId,
      serviceName: normalizedServiceName,
      priority: payload.priority || 'normal',
      status: 'waiting',
      entrySource:
        payload.entrySource === 'appointment' || payload.entrySource === 'admin'
          ? payload.entrySource
          : payload.appointmentId
            ? 'appointment'
            : 'walk-in',
      appointmentId: payload.appointmentId ?? null,
      ...(notes ? { notes } : {}),
    };

    const createdQueueItem = await queueRepository.create(newQueueItem);

    const historyService = require('./historyService');
    await historyService.addHistoryEntry({
      userId: createdQueueItem.userId,
      studentId: createdQueueItem.studentId,
      queueId: createdQueueItem.id,
      name: createdQueueItem.name,
      serviceId: createdQueueItem.serviceId,
      serviceName: createdQueueItem.serviceName,
      action: 'joined',
      status: createdQueueItem.status
    });

    let user = { id: payload.userId, name: payload.name };
    try {
      const userService = require('./user.service');
      const foundUser = await userService.findUserById(payload.userId);
      if (foundUser) user = foundUser;
    } catch (e) {
      /* fallback to payload */
    }

    const withEst = await this.getCurrentQueueWithEstimates();
    const found = withEst.find(q => q.id === createdQueueItem.id);
    const position = found?.position ?? 1;
    const estimatedWaitMin = found?.estimatedWaitMin ?? 0;

    const notification = notificationService.notifyQueueJoined(
      user,
      createdQueueItem,
      position
    );
    await this.notifyQueueProgressChanges(previousSnapshot);

    return {
      queueItem: createdQueueItem,
      notification,
      position,
      estimatedWaitMin,
    };
  }

  async leaveQueue(queueId, options = {}) {
    const previousSnapshot = this.buildQueueSnapshotByUser(
      await this.getCurrentQueueWithEstimates()
    );
    const queueItem = await queueRepository.findById(queueId);
    if (!queueItem) {
      throw httpError(404, 'Queue item not found.');
    }

    if (queueItem.status !== 'waiting') {
      throw httpError(409, 'Only waiting users can leave the queue.');
    }

    const updated = await queueRepository.updateById(queueId, {
      status: 'left',
      cancelReason: options.cancelReason || 'student_left',
      ...(options.adminUserId ? { servedByAdminUserId: options.adminUserId } : {}),
    });

    const historyService = require('./historyService');
    await historyService.addHistoryEntry({
      userId: updated.userId,
      studentId: updated.studentId,
      queueId: updated.id,
      name: updated.name,
      serviceId: updated.serviceId,
      serviceName: updated.serviceName,
      action: 'left',
      status: updated.status
    });

    await this.notifyQueueProgressChanges(previousSnapshot);

    return updated;
  }

  async serveNextUser(options = {}) {
    const previousSnapshot = this.buildQueueSnapshotByUser(
      await this.getCurrentQueueWithEstimates()
    );
    const adminUserId = typeof options.adminUserId === 'string' ? options.adminUserId.trim() : '';
    if (!adminUserId) {
      throw httpError(400, 'adminUserId is required.');
    }
    const currentlyServingByAdmin = await queueRepository.findServingByAdmin(adminUserId);
    if (currentlyServingByAdmin) {
      throw httpError(409, 'You already have a student in service. Complete or no-show that student first.');
    }

    const updated = await queueRepository.claimNextWaitingForAdmin(adminUserId);
    if (!updated) {
      throw httpError(404, 'No waiting users in the queue.');
    }

    try {
      const userService = require('./user.service');
      const foundUser = await userService.findUserById(updated.userId);
      notificationService.notifyAlmostReady(foundUser || { id: updated.userId, name: updated.name }, updated, 1);
    } catch (e) {
      notificationService.notifyAlmostReady({ id: updated.userId, name: updated.name }, updated, 1);
    }

    try {
      const userService = require('./user.service');
      const foundUser = await userService.findUserById(updated.userId);
      notificationService.notifyNowServing(foundUser || { id: updated.userId, name: updated.name }, updated);
    } catch (e) {
      notificationService.notifyNowServing({ id: updated.userId, name: updated.name }, updated);
    }

    const historyService = require('./historyService');
    await historyService.addHistoryEntry({
      userId: updated.userId,
      studentId: updated.studentId,
      queueId: updated.id,
      name: updated.name,
      serviceId: updated.serviceId,
      serviceName: updated.serviceName,
      action: 'serving',
      status: updated.status
    });

    await this.notifyQueueProgressChanges(previousSnapshot);

    return updated;
  }

  async markNoShow(queueId, options = {}) {
    const previousSnapshot = this.buildQueueSnapshotByUser(
      await this.getCurrentQueueWithEstimates()
    );
    const queueItem = await queueRepository.findById(queueId);
    if (!queueItem) {
      throw httpError(404, 'Queue item not found.');
    }

    if (queueItem.status !== 'serving' && queueItem.status !== 'waiting') {
      throw httpError(409, 'Only waiting or serving users can be marked as no-show.');
    }
    const adminUserId = typeof options.adminUserId === 'string' ? options.adminUserId.trim() : '';
    if (
      queueItem.status === 'serving' &&
      queueItem.servedByAdminUserId &&
      adminUserId &&
      queueItem.servedByAdminUserId !== adminUserId
    ) {
      throw httpError(409, 'This user is being served by another advisor.');
    }

    const updated = await queueRepository.updateById(queueId, {
      status: 'no-show',
      cancelReason: options.cancelReason || 'no_show',
      ...(adminUserId ? { servedByAdminUserId: adminUserId } : {}),
    });

    const historyService = require('./historyService');
    await historyService.addHistoryEntry({
      userId: updated.userId,
      studentId: updated.studentId,
      queueId: updated.id,
      name: updated.name,
      serviceId: updated.serviceId,
      serviceName: updated.serviceName,
      action: 'no-show',
      status: updated.status
    });

    await this.notifyQueueProgressChanges(previousSnapshot);

    return updated;
  }

  async completeServing(queueId, options = {}) {
    const previousSnapshot = this.buildQueueSnapshotByUser(
      await this.getCurrentQueueWithEstimates()
    );
    const queueItem = await queueRepository.findById(queueId);
    if (!queueItem) {
      throw httpError(404, 'Queue item not found.');
    }

    if (queueItem.status !== 'serving') {
      throw httpError(409, 'Only a serving user can be completed.');
    }
    const adminUserId = typeof options.adminUserId === 'string' ? options.adminUserId.trim() : '';
    if (
      queueItem.servedByAdminUserId &&
      adminUserId &&
      queueItem.servedByAdminUserId !== adminUserId
    ) {
      throw httpError(409, 'This user is being served by another advisor.');
    }

    const updated = await queueRepository.updateById(queueId, {
      status: 'served',
      ...(adminUserId ? { servedByAdminUserId: adminUserId } : {}),
    });

    const historyService = require('./historyService');
    await historyService.addHistoryEntry({
      userId: updated.userId,
      studentId: updated.studentId,
      queueId: updated.id,
      name: updated.name,
      serviceId: updated.serviceId,
      serviceName: updated.serviceName,
      action: 'served',
      status: updated.status
    });

    await this.notifyQueueProgressChanges(previousSnapshot);

    return updated;
  }

  async getAdminQueueMetrics() {
    const completedToday = await queueRepository.countCompletedToday();
    return { completedToday };
  }
}

module.exports = new QueueService();