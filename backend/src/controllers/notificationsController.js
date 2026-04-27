const notificationRepository = require('../repositories/notificationRepository');

async function getForUser(req, res, next) {
  try {
    const { userId } = req.params;
    await notificationRepository.ensureTodayAppointmentReminders(userId);
    const rows = await notificationRepository.findByUserId(userId);
    res.status(200).json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
}

async function markRead(req, res, next) {
  try {
    const { userId, notificationId } = req.params;
    await notificationRepository.markReadForUser(userId, notificationId);
    res.status(200).json({ success: true });
  } catch (e) {
    next(e);
  }
}

async function dismiss(req, res, next) {
  try {
    const { userId, notificationId } = req.params;
    await notificationRepository.dismissForUser(userId, notificationId);
    res.status(200).json({ success: true });
  } catch (e) {
    next(e);
  }
}

async function markAllRead(req, res, next) {
  try {
    const { userId } = req.params;
    await notificationRepository.markAllReadForUser(userId);
    res.status(200).json({ success: true });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  getForUser,
  markRead,
  dismiss,
  markAllRead,
};
