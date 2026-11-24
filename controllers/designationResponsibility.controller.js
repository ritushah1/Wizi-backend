const sequelize = require('../config/database');
const { Sequelize, Op } = require('sequelize');
const designationResponsibility = require('../models/designationResponsibility');
const designationResponsibilityDetails = require('../models/designationResponsibilityDetails');
const message = require('../response_message/message');
const { messaging } = require('firebase-admin');
exports.addOrEditDesignationResponsibility = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { designationID, responsibilities } = req.body;

    const existingResponsibility = await designationResponsibility.findOne({
      where: {
        designationId: designationID,
      },
      transaction,
    });

    if (existingResponsibility) {
      const existingResponsibilities = await designationResponsibility.findAll({
        where: {
          designationId: designationID,
        },
        attributes: ['id'],
        transaction,
      });

      const responsibilityIDs = existingResponsibilities.map((item) => item.id);

      if (responsibilityIDs.length) {
        await designationResponsibilityDetails.destroy({
          where: {
            desigRespoID: {
              [Op.in]: responsibilityIDs,
            },
          },
          transaction,
          user: req.userDetails,
          individualHooks: true,
        });

        await designationResponsibility.destroy({
          where: {
            designationId: designationID,
          },
          transaction,
          user: req.userDetails,
          individualHooks: true,
        });
      }
    }

    for (const responsibility of responsibilities) {
      const createdResponsibility = await designationResponsibility.create(
        {
          responsibilityName: responsibility.name,
          designationId: designationID,
        },
        {
          transaction,
          user: req.userDetails,
        },
      );

      const descriptionData = responsibility.descriptions.map(
        (description) => ({
          responsibilityDescription: description,
          desigRespoID: createdResponsibility.id,
        }),
      );

      if (descriptionData.length) {
        await designationResponsibilityDetails.bulkCreate(descriptionData, {
          transaction,
          user: req.userDetails,
          individualHooks: true,
        });
      }
    }

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: existingResponsibility
        ? message.usermessage.updateMessage('Designation Responsibility')
        : message.usermessage.addMessage('Designation Responsibility'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getDesignationResponsibilityByDesignationID = async (
  req,
  res,
  next,
) => {
  try {
    const { designationID } = req.body;

    if (!designationID) {
      return res
        .status(200)
        .json({ status: 400, message: 'invalide parameters' });
    }

    const responsibilityData = await designationResponsibility.findAll({
      where: { designationId: designationID },
      attributes: ['id', 'designationId', 'responsibilityName', 'createBy'],
      include: [
        {
          model: designationResponsibilityDetails,
          as: 'DRD',
          attributes: [
            'id',
            'responsibilityDescription',
            'desigRespoID',
            'createBy',
          ],
        },
      ],
    });

    return res.status(200).json({ status: 200, data: responsibilityData });
  } catch (err) {
    next(err);
  }
};
