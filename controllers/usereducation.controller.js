const Sequelize = require('sequelize');
const UserEducation = require('../models/userEducation');
const message = require('../response_message/message');
const sequelize = require('../config/database');
const UserMaster = require('../models/userMaster');
const companyMaster = require('../models/companyMaster');
const UserInbox = require('../models/UserInbox');

exports.postAddUserEducation = async (req, res, next) => {
  try {
    let {
      userMasterID,
      qualification,
      yearOfPassing,
      grade,
      percentageObtained,
      institute,
      university,
      verifyStatus,
      verifyBy,
    } = await req.body;
    if (req?.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    let degree = '';
    if (req.file) {
      degree = req.file.filename;
    }

    await sequelize.transaction(async (t) => {
      const insert_db_status = await UserEducation.create(
        {
          userMasterID,
          qualification,
          yearOfPassing,
          grade: grade && grade != 'null' ? grade : null,
          degree,
          percentageObtained:
            percentageObtained && percentageObtained != 'null'
              ? percentageObtained
              : null,
          institute,
          university: university && university != 'null' ? university : null,
          createBy,
          createByIp,
          verifyStatus,
          verifyBy: +verifyBy || null,
        },
        { transaction: t },
      );

      if (verifyStatus == 0) {
        const name = await UserMaster.findOne({
          raw: true,
          where: {
            userMasterID: userMasterID,
          },
          attributes: ['displayName'],
        });
        await UserInbox.create(
          {
            activityTable: UserEducation.getTableName(),
            activityTablePK: insert_db_status.toJSON().userEducationID,
            message: `${name.displayName} has added Education Information.`,
            assignedBy: userMasterID,
          },
          { transaction: t },
        );
      }
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Education'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getUserEducationById = async (req, res, next) => {
  try {
    let userMasterID = null;
    if (req?.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }
    const educationWhereCondition = {
      userEducationID: req.params.id,
      status: {
        [Sequelize.Op.in]: [0, 1],
      },
    };
    if (userMasterID) {
      educationWhereCondition.userMasterID = userMasterID;
    }
    let get_one_data = await UserEducation.findOne({
      where: educationWhereCondition,
      include: [
        {
          model: UserMaster,
          attributes: ['displayName'],

          include: [
            {
              model: companyMaster,
            },
          ],
        },
      ],
    });
    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.getUserEducationByUserMasterId = async (req, res, next) => {
  try {
    let get_one_data = await UserEducation.findAll({
      where: {
        userMasterID: req.params.id,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      include: [
        {
          model: UserMaster,
          required: true,
          attributes: ['displayName'],
        },
      ],
    });

    for (var i = 0; i < get_one_data.length; i++) {
      let getCreatedby = await UserMaster.findOne({
        where: {
          userMasterID: get_one_data[i].createBy,
        },
        attributes: ['displayName'],
      });
      get_one_data[i].createBy = getCreatedby ? getCreatedby.displayName : '';

      let verifyBy = await UserMaster.findOne({
        where: {
          userMasterID: get_one_data[i].verifyBy,
        },
        attributes: ['displayName'],
      });
      get_one_data[i].verifyBy = verifyBy ? verifyBy.displayName : '';
    }

    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.postUpdateUserEducation = async (req, res, next) => {
  try {
    for (const key of Object.keys(req.body)) {
      if (
        req.body[key] == 'null' ||
        !req.body[key] ||
        req.body[key] == 'undefined'
      ) {
        req.body[key] = null;
      }
    }
    let {
      userEducationID,
      userMasterID,
      qualification,
      yearOfPassing,
      grade,
      degree,
      percentageObtained,
      institute,
      university,
      verifyStatus,
    } = await req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    if (req?.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }
    const educationWhereCondition = {
      userEducationID: userEducationID,
      status: {
        [Sequelize.Op.in]: [0, 1],
      },
    };
    if (userMasterID) {
      educationWhereCondition.userMasterID = userMasterID;
    }
    await sequelize.transaction(async (t) => {
      if (req.file) {
        await UserEducation.update(
          {
            userMasterID,
            qualification,
            yearOfPassing,
            grade,
            degree: req.file.filename,
            percentageObtained,
            institute,
            university,
            updateBy,
            updateByIp,
            verifyStatus,
          },
          {
            where: educationWhereCondition,
            transaction: t,
          },
        );
      } else {
        await UserEducation.update(
          {
            userMasterID,
            qualification,
            yearOfPassing,
            grade,
            percentageObtained,
            institute,
            university,
            updateBy,
            updateByIp,
            verifyStatus,
          },
          {
            where: { userEducationID: userEducationID },
          },
        );
      }

      if (verifyStatus != 0) {
        await UserInbox.destroy({
          where: {
            activityTable: UserEducation.getTableName(),
            activityTablePK: userEducationID,
          },
          transaction: t,
        });
      }
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Education'),
    });
  } catch (err) {
    next(err);
  }
};

exports.poststatuschange = async (req, res, next) => {
  try {
    let { userEducationID, status } = await req.body;
    let userMasterID = null;
    if (req?.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }
    const educationWhereCondition = {
      userEducationID: userEducationID,
      status: {
        [Sequelize.Op.in]: [0, 1],
      },
    };
    if (userMasterID) {
      educationWhereCondition.userMasterID = userMasterID;
    }
    await UserEducation.update(
      {
        status,
      },
      {
        where: educationWhereCondition,
      },
    );

    return res.status(200).json({
      status: 200,
      message:
        status == '1'
          ? message.usermessage.activeMessage('Education')
          : message.usermessage.deactiveMessage('Education'),
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

exports.postDeleteUserEducationById = async (req, res, next) => {
  try {
    let { userEducationID } = await req.body;
    let userMasterID = null;
    if (req?.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }
    const educationWhereCondition = {
      userEducationID: userEducationID,
      status: {
        [Sequelize.Op.in]: [0, 1],
      },
    };
    if (userMasterID) {
      educationWhereCondition.userMasterID = userMasterID;
    }
    await sequelize.transaction(async (t) => {
      await UserEducation.update(
        {
          status: 2,
        },
        {
          where: educationWhereCondition,
          transaction: t,
        },
      );

      await UserInbox.destroy({
        where: {
          activityTable: UserEducation.getTableName(),
          activityTablePK: userEducationID,
        },
        transaction: t,
      });
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Education'),
    });
  } catch (err) {
    next(err);
  }
};

exports.postEduVerifyRequest = async (req, res, next) => {
  try {
    const { userEducationID, verifyStatus, verifyBy, rejectionRemarks } =
      req.body;

    await sequelize.transaction(async (t) => {
      const updateStatus = await UserEducation.update(
        { verifyStatus, verifyBy, rejectionRemarks },
        {
          where: { userEducationID },
          transaction: t,
        },
      );

      await UserInbox.destroy({
        where: {
          activityTable: UserEducation.getTableName(),
          activityTablePK: userEducationID,
        },
        transaction: t,
      });
    });

    return res.status(200).json({
      status: 200,
      message: 'Verification status updated successfully.',
      data: {},
    });
  } catch (err) {
    next(err);
  }
};
exports.getMyEducation = async (req, res, next) => {
  try {
    const userMasterID = req.userDetails.userMasterId;
    let get_one_data = await UserEducation.findAll({
      where: {
        userMasterID: userMasterID,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      include: [
        {
          model: UserMaster,
          required: true,
          attributes: ['displayName'],
        },
      ],
    });

    for (var i = 0; i < get_one_data.length; i++) {
      let getCreatedby = await UserMaster.findOne({
        where: {
          userMasterID: get_one_data[i].createBy,
        },
        attributes: ['displayName'],
      });
      get_one_data[i].createBy = getCreatedby ? getCreatedby.displayName : '';

      let verifyBy = await UserMaster.findOne({
        where: {
          userMasterID: get_one_data[i].verifyBy,
        },
        attributes: ['displayName'],
      });
      get_one_data[i].verifyBy = verifyBy ? verifyBy.displayName : '';
    }

    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};
