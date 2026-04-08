const notificationRepository = require('../repositories/notificationRepository');

async function getForUser(req, res, next) {
  try {
    const { userId } = req.params;
    const rows = await notificationRepository.findByUserId(userId);
    res.status(200).json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  getForUser,
};
