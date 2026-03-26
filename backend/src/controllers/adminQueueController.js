const queueService = require('../services/queueService');

async function getCurrentQueue(req, res, next) {
  try {
    const queue = await queueService.getCurrentQueue();

    res.status(200).json({
      success: true,
      data: queue
    });
  } catch (error) {
    next(error);
  }
}

async function serveNextUser(req, res, next) {
  try {
    const servedUser = await queueService.serveNextUser();

    res.status(200).json({
      success: true,
      message: 'Next user is now being served.',
      data: servedUser
    });
  } catch (error) {
    next(error);
  }
}
async function markNoShow(req, res, next) {
  try {
    const updatedUser = await queueService.markNoShow(req.params.queueId);

    res.status(200).json({
      success: true,
      message: 'User marked as no-show.',
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
}

async function completeServing(req, res, next) {
  try {
    const completedUser = await queueService.completeServing(req.params.queueId);

    res.status(200).json({
      success: true,
      message: 'Serving user marked as completed.',
      data: completedUser
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCurrentQueue,
  serveNextUser,
  completeServing,
  markNoShow
};