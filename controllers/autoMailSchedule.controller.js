const { Op } = require('sequelize');
const Sequelize = require('sequelize');
const cron = require('node-cron');
const moment = require('moment');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const UserMaster = require('../models/userMaster');
const MailCrons = require('../models/mailCrons');
const Shift = require('../models/shift');
const ShiftTime = require('../models/shiftTime');
const {
  generateCronExpression,
  employeeDesignation,
  employeeDepartment,
  employeeBranch,
  getLeave,
  toHoursAndMinutes,
  getDatesFromDateRange,
  getFinancialYearDatesFromDate,
  month_dict,
  asiaKolkataDateTime,
  daysInMonth,
  employeeShift,
  getUserSalaryMasterByMonth,
  findCompanyNotificationPolicy,
  getAllTrakingKMsData,
  minutesToHoursMinutes,
  parseEmployeeInfoAlias,
  getPurposeOfVisitNames,
} = require('../utils/commonUtilFunctions');
const AutoMailSetup = require('../models/autoMailSetup');
const { mailCronTypes, authorizationMasterTypes } = require('../utils/dbUtils');
const companyMaster = require('../models/companyMaster');
const weekoffHolidayTran = require('../models/weekoffHolidayTran');
const nodemailer = require('nodemailer');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const attendanceTransaction = require('../models/attendanceTransaction');
const BranchMaster = require('../models/branchMaster');
const Department = require('../models/department');
const Designation = require('../models/designation');
const Excel = require('exceljs');
const UserLeave = require('../models/userleave');
const AuthorizationDetails = require('../models/AuthorizationDetails');
const AuthorizationCriteriaMaster = require('../models/authorizationCriteriaMaster');
const Visit = require('../models/visit');
const Customer = require('../models/customer');
const {
  generateExcelForVisitReportMail,
  generateExcelDepartmentWisepunchinoutcountreportMail,
  generateExcelLateComeEarlyGoMail,
  generateExcelForFYLeaveReportMail,
  generateExcelForDailyCostReportMail,
  generateExcel,
  generateDailyPhysicalPresentAbsentReportExcel,
} = require('../utils/exportData');
const { userAttributes, mailCronNameObj } = require('../utils/commonVars');
const AttendanceLogs = require('../models/attendancelogs');
const UserRole = require('../models/userRole');
const RoleMaster = require('../models/roleMaster');
const RoleMasterBranchWise = require('../models/roleMasterBranchWise');
const EmployeeBranch = require('../models/employeeBranch');
const HrLeaveTypes = require('../models/hrLeaveTypes');
const HrLeaveMaster = require('../models/hrLeaveMaster');
const EmployeeDepartment = require('../models/employeeDepartment');
const UserLeaveTransaction = require('../models/userLeaveTransaction');
const EmployeeAttendancePolicy = require('../models/employeeAttendancePolicy');
const AttendancePolicy = require('../models/attendancePolicy');
const overTimeCalculation = require('../models/overTimeCalculation');
const EmployeeShift = require('../models/employeeShift');
const LeaveAuthorizationRequest = require('../models/leaveAuthorization');
const mailTemplateEditor = require('../models/mailTemplateEditor');
const EmployeeDesignation = require('../models/employeeDesignation');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const EmployeeDivision = require('../models/employeeDivision');
const WorkingArea = require('../models/workingArea');
const Division = require('../models/division');
const {
  listS3Objects,
  getS3File,
  uploadBase64ToS3,
} = require('../utils/s3.utils');
const {
  bucketName,
  isStoreFileToS3Bucket,
  mainApiUrl,
  appURL,
} = require('../utils/labelUtils');
const { encryptText } = require('../utils/encryptDecrypt');
const JSZip = require('jszip');
const PurposeOfVisit = require('../models/purposeOfVisit');
const VisitPurpose = require('../models/visitPurpose');

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, '../', 'mailcron.log'),
  {
    flags: 'a',
  },
);

const formatFirstRow = (workSheet, row) => {
  const firstRow = workSheet.getRow(row);
  firstRow.height = 20;
  firstRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',

      pattern: 'solid',

      fgColor: { argb: '729fcf' },
    };
    cell.font = { bold: true, name: 'calibri' };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
};

const flattenObj = (obj, parent = null, res = {}) => {
  Object.entries(obj).forEach(([key, value]) => {
    let propName;

    // In related models' data, data is stored at key which includes Id at the end. To remove that Id following code works

    if (parent) {
      propName = parent.includes('Id')
        ? `${parent.replace('Id', '')}_${key}`
        : `${parent}_${key}`;
    } else {
      propName = key;
    }

    // const propName = parent ? parent + '_' + key : key; & obj[key]!==null because typeof null = object

    if (value !== null && typeof value === 'object') {
      // if value is array. also allows empty array to be added as a key
      if (value.length !== undefined && value.length >= 0) {
        res[propName] = value;
      } else flattenObj(value, propName, res);
    } else res[propName] = value;
  });
  return res;
};

function findIndexParentWithMostKeys(arr) {
  return arr.reduce(
    (maxIndex, obj, index) =>
      countKeys(obj) > countKeys(arr[maxIndex]) ? index : maxIndex,
    0,
  );
}

function countKeys(obj) {
  return Object.keys(obj).reduce((count, key) => {
    if (Array.isArray(obj[key]))
      return count + obj[key].reduce((c, o) => c + countKeys(o), 0);
    if (typeof obj[key] === 'object' && obj[key] !== null)
      return count + countKeys(obj[key]);
    return count + 1;
  }, 0);
}

async function generateLeaveReport(
  companyMasterID,
  userMasterID,
  fromDate,
  toDate,
  FileName,
) {
  try {
    const role = await UserRole.findOne({
      where: {
        userMasterID,
      },
      include: [
        {
          model: RoleMaster,
          attributes: ['roleMasterID', 'roleType', 'companyMasterID'],
          include: [
            { model: RoleMasterBranchWise, attributes: ['branchMasterID'] },
          ],
        },
      ],
    });

    let branchids = [];

    if (
      role &&
      role.roleMaster.roleType == 'branchWise' &&
      role.roleMaster.roleMasterBranchWises &&
      role.roleMaster.roleMasterBranchWises.length > 0
    ) {
      branchids = [
        ...role.roleMaster.roleMasterBranchWises.map((e) => e.branchMasterID),
      ];
    }

    const leavedata = await UserLeave.findAll({
      raw: true,
      where: {
        [Sequelize.Op.or]: [
          { FromDate: { [Sequelize.Op.between]: [fromDate, toDate] } },
          { ToDate: { [Sequelize.Op.between]: [fromDate, toDate] } },
        ],
        status: 1,
      },
      order: [['FromDate', 'ASC']],
      include: [
        {
          required: true,
          model: UserMaster,
          attributes: ['displayName'],
          where: { companyMasterId: companyMasterID, status: 1 },
          include: [
            {
              model: EmployeeBranch,
              where: {
                status: 1,
                applicableDate: {
                  [Sequelize.Op.lte]: new Date(toDate),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: {
                      [Sequelize.Op.gte]: new Date(toDate),
                    },
                  },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
                ...(branchids.length > 0 && { branchID: branchids }),
              },
              required: branchids.length > 0,
            },
            {
              required: false,
              model: EmployeeJoiningDetails,
            },
          ],
        },
      ],
    });

    const All_leaveRequest = await LeaveAuthorizationRequest.findAll({
      where: {
        ReferenceID: leavedata.map((e) => e.UserLeaveApplicationID),
      },
      include: [
        {
          require: true,
          model: UserMaster,
          as: 'authorizedPerson',
          attributes: ['displayName'],
        },
      ],
    });

    const All_criteria = await AuthorizationDetails.findAll({
      raw: true,
      where: {
        userMasterID: leavedata.map((e) => e.userMasterID),
        AuthorizationMasterID: authorizationMasterTypes.leave,
        status: 1,
      },
      include: [
        {
          model: AuthorizationCriteriaMaster,
          attributes: ['AuthorizationCriteria'],
        },
      ],
      attributes: ['userMasterID'],
    });

    const leavedatalength = leavedata.length;

    for (let i = 0; i < leavedatalength; i++) {
      const leaverequest = All_leaveRequest.filter(
        (e) => e.ReferenceID == leavedata[i].UserLeaveApplicationID,
      );

      const auth = leaverequest.map((e) => {
        return {
          displayName: e.authorizedPerson.displayName,
          authstatus:
            e.authstatus == 1
              ? 'Accepted'
              : e.authstatus == 0
                ? 'Rejected'
                : 'Pending',
        };
      });

      leavedata[i].auth = auth ? auth : [];

      const criteria = All_criteria.find(
        (e) => e.userMasterID == leavedata[i].userMasterID,
      );

      leavedata[i].criteria = criteria
        ? criteria['AuthorizationCriteriaMaster.AuthorizationCriteria']
        : '';
    }

    const finalData = [];

    for (let i = 0; i < leavedata.length; i++) {
      let authdata;
      const field2 = leavedata[i].auth;
      if (field2 && field2.length) {
        authdata = field2
          .map((el) => `(${el.displayName}- ${el.authstatus})`)
          .join(',');
      }
      const data2 = {};
      data2['Employee Name'] = leavedata[i]['userMaster.displayName'];
      data2['From Date'] = new Date(leavedata[i].FromDate)
        .toISOString()
        .slice(0, 10);
      data2['To Date'] = new Date(leavedata[i].ToDate)
        .toISOString()
        .slice(0, 10);
      data2['Auth Criteria'] = leavedata[i].criteria;
      data2['Authorization'] = authdata;
      data2['Leave Status'] =
        leavedata[i].authorizationStatus == 4
          ? 'Rejected'
          : leavedata[i].authorizationStatus == 3
            ? 'Accepted'
            : 'Pending';
      data2['Reason'] = leavedata[i].Remark;
      finalData.push(data2);
    }

    // let FileName = FileName;
    let fileType = 'xlsx';

    if (finalData.length > 0) {
      const workBook = new Excel.Workbook();
      const workSheet = workBook.addWorksheet('sheet');
      const headerNames = Object.keys(finalData[0]);
      const transformedObject = [];

      for (let i = 0; i < finalData.length; i++) {
        let isNotArray = true;
        headerNames.forEach((key) => {
          if (Array.isArray(finalData[i][key]) === true) {
            finalData[i][key].forEach((obj) => {
              isNotArray = false;
              // Deep copy so that values in finalData[i] does not get changed
              const transformedElement = JSON.parse(
                JSON.stringify(finalData[i]),
              );
              transformedElement[key] = obj;
              transformedObject.push({ ...transformedElement });
            });
          }
        });
        if (isNotArray)
          transformedObject.push(JSON.parse(JSON.stringify(finalData[i])));
      }
      if (transformedObject.length === 0) transformedObject.push(...finalData);

      const keyData = flattenObj(
        transformedObject[findIndexParentWithMostKeys(transformedObject)],
      );

      const columns = Object.keys(keyData).map((key) => ({
        header: key,
        key,
        width: 15,
      }));

      workSheet.columns = columns;

      transformedObject.forEach((element) => {
        workSheet.addRow(flattenObj(element));
      });
      formatFirstRow(workSheet, 1);

      const filePath = path.join(
        __dirname,
        '../uploads',
        `${FileName}${userMasterID}_${Date.now()}.${fileType}`,
      );
      workBook.xlsx
        .writeFile(filePath)
        .then(function () {})
        .catch(function (error) {
          addLogToMailCronFile(
            `${new Date().toLocaleString()} ===> Error Saving Workbook \n ${error}`,
          );
        });

      return filePath;
    }
  } catch (err) {
    addLogToMailCronFile(
      `${new Date().toLocaleString()} ===> Ran into an error while generating Leave Excel \n ${err}`,
    );
  }
}

async function generateVisitReport(
  companyMasterID,
  userMasterID,
  fromDate,
  toDate,
) {
  try {
    const role = await UserRole.findOne({
      where: {
        userMasterID,
      },
      include: [
        {
          model: RoleMaster,
          attributes: ['roleMasterID', 'roleType', 'companyMasterID'],
          include: [
            { model: RoleMasterBranchWise, attributes: ['branchMasterID'] },
          ],
        },
      ],
    });

    let branchids = [];

    if (
      role &&
      role.roleMaster.roleType == 'branchWise' &&
      role.roleMaster.roleMasterBranchWises &&
      role.roleMaster.roleMasterBranchWises.length > 0
    ) {
      branchids = [
        ...role.roleMaster.roleMasterBranchWises.map((e) => e.branchMasterID),
      ];
    }

    const visitData = await Visit.findAll({
      raw: true,
      where: {
        companyMasterID,
        visitDate: {
          [Op.between]: [fromDate, toDate],
        },
      },
      order: [
        [{ model: UserMaster, as: 'assign' }, 'displayName', 'asc'],
        ['visitDate', 'asc'],
      ],
      include: [
        { model: Customer },
        {
          required: true,
          model: UserMaster,
          as: 'assign',
          attributes: userAttributes,

          include: [
            {
              model: EmployeeBranch,
              where: {
                status: 1,
                applicableDate: {
                  [Sequelize.Op.lte]: new Date(toDate),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: {
                      [Sequelize.Op.gte]: new Date(toDate),
                    },
                  },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
                ...(branchids.length > 0 && { branchID: branchids }),
              },
              required: branchids.length > 0,
            },
            {
              required: false,
              model: EmployeeJoiningDetails,
            },
          ],
        },
        {
          model: PurposeOfVisit,
          as: 'pov',
          include: [{ model: VisitPurpose, attributes: ['visitPurpose'] }],
        },
      ],
    });

    const visitUsersId = visitData.map((e) => {
      let data = {
        visitDate: e.visitDate,
        assignID: e.assignID,
      };
      return data;
    });

    const visitCounts = {};
    visitUsersId.forEach((entry) => {
      const key = `${entry.visitDate}-${entry.assignID}`;
      if (!visitCounts[key]) {
        visitCounts[key] = 0;
      }
      visitCounts[key]++;
    });

    const visitReportExportData = [];
    const userIds = [...new Set(visitData.map((e) => e['assign.userMaterID']))];

    const AllUser_totalKms = await getAllTrakingKMsData(
      userIds,
      fromDate,
      toDate,
    );

    for (let i = 0; i < visitData.length; i++) {
      const totalKms = AllUser_totalKms.find(
        (e) =>
          e.userMasterID == visitData[i].assignID &&
          new Date(date).getTime() ==
            new Date(visitData[i].visitDate).getTime(),
      );

      const InDatetime = await getLog(
        visitData[i].assignID,
        new Date(visitData[i].visitDate),
        'first',
        'in',
      );
      const OutDatetime = await getLog(
        visitData[i].assignID,
        new Date(visitData[i].visitDate),
        'Last',
        'out',
      );

      visitReportExportData.push({
        'Sr. No': i + 1,
        CustomerName: visitData[i]['customer.customerName'],
        'Employee Name': visitData[i]['assign.displayName'],
        VisitDate: visitData[i].visitDate || '',
        VisitTime: visitData[i].visitTime,
        VisitPurpose: getPurposeOfVisitNames(visitData[i]) || '',
        'CheckIn DateTime': visitData[i].checkInDateTime
          ? formatDate2(visitData[i].checkInDateTime)
          : '',
        'CheckIn Location': visitData[i].checkInLocation || '',
        'CheckOut DateTime': visitData[i].checkOutDateTime
          ? formatDate2(visitData[i].checkOutDateTime)
          : '',
        'CheckOut Location': visitData[i].checkOutLocation || '',
        'Description Of Visit': '',
        TotalVisit:
          visitCounts[
            `${new Date(visitData[i].visitDate).toISOString().slice(0, 10)}-${
              visitData[i].assignID
            }`
          ],
        'Punch in (Location and Time)': InDatetime
          ? moment(InDatetime.logDateTime).format('hh:mm A') +
            ' , ' +
            InDatetime.address
          : ' ',
        'Punch Out (Location and Time)': OutDatetime
          ? moment(OutDatetime.logDateTime).format('hh:mm A') +
            ' , ' +
            OutDatetime.address
          : ' ',
        'Total KM for the day': totalKms ? totalKms.kilometer.toFixed(2) : 0,
        'Conclusion of visit': '',
      });
    }

    const filePath = await generateExcelForVisitReportMail(
      visitReportExportData,
      userMasterID,
      'Visit-Report',
      'xlsx',
    );
    return filePath;
  } catch (err) {
    addLogToMailCronFile(
      `${new Date().toLocaleString()} ===> Ran into an error while generating Visit Excel \n ${err}`,
    );
  }
}

//To get the first or last log the day
async function getLog(userMasterID, date, type, direction = null) {
  const attendanceData = await attendanceTransaction.findOne({
    raw: true,
    where: { userMasterID: userMasterID, AttendanceDate: date },
    attributes: ['AttendanceTransID'],
  });

  if (!attendanceData) return null;

  const condition = {};
  condition.userMasterID = userMasterID;
  condition.AttendanceTransID = attendanceData.AttendanceTransID;

  if (direction) condition.direction = direction;
  if (type == 'Last') {
    return await AttendanceLogs.findOne({
      raw: true,
      where: condition,
      order: [['logDateTime', 'DESC']],
      attributes: [
        'attendanceLogID',
        'userMasterID',
        'logDateTime',
        'direction',
        'address',
      ],
    });
  } else {
    return await AttendanceLogs.findOne({
      raw: true,
      where: condition,
      order: [['logDateTime', 'ASC']],
      attributes: [
        'attendanceLogID',
        'userMasterID',
        'logDateTime',
        'direction',
        'address',
      ],
    });
  }
}

function padTo2Digits(num) {
  return num.toString().padStart(2, '0');
}

function formatDate1(date) {
  return [
    padTo2Digits(date.getDate()),
    padTo2Digits(date.getMonth() + 1),
    date.getFullYear(),
  ].join('-');
}

function formatDate2(date) {
  var date1 = formatDate1(date);
  var date2 = new Date(date).toISOString().replace('T', ' ').slice(0, -5);
  var date3 = new Date(date2).toLocaleTimeString();
  var date4 = `${date1 + ' , ' + date3}`;
  return date4;
}

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}
async function generateAttendanceReport(
  companyMasterID,
  userMasterID,
  fromDate,
  toDate,
  FileName,
) {
  try {
    const role = await UserRole.findOne({
      where: {
        userMasterID,
      },
      include: [
        {
          model: RoleMaster,
          attributes: ['roleMasterID', 'roleType', 'companyMasterID'],
          include: [
            { model: RoleMasterBranchWise, attributes: ['branchMasterID'] },
          ],
        },
      ],
    });

    let branchids = [];

    if (
      role &&
      role.roleMaster.roleType == 'branchWise' &&
      role.roleMaster.roleMasterBranchWises &&
      role.roleMaster.roleMasterBranchWises.length > 0
    ) {
      branchids = [
        ...role.roleMaster.roleMasterBranchWises.map((e) => e.branchMasterID),
      ];
    }

    const users = await UserMaster.findAll({
      where: {
        companyMasterId: companyMasterID,
        status: 1,
      },
      order: [['displayName', 'ASC']],
      attributes: ['userMasterID', 'displayName', 'userNumber'],
      include: [
        {
          model: EmployeeBranch,
          where: {
            status: 1,
            applicableDate: {
              [Sequelize.Op.lte]: new Date(toDate),
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: new Date(toDate),
                },
              },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
            ...(branchids.length > 0 && { branchID: branchids }),
          },
          required: branchids.length > 0,
        },
        {
          required: false,
          model: EmployeeJoiningDetails,
        },
      ],
    });

    const AllUserIDs = users.map((item) => +item.userMasterID);

    let start_date = fromDate;
    let end_date = toDate;

    const allUserAttendance = [];
    const allUserWeekOffHoliday = [];
    if (AllUserIDs.length) {
      const attdata = await attendanceTransaction.findAll({
        raw: true,
        where: {
          AttendanceDate: {
            [Op.between]: [new Date(start_date), new Date(end_date)],
          },
          userMasterID: {
            [Sequelize.Op.in]: AllUserIDs,
          },
        },
        order: [['AttendanceDate', 'ASC']],
        include: [
          { model: BranchMaster, attributes: ['branchName'] },
          { model: Department, attributes: ['departmentName'] },
          { model: Designation, attributes: ['designationName'] },
          { model: Shift, attributes: ['shiftName'] },
        ],
      });
      allUserAttendance.push(...attdata);
      const weekOffHolidayData = await weekoffHolidayTran.findAll({
        raw: true,
        where: {
          date: {
            [Op.between]: [new Date(start_date), new Date(end_date)],
          },
          userMasterID: AllUserIDs,
          [Op.and]: Sequelize.literal(`(date, "tableName") IN (
              SELECT date, MAX("tableName") AS max_tableName
              FROM "weekoffHolidayTrans"
              WHERE "userMasterID" in (${AllUserIDs.join(',')})
                AND date BETWEEN '${start_date}' AND '${end_date}' AND ("optionalHoliday" IS FALSE OR  "optionalHoliday" IS null)
              GROUP BY date
            )`),
        },
        order: [
          ['date', 'ASC'],
          ['tableName', 'DESC'],
        ],
      });
      allUserWeekOffHoliday.push(...weekOffHolidayData);
    }

    const finalfinal = [];

    const final = await Promise.all(
      users.map(async (user) => {
        // const empJoining = await getemployeeJoiningDetails(user.userMasterID);

        const empJoining =
          user.employeeJoiningDetails && user.employeeJoiningDetails.length > 0
            ? user.employeeJoiningDetails[0]
            : null;

        // const empJoining = user. allEmpJoining.find((emp) => {
        //   return emp.userMasterID == user.userMasterID;
        // });

        start_date = fromDate;
        end_date = toDate;

        if (empJoining) {
          if (new Date(empJoining.joiningDate) > new Date(fromDate)) {
            start_date = empJoining.joiningDate;
          }

          // end date
          if (empJoining.leavingDate) {
            if (new Date(empJoining.leavingDate) < new Date(toDate)) {
              end_date = empJoining.leavingDate;
            }
          }
        }

        const datesArray = await getDatesFromDateRange(
          new Date(fromDate),
          new Date(toDate),
        );

        let userData = {
          employeecode: empJoining ? empJoining.employeeCode : '',
          userMasterID: user.userMasterID,
          userName: user.displayName,
          userNumber: user.userNumber,
          branch: '',
          department: '',
          designation: '',
          totalabsentday: 0,
          totalhalfday: 0,
          totalpresentday: 0,
          totalmisspunch: 0,
          totalweekoffholiday: 0,
          totalapprovedleave: 0,
          totalpendingleave: 0,
          attendancedata: [],
        };

        const allAttendance = allUserAttendance.filter((attendance) => {
          return (
            attendance.userMasterID == user.userMasterID &&
            new Date(attendance.AttendanceDate) >= new Date(start_date) &&
            new Date(attendance.AttendanceDate) <= new Date(end_date)
          );
        });

        const allWeekOffHoliday = allUserWeekOffHoliday.filter(
          (weekoffholiday) => {
            return (
              weekoffholiday.userMasterID == user.userMasterID &&
              new Date(weekoffholiday.date) >= new Date(start_date) &&
              new Date(weekoffholiday.date) <= new Date(end_date)
            );
          },
        );

        let logdata = [];

        for (const date of datesArray) {
          let currentDateData = {
            attendancedate: date.toISOString().slice(0, 10),
            attendancetype: 'A',
            intime: '-',
            outtime: '-',
            minutes: '-',
            branch: '-',
            department: '-',
            designation: '-',
            shift: '-',
            shiftHours: '-',
            shiftInTime: '-',
            shiftOutTime: '-',
            Lateby: '-',
            EarlyBy: '-',
            Penalty: '-',
            goEarlyPanalty: '-',
            goEarlyPanaltyDeduction: '-',
            latePenaltyMinutes: '-',
            earlyPenaltyMinutes: '-',
            PenaltyDeduction: '-',
            GoEarlyUsed: '-',
            employeecode: userData.employeecode,
            userName: userData.userName,
            userNumber: userData.userNumber,
            finalminutes: 0,
            logData: [],
          };

          if (
            new Date(start_date) <= new Date(date) &&
            new Date(end_date) >= new Date(date)
          ) {
            let flag = 0;
            if (
              allAttendance.length != 0 &&
              allAttendance[0].AttendanceDate ==
                new Date(date).toISOString().slice(0, 10)
            ) {
              // to get log

              if (+allAttendance[0].fulldayhalfday == 1) {
                userData.totalpresentday++;
                currentDateData.attendancetype = 'P';
                if (
                  allAttendance[0].latePenaltyMinutes ||
                  allAttendance[0].PanaltyDeduction
                )
                  currentDateData.attendancetype += '+LC';
                if (
                  allAttendance[0].earlyPenaltyMinutes ||
                  allAttendance[0].goEarlyPanaltyDeduction
                )
                  currentDateData.attendancetype += '+EG';
                currentDateData.minutes = toHoursAndMinutes(
                  +allAttendance[0].InHrs + +allAttendance[0].OutHrs,
                );
                (currentDateData.intime = allAttendance[0].InDatetime),
                  (currentDateData.outtime = allAttendance[0].OutDateTime),
                  (currentDateData.branch = allAttendance[0][
                    'branchMaster.branchName'
                  ]
                    ? allAttendance[0]['branchMaster.branchName']
                    : '-'),
                  (currentDateData.department = allAttendance[0][
                    'department.departmentName'
                  ]
                    ? allAttendance[0]['department.departmentName']
                    : '-'),
                  (currentDateData.designation = allAttendance[0][
                    'designation.designationName'
                  ]
                    ? allAttendance[0]['designation.designationName']
                    : '-'),
                  (currentDateData.shift = allAttendance[0]['shift.shiftName']
                    ? allAttendance[0]['shift.shiftName']
                    : '-'),
                  (currentDateData.shiftHours = allAttendance[0].Shifthrs
                    ? allAttendance[0].Shifthrs
                    : '-'),
                  (currentDateData.shiftInTime = allAttendance[0].ShiftIntime
                    ? allAttendance[0].ShiftIntime
                    : '-'),
                  (currentDateData.shiftOutTime = allAttendance[0].ShiftoutTime
                    ? allAttendance[0].ShiftoutTime
                    : '-'),
                  (currentDateData.Lateby = allAttendance[0].LateBy
                    ? allAttendance[0].LateBy
                    : '-'),
                  (currentDateData.EarlyBy = allAttendance[0].EarlyBy
                    ? allAttendance[0].EarlyBy
                    : '-'),
                  (currentDateData.Penalty = allAttendance[0].Panalty
                    ? allAttendance[0].Panalty
                    : '-'),
                  (currentDateData.goEarlyPanalty = allAttendance[0]
                    .goEarlyPanalty
                    ? allAttendance[0].goEarlyPanalty
                    : '-'),
                  (currentDateData.goEarlyPanaltyDeduction = allAttendance[0]
                    .goEarlyPanaltyDeduction
                    ? allAttendance[0].goEarlyPanaltyDeduction
                    : '-'),
                  (currentDateData.latePenaltyMinutes = allAttendance[0]
                    .latePenaltyMinutes
                    ? allAttendance[0].latePenaltyMinutes
                    : '-'),
                  (currentDateData.earlyPenaltyMinutes = allAttendance[0]
                    .earlyPenaltyMinutes
                    ? allAttendance[0].earlyPenaltyMinutes
                    : '-'),
                  (currentDateData.PenaltyDeduction = allAttendance[0]
                    .PanaltyDeduction
                    ? allAttendance[0].PanaltyDeduction
                    : '-'),
                  (currentDateData.employeecode = userData.employeecode),
                  (currentDateData.userName = userData.userName),
                  (currentDateData.userNumber = userData.userNumber),
                  (currentDateData.finalminutes =
                    +allAttendance[0].InHrs + +allAttendance[0].OutHrs);
              } else if (+allAttendance[0].fulldayhalfday == 0.5) {
                userData.totalhalfday++;
                currentDateData.attendancetype = 'HD';
                currentDateData.minutes = toHoursAndMinutes(
                  +allAttendance[0].InHrs + +allAttendance[0].OutHrs,
                );
                (currentDateData.intime = allAttendance[0].InDatetime),
                  (currentDateData.outtime = allAttendance[0].OutDateTime),
                  (currentDateData.branch = allAttendance[0][
                    'branchMaster.branchName'
                  ]
                    ? allAttendance[0]['branchMaster.branchName']
                    : '-'),
                  (currentDateData.department = allAttendance[0][
                    'department.departmentName'
                  ]
                    ? allAttendance[0]['department.departmentName']
                    : '-'),
                  (currentDateData.designation = allAttendance[0][
                    'designation.designationName'
                  ]
                    ? allAttendance[0]['designation.designationName']
                    : '-'),
                  (currentDateData.shift = allAttendance[0]['shift.shiftName']
                    ? allAttendance[0]['shift.shiftName']
                    : '-'),
                  (currentDateData.shiftHours = allAttendance[0].Shifthrs
                    ? allAttendance[0].Shifthrs
                    : '-'),
                  (currentDateData.shiftInTime = allAttendance[0].ShiftIntime
                    ? allAttendance[0].ShiftIntime
                    : '-'),
                  (currentDateData.shiftOutTime = allAttendance[0].ShiftoutTime
                    ? allAttendance[0].ShiftoutTime
                    : '-'),
                  (currentDateData.Lateby = allAttendance[0].LateBy
                    ? allAttendance[0].LateBy
                    : '-'),
                  (currentDateData.EarlyBy = allAttendance[0].EarlyBy
                    ? allAttendance[0].EarlyBy
                    : '-'),
                  (currentDateData.Penalty = allAttendance[0].Panalty
                    ? allAttendance[0].Panalty
                    : '-'),
                  (currentDateData.goEarlyPanalty = allAttendance[0]
                    .goEarlyPanalty
                    ? allAttendance[0].goEarlyPanalty
                    : '-'),
                  (currentDateData.goEarlyPanaltyDeduction = allAttendance[0]
                    .goEarlyPanaltyDeduction
                    ? allAttendance[0].goEarlyPanaltyDeduction
                    : '-'),
                  (currentDateData.latePenaltyMinutes = allAttendance[0]
                    .latePenaltyMinutes
                    ? allAttendance[0].latePenaltyMinutes
                    : '-'),
                  (currentDateData.earlyPenaltyMinutes = allAttendance[0]
                    .earlyPenaltyMinutes
                    ? allAttendance[0].earlyPenaltyMinutes
                    : '-'),
                  (currentDateData.PenaltyDeduction = allAttendance[0]
                    .PanaltyDeduction
                    ? allAttendance[0].PanaltyDeduction
                    : '-'),
                  (currentDateData.employeecode = userData.employeecode),
                  (currentDateData.userName = userData.userName),
                  (currentDateData.userNumber = userData.userNumber),
                  (currentDateData.finalminutes =
                    +allAttendance[0].InHrs + +allAttendance[0].OutHrs);
              } else if (
                !allAttendance[0].OutDateTime &&
                new Date().toISOString().slice(0, 10) !=
                  new Date(date).toISOString().slice(0, 10)
              )
                userData.totalmisspunch++,
                  (currentDateData.attendancetype = 'MissPunch'),
                  (currentDateData.intime = allAttendance[0].InDatetime);
              else if (
                !allAttendance[0].OutDateTime &&
                new Date().toISOString().slice(0, 10) ==
                  new Date(date).toISOString().slice(0, 10)
              )
                userData.totalpresentday++,
                  (currentDateData.attendancetype = 'P'),
                  (currentDateData.intime = allAttendance[0].InDatetime);
              else
                userData.totalabsentday++,
                  (currentDateData.attendancetype = 'A'),
                  (currentDateData.minutes = toHoursAndMinutes(
                    +allAttendance[0].InHrs + +allAttendance[0].OutHrs,
                  ));
              (currentDateData.intime = allAttendance[0].InDatetime),
                (currentDateData.outtime = allAttendance[0].OutDateTime
                  ? allAttendance[0].OutDateTime
                  : '-'),
                (currentDateData.branch = allAttendance[0][
                  'branchMaster.branchName'
                ]
                  ? allAttendance[0]['branchMaster.branchName']
                  : '-'),
                (currentDateData.department = allAttendance[0][
                  'department.departmentName'
                ]
                  ? allAttendance[0]['department.departmentName']
                  : '-'),
                (currentDateData.designation = allAttendance[0][
                  'designation.designationName'
                ]
                  ? allAttendance[0]['designation.designationName']
                  : '-'),
                (currentDateData.shift = allAttendance[0]['shift.shiftName']
                  ? allAttendance[0]['shift.shiftName']
                  : '-'),
                (currentDateData.shiftHours = allAttendance[0].Shifthrs
                  ? allAttendance[0].Shifthrs
                  : '-'),
                (currentDateData.shiftInTime = allAttendance[0].ShiftIntime
                  ? allAttendance[0].ShiftIntime
                  : '-'),
                (currentDateData.roundOffMinutes = allAttendance[0]
                  .roundOffMinutes
                  ? allAttendance[0].roundOffMinutes
                  : 0),
                (currentDateData.roundOffHours = allAttendance[0]
                  .roundOffMinutes
                  ? minutesToHoursMinutes(allAttendance[0].roundOffMinutes || 0)
                  : 0),
                (currentDateData.shiftOutTime = allAttendance[0].ShiftoutTime
                  ? allAttendance[0].ShiftoutTime
                  : '-'),
                (currentDateData.Lateby = allAttendance[0].LateBy
                  ? allAttendance[0].LateBy
                  : '-'),
                (currentDateData.EarlyBy = allAttendance[0].EarlyBy
                  ? allAttendance[0].EarlyBy
                  : '-'),
                (currentDateData.Penalty = allAttendance[0].Panalty
                  ? allAttendance[0].Panalty
                  : '-'),
                (currentDateData.goEarlyPanalty = allAttendance[0]
                  .goEarlyPanalty
                  ? allAttendance[0].goEarlyPanalty
                  : '-'),
                (currentDateData.goEarlyPanaltyDeduction = allAttendance[0]
                  .goEarlyPanaltyDeduction
                  ? allAttendance[0].goEarlyPanaltyDeduction
                  : '-'),
                (currentDateData.latePenaltyMinutes = allAttendance[0]
                  .latePenaltyMinutes
                  ? allAttendance[0].latePenaltyMinutes
                  : '-'),
                (currentDateData.earlyPenaltyMinutes = allAttendance[0]
                  .earlyPenaltyMinutes
                  ? allAttendance[0].earlyPenaltyMinutes
                  : '-'),
                (currentDateData.PenaltyDeduction = allAttendance[0]
                  .PanaltyDeduction
                  ? allAttendance[0].PanaltyDeduction
                  : '-'),
                (currentDateData.employeecode = userData.employeecode),
                (currentDateData.userName = userData.userName),
                (currentDateData.userNumber = userData.userNumber),
                (currentDateData.finalminutes =
                  +allAttendance[0].InHrs + +allAttendance[0].OutHrs);

              flag = 1;
              while (
                allAttendance.length != 0 &&
                allAttendance[0].AttendanceDate ==
                  new Date(date).toISOString().slice(0, 10)
              ) {
                allAttendance.shift();
              }
            }

            if (
              allWeekOffHoliday.length != 0 &&
              allWeekOffHoliday[0].date ==
                new Date(date).toISOString().slice(0, 10)
            ) {
              if (allWeekOffHoliday[0].optionalHoliday)
                allWeekOffHoliday[0].tableName = 'Optional Holiday';

              if (flag == 1)
                currentDateData.attendancetype +=
                  '+' + allWeekOffHoliday[0].tableName;
              else {
                currentDateData.attendancetype = allWeekOffHoliday[0].tableName;
                userData.totalweekoffholiday++;
                flag = 1;
              }

              while (
                allWeekOffHoliday.length != 0 &&
                allWeekOffHoliday[0].date ==
                  new Date(date).toISOString().slice(0, 10)
              ) {
                allWeekOffHoliday.shift();
              }
            }

            const Leave = await getLeave(
              user.userMasterID,
              new Date(date).toISOString().slice(0, 10),
            );
            if (Leave) {
              if (flag == 1) currentDateData.attendancetype += '+' + Leave;
              else {
                currentDateData.attendancetype = Leave;

                if (Leave == 'Leave') userData.totalpendingleave++;
                else userData.totalapprovedleave++;

                flag = 1;
              }
            }

            if (flag == 0) {
              userData.totalabsentday++;
            }
          } else {
            (currentDateData.attendancetype = '-'),
              (currentDateData.employeecode = '-'),
              (currentDateData.userName = '-'),
              (currentDateData.userNumber = '-');
          }

          userData.attendancedata.push(currentDateData);
        }
        if (
          userData.attendancedata.length != 0 &&
          (userData.attendancedata[0].branch == '-' ||
            userData.attendancedata[0].department == '-' ||
            userData.attendancedata[0].designation == '-')
        ) {
          if (userData.attendancedata[0].branch == '-') {
            const branch = await employeeBranch(
              userData.userMasterID,
              userData.attendancedata[0].attendancedate,
            );

            if (branch)
              userData.attendancedata[0].branch =
                branch['branchMaster.branchName'];
          }
          if (userData.attendancedata[0].department == '-') {
            const department = await employeeDepartment(
              userData.userMasterID,
              userData.attendancedata[0].attendancedate,
            );

            if (department)
              userData.attendancedata[0].department =
                department['department.departmentName'];
          }
          if (userData.attendancedata[0].designation == '-') {
            const designation = await employeeDesignation(
              userData.userMasterID,
              userData.attendancedata[0].attendancedate,
            );

            if (designation)
              userData.attendancedata[0].designation =
                designation['designation.designationName'];
          }
        }
        finalfinal.push(deepCopy(userData));
        finalfinal.push(deepCopy(userData));
        finalfinal.push(deepCopy(userData));
        return userData;
      }),
    );

    if (finalfinal.length > 0) {
      // let FileName = 'Attendance-Report';
      let fileType = 'xlsx';

      const workBook = new Excel.Workbook();
      const workSheet = workBook.addWorksheet('sheet');
      const headerNames = Object.keys(finalfinal[0]);
      const transformedObject = [];
      for (var i = 0; i < finalfinal.length; i += 3) {
        if (finalfinal[i].attendancedata.length != 0) {
          finalfinal[i].branch = finalfinal[i].attendancedata[0].branch;
          finalfinal[i].department = finalfinal[i].attendancedata[0].department;
          finalfinal[i].designation =
            finalfinal[i].attendancedata[0].designation;
        }
        for (var j = 0; j < finalfinal[i].attendancedata.length; j++) {
          let attendancedate = new Date(
            finalfinal[i].attendancedata[j].attendancedate,
          )
            .toISOString()
            .slice(0, 10);
          let LateBy = 'LateBy';
          let EarlyBy = 'EarlyBy';
          let attendanceShift = 'Attendance Shift';
          let roundOffHoursLabel = 'Working Hours';
          let roundOffMinutesLabel = 'Working Minutes';
          // Ensure each index (i, i + 1, i + 2) has its unique data
          if (finalfinal[i]) {
            if (!finalfinal[i][attendancedate])
              finalfinal[i][attendancedate] = '';
            finalfinal[i][attendancedate] =
              finalfinal[i].attendancedata[j].intime &&
              finalfinal[i].attendancedata[j].intime != '-'
                ? moment(
                    asiaKolkataDateTime(finalfinal[i].attendancedata[j].intime),
                    'YYYY-MM-DD, HH:mm:ss A',
                  ).format('DD-MM-YYYY, HH:mm:ss A')
                : '-';
            finalfinal[i][LateBy] = finalfinal[i].attendancedata[j].Lateby;
            finalfinal[i][EarlyBy] = finalfinal[i].attendancedata[j].EarlyBy;
            finalfinal[i][attendanceShift] =
              finalfinal[i].attendancedata[j].shift;
            finalfinal[i][roundOffHoursLabel] =
              finalfinal[i].attendancedata[j].roundOffHours;
            finalfinal[i][roundOffMinutesLabel] =
              finalfinal[i].attendancedata[j].roundOffMinutes;
          }
          if (finalfinal[i + 1]) {
            if (!finalfinal[i + 1][attendancedate])
              finalfinal[i + 1][attendancedate] = '';
            finalfinal[i + 1][attendancedate] =
              finalfinal[i].attendancedata[j].outtime &&
              finalfinal[i].attendancedata[j].outtime != '-'
                ? moment(
                    asiaKolkataDateTime(
                      finalfinal[i].attendancedata[j].outtime,
                    ),
                    'YYYY-MM-DD, HH:mm:ss A',
                  ).format('DD-MM-YYYY, HH:mm:ss A')
                : '-';
          }
          if (finalfinal[i + 2]) {
            if (!finalfinal[i + 2][attendancedate])
              finalfinal[i + 2][attendancedate] = '';
            finalfinal[i + 2][attendancedate] =
              finalfinal[i].attendancedata[j].attendancetype;
          }
        }

        delete finalfinal[i].attendancedata;
        delete finalfinal[i].userMasterID;
        delete finalfinal[i].totalabsentday;
        delete finalfinal[i].totalhalfday;
        delete finalfinal[i].totalpresentday;
        delete finalfinal[i].totalmisspunch;
        delete finalfinal[i].totalweekoffholiday;
        delete finalfinal[i].totalapprovedleave;
        delete finalfinal[i].totalpendingleave;

        delete finalfinal[i + 1].attendancedata;
        delete finalfinal[i + 1].userMasterID;
        delete finalfinal[i + 1].totalabsentday;
        delete finalfinal[i + 1].totalhalfday;
        delete finalfinal[i + 1].totalpresentday;
        delete finalfinal[i + 1].totalmisspunch;
        delete finalfinal[i + 1].totalweekoffholiday;
        delete finalfinal[i + 1].totalapprovedleave;
        delete finalfinal[i + 1].totalpendingleave;

        delete finalfinal[i + 2].attendancedata;
        delete finalfinal[i + 2].userMasterID;
        delete finalfinal[i + 2].totalabsentday;
        delete finalfinal[i + 2].totalhalfday;
        delete finalfinal[i + 2].totalpresentday;
        delete finalfinal[i + 2].totalmisspunch;
        delete finalfinal[i + 2].totalweekoffholiday;
        delete finalfinal[i + 2].totalapprovedleave;
        delete finalfinal[i + 2].totalpendingleave;
      }

      for (let i = 0; i < finalfinal.length; i++) {
        let isNotArray = true;
        headerNames.forEach((key) => {
          if (Array.isArray(finalfinal[i][key]) === true) {
            finalfinal[i][key].forEach((obj) => {
              isNotArray = false;
              // Deep copy so that values in finalfinal[i] does not get changed
              const transformedElement = JSON.parse(
                JSON.stringify(finalfinal[i]),
              );
              transformedElement[key] = obj;
              transformedObject.push({ ...transformedElement });
            });
          }
        });
        if (isNotArray)
          transformedObject.push(JSON.parse(JSON.stringify(finalfinal[i])));
      }
      if (transformedObject.length === 0) transformedObject.push(...finalfinal);

      const keyData = flattenObj(
        transformedObject[findIndexParentWithMostKeys(transformedObject)],
      );

      const columns = Object.keys(keyData).map((key) => ({
        header: key,
        key,
        width: 15,
      }));

      workSheet.columns = columns;

      transformedObject.forEach((element) => {
        workSheet.addRow(flattenObj(element));
      });
      formatFirstRow(workSheet, 1);
      let position = 2;
      for (let j = 0; j < finalfinal.length; j += 3) {
        workSheet.mergeCells(position, 1, position + 2, 1);
        workSheet.mergeCells(position, 2, position + 2, 2);
        workSheet.mergeCells(position, 3, position + 2, 3);
        workSheet.mergeCells(position, 4, position + 2, 4);
        workSheet.mergeCells(position, 5, position + 2, 5);
        workSheet.mergeCells(position, 6, position + 2, 6);
        workSheet.mergeCells(position, 8, position + 2, 8);
        workSheet.mergeCells(position, 9, position + 2, 9);
        workSheet.mergeCells(position, 10, position + 2, 10);
        workSheet.mergeCells(position, 11, position + 2, 11);
        workSheet.mergeCells(position, 12, position + 2, 12);
        position += 3;
      }
      workSheet.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
          if (rowNumber > 1) {
            workSheet.getRow(rowNumber).eachCell((cell) => {
              if (colNumber <= 6)
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            });
          }
        });
      });

      const filePath = path.join(
        __dirname,
        '../uploads',
        `${FileName}${userMasterID}_${Date.now()}.${fileType}`,
      );
      workBook.xlsx
        .writeFile(filePath)
        .then(function () {})
        .catch(function (error) {
          addLogToMailCronFile(
            `${new Date().toLocaleString()} ===> Error Saving Workbook \n ${error}`,
          );
        });

      return filePath;
    }
  } catch (err) {
    addLogToMailCronFile(
      `${new Date().toLocaleString()} ===> Ran into an error while generatin Attendance Excel\n ${err}`,
    );
  }
}
async function shiftDepartmentWiseDailyAttendanceCountReport(
  companyMasterID,
  userMasterID,
  fromDate,
  toDate,
) {
  try {
    let getchildcompany = [];
    let employee = await companyMaster.findOne({
      where: {
        companyMasterID: companyMasterID,
        status: [0, 1],
      },
    });

    if (employee.parentCompanyMasterID != 0) {
      getchildcompany = await companyMaster.findAll({
        where: {
          parentCompanyMasterID: employee.parentCompanyMasterID,
          status: [1],
        },
      });
    } else {
      getchildcompany = await companyMaster.findAll({
        raw: true,
        where: {
          parentCompanyMasterID: companyMasterID,
          status: [1],
        },
        required: false,
      });
    }
    let companyIDs = [];
    if (employee.parentCompanyMasterID == 0) {
      companyIDs.push(companyMasterID);
    } else {
      companyIDs.push(employee.parentCompanyMasterID);
    }
    getchildcompany.forEach((company) => {
      companyIDs.push(company.companyMasterID);
    });

    const role = await UserRole.findOne({
      where: {
        userMasterID,
      },
      include: [
        {
          model: RoleMaster,
          attributes: ['roleMasterID', 'roleType', 'companyMasterID'],
          include: [
            { model: RoleMasterBranchWise, attributes: ['branchMasterID'] },
          ],
        },
      ],
    });

    let branchids = [];

    if (
      role &&
      role.roleMaster.roleType == 'branchWise' &&
      role.roleMaster.roleMasterBranchWises &&
      role.roleMaster.roleMasterBranchWises.length > 0
    ) {
      branchids = [
        ...role.roleMaster.roleMasterBranchWises.map((e) => e.branchMasterID),
      ];
    }

    const data = [];
    for (const companyID of companyIDs) {
      const companyData = await attendanceTransaction.findAll({
        where: {
          '$shift.companyMasterID$': companyID,
          AttendanceDate: {
            [Sequelize.Op.between]: [fromDate, toDate],
          },
          ...(branchids.length > 0 && { branchID: branchids }),
        },
        include: [
          {
            model: Shift,
            include: [
              {
                model: companyMaster,
                attributes: ['companyName'],
              },
            ],
            attributes: ['shiftName'],
          },
          {
            model: Department,
            attributes: ['departmentName'],
          },
        ],
      });
      data.push(...companyData);
    }
    const attendanceCounts = data.reduce((acc, record) => {
      const date = record.AttendanceDate;
      const shiftName = record.shift.shiftName;
      const departmentName = record.department
        ? record.department.departmentName
        : '';

      if (!acc[shiftName]) {
        acc[shiftName] = {};
      }
      if (!acc[shiftName][departmentName]) {
        acc[shiftName][departmentName] = {};
      }
      if (!acc[shiftName][departmentName][date]) {
        acc[shiftName][departmentName][date] = 0;
      }
      acc[shiftName][departmentName][date] += 1;

      return acc;
    }, {});

    const dates = Array.from(
      new Set(data.map((record) => record.AttendanceDate)),
    );
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };
    const formattedDates = dates.map((date) => formatDate(date));

    const exportResult = Object.keys(attendanceCounts).map((shiftName) => {
      const shiftRow = { 'Shift Name': shiftName };
      Object.keys(attendanceCounts[shiftName]).forEach((departmentName) => {
        const departmentRow = { 'Department Name': departmentName };
        formattedDates.forEach((formattedDate) => {
          const originalDate = dates.find(
            (date) => formatDate(date) === formattedDate,
          );
          departmentRow[formattedDate] =
            attendanceCounts[shiftName][departmentName][originalDate] || 0;
        });
        shiftRow[departmentName] = departmentRow;
      });
      return shiftRow;
    });

    const filePath = await generateExcelDepartmentWisepunchinoutcountreportMail(
      exportResult,
      dates,
      'Shift-DepartmentWise-Attendance-Count Report',
      companyMasterID,
      userMasterID,
    );
    return filePath;
  } catch (err) {
    addLogToMailCronFile(
      `${new Date().toLocaleString()} ===> Ran into an error while generatin Attendance Excel\n ${err}`,
    );
  }
}

function financialYearDates(currentDate) {
  const dateObj = new Date(currentDate);
  const startOfYear = new Date(dateObj.getFullYear(), 3, 1);
  const endOfYear = new Date(dateObj.getFullYear() + 1, 2, 31);

  if (dateObj < startOfYear) {
    return {
      start: formatDate(new Date(dateObj.getFullYear() - 1, 3, 1)),
      end: formatDate(new Date(dateObj.getFullYear(), 2, 31)),
    };
  } else {
    return {
      start: formatDate(startOfYear),
      end: formatDate(endOfYear),
    };
  }
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function getDDMMYYYYdate(date) {
  if (!date) return;
  const parts = date.split('-');
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

// async function getFinancialYearDatesFromDate(dateString) {
//   const fiscalYearStartMonth = 4;

//   const [year, month, day] = dateString.split('-').map(Number);

//   let startDate, endDate;

//   if (month >= fiscalYearStartMonth) {
//     startDate = new Date(year, fiscalYearStartMonth - 1, 1); // Month is zero-indexed
//     endDate = new Date(year + 1, fiscalYearStartMonth - 1, 0);
//   } else {
//     startDate = new Date(year - 1, fiscalYearStartMonth - 1, 1);
//     endDate = new Date(year, fiscalYearStartMonth - 1, 0);
//   }

//   return {
//     startDate:
//       new Date(startDate).getFullYear() +
//       '-' +
//       ('0' + (new Date(startDate).getMonth() + 1)).slice(-2) +
//       '-' +
//       ('0' + new Date(startDate).getDate()).slice(-2),
//     endDate:
//       new Date(endDate).getFullYear() +
//       '-' +
//       ('0' + (new Date(endDate).getMonth() + 1)).slice(-2) +
//       '-' +
//       ('0' + new Date(endDate).getDate()).slice(-2),
//   };
// }

async function lateComeEarlyGoReport(
  companyMasterID,
  userMasterID,
  fromDate,
  toDate,
) {
  try {
    const role = await UserRole.findOne({
      where: {
        userMasterID,
      },
      include: [
        {
          model: RoleMaster,
          attributes: ['roleMasterID', 'roleType', 'companyMasterID'],
          include: [
            { model: RoleMasterBranchWise, attributes: ['branchMasterID'] },
          ],
        },
      ],
    });

    const condition = {};
    condition['$userMaster.companyMasterId$'] = companyMasterID;
    condition.AttendanceDate = {
      [Sequelize.Op.between]: [fromDate, toDate],
    };
    condition[Sequelize.Op.or] = [
      {
        LateBy: { [Sequelize.Op.ne]: null },
        LateBy: { [Sequelize.Op.ne]: '' },
      },
      {
        EarlyBy: { [Sequelize.Op.ne]: null },
        EarlyBy: { [Sequelize.Op.ne]: '' },
      },
    ];

    const order = [['AttendanceDate', 'ASC']];

    let branchids = [];

    if (
      role &&
      role.roleMaster.roleType == 'branchWise' &&
      role.roleMaster.roleMasterBranchWises &&
      role.roleMaster.roleMasterBranchWises.length > 0
    ) {
      branchids = [
        ...role.roleMaster.roleMasterBranchWises.map((e) => e.branchMasterID),
      ];
    }

    const AttendanceData = await attendanceTransaction.findAll({
      distinct: true,
      // raw: true,
      where: condition,
      order,
      include: [
        {
          model: UserMaster,
          attributes: [
            'userMasterID',
            'displayName',
            'userNumber',
            'companyMasterId',
          ],
          required: true,
          include: [
            {
              required: false,
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode', 'salarytype'],
            },
            {
              model: EmployeeBranch,
              where: {
                status: 1,
                applicableDate: {
                  [Sequelize.Op.lte]: new Date(toDate),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: {
                      [Sequelize.Op.gte]: new Date(toDate),
                    },
                  },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
                ...(branchids.length > 0 && { branchID: branchids }),
              },
              required: branchids.length > 0,
            },
          ],
        },
      ],
    });

    const Staff = [];
    const Wages = [];
    const Others = [];

    var s = 1,
      w = 1,
      o = 1;

    const shiftIds = [...new Set(AttendanceData.map((e) => +e.Shift))];

    const getAllShift = await Shift.findAll({
      where: {
        shiftID: shiftIds,
      },
    });

    const lateEarlyAllUsers_Count_Array = [];

    for (let item of AttendanceData) {
      const getShift = getAllShift.find((e) => +e.shiftID == +item.Shift);

      let lateearly = '',
        no;
      if (item.LateBy && item.EarlyBy) lateearly = 'Late In/ Early out';
      else if (item.LateBy) lateearly = 'Late In';
      else if (item.EarlyBy) lateearly = 'Early out';

      const financialYearDatesResult = financialYearDates(toDate);

      const already_findData = lateEarlyAllUsers_Count_Array.find(
        (e) => e.userMasterID == item.userMasterID,
      );

      if (already_findData) {
        no = +already_findData.lateByCount + +already_findData.earlyByCount;
      } else {
        const LatebyCount = await attendanceTransaction.count({
          raw: true,
          where: {
            LateBy: { [Sequelize.Op.ne]: null },
            LateBy: { [Sequelize.Op.ne]: '' },
            AttendanceDate: {
              [Sequelize.Op.between]: [
                financialYearDatesResult.start,
                financialYearDatesResult.end,
              ],
            },
            userMasterID: item.userMasterID,
          },
          include: [
            {
              model: UserMaster,
              // attributes: ['displayName', 'userNumber', 'companyMasterId'],
              required: true,
              include: [
                {
                  model: EmployeeBranch,
                  where: {
                    status: 1,
                    applicableDate: {
                      [Sequelize.Op.lte]: new Date(toDate),
                    },
                    [Sequelize.Op.or]: [
                      {
                        endDate: {
                          [Sequelize.Op.gte]: new Date(toDate),
                        },
                      },
                      { endDate: { [Sequelize.Op.eq]: null } },
                    ],
                    ...(branchids.length > 0 && { branchID: branchids }),
                  },
                  required: branchids.length > 0,
                },
              ],
            },
          ],
          attributes: ['AttendanceDate'],
          group: ['AttendanceDate'],
        });

        const EarlybyCount = await attendanceTransaction.count({
          raw: true,
          where: {
            EarlyBy: { [Sequelize.Op.ne]: null },
            EarlyBy: { [Sequelize.Op.ne]: '' },
            AttendanceDate: {
              [Sequelize.Op.between]: [
                financialYearDatesResult.start,
                financialYearDatesResult.end,
              ],
            },
            userMasterID: item.userMasterID,
          },
          include: [
            {
              model: UserMaster,
              // attributes: ['displayName', 'userNumber', 'companyMasterId'],
              required: true,
              include: [
                {
                  model: EmployeeBranch,
                  where: {
                    status: 1,
                    applicableDate: {
                      [Sequelize.Op.lte]: new Date(toDate),
                    },
                    [Sequelize.Op.or]: [
                      {
                        endDate: {
                          [Sequelize.Op.gte]: new Date(toDate),
                        },
                      },
                      { endDate: { [Sequelize.Op.eq]: null } },
                    ],
                    ...(branchids.length > 0 && { branchID: branchids }),
                  },
                  required: branchids.length > 0,
                },
              ],
            },
          ],
          attributes: ['AttendanceDate'],
          group: ['AttendanceDate'],
        });

        lateEarlyAllUsers_Count_Array.push({
          userMasterID: item.userMasterID,
          lateByCount: LatebyCount.length,
          earlyByCount: EarlybyCount.length,
        });

        no = LatebyCount.length + EarlybyCount.length;
      }

      let type = null;
      let employeeCode = '';
      const joining =
        item.userMaster.employeeJoiningDetails &&
        item.userMaster.employeeJoiningDetails.length > 0
          ? item.userMaster.employeeJoiningDetails[0]
          : null;
      if (joining && joining.salarytype == 'S') type = 'S';
      if (joining && joining.salarytype == 'W') type = 'W';
      if (joining) employeeCode = joining.employeeCode;

      let item1 = {
        'Sr No.': type == 'W' ? w : type == 'S' ? s : o,
        'Employee Code': employeeCode,
        'Name of Employee': item.userMaster.displayName,
        'Number of Employee': item.userMaster.userNumber,
        'Late In/Early Out': lateearly,
        Date: getDDMMYYYYdate(item.AttendanceDate),

        Shift:
          getShift.shiftName +
          '(' +
          item.ShiftIntime +
          ' to ' +
          item.ShiftoutTime +
          ' )',
        In: new Date(
          new Date(item.InDatetime).getTime() -
            new Date(item.InDatetime).getTimezoneOffset() * 60000,
        )
          .toISOString()
          .slice(11, 19),
        Out: item.OutDateTime
          ? new Date(
              new Date(item.OutDateTime).getTime() -
                new Date(item.OutDateTime).getTimezoneOffset() * 60000,
            )
              .toISOString()
              .slice(11, 19)
          : '',
        'Late In by(Minutes)': item.LateBy ? item.LateBy : 0,
        'Early Out by(Minutes)': item.EarlyBy ? item.EarlyBy : 0,
        'No. of times Late In/Early out in FY': no,
      };
      type == 'W'
        ? Wages.push(item1)
        : type == 'S'
          ? Staff.push(item1)
          : Others.push(item1);
      type == 'W' ? w++ : type == 'S' ? s++ : o++;
    }

    if (Staff.length == 0 && Wages.length == 0 && Others.length == 0) {
      let item1 = {
        'Sr No.': '',
        'Employee Code': '',
        'Name of Employee': '',
        'Number of Employee': '',
        'Late In/Early Out': '',
        Date: '',
        Shift: '',
        In: '',
        Out: '',
        'Late In by(Minutes)': '',
        'Early Out by(Minutes)': '',
        'No. of times Late In/Early out in FY': '',
      };
      Others.push(item1);
    }

    const finalData = [];
    const Names = [];
    if (Staff.length != 0) finalData.push(Staff), Names.push('Staff');
    if (Wages.length != 0) finalData.push(Wages), Names.push('Wages');
    if (Others.length != 0) finalData.push(Others), Names.push('Others');

    const filePath = await generateExcelLateComeEarlyGoMail(
      finalData,
      'Late-Come Early-Go Report',
      userMasterID,
      Names,
    );
    return filePath;
  } catch (error) {
    addLogToMailCronFile(
      `${new Date().toLocaleString()} ===> Ran into an error while generatin Attendance Excel\n ${err}`,
    );
  }
}

async function getFomatedData(sortedArray1, user) {
  const absentArray = [];

  let currentRange = null;

  sortedArray1.forEach((date) => {
    if (!currentRange) {
      currentRange = {
        userMasterID: user.userMasterID,
        displayName: user.userMaster.displayName,
        FromDate: date,
        ToDate: date,
        authorizationStatus: 'Absent',
        LeaveDays: 1,
      };
    } else {
      const currentDate = new Date(date);
      const nextExpectedDate = new Date(currentRange.ToDate);
      nextExpectedDate.setDate(nextExpectedDate.getDate() + 1);

      if (currentDate.getTime() === nextExpectedDate.getTime()) {
        currentRange.ToDate = date;
        currentRange.LeaveDays += 1;
      } else {
        absentArray.push({ ...currentRange });
        currentRange = {
          userMasterID: user.userMasterID,
          displayName: user.userMaster.displayName,
          FromDate: date,
          ToDate: date,
          authorizationStatus: 'Absent',
          LeaveDays: 1,
        };
      }
    }
  });

  // Add the last range to the result array
  if (currentRange) {
    absentArray.push({ ...currentRange });
  }

  return absentArray;
}

async function FYLeaveReport(companyMasterID, userMasterID, fromDate, toDate) {
  try {
    const role = await UserRole.findOne({
      where: {
        userMasterID,
      },
      include: [
        {
          model: RoleMaster,
          attributes: ['roleMasterID', 'roleType', 'companyMasterID'],
          include: [
            { model: RoleMasterBranchWise, attributes: ['branchMasterID'] },
          ],
        },
      ],
    });

    let branchids = [];

    if (
      role &&
      role.roleMaster.roleType == 'branchWise' &&
      role.roleMaster.roleMasterBranchWises &&
      role.roleMaster.roleMasterBranchWises.length > 0
    ) {
      branchids = [
        ...role.roleMaster.roleMasterBranchWises.map((e) => e.branchMasterID),
      ];
    }

    const leave = await HrLeaveTypes.findAll({
      raw: true,
      where: {
        companyMasterID: companyMasterID,
        Leave_Allow: 'Y',
        status: 1,
      },
      include: [
        { model: HrLeaveMaster, as: 'LeaveMaster', attributes: [] },
        { model: companyMaster, attributes: [] },
      ],
      attributes: [
        [Sequelize.col('LeaveMaster.LeaveName'), 'LeaveName'],
        [Sequelize.col('companyMaster.companyName'), 'companyName'],
      ],
    });

    const date = asiaKolkataDateTime(new Date()).slice(0, 10);

    const oneDayBeforedate = new Date(toDate);

    const dates = await getFinancialYearDatesFromDate(date);

    const startDate = dates.startDate;
    const endDate = dates.endDate;

    const month = month_dict[startDate.slice(5, 7)];

    const firstHeader =
      `${leave.length > 0 ? leave[0].companyName : ''}` +
      ' Leave Update ' +
      `${month}` +
      '-' +
      startDate.slice(0, 4);

    const leaveHeader = leave.map((e) => e.LeaveName).concat('A');

    const startdate = date.slice(0, 8) + '01';

    // set date of after two months

    const inputDate = new Date(startdate);
    inputDate.setMonth(inputDate.getMonth() + 2, inputDate.getDate() - 1);
    let enddate =
      inputDate.getFullYear() +
      '-' +
      ('0' + (inputDate.getMonth() + 1)).slice(-2) +
      '-' +
      ('0' + inputDate.getDate()).slice(-2);

    if (new Date(enddate) > new Date(endDate)) enddate = endDate;

    const users = await EmployeeJoiningDetails.findAll({
      where: {
        joiningDate: {
          [Sequelize.Op.lte]: new Date(enddate),
        },
        [Sequelize.Op.or]: [
          {
            leavingDate: { [Sequelize.Op.gte]: new Date(startdate) },
          },
          {
            leavingDate: { [Sequelize.Op.eq]: null },
            [Sequelize.Op.or]: [
              {
                '$userMaster.deactiveDate$': {
                  [Sequelize.Op.gte]: new Date(startdate),
                },
              },
              {
                '$userMaster.deactiveDate$': { [Sequelize.Op.eq]: null },
              },
            ],
          },
        ],
        '$userMaster.companyMasterId$': companyMasterID,
        '$userMaster.status$': 1,
      },
      include: [
        {
          model: UserMaster,
          required: true,
          include: [
            {
              model: EmployeeBranch,
              where: {
                status: 1,
                applicableDate: {
                  [Sequelize.Op.lte]: new Date(toDate),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: {
                      [Sequelize.Op.gte]: new Date(toDate),
                    },
                  },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
                ...(branchids.length > 0 && { branchID: branchids }),
              },
              required: branchids.length > 0,
            },
            {
              model: EmployeeDepartment,
              where: {
                status: 1,
                applicableDate: {
                  [Sequelize.Op.lte]: new Date(toDate),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: {
                      [Sequelize.Op.gte]: new Date(toDate),
                    },
                  },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              required: false,
              include: [{ model: Department, as: 'department' }],
            },
          ],
        },
      ],
      order: [[{ model: UserMaster }, 'displayName', 'ASC']],
    });

    const All_userIds = users.map((e) => e.userMasterID);

    const userLeave = await UserLeave.findAll({
      raw: true,
      where: {
        status: 1,
        FromDate: { [Sequelize.Op.lte]: enddate },
        ToDate: { [Sequelize.Op.gte]: startdate },
        authorizationStatus: {
          [Sequelize.Op.notIn]: [4],
        },
      },
      include: [
        {
          model: UserMaster,
          where: { userMasterID: All_userIds },
          required: true,
          attributes: [],
          include: [{ model: EmployeeJoiningDetails, attributes: [] }],
        },
      ],
      attributes: [
        'userMasterID',
        Sequelize.col('userMaster.displayName', 'displayName'),
        'FromDate',
        'ToDate',
        'authorizationStatus',
        'LeaveDays',
        [Sequelize.col('userMaster.deactiveDate'), 'deactiveDate'],
        [
          Sequelize.col('userMaster.employeeJoiningDetails.joiningDate'),
          'joiningDate',
        ],
        [
          Sequelize.col('userMaster.employeeJoiningDetails.leavingDate'),
          'leavingDate',
        ],
      ],
      order: [[{ model: UserMaster }, 'displayName', 'ASC']],
    });

    const beforeEndDate =
      new Date(startdate).getFullYear() +
      '-' +
      ('0' + (new Date(startdate).getMonth() + 1)).slice(-2) +
      '-' +
      ('0' + (new Date(startdate).getDate() - 1)).slice(-2);

    const isDateInRange = (date, fromdate, todate) =>
      date >= fromdate && date <= todate;

    const final = [];
    const salaryTypeStaff = [];
    const salaryTypeWages = [];
    const SalatTypeNotSet = [];
    let srno = 0;

    for (const user of users) {
      // create startdate and enddate for get data of current month from 1st date to one day before today date

      const fyStartDate =
        new Date(user.joiningDate) > new Date(startdate)
          ? user.joiningDate
          : startdate;
      const fyEndDate = user.leavingDate
        ? new Date(user.leavingDate) < new Date(oneDayBeforedate)
          ? user.leavingDate
          : oneDayBeforedate
        : user.userMaster.deactiveDate
          ? new Date(user.userMaster.deactiveDate) < new Date(oneDayBeforedate)
            ? user.userMaster.deactiveDate
            : oneDayBeforedate
          : oneDayBeforedate;

      const attendanceQuery = {
        attributes: ['AttendanceDate'],
        where: {
          userMasterID: user.userMasterID,
          AttendanceDate: {
            [Op.between]: [fyStartDate, fyEndDate],
          },
          fulldayhalfday: {
            [Op.gt]: 0,
          },
        },
        distinct: true,
      };

      const weekoffHolidayQuery = {
        attributes: ['date'],
        where: {
          userMasterID: user.userMasterID,
          date: {
            [Op.between]: [fyStartDate, fyEndDate],
          },
          [Sequelize.Op.or]: [
            { optionalHoliday: false },
            { optionalHoliday: null },
          ],
        },
        distinct: true,
      };

      // Use Promise.all to fetch data concurrently
      const [uniqueDatesFromAttendance, uniqueDatesFromWeekoffHoliday] =
        await Promise.all([
          attendanceTransaction.findAll(attendanceQuery),
          weekoffHolidayTran.findAll(weekoffHolidayQuery),
        ]);

      // Extract unique dates from the results
      const uniqueDatesFromAttendanceSet = new Set(
        uniqueDatesFromAttendance.map((item) => item.AttendanceDate),
      );
      const uniqueDatesFromWeekoffHolidaySet = new Set(
        uniqueDatesFromWeekoffHoliday.map((item) => item.date),
      );

      // Combine the unique dates
      const combinedUniqueDates = [
        ...uniqueDatesFromAttendanceSet,
        ...uniqueDatesFromWeekoffHolidaySet,
      ];

      // get all date from date to todate

      const datesArray = await getDatesFromDateRange(
        new Date(fyStartDate),
        new Date(fyEndDate),
      );

      const formatedDate = datesArray.map((e) =>
        new Date(e).toISOString().slice(0, 10),
      );

      // remove dates from dates array

      const datesArray1 = formatedDate.filter(
        (date) => !combinedUniqueDates.includes(date),
      );

      const leavedata = userLeave.filter(
        (e) => e.userMasterID == user.userMasterID,
      );

      // Remove dates from array1 that occur in the range of fromdate and todate in array2
      const filteredAbsent = datesArray1.filter(
        (date) =>
          !leavedata.some((obj) =>
            isDateInRange(date, obj.FromDate, obj.ToDate),
          ),
      );

      // Sort array1 in ascending order
      const sortedArray1 = filteredAbsent.sort(
        (a, b) => new Date(a) - new Date(b),
      );

      const absentArray = await getFomatedData(sortedArray1, user);

      if (leavedata.length > 0 || absentArray.length > 0) {
        srno++;

        const approvedleave = await UserLeaveTransaction.findAll({
          raw: true,
          where: {
            date: {
              [Sequelize.Op.between]: [startDate, beforeEndDate],
            },
            status: 1,
          },
          include: [
            {
              model: UserLeave,
              where: { userMasterID: user.userMasterID },
              attributes: [],
            },
            {
              model: HrLeaveTypes,
              include: [
                { model: HrLeaveMaster, as: 'LeaveMaster', attributes: [] },
              ],
              attributes: [],
            },
          ],
          group: [
            'userLeave.userMasterID',
            'userLeaveTransaction.LeaveTranId',
            'hrLeaveType.LeaveMaster.LeaveName',
          ],
          attributes: [
            [Sequelize.col('userLeave.userMasterID'), 'userMasterID'],
            [Sequelize.col('hrLeaveType.LeaveMaster.LeaveName'), 'LeaveName'],
            [
              Sequelize.fn('SUM', Sequelize.literal('COALESCE("days", 0)')),
              'totalDays',
            ],
          ],
        });

        // to get financial data

        const fyStartDate1 =
          new Date(user.joiningDate) > new Date(startDate)
            ? user.joiningDate
            : startDate;
        const fyEndDate1 = user.leavingDate
          ? new Date(user.leavingDate) < new Date(oneDayBeforedate)
            ? user.leavingDate
            : oneDayBeforedate
          : user.userMaster.deactiveDate
            ? new Date(user.userMaster.deactiveDate) <
              new Date(oneDayBeforedate)
              ? user.userMaster.deactiveDate
              : oneDayBeforedate
            : oneDayBeforedate;

        const [attendance, weekoffholiday, leavedata1] = await Promise.all([
          attendanceTransaction.findAll({
            raw: true,
            where: {
              userMasterID: user.userMasterID,
              AttendanceDate: {
                [Sequelize.Op.between]: [fyStartDate1, fyEndDate1],
              },
            },

            attributes: [
              [
                Sequelize.fn(
                  'SUM',
                  Sequelize.literal('COALESCE("fulldayhalfday", 0)'),
                ),
                'days',
              ],
              [
                Sequelize.fn(
                  'SUM',
                  Sequelize.literal(
                    `CASE WHEN "LateBy" <> '' THEN 1 ELSE 0 END`,
                  ),
                ),
                'lateDays',
              ],
              [
                Sequelize.fn(
                  'SUM',
                  Sequelize.literal(
                    `CASE WHEN "EarlyBy" <> '' THEN 1 ELSE 0 END`,
                  ),
                ),
                'earlyDays',
              ],
            ],
          }),

          weekoffHolidayTran.findAll({
            raw: true,
            where: {
              userMasterID: user.userMasterID,
              date: {
                [Sequelize.Op.between]: [fyStartDate1, fyEndDate1],
              },
              [Sequelize.Op.or]: [
                { optionalHoliday: false },
                { optionalHoliday: null },
              ],
            },
            attributes: [
              [
                Sequelize.fn('SUM', Sequelize.literal('COALESCE("value", 0)')),
                'days',
              ],
            ],
          }),

          UserLeave.findAll({
            raw: true,
            where: {
              userMasterID: user.userMasterID,
              status: 1,
              FromDate: { [Sequelize.Op.lte]: fyEndDate1 },
              ToDate: { [Sequelize.Op.gte]: fyStartDate1 },
            },
            attributes: [
              [
                Sequelize.fn(
                  'SUM',
                  Sequelize.literal('COALESCE("LeaveDays", 0)'),
                ),
                'days',
              ],
            ],
          }),
        ]);

        const totalDays =
          (new Date(fyEndDate1) - new Date(fyStartDate1)) /
          (1000 * 60 * 60 * 24);

        const finalAbsentDays =
          +totalDays -
          (attendance.length > 0 ? +attendance[0].days : 0) -
          (weekoffholiday.length > 0 ? +weekoffholiday[0].days : 0) -
          (leavedata1.length > 0 ? +leavedata1[0].days : 0);

        const lC_Eg =
          attendance.length > 0
            ? +attendance[0].lateDays + +attendance[0].earlyDays
            : 0;

        const department =
          user.userMaster.employeeDepartments &&
          user.userMaster.employeeDepartments.length > 0
            ? user.userMaster.employeeDepartments[0]
            : null;

        const result = {};

        leaveHeader.forEach((value) => {
          const foundItem = approvedleave.find(
            (item) => item.LeaveName == value,
          );
          result[value] = foundItem ? foundItem.totalDays : '';
        });

        // merge both array

        const data = [...leavedata, ...absentArray];

        data.map((c) => {
          const data = {
            SrNo: srno,
            displayName: c.displayName,
            department: department ? department.department.departmentName : '',
            FromDate: getDDMMYYYYdate(c.FromDate),
            toDate: getDDMMYYYYdate(c.ToDate),
            authorizationStatus:
              c.authorizationStatus == 3
                ? 'Accepted'
                : c.authorizationStatus == 'Absent'
                  ? 'Absent'
                  : 'Pending',
            days: c.LeaveDays,
          };

          const finalObject = { ...data, ...result };

          finalObject['finalAbsentDays'] =
            +finalAbsentDays > 0 ? finalAbsentDays : 0;
          finalObject['lCEG'] = lC_Eg;

          if (user.salarytype == 'S') {
            salaryTypeStaff.push(finalObject);
          } else if (user.salarytype == 'W') {
            salaryTypeWages.push(finalObject);
          } else {
            SalatTypeNotSet.push(finalObject);
          }
        });
      }
    }

    const arraysToCheck = [salaryTypeStaff, salaryTypeWages, SalatTypeNotSet];

    for (const array of arraysToCheck) {
      if (array.length > 0) {
        final.push(array);
      }
    }

    const filePath = await generateExcelForFYLeaveReportMail(
      final,
      firstHeader,
      leaveHeader,
      userMasterID,
      'FY Leave Report',
      ['Staff', 'Wages', 'Others'],
    );
    return filePath;
  } catch (error) {
    addLogToMailCronFile(
      `${new Date().toLocaleString()} ===> Ran into an error while generatin Attendance Excel\n ${err}`,
    );
  }
}

async function departmentwiseDailyCostReport(
  companyMasterID,
  userMasterID,
  fromDate,
  toDate,
) {
  try {
    const role = await UserRole.findOne({
      where: {
        userMasterID,
      },
      include: [
        {
          model: RoleMaster,
          attributes: ['roleMasterID', 'roleType', 'companyMasterID'],
          include: [
            { model: RoleMasterBranchWise, attributes: ['branchMasterID'] },
          ],
        },
      ],
    });

    let branchids = [];

    if (
      role &&
      role.roleMaster.roleType == 'branchWise' &&
      role.roleMaster.roleMasterBranchWises &&
      role.roleMaster.roleMasterBranchWises.length > 0
    ) {
      branchids = [
        ...role.roleMaster.roleMasterBranchWises.map((e) => e.branchMasterID),
      ];
    }

    // const date = new Date(fromDate).toISOString().slice(0, 10);

    const oneDayBeforedate = new Date(toDate).toISOString().slice(0, 10);

    const month1 = oneDayBeforedate.slice(0, 4) + oneDayBeforedate.slice(5, 7);

    const startDate = oneDayBeforedate.slice(0, 8) + '01';
    const endDate =
      oneDayBeforedate.slice(0, 8) +
      daysInMonth(oneDayBeforedate.slice(5, 7), oneDayBeforedate.slice(0, 4));

    const headerMonth =
      month_dict[oneDayBeforedate.slice(5, 7)] +
      ' ' +
      oneDayBeforedate.slice(0, 4);

    const dates = await getDatesFromDateRange(
      new Date(startDate),
      new Date(endDate),
    );

    const daysInmonth = daysInMonth(
      oneDayBeforedate.slice(5, 7),
      oneDayBeforedate.slice(0, 4),
    );

    const department = await Department.findAll({
      where: {
        companyMasterID: companyMasterID,
        status: 1,
      },
    });

    const allShift = await Shift.findAll({
      where: {
        companyMasterID,
        status: 1,
      },
      include: [
        {
          required: false,
          model: ShiftTime,
        },
      ],
    });

    const wagesfinalData = [],
      stafffinalData = [],
      otherfinalData = [];
    const datesArray = Array.from(
      { length: daysInmonth },
      (_, index) => index + 1,
    );

    const departId = department.map((e) => e.departmentId);

    const employeeDepartment = await EmployeeDepartment.findAll({
      where: {
        departmentID: {
          [Sequelize.Op.in]: departId,
        },
        applicableDate: {
          [Sequelize.Op.lte]: new Date(endDate),
        },
        [Sequelize.Op.or]: [
          {
            endDate: {
              [Sequelize.Op.gte]: new Date(endDate),
            },
          },
          {
            endDate: null,
          },
        ],
        status: 1,
      },
    });

    const allActiveUsersID = employeeDepartment.map((e) => e.userMasterID);

    const allUsers = await EmployeeJoiningDetails.findAll({
      where: {
        joiningDate: {
          [Sequelize.Op.lte]: new Date(endDate),
        },
        [Sequelize.Op.or]: [
          {
            leavingDate: { [Sequelize.Op.gte]: new Date(endDate) },
          },
          {
            leavingDate: { [Sequelize.Op.eq]: null },
            [Sequelize.Op.or]: [
              {
                '$userMaster.deactiveDate$': {
                  [Sequelize.Op.gte]: new Date(endDate),
                },
              },
              {
                '$userMaster.deactiveDate$': { [Sequelize.Op.eq]: null },
              },
            ],
          },
        ],
        userMasterID: allActiveUsersID,
        '$userMaster.status$': 1,
      },
      include: [
        {
          model: UserMaster,
          required: true,
          include: [
            {
              model: EmployeeBranch,
              where: {
                status: 1,
                applicableDate: {
                  [Sequelize.Op.lte]: new Date(endDate),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: {
                      [Sequelize.Op.gte]: new Date(endDate),
                    },
                  },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
                ...(branchids.length > 0 && { branchID: branchids }),
              },
              required: branchids.length > 0,
            },
            {
              model: EmployeeAttendancePolicy,
              where: {
                status: 1,
                startDate: {
                  [Sequelize.Op.lte]: new Date(endDate),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: {
                      [Sequelize.Op.gte]: new Date(endDate),
                    },
                  },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              attributes: ['attendancePolicyID'],
              required: false,
              include: [{ model: AttendancePolicy, as: 'attendancePolicy' }],
            },
            {
              model: EmployeeShift,
              where: {
                status: 1,
                startDate: {
                  [Sequelize.Op.lte]: new Date(endDate),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: {
                      [Sequelize.Op.gte]: new Date(endDate),
                    },
                  },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              required: false,
            },
          ],
        },
      ],
      order: [[{ model: UserMaster }, 'displayName', 'ASC']],
    });

    allUsers.forEach((row) => {
      const deptData = employeeDepartment.find(
        (user) => user.userMasterID === row.userMasterID,
      );
      if (deptData) {
        row.departmentId = deptData.departmentID;
      }
    });

    const allUsersId = allUsers.map((e) => e.userMasterID);

    const usersalaryData = [];

    const [weekOffs, attendanceData, overtimeData, leaveData] =
      await Promise.all([
        weekoffHolidayTran.findAll({
          where: {
            userMasterID: {
              [Sequelize.Op.in]: allUsersId,
            },
            date: {
              [Sequelize.Op.between]: [startDate, endDate],
            },
            [Sequelize.Op.or]: [
              { optionalHoliday: false },
              { optionalHoliday: null },
            ],
          },
        }),

        attendanceTransaction.findAll({
          where: {
            userMasterID: {
              [Sequelize.Op.in]: allUsersId,
            },
            AttendanceDate: {
              [Sequelize.Op.between]: [startDate, endDate],
            },
          },
        }),
        overTimeCalculation.findAll({
          where: {
            UserMasterID: {
              [Sequelize.Op.in]: allUsersId,
            },
            OverTimeDate: {
              [Sequelize.Op.between]: [startDate, endDate],
            },
            AuthorizationRequired: 3,
          },
        }),

        UserLeaveTransaction.findAll({
          where: {
            date: {
              [Sequelize.Op.between]: [startDate, endDate],
            },
            status: 1,
          },
          include: [
            {
              required: true,
              model: UserLeave,
              where: {
                userMasterID: allUsersId,
                authorizationStatus: 3,
                status: 1,
              },
            },
          ],
        }),
      ]);

    for (const dep of department) {
      const otherfinalAmount = [],
        wagesfinalAmount = [],
        stafffinalAmount = [];

      const Wagesfinal = {
        department: dep.departmentName,
        amount: wagesfinalAmount,
      };
      const stafffinal = {
        department: dep.departmentName,
        amount: stafffinalAmount,
      };
      const otherfinal = {
        department: dep.departmentName,
        amount: otherfinalAmount,
      };

      const users = allUsers.filter((e) => e.departmentId == dep.departmentId);

      for (const date of dates) {
        // let totalSalaryAmount = 0;
        let totalWagesSalaryAmount = 0,
          totalStaffSalaryAmount = 0,
          totalOtherAmount = 0;
        const currentDate = date.toISOString().slice(0, 10);

        if (new Date(currentDate) <= new Date(oneDayBeforedate)) {
          const final = await Promise.all(
            users.map(async (user) => {
              const usersalarystoredata = usersalaryData.find(
                (e) => e.userId == user.userMasterID,
              );

              let gross = 0,
                salaryStructureType;

              if (usersalarystoredata) {
                gross = +usersalarystoredata.grossAmount;
                salaryStructureType = usersalarystoredata.salaryStructureType;
              } else {
                const usersalary = await getUserSalaryMasterByMonth(
                  user.userMasterID,
                  month1,
                );

                if (+usersalary.length > 0) {
                  gross =
                    usersalary.find((e) => e.payheadMasterId == 50)
                      ?.EmployeeSalaryAmount || 0;

                  salaryStructureType = usersalary[0].baseOnCalculation;

                  usersalaryData.push({
                    userId: user.userMasterID,
                    grossAmount: +gross,
                    salaryStructureType: salaryStructureType,
                  });
                }
              }

              if (+gross > 0) {
                let todivideSalary = daysInmonth;

                if (user.salaryCalculationAct == 'F') {
                  const userWeekOffSum = weekOffs
                    .filter(
                      (e) =>
                        e.userMasterID == user.userMasterID &&
                        e.tableName == 'weekoff',
                    )
                    .reduce((acc, obj) => acc + +obj.value, 0);

                  todivideSalary = +todivideSalary - +userWeekOffSum;
                }

                let todividePerdaysalary = 0;

                const userWeekoff = weekOffs.find(
                  (e) =>
                    e.userMasterID == user.userMasterID &&
                    e.date == currentDate,
                );

                const attendancePolicy =
                  user.userMaster.employeeAttendancePolicies &&
                  user.userMaster.employeeAttendancePolicies.length > 0
                    ? user.userMaster.employeeAttendancePolicies[0]
                        .attendancePolicy
                    : null;

                if (attendancePolicy) {
                  todividePerdaysalary = +attendancePolicy.overtimeHrs;
                }

                if (salaryStructureType == 'M' || salaryStructureType == 'D') {
                  let oneDaySalary =
                    salaryStructureType == 'M'
                      ? +gross / +todivideSalary
                      : salaryStructureType == 'D'
                        ? +gross
                        : 0;

                  if (userWeekoff) {
                    if (user.salaryCalculationAct == 'S') {
                      if (user.salarytype == 'W')
                        totalWagesSalaryAmount +=
                          +userWeekoff.value * +oneDaySalary;
                      else if (user.salarytype == 'S')
                        totalStaffSalaryAmount +=
                          +userWeekoff.value * +oneDaySalary;
                      else
                        totalOtherAmount += +userWeekoff.value * +oneDaySalary;
                    }
                  } else {
                    const attendance = attendanceData.find(
                      (e) =>
                        e.userMasterID == user.userMasterID &&
                        e.AttendanceDate == currentDate,
                    );

                    if (user.salarytype == 'W')
                      totalWagesSalaryAmount += attendance
                        ? +attendance.fulldayhalfday * +oneDaySalary
                        : 0;
                    else if (user.salarytype == 'S')
                      totalStaffSalaryAmount += attendance
                        ? +attendance.fulldayhalfday * +oneDaySalary
                        : 0;
                    else
                      totalOtherAmount += attendance
                        ? +attendance.fulldayhalfday * +oneDaySalary
                        : 0;
                  }

                  const perminuteSalary =
                    +todividePerdaysalary > 0
                      ? +oneDaySalary / +todividePerdaysalary
                      : +oneDaySalary / 480;

                  const ot = overtimeData.find(
                    (e) =>
                      e.UserMasterID == user.userMasterID &&
                      e.OverTimeDate == currentDate,
                  );

                  if (user.salarytype == 'W')
                    totalWagesSalaryAmount += ot
                      ? +ot.UpdateOverTimeHourAndMin * +perminuteSalary
                      : 0;
                  else if (user.salarytype == 'S')
                    totalStaffSalaryAmount += ot
                      ? +ot.UpdateOverTimeHourAndMin * +perminuteSalary
                      : 0;
                  else
                    totalOtherAmount += ot
                      ? +ot.UpdateOverTimeHourAndMin * +perminuteSalary
                      : 0;

                  const leave = leaveData
                    .filter(
                      (e) =>
                        e.userLeave.userMasterID == user.userMasterID &&
                        e.date == currentDate,
                    )
                    .reduce((acc, obj) => acc + +obj.days, 0);

                  if (user.salarytype == 'W')
                    totalWagesSalaryAmount += +leave * +oneDaySalary;
                  else if (user.salarytype == 'S')
                    totalStaffSalaryAmount += +leave * +oneDaySalary;
                  else totalOtherAmount += +leave * +oneDaySalary;
                }

                if (salaryStructureType == 'H') {
                  let onedaysalary = 0;

                  const userShift =
                    user.userMaster.employeeShifts &&
                    user.userMaster.employeeShifts.length > 0
                      ? user.userMaster.employeeShifts[0]
                      : null;

                  let day = new Date(date).toLocaleString('en-us', {
                    weekday: 'long',
                  });

                  if (userShift) {
                    const shiftData = allShift.find(
                      (e) => e.shiftID == userShift.shiftsID[0],
                    );
                    if (shiftData) {
                      const shift =
                        shiftData.shiftTimes && shiftData.shiftTimes.length > 0
                          ? shiftData.shiftTimes.find((e) => e.day == day)
                          : null;
                      if (shift) onedaysalary = +shift.shiftHrs * +gross;
                    }
                  }

                  if (userWeekoff) {
                    if (user.salaryCalculationAct == 'S') {
                      if (user.salarytype == 'W')
                        totalWagesSalaryAmount +=
                          +userWeekoff.value * +onedaysalary;
                      else if (user.salarytype == 'S')
                        totalStaffSalaryAmount +=
                          +userWeekoff.value * +onedaysalary;
                      else
                        totalOtherAmount += +userWeekoff.value * +onedaysalary;
                    }
                  } else {
                    const attendance = attendanceData.find(
                      (e) =>
                        e.userMasterID == user.userMasterID &&
                        e.AttendanceDate == currentDate,
                    );

                    if (user.salarytype == 'W')
                      totalWagesSalaryAmount += attendance
                        ? +attendance.InHrs * (+gross / 60)
                        : 0;
                    else if (user.salarytype == 'S')
                      totalStaffSalaryAmount += attendance
                        ? +attendance.InHrs * (+gross / 60)
                        : 0;
                    else
                      totalOtherAmount += attendance
                        ? +attendance.InHrs * (+gross / 60)
                        : 0;

                    const leave = leaveData
                      .filter(
                        (e) =>
                          e.userLeave.userMasterID == user.userMasterID &&
                          e.date == currentDate,
                      )
                      .reduce((acc, obj) => acc + +obj.days, 0);

                    if (user.salarytype == 'W')
                      totalWagesSalaryAmount += +leave * +onedaysalary;
                    else if (user.salarytype == 'S')
                      totalStaffSalaryAmount += +leave * +onedaysalary;
                    else totalOtherAmount += +leave * +onedaysalary;
                  }
                }
              }
              return;
            }),
          );

          totalWagesSalaryAmount = totalWagesSalaryAmount
            ? Number.isInteger(+totalWagesSalaryAmount)
              ? +(+totalWagesSalaryAmount).toFixed(0)
              : +(+totalWagesSalaryAmount) % 1 === 0.2
                ? +(+totalWagesSalaryAmount).toFixed(1)
                : +(+totalWagesSalaryAmount).toFixed(2)
            : 0;

          totalStaffSalaryAmount = totalStaffSalaryAmount
            ? Number.isInteger(+totalStaffSalaryAmount)
              ? +(+totalStaffSalaryAmount).toFixed(0)
              : +(+totalStaffSalaryAmount) % 1 === 0.2
                ? +(+totalStaffSalaryAmount).toFixed(1)
                : +(+totalStaffSalaryAmount).toFixed(2)
            : 0;

          totalOtherAmount = totalOtherAmount
            ? Number.isInteger(+totalOtherAmount)
              ? +(+totalOtherAmount).toFixed(0)
              : +(+totalOtherAmount) % 1 === 0.2
                ? +(+totalOtherAmount).toFixed(1)
                : +(+totalOtherAmount).toFixed(2)
            : 0;
        }
        wagesfinalAmount.push(totalWagesSalaryAmount);
        stafffinalAmount.push(totalStaffSalaryAmount);
        otherfinalAmount.push(totalOtherAmount);
      }

      wagesfinalData.push(Wagesfinal);
      stafffinalData.push(stafffinal);
      otherfinalData.push(otherfinal);
    }

    const finalData = [];

    finalData.push(wagesfinalData, stafffinalData, otherfinalData);

    if (+finalData.length === 0) {
      return res.status(200).json({
        message: 'No data found to export!',
      });
    }

    const wagessumArray = Array.from(
      { length: wagesfinalData[0].amount.length },
      () => 0,
    );

    // Calculate the sum of amounts index-wise
    wagesfinalData.forEach((department) => {
      department.amount.forEach((amount, index) => {
        wagessumArray[index] += amount;
      });
    });

    const staffsumArray = Array.from(
      { length: stafffinalData[0].amount.length },
      () => 0,
    );

    // Calculate the sum of amounts index-wise
    stafffinalData.forEach((department) => {
      department.amount.forEach((amount, index) => {
        staffsumArray[index] += amount;
      });
    });

    const othersumArray = Array.from(
      { length: otherfinalData[0].amount.length },
      () => 0,
    );

    // Calculate the sum of amounts index-wise
    otherfinalData.forEach((department) => {
      department.amount.forEach((amount, index) => {
        othersumArray[index] += amount;
      });
    });

    const filePath = await generateExcelForDailyCostReportMail(
      headerMonth,
      datesArray,
      finalData,
      wagessumArray,
      staffsumArray,
      othersumArray,
      ['Wages', 'Staff', 'Others'],
      userMasterID,
      'PerDayCost',
    );

    return filePath;
  } catch (error) {
    addLogToMailCronFile(
      `${new Date().toLocaleString()} ===> Ran into an error while generatin Attendance Excel\n ${err}`,
    );
  }
}

async function getMailTemplate(companyMasterID, templateID) {
  const get_MailTemplate = await mailTemplateEditor.findOne({
    where: {
      companyMasterID: companyMasterID,
      status: 1,
      mailTypeID: templateID,
    },
  });
  return get_MailTemplate;
}

async function getUserData(userId) {
  const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
  const getUserDetails = await UserMaster.findAll({
    where: { userMasterID: userId },
    attributes: ['firstName', 'lastName', 'displayName'],
    include: [
      {
        required: false,
        model: EmployeeJoiningDetails,
        attributes: ['employeeCode'],
      },
      {
        required: false,
        model: EmployeeBranch,
        where: {
          status: 1,
          applicableDate: {
            [Sequelize.Op.lte]: new Date(currentDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: { [Sequelize.Op.gte]: new Date(currentDate) },
            },
            {
              endDate: { [Sequelize.Op.eq]: null },
            },
          ],
        },
        attributes: ['branchID'],
        include: [
          {
            model: BranchMaster,
            as: 'branchMaster',
            attributes: ['branchName'],
          },
        ],
      },
      {
        required: false,
        model: EmployeeDepartment,
        attributes: ['departmentID'],
        where: {
          status: 1,
          applicableDate: {
            [Sequelize.Op.lte]: new Date(currentDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: { [Sequelize.Op.gte]: new Date(currentDate) },
            },
            {
              endDate: { [Sequelize.Op.eq]: null },
            },
          ],
        },
        include: [
          {
            model: Department,
            as: 'department',
            attributes: ['departmentName'],
          },
        ],
      },
      {
        required: false,
        model: EmployeeDesignation,
        attributes: ['designationID'],
        where: {
          status: 1,
          applicableDate: {
            [Sequelize.Op.lte]: new Date(currentDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: { [Sequelize.Op.gte]: new Date(currentDate) },
            },
            {
              endDate: { [Sequelize.Op.eq]: null },
            },
          ],
        },
        include: [
          {
            model: Designation,
            as: 'designation',
            attributes: ['designationName'],
          },
        ],
      },
    ],
  });
  return getUserDetails;
}

async function getTemplateForEmail(template, userData) {
  const empJoining =
    userData &&
    userData.employeeJoiningDetails &&
    userData.employeeJoiningDetails.length > 0
      ? userData.employeeJoiningDetails[0]
      : '';
  const empBranch =
    userData && userData.employeeBranchs && userData.employeeBranchs.length > 0
      ? userData.employeeBranchs[0]
      : '';
  const empDepart =
    userData &&
    userData.employeeDepartments &&
    userData.employeeDepartments.length > 0
      ? userData.employeeDepartments[0]
      : '';
  const empDesig =
    userData &&
    userData.employeeDesignations &&
    userData.employeeDesignations.length > 0
      ? userData.employeeDesignations[0]
      : '';

  template.subject = template.subject
    .replace('[EmployeeCode]', empJoining ? empJoining.employeeCode : '')
    .replace('[EmployeeName]', userData ? userData.displayName : '')
    .replace(
      '[Branch]',
      empBranch && empBranch.branchMaster
        ? empBranch.branchMaster.branchName
        : '',
    )
    .replace(
      '[Department]',
      empDepart && empDepart.department
        ? empDepart.department.departmentName
        : '',
    )
    .replace(
      '[Designation]',
      empDesig && empDesig.designation
        ? empDesig.designation.designationName
        : '',
    );

  template.body = template.body
    .replace('[EmployeeCode]', empJoining ? empJoining.employeeCode : '')
    .replace('[EmployeeName]', userData ? userData.displayName : '')
    .replace(
      '[Branch]',
      empBranch && empBranch.branchMaster
        ? empBranch.branchMaster.branchName
        : '',
    )
    .replace(
      '[Department]',
      empDepart && empDepart.department
        ? empDepart.department.departmentName
        : '',
    )
    .replace(
      '[Designation]',
      empDesig && empDesig.designation
        ? empDesig.designation.designationName
        : '',
    );
  return template;
}

async function birthdayWish(companyMasterID, userID) {
  const template = await getMailTemplate(companyMasterID, 25);
  const userData = await getUserData(userID);
  const { body, subject } = await getTemplateForEmail(template, userData[0]);

  if (body && subject) {
    return { subject, body };
  } else {
    return null;
  }
}

async function workAnniversaryWish(companyMasterID, userID) {
  const template = await getMailTemplate(companyMasterID, 26);
  const userData = await getUserData(userID);
  const { body, subject } = await getTemplateForEmail(template, userData[0]);

  if (body && subject) {
    return { subject, body };
  } else {
    return null;
  }
}

async function sendAutoMail(payload, mailFilePath) {
  try {
    // Log the payload for debugging purposes
    if (payload && payload.emailID.length) {
      // Create a transporter for Gmail
      const gmailTransporterForTP = nodemailer.createTransport({
        host: payload.host, // Gmail Host
        port: payload.port, // Port
        secure: payload.secure, // This is true as port is 465
        auth: {
          user: payload.email, // Sender's email
          pass: payload.password, // Sender's password
        },
      });

      // Define email options
      const mailOptions = {
        from: payload.email, // Sender's email address
        to: payload.emailID.join(', '), // All Recipient's email address
        subject: payload.subject, // Subject of the email
        html: payload.body, // Plain text body (can be empty as we are using attachments)
        attachments:
          payload.attachments && payload.attachments.length > 0
            ? payload.attachments
            : payload.fileName && payload.fileName
              ? [{ filename: payload.fileName, path: payload.filePath }]
              : '',
      };

      // Send email
      const result = await gmailTransporterForTP.sendMail(mailOptions);

      // Delete file

      if (fs.existsSync(mailFilePath)) {
        if (mailFilePath) {
          fs.unlink(mailFilePath, function (err) {
            if (err) console.error(err);
          });
        }
      }

      // Log the result

      // Return the result indicating success
      return { status: 1, message: 'Email sent successfully' };
    }
  } catch (error) {
    // Delete file
    if (fs.existsSync(mailFilePath)) {
      if (mailFilePath) {
        fs.unlink(mailFilePath, function (err) {
          if (err) console.error(err);
        });
      }
    }

    // Log any errors that occur during the process

    addLogToMailCronFile(
      `${new Date().toLocaleString()} ===> Error while Sending Mail\n${error}`,
    );
  }
}
const formatMomentDate = (date) => moment(date).format('DD-MM-YYYY');

const buildFileName = (type, fromDate, toDate, isRange = true) => {
  const name = mailCronNameObj[type] || 'Report';

  if (!isRange) {
    return `${name} ${formatMomentDate(fromDate)}`;
  }

  return `${name} ${formatMomentDate(fromDate)} to ${formatMomentDate(toDate)}`;
};

const addCompanyPrefix = (type, companyName, fileName) => {
  // Skip prefix for this specific type
  if (type === mailCronTypes.SHIFT_DEPARTMENTWISE_ATTENDANCE_COUNT_REPORT) {
    return fileName;
  }

  return `${companyName} - ${fileName}`;
};
const REPORT_HANDLERS = {
  [mailCronTypes.ATTENDANCE_REPORT]: generateAttendanceReport,
  [mailCronTypes.LEAVE_REPORT]: generateLeaveReport,
  [mailCronTypes.DAILY_PUNCH_IN_OUT]: generateAttendanceReport,
  [mailCronTypes.DAILY_LEAVE]: generateLeaveReport,
  [mailCronTypes.VISIT_REPORT]: generateVisitReport,
  [mailCronTypes.DAILY_VISIT_REPORT]: generateVisitReport,
  [mailCronTypes.SHIFT_DEPARTMENTWISE_ATTENDANCE_COUNT_REPORT]:
    shiftDepartmentWiseDailyAttendanceCountReport,
  [mailCronTypes.FY_LEAVE_REPORT]: FYLeaveReport,
  [mailCronTypes.LC_EG_REPORT]: lateComeEarlyGoReport,
  [mailCronTypes.DEPARTMENTWISE_DAILY_COST_REPORT]:
    departmentwiseDailyCostReport,
  [mailCronTypes.BIRTHDAY]: birthdayWish,
  [mailCronTypes.WORK_ANNIVERSARY]: workAnniversaryWish,
  [mailCronTypes.MISS_PUNCH_REPORT]: missPunchReport,
  [mailCronTypes.DAILY_PHYSICAL_PRESENT_ABSENT_REPORT]:
    dailyPhysicalPresentAbsentReport,
  [mailCronTypes.PREVIOUS_DAY_PHYSICAL_PRESENT_ABSENT_REPORT]:
    dailyPhysicalPresentAbsentReport,
};
const NO_ATTACHMENT_TYPES = new Set([
  mailCronTypes?.BIRTHDAY,
  mailCronTypes?.WORK_ANNIVERSARY,
]);
// ✅ COMMON REPORT TYPES
const COMMON_REPORTS = new Set([
  mailCronTypes.ATTENDANCE_REPORT,
  mailCronTypes.LEAVE_REPORT,
  mailCronTypes.VISIT_REPORT,
  mailCronTypes.SHIFT_DEPARTMENTWISE_ATTENDANCE_COUNT_REPORT,
  mailCronTypes.FY_LEAVE_REPORT,
  mailCronTypes.LC_EG_REPORT,
  mailCronTypes.DEPARTMENTWISE_DAILY_COST_REPORT,
  mailCronTypes.MISS_PUNCH_REPORT,
]);
const SPECIAL_DAILY = new Set([
  mailCronTypes.DAILY_PUNCH_IN_OUT,
  mailCronTypes.DAILY_LEAVE,
  mailCronTypes.DAILY_PHYSICAL_PRESENT_ABSENT_REPORT,
  mailCronTypes.DAILY_VISIT_REPORT,
]);
const SPECIAL_PREVIOUS_DAY_DAILY = new Set([
  mailCronTypes.PREVIOUS_DAY_PHYSICAL_PRESENT_ABSENT_REPORT,
]);
const getBirthAndWorkAnniversayUsersByDateField = async (companyId, field) => {
  try {
    const today = moment().tz('Asia/Kolkata');
    const month = Number(today.format('MM'));
    const day = Number(today.format('DD'));

    const users = await UserMaster.findAll({
      where: { companyMasterId: companyId, status: 1 },
      attributes: ['userMasterID'],
      include: [
        {
          model: EmployeeJoiningDetails,
          required: true,
          where: Sequelize.and(
            Sequelize.where(
              Sequelize.fn(
                'EXTRACT',
                Sequelize.literal(`MONTH FROM NULLIF(${field}, '')::DATE`),
              ),
              month,
            ),
            Sequelize.where(
              Sequelize.fn(
                'EXTRACT',
                Sequelize.literal(`DAY FROM NULLIF(${field}, '')::DATE`),
              ),
              day,
            ),
          ),
          attributes: [],
        },
      ],
    });

    return users || [];
  } catch (error) {
    console.error(
      `Error in getBirthAndWorkAnniversayUsersByDateField (field: ${field})`,
      error,
    );

    // optional: log to file if you have logger
    addLogToMailCronFile(`Error in birthday/anniversary: ${error.message}`);

    return []; // ✅ prevent crash in cron
  }
};

const addLogToMailCronFile = (msg) =>
  setImmediate(() => accessLogStream.write(msg));

async function missPunchReport(
  companyMasterID,
  userMasterID,
  fromDate,
  toDate,
  FileName,
) {
  try {
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const branchids = await getUserAccessibleBranches(userMasterID);
    const allActiveUsers = await UserMaster.findAll({
      where: {
        companyMasterId: companyMasterID,
        status: 1,
      },
      order: [['displayName', 'ASC']],
      attributes: ['userMasterID', 'displayName', 'userNumber'],
      include: [
        {
          required: false,
          model: EmployeeJoiningDetails,
          as: 'emp_join',
        },
        {
          required: branchids.length > 0,
          model: EmployeeBranch,
          as: 'emp_branch',
          where: {
            status: 1,
            ...(branchids.length > 0 && {
              branchID: branchids,
            }),
            applicableDate: {
              [Sequelize.Op.lte]: new Date(toDate),
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: new Date(toDate),
                },
              },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          include: [
            {
              model: BranchMaster,
              as: 'branchMaster',
              attributes: ['branchName'],
            },
          ],
        },
        {
          required: false,
          model: EmployeeDepartment,
          as: 'emp_dept',
          where: {
            status: 1,
            applicableDate: {
              [Sequelize.Op.lte]: new Date(filterDate),
            },
            [Sequelize.Op.or]: [
              {
                endDate: { [Sequelize.Op.gte]: new Date(filterDate) },
              },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },

          attributes: ['departmentID'],
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['departmentName'],
            },
          ],
        },
        {
          required: false,
          model: EmployeeDesignation,
          as: 'emp_desig',
          where: {
            status: 1,
            applicableDate: {
              [Sequelize.Op.lte]: filterDate,
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: filterDate,
                },
              },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: ['designationID'],
          include: [
            {
              model: Designation,
              as: 'designation',
              attributes: ['designationName'],
            },
          ],
        },
        {
          required: false,
          model: EmployeeDivision,
          as: 'emp_div',
          where: {
            status: 1,
            startDate: { [Sequelize.Op.lte]: filterDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: filterDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },

          attributes: ['divisionId', 'startDate'],
          include: [
            {
              model: Division,
              attributes: ['divisionName'],
            },
          ],
        },
        {
          required: false,
          model: EmployeeWorkingArea,
          as: 'emp_area',
          where: {
            status: 1,
            startDate: { [Sequelize.Op.lte]: filterDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: filterDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: ['workingAreaId', 'startDate'],
          include: [
            {
              model: WorkingArea,
              attributes: ['workingAreaName'],
            },
          ],
        },
      ],
    });
    const userMap = new Map();
    const allUserIDs = [];
    for (const user of allActiveUsers) {
      allUserIDs.push(user.userMasterID);
      userMap.set(user.userMasterID, user);
    }
    const condition = {
      userMasterID: allUserIDs,
      OutDateTime: { [Sequelize.Op.eq]: null },
      AttendanceDate: {
        [Sequelize.Op.between]: [new Date(fromDate), new Date(toDate)],
        [Sequelize.Op.ne]: new Date().toISOString().slice(0, 10),
      },
    };
    const AttendanceData = await attendanceTransaction.findAll({
      where: condition,
      order: [['AttendanceDate', 'ASC']],
      attributes: [
        'userMasterID',
        'InDatetime',
        'OutDateTime',
        'AttendanceDate',
        'AttendanceTransID',
        'Shifthrs',
        'Shift',
        'ShiftIntime',
        'ShiftoutTime',
      ],
      include: [{ model: Shift, attributes: ['shiftName'] }],
    });
    const finalData = [];

    for (const item of AttendanceData) {
      const user = userMap.get(item.userMasterID); // 👈 FIX

      if (!user) continue; // safety
      const tempObj = {
        'Employee Code': parseEmployeeInfoAlias(user)?.employeeCode,
        'User Name': user?.displayName,
        'Mobile Number': user?.userNumber,
        Branch: parseEmployeeInfoAlias(user)?.branch,
        Department: parseEmployeeInfoAlias(user)?.department,
        Designation: parseEmployeeInfoAlias(user)?.designation,
        Division: parseEmployeeInfoAlias(user)?.division,
        'Working Area': parseEmployeeInfoAlias(user)?.workingArea,
        'Joining Date': user?.emp_join?.[0]?.joiningDate
          ? moment(user.emp_join[0].joiningDate).format('DD-MM-YYYY')
          : '',
        'Attendance Date': item.AttendanceDate
          ? moment(item.AttendanceDate).format('DD-MM-YYYY')
          : '',
        Shift: item.shift?.shiftName,
        'Shift Hours': item.Shifthrs,
        'Shift In Time': item.ShiftIntime,
        'Shift Out Time': item.ShiftoutTime,
        'In Date Time': item.InDatetime
          ? moment(item.InDatetime).format('DD-MM-YYYY HH:mm:ss')
          : '',
        'Out Date Time': '',
      };
      finalData.push(tempObj);
    }
    if (finalData.length === 0) {
      finalData.push({
        Message: 'No Miss Punch Data Found',
        'From Date': moment(fromDate).format('DD-MM-YYYY'),
        'To Date': moment(toDate).format('DD-MM-YYYY'),
      });
    }
    const exportDir = path.join(__dirname, `../uploads/missPuncReoprtMail`);
    const filePath = path.join(exportDir, `${FileName}.xlsx`);

    return await generateExcel(finalData, FileName, 'xlsx', null, {
      saveToFile: true,
      filePath,
    });
  } catch (error) {
    addLogToMailCronFile('missPunchReport', error);
  }
}
async function getUserAccessibleBranches(userMasterID) {
  try {
    const role = await UserRole.findOne({
      where: { userMasterID },
      attributes: [], // reduce payload
      include: [
        {
          model: RoleMaster,
          attributes: ['roleMasterID', 'roleType'],
          include: [
            {
              model: RoleMasterBranchWise,
              attributes: ['branchMasterID'],
            },
          ],
        },
      ],
    });

    if (
      role?.roleMaster?.roleType === 'branchWise' &&
      role.roleMaster.roleMasterBranchWises?.length
    ) {
      return role.roleMaster.roleMasterBranchWises.map((e) => e.branchMasterID);
    }

    return []; // always return array
  } catch (error) {
    console.error('Error in getUserAccessibleBranches:', error);
    return []; // safe fallback
  }
}

async function dailyPhysicalPresentAbsentReport(
  companyMasterID,
  userMasterID,
  fromDate,
  toDate,
  FileName,
) {
  try {
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const branchids = await getUserAccessibleBranches(userMasterID);

    // =========================
    // ✅ FETCH USERS
    // =========================
    const allActiveUsers = await UserMaster.findAll({
      where: {
        companyMasterId: companyMasterID,
        status: 1,
      },
      order: [['displayName', 'ASC']],
      attributes: ['userMasterID', 'displayName', 'userNumber'],
      include: [
        {
          model: EmployeeJoiningDetails,
          as: 'emp_join',
          attributes: ['employeeCode'],
        },
        {
          required: branchids.length > 0,
          model: EmployeeBranch,
          as: 'emp_branch',
          where: {
            status: 1,
            ...(branchids.length > 0 && { branchID: branchids }),
            applicableDate: { [Sequelize.Op.lte]: new Date(toDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(toDate) } },
              { endDate: null },
            ],
          },
          include: [
            {
              model: BranchMaster,
              as: 'branchMaster',
              attributes: ['branchName'],
            },
          ],
        },
        {
          required: false,
          model: EmployeeDepartment,
          as: 'emp_dept',
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
              { endDate: null },
            ],
          },
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['departmentName'],
            },
          ],
        },
        {
          required: false,
          model: EmployeeDesignation,
          as: 'emp_desig',
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
              { endDate: null },
            ],
          },
          include: [
            {
              model: Designation,
              as: 'designation',
              attributes: ['designationName'],
            },
          ],
        },
        {
          required: false,
          model: EmployeeDivision,
          as: 'emp_div',
          where: {
            status: 1,
            startDate: { [Sequelize.Op.lte]: new Date(filterDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
              { endDate: null },
            ],
          },
          include: [
            {
              model: Division,
              attributes: ['divisionName'],
            },
          ],
        },
        {
          required: false,
          model: EmployeeWorkingArea,
          as: 'emp_area',
          where: {
            status: 1,
            startDate: { [Sequelize.Op.lte]: new Date(filterDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
              { endDate: null },
            ],
          },
          include: [
            {
              model: WorkingArea,
              attributes: ['workingAreaName'],
            },
          ],
        },
      ],
    });

    // =========================
    // ✅ MAP USERS
    // =========================
    const userMap = new Map();
    const allUserIDs = [];

    for (const user of allActiveUsers) {
      userMap.set(user.userMasterID, user);
      allUserIDs.push(user.userMasterID);
    }

    // =========================
    // ✅ FETCH ATTENDANCE
    // =========================
    const attendanceRows = await attendanceTransaction.findAll({
      where: {
        userMasterID: allUserIDs,
        AttendanceDate: {
          [Sequelize.Op.between]: [new Date(fromDate), new Date(toDate)],
        },
      },
      attributes: [
        'userMasterID',
        'InDatetime',
        'OutDateTime',
        'roundOffMinutes',
      ],
      raw: true,
    });

    // =========================
    // ✅ BUILD ATTENDANCE MAP
    // =========================
    const attendanceMap = new Map();

    for (const row of attendanceRows) {
      const existing = attendanceMap.get(row.userMasterID);

      if (existing) continue;
      const roundOffMinutes = row.roundOffMinutes ? +row.roundOffMinutes : 0;
      const roundOffHours = row.roundOffMinutes
        ? minutesToHoursMinutes(roundOffMinutes || 0)
        : 0;
      attendanceMap.set(row.userMasterID, {
        inTime: row.InDatetime,
        outTime: row.OutDateTime,
        roundOffMinutes: roundOffMinutes,
        roundOffHours: roundOffHours,
      });
    }

    // =========================
    // ✅ PREPARE DATA
    // =========================
    const presentUserData = [];
    const absentUserData = [];

    for (const userID of allUserIDs) {
      const userData = userMap.get(userID);
      if (!userData) continue;

      const parsed = parseEmployeeInfoAlias(userData);
      const attendance = attendanceMap.get(userID);

      const baseObj = {
        'Employee Code': parsed?.employeeCode,
        'Employee Name': userData.displayName,
        Number: userData.userNumber,
        Branch: parsed?.branch,
        Department: parsed?.department,
        Designation: parsed?.designation,
        Division: parsed?.division,
        'Working Area': parsed?.workingArea,
      };

      if (attendance) {
        presentUserData.push({
          ...baseObj,
          'Attendance In Time': attendance.inTime
            ? moment(attendance.inTime).format('DD-MM-YYYY HH:mm:ss')
            : '',
          'Attendance Out Time': attendance.outTime
            ? moment(attendance.outTime).format('DD-MM-YYYY HH:mm:ss')
            : '',
          'Working Hours': attendance.roundOffHours,
        });
      } else {
        absentUserData.push(baseObj);
      }
    }

    // =========================
    // ✅ FILE GENERATION
    // =========================
    const exportDir = path.join(
      __dirname,
      '../uploads/dailyPhysicalPresentAbsentReport',
    );

    const uniqueFileName = `${FileName}-${Date.now()}.xlsx`;
    const filePath = path.join(exportDir, uniqueFileName);
    if (presentUserData.length === 0) {
      presentUserData.push({
        Message: `No Present Employees Found For ${moment(fromDate).format('DD-MM-YYYY')}`,
      });
    }
    if (absentUserData.length === 0) {
      absentUserData.push({
        Message: `No Absent Employees Found For ${moment(fromDate).format('DD-MM-YYYY')}`,
      });
    }
    return await generateDailyPhysicalPresentAbsentReportExcel(
      presentUserData,
      absentUserData,
      filePath,
      fromDate,
    );
  } catch (error) {
    addLogToMailCronFile('dailyPhysicalPresentAbsentReport', error);
    throw error;
  }
}

const ReportMailCron = async (companyCronSetup, type) => {
  let cronUserIDs = companyCronSetup.userMasterID || [];

  const [findNotificationPolicy, findCompany] = await Promise.all([
    findCompanyNotificationPolicy(+companyCronSetup.companyMasterID),
    companyMaster.findOne({
      raw: true,
      where: { companyMasterID: +companyCronSetup.companyMasterID },
      attributes: ['companyMasterID', 'companyName'],
    }),
  ]);
  if (!findNotificationPolicy) return;

  let fromDate, toDate, FileName;

  const isCommonReport = COMMON_REPORTS.has(type);

  const today = moment();

  if (SPECIAL_DAILY.has(type)) {
    fromDate = today.clone();
    toDate = today.clone();
    FileName = buildFileName(
      type,
      fromDate.format('YYYY-MM-DD'),
      toDate.format('YYYY-MM-DD'),
      false,
    );
  } else if (SPECIAL_PREVIOUS_DAY_DAILY.has(type)) {
    fromDate = today.clone().subtract(1, 'day');
    toDate = fromDate.clone();

    FileName = buildFileName(
      type,
      fromDate.format('YYYY-MM-DD'),
      toDate.format('YYYY-MM-DD'),
      false,
    );
  } else {
    switch (companyCronSetup.mailMode) {
      case 'monthly':
        if (today.date() !== +companyCronSetup.day) return;
        fromDate = today.clone().subtract(1, 'month');
        toDate = today.clone().subtract(1, 'day');
        break;

      case 'weekly':
        if ((today.day() || 7) !== +companyCronSetup.day) return;
        fromDate = today.clone().subtract(7, 'days');
        toDate = today.clone().subtract(1, 'day');
        break;

      case 'daily':
        fromDate = today.clone().subtract(1, 'day');
        toDate = fromDate.clone();
        break;
    }

    if (isCommonReport && fromDate && toDate) {
      FileName = buildFileName(
        type,
        fromDate.format('YYYY-MM-DD'),
        toDate.format('YYYY-MM-DD'),
        companyCronSetup.mailMode !== 'daily',
      );
    }
  }
  // ✅ ADD COMPANY NAME (CLEAN WAY)
  if (FileName && findCompany?.companyName) {
    FileName = addCompanyPrefix(type, findCompany?.companyName, FileName);
  }
  if (type == mailCronTypes.BIRTHDAY) {
    const users = await getBirthAndWorkAnniversayUsersByDateField(
      companyCronSetup.companyMasterID,
      `"employeeJoiningDetails"."dob"`,
    );
    cronUserIDs = users.map((u) => u.userMasterID) || [];
  } else if (type == mailCronTypes.WORK_ANNIVERSARY) {
    const users = await getBirthAndWorkAnniversayUsersByDateField(
      companyCronSetup.companyMasterID,
      `"employeeJoiningDetails"."joiningDate"`,
    );
    cronUserIDs = users.map((u) => u.userMasterID) || [];
  }
  if (!cronUserIDs.length) {
    addLogToMailCronFile(`No users found for cron type: ${type}`);
    return;
  }
  const existing = cron
    .getTasks()
    .get(`mail-${type}-${companyCronSetup.companyMasterID}`);
  if (existing) {
    addLogToMailCronFile(
      `Cron already exists: mail-${type}-${companyCronSetup.companyMasterID}`,
    );
    return;
  }
  const MailData = {
    type,
    time: companyCronSetup.time,
    date: today.format('YYYY-MM-DD'),
    users: cronUserIDs.map((item) => +item),
    cronExpression: generateCronExpression(companyCronSetup.time),
    metadata: {
      fromDate: moment(fromDate).format('YYYY-MM-DD'),
      toDate: moment(toDate).format('YYYY-MM-DD'),
    },
  };

  const createCron = await MailCrons.create(MailData);

  cron.schedule(
    MailData.cronExpression,
    async (cronRunTime) => {
      await getProcessCron(createCron.id, cronRunTime);
    },
    { name: `mail-${type}-${companyCronSetup.companyMasterID}` },
  );
  addLogToMailCronFile(
    `${new Date().toLocaleString()} ===> cron scheduled to run crons for ${type} mail\n`,
  );

  async function getProcessCron(mail_CronID, cronRunTime) {
    const mailCron = await MailCrons.findOne({
      where: {
        id: mail_CronID,
        status: 'SCHEDULED',
      },
    });
    if (!mailCron) {
      return addLogToMailCronFile(
        `${new Date().toLocaleString()} ===> No Mail cron found to be run at:  ${cronRunTime}\n`,
      );
    }
    try {
      const userData = await UserMaster.findAll({
        where: {
          userMasterID: mailCron.users,
          status: 1,
          email: {
            [Op.and]: [
              { [Op.ne]: null }, // not null
              { [Op.ne]: '' }, // not empty string
            ],
          },
        },
        attributes: ['userMasterID', 'email', 'companyMasterId'],
      });

      const handler = REPORT_HANDLERS[type] || null;
      if (!handler) {
        addLogToMailCronFile(`No handler found for type: ${type}`);
        return;
      }
      for (const user of userData) {
        if (!user?.email) continue;
        const mailFilePath = await handler(
          companyCronSetup.companyMasterID,
          user.userMasterID,
          moment(mailCron.metadata?.fromDate || fromDate).format('YYYY-MM-DD'),
          moment(mailCron.metadata?.toDate || toDate).format('YYYY-MM-DD'),
          FileName,
        );
        if (!mailFilePath) continue;
        let zipURL;
        let visitAttachments = [];
        console.log('if condition checking generateVisitReportZipByDateRange');
        if (
          type == mailCronTypes.VISIT_REPORT ||
          type == mailCronTypes.DAILY_VISIT_REPORT
        ) {
          console.log(
            'inside if condition generateVisitReportZipByDateRange functiona called',
          );
          const result = await generateVisitReportZipByDateRange(
            moment(mailCron.metadata?.fromDate).format('YYYY-MM-DD'),
            moment(mailCron.metadata?.toDate).format('YYYY-MM-DD'),
            companyCronSetup.companyMasterID,
          );
          if (result) {
            zipURL = result.url;
            visitAttachments = result.files || [];
          }
        }
        let subject = FileName;
        let body = `Please find the Attached ${FileName}`;
        console.log(`zip url:- ${zipURL}`);
        if (zipURL) {
          body += ` 
          
          Please find your visit report at the following URL:- ${zipURL}`;
        }
        let fileName = `${FileName}.xlsx`;

        if (NO_ATTACHMENT_TYPES.has(type)) {
          subject = mailFilePath?.subject;
          body = mailFilePath?.body;
          fileName = null;
        }

        const attachments = [];
        if (fileName && mailFilePath) {
          attachments.push({ filename: fileName, path: mailFilePath });
        }
        if (visitAttachments && visitAttachments.length > 0) {
          attachments.push(...visitAttachments);
        }

        console.log(`Mail Body:- ${body}`);
        sendAutoMail(
          {
            emailID: [user.email],
            subject,
            body,
            email: findNotificationPolicy.email,
            password: findNotificationPolicy.password,
            port: findNotificationPolicy.port,
            host: findNotificationPolicy.hostmail,
            attachments,
            secure: findNotificationPolicy.secure,
          },
          mailFilePath,
        );
      }

      mailCron.status = 'COMPLETED';
      await mailCron.save();
    } catch (error) {
      addLogToMailCronFile(
        `${new Date().toLocaleString()} ===> Ran into an error while running ${type} cron at ${cronRunTime}\n${error}`,
      );
      mailCron.status = 'ERROR';
      await mailCron.save();
    }
  }
};

const clearNotificationCrons = () => {
  const tasks = cron.getTasks();

  tasks.forEach((task, key) => {
    if (key && key.startsWith('mail-')) {
      addLogToMailCronFile(
        `${new Date().toLocaleString()} ===> Found already scheduled job and stopping it: ${key}\n`,
      );

      task.stop(); // Stop execution
      tasks.delete(key); // 🔥 Remove from memory``

      addLogToMailCronFile(
        `${new Date().toLocaleString()} ===> Successfully removed cron: ${key}\n`,
      );
    }
  });
};
exports.scheduleMail = async () => {
  try {
    await MailCrons.destroy({ where: {} });
    clearNotificationCrons();

    let companyMails = await AutoMailSetup.findAll({
      where: {
        [Op.or]: [
          { mailType: mailCronTypes.ATTENDANCE_REPORT },
          { mailType: mailCronTypes.LEAVE_REPORT },
          { mailType: mailCronTypes.DAILY_PUNCH_IN_OUT },
          { mailType: mailCronTypes.DAILY_LEAVE },
          { mailType: mailCronTypes.VISIT_REPORT },
          { mailType: mailCronTypes.DAILY_VISIT_REPORT },
          {
            mailType:
              mailCronTypes.SHIFT_DEPARTMENTWISE_ATTENDANCE_COUNT_REPORT,
          },
          {
            mailType: mailCronTypes.FY_LEAVE_REPORT,
          },
          {
            mailType: mailCronTypes.LC_EG_REPORT,
          },
          {
            mailType: mailCronTypes.DEPARTMENTWISE_DAILY_COST_REPORT,
          },
          {
            mailType: mailCronTypes.BIRTHDAY,
          },
          {
            mailType: mailCronTypes.WORK_ANNIVERSARY,
          },
          {
            mailType: mailCronTypes.MISS_PUNCH_REPORT,
          },
          {
            mailType: mailCronTypes.DAILY_PHYSICAL_PRESENT_ABSENT_REPORT,
          },
          {
            mailType: mailCronTypes.PREVIOUS_DAY_PHYSICAL_PRESENT_ABSENT_REPORT,
          },
        ],
        status: 1,
      },
      raw: true,
    });

    if (!companyMails.length) {
      throw new Error('No Mail setup found!');
    }

    for (let mail_Cron of companyMails) {
      await ReportMailCron(mail_Cron, mail_Cron.mailType);
    }
  } catch (error) {
    addLogToMailCronFile(
      `${new Date().toLocaleString()} ===> 'Something went wrong while running cron of setting up notifications!',\n,${error}\n`,
    );
  }
};

exports.setupPunchInPunchoutCron = async (req, res, next) => {
  await this.scheduleMail();
};

/**
 * Generates a ZIP of all visit report files (local or S3) for a given date range.
 * Uploads it (S3) or saves it (local) and returns the public URL.
 * Returns null if no files were found, so that the URL won't be sent in the email.
 */
async function generateVisitReportZipByDateRange(
  fromDate,
  toDate,
  companyMasterID,
) {
  const startTime = Date.now();

  try {
    console.log(
      `[VisitReportZip] Started | fromDate=${fromDate} | toDate=${toDate} | companyMasterID=${companyMasterID}`,
    );

    if (!fromDate || !toDate || !companyMasterID) {
      console.error(
        '[VisitReportZip] Validation Failed - Missing required parameters',
        {
          fromDate,
          toDate,
          companyMasterID,
        },
      );
      return null;
    }

    const zip = new JSZip();
    const filesList = [];
    const uniqueVisits = new Set();

    // Generate date range
    const dates = [];
    let current = moment(fromDate, 'YYYY-MM-DD');
    const end = moment(toDate, 'YYYY-MM-DD');
    while (current.isSameOrBefore(end, 'day')) {
      dates.push(current.format('YYYY-MM-DD'));
      current.add(1, 'day');
    }

    console.log(
      `[VisitReportZip] Date range generated. Total dates=${dates.length}`,
      dates,
    );

    if (dates.length === 0) {
      console.error('[VisitReportZip] No valid dates found');
      return null;
    }

    let totalFiles = 0;

    console.log(
      `[VisitReportZip] Storage Mode = ${
        isStoreFileToS3Bucket ? 'S3' : 'LOCAL'
      }`,
    );

    if (isStoreFileToS3Bucket) {
      // Phase 1: Collect all S3 files and build visit folder name map
      const allS3FilesByDate = [];
      const visitFolderMap = {}; // { 'visit_visitID': 'customerName_visitID' }

      for (const date of dates) {
        const prefix = `${companyMasterID}/visitReportCustomize/${date}/`;

        console.log(
          `[VisitReportZip] Searching S3 files for date=${date} prefix=${prefix}`,
        );

        const s3Files = await listS3Objects(bucketName, prefix);

        console.log(
          `[VisitReportZip] S3 files found for ${date}: ${
            s3Files?.length || 0
          }`,
        );

        if (!s3Files?.length) {
          continue;
        }

        // Scan filenames to build folder map from PDF name pattern
        for (const file of s3Files) {
          const key = file.Key;
          if (!key || key.endsWith('/')) continue;
          const parts = key.split('/');
          const fileName = parts[parts.length - 1];
          const parentFolder = parts[parts.length - 2];
          if (parentFolder && parentFolder.startsWith('visit_')) {
            // PDF pattern: ${cleanCustomerName}_${visitID}.pdf
            const pdfMatch = fileName.match(/^(.+)_(\d+)\.pdf$/);
            if (pdfMatch) {
              visitFolderMap[parentFolder] = `${pdfMatch[1]}_${pdfMatch[2]}`;
            }
          }
          allS3FilesByDate.push(file);
        }
      }

      // Phase 2: Download files and add to zip with renamed folder paths
      for (const file of allS3FilesByDate) {
        const key = file.Key;

        if (!key) {
          console.warn(`[VisitReportZip] Skipping file with empty key`);
          continue;
        }

        if (key.endsWith('/')) {
          console.log(`[VisitReportZip] Skipping directory marker: ${key}`);
          continue;
        }

        if (
          key.endsWith(`VisitReport_${fromDate}.zip`) ||
          key.endsWith(`VisitReport_${toDate}.zip`)
        ) {
          console.log(`[VisitReportZip] Skipping existing date zip: ${key}`);
          continue;
        }

        if (key.includes(`VisitReport_${fromDate}_to_${toDate}.zip`)) {
          console.log(`[VisitReportZip] Skipping generated range zip: ${key}`);
          continue;
        }

        console.log(`[VisitReportZip] Downloading S3 file: ${key}`);

        const fileBuffer = await getS3File(bucketName, key, 'buffer');

        if (!fileBuffer) {
          console.error(
            `[VisitReportZip] Failed to download file from S3: ${key}`,
          );
          continue;
        }

        const relativePath = key.substring(
          `${companyMasterID}/visitReportCustomize/`.length,
        );

        // Rename visit_visitID folder to customerName_visitID
        const relParts = relativePath.split('/');
        const visitFolderIdx = relParts.findIndex(
          (p) => p.startsWith('visit_') && /^visit_\d+$/.test(p),
        );
        if (visitFolderIdx >= 0 && visitFolderMap[relParts[visitFolderIdx]]) {
          relParts[visitFolderIdx] = visitFolderMap[relParts[visitFolderIdx]];
        }
        const renamedPath = relParts.join('/');

        zip.file(renamedPath, fileBuffer);
        totalFiles++;

        const origName = relParts[relParts.length - 1] || 'attachment';

        // Track unique visits using renamed folder name
        if (relParts.length >= 3) {
          const visitPath = `${relParts[0]}/${relParts[1]}/${relParts[2]}`;
          uniqueVisits.add(visitPath);
        }

        filesList.push({
          filename: origName,
          content: fileBuffer,
        });

        console.log(
          `[VisitReportZip] Added to ZIP | path=${renamedPath} | totalFiles=${totalFiles}`,
        );
      }
    } else {
      // Build visit folder name map for local storage
      const localVisitFolderMap_ref = {}; // { 'visit_visitID': 'customerName_visitID' }

      const getAllFilesRecursively = (dirPath, arrayOfFiles = []) => {
        if (!fs.existsSync(dirPath)) {
          console.log(`[VisitReportZip] Directory does not exist: ${dirPath}`);
          return arrayOfFiles;
        }

        const files = fs.readdirSync(dirPath);
        files.forEach((file) => {
          const fullPath = path.join(dirPath, file);
          if (fs.statSync(fullPath).isDirectory()) {
            getAllFilesRecursively(fullPath, arrayOfFiles);
          } else {
            arrayOfFiles.push(fullPath);
          }
        });
        return arrayOfFiles;
      };

      for (const date of dates) {
        const localDateFolder = path.join(
          process.cwd(),
          'uploads',
          'visitReportCustomize',
          date,
        );

        console.log(
          `[VisitReportZip] Checking local folder: ${localDateFolder}`,
        );

        if (!fs.existsSync(localDateFolder)) {
          console.log(`[VisitReportZip] Folder not found: ${localDateFolder}`);
          continue;
        }

        const files = getAllFilesRecursively(localDateFolder);

        console.log(`[VisitReportZip] Files found in ${date}: ${files.length}`);

        for (const file of files) {
          const relativePath = path.relative(
            path.join(process.cwd(), 'uploads', 'visitReportCustomize'),
            file,
          );

          const normalizedPath = relativePath.replace(/\\/g, '/');

          if (
            normalizedPath.endsWith(`VisitReport_${fromDate}.zip`) ||
            normalizedPath.endsWith(`VisitReport_${toDate}.zip`)
          ) {
            continue;
          }

          if (
            normalizedPath.includes(`VisitReport_${fromDate}_to_${toDate}.zip`)
          ) {
            continue;
          }

          const fileBuffer = fs.readFileSync(file);
          const parts = normalizedPath.split('/');
          const origName = parts[parts.length - 1] || 'attachment';

          // Build visitFolderMap from PDF filenames on-the-fly
          const parentFolder = parts[parts.length - 2];
          const localVisitFolderMap = localVisitFolderMap_ref;
          if (
            parentFolder &&
            parentFolder.startsWith('visit_') &&
            /^visit_\d+$/.test(parentFolder)
          ) {
            // PDF pattern: ${cleanCustomerName}_${visitID}.pdf
            const pdfMatch = origName.match(/^(.+)_(\d+)\.pdf$/);
            if (pdfMatch && !localVisitFolderMap[parentFolder]) {
              localVisitFolderMap[parentFolder] =
                `${pdfMatch[1]}_${pdfMatch[2]}`;
            }
          }

          // Rename visit_visitID folder to customerName_visitID
          const visitFolderIdx = parts.findIndex(
            (p) => p.startsWith('visit_') && /^visit_\d+$/.test(p),
          );
          const renamedParts = [...parts];
          if (
            visitFolderIdx >= 0 &&
            localVisitFolderMap[parts[visitFolderIdx]]
          ) {
            renamedParts[visitFolderIdx] =
              localVisitFolderMap[parts[visitFolderIdx]];
          }
          const renamedPath = renamedParts.join('/');

          zip.file(renamedPath, fileBuffer);
          totalFiles++;

          // Track unique visits using renamed folder name
          if (renamedParts.length >= 3) {
            const visitPath = `${renamedParts[0]}/${renamedParts[1]}/${renamedParts[2]}`;
            uniqueVisits.add(visitPath);
          }

          filesList.push({
            filename: renamedParts[renamedParts.length - 1],
            content: fileBuffer,
          });

          console.log(
            `[VisitReportZip] Added local file to ZIP | ${renamedPath} | totalFiles=${totalFiles}`,
          );
        }
      }
    }

    console.log(
      `[VisitReportZip] File collection completed. Total files=${totalFiles}`,
    );

    if (totalFiles === 0) {
      console.warn('[VisitReportZip] No files found for requested date range');
      return null;
    }

    console.log('[VisitReportZip] Generating ZIP...');

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 9,
      },
    });

    console.log(
      `[VisitReportZip] ZIP generated successfully. Size=${zipBuffer.length} bytes`,
    );

    const zipFileName = `VisitReport_${fromDate}_to_${toDate}.zip`;
    const shouldAttachFiles = uniqueVisits.size <= 15;
    console.log(
      `[VisitReportZip] Unique visits count: ${uniqueVisits.size}. Attachments enabled: ${shouldAttachFiles}`,
    );
    const finalFilesList = shouldAttachFiles ? filesList : [];

    if (isStoreFileToS3Bucket) {
      const zipS3Key = `${companyMasterID}/visitReportCustomize/${zipFileName}`;

      console.log(`[VisitReportZip] Uploading ZIP to S3. Key=${zipS3Key}`);

      const zipDataBase64 = `data:application/zip;base64,${zipBuffer.toString(
        'base64',
      )}`;

      await uploadBase64ToS3({
        base64String: zipDataBase64,
        bucketName,
        s3Key: zipS3Key,
        fileName: zipFileName,
      });

      console.log(`[VisitReportZip] ZIP uploaded successfully to S3`);

      const payload = JSON.stringify({
        filePath: zipS3Key,
        isS3: true,
      });

      const token = encryptText(payload);

      const redirectUrl = `${appURL}#/user/downloadVisitReortComponent?token=${encodeURIComponent(
        token,
      )}`;

      console.log(
        `[VisitReportZip] Completed successfully in ${
          Date.now() - startTime
        }ms`,
      );

      return { url: redirectUrl, files: finalFilesList };
    } else {
      const localZipFolder = path.join(
        process.cwd(),
        'uploads',
        'visitReportCustomize',
      );

      fs.mkdirSync(localZipFolder, { recursive: true });

      const zipLocalPath = path.join(localZipFolder, zipFileName);

      console.log(`[VisitReportZip] Saving ZIP locally: ${zipLocalPath}`);

      fs.writeFileSync(zipLocalPath, zipBuffer);

      console.log(`[VisitReportZip] Local ZIP saved successfully`);

      const localRelativePath = `uploads/visitReportCustomize/${zipFileName}`;

      const payload = JSON.stringify({
        filePath: localRelativePath,
        isS3: false,
      });

      const token = encryptText(payload);

      const redirectUrl = `${appURL}#/user/downloadVisitReortComponent?token=${encodeURIComponent(
        token,
      )}`;

      console.log(
        `[VisitReportZip] Completed successfully in ${
          Date.now() - startTime
        }ms`,
      );

      return { url: redirectUrl, files: finalFilesList };
    }
  } catch (error) {
    console.error('[VisitReportZip] Fatal Error', {
      message: error?.message,
      stack: error?.stack,
    });

    return null;
  }
}
