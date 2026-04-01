const queueService = require('../services/queueService');

async function joinQueue(req, res, next) {
  try {
    const result = await queueService.joinQueue(req.body);

    res.status(201).json({
      success: true,
      message: 'User joined queue successfully.',
      data: {
        queueItem: result.queueItem,
        position: result.position,
        estimatedWaitMin: result.estimatedWaitMin,
        notification: result.notification,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getActiveQueueEntry(req, res, next) {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId query parameter is required.',
      });
    }

    const data = await queueService.getActiveQueueEntryForUser(String(userId));

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function leaveQueue(req, res, next) {
  try {
    const queueItem = await queueService.leaveQueue(req.params.queueId);

    res.status(200).json({
      success: true,
      message: 'User left queue successfully.',
      data: queueItem
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  joinQueue,
  leaveQueue,
  getActiveQueueEntry,
};