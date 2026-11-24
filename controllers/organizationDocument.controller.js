const OrganizationDocument = require('../models/organizationDocuments');
const { statusCodes, userAttributes } = require('../utils/commonVars');
const message = require('../response_message/message');
const { Op } = require('sequelize');
const companyMaster = require('../models/companyMaster');
const UserMaster = require('../models/userMaster');
const sequelize = require('../config/database');
const path = require('path');
const fs = require('fs');
const { asiaKolkataDateTime } = require('../utils/commonUtilFunctions');

exports.addOrganizationDocument = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      expireDate,
      documentName,
      description,
      isExpireDate,
    } = await req.body;
    const filePath = req.file
      ? `uploads/organizationDocument/${companyMasterID}/`
      : '';

    if (JSON.parse(isExpireDate) && expireDate == '') {
      return res.status(statusCodes.OK).json({
        status: 401,
        message: message.usermessage.invalidField('Expiry Date'),
      });
    }

    const existDocument = await OrganizationDocument.findOne({
      where: {
        documentName: {
          [Op.iLike]: documentName,
        },
      },
    });

    if (existDocument) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: message.usermessage.alreadyExists(
          'Organization document ' + documentName,
        ),
      });
    }

    await OrganizationDocument.create(
      {
        companyMasterID,
        documentName,
        file: filePath + req.file.filename,
        description,
        expireDate: JSON.parse(isExpireDate) ? expireDate : null,
        isExpireDate: JSON.parse(isExpireDate),
      },
      {
        user: req.userDetails,
      },
    );

    return res.status(statusCodes.OK).json({
      status: 200,
      message: message.usermessage.addMessage('Organization Document'),
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllOrganizationDocuments = async (req, res, next) => {
  try {
    const { companyMasterID, page, limit, searchQuery, expiryDays } = req.body;
    if (!companyMasterID) {
      return res.status(statusCodes.OK).json({
        status: 401,
        message: message.usermessage.invalidField('Company'),
      });
    }
    const paginationQuery =
      page && limit
        ? {
            offset: (page - 1) * limit,
            limit: limit,
          }
        : {};

    const condition = {
      companyMasterID,
      status: 1,
    };

    if (expiryDays) {
      const halfMonthLaterDate = new Date();
      halfMonthLaterDate.setDate(halfMonthLaterDate.getDate() + expiryDays);
      const formattedAfterExpiryDaysDate = asiaKolkataDateTime(
        new Date(halfMonthLaterDate),
      );
      condition['expireDate'] = {
        [Op.lte]: formattedAfterExpiryDaysDate,
      };
    }

    if (searchQuery) {
      condition['documentName'] = {
        [Op.iLike]: '%' + searchQuery + '%',
      };
    }

    const { rows: organizationDocuments, count } =
      await OrganizationDocument.findAndCountAll({
        distinct: true,
        ...paginationQuery,
        where: condition,
        order: [['createdAt', 'DESC']],
        include: [
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
      status: statusCodes.OK,
      data: organizationDocuments,
      totalcount: count,
    });
  } catch (error) {
    next(error);
  }
};

exports.getOrganizationDocumentByID = async (req, res, next) => {
  try {
    const organizationDocumentID = req.params?.id;

    if (!organizationDocumentID) {
      return res.status(statusCodes.OK).json({
        status: 401,
        message: message.usermessage.invalidField('Organization Document'),
      });
    }
    const organizationDocuments = await OrganizationDocument.findOne({
      where: {
        organizationDocumentID,
      },
      include: [
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
      status: statusCodes.OK,
      data: organizationDocuments,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateOrganizationDocuments = async (req, res, next) => {
  try {
    const {
      organizationDocumentID,
      expireDate,
      documentName,
      description,
      isExpireDate,
    } = req.body;

    const existDocument = await OrganizationDocument.findOne({
      where: {
        organizationDocumentID,
      },
    });

    if (!existDocument) {
      return res.status(statusCodes.NOT_FOUND).json({
        status: statusCodes.NOT_FOUND,
        message: message.usermessage.notFoundMessage('Organization Document'),
      });
    }

    existDocument.documentName = documentName;
    existDocument.description = description;
    existDocument.expireDate =
      expireDate && expireDate != '' ? expireDate : null;
    existDocument.isExpireDate = JSON.parse(isExpireDate);

    if (req.file) {
      const filePath = req.file
        ? `uploads/organizationDocument/${existDocument.companyMasterID}/`
        : '';
      if (existDocument.file) {
        const filePath = path.join(__dirname, `../${existDocument.file}`);
        fs.unlink(filePath, function (err) {});
      }
      existDocument.file = filePath + req.file.filename;
    }
    await existDocument.save({
      user: req.userDetails,
    });

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: message.usermessage.updateMessage('Organization Document'),
    });
  } catch (error) {
    next(error);
  }
};

exports.renewOrganizationDocument = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      companyMasterID,
      organizationDocumentID,
      expireDate,
      documentName,
      description,
      isExpireDate,
    } = req.body;

    const existDocument = await OrganizationDocument.findOne({
      where: {
        organizationDocumentID,
      },
    });

    if (!existDocument) {
      await transaction.rollback();
      return res.status(statusCodes.OK).json({
        status: statusCodes.NOT_FOUND,
        message: message.usermessage.notFoundMessage('Organization Document'),
      });
    }

    existDocument.status = 0;
    await existDocument.save({
      user: req.userDetails,
      transaction,
    });

    const filePath = req.file
      ? `uploads/organizationDocument/${companyMasterID}/`
      : '';

    await OrganizationDocument.create(
      {
        companyMasterID,
        documentName,
        file: filePath + req.file.filename,
        description,
        expireDate: JSON.parse(isExpireDate) ? expireDate : null,
        isExpireDate: JSON.parse(isExpireDate),
        oldOrgDocumentID:
          existDocument.oldOrgDocumentID === null
            ? organizationDocumentID
            : existDocument.oldOrgDocumentID,
      },
      {
        user: req.userDetails,
        transaction,
      },
    );

    await transaction.commit();
    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: message.usermessage.renewMessage('Organization document'),
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

exports.getOrganizationDocumentHistory = async (req, res, next) => {
  try {
    const organizationDocumentID = req.params?.id;

    const documentHistory = await OrganizationDocument.findAll({
      where: {
        [Op.or]: [
          {
            organizationDocumentID: organizationDocumentID,
          },
          {
            oldOrgDocumentID: organizationDocumentID,
          },
        ],
        status: [0, 1],
      },
      order: [['createdAt', 'DESC']],
      include: [
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
      data: documentHistory,
      status: statusCodes.OK,
    });
  } catch (error) {
    next(error);
  }
};
