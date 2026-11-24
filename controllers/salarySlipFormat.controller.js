const { Sequelize } = require('sequelize');
const SalarySlipFormat = require('../models/salarySlipFormat');
const message = require('../response_message/message');
const sequelize = require('../config/database');
const fs = require('fs');
exports.postAddSalarySlipFormat = async (req, res, next) => {
  try {
    const { salarySlipFormatName } = req.body;

    const existData = await SalarySlipFormat.findOne({
      where: {
        [Sequelize.Op.and]: [
          sequelize.where(
            sequelize.fn(
              'TRIM',
              sequelize.fn('LOWER', sequelize.col('salarySlipFormatName'))
            ),
            salarySlipFormatName.trim().toLowerCase()
          ),
        ],
      },
    });

    if (existData) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyExists('Salary Slip Format'),
      });
    }

    const salarySlipPath = req.files?.attachFile?.[0]
      ? `uploads/salarySlipFormat/${req.files.attachFile[0].filename}`
      : null;

    const thumbnailPath = req.files?.attachImage?.[0]
      ? `uploads/salarySlipFormat/${req.files.attachImage[0].filename}`
      : null;

    await SalarySlipFormat.create(
      {
        salarySlipFormatName,
        salarySlipPath,
        thumbnailPath,
      },
      {
        user: req.userDetails,
      }
    );

    res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Salary Slip Format'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllSalarySlipFormat = async (req, res, next) => {
  try {
    const { page, limit, searchQuery='', exportData } = req.body;

    const paginationQuery = {};
    if (page && limit && !exportData) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const { rows, count } = await SalarySlipFormat.findAndCountAll({
      order: [['createdAt', 'DESC']],
      ...paginationQuery,
      where: {
        [Sequelize.Op.or]: [
          {
            salarySlipFormatName: {
              [Sequelize.Op.iLike]: '%' + searchQuery + '%',
            },
          },
        ],
      },
    });

    return res.status(200).json({
      status: 200,
      data: rows,
      totalcount: count,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateSalarySlipFormat = async (req, res, next) => {
  try {
    const { salarySlipFormatID, salarySlipFormatName } = req.body;

    const existData = await SalarySlipFormat.findOne({
      where: { salarySlipFormatID }
    });

    if (!existData) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Salary Slip Format'),
      });
    }

    const existSameName = await SalarySlipFormat.findOne({
      where: {
        [Sequelize.Op.and]: [
          sequelize.where(
            sequelize.fn(
              'TRIM',
              sequelize.fn('LOWER', sequelize.col('salarySlipFormatName'))
            ),
            salarySlipFormatName.trim().toLowerCase()
          ),
          { salarySlipFormatID: { [Sequelize.Op.ne]: salarySlipFormatID } },
        ],
      },
    });

    if (existSameName) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyExists('Salary Slip Format'),
      });
    }

    const pdfFile = req.files?.attachFile?.[0];
    const imageFile = req.files?.attachImage?.[0];

    const newPdfPath = pdfFile
      ? `uploads/salarySlipFormat/${pdfFile.filename}`
      : existData.salarySlipPath;

    const newImagePath = imageFile
      ? `uploads/salarySlipFormat/${imageFile.filename}`
      : existData.thumbnailPath;

    await SalarySlipFormat.update(
      {
        salarySlipFormatName,
        salarySlipPath: newPdfPath,
        thumbnailPath: newImagePath,
      },
      {
        where: { salarySlipFormatID },
        individualHooks: true,
        user: req.userDetails,
      }
    );

    if (pdfFile && existData.salarySlipPath) {
      if (fs.existsSync(existData.salarySlipPath)) {
        fs.unlinkSync(existData.salarySlipPath);
      }
    }

    if (imageFile && existData.thumbnailPath) {
      if (fs.existsSync(existData.thumbnailPath)) {
        fs.unlinkSync(existData.thumbnailPath);
      }
    }

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Salary Slip Format'),
    });

  } catch (error) {
    next(error);
  }
};


exports.getSalarySlipFormatByID = async (req, res, next) => {
  try {
    const salarySlipFormatID = req.body.salarySlipFormatID;

    if (!salarySlipFormatID)
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Salary Slip Format'),
      });

    const data = await SalarySlipFormat.findOne({
      where: {
        salarySlipFormatID,
      },
    });

    return res.status(200).json({
      status: 200,
      data: data,
    });
  } catch (error) {
    next(error);
  }
};
