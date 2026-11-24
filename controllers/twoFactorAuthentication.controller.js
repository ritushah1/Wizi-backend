const { authenticator } = require('otplib');
const message = require('../response_message/message');
const UserMaster = require('../models/userMaster');
const {
  encryptMFASecretCode,
  decryptMFASecretCode,
} = require('../utils/encryptDecrypt');
const { ProjectName } = require('../utils/labelUtils');
const companyMaster = require('../models/companyMaster');

exports.getQrCode = async (req, res, next) => {
  try {
    const userMasterID = req.userDetails.userMasterId;
    const companyID = req.userDetails.companyMasterId;
    const userData = await UserMaster.findOne({
      where: { userMasterID: userMasterID },
      include: [
        {
          model: companyMaster,
          where: { companyMasterID: companyID },
          attributes: ['companyName'],
        },
      ],
    });
    const secret = authenticator.generateSecret();
    const maskedNumber = userData.userNumber
      ? '*'.repeat(userData?.userNumber?.length - 3) +
        userData.userNumber.slice(-3)
      : '';
    const authenticatorDisplay = `${userData.companyMaster.companyName} (${maskedNumber})`;

    const uri = authenticator.keyuri(authenticatorDisplay, ProjectName, secret);

    return res.status(200).json({
      status: 200,
      data: {
        uri,
        secretKey: secret,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.checkSecretKey = async (req, res, next) => {
  try {
    const userMasterID = req.userDetails.userMasterId;

    if (!userMasterID) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('user id'),
      });
    }

    const userData = await UserMaster.findOne({
      where: { userMasterID },
      include: [
        {
          model: companyMaster,
          attributes: ['companyName'],
        },
      ],
    });

    if (!userData) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('user'),
      });
    }
    const maskedNumber = userData.userNumber
      ? '*'.repeat(userData?.userNumber?.length - 3) +
        userData.userNumber.slice(-3)
      : '';
    const authenticatorDisplay = `${userData.companyMaster.companyName} (${maskedNumber})`;

    let secretKey = null;
    let uri = '';

    if (userData.secretKey) {
      secretKey = decryptMFASecretCode(userData.secretKey);

      uri = authenticator.keyuri(authenticatorDisplay, ProjectName, secretKey);
    }

    return res.status(200).json({
      status: 200,
      uri,
      secretKey,
      data: userData,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateTwoFactorAuth = async (req, res, next) => {
  try {
    const { secretKey, mfaCode } = req.body;
    const userMasterID = req.userDetails.userMasterId;

    if (!userMasterID) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('user id'),
      });
    }

    const userData = await UserMaster.findOne({
      where: { userMasterID },
    });

    if (!userData) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('user'),
      });
    }

    // ==========================
    // ENABLE 2FA
    // ==========================
    if (secretKey) {
      if (!mfaCode || String(mfaCode).trim() === '') {
        return res.status(200).json({
          status: 401,
          message: 'MFA Code is required.',
        });
      }

      if (String(mfaCode).trim().length !== 6) {
        return res.status(200).json({
          status: 401,
          message: 'Please provide a valid 6-digit MFA Code.',
        });
      }

      const currentServerToken = authenticator.generate(secretKey);

      const isValid = authenticator.verify({
        token: String(mfaCode).trim(),
        secret: secretKey,
      });

      if (!isValid) {
        return res.status(200).json({
          status: 401,
          message: 'Incorrect or expired MFA Code.',
        });
      }

      await UserMaster.update(
        {
          secretKey: encryptMFASecretCode(secretKey),
        },
        {
          where: { userMasterID },
        },
      );

      return res.status(200).json({
        status: 200,
        message: message.usermessage.updateMessage(
          'Two Factor Authentication enabled',
        ),
      });
    }

    // ==========================
    // DISABLE 2FA
    // ==========================

    await UserMaster.update(
      {
        secretKey: null,
      },
      {
        where: { userMasterID },
      },
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage(
        'Two Factor Authentication disabled',
      ),
    });
  } catch (err) {
    next(err);
  }
};
