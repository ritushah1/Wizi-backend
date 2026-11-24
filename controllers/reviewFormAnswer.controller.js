const { statusCodes } = require('../utils/commonVars');
const { usermessage } = require('../response_message/message');
const sequelize = require('../config/database');
const ReviewFormAnswers = require('../models/reviewFormAnswers');

exports.bulkInsertUpdateReviewFormAnswers = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    await ReviewFormAnswers.bulkCreate(req.body, {
      user: req.userDetails,
      transaction,
      updateOnDuplicate: ['text', 'rating', 'grade'],
    });
    await transaction.commit();
    return res.status(statusCodes.OK).json({
      message: usermessage.addMessage('Review form answers'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};
