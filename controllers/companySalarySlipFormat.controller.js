const companyMaster = require('../models/companyMaster');
const CompanySalarySlipFormat = require('../models/companySalarySlipFormat');
const message = require('../response_message/message');

exports.addUpdateCompanySalarySlipFormat = async (req, res, next) => {
  try {
    const { salarySlipFormatID, companyMasterID } = req.body.body;

    const existData = await CompanySalarySlipFormat.findOne({
      where: {
        companyMasterID: companyMasterID,
      },
    });

    if (existData) {
      await CompanySalarySlipFormat.update(
        {
          salarySlipFormatID,
        },
        {
          where: {
            companyMasterID,
          },
          individualHooks: true,
          user: req.userDetails,
        },
      );
    } else {
      await CompanySalarySlipFormat.create(
        {
          companyMasterID,
          salarySlipFormatID,
        },
        {
          user: req.userDetails,
        },
      );
    }

    res.status(200).json({
      status: 200,
      message: existData
        ? message.usermessage.updateMessage('Salary Slip Format')
        : message.usermessage.addMessage('Salary Slip Format'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllCompanySalarySlipFormat = async (req, res, next) => {
  try {
    const { page, limit, companyMasterID } = req.body;

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const { rows, count } = await CompanySalarySlipFormat.findAndCountAll({
      order: [['createdAt', 'DESC']],
      ...paginationQuery,
      where: {
        companyMasterID: companyMasterID,
      },
      include: [
        {
          required: false,
          model: companyMaster,
          attributes: ['companyMasterID'],
        },
      ],
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
