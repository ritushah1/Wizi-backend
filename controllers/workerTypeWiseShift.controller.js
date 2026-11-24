const sequelize = require('../config/database');
const Sequelize = require('sequelize');
const { statusCodes } = require('../utils/commonVars');
const { usermessage } = require('../response_message/message');
const WorkerTypeWiseShift = require('../models/workerTypeWiseShifts');
const {
  workerTypesEnum,
  listWorkerTypes,
  saveraCompanyIDs,
  listSaveraWorkerType,
} = require('../utils/dbUtils');

exports.addData = async (req, res, next) => {
  try {
    const { workerType = [], shiftID } = req.body;

    if (!shiftID || !Array.isArray(workerType) || !workerType?.length) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: usermessage.requiredMessage('workerType and shiftID'),
      });
    }

    if (
      workerType.filter(
        (item) => !Object.values(workerTypesEnum).includes(item),
      ).length
    ) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: usermessage.invalidField('workerType'),
      });
    }

    const existData = await WorkerTypeWiseShift.findAll({
      where: {
        shiftID,
      },
    });

    const addedWorkerType = existData.map((e) => e.workerType);

    const finalWorkerType = workerType.filter(
      (item) => !addedWorkerType.includes(item),
    );

    const finalData = finalWorkerType.map((e) => {
      return {
        shiftID,
        workerType: e,
      };
    });

    await WorkerTypeWiseShift.bulkCreate(finalData, {
      individualHooks: true,
      user: req.userDetails,
    });

    return res.status(200).json({
      status: 200,
      message: usermessage.addMessage('Worker Type'),
    });
  } catch (error) {
    next(error);
  }
};

exports.getWorkerTypeByShift = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: usermessage.requiredMessage('shiftID'),
      });
    }

    const data = await WorkerTypeWiseShift.findAll({
      where: {
        shiftID: id,
      },
    });

    const workerTypeList = saveraCompanyIDs.includes(
      req.userDetails?.companyMasterId,
    )
      ? listSaveraWorkerType
      : listWorkerTypes;

    const finalData = data.map((e) => {
      const key =
        workerTypeList.find((w) => w.value == e.workerType)?.key ||
        e.workerType;
      return {
        id: e.id,
        workerType: e.workerType,
        key,
        shiftID: e.shiftID,
      };
    });

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data: finalData,
    });
  } catch (error) {
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;

    const data = await WorkerTypeWiseShift.findByPk(id);

    if (!data) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: usermessage.notFoundMessage('data'),
      });
    }

    await data.destroy({ user: req.userDetails });

    return res.status(200).json({
      status: 200,
      message: usermessage.deleteMessage('Worker Type'),
    });
  } catch (error) {
    next(error);
  }
};
