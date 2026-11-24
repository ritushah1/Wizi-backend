const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UniformDetail = require('../models/uniformDetail');
const message = require('../response_message/message');
const logger = require('../config/logger');
const { generateExcel } = require('../utils/exportData');
const UserMaster = require('../models/userMaster');
const { userAttributes } = require('../utils/commonVars');

// add api
exports.addUniformData = async (req, res, next) => {
  try {
    const { userMasterID, shirtSize, pantSize, shoeSize } = await req.body;

    const uniformData = await UniformDetail.findOne({
      where: {
        userMasterID,
        status: [1],
      },
    });

    if (uniformData) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyExists('Uniform Details'),
      });
    }

    await UniformDetail.create(
      {
        userMasterID,
        shirtSize,
        pantSize,
        shoeSize,
      },
      { user: req.userDetails }
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Uniform Details'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getUniformDataByID = async (req, res, next) => {
  try {
    const userUniformData = await UniformDetail.findOne({
      where: {
        uniformDetailID: req.params.id,
        status: 1,
      },
      include: [
        {
          model: UserMaster,
          attributes: ['firstName', 'lastName', 'displayName'],
        },
      ],
    });
    return res.status(200).json({ status: 200, data: userUniformData });
  } catch (err) {
    next(err);
  }
};
// get api
exports.getUniformDataByUserMasterID = async (req, res, next) => {
  try {
    const userUniformData = await UniformDetail.findAll({
      where: {
        userMasterID: req.params.id,
        status: 1,
      },
      include: [
        {
          model: UserMaster,
          attributes: ['firstName', 'lastName', 'displayName'],
        },
        {
          model: UserMaster,
          as: 'createdByUserDetails',
          attributes: userAttributes,
        },
      ],
    });

    return res.status(200).json({ status: 200, data: userUniformData });
  } catch (err) {
    next(err);
  }
};
exports.editUniformData = async (req, res, next) => {
  try {
    let { uniformDetailID, shirtSize, pantSize, shoeSize } = await req.body;
    let EditUniformData = await UniformDetail.update(
      {
        shirtSize,
        pantSize,
        shoeSize,
      },
      {
        where: { uniformDetailID: uniformDetailID },
      },
      {
        user: req.userDetails,
      }
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Uniform Details'),
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteUniformData = async (req, res, next) => {
  try {
    const { uniformDetailID } = req.params;

    const findData = await UniformDetail.findByPk(uniformDetailID);

    if (!findData) {
      return res.status(404).json({
        status: 404,
        message: 'Uniform Details not found!',
      });
    }
    await findData.destroy({
      user: req.userDetails,
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Uniform Details'),
    });
  } catch (err) {
    next(err);
  }
};
