const Sequelize = require('sequelize');
const HrLeaveBalance = require('../models/hrLeaveBalance');
const logger = require('../config/logger');
const message = require('../response_message/message');
const sequelize = require('../config/database');
const HrLeaveTypes = require('../models/hrLeaveTypes');
const UserMaster = require('../models/userMaster');
const HrLeaveMaster = require('../models/hrLeaveMaster');

const EmployeeEmployment = require('../models/employeeEmployeement');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const companyMaster = require('../models/companyMaster');
const BranchMaster = require('../models/branchMaster');
const EmployeeBranch = require('../models/employeeBranch');
const Department = require('../models/department');
const EmployeeDepartment = require('../models/employeeDepartment');
const Designation = require('../models/designation');
const EmployeeDesignation = require('../models/employeeDesignation');
const {
  asiaKolkataDateTime,
  chunkArray,
  daysInMonth,
  roundOffLeaveBalance,
  getDateByAddingDays,
} = require('../utils/commonUtilFunctions');
const { generateExcel } = require('../utils/exportData');
const readXlsxFile = require('read-excel-file/node');
const fs = require('fs');
const { FileUploadType, CoffUsedTypeEnum } = require('../utils/dbUtils');
const path = require('path');
const moment = require('moment');
const { userAttributes, statusCodes } = require('../utils/commonVars');
const UserLeaveTransaction = require('../models/userLeaveTransaction');
const UserLeaveLapse = require('../models/userLeaveLapse');
const LeaveEncashment = require('../models/leaveEncashment');
const UserLeave = require('../models/userleave');
const UsedCoffTransaction = require('../models/usedCoffTransaction');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const coffMaster = require('../models/coffMaster');
const empLeavePolicy = require('../models/empLeavePolicy');
const employeeLeavePolicy = require('../models/employeeLeavePolicy');
const { count } = require('console');

/**
 * save HrLeaveBal data.
 *
 * @body {createBy} createBy user id of user who added the HrLeaveBal.
 * @body {number} createBy if any user change data then updateBy id change.
 
 */

exports.postBulkAddLeave = async (req, res, next) => {
  try {
    const leavebal = req.body;
    await sequelize.transaction(async (t) => {
      let add_data = await HrLeaveBalance.bulkCreate(leavebal, {
        returning: true,
        transaction: t,
      });

      res.status(200).json({
        status: 200,
        message: message.usermessage.leavebaladd,
        data: add_data,
      });
      return add_data;
    });
  } catch (err) {
    next(err);
  }
};

/**
return all userLeave data
*/

exports.getUserLeaveBal = async (req, res, next) => {
  try {
    const userMasterID = req.params.id;
    let userleavebal1,
      leavebal = [];

    let company = await UserMaster.findOne({
      where: {
        userMasterID: userMasterID,
        status: {
          [Sequelize.Op.in]: ['0', '1'],
        },
      },
    });

    let usercompany = company.companyMasterId;

    let leave_type = await HrLeaveTypes.findAll({
      where: {
        companyMasterID: usercompany,
        Leave_Allow: 'Y',
        status: 1,
        LeaveID: {
          [Sequelize.Op.notIn]: [5, 18, 25],
        },
      },
      include: [{ model: HrLeaveMaster, as: 'LeaveMaster' }],
      order: [['LeaveTranId', 'ASC']],
    });

    for (var i = 0; i < leave_type.length; i++) {
      let userleavebal = await HrLeaveBalance.findOne({
        where: {
          userMasterID: userMasterID,
          LeaveTranId: leave_type[i].LeaveTranId,
          OPBal: {
            [Sequelize.Op.ne]: null,
          },
        },
      });

      if (userleavebal) {
        leavebal.push({
          LeaveBalTranId: userleavebal.LeaveBalTranId,
          LeaveTranId: userleavebal.LeaveTranId,
          userMasterID: userMasterID,
          leavename: leave_type[i].LeaveMaster.LeaveName,
          leavedesc: leave_type[i].LeaveMaster.LeaveDesc,
          leavebal: userleavebal.OPBal,
          YearMM:
            JSON.stringify(userleavebal.YearMM).slice(0, 4) +
            '-' +
            JSON.stringify(userleavebal.YearMM).slice(4),
        });
      } else {
        leavebal.push({
          LeaveTranId: leave_type[i].LeaveTranId,
          userMasterID: userMasterID,
          leavename: leave_type[i].LeaveMaster.LeaveName,
          leavedesc: leave_type[i].LeaveMaster.LeaveDesc,
          leavebal: 0,
          YearMM: '0000-00',
        });
      }
    }

    return res.status(200).json({ status: 200, data: leavebal });
  } catch (err) {
    next(err);
  }
};

exports.getLeavesAddedById = async (req, res, next) => {
  try {
    let get_one_data = await HrLeaveBalance.findAll({
      where: {
        userMasterID: req.params.id,
        LeaveAddNew: {
          [Sequelize.Op.ne]: null,
        },
      },
      order: [['YearMM', 'DESC']],
      include: [
        {
          model: HrLeaveTypes,
          attributes: [],
          include: [
            {
              model: HrLeaveMaster,
              as: 'LeaveMaster',
              attributes: ['LeaveName', 'LeaveDesc'],
            },
          ],
        },
      ],
      raw: true,
    });
    for (var i = 0; i < get_one_data.length; i++) {
      get_one_data[i].YearMM = get_one_data[i].YearMM
        ? get_one_data[i].YearMM.toString()
        : '';
      get_one_data[i].YearMM =
        get_one_data[i].YearMM.substring(0, 4) +
        '-' +
        get_one_data[i].YearMM.substring(4, 6);
    }

    if (!get_one_data)
      res
        .status(200)
        .json({ status: 200, message: message.usermessage.deletedrecord });
    res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.addHrLeaveBalance = async (req, res, next) => {
  try {
    const { companyMasterID } = req.body;

    const leaveType = await HrLeaveTypes.findOne({
      where: {
        companyMasterID,
        LeaveID: 3,
        status: 1,
      },
    });

    if (!leaveType)
      return res.status(200).json({
        status: 401,
        message: 'Leave Type not found!',
      });

    const userData = await UserMaster.findAll({
      where: {
        companyMasterId: companyMasterID,
        status: 1,
      },
    });

    const toAddData = [];

    for (const user of userData) {
      toAddData.push({
        LeaveTranId: leaveType.LeaveTranId,
        userMasterID: user.userMasterID,
        YearMM: 202410,
        LeaveAddNew: 7,
        createBy: req.userDetails.userMasterId,
      });
    }

    // await HrLeaveBalance.bulkCreate(toAddData);

    return res.status(200).json({
      status: 200,
      data: toAddData,
      message: 'Data Added successfully.',
    });
  } catch (error) {
    next(error);
  }
};

exports.getAddedLeaveBalanceByUser = async (req, res, next) => {
  try {
    let {
      page,
      limit,
      userMasterID,
      fromMonth,
      toMonth,
      LeaveTranId,
      exportData,
    } = await req.body;
    const paginationQuery = {};
    if (!exportData && page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const order = [['YearMM', 'DESC']];
    const condition = {};
    condition.userMasterID = userMasterID;
    if (fromMonth && toMonth) {
      condition.YearMM = {
        [Sequelize.Op.between]: [fromMonth, toMonth],
      };
    }
    // HrLeaveBalance
    const { rows: HrLeaveBalanceData, count } =
      await HrLeaveBalance.findAndCountAll({
        where: condition,
        ...paginationQuery,
        order,
        include: [
          {
            model: UserMaster,
            attributes: userAttributes,
          },
          {
            model: HrLeaveTypes,
            attributes: ['LeaveTranId', 'LeaveID', 'companyMasterID', 'status'],
            include: {
              model: HrLeaveMaster,
              as: 'LeaveMaster',
              attributes: ['LeaveID', 'LeaveName', 'LeaveDesc', 'status'],
            },
          },
          {
            required: false,
            model: UserMaster,
            as: 'createByUser',
            attributes: userAttributes,
          },
          {
            required: false,
            model: UserMaster,
            as: 'updateByUser',
            attributes: userAttributes,
          },
        ],
      });
    const finalAddedLeaveData = HrLeaveBalanceData.map((item) => ({
      id: item.id,
      userMasterID: item.userMasterID,
      LeaveTranId: item.LeaveTranId,
      displayName: item.userMaster?.displayName,
      days: item.LeaveAddNew
        ? item.LeaveAddNew
        : item.OPBal
          ? `${item.OPBal} ( Initial Balance )`
          : '',
      YYYYMM: moment(item.YearMM, 'YYYYMM').format('MMMM-YYYY'),
      createBy: item.createByUser?.displayName,
      updateBy: item.updateByUser?.displayName || '',
      createdAt: item.createdAt
        ? moment(item.createdAt).format('DD-MM-YYYY HH:mm:ss')
        : '',
      updatedAt: item.updatedAt
        ? moment(item.updatedAt).format('DD-MM-YYYY HH:mm:ss')
        : '',
      LeaveName: item.hrLeaveType?.LeaveMaster?.LeaveName || null,
      LeaveDesc: item.hrLeaveType?.LeaveMaster?.LeaveDesc || null,
    }));
    if (exportData) {
      const finalExportData = finalAddedLeaveData.map((item) => ({
        'Employee Name': item.displayName,
        'Leave Name': item.LeaveName,
        'Month-Year': item.YYYYMM,
        Balance: item.days,
        'Create By': item.createBy,
        'Created On': item.createdAt,
        'Update By': item.updateBy || '',
        'Updated On': item.updateBy ? item.updatedAt : '',
      }));

      await generateExcel(finalExportData, 'Added Leave', 'xlsx', res);
      return;
    }
    return res
      .status(200)
      .json({ status: 200, totalCount: count, data: finalAddedLeaveData });
  } catch (err) {
    next(err);
  }
};

exports.getExpiredLeaveBalanceByUser = async (req, res, next) => {
  try {
    let { page, limit, userMasterID, fromMonth, toMonth, exportData } =
      await req.body;
    const paginationQuery = {};
    if (!exportData && page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const order = [['expiryDate', 'DESC']];
    const condition = {};
    condition.userMasterID = userMasterID;
    condition.expiryDate = {
      [Sequelize.Op.ne]: null,
    };

    condition.availBal = {
      [Sequelize.Op.gt]: 0,
    };

    if (fromMonth && toMonth) {
      const startDate =
        String(fromMonth).slice(0, 4) +
        '-' +
        String(fromMonth).slice(4, 6) +
        '-' +
        '01';
      const endDate =
        String(toMonth).slice(0, 4) +
        '-' +
        String(toMonth).slice(4, 6) +
        '-' +
        daysInMonth(String(toMonth).slice(4, 6), String(toMonth).slice(0, 4));

      condition.expiryDate = {
        [Sequelize.Op.between]: [startDate, endDate],
      };
    }
    // HrLeaveBalance
    const { rows: HrLeaveBalanceData, count } =
      await HrLeaveBalance.findAndCountAll({
        where: condition,
        ...paginationQuery,
        order,
        include: [
          {
            model: UserMaster,
            attributes: userAttributes,
          },
          {
            model: HrLeaveTypes,
            attributes: ['LeaveTranId', 'LeaveID', 'companyMasterID', 'status'],
            include: {
              model: HrLeaveMaster,
              as: 'LeaveMaster',
              attributes: ['LeaveID', 'LeaveName', 'LeaveDesc', 'status'],
            },
          },
          {
            required: false,
            model: UserMaster,
            as: 'createByUser',
            attributes: userAttributes,
          },
          {
            required: false,
            model: UserMaster,
            as: 'updateByUser',
            attributes: userAttributes,
          },
        ],
      });

    if (exportData) {
      const finalExportData = HrLeaveBalanceData.map((item) => ({
        'Employee Name': item.userMaster?.displayName || '',
        'Leave Name': item.hrLeaveType?.LeaveMaster?.LeaveName || '',
        'Month-Year': moment(item.YearMM, 'YYYYMM').format('MM-YYYY'),
        'Expiry Date': moment(item.expiryDate, 'YYYY-MM-DD').format(
          'DD-MM-YYYY',
        ),
        'Expired Balance': item.availBal,
        'Create By': item.createByUser?.displayName,
        'Created On': item.createdAt
          ? moment(item.createdAt).format('DD-MM-YYYY HH:mm:ss')
          : '',
        'Update By': item.updateByUser?.displayName || '',
        'Updated On': item.updateBy
          ? moment(item.updatedAt).format('DD-MM-YYYY HH:mm:ss')
          : '',
      }));

      await generateExcel(finalExportData, 'Expired Leave', 'xlsx', res);
      return;
    }
    return res
      .status(200)
      .json({ status: 200, totalCount: count, data: HrLeaveBalanceData });
  } catch (err) {
    next(err);
  }
};

// ----------------  Used/Lapse/Encash coff Existing data add into UsedCoffTransaction Table -------------------

exports.addUsedCoffTransaction = async (req, res, next) => {
  try {
    const { companyMasterIDs = [] } = req.body;

    if (!companyMasterIDs.length) throw new Error('Company is required!');

    const includes = [
      {
        required: true,
        model: HrLeaveTypes,
        where: { LeaveID: 6 },
        attributes: ['LeaveID'],
      },
    ];

    const userData = await UserMaster.findAll({
      where: {
        companyMasterId: companyMasterIDs,
      },
      attributes: ['userMasterID'],
    });

    const UserIds = userData.map((e) => e.userMasterID);

    const [
      allHrLeavebalance,
      allUsedLeaveBalance,
      allLapseBalance,
      allEncashBalance,
    ] = await Promise.all([
      HrLeaveBalance.findAll({
        raw: true,
        where: {
          userMasterID: {
            [Sequelize.Op.in]: UserIds,
          },
        },
        include: includes,
        order: [['expiryDate', 'ASC']],
      }),
      UserLeaveTransaction.findAll({
        raw: true,
        where: {
          status: 1,
        },
        include: [
          {
            model: UserLeave,
            where: { userMasterID: { [Sequelize.Op.in]: UserIds } },
            attributes: ['userMasterID'],
          },
          {
            required: true,
            model: HrLeaveTypes,
            where: { LeaveID: 6 },
            attributes: ['LeaveID'],
          },
        ],
        order: [['date', 'ASC']],
      }),
      UserLeaveLapse.findAll({
        raw: true,
        where: {
          userMasterID: {
            [Sequelize.Op.in]: UserIds,
          },
        },
        include: includes,
      }),
      LeaveEncashment.findAll({
        raw: true,
        where: {
          status: 1,
          userMasterID: {
            [Sequelize.Op.in]: UserIds,
          },
        },
        include: includes,
      }),
    ]);

    let usedTransactionLog = [];
    let finalBalanceArray = [];

    for (const user of userData) {
      const userMasterID = user.userMasterID;

      const hrLeaveBalance = allHrLeavebalance
        .filter((e) => e.userMasterID == userMasterID)
        .sort((a, b) => a.YearMM - b.YearMM);
      const usedLeaveBalance = allUsedLeaveBalance
        .filter((e) => e['userLeave.userMasterID'] == userMasterID)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      const lapseBalance = allLapseBalance
        .filter((e) => e.userMasterID == userMasterID)
        .sort((a, b) => +a.LapseYearMonth - +b.LapseYearMonth);
      const encashBalance = allEncashBalance
        .filter((e) => e.userMasterID == userMasterID)
        .sort((a, b) => +a.YYYYMM - +b.YYYYMM);

      if (!hrLeaveBalance.length) continue;

      const allTransactions = [
        ...usedLeaveBalance.map((t) => ({ ...t, type: CoffUsedTypeEnum.USED })),
        ...lapseBalance.map((t) => ({
          ...t,
          days: +t.LapseDays,
          date: new Date(t.createdAt).toISOString().slice(0, 10),
          type: CoffUsedTypeEnum.LAPSE,
        })),
        ...encashBalance.map((t) => ({
          ...t,
          date: new Date(t.createdAt).toISOString().slice(0, 10),
          type: CoffUsedTypeEnum.ENCASH,
        })),
      ].sort((a, b) => new Date(a.date) - new Date(b.date));

      let balances = hrLeaveBalance.map((a) => ({
        ...a,
        availBal: (+a.LeaveAddNew || 0) + (+a.OPBal || 0),
      }));

      for (let t of allTransactions) {
        let remaining = t.days;

        for (let bal of balances) {
          if (remaining <= 0) break; // stop if transaction fully consumed

          if (bal.availBal > 0) {
            let consume = Math.min(bal.availBal, remaining);

            consume = consume % 1 != 0 ? +consume.toFixed(2) : consume;

            if (consume > 0) {
              bal.availBal -= consume;
              remaining -= consume;

              bal.availBal =
                bal.availBal % 1 != 0 ? +bal.availBal.toFixed(2) : bal.availBal;

              usedTransactionLog.push({
                LeaveBalTranId: bal.LeaveBalTranId,
                date: t.date,
                days: consume,
                type: t.type,
              });
            }
          }
        }
      }

      finalBalanceArray = [...finalBalanceArray, ...balances];
    }

    console.log('--------------start adding data------------------');

    // add UsedCoffTransactions and update available balance of hrleaveBalance

    await sequelize.transaction(async (t) => {
      const chunks = chunkArray(usedTransactionLog, 5000);

      for (const chunk of chunks) {
        await UsedCoffTransaction.bulkCreate(chunk, {
          user: req.userDetails,
          individualHooks: true,
          transaction: t,
        });
      }

      const ids = finalBalanceArray.map((b) => b.LeaveBalTranId).join(',');

      const caseQuery = finalBalanceArray
        .map((b) => `WHEN ${b.LeaveBalTranId} THEN ${b.availBal}`)
        .join(' ');

      const query = `
    UPDATE "${HrLeaveBalance.getTableName()}"
    SET "availBal" = CASE "LeaveBalTranId"
      ${caseQuery}
    END
    WHERE "LeaveBalTranId" IN (${ids});
  `;

      await sequelize.query(query, { transaction: t });
    });

    console.log('--------------Data added successfully ------------------');

    return res.status(200).json({
      status: 200,
      message: 'data updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// ------------------------ delete used coff ---------------

exports.deleteUsedCoff = async (req, res, next) => {
  try {
    const { companyMasterID } = req.body;

    if (!companyMasterID)
      return res.status(200).json({
        status: 401,
        message: 'company is required!',
      });

    const allLeaveBalance = await HrLeaveBalance.findAll({
      include: [
        {
          model: UserMaster,
          where: {
            companyMasterId: { [Sequelize.Op.in]: companyMasterID },
          },
          attributes: [],
        },
        {
          required: true,
          model: HrLeaveTypes,
          where: { LeaveID: 6 },
          attributes: [],
        },
        {
          model: UsedCoffTransaction,
        },
      ],
    });

    if (allLeaveBalance.length === 0) {
      return res.status(200).json({
        status: 200,
        message: 'data updated successfully.',
      });
    }

    const usedleave = await UserLeaveTransaction.findAll({
      where: {
        status: 1,
      },
      include: [
        {
          required: true,
          model: UserLeave,
          include: [
            {
              required: true,
              model: UserMaster,
              where: {
                companyMasterId: {
                  [Sequelize.Op.in]: companyMasterID,
                },
              },

              attributes: [],
            },
          ],
          attributes: ['userMasterID'],
        },
        {
          required: true,
          model: HrLeaveTypes,
          where: {
            LeaveID: 6,
          },
          attributes: [],
        },
      ],
    });

    for (const leave of usedleave) {
      leave.dataValues.available = leave.days;
    }

    const toDeleteUsedCoffIds = [];

    for (const leaveBalance of allLeaveBalance) {
      const totalBalance = roundOffLeaveBalance(
        +leaveBalance.LeaveAddNew + +leaveBalance.OPBal,
      );
      const availableBalance = roundOffLeaveBalance(+leaveBalance.availBal);

      if (+totalBalance == availableBalance) continue;

      const usedCoffTrans = (leaveBalance.usedCoffTransactions || []).filter(
        (e) => e.type == CoffUsedTypeEnum.USED,
      );

      if (usedCoffTrans.length === 0) continue;

      const dates = usedCoffTrans.map((e) => e.date);

      const leaveTrans = usedleave.filter(
        (e) =>
          e.userLeave?.userMasterID == leaveBalance.userMasterID &&
          dates.includes(e.date),
      );

      for (const usedcoff of usedCoffTrans) {
        const findLeave = leaveTrans.find(
          (e) =>
            +e.dataValues.available > 0 &&
            new Date(e.date).getTime() == new Date(usedcoff.date).getTime(),
        );

        if (findLeave) {
          findLeave.dataValues.available = roundOffLeaveBalance(
            +findLeave.dataValues.available - +usedcoff.days,
          );
        } else {
          toDeleteUsedCoffIds.push(usedcoff.id);

          leaveBalance.availBal = roundOffLeaveBalance(
            +leaveBalance.availBal + +usedcoff.days,
          );
        }
      }
    }

    await sequelize.transaction(async (t) => {
      await UsedCoffTransaction.destroy({
        where: {
          id: {
            [Sequelize.Op.in]: toDeleteUsedCoffIds,
          },
        },
        individualHooks: true,
        user: req.userDetails,
        transaction: t,
      });

      const ids = allLeaveBalance.map((b) => b.LeaveBalTranId).join(',');

      const caseQuery = allLeaveBalance
        .map((b) => `WHEN ${b.LeaveBalTranId} THEN ${b.availBal}`)
        .join(' ');

      const query = `
    UPDATE "${HrLeaveBalance.getTableName()}"
    SET "availBal" = CASE "LeaveBalTranId"
      ${caseQuery}
    END
    WHERE "LeaveBalTranId" IN (${ids});
  `;

      await sequelize.query(query, { transaction: t });
    });

    return res.status(200).json({
      status: 200,
      message: 'data updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

exports.addExpiryInCoff = async (req, res, next) => {
  try {
    const { companyMasterID } = req.body;

    if (!companyMasterID) {
      return res.status(200).json({
        status: 401,
        message: 'company is required!',
      });
    }

    const currentDate = moment().format('YYYY-MM-DD');

    const coffData = await coffMaster.findAll({
      where: {
        status: 1,
        authorizationStatus: 3,
        '$userMaster.companyMasterId$': companyMasterID,
      },
      include: [
        {
          model: UserMaster,
          attributes: ['userMasterID'],
          include: [
            {
              model: empLeavePolicy,
              where: {
                status: 1,
                applicableDate: {
                  [Sequelize.Op.lte]: currentDate,
                },

                [Sequelize.Op.or]: [
                  {
                    endDate: {
                      [Sequelize.Op.gte]: currentDate,
                    },
                  },
                  {
                    endDate: {
                      [Sequelize.Op.is]: null,
                    },
                  },
                ],
              },
              attributes: ['employeeLeavePolicyID'],
            },
          ],
        },
        {
          model: HrLeaveBalance,
          where: {
            expiryDate: {
              [Sequelize.Op.is]: null,
            },
            availBal: {
              [Sequelize.Op.gt]: 0,
            },
          },
        },
      ],
    });

    const coffUserMap = new Map();

    for (const coff of coffData) {
      const userId = coff.userMasterID;

      if (!coffUserMap.has(userId)) {
        // Leave policy comes from nested authorizer -> empLeavePolicy (array), take the first one
        const leavePolicy = coff.userMaster?.empLeavePolicies?.[0] || null;

        coffUserMap.set(userId, {
          coffList: [],
          leavePolicy,
        });
      }

      coffUserMap.get(userId).coffList.push(coff);
    }

    let counter = 0;

    const userPromises = [];

    for (const [userId, usercoff] of coffUserMap.entries()) {
      const leavePolicyIds = usercoff.leavePolicy?.employeeLeavePolicyID;

      if (!leavePolicyIds?.length) continue;

      userPromises.push(
        (async () => {
          const leavePolicy = await employeeLeavePolicy.findOne({
            where: {
              id: {
                [Sequelize.Op.in]: leavePolicyIds,
              },
              leaveId: 6,
            },
            attributes: ['expiryDays'],
          });

          if (!leavePolicy?.expiryDays) return;

          const coffUpdatePromises = [];

          for (const coff of usercoff.coffList || []) {
            counter++;

            const expiryDate = getDateByAddingDays(
              coff.LeaveCreatedDate,
              leavePolicy.expiryDays,
            );

            coffUpdatePromises.push(
              coffMaster.update(
                { expiryDate },
                { where: { coffMasterID: coff.coffMasterID } },
              ),
            );

            const hrleaveBalanceId =
              coff.hrLeaveBalance?.LeaveBalTranId || null;

            if (hrleaveBalanceId) {
              coffUpdatePromises.push(
                HrLeaveBalance.update(
                  { expiryDate },
                  { where: { LeaveBalTranId: hrleaveBalanceId } },
                ),
              );
            }
          }

          await Promise.all(coffUpdatePromises);
        })(),
      );
    }

    await Promise.all(userPromises);

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: 'Expiry Date added successFully!',
      count: counter,
    });
  } catch (error) {
    next(error);
  }
};
