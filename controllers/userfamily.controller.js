const Sequelize = require('sequelize');
const userFamily = require('../models/userfamily');
const logger = require('../config/logger');
const message = require('../response_message/message');
const sequelize = require('../config/database');
const UserMaster = require('../models/userMaster');
const companyMaster = require('../models/companyMaster');
const UserInbox = require('../models/UserInbox');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
// const archiver = require('archiver');
const path = require('path');
const fs = require('fs');
const { statusCodes } = require('../utils/commonVars');

/**
 * save user education data.
 *
 * @body {createBy} createBy user id of user who added the user education.
 * @body {number} createBy if any user change data then updateBy id change.
 
 */
exports.postAdduserFamily = async (req, res, next) => {
  try {
    let {
      userMasterID,
      memberName,
      dob,
      gender,
      relation,
      contact,
      verifyStatus,
      nominee,
      isIRC,
      percentForNominee,
      verifyBy,
      aadhaarNumber = null,
      aadhaarFront = null,
      aadhaarBack = null,
      relationAttachment = null,
    } = await req.body;
    if (req?.files?.aadhaarBack?.length > 0) {
      aadhaarBack = `uploads/family/document/${req?.files?.aadhaarBack?.[0]?.filename}`;
    }
    if (req?.files?.aadhaarFront?.length > 0) {
      aadhaarFront = `uploads/family/document/${req?.files?.aadhaarFront?.[0]?.filename}`;
    }
    if (req?.files?.relationAttachment?.length > 0) {
      relationAttachment = `uploads/family/document/${req?.files?.relationAttachment?.[0]?.filename}`;
    }
    if (req?.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    await sequelize.transaction(async (t) => {
      let insert_db_status = await userFamily.create(
        {
          userMasterID,
          memberName,
          dob: dob ? dob : null,
          gender,
          relation,
          contact: contact ? contact : null,
          createBy,
          createByIp,
          verifyStatus,
          nominee: nominee ? nominee : null,
          isIRC: isIRC === true || isIRC === 'true',        percentForNominee: nominee ? percentForNominee : null,
          aadhaarNumber,
          aadhaarFront,
          aadhaarBack,
          relationAttachment,
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
            activityTable: userFamily.getTableName(),
            activityTablePK: insert_db_status.toJSON().userFamilyID,
            message: `${name.displayName} has added Family Information.`,
            assignedBy: userMasterID,
          },
          { transaction: t },
        );
      }
    });
    return res.status(200).json({
      status: 200,
      message: message.usermessage.userFamilyadd,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * find data with userFamily id
 *
 * @param {id} userFamilyID  to fetch user education
 */

exports.getuserFamilyById = async (req, res, next) => {
  try {
    let userMasterID = null;
    if (req?.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }
    const familyWhereCondition = {
      userFamilyID: req.params.id,
      status: {
        [Sequelize.Op.in]: [0, 1],
      },
    };
    if (userMasterID) {
      familyWhereCondition.userMasterID = userMasterID;
    }
    let get_one_data = await userFamily.findOne({
      where: familyWhereCondition,
      include: [
        {
          model: UserMaster,
          attributes: ['displayName'],
          include: [{ model: companyMaster }],
        },
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
 * @param {id} userMasterID  to fetch user education
 */

exports.getuserFamilyByUserMasterId = async (req, res, next) => {
  try {
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: false,
    });
    let get_one_data = await userFamily.findAll({
      where: {
        userMasterID: req.params.id,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      order: [['createdAt', 'ASC']],
      include: [
        {
          model: UserMaster,
          required: true,
          where: { ...userAccessCondition.where },
          include: [...userAccessCondition.includeModels],
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

/**
 * update data
 *
 * @param {id} userFamilyID  to update id
 */
exports.postUpdateuserFamily = async (req, res, next) => {
  try {
    let {
      userFamilyID,
      userMasterID,
      memberName,
      dob,
      gender,
      relation,
      contact,
      nominee,
      isIRC,
      percentForNominee,
      verifyStatus,
      aadhaarNumber = null,
      aadhaarFront = null,
      aadhaarBack = null,
      relationAttachment = null,
    } = await req.body;
    if (nominee == '0') {
      percentForNominee = null;
    }
    const getUserFamily = await userFamily.findOne({
      where: {
        userFamilyID: userFamilyID,
      },
    });
    if (req?.files?.aadhaarBack?.length > 0) {
      aadhaarBack = `uploads/family/document/${req?.files?.aadhaarBack?.[0]?.filename}`;
    } else {
      aadhaarBack = getUserFamily.aadhaarBack;
    }
    if (req?.files?.aadhaarFront?.length > 0) {
      aadhaarFront = `uploads/family/document/${req?.files?.aadhaarFront?.[0]?.filename}`;
    } else {
      aadhaarFront = getUserFamily.aadhaarFront;
    }
    if (req?.files?.relationAttachment?.length > 0) {
      relationAttachment = `uploads/family/document/${req?.files?.relationAttachment?.[0]?.filename}`;
    } else {
      relationAttachment = getUserFamily.relationAttachment;
    }
    aadhaarNumber == 'null' ? null : aadhaarNumber;
    if (req?.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }
    const familyWhereCondition = {
      userFamilyID: userFamilyID,
    };
    if (userMasterID) {
      familyWhereCondition.userMasterID = userMasterID;
    }
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    await sequelize.transaction(async (t) => {
      let change_data_status = await userFamily.update(
        {
          userMasterID,
          memberName,
          dob: dob ? dob : null,
          gender,
          relation,
          contact: contact ? contact : null,
          nominee: nominee ? nominee : null,
          percentForNominee: nominee ? percentForNominee : null,
          isIRC: isIRC === true || isIRC === 'true',
          updateBy,
          updateByIp,
          verifyStatus,
          aadhaarNumber,
          aadhaarFront,
          aadhaarBack,
          relationAttachment,
        },
        {
          where: familyWhereCondition,
          transaction: t,
        },
      );

      if (verifyStatus != 0) {
        await UserInbox.destroy({
          where: {
            activityTable: userFamily.getTableName(),
            activityTablePK: userFamilyID,
          },
          transaction: t,
        });
      }
    });

    return res
      .status(200)
      .json({ status: 200, message: message.usermessage.userFamilyupdate });
  } catch (err) {
    next(err);
  }
};

/**
 * update status
 *
 * @param {id} userFamilyID  to update status of user education
 */

exports.poststatuschange = async (req, res, next) => {
  try {
    const { userFamilyID, status } = await req.body;
    let userMasterID = null;

    if (req?.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }
    const familyWhereCondition = {
      userFamilyID: userFamilyID,
    };
    if (userMasterID) {
      familyWhereCondition.userMasterID = userMasterID;
    }
    await sequelize.transaction(async (t) => {
      await userFamily.update(
        {
          status,
        },
        {
          where: familyWhereCondition,
          transaction: t,
        },
      );
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.userFamilydelete,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * delete by id
 *
 * @param {id} userFamilyID  to delete id
 */
exports.postDeleteuserFamilyById = async (req, res, next) => {
  try {
    let { userFamilyID } = await req.body;
    let userMasterID = null;

    if (req?.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }
    const familyWhereCondition = {
      userFamilyID: userFamilyID,
    };
    if (userMasterID) {
      familyWhereCondition.userMasterID = userMasterID;
    }
    await sequelize.transaction(async (t) => {
      await userFamily.update(
        {
          status: 2,
        },
        {
          where: familyWhereCondition,
          transaction: t,
        },
      );

      await UserInbox.destroy({
        where: {
          activityTable: userFamily.getTableName(),
          activityTablePK: userFamilyID,
        },
        transaction: t,
      });
    });

    return res
      .status(200)
      .json({ status: 200, message: message.usermessage.userFamilydelete });
  } catch (err) {
    next(err);
  }
};

/**
 * Update verification status of user family details.
 *
 * @param {id} userFamilyID - User Family ID to update verification status.
 * @param {number} verifyStatus - New verification status (2 for Rejected, 1 for Verified).
 * @param {number} verifyBy - User ID of the verifier.
 */

exports.postVerifyRequest = async (req, res, next) => {
  try {
    const { userFamilyID, verifyStatus, verifyBy, rejectionRemarks } = req.body;

    await sequelize.transaction(async (t) => {
      await userFamily.update(
        { verifyStatus, verifyBy, rejectionRemarks },
        {
          where: { userFamilyID },
          transaction: t,
        },
      );
      await UserInbox.destroy({
        where: {
          activityTable: userFamily.getTableName(),
          activityTablePK: userFamilyID,
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

exports.getMyFamily = async (req, res, next) => {
  try {
    const userMasterID = req.userDetails.userMasterId;

    let get_one_data = await userFamily.findAll({
      where: {
        userMasterID: userMasterID,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      order: [['createdAt', 'ASC']],
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

const sanitize = (str) =>
  String(str ?? '')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, '_');

const DOC_FIELDS = ['aadhaarFront', 'aadhaarBack', 'relationAttachment'];

// helper: create an empty folder inside the zip
const addEmptyFolder = (archive, folderPath) => {
  archive.append(Buffer.alloc(0), { name: `${folderPath}/` });
};

// exports.downloadFamilyDocument = async (req, res, next) => {
//   try {
//     const { companyId } = req.query;

//     if (!companyId) {
//       return res.status(statusCodes.BAD_REQUEST).json({
//         status: statusCodes.BAD_REQUEST,
//         message: 'companyId is required!',
//       });
//     }

//     const userData = await UserMaster.findAll({
//       where: { companyMasterId: companyId, status: 1 },
//       attributes: ['displayName', 'userNumber'],
//       include: [
//         {
//           model: EmployeeJoiningDetails,
//           attributes: ['employeeCode'],
//         },
//         {
//           required: false,
//           model: userFamily,
//           where: { verifyStatus: [0, 1] },
//           attributes: [
//             'memberName',
//             'relation',
//             'verifyStatus',
//             'nominee',
//             'aadhaarFront',
//             'aadhaarBack',
//             'relationAttachment',
//           ],
//         },
//       ],
//       order: [['displayName', 'ASC']],
//     });

//     if (!userData.length) {
//       // CHANGED: added status field so the frontend gets a consistent shape
//       return res.status(404).json({ status: 404, message: 'No employee found' });
//     }

//     const timeStamp = Date.now();
//     const zipName = `family_document_${timeStamp}`;

//     res.setHeader('Content-Type', 'application/zip');
//     res.setHeader('Content-Disposition', `attachment; filename="${zipName}.zip"`);
//     // ADDED: lets the browser (cross-origin) read the filename from the response
//     res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

//     const archive = archiver('zip', { store: true });

//     archive.on('warning', (err) => {
//       // CHANGED: throwing inside an event handler can crash the process,
//       // so route it to the 'error' handler below instead
//       if (err.code !== 'ENOENT') archive.emit('error', err);
//     });
//     archive.on('error', (err) => {
//       if (!res.headersSent) return next(err);
//       res.destroy(err);
//     });

//     res.on('close', () => {
//       if (!res.writableFinished) archive.abort();
//     });

//     archive.pipe(res);

//     // non-blocking file check
//     const fileExists = (p) =>
//       fs.promises.access(p).then(() => true).catch(() => false);

//     for (const u of userData) {
//       const user = u.toJSON();

//       const empDetail = user.employeeJoiningDetails?.[0] || null;
//       const families = user.userFamilies || [];

//       const employeeFolder = sanitize(
//         `${empDetail?.employeeCode || ''}_${user.displayName}_${user.userNumber}`
//       );
//       const employeePath = `${zipName}/${employeeFolder}`;

//       // employee folder is ALWAYS created
//       addEmptyFolder(archive, employeePath);

//       for (const member of families) {
//         const isNominee = member.nominee == 1;

//         const memberFolder = sanitize(
//           `${member.relation}_${member.memberName}${isNominee ? '_nominee' : ''}`
//         );
//         const memberPath = `${employeePath}/${memberFolder}`;

//         // 1) collect only the documents that really exist on disk
//         const validFiles = [];

//         for (const field of DOC_FIELDS) {
//           const dbPath = member[field];
//           if (!dbPath) continue; // nothing stored in DB

//           const absPath = path.join(process.cwd(), dbPath);
//           if (!(await fileExists(absPath))) continue; // missing on disk

//           validFiles.push({
//             absPath,
//             name: `${memberPath}/${field}_${timeStamp}${path.extname(absPath)}`,
//           });
//         }

//         // 2) no valid document -> skip, member folder is NOT created
//         if (!validFiles.length) continue;

//         // 3) add files (folder gets created automatically)
//         for (const f of validFiles) {
//           archive.file(f.absPath, { name: f.name });
//         }
//       }
//     }

//     await archive.finalize();
//   } catch (error) {
//     next(error);
//   }
// };
