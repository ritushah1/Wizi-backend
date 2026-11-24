const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const message = require('../response_message/message');
const companyMaster = require('../models/companyMaster');
const { generateExcel } = require('../utils/exportData');
const moment = require('moment');
const CompanyBankDetails = require('../models/companyBankDetails');
const UserMaster = require('../models/userMaster');
const BankMaster = require('../models/bankMaster');

exports.addCompanyBankDetails = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      companyMasterID,
      bankAccountNo,
      bankIfscCode,
      nameAsBank,
      accountType,
      description,
      bankMasterID,
    } = await req.body;

    const findCompanyBankDetails = await CompanyBankDetails.findOne({
      where: {
        companyMasterID,
      },
    });

    if (findCompanyBankDetails) {
      await transaction.rollback()
      return res.status(404).json({
        status: 404,
        message: message.usermessage.alreadyExists('Company Bank Details'),
      });
    }

    await CompanyBankDetails.create(
      {
        companyMasterID,
        bankAccountNo,
        bankIfscCode,
        nameAsBank,
        accountType,
        description,
        bankMasterID,
      },
      { user: req.userDetails ,transaction}
    );
    
    await transaction.commit()

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Company Bank Details'),
    });
  } catch (err) {
    await transaction.rollback()
    next(err);
  }
};

exports.editCompanyBankDetails = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      companyBankDetailsID,
      bankAccountNo,
      bankIfscCode,
      nameAsBank,
      accountType,
      description,
      bankMasterID,
    } = req.body;

    await CompanyBankDetails.update(
      {
        bankAccountNo,
        bankIfscCode,
        nameAsBank,
        accountType,
        description,
        bankMasterID,
      },
      {
        where: { companyBankDetailsID },
        individualHooks: true,
        transaction,
        user: req.userDetails,
      }
    );
    await transaction.commit()

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Company Bank Details'),
    });
  } catch (err) {
    await transaction.rollback()
    next(err);
  }
};

exports.getAllCompanyBankDetails = async (req, res, next) => {
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

    const { rows: companyBankDetailsData, count } =
      await CompanyBankDetails.findAndCountAll({
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
            model: BankMaster,
            attributes: ['bankMasterID', 'bankName'],
          },
        ],
      });

    if (exportData) {
      const finaldata = companyBankDetailsData.map((e) => {
        return {
          'Company Name': e.companyMaster?.companyName || '-',
          'Bank Name': e.bankMaster?.bankName || '-',
          'Bank Account Number': e.bankAccountNo || '-',
          'Bank IFSC Code': e.bankIfscCode || '-',
          'Name As Per Bank Account': e.nameAsBank || '-',
          'Account Type': e.accountType || '-',
          'Created By': `${e.createdBy?.displayName || ''} On ${moment(e.createdAt).format('DD-MM-YYYY HH:mm') || ''}`,
          'Updated By': e.updateBy
            ? `${e.updatedBy?.displayName || ''} On ${moment(e.updatedAt).format('DD-MM-YYYY HH:mm') || ''}`
            : '',
        };
      });

      return await generateExcel(finaldata, 'Expense Purpose', 'xlsx', res);
    }
    return res.status(200).json({
      status: 200,
      data: companyBankDetailsData,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};

exports.getCompanyBankDetailsByID = async (req, res, next) => {
  try {
    const { companyBankDetailsID } = req.body;

    if (!companyBankDetailsID) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: message.usermessage.notFoundMessage('Company Bank Details ID'),
      });
    }

    const get_one_data = await CompanyBankDetails.findOne({
      where: {
        companyBankDetailsID,
      },
    });

    if (!get_one_data) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: message.usermessage.notFoundMessage('Expense Purpose'),
      });
    }

    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.deleteCompanyBankDetailsByID = async (req, res, next) => {
  try {
    const { companyBankDetailsID } = await req.body;

    await CompanyBankDetails.destroy({
      where: { companyBankDetailsID },
      individualHooks: true,
      user: req.userDetails,
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Company Bank Details'),
    });
  } catch (err) {
    next(err);
  }
};
