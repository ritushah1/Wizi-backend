const { Sequelize } = require('sequelize');
const IdCardFormat = require('../models/idCardFormat');
const sequelize = require('../config/database');
const message = require('../response_message/message');
const fs = require('fs');

exports.postAddIdCardFormat = async (req, res, next) => {
  try {
    const {
      idCardFormatName,
      portraitHtmlPath,
      landscapeHtmlPath,
      pdfPortraitHtmlPath,
      pdfLandscapeHtmlPath,
    } = req.body;

    const existData = await IdCardFormat.findOne({
      where: {
        [Sequelize.Op.and]: [
          sequelize.where(
            sequelize.fn(
              'TRIM',
              sequelize.fn('LOWER', sequelize.col('idCardFormatName')),
            ),
            idCardFormatName.trim().toLowerCase(),
          ),
        ],
      },
    });

    if (existData) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyExists('ID Card Format'),
      });
    }

    const portraitIdCardPath = req.files?.portraitAttachFile?.[0]
      ? `uploads/idCardFormat/${req.files.portraitAttachFile[0].filename}`
      : null;

    const portraitThumbnailPath = req.files?.portraitAttachImage?.[0]
      ? `uploads/idCardFormat/${req.files.portraitAttachImage[0].filename}`
      : null;

    const landscapeIdCardPath = req.files?.landscapeAttachFile?.[0]
      ? `uploads/idCardFormat/${req.files.landscapeAttachFile[0].filename}`
      : null;

    const landscapeThumbnailPath = req.files?.landscapeAttachImage?.[0]
      ? `uploads/idCardFormat/${req.files.landscapeAttachImage[0].filename}`
      : null;

    const pdfPortraitIdCardPath = req.files?.portraitAttachFile?.[0]
      ? `uploads/idCardFormat/${req.files.portraitAttachFile[0].filename}`
      : null;

    const pdfPortraitThumbnailPath = req.files?.portraitAttachImage?.[0]
      ? `uploads/idCardFormat/${req.files.portraitAttachImage[0].filename}`
      : null;

    const pdfLandscapeIdCardPath = req.files?.landscapeAttachFile?.[0]
      ? `uploads/idCardFormat/${req.files.landscapeAttachFile[0].filename}`
      : null;

    const pdfLandscapeThumbnailPath = req.files?.landscapeAttachImage?.[0]
      ? `uploads/idCardFormat/${req.files.landscapeAttachImage[0].filename}`
      : null;

    await IdCardFormat.create(
      {
        idCardFormatName,
        portraitIdCardPath,
        portraitThumbnailPath,
        portraitHtmlPath,
        landscapeHtmlPath,
        landscapeIdCardPath,
        landscapeThumbnailPath,
        pdfPortraitIdCardPath,
        pdfPortraitThumbnailPath,
        pdfLandscapeIdCardPath,
        pdfLandscapeThumbnailPath,
        pdfPortraitHtmlPath,
        pdfLandscapeHtmlPath,
      },
      {
        user: req.userDetails,
      },
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('ID Card Format'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllIdCardFormat = async (req, res, next) => {
  try {
    const { page, limit, searchQuery = '', exportData } = req.body;

    const paginationQuery =
      page && limit && !exportData
        ? {
            offset: (page - 1) * limit,
            limit: limit,
          }
        : {};

    const { rows, count } = await IdCardFormat.findAndCountAll({
      order: [['createdAt', 'DESC']],
      ...paginationQuery,
      where: {
        [Sequelize.Op.or]: [
          {
            idCardFormatName: {
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

const iDCardTypeKeys = [
  { key: 'portraitIdCardPath', file: 'portraitAttachFile' },
  { key: 'portraitThumbnailPath', file: 'portraitAttachImage' },
  { key: 'landscapeIdCardPath', file: 'landscapeAttachFile' },
  { key: 'landscapeThumbnailPath', file: 'landscapeAttachImage' },
  { key: 'pdfPortraitIdCardPath', file: 'pdfPortraitAttachFile' },
  { key: 'pdfPortraitThumbnailPath', file: 'pdfPortraitAttachImage' },
  { key: 'pdfLandscapeIdCardPath', file: 'pdfLandscapeAttachFile' },
  { key: 'pdfLandscapeThumbnailPath', file: 'pdfLandscapeAttachImage' },
];

const htmlPathKeys = [
  'portraitHtmlPath',
  'landscapeHtmlPath',
  'pdfPortraitHtmlPath',
  'pdfLandscapeHtmlPath',
];

exports.updateIdCardFormat = async (req, res, next) => {
  try {
    const { idCardFormatID, idCardFormatName } = req.body;

    const existData = await IdCardFormat.findOne({
      where: { idCardFormatID },
    });

    if (!existData) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('ID Card Format'),
      });
    }

    const existSameName = await IdCardFormat.findOne({
      where: {
        [Sequelize.Op.and]: [
          sequelize.where(
            sequelize.fn(
              'TRIM',
              sequelize.fn('LOWER', sequelize.col('idCardFormatName')),
            ),
            idCardFormatName.trim().toLowerCase(),
          ),
          { idCardFormatID: { [Sequelize.Op.ne]: idCardFormatID } },
        ],
      },
    });

    if (existSameName) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyExists('ID Card Format'),
      });
    }

    const removeFiles = [];

    const filesToRemove = [];

    for (let type of iDCardTypeKeys) {
      const receivedFile = req.files?.[type.file]?.[0] || null;
      removeFiles.push({ newFile: receivedFile, oldFile: existData[type.key] });

      existData[type.key] = receivedFile
        ? `uploads/idCardFormat/${receivedFile.filename}`
        : existData[type.key];

      if (receivedFile && existData[type.key]) {
        filesToRemove.push(existData[type.key]);
      }
    }

    existData.idCardFormatName = idCardFormatName;
    for (let htmlKey of htmlPathKeys) {
      existData[htmlKey] = req?.body?.[htmlKey];
    }
    // existData.portraitHtmlPath = portraitHtmlPath;
    // existData.landscapeHtmlPath = landscapeHtmlPath;

    await existData.save({
      user: req.userDetails,
    });

    for (let file of removeFiles) {
      if (file?.newFile && fs.existsSync(file?.oldFile)) {
        fs.unlinkSync(file?.oldFile);
      }
    }

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('ID Card Format'),
    });
  } catch (error) {
    next(error);
  }
};

exports.getIdCardFormatByID = async (req, res, next) => {
  try {
    const idCardFormatID = req.body.idCardFormatID;

    if (!idCardFormatID)
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('ID Card Format'),
      });

    const data = await IdCardFormat.findOne({
      where: {
        idCardFormatID,
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
