const { Sequelize } = require('sequelize');
const sequelize = require('../config/database');
const TeamOvertimePlanning = require('../models/teamOvertimePlanning');
const TeamOvertimePlanningDetails = require('../models/teamOvertimePlanningDetails');
const message = require('../response_message/message');
const UserMaster = require('../models/userMaster');

exports.removeTeamOvertimePlanningDetails = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { teamOvertimePlanningDetailsID } = req.body;
    if (!teamOvertimePlanningDetailsID) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.ValidParameters,
      });
    }

    await TeamOvertimePlanningDetails.destroy({
      where: {
        teamOvertimePlanningDetailsID,
      },
      user: req.userDetails,
      transaction,
      individualHooks: true,
    });

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage(
        'Team Overtime Planning Details',
      ),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};
