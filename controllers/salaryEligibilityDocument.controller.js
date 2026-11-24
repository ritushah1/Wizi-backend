const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const message = require('../response_message/message');
const SalaryEligibilityDocument = require('../models/salaryEligibilityDocument');
const companyMaster = require('../models/companyMaster');
const UserMaster = require('../models/userMaster');
const DocumentList = require('../models/documentList');
const { generateExcel } = require('../utils/exportData');
const moment = require('moment');

exports.addSalaryEligibilityDocument = async (req, res, next) => {
  try {
    const { companyMasterID, documentListID = [] } = await req.body;
    if (!companyMasterID || documentListID.length === 0) {
      return res.status(200).json({
        status: 401,
        message: message.errorMessage.INVALID_FILTER_FIELDS,
      });
    }
    const findCompanySalaryEligibilityDocument =
      await SalaryEligibilityDocument.findOne({
        where: {
          companyMasterID,
          documentListID,
        },
      });

    if (findCompanySalaryEligibilityDocument) {
      return res.status(404).json({
        status: 404,
        message: message.usermessage.alreadyExists(
          'Company Salary Eligibility Document',
        ),
      });
    }
    const createCompanySalaryEligibilityDocument = [];
    for (let doc of documentListID) {
      createCompanySalaryEligibilityDocument.push({
        companyMasterID,
        documentListID: doc,
      });
    }

    await SalaryEligibilityDocument.bulkCreate(
      createCompanySalaryEligibilityDocument,
      {
        user: req.userDetails,
      },
    );
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage(
        'Company Salary Eligibility Document',
      ),
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllSalaryEligibilityDocument = async (req, res, next) => {
  try {
    const { limit, page, companyMasterID, exportData } = req.body;

    const condition = {
      companyMasterID: companyMasterID,
    };

    const paginationQuery = {};
    if (!exportData && page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const { rows: companySalaryEligibilityDocumentData, count } =
      await SalaryEligibilityDocument.findAndCountAll({
        where: condition,
        ...paginationQuery,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: companyMaster,
            attributes: ['companyName'],
          },
          {
            model: UserMaster,
            as: 'createdBy',
            attributes: ['displayName'],
          },
          {
            model: UserMaster,
            as: 'updatedBy',
            attributes: ['displayName'],
          },
          {
            model: DocumentList,
            as: 'document',
            attributes: ['documentListID', 'documentName'],
          },
        ],
      });

    if (exportData) {
      const finaldata = companySalaryEligibilityDocumentData.map((e, index) => {
        return {
          'Sr No': index + 1,
          'Company Name': e.companyMaster?.companyName || '',
          'Document Name': e.document?.documentName || '',
          'Created By': `${e.createdBy?.displayName || ''} On ${
            e.createdAt ? moment(e.createdAt).format('DD-MM-YYYY hh:mm A') : ''
          }`,
        };
      });

      return await generateExcel(
        finaldata,
        'Salary Eligibility Document',
        'xlsx',
        res,
      );
    }
    return res.status(200).json({
      status: 200,
      data: companySalaryEligibilityDocumentData,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};

exports.getSalaryEligibilityDocumentByID = async (req, res, next) => {
  try {
    const { salaryEligibilityDocumentID } = req.body;

    if (!salaryEligibilityDocumentID) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage(
          'Company Salary Eligibility Document ID',
        ),
      });
    }

    const get_one_data = await SalaryEligibilityDocument.findOne({
      where: {
        salaryEligibilityDocumentID,
      },
    });

    if (!get_one_data) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage(
          'Company Salary Eligibility Document',
        ),
      });
    }

    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.deleteSalaryEligibilityDocumentByID = async (req, res, next) => {
  try {
    const { salaryEligibilityDocumentID } = await req.body;

    await SalaryEligibilityDocument.destroy({
      where: { salaryEligibilityDocumentID },
      user: req.userDetails,
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage(
        'Company Salary Eligibility Document',
      ),
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllRemainingSalaryEligibilityDocument = async (req, res, next) => {
  try {
    const { companyMasterID } = req.body;

    const condition = {
      companyMasterID: companyMasterID,
    };

    const companySalaryEligibilityDocumentData =
      await SalaryEligibilityDocument.findAll({
        where: condition,
        order: [['createdAt', 'DESC']],
      });

    const companySalaryEligibilityDocumentIds =
      companySalaryEligibilityDocumentData.map((e) => +e.documentListID);

    const findAllRemainingSalaryEligibilityDocument =
      await DocumentList.findAll({
        where: {
          documentListID: {
            [Sequelize.Op.notIn]: companySalaryEligibilityDocumentIds,
          },
          status: 1,
        },
        order: [['documentName', 'ASC']],
      });

    return res.status(200).json({
      status: 200,
      data: findAllRemainingSalaryEligibilityDocument,
    });
  } catch (err) {
    next(err);
  }
};
