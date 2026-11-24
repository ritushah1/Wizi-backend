const { Sequelize, where } = require('sequelize');
const sequelize = require('../config/database');
const PunchInOutCustomizeForm = require('../models/punchInOutCustomizeForm');
const CompanyMaster = require('../models/companyMaster');
const UserMaster = require('../models/userMaster');
const message = require('../response_message/message');
const { statusCodes } = require('../utils/commonVars');
const punchInOutCustomizeFields = require('../models/punchInOutCustomizeFields');
const PunchInOutFormValue = require('../models/punchInOutFormValue');

exports.addPunchInOutCustomizeForm = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      name = null,
      type = null,
      companyMasterID = null,
      fields = [],
    } = req.body;

    if (!name || !type || !companyMasterID) {
      await transaction.rollback();

      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: message.errorMessage.INVALID_FILTER_FIELDS,
      });
    }

    // Check duplicate form name
    const findData = await PunchInOutCustomizeForm.findOne({
      where: { name: name },
      transaction,
    });

    if (findData) {
      await transaction.rollback();

      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: 'Customize form with same name already exists',
      });
    }

    // Validate fields
    if (Array.isArray(fields) && fields.length) {
      // Check duplicate index
      const indexes = fields
        .map((field) => field.index)
        .filter(
          (index) => index !== null && index !== undefined && index !== '',
        );

      const duplicateIndexes = indexes.filter(
        (index, i) => indexes.indexOf(index) !== i,
      );

      if (duplicateIndexes.length > 0) {
        await transaction.rollback();

        return res.status(200).json({
          status: statusCodes.BAD_REQUEST,
          message: `Index ${duplicateIndexes[0]} is entered more than once. Please use a unique index.`,
        });
      }

      // Check duplicate fieldLabel
      const fieldLabels = fields
        .map((field) => field.fieldLabel?.trim().toLowerCase())
        .filter(
          (label) => label !== null && label !== undefined && label !== '',
        );

      const duplicateFieldLabels = fieldLabels.filter(
        (label, i) => fieldLabels.indexOf(label) !== i,
      );

      if (duplicateFieldLabels.length > 0) {
        await transaction.rollback();

        return res.status(200).json({
          status: statusCodes.BAD_REQUEST,
          message: `Field Label "${duplicateFieldLabels[0]}" is entered more than once. Please use a unique Field Label.`,
        });
      }
    }

    // Create form
    const newForm = await PunchInOutCustomizeForm.create(
      {
        name,
        type,
        companyMasterID,
      },
      {
        user: req.userDetails,
        transaction,
      },
    );

    // Create fields
    if (Array.isArray(fields) && fields.length) {
      const fieldsData = fields.map((field) => ({
        index: field.index,
        fieldLabel: field.fieldLabel,
        inputType: field.inputType,
        isRequired: field.isRequired,
        punchInOutCustomizeFormID: newForm.punchInOutCustomizeFormID,
        values:
          Array.isArray(field.values) && field.values.length > 0
            ? field.values
            : null,
      }));

      await punchInOutCustomizeFields.bulkCreate(fieldsData, {
        individualHooks: true,
        user: req.userDetails,
        transaction,
      });
    }

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Punch In/Out Customize Form'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.updatePunchInOutCustomizeForm = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      punchInOutCustomizeFormID = null,
      name = null,
      type = null,
      companyMasterID = null,
      fields = [],
    } = req.body;

    if (!punchInOutCustomizeFormID) {
      await transaction.rollback();

      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: message.errorMessage.INVALID_FILTER_FIELDS,
      });
    }

    const existingForm = await PunchInOutCustomizeForm.findOne({
      where: { punchInOutCustomizeFormID },
      transaction,
    });

    if (!existingForm) {
      await transaction.rollback();

      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage(
          'Punch In/Out Customize Form',
        ),
      });
    }

    // Check duplicate index
    if (Array.isArray(fields) && fields.length) {
      const indexes = fields
        .map((field) => field.index)
        .filter(
          (index) => index !== null && index !== undefined && index !== '',
        );

      const duplicateIndexes = indexes.filter(
        (index, i) => indexes.indexOf(index) !== i,
      );

      if (duplicateIndexes.length > 0) {
        await transaction.rollback();

        return res.status(200).json({
          status: statusCodes.BAD_REQUEST,
          message: `Index ${duplicateIndexes[0]} is entered more than once. Please use a unique index.`,
        });
      }
      const fieldLabels = fields
        .map((field) => field.fieldLabel?.trim().toLowerCase())
        .filter(
          (label) => label !== null && label !== undefined && label !== '',
        );

      const duplicateFieldLabels = fieldLabels.filter(
        (label, i) => fieldLabels.indexOf(label) !== i,
      );

      if (duplicateFieldLabels.length > 0) {
        await transaction.rollback();

        return res.status(200).json({
          status: statusCodes.BAD_REQUEST,
          message: `Field Label "${duplicateFieldLabels[0]}" is entered more than once. Please use a unique Field Label.`,
        });
      }
    }

    // Update main form
    await PunchInOutCustomizeForm.update(
      {
        name,
        type,
        companyMasterID,
      },
      {
        where: { punchInOutCustomizeFormID },
        individualHooks: true,
        user: req.userDetails,
        transaction,
      },
    );

    // Remove all existing fields
    await punchInOutCustomizeFields.destroy({
      where: { punchInOutCustomizeFormID },
      individualHooks: true,
      user: req.userDetails,
      transaction,
    });

    // Recreate fields
    if (Array.isArray(fields) && fields.length) {
      const fieldsData = fields.map((field) => ({
        index: field.index,
        fieldLabel: field.fieldLabel,
        inputType: field.inputType,
        isRequired: field.isRequired,
        punchInOutCustomizeFormID,
        values:
          Array.isArray(field.values) && field.values.length > 0
            ? field.values
            : null,
      }));

      await punchInOutCustomizeFields.bulkCreate(fieldsData, {
        individualHooks: true,
        user: req.userDetails,
        transaction,
      });
    }

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Punch In/Out Customize Form'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getAllPunchInOutCustomizeForm = async (req, res, next) => {
  try {
    const { limit, page, searchQuery, companyMasterID, type } = req.body;

    const condition = {};
    if (companyMasterID) {
      condition.companyMasterID = companyMasterID;
    }
    if (type) {
      condition.type = type;
    }
    if (searchQuery) {
      condition.name = { [Sequelize.Op.iLike]: `%${searchQuery}%` };
    }

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const { rows: formData, count } =
      await PunchInOutCustomizeForm.findAndCountAll({
        distinct: true,
        where: condition,
        ...paginationQuery,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: CompanyMaster,
            attributes: ['companyMasterID', 'companyName'],
          },
          {
            model: UserMaster,
            as: 'createdByUserDetails',
            attributes: ['displayName'],
          },
          {
            model: UserMaster,
            as: 'updatedByUserDetails',
            attributes: ['displayName'],
          },
        ],
      });

    return res.status(200).json({
      status: 200,
      data: formData,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};

exports.getPunchInOutCustomizeFormById = async (req, res, next) => {
  try {
    const { punchInOutCustomizeFormID } = req.body;

    if (!punchInOutCustomizeFormID) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: message.errorMessage.INVALID_FILTER_FIELDS,
      });
    }

    const formData = await PunchInOutCustomizeForm.findOne({
      where: { punchInOutCustomizeFormID },
      include: [
        {
          model: CompanyMaster,
          attributes: ['companyMasterID', 'companyName'],
        },
        {
          model: UserMaster,
          as: 'createdByUserDetails',
          attributes: ['displayName'],
        },
        {
          model: UserMaster,
          as: 'updatedByUserDetails',
          attributes: ['displayName'],
        },
        {
          model: punchInOutCustomizeFields,
          as: 'fields',
          attributes: [
            'punchInOutCustomizeFieldsID',
            'index',
            'inputType',
            'fieldLabel',
            'isRequired',
            'values',
          ],
        },
      ],

      order: [
        [{ model: punchInOutCustomizeFields, as: 'fields' }, 'index', 'ASC'],
      ],
    });

    if (!formData) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage(
          'Punch In/Out Customize Form',
        ),
      });
    }

    return res.status(200).json({
      status: 200,
      data: {
        ...formData.toJSON(),
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.deletePunchInOutCustomizeForm = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { punchInOutCustomizeFormID } = req.body;

    if (!punchInOutCustomizeFormID) {
      await transaction.rollback();
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: message.errorMessage.INVALID_FILTER_FIELDS,
      });
    }

    const findData = await PunchInOutCustomizeForm.findOne({
      where: { punchInOutCustomizeFormID: punchInOutCustomizeFormID },
    });

    if (!findData) {
      await transaction.rollback();
      return res.status(200).json({ status: 401, message: 'no data found' });
    }

    await punchInOutCustomizeFields.destroy({
      where: { punchInOutCustomizeFormID: punchInOutCustomizeFormID },
      individualHooks: true,
      user: req.userDetails,
      transaction,
    });

    await PunchInOutCustomizeForm.destroy({
      where: { punchInOutCustomizeFormID: punchInOutCustomizeFormID },
      individualHooks: true,
      user: req.userDetails,
      transaction,
    });

    await transaction.commit();
    return res
      .status(200)
      .json({ status: 200, message: 'Punch In/Out Customize Form Deleted' });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.punchInOutCustomizeFormDropdown = async (req, res, next) => {
  try {
    const { companyMasterID, type } = req.body;

    if (!companyMasterID) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: message.errorMessage.INVALID_FILTER_FIELDS,
      });
    }
    const findData = await PunchInOutCustomizeForm.findAll({
      where: { companyMasterID: companyMasterID, type: type },
      attributes: ['punchInOutCustomizeFormID', 'name'],
    });
    return res
      .status(200)
      .json({ status: 200, data: findData, message: 'fetch successful' });
  } catch (err) {
    next(err);
  }
};

exports.getCustomizeFormValueByAttendanceLogID = async (req, res, next) => {
  try {
    const { attendanceLogID } = req.body;
    const formData = await PunchInOutFormValue.findAll({
      where: { attendanceLogID: attendanceLogID },
      order:[['fieldIndex','ASC']]
    });
    if (!formData) {
      return res.status(200).json({ status: 401, message: 'No value found' });
    }
    return res.status(200).json({ status: 200, data: formData });
  } catch (err) {
    next(err);
  }
};
