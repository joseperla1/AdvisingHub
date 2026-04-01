const historyItems = require('../data/historyStore');
const { generateQueueId } = require('../utils/idGenerator');

class HistoryService {
  async addHistoryEntry(payload) {
    const newHistoryEntry = {
      id: generateQueueId(),
      userId: payload.userId,
      studentId: payload.studentId,
      queueId: payload.queueId,
      name: payload.name,
      serviceId: payload.serviceId,
      serviceName: payload.serviceName,
      action: payload.action,
      status: payload.status,
      timestamp: new Date().toISOString()
    };

    historyItems.push(newHistoryEntry);
    return newHistoryEntry;
  }

  async getHistoryByUserId(userId) {
    return historyItems
      .filter(item => item.userId === userId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
}

module.exports = new HistoryService();