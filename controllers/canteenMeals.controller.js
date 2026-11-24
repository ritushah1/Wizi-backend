const Sequelize = require('sequelize');
const CanteenMeals = require('../models/canteenMeals');
const { usermessage } = require('../response_message/message');
const companyMaster = require('../models/companyMaster');
const { generateExcel } = require('../utils/exportData');
const BranchMaster = require('../models/branchMaster');
const { statusCodes } = require('../utils/commonVars');
const CanteenDetails = require('../models/canteenDetails');

async function getAllMealByCanteen(canteenDetailsId = null) {
  if (!canteenDetailsId) return [];

  const data = await CanteenMeals.findAll({
    where: {
      status: 1,
      canteenDetailsId,
    },
  });

  return data;
}

function checkTimeCollapse(allMeals = [], startTime, endTime) {
  const date = new Date().toISOString().slice(0, 10);
  const startTimeDate = new Date(`${date} ${startTime}`);
  const endTimeDate = new Date(`${date} ${endTime}`);

  if (startTimeDate.getTime() >= endTimeDate.getTime())
    return 'startTime must be earlier than endTime.';

  const data = allMeals.find((e) => {
    const existingStart = new Date(`${date} ${e.startTime}`);
    const existingEnd = new Date(`${date} ${e.endTime}`);
    // Overlap condition
    return startTimeDate < existingEnd && endTimeDate > existingStart;
  });

  if (data) return `Time overlaps with '${data.mealType}'.`;

  return null; // no overlap
}

exports.add = async (req, res, next) => {
  try {
    const { startTime, endTime, canteenDetailsId } = req.body;

    const allMeals = await getAllMealByCanteen(canteenDetailsId, null);

    const collapse = checkTimeCollapse(allMeals, startTime, endTime);
    if (collapse)
      return res
        .status(statusCodes.OK)
        .json({ status: 401, message: collapse });

    await CanteenMeals.create(req.body, { user: req.userDetails });

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: usermessage.addMessage('Canteen Meal'),
    });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;

    const {
      canteenDetailsId,
      startTime,
      endTime,
      employeeShare,
      companyShare,
      isApplicableOnFD,
    } = req.body;

    const allMeals = await getAllMealByCanteen(canteenDetailsId);

    const withOutCurrent = allMeals.filter((e) => e.id != id);
    const currentMeal = allMeals.find((e) => e.id == id);

    if (!currentMeal)
      return res
        .status(statusCodes.OK)
        .json({
          status: statusCodes.NOT_FOUND,
          message: usermessage.notFoundMessage('Canteen Meal'),
        });

    const collapse = checkTimeCollapse(withOutCurrent, startTime, endTime);
    if (collapse)
      return res
        .status(statusCodes.OK)
        .json({ status: 401, message: collapse });

    if (canteenDetailsId) currentMeal.canteenDetailsId = canteenDetailsId;
    if (startTime) currentMeal.startTime = startTime;
    if (endTime) currentMeal.endTime = endTime;
    if (
      employeeShare !== null &&
      employeeShare !== '' &&
      !isNaN(Number(employeeShare))
    ) {
      currentMeal.employeeShare = Number(employeeShare);
    }
    if (
      companyShare !== null &&
      companyShare !== '' &&
      !isNaN(Number(companyShare))
    ) {
      currentMeal.companyShare = Number(companyShare);
    }
    if (typeof isApplicableOnFD === 'boolean')
      currentMeal.isApplicableOnFD = isApplicableOnFD;

    await currentMeal.save({
      user: req.userDetails,
    });

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: usermessage.updateMessage('Canteen Meal'),
    });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const data = await CanteenMeals.findByPk(id, {
      include: [
        {
          model: CanteenDetails,
          attributes: ['canteenName', 'companyMasterID', 'branchMasterID'],
          include: [{ model: companyMaster, attributes: ['companyName'] }],
        },
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
    const {
      page,
      limit,
      companyMasterID,
      branchMasterID,
      canteenDetailsId,
      search,
      Export,
    } = req.body;

    if (!companyMasterID)
      return res.status(statusCodes.OK).json({
        status: 401,
        message: usermessage.requiredMessage('companyMasterID'),
      });

    const paginateCondition =
      page && limit && !Export ? { offset: (page - 1) * limit, limit } : {};

    const condition = { '$canteenDetail.companyMasterID$': companyMasterID };

    if (branchMasterID)
      condition['$canteenDetail.branchMasterID$'] = branchMasterID;

    if (canteenDetailsId) condition.canteenDetailsId = canteenDetailsId;

    if (search) {
      condition[Sequelize.Op.or] = [
        Sequelize.where(
          Sequelize.cast(Sequelize.col('canteenMeals.mealType'), 'TEXT'),
          { [Sequelize.Op.iLike]: `%${search}%` }
        ),

        {
          '$canteenDetail.canteenName$': {
            [Sequelize.Op.iLike]: `%${search}%`,
          },
        },
        {
          '$canteenDetail.companyMaster.companyName$': {
            [Sequelize.Op.iLike]: `%${search}%`,
          },
        },
        {
          '$canteenDetail.branchMaster.branchName$': {
            [Sequelize.Op.iLike]: `%${search}%`,
          },
        },
      ];
    }

    const { rows: data, count } = await CanteenMeals.findAndCountAll({
      where: condition,
      ...paginateCondition,
      include: [
        {
          model: CanteenDetails,
          attributes: ['canteenName', 'companyMasterID', 'branchMasterID'],
          include: [
            { model: companyMaster, attributes: ['companyName'] },
            { model: BranchMaster, attributes: ['branchName'] },
          ],
        },
      ],
      order: [['id', 'DESC']],
    });

    if (Export) {
      const finalData = data.map((e) => {
        return {
          'Company Name': e.canteenDetail?.companyMaster?.companyName || '',
          'Branch Name': e.canteenDetail?.branchMaster?.branchName || '',
          'Canteen Name': e.canteenDetail?.canteenName || '',
          'Meal Type': String(e.mealType).toUpperCase(),
          Time: `${e.startTime} - ${e.endTime}`,
          'Employee Share': e.employeeShare,
          'Company Share': e.companyShare,
          'Applicable only on full day': e.isApplicableOnFD ? 'Yes' : 'NO',
          Status: e.status == 1 ? 'Active' : 'Deactive',
        };
      });

      return await generateExcel(finalData, 'CanteenMeals', 'xlsx', res);
    }

    return res.status(200).json({
      status: 200,
      data,
      totalcount: count,
    });
  } catch (error) {
    next(error);
  }
};

exports.statusChangeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const data = await CanteenMeals.findByPk(id);

    if (!data)
      return res
        .status(statusCodes.OK)
        .json({
          status: statusCodes.NOT_FOUND,
          message: usermessage.notFoundMessage('Canteen Meal'),
        });

    if ([0, 1].includes(+status)) data.status = status;

    await data.save({ user: req.userDetails });

    const message =
      status == 1
        ? usermessage.activeMessage('Canteen Meal')
        : usermessage.deactiveMessage('Canteen Meal');

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message,
    });
  } catch (error) {
    next(error);
  }
};
