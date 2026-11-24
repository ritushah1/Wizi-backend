const SalaryRegisterFormat = require('../models/salaryRegisterFormat');
const message = require('../response_message/message');

exports.addData = async (req, res, next) => {
  try {
    const { companyMasterID, fields = [] } = req.body;

    const data = await SalaryRegisterFormat.findOne({
      where: {
        companyMasterID,
      },
    });

    if (Array.isArray(fields) && fields.length) {
      if (!data) {
        // add data
        await SalaryRegisterFormat.create(
          {
            companyMasterID,
            fields,
          },
          {
            user: req.userDetails,
          }
        );
      } else {
        // update data
        data.fields = fields;
        await data.save({ user: req.userDetails });
      }
    } else {
      // delete data
      if (data) await data.destroy({ user: req.userDetails });
    }

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Salary Register Format'),
    });
  } catch (error) {
    next(error);
  }
};

exports.getByCompanyId = async (req, res, next) => {
  try {
    const { id } = req.params;

    const data = await SalaryRegisterFormat.findOne({
      where: {
        companyMasterID: id,
      },
    });

    return res.status(200).json({
      status: 200,
      data,
    });
  } catch (error) {
    next(error);
  }
};
