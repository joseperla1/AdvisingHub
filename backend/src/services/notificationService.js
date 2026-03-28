const notificationRepo = require('../repositories/notificationRepository');

function createNotification({ userId, queueId, type, title, message, meta = {} }) {
  const notification = {
    id: `notif_${Date.now()}`,
    userId,
    queueId,
    type,
    title,
    message,
    createdAt: new Date().toISOString(),
    meta,
  };

  console.log('[NOTIFICATION]', notification); // logging requirement
  return notificationRepo.create(notification);
}

// When user joins queue
function notifyQueueJoined(user, queueItem, position) {
  return createNotification({
    userId: user.id,
    queueId: queueItem.id,
    type: 'queue_joined',
    title: 'Joined queue',
    message: `${user.name} joined ${queueItem.serviceName} at position ${position}.`,
    meta: { position },
  });
}

// When user is close (top 2)
function notifyAlmostReady(user, queueItem, position) {
  return createNotification({
    userId: user.id,
    queueId: queueItem.id,
    type: 'almost_ready',
    title: 'Almost your turn',
    message: `${user.name}, you're #${position}. Please be ready.`,
    meta: { position },
  });
}

module.exports = {
  notifyQueueJoined,
  notifyAlmostReady,
  createNotification,
};