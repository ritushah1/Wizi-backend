const { Op, literal, Sequelize } = require('sequelize');
const cron = require('node-cron');
const moment = require('moment');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const UserMaster = require('../models/userMaster');
const NotificationCrons = require('../models/notificationCrons');
const Shift = require('../models/shift');
const ShiftTime = require('../models/shiftTime');
const {
  convert12H24HTime,
  generateCronExpression,
  modifyTime,
  sendBulkNotification,
  asiaKolkataDateTime,
} = require('../utils/commonUtilFunctions');
const EmployeeShift = require('../models/employeeShift');
const CompanyNotificationSetup = require('../models/companyNotificationSetup');
const {
  notificationCronTypes,
  authorizationMasterTypes,
} = require('../utils/dbUtils');
const companyMaster = require('../models/companyMaster');
const weekoffHolidayTran = require('../models/weekoffHolidayTran');
const UserLeaveTransaction = require('../models/userLeaveTransaction');
const UserLeave = require('../models/userleave');
const attendanceTransaction = require('../models/attendanceTransaction');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const FormAuthorizationDetails = require('../models/AuthorizationDetails');
const EmployeeEmployeement = require('../models/employeeEmployeement');
const AppraisalFeedbackReq = require('../models/appraisalFeedbacklRequest');
const Designation = require('../models/designation');
const ConfirmationAppraisalForm = require('../models/confirmationAppraisalFormParam');
const EmployeeDesignation = require('../models/employeeDesignation');
const UserTasks = require('../models/User_Tasks');
const crypto = require('crypto');

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, '../', 'cron.log'),
  {
    flags: 'a',
  },
);

const holidayAccessLogStream = fs.createWriteStream(
  path.join(__dirname, '../', 'holidayCron.log'),
  {
    flags: 'a',
  },
);

const shiftInOutNotificationCron = async (companyCronSetup, type) => {
  const companyMasterIds = companyCronSetup.map((e) => e.companyMasterId);
  // if (companyMasterIds.length > 1 && !companyMasterIds.include(3)) {
  //   throw new Error('company test failed');
  // }
  let dbVar;
  let payload;
  // Find users who have holiday or weekoff today
  let usersThatHaveHolidayWo = await weekoffHolidayTran.findAll({
    where: {
      date: moment().format('YYYY-MM-DD'),
      optionalHoliday: false,
    },
    include: [
      {
        model: UserMaster,
        where: { companyMasterId: companyMasterIds },
        attributes: [],
      },
    ],
    attributes: ['userMasterID'],
  });

  if (usersThatHaveHolidayWo.length)
    usersThatHaveHolidayWo = usersThatHaveHolidayWo.map(
      (e) => e.toJSON().userMasterID,
    );

  // Find users who are on leave today
  let usersOnLeave = await UserLeaveTransaction.findAll({
    where: { status: 1, date: moment().format('YYYY-MM-DD') },
    include: [
      {
        model: UserLeave,
        where: { companyMasterID: companyMasterIds, authorizationStatus: 3 },
        attributes: ['userMasterID'],
      },
    ],
  });

  if (usersOnLeave.length)
    usersOnLeave = usersOnLeave.map((e) => e.toJSON().userLeave.userMasterID);
  if (type === notificationCronTypes.PUNCH_IN) {
    dbVar = 'statTime';
    payload = {
      notification: {
        title: 'Punch in reminder',
        body: `Hello! It's time to start your shift. Please remember to punch in for work. Have a productive day ahead! 🌞`,
        // icon: ""
      },
    };
  }
  if (type === notificationCronTypes.PUNCH_OUT) {
    dbVar = 'endtime';
    payload = {
      notification: {
        title: 'Punch out reminder',
        body: `Hello! Your shift is ending. Don't forget to punch out to record your end time. Thank you for your hard work today! 🌟`,
        // icon: ""
      },
    };
  }

  // Find shift of employees
  let employeeShift = await EmployeeShift.findAll({
    where: {
      userMasterID: {
        [Op.notIn]: [...usersThatHaveHolidayWo, ...usersOnLeave],
      },
      startDate: { [Op.lte]: literal('CURRENT_DATE') },
      [Op.or]: [
        { endDate: { [Op.eq]: null } },
        { endDate: { [Op.gte]: literal('CURRENT_DATE') } },
      ],
    },
    attributes: ['userMasterID', 'shiftID', 'shiftsID'],
    include: [
      {
        model: UserMaster,
        as: 'employee',
        where: { status: 1, companyMasterId: companyMasterIds },
        attributes: [],
      },
    ],
  });
  if (!employeeShift.length) {
    throw new Error('No employee shift found!');
  }
  employeeShift = employeeShift.map((e) => {
    const obj = e.toJSON();
    if (!obj.shiftID && obj.shiftsID.length === 1)
      obj.shiftID = obj.shiftsID[0];
    return obj;
  });
  employeeShift = employeeShift.filter((e) => e.shiftID !== null);
  const today = new Date(); // Get the current date
  const day = today.toLocaleDateString('en-US', { weekday: 'long' }); // Get the current day name

  // Find time of each shift
  let shiftTimeDetails = await ShiftTime.findAll({
    where: { day },
    attributes: ['shiftTimeID', 'day', dbVar, 'shiftID'],
    include: [
      {
        model: Shift,
        where: { status: 1, companyMasterID: companyMasterIds },
        attributes: ['companyMasterID'],
      },
    ],
  });
  if (!shiftTimeDetails.length) {
    throw new Error('No shift time found!');
  }
  shiftTimeDetails = shiftTimeDetails.map((e) => {
    const obj = e.toJSON();
    const companyCronSetting = companyCronSetup.filter(
      (e) => +e.companyMasterId === +obj.shift.companyMasterID,
    );
    obj[dbVar] = modifyTime(
      obj[dbVar],
      companyCronSetting[0].time,
      companyCronSetting[0].timeType,
      companyCronSetting[0].timeFormat,
    );
    return obj;
  });

  const timeData = _.groupBy(shiftTimeDetails, dbVar);
  const groupedEmployeeShift = _.groupBy(employeeShift, 'shiftID');
  const notificationData = [];
  Object.keys(timeData).forEach((timeKeys) => {
    const obj = {
      time: convert12H24HTime(timeKeys),
      date: moment().format('YYYY-MM-DD'),
      type,
      users: [],
    };
    obj.cronExpression = generateCronExpression(obj.time);
    timeData[timeKeys].forEach((data) => {
      if (
        groupedEmployeeShift[data.shiftID] &&
        groupedEmployeeShift[data.shiftID].length
      ) {
        obj.users.push(
          ...groupedEmployeeShift[data.shiftID].map((e) => e.userMasterID),
        );
      }
    });
    if (obj.users.length) {
      notificationData.push(obj);
    }
  });
  await NotificationCrons.bulkCreate(notificationData);

  notificationData.forEach((e, index) => {
    cron.schedule(
      e.cronExpression,
      async (cronRunTime) => {
        accessLogStream.write(
          `${new Date().toLocaleString()} ===> Running cron for punch-in/punch-out \n`,
        );
        const notificationCronData = await NotificationCrons.findOne({
          where: {
            date: moment().format('YYYY-MM-DD'),
            time: moment(cronRunTime).format('HH:mm:00'),
            type,
          },
        });
        if (!notificationCronData) {
          accessLogStream.write(
            `${new Date().toLocaleString()} ===> No cron found to be run at:  ${cronRunTime}\n`,
          );
          return;
        }
        // Logic to send out notification to those who have punched in in last 20 hours and not punched out
        try {
          let presentUsers = [];
          if (
            notificationCronData.toJSON().type ===
            notificationCronTypes.PUNCH_OUT
          ) {
            // condition to find users who have not punched-in in last 20 hours do
            const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000);
            presentUsers = await attendanceTransaction.findAll({
              where: {
                userMasterID: notificationCronData.toJSON().users,
                InDatetime: {
                  [Op.gt]: twentyHoursAgo, // Find entries created before twentyHoursAgo
                },
              },
              raw: true,
              order: [['InDatetime', 'DESC']],
              attributes: ['userMasterID', 'OutDateTime'],
            });
            if (!presentUsers) {
              accessLogStream.write(
                `${new Date().toLocaleString()} ===> No present users found for cront at:  ${cronRunTime}\n`,
              );
              return;
            }
            presentUsers = presentUsers
              .filter((e) => e.OutDateTime == null || e.OutDateTime == '')
              .map((ele) => ele.userMasterID);
          } else if (
            notificationCronData.toJSON().type ===
            notificationCronTypes.PUNCH_IN
          ) {
            presentUsers = notificationCronData.toJSON().users;
          }
          const userData = await UserMaster.findAll({
            where: {
              userMasterID: [...presentUsers],
              firebaseToken: { [Op.ne]: null, [Op.ne]: '' },
              status: 1,
            },
            attributes: ['firebaseToken', 'deviceType'],
          });
          const iosTokens = [];
          const androidTokens = [];
          userData.forEach((user) => {
            // eslint-disable-next-line no-unused-expressions
            user.toJSON().deviceType === 'ios' && user.firebaseToken
              ? iosTokens.push(user.firebaseToken)
              : androidTokens.push(user.firebaseToken);
          });
          await sendBulkNotification(iosTokens, payload, 'ios');
          await sendBulkNotification(androidTokens, payload, 'android');
          notificationCronData.status = 'COMPLETED';
          await notificationCronData.save();
          accessLogStream.write(
            `${new Date().toLocaleString()} ===> Successfully ran cron\n`,
          );
        } catch (error) {
          accessLogStream.write(
            `${new Date().toLocaleString()} ===> Ran into an error while running ${
              notificationCronData.toJSON().type
            } cron at ${cronRunTime}\n`,
          );
          notificationCronData.status = 'ERROR';
          await notificationCronData.save();
        }
      },
      { name: `notification-${type}-${index}` },
    );
  });
  accessLogStream.write(
    `${new Date().toLocaleString()} ===> cron scheduled to run crons for ${type} notification\n`,
  );
};

const holidayNotificationCron = async (companyCronSetup, type) => {
  const traceId = `holidayNotificationCron() ---> Started -${Date.now()}`;
  holidayAccessLogStream.write(
    `[${traceId}] START → holidayNotificationCron triggered\n`,
  );

  const companyMasterIds = companyCronSetup.map((e) => e.companyMasterId);
  const daysBefore = companyCronSetup.map((item) => item.time);

  const allTheDates = daysBefore.map((days) =>
    moment().add(days, 'day').format('YYYY-MM-DD'),
  );

  holidayAccessLogStream.write(
    `[${traceId}] STEP 1 → holidayNotificationCron() ---> allTheDates: ${JSON.stringify(allTheDates)}\n`,
  );

  let employeeHolidays = await weekoffHolidayTran.findAll({
    where: {
      date: { [Op.in]: allTheDates },
      optionalHoliday: false,
    },
    include: [
      {
        model: UserMaster,
        where: {
          firebaseToken: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] },
          companyMasterId: companyMasterIds,
          status: 1,
        },
        attributes: [],
        include: [
          { model: companyMaster, attributes: [], where: { status: 1 } },
        ],
      },
    ],
  });

  holidayAccessLogStream.write(
    `[${traceId}] STEP 2 → holidayNotificationCron() ---> employeeHolidays count: ${employeeHolidays.length}\n`,
  );

  if (!employeeHolidays.length) {
    throw new Error('No employee holidays found!');
  }

  const notificationMap = {};
  const companyTimeMap = {};
  const companyDateMap = {};

  companyCronSetup.forEach((item) => {
    companyTimeMap[item.companyMasterId] = item.timeForNotification;
    companyDateMap[item.companyMasterId] = moment()
      .add(item.time, 'day')
      .format('YYYY-MM-DD');
  });

  holidayAccessLogStream.write(
    `[${traceId}] STEP 3 → holidayNotificationCron() ---> companyDateMap: ${JSON.stringify(companyDateMap)}\n`,
  );

  holidayAccessLogStream.write(
    `[${traceId}] STEP 3 → holidayNotificationCron() ---> companyTimeMap: ${JSON.stringify(companyTimeMap)}\n`,
  );

  employeeHolidays.forEach((holiday) => {
    try {
      holidayAccessLogStream.write(
        `[${traceId}] HOLIDAY → holidayNotificationCron() ---> date:${holiday.date}, company:${holiday.companyMasterID}, user:${holiday.userMasterID}\n`,
      );
      const user = holiday.userMasterID;
      const companyId = holiday.companyMasterID;
      const holidayDate = moment(holiday.date).format('YYYY-MM-DD');

      const expectedDate = companyDateMap[companyId];

      if (holidayDate !== expectedDate) {
        holidayAccessLogStream.write(
          `[${traceId}] SKIP → holidayNotificationCron() ---> Holiday:${holidayDate}, Expected:${expectedDate}, Company:${companyId}\n`,
        );
        return;
      }

      const today = moment().startOf('day');

      if (moment(holidayDate).isSameOrBefore(today)) {
        holidayAccessLogStream.write(
          `[${traceId}] SKIP PAST/TODAY → Holiday:${holidayDate}\n`,
        );
        return;
      }

      const notifyTime = companyTimeMap[companyId];

      if (!notifyTime) {
        holidayAccessLogStream.write(
          `[${traceId}] SKIP → holidayNotificationCron() ---> No notifyTime for Company:${companyId}\n`,
        );
        return;
      }
      const key = `${notifyTime}_${holidayDate}`;
      if (!notificationMap[key]) {
        notificationMap[key] = {
          date: holiday.date,
          time: notifyTime,
          users: [],
        };
      }

      notificationMap[key].users.push(user);

      holidayAccessLogStream.write(
        `[${traceId}] ADD → holidayNotificationCron() ---> Holiday:${holidayDate}, User:${user}, Time:${notifyTime}\n`,
      );
    } catch (error) {
      holidayAccessLogStream.write(
        `[${traceId}] holidayNotificationCron() ---> ERROR in loop → ${error.message}\n`,
      );
    }
  });

  holidayAccessLogStream.write(
    `[${traceId}] STEP 4 → holidayNotificationCron() ---> notificationMap: ${JSON.stringify(notificationMap)}\n`,
  );

  for (const key of Object.keys(notificationMap)) {
    const { date, users, time } = notificationMap[key];

    if (!users.length) continue;

    holidayAccessLogStream.write(
      `[${traceId}] STEP 5 → Scheduling cron → Time:${time}, Holiday:${date}, Users:${users.length}\n`,
    );

    const notificationData = {
      type,
      time,
      date: moment().format('YYYY-MM-DD'),
      users: users,
      cronExpression: generateCronExpression(time),
      metadata: {
        holidayDate: date,
      },
    };

    const createdCron = await NotificationCrons.create(notificationData);

    holidayAccessLogStream.write(
      `[${traceId}] CRON CREATED → ID:${createdCron.id}\n`,
    );

    cron.schedule(
      notificationData.cronExpression,
      async () => {
        holidayAccessLogStream.write(
          `[${traceId}] CRON START → ID:${createdCron.id}\n`,
        );

        let notificationCronData;

        try {
          // ONLY fetch THIS cron
          notificationCronData = await NotificationCrons.findOne({
            where: {
              id: createdCron.id,
              status: 'SCHEDULED',
            },
          });

          if (!notificationCronData) {
            holidayAccessLogStream.write(
              `[${traceId}] SKIP → Already processed or not found → ID:${createdCron.id}\n`,
            );
            return;
          }

          if (!notificationCronData.metadata?.holidayDate) {
            holidayAccessLogStream.write(
              `[${traceId}] SKIP → Missing holidayDate → ID:${createdCron.id}\n`,
            );
            return;
          }

          const users = notificationCronData.users;

          const userData = await UserMaster.findAll({
            where: { userMasterID: users },
            attributes: ['firebaseToken', 'deviceType'],
          });

          const iosTokens = [];
          const androidTokens = [];

          userData.forEach((user) => {
            if (user.deviceType === 'ios') {
              iosTokens.push(user.firebaseToken);
            } else {
              androidTokens.push(user.firebaseToken);
            }
          });
          const today = moment().startOf('day');
          const holidayDate = moment(
            notificationCronData.metadata.holidayDate,
          ).format('DD-MMM-YYYY');

          if (moment(holidayDate).isSameOrBefore(today)) {
            holidayAccessLogStream.write(
              `[${traceId}] SKIP PAST/TODAY → Holiday:${holidayDate}\n`,
            );
            return;
          }

          const payload = {
            notification: {
              title: 'Holiday reminder',
              body: `Hello! You have a holiday on ${holidayDate}`,
            },
          };

          holidayAccessLogStream.write(
            `[${traceId}] SENDING → ID:${createdCron.id}, Holiday:${holidayDate}, Users:${users.length}\n`,
          );

          await sendBulkNotification(iosTokens, payload, 'ios');
          await sendBulkNotification(androidTokens, payload, 'android');

          notificationCronData.status = 'COMPLETED';
          await notificationCronData.save();

          holidayAccessLogStream.write(
            `[${traceId}] SUCCESS → ID:${createdCron.id}\n`,
          );
        } catch (error) {
          holidayAccessLogStream.write(
            `[${traceId}] ERROR → ID:${createdCron.id}, ${error.message}\n`,
          );

          if (notificationCronData) {
            notificationCronData.status = 'ERROR';
            await notificationCronData.save();
          }
        }
      },
      {
        name: `notification-holiday-${createdCron.id}`, // unique name
      },
    );

    holidayAccessLogStream.write(
      `[${traceId}] CRON SCHEDULED → ID:${createdCron.id}\n`,
    );
  }
};

const taskNotificationCron = async (companyCronSetup, type) => {
  try {
    const companyMasterIds = companyCronSetup.map((e) => e.companyMasterId);

    const payload = {
      notification: {
        title: 'Task Reminder',
        body: 'You have some due tasks! Please complete them at your earliest convenience.',
      },
      data: {
        screen: 'task',
      },
    };

    const today = moment().startOf('day').toDate();

    let pendingTasksUsers = await UserMaster.findAll({
      where: {
        firebaseToken: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] },
        companyMasterId: companyMasterIds,
        status: 1,
      },
      attributes: ['userMasterID', 'companyMasterId'],
      include: [
        {
          model: UserTasks,
          where: {
            status: 1,
            taskStatus: [0, 1],
            startDate: {
              [Op.lte]: today,
            },
          },
          attributes: ['taskStatus'],
        },
      ],
    });

    if (pendingTasksUsers.length == 0) {
      return console.log('No pending tasks found!');
    }

    const companyTimeMap = {};
    const notificationMap = {};

    companyCronSetup.forEach((item) => {
      companyTimeMap[item.companyMasterId] = item.timeForNotification;
    });

    pendingTasksUsers.forEach((task) => {
      const user = task.userMasterID;
      const companyId = task.companyMasterId;

      const notifyTime = companyTimeMap[companyId];

      if (!notifyTime) return;

      if (!notificationMap[notifyTime]) {
        notificationMap[notifyTime] = [];
      }

      notificationMap[notifyTime].push(user);
    });

    for (const time of Object.keys(notificationMap)) {
      if (!notificationMap[time].length) continue;
      const notificationData = {
        type,
        time,
        date: moment().format('YYYY-MM-DD'),
        users: notificationMap[time],
        cronExpression: generateCronExpression(time),
      };

      await NotificationCrons.create(notificationData);

      cron.schedule(
        notificationData.cronExpression,
        async (cronRunTime) => {
          const notificationCronData = await NotificationCrons.findOne({
            where: {
              date: moment().format('YYYY-MM-DD'),
              time: moment(cronRunTime).format('HH:mm'),
              type: notificationCronTypes.TASK,
            },
          });
          if (!notificationCronData) {
            accessLogStream.write(
              `${new Date().toLocaleString()} ===> No task cron found to be run at:  ${cronRunTime}\n`,
            );
            return;
          }
          try {
            const userData = await UserMaster.findAll({
              where: { userMasterID: notificationCronData.toJSON().users },
              attributes: ['firebaseToken', 'deviceType'],
              status: 1,
            });
            const iosTokens = [];
            const androidTokens = [];
            userData.forEach((user) => {
              // eslint-disable-next-line no-unused-expressions
              user.toJSON().deviceType === 'ios'
                ? iosTokens.push(user.firebaseToken)
                : androidTokens.push(user.firebaseToken);
            });
            await sendBulkNotification(iosTokens, payload, 'ios');
            await sendBulkNotification(androidTokens, payload, 'android');
            notificationCronData.status = 'COMPLETED';
            await notificationCronData.save();
          } catch (error) {
            accessLogStream.write(
              `${new Date().toLocaleString()} ===> Ran into an error while running ${type} cron at ${cronRunTime}\n`,
            );
            notificationCronData.status = 'ERROR';
            await notificationCronData.save();
          }
        },
        {
          name: `notification-punch-${type}-${Date.now()}-${crypto.randomUUID()}`,
        },
      );
      accessLogStream.write(
        `${new Date().toLocaleString()} ===> cron scheduled to run crons for ${type} notification\n`,
      );
    }
  } catch (error) {
    accessLogStream.write(
      `${new Date().toLocaleString()} ===> cron scheduled to run crons for ${type} notification\n`,
    );
  }
};

const birthdayNotificationCron = async (companyCronSetup, type) => {
  try {
    const companyMasterIds = companyCronSetup.map((e) => e.companyMasterId);
    const payload = {
      notification: {
        title: 'Happy Birthday 🎂',
        body: 'Wishing you a wonderful day! Enjoy! 🎉',
      },
    };
    const today = moment().tz('Asia/Kolkata');
    const todayMonth = Number(today.format('MM'));
    const todayDay = Number(today.format('DD'));

    let birthdayUsers = await UserMaster.findAll({
      where: {
        firebaseToken: { [Op.ne]: null, [Op.ne]: '' },
        companyMasterId: companyMasterIds,
        status: 1,
      },
      attributes: ['userMasterID', 'companyMasterId'],
      include: [
        {
          model: EmployeeJoiningDetails,
          where: Sequelize.and(
            Sequelize.where(
              Sequelize.fn(
                'EXTRACT',
                Sequelize.literal(
                  `MONTH FROM NULLIF("employeeJoiningDetails"."dob", '')::DATE`,
                ),
              ),
              todayMonth,
            ),
            Sequelize.where(
              Sequelize.fn(
                'EXTRACT',
                Sequelize.literal(
                  `DAY FROM NULLIF("employeeJoiningDetails"."dob", '')::DATE`,
                ),
              ),
              todayDay,
            ),
          ),
          attributes: [],
        },
      ],
    });

    if (birthdayUsers.length == 0) {
      return console.log('No birthday found!');
    }

    const companyTimeMap = {};
    const notificationMap = {};

    companyCronSetup.forEach((item) => {
      companyTimeMap[item.companyMasterId] = item.timeForNotification;
    });

    birthdayUsers.forEach((birthday) => {
      const user = birthday.userMasterID;
      const companyId = birthday.companyMasterId;

      const notifyTime = companyTimeMap[companyId];

      if (!notifyTime) return;

      if (!notificationMap[notifyTime]) {
        notificationMap[notifyTime] = [];
      }

      notificationMap[notifyTime].push(user);
    });
    for (const time of Object.keys(notificationMap)) {
      if (!notificationMap[time].length) continue;
      const notificationData = {
        type,
        time,
        date: moment().format('YYYY-MM-DD'),
        users: notificationMap[time],
        cronExpression: generateCronExpression(time),
      };

      await NotificationCrons.create(notificationData);

      cron.schedule(
        notificationData.cronExpression,
        async (cronRunTime) => {
          const notificationCronData = await NotificationCrons.findOne({
            where: {
              date: moment().format('YYYY-MM-DD'),
              time: moment(cronRunTime).format('HH:mm'),
              type: notificationCronTypes.BIRTHDAY,
            },
          });
          if (!notificationCronData) {
            accessLogStream.write(
              `${new Date().toLocaleString()} ===> No birthday cron found to be run at:  ${cronRunTime}\n`,
            );
            return;
          }
          try {
            const userData = await UserMaster.findAll({
              where: { userMasterID: notificationCronData.toJSON().users },
              attributes: ['firebaseToken', 'deviceType'],
              status: 1,
            });
            const iosTokens = [];
            const androidTokens = [];
            userData.forEach((user) => {
              // eslint-disable-next-line no-unused-expressions
              user.toJSON().deviceType === 'ios'
                ? iosTokens.push(user.firebaseToken)
                : androidTokens.push(user.firebaseToken);
            });
            await sendBulkNotification(iosTokens, payload, 'ios');
            await sendBulkNotification(androidTokens, payload, 'android');
            notificationCronData.status = 'COMPLETED';
            await notificationCronData.save();
          } catch (error) {
            accessLogStream.write(
              `${new Date().toLocaleString()} ===> Ran into an error while running ${type} cron at ${cronRunTime}\n`,
            );
            notificationCronData.status = 'ERROR';
            await notificationCronData.save();
          }
        },
        { name: `notification-punch-${type}-0` },
      );
      accessLogStream.write(
        `${new Date().toLocaleString()} ===> cron scheduled to run crons for ${type} notification\n`,
      );
    }
  } catch (error) {
    accessLogStream.write(
      `${new Date().toLocaleString()} ===> cron scheduled to run crons for ${type} notification\n`,
    );
  }
};

const workAnniversaryNotificationCron = async (companyCronSetup, type) => {
  try {
    const companyMasterIds = companyCronSetup.map((e) => e.companyMasterId);
    const payload = {
      notification: {
        title: 'Happy Work Anniversary 🎉',
        body: 'Thank you for being an important part of our journey!',
      },
    };
    const today = moment().tz('Asia/Kolkata');
    const todayMonth = today.format('MM');
    const todayDay = today.format('DD');

    let workAnniversaryUsers = await UserMaster.findAll({
      where: {
        firebaseToken: { [Op.ne]: null, [Op.ne]: '' },
        companyMasterId: companyMasterIds,
        status: 1,
      },
      attributes: ['userMasterID', 'companyMasterId'],
      include: [
        {
          model: EmployeeJoiningDetails,
          where: Sequelize.and(
            Sequelize.where(
              Sequelize.fn(
                'EXTRACT',
                Sequelize.literal(
                  `MONTH FROM NULLIF("employeeJoiningDetails"."joiningDate", '')::DATE`,
                ),
              ),
              todayMonth,
            ),
            Sequelize.where(
              Sequelize.fn(
                'EXTRACT',
                Sequelize.literal(
                  `DAY FROM NULLIF("employeeJoiningDetails"."joiningDate", '')::DATE`,
                ),
              ),
              todayDay,
            ),
          ),
          attributes: [],
        },
      ],
    });

    if (workAnniversaryUsers.length == 0) {
      return console.log('No Work anniversary found!');
    }

    const companyTimeMap = {};
    const notificationMap = {};

    companyCronSetup.forEach((item) => {
      companyTimeMap[item.companyMasterId] = item.timeForNotification;
    });

    workAnniversaryUsers.forEach((birthday) => {
      const user = birthday.userMasterID;
      const companyId = birthday.companyMasterId;

      const notifyTime = companyTimeMap[companyId];

      if (!notifyTime) return;

      if (!notificationMap[notifyTime]) {
        notificationMap[notifyTime] = [];
      }

      notificationMap[notifyTime].push(user);
    });
    for (const time of Object.keys(notificationMap)) {
      const notificationData = {
        type,
        time,
        date: moment().format('YYYY-MM-DD'),
        users: notificationMap[time],
        cronExpression: generateCronExpression(time),
      };

      await NotificationCrons.create(notificationData);

      cron.schedule(
        notificationData.cronExpression,
        async (cronRunTime) => {
          const notificationCronData = await NotificationCrons.findOne({
            where: {
              date: moment().format('YYYY-MM-DD'),
              time: moment(cronRunTime).format('HH:mm'),
              type: notificationCronTypes.WORK_ANNIVERSARY,
            },
          });
          if (!notificationCronData) {
            accessLogStream.write(
              `${new Date().toLocaleString()} ===> No Work anniversary cron found to be run at:  ${cronRunTime}\n`,
            );
            return;
          }
          try {
            const userData = await UserMaster.findAll({
              where: { userMasterID: notificationCronData.toJSON().users },
              attributes: ['firebaseToken', 'deviceType'],
              status: 1,
            });
            const iosTokens = [];
            const androidTokens = [];
            userData.forEach((user) => {
              // eslint-disable-next-line no-unused-expressions
              user.toJSON().deviceType === 'ios'
                ? iosTokens.push(user.firebaseToken)
                : androidTokens.push(user.firebaseToken);
            });
            await sendBulkNotification(iosTokens, payload, 'ios');
            await sendBulkNotification(androidTokens, payload, 'android');
            notificationCronData.status = 'COMPLETED';
            await notificationCronData.save();
          } catch (error) {
            accessLogStream.write(
              `${new Date().toLocaleString()} ===> Ran into an error while running ${type} cron at ${cronRunTime}\n`,
            );
            notificationCronData.status = 'ERROR';
            await notificationCronData.save();
          }
        },
        { name: `notification-punch-${type}-0` },
      );
      accessLogStream.write(
        `${new Date().toLocaleString()} ===> cron scheduled to run crons for ${type} notification\n`,
      );
    }
  } catch (error) {
    accessLogStream.write(
      `${new Date().toLocaleString()} ===> cron scheduled to run crons for ${type} notification\n`,
    );
  }
};

const appraisalFeedbackNotificationCron = async (companyCronSetup, type) => {
  try {
    const companyMasterIds = companyCronSetup.map((e) => e.companyMasterId);
    const payload = {
      notification: {
        title: 'Appraisal Feedback Reminder',
        body: 'A gentle reminder to complete the pending appraisal feedback. Kindly submit it if not already done. Thank You!',
      },
    };
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const daysBefore = new Set();

    for (let day of companyCronSetup) {
      if (day.time) daysBefore.add(day.time);
      if (day.time1) daysBefore.add(day.time1);
      if (day.time2) daysBefore.add(day.time2);
    }
    const allDates = [];
    for (date of daysBefore) {
      allDates.push(moment().add(date, 'day').format('YYYY-MM-DD'));
    }

    const allRequestAndAuthorizers = await UserMaster.findAll({
      attributes: ['displayName', 'companyMasterId'],
      where: { status: 1, companyMasterId: companyMasterIds },
      include: [
        {
          model: EmployeeJoiningDetails,
          attributes: ['endDate', 'employment', 'joiningDate'],
          where: {
            employment: 'Probation',
            endDate: {
              [Sequelize.Op.in]: allDates,
            },
          },
        },
        {
          model: FormAuthorizationDetails,
          attributes: ['AuthorizedByUserMasterId', 'userMasterID'],
          where: {
            AuthorizationMasterID: authorizationMasterTypes.probationAssessment,
            status: 1,
          },
        },
        {
          model: EmployeeEmployeement,
          attributes: ['employeeEmployeementId'],
          where: { employeement: 'Probation' },
          include: [
            {
              model: AppraisalFeedbackReq,
              as: 'eA',
              attributes: ['appraisalFeedbackReqID', 'filledByID'],
              required: false,
            },
          ],
        },
        {
          model: EmployeeDesignation,
          attributes: ['designationID'],
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: true,
          include: [
            {
              model: Designation,
              as: 'designation',
              attributes: ['designationName'],
              required: true,
              include: [
                {
                  model: ConfirmationAppraisalForm,
                  as: 'caf',
                  where: {
                    formParameters: { [Sequelize.Op.ne]: null },
                    status: 1,
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    if (allRequestAndAuthorizers.length == 0) {
      throw new Error('No employee holidays found!');
    }

    const companyTimeMap = {};
    const notificationMap = {};

    companyCronSetup.forEach((c) => {
      companyTimeMap[c.companyMasterId] = c.timeForNotification;
    });

    allRequestAndAuthorizers.forEach((authorizer) => {
      const filledByUserIds =
        authorizer?.employeeEmployeements?.[0]?.eA?.map((e) => +e.filledByID) ||
        [];

      const authorizedIds =
        authorizer?.authorizationDetails?.[0]?.AuthorizedByUserMasterId || [];

      const pendingAuthorizers = authorizedIds.filter(
        (id) => !filledByUserIds.includes(id),
      );

      const notifyTime = companyTimeMap[authorizer.companyMasterId];
      if (!notifyTime) return;

      if (!notificationMap[notifyTime]) {
        notificationMap[notifyTime] = new Set();
      }

      pendingAuthorizers.forEach((id) => notificationMap[notifyTime].add(id));
    });

    for (const time of Object.keys(notificationMap)) {
      if (!notificationMap[time].size) continue;
      const notificationData = {
        type,
        time,
        date: moment().format('YYYY-MM-DD'),
        users: [...notificationMap[time]],
        cronExpression: generateCronExpression(time),
      };

      await NotificationCrons.create(notificationData);

      cron.schedule(
        notificationData.cronExpression,
        async (cronRunTime) => {
          const notificationCronData = await NotificationCrons.findOne({
            where: {
              date: moment().format('YYYY-MM-DD'),
              time: moment(cronRunTime).format('HH:mm'),
              type: notificationCronTypes.PROBATION_ASSESSMENT,
            },
          });
          if (!notificationCronData) {
            accessLogStream.write(
              `${new Date().toLocaleString()} ===> No birthday cron found to be run at:  ${cronRunTime}\n`,
            );
            return;
          }
          try {
            const userData = await UserMaster.findAll({
              where: { userMasterID: notificationCronData.toJSON().users },
              attributes: ['firebaseToken', 'deviceType'],
              status: 1,
            });
            const iosTokens = [];
            const androidTokens = [];
            userData.forEach((user) => {
              // eslint-disable-next-line no-unused-expressions
              user.toJSON().deviceType === 'ios'
                ? iosTokens.push(user.firebaseToken)
                : androidTokens.push(user.firebaseToken);
            });
            await sendBulkNotification(iosTokens, payload, 'ios');
            await sendBulkNotification(androidTokens, payload, 'android');
            notificationCronData.status = 'COMPLETED';
            await notificationCronData.save();
          } catch (error) {
            accessLogStream.write(
              `${new Date().toLocaleString()} ===> Ran into an error while running ${type} cron at ${cronRunTime}\n`,
            );
            notificationCronData.status = 'ERROR';
            await notificationCronData.save();
          }
        },
        { name: `notification-punch-${type}-0` },
      );
      accessLogStream.write(
        `${new Date().toLocaleString()} ===> cron scheduled to run crons for ${type} notification\n`,
      );
    }
  } catch (error) {
    accessLogStream.write(
      `${new Date().toLocaleString()} ===> cron scheduled to run crons for ${type} notification\n`,
    );
  }
};
const clearNotificationCrons = () => {
  const tasks = cron.getTasks();

  tasks.forEach((task, key) => {
    if (key && key.startsWith('notification-')) {
      accessLogStream.write(
        `${new Date().toLocaleString()} ===> Found already scheduled job and stopping it: ${key}\n`,
      );

      task.stop(); // Stop execution
      tasks.delete(key); // 🔥 Remove from memory``

      accessLogStream.write(
        `${new Date().toLocaleString()} ===> Successfully removed cron: ${key}\n`,
      );
    }
  });
};
exports.scheduleNotifications = async () => {
  try {
    await NotificationCrons.destroy({ where: {} });
    clearNotificationCrons();
    let companyNotifications = await CompanyNotificationSetup.findAll({
      where: {
        [Op.or]: [
          { notificationType: notificationCronTypes.PUNCH_IN },
          { notificationType: notificationCronTypes.PUNCH_OUT },
          { notificationType: notificationCronTypes.HOLIDAY },
          { notificationType: notificationCronTypes.BIRTHDAY },
          { notificationType: notificationCronTypes.WORK_ANNIVERSARY },
          { notificationType: notificationCronTypes.PROBATION_ASSESSMENT },
          { notificationType: notificationCronTypes.TASK },
        ],
      },
      include: [{ model: companyMaster, where: { status: 1 } }],
    });
    if (!companyNotifications.length) {
      throw new Error('No notification setup found!');
    }
    companyNotifications = companyNotifications.map((e) => e.toJSON());
    const dataByNotificationType = _.groupBy(
      companyNotifications,
      'notificationType',
    );
    // eslint-disable-next-line no-restricted-syntax
    for (const key of Object.keys(dataByNotificationType)) {
      switch (key) {
        case notificationCronTypes.PUNCH_IN:
          // eslint-disable-next-line no-await-in-loop
          await shiftInOutNotificationCron(
            dataByNotificationType[notificationCronTypes.PUNCH_IN],
            notificationCronTypes.PUNCH_IN,
          );
          break;

        case notificationCronTypes.PUNCH_OUT:
          // eslint-disable-next-line no-await-in-loop
          await shiftInOutNotificationCron(
            dataByNotificationType[notificationCronTypes.PUNCH_OUT],
            notificationCronTypes.PUNCH_OUT,
          );
          break;

        case notificationCronTypes.HOLIDAY:
          // eslint-disable-next-line no-await-in-loop
          await holidayNotificationCron(
            dataByNotificationType[notificationCronTypes.HOLIDAY],
            notificationCronTypes.HOLIDAY,
          );
          break;

        case notificationCronTypes.BIRTHDAY:
          // eslint-disable-next-line no-await-in-loop
          await birthdayNotificationCron(
            dataByNotificationType[notificationCronTypes.BIRTHDAY],
            notificationCronTypes.BIRTHDAY,
          );
          break;

        case notificationCronTypes.WORK_ANNIVERSARY:
          // eslint-disable-next-line no-await-in-loop
          await workAnniversaryNotificationCron(
            dataByNotificationType[notificationCronTypes.WORK_ANNIVERSARY],
            notificationCronTypes.WORK_ANNIVERSARY,
          );
          break;
        case notificationCronTypes.PROBATION_ASSESSMENT:
          // eslint-disable-next-line no-await-in-loop
          await appraisalFeedbackNotificationCron(
            dataByNotificationType[notificationCronTypes.PROBATION_ASSESSMENT],
            notificationCronTypes.PROBATION_ASSESSMENT,
          );
          break;
        case notificationCronTypes.TASK:
          // eslint-disable-next-line no-await-in-loop
          await taskNotificationCron(
            dataByNotificationType[notificationCronTypes.TASK],
            notificationCronTypes.TASK,
          );
          break;

        default:
          break;
      }
    }
  } catch (error) {
    accessLogStream.write(
      `${new Date().toLocaleString()} ===> 'Something went wrong while running cron of setting up notifications!',\n,${error}\n`,
    );
  }
};

exports.setupPunchInPunchoutCron = async (req, res, next) => {
  await this.scheduleNotifications();
};
