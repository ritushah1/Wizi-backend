const Sequelize = require('sequelize');
const UserExperience = require('../models/userExperience');
const logger = require('../config/logger');
const message = require('../response_message/message');
const sequelize = require('../config/database');
const UserMaster = require('../models/userMaster');
const companyMaster = require('../models/companyMaster');
const UserInbox = require('../models/UserInbox');

/**
 * save user experience data.
 *
 * @body {createBy} createBy user id of user who added the user experience.
 * @body {number} createBy if any user change data then updateBy id change.
 
 */
exports.postAddUserExperience = async (req, res, next) => {
  try {
    let {
      userMasterID,
      designation,
      fromDate,
      toDate,
      organization,
      roleRespo,
      verifyStatus,
      verifyBy,
    } = await req.body;
    if (req?.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    await sequelize.transaction(async (t) => {
      const insert_db_status = await UserExperience.create(
        {
          userMasterID,
          designation,
          fromDate: fromDate ? fromDate : null,
          toDate: toDate ? toDate : null,
          organization,
          roleRespo,
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
            activityTable: UserExperience.getTableName(),
            activityTablePK: insert_db_status.toJSON().userExperienceID,
            message: `${name.displayName} has added Experience.`,
            assignedBy: userMasterID,
          },
          { transaction: t },
        );
      }
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Experience'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getUserExperienceById = async (req, res, next) => {
  try {
    let userMasterID = null;
    if (req?.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }
    const experienceWhereCondition = {
      userExperienceID: req.params.id,
      status: {
        [Sequelize.Op.in]: [0, 1],
      },
    };
    if (userMasterID) {
      experienceWhereCondition.userMasterID = userMasterID;
    }
    let get_one_data = await UserExperience.findOne({
      where: experienceWhereCondition,
      include: [
        {
          model: UserMaster,
          attributes: ['displayName'],

          include: [
            {
              model: companyMaster,
              attributes: ['companyName'],
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
exports.getUserExperienceByUserMasterId = async (req, res, next) => {
  try {
    let get_one_data = await UserExperience.findAll({
      where: {
        userMasterID: req.params.id,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      include: [
        {
          required: true, 
          model: UserMaster,
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

exports.postUpdateUserExperience = async (req, res, next) => {
  try {
    let {
      userExperienceID,
      userMasterID,
      designation,
      fromDate,
      toDate,
      organization,
      roleRespo,
      verifyStatus,
    } = await req.body;
    if (req?.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }
    const experienceWhereCondition = {
      userExperienceID: userExperienceID,
    };
    if (userMasterID) {
      experienceWhereCondition.userMasterID = userMasterID;
    }
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    await sequelize.transaction(async (t) => {
      await UserExperience.update(
        {
          userMasterID,
          designation,
          fromDate: fromDate ? fromDate : null,
          toDate: toDate ? toDate : null,
          organization,
          roleRespo,
          updateBy,
          updateByIp,
          verifyStatus,
        },
        {
          where: experienceWhereCondition,
          transaction: t,
        },
      );

      if (verifyStatus != 0) {
        await UserInbox.destroy({
          where: {
            activityTable: UserExperience.getTableName(),
            activityTablePK: userExperienceID,
          },
          transaction: t,
        });
      }
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.userexperienceupdate,
    });
  } catch (err) {
    next(err);
  }
};

exports.poststatuschange = async (req, res, next) => {
  try {
    let { userExperienceID, status } = await req.body;
    let userMasterID = null;
    if (req?.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }
    const experienceWhereCondition = {
      userExperienceID: userExperienceID,
    };
    if (userMasterID) {
      experienceWhereCondition.userMasterID = userMasterID;
    }
    await UserExperience.update(
      {
        status,
      },
      {
        where: experienceWhereCondition,
      },
    );
    await UserInbox.destroy({
      where: {
        activityTable: UserExperience.getTableName(),
        activityTablePK: userExperienceID,
      },
    });

    return res.status(200).json({
      status: 200,
      message:
        status == '1'
          ? message.usermessage.activeMessage('User Experience')
          : message.usermessage.deactiveMessage('User Experience'),
    });
  } catch (err) {
    next(err);
  }
};

exports.postDeleteUserExperienceById = async (req, res, next) => {
  try {
    let { userExperienceID } = await req.body;
    let userMasterID = null;
    if (req?.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }
    const experienceWhereCondition = {
      userExperienceID: userExperienceID,
      status: {
        [Sequelize.Op.in]: [0, 1],
      },
    };
    if (userMasterID) {
      experienceWhereCondition.userMasterID = userMasterID;
    }
    await sequelize.transaction(async (t) => {
      await UserExperience.update(
        {
          status: 2,
        },
        {
          where: experienceWhereCondition,
          transaction: t,
        },
      );

      await UserInbox.destroy({
        where: {
          activityTable: UserExperience.getTableName(),
          activityTablePK: userExperienceID,
        },
        transaction: t,
      });
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.userexperiencedelete,
    });
  } catch (err) {
    next(err);
  }
};

exports.postexpVerifyRequest = async (req, res, next) => {
  try {
    const { userExperienceID, verifyStatus, verifyBy, rejectionRemarks } =
      req.body;

    await sequelize.transaction(async (t) => {
      await UserExperience.update(
        { verifyStatus, verifyBy, rejectionRemarks },
        {
          where: { userExperienceID },
          transaction: t,
        },
      );

      await UserInbox.destroy({
        where: {
          activityTable: UserExperience.getTableName(),
          activityTablePK: userExperienceID,
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

exports.getMyExperience = async (req, res, next) => {
  try {
    const userMasterID = req.userDetails.userMasterId;

    let get_one_data = await UserExperience.findAll({
      where: {
        userMasterID: userMasterID,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      include: [
        {
          required: true,
          model: UserMaster,
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
