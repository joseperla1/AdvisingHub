const queueRepository = require('../repositories/queueRepository');
const serviceRepository = require('../repositories/serviceRepository');
const { httpError } = require('../utils/httpError');
const { generateQueueId } = require('../utils/idGenerator');
const { validateJoinQueuePayload } = require('../validators/queueValidators');
const notificationService = require('./notificationService');

class QueueService {
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

    return {
      queueItem: createdQueueItem,
      notification,
      position,
      estimatedWaitMin,
    };
  }

  async leaveQueue(queueId) {
    const queueItem = await queueRepository.findById(queueId);
    if (!queueItem) {
      throw httpError(404, 'Queue item not found.');
    }

    if (queueItem.status !== 'waiting') {
      throw httpError(409, 'Only waiting users can leave the queue.');
    }

    const updated = await queueRepository.updateById(queueId, {
      status: 'left'
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

    return updated;
  }

  async serveNextUser() {
    const currentlyServing = await queueRepository.findServing();
    if (currentlyServing) {
      throw httpError(409, 'A user is already being served.');
    }

    const nextUser = await queueRepository.findNextWaiting();
    if (!nextUser) {
      throw httpError(404, 'No waiting users in the queue.');
    }

    // Notify next user (position 1) as almost ready (keeps prior logging behavior)
    try {
      const userService = require('./user.service');
      const foundUser = await userService.findUserById(nextUser.userId);
      notificationService.notifyAlmostReady(foundUser || { id: nextUser.userId, name: nextUser.name }, nextUser, 1);
    } catch (e) {
      notificationService.notifyAlmostReady({ id: nextUser.userId, name: nextUser.name }, nextUser, 1);
    }

    const updated = await queueRepository.updateById(nextUser.id, {
      status: 'serving'
    });

    // Notify the served student
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

    return updated;
  }

  async markNoShow(queueId) {
    const queueItem = await queueRepository.findById(queueId);
    if (!queueItem) {
      throw httpError(404, 'Queue item not found.');
    }

    if (queueItem.status !== 'serving' && queueItem.status !== 'waiting') {
      throw httpError(409, 'Only waiting or serving users can be marked as no-show.');
    }

    const updated = await queueRepository.updateById(queueId, {
      status: 'no-show'
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

    return updated;
  }

  async completeServing(queueId) {
    const queueItem = await queueRepository.findById(queueId);
    if (!queueItem) {
      throw httpError(404, 'Queue item not found.');
    }

    if (queueItem.status !== 'serving') {
      throw httpError(409, 'Only a serving user can be completed.');
    }

    const updated = await queueRepository.updateById(queueId, {
      status: 'served'
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

    return updated;
  }
}

module.exports = new QueueService();