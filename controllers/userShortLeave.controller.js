const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserShortLeave = require('../models/userShortLeave');
const FormAuthorizationDetails = require('../models/AuthorizationDetails');
const AuthorizationCriteriaMaster = require('../models/authorizationCriteriaMaster');
const UserMaster = require('../models/userMaster');
const ShortLeaveAuthorization = require('../models/shortLeaveAuthorization');
const UserInbox = require('../models/UserInbox');
const {
  sendNotification,
  asiaKolkataDateTime,
  authorization,
  daysInMonth,
  getDateRangeBySalaryPolicy,
  updateAttendanceTrans,
  calculateFullDayHalfDay,
} = require('../utils/commonUtilFunctions');
const moment = require('moment');
const UserLeave = require('../models/userleave');
const EmployeeShortLeavePolicy = require('../models/employeeShortLeavePolicy');
const ShortLeave = require('../models/shortLeave');
const EmployeeSalaryPolicy = require('../models/employeeSalaryPolicy');
const SalaryPolicy = require('../models/salaryPolicy');
const HrLeaveMaster = require('../models/hrLeaveMaster');
const HrLeaveMonthlyTrans = require('../models/hrLeavesMonthlyTrans');
const attendanceTransaction = require('../models/attendanceTransaction');
const weekoffHolidayTran = require('../models/weekoffHolidayTran');
const Shift = require('../models/shift');
const ShiftTIme = require('../models/shiftTime');
const {
  authorizationMasterTypes,
  AuthorizationStatusType,
} = require('../utils/dbUtils');
const { statusCodes } = require('../utils/commonVars');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');

async function checkShortLeaveApplicationValidation(
  userDetails,
  date,
  type = null,
  id = null,
  from = 'employee',
) {
  const obj = {
    message: null,
    attendanceStatus: null,
  };

  if (!userDetails) return;

  const shortLeavePolicy =
    userDetails.employeeShortLeavePolicies?.[0]?.shortLeave || null;

  if (!shortLeavePolicy) {
    obj.message = `Short Leave Policy is not assigned ${
      from !== 'employee' ? `to ${userDetails.displayName}` : ''
    }`;
    return obj;
  }

  const currentDate = moment().format('YYYY-MM-DD');

  // if allowed only on same day
  if (shortLeavePolicy?.onlySameDay && currentDate !== date) {
    obj.message = `Short Leave can only be applied for the same day${
      from !== 'employee' ? ` for ${userDetails?.displayName}` : ''
    }`;
    return obj;
  }

  // if advanceDays
  if (shortLeavePolicy.advanceDays) {
    const diffDays = moment(date)
      .startOf('day')
      .diff(moment().startOf('day'), 'days');

    if (diffDays < shortLeavePolicy.advanceDays) {
      obj.message = `Short Leave must be applied at least ${shortLeavePolicy.advanceDays} day(s) in advance${
        from !== 'employee' ? ` for ${userDetails?.displayName}` : ''
      }`;
      return obj;
    }
  }

  // if past days
  if (shortLeavePolicy.pastDays) {
    const diffDays = moment()
      .startOf('day')
      .diff(moment(date).startOf('day'), 'days');

    // diffDays = how many days in past
    if (diffDays > shortLeavePolicy.pastDays) {
      obj.message = `Short Leave can only be applied within ${shortLeavePolicy.pastDays} day(s) in the past${
        from !== 'employee' ? ` for ${userDetails?.displayName}` : ''
      }`;
      return obj;
    }
  }

  // To Find Day
  const day = new Date(date).toLocaleString('en-us', {
    weekday: 'long',
  });

  const weekoffHoliday = userDetails.weekoffHolidayTrans?.[0] || null;

  if (weekoffHoliday) {
    obj.message = `Short leave cannot be applied on a Weekoff/Holiday${
      from !== 'employee' ? ` for ${userDetails?.displayName}` : ''
    }`;
    return obj;
  }

  const attendance = userDetails.attendanceTransactions?.[0] || null;

  // if past date and attendance is not found
  if (!attendance && date < currentDate) {
    obj.message = `No attendance record found for ${date}${
      from !== 'employee' ? ` for ${userDetails?.displayName}` : ''
    }.`;
    return obj;
  }

  // if full day
  if (attendance?.fulldayhalfday == 1 && !attendance.shiftShortfallMinutes) {
    obj.message = `You are already marked present on ${date}. Short leave application is not allowed${
      from !== 'employee' ? ` for ${userDetails?.displayName}` : ''
    }.`;
    return obj;
  }

  const verifiedData = userDetails.hrLeaveMonthlyTrans?.[0] || null;

  // if verified data found
  if (verifiedData) {
    obj.message = `You cannot apply for short leave as your attendance has already been verified${
      from !== 'employee' ? ` for ${userDetails?.displayName}` : ''
    }.`;
    return obj;
  }

  const salaryPolicy =
    userDetails.employeeSalaryPolicies?.[0]?.salaryPolicy || null;

  const year = String(date).slice(0, 4);
  const month = String(date).slice(5, 7);

  const { start_date, end_date } = getDateRangeBySalaryPolicy(
    year,
    month,
    salaryPolicy,
  );

  const shortleaveCondition = {
    userMasterID: userDetails.userMasterID,
    date: {
      [Sequelize.Op.between]: [start_date, end_date],
    },
    authorizationStatus: {
      [Sequelize.Op.notIn]: [4, 5],
    },
  };

  // if update data
  if (type == 'update')
    shortleaveCondition.userShortLeaveId = {
      [Sequelize.Op.ne]: id,
    };

  const findUsedShortLeaveCount = await UserShortLeave.count({
    where: shortleaveCondition,
  });

  // if used slot leave is greater than to allowed short leave
  if (+findUsedShortLeaveCount >= +shortLeavePolicy?.noOfShortLeave) {
    obj.message = `You have reached your limit of ${shortLeavePolicy?.noOfShortLeave} short leave(s)${
      from !== 'employee' ? ` for ${userDetails?.displayName}` : ''
    }.`;
    return obj;
  }

  if (attendance?.OutDateTime) {
    // Shift grace time
    const shiftGraceTime = attendance.shift?.shiftGrace || 0;

    const totalMinutes =
      shiftGraceTime +
      +attendance.roundOffMinutes +
      +shortLeavePolicy.minutesForShortLeave;

    // new fulldayhalf day

    const attendanceFullDayHalfDay = await calculateFullDayHalfDay({
      shiftID: attendance.Shift,
      dayName: day,
      totalWorkMin: totalMinutes,
    });
    // Check if adding short leave minutes does not change the attendance status

    if (
      +attendance.fulldayhalfday == attendanceFullDayHalfDay &&
      !attendance.shiftShortfallMinutes
    ) {
      obj.message = `Applying '${shortLeavePolicy?.minutesForShortLeave}' minutes of short leave will not change your attendance status. Hence, short leave cannot be applied${
        from !== 'employee' ? ` for ${userDetails?.displayName}` : ''
      }.`;
      return obj;
    }

    obj.attendanceStatus = attendanceFullDayHalfDay;
    return obj;
  }

  return obj;
}

exports.add = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { userMasterIDs, date, remarks, from = 'employee' } = req.body;

    if (req.userDetails.isMyUserDetails) {
      userMasterIDs = [req.userDetails.userMasterId];
    }

    const userDetails = await UserMaster.findAll({
      where: {
        userMasterID: {
          [Sequelize.Op.in]: userMasterIDs,
        },
      },
      include: [
        {
          required: false,
          model: EmployeeShortLeavePolicy,
          where: {
            applicableDate: {
              [Sequelize.Op.lte]: new Date(date),
            },
            [Sequelize.Op.or]: [
              {
                endDate: { [Sequelize.Op.gte]: new Date(date) },
              },
              {
                endDate: { [Sequelize.Op.eq]: null },
              },
            ],
          },
          attributes: ['shortLeavePolicyID'],
          include: [{ model: ShortLeave }],
        },
        {
          model: EmployeeSalaryPolicy,
          required: false,
          where: {
            startDate: {
              [Sequelize.Op.lte]: new Date(date),
            },
            [Sequelize.Op.or]: [
              {
                endDate: { [Sequelize.Op.gte]: new Date(date) },
              },
              {
                endDate: { [Sequelize.Op.eq]: null },
              },
            ],
            status: 1,
          },
          attributes: ['salaryPolicyID'],
          include: [{ model: SalaryPolicy, as: 'salaryPolicy' }],
        },
        {
          separate: true,
          required: false,
          model: HrLeaveMonthlyTrans,
          where: {
            monthstartdate: {
              [Sequelize.Op.lte]: date,
            },
            monthenddate: { [Sequelize.Op.gte]: date },
            verified: 1,
          },
          limit: 1,
        },
        {
          required: false,
          model: attendanceTransaction,
          where: {
            AttendanceDate: date,
          },
          include: [
            {
              model: Shift,
              attributes: ['shiftID', 'shiftGrace'],
            },
          ],
        },
        {
          required: false,
          model: weekoffHolidayTran,
          where: {
            date,
            optionalHoliday: false,
          },
        },
        {
          required: false,
          model: UserShortLeave,
          where: {
            date,
            authorizationStatus: {
              [Sequelize.Op.notIn]: [5, 4],
            },
          },
        },
        {
          required: false,
          separate: true,
          model: FormAuthorizationDetails,
          where: {
            AuthorizationMasterID: authorizationMasterTypes.leave, // Leave
            status: 1,
          },
          include: [
            {
              model: AuthorizationCriteriaMaster,
              attributes: ['AuthorizationCriteria'],
            },
          ],
        },
      ],
      attributes: ['userMasterID', 'displayName'],
      transaction,
    });

    const alreadyAddData = [];
    const inboxData = [];
    const halfDayTrans = [];
    const fullDayTrans = [];

    for (const user of userDetails) {
      const userMasterID = user.userMasterID;

      const shortLeave = user.userShortLeaves?.[0] || null;
      const authorizationdetails = user.authorizationDetails?.[0] || null;

      // if data already add
      if (shortLeave) {
        if (from == 'employee') {
          await transaction.rollback();
          return res.status(statusCodes.OK).json({
            status: 401,
            message: `Short Leave already applied for ${date} `,
          });
        }

        alreadyAddData.push(user.displayName);
        continue;
      }
      // check validation
      const { message, attendanceStatus } =
        await checkShortLeaveApplicationValidation(
          user,
          date,
          'add',
          null,
          from,
        );

      // retrun from here
      if (message) {
        await transaction.rollback();
        return res.status(statusCodes.OK).json({
          status: 401,
          message: `${message} `,
        });
      }

      const AttendanceTransID =
        user.attendanceTransactions?.[0]?.AttendanceTransID || null;

      const authorizationStatus =
        authorizationdetails && authorizationdetails.AuthorizationCriteriaMaster
          ? authorizationdetails.AuthorizationCriteriaMaster
              .AuthorizationCriteria == 'Sequeance No'
            ? 2
            : 1
          : 0;

      const toAddData = {
        userMasterID,
        date,
        remarks,
        authorizationStatus,
        AttendanceTransID,
      };

      const shortLeavePolicy =
        user.employeeShortLeavePolicies?.[0]?.shortLeave || null;

      // if short leave is auto appove
      if (shortLeavePolicy?.autoApprove) {
        toAddData.authorizationStatus = 3;
        toAddData.isAutoApproved = true;

        // create Short leave

        await UserShortLeave.create(toAddData, {
          user: req.userDetails,
          transaction,
        });

        if (attendanceStatus == 0.5) halfDayTrans.push(AttendanceTransID);
        if (attendanceStatus == 1) fullDayTrans.push(AttendanceTransID);

        continue;
      }

      // create Short leave

      const addData = await UserShortLeave.create(toAddData, {
        user: req.userDetails,
        transaction,
      });

      // if authorization is set

      if (authorizationStatus != 0) {
        const notification = {
          title: 'Short Leave',
          body: user.displayName + ' requested for a Short Leave.',
        };
        const data = {
          screen: 'shortLeaveAuth',
          isScheduled: 'true',
          scheduledTime: new Date().toISOString(),
        };

        // For Sequence No
        if (authorizationStatus == 2) {
          const authorizationData = await ShortLeaveAuthorization.create(
            {
              referenceId: addData.userShortLeaveId,
              userMasterID: authorizationdetails.AuthorizedByUserMasterId[0],
              authstatus: 2,
            },
            { user: req.userDetails, transaction },
          );

          // push in user inbox
          inboxData.push({
            activityTable: ShortLeaveAuthorization.getTableName(),
            activityTablePK: authorizationData.toJSON().id,
            message: `${
              user.displayName
            } has requested a Short Leave for ${moment(date).format(
              'DD/MM/YYYY',
            )}.`,
            assignedTo: authorizationdetails.AuthorizedByUserMasterId[0],
            assignedBy: userMasterID,
          });

          // send Notification
          sendNotification(authorizationData.userMasterID, notification, data);
        } else {
          // For Any
          for (
            let j = 0;
            j < authorizationdetails.AuthorizedByUserMasterId.length;
            j++
          ) {
            const authorizationData = await ShortLeaveAuthorization.create(
              {
                referenceId: addData.userShortLeaveId,
                userMasterID: authorizationdetails.AuthorizedByUserMasterId[j],
                authstatus: 2,
              },
              { user: req.userDetails, transaction },
            );

            inboxData.push({
              activityTable: ShortLeaveAuthorization.getTableName(),
              activityTablePK: authorizationData.toJSON().id,
              message: `${
                user.displayName
              } has requested a Short Leave for ${moment(date).format(
                'DD/MM/YYYY',
              )}.`,
              assignedTo: authorizationdetails.AuthorizedByUserMasterId[j],
              assignedBy: userMasterID,
            });

            // send Notification
            sendNotification(
              authorizationData.userMasterID,
              notification,
              data,
            );
          }
        }
      }
    }
    // create all inbox data

    if (inboxData.length) {
      await UserInbox.bulkCreate(inboxData, { transaction });
    }

    const options = {
      transaction: transaction,
    };
    // for half day Transactions
    if (halfDayTrans.length) {
      await updateAttendanceTrans(
        halfDayTrans,
        0.5,
        options,
        req.userDetails?.userMasterId,
      );
    }

    // for full day Transactions
    if (fullDayTrans.length) {
      await updateAttendanceTrans(
        fullDayTrans,
        1,
        options,
        req.userDetails?.userMasterId,
      );
    }

    let messageParts = [];

    if (alreadyAddData.length > 0) {
      messageParts.push(
        `Users "${alreadyAddData.join(',')}" have already applied for short leave.`,
      );
      messageParts.push('And other');
    }

    // Join messages with <br> tags for new lines
    const message = messageParts.join('<br>');

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: `${message} Short Leave Added Successfully`,
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

exports.update = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const userShortLeaveId = req.params.id;

    const { date, remarks } = req.body;

    const shortLeave = await UserShortLeave.findByPk(userShortLeaveId, {
      transaction,
      include: [
        {
          model: UserMaster,
          attributes: ['userMasterID', 'displayName'],
        },
        {
          required: false,
          model: ShortLeaveAuthorization,
          where: {
            authstatus: {
              [Sequelize.Op.in]: [0, 1],
            },
          },
        },
      ],
    });

    if (!shortLeave) throw new Error('Short Leave Not Found.');

    // if Short leave is Approved

    if (shortLeave.authorizationStatus == 3) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message:
          'You cannot modify a short leave that has already been approved.',
      });
    }

    const authorizationData = shortLeave.shortLeaveAuthorizations?.[0] || null;

    // if some one has approve or reject the short leave

    if (authorizationData) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message:
          'Your short leave has already been approved or rejected, and cannot be modified.',
      });
    }

    const userMasterID = shortLeave.userMasterID;

    // user Details
    const userDetails = await UserMaster.findOne({
      where: {
        userMasterID,
      },
      include: [
        {
          required: false,
          model: EmployeeShortLeavePolicy,
          where: {
            applicableDate: {
              [Sequelize.Op.lte]: new Date(date),
            },
            [Sequelize.Op.or]: [
              {
                endDate: { [Sequelize.Op.gte]: new Date(date) },
              },
              {
                endDate: { [Sequelize.Op.eq]: null },
              },
            ],
          },
          attributes: ['shortLeavePolicyID'],
          include: [{ model: ShortLeave }],
        },
        {
          model: EmployeeSalaryPolicy,
          required: false,
          where: {
            status: 1,
            startDate: {
              [Sequelize.Op.lte]: new Date(date),
            },
            [Sequelize.Op.or]: [
              {
                endDate: { [Sequelize.Op.gte]: new Date(date) },
              },
              {
                endDate: { [Sequelize.Op.eq]: null },
              },
            ],
          },
          attributes: ['salaryPolicyID'],
          include: [{ model: SalaryPolicy, as: 'salaryPolicy' }],
        },
        {
          separate: true,
          required: false,
          model: HrLeaveMonthlyTrans,
          where: {
            monthstartdate: {
              [Sequelize.Op.lte]: date,
            },
            monthenddate: { [Sequelize.Op.gte]: date },
            verified: 1,
          },
          limit: 1,
        },
        {
          required: false,
          model: attendanceTransaction,
          where: {
            AttendanceDate: date,
          },
          include: [
            {
              model: Shift,
              attributes: ['shiftID', 'shiftGrace'],
            },
          ],
        },
        {
          required: false,
          model: weekoffHolidayTran,
          where: {
            date,
            optionalHoliday: false,
          },
        },
        {
          required: false,
          model: UserShortLeave,
          where: {
            userShortLeaveId: {
              [Sequelize.Op.ne]: userShortLeaveId,
            },
            date,
            authorizationStatus: {
              [Sequelize.Op.notIn]: [
                AuthorizationStatusType.CANCELLED,
                AuthorizationStatusType.REJECTED,
              ],
            },
          },
        },
      ],
      attributes: ['userMasterID', 'displayName'],
      transaction,
    });

    const currentDateShortLeave = userDetails.userShortLeaves?.[0] || null;

    // if data already add
    if (currentDateShortLeave) {
      await transaction.rollback();
      return res.status(statusCodes.OK).json({
        status: 401,
        message: `Short Leave already applied for ${date} `,
      });
    }

    // check validation
    const { message, attendanceStatus } =
      await checkShortLeaveApplicationValidation(
        userDetails,
        date,
        'update',
        userShortLeaveId,
        'employee',
      );

    if (message) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message,
      });
    }

    const AttendanceTransID =
      userDetails.attendanceTransactions?.[0]?.AttendanceTransID || null;

    const authorizationdetails = await FormAuthorizationDetails.findOne(
      {
        where: {
          AuthorizationMasterID: authorizationMasterTypes.leave, // Leave
          userMasterID,
          status: 1,
        },
        include: [
          {
            model: AuthorizationCriteriaMaster,
            attributes: ['AuthorizationCriteria'],
          },
        ],
      },
      { transaction },
    );

    const authorizationStatus =
      authorizationdetails && authorizationdetails.AuthorizationCriteriaMaster
        ? authorizationdetails.AuthorizationCriteriaMaster
            .AuthorizationCriteria == 'Sequeance No'
          ? 2
          : 1
        : 0;

    await UserShortLeave.update(
      {
        date,
        remarks,
        authorizationStatus,
        AttendanceTransID,
      },
      {
        where: {
          userShortLeaveId,
        },
        user: req.userDetails,
        transaction,
      },
    );

    // Delete All

    const authorizationRequest = await ShortLeaveAuthorization.findAll({
      where: {
        referenceId: userShortLeaveId,
      },
      transaction,
    });

    let AuthorizationRequestIds = authorizationRequest.map((form) => form.id);

    // Delete All User Inbox

    await UserInbox.destroy({
      where: {
        activityTable: ShortLeaveAuthorization.getTableName(),
        activityTablePK: AuthorizationRequestIds,
      },
      transaction,
    });

    // Delete All User Short Leave Authorization

    await ShortLeaveAuthorization.destroy({
      where: {
        id: {
          [Sequelize.Op.in]: AuthorizationRequestIds,
        },
      },
      hooks: false,
      transaction,
    });

    if (authorizationStatus != 0) {
      // user Details
      const userDetails = shortLeave.userMaster;

      if (!userDetails) throw new Error('User not found!');

      const notification = {
        title: 'Short Leave',
        body: userDetails.displayName + ' requested for a Short Leave.',
      };
      const data = {
        screen: 'shortLeaveAuth',
        isScheduled: 'true',
        scheduledTime: new Date().toISOString(),
      };

      // For Sequence No
      if (authorizationStatus == 2) {
        const authorizationData = await ShortLeaveAuthorization.create(
          {
            referenceId: userShortLeaveId,
            userMasterID: authorizationdetails.AuthorizedByUserMasterId[0],
            authstatus: 2,
          },
          { user: req.userDetails, transaction },
        );

        // Create UserInbox
        await UserInbox.create(
          {
            activityTable: ShortLeaveAuthorization.getTableName(),
            activityTablePK: authorizationData.toJSON().id,
            message: `${
              userDetails.displayName
            } has requested a Short Leave for ${moment(date).format(
              'DD/MM/YYYY',
            )}.`,
            assignedTo: authorizationdetails.AuthorizedByUserMasterId[0],
            assignedBy: userMasterID,
          },
          { transaction },
        );

        // send Notification
        sendNotification(authorizationData.userMasterID, notification, data);
      } else {
        // For Any
        for (
          let j = 0;
          j < authorizationdetails.AuthorizedByUserMasterId.length;
          j++
        ) {
          const authorizationData = await ShortLeaveAuthorization.create(
            {
              referenceId: userShortLeaveId,
              userMasterID: authorizationdetails.AuthorizedByUserMasterId[j],
              authstatus: 2,
            },
            { user: req.userDetails, transaction },
          );

          // Create UserInbox
          await UserInbox.create(
            {
              activityTable: ShortLeaveAuthorization.getTableName(),
              activityTablePK: authorizationData.toJSON().id,
              message: `${
                userDetails.displayName
              } has requested a Short Leave for ${moment(date).format(
                'DD/MM/YYYY',
              )}.`,
              assignedTo: authorizationdetails.AuthorizedByUserMasterId[j],
              assignedBy: userMasterID,
            },
            { transaction },
          );

          // send Notification
          sendNotification(authorizationData.userMasterID, notification, data);
        }
      }
    }

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: 'Short Leave have been successfully updated.',
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const userShortLeaveId = req.params.id;

    const shortLeave = await UserShortLeave.findByPk(userShortLeaveId, {
      transaction,
    });

    if (!shortLeave) throw new Error('Short Leave Not Found.');

    // if Short leave is Approved

    if (shortLeave.authorizationStatus == 3) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message:
          'You cannot delete a short leave that has already been approved.',
      });
    }

    // Delete All

    const authorizationRequest = await ShortLeaveAuthorization.findAll({
      where: {
        referenceId: userShortLeaveId,
      },
      transaction,
    });

    let AuthorizationRequestIds = authorizationRequest.map((form) => form.id);

    // Delete All User Inbox

    await UserInbox.destroy(
      {
        where: {
          activityTable: ShortLeaveAuthorization.getTableName(),
          activityTablePK: AuthorizationRequestIds,
        },
      },
      transaction,
    );

    // Delete All User Request

    await ShortLeaveAuthorization.destroy({
      where: {
        id: {
          [Sequelize.Op.in]: AuthorizationRequestIds,
        },
      },
      hooks: false,
      transaction,
    });

    await shortLeave.destroy({
      user: req.userDetails,
      transaction,
    });

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: 'Short Leave deleted Successfully.',
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

exports.listDataByUser = async (req, res, next) => {
  try {
    const { page, limit, userMasterID, startDate, endDate } = req.body;

    if (!userMasterID) {
      return res.status(200).json({
        status: 401,
        message: 'userMasterID is require field.',
      });
    }

    const condition = { userMasterID };

    if (startDate && endDate)
      condition.date = {
        [Sequelize.Op.between]: [startDate, endDate],
      };

    const paginate = page && limit ? { offset: (page - 1) * limit, limit } : {};
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    const { rows, count } = await UserShortLeave.findAndCountAll({
      distinct: true,
      where: condition,
      ...paginate,
      include: [
        {
          required: false,
          model: ShortLeaveAuthorization,
          attributes: ['authstatus'],
        },
        {
          model: UserMaster,
          as: 'authorizer',
          attributes: ['displayName'],
        },
        {
          model: UserMaster,
          where: { ...userAccessCondition.where },
          include: [...userAccessCondition.includeModels],
          attributes: ['displayName'],
        },
      ],
      order: [['date', 'DESC']],
    });

    for (let i = 0; i < rows.length; i++) {
      let editDelete = true;
      if ([3, 4, 5].includes(rows[i].authorizationStatus)) editDelete = false;

      if (rows[i].shortLeaveAuthorizations.find((e) => e.authstatus != 2)) {
        editDelete = false;
      }

      rows[i].dataValues.isEditDelete = editDelete;
    }

    const authCritereaData = await FormAuthorizationDetails.findOne({
      where: {
        userMasterID,
        status: 1,
        AuthorizationMasterID: authorizationMasterTypes.leave,
      },
      attributes: ['AuthorizationCriteriaID'],
      include: [
        {
          model: AuthorizationCriteriaMaster,
          attributes: ['AuthorizationCriteria'],
        },
      ],
    });

    return res.status(200).json({
      status: 200,
      data: rows,
      totalcount: count,
      authCritereaData:
        authCritereaData?.AuthorizationCriteriaMaster?.AuthorizationCriteria ||
        '',
    });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const data = await UserShortLeave.findByPk(id);

    return res.status(200).json({
      status: 200,
      data,
    });
  } catch (error) {
    next(error);
  }
};
