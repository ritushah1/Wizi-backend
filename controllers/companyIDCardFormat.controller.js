const CompanyIDCardFormat = require('../models/companyIDCardFormat');
const companyMaster = require('../models/companyMaster');
const message = require('../response_message/message');

exports.addUpdateCompanyIDCardFormat = async (req, res, next) => {
  try {
    const { idCardFormatID, companyMasterID } = req.body;

    const existData = await CompanyIDCardFormat.findOne({
      where: {
        companyMasterID: companyMasterID,
      },
    });

    if (existData) {
      await CompanyIDCardFormat.update(
        {
          idCardFormatID,
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
      await CompanyIDCardFormat.create(
        {
          companyMasterID,
          idCardFormatID,
        },
        {
          user: req.userDetails,
        },
      );
    }

    res.status(200).json({
      status: 200,
      message: existData
        ? message.usermessage.updateMessage('ID Card Format')
        : message.usermessage.addMessage('ID Card Format'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllCompanyIDCardFormat = async (req, res, next) => {
  try {
    const { page, limit, companyMasterID } = req.body;

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const { rows, count } = await CompanyIDCardFormat.findAndCountAll({
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
