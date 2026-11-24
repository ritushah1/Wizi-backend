const Sequelize = require('sequelize');
const CanteenDetails = require('../models/canteenDetails');
const { usermessage } = require('../response_message/message');
const companyMaster = require('../models/companyMaster');
const BranchMaster = require('../models/branchMaster');
const { statusCodes } = require('../utils/commonVars');
const { generateExcel } = require('../utils/exportData');
const CanteenMeals = require('../models/canteenMeals');

exports.add = async (req, res, next) => {
  try {
    await CanteenDetails.create(req.body, { user: req.userDetails });

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: usermessage.addMessage('Canteen Details'),
    });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { canteenName } = req.body;

    const data = await CanteenDetails.findByPk(id);

    if (!data)
      return res.status(statusCodes.OK).json({
        status: statusCodes.NOT_FOUND,
        message: usermessage.notFoundMessage('Canteen Details'),
      });

    data.canteenName = canteenName;

    await data.save({ user: req.userDetails });

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: usermessage.updateMessage('Canteen Details'),
    });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const data = await CanteenDetails.findByPk(id, {
      include: [
        { model: companyMaster, attributes: ['companyName'] },
        { model: BranchMaster, attributes: ['branchName'] },
      ],
    });

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data,
    });
  } catch (error) {
    next(error);
  }
};

exports.list = async (req, res, next) => {
  try {
    const { page, limit, companyMasterID, branchMasterID, search, Export } =
      req.body;

    if (!companyMasterID)
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: usermessage.requiredMessage('companyMasterID'),
      });

    const paginateCondition =
      page && limit && !Export ? { offset: (page - 1) * limit, limit } : {};

    const condition = { companyMasterID };

    if (branchMasterID) condition.branchMasterID = branchMasterID;

    if (search) {
      condition[Sequelize.Op.or] = [
        {
          '$companyMaster.companyName$': {
            [Sequelize.Op.iLike]: `%${search}%`,
          },
        },
        {
          '$branchMaster.branchName$': {
            [Sequelize.Op.iLike]: `%${search}%`,
          },
        },
        {
          canteenName: {
            [Sequelize.Op.iLike]: `%${search}%`,
          },
        },
      ];
    }

    const { rows: data, count } = await CanteenDetails.findAndCountAll({
      where: condition,
      ...paginateCondition,
      include: [
        { model: companyMaster, attributes: ['companyName'] },
        { model: BranchMaster, attributes: ['branchName'] },
      ],
      order: [['id', 'DESC']],
    });

    if (Export) {
      const finalData = data.map((e) => {
        return {
          'Company Name': e.companyMaster?.companyName || '',
          'Branch Name': e.branchMaster?.branchName || '',
          'Canteen Name': e.canteenName,
        };
      });

      return await generateExcel(finalData, 'CanteenDetails', 'xlsx', res);
    }

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data,
      totalcount: count,
    });
  } catch (error) {
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;

    const data = await CanteenDetails.findByPk(id, {
      include: [{ model: CanteenMeals, attributes: ['id'] }],
    });

    if (!data)
      return res.status(statusCodes.OK).json({
        status: statusCodes.NOT_FOUND,
        message: usermessage.notFoundMessage('Canteen Details'),
      });

    if (Array.isArray(data.canteenMeals) && data.canteenMeals.length)
      return res.status(statusCodes.OK).json({
        status: 401,
        message: 'A meal type has already been added for this canteen.',
      });

    await data.destroy({ user: req.userDetails });

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: usermessage.deleteMessage('Canteen Details'),
    });
  } catch (error) {
    next(error);
  }
};
