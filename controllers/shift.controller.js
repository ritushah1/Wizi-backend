const { Sequelize, Op } = require('sequelize');
const Shift = require('../models/shift');
const message = require('../response_message/message');
const companyMaster = require('../models/companyMaster');
const shiftTime = require('../models/shiftTime');
const sequelize = require('../config/database');
const UserMaster = require('../models/userMaster');
const AttendanceTransaction = require('../models/attendanceTransaction');
const { generateExcelForShift } = require('../utils/exportData');
const EmployeeShift = require('../models/employeeShift');
const EmployeeAttendancePolicy = require('../models/employeeAttendancePolicy');
const userMaster = require('../models/userMaster');
const EmployeeBranch = require('../models/employeeBranch');
const EmployeeDesignation = require('../models/employeeDesignation');
const EmployeeDepartment = require('../models/employeeDepartment');
const AttendancePolicy = require('../models/attendancePolicy');
const {
  asiaKolkataDateTime,
  get_Shift_By_WorkerType,
} = require('../utils/commonUtilFunctions');
const { ShiftTypeEnum, listWorkerTypes } = require('../utils/dbUtils');
const WorkerTypeWiseShift = require('../models/workerTypeWiseShifts');
const { statusCodes } = require('../utils/commonVars');

exports.postAddShift = async (req, res, next) => {
  try {
    let {
      shiftName,
      shiftCode,
      shiftDesc,
      table,
      referenceId,
      branchMasterID,
      shiftGrace,
      companyMasterID,
      shifttime,
      shiftType,
    } = req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    let branchID = branchMasterID;

    const existingPolicy = await Shift.findOne({
      where: [
        sequelize.where(
          sequelize.fn(
            'TRIM',
            sequelize.fn('LOWER', sequelize.col('shiftName')),
          ),
          shiftName.trim().toLowerCase(),
        ),
        { companyMasterID: companyMasterID },
        { status: [0, 1] },
      ],
    });

    if (existingPolicy) {
      return res.status(200).json({
        status: 400,
        message: message.usermessage.alreadyExists('Shift With Same Name'),
      });
    }

    const date = new Date().toISOString().slice(0, 10);

    if (
      shiftType == ShiftTypeEnum.DAYSHIFT &&
      shifttime.some(
        (e) =>
          new Date(`${date + ' ' + e.statTime}`).getTime() >
          new Date(`${date + ' ' + e.endtime}`).getTime(),
      )
    ) {
      return res.status(200).json({
        status: 401,
        message: 'For day shift, end time must be later than start time.',
      });
    } else {
      if (
        shiftType == ShiftTypeEnum.NIGHTSHIFT &&
        shifttime.some(
          (e) =>
            new Date(`${date + ' ' + e.statTime}`).getTime() <
            new Date(`${date + ' ' + e.endtime}`).getTime(),
        )
      ) {
        return res.status(200).json({
          status: 401,
          message:
            'For night shift, end time should be after midnight (12:00 AM).',
        });
      }
    }

    let insert_db_status;
    await sequelize.transaction(async (t) => {
      insert_db_status = await Shift.create(
        {
          shiftName,
          shiftCode,
          shiftDesc,
          table,
          referenceId,
          branchID,
          shiftGrace,
          companyMasterID,
          createBy,
          createByIp,
          shiftType,
        },
        { transaction: t, user: req.userDetails },
      );
      shifttime.forEach(async (option) => {
        option['shiftID'] = insert_db_status.shiftID;
      });
      await shiftTime.bulkCreate(shifttime, {
        returning: true,
        transaction: t,
        user: req.userDetails,
        individualHooks: true,
      });
    });
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Shift'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getShiftById = async (req, res, next) => {
  try {
    let get_one_data = await Shift.findOne({
      where: {
        shiftID: req.params.id,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      include: [{ model: shiftTime, as: 'shiftTime' }],
    });

    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.getShiftByCompanyId = async (req, res, next) => {
  try {
    const { companyMasterID, limit, page, searchQuery, exportData } =
      await req.body;

    const condition = {};

    condition.status = [0, 1];

    if (companyMasterID) condition.companyMasterID = companyMasterID;

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        { shiftName: { [Sequelize.Op.iLike]: '%' + searchQuery + '%' } },
        { shiftCode: { [Sequelize.Op.iLike]: '%' + searchQuery + '%' } },
        { shiftDesc: { [Sequelize.Op.iLike]: '%' + searchQuery + '%' } },
      ];

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const order = [['createdAt', 'DESC']];

    const shift = await Shift.findAndCountAll({
      distinct: true,
      where: condition,
      ...paginationQuery,
      order,
      include: [
        {
          model: companyMaster,
          as: 'companyMaster',
          attributes: ['companyName'],
        },
        { model: shiftTime, as: 'shiftTime' },
        {
          model: WorkerTypeWiseShift,
          as: 'workerType',
          attributes: ['workerType'],
        },
      ],
    });

    if (exportData) {
      const final = shift.rows;

      if (+final.length === 0) {
        return res.status(200).json({
          message: 'No data found to export!',
        });
      }

      const final1 = [];

      final.map((shift, index) => {
        const workerType =
          (shift.workerType || []).map((e) => e.workerType) || [];

        const finalWorkerType = listWorkerTypes
          .filter((e) => workerType.includes(e.value))
          .map((w) => w.key)
          .join(',');

        const companyInfo = [
          index + 1,
          shift.shiftName,
          shift.companyMaster.companyName,
          shift.shiftCode,
          shift.shiftDesc,
          shift.status == 1
            ? (shift.status = 'Active')
            : (shift.status = 'Deactive'),
          shift.shiftGrace,
          finalWorkerType,
        ];
        for (const shiftTime of shift.shiftTime) {
          const shiftTimeInfo = [
            ...companyInfo,
            shiftTime.day,
            shiftTime.statTime,
            shiftTime.firsthalfendtime,
            shiftTime.secondhalfstarttime,
            shiftTime.endtime,
            shiftTime.totalhourshalfday,
            shiftTime.totalhours,
            shiftTime.missPunchMinutes || '',
          ];

          final1.push(shiftTimeInfo);
        }
      });

      await generateExcelForShift(final1, 'Shift', 'xlsx', res);
      return;
    }

    return res.status(200).json({
      status: 200,
      data: shift.rows,
      totalcount: shift.count,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * update data
 *
 * @param {id} shiftID  to update id
 */
exports.postUpdateShift = async (req, res, next) => {
  try {
    let {
      shiftID,
      shiftName,
      shiftCode,
      shiftDesc,
      table,
      referenceId,
      branchMasterID,
      shiftGrace,
      companyMasterID,
      shifttime,
      shiftType,
    } = req.body;
    let branchID = branchMasterID;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;

    const existingPolicyName = await Shift.findOne({
      where: {
        [Sequelize.Op.and]: [
          sequelize.where(
            sequelize.fn(
              'TRIM',
              sequelize.fn('LOWER', sequelize.col('shiftName')),
            ),
            shiftName.trim().toLowerCase(),
          ),
          { companyMasterID: companyMasterID },
          { shiftID: { [Sequelize.Op.ne]: shiftID } },
        ],
      },
    });

    if (existingPolicyName) {
      return res.status(200).json({
        status: 400,
        message: message.usermessage.alreadyExists('Shift With Same Name'),
      });
    }

    const date = new Date().toISOString().slice(0, 10);

    if (
      shiftType == ShiftTypeEnum.DAYSHIFT &&
      shifttime.some(
        (e) =>
          new Date(`${date + ' ' + e.statTime}`).getTime() >
          new Date(`${date + ' ' + e.endtime}`).getTime(),
      )
    ) {
      return res.status(200).json({
        status: 401,
        message: 'For day shift, end time must be later than start time.',
      });
    } else {
      if (
        shiftType == ShiftTypeEnum.NIGHTSHIFT &&
        shifttime.some(
          (e) =>
            new Date(`${date + ' ' + e.statTime}`).getTime() <
            new Date(`${date + ' ' + e.endtime}`).getTime(),
        )
      ) {
        return res.status(200).json({
          status: 401,
          message:
            'For night shift, end time should be after midnight (12:00 AM).',
        });
      }
    }

    await sequelize.transaction(async (t) => {
      await Shift.update(
        {
          shiftName,
          shiftCode,
          shiftDesc,
          table,
          referenceId,
          branchID,
          shiftGrace,
          companyMasterID,
          shifttime,
          updateBy,
          updateByIp,
          shiftType,
        },
        {
          where: { shiftID: shiftID },
          transaction: t,
          user: req.userDetails,
          individualHooks: true,
        },
      );
      const deletedCount = await shiftTime.destroy({
        where: {
          shiftID: shiftID,
        },
        transaction: t,
        user: req.userDetails,
        individualHooks: true,
      });

      shifttime.forEach((item) => {
        delete item.shiftTimeID;
      });

      await shiftTime.bulkCreate(shifttime, {
        returning: true,
        transaction: t,
        user: req.userDetails,
        individualHooks: true,
      });
    });
    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Shift'),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * update status
 *
 * @param {id} shiftID  to update status of shift
 */

exports.poststatuschange = async (req, res, next) => {
  try {
    const { shiftID, status } = await req.body;

    if (status != '1' && status != '0') {
      return res.status(200).json({
        status: 400,
        message: 'Status is not valid',
      });
    }

    await Shift.update(
      {
        status: status,
      },
      {
        where: { shiftID: shiftID, status: ['1', '0'] },
        user: req.userDetails,
        individualHooks: true,
      },
    );

    return res.status(200).json({
      status: 200,
      message:
        status == '1'
          ? message.usermessage.activeMessage('Shift')
          : message.usermessage.deactiveMessage('Shift'),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * delete by i
 *
 * @param {id} shiftID  to delete id
 */
exports.postDeleteShiftById = async (req, res, next) => {
  try {
    const { shiftID } = await req.body;

    const empShift = await EmployeeShift.findOne({
      where: {
        [Sequelize.Op.or]: [
          {
            shiftsID: {
              [Sequelize.Op.contains]: [shiftID],
            },
          },
          {
            shiftID: shiftID,
          },
        ],
      },
    });

    if (empShift)
      return res.status(200).json({
        status: 401,
        message:
          'You can not delete this shift because already assigned to employees.',
      });

    await shiftTime.destroy({
      where: {
        shiftID: shiftID,
      },
      individualHooks: true,
      user: req.userDetails,
    });

    await Shift.destroy({
      where: { shiftID: shiftID },
      individualHooks: true,
      user: req.userDetails,
    });

    return res
      .status(200)
      .json({ status: 200, message: message.usermessage.shiftdelete });
  } catch (err) {
    next(err);
  }
};

exports.getactiveshiftbycompanyid = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id)
      return res
        .status(200)
        .json({ status: 401, message: 'Please pass valid params!' });

    const allShift = await Shift.findAll({
      where: {
        companyMasterID: id,
        status: 1,
      },
      include: { model: companyMaster },
    });
    return res.status(200).json({ status: 200, data: allShift });
  } catch (err) {
    next(err);
  }
};

exports.getUserListOfShift = async (req, res, next) => {
  try {
    let { userMasterID, attendanceDate } = await req.body;
    attendanceDate = asiaKolkataDateTime(new Date(attendanceDate)).slice(0, 10);

    const assignShiftData = await EmployeeShift.findAll({
      where: {
        userMasterID: userMasterID,
        status: 1,
        startDate: {
          [Sequelize.Op.lte]: new Date(attendanceDate),
        },
        [Sequelize.Op.or]: [
          {
            endDate: {
              [Sequelize.Op.gte]: new Date(attendanceDate),
            },
          },
          {
            endDate: { [Sequelize.Op.eq]: null },
          },
        ],
      },
      include: [
        {
          required: false,
          model: Shift,
          attributes: ['shiftID', 'shiftName'],
          as: 'shift',
          where: {
            status: 1,
          },
        },
      ],
    });

    if (assignShiftData.length > 0) {
      if (assignShiftData?.[0]?.shift) {
        return res
          .status(200)
          .json({ status: 200, data: [assignShiftData?.[0]?.shift] });
      } else {
        const assignShift = await Shift.findAll({
          attributes: ['shiftID', 'shiftName'],
          where: {
            status: 1,
            shiftID: {
              [Sequelize.Op.in]: assignShiftData?.[0]?.shiftsID || [],
            },
          },
        });

        return res.status(200).json({ status: 200, data: assignShift });
      }
    } else {
      const userData = await userMaster.findOne({
        attributes: ['userMasterID', 'companyMasterId'],
        where: {
          userMasterID: userMasterID,
        },
        include: [
          {
            required: false,
            model: EmployeeBranch,
            attributes: ['branchID'],
            where: {
              status: 1,
              applicableDate: {
                [Sequelize.Op.lte]: new Date(attendanceDate),
              },
              [Sequelize.Op.or]: [
                {
                  endDate: {
                    [Sequelize.Op.gte]: new Date(attendanceDate),
                  },
                },
                {
                  endDate: { [Sequelize.Op.eq]: null },
                },
              ],
            },
            attributes: ['branchID'],
          },
          {
            model: EmployeeDesignation,
            attributes: ['designationID'],
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date(attendanceDate) },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date(attendanceDate) } },
                { endDate: { [Sequelize.Op.eq]: null } },
              ],
            },
            required: false,
          },
          {
            model: EmployeeDepartment,
            attributes: ['departmentID'],
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date(attendanceDate) },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date(attendanceDate) } },
                { endDate: { [Sequelize.Op.eq]: null } },
              ],
            },
            required: false,
          },
          {
            model: EmployeeAttendancePolicy,
            as: 'empAttPolicy',
            attributes: ['userMasterID', 'attendancePolicyID'],
            where: {
              status: 1,
              startDate: { [Sequelize.Op.lte]: new Date(attendanceDate) },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date(attendanceDate) } },
                { endDate: { [Sequelize.Op.eq]: null } },
              ],
            },
            required: false,
            include: [
              {
                model: AttendancePolicy,
                as: 'attendancePolicy',
                attributes: [['automaticAssignShift', 'automaticShift']],
              },
            ],
          },
        ],
      });

      if (userData) {
        if (
          !userData.empAttPolicy ||
          (userData.empAttPolicy &&
            userData.empAttPolicy?.[0]?.attendancePolicy?.dataValues
              ?.automaticShift == 1)
        ) {
          let whereCondition = {
            companyMasterID: userData.companyMasterId,
            status: 1,
            [Op.or]: [
              { table: null },
              { table: '' },
              {
                [Op.and]: [
                  { table: 'departments' },
                  { branchID: userData.employeeBranches?.[0]?.branchID },
                  {
                    referenceId:
                      userData.employeeDepartments?.[0]?.departmentID,
                  },
                ],
              },
              {
                [Op.and]: [
                  { table: 'designations' },
                  { branchID: userData.employeeBranches?.[0]?.branchID },
                  {
                    referenceId:
                      userData.employeeDesignations?.[0]?.designationID,
                  },
                ],
              },
            ],
          };

          const companyShiftData = await getShift(whereCondition);

          return res.status(200).json({ status: 200, data: companyShiftData });
        }
      }

      return res.status(200).json({ status: 200, data: [] });
    }
  } catch (err) {
    next(err);
  }
};

exports.getShiftByWorkerType = async (req, res, next) => {
  try {
    const { companyMasterID, workerType } = req.body;

    if (!companyMasterID)
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: message.usermessage.requiredMessage('companyMasterID'),
      });

    const data = await get_Shift_By_WorkerType(companyMasterID, workerType);

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data,
    });
  } catch (error) {
    next(error);
  }
};

async function getShift(where) {
  return await Shift.findAll({
    attributes: ['shiftID', 'shiftName'],
    where: where,
  });
}

// ---------------------- Add shift type field for all existing shifts in the database ----------------------

exports.addShiftType = async (req, res, next) => {
  try {
    const allDayShift = await Shift.findAll({
      where: {
        status: [0, 1],
      },
      include: [
        {
          model: shiftTime,
          attributes: ['statTime', 'endtime'],
          where: Sequelize.literal(
            `to_timestamp("shiftTimes"."statTime", 'HH12:MI AM') < to_timestamp("shiftTimes"."endtime", 'HH12:MI AM')`,
          ),
        },
      ],
      attributes: ['shiftID'],
    });

    const allNightShift = await Shift.findAll({
      where: {
        status: [0, 1],
      },
      include: [
        {
          model: shiftTime,
          attributes: ['statTime', 'endtime'],
          where: Sequelize.literal(
            `to_timestamp("shiftTimes"."statTime", 'HH12:MI AM') > to_timestamp("shiftTimes"."endtime", 'HH12:MI AM')`,
          ),
        },
      ],
      attributes: ['shiftID'],
    });

    await Shift.update(
      {
        shiftType: ShiftTypeEnum.DAYSHIFT,
      },
      {
        where: {
          shiftID: {
            [Op.in]: allDayShift.map((e) => e.shiftID),
          },
        },
      },
    );

    await Shift.update(
      {
        shiftType: ShiftTypeEnum.NIGHTSHIFT,
      },
      {
        where: {
          shiftID: {
            [Op.in]: allNightShift.map((e) => e.shiftID),
          },
        },
      },
    );

    return res.status(200).json({
      status: 200,
      message: 'Shift updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};
