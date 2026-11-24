const sequelize = require('../config/database');
const incomeTaxSlabMaster = require('../models/incomeTaxSlabMaster');
const { generateExcel } = require('../utils/exportData');
const SurchargesTaxSlab = require('../models/surchargesTaxSlab');
const { usermessage } = require('../response_message/message');
const { statusCodes } = require('../utils/commonVars');

exports.add = async (req, res, next) => {
  try {
    const {
      fromAmount,
      toAmount,
      percentage,
      incomeTaxSlabMasterID,
    } = await req.body;

      await SurchargesTaxSlab.create(
        {
          fromAmount,
          toAmount,
          percentage,
          incomeTaxSlabMasterID,
        },
        {
          user: req.userDetails,
        }
      );
   
   return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: usermessage.addMessage('Surcharges Tax Slab'),
    });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;

    const {
      fromAmount,
      toAmount,
      percentage,
      incomeTaxSlabMasterID,
    } = await req.body;

    const data = await SurchargesTaxSlab.findByPk(id);

    if(!data)return res.status(statusCodes.OK).json({
        status:statusCodes.NOT_FOUND,
        message:usermessage.notFoundMessage('Surcharges Tax Slab')
    });

    data.fromAmount = fromAmount;
    data.toAmount = toAmount;
    data.percentage = percentage;
    data.incomeTaxSlabMasterID = incomeTaxSlabMasterID;

await data.save({user: req.userDetails});
  
    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: usermessage.updateMessage('Surcharges Tax Slab'),
    });
  } catch (error) {
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;

    const data = await SurchargesTaxSlab.findByPk(id);

    if(!data)return res.status(statusCodes.OK).json({
        status:statusCodes.NOT_FOUND,
        message:usermessage.notFoundMessage('Surcharges Tax Slab')
    });

    await data.destroy({user: req.userDetails});
  
    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: usermessage.deleteMessage('Surcharges Tax Slab'),
    });

  } catch (error) {
    next(error);
  }
};

exports.getAllData = async (req, res, next) => {
  try {
    const { page, limit, incomeTaxSlabMasterID } = await req.query;

    const paginate = !req.query.export
      ? page && limit
        ? { offset: (page - 1) * limit, limit: limit }
        : {}
      : {};

    const condition = {};

    condition.status = [0, 1];

    if (incomeTaxSlabMasterID)
      condition.incomeTaxSlabMasterID = +incomeTaxSlabMasterID;

    const { rows: data, count: totalcount } =
      await SurchargesTaxSlab.findAndCountAll({
        raw: true,
        where: condition,
        ...paginate,
        include: [{ model: incomeTaxSlabMaster, attributes: [] }],
        order: [['createdAt', 'DESC']],
        attributes: [
          [
            sequelize.col('incomeTaxSlabMaster.incomeTaxSlabMasterID'),
            'incomeTaxSlabMasterID',
          ],
          [
            sequelize.col('incomeTaxSlabMaster.assessmentYear'),
            'assessmentYear',
          ],
          [sequelize.col('incomeTaxSlabMaster.gender'), 'gender'],
          [sequelize.col('incomeTaxSlabMaster.regime'), 'regime'],
          'fromAmount',
          'toAmount',
          'percentage',
          'id',
        ],
      });

    if (req.query.export) {
      const finalData = data.map((e) => {
        return{
 'AssessmentYear':e.assessmentYear,
 'Gender':e.gender,
 'Regime':e.regime,
 'FromAmount':e.fromAmount,
 'ToAmount':e.toAmount,
 'Percentage':e.percentage
        }
        
        });
     

      if (finalData.length === 0) {
        return res.status(200).json({
          message: 'No data found to export!',
        });
      }

      return generateExcel(finalData, 'SurchargesTaxSlabs', 'xlsx', res);
    }

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data: data,
      totalcount: totalcount,
    });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;

   const data = await SurchargesTaxSlab.findByPk(id);

    if(!data)return res.status(statusCodes.OK).json({
        status:statusCodes.NOT_FOUND,
        message:usermessage.notFoundMessage('Surcharges Tax Slab')
    });
    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data: data,
    });
  } catch (error) {
    next(error);
  }
};
