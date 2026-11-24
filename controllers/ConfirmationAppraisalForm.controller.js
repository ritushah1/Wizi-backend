const Sequelize = require('sequelize');
const message = require('../response_message/message');
const companyMaster = require('../models/companyMaster');
const sequelize = require('../config/database');
const ConfirmationAppraisalForm = require('../models/confirmationAppraisalFormParam');
const Designation = require('../models/designation');

exports.postAddConfirmationAppraisalForm = async (req, res, next) => {
  try {
    const {
      designationId,
      formParameters,
      companyMasterID,
      ratings,
      sequenceNumber,
    } = await req.body;

    if (!designationId || !formParameters || !companyMasterID || !ratings) {
      return res.status(400).json({
        status: 400,
        message: 'Required Fields are missing.',
      });
    }

    for (const designation of designationId) {
      const existingForm = await ConfirmationAppraisalForm.findOne({
        where: {
          companyMasterID,
          designationID: designation,
          status: ['0', '1'],
        },
        include: [
          {
            model: Designation,
            attributes: ['designationName'],
          },
        ],
      });

      if (existingForm) {
        return res.status(400).json({
          status: 400,
          message: `Form already exists for this designation (${existingForm.designation.designationName}).`,
        });
      }
    }
    const dataToInsert = [];

    designationId.map((designation) => {
      dataToInsert.push({
        designationID: designation,
        formParameters,
        companyMasterID,
        formParametersTypes: ratings,
        sequenceNumber: sequenceNumber,
      });
    });

    await ConfirmationAppraisalForm.bulkCreate(dataToInsert, {
      user: req.userDetails,
      individualHooks: true,
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Probation Assessment Form'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllConfirmationAppraisalForm = async (req, res, next) => {
  try {
    let { limit, page, searchQuery, companyMasterID } = await req.body;

    if (!companyMasterID) {
      return res.status(400).json({
        status: 400,
        message: message.usermessage.notFoundMessage('Company'),
      });
    }

    const condition = {
      status: ['0', '1'],
      companyMasterID: companyMasterID,
    };
    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          '$companyMaster.companyName$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          '$designation.designationName$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
      ];

    const { rows: confirmationAppraisalFormData, count } =
      await ConfirmationAppraisalForm.findAndCountAll({
        where: condition,
        ...paginationQuery,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: companyMaster,
            attributes: ['companyName'],
            required: false,
          },
          {
            model: Designation,
            attributes: ['designationName'],
            required: false,
          },
        ],
      });

    return res.status(200).json({
      status: 200,
      data: confirmationAppraisalFormData,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};

exports.poststatuschange = async (req, res, next) => {
  try {
    let { ConfirmationAppraisalFormParamID, status } = await req.body;

    if (!ConfirmationAppraisalFormParamID) {
      return res.status(400).json({
        status: 400,
        message: message.usermessage.notFoundMessage('Form'),
      });
    }

    await ConfirmationAppraisalForm.update(
      {
        status,
      },
      {
        where: {
          ConfirmationAppraisalFormParamID: ConfirmationAppraisalFormParamID,
          status: ['1', '0'],
        },
      },
    );
    const messageData =
      status == 1
        ? message.usermessage.activeMessage('Probation Assessment Form')
        : message.usermessage.deactiveMessage('Probation Assessment Form');
    return res.status(200).json({
      status: 200,
      message: messageData,
    });
  } catch (err) {
    next(err);
  }
};

exports.postEditConfirmationAppraisalForm = async (req, res, next) => {
  try {
    const {
      formId,
      designationId,
      companyMasterID,
      formParameters,
      ratings,
      sequenceNumber,
    } = req.body;

    if (!formId || !companyMasterID || !designationId || !ratings) {
      return res.status(400).json({
        status: 400,
        message: 'Form ID, Company, field type and Designation are required!',
      });
    }

    const existingForm = await ConfirmationAppraisalForm.findOne({
      where: {
        companyMasterID,
        designationID: designationId,
        status: ['0', '1'],
        ConfirmationAppraisalFormParamID: { [Sequelize.Op.ne]: formId }, // exclude current record
      },
      include: [
        {
          model: Designation,
          attributes: ['designationName'],
        },
      ],
    });

    if (existingForm) {
      return res.status(400).json({
        status: 400,
        message: `Form already exists for this designation (${existingForm.designation.designationName}).`,
      });
    }

    await ConfirmationAppraisalForm.update(
      {
        formParameters,
        companyMasterID,
        designationID: designationId,
        formParametersTypes: ratings,
        sequenceNumber: sequenceNumber,
      },
      {
        where: { ConfirmationAppraisalFormParamID: formId },
        individualHooks: true,
        user: req.userDetails,
      },
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Probation Assessment Form'),
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.getConfirmationAppraisalFormById = async (req, res, next) => {
  try {
    if (!req.body.ConfirmationAppraisalFormParamID) {
      return res.status(400).json({
        status: 400,
        message: message.usermessage.notFoundMessage('Form'),
      });
    }

    let get_one_data = await ConfirmationAppraisalForm.findOne({
      where: {
        ConfirmationAppraisalFormParamID:
          req.body.ConfirmationAppraisalFormParamID,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
    });

    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.getConfirmationAppraisalFormByDesignationId = async (
  req,
  res,
  next,
) => {
  try {
    if (!req.body.designationId) {
      return res.status(400).json({
        status: 400,
        message: message.usermessage.notFoundMessage('Form'),
      });
    }

    let get_one_data = await ConfirmationAppraisalForm.findOne({
      where: {
        designationID: req.body.designationId,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      order: [['sequenceNumber', 'ASC']],
    });

    if (get_one_data) {
      const sortedData = get_one_data.sequenceNumber
        .map((seq, index) => ({
          sequenceNumber: Number(seq),
          formParameters: get_one_data.formParameters[index],
          formParametersTypes: get_one_data.formParametersTypes[index],
        }))
        .sort((a, b) => a.sequenceNumber - b.sequenceNumber);

      get_one_data.dataValues.sequenceNumber = sortedData.map(
        (item) => item.sequenceNumber,
      );

      get_one_data.dataValues.formParameters = sortedData.map(
        (item) => item.formParameters,
      );

      get_one_data.dataValues.formParametersTypes = sortedData.map(
        (item) => item.formParametersTypes,
      );
    }

    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.deleteConfirmationAppraisalForm = async (req, res, next) => {
  try {
    const { ConfirmationAppraisalFormParamID } = req.body;

    if (!ConfirmationAppraisalFormParamID) {
      return res.status(400).json({
        status: 400,
        message: message.usermessage.notFoundMessage('Form'),
      });
    }

    await ConfirmationAppraisalForm.destroy({
      where: {
        ConfirmationAppraisalFormParamID: ConfirmationAppraisalFormParamID,
      },
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Probation Assessment Form'),
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
};
