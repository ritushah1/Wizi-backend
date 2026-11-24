const Sequelize = require('sequelize');
const { usermessage } = require('../response_message/message');
const companyMaster = require('../models/companyMaster');
const { statusCodes } = require('../utils/commonVars');
const CompanyApiKey = require('../models/companyApiKey');

exports.add = async (req, res, next) => {
  try {
    const { companyMasterID, } = req.body;

    if (!companyMasterID) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.OK,
        message: usermessage.addMessage('Company'),
      });
    }

    await CompanyApiKey.create(req.body, { user: req.userDetails });

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: usermessage.addMessage('API Key'),
    });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { companyMasterID } = req.body;

    if (!companyMasterID) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.OK,
        message: usermessage.notFoundMessage('Company'),
      });
    }

    const data = await CompanyApiKey.findOne({
      where: {
        companyMasterID,
      },
    });

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data: data ? data : [],
    });
  } catch (error) {
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const { companyApiKeyID } = req.body;

    const data = await CompanyApiKey.findByPk(companyApiKeyID, {});

    if (!data)
      return res.status(statusCodes.OK).json({
        status: statusCodes.NOT_FOUND,
        message: usermessage.notFoundMessage('API Key'),
      });

    await data.destroy({ user: req.userDetails });

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: usermessage.deleteMessage('API Key'),
    });
  } catch (error) {
    next(error);
  }
};