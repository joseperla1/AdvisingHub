const queueRepository = require('../repositories/queueRepository');
const { httpError } = require('../utils/httpError');
const { generateQueueId } = require('../utils/idGenerator');
const { validateJoinQueuePayload } = require('../validators/queueValidators');

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
      const priorityDiff = this.getPriorityRank(a.priority) - this.getPriorityRank(b.priority);
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

    const existingQueueEntry = await queueRepository.findByStudentId(payload.studentId);
    if (existingQueueEntry && (existingQueueEntry.status === 'waiting' || existingQueueEntry.status === 'serving')) {
      throw httpError(409, 'Student is already in the queue.');
    }

    const newQueueItem = {
      id: generateQueueId(),
      userId: payload.userId,
      name: payload.name.trim(),
      studentId: payload.studentId.trim(),
      serviceId: payload.serviceId.trim(),
      serviceName: payload.serviceName.trim(),
      priority: payload.priority || 'normal',
      status: 'waiting',
      joinedAt: new Date().toISOString()
    };

    return queueRepository.create(newQueueItem);
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

    return queueRepository.updateById(nextUser.id, {
      status: 'serving'
    });
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

    return queueRepository.updateById(queueId, {
      status: 'served'
    });
  }
}

module.exports = new QueueService();