const { Sequelize } = require('sequelize');
const ExistingAttendanceProcess = require('../models/existingAttendanceProcess');
const message = require('../response_message/message');
const sequelize = require('../config/database');
const MomDetails = require('../models/momDetails');

exports.addExistingAttendanceProcess = async (req, res, next) => {
  try {
    const { attendanceProcessName } = req.body;
    const get_one_data = await ExistingAttendanceProcess.findOne({
      where: {
        [Sequelize.Op.and]: [
          Sequelize.where(
            Sequelize.fn(
              'LOWER',
              Sequelize.fn('TRIM', Sequelize.col('attendanceProcessName')),
            ),
            Sequelize.Op.eq,
            attendanceProcessName.trim().toLowerCase(),
          ),
        ],
        status: [0, 1],
      },
    });
    if (get_one_data) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyExists(
          'Existing Attendance Process With Same name',
        ),
      });
    }
    await ExistingAttendanceProcess.create(
      {
        attendanceProcessName,
      },
      { user: req.userDetails },
    );
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Existing Attendance Process'),
    });
  } catch (err) {
    next(err);
  }
};
exports.getAllExistingAttendanceProcess = async (req, res, next) => {
  try {
    const { limit, page, searchQuery } = req.body;
    const condition = {};
    if (searchQuery) {
      condition[Sequelize.Op.or] = [
        {
          attendanceProcessName: {
            [Sequelize.Op.iLike]: `%${searchQuery}%`,
          },
        },
      ];
    }
    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const { rows, count } = await ExistingAttendanceProcess.findAndCountAll({
      where: condition,
      ...paginationQuery,
      order: [['createdAt', 'DESC']],
    });
    return res.status(200).json({
      status: 200,
      data: rows,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};
exports.getExistingAttendanceProcessById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const data = await ExistingAttendanceProcess.findOne({
      where: { attendanceProcessID: id },
    });
    return res.status(200).json({ status: 200, data: data });
  } catch (err) {
    next(err);
  }
};
exports.updateExistingAttendanceProcess = async (req, res, next) => {
  try {
    const { attendanceProcessName, attendanceProcessID } = req.body;

    const existingPolicyName = await ExistingAttendanceProcess.findOne({
      where: {
        [Sequelize.Op.and]: [
          sequelize.where(
            sequelize.fn(
              'TRIM',
              sequelize.fn('LOWER', sequelize.col('attendanceProcessName')),
            ),
            attendanceProcessName.trim().toLowerCase(),
          ),
          { attendanceProcessID: { [Sequelize.Op.ne]: attendanceProcessID } },
          { status: [0, 1] },
        ],
      },
    });

    if (existingPolicyName) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyExists(
          'Existing Attendance Process With Same Name',
        ),
      });
    }

    await ExistingAttendanceProcess.update(
      { attendanceProcessName },
      {
        where: { attendanceProcessID: attendanceProcessID },
        user: req.userDetails,
        individualHooks: true,
      },
    );
    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Existing Attendance Process'),
    });
  } catch (err) {
    next(err);
  }
};
exports.deleteExistingAttendanceProcess = async (req, res, next) => {
  try {
    const { attendanceProcessID } = req.body;
    const findMOMWithSameProcess = await MomDetails.findOne({
      where: { attendanceProcessID: attendanceProcessID },
    });
    if (findMOMWithSameProcess) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyExists(
          'MOM With Same Existing Attendance Process',
        ),
      });
    }
    await ExistingAttendanceProcess.destroy({
      where: { attendanceProcessID: attendanceProcessID },
      user: req.userDetails,
      individualHooks: true,
    });
    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Existing Attendance Process'),
    });
  } catch (err) {
    next(err);
  }
};
exports.getAllActiveExistingAttendanceProcess = async (req, res, next) => {
  try {
    const condition = {
      status: 1,
    };

    const { rows, count } = await ExistingAttendanceProcess.findAndCountAll({
      where: condition,
      order: [['attendanceProcessName', 'ASC']],
    });
    return res.status(200).json({
      status: 200,
      data: rows,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};
