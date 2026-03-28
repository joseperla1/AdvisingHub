const queueRepository = require('../repositories/queueRepository');
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
    const activeItems = items.filter(
      item => item.status === 'waiting' || item.status === 'serving'
    );

    return this.sortQueue(activeItems);
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

    const newQueueItem = {
      id: generateQueueId(),
      userId: normalizedUserId,
      name: normalizedName,
      studentId: normalizedStudentId,
      serviceId: normalizedServiceId,
      serviceName: normalizedServiceName,
      priority: payload.priority || 'normal',
      status: 'waiting',
      joinedAt: new Date().toISOString()
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
      const foundUser = userService.findUserById(payload.userId);
      if (foundUser) user = foundUser;
    } catch (e) {
      /* fallback to payload */
    }

    const allQueue = await this.getCurrentQueue();
    const position = allQueue.findIndex(q => q.id === createdQueueItem.id) + 1;

    const notification = notificationService.notifyQueueJoined(
      user,
      createdQueueItem,
      position
    );

    return { queueItem: createdQueueItem, notification };
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
    const items = await queueRepository.findAll();

    const currentlyServing = items.find(item => item.status === 'serving');
    if (currentlyServing) {
      throw httpError(409, 'A user is already being served.');
    }

    const waitingItems = items.filter(item => item.status === 'waiting');
    if (waitingItems.length === 0) {
      throw httpError(404, 'No waiting users in the queue.');
    }

    const sortedWaitingItems = this.sortQueue(waitingItems);
    const nextUser = sortedWaitingItems[0];

    for (let i = 0; i < Math.min(2, sortedWaitingItems.length); i++) {
      const queueItem = sortedWaitingItems[i];

      let user = { id: queueItem.userId, name: queueItem.name };
      try {
        const userService = require('./user.service');
        const foundUser = userService.findUserById(queueItem.userId);
        if (foundUser) user = foundUser;
      } catch (e) {
        /* fallback to queueItem */
      }

      notificationService.notifyAlmostReady(user, queueItem, i + 1);
    }

    const updated = await queueRepository.updateById(nextUser.id, {
      status: 'serving'
    });

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

    return queueRepository.updateById(queueId, {
      status: 'no-show'
    });
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