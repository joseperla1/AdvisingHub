const { queueItems } = require('../data/queueStore');

class QueueRepository {
  async findAll() {
    return [...queueItems];
  }

  async findById(id) {
    return queueItems.find(item => item.id === id) || null;
  }

  async findByStudentId(studentId) {
    return queueItems.find(item => item.studentId === studentId) || null;
  }

  async create(queueItem) {
    queueItems.push(queueItem);
    return queueItem;
  }

  async updateById(id, updates) {
    const index = queueItems.findIndex(item => item.id === id);
    if (index === -1) return null;

    queueItems[index] = { ...queueItems[index], ...updates };
    return queueItems[index];
  }

  async removeById(id) {
    const index = queueItems.findIndex(item => item.id === id);
    if (index === -1) return false;

    queueItems.splice(index, 1);
    return true;
  }
}

module.exports = new QueueRepository();