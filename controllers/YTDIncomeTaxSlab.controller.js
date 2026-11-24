/** @format */

const sequelize = require('../config/database');
const incomeTaxSlabMaster = require('../models/incomeTaxSlabMaster');
const YTDIncomeTaxSlab = require('../models/YTDIncomeTaxSlab');
const { usermessage } = require('../response_message/message');
const { generateExcel } = require('../utils/exportData');

exports.addIncomeTaxSlab = async (req, res, next) => {
  try {
    const { fromAmount, toAmount, type,value, incomeTaxSlabMasterID } =
      await req.body;

    await YTDIncomeTaxSlab.create(
      {
        fromAmount,
        toAmount,
        type,value,
        incomeTaxSlabMasterID,
      },
      {
        user: req.userDetails,
      }
    );

    return res.status(200).json({
      status: 200,
      message: usermessage.addMessage('YTD IncomeTax Slab'),
    });
  } catch (error) {
    next(error);
  }
};

exports.updateIncomeTaxSlab = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { fromAmount, toAmount, type,value, incomeTaxSlabMasterID } =
      await req.body;

    const data = await YTDIncomeTaxSlab.findByPk(id);

    if (!data)
      return res.status(200).json({
        status: 401,
        message: usermessage.notFoundMessage('YTD IncomeTax Slab'),
      });

    data.fromAmount = fromAmount;
    data.toAmount = toAmount;
    data.type = type;
    data.value = value;

    data.incomeTaxSlabMasterID = incomeTaxSlabMasterID;

    await data.save({ user: req.userDetails });

    return res.status(200).json({
      status: 200,
      message: usermessage.updateMessage('YTD IncomeTax Slab'),
    });
  } catch (error) {
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { status } = await req.body;

    const data = await YTDIncomeTaxSlab.findByPk(id);

    if (!data)
      return res.status(200).json({
        status: 401,
        message: usermessage.notFoundMessage('YTD IncomeTax Slab'),
      });


    if (status == 0 || status == 1) {
      data.status = status;

      await data.save({ user: req.userDetails });
    }

    if (status == 2) {
      await data.destroy({ user: req.userDetails });
    }

    return res.status(200).json({
      status: 200,
      message:
        status == 0
          ? usermessage.deactiveMessage('YTD Income tax Slab')
          : status == 1
            ? usermessage.activeMessage('YTD Income tax Slab')
            : status == 2
              ? usermessage.deleteMessage('YTD Income tax Slab')
              : '',
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllData = async (req, res, next) => {
  try {
    const { page, limit, incomeTaxSlabMasterID ,Export} = await req.query;

    const paginate = !Export &&  page && limit
        ? { offset: (page - 1) * limit, limit }
        : {};
      

    const condition = {};

    condition.status = [0, 1];

    if (incomeTaxSlabMasterID)
      condition.incomeTaxSlabMasterID = +incomeTaxSlabMasterID;

    const { rows: data, count: totalcount } =
      await YTDIncomeTaxSlab.findAndCountAll({
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
          'type',
          'value',
          'id',
        ],
      });

    if (Export) {
      const final = await Promise.all(
        data.map((e) => {
          const { incomeTaxSlabMasterID, id, ...rest } = e;
          return rest;
        })
      );

      if (+final.length === 0) {
        return res.status(200).json({
          message: 'No data found to export!',
        });
      }

      return generateExcel(final, 'YTDIncomeTaxSlabs', 'xlsx', res);
    }

    return res.status(200).json({
      status: 200,
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

    const data = await YTDIncomeTaxSlab.findByPk(id);

    if (!data) {
     return res.status(200).json({
        status: 401,
        message: usermessage.notFoundMessage('YTD Income tax Slab')
      });
    }

    return res.status(200).json({
      status: 200,
      data: data,
    });
  } catch (error) {
    next(error);
  }
};
