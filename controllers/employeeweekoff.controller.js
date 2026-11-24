const Sequelize = require('sequelize');
const UserMaster = require('../models/userMaster');
const EmployeeWeekOff = require('../models/employeeWeekOff');
const message = require('../response_message/message');
const sequelize = require('../config/database');
const EmployeeSalaryPolicy = require('../models/employeeSalaryPolicy');
const SalaryPolicy = require('../models/salaryPolicy');
const hrLeavesMonthlyTrans = require('../models/hrLeavesMonthlyTrans');
const {
  userDetails,
  add_WeekOffHoliday_With_Transaction,
  asiaKolkataDateTime,
  getSalaryCycleDateByMonth,
  getSalaryCycleDateAndMonthByDate,
  getMonthsDateByDate,
} = require('../utils/commonUtilFunctions');
const weekOffPolicy = require('../models/weekOffPolicy');
const companyMaster = require('../models/companyMaster');
const { userAttributes } = require('../utils/commonVars');
const holidayPolicy = require('../models/holidayPolicy');
const employeeHolidayPolicy = require('../models/employeeHolidayPolicy');
const { weekoffTypeEnum } = require('../utils/dbUtils');
const weekoffHolidayTran = require('../models/weekoffHolidayTran');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const moment = require('moment');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');

exports.getEmployeeWeekOffByUserId = async (req, res, next) => {
  try {
    let userMasterID = req.params.id;
    if (req?.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }
    let get_one_data = await EmployeeWeekOff.findAll({
      where: {
        userMasterID: userMasterID,
        status: 1,
      },
      order: [['applicableDate', 'ASC']],
      include: [
        {
          model: UserMaster,
          as: 'employee',
        },
        {
          model: UserMaster,
          as: 'createdByUserDetails',
          attributes: userAttributes,
        },
        {
          model: weekOffPolicy,
          as: 'weekoff',
          include: [
            {
              model: UserMaster,
              as: 'c_By',
              attributes: userAttributes,
            },
            {
              model: UserMaster,
              as: 'u_By',
              attributes: userAttributes,
            },
          ],
        },
      ],
    });
    if (get_one_data.length == 0) {
    } else if (get_one_data.length == 1) {
      get_one_data[0].dataValues.showDelete = true;
      if (
        new Date(get_one_data[0].applicableDate).toISOString().slice(0, 10) >
        new Date().toISOString().slice(0, 10)
      ) {
        get_one_data[0].dataValues.weekoffpolicystatus = 'deactive';
      } else {
        get_one_data[0].dataValues.weekoffpolicystatus = 'active';
      }
    } else {
      let startdates = [];
      for (let j = 0; j < get_one_data.length; j++) {
        startdates.push(new Date(get_one_data[j].applicableDate));
      }
      get_one_data[get_one_data.length - 1].dataValues.showDelete = true;

      const dateArr = startdates.sort((a, b) => a - b);
      const nearestPastDate = (dateArr, date) => {
        const pastArr = dateArr.filter((n) => n <= date);
        return pastArr.length > 0 ? pastArr[pastArr.length - 1] : null;
      };
      const past = nearestPastDate(dateArr, new Date())
        .toISOString()
        .slice(0, 10);

      for (let i = 0; i < get_one_data.length; i++) {
        let D1 = new Date(get_one_data[i].applicableDate)
          .toISOString()
          .slice(0, 10);
        let D2;
        if (get_one_data[i].endDate == null) {
          D2 = null;
        } else {
          D2 = new Date(get_one_data[i].endDate).toISOString().slice(0, 10);
        }

        let D3 = new Date().toISOString().slice(0, 10);
        if (D3 == D1) {
          get_one_data[i].dataValues.weekoffpolicystatus = 'active';
        } else if (D3 >= D1 && D3 <= D2 && D3 == D1) {
          get_one_data[i].dataValues.weekoffpolicystatus = 'active';
        } else if (D2 == null && D1 <= D3) {
          get_one_data[i].dataValues.weekoffpolicystatus = 'active';
        } else if (D3 > D1) {
          if (D1 == past) {
            get_one_data[i].dataValues.weekoffpolicystatus = 'active';
          } else {
            get_one_data[i].dataValues.weekoffpolicystatus = 'deactive';
          }
        } else {
          get_one_data[i].dataValues.weekoffpolicystatus = 'deactive';
        }
      }
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

exports.getEmployeeWeekoff = async (req, res, next) => {
  try {
    let { limit, page, companyMasterID } = req.body;

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const { rows: company_contact, count } = await UserMaster.findAndCountAll({
      where: {
        status: 1,
        companyMasterId: companyMasterID,
        ...userAccessCondition.where,
      },
      ...paginationQuery,
      include: [...userAccessCondition.includeModels],
    });

    if (!company_contact.length) {
      return res.status(200).json({ status: 200, data: [], totalcount: 0 });
    }

    const userIds = company_contact.map((u) => u.userMasterID);

    /* -----------------------------
       FETCH ALL WEEKOFFS AT ONCE
    ------------------------------ */
    const weekOffData = await EmployeeWeekOff.findAll({
      where: {
        userMasterID: { [Sequelize.Op.in]: userIds },
        status: { [Sequelize.Op.in]: [1] },
      },
      order: [['applicableDate', 'ASC']],
      include: [
        {
          model: UserMaster,
          as: 'employee',
          include: [{ model: companyMaster }],
        },
        { model: weekOffPolicy, as: 'weekoff' },
      ],
    });

    /* -----------------------------
       GROUP WEEKOFFS BY USER
    ------------------------------ */
    const weekOffMap = {};
    for (const row of weekOffData) {
      if (!weekOffMap[row.userMasterID]) {
        weekOffMap[row.userMasterID] = [];
      }
      weekOffMap[row.userMasterID].push(row);
    }

    const today = new Date().toISOString().slice(0, 10);

    /* -----------------------------
       PROCESS STATUS LOGIC
    ------------------------------ */
    for (const user of company_contact) {
      const get_one_data = weekOffMap[user.userMasterID] || [];
      user.dataValues.department = get_one_data;

      if (get_one_data.length === 1) {
        const startDate = new Date(get_one_data[0].applicableDate)
          .toISOString()
          .slice(0, 10);

        get_one_data[0].status = startDate > today ? 0 : 1;
      } else if (get_one_data.length > 1) {
        const sortedDates = get_one_data
          .map((d) => new Date(d.applicableDate))
          .sort((a, b) => a - b);

        const pastDates = sortedDates.filter((d) => d <= new Date());
        const past =
          pastDates.length > 0
            ? pastDates[pastDates.length - 1].toISOString().slice(0, 10)
            : null;

        for (const row of get_one_data) {
          const D1 = new Date(row.applicableDate).toISOString().slice(0, 10);
          const D2 = row.endDate
            ? new Date(row.endDate).toISOString().slice(0, 10)
            : null;

          if (
            D1 === today ||
            (D2 === null && D1 <= today) ||
            (today > D1 && D1 === past)
          ) {
            row.status = 1;
          } else {
            row.status = 0;
          }
        }
      }
    }

    return res.status(200).json({
      status: 200,
      data: company_contact,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};

exports.addWeekForSpecificDates = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    let { startDate, endDate, companyMasterIDs } = req.body;

    for (let company of companyMasterIDs) {
      const findWeekoffPolicy = await weekOffPolicy.findAll({
        where: {
          companyMasterID: +company,
          status: 1,
          weekoffType: weekoffTypeEnum.FIX,
        },
      });
      for (let weekoff of findWeekoffPolicy) {
        const findEmployeeWeekoff = await EmployeeWeekOff.findAll({
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(startDate) },
            [Sequelize.Op.or]: [
              {
                endDate: { [Sequelize.Op.gte]: new Date(startDate) },
              },
              {
                endDate: { [Sequelize.Op.eq]: null },
              },
            ],
            weekOffPolicyID: weekoff.weekOffPolicyID,
          },
        });
        const policyWiseUserIDs = findEmployeeWeekoff.map(
          (e) => +e.userMasterID,
        );

        if (policyWiseUserIDs.length > 0) {
          await add_WeekOffHoliday_With_Transaction(
            company,
            policyWiseUserIDs,
            new Date(startDate).toISOString().slice(0, 10),
            weekoff.weekOffPolicyID,
            null,
            false,
            endDate,
            transaction,
          );
        }
      }

      const findHolidayPolicy = await holidayPolicy.findAll({
        where: {
          companyMasterID: +company,
          status: 1,
        },
      });
      for (let holiday of findHolidayPolicy) {
        const findEmployeeHoliday = await employeeHolidayPolicy.findAll({
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(startDate) },
            [Sequelize.Op.or]: [
              {
                endDate: { [Sequelize.Op.gte]: new Date(startDate) },
              },
              {
                endDate: { [Sequelize.Op.eq]: null },
              },
            ],
            holidayPolicyID: holiday.holidayPolicyID,
          },
        });
        const policyWiseUserIDs = findEmployeeHoliday.map(
          (e) => +e.userMasterID,
        );

        if (policyWiseUserIDs.length > 0) {
          await add_WeekOffHoliday_With_Transaction(
            company,
            policyWiseUserIDs,
            new Date(startDate).toISOString().slice(0, 10),
            null,
            holiday.holidayPolicyID,
            false,
            endDate,
            transaction,
          );
        }
      }
    }
    await transaction.commit();
    return res
      .status(200)
      .json({ status: 200, message: 'Data add successfully.' });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

exports.deleteEmployeeWeekoffPolicy = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { employeeWeekOffID } = req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    const findEmployeeWeekOffPolicy = await EmployeeWeekOff.findOne({
      where: { employeeWeekOffID, status: 1 },
      transaction,
      include: [
        {
          model: UserMaster,
          as: 'employee',
          attributes: ['companyMasterId'],
        },
      ],
    });

    if (!findEmployeeWeekOffPolicy) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Employee Weekoff Policy'),
      });
    }

    const hasAnyAttVerified = await findAfterMonthAttendanceVerified(
      findEmployeeWeekOffPolicy.applicableDate,
      findEmployeeWeekOffPolicy.userMasterID,
    );

    if (hasAnyAttVerified) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message:
          'You cannot delete this assigned policy as attendance for the assigned policy period has already been verified.',
      });
    }

    const findPreviousPolicy = await EmployeeWeekOff.findOne({
      where: {
        userMasterID: findEmployeeWeekOffPolicy.userMasterID,
        status: 1,
        applicableDate: {
          [Sequelize.Op.lt]: findEmployeeWeekOffPolicy.applicableDate,
        },
      },
      order: [['applicableDate', 'DESC']],
      transaction,
    });

    if (findPreviousPolicy) {
      await findPreviousPolicy.update(
        {
          endDate: null,
          updateBy,
          updateByIp,
        },
        { transaction },
      );
      await add_WeekOffHoliday_With_Transaction(
        findEmployeeWeekOffPolicy.employee?.companyMasterId,
        [findEmployeeWeekOffPolicy.userMasterID],
        findPreviousPolicy.applicableDate,
        findPreviousPolicy.weekOffPolicyID,
        null,
        false,
        null,
        transaction,
      );
    } else {
      await weekoffHolidayTran.destroy({
        where: {
          userMasterID: findEmployeeWeekOffPolicy.userMasterID,
          tableName: 'weekoff',
          date: {
            [Sequelize.Op.gte]: findEmployeeWeekOffPolicy.applicableDate,
          },
        },
        transaction,
      });
    }

    await findEmployeeWeekOffPolicy.update(
      {
        status: 2,
        updateBy,
        updateByIp,
      },
      { transaction },
    );

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Weekoff'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

async function findAfterMonthAttendanceVerified(date, userMasterID) {
  try {
    const findVerifiedData = await hrLeavesMonthlyTrans.findOne({
      where: {
        userMasterID,
        verified: 1,
        monthstartdate: {
          [Sequelize.Op.lte]: date,
        },
        monthenddate: {
          [Sequelize.Op.gte]: date,
        },
      },
      attributes: ['AttnTranId'],
    });

    return !!findVerifiedData;
  } catch (error) {
    throw new Error(
      'Error in findAfterMonthAttendanceVerified: ' + error.message,
    );
  }
}

exports.assignEmployeeWeekOffFromAnyMonthBulk = async (req, res, next) => {
  try {
    const { userMasterID, weekOffPolicyID, applicableMonth } = req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    if (!applicableMonth) {
      return res.status(400).json({
        status: 400,
        message: 'applicableMonth (YYYY-MM) is required',
      });
    }
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const [year, month] = applicableMonth.split('-').map(Number);

    const YYYYMM = Number(`${year}${month.toString().padStart(2, '0')}`);
    const [findAllUserData, verifiedUsers, allUserAssignedPolicies] =
      await Promise.all([
        // Users Data
        UserMaster.findAll({
          where: {
            userMasterID,
            status: 1,
          },
          include: [
            {
              model: EmployeeJoiningDetails,
              attributes: ['joiningDate'],
            },
            {
              required: false,
              model: EmployeeSalaryPolicy,
              where: {
                status: 1,
                startDate: { [Sequelize.Op.lte]: currentDate },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: currentDate } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              attributes: ['salaryPolicyID', 'startDate'],
              include: [
                {
                  model: SalaryPolicy,
                  as: 'salaryPolicy',
                  attributes: ['salaryCycleDate', 'salaryCycleConsider'],
                },
              ],
            },
          ],
          attributes: userAttributes,
          order: [['displayName', 'ASC']],
        }),
        // ATTENDANCE VERIFIED USERS
        hrLeavesMonthlyTrans.findAll({
          attributes: ['userMasterID'],
          where: {
            userMasterID,
            AttnYearMon: { [Sequelize.Op.gte]: YYYYMM },
            verified: 1,
          },
          raw: true,
        }),
        // All User Assigned Policies
        EmployeeWeekOff.findAll({
          where: { userMasterID, status: 1 },
          order: [['applicableDate', 'ASC']],
        }),
      ]);
    const verifiedUserSet = new Set(verifiedUsers.map((v) => v.userMasterID));
    const weekOffMap = {};
    for (const w of allUserAssignedPolicies) {
      if (!weekOffMap[w.userMasterID]) weekOffMap[w.userMasterID] = [];
      weekOffMap[w.userMasterID].push(w);
    }

    const attverifiedUserNames = [];
    const beforeJoiningDateUserNames = [];
    const assignedUserMasterIDs = [];

    const transaction = await sequelize.transaction();
    try {
      for (const user of findAllUserData) {
        const joiningDate =
          user.employeeJoiningDetails?.[0]?.joiningDate || null;
        const joiningMonthStart = moment(joiningDate).startOf('month');
        if (verifiedUserSet.has(user.userMasterID)) {
          attverifiedUserNames.push(user.displayName);
          continue;
        }
        assignedUserMasterIDs.push(user.userMasterID);
        // let salaryCycleDay = '01';
        const activePolicy =
          user.employeeSalaryPolicies?.[0]?.salaryPolicy || null;

        const { start_date, end_date } = getSalaryCycleDateByMonth(
          activePolicy,
          YYYYMM,
        );

        let date = start_date;

        const applicableDate = new Date(date);
        applicableDate.setHours(0, 0, 0, 0);

        const policies = weekOffMap[user.userMasterID] || [];
        const existingWithSameApplicableDate = policies.find((p) =>
          moment(p.applicableDate).isSame(applicableDate, 'day'),
        );
        let finalEndDate = null;
        if (!existingWithSameApplicableDate) {
          const past = policies
            .filter((p) => new Date(p.applicableDate) < applicableDate)
            .pop();
          const future = policies
            .filter((p) => new Date(p.applicableDate) > applicableDate)
            .sort(
              (a, b) => new Date(a.applicableDate) - new Date(b.applicableDate),
            )[0];

          if (past) {
            await EmployeeWeekOff.update(
              {
                endDate: new Date(applicableDate.getTime() - 86400000),
                updateBy: createBy,
                updateByIp: createByIp,
              },
              {
                where: { employeeWeekOffID: past.employeeWeekOffID },
                transaction,
              },
            );
          }

          if (future?.applicableDate) {
            finalEndDate = new Date(future.applicableDate);
            finalEndDate.setDate(finalEndDate.getDate() - 1);
          }
          await EmployeeWeekOff.create(
            {
              userMasterID: user.userMasterID,
              weekOffPolicyID,
              applicableDate,
              endDate: finalEndDate,
              createBy,
              createByIp,
            },
            { transaction },
          );
        } else {
          finalEndDate = existingWithSameApplicableDate.endDate;
          await EmployeeWeekOff.update(
            {
              weekOffPolicyID,
              updateBy: createBy,
              updateByIp: createByIp,
            },
            {
              where: {
                employeeWeekOffID:
                  existingWithSameApplicableDate.employeeWeekOffID,
              },
              transaction,
            },
          );
        }

        /* -----------------------------------------
       REGENERATE WEEK OFF HOLIDAYS
    ----------------------------------------- */
        await add_WeekOffHoliday_With_Transaction(
          user.companyMasterId,
          [user.userMasterID],
          start_date,
          weekOffPolicyID,
          null,
          false,
          finalEndDate,
          transaction,
        );
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    const messageArray = [];

    if (assignedUserMasterIDs.length) {
      messageArray.push(
        `Week-off policy assigned to ${assignedUserMasterIDs.length} user(s).`,
      );
    }

    if (attverifiedUserNames.length) {
      messageArray.push(
        `Skipped ${attverifiedUserNames.join(
          ', ',
        )} due to verified attendance.`,
      );
    }

    return res.status(200).json({
      status: 200,
      message: messageArray.join('<br><br>'),
    });
  } catch (err) {
    next(err);
  }
};
