const path = require('path');
const fs = require('fs');
const JSZip = require('jszip');
const Sequelize = require('sequelize');
const EmployeeDigitalSignature = require('../models/employeeDigitalSignature');
const message = require('../response_message/message');
const UserMaster = require('../models/userMaster');
const companyMaster = require('../models/companyMaster');
const sequelize = require('../config/database');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');

exports.postAddEmployeeDigitalSignature = async (req, res, next) => {
   const transaction = await sequelize.transaction(); 
  try {
    let { userMasterID } = await req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    const signature = req.file ? req.file.filename : null;

    await EmployeeDigitalSignature.update(
      {
        status: 0,
      },
      {
        where: { userMasterID: userMasterID, status: 1 },
        transaction
      }
    );

    await EmployeeDigitalSignature.create({
      userMasterID,
      signature,
      createBy,
      createByIp,
    },
  {
        transaction, 
      });

      await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Digital Signature'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getEmployeeDigitalSignatureByUserMasterId = async (req, res, next) => {
  try {
    const getEmployeeDigitalSign = await EmployeeDigitalSignature.findAll({
      where: {
        userMasterID: req.params.id,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      include: [
        {
          model: UserMaster,
          include: { model: companyMaster },
        },
      ],
    });

    return res.status(200).json({ status: 200, data: getEmployeeDigitalSign });
  } catch (err) {
    next(err);
  }
};

exports.postUpdateEmployeeDigitalSignature = async (req, res, next) => {
  try {
    let { employeeDigitalSignatureID, userMasterID } = await req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    const findData = await EmployeeDigitalSignature.findByPk(
      employeeDigitalSignatureID
    );
    const signature = req.file ? req.file.filename : findData.signature;

    await EmployeeDigitalSignature.update(
      {
        userMasterID,
        signature,
        updateBy,
        updateByIp,
      },
      {
        where: { employeeDigitalSignatureID: employeeDigitalSignatureID },
      }
    );
    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Digital Signature'),
    });
  } catch (err) {
    next(err);
  }
};

exports.postDeleteEmployeeDigitalSignatureById = async (req, res, next) => {
  try {
    let { employeeDigitalSignatureID } = await req.body;
    await EmployeeDigitalSignature.update(
      {
        status: 2,
      },
      {
        where: { employeeDigitalSignatureID: employeeDigitalSignatureID },
      }
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Digital Signature'),
    });
  } catch (err) {
    next(err);
  }
};

exports.bulkDownloadDigitalSignatures = async (req, res, next) => {
  try {
    const { companyMasterID, status } = req.body;
    const companyMasterId =
      companyMasterID || req.userDetails?.companyMasterId;

    if (!companyMasterId) {
      return res.status(400).json({
        status: 400,
        message: 'Company ID is required.',
      });
    }

    const condition = {
      companyMasterId: companyMasterId,
    };

    if (status !== undefined && status !== null && status !== '') {
      condition.status = status;
    } else {
      condition.status = 1;
    }

    // 1. Check in user table (UserMaster) for all users belonging to that company
    const allUsers = await UserMaster.findAll({
      where: condition,
      attributes: [
        'userMasterID',
        'displayName',
        'firstName',
        'lastName',
        'userNumber',
        'companyMasterId',
        'status',
      ],
      include: [
        {
          model: EmployeeJoiningDetails,
          attributes: ['employeeCode'],
          required: false,
        },
        {
          model: EmployeeDigitalSignature,
          where: {
            status: 1,
            signature: {
              [Sequelize.Op.and]: [
                { [Sequelize.Op.ne]: null },
                { [Sequelize.Op.ne]: '' },
              ],
            },
          },
          required: false,
          attributes: [
            'employeeDigitalSignatureID',
            'signature',
            'createdAt',
            'status',
          ],
        },
      ],
      order: [
        ['displayName', 'ASC'],
        [{ model: EmployeeDigitalSignature }, 'employeeDigitalSignatureID', 'DESC'],
      ],
    });

    if (!allUsers || allUsers.length === 0) {
      return res.status(200).json({
        status: 200,
        message: 'No users found for this company.',
      });
    }

    const zip = new JSZip();
    let fileCount = 0;
    const usedNames = new Set();

    // 2. According to users found in user table, download each user's digital signature
    for (const user of allUsers) {
      const signatures = user.employeeDigitalSignatures || [];
      if (!signatures || signatures.length === 0) continue;

      const empCodeRaw =
        user.employeeJoiningDetails?.[0]?.employeeCode ||
        user.userNumber ||
        'NA';
      const empCode = String(empCodeRaw).trim().replace(/[^a-zA-Z0-9_-]/g, '_');

      const rawName =
        user.displayName ||
        `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
        'Employee';
      const empName = String(rawName).trim().replace(/[^a-zA-Z0-9_-]/g, '_');

      const docName = 'Digital_Signature';

      for (const sig of signatures) {
        if (!sig.signature) continue;

        const filePath = path.join(
          __dirname,
          '../uploads/user/signature',
          sig.signature,
        );

        if (!fs.existsSync(filePath)) continue;

        let extension = sig.signature.split('.').pop() || 'png';
        if (extension === 'bin') {
          extension = 'png';
        }

        const timestamp = sig.createdAt
          ? new Date(sig.createdAt).getTime()
          : Date.now();

        let baseName = `${empCode}_${empName}_${docName}_${timestamp}`;
        let finalFileName = `${baseName}.${extension}`;

        let duplicateCounter = 1;
        while (usedNames.has(finalFileName.toLowerCase())) {
          finalFileName = `${baseName}_${duplicateCounter}.${extension}`;
          duplicateCounter++;
        }
        usedNames.add(finalFileName.toLowerCase());

        try {
          const fileData = fs.readFileSync(filePath);
          zip.file(finalFileName, fileData);
          fileCount++;
        } catch (e) {
          console.error(`Failed to read signature file ${filePath}:`, e);
        }
      }
    }

    if (fileCount === 0) {
      return res.status(200).json({
        status: 200,
        message: 'No digital signatures found on to download!',
      });
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename=employeeDigitalSignatures.zip',
    });
    return res.end(zipBuffer);
  } catch (error) {
    next(error);
  }
};
