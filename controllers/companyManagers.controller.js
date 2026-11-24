const sequelize = require('../config/database');
const Sequelize = require('sequelize');
const { statusCodes, userAttributes } = require('../utils/commonVars');
const message = require('../response_message/message');
const companyMaster = require('../models/companyMaster');
const UserMaster = require('../models/userMaster');
const CompanyManager = require('../models/companyManagers');
const CompanyProgress = require('../models/companyProgress');
const { UserTypesEnum } = require('../utils/dbUtils');

exports.assignCompanyManager = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { companyMasterID, userMasterID, assignDate, userType } = req.body;

    const existManager = await CompanyManager.findOne({
      where: {
        companyMasterID,
        endDate: null,
      },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: UserMaster,
          where: {
            admin: userType,
          },
        },
      ],
    });

    if (existManager) {
      const endDate = new Date(assignDate);
      endDate.setDate(endDate.getDate() - 1);
      existManager.endDate = endDate;
      await existManager.save({
        user: req?.userDetails,
        transaction,
      });
    }

    await CompanyManager.create(
      {
        companyMasterID,
        userMasterID,
        assignDate,
      },
      {
        user: req?.userDetails,
        transaction,
      }
    );

    await transaction.commit();
    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: message.usermessage.assignMessage('Company Manager'),
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

exports.getAllCompanyManagers = async (req, res, next) => {
  try {
    const { page, limit, companyMasterID, userType } = req.body;

    const paginationQuery =
      page && limit
        ? {
            limit: limit,
            offset: (page - 1) * limit,
          }
        : {};

    const { rows, count } = await CompanyManager.findAndCountAll({
      ...paginationQuery,
      where: {
        companyMasterID,
      },
      include: [
        {
          model: UserMaster,
          where: {
            admin: userType,
          },
          attributes: userAttributes,
        },
        {
          model: companyMaster,
          attributes: ['companyName', 'companyMasterID'],
        },
        {
          model: UserMaster,
          as: 'createdBy',
          attributes: userAttributes,
        },
        {
          model: UserMaster,
          as: 'updatedBy',
          attributes: userAttributes,
        },
      ],
    });

    return res.status(statusCodes.OK).json({
      data: rows,
      totalcount: count,
      status: statusCodes.OK,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateRM_IN_HRM = async (req, res, next) => {
  try {
    const { rmID, hrmID, assignDate } = req.body;

    if (!rmID || !hrmID || !assignDate) {
      return res.status(400).json({
        status: 400,
        message: 'Missing required fields (rmID, hrmID, assignDate)',
      });
    }

    const assignDateObj = new Date(assignDate);
    const previousDate = new Date(assignDateObj);
    previousDate.setDate(previousDate.getDate() - 1);

    // 1️⃣ Get all active companies under this HRM
    const { rows: hrmCompanies } = await CompanyManager.findAndCountAll({
      where: {
        userMasterID: hrmID,
        endDate: { [Sequelize.Op.eq]: null },
      },
      include: [
        {
          model: UserMaster,
          where: { admin: UserTypesEnum.HRM },
          attributes: userAttributes,
        },
        {
          model: companyMaster,
          attributes: ['companyName', 'companyMasterID'],
        },
      ],
    });

    const updatedOldRMs = [];
    const newlyAssigned = [];
    const alreadyAssigned = [];

    // 2️⃣ Loop through each company
    for (let item of hrmCompanies) {
      const companyID = item.companyMasterID;

      // Find any active RM currently assigned to this company
      const existingRM = await CompanyManager.findOne({
        where: {
          companyMasterID: companyID,
          endDate: { [Sequelize.Op.eq]: null },
        },
        include: [
          {
            model: UserMaster,
            where: { admin: UserTypesEnum.RM },
            attributes: ['userMasterID', 'admin'],
          },
        ],
      });

      if (existingRM) {
        if (existingRM.userMasterID == rmID) {
          // Same RM already assigned — skip
          alreadyAssigned.push(existingRM);
          continue;
        } else {
          // Different RM → end their assignment
          await existingRM.update(
            { endDate: previousDate },
            {
              hooks: false,
            }
          );
          updatedOldRMs.push(existingRM);
        }
      }

      // Assign new RM
      const newAssignment = await CompanyManager.create(
        {
          companyMasterID: companyID,
          userMasterID: rmID,
          assignDate: assignDate,
          endDate: null,
          createdBy: 4, // fixed default
        },
        {
          hooks: false,
        }
      );

      newlyAssigned.push(newAssignment);
    }

    return res.status(200).json({
      status: 200,
      message: 'RM successfully reassigned under HRM companies',
      newlyAssignedCount: newlyAssigned.length,
      alreadyAssignedCount: alreadyAssigned.length,
      updatedOldRMCount: updatedOldRMs.length,
      updatedOldRMs,
      newlyAssigned,
    });
  } catch (error) {
    next(error);
  }
};

exports.update_Old_HRM_TO_new_HRM = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { assignDate, newHRMID, oldHRMID } = req.body;
    const existManager = await CompanyManager.findAll({
      where: {
        userMasterID: oldHRMID,
        endDate: null,
      },
      order: [['companyMasterID', 'ASC']],
      transaction,
    });

    const endDate = new Date(assignDate);
    endDate.setDate(endDate.getDate() - 1);
    const ids = existManager.map((x) => x.companyManagerID);

    await CompanyManager.update(
      { endDate },
      {
        where: { companyManagerID: ids },
        transaction,
        user: req?.userDetails,
        individualHooks: true,
      }
    );

    const newRows = existManager.map((x) => ({
      companyMasterID: x.companyMasterID,
      userMasterID: newHRMID,
      assignDate,
    }));

    await CompanyManager.bulkCreate(newRows, {
      transaction,
      user: req?.userDetails,
      individualHooks: true,
    });

    await transaction.commit();

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: message.usermessage.assignMessage('Company Manager'),
      companyManagerIDs: ids,
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};
