const { Sequelize, QueryTypes } = require('sequelize');
const EmployeeReportTo = require('../models/employeeReportTo');
const UserMaster = require('../models/userMaster');
const sequelize = require('../config/database');
const message = require('../response_message/message');
const companyMaster = require('../models/companyMaster');
const { userDetails } = require('../utils/commonUtilFunctions');
const { includes } = require('lodash');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');

exports.postAddEmployeeReportTo = async (req, res, next) => {
  try {
    let { userMasterID, reportsto } = await req.body;

    const getEmployeeReportsTos = await EmployeeReportTo.findOne({
      where: {
        userMasterID: userMasterID,
      },
      raw: true,
    });
    if (getEmployeeReportsTos) {
      await EmployeeReportTo.destroy({
        where: { userMasterID: userMasterID },
      });
    }
    await EmployeeReportTo.bulkCreate(reportsto, {
      returning: true,
    });

    return res.status(200).json({
      status: 200,
      message: getEmployeeReportsTos
        ? message.usermessage.updateMessage('Employee Reports To')
        : message.usermessage.addMessage('Employee Reports To'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getEmployeeReportToById = async (req, res, next) => {
  try {
    let userMasterID = req.params.id;
    if (req?.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }
    let get_one_data = await EmployeeReportTo.findAll({
      where: {
        userMasterID: userMasterID,
        status: {
          [Sequelize.Op.in]: [1],
        },
      },
    });
    let mainarray = [];
    for (let i = 0; i < get_one_data.length; i++) {
      if (get_one_data[i].reportToID) {
        let get_employee = await UserMaster.findOne({
          raw: true,
          where: {
            userMasterID: get_one_data[i].reportToID,
          },
          include: { model: companyMaster, attributes: ['companyName'] },
        });
        if (get_employee) {
          mainarray.push({
            userMasterID: get_one_data[i].reportToID,
            companyMasterID: get_employee.companyMasterId,
            companyName: get_employee['companyMaster.companyName'],
            name: get_employee.displayName,
            mobile: get_employee.userNumber,
            photo: get_employee.photo,
          });
        }
      }
    }
    return res.status(200).json({ status: 200, data: mainarray });
  } catch (err) {
    next(err);
  }
};

exports.updateAllReportToID = async (req, res, next) => {
  try {
    const { oldReportToID, newReportToID, status } = req.body;
    const updateReportData = {};

    if (newReportToID) {
      updateReportData.reportToID = newReportToID;
    }

    if (status) {
      updateReportData.status = status;
    }

    await EmployeeReportTo.update(updateReportData, {
      where: { reportToID: oldReportToID, status: 1 },
    });

    return res.status(200).json({
      status: 200,
      message:
        status != undefined
          ? message.usermessage.deleteMessage('Employee Reports To')
          : message.usermessage.updateMessage('Employee Reports To'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getParentReportingUser = async (req, res, next) => {
  try {
    const userId = req.body.userId;
    const rows = await sequelize.query(
      `
      WITH RECURSIVE reporting_chain AS (
        SELECT "userMasterID", "reportToID" AS parent_id, 1 AS level
        FROM "employeeReportTos"
        WHERE "userMasterID" = :userId

        UNION ALL

        SELECT ert."userMasterID", ert."reportToID", rc.level + 1
        FROM "employeeReportTos" ert
        JOIN reporting_chain rc ON ert."userMasterID" = rc.parent_id
        WHERE rc.level < 6
      ),

      selected_user AS (
        SELECT
          0 AS level,
          um."userMasterID" AS parent_id,
          um."displayName",
          um."firstName",
          um."lastName",
          um."userNumber",
          CONCAT(COALESCE(um."displayName", ''), ' - ', COALESCE(um."userNumber", '')) AS "displayNameWithNumber",
          CONCAT(COALESCE(um."displayName", ''), ' (', COALESCE(ejd."employeeCode", ''), ')') AS "displayNameWithEmployeeCode",
          CONCAT(COALESCE(um."displayName", ''), ' (', COALESCE(ejd."employeeCode", ''), ') - ', COALESCE(um."userNumber", '')) AS "displayNameWithCodeAndNumber"
        FROM "userMasters" um
        LEFT JOIN "employeeJoiningDetails" ejd ON um."userMasterID" = ejd."userMasterID"
        WHERE um."userMasterID" = :userId
      ),

      chain_users AS (
        SELECT
          rc.level,
          u."userMasterID" AS parent_id,
          u."displayName",
          u."firstName",
          u."lastName",
          u."userNumber",
          CONCAT(COALESCE(u."displayName", ''), ' - ', COALESCE(u."userNumber", '')) AS "displayNameWithNumber",
          CONCAT(COALESCE(u."displayName", ''), ' (', COALESCE(ejd."employeeCode", ''), ')') AS "displayNameWithEmployeeCode",
          CONCAT(COALESCE(u."displayName", ''), ' (', COALESCE(ejd."employeeCode", ''), ') - ', COALESCE(u."userNumber", '')) AS "displayNameWithCodeAndNumber"
        FROM reporting_chain rc
        JOIN "userMasters" u ON u."userMasterID" = rc.parent_id
        LEFT JOIN "employeeJoiningDetails" ejd ON u."userMasterID" = ejd."userMasterID"
      )

      SELECT * FROM selected_user
      UNION ALL
      SELECT * FROM chain_users
      ORDER BY level;
      `,
      {
        type: QueryTypes.SELECT,
        replacements: { userId },
      },
    );

    return res.status(200).json({
      status: 200,
      data: uniqueByKey(rows, 'parent_id'),
    });
  } catch (err) {
    next(err);
  }
};

uniqueByKey = (arr, key) => {
  const result = new Array(arr.length);
  const seen = Object.create(null);
  let count = 0;

  for (let i = 0; i < arr.length; i++) {
    arr[i].userMasterID = arr[i].parent_id;
    arr[i].disabled = false;

    const obj = arr[i];
    const val = obj[key];

    if (seen[val] === undefined) {
      seen[val] = 1;
      result[count++] = obj;
    }
  }

  result.length = count;
  return result;
};
exports.postAddEmployeeReportToV2 = async (req, res, next) => {
  try {
    const { userMasterID, reportToID } = req.body;

    const uniqueReportToIDs = [...new Set(reportToID)];
    if (uniqueReportToIDs.includes(userMasterID)) {
      return res.json({
        status: 400,
        message: 'You cannot report to yourself.',
      });
    }
    const existing = await EmployeeReportTo.findAll({
      where: {
        userMasterID,
        reportToID: {
          [Sequelize.Op.in]: uniqueReportToIDs,
        },
        status: 1,
      },
      attributes: ['reportToID'],
      include: [
        {
          model: UserMaster,
          as: 'reportTo',
          attributes: ['displayName'],
        },
      ],
    });

    if (existing.length) {
      return res.json({
        status: 400,
        message: `Report To ID(s) already exist: ${existing
          .map((x) => x.reportTo.displayName)
          .join(', ')}`,
      });
    }

    const employeeReportToData = uniqueReportToIDs.map((id) => ({
      userMasterID,
      reportToID: id,
    }));

    await EmployeeReportTo.bulkCreate(employeeReportToData, {
      user: req.userDetails,
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Employee Reports To'),
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteReportTo = async (req, res, next) => {
  try {
    const { employeeReportToID } = req.body;
    const checkReportToID = await EmployeeReportTo.findOne({
      where: {
        employeeReportToID: employeeReportToID,
        status: 1,
      },
    });
    if (!checkReportToID) {
      return res.status(400).json({
        status: 400,
        message: `Report To ID ${employeeReportToID} does not exist or is already deleted`,
      });
    }
    await EmployeeReportTo.destroy({
      where: { employeeReportToID: employeeReportToID },
      user: req.userDetails,
    });
    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Employee Reports To'),
    });
  } catch (err) {
    next(err);
  }
};
exports.getEmployeeReportToByIdV2 = async (req, res, next) => {
  try {
    let get_one_data = await EmployeeReportTo.findAll({
      where: {
        userMasterID: req.params.id,
        status: 1,
      },
      include: [
        {
          model: UserMaster,
          as: 'reportTo',
          attributes: ['userMasterID', 'displayName', 'userNumber', 'photo'],
          include: [
            {
              model: companyMaster,
              attributes: ['companyMasterID', 'companyName'],
            },
            {
              model: EmployeeJoiningDetails,
              as: 'emp_join',
              required: true,
              attributes: ['employeeCode'],
            },
          ],
        },
      ],
    });
    let mainarray = [];
    for (let i = 0; i < get_one_data.length; i++) {
      if (get_one_data[i].reportToID) {
        const reportToData = get_one_data?.[i]?.reportTo || null;
        mainarray.push({
          employeeReportToID: get_one_data?.[i]?.employeeReportToID,
          userMasterID: get_one_data?.[i]?.reportToID,
          companyMasterID: reportToData?.companyMaster.companyMasterID,
          companyName: reportToData?.companyMaster.companyName,
          name: `${reportToData?.displayName}${
            reportToData?.emp_join?.[0]?.employeeCode
              ? ` ( ${reportToData?.emp_join[0].employeeCode} )`
              : ''
          } - ${reportToData?.userNumber}`,
          mobile: reportToData?.userNumber,
          photo: reportToData?.photo,
        });
      }
    }
    return res.status(200).json({ status: 200, data: mainarray });
  } catch (err) {
    next(err);
  }
};
