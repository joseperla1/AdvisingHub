const historyService = require('../services/historyService');

async function getUserHistory(req, res, next) {
  try {
    const { userId } = req.params;
    const history = await historyService.getHistoryByUserId(userId);

    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getUserHistory
};