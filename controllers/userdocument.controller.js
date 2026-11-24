const Sequelize = require('sequelize');
const UserDocument = require('../models/userDocument');
const message = require('../response_message/message');
const sequelize = require('../config/database');
const UserMaster = require('../models/userMaster');
const fs = require('fs');
const DocumentList = require('../models/documentList');
const {
  asiaKolkataDateTime,
  createEmployeeJoiningDetailHistory,
  getDuplicationValidation,
} = require('../utils/commonUtilFunctions');
const UserInbox = require('../models/UserInbox');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const companyMaster = require('../models/companyMaster');
const {
  generateExcel,
  createZipFileForUserDocuments,
} = require('../utils/exportData');
const path = require('path');
const { statusCodes } = require('../utils/commonVars');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');

exports.getUserDocumentById = async (req, res, next) => {
  try {
    let userMasterID = null;
    if (req?.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }
    const userDocCondition = { userDocumentID: req.params.id };
    if (userMasterID) {
      userDocCondition.userMasterID = userMasterID;
    }
    let get_one_data = await UserDocument.findOne({
      where: {
        ...userDocCondition,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      include: [
        { model: UserMaster, attributes: ['displayName'] },
        { model: DocumentList },
      ],
    });
    if (!get_one_data) {
      return res
        .status(200)
        .json({ status: 200, message: message.usermessage.deletedrecord });
    } else {
      return res.status(200).json({ status: 200, data: get_one_data });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * find data with userMaster id
 *
 * @param {id} userMasterID  to fetch userDocument
 */

exports.getUserDocumentByUserMasterId = async (req, res, next) => {
  try {
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: false,
    });
    let get_one_data = await UserDocument.findAll({
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
          where: { ...userAccessCondition.where },
          include: [...userAccessCondition.includeModels],
          attributes: ['displayName'],
        },
        { model: DocumentList },
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

exports.postDeleteUserDocumentById = async (req, res, next) => {
  try {
    const { userDocumentID } = await req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    let userMasterID = null;
    if (req?.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }
    const userDocCondition = { userDocumentID };
    if (userMasterID) {
      userDocCondition.userMasterID = userMasterID;
    }
    await sequelize.transaction(async (t) => {
      await UserDocument.update(
        {
          status: 2,
        },
        {
          where: userDocCondition,
          transaction: t,
        },
      );

      const userDoc = await UserDocument.findOne({
        raw: true,
        where: userDocCondition,
      });
      if (
        +userDoc.verifyStatus == 1 &&
        (+userDoc.documentListID == 1 || +userDoc.documentListID == 2)
      ) {
        const empJoining = await EmployeeJoiningDetails.findOne({
          where: { userMasterID: userDoc.userMasterID, status: 1 },
          raw: true,
        });

        if (empJoining) {
          if (+userDoc.documentListID == 1) {
            await createEmployeeJoiningDetailHistory(
              empJoining.userMasterID,
              t,
            );
            await EmployeeJoiningDetails.update(
              {
                adharName: null,
                adharCard: null,
                adharPhoto: null,
                adharPhoto1: null,
                isMultiPageAadharCard: false,
                updateBy,
                updateByIp,
              },
              {
                where: {
                  employeeJoiningDetailId: empJoining.employeeJoiningDetailId,
                },
                transaction: t,
              },
            );
          } else {
            await createEmployeeJoiningDetailHistory(
              empJoining.userMasterID,
              t,
            );
            await EmployeeJoiningDetails.update(
              {
                pancard: null,
                panPhoto: null,
                updateBy,
                updateByIp,
              },
              {
                where: {
                  employeeJoiningDetailId: empJoining.employeeJoiningDetailId,
                },
                transaction: t,
              },
            );
          }
        }
      }

      await UserInbox.destroy({
        where: {
          activityTable: UserDocument.getTableName(),
          activityTablePK: userDocumentID,
        },
        transaction: t,
      });
    });

    return res
      .status(200)
      .json({ status: 200, message: message.usermessage.userdocumentdelete });
  } catch (err) {
    next(err);
  }
};

/**
 * Update verification status of user Document details.
 *
 * @param {id} userDocumentID - User Document ID to update verification status.
 * @param {number} verifyStatus - New verification status (2 for Rejected, 1 for Verified).
 * @param {number} verifyBy - User ID of the verifier.
 */

exports.postDocVerifyRequest = async (req, res, next) => {
  try {
    const { userDocumentID, verifyStatus, verifyBy, rejectionRemarks } =
      req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    let result = await sequelize.transaction(async (t) => {
      const updateStatus = await UserDocument.update(
        { verifyStatus, verifyBy, rejectionRemarks },
        {
          where: { userDocumentID },
          transaction: t,
        },
      );

      const userDoc = await UserDocument.findOne({
        raw: true,
        where: { userDocumentID: userDocumentID },
        transaction: t,
      });
      if (
        +verifyStatus == 1 &&
        (+userDoc.documentListID == 1 || +userDoc.documentListID == 2)
      ) {
        const empJoining = await EmployeeJoiningDetails.findOne({
          where: { userMasterID: userDoc.userMasterID, status: 1 },
          include: [{ model: UserMaster, attributes: ['companyMasterId'] }],
        });

        if (!empJoining)
          return res.status(statusCodes.OK).json({
            status: statusCodes.BAD_REQUEST,
            message: 'User not found!',
          });

        if (userDoc.documentListID == 1 || userDoc.documentListID == 2) {
          const data =
            userDoc.documentListID == 1
              ? { adharCard: userDoc.documentNumber }
              : { pancard: userDoc.documentNumber };

          // duplication validation
          const message = await getDuplicationValidation(
            data,
            userDoc.userMasterID,
            empJoining.userMaster.companyMasterId,
            true,
          );

          if (message) {
            return res.status(statusCodes.OK).json({
              status: statusCodes.BAD_REQUEST,
              message,
            });
          }
        }

        if (empJoining) {
          if (+userDoc.documentListID == 1) {
            await createEmployeeJoiningDetailHistory(
              empJoining.userMasterID,
              t,
            );
            await EmployeeJoiningDetails.update(
              {
                adharName: userDoc.nameOnDocument,
                adharCard: userDoc.documentNumber,
                adharPhoto: userDoc.document,
                updateBy,
                updateByIp,
              },
              {
                where: {
                  employeeJoiningDetailId: empJoining.employeeJoiningDetailId,
                },
                transaction: t,
              },
            );
          } else {
            await createEmployeeJoiningDetailHistory(
              empJoining.userMasterID,
              t,
            );
            await EmployeeJoiningDetails.update(
              {
                pancard: userDoc.documentNumber,
                panPhoto: userDoc.document,
                updateBy,
                updateByIp,
              },
              {
                where: {
                  employeeJoiningDetailId: empJoining.employeeJoiningDetailId,
                },
                transaction: t,
              },
            );
          }
        } else {
          if (+userDoc.documentListID == 1) {
            await EmployeeJoiningDetails.create(
              {
                userMasterID: userDoc.userMasterID,
                createBy: verifyBy,
                adharName: userDoc.nameOnDocument,
                adharCard: userDoc.documentNumber,
                adharPhoto: userDoc.document,
              },
              { transaction: t },
            );
          } else {
            await EmployeeJoiningDetails.create(
              {
                userMasterID: userDoc.userMasterID,
                createBy: verifyBy,
                pancard: userDoc.documentNumber,
                panPhoto: userDoc.document,
              },
              { transaction: t },
            );
          }
        }
      }

      await UserInbox.destroy({
        where: {
          activityTable: UserDocument.getTableName(),
          activityTablePK: userDocumentID,
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

exports.UserExpiryDocument = async (req, res, next) => {
  try {
    const { users, companyMasterID, exportData, page, limit } = await req.body;

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const rawCurrentDate = new Date();
    const oneMonthLaterDate = new Date(rawCurrentDate);
    oneMonthLaterDate.setMonth(oneMonthLaterDate.getMonth() + 1);
    const formattedCurrentDate = asiaKolkataDateTime(new Date(rawCurrentDate));
    const formattedOneMonthLater = asiaKolkataDateTime(
      new Date(oneMonthLaterDate),
    );

    const paginationQuery = {};
    if (!exportData) {
      paginationQuery.offset = (+page - 1) * +limit;
      paginationQuery.limit = +limit;
    }

    let condition = {
      expiryDate: {
        [Sequelize.Op.not]: null,
        [Sequelize.Op.lte]: new Date(formattedOneMonthLater),
      },
    };

    if (users && users.length > 0) condition.userMasterID = users;

    if (companyMasterID)
      condition['$userMaster.companyMasterId$'] = companyMasterID;

    condition['$userMaster.status$'] = 1;
    condition.status = 1;
    condition.verifyStatus = 1;
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const order = [['expiryDate', 'ASC']];
    const { rows: user, count } = await UserDocument.findAndCountAll({
      where: condition,
      ...paginationQuery,
      order,
      attributes: ['documentListID', 'expiryDate', 'userMasterID'],
      include: [
        {
          required: true,
          model: DocumentList,
          attributes: ['documentName'],
        },
        {
          required: true,
          model: UserMaster,
          where: { ...userAccessCondition.where },
          attributes: ['displayName', 'userNumber', 'companyMasterId'],
          include: [
            ...userAccessCondition.includeModels,
            {
              required: false,
              model: EmployeeDesignation,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },

              attributes: ['designationID'],
              include: [
                {
                  model: Designation,
                  as: 'designation',
                  attributes: ['designationName'],
                },
              ],
            },
            {
              required: false,
              model: EmployeeDepartment,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },

              attributes: ['departmentID'],
              include: [
                {
                  model: Department,
                  as: 'department',
                  attributes: ['departmentName'],
                },
              ],
            },
            {
              required: false,
              model: EmployeeBranch,
              where: {
                // ...(branchMasterID && { branchID: branchMasterID }),
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              required: false,
              attributes: ['branchID'],
              include: [
                {
                  model: BranchMaster,
                  as: 'branchMaster',
                  attributes: ['branchName'],
                },
              ],
            },
            {
              required: false,
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode'],
            },
            {
              required: false,
              model: companyMaster,
              attributes: ['companyMasterID', 'companyName'],
            },
          ],
        },
      ],
    });

    const finaldata = user.map((e) => {
      const formattedExpiryDate = asiaKolkataDateTime(
        new Date(e.expiryDate),
      ).slice(0, 10);
      const date = new Date(formattedExpiryDate);
      const formattedDate =
        ('0' + date.getDate()).slice(-2) +
        '-' +
        ('0' + (date.getMonth() + 1)).slice(-2) +
        '-' +
        date.getFullYear();

      const currentDate = new Date(formattedCurrentDate.slice(0, 10));
      const timeDifference = Math.abs(currentDate.getTime() - date.getTime());
      const dayDifference = Math.ceil(timeDifference / (1000 * 3600 * 24));

      return {
        displayName: e.userMaster.displayName,
        userMasterID: e.userMasterID,
        // userMasterID: e.userMasterID.toString(),
        employeeCode:
          e.userMaster.employeeJoiningDetails.length > 0
            ? e.userMaster.employeeJoiningDetails[0].employeeCode
            : '',
        companyName: e.userMaster.companyMaster.companyName,
        branchName:
          e.userMaster.employeeBranches.length > 0
            ? e.userMaster.employeeBranches[0].branchMaster.branchName
            : '',
        departmentName:
          e.userMaster.employeeDepartments.length > 0
            ? e.userMaster.employeeDepartments[0].department.departmentName
            : '',
        designationName:
          e.userMaster.employeeDesignations.length > 0
            ? e.userMaster.employeeDesignations[0].designation.designationName
            : '',
        userNumber: e.userMaster.userNumber,
        documentName: e.documentList.documentName,
        expiryDate: formattedDate,
        expiringstatus:
          date.getTime() < currentDate.getTime()
            ? '2'
            : date.getTime() === currentDate.getTime()
              ? '0'
              : '1',
        status:
          date.getTime() < currentDate.getTime()
            ? 'Expired'
            : date.getTime() === currentDate.getTime()
              ? 'Expiring Today'
              : `Expiring In ${dayDifference} Days`,
      };
    });

    if (exportData) {
      const finalExportData = finaldata.map((e) => {
        return {
          'Expiry Status': e.status,
          'Employee Code': e.employeeCode,
          'Employee Name': e.displayName,
          'User Number': e.userNumber,
          'Company Name': e.companyName,
          'Branch Name': e.branchName,
          'Department Name': e.departmentName,
          'Designation Name': e.designationName,
          'Document Name': e.documentName,
          'Expiry Date': e.expiryDate,
        };
      });

      return await generateExcel(
        finalExportData,
        'Expiry-Document',
        'xlsx',
        res,
      );
    }
    return res.status(200).json({
      status: 200,
      data: finaldata,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};

exports.postAddUserDocument_V2 = async (req, res, next) => {
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
      userMasterID,
      documentListID,
      verifyStatus,
      verifyBy,
      documentNumber,
      nameOnDocument,
      expiryDate,
    } = req.body;
    if (req?.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    const duplicateDocument = await UserDocument.findOne({
      where: {
        userMasterID: userMasterID,
        status: 1,
        documentListID: documentListID,
      },
      raw: true,
    });
    if (duplicateDocument)
      return res
        .status(200)
        .json({ status: 401, message: 'Document already Added!' });

    let document = null;
    let document1 = null;
    expiryDate =
      expiryDate == 'null' || expiryDate == 'undefined' || !expiryDate
        ? null
        : expiryDate;
    if (req.files.length) {
      document = req.files?.[0]?.filename || '';
    }

    if (req.body.isMultiPageAadharCard == 'true' && req.files.length) {
      document1 = req.files?.[1]?.filename || '';
    }

    const userData = await UserMaster.findOne({
      raw: true,
      where: {
        userMasterID: userMasterID,
      },
      attributes: ['companyMasterId', 'displayName'],
    });

    if (!userData)
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'User not found!',
      });

    if (documentListID == 1 || documentListID == 2) {
      const data =
        documentListID == 1
          ? { adharCard: documentNumber }
          : { pancard: documentNumber };

      // duplication validation
      const message = await getDuplicationValidation(
        data,
        userMasterID,
        userData.companyMasterId,
        verifyStatus == 1,
      );

      if (message) {
        return res.status(statusCodes.OK).json({
          status: statusCodes.BAD_REQUEST,
          message,
        });
      }
    }

    let insert_db_status;
    await sequelize.transaction(async (t) => {
      insert_db_status = await UserDocument.create({
        userMasterID,
        documentListID,
        document,
        createBy,
        createByIp,
        verifyStatus,
        verifyBy: +verifyBy || null,
        documentNumber,
        nameOnDocument,
        expiryDate,
        document1,
        isMultiPageAadharCard: req.body.isMultiPageAadharCard,
      });

      if (
        +verifyStatus == 1 &&
        (+documentListID == 1 || +documentListID == 2)
      ) {
        const empJoining = await EmployeeJoiningDetails.findOne({
          where: { userMasterID: userMasterID, status: 1 },
          raw: true,
        });
        if (empJoining) {
          if (+documentListID == 1) {
            await createEmployeeJoiningDetailHistory(
              empJoining.userMasterID,
              t,
            );
            await EmployeeJoiningDetails.update(
              {
                adharName: nameOnDocument,
                adharCard: documentNumber,
                adharPhoto: document,
                adharPhoto1: document1,
                isMultiPageAadharCard: req.body.isMultiPageAadharCard,
                updateBy,
                updateByIp,
              },
              {
                where: {
                  employeeJoiningDetailId: empJoining.employeeJoiningDetailId,
                },
                transaction: t,
              },
            );
          } else {
            await createEmployeeJoiningDetailHistory(
              empJoining.userMasterID,
              t,
            );
            await EmployeeJoiningDetails.update(
              {
                pancard: documentNumber,
                panPhoto: document,
                updateBy,
                updateByIp,
              },
              {
                where: {
                  employeeJoiningDetailId: empJoining.employeeJoiningDetailId,
                },
                transaction: t,
              },
            );
          }
        } else {
          if (+documentListID == 1) {
            await EmployeeJoiningDetails.create(
              {
                userMasterID,
                createBy,
                createByIp,
                adharName: nameOnDocument,
                adharCard: documentNumber,
                adharPhoto: document,
                adharPhoto1: document1,
                isMultiPageAadharCard: req.body.isMultiPageAadharCard,
              },
              { transaction: t },
            );
          } else {
            await EmployeeJoiningDetails.create(
              {
                userMasterID,
                createBy,
                createByIp,
                pancard: documentNumber,
                panPhoto: document,
              },
              { transaction: t },
            );
          }
        }
      }

      if (verifyStatus == 0) {
        await UserInbox.create(
          {
            activityTable: UserDocument.getTableName(),
            activityTablePK: insert_db_status.toJSON().userDocumentID,
            message: `${userData.displayName} has added Document.`,
            assignedBy: userMasterID,
          },
          { transaction: t },
        );
      }
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.userdocumentadd,
      data: insert_db_status,
    });
  } catch (err) {
    next(err);
  }
};

exports.postUpdateUserDocument_V2 = async (req, res, next) => {
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
      userDocumentID,
      documentListID,
      verifyStatus,
      documentNumber,
      nameOnDocument,
      expiryDate,
    } = await req.body;
    let userMasterID = null;
    if (req?.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }
    const userDocCondition = { userDocumentID };
    if (userMasterID) {
      userDocCondition.userMasterID = userMasterID;
    }
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    const userDoc = await UserDocument.findOne({
      raw: true,
      where: userDocCondition,
    });
    let document = userDoc.document;
    let document1 =
      req.body.isMultiPageAadharCard == 'true' ? userDoc.document1 : null;
    expiryDate =
      expiryDate == 'null' || expiryDate == 'undefined' || !expiryDate
        ? null
        : expiryDate;
    let index = 0;
    if (req.files.length && req.body.isChangedDocument == 'true') {
      document = req.files?.[index]?.filename || '';
      index++;
    }

    if (req.body.isMultiPageAadharCard == 'true' && req.files.length) {
      if (req.body.isChangedDocument1 == 'true') {
        document1 = req.files?.[index]?.filename || '';
      }
    }

    const userData = await UserMaster.findOne({
      raw: true,
      where: {
        userMasterID: userDoc.userMasterID,
      },
      attributes: ['companyMasterId', 'displayName'],
    });

    if (!userData)
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'User not found!',
      });

    if (documentListID == 1 || documentListID == 2) {
      const data =
        documentListID == 1
          ? { adharCard: documentNumber }
          : { pancard: documentNumber };

      // duplication validation
      const message = await getDuplicationValidation(
        data,
        userDoc.userMasterID,
        userData.companyMasterId,
        verifyStatus == 1,
      );

      if (message) {
        return res.status(statusCodes.OK).json({
          status: statusCodes.BAD_REQUEST,
          message,
        });
      }
    }

    await sequelize.transaction(async (t) => {
      await UserDocument.update(
        {
          document,
          document1,
          updateBy,
          updateByIp,
          verifyStatus,
          documentNumber,
          nameOnDocument,
          expiryDate,
          isMultiPageAadharCard: req.body.isMultiPageAadharCard,
          verifyBy: verifyStatus != 0 ? updateBy : null,
        },
        {
          where: userDocCondition,
          transaction: t,
        },
      );

      if (
        +verifyStatus == 1 &&
        (+documentListID == 1 || +documentListID == 2)
      ) {
        const empJoining = await EmployeeJoiningDetails.findOne({
          where: { userMasterID: userDoc.userMasterID, status: 1 },
          raw: true,
        });

        if (empJoining) {
          if (+documentListID == 1) {
            await createEmployeeJoiningDetailHistory(
              empJoining.userMasterID,
              t,
            );
            await EmployeeJoiningDetails.update(
              {
                adharName: nameOnDocument,
                adharCard: documentNumber,
                adharPhoto: document,
                adharPhoto1: document1,
                isMultiPageAadharCard: req.body.isMultiPageAadharCard,
                updateBy,
                updateByIp,
              },
              {
                where: {
                  employeeJoiningDetailId: empJoining.employeeJoiningDetailId,
                },
                transaction: t,
              },
            );
          } else {
            await createEmployeeJoiningDetailHistory(
              empJoining.userMasterID,
              t,
            );
            await EmployeeJoiningDetails.update(
              {
                pancard: documentNumber,
                panPhoto: document,
                updateBy,
                updateByIp,
              },
              {
                where: {
                  employeeJoiningDetailId: empJoining.employeeJoiningDetailId,
                },
                transaction: t,
              },
            );
          }
        } else {
          if (+documentListID == 1) {
            await EmployeeJoiningDetails.create(
              {
                userMasterID: userDoc.userMasterID,
                createBy: updateBy,
                createByIp: updateByIp,
                adharName: nameOnDocument,
                adharCard: documentNumber,
                adharPhoto: document,
                adharPhoto1: document1,
                isMultiPageAadharCard: req.body.isMultiPageAadharCard,
              },
              { transaction: t },
            );
          } else {
            await EmployeeJoiningDetails.create(
              {
                userMasterID: userDoc.userMasterID,
                createBy: updateBy,
                createByIp: updateByIp,
                pancard: documentNumber,
                panPhoto: document,
              },
              { transaction: t },
            );
          }
        }
      }

      if (verifyStatus != 0) {
        await UserInbox.destroy({
          where: {
            activityTable: UserDocument.getTableName(),
            activityTablePK: userDocumentID,
          },
          transaction: t,
        });
      }
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('User Document'),
    });
  } catch (err) {
    next(err);
  }
};

exports.downloadAllDocuments = async (req, res, next) => {
  try {
    const { userMasterID, documentListID, companyMasterID } = req.body;

    const whereCondition = {
      status: 1,
      document: { [Sequelize.Op.ne]: null },
      verifyStatus: 1,
    };

    if (userMasterID) {
      whereCondition.userMasterID = userMasterID;
    } else if (documentListID) {
      whereCondition.documentListID = documentListID;
    } else {
      return res.status(200).json({
        status: 200,
        message: message.usermessage.notFoundMessage('Documents'),
      });
    }

    const userWhere = { status: 1 };
    if (companyMasterID) {
      userWhere.companyMasterId = companyMasterID;
    }

    const allDocuments = await UserDocument.findAll({
      where: whereCondition,
      include: [
        {
          model: UserMaster,
          where: userWhere,
          attributes: ['userMasterID', 'displayName'],
          include: [
            {
              model: EmployeeJoiningDetails,
              required: false,
              attributes: ['employeeCode'],
            },
          ],
        },
        {
          model: DocumentList,
          attributes: ['documentName'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    if (allDocuments.length > 0) {
      return await createZipFileForUserDocuments(allDocuments, res);
    } else {
      return res.status(200).json({
        status: 200,
        message: message.usermessage.notFoundMessage('Documents'),
      });
    }
  } catch (error) {
    next(error);
  }
};

exports.getEmployeeDocumentStats = async (req, res, next) => {
  try {
    const { companyMasterID } = req.body;
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });

    // Get all active employees in company
    const allActiveEmployees = await UserMaster.count({
      where: {
        companyMasterId: companyMasterID,
        status: 1,
        ...userAccessCondition.where,
      },
      include: [...userAccessCondition.includeModels],
      attributes: ['userMasterID'],
      raw: true,
    });

    // Get all active document types
    const allDocTypes = await DocumentList.findAll({
      where: { status: 1 },
      attributes: ['documentListID'],
      raw: true,
    });

    return res.status(200).json({
      status: 200,
      data: {
        totalEmployees: allActiveEmployees,
        totalDocTypes: allDocTypes.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get paginated document types list with submission counts
 * POST /userdocument/v1/emp-docs/document-types
 */
exports.getDocumentTypesList = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      page = 1,
      limit = 20,
      searchQuery = '',
    } = req.body;
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });

    // Get all active employees
    const allActiveEmployees = await UserMaster.findAll({
      where: {
        companyMasterId: companyMasterID,
        status: 1,
        ...userAccessCondition.where,
      },
      include: [...userAccessCondition.includeModels],
      attributes: ['userMasterID'],
      raw: true,
    });
    const employeeIds = allActiveEmployees.map((e) => e.userMasterID);
    const totalEmployees = employeeIds.length;

    const searchCondition = searchQuery
      ? { documentName: { [Sequelize.Op.iLike]: `%${searchQuery}%` } }
      : {};

    const { rows: docTypes, count: totalCount } =
      await DocumentList.findAndCountAll({
        where: { status: 1, ...searchCondition },
        offset: (+page - 1) * +limit,
        limit: +limit,
        order: [['documentName', 'ASC']],
        raw: true,
      });

    // For each doc type get submitted/pending counts
    const enriched = await Promise.all(
      docTypes.map(async (doc) => {
        const submittedCount = await UserDocument.count({
          where: {
            documentListID: doc.documentListID,
            userMasterID: employeeIds,
            status: 1,
          },
        });
        const pendingCount = await UserDocument.count({
          where: {
            documentListID: doc.documentListID,
            userMasterID: employeeIds,
            status: 1,
            verifyStatus: 0,
          },
        });
        return {
          ...doc,
          submittedCount,
          pendingCount,
          totalEmployees,
        };
      }),
    );

    const actualTotalCount = Array.isArray(totalCount)
      ? totalCount.length
      : totalCount;

    return res.status(200).json({
      status: 200,
      data: enriched,
      totalCount: actualTotalCount,
      page: +page,
      totalEmployees,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get paginated employees list with submission counts
 * POST /userdocument/v1/emp-docs/employees
 */
exports.getEmployeesListForDocs = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      page = 1,
      limit = 20,
      searchQuery = '',
    } = req.body;
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });

    const filterDate = new Date().toISOString().slice(0, 10);

    const searchCondition = searchQuery
      ? {
          [Sequelize.Op.or]: [
            { displayName: { [Sequelize.Op.iLike]: `%${searchQuery}%` } },
            { email: { [Sequelize.Op.iLike]: `%${searchQuery}%` } },
            { userNumber: { [Sequelize.Op.iLike]: `%${searchQuery}%` } },
          ],
        }
      : {};

    // Total active doc types
    const totalDocTypes = await DocumentList.count({ where: { status: 1 } });

    const { rows: employees, count: totalCount } =
      await UserMaster.findAndCountAll({
        where: {
          companyMasterId: companyMasterID,
          status: 1,
          ...userAccessCondition.where,
          ...searchCondition,
        },
        include: [
          ...userAccessCondition.includeModels,
          {
            model: EmployeeDesignation,
            required: false,
            as: 'employeeDesignations',
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                { endDate: { [Sequelize.Op.eq]: null } },
              ],
            },
            attributes: [],
            include: [
              {
                model: Designation,
                as: 'designation',
                attributes: ['designationName'],
              },
            ],
          },
          {
            model: EmployeeJoiningDetails,
            required: false,
            attributes: ['employeeCode', 'joiningDate'],
          },
        ],
        attributes: [
          'userMasterID',
          'displayName',
          'email',
          'userNumber',
          'photo',
        ],
        offset: (+page - 1) * +limit,
        limit: +limit,
        order: [['displayName', 'ASC']],
        distinct: true,
      });

    const actualEmpCount = Array.isArray(totalCount)
      ? totalCount.length
      : totalCount;

    const enriched = await Promise.all(
      employees.map(async (emp) => {
        const submittedCount = await UserDocument.count({
          where: {
            userMasterID: emp.userMasterID,
            status: 1,
            verifyStatus: { [Sequelize.Op.in]: [0, 1] },
            document: { [Sequelize.Op.ne]: null },
          },
        });
        const designationName =
          emp.employeeDesignations && emp.employeeDesignations.length > 0
            ? emp.employeeDesignations[0].designation?.designationName || ''
            : '';
        const employeeCode =
          emp.employeeJoiningDetails && emp.employeeJoiningDetails.length > 0
            ? emp.employeeJoiningDetails[0].employeeCode || ''
            : '';

        return {
          userMasterID: emp.userMasterID,
          displayName: emp.displayName,
          email: emp.email,
          userNumber: emp.userNumber,
          photo: emp.photo,
          designationName,
          employeeCode,
          submittedCount,
          totalRequiredCount: totalDocTypes,
        };
      }),
    );

    return res.status(200).json({
      status: 200,
      data: enriched,
      totalCount: actualEmpCount,
      page: +page,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get paginated submissions (right panel) - works in both document_wise and employee_wise modes
 * POST /userdocument/v1/emp-docs/submissions
 */
exports.getSubmissionsForDrawer = async (req, res, next) => {
  try {
    const {
      mode,
      documentListID,
      userMasterID,
      statusFilter = 'all',
      page = 1,
      limit = 15,
      companyMasterID,
    } = req.body;

    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });

    const filterDate = new Date().toISOString().slice(0, 10);

    // ── 1. Consistently calculate statusCounts for tab badges ─────────────────
    let statusCounts = { all: 0, verified: 0, pending: 0, notSubmitted: 0 };
    let activeUserIds = [];
    let allActiveEmployees = [];

    if (mode === 'document_wise' && documentListID) {
      allActiveEmployees = await UserMaster.findAll({
        where: {
          companyMasterId: companyMasterID,
          status: 1,
          ...userAccessCondition.where,
        },
        include: [...userAccessCondition.includeModels],
        attributes: [
          'userMasterID',
          'displayName',
          'email',
          'userNumber',
          'photo',
        ],
        raw: true,
      });
      activeUserIds = allActiveEmployees.map((e) => e.userMasterID);

      const baseWhere = {
        documentListID,
        userMasterID: { [Sequelize.Op.in]: activeUserIds },
        status: 1,
      };

      const [allSubmittedCount, verifiedCount, pendingCount] =
        await Promise.all([
          UserDocument.count({ where: baseWhere }),
          UserDocument.count({ where: { ...baseWhere, verifyStatus: 1 } }),
          UserDocument.count({ where: { ...baseWhere, verifyStatus: 0 } }),
        ]);

      const notSubmittedCount = Math.max(
        0,
        activeUserIds.length - allSubmittedCount,
      );

      statusCounts = {
        all: allSubmittedCount,
        verified: verifiedCount,
        pending: pendingCount,
        notSubmitted: notSubmittedCount,
      };
    } else if (mode === 'employee_wise' && userMasterID) {
      const baseWhere = {
        userMasterID,
        status: 1,
      };

      const [allSubmittedCount, verifiedCount, pendingCount] =
        await Promise.all([
          UserDocument.count({ where: baseWhere }),
          UserDocument.count({ where: { ...baseWhere, verifyStatus: 1 } }),
          UserDocument.count({ where: { ...baseWhere, verifyStatus: 0 } }),
        ]);

      statusCounts = {
        all: allSubmittedCount,
        verified: verifiedCount,
        pending: pendingCount,
        notSubmitted: 0,
      };
    }

    // ── 2. Handle 'not_submitted' tab in document_wise mode ──────────────────
    if (
      statusFilter === 'not_submitted' &&
      mode === 'document_wise' &&
      documentListID
    ) {
      const submittedEmployeeDocs = await UserDocument.findAll({
        where: {
          documentListID,
          userMasterID: { [Sequelize.Op.in]: activeUserIds },
          status: 1,
        },
        attributes: ['userMasterID'],
        raw: true,
      });

      const submittedEmployeeIds = submittedEmployeeDocs.map(
        (d) => d.userMasterID,
      );

      const notSubmittedEmployees = allActiveEmployees.filter(
        (emp) => !submittedEmployeeIds.includes(emp.userMasterID),
      );

      const totalCount = notSubmittedEmployees.length;
      const paginatedNotSubmitted = notSubmittedEmployees.slice(
        (+page - 1) * +limit,
        +page * +limit,
      );

      const docInfo = await DocumentList.findOne({
        where: { documentListID },
        attributes: ['documentName'],
        raw: true,
      });

      const data = paginatedNotSubmitted.map((emp) => ({
        userDocumentID: null,
        userMasterID: emp.userMasterID,
        employeeName: emp.displayName,
        employeeCode: '',
        documentName: docInfo?.documentName || '',
        document: null,
        document1: null,
        verifyStatus: null, // null = not submitted
        createdAt: null,
        expiryDate: null,
        photo: emp.photo,
      }));

      return res.status(200).json({
        status: 200,
        data,
        totalCount,
        page: +page,
        statusCounts,
      });
    }

    // ── 3. Handle submitted documents (verified, pending, all) ───────────────
    let verifyStatusCondition = {};
    if (mode === 'employee_wise') {
      verifyStatusCondition = {
        verifyStatus: { [Sequelize.Op.in]: [0, 1] },
      };
    } else {
      if (statusFilter === 'verified') {
        verifyStatusCondition = {
          verifyStatus: 1,
        };
      } else if (statusFilter === 'pending') {
        verifyStatusCondition = {
          verifyStatus: 0,
        };
      }
    }

    let submissionsQuery = {
      status: 1,
      ...verifyStatusCondition,
    };

    if (mode === 'document_wise' && documentListID) {
      submissionsQuery.documentListID = documentListID;
      submissionsQuery.userMasterID = { [Sequelize.Op.in]: activeUserIds };
    } else if (mode === 'employee_wise' && userMasterID) {
      submissionsQuery.userMasterID = userMasterID;
    }

    const userInclude = [
      {
        model: UserMaster,
        required: true,
        where: {
          companyMasterId: companyMasterID,
          status: 1,
          ...userAccessCondition.where,
        },
        include: [
          ...userAccessCondition.includeModels,
          {
            model: EmployeeDesignation,
            required: false,
            as: 'employeeDesignations',
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                { endDate: { [Sequelize.Op.eq]: null } },
              ],
            },
            attributes: [],
            include: [
              {
                model: Designation,
                as: 'designation',
                attributes: ['designationName'],
              },
            ],
          },
          {
            model: EmployeeJoiningDetails,
            required: false,
            attributes: ['employeeCode'],
          },
        ],
        attributes: [
          'userMasterID',
          'displayName',
          'email',
          'userNumber',
          'photo',
        ],
      },
      {
        model: DocumentList,
        attributes: ['documentListID', 'documentName'],
      },
    ];

    const { rows: submissions, count: totalCount } =
      await UserDocument.findAndCountAll({
        where: submissionsQuery,
        include: userInclude,
        offset: (+page - 1) * +limit,
        limit: +limit,
        order: [['createdAt', 'DESC']],
        distinct: true,
      });

    const actualSubmissionsTotal = Array.isArray(totalCount)
      ? totalCount.length
      : totalCount;

    const data = submissions.map((sub) => ({
      userDocumentID: sub.userDocumentID,
      userMasterID: sub.userMasterID,
      employeeName: sub.userMaster?.displayName || '',
      employeeCode:
        sub.userMaster?.employeeJoiningDetails?.length > 0
          ? sub.userMaster.employeeJoiningDetails[0].employeeCode || ''
          : '',
      designationName:
        sub.userMaster?.employeeDesignations?.length > 0
          ? sub.userMaster.employeeDesignations[0].designation
              ?.designationName || ''
          : '',
      documentName: sub.documentList?.documentName || '',
      documentListID: sub.documentListID,
      document: sub.document,
      document1: sub.document1,
      isMultiPageAadharCard: sub.isMultiPageAadharCard,
      verifyStatus: sub.verifyStatus,
      rejectionRemarks: sub.rejectionRemarks,
      expiryDate: sub.expiryDate,
      documentNumber: sub.documentNumber,
      nameOnDocument: sub.nameOnDocument,
      createdAt: sub.createdAt,
      photo: sub.userMaster?.photo || null,
    }));

    return res.status(200).json({
      status: 200,
      data,
      totalCount: actualSubmissionsTotal,
      page: +page,
      statusCounts,
    });
  } catch (err) {
    next(err);
  }
};

exports.getMyUserDocuments = async (req, res, next) => {
  try {
    const userMasterID = req.userDetails.userMasterId;

    let get_one_data = await UserDocument.findAll({
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
        { model: DocumentList },
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
