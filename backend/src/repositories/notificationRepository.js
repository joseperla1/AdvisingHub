const { notifications } = require('../data/notificationStore');

function create(notification) {
  notifications.push(notification);
  return notification;
}

function findAll() {
  return notifications;
}

function findByUserId(userId) {
  return notifications.filter(n => n.userId === userId);
}

module.exports = {
  create,
  findAll,
  findByUserId,
};