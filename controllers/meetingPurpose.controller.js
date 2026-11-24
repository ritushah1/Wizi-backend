const companyMaster = require('../models/companyMaster');
const MeetingPurpose = require('../models/meetingPurpose');
const UserMaster = require('../models/userMaster');
const message = require('../response_message/message');
const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const { generateExcel } = require('../utils/exportData');
const moment = require('moment');
const VisitMeetings = require('../models/visitMeetings');

exports.addMeetingPurpose = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { meetingPurpose, companyMasterID, description } = await req.body;

    const find_SameData = await MeetingPurpose.findOne({
      where: {
        companyMasterID,
        status: { [Sequelize.Op.in]: [0, 1] },
        [Sequelize.Op.and]: Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('meetingPurpose')),
          meetingPurpose.trim().toLowerCase(),
        ),
      },
    });

    if (find_SameData) {
      await transaction.rollback()
      return res.status(200).send({
        status: 401,
        message: message.usermessage.alreadyExists(
          'Meeting Purpose with same name',
        ),
      });
    }

    await MeetingPurpose.create(
      {
        meetingPurpose,
        description,
        companyMasterID,
      },
      { transaction,user: req.userDetails },
    );
    await transaction.commit()

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Meeting Purpose'),
    });
  } catch (err) {
    await transaction.rollback()
    next(err);
  }
};

exports.listMeetingPurposes = async (req, res, next) => {
  try {
    const {
      limit,
      page,
      companyMasterID,
      searchQuery,
      isDownload,
      status = false,
    } = await req.body;
    const condition = {};
    if (!status) {
      condition.status = [0, 1];
    }else{
      condition.status = status;
    }
    if (companyMasterID) condition.companyMasterID = companyMasterID;

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          meetingPurpose: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          '$companyMaster.companyName$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
      ];

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const order = [['createdAt', 'DESC']];

    const { rows, count } = await MeetingPurpose.findAndCountAll({
      where: condition,
      ...paginationQuery,
      order,
      include: [
        { model: companyMaster, attributes: ['companyName'] },
        { model: UserMaster, as: 'createBy', attributes: ['displayName'] },
        { model: UserMaster, as: 'updateBy', attributes: ['displayName'] },
      ],
    });

    if (isDownload) {
      const finaldata = rows.map((e) => {
        return {
          'Company Name': e.companyMaster?.companyName || '-',
          'Meeting Purpose': e.meetingPurpose || '-',
          Description: e.description || '-',
          'Created By': e.createBy.displayName,
          'Created At': `${moment(e.createdAt).format('DD-MM-YYYY HH:mm') || ''}`,
          'Updated By': e.updateBy ? `${e.updateBy?.displayName || ''}` : '',
          status: e.status === 1 ? 'Active' : 'Inactive',
          'Updated At': e.updateBy
            ? `${moment(e.updatedAt).format('DD-MM-YYYY HH:mm') || ''}`
            : '',
        };
      });

      return await generateExcel(finaldata, 'Meeting Purpose', 'xlsx', res);
    }

    return res.status(200).json({
      status: 200,
      data: rows,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};

exports.getMeetingPurposeByID = async (req, res, next) => {
  try {
    const { meetingPurposeID } = await req.body;
    const getMeetingPurpose = await MeetingPurpose.findOne({
      where: {
        meetingPurposeID: meetingPurposeID,
      },
      include: [
        {
          model: companyMaster,
          attributes: ['companyName'],
        },
      ],
    });

    return res.status(200).json({
      status: 200,
      data: getMeetingPurpose,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateMeetingPurpose = async (req, res, next) => {
  const transaction = await sequelize.transaction()
  try {
    const { meetingPurposeID, meetingPurpose, description, companyMasterID } =
      await req.body;

    const find_SameData = await MeetingPurpose.findOne({
      where: {
        companyMasterID,
        status: { [Sequelize.Op.in]: [0, 1] },
        meetingPurposeID: {
          [Sequelize.Op.ne]: meetingPurposeID,
        },
        [Sequelize.Op.and]: Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('meetingPurpose')),
          meetingPurpose.trim().toLowerCase(),
        ),
      },
    });

    if (find_SameData) {
      await transaction.rollback()
      return res.status(200).send({
        status: 400,
        message: message.usermessage.alreadyExists(
          'Meeting Purpose with same name',
        ),
      });
    }

    await MeetingPurpose.update(
      {
        meetingPurpose,
        description,
        companyMasterID,
        updatedBy: req.userDetails.userMasterId,
      },
      { where: { meetingPurposeID: meetingPurposeID }, 
      transaction,
      individualHooks:true,
      user:req.userDetails },
     
    );
    await transaction.commit()

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Meeting Purpose'),
    });
  } catch (err) {
    await transaction.rollback()
    next(err);
  }
};

exports.updateMeetingPurposeStatus = async (req, res, next) => {
  const transaction = await sequelize.transaction()
  try {
    const { meetingPurposeID, status } = await req.body;

    if (!meetingPurposeID) {
      await transaction.rollback()
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Meeting Purpose'),
      });
    }

    const find_SameData = await MeetingPurpose.findOne({
      where: {
        meetingPurposeID,
      },
    });

    if (!find_SameData) {
      await transaction.rollback()
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Meeting Purpose'),
      });
    }

    await MeetingPurpose.update(
      {
        status,
      },
      { where: { meetingPurposeID: meetingPurposeID }, transaction,user:req.userDetails,individualHooks:true},
    );
    await transaction.commit()

    return res.status(200).json({
      status: 200,
      message:
        status == 1
          ? message.usermessage.activeMessage('Meeting Purpose')
          : message.usermessage.deactiveMessage('Meeting Purpose'),
    });
  } catch (error) {
    await transaction.rollback()
    next(error);
  }
};

exports.deleteMeetingPurpose = async (req, res, next) => {
  try {
    const { meetingPurposeID } = await req.body;

    if (!meetingPurposeID) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Meeting Purpose'),
      });
    }

    const find_SameData = await MeetingPurpose.findOne({
      where: {
        meetingPurposeID,
      },
    });

    if (!find_SameData) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Meeting Purpose'),
      });
    }

    const getUsedData = await VisitMeetings.findOne({
      where: {
        meetingPurposeID: meetingPurposeID,
      },
    });

    if (getUsedData) {
      return res.status(200).send({
        status: 400,
        message:
          'Can not delete Meeting Purpose already used in Visit Meetings',
      });
    }

    await MeetingPurpose.destroy({
      where: { meetingPurposeID: meetingPurposeID },
      user:req.userDetails,
      individualHooks:true
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Meeting Purpose'),
    });
  } catch (err) {
    next(err);
  }
};
