/** @format */

const Sequelize = require('sequelize');
const UserLeave = require('../models/userleave');
const logger = require('../config/logger');
const message = require('../response_message/message');
const sequelize = require('../config/database');
const companyMaster = require('../models/companyMaster');
const UserMaster = require('../models/userMaster');
const AuthorizationMaster = require('../models/authorizationMaster');
const AuthorizationDetails = require('../models/AuthorizationDetails');
const AuthorizationCriteria = require('../models/authorizationCriteriaMaster');
const LeaveAuthorizationRequest = require('../models/leaveAuthorization');
const userLeaveTransactions = require('../models/userLeaveTransaction');

const { executeQuery } = require('./common.controller');
const MailTemplateEditor = require('../models/mailTemplateEditor');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const HrLeaveTypes = require('../models/hrLeaveTypes');
const HrLeaveMaster = require('../models/hrLeaveMaster');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const { sendEmailForLeave } = require('../middleware/sendemail');
const {
  sendNotification,
  employeeeLeaveBalance,
  employeePendingLeaveBalance,
  asiaKolkataDateTime,
  checkUserLeaveBalance,
  checkEmployeeLeavePolicyWhenLeaveApply,
  isValidDate,
  checkUserLeaveBalanceNew,
  destroyLeaveAuthAndApprovedLeaveAuth,
  findCompanyNotificationPolicy,
  authorization,
  getCoffBalanceData,
  consumeLeaveBalance,
  parseEmployeeInfo,
  getDaysFromDates,
  processAutoApproveLeave,
  formatYearMonth,
  parseYearMonth,
  getServiceMonths,
  checkApplyLeaveRequest,
  validateLeaveArray,
} = require('../utils/commonUtilFunctions');
const {
  FileUploadType,
  leaveOperationENUM,
  authorizationMasterTypes,
  authorizationCriteriaType,
  PayrollFrequencyType,
  leaveApplyFromEnum,
  CoffUsedTypeEnum,
  authorizationStatusString,
  AuthorizationStatusType,
  chekLeaveBalanceFromEnum,
  HrLeaveTypesIds,
} = require('../utils/dbUtils');
const UserLeaveLapse = require('../models/userLeaveLapse');
const fs = require('fs');
const UserInbox = require('../models/UserInbox');

const moment = require('moment');
const weekoffHolidayTran = require('../models/weekoffHolidayTran');
const { CustomError } = require('../utils/customError');
const { appURL } = require('../utils/labelUtils');
const {
  genrateDemoExcelForManualLeave,
  generateExcel,
} = require('../utils/exportData');
const readXlsxFile = require('read-excel-file/node');

const notification_options = {
  priority: 'high',
  timeToLive: 60 * 60 * 24,
};
const path = require('path');
const HrLeaveBalance = require('../models/hrLeaveBalance');
const {
  userAttributes,
  companyAttributes,
  statusCodes,
} = require('../utils/commonVars');
const ApprovedLeaveAuthorization = require('../models/approvedLeaveAuthorization');
const AuthorizationCriteriaMaster = require('../models/authorizationCriteriaMaster');
const LeaveEncashment = require('../models/leaveEncashment');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');
const { encodeSecureBreak } = require('../utils/commonUtilFunctions');
const { log } = require('handlebars');
const UsedCoffTransaction = require('../models/usedCoffTransaction');
const EmployeeAttendancePolicy = require('../models/employeeAttendancePolicy');
const AttendancePolicy = require('../models/attendancePolicy');
const empLeavePolicy = require('../models/empLeavePolicy');
const employeeLeavePolicy = require('../models/employeeLeavePolicy');
const HrLeaveMonthlyTrans = require('../models/hrLeavesMonthlyTrans');
const ExcelJS = require('exceljs');
const UserLeaveTransaction = require('../models/userLeaveTransaction');
const crypto = require('crypto');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const { date } = require('@hapi/joi');
const coffMaster = require('../models/coffMaster');

exports.getUserLeaveBalance = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      userMasterID,
      chekLeaveBalanceFrom = chekLeaveBalanceFromEnum.EMPLOYEE,
    } = req.query;

    const userBalance = await employeeeLeaveBalance(
      companyMasterID,
      userMasterID,
      null,
      null,
      null,
      null,
      null,
      chekLeaveBalanceFrom,
    );

    return res.status(200).json({
      status: 200,
      data: userBalance,
    });
  } catch (error) {
    next(error);
  }
};

exports.lapseLeaveBalance = async (req, res, next) => {
  try {
    const { companyId, branchId } = req.query;

    const currentdate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const currentmonth = currentdate.slice(0, 4) + currentdate.slice(5, 7);

    const createBy = req.userDetails.userMasterId;
    const createbyIp = req.userDetails.userIpAddress;

    const companyuser = await UserMaster.findAll({
      where: {
        companyMasterId: companyId,
      },
      include: [
        {
          model: EmployeeBranch,
          where: {
            status: 1,
            ...(branchId && { branchID: branchId }),
            applicableDate: { [Sequelize.Op.lte]: currentdate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentdate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: branchId ? true : false,
          attributes: ['branchID'],
        },
      ],
    });

    const finalData = [];

    await Promise.all(
      companyuser.map(async (e) => {
        const leaveBalance = await employeeeLeaveBalance(
          companyId,
          e.userMasterID,
        );
        if (leaveBalance.length > 0) {
          leaveBalance.map((l) => {
            finalData.push({
              userMasterID: e.userMasterID,
              LeaveTranId: l.LeaveTranId,
              LapseDays: +l.Balance,
              LapseYearMonth: currentmonth,
              status: 1,
              createBy: createBy,
              createByIp: createbyIp,
            });
          });
        }
      }),
    );

    await UserLeaveLapse.bulkCreate(finalData);

    return res.status(200).json({
      status: 200,
      message: 'Leaves Lapse successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 Create BulkUser Leave

 */

exports.postBulkAddLeave_Web = async (req, res, next) => {
  try {
    const formData = req.body;
    const files = req.files;
    let userMasterID = '';

    const entryCount = Object.keys(formData).filter((key) =>
      key.startsWith('FromDate'),
    ).length;
    if (req?.userDetails.isMyUserDetails) {
      userMasterID = +req.userDetails.userMasterId;
    }


    const leavedata = [];
    let index_attch = 0;
    for (let i = 0; i < entryCount; i++) {
      const checkAttach = formData[`isattachment${i}`] == 'yes' ? true : false;
      leavedata.push({
        LeaveTranId: +formData[`LeaveTranId${i}`],
        userMasterID: req?.userDetails?.isMyUserDetails
          ? userMasterID
          : +formData[`userMasterID${i}`],
        FromDate: formData[`FromDate${i}`],
        ToDate: formData[`ToDate${i}`],
        companyMasterID: +formData[`companyMasterID${i}`],
        LeaveDays: +formData[`LeaveDays${i}`],
        Remark: formData[`Remark${i}`],
        DayType: formData[`DayType${i}`],
        Authorization: formData[`Authorization${i}`],
        status: 1,
        attachment:
          files?.[index_attch] && checkAttach
            ? files?.[index_attch].filename
            : null,
        createBy: req.userDetails.userMasterId,
        createByIp: req.userDetails.userIpAddress,
        leaveFrom: formData[`leaveFrom${i}`]
          ? formData[`leaveFrom${i}`] == 'manual'
            ? leaveApplyFromEnum.ADMIN
            : formData[`leaveFrom${i}`]
          : leaveApplyFromEnum.EMPLOYEE,
        leaveID: formData[`leaveID${i}`],
      });

      if (checkAttach) index_attch++;
    }
    const validateMsg = validateLeaveArray(leavedata);

    if (validateMsg) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: validateMsg,
      });
    }

    const applymeassage = await checkApplyLeaveRequest(leavedata);

    if (applymeassage) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: applymeassage,
      });
    }

    const leaveMessage = await checkUserLeaveBalance(leavedata, 'add');

    if (leaveMessage) {
      return res.status(200).json({
        status: 401,
        message: leaveMessage,
      });
    }

    const leaveApplyMessage = await checkEmployeeLeavePolicyWhenLeaveApply(
      leavedata,
      'add',
      leavedata?.[0]?.leaveFrom || leaveApplyFromEnum.EMPLOYEE,
    );

    if (leaveApplyMessage)
      return res.status(200).json({
        status: 401,
        message: leaveApplyMessage,
      });

    const allUserIds = [...new Set(leavedata.map((e) => +e.userMasterID))];

    const AllUsersAuthorizationdetails = await AuthorizationDetails.findAll({
      where: {
        AuthorizationMasterID: authorizationMasterTypes.leave,
        userMasterID: allUserIds,
        status: 1,
      },
    });

    for (let i = 0; i < leavedata.length; i++) {
      if (new Date(leavedata[i].FromDate) > new Date(leavedata[i].ToDate)) {
        return res.status(200).json({
          status: 401,
          message: 'Invalid From date and To date!',
        });
      }

      const att_verify = await HrLeaveMonthlyTrans.findOne({
        where: {
          userMasterID: leavedata[i].userMasterID,
          verified: 1,
          monthstartdate: {
            [Sequelize.Op.lte]: leavedata[i].ToDate,
          },
          monthenddate: {
            [Sequelize.Op.gte]: leavedata[i].FromDate,
          },
        },
      });

      if (att_verify) {
        return res.status(200).json({
          status: 401,
          message: 'Attendance already verified.',
        });
      }

      //For Cancelled & Approved
      {
        const findLeave = await executeQuery(
          `SELECT * from "userLeaves" as ul INNER join "userLeaveTransactions" as ult on ul."UserLeaveApplicationID"=ult."ReferenceID" WHERE ul."authorizationStatus" not in (4) and ul."status"=1 and ul."userMasterID"=` +
            ':userMasterID' +
            ` and ult."status"=1 and (ult."date" >= :FromDate AND ult."date" <= :ToDate)`,
          {
            replacements: {
              userMasterID: leavedata[i].userMasterID,
              FromDate: leavedata[i].FromDate,
              ToDate: leavedata[i].ToDate,
            },
          },
        );

        if (findLeave.length > 0) {
          if (leavedata[i].DayType == 'Full Day') {
            return res.status(200).json({
              status: 401,
              message: 'You have already applied for leave within these range',
            });
          }

          for (var j = 0; j < findLeave.length; j++) {
            if (
              findLeave[j].DayType == leavedata[i].DayType ||
              findLeave[j].DayType == 'Full Day'
            ) {
              return res.status(200).json({
                status: 401,
                message:
                  'You have already applied for leave within these range',
              });
            }
          }
        }
      }

      //For Pending
      {
        const findLeave = await UserLeave.findAll({
          raw: true,
          where: {
            status: 1,
            userMasterID: leavedata[i].userMasterID,
            [Sequelize.Op.and]: [
              {
                FromDate: {
                  [Sequelize.Op.lte]: new Date(leavedata[i].ToDate),
                },
                ToDate: { [Sequelize.Op.gte]: new Date(leavedata[i].FromDate) },
              },
            ],
            authorizationStatus: [0, 1, 2],
          },
        });
        if (findLeave.length > 0) {
          if (leavedata[i].DayType == 'Full Day') {
            return res.status(200).json({
              status: 401,
              message: 'You have already applied for leave within these range',
            });
          }

          for (let j = 0; j < findLeave.length; j++) {
            if (
              findLeave[j].DayType == leavedata[i].DayType ||
              findLeave[j].DayType == 'Full Day'
            ) {
              return res.status(200).json({
                status: 401,
                message:
                  'You have already applied for leave within these range',
              });
            }
          }
        }
      }

      const authorizationdetails = AllUsersAuthorizationdetails.find(
        (e) => e.userMasterID == leavedata[i].userMasterID,
      );

      if (authorizationdetails) {
        // set authorization criteria
        leavedata[i].AuthorizationCriteriaID =
          authorizationdetails.AuthorizationCriteriaID;

        if (
          authorizationdetails.AuthorizationCriteriaID ==
          authorizationCriteriaType.SEQUENCENO
        ) {
          leavedata[i].authorizationStatus = 2;
        } else {
          leavedata[i].authorizationStatus = 1;
        }
      } else {
        leavedata[i].authorizationStatus = 0;
      }
    }

    await sequelize.transaction(async (t) => {
      await UserLeave.bulkCreate(leavedata, {
        individualHooks: true,
        transaction: t,
      }).then(async (response) => {
        const AllUsersDetails = await UserMaster.findAll({
          where: {
            userMasterID: {
              [Sequelize.Op.in]: allUserIds,
            },
          },
          include: [
            {
              model: EmployeeDesignation,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date() },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date() } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              required: false,
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
              model: EmployeeDepartment,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date() },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date() } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              required: false,
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
              model: EmployeeBranch,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date() },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date() } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              required: false,
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
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode'],
            },

            // Attendance Policy
            {
              model: EmployeeAttendancePolicy,
              where: {
                status: 1,
              },
              required: false,
              attributes: ['attendancePolicyID', 'startDate', 'endDate'],
              include: [
                {
                  model: AttendancePolicy,
                  as: 'attendancePolicy',
                  attributes: [
                    'sandwichLeave',
                    ['weekoffsandwichLeave', 'w_sandwich'],
                    ['holidaysandwichLeave', 'h_sandwich'],
                  ],
                },
              ],
            },
            // Employee Leave Policy
            {
              model: empLeavePolicy,
              where: {
                status: 1,
              },
              required: false,
              attributes: [
                'employeeLeavePolicyID',
                'userMasterID',
                'applicableDate',
                'endDate',
              ],
            },
          ],
        });

        const get_NotificationPolicy = await findCompanyNotificationPolicy(
          +leavedata?.[0]?.companyMasterID || null,
        );

        let get_MailTemplate;

        if (get_NotificationPolicy && +leavedata?.[0]?.companyMasterID) {
          get_MailTemplate = await MailTemplateEditor.findOne({
            where: {
              companyMasterID: leavedata[0].companyMasterID,
              status: 1,
              mailTypeID: 1,
            },
          });
        }

        const allLeaveTypes = await HrLeaveTypes.findAll({
          where: {
            LeaveTranId: [...new Set(response.map((e) => +e.LeaveTranId))],
            status: 1,
          },
          attributes: ['LeaveID', 'LeaveTranId'],
          include: [
            {
              model: HrLeaveMaster,
              as: 'LeaveMaster',
              attributes: ['LeaveName'],
            },
          ],
        });

        const allLeavePolicy = +leavedata?.[0]?.companyMasterID
          ? await employeeLeavePolicy.findAll({
              where: {
                companyMasterId: +leavedata?.[0]?.companyMasterID,
              },
              attributes: [
                'id',
                'isAutoApprove',
                'autoApproveLimit',
                'leaveId',
              ],
            })
          : [];

        for (let i = 0; i < response.length; i++) {
          const endDate = response[i].ToDate;
          const leaveId =
            allLeaveTypes.find((e) => e.LeaveTranId == response[i].LeaveTranId)
              ?.LeaveID ?? null;

          const employeeData = AllUsersDetails.find(
            (e) => +e.userMasterID == +response[i].userMasterID,
          );

          if (!employeeData) continue;

          const empLeavePolicyIds =
            (employeeData.empLeavePolicies || []).find(
              (p) =>
                new Date(p.applicableDate) <= new Date(endDate) &&
                (!p.endDate || new Date(p.endDate) >= new Date(endDate)),
            )?.employeeLeavePolicyID || [];

          const employeeLeavePolicy = allLeavePolicy.find(
            (e) => empLeavePolicyIds.includes(e.id) && e.leaveId == leaveId,
          );

          // if auto approve is set
          if (employeeLeavePolicy?.isAutoApprove) {
            // get attendance policy
            const attendancePolicy =
              (employeeData.employeeAttendancePolicies || []).find(
                (p) =>
                  new Date(p.startDate) <= new Date(endDate) &&
                  (!p.endDate || new Date(p.endDate) >= new Date(endDate)),
              )?.attendancePolicy || null;

            // process leave for auto approval

            const autoApproved = await processAutoApproveLeave(
              response[i],
              employeeLeavePolicy.autoApproveLimit,
              attendancePolicy,
              leaveId == 6,
              t,
              req,
            );
            // if leave get approved
            if (autoApproved) continue;
          }

          const authorizationdetails = AllUsersAuthorizationdetails.find(
            (e) => e.userMasterID == response[i].userMasterID,
          );

          if (!authorizationdetails) continue;

          const employeename = employeeData?.displayName || '';

          if (get_NotificationPolicy) {
            if (get_MailTemplate) {
              const empcode =
                  employeeData.employeeJoiningDetails?.[0]?.employeeCode || '',
                empname = employeename,
                department =
                  employeeData.employeeDepartments?.[0]?.department
                    ?.departmentName || '',
                designation =
                  employeeData.employeeDesignations?.[0]?.designation
                    ?.designationName || '',
                branch =
                  employeeData.employeeBranches?.[0]?.branchMaster
                    ?.branchName || '';

              const leavetype =
                allLeaveTypes.find(
                  (e) => +e.LeaveTranId == +response[i].LeaveTranId,
                )?.LeaveMaster?.LeaveName || '';

              get_MailTemplate.subject = get_MailTemplate.subject.replace(
                '[EmployeeCode]',
                empcode,
              );
              get_MailTemplate.subject = get_MailTemplate.subject.replace(
                '[EmployeeName]',
                empname,
              );
              get_MailTemplate.subject = get_MailTemplate.subject.replace(
                '[ToDate]',
                leavedata[i].ToDate,
              );
              get_MailTemplate.subject = get_MailTemplate.subject.replace(
                '[FromDate]',
                leavedata[i].FromDate,
              );
              get_MailTemplate.subject = get_MailTemplate.subject.replace(
                '[Reason]',
                leavedata[i].Remark,
              );
              get_MailTemplate.subject = get_MailTemplate.subject.replace(
                '[NoOfDays]',
                leavedata[i].LeaveDays,
              );
              get_MailTemplate.subject = get_MailTemplate.subject.replace(
                '[Department]',
                department,
              );
              get_MailTemplate.subject = get_MailTemplate.subject.replace(
                '[Designation]',
                designation,
              );
              get_MailTemplate.subject = get_MailTemplate.subject.replace(
                '[Branch]',
                branch,
              );
              get_MailTemplate.subject = get_MailTemplate.subject.replace(
                '[LeaveType]',
                leavetype,
              );

              get_MailTemplate.body = get_MailTemplate.body.replace(
                '[EmployeeCode]',
                empcode,
              );
              get_MailTemplate.body = get_MailTemplate.body.replace(
                '[EmployeeName]',
                empname,
              );
              get_MailTemplate.body = get_MailTemplate.body.replace(
                '[ToDate]',
                leavedata[i].ToDate,
              );
              get_MailTemplate.body = get_MailTemplate.body.replace(
                '[FromDate]',
                leavedata[i].FromDate,
              );
              get_MailTemplate.body = get_MailTemplate.body.replace(
                '[Reason]',
                leavedata[i].Remark,
              );
              get_MailTemplate.body = get_MailTemplate.body.replace(
                '[NoOfDays]',
                leavedata[i].LeaveDays,
              );
              get_MailTemplate.body = get_MailTemplate.body.replace(
                '[Department]',
                department,
              );
              get_MailTemplate.body = get_MailTemplate.body.replace(
                '[Designation]',
                designation,
              );
              get_MailTemplate.body = get_MailTemplate.body.replace(
                '[Branch]',
                branch,
              );
              get_MailTemplate.body = get_MailTemplate.body.replace(
                '[LeaveType]',
                leavetype,
              );
            }
          }

          if (
            authorizationdetails.AuthorizationCriteriaID ==
            authorizationCriteriaType.SEQUENCENO
          ) {
            let insert_db_status1 = await LeaveAuthorizationRequest.create(
              {
                TableName: 'userLeaves',
                ReferenceID: response[i].UserLeaveApplicationID,
                userMasterID: authorizationdetails.AuthorizedByUserMasterId[0],
                status: 1,
                authstatus: 2,
                createBy: response[i].createBy,

                createByIp: response[i].createByIp,
              },
              { transaction: t },
            );

            await UserInbox.create(
              {
                activityTable: LeaveAuthorizationRequest.getTableName(),
                activityTablePK:
                  insert_db_status1.toJSON().AuthorizationRequestId,
                message: `${employeename} has applied for leave request from ${moment(
                  response[i].FromDate,
                ).format('DD/MM/YYYY')} to ${moment(response[i].ToDate).format(
                  'DD/MM/YYYY',
                )}`,
                assignedTo: authorizationdetails.AuthorizedByUserMasterId[0],
                assignedBy: response[i].userMasterID,
              },
              { transaction: t },
            );

            const user = await UserMaster.findOne({
              where: {
                userMasterID: authorizationdetails.AuthorizedByUserMasterId[0],
              },
            });

            if (user && employeeData) {
              const notification = {
                title: 'Leave',
                body: employeeData.displayName + ' requested for leave.',
              };
              const data = {
                screen: 'leaveauth',
                isScheduled: 'true',
                scheduledTime: new Date().toISOString(),
              };
              await sendNotification(user.userMasterID, notification, data);
            }

            if (
              user.email &&
              get_MailTemplate?.body &&
              insert_db_status1.toJSON().AuthorizationRequestId
            ) {
              const myTemplate = JSON.parse(JSON.stringify(get_MailTemplate));
              let AuthorizationRequestId =
                insert_db_status1.toJSON().AuthorizationRequestId;
              const acceptData = {
                AuthorizationRequestId,
                type: 'approve',
                userMasterID: authorizationdetails.AuthorizedByUserMasterId[0],
                companyMasterID: user?.companyMasterId,
              };
              const rejectData = {
                AuthorizationRequestId,
                type: 'reject',
                userMasterID: authorizationdetails.AuthorizedByUserMasterId[0],
                companyMasterID: user?.companyMasterId,
              };
              const acceptedSigned = encodeSecureBreak(acceptData);
              const acceptUrl = `${appURL}#/app/attendances/leave_auth_request/2?data=${acceptedSigned}`;
              const rejectedSigned = encodeSecureBreak(rejectData);
              const rejectUrl = `${appURL}#/app/attendances/leave_auth_request/2?data=${rejectedSigned}`;

              myTemplate.body = myTemplate.body.replace(
                `[ApproveButton]`,
                `<a href="${acceptUrl}" rel="noopener noreferrer" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">Approve</a>`,
              );

              myTemplate.body = myTemplate.body.replace(
                `[RejectButton]`,
                `<a href="${rejectUrl}" rel="noopener noreferrer" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #f44336; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">Reject</a>`,
              );

              let data = {
                email_id: user.email,
                body: myTemplate.body,
                subject: myTemplate.subject,
                email: get_NotificationPolicy.email,
                password: get_NotificationPolicy.password,
                port: get_NotificationPolicy.port,
                host: get_NotificationPolicy.hostmail,
                secure: get_NotificationPolicy.secure,
              };

              sendEmailForLeave(data);
            }
          } else {
            for (
              var j = 0;
              j < authorizationdetails.AuthorizedByUserMasterId.length;
              j++
            ) {
              let insert_db_status1 = await LeaveAuthorizationRequest.create(
                {
                  TableName: 'userLeaves',
                  ReferenceID: response[i].UserLeaveApplicationID,
                  userMasterID:
                    authorizationdetails.AuthorizedByUserMasterId[j],
                  status: 1,
                  authstatus: 2,
                  createBy: response[i].createBy,
                  createByIp: response[i].createByIp,
                },
                { transaction: t },
              );

              await UserInbox.create(
                {
                  activityTable: LeaveAuthorizationRequest.getTableName(),
                  activityTablePK:
                    insert_db_status1.toJSON().AuthorizationRequestId,
                  message: `${employeename} has applied for leave request from ${moment(
                    response[i].FromDate,
                  ).format('DD/MM/YYYY')} to ${moment(
                    response[i].ToDate,
                  ).format('DD/MM/YYYY')}`,
                  assignedTo: authorizationdetails.AuthorizedByUserMasterId[j],
                  assignedBy: response[i].userMasterID,
                },
                { transaction: t },
              );

              const user = await UserMaster.findOne({
                where: {
                  userMasterID:
                    authorizationdetails.AuthorizedByUserMasterId[j],
                },
              });

              const notification = {
                title: 'Leave',
                body: employeeData?.displayName + ' requested for leave.',
              };
              const data = {
                screen: 'leaveauth',
              };
              await sendNotification(
                authorizationdetails.AuthorizedByUserMasterId[j],
                notification,
                data,
              );

              if (
                user.email &&
                get_MailTemplate?.body &&
                insert_db_status1.toJSON().AuthorizationRequestId
              ) {
                const myTemplate = JSON.parse(JSON.stringify(get_MailTemplate));
                let AuthorizationRequestId =
                  insert_db_status1.toJSON().AuthorizationRequestId;
                const acceptData = {
                  AuthorizationRequestId,
                  type: 'approve',
                  userMasterID:
                    authorizationdetails.AuthorizedByUserMasterId[j],
                  companyMasterID: user?.companyMasterId,
                };
                const rejectData = {
                  AuthorizationRequestId,
                  type: 'reject',
                  userMasterID:
                    authorizationdetails.AuthorizedByUserMasterId[j],
                  companyMasterID: user?.companyMasterId,
                };
                const acceptedSigned = encodeSecureBreak(acceptData);
                const acceptUrl = `${appURL}#/app/attendances/leave_auth_request/2?data=${acceptedSigned}`;
                const rejectedSigned = encodeSecureBreak(rejectData);
                const rejectUrl = `${appURL}#/app/attendances/leave_auth_request/2?data=${rejectedSigned}`;

                myTemplate.body = myTemplate.body.replace(
                  `[ApproveButton]`,
                  `<a href="${acceptUrl}" rel="noopener noreferrer" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">Approve</a>`,
                );

                myTemplate.body = myTemplate.body.replace(
                  `[RejectButton]`,
                  `<a href="${rejectUrl}" rel="noopener noreferrer" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #f44336; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">Reject</a>`,
                );

                let data = {
                  email_id: user.email,
                  body: myTemplate.body,
                  subject: myTemplate.subject,
                  email: get_NotificationPolicy.email,
                  password: get_NotificationPolicy.password,
                  port: get_NotificationPolicy.port,
                  host: get_NotificationPolicy.hostmail,
                  secure: get_NotificationPolicy.secure,
                };

                sendEmailForLeave(data);
              }
            }
          }
        }
      });
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.userleaveadd,
    });
  } catch (err) {
    next(err);
  }
};

/**
 return all userLeave data
 */

/**
 * find data with  UserLeaveApplicationID id
 *
 * @param {id} UserLeaveApplicationID  to fetch userleave
 */

exports.getLeaveById = async (req, res, next) => {
  try {
    const userMasterID = req.userDetails.userMasterId;
    let get_one_data = await UserLeave.findOne({
      where: {
        UserLeaveApplicationID: req.params.id,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
        userMasterID: userMasterID,
      },
    });

    if (!get_one_data)
      res
        .status(200)
        .json({ status: 200, message: message.usermessage.deletedrecord });
    res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

/**
 * find data with  UserMasterID id
 *
 * @param {id} UserLeaveApplicationID  to fetch userleave
 */

/**
 * find data with company master id
 *
 * @param {id} companyMasterID  to fetch userleave
 */

// //update the user data

exports.updateUserData = async (req, res, next) => {
  try {
    let {
      UserLeaveApplicationID,
      LeaveTranId,
      userMasterID,
      companyMasterID,
      FromDate,
      ToDate,
      LeaveDays,
      Remark,
      authorizationStatus,
      DayType,
      removeFile,
    } = await req.body;

    let updateBy= req.userDetails.userMasterId;
    let updateByIp= req.userDetails.userIpAddress;

    if (req.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }

    // const updateBy = req.userDetails.userMasterId;

    // const findLeave = await UserLeave.findByPk(UserLeaveApplicationID);

    const findLeave = await UserLeave.findOne({
      where: {
        UserLeaveApplicationID: UserLeaveApplicationID,
        userMasterID: userMasterID,
      },
    });

    if (!findLeave) {
      return res.status(200).json({
        status: 401,
        message: 'Leave not found!',
      });
    }

    const aurhorizationStatus = +findLeave.authorizationStatus;

    const statusMap = {
      [AuthorizationStatusType.APPROVED]: 'Approved',
      [AuthorizationStatusType.REJECTED]: 'Rejected',
    };

    if (statusMap[aurhorizationStatus]) {
      return res.status(200).json({
        status: 401,
        message: `Leave already ${statusMap[aurhorizationStatus]}.`,
      });
    }

    let attachment = null;
    if (removeFile == 1) {
      if (findLeave && findLeave.attachment) {
        const filePath = path.join(
          __dirname,
          `../uploads/employee-leave-attachment/${findLeave.attachment}`,
        );

        fs.unlink(filePath, function (err) {});
      }
    }

    if (req.file) {
      attachment = req.file.filename;

      if (findLeave && findLeave.attachment) {
        const filePath = path.join(
          __dirname,
          `../uploads/employee-leave-attachment/${findLeave.attachment}`,
        );

        fs.unlink(filePath, function (err) {});
      }
    } else {
      if (removeFile != 1) attachment = findLeave ? findLeave.attachment : null;
    }

    if (new Date(FromDate) > new Date(ToDate)) {
      return res.status(200).json({
        status: 401,
        message: 'Invalid From date and To date!',
      });
    }

    const leaveData = [req.body];

    leaveData[0].attachment = attachment;

    const applymeassage = await checkApplyLeaveRequest(leaveData);

    if (applymeassage) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: applymeassage,
      });
    }

    const leaveMessage = await checkUserLeaveBalance(leaveData, 'update');

    if (leaveMessage) {
      return res.status(200).json({
        status: 401,
        message: leaveMessage,
      });
    }

    const leaveApplyMessage = await checkEmployeeLeavePolicyWhenLeaveApply(
      leaveData,
      'update',
      leaveApplyFromEnum.EMPLOYEE,
    );
    if (leaveApplyMessage)
      return res.status(200).json({
        status: 401,
        message: leaveApplyMessage,
      });

    //For Cancelled & Approved
    {
      const findLeave = await executeQuery(
        `SELECT * from "userLeaves" as ul INNER join "userLeaveTransactions" as ult on ul."UserLeaveApplicationID"=ult."ReferenceID" WHERE ul."UserLeaveApplicationID" != ${UserLeaveApplicationID} and ul."authorizationStatus" not in (4) and ul."status"=1 and  ul."userMasterID"=` +
          ':userMasterID' +
          ` and ult."status"=1 and (ult."date" >= :FromDate AND ult."date" <= :ToDate)`,
        {
          replacements: {
            userMasterID: userMasterID,
            FromDate: FromDate,
            ToDate: ToDate,
          },
        },
      );

      if (findLeave.length > 0) {
        if (DayType == 'Full Day') {
          return res.status(200).json({
            status: 401,
            message: 'You have already applied for leave within these range',
          });
        }

        for (var j = 0; j < findLeave.length; j++) {
          if (
            findLeave[j].DayType == DayType ||
            findLeave[j].DayType == 'Full Day'
          ) {
            return res.status(200).json({
              status: 401,
              message: 'You have already applied for leave within these range',
            });
          }
        }
      }
    }

    //For Pending
    {
      const findLeave = await UserLeave.findAll({
        raw: true,
        where: {
          status: 1,
          userMasterID: userMasterID,
          authorizationStatus: [0, 1, 2],
          UserLeaveApplicationID: {
            [Sequelize.Op.ne]: UserLeaveApplicationID,
          },
          [Sequelize.Op.and]: [
            {
              FromDate: {
                [Sequelize.Op.lte]: new Date(ToDate),
              },
            },
            {
              ToDate: {
                [Sequelize.Op.gte]: new Date(FromDate),
              },
            },
          ],
        },
      });
      if (findLeave.length > 0) {
        if (DayType == 'Full Day') {
          return res.status(200).json({
            status: 401,
            message: 'You have already applied for leave within these range',
          });
        }

        for (let j = 0; j < findLeave.length; j++) {
          if (
            findLeave[j].DayType == DayType ||
            findLeave[j].DayType == 'Full Day'
          ) {
            return res.status(200).json({
              status: 401,
              message: 'You have already applied for leave within these range',
            });
          }
        }
      }
    }

    let authorizationdetails = await AuthorizationDetails.findOne({
      where: {
        AuthorizationMasterID: authorizationMasterTypes.leave,
        userMasterID: userMasterID,
        status: 1,
      },
      raw: true,
    });

    // set authorization criteria
    const AuthorizationCriteriaID =
      authorizationdetails?.AuthorizationCriteriaID || null;

    if (authorizationdetails) {
      let AuthorizationCriterias = await AuthorizationCriteria.findOne({
        where: {
          AuthorizationCriteriaID: authorizationdetails.AuthorizationCriteriaID,
          status: 1,
        },
        raw: true,
      });

      if (AuthorizationCriterias.AuthorizationCriteria == 'Sequeance No') {
        authorizationStatus = 2;
      } else {
        authorizationStatus = 1;
      }
    } else {
      authorizationStatus = 0;
    }

    let result = await sequelize.transaction(async (t) => {
      let data = await UserLeave.update(
        {
          LeaveTranId,
          userMasterID,
          companyMasterID,
          FromDate,
          ToDate,
          LeaveDays,
          authorizationStatus: authorizationStatus,
          Remark,
          DayType,
          attachment,
          AuthorizationCriteriaID,
          updateBy,
          updateByIp,
        },
        {
          where: { UserLeaveApplicationID: UserLeaveApplicationID },
          transaction: t,
        },
      );

      let leavedata = await UserLeave.findOne({
        where: {
          UserLeaveApplicationID: UserLeaveApplicationID,
        },
        transaction: t,
      });

      let authorizationdetails = await AuthorizationDetails.findOne({
        where: {
          AuthorizationMasterID: authorizationMasterTypes.leave,
          userMasterID: leavedata.userMasterID,
          status: 1,
        },
        transaction: t,
        raw: true,
      });

      if (authorizationdetails) {
        let AuthorizationCriterias = await AuthorizationCriteria.findOne({
          where: {
            AuthorizationCriteriaID:
              authorizationdetails.AuthorizationCriteriaID,
            status: 1,
          },
          transaction: t,
          raw: true,
        });

        const leaveAuthorizationRequest =
          await LeaveAuthorizationRequest.findAll({
            where: {
              ReferenceID: UserLeaveApplicationID,
            },
            transaction: t,
          });

        let AuthorizationRequestIds = leaveAuthorizationRequest.map(
          (form) => form.AuthorizationRequestId,
        );

        await UserInbox.destroy(
          {
            where: {
              activityTable: LeaveAuthorizationRequest.getTableName(),
              activityTablePK: AuthorizationRequestIds,
            },
          },
          { transaction: t },
        );

        await destroyLeaveAuthAndApprovedLeaveAuth(+UserLeaveApplicationID, t);

        //Mail for Leave..........

        let get_MailTemplate;
        let get_NotificationPolicy =
          await findCompanyNotificationPolicy(+companyMasterID);

        if (get_NotificationPolicy) {
          get_MailTemplate = await MailTemplateEditor.findOne({
            raw: true,
            where: {
              companyMasterID: companyMasterID,
              status: 1,
              mailTypeID: 1,
            },
            transaction: t,
          });

          if (get_MailTemplate) {
            let leavetype = '',
              empcode = '',
              empname = '',
              department = '',
              designation = '',
              branch = '';

            let emp_name = await UserMaster.findOne({
              raw: true,
              where: {
                userMasterID: userMasterID,
                status: 1,
              },
              attributes: ['displayName'],
              transaction: t,
            });
            empname = emp_name ? emp_name.displayName : '';

            let emp_code = await EmployeeJoiningDetails.findOne({
              raw: true,
              where: {
                userMasterID: userMasterID,
                status: 1,
              },
              transaction: t,
              attributes: ['employeeCode'],
            });
            empcode = emp_code ? emp_code.employeeCode : '';

            let leave_type = await HrLeaveTypes.findOne({
              raw: true,
              where: {
                LeaveTranId: LeaveTranId,
                status: 1,
              },
              transaction: t,
              attributes: ['LeaveID'],
              include: [
                {
                  model: HrLeaveMaster,
                  as: 'LeaveMaster',
                  attributes: ['LeaveName'],
                },
              ],
            });
            leavetype = leave_type ? leave_type['LeaveMaster.LeaveName'] : '';

            let emp_branch = await EmployeeBranch.findOne({
              raw: true,
              where: {
                userMasterID: userMasterID,
                status: 1,
                applicableDate: {
                  [Sequelize.Op.lte]: new Date(),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: { [Sequelize.Op.gte]: new Date() },
                  },
                  {
                    endDate: { [Sequelize.Op.eq]: null },
                  },
                ],
              },
              transaction: t,
              attributes: ['branchID'],
              include: [
                {
                  model: BranchMaster,
                  as: 'branchMaster',
                  attributes: ['branchName'],
                },
              ],
            });
            branch = emp_branch ? emp_branch['branchMaster.branchName'] : '';

            let emp_department = await EmployeeDepartment.findOne({
              raw: true,
              where: {
                userMasterID: userMasterID,
                status: 1,
                applicableDate: {
                  [Sequelize.Op.lte]: new Date(),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: { [Sequelize.Op.gte]: new Date() },
                  },
                  {
                    endDate: { [Sequelize.Op.eq]: null },
                  },
                ],
              },
              transaction: t,
              attributes: ['departmentID'],
              include: [
                {
                  model: Department,
                  as: 'department',
                  attributes: ['departmentName'],
                },
              ],
            });
            department = emp_department
              ? emp_department['department.departmentName']
              : '';

            let emp_designation = await EmployeeDesignation.findOne({
              raw: true,
              where: {
                userMasterID: userMasterID,
                status: 1,
                applicableDate: {
                  [Sequelize.Op.lte]: new Date(),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: { [Sequelize.Op.gte]: new Date() },
                  },
                  {
                    endDate: { [Sequelize.Op.eq]: null },
                  },
                ],
              },
              transaction: t,
              attributes: ['designationID'],
              include: [
                {
                  model: Designation,
                  as: 'designation',
                  attributes: ['designationName'],
                },
              ],
            });
            designation = emp_designation
              ? emp_designation['designation.designationName']
              : '';

            get_MailTemplate.subject = get_MailTemplate.subject
              .split('[EmployeeCode]')
              .join(empcode);
            get_MailTemplate.subject = get_MailTemplate.subject
              .split('[EmployeeName]')
              .join(empname);
            get_MailTemplate.subject = get_MailTemplate.subject
              .split('[ToDate]')
              .join(ToDate);
            get_MailTemplate.subject = get_MailTemplate.subject
              .split('[FromDate]')
              .join(FromDate);
            get_MailTemplate.subject = get_MailTemplate.subject
              .split('[Reason]')
              .join(Remark);
            get_MailTemplate.subject = get_MailTemplate.subject
              .split('[NoOfDays]')
              .join(LeaveDays);
            get_MailTemplate.subject = get_MailTemplate.subject
              .split('[Department]')
              .join(department);
            get_MailTemplate.subject = get_MailTemplate.subject
              .split('[Designation]')
              .join(designation);
            get_MailTemplate.subject = get_MailTemplate.subject
              .split('[Branch]')
              .join(branch);
            get_MailTemplate.subject = get_MailTemplate.subject
              .split('[LeaveType]')
              .join(leavetype);

            get_MailTemplate.body = get_MailTemplate.body
              .split('[EmployeeCode]')
              .join(empcode);
            get_MailTemplate.body = get_MailTemplate.body
              .split('[EmployeeName]')
              .join(empname);
            get_MailTemplate.body = get_MailTemplate.body
              .split('[ToDate]')
              .join(ToDate);
            get_MailTemplate.body = get_MailTemplate.body
              .split('[FromDate]')
              .join(FromDate);
            get_MailTemplate.body = get_MailTemplate.body
              .split('[Reason]')
              .join(Remark);
            get_MailTemplate.body = get_MailTemplate.body
              .split('[NoOfDays]')
              .join(LeaveDays);
            get_MailTemplate.body = get_MailTemplate.body
              .split('[Department]')
              .join(department);
            get_MailTemplate.body = get_MailTemplate.body
              .split('[Designation]')
              .join(designation);
            get_MailTemplate.body = get_MailTemplate.body
              .split('[Branch]')
              .join(branch);
            get_MailTemplate.body = get_MailTemplate.body
              .split('[LeaveType]')
              .join(leavetype);
          }
        }

        let employee_name = await UserMaster.findOne({
          raw: true,
          where: {
            userMasterID: userMasterID,
            status: 1,
          },
          transaction: t,
          attributes: ['displayName'],
        });
        const employeename = employee_name ? employee_name.displayName : '';

        if (AuthorizationCriterias.AuthorizationCriteria == 'Sequeance No') {
          let insert_db_status1 = await LeaveAuthorizationRequest.create(
            {
              TableName: 'userLeaves',
              ReferenceID: leavedata.UserLeaveApplicationID,
              userMasterID: authorizationdetails.AuthorizedByUserMasterId[0],
              status: 1,
              authstatus: 2,
              createBy: leavedata.updateBy,
              createByIp: leavedata.updateByIp,
            },
            { transaction: t },
          );

          await UserInbox.create(
            {
              activityTable: LeaveAuthorizationRequest.getTableName(),
              activityTablePK:
                insert_db_status1.toJSON().AuthorizationRequestId,
              message: `${employeename} has applied for leave request from ${moment(
                req.body.FromDate,
              ).format('DD/MM/YYYY')} to ${moment(req.body.ToDate).format(
                'DD/MM/YYYY',
              )}`,
              assignedTo: authorizationdetails.AuthorizedByUserMasterId[0],
              assignedBy: userMasterID,
            },
            { transaction: t },
          );

          let user = await UserMaster.findOne({
            where: {
              userMasterID: authorizationdetails.AuthorizedByUserMasterId[0],
            },
            transaction: t,
          });
          let userinfo = await UserMaster.findOne({
            where: {
              // userMasterID:response[i].createBy
              userMasterID: leavedata.userMasterID,
            },
            transaction: t,
          });
          const notification = {
            title: 'Leave',
            body: userinfo.displayName + ' requested for leave.',
          };
          const data = {
            screen: 'leaveauth',
          };
          await sendNotification(
            authorizationdetails.AuthorizedByUserMasterId[0],
            notification,
            data,
          );

          if (user.email && get_MailTemplate) {
            const myTemplate = JSON.parse(JSON.stringify(get_MailTemplate));
            let AuthorizationRequestId =
              insert_db_status1.toJSON().AuthorizationRequestId;
            const acceptData = {
              AuthorizationRequestId,
              type: 'approve',
              userMasterID: authorizationdetails.AuthorizedByUserMasterId[0],
              companyMasterID: user?.companyMasterId,
            };
            const rejectData = {
              AuthorizationRequestId,
              type: 'reject',
              userMasterID: authorizationdetails.AuthorizedByUserMasterId[0],
              companyMasterID: user?.companyMasterId,
            };
            const acceptedSigned = encodeSecureBreak(acceptData);
            const acceptUrl = `${appURL}#/app/attendances/leave_auth_request/2?data=${acceptedSigned}`;
            const rejectedSigned = encodeSecureBreak(rejectData);
            const rejectUrl = `${appURL}#/app/attendances/leave_auth_request/2?data=${rejectedSigned}`;

            myTemplate.body = myTemplate.body.replace(
              `[ApproveButton]`,
              `<a href="${acceptUrl}" rel="noopener noreferrer" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">Approve</a>`,
            );

            myTemplate.body = myTemplate.body.replace(
              `[RejectButton]`,
              `<a href="${rejectUrl}" rel="noopener noreferrer" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #f44336; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">Reject</a>`,
            );

            let data = {
              email_id: user.email,
              body: myTemplate.body,
              subject: myTemplate.subject,
              email: get_NotificationPolicy.email,
              password: get_NotificationPolicy.password,
              port: get_NotificationPolicy.port,
              host: get_NotificationPolicy.hostmail,
              secure: get_NotificationPolicy.secure,
            };

            sendEmailForLeave(data);
          }
        } else {
          for (
            var j = 0;
            j < authorizationdetails.AuthorizedByUserMasterId.length;
            j++
          ) {
            let insert_db_status1 = await LeaveAuthorizationRequest.create(
              {
                TableName: 'userLeaves',
                ReferenceID: leavedata.UserLeaveApplicationID,
                userMasterID: authorizationdetails.AuthorizedByUserMasterId[j],
                status: 1,
                authstatus: 2,
                createBy: leavedata.updateBy,
                createByIp: leavedata.updateByIp,
              },
              { transaction: t },
            );

            await UserInbox.create(
              {
                activityTable: LeaveAuthorizationRequest.getTableName(),
                activityTablePK:
                  insert_db_status1.toJSON().AuthorizationRequestId,
                message: `${employeename} has applied for leave request from ${moment(
                  req.body.FromDate,
                ).format('DD/MM/YYYY')} to ${moment(req.body.ToDate).format(
                  'DD/MM/YYYY',
                )}`,
                assignedTo: authorizationdetails.AuthorizedByUserMasterId[j],
                assignedBy: userMasterID,
              },
              { transaction: t },
            );

            let user = await UserMaster.findOne({
              where: {
                userMasterID: authorizationdetails.AuthorizedByUserMasterId[j],
              },
              transaction: t,
            });
            let userinfo = await UserMaster.findOne({
              where: {
                // userMasterID:response[i].createBy
                userMasterID: leavedata.userMasterID,
              },
              transaction: t,
            });

            const notification = {
              title: 'Leave',
              body: userinfo.displayName + ' requested for leave.',
            };
            const data = {
              screen: 'leaveauth',
            };
            await sendNotification(
              authorizationdetails.AuthorizedByUserMasterId[j],
              notification,
              data,
            );

            if (user.email && get_MailTemplate) {
              const myTemplate = JSON.parse(JSON.stringify(get_MailTemplate));
              let AuthorizationRequestId =
                insert_db_status1.toJSON().AuthorizationRequestId;
              const acceptData = {
                AuthorizationRequestId,
                type: 'approve',
                userMasterID: authorizationdetails.AuthorizedByUserMasterId[j],
                companyMasterID: user?.companyMasterId,
              };
              const rejectData = {
                AuthorizationRequestId,
                type: 'reject',
                userMasterID: authorizationdetails.AuthorizedByUserMasterId[j],
                companyMasterID: user?.companyMasterId,
              };
              const acceptedSigned = encodeSecureBreak(acceptData);
              const acceptUrl = `${appURL}#/app/attendances/leave_auth_request/2?data=${acceptedSigned}`;
              const rejectedSigned = encodeSecureBreak(rejectData);
              const rejectUrl = `${appURL}#/app/attendances/leave_auth_request/2?data=${rejectedSigned}`;

              myTemplate.body = myTemplate.body.replace(
                `[ApproveButton]`,
                `<a href="${acceptUrl}" rel="noopener noreferrer" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">Approve</a>`,
              );

              myTemplate.body = myTemplate.body.replace(
                `[RejectButton]`,
                `<a href="${rejectUrl}" rel="noopener noreferrer" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #f44336; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">Reject</a>`,
              );

              let data = {
                email_id: user.email,
                body: myTemplate.body,
                subject: myTemplate.subject,
                email: get_NotificationPolicy.email,
                password: get_NotificationPolicy.password,
                port: get_NotificationPolicy.port,
                host: get_NotificationPolicy.hostmail,
                secure: get_NotificationPolicy.secure,
              };
              sendEmailForLeave(data);
            }
          }
        }
      }
    });
    return res.status(200).json({
      status: 200,
      // msg: data,
      message: message.usermessage.userleaveupdate,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * update status
 *
 * @param {id}  UserLeaveApplicationID to update status of user experience
 */

// /*
// *
// delete by id
// * Delete User Data by UserLeaveApplicationID
// *
// */

exports.deleteUserData = async (req, res, next) => {
  try {
    let LeaveID = await req.params.id;
    let result = await sequelize.transaction(async (t) => {
      const leaveAuthorizationRequest = await LeaveAuthorizationRequest.findAll(
        {
          raw: true,
          where: { ReferenceID: LeaveID },
          attributes: ['AuthorizationRequestId'],
          transaction: t,
        },
      );

      let AuthorizationRequestIds = leaveAuthorizationRequest.map(
        (form) => form.AuthorizationRequestId,
      );

      await UserInbox.destroy(
        {
          where: {
            [Sequelize.Op.or]: [
              {
                activityTable: LeaveAuthorizationRequest.getTableName(),
              },
              { activityTable: 'outdoorDutyAuthorizations' },
            ],
            activityTablePK: AuthorizationRequestIds,
          },
        },
        { transaction: t },
      );

      let delete_status1 = await LeaveAuthorizationRequest.update(
        {
          status: 2,
        },
        {
          where: { ReferenceID: LeaveID },
          transaction: t,
        },
      );
      let delete_status = await UserLeave.update(
        {
          status: 2,
        },
        {
          where: { UserLeaveApplicationID: LeaveID },
          transaction: t,
        },
      );

      res
        .status(200)
        .json({ status: 200, message: message.usermessage.userleavedelete });
      return delete_status;
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteUserDataV2 = async (req, res, next) => {
  try {
    // let LeaveID = await req.params.id;
    const { LeaveID, userMasterID } = req.body;

    if (!LeaveID || !userMasterID) {
      return res
        .status(200)
        .json({ status: 400, message: 'Provide valid parameters' });
    }

    const userData = await UserLeave.findOne({
      UserLeaveApplicationID: LeaveID,
      userMasterID: userMasterID,
    });

    if (!userData) {
      return res.status(200).json({ status: 400, mesage: 'Data not found' });
    }

    let result = await sequelize.transaction(async (t) => {
      const leaveAuthorizationRequest = await LeaveAuthorizationRequest.findAll(
        {
          raw: true,
          where: { ReferenceID: LeaveID },
          attributes: ['AuthorizationRequestId'],
          transaction: t,
        },
      );

      let AuthorizationRequestIds = leaveAuthorizationRequest.map(
        (form) => form.AuthorizationRequestId,
      );

      await UserInbox.destroy(
        {
          where: {
            [Sequelize.Op.or]: [
              {
                activityTable: LeaveAuthorizationRequest.getTableName(),
              },
              { activityTable: 'outdoorDutyAuthorizations' },
            ],
            activityTablePK: AuthorizationRequestIds,
          },
        },
        { transaction: t },
      );

      let delete_status1 = await LeaveAuthorizationRequest.update(
        {
          status: 2,
        },
        {
          where: { ReferenceID: LeaveID },
          transaction: t,
        },
      );
      let delete_status = await UserLeave.update(
        {
          status: 2,
        },
        {
          where: {
            UserLeaveApplicationID: LeaveID,
            userMasterID: userMasterID,
          },
          transaction: t,
        },
      );

      res
        .status(200)
        .json({ status: 200, message: message.usermessage.userleavedelete });
      return delete_status;
    });
  } catch (err) {
    next(err);
  }
};

exports.getLeaveByLeaveId = async (req, res, next) => {
  try {
    let leavstatus;
    let LeaveTranData;

    leavstatus = await executeQuery(
      `select * from "public"."userLeaves" where "UserLeaveApplicationID"=` +
        ':UserLeaveApplicationID' +
        ``,
      {
        replacements: {
          UserLeaveApplicationID: req.params.id,
        },
      },
    );

    if (leavstatus.length > 0) {
      if (
        leavstatus[0].authorizationStatus == 3 ||
        leavstatus[0].authorizationStatus == 4
      ) {
        LeaveTranData = await executeQuery(
          `select * from "public"."userLeaveTransactions" where "ReferenceID"=` +
            ':ReferenceID' +
            ` order by "date" ASC`,
          {
            replacements: {
              ReferenceID: req.params.id,
            },
          },
        );

        if (LeaveTranData.length > 0) {
          for (var j = 0; j < LeaveTranData.length; j++) {
            LeaveTranType = await executeQuery(
              `select LM."LeaveName" from "hrLeaveTypes" as LT inner join "public"."hrLeaveMasters" as LM on LT."LeaveID"=LM."LeaveID"  where LT."LeaveTranId"=` +
                LeaveTranData[j].LeaveTranId +
                ``,
            );
            LeaveTranData[j].LeaveTypeAfterAuth = LeaveTranType[0].LeaveName;
            if (LeaveTranData[j].status == 1) {
              LeaveTranData[j].LeaveTypeAfterAuthStatus = 'Accepted';
            } else {
              LeaveTranData[j].LeaveTypeAfterAuthStatus = 'Cancelled';
            }
          }
        }
      } else {
        LeaveTranData = [];
      }
    }

    res.status(200).json({ status: 200, data: LeaveTranData });
  } catch (err) {
    next(err);
  }
};

exports.getOptionalLeaveByUserId = async (req, res, next) => {
  try {
    const { userMasterID, startDate, endDate } = req.query;

    if (!userMasterID) {
      return res.status(200).json({
        status: 401,
        message: 'userMasterID is required fields!',
      });
    }

    const condition = {};

    condition.userMasterID = userMasterID;
    condition.optionalHoliday = true;

    if (startDate && endDate) {
      condition.date = {
        [Sequelize.Op.between]: [startDate, endDate],
      };
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    const optionalHoliday = await weekoffHolidayTran.findAll({
      raw: true,
      where: condition,
      include: {
        model: UserMaster,
        required: true,
        where: { ...userAccessCondition.where },
        include: [...userAccessCondition.includeModels],
      },
    });

    return res.status(200).json({
      status: 200,
      data: optionalHoliday,
    });
  } catch (error) {
    next(error);
  }
};

exports.validateUploadExcel = async (req, res, next) => {
  if (!req.file) {
    return res
      .status(200)
      .send({ status: 400, message: 'Please upload an excel file!' });
  }

  const filePath = path.join(__dirname, `../uploads/${req.file.filename}`);

  try {
    const excelRows = await readXlsxFile(filePath);
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    // Skip header
    excelRows.shift();
    const convertExcelDateToISO = (excelDate) => {
      return new Date(Math.round(excelDate - 25569) * 86400 * 1000)
        .toISOString()
        .slice(0, 10);
    };

    const formatDateStringToISO = (dateString) => {
      return new Date(dateString).toISOString().slice(0, 10);
    };
    const isValidDate = (date) => !isNaN(new Date(date).getTime());
    const currentdate = asiaKolkataDateTime(new Date()).slice(0, 10);

    let fileUploadType = FileUploadType.MOBILE_NUMBER;
    const companyData = await companyMaster.findOne({
      where: { companyMasterID: req.body.companyMasterID },
      attributes: ['fileUploadType'],
      raw: true,
    });
    if (companyData.fileUploadType == FileUploadType.EMPLOYEE_CODE)
      fileUploadType = companyData.fileUploadType;

    const [allUsersData, companyWiseLeaveTypeData] =
      await getUserDataAndLeaveTypes(
        req.body.companyMasterID,
        currentdate,
        fileUploadType,
      );

    const employeeLeavePolicyIds = [
      ...new Set(
        allUsersData.flatMap(
          (e) => e.empLeavePolicies?.[0]?.employeeLeavePolicyID ?? [],
        ),
      ),
    ];

    let allEmpLeavePolicy = [];

    if (employeeLeavePolicyIds.length) {
      allEmpLeavePolicy = await employeeLeavePolicy.findAll({
        where: {
          id: {
            [Sequelize.Op.in]: employeeLeavePolicyIds,
          },
          applyLeave: false,
        },
        attributes: ['id', 'leaveId'],
      });
    }

    const leavePolicyMap = new Map(
      allEmpLeavePolicy.map((e) => [e.id, e.leaveId]),
    );

    const userWiseLeaveMap = new Map();
    const notFoundUserMap = new Map();

    excelRowsLoop: for (const row of excelRows) {
      let empCodeOrNumber = row[0]?.toString().trim();
      if (!empCodeOrNumber) continue excelRowsLoop;

      let leaveName = row[1];
      let dayType = row[2];
      let fromDateInput = row[3];
      let toDateInput = row[4];
      let leaveRemarkInput = row[5];

      const baseObj = {
        companyMasterID: req.body.companyMasterID,
        userMasterID: null,
        displayName: '',
        employeeCode:
          fileUploadType == FileUploadType.EMPLOYEE_CODE
            ? empCodeOrNumber
            : null,
        userNumber:
          fileUploadType == FileUploadType.MOBILE_NUMBER
            ? empCodeOrNumber
            : null,
        branch: '',
        designation: '',
        department: '',
        company: '',
        remarks: [],
        userWiseLeaves: [],
        isDeleted: false,
      };

      // ----- FIND USER -----
      let userData = null;
      if (fileUploadType == FileUploadType.MOBILE_NUMBER) {
        userData = allUsersData.find((e) => e.userNumber == baseObj.userNumber);
      } else {
        userData = allUsersData.find(
          (e) =>
            e.employeeJoiningDetails?.[0]?.employeeCode == baseObj.employeeCode,
        );
      }

      // Prepare leaveRow
      const leaveRow = {
        LeaveTranId: leaveName,
        LeaveName: leaveName,
        DayType: dayType,
        FromDate: fromDateInput,
        ToDate: toDateInput,
        Remark: leaveRemarkInput,
        LeaveDays: '',
        attachment: null,
        companyMasterID: req.body.companyMasterID,
        leaveFrom: leaveApplyFromEnum.ADMIN,
        createBy,
        createByIp,
        status: 1,
        userMasterID: userData?.userMasterID || null,
        authorizationStatus: 0,
      };

      if (!userData) {
        if (!notFoundUserMap.has(empCodeOrNumber)) {
          notFoundUserMap.set(empCodeOrNumber, baseObj);
        }
        notFoundUserMap.get(empCodeOrNumber).userWiseLeaves.push(leaveRow);
        notFoundUserMap
          .get(empCodeOrNumber)
          .remarks.push(
            `User with ${fileUploadType} ${empCodeOrNumber} not found.`,
          );
        continue excelRowsLoop;
      }
      baseObj.userMasterID = userData.userMasterID;
      const parsedInfo = parseEmployeeInfo(userData);
      baseObj.displayName = userData.displayName;
      baseObj.employeeCode = parsedInfo?.employeeCode;
      baseObj.company = parsedInfo?.companyName;
      baseObj.branch = parsedInfo?.branch;
      baseObj.designation = parsedInfo?.designation;
      baseObj.department = parsedInfo?.department;

      // Mandatory fields
      if (!leaveRow.FromDate) {
        pushToUserMap(baseObj, `Please Enter From Date`, leaveRow);
        continue excelRowsLoop;
      }

      if (!leaveRow.ToDate && dayType === 'Full Day') {
        pushToUserMap(baseObj, `Please Enter To Date`, leaveRow);
        continue excelRowsLoop;
      }

      // ----- Convert FROM DATE -----
      if (typeof leaveRow.FromDate == 'number') {
        leaveRow.FromDate = convertExcelDateToISO(leaveRow.FromDate);
      } else if (isValidDate(leaveRow.FromDate)) {
        leaveRow.FromDate = formatDateStringToISO(leaveRow.FromDate);
      } else {
        pushToUserMap(baseObj, `From Date Should be in 'yyyy-mm-dd'`, leaveRow);
        continue excelRowsLoop;
      }

      if (dayType == 'Full Day') {
        if (typeof leaveRow.ToDate == 'number') {
          leaveRow.ToDate = convertExcelDateToISO(leaveRow.ToDate);
        } else if (isValidDate(leaveRow.ToDate)) {
          leaveRow.ToDate = formatDateStringToISO(leaveRow.ToDate);
        } else {
          pushToUserMap(baseObj, `To Date Should be in 'yyyy-mm-dd'`, leaveRow);
          continue excelRowsLoop;
        }
      } else {
        leaveRow.ToDate = leaveRow.FromDate; // Half day
      }
      if (dayType == 'Full Day') {
        if (new Date(leaveRow.FromDate) > new Date(leaveRow.ToDate)) {
          pushToUserMap(
            baseObj,
            `To Date Should be Greater Than From Date'`,
            leaveRow,
          );
          continue excelRowsLoop;
        }
      }
      if (!leaveRemarkInput) {
        pushToUserMap(baseObj, `Leave Reason is Required`, leaveRow);
        continue excelRowsLoop;
      }
      // Leave Days
      leaveRow.LeaveDays =
        dayType === 'First Half' || dayType === 'Second Half'
          ? 0.5
          : getDaysFromDates(leaveRow.FromDate, leaveRow.ToDate);

      const leaveTypeData = companyWiseLeaveTypeData.find(
        (e) => e.LeaveMaster.LeaveName == leaveRow.LeaveName,
      );

      if (!leaveTypeData) {
        pushToUserMap(baseObj, `Leave Type Does Not Exist`, leaveRow);
        continue excelRowsLoop;
      } else {
        leaveRow.LeaveTranId = leaveTypeData.LeaveTranId;
        leaveRow.LeaveName = leaveTypeData.LeaveMaster?.LeaveName;
      }

      const empLeavePolicyIds =
        userData.empLeavePolicies?.[0]?.employeeLeavePolicyID;

      const leaveIds = (empLeavePolicyIds || [])
        .map((id) => leavePolicyMap.get(id))
        .filter(Boolean);

      const currentLeaveId = +leaveTypeData.LeaveID;

      if (leaveIds.includes(currentLeaveId)) {
        pushToUserMap(
          baseObj,
          `Leave request is not allowed for ${leaveRow.LeaveName || 'this leave'}.`,
          leaveRow,
        );
        continue excelRowsLoop;
      }

      // check verify attendance
      const att_verify = await HrLeaveMonthlyTrans.findOne({
        where: {
          userMasterID: leaveRow.userMasterID,
          verified: 1,
          monthstartdate: {
            [Sequelize.Op.lte]: leaveRow.ToDate,
          },
          monthenddate: {
            [Sequelize.Op.gte]: leaveRow.FromDate,
          },
        },
      });

      if (att_verify) {
        pushToUserMap(baseObj, `Attendance already verified.`, leaveRow);
        continue excelRowsLoop;
      }

      const findApprovedOrCancelledLeave = await executeQuery(
        `SELECT * from "userLeaves" as ul INNER join "userLeaveTransactions" as ult on ul."UserLeaveApplicationID"=ult."ReferenceID" WHERE ul."authorizationStatus" not in (4) and ul."status"=1 and ul."userMasterID"=` +
          ':userMasterID' +
          ` and ult."status"=1 and (ult."date" >= :FromDate AND ult."date" <= :ToDate)`,
        {
          replacements: {
            userMasterID: leaveRow.userMasterID,
            FromDate: leaveRow.FromDate,
            ToDate: leaveRow.ToDate,
          },
        },
      );

      if (findApprovedOrCancelledLeave.length > 0) {
        if (leaveRow.DayType == 'Full Day') {
          pushToUserMap(
            baseObj,
            `You have already applied for a ${leaveRow.DayType} leave between ${leaveRow.FromDate} and ${leaveRow.ToDate} within this date range.`,
            leaveRow,
          );
          continue excelRowsLoop;
        }
        findApprovedOrCancelledLeaveLoop: for (let leave of findApprovedOrCancelledLeave) {
          if (
            leave.DayType == leaveRow.DayType ||
            leave.DayType == 'Full Day'
          ) {
            pushToUserMap(
              baseObj,
              `You have already applied for a ${leaveRow.DayType} leave on ${leaveRow.FromDate}.`,
              leaveRow,
            );
            continue excelRowsLoop;
          }
        }
      }

      //For Pending
      {
        const findPendingLeave = await UserLeave.findAll({
          raw: true,
          where: {
            status: 1,
            userMasterID: leaveRow.userMasterID,
            [Sequelize.Op.or]: [
              {
                FromDate: {
                  [Sequelize.Op.between]: [
                    new Date(leaveRow.FromDate),
                    new Date(leaveRow.ToDate),
                  ],
                },
              },
              {
                ToDate: {
                  [Sequelize.Op.between]: [
                    new Date(leaveRow.FromDate),
                    new Date(leaveRow.ToDate),
                  ],
                },
              },
              {
                FromDate: {
                  [Sequelize.Op.lte]: new Date(leaveRow.FromDate),
                },
                ToDate: { [Sequelize.Op.gte]: new Date(leaveRow.ToDate) },
              },
            ],
            authorizationStatus: [0, 1, 2],
          },
        });
        if (findPendingLeave.length > 0) {
          if (leaveRow.DayType == 'Full Day') {
            pushToUserMap(
              baseObj,
              `You have already applied for a ${leaveRow.DayType} leave between ${leaveRow.FromDate} and ${leaveRow.ToDate} within this date range.`,
              leaveRow,
            );
            continue excelRowsLoop;
          }
          findPendingLeaveLoop: for (let leave of findPendingLeave) {
            if (
              leave.DayType == leaveRow.DayType ||
              leave.DayType == 'Full Day'
            ) {
              pushToUserMap(
                baseObj,
                `You have already applied for a ${leaveRow.DayType} leave on ${leaveRow.FromDate}.`,
                leaveRow,
              );
              continue excelRowsLoop;
            }
          }
        }
      }
      pushToUserMap(baseObj, null, leaveRow);
    }
    function pushToUserMap(userObj, remark = null, leaveRow = null) {
      if (!userWiseLeaveMap.has(userObj.userMasterID)) {
        userWiseLeaveMap.set(userObj.userMasterID, userObj);
      }

      const mapObj = userWiseLeaveMap.get(userObj.userMasterID);

      if (remark) mapObj.remarks.push(remark);
      if (leaveRow) mapObj.userWiseLeaves.push(leaveRow);
    }

    const leavedata = Array.from(userWiseLeaveMap.values());
    const notFoundUserData = Array.from(notFoundUserMap.values());
    const finalValidatedData = [];
    finalValidatedData.push(...notFoundUserData);
    leaveDataLoop: for (let data of leavedata) {
      if (data.userWiseLeaves.length == 0) continue leaveDataLoop;
      if (data.remarks.length) {
        finalValidatedData.push(data);
        continue leaveDataLoop;
      }
      const leaveMessage = await checkUserLeaveBalance(
        data.userWiseLeaves,
        'add',
      );
      if (leaveMessage) {
        data.remarks.push(leaveMessage);
        finalValidatedData.push(data);
        continue leaveDataLoop;
      }
      finalValidatedData.push(data);
    }

    fs.unlink(filePath, function (err) {});
    return res.status(200).json({
      status: 200,
      message: message.usermessage.validateMessage('Manual Leave'),
      data: finalValidatedData,
    });
  } catch (error) {
    next(error);
  }
};

exports.revalidateManualLeave = async (req, res, next) => {
  try {
    const { manualLeaveData, companyMasterID } = req.body;

    const currentdate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const [allUsersData, companyWiseLeaveTypeData] =
      await getUserDataAndLeaveTypes(req.body.companyMasterID, currentdate);

    const employeeLeavePolicyIds = [
      ...new Set(
        allUsersData.flatMap(
          (e) => e.empLeavePolicies?.[0]?.employeeLeavePolicyID ?? [],
        ),
      ),
    ];

    let allEmpLeavePolicy = [];

    if (employeeLeavePolicyIds.length) {
      allEmpLeavePolicy = await employeeLeavePolicy.findAll({
        where: {
          id: {
            [Sequelize.Op.in]: employeeLeavePolicyIds,
          },
          applyLeave: false,
        },
        attributes: ['id', 'leaveId'],
      });
    }

    const leavePolicyMap = new Map(
      allEmpLeavePolicy.map((e) => [e.id, e.leaveId]),
    );

    const revalidatedData = [];

    manualLeaveDataLoop: for (const row of manualLeaveData) {
      if (!row.userMasterID) {
        revalidatedData.push(row);
        continue manualLeaveDataLoop;
      }
      row.remarks = [];
      const userWiseData = allUsersData.find(
        (e) => e.userMasterID == row.userMasterID,
      );
      row.userMasterID = userWiseData.userMasterID;
      const parsedInfo = parseEmployeeInfo(userWiseData);
      row.displayName = userWiseData.displayName;
      row.employeeCode = parsedInfo?.employeeCode;
      row.company = parsedInfo?.companyName;
      row.branch = parsedInfo?.branch;
      row.designation = parsedInfo?.designation;
      row.department = parsedInfo?.department;
      const userWiseLeaveData = [];
      userWiseLeavesLoop: for (let leaveRow of row.userWiseLeaves) {
        if (!leaveRow.FromDate) {
          row.remarks.push(`Please Enter From Date`);
          userWiseLeaveData.push(leaveRow);
          continue userWiseLeavesLoop;
        }

        if (!leaveRow.ToDate && leaveRow.DayType === 'Full Day') {
          row.remarks.push(`Please Enter To Date`);
          userWiseLeaveData.push(leaveRow);
          continue userWiseLeavesLoop;
        }
        if (leaveRow.DayType != 'Full Day') {
          leaveRow.ToDate = leaveRow.FromDate;
        }
        if (leaveRow.DayType == 'Full Day') {
          if (new Date(leaveRow.FromDate) > new Date(leaveRow.ToDate)) {
            row.remarks.push(`To Date Should be Greater Than From Date`);
            userWiseLeaveData.push(leaveRow);
            continue userWiseLeavesLoop;
          }
        }
        if (!leaveRow.Remark) {
          row.remarks.push(`Leave Reason is Required`);
          userWiseLeaveData.push(leaveRow);
          continue userWiseLeavesLoop;
        }
        leaveRow.LeaveDays =
          leaveRow.DayType == 'First Half' || leaveRow.DayType == 'Second Half'
            ? 0.5
            : getDaysFromDates(leaveRow.FromDate, leaveRow.ToDate);
        const leaveTypeData = companyWiseLeaveTypeData.find(
          (e) => e.LeaveMaster.LeaveName == leaveRow.LeaveName,
        );
        if (!leaveTypeData) {
          row.remarks.push(`Leave Type Does Not Exist`);
          userWiseLeaveData.push(leaveRow);
          continue userWiseLeavesLoop;
        } else {
          leaveRow.LeaveTranId = leaveTypeData.LeaveTranId;
          leaveRow.LeaveName = leaveTypeData.LeaveMaster?.LeaveName;
        }

        const empLeavePolicyIds =
          userWiseData.empLeavePolicies?.[0]?.employeeLeavePolicyID;

        const leaveIds = (empLeavePolicyIds || [])
          .map((id) => leavePolicyMap.get(id))
          .filter(Boolean);

        const currentLeaveId = +leaveTypeData.LeaveID;

        if (leaveIds.includes(currentLeaveId)) {
          row.remarks.push(
            `Leave request is not allowed for ${leaveRow.LeaveName || 'this leave'}.`,
          );
          userWiseLeaveData.push(leaveRow);
          continue userWiseLeavesLoop;
        }

        // check verify attendance
        const att_verify = await HrLeaveMonthlyTrans.findOne({
          where: {
            userMasterID: leaveRow.userMasterID,
            verified: 1,
            monthstartdate: {
              [Sequelize.Op.lte]: leaveRow.ToDate,
            },
            monthenddate: {
              [Sequelize.Op.gte]: leaveRow.FromDate,
            },
          },
        });

        if (att_verify) {
          row.remarks.push(`Attendance already verified.`);
          userWiseLeaveData.push(leaveRow);
          continue userWiseLeavesLoop;
        }

        const findApprovedOrCancelledLeave = await executeQuery(
          `SELECT * from "userLeaves" as ul INNER join "userLeaveTransactions" as ult on ul."UserLeaveApplicationID"=ult."ReferenceID" WHERE ul."authorizationStatus" not in (4) and ul."status"=1 and ul."userMasterID"=` +
            ':userMasterID' +
            ` and ult."status"=1 and (ult."date" >= :FromDate AND ult."date" <= :ToDate)`,
          {
            replacements: {
              userMasterID: leaveRow.userMasterID,
              FromDate: leaveRow.FromDate,
              ToDate: leaveRow.ToDate,
            },
          },
        );

        if (findApprovedOrCancelledLeave.length > 0) {
          if (leaveRow.DayType == 'Full Day') {
            row.remarks.push(
              `You have already applied for a ${leaveRow.DayType} leave between ${leaveRow.FromDate} and ${leaveRow.ToDate} within this date range.`,
            );
            userWiseLeaveData.push(leaveRow);
            continue userWiseLeavesLoop;
          }
          findApprovedOrCancelledLeaveLoop: for (let leave of findApprovedOrCancelledLeave) {
            if (
              leave.DayType == leaveRow.DayType ||
              leave.DayType == 'Full Day'
            ) {
              row.remarks.push(
                `You have already applied for a ${leaveRow.DayType} leave on ${leaveRow.FromDate}.`,
              );
              userWiseLeaveData.push(leaveRow);
              continue userWiseLeavesLoop;
            }
          }
        }
        //For Pending

        const findPendingLeave = await UserLeave.findAll({
          raw: true,
          where: {
            status: 1,
            userMasterID: leaveRow.userMasterID,
            [Sequelize.Op.or]: [
              {
                FromDate: {
                  [Sequelize.Op.between]: [
                    new Date(leaveRow.FromDate),
                    new Date(leaveRow.ToDate),
                  ],
                },
              },
              {
                ToDate: {
                  [Sequelize.Op.between]: [
                    new Date(leaveRow.FromDate),
                    new Date(leaveRow.ToDate),
                  ],
                },
              },
              {
                FromDate: {
                  [Sequelize.Op.lte]: new Date(leaveRow.FromDate),
                },
                ToDate: { [Sequelize.Op.gte]: new Date(leaveRow.ToDate) },
              },
            ],
            authorizationStatus: [0, 1, 2],
          },
        });
        if (findPendingLeave.length > 0) {
          if (leaveRow.DayType == 'Full Day') {
            row.remarks.push(
              `You have already applied for a ${leaveRow.DayType} leave between ${leaveRow.FromDate} and ${leaveRow.ToDate} within this date range.`,
            );
            userWiseLeaveData.push(leaveRow);
            continue userWiseLeavesLoop;
          }
          findPendingLeaveLoop: for (let leave of findPendingLeave) {
            if (
              leave.DayType == leaveRow.DayType ||
              leave.DayType == 'Full Day'
            ) {
              row.remarks.push(
                `You have already applied for a ${leaveRow.DayType} leave on ${leaveRow.FromDate}.`,
              );
              userWiseLeaveData.push(leaveRow);
              continue userWiseLeavesLoop;
            }
          }
        }
        userWiseLeaveData.push(leaveRow);
      }
      row.userWiseLeaves = userWiseLeaveData;
      if (row.userWiseLeaves.length == 0) continue manualLeaveDataLoop;
      if (row.remarks.length) {
        revalidatedData.push(row);
        continue manualLeaveDataLoop;
      }
      const leaveMessage = await checkUserLeaveBalance(
        row.userWiseLeaves,
        'add',
      );
      if (leaveMessage) {
        row.remarks.push(leaveMessage);
        revalidatedData.push(row);
        continue manualLeaveDataLoop;
      }
      revalidatedData.push(row);
    }

    return res.status(200).json({
      status: 200,
      message: message.usermessage.reValidateMessage('Manual Leave'),
      data: revalidatedData,
    });
  } catch (error) {
    next(error);
  }
};

exports.addValidateManualLeave = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { manualLeaveData } = req.body;

    const finalLeavsArray = manualLeaveData.flatMap((e) => e.userWiseLeaves);
    await UserLeave.bulkCreate(finalLeavsArray, {
      individualHooks: true,
      transaction,
    }).then(async (response) => {
      const allUserIds = [...new Set(response.map((e) => +e.userMasterID))];
      const companyId = response?.[0]?.companyMasterID || null;

      const AllUsersAuthorizationdetails = await AuthorizationDetails.findAll({
        where: {
          AuthorizationMasterID: authorizationMasterTypes.leave,
          userMasterID: allUserIds,
          status: 1,
        },
      });
      const AllUsersDetails = await UserMaster.findAll({
        where: {
          userMasterID: {
            [Sequelize.Op.in]: allUserIds,
          },
        },
        include: [
          {
            model: EmployeeDesignation,
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date() },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date() } },
                { endDate: { [Sequelize.Op.eq]: null } },
              ],
            },
            required: false,
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
            model: EmployeeDepartment,
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date() },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date() } },
                { endDate: { [Sequelize.Op.eq]: null } },
              ],
            },
            required: false,
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
            model: EmployeeBranch,
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date() },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date() } },
                { endDate: { [Sequelize.Op.eq]: null } },
              ],
            },
            required: false,
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
            model: EmployeeJoiningDetails,
            attributes: ['employeeCode'],
          },

          // Attendance Policy
          {
            model: EmployeeAttendancePolicy,
            where: {
              status: 1,
            },
            required: false,
            attributes: ['attendancePolicyID', 'startDate', 'endDate'],
            include: [
              {
                model: AttendancePolicy,
                as: 'attendancePolicy',
                attributes: [
                  'sandwichLeave',
                  ['weekoffsandwichLeave', 'w_sandwich'],
                  ['holidaysandwichLeave', 'h_sandwich'],
                ],
              },
            ],
          },
          // Employee Leave Policy
          {
            model: empLeavePolicy,
            where: {
              status: 1,
            },
            required: false,
            attributes: [
              'employeeLeavePolicyID',
              'userMasterID',
              'applicableDate',
              'endDate',
            ],
          },
        ],
      });

      const get_NotificationPolicy =
        await findCompanyNotificationPolicy(companyId);

      let get_MailTemplate;

      if (get_NotificationPolicy && companyId) {
        get_MailTemplate = await MailTemplateEditor.findOne({
          where: {
            companyMasterID: companyId,
            status: 1,
            mailTypeID: 1,
          },
        });
      }

      const allLeaveTypes = await HrLeaveTypes.findAll({
        where: {
          LeaveTranId: [...new Set(response.map((e) => +e.LeaveTranId))],
          status: 1,
        },
        attributes: ['LeaveID', 'LeaveTranId'],
        include: [
          {
            model: HrLeaveMaster,
            as: 'LeaveMaster',
            attributes: ['LeaveName'],
          },
        ],
      });

      const allLeavePolicy = companyId
        ? await employeeLeavePolicy.findAll({
            where: {
              companyMasterId: companyId,
            },
            attributes: ['id', 'isAutoApprove', 'autoApproveLimit', 'leaveId'],
          })
        : [];

      for (let i = 0; i < response.length; i++) {
        const endDate = response[i].ToDate;
        const leaveId =
          allLeaveTypes.find((e) => e.LeaveTranId == response[i].LeaveTranId)
            ?.LeaveID ?? null;

        const employeeData = AllUsersDetails.find(
          (e) => +e.userMasterID == +response[i].userMasterID,
        );

        if (!employeeData) continue;

        const empLeavePolicyIds =
          (employeeData.empLeavePolicies || []).find(
            (p) =>
              new Date(p.applicableDate) <= new Date(endDate) &&
              (!p.endDate || new Date(p.endDate) >= new Date(endDate)),
          )?.employeeLeavePolicyID || [];

        const employeeLeavePolicy = allLeavePolicy.find(
          (e) => empLeavePolicyIds.includes(e.id) && e.leaveId == leaveId,
        );

        // if auto approve is set
        if (employeeLeavePolicy?.isAutoApprove) {
          // get attendance policy
          const attendancePolicy =
            (employeeData.employeeAttendancePolicies || []).find(
              (p) =>
                new Date(p.startDate) <= new Date(endDate) &&
                (!p.endDate || new Date(p.endDate) >= new Date(endDate)),
            )?.attendancePolicy || null;

          // process leave for auto approval

          const autoApproved = await processAutoApproveLeave(
            response[i],
            employeeLeavePolicy.autoApproveLimit,
            attendancePolicy,
            leaveId == 6,
            transaction,
            req,
          );
          // if leave get approved
          if (autoApproved) continue;
        }

        const authorizationdetails = AllUsersAuthorizationdetails.find(
          (e) => e.userMasterID == response[i].userMasterID,
        );

        if (!authorizationdetails) continue;

        const authorizationStatus = authorizationdetails
          ? authorizationdetails.AuthorizationCriteriaID ==
            authorizationCriteriaType.SEQUENCENO
            ? 2
            : 1
          : 0;
        // set authorization criteria
        const AuthorizationCriteriaID =
          authorizationdetails?.AuthorizationCriteriaID || null;

        response[i].authorizationStatus = authorizationStatus;
        response[i].AuthorizationCriteriaID = AuthorizationCriteriaID;
        await response[i].save({ transaction });

        const employeename = employeeData?.displayName || '';

        if (get_NotificationPolicy) {
          if (get_MailTemplate) {
            const empcode =
              employeeData.employeeJoiningDetails?.[0]?.employeeCode || '';
            const empname = employeename;
            const department =
              employeeData.employeeDepartments?.[0]?.department
                ?.departmentName || '';
            const designation =
              employeeData.employeeDesignations?.[0]?.designation
                ?.designationName || '';
            const branch =
              employeeData.employeeBranches?.[0]?.branchMaster?.branchName ||
              '';

            const leavetype =
              allLeaveTypes.find(
                (e) => +e.LeaveTranId == +response[i].LeaveTranId,
              )?.LeaveMaster?.LeaveName || '';

            get_MailTemplate.subject = get_MailTemplate.subject.replace(
              '[EmployeeCode]',
              empcode,
            );
            get_MailTemplate.subject = get_MailTemplate.subject.replace(
              '[EmployeeName]',
              empname,
            );
            get_MailTemplate.subject = get_MailTemplate.subject.replace(
              '[ToDate]',
              response[i].ToDate,
            );
            get_MailTemplate.subject = get_MailTemplate.subject.replace(
              '[FromDate]',
              response[i].FromDate,
            );
            get_MailTemplate.subject = get_MailTemplate.subject.replace(
              '[Reason]',
              response[i].Remark,
            );
            get_MailTemplate.subject = get_MailTemplate.subject.replace(
              '[NoOfDays]',
              response[i].LeaveDays,
            );
            get_MailTemplate.subject = get_MailTemplate.subject.replace(
              '[Department]',
              department,
            );
            get_MailTemplate.subject = get_MailTemplate.subject.replace(
              '[Designation]',
              designation,
            );
            get_MailTemplate.subject = get_MailTemplate.subject.replace(
              '[Branch]',
              branch,
            );
            get_MailTemplate.subject = get_MailTemplate.subject.replace(
              '[LeaveType]',
              leavetype,
            );

            get_MailTemplate.body = get_MailTemplate.body.replace(
              '[EmployeeCode]',
              empcode,
            );
            get_MailTemplate.body = get_MailTemplate.body.replace(
              '[EmployeeName]',
              empname,
            );
            get_MailTemplate.body = get_MailTemplate.body.replace(
              '[ToDate]',
              response[i].ToDate,
            );
            get_MailTemplate.body = get_MailTemplate.body.replace(
              '[FromDate]',
              response[i].FromDate,
            );
            get_MailTemplate.body = get_MailTemplate.body.replace(
              '[Reason]',
              response[i].Remark,
            );
            get_MailTemplate.body = get_MailTemplate.body.replace(
              '[NoOfDays]',
              response[i].LeaveDays,
            );
            get_MailTemplate.body = get_MailTemplate.body.replace(
              '[Department]',
              department,
            );
            get_MailTemplate.body = get_MailTemplate.body.replace(
              '[Designation]',
              designation,
            );
            get_MailTemplate.body = get_MailTemplate.body.replace(
              '[Branch]',
              branch,
            );
            get_MailTemplate.body = get_MailTemplate.body.replace(
              '[LeaveType]',
              leavetype,
            );
          }
        }

        if (
          authorizationdetails.AuthorizationCriteriaID ==
          authorizationCriteriaType.SEQUENCENO
        ) {
          let insert_db_status1 = await LeaveAuthorizationRequest.create(
            {
              TableName: 'userLeaves',
              ReferenceID: response[i].UserLeaveApplicationID,
              userMasterID: authorizationdetails.AuthorizedByUserMasterId[0],
              status: 1,
              authstatus: 2,
              createBy: response[i].createBy,

              createByIp: response[i].createByIp,
            },
            { transaction },
          );

          await UserInbox.create(
            {
              activityTable: LeaveAuthorizationRequest.getTableName(),
              activityTablePK:
                insert_db_status1.toJSON().AuthorizationRequestId,
              message: `${employeename} has applied for leave request from ${moment(
                response[i].FromDate,
              ).format('DD/MM/YYYY')} to ${moment(response[i].ToDate).format(
                'DD/MM/YYYY',
              )}`,
              assignedTo: authorizationdetails.AuthorizedByUserMasterId[0],
              assignedBy: response[i].userMasterID,
            },
            { transaction },
          );

          let user = await UserMaster.findOne({
            where: {
              userMasterID: authorizationdetails.AuthorizedByUserMasterId[0],
            },
          });
          let userinfo = await UserMaster.findOne({
            where: {
              // userMasterID:response[i].createBy
              userMasterID: response[i].userMasterID,
            },
          });

          if (user && userinfo) {
            const notification = {
              title: 'Leave',
              body: userinfo.displayName + ' requested for leave.',
            };
            const data = {
              screen: 'leaveauth',
              isScheduled: 'true',
              scheduledTime: new Date().toISOString(),
            };
            await sendNotification(user.userMasterID, notification, data);
          }

          if (user.email && get_MailTemplate) {
            let data = {
              email_id: user.email,
              body: get_MailTemplate.body,
              subject: get_MailTemplate.subject,
              email: get_NotificationPolicy.email,
              password: get_NotificationPolicy.password,
              port: get_NotificationPolicy.port,
              host: get_NotificationPolicy.hostmail,
              secure: get_NotificationPolicy.secure,
            };

            sendEmailForLeave(data);
          }
        } else {
          for (
            var j = 0;
            j < authorizationdetails.AuthorizedByUserMasterId.length;
            j++
          ) {
            let insert_db_status1 = await LeaveAuthorizationRequest.create(
              {
                TableName: 'userLeaves',
                ReferenceID: response[i].UserLeaveApplicationID,
                userMasterID: authorizationdetails.AuthorizedByUserMasterId[j],
                status: 1,
                authstatus: 2,
                createBy: response[i].createBy,
                createByIp: response[i].createByIp,
              },
              { transaction },
            );

            await UserInbox.create(
              {
                activityTable: LeaveAuthorizationRequest.getTableName(),
                activityTablePK:
                  insert_db_status1.toJSON().AuthorizationRequestId,
                message: `${employeename} has applied for leave request from ${moment(
                  response[i].FromDate,
                ).format('DD/MM/YYYY')} to ${moment(response[i].ToDate).format(
                  'DD/MM/YYYY',
                )}`,
                assignedTo: authorizationdetails.AuthorizedByUserMasterId[j],
                assignedBy: response[i].userMasterID,
              },
              { transaction },
            );

            let user = await UserMaster.findOne({
              where: {
                userMasterID: authorizationdetails.AuthorizedByUserMasterId[j],
              },
            });
            let userinfo = await UserMaster.findOne({
              where: {
                // userMasterID:response[i].createBy
                userMasterID: response[i].userMasterID,
              },
            });
            const notification = {
              title: 'Leave',
              body: userinfo.displayName + ' requested for leave.',
            };
            const data = {
              screen: 'leaveauth',
            };
            await sendNotification(
              authorizationdetails.AuthorizedByUserMasterId[j],
              notification,
              data,
            );

            if (user.email && get_MailTemplate) {
              let data = {
                email_id: user.email,
                body: get_MailTemplate.body,
                subject: get_MailTemplate.subject,
                email: get_NotificationPolicy.email,
                password: get_NotificationPolicy.password,
                port: get_NotificationPolicy.port,
                host: get_NotificationPolicy.hostmail,
                secure: get_NotificationPolicy.secure,
              };

              sendEmailForLeave(data);
            }
          }
        }
      }
    });
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Leave'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.generateDemoExcel = async (req, res, next) => {
  try {
    const { limit, page, companyMasterID } = await req.body;
    const condition = {};
    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    condition.companyMasterId = companyMasterID;
    condition.status = 1;
    const order = [['displayName', 'ASC']];
    const currentdate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const userData = await UserMaster.findAndCountAll({
      // raw: true,
      where: condition,
      ...paginationQuery,
      order,
      include: [
        {
          model: EmployeeJoiningDetails,
          required: true,
          attributes: ['employeeJoiningDetailId', 'employeeCode'],
        },
        {
          model: EmployeeBranch,
          where: {
            status: 1,
            applicableDate: {
              [Sequelize.Op.lte]: new Date(currentdate),
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: new Date(currentdate),
                },
              },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
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
          model: EmployeeDesignation,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(currentdate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(currentdate) } },
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
          model: EmployeeDepartment,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(currentdate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(currentdate) } },
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
          model: companyMaster,
          required: true,
          attributes: ['companyMasterID', 'companyName', 'fileUploadType'],
        },
      ],
      attributes: [
        'userMasterID',
        'displayName',
        'companyMasterId',
        'userNumber',
      ],
    });
    const userDataNames = userData.rows.map((row) => {
      const mergeCellData =
        row.displayName +
        ' (' +
        row.userNumber +
        ')' +
        (row.employeeJoiningDetails &&
        row.employeeJoiningDetails.length > 0 &&
        row.employeeJoiningDetails[0].employeeCode != null
          ? ' (' + row.employeeJoiningDetails[0].employeeCode + ')'
          : '');

      return {
        userMasterID: row.userMasterID,
        displayName: row.displayName,
        userNumber: row.userNumber,
        companyMasterId: row.companyMasterId,
        employeeCode:
          row.employeeJoiningDetails && row.employeeJoiningDetails.length > 0
            ? row.employeeJoiningDetails[0].employeeCode
            : '',
        branch:
          (row.employeeBranches && row.employeeBranches.length) > 0
            ? row.employeeBranches[0].branchMaster
              ? row.employeeBranches[0].branchMaster.branchName
              : ''
            : '',
        designation:
          (row.employeeDesignations && row.employeeDesignations.length) > 0
            ? row.employeeDesignations[0].designation
              ? row.employeeDesignations[0].designation.designationName
              : ''
            : '',
        department:
          (row.employeeDepartments && row.employeeDepartments.length) > 0
            ? row.employeeDepartments[0].department
              ? row.employeeDepartments[0].department.departmentName
              : ''
            : '',
        company: row.companyMaster.companyName,
        mergedData: mergeCellData,
      };
    });

    const leaveTypeData = await executeQuery(
      `SELECT * from "ms_fun_leaves_name" (:companyMasterID)`,
      {
        replacements: {
          companyMasterID: companyMasterID,
        },
      },
    );
    const leaveNames = leaveTypeData.map((row) => row.leavename);

    let fileUploadType = 'Employee Number';
    if (userData.rows.length)
      if (userData.rows[0].companyMaster.fileUploadType == 'employeeCode')
        fileUploadType = 'Employee Code';

    await genrateDemoExcelForManualLeave(
      userDataNames,
      leaveNames,
      'Demo Manual Leave',
      'xlsx',
      fileUploadType,
      res,
    );
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------Outdoor Duty ------------------------------------

exports.addOutdoorDuty = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      userMasterID,
      companyMasterID,
      FromDate,
      ToDate,
      LeaveDays,
      Remark,
      DayType,
      leaveFrom = leaveApplyFromEnum.EMPLOYEE,
    } = await req.body;

    if (req?.userDetails.isMyUserDetails) {
      userMasterID = +req.userDetails.userMasterId;
    }

    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    if (new Date(FromDate) > new Date(ToDate)) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: 'Invalid From date and To date!',
      });
    }

    const userLeaveType = await HrLeaveTypes.findOne({
      where: {
        LeaveID: 25,
        status: 1,
        companyMasterID,
      },
      include: [
        {
          required: true,
          model: HrLeaveMaster,
          as: 'LeaveMaster',
          attributes: ['LeaveName'],
        },
      ],
      transaction,
    });

    if (!userLeaveType) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: ' "Outdoor Duty" not found .',
      });
    }

    const LeaveTranId = userLeaveType.LeaveTranId;

    // For cancel && Approve
    const findLeave = await executeQuery(
      `SELECT * from "userLeaves" as ul INNER join "userLeaveTransactions" as ult on ul."UserLeaveApplicationID"=ult."ReferenceID" WHERE ul."authorizationStatus" not in (4) and ul."status"=1 and ul."userMasterID"=` +
        ':userMasterID' +
        ` and ult."status"=1 and (ult."date" >= :FromDate AND ult."date" <= :ToDate)`,
      {
        replacements: {
          userMasterID: userMasterID,
          FromDate: FromDate,
          ToDate: ToDate,
        },
      },
    );

    if (findLeave.length > 0) {
      if (DayType == 'Full Day') {
        const message =
          findLeave[0].LeaveTranId == userLeaveType.LeaveTranId
            ? 'Outdoor Duty'
            : 'Leave';
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message: `You have already applied for "${message}"  within these range`,
        });
      }

      for (let j = 0; j < findLeave.length; j++) {
        if (
          findLeave[j].DayType == DayType ||
          findLeave[j].DayType == 'Full Day'
        ) {
          const message =
            findLeave[j].LeaveTranId == userLeaveType.LeaveTranId
              ? 'Outdoor Duty'
              : 'Leave';
          await transaction.rollback();
          return res.status(200).json({
            status: 401,
            message: `You have already applied for "${message} " within these range`,
          });
        }
      }
    }

    // Pending Leave

    const findPendingLeave = await UserLeave.findAll({
      where: {
        status: 1,
        userMasterID: userMasterID,
        [Sequelize.Op.or]: [
          {
            FromDate: {
              [Sequelize.Op.between]: [new Date(FromDate), new Date(ToDate)],
            },
          },
          {
            ToDate: {
              [Sequelize.Op.between]: [new Date(FromDate), new Date(ToDate)],
            },
          },
          {
            FromDate: {
              [Sequelize.Op.lte]: new Date(FromDate),
            },
            ToDate: { [Sequelize.Op.gte]: new Date(ToDate) },
          },
        ],
        authorizationStatus: [0, 1, 2],
      },
      transaction,
    });

    if (findPendingLeave.length > 0) {
      if (DayType == 'Full Day') {
        const message =
          findPendingLeave[0].LeaveTranId == userLeaveType.LeaveTranId
            ? 'Outdoor Duty'
            : 'Leave';
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message: `You have already applied for "${message}" within these range`,
        });
      }

      for (let j = 0; j < findPendingLeave.length; j++) {
        if (
          findPendingLeave[j].DayType == DayType ||
          findPendingLeave[j].DayType == 'Full Day'
        ) {
          const message =
            findPendingLeave[j].LeaveTranId == userLeaveType.LeaveTranId
              ? 'Outdoor Duty'
              : 'Leave';

          await transaction.rollback();
          return res.status(200).json({
            status: 401,
            message: `You have already applied for "${message}" within these range`,
          });
        }
      }
    }

    const authorizationdetails = await AuthorizationDetails.findOne({
      where: {
        AuthorizationMasterID: authorizationMasterTypes.leave, // For Leave
        userMasterID,
        status: 1,
      },
      transaction,
    });

    let authorizationStatus = 0;

    // set authorization criteria
    const AuthorizationCriteriaID =
      authorizationdetails?.AuthorizationCriteriaID || null;

    if (authorizationdetails) {
      const AuthorizationCriterias = await AuthorizationCriteria.findOne({
        where: {
          AuthorizationCriteriaID: authorizationdetails.AuthorizationCriteriaID,
          status: 1,
        },
        transaction,
      });

      if (AuthorizationCriterias) {
        if (AuthorizationCriterias.AuthorizationCriteria == 'Sequeance No') {
          authorizationStatus = 2;
        } else {
          authorizationStatus = 1;
        }
      }
    }

    const response = await UserLeave.create(
      {
        LeaveTranId,
        userMasterID,
        companyMasterID,
        FromDate,
        ToDate,
        LeaveDays,
        Remark,
        DayType,
        status: 1,
        authorizationStatus,
        createBy,
        createByIp,
        leaveFrom: leaveFrom ? leaveFrom : leaveApplyFromEnum.EMPLOYEE,
        AuthorizationCriteriaID,
      },
      { transaction },
    );

    if (authorizationdetails) {
      const employeeDetails = await UserMaster.findOne({
        where: {
          userMasterID,
        },
        include: [
          {
            model: EmployeeDesignation,
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date() },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date() } },
                { endDate: { [Sequelize.Op.eq]: null } },
              ],
            },
            required: false,
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
            model: EmployeeDepartment,
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date() },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date() } },
                { endDate: { [Sequelize.Op.eq]: null } },
              ],
            },
            required: false,
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
            model: EmployeeBranch,
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date() },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date() } },
                { endDate: { [Sequelize.Op.eq]: null } },
              ],
            },
            required: false,
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
            model: EmployeeJoiningDetails,
            attributes: ['employeeCode'],
          },
        ],
      });

      const employeename = employeeDetails.displayName;
      //Mail for Outdoor Duty..........

      let get_MailTemplate;
      const get_NotificationPolicy =
        await findCompanyNotificationPolicy(+companyMasterID);

      if (get_NotificationPolicy) {
        get_MailTemplate = await MailTemplateEditor.findOne({
          where: {
            companyMasterID: companyMasterID,
            status: 1,
            mailTypeID: 15, //For Outdoor Duty Email Template
          },
        });

        if (get_MailTemplate) {
          const leavetype = userLeaveType.LeaveMaster.LeaveName,
            empcode =
              employeeDetails.employeeJoiningDetails &&
              employeeDetails.employeeJoiningDetails.length > 0
                ? employeeDetails.employeeJoiningDetails[0].employeeCode
                : '',
            empname = employeename,
            department =
              employeeDetails.employeeDepartments &&
              employeeDetails.employeeDepartments.length > 0 &&
              employeeDetails.employeeDepartments[0].department
                ? employeeDetails.employeeDepartments[0].department
                    .departmentName
                : '',
            designation =
              employeeDetails.employeeDesignations &&
              employeeDetails.employeeDesignations.length > 0 &&
              employeeDetails.employeeDesignations[0].designation
                ? employeeDetails.employeeDesignations[0].designation
                    .designationName
                : '',
            branch =
              employeeDetails.employeeBranches &&
              employeeDetails.employeeBranches.length > 0 &&
              employeeDetails.employeeBranches[0].branchMaster
                ? employeeDetails.employeeBranches[0].branchMaster.branchName
                : '';

          get_MailTemplate.subject = get_MailTemplate.subject.replace(
            '[EmployeeCode]',
            empcode,
          );
          get_MailTemplate.subject = get_MailTemplate.subject.replace(
            '[EmployeeName]',
            empname,
          );
          get_MailTemplate.subject = get_MailTemplate.subject.replace(
            '[ToDate]',
            ToDate,
          );
          get_MailTemplate.subject = get_MailTemplate.subject.replace(
            '[FromDate]',
            FromDate,
          );
          get_MailTemplate.subject = get_MailTemplate.subject.replace(
            '[Reason]',
            Remark,
          );
          get_MailTemplate.subject = get_MailTemplate.subject.replace(
            '[NoOfDays]',
            LeaveDays,
          );
          get_MailTemplate.subject = get_MailTemplate.subject.replace(
            '[Department]',
            department,
          );
          get_MailTemplate.subject = get_MailTemplate.subject.replace(
            '[Designation]',
            designation,
          );
          get_MailTemplate.subject = get_MailTemplate.subject.replace(
            '[Branch]',
            branch,
          );
          get_MailTemplate.subject = get_MailTemplate.subject.replace(
            '[LeaveType]',
            leavetype,
          );

          get_MailTemplate.body = get_MailTemplate.body.replace(
            '[EmployeeCode]',
            empcode,
          );
          get_MailTemplate.body = get_MailTemplate.body.replace(
            '[EmployeeName]',
            empname,
          );
          get_MailTemplate.body = get_MailTemplate.body.replace(
            '[ToDate]',
            ToDate,
          );
          get_MailTemplate.body = get_MailTemplate.body.replace(
            '[FromDate]',
            FromDate,
          );
          get_MailTemplate.body = get_MailTemplate.body.replace(
            '[Reason]',
            Remark,
          );
          get_MailTemplate.body = get_MailTemplate.body.replace(
            '[NoOfDays]',
            LeaveDays,
          );
          get_MailTemplate.body = get_MailTemplate.body.replace(
            '[Department]',
            department,
          );
          get_MailTemplate.body = get_MailTemplate.body.replace(
            '[Designation]',
            designation,
          );
          get_MailTemplate.body = get_MailTemplate.body.replace(
            '[Branch]',
            branch,
          );
          get_MailTemplate.body = get_MailTemplate.body.replace(
            '[LeaveType]',
            leavetype,
          );
        }
      }

      const notification = {
        title: 'Outdoor Duty',
        body: employeeDetails.displayName + ' requested for Outdoor Duty.',
      };

      const data = {
        screen: 'outDoorDutyAuth',
        isScheduled: 'true',
        scheduledTime: new Date().toISOString(),
      };

      if (authorizationStatus == 2) {
        const insert_db_status1 = await LeaveAuthorizationRequest.create(
          {
            TableName: 'userLeaves',
            ReferenceID: response.UserLeaveApplicationID,
            userMasterID: authorizationdetails.AuthorizedByUserMasterId[0],
            status: 1,
            authstatus: 2,
            createBy: createBy,
            createByIp: createByIp,
          },
          { transaction },
        );

        await UserInbox.create(
          {
            activityTable: 'outdoorDutyAuthorizations',
            activityTablePK: insert_db_status1.toJSON().AuthorizationRequestId,
            message: `${employeename} has applied for Outdoor Duty request from ${moment(
              FromDate,
            ).format('DD/MM/YYYY')} to ${moment(ToDate).format('DD/MM/YYYY')}`,
            assignedTo: authorizationdetails.AuthorizedByUserMasterId[0],
            assignedBy: userMasterID,
          },
          { transaction },
        );

        const user = await UserMaster.findOne({
          where: {
            userMasterID: authorizationdetails.AuthorizedByUserMasterId[0],
          },
        });
        if (user) {
          sendNotification(user.userMasterID, notification, data);

          if (user.email && get_MailTemplate) {
            const data = {
              email_id: user.email,
              body: get_MailTemplate.body,
              subject: get_MailTemplate.subject,
              email: get_NotificationPolicy.email,
              password: get_NotificationPolicy.password,
              port: get_NotificationPolicy.port,
              host: get_NotificationPolicy.hostmail,
              secure: get_NotificationPolicy.secure,
            };
            sendEmailForLeave(data);
          }
        }
      } else {
        for (
          let j = 0;
          j < authorizationdetails.AuthorizedByUserMasterId.length;
          j++
        ) {
          const insert_db_status1 = await LeaveAuthorizationRequest.create(
            {
              TableName: 'userLeaves',
              ReferenceID: response.UserLeaveApplicationID,
              userMasterID: authorizationdetails.AuthorizedByUserMasterId[j],
              status: 1,
              authstatus: 2,
              createBy: createBy,
              createByIp: createByIp,
            },
            { transaction },
          );

          await UserInbox.create(
            {
              activityTable: 'outdoorDutyAuthorizations',
              activityTablePK:
                insert_db_status1.toJSON().AuthorizationRequestId,
              message: `${employeename} has applied for Outdoor Duty request from ${moment(
                FromDate,
              ).format('DD/MM/YYYY')} to ${moment(ToDate).format(
                'DD/MM/YYYY',
              )}`,
              assignedTo: authorizationdetails.AuthorizedByUserMasterId[j],
              assignedBy: userMasterID,
            },
            { transaction },
          );

          const user = await UserMaster.findOne({
            where: {
              userMasterID: authorizationdetails.AuthorizedByUserMasterId[j],
            },
          });

          if (user) {
            sendNotification(
              authorizationdetails.AuthorizedByUserMasterId[j],
              notification,
              data,
            );

            if (user.email && get_MailTemplate) {
              const data = {
                email_id: user.email,
                body: get_MailTemplate.body,
                subject: get_MailTemplate.subject,
                email: get_NotificationPolicy.email,
                password: get_NotificationPolicy.password,
                port: get_NotificationPolicy.port,
                host: get_NotificationPolicy.hostmail,
                secure: get_NotificationPolicy.secure,
              };

              sendEmailForLeave(data);
            }
          }
        }
      }
    }

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: 'Outdoor Duty added successfully.',
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

exports.updateOutdoorDuty = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const UserLeaveApplicationID = req.params.id;

    let {
      userMasterID,
      FromDate,
      ToDate,
      LeaveDays,
      Remark,
      DayType,
      companyMasterID,
    } = await req.body;

    if (req.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }

    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;

    if (new Date(FromDate) > new Date(ToDate)) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: 'Invalid From date and To date!',
      });
    }

    const userLeaveType = await HrLeaveTypes.findOne({
      where: {
        LeaveID: 25,
        status: 1,
        companyMasterID,
      },
      include: [
        {
          required: true,
          model: HrLeaveMaster,
          as: 'LeaveMaster',
          attributes: ['LeaveName'],
        },
      ],
      transaction,
    });

    if (!userLeaveType) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: ' "Outdoor Duty" not found.',
      });
    }

    // For cancel && Approve
    const findLeave = await executeQuery(
      `SELECT * from "userLeaves" as ul INNER join "userLeaveTransactions" as ult on ul."UserLeaveApplicationID"=ult."ReferenceID" WHERE ul."authorizationStatus" not in (4) and ul."status"=1 and ul."userMasterID"=` +
        ':userMasterID' +
        ` and ult."status"=1 and (ult."date" >= :FromDate AND ult."date" <= :ToDate)`,
      {
        replacements: {
          userMasterID: userMasterID,
          FromDate: FromDate,
          ToDate: ToDate,
        },
      },
    );

    if (findLeave.length > 0) {
      if (DayType == 'Full Day') {
        const message =
          findLeave[0].LeaveTranId == userLeaveType.LeaveTranId
            ? 'Outdoor Duty'
            : 'Leave';
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message: `You have already applied for "${message}"  within these range`,
        });
      }

      for (let j = 0; j < findLeave.length; j++) {
        if (
          findLeave[j].DayType == DayType ||
          findLeave[j].DayType == 'Full Day'
        ) {
          const message =
            findLeave[j].LeaveTranId == userLeaveType.LeaveTranId
              ? 'Outdoor Duty'
              : 'Leave';
          await transaction.rollback();
          return res.status(200).json({
            status: 401,
            message: `You have already applied for "${message} " within these range`,
          });
        }
      }
    }

    // Pending Leave

    const findPendingLeave = await UserLeave.findAll({
      where: {
        status: 1,
        userMasterID: userMasterID,
        [Sequelize.Op.or]: [
          {
            FromDate: {
              [Sequelize.Op.between]: [new Date(FromDate), new Date(ToDate)],
            },
          },
          {
            ToDate: {
              [Sequelize.Op.between]: [new Date(FromDate), new Date(ToDate)],
            },
          },
          {
            FromDate: {
              [Sequelize.Op.lte]: new Date(FromDate),
            },
            ToDate: { [Sequelize.Op.gte]: new Date(ToDate) },
          },
        ],
        authorizationStatus: [0, 1, 2],
        UserLeaveApplicationID: {
          [Sequelize.Op.ne]: UserLeaveApplicationID,
        },
      },
      transaction,
    });

    if (findPendingLeave.length > 0) {
      if (DayType == 'Full Day') {
        const message =
          findPendingLeave[0].LeaveTranId == userLeaveType.LeaveTranId
            ? 'Outdoor Duty'
            : 'Leave';
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message: `You have already applied for "${message}" within these range`,
        });
      }

      for (let j = 0; j < findPendingLeave.length; j++) {
        if (
          findPendingLeave[j].DayType == DayType ||
          findPendingLeave[j].DayType == 'Full Day'
        ) {
          const message =
            findPendingLeave[j].LeaveTranId == userLeaveType.LeaveTranId
              ? 'Outdoor Duty'
              : 'Leave';

          await transaction.rollback();
          return res.status(200).json({
            status: 401,
            message: `You have already applied for "${message}" within these range`,
          });
        }
      }
    }

    const authorizationdetails = await AuthorizationDetails.findOne({
      where: {
        AuthorizationMasterID: authorizationMasterTypes.leave, // For Leave
        userMasterID,
        status: 1,
      },
      transaction,
    });

    let authorizationStatus = 0;

    // set authorization criteria
    const AuthorizationCriteriaID =
      authorizationdetails?.AuthorizationCriteriaID || null;

    if (authorizationdetails) {
      const AuthorizationCriterias = await AuthorizationCriteria.findOne({
        where: {
          AuthorizationCriteriaID: authorizationdetails.AuthorizationCriteriaID,
          status: 1,
        },
        transaction,
      });

      if (AuthorizationCriterias) {
        if (AuthorizationCriterias.AuthorizationCriteria == 'Sequeance No') {
          authorizationStatus = 2;
        } else {
          authorizationStatus = 1;
        }
      }
    }

    await UserLeave.update(
      {
        // LeaveTranId,
        // userMasterID,
        // companyMasterID,
        FromDate,
        ToDate,
        LeaveDays,
        Remark,
        DayType,
        authorizationStatus,
        updateBy,
        updateByIp,
        AuthorizationCriteriaID,
      },
      {
        where: { UserLeaveApplicationID: UserLeaveApplicationID },
        transaction,
      },
    );

    if (authorizationdetails) {
      const employeeDetails = await UserMaster.findOne({
        where: {
          userMasterID,
        },
      });

      const employeename = employeeDetails.displayName;

      const notification = {
        title: 'Outdoor Duty',
        body: employeeDetails.displayName + ' requested for Outdoor Duty.',
      };

      const data = {
        screen: 'outDoorDutyAuth',
        isScheduled: 'true',
        scheduledTime: new Date().toISOString(),
      };

      // Delete All

      const leaveAuthorizationRequest = await LeaveAuthorizationRequest.findAll(
        {
          where: {
            ReferenceID: UserLeaveApplicationID,
          },
          transaction,
        },
      );

      let AuthorizationRequestIds = leaveAuthorizationRequest.map(
        (form) => form.AuthorizationRequestId,
      );

      // Delete All User Inbox

      await UserInbox.destroy(
        {
          where: {
            activityTable: 'outdoorDutyAuthorizations',
            activityTablePK: AuthorizationRequestIds,
          },
        },
        { transaction },
      );

      // Delete All User Request

      await LeaveAuthorizationRequest.destroy({
        where: {
          ReferenceID: UserLeaveApplicationID,
        },
        transaction,
      });

      if (authorizationStatus == 2) {
        const insert_db_status1 = await LeaveAuthorizationRequest.create(
          {
            TableName: 'userLeaves',
            ReferenceID: UserLeaveApplicationID,
            userMasterID: authorizationdetails.AuthorizedByUserMasterId[0],
            status: 1,
            authstatus: 2,
            createBy: updateBy,
            createByIp: updateByIp,
          },
          { transaction },
        );

        await UserInbox.create(
          {
            activityTable: 'outdoorDutyAuthorizations',
            activityTablePK: insert_db_status1.toJSON().AuthorizationRequestId,
            message: `${employeename} has applied for Outdoor Duty request from ${moment(
              FromDate,
            ).format('DD/MM/YYYY')} to ${moment(ToDate).format('DD/MM/YYYY')}`,
            assignedTo: authorizationdetails.AuthorizedByUserMasterId[0],
            assignedBy: userMasterID,
          },
          { transaction },
        );

        const user = await UserMaster.findOne({
          where: {
            userMasterID: authorizationdetails.AuthorizedByUserMasterId[0],
          },
        });
        if (user) {
          sendNotification(user.userMasterID, notification, data);
        }
      } else {
        for (
          let j = 0;
          j < authorizationdetails.AuthorizedByUserMasterId.length;
          j++
        ) {
          const insert_db_status1 = await LeaveAuthorizationRequest.create(
            {
              TableName: 'userLeaves',
              ReferenceID: UserLeaveApplicationID,
              userMasterID: authorizationdetails.AuthorizedByUserMasterId[j],
              status: 1,
              authstatus: 2,
              createBy: updateBy,
              createByIp: updateByIp,
            },
            { transaction },
          );

          await UserInbox.create(
            {
              activityTable: 'outdoorDutyAuthorizations',
              activityTablePK:
                insert_db_status1.toJSON().AuthorizationRequestId,
              message: `${employeename} has applied for Outdoor Duty request from ${moment(
                FromDate,
              ).format('DD/MM/YYYY')} to ${moment(ToDate).format(
                'DD/MM/YYYY',
              )}`,
              assignedTo: authorizationdetails.AuthorizedByUserMasterId[j],
              assignedBy: userMasterID,
            },
            { transaction },
          );

          const user = await UserMaster.findOne({
            where: {
              userMasterID: authorizationdetails.AuthorizedByUserMasterId[j],
            },
          });

          if (user) {
            sendNotification(
              authorizationdetails.AuthorizedByUserMasterId[j],
              notification,
              data,
            );
          }
        }
      }
    }

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: 'Outdoor duty details have been successfully updated.',
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

exports.listOutdoorDutyUserWise = async (req, res, next) => {
  try {
    const { limit, page, startdate, enddate } = await req.body;
    let userMasterID = req.userDetails.userMasterId;
    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const condition = { status: 1 };
    condition.userMasterID = userMasterID;

    if (startdate && enddate)
      condition.FromDate = {
        [Sequelize.Op.between]: [new Date(startdate), new Date(enddate)],
      };
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    const { rows, count } = await UserLeave.findAndCountAll({
      where: condition,
      ...paginationQuery,
      include: [
        {
          required: true,
          model: HrLeaveTypes,
          where: { LeaveID: 25 },
          attributes: [],
        },
        {
          required: true,
          model: UserMaster,
          where: { ...userAccessCondition.where },
          attributes: ['userMasterID'],
          include: [
            ...userAccessCondition.includeModels,
            {
              required: false,
              separate: true,
              model: AuthorizationDetails,
              where: {
                status: 1,
                AuthorizationMasterID: authorizationMasterTypes.leave,
              },
              attributes: ['AuthorizationCriteriaID'],
              include: [
                {
                  model: AuthorizationCriteria,
                  attributes: ['AuthorizationCriteria'],
                },
              ],
            },
          ],
        },
      ],
      order: [['FromDate', 'DESC']],
    });

    return res.status(200).json({
      status: 200,
      data: rows,
      totalcount: count,
    });
  } catch (error) {
    next(error);
  }
};

// -------------------- Lapse Balance of december----------------------

exports.lapseLeaveBalanceLeaveId = async (req, res, next) => {
  try {
    const { companyId, leaveId } = req.body;

    const currentmonth = 202503;

    const createBy = req.userDetails.userMasterId;
    const createbyIp = req.userDetails.userIpAddress;

    const companyuser = await UserMaster.findAll({
      where: {
        companyMasterId: companyId,
      },
    });

    const findLeaveType = await HrLeaveTypes.findOne({
      where: {
        LeaveID: leaveId,
        status: 1,
        companyMasterID: companyId,
      },
      attributes: ['LeaveTranId'],
    });

    if (!findLeaveType) throw new Error('Leave type not found.');

    const findAllLeave = await HrLeaveBalance.findAll({
      where: {
        userMasterID: {
          [Sequelize.Op.in]: companyuser.map((e) => e.userMasterID),
        },
        LeaveTranId: findLeaveType.LeaveTranId,
        YearMM: {
          [Sequelize.Op.gt]: 202503,
        },
      },
    });

    const finalData = [];

    await Promise.all(
      companyuser.map(async (e) => {
        const leaveBalance = await employeeeLeaveBalance(
          companyId,
          e.userMasterID,
        );

        const findsameLeave = leaveBalance.find(
          (f) => f.LeaveTranId == findLeaveType.LeaveTranId && +f.Balance > 0,
        );

        if (findsameLeave) {
          const adddata = findAllLeave
            .filter((a) => a.userMasterID == e.userMasterID)
            .reduce(
              (acc, obj) => acc + (+obj.LeaveAddNew || 0) + (+obj.OPBal || 0),
              0,
            );

          const lapseDays = +findsameLeave.Balance - +adddata;

          if (+lapseDays > 0) {
            finalData.push({
              userMasterID: e.userMasterID,
              LeaveTranId: findLeaveType.LeaveTranId,
              LapseDays: +lapseDays,
              LapseYearMonth: currentmonth,
              status: 1,
              createBy: createBy,
              createByIp: createbyIp,
            });
          }
        }
      }),
    );

    await UserLeaveLapse.bulkCreate(finalData);

    return res.status(200).json({
      status: 200,
      message: 'Leaves Lapse successfully.',
    });
  } catch (error) {
    next(error);
  }
};

exports.getLeaveByUserId_V2 = async (req, res, next) => {
  try {
    let {
      limit,
      page,
      searchQuery,
      startdate,
      enddate,
      userMasterID,
      isSocketRequest,
    } = await req.body;
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    userMasterID = req.userDetails.userMasterId;

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const condition = { status: [0, 1] };
    condition.userMasterID = userMasterID;

    if (startdate && enddate)
      condition.FromDate = {
        [Sequelize.Op.between]: [new Date(startdate), new Date(enddate)],
      };

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          Remark: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
      ];
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    const userLeaves = await UserLeave.findAndCountAll({
      where: condition,
      ...paginationQuery,
      order: [['FromDate', 'DESC']],
      include: [
        {
          required: true,
          model: UserMaster,
          where: { ...userAccessCondition.where },
          attributes: userAttributes,
          include: [
            ...userAccessCondition.includeModels,
            {
              separate: true,
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode'],
            },
            {
              separate: true,
              model: AuthorizationDetails,
              where: {
                status: 1,
                AuthorizationMasterID: authorizationMasterTypes.leave, // fot Leave
              },
              attributes: ['AuthorizationCriteriaID'],
              include: [
                {
                  model: AuthorizationCriteriaMaster,
                  attributes: ['AuthorizationCriteria'],
                },
              ],
            },
            {
              required: false,
              separate: true,
              model: EmployeeDesignation,
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
              separate: true,
              required: false,
              model: EmployeeDepartment,
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
              separate: true,

              model: EmployeeBranch,
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
              required: false,
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
              separate: true,
              model: EmployeeDivision,
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
              separate: true,
              model: EmployeeWorkingArea,
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
        },

        {
          required: true,
          model: HrLeaveTypes,
          where: {
            LeaveID: {
              [Sequelize.Op.ne]: 25,
            },
          },
          include: [{ model: HrLeaveMaster, as: 'LeaveMaster' }],
        },
        { model: companyMaster, attributes: companyAttributes },
        {
          required: false,
          model: UserMaster,
          as: 'createdByUserDetails',
          attributes: userAttributes,
        },
        {
          required: false,
          model: UserMaster,
          as: 'updatedByUserDetails',
          attributes: userAttributes,
        },
        {
          required: false,
          model: UserMaster,
          as: 'authorizer',
          attributes: ['displayName'],
        },
        {
          separate: true,
          required: false,
          model: userLeaveTransactions,
          include: [
            {
              model: HrLeaveTypes,
              attributes: [],
              include: [
                {
                  model: HrLeaveMaster,
                  as: 'LeaveMaster',
                  attributes: [],
                },
              ],
            },
          ],
          order: [['date', 'ASC']],
          attributes: [
            'days',
            'date',
            'status',
            [Sequelize.col('hrLeaveType.LeaveMaster.LeaveName'), 'LeaveName'],
            [Sequelize.col('hrLeaveType.LeaveID'), 'LeaveID'],
          ],
        },
        {
          separate: true,
          required: false,
          model: ApprovedLeaveAuthorization,
          include: [
            {
              model: HrLeaveTypes,
              attributes: [],
              include: [
                {
                  model: HrLeaveMaster,
                  as: 'LeaveMaster',
                  attributes: [],
                },
              ],
            },
            {
              required: false,
              model: UserMaster,
              as: 'createdByUserDetails',
              attributes: userAttributes,
            },
            {
              required: false,
              model: UserMaster,
              as: 'updatedByUserDetails',
              attributes: userAttributes,
            },
          ],
          order: [['date', 'ASC']],
          attributes: [
            'days',
            'date',
            'status',
            [Sequelize.col('hrLeaveType.LeaveMaster.LeaveName'), 'LeaveName'],
          ],
        },
      ],
    });

    if (isSocketRequest) return userLeaves.rows;

    return res.status(200).json({
      status: 200,
      data: userLeaves.rows,
      totalcount: userLeaves.count,
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllUserLeavesBalanceData = async (req, res, next) => {
  try {
    const { page, limit, userMasterID, companyMasterID, exportData } =
      await req.body;
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const paginationQuery = {};
    if (!exportData && page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const condition = { status: 1, companyMasterId: companyMasterID };
    if (userMasterID && userMasterID.length) {
      condition.userMasterID = userMasterID;
    }
    const order = [['displayName', 'ASC']];

    const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: false,
    });

    const { rows: allUserData, count: totalCount } =
      await UserMaster.findAndCountAll({
        distinct: true,
        where: { ...where, ...condition },
        ...paginationQuery,
        attributes: userAttributes,
        order,
        include: [
          ...includeModels,
          {
            required: false,
            model: EmployeeDesignation,
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date(currentDate) },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
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
            model: EmployeeDepartment,
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date(currentDate) },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
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
            model: EmployeeBranch,
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date(currentDate) },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
                { endDate: { [Sequelize.Op.eq]: null } },
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
            model: EmployeeJoiningDetails,
            attributes: ['employeeCode'],
          },
          {
            required: false,
            model: companyMaster,
            attributes: ['companyMasterID', 'companyName'],
          },
          {
            required: false,
            model: empLeavePolicy,
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date(currentDate) },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
                { endDate: { [Sequelize.Op.eq]: null } },
              ],
            },
            attributes: ['employeeLeavePolicyID'],
          },
        ],
      });

    const allUserIDs =
      userMasterID && userMasterID.length
        ? userMasterID
        : allUserData.map((e) => e.userMasterID);

    const hrleavetypeCondition = {
      companyMasterID: +companyMasterID,
      status: 1,
      Leave_Allow: 'Y',
      LeaveID: { [Sequelize.Op.notIn]: [5, 18, 25] },
    };

    const groupBy = [
      'userMasterID',
      'hrLeaveType.LeaveTranId',
      'hrLeaveType.LeaveMaster.LeaveName',
      'hrLeaveType.LeaveMaster.LeaveDesc',
      'hrLeaveType.LeaveID',
    ];

    const attributes = [
      [Sequelize.col('userMasterID'), 'userMasterID'],
      [Sequelize.col('hrLeaveType.LeaveMaster.LeaveName'), 'leaveName'],
      [Sequelize.col('hrLeaveType.LeaveMaster.LeaveDesc'), 'LeaveDesc'],
      [Sequelize.col('hrLeaveType.LeaveTranId'), 'LeaveTranId'],
      [Sequelize.col('hrLeaveType.LeaveID'), 'LeaveID'],
    ];

    const [leaveTypeData, userLapseleave, userLeaveEncashment] =
      await Promise.all([
        // leaveTypeData
        HrLeaveTypes.findAll({
          raw: true,
          where: hrleavetypeCondition,
          include: [
            {
              model: HrLeaveMaster,
              as: 'LeaveMaster',
              attributes: ['LeaveName', 'LeaveDesc'],
            },
          ],
        }),

        // UserLeaveLapse
        UserLeaveLapse.findAll({
          raw: true,
          where: {
            userMasterID: allUserIDs,
          },
          include: [
            {
              model: HrLeaveTypes,
              attributes: [],
              where: hrleavetypeCondition,
              include: {
                model: HrLeaveMaster,
                as: 'LeaveMaster',
                attributes: [],
              },
            },
          ],
          group: groupBy,
          attributes: [
            ...attributes,

            [
              Sequelize.literal(
                'coalesce(sum(cast("LapseDays" as numeric)),0)',
              ),
              'totalDays',
            ],
          ],
        }),

        // userLeaveEncashment
        LeaveEncashment.findAll({
          raw: true,
          where: {
            userMasterID: allUserIDs,
            status: 1,
          },
          include: [
            {
              model: HrLeaveTypes,
              attributes: [],
              where: hrleavetypeCondition,
              include: {
                model: HrLeaveMaster,
                as: 'LeaveMaster',
                attributes: [],
              },
            },
          ],
          group: groupBy,
          attributes: [
            ...attributes,

            [
              Sequelize.literal('coalesce(sum(cast("days" as numeric)),0)'),
              'totalDays',
            ],
          ],
        }),
      ]);

    const userWiseAllData = [];
    for (const user of allUserData) {
      const userWiseLeaveLapse = userLapseleave.filter(
        (e) => e.userMasterID == user.userMasterID,
      );
      const userWiseLeaveEncashment = userLeaveEncashment.filter(
        (e) => e.userMasterID == user.userMasterID,
      );

      const employeeLeavePolicy = user.empLeavePolicies?.[0] || null;

      const userBalance = await employeeeLeaveBalance(
        user.companyMasterId,
        user.userMasterID,
        leaveTypeData,
        userWiseLeaveLapse,
        userWiseLeaveEncashment,
        currentDate,
        employeeLeavePolicy,
        chekLeaveBalanceFromEnum.ADMIN,
      );

      const leaveBalanceMap = userBalance.reduce((acc, item) => {
        acc[item.leaveName] = item.Balance;
        return acc;
      }, {});

      const userLeaveData = {
        userMasterID: user.userMasterID,
        'Company Name': user.companyMaster.companyName,
        'Branch Name':
          user.employeeBranches?.[0]?.branchMaster?.branchName || '-',
        'Department Name':
          user.employeeDepartments?.[0]?.department?.departmentName || '-',
        'Designation Name':
          user.employeeDesignations?.[0]?.designation?.designationName || '-',
        'Employee Code': user.employeeJoiningDetails?.[0]?.employeeCode || '-',
        'Employee Name': user.displayName,
        'Employee Number': user.userNumber,
        ...leaveBalanceMap,
      };
      if (exportData) {
        delete userLeaveData.userMasterID;
      }
      userWiseAllData.push(userLeaveData);
    }

    if (exportData) {
      return await generateExcel(
        userWiseAllData,
        'Leave Count Data',
        'xlsx',
        res,
      );
    }
    return res.status(200).json({
      status: 200,
      totalCount,
      data: userWiseAllData,
    });
  } catch (err) {
    next(err);
  }
};

exports.getUsedCoffByLeaveId = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: 'LeaveId is required!',
      });
    }

    const approvedCoffLeave = await UserLeaveTransaction.findAll({
      where: {
        ReferenceID: id,
        status: 1,
      },
      attributes: ['date'],
      include: [
        {
          required: true,
          model: HrLeaveTypes,
          where: {
            LeaveID: HrLeaveTypesIds.COFF,
          },
          attributes: [],
        },
        {
          required: true,
          model: UserLeave,
          attributes: ['userMasterID'],
        },
      ],
    });

    if (!approvedCoffLeave.length) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.OK,
        data: [],
      });
    }

    const userMasterID = approvedCoffLeave[0].userLeave?.userMasterID;

    const coffDates = approvedCoffLeave.map((e) => e.date);

    const usedBalance = await HrLeaveBalance.findAll({
      where: {
        userMasterID,
      },
      include: [
        {
          required: true,
          model: UsedCoffTransaction,
          where: {
            date: {
              [Sequelize.Op.in]: coffDates,
            },
            type: CoffUsedTypeEnum.USED,
          },
          attributes: ['date', 'days'],
        },
        {
          required: true,
          model: HrLeaveTypes,
          where: {
            LeaveID: HrLeaveTypesIds.COFF,
          },
          attributes: [],
        },
        {
          model: coffMaster,
          attributes: ['LeaveCreatedDate'],
        },
      ],
    });

    const usedCoffMap = new Map();

    for (const used of usedBalance) {
      let coffDate = used.coffMasters?.[0]?.LeaveCreatedDate;

      if (!coffDate) {
        coffDate = moment(String(used.YearMM), 'YYYYMM')
          .startOf('month')
          .format('YYYY-MM-DD');
      }

      for (const usedcoff of used.usedCoffTransactions || []) {
        if (!usedCoffMap.has(usedcoff.date)) {
          usedCoffMap.set(usedcoff.date, []);
        }

        usedCoffMap.get(usedcoff.date).push({
          leaveDays: usedcoff.days,
          coffDate,
        });
      }
    }

    const usedCoffData = Array.from(usedCoffMap, ([leaveDate, coffData]) => ({
      leaveDate,
      coffData,
    }));

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data: usedCoffData,
    });
  } catch (error) {
    next(error);
  }
};

exports.manageLeaveBalance = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      userMasterID,
      yearMonth,
      operationType,
      LeaveTranId,
      balance,
      operationFrom,
    } = await req.body;

    let { payrollFrequency, startDate, endDate } = req.body;

    if (!payrollFrequency) payrollFrequency = PayrollFrequencyType.MONTHLY;

    if (
      ![PayrollFrequencyType.FORTNIGHTLY, PayrollFrequencyType.WEEKLY].includes(
        payrollFrequency,
      ) ||
      (operationType != leaveOperationENUM.Encashment &&
        operationType != leaveOperationENUM.Encashment_IN_FNF)
    ) {
      startDate = null;
      endDate = null;
    }

    const date = moment().format('YYYY-MM-DD');

    const currentYearMonth = moment().format('YYYYMM');
    const previousYearMonth = moment().subtract(1, 'month').format('YYYYMM');

    if (operationFrom != 'FNF') {
      const errorMessages = {
        [leaveOperationENUM.Encashment]:
          'Month must be previous month or current month.',
        [leaveOperationENUM.Lapse]: 'Month must be current month.',
        [leaveOperationENUM.AddLeaveBalance]:
          'Month must be previous months or current month.',
      };

      const validationConditions = {
        [leaveOperationENUM.Encashment]:
          yearMonth < previousYearMonth || yearMonth > currentYearMonth,
        [leaveOperationENUM.Lapse]: yearMonth !== currentYearMonth,
        [leaveOperationENUM.AddLeaveBalance]: yearMonth > currentYearMonth,
      };

      if (validationConditions[operationType]) {
        await transaction.rollback();
        return res
          .status(200)
          .json({ status: 401, message: errorMessages[operationType] });
      }
    }

    const condition = {};
    condition.status = 1;
    if (userMasterID) {
      condition.userMasterID = userMasterID;
    } else {
      await transaction.rollback();
      return res
        .status(200)
        .json({ status: 401, message: 'Please Select Any User' });
    }

    const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });

    const findUser = await UserMaster.findOne({
      where: { ...where, ...condition },
      attributes: userAttributes,
      include: [
        ...includeModels,
        {
          required: false,
          model: empLeavePolicy,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(date) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(date) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: ['employeeLeavePolicyID'],
        },
        {
          model: EmployeeJoiningDetails,
          attributes: ['joiningDate', 'leavingDate'],
        },
      ],
    });

    if (!findUser) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('User'),
      });
    }

    if (operationType !== leaveOperationENUM.AddLeaveBalance) {
      const userBalance = await employeeeLeaveBalance(
        findUser.companyMasterId,
        userMasterID,
        null,
        null,
        null,
        null,
        null,
        chekLeaveBalanceFromEnum.ADMIN,
      );
      const findLeave =
        userBalance && userBalance.length
          ? userBalance.find((e) => e.LeaveTranId == LeaveTranId)
          : null;
      if (findLeave) {
        if (findLeave.Balance < balance) {
          await transaction.rollback();
          return res.status(200).json({
            status: 401,
            message: "User Don't have Sufficient Balance",
          });
        }

        let allCoffBalanceData =
          findLeave.LeaveID == 6
            ? await getCoffBalanceData(userMasterID, date)
            : [];
        let usedLogTransactions = [];

        if (operationType === leaveOperationENUM.Lapse) {
          await UserLeaveLapse.create(
            {
              userMasterID: userMasterID,
              LeaveTranId: LeaveTranId,
              LapseDays: balance,
              LapseYearMonth: yearMonth,
              status: 1,
              createBy: req.userDetails.userMasterId,
              createByIp: req.userDetails.userIpAddress,
              isFromFNF: operationFrom == 'FNF',
            },
            { transaction },
          );

          // only for coff
          if (allCoffBalanceData.length > 0) {
            // Consume leave balance from available transactions
            const { allBalanceData, usedTransactionLog } = consumeLeaveBalance(
              allCoffBalanceData,
              balance,
              date,
              CoffUsedTypeEnum.LAPSE,
            );

            allCoffBalanceData = [...allBalanceData];

            usedLogTransactions = [...usedTransactionLog];
          }
        } else if (
          operationType === leaveOperationENUM.Encashment ||
          operationType === leaveOperationENUM.Encashment_IN_FNF
        ) {
          // check Employee leave policy
          const empLeavePolicy = findUser.empLeavePolicies?.[0] || null;

          if (empLeavePolicy) {
            const leavePolicy = await employeeLeavePolicy.findOne({
              where: {
                id: {
                  [Sequelize.Op.in]: empLeavePolicy.employeeLeavePolicyID,
                },
                leaveEncashmentAtFNF: true,
                leaveId: findLeave.LeaveID,
              },
              attributes: ['minServiceDuration'],
            });

            if (leavePolicy) {
              if (operationFrom != 'FNF') {
                await transaction.rollback();
                return res.status(statusCodes.OK).json({
                  status: 401,
                  message: `Leave encashment for '${findLeave.leaveName}' is allowed only during Full & Final (FNF) settlement.`,
                });
              }

              const joining = findUser.employeeJoiningDetails?.[0] || null;
              const serviceMonths = getServiceMonths(
                joining?.joiningDate,
                joining?.leavingDate,
              );

              if (serviceMonths < +leavePolicy.minServiceDuration) {
                await transaction.rollback();
                return res.status(statusCodes.OK).json({
                  status: 401,
                  message: `Encashment not allowed. Required service duration is ${leavePolicy.minServiceDuration} month(s), but only ${serviceMonths} month(s) completed.`,
                });
              }
            }
          }

          await LeaveEncashment.create(
            {
              userMasterID: userMasterID,
              LeaveTranId: LeaveTranId,
              YYYYMM: yearMonth,
              days: balance,
              status: 1,
              payrollFrequency,
              startDate,
              endDate,
              createBy: req.userDetails.userMasterId,
              createByIp: req.userDetails.userIpAddress,
              isFromFNF: operationFrom == 'FNF',
              payInFNF:
                operationFrom == 'FNF' &&
                operationType == leaveOperationENUM.Encashment_IN_FNF,
            },
            { transaction },
          );

          // only for coff
          if (allCoffBalanceData.length > 0) {
            // Consume leave balance from available transactions
            const { allBalanceData, usedTransactionLog } = consumeLeaveBalance(
              allCoffBalanceData,
              balance,
              date,
              CoffUsedTypeEnum.ENCASH,
            );

            allCoffBalanceData = [...allBalanceData];

            usedLogTransactions = [...usedTransactionLog];
          }
        }

        if (allCoffBalanceData.length) {
          // update coff Hrleave balance
          await Promise.all(
            allCoffBalanceData.map((e) =>
              HrLeaveBalance.update(
                {
                  availBal: e.availBal,
                },
                {
                  where: {
                    LeaveBalTranId: e.LeaveBalTranId,
                  },
                },
              ),
            ),
          );
        }

        // add usedCofftransaction-----------

        if (usedLogTransactions.length) {
          await UsedCoffTransaction.bulkCreate(usedLogTransactions, {
            user: req.userDetails,
            individualHooks: true,
            transaction,
          });
        }
      }
    } else {
      await HrLeaveBalance.create(
        {
          LeaveTranId: LeaveTranId,
          userMasterID: userMasterID,
          YearMM: yearMonth,
          LeaveAddNew: balance,
          createBy: req.userDetails.userMasterId,
          createByIp: req.userDetails.userIpAddress,
          availBal: balance,
        },
        { transaction },
      );
    }

    const userMessage =
      operationType === leaveOperationENUM.Encashment ||
      operationType === leaveOperationENUM.Encashment_IN_FNF
        ? 'Leave Encashment'
        : operationType === leaveOperationENUM.Lapse
          ? 'Leave Lapse'
          : operationType === leaveOperationENUM.AddLeaveBalance
            ? 'Leave'
            : '';

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage(userMessage),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.downloadDemoExcelImportLeaveBalance = async (req, res, next) => {
  try {
    const {
      LeaveTranId,
      operationType,
      yearMonth,
      userMasterID = [],
      companyMasterID,
      payrollFrequency,
    } = req.body;

    if (!companyMasterID || !LeaveTranId || !operationType || !yearMonth) {
      return res.status(400).json({
        status: 400,
        message: 'Required data missing',
      });
    }
    const payrollCondition = {};
    if (payrollFrequency) payrollCondition.payrollFrequency = payrollFrequency;
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });

    const users = await UserMaster.findAll({
      order: [['displayName', 'ASC']],
      distinct: true,
      attributes: ['displayName', 'userNumber', 'userMasterID'],
      where: {
        ...where,
        userMasterID: { [Sequelize.Op.in]: userMasterID },
        status: 1,
        companyMasterId: companyMasterID,
      },
      include: [
        ...includeModels,
        {
          required: false,
          model: EmployeeDesignation,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
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
          model: EmployeeDepartment,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
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
          model: EmployeeBranch,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
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
          model: EmployeeJoiningDetails,
          attributes: ['employeeCode', 'employment'],
          where: payrollCondition,
        },
      ],
    });

    const userIds = users.map((u) => u.userMasterID);

    let userBalanceMap = new Map();

    if (userIds.length > 0) {
      userBalanceMap = await bulkEmployeeLeaveBalance(companyMasterID, userIds);
    }

    const leaveTypes = await HrLeaveTypes.findAll({
      where: {
        companyMasterID,
        LeaveTranId: { [Sequelize.Op.in]: LeaveTranId },
        status: 1,
      },
      attributes: ['LeaveTranId'],
      include: [
        {
          model: HrLeaveMaster,
          as: 'LeaveMaster',
          attributes: ['LeaveName'],
          where: { status: 1 },
        },
      ],
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Leave Balance');

    // Define Columns
    worksheet.columns = [
      { header: 'Employee Code', key: 'employeeCode', width: 18 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Number', key: 'number', width: 18 },
      { header: 'Branch', key: 'branch', width: 18 },
      { header: 'Department', key: 'department', width: 18 },
      { header: 'Designation', key: 'designation', width: 18 },
      { header: 'Employeement Type', key: 'employeement', width: 18 },
      { header: 'Operation Type', key: 'operationType', width: 20 },
      { header: 'Month Year', key: 'yearMonth', width: 15 },
      ...leaveTypes.flatMap((lt) => [
        {
          header: `Available (${lt.LeaveMaster.LeaveName})`,
          key: `available_${lt.LeaveMaster.LeaveName}`,
          width: 20,
        },
        {
          header: lt.LeaveMaster.LeaveName,
          key: lt.LeaveMaster.LeaveName,
          width: 18,
        },
      ]),
    ];

    // Freeze panes
    worksheet.views = [
      {
        state: 'frozen',
        xSplit: 2, // freeze first 4 columns
        ySplit: 1, // freeze header row
      },
    ];

    const headerRow = worksheet.getRow(1);

    // Increase header height
    headerRow.height = 20;

    // Header styling
    headerRow.eachCell((cell) => {
      cell.font = {
        bold: true,
        color: { argb: 'FFFFFFFF' }, // white text
      };

      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }, // blue
      };

      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Add Rows
    users.forEach((user) => {
      const rowData = {
        employeeCode: user?.employeeJoiningDetails?.[0]?.employeeCode,
        name: user.displayName,
        number: user.userNumber,
        branch: user?.employeeBranches?.[0]?.branchMaster.branchName,
        department: user?.employeeDepartments?.[0]?.department?.departmentName,
        designation:
          user?.employeeDesignations?.[0]?.designation?.designationName,
        employeement: user?.employeeJoiningDetails?.[0]?.employment || '',
        operationType,
        yearMonth: formatYearMonth(yearMonth),
      };

      const userBalances = userBalanceMap.get(user.userMasterID) || [];

      // Convert array → Map for O(1) lookup
      const balanceMap = new Map(
        userBalances.map((b) => [
          b.leaveName, // small l
          b.Balance, // capital B
        ]),
      );

      leaveTypes.forEach((lt) => {
        const leaveName = lt.LeaveMaster.LeaveName;

        const availableBalance = balanceMap.get(leaveName) || 0;

        rowData[`available_${leaveName}`] = availableBalance;
        rowData[leaveName] = null;
      });

      worksheet.addRow(rowData);
    });

    // Send Response
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=Import_Leave_Balance.xlsx',
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

exports.validateExcelImportLeaveBalance = async (req, res, next) => {
  try {
    const { companyMasterID, page = 1, limit = 20 } = req.body;
    const filePath = req.file.path;

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];

    // =========================
    // READ ORIGINAL HEADERS
    // =========================
    const headers = [];
    worksheet.getRow(1).eachCell((cell) => {
      headers.push(String(cell.value).trim());
    });

    const fixedColumns = [
      'Number',
      'Name',
      'Operation Type',
      'Month Year',
      'Employee Code',
      'Branch',
      'Department',
      'Designation',
      'Employeement Type',
    ];

    const availableColumns = headers.filter(
      (h) => typeof h === 'string' && h.startsWith('Available ('),
    );

    const leaveHeaders = headers.filter(
      (h) => !fixedColumns.includes(h) && !availableColumns.includes(h),
    );

    // =========================
    // OPERATION TYPE
    // =========================
    const operationTypeColIndex = headers.indexOf('Operation Type') + 1;
    const firstDataRow = worksheet.getRow(2);
    const operationType = firstDataRow.getCell(operationTypeColIndex).value;

    if (
      !operationType ||
      ![
        leaveOperationENUM.Lapse,
        leaveOperationENUM.Encashment,
        leaveOperationENUM.AddLeaveBalance,
      ].includes(operationType)
    ) {
      return res.status(400).json({
        message: 'Invalid or missing operation type in first data row.',
      });
    }

    // =========================
    // VALIDATE LEAVE HEADERS
    // =========================
    const companyLeaveTypes = await getAllHrLeaveTypes(companyMasterID);

    const validLeaveSet = new Set(
      companyLeaveTypes.map((l) => l.LeaveMaster.LeaveName.trim()),
    );

    const leaveTypeMap = new Map(
      companyLeaveTypes.map((lt) => [
        lt.LeaveMaster.LeaveName.trim(),
        {
          LeaveTranId: lt.LeaveTranId,
          LeaveID: lt.LeaveID,
          LeaveName: lt.LeaveMaster.LeaveName,
        },
      ]),
    );

    const validLeaveHeaders = [];
    const invalidLeaveColumns = [];

    leaveHeaders.forEach((h) => {
      validLeaveSet.has(h)
        ? validLeaveHeaders.push(h)
        : invalidLeaveColumns.push(h);
    });

    // =========================
    // FETCH USERS
    // =========================
    const numberColIndex = headers.indexOf('Number') + 1;
    const uniqueUserNumbers = new Set();

    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      const mobile = String(row.getCell(numberColIndex).value || '');
      if (mobile) uniqueUserNumbers.add(mobile);
    }

    const date = moment().format('YYYY-MM-DD');

    const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });

    const users = await UserMaster.findAll({
      where: {
        ...where,
        companyMasterId: companyMasterID,
        userNumber: { [Sequelize.Op.in]: Array.from(uniqueUserNumbers) },
        status: 1,
      },
      attributes: ['userMasterID', 'userNumber'],
      include: [
        ...includeModels,
        {
          required: false,
          model: empLeavePolicy,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(date) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(date) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: ['employeeLeavePolicyID'],
        },
      ],
    });

    const userSet = new Set(users.map((u) => String(u.userNumber)));
    const userMap = new Map(
      users.map((u) => [String(u.userNumber), u.userMasterID]),
    );

    let empLeavePolicyMap = null;
    let employeeLeaveIds = [];
    let allLeavePolicy = [];

    if (operationType == leaveOperationENUM.Encashment) {
      empLeavePolicyMap = new Map(
        users.map((u) => [
          String(u.userMasterID),
          u.empLeavePolicies?.[0]?.employeeLeavePolicyID,
        ]),
      );

      employeeLeaveIds = users.flatMap(
        (e) => e.empLeavePolicies?.[0]?.employeeLeavePolicyID,
      );

      allLeavePolicy = await employeeLeavePolicy.findAll({
        where: {
          id: {
            [Sequelize.Op.in]: employeeLeaveIds,
          },
          leaveEncashmentAtFNF: true,
        },
        attributes: ['id', 'leaveId', 'leaveEncashmentAtFNF'],
        include: [{ model: HrLeaveMaster, attributes: ['LeaveName'] }],
      });
    }

    // =========================
    // BULK BALANCE FETCH
    // =========================
    let userBalanceMap = new Map();

    if (
      operationType === leaveOperationENUM.Lapse ||
      operationType === leaveOperationENUM.Encashment
    ) {
      const userIds = users.map((u) => u.userMasterID);
      if (userIds.length > 0) {
        userBalanceMap = await bulkEmployeeLeaveBalance(
          companyMasterID,
          userIds,
        );
      }
    }

    // =========================
    // CREATE OUTPUT WORKBOOK
    // =========================
    const currentYearMonth = moment().format('YYYYMM');
    const previousYearMonth = moment().subtract(1, 'month').format('YYYYMM');
    const outWorkbook = new ExcelJS.Workbook();
    const outSheet = outWorkbook.addWorksheet('Validated');

    const finalHeaders = ['_uuid', ...headers, 'remark'];

    outSheet.columns = finalHeaders.map((h) => ({
      header: h,
      key: h,
      width: 18,
    }));

    outSheet.getColumn(1).hidden = true;

    const parsedRows = [];

    // 🔥 TRACKING STRUCTURES
    const invalidRowSet = new Set(); // Unique invalid rows
    const invalidColumnRowMap = new Map(); // Column -> Set of row numbers
    const seenNumbers = new Map();
    // =========================
    // PROCESS ROWS
    // =========================
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      const rowUUID = crypto.randomUUID();
      const rowData = { _uuid: rowUUID };
      const remarks = [];

      headers.forEach((header, index) => {
        rowData[header] = row.getCell(index + 1).value;
      });

      const mobile = String(rowData.Number || '');
      const userMasterID = userMap.get(mobile);

      const yearMonth = parseYearMonth(rowData['Month Year']);
      rowData['Month Year'] = yearMonth;

      // =========================
      // NUMBER / DUPLICATE CHECK
      // =========================
      if (!mobile) {
        remarks.push('User not found');
        invalidRowSet.add(rowNumber - 1);
      } else if (!userSet.has(mobile)) {
        remarks.push('User not found');
        invalidRowSet.add(rowNumber - 1);
      }

      if (mobile) {
        if (seenNumbers.has(mobile)) {
          remarks.push(
            `Duplicate number (already exists at row ${seenNumbers.get(mobile)})`,
          );
          invalidRowSet.add(rowNumber - 1);
        } else {
          seenNumbers.set(mobile, rowNumber - 1);
        }
      }

      if (yearMonth && !/^\d{6}$/.test(yearMonth)) {
        remarks.push('Invalid yearMonth format');
        invalidRowSet.add(rowNumber - 1);
      }

      // =========================
      // NUMERIC VALIDATION
      // =========================
      validLeaveHeaders.forEach((leaveHeader) => {
        const value = rowData[leaveHeader];

        if (value !== null && value !== undefined && value !== '') {
          if (operationType == leaveOperationENUM.Encashment) {
            const userLeavePolicyIds =
              empLeavePolicyMap.get(String(userMasterID)) || [];

            const canEncashLeave = allLeavePolicy.find(
              (item) =>
                userLeavePolicyIds.includes(+item.id) &&
                leaveHeader == item.hrLeaveMaster?.LeaveName,
            );

            if (canEncashLeave) {
              remarks.push(
                `Leave encashment for '${canEncashLeave.hrLeaveMaster?.LeaveName}' is allowed only during Full & Final (FNF) settlement.`,
              );
              invalidRowSet.add(rowNumber - 1);
            }
          }

          const numValue = Number(value);

          if (isNaN(numValue) || numValue <= 0) {
            // ✅ Row-level remark (keep this)
            remarks.push(`${leaveHeader} value invalid`);

            // ✅ Track row as invalid
            invalidRowSet.add(rowNumber - 1);

            // ✅ Track column-wise invalid rows
            if (!invalidColumnRowMap.has(leaveHeader)) {
              invalidColumnRowMap.set(leaveHeader, new Set());
            }
            invalidColumnRowMap.get(leaveHeader).add(rowNumber - 1);

            rowData[leaveHeader] = '';
          }
          // else if (!Number.isInteger(numValue * 4)) {
          //   // ✅ Row-level remark (keep this)
          //   remarks.push(`${leaveHeader} must be in 0.25 increments`);

          //   invalidRowSet.add(rowNumber - 1);

          //   if (!invalidColumnRowMap.has(leaveHeader)) {
          //     invalidColumnRowMap.set(leaveHeader, new Set());
          //   }
          //   invalidColumnRowMap.get(leaveHeader).add(rowNumber - 1);

          //   rowData[leaveHeader] = '';
          // }
        }
      });

      // =========================
      // BUSINESS VALIDATION
      // =========================
      if (userMasterID && yearMonth && /^\d{6}$/.test(yearMonth)) {
        const operationRemarks = validateLeaveOperation({
          operationType,
          userBalanceMap,
          userMasterID,
          yearMonth,
          leaveHeaders: validLeaveHeaders,
          rowData,
          leaveTypeMap,
          currentYearMonth,
          previousYearMonth,
        });

        if (operationRemarks.length > 0) {
          remarks.push(...operationRemarks);
          invalidRowSet.add(rowNumber - 1);
        }
      }

      rowData.remark = remarks.length ? remarks.join(', ') : 'Valid';

      outSheet.addRow(rowData);
      parsedRows.push(rowData);
    }

    // =========================
    // BUILD COLUMN-WISE REMARKS
    // =========================
    invalidColumnRowMap.forEach((rowSet, leaveHeader) => {
      const rows = Array.from(rowSet).sort((a, b) => a - b);
      const rowString = rows.join(', ');
      invalidLeaveColumns.push(
        `${leaveHeader} value invalid at rows: ${rowString}`,
      );
    });

    const savePath = path.join(
      'uploads/validated',
      `leave_validation_${Date.now()}.xlsx`,
    );

    await outWorkbook.xlsx.writeFile(savePath);

    // =========================
    // RESPONSE
    // =========================
    res.json({
      validatedExcelPath: savePath,
      operationType,
      headers: finalHeaders,
      totalRecords: parsedRows.length,
      page: Number(page),
      limit: Number(limit),
      data: parsedRows.slice((page - 1) * limit, page * limit),
      invalidLeaveColumns,
      availableColumns,
      invalidUserRowNumbers: Array.from(invalidRowSet).sort((a, b) => a - b),
      summary: {
        totalRows: parsedRows.length,
        invalidUserCount: invalidRowSet.size,
        hasErrors: invalidRowSet.size > 0 || invalidLeaveColumns.length > 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getValidatedExcelData = async (req, res, next) => {
  try {
    const { validatedExcelPath, page = 1, limit = 20 } = req.body;

    /* ----------------------------
       1️⃣ Basic Validation
    ---------------------------- */
    if (!validatedExcelPath) {
      return res.status(400).json({
        message: 'validatedExcelPath is required',
      });
    }

    if (!fs.existsSync(validatedExcelPath)) {
      return res.status(404).json({
        message: 'Validated Excel file not found',
      });
    }

    /* ----------------------------
       2️⃣ Read Excel
    ---------------------------- */
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(validatedExcelPath);
    const worksheet = workbook.worksheets[0];

    /* ----------------------------
       3️⃣ Read Headers
    ---------------------------- */
    const headers = [];
    worksheet.getRow(1).eachCell((cell) => {
      headers.push(String(cell.value).trim());
    });

    /* ----------------------------
       4️⃣ Parse Rows
    ---------------------------- */
    const rows = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const rowData = {};

      headers.forEach((header, index) => {
        const value = row.getCell(index + 1).value;

        // keep uuid internally but frontend can use it
        rowData[header] = value;
      });

      rows.push(rowData);
    });

    /* ----------------------------
       5️⃣ Pagination Logic
    ---------------------------- */
    const totalRecords = rows.length;
    const start = (page - 1) * limit;
    const end = start + Number(limit);

    const paginatedData = rows.slice(start, end);

    /* ----------------------------
       6️⃣ Response
    ---------------------------- */
    res.status(200).json({
      status: 200,
      validatedExcelPath,
      totalRecords,
      page: Number(page),
      limit: Number(limit),
      data: paginatedData,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateExcelRowImportLeaveBalance = async (req, res, next) => {
  try {
    const { validatedExcelPath, rowData, companyMasterID } = req.body;

    if (!validatedExcelPath || !rowData || !rowData._uuid) {
      return res.status(400).json({ message: 'Missing required data' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(validatedExcelPath);
    const sheet = workbook.getWorksheet('Validated');
    if (!sheet)
      return res.status(400).json({ message: 'Validated sheet not found' });

    // Read headers from Excel to avoid mismatch
    const headers = [];
    sheet.getRow(1).eachCell((cell) => {
      headers.push(String(cell.value).trim());
    });

    const fixedColumns = [
      '_uuid',
      'Number',
      'Name',
      'Operation Type',
      'Month Year',
      'Branch',
      'Employee Code',
      'Department',
      'Designation',
      'Employeement Type',
      'remark',
    ];
    const leaveHeaders = headers.filter((h) => {
      return (
        !fixedColumns.includes(h) &&
        typeof h === 'string' &&
        !h.startsWith('Available (')
      );
    });

    // Get operation type from row 2
    const operationTypeColIndex = headers.indexOf('Operation Type') + 1;
    const firstDataRow = sheet.getRow(2);
    const operationType = firstDataRow.getCell(operationTypeColIndex).value;

    // Validate Leave Headers
    const companyLeaveTypes = await getAllHrLeaveTypes(companyMasterID);

    const leaveTypeMap = new Map(
      companyLeaveTypes.map((lt) => [
        lt.LeaveMaster.LeaveName.trim(),
        {
          LeaveTranId: lt.LeaveTranId,
          LeaveID: lt.LeaveID,
          LeaveName: lt.LeaveMaster.LeaveName,
        },
      ]),
    );

    // Find row by _uuid
    let excelRow;
    const uuidCol = headers.indexOf('_uuid') + 1; // 1-based
    if (!uuidCol || uuidCol < 1)
      return res
        .status(500)
        .json({ message: '_uuid column not found in Excel' });

    for (let i = 2; i <= sheet.rowCount; i++) {
      const r = sheet.getRow(i);
      const uuidCell = r.getCell(uuidCol).value;
      if (uuidCell === rowData._uuid) {
        excelRow = r;
        break;
      }
    }

    if (!excelRow)
      return res.status(404).json({ message: 'Row not found in Excel' });

    // Get user number from rowData
    const userNumber = String(rowData.Number || '');

    const date = moment().format('YYYY-MM-DD');

    // Fetch only this user
    const user = await UserMaster.findOne({
      where: {
        companyMasterId: companyMasterID,
        userNumber: userNumber,
        status: [0, 1],
      },
      attributes: ['userMasterID', 'userNumber'],
      include: [
        {
          required: false,
          model: empLeavePolicy,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(date) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(date) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: ['employeeLeavePolicyID'],
        },
      ],
    });

    const userMasterID = user ? user.userMasterID : null;

    let employeeLeaveIds = [];
    let allLeavePolicy = [];

    if (operationType == leaveOperationENUM.Encashment) {
      employeeLeaveIds =
        user?.empLeavePolicies?.[0]?.employeeLeavePolicyID || [];

      allLeavePolicy = await employeeLeavePolicy.findAll({
        where: {
          id: {
            [Sequelize.Op.in]: employeeLeaveIds,
          },
          leaveEncashmentAtFNF: true,
        },
        attributes: ['id', 'leaveId', 'leaveEncashmentAtFNF'],
        include: [{ model: HrLeaveMaster, attributes: ['LeaveName'] }],
      });
    }

    // Get user balance if needed for validation
    let userBalanceMap = new Map();

    if (
      userMasterID &&
      (operationType === leaveOperationENUM.Lapse ||
        operationType === leaveOperationENUM.Encashment)
    ) {
      const userBalance = await employeeeLeaveBalance(
        companyMasterID,
        userMasterID,
        null,
        null,
        null,
        null,
        null,
        chekLeaveBalanceFromEnum.ADMIN,
      );
      userBalanceMap.set(userMasterID, userBalance);
    }

    const currentYearMonth = moment().format('YYYYMM');
    const previousYearMonth = moment().subtract(1, 'month').format('YYYYMM');

    // Revalidate row
    const remarkCol = headers.indexOf('remark') + 1;
    if (!remarkCol || remarkCol < 1)
      return res.status(500).json({ message: 'Remark column missing' });

    const remarks = [];
    const yearMonth = parseYearMonth(rowData['Month Year']);
    rowData['Month Year'] = yearMonth;

    // Validate user
    if (!user) {
      remarks.push('User not found');
    }

    // Validate operation type matches
    if (rowData['Operation Type'] !== operationType) {
      remarks.push(`Operation type must be ${operationType} for all rows`);
    }

    // Validate year month format
    if (yearMonth && !/^\d{6}$/.test(yearMonth)) {
      remarks.push('Invalid yearMonth format (should be YYYYMM)');
    }

    // Validate leave balance columns (only 0.25 steps allowed)
    leaveHeaders.forEach((header) => {
      const val = rowData[header];

      if (val !== null && val !== undefined && val !== '') {
        if (operationType == leaveOperationENUM.Encashment) {
          const canEncashLeave = allLeavePolicy.find(
            (item) =>
              employeeLeaveIds.includes(+item.id) &&
              header == item.hrLeaveMaster?.LeaveName,
          );

          if (canEncashLeave) {
            remarks.push(
              `Leave encashment for '${canEncashLeave.hrLeaveMaster?.LeaveName}' is allowed only during Full & Final (FNF) settlement.`,
            );
          }
        }

        const numValue = Number(val);

        if (isNaN(numValue)) {
          remarks.push(`${header} value is invalid`);
          rowData[header] = '';
        } else if (numValue <= 0) {
          remarks.push(`${header} value must be greater than 0`);
          rowData[header] = '';
        }
        // ✅ Enforce 0.25 increments
        // else if (!Number.isInteger(numValue * 4)) {
        //   remarks.push(
        //     `${header} value must be in increments of 0.25 (e.g. 0.25, 0.5, 0.75, 1)`,
        //   );
        //   rowData[header] = '';
        // }
      }
    });

    // Call specific validation function based on operation type
    if (
      userMasterID &&
      yearMonth &&
      /^\d{6}$/.test(yearMonth) &&
      !remarks.length
    ) {
      const operationRemarks = validateLeaveOperation({
        operationType,
        userBalanceMap,
        userMasterID,
        yearMonth,
        leaveHeaders,
        rowData,
        leaveTypeMap,
        currentYearMonth,
        previousYearMonth,
      });

      if (operationRemarks.length > 0) {
        remarks.push(...operationRemarks);
      }
    }

    // Update all cells safely (after validation)
    headers.forEach((header, index) => {
      const colNum = index + 1;

      // Only allow updating valid leave columns
      if (!fixedColumns.includes(header) && leaveHeaders.includes(header)) {
        excelRow.getCell(colNum).value =
          rowData[header] !== undefined ? rowData[header] : '';
      }
    });

    excelRow.getCell(remarkCol).value = remarks.length
      ? remarks.join(', ')
      : 'Valid';

    // Save Excel safely
    await workbook.xlsx.writeFile(validatedExcelPath);

    // 🔁 Recalculate invalid rows summary (NO full validation)
    const invalidUsers = [];
    const remarkColIndex = headers.indexOf('remark') + 1;

    for (let i = 2; i <= sheet.rowCount; i++) {
      const r = sheet.getRow(i);
      const remarkVal = String(r.getCell(remarkColIndex).value || '').trim();

      if (remarkVal && remarkVal !== 'Valid') {
        invalidUsers.push({
          rowNumber: i - 1, // excel data row number
        });
      }
    }

    const invalidUserRowNumbers = invalidUsers
      .map((u) => u.rowNumber)
      .join(',');

    res.status(200).json({
      message: 'Row updated successfully',
      rowData,
      remark: excelRow.getCell(remarkCol).value,
      summary: {
        invalidUserCount: invalidUsers.length,
        hasErrors: invalidUsers.length > 0,
      },
      invalidUserRowNumbers,
    });
  } catch (error) {
    next(error);
  }
};

exports.removeExcelRowByUUID = async (req, res, next) => {
  try {
    const { excelPath, uuid } = req.body;

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);
    const sheet = workbook.worksheets[0];

    let uuidColIndex;
    sheet.getRow(1).eachCell((cell, col) => {
      if (cell.value === '_uuid') uuidColIndex = col;
    });

    if (!uuidColIndex) {
      return res.status(400).json({ message: 'UUID column missing' });
    }

    const invalidUsers = [];
    let remarkColIndex;
    sheet.getRow(1).eachCell((cell, col) => {
      if (cell.value === 'remark') remarkColIndex = col;
    });
    if (!remarkColIndex) {
      return res.status(400).json({ message: 'Remark column missing' });
    }

    let deleteRowIndex = null;

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      if (row.getCell(uuidColIndex).value === uuid) {
        deleteRowIndex = rowNumber;
      }
    });

    if (!deleteRowIndex) {
      return res.status(404).json({ message: 'Row not found' });
    }

    sheet.spliceRows(deleteRowIndex, 1);
    await workbook.xlsx.writeFile(excelPath);

    // 🔁 Recalculate invalid rows summary

    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const remarkVal = String(row.getCell(remarkColIndex).value || '').trim();

      if (remarkVal && remarkVal !== 'Valid') {
        invalidUsers.push({
          rowNumber: i - 1, // excel data row number
        });
      }
    }

    const invalidUserRowNumbers = invalidUsers
      .map((u) => u.rowNumber)
      .join(',');

    return res.status(200).json({
      status: 200,
      message: 'Row removed successfully',
      summary: {
        invalidUserCount: invalidUsers.length,
        hasErrors: invalidUsers.length > 0,
      },
      invalidUserRowNumbers,
    });
  } catch (error) {
    next(error);
  }
};

exports.revalidateExcelImportLeaveBalance = async (req, res, next) => {
  try {
    const {
      validatedExcelPath,
      companyMasterID,
      page = 1,
      limit = 20,
    } = req.body;

    if (!validatedExcelPath) {
      return res.status(400).json({ message: 'Validated excel path required' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(validatedExcelPath);
    const sheet = workbook.getWorksheet('Validated');

    // Read Headers
    const headers = [];
    sheet.getRow(1).eachCell((cell) => {
      headers.push(String(cell.value).trim());
    });

    const fixedColumns = [
      '_uuid',
      'Number',
      'Name',
      'Operation Type',
      'Month Year',
      'Branch',
      'Employee Code',
      'Department',
      'Designation',
      'remark',
      'Employeement Type',
    ];
    const leaveHeaders = headers.filter(
      (h) => !fixedColumns.includes(h) && h !== 'remark',
    );

    // Get operation type from row 2
    const operationTypeColIndex = headers.indexOf('Operation Type') + 1;
    const firstDataRow = sheet.getRow(2);
    const operationType = firstDataRow.getCell(operationTypeColIndex).value;

    if (
      !operationType ||
      ![
        leaveOperationENUM.Lapse,
        leaveOperationENUM.Encashment,
        leaveOperationENUM.AddLeaveBalance,
      ].includes(operationType)
    ) {
      return res.status(400).json({
        message:
          'Invalid or missing operation type in first data row. Must be one of: Lapse, Encashment, AddLeaveBalance',
      });
    }

    // Validate Leave Headers
    const companyLeaveTypes = await getAllHrLeaveTypes(companyMasterID);

    const leaveTypeMap = new Map(
      companyLeaveTypes.map((lt) => [
        lt.LeaveMaster.LeaveName.trim(),
        {
          LeaveTranId: lt.LeaveTranId,
          LeaveID: lt.LeaveID,
          LeaveName: lt.LeaveMaster.LeaveName,
        },
      ]),
    );

    // Extract unique user numbers from Excel
    const numberColIndex = headers.indexOf('Number') + 1;
    const uniqueUserNumbers = new Set();

    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      const mobile = String(row.getCell(numberColIndex).value || '');
      if (mobile) {
        uniqueUserNumbers.add(mobile);
      }
    }

    const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });

    // Fetch only users that are in the Excel
    const users = await UserMaster.findAll({
      where: {
        ...where,
        companyMasterId: companyMasterID,
        userNumber: { [Sequelize.Op.in]: Array.from(uniqueUserNumbers) },
        status: [0, 1],
      },
      attributes: ['userMasterID', 'userNumber'],
      include: [...includeModels],
    });

    const userSet = new Set(users.map((u) => String(u.userNumber)));
    const userMap = new Map(
      users.map((u) => [String(u.userNumber), u.userMasterID]),
    );

    // Fetch all user balances in ONE query for Lapse/Encashment
    let userBalanceMap = new Map();

    if (
      operationType === leaveOperationENUM.Lapse ||
      operationType === leaveOperationENUM.Encashment
    ) {
      const uniqueUserIds = users.map((u) => u.userMasterID);

      if (uniqueUserIds.length > 0) {
        userBalanceMap = await bulkEmployeeLeaveBalance(
          companyMasterID,
          uniqueUserIds,
        );
      }
    }

    const currentYearMonth = moment().format('YYYYMM');
    const previousYearMonth = moment().subtract(1, 'month').format('YYYYMM');

    // Get remark column
    const remarkCol = headers.indexOf('remark') + 1;
    if (!remarkCol || remarkCol < 1) {
      return res.status(500).json({
        message: 'Remark column missing in validated excel',
      });
    }

    // Revalidate rows
    const parsedRows = [];
    const invalidUsers = [];

    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      const rowData = {};
      const remarks = [];

      headers.forEach((header, index) => {
        rowData[header] = row.getCell(index + 1).value;
      });

      const mobile = String(rowData.Number || '');
      const userMasterID = userMap.get(mobile);
      const rowOperationType = rowData['Operation Type'];
      const yearMonth = parseYearMonth(rowData['Month Year']);
      rowData['Month Year'] = yearMonth;

      // Validate user
      if (!userSet.has(mobile)) {
        remarks.push('User not found');
        const excelDataRowNumber = rowNumber - 1;
        invalidUsers.push({
          rowNumber: excelDataRowNumber,
          userNumber: mobile,
        });
      }

      // Validate operation type matches
      if (rowOperationType !== operationType) {
        remarks.push(`Operation type must be ${operationType} for all rows`);
      }

      // Validate year month format
      if (yearMonth && !/^\d{6}$/.test(yearMonth)) {
        remarks.push('Invalid yearMonth format (should be YYYYMM)');
      }

      // Validate leave balance columns (only positive numbers in 0.25 steps allowed)
      leaveHeaders.forEach((leaveHeader) => {
        const value = rowData[leaveHeader];

        if (value !== null && value !== undefined && value !== '') {
          const numValue = Number(value);

          if (isNaN(numValue)) {
            remarks.push(`${leaveHeader} value is invalid`);
            rowData[leaveHeader] = '';
          } else if (numValue <= 0) {
            remarks.push(`${leaveHeader} value must be greater than 0`);
            rowData[leaveHeader] = '';
          }
          // // ✅ enforce 0.25 increments
          // else if (!Number.isInteger(numValue * 4)) {
          //   remarks.push(
          //     `${leaveHeader} value must be in increments of 0.25 (e.g. 0.25, 0.5, 0.75, 1)`,
          //   );
          //   rowData[leaveHeader] = '';
          // }

          // Track invalid users
          if (remarks.length) {
            const excelDataRowNumber = rowNumber - 1;
            if (!invalidUsers.find((u) => u.rowNumber === excelDataRowNumber)) {
              invalidUsers.push({
                rowNumber: excelDataRowNumber,
                userNumber: mobile,
              });
            }
          }
        }
      });

      // Call specific validation function based on operation type
      if (
        userMasterID &&
        yearMonth &&
        /^\d{6}$/.test(yearMonth) &&
        !remarks.length
      ) {
        const operationRemarks = validateLeaveOperation({
          operationType,
          userBalanceMap,
          userMasterID,
          yearMonth,
          leaveHeaders,
          rowData,
          leaveTypeMap,
          currentYearMonth,
          previousYearMonth,
        });

        if (operationRemarks.length > 0) {
          remarks.push(...operationRemarks);
          const excelDataRowNumber = rowNumber - 1;
          if (!invalidUsers.find((u) => u.rowNumber === excelDataRowNumber)) {
            invalidUsers.push({
              rowNumber: excelDataRowNumber,
              userNumber: mobile,
            });
          }
        }
      }

      const finalRemark = remarks.length ? remarks.join(', ') : 'Valid';

      // Update excel row
      headers.forEach((header, index) => {
        const colNum = index + 1;
        if (rowData[header] !== undefined) {
          row.getCell(colNum).value = rowData[header];
        }
      });

      row.getCell(remarkCol).value = finalRemark;

      rowData.remark = finalRemark;
      parsedRows.push(rowData);
    }

    // Save excel (overwrite)
    await workbook.xlsx.writeFile(validatedExcelPath);

    // Pagination
    const start = (page - 1) * limit;
    const end = start + Number(limit);

    const invalidUserRowNumbers = invalidUsers
      .map((u) => u.rowNumber)
      .join(',');

    res.status(200).json({
      status: 200,
      validatedExcelPath,
      operationType,
      totalRecords: parsedRows.length,
      page: Number(page),
      limit: Number(limit),
      data: parsedRows.slice(start, end),
      invalidUserRowNumbers,
      validLeaveHeaders: leaveHeaders,
      message: 'Revalidated Successfully',
      summary: {
        totalRows: parsedRows.length,
        invalidUserCount: invalidUsers.length,
        hasErrors: invalidUsers.length > 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.saveExcelImportLeaveBalance = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      validatedExcelPath,
      companyMasterID,
      startDate,
      endDate,
      payrollFrequency,
    } = req.body;
    const bulkLeaveEncashment = [];
    const bulkUserLeaveLapse = [];
    const bulkHrLeaveBalance = [];
    if (!validatedExcelPath || !companyMasterID) {
      await transaction.rollback();
      return res.status(400).json({
        status: 400,
        message: 'Validated excel path and companyMasterID required',
      });
    }

    // Read Validated Excel
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(validatedExcelPath);

    const sheet = workbook.getWorksheet('Validated');
    if (!sheet) {
      await transaction.rollback();
      return res.status(400).json({
        status: 400,
        message: 'Validated sheet not found',
      });
    }

    // Read Headers
    const headers = [];
    sheet.getRow(1).eachCell((cell) => {
      headers.push(String(cell.value).trim());
    });

    const fixedColumns = [
      '_uuid',
      'Number',
      'Name',
      'Operation Type',
      'Month Year',
      'Branch',
      'Employee Code',
      'Department',
      'Designation',
      'remark',
      'Employeement Type',
    ];

    const leaveHeaders = headers.filter(
      (h) =>
        !fixedColumns.includes(h) &&
        typeof h === 'string' &&
        !h.startsWith('Available ('),
    );

    // Get operation type from first data row
    const operationTypeColIndex = headers.indexOf('Operation Type') + 1;
    const firstDataRow = sheet.getRow(2);
    const operationType = firstDataRow.getCell(operationTypeColIndex).value;

    // Build LeaveName → LeaveInfo Map
    const leaveTypes = await getAllHrLeaveTypes(companyMasterID);

    const leaveNameToInfoMap = new Map();
    leaveTypes.forEach((lt) => {
      leaveNameToInfoMap.set(lt.LeaveMaster.LeaveName.trim(), {
        LeaveTranId: lt.LeaveTranId,
        LeaveID: lt.LeaveID,
      });
    });

    // Get all unique user numbers from excel
    const numberColIndex = headers.indexOf('Number') + 1;
    const uniqueUserNumbers = new Set();

    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      const remark = row.getCell(headers.indexOf('remark') + 1).value;

      // Only process valid rows
      if (remark === 'Valid') {
        const mobile = String(row.getCell(numberColIndex).value || '');
        if (mobile) {
          uniqueUserNumbers.add(mobile);
        }
      }
    }

    const date = asiaKolkataDateTime(new Date()).slice(0, 10);

    const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });

    // Fetch users that are in the Excel
    const users = await UserMaster.findAll({
      where: {
        ...where,
        companyMasterId: companyMasterID,
        userNumber: { [Sequelize.Op.in]: Array.from(uniqueUserNumbers) },
        status: 1,
      },
      attributes: ['userMasterID', 'userNumber'],
      include: [
        ...includeModels,
        {
          required: false,
          model: empLeavePolicy,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(date) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(date) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: ['employeeLeavePolicyID'],
        },
      ],
    });

    const userNumberToIdMap = new Map(
      users.map((u) => [String(u.userNumber), u.userMasterID]),
    );

    let empLeavePolicyMap = null;
    let employeeLeaveIds = [];
    let allLeavePolicy = [];

    if (operationType == leaveOperationENUM.Encashment) {
      empLeavePolicyMap = new Map(
        users.map((u) => [
          String(u.userMasterID),
          u.empLeavePolicies?.[0]?.employeeLeavePolicyID,
        ]),
      );

      employeeLeaveIds = users.flatMap(
        (e) => e.empLeavePolicies?.[0]?.employeeLeavePolicyID,
      );

      allLeavePolicy = await employeeLeavePolicy.findAll({
        where: {
          id: {
            [Sequelize.Op.in]: employeeLeaveIds,
          },
          leaveEncashmentAtFNF: true,
        },
        attributes: ['id', 'leaveId', 'leaveEncashmentAtFNF'],
        include: [{ model: HrLeaveMaster, attributes: ['LeaveName'] }],
      });
    }

    // Counters
    let savedRowCount = 0;
    let savedLeaveCount = 0;

    // Process each row
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber);

      const rowData = {};
      headers.forEach((header, index) => {
        rowData[header] = row.getCell(index + 1).value;
      });

      // Skip invalid rows
      if (rowData.remark !== 'Valid') continue;

      const userNumber = String(rowData.Number || '');
      const yearMonth = String(rowData['Month Year'] || '');
      const userMasterID = userNumberToIdMap.get(userNumber);

      if (!userMasterID) continue; // safety check

      // Process each leave type column
      for (const leaveName of leaveHeaders) {
        const balance = Number(rowData[leaveName]);

        if (!balance || balance <= 0) continue;

        const leaveInfo = leaveNameToInfoMap.get(leaveName);
        if (!leaveInfo) continue;

        const { LeaveTranId, LeaveID } = leaveInfo;

        if (operationType == leaveOperationENUM.Encashment) {
          const userLeavePolicyIds =
            empLeavePolicyMap.get(String(userMasterID)) || [];

          const canEncashLeave = allLeavePolicy.find(
            (item) =>
              userLeavePolicyIds.includes(+item.id) &&
              leaveName == item.hrLeaveMaster?.LeaveName,
          );

          if (canEncashLeave) {
            continue;
          }
        }

        // Get COFF balance data if needed (only for Lapse/Encashment)
        let allCoffBalanceData =
          LeaveID == 6 && operationType !== leaveOperationENUM.AddLeaveBalance
            ? await getCoffBalanceData(userMasterID, date)
            : [];
        let usedLogTransactions = [];

        // Process based on operation type
        if (operationType === leaveOperationENUM.AddLeaveBalance) {
          // Add Leave Balance
          bulkHrLeaveBalance.push({
            LeaveTranId,
            userMasterID,
            YearMM: yearMonth,
            LeaveAddNew: balance,
            availBal: balance,
            createBy: req.userDetails.userMasterId,
            createByIp: req.userDetails.userIpAddress,
          });

          savedLeaveCount++;
        } else if (operationType === leaveOperationENUM.Lapse) {
          // Lapse Leave

          bulkUserLeaveLapse.push({
            userMasterID,
            LeaveTranId,
            LapseDays: balance,
            LapseYearMonth: yearMonth,
            status: 1,
            createBy: req.userDetails.userMasterId,
            createByIp: req.userDetails.userIpAddress,
          });

          // Handle COFF
          if (allCoffBalanceData.length > 0) {
            const { allBalanceData, usedTransactionLog } = consumeLeaveBalance(
              allCoffBalanceData,
              balance,
              date,
              CoffUsedTypeEnum.LAPSE,
            );

            allCoffBalanceData = [...allBalanceData];
            usedLogTransactions = [...usedTransactionLog];
          }

          savedLeaveCount++;
        } else if (operationType === leaveOperationENUM.Encashment) {
          // Encash Leave

          bulkLeaveEncashment.push({
            userMasterID,
            LeaveTranId,
            YYYYMM: yearMonth,
            days: balance,
            status: 1,
            payrollFrequency: payrollFrequency || PayrollFrequencyType.MONTHLY,
            startDate: startDate,
            endDate: endDate,
            createBy: req.userDetails.userMasterId,
            createByIp: req.userDetails.userIpAddress,
          });

          // Handle COFF
          if (allCoffBalanceData.length > 0) {
            const { allBalanceData, usedTransactionLog } = consumeLeaveBalance(
              allCoffBalanceData,
              balance,
              date,
              CoffUsedTypeEnum.ENCASH,
            );

            allCoffBalanceData = [...allBalanceData];
            usedLogTransactions = [...usedTransactionLog];
          }

          savedLeaveCount++;
        }

        // Update COFF balance if needed
        if (allCoffBalanceData.length) {
          await Promise.all(
            allCoffBalanceData.map((e) =>
              HrLeaveBalance.update(
                { availBal: e.availBal },
                { where: { LeaveBalTranId: e.LeaveBalTranId }, transaction },
              ),
            ),
          );
        }

        // Add used COFF transactions
        if (usedLogTransactions.length) {
          await UsedCoffTransaction.bulkCreate(usedLogTransactions, {
            user: req.userDetails,
            individualHooks: true,
            transaction,
          });
        }
      }

      savedRowCount++;
    }

    if (bulkLeaveEncashment.length > 0) {
      await LeaveEncashment.bulkCreate(bulkLeaveEncashment, {
        user: req.userDetails,
        individualHooks: true,
        transaction,
      });
    }
    if (bulkUserLeaveLapse.length > 0) {
      await UserLeaveLapse.bulkCreate(bulkUserLeaveLapse, {
        user: req.userDetails,
        individualHooks: true,
        transaction,
      });
    }
    if (bulkHrLeaveBalance.length > 0) {
      await HrLeaveBalance.bulkCreate(bulkHrLeaveBalance, {
        user: req.userDetails,
        individualHooks: true,
        transaction,
      });
    }

    // Commit Transaction
    await transaction.commit();

    try {
      if (fs.existsSync(validatedExcelPath)) {
        fs.unlinkSync(validatedExcelPath);
      }
    } catch (fileError) {
      // Log error but don't fail the request
      console.error('Failed to delete Excel file:', fileError);
    }

    const userMessage =
      operationType === leaveOperationENUM.Encashment
        ? 'Leave Encashment'
        : operationType === leaveOperationENUM.Lapse
          ? 'Leave Lapse'
          : operationType === leaveOperationENUM.AddLeaveBalance
            ? 'Leave Balance'
            : 'Leave';

    return res.status(200).json({
      status: 200,
      message: `${userMessage} saved successfully`,
      summary: {
        operationType,
        totalUsersProcessed: savedRowCount,
        totalLeaveRecordsInserted: savedLeaveCount,
      },
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

async function bulkEmployeeLeaveBalance(
  companyId,
  userIds, // Array of user IDs
  balanceDate = asiaKolkataDateTime(new Date()).slice(0, 10),
) {
  if (!userIds || userIds.length === 0) return new Map();
  if (!balanceDate) balanceDate = asiaKolkataDateTime(new Date()).slice(0, 10);

  const hrleavetypeCondition = {
    companyMasterID: +companyId,
    status: 1,
    Leave_Allow: 'Y',
    LeaveID: { [Sequelize.Op.notIn]: [5, 18, 25] },
  };

  const groupBy = [
    'userMasterID',
    'hrLeaveType.LeaveTranId',
    'hrLeaveType.LeaveMaster.LeaveName',
    'hrLeaveType.LeaveMaster.LeaveDesc',
    'hrLeaveType.LeaveID',
  ];

  const attributes = [
    [Sequelize.col('userMasterID'), 'userMasterID'],
    [Sequelize.col('hrLeaveType.LeaveMaster.LeaveName'), 'leaveName'],
    [Sequelize.col('hrLeaveType.LeaveMaster.LeaveDesc'), 'LeaveDesc'],
    [Sequelize.col('hrLeaveType.LeaveTranId'), 'LeaveTranId'],
    [Sequelize.col('hrLeaveType.LeaveID'), 'LeaveID'],
  ];

  // Get all leave types
  const leaveType = await HrLeaveTypes.findAll({
    raw: true,
    where: hrleavetypeCondition,
    include: [
      {
        model: HrLeaveMaster,
        as: 'LeaveMaster',
        attributes: ['LeaveName', 'LeaveDesc'],
      },
    ],
  });

  // Get all user lapse leaves in one query
  const userLapseleave = await UserLeaveLapse.findAll({
    raw: true,
    where: {
      userMasterID: { [Sequelize.Op.in]: userIds },
    },
    include: [
      {
        model: HrLeaveTypes,
        attributes: [],
        where: hrleavetypeCondition,
        include: {
          model: HrLeaveMaster,
          as: 'LeaveMaster',
          attributes: [],
        },
      },
    ],
    group: groupBy,
    attributes: [
      ...attributes,
      [
        Sequelize.literal('coalesce(sum(cast("LapseDays" as numeric)),0)'),
        'totalDays',
      ],
    ],
  });

  // Get all user encashment leaves in one query
  const userEncashLeave = await LeaveEncashment.findAll({
    raw: true,
    where: {
      userMasterID: { [Sequelize.Op.in]: userIds },
      status: 1,
    },
    include: [
      {
        model: HrLeaveTypes,
        attributes: [],
        where: hrleavetypeCondition,
        include: {
          model: HrLeaveMaster,
          as: 'LeaveMaster',
          attributes: [],
        },
      },
    ],
    group: groupBy,
    attributes: [
      ...attributes,
      [
        Sequelize.literal('coalesce(sum(cast("days" as numeric)),0)'),
        'totalDays',
      ],
    ],
  });

  // Get all COFF balances for all users
  const allCoffBalances = await HrLeaveBalance.findAll({
    raw: true,
    where: {
      userMasterID: { [Sequelize.Op.in]: userIds },
      availBal: { [Sequelize.Op.gt]: 0 },
      [Sequelize.Op.or]: [
        { expiryDate: { [Sequelize.Op.gte]: balanceDate } },
        { expiryDate: { [Sequelize.Op.is]: null } },
      ],
    },
    include: [
      {
        required: true,
        model: HrLeaveTypes,
        where: { LeaveID: 6, status: 1 },
        attributes: [],
        include: {
          model: HrLeaveMaster,
          as: 'LeaveMaster',
          attributes: [],
        },
      },
    ],
    attributes: [
      'LeaveBalTranId',
      'availBal',
      'expiryDate',
      [Sequelize.col('userMasterID'), 'userMasterID'],
      [Sequelize.col('hrLeaveType.LeaveMaster.LeaveName'), 'leaveName'],
      [Sequelize.col('hrLeaveType.LeaveMaster.LeaveDesc'), 'LeaveDesc'],
      [Sequelize.col('hrLeaveType.LeaveTranId'), 'LeaveTranId'],
      [Sequelize.col('hrLeaveType.LeaveID'), 'LeaveID'],
    ],
  });

  // Get all add balances and used balances for all users
  const [addBalances, usedBalances] = await Promise.all([
    HrLeaveBalance.findAll({
      raw: true,
      where: { userMasterID: { [Sequelize.Op.in]: userIds } },
      include: [
        {
          model: HrLeaveTypes,
          attributes: [],
          where: hrleavetypeCondition,
          include: {
            model: HrLeaveMaster,
            as: 'LeaveMaster',
            attributes: [],
          },
        },
      ],
      group: groupBy,
      attributes: [
        ...attributes,
        [
          Sequelize.literal(
            'coalesce(sum(cast("LeaveAddNew" as numeric)),0)+coalesce(sum("OPBal"),0)',
          ),
          'totalDays',
        ],
      ],
    }),
    UserLeaveTransaction.findAll({
      raw: true,
      where: { status: 1 },
      include: [
        {
          model: UserLeave,
          where: { userMasterID: { [Sequelize.Op.in]: userIds } },
          attributes: [],
        },
        {
          model: HrLeaveTypes,
          where: hrleavetypeCondition,
          include: [
            { model: HrLeaveMaster, as: 'LeaveMaster', attributes: [] },
          ],
          attributes: [],
        },
      ],
      group: groupBy,
      attributes: [
        ...attributes,
        [
          Sequelize.fn('SUM', Sequelize.literal('COALESCE("days", 0)')),
          'totalDays',
        ],
      ],
    }),
  ]);

  // Process results for each user
  const userBalanceMap = new Map();

  userIds.forEach((userId) => {
    const finalAddBalance = [];
    const finalUsedBalance = [];

    for (const data of leaveType) {
      // Handle COFF separately
      if (data.LeaveID == 6) {
        const coffBals = allCoffBalances.filter(
          (c) => c.userMasterID == userId,
        );
        const totalDays = coffBals.reduce((acc, obj) => acc + +obj.availBal, 0);

        finalAddBalance.push({
          userMasterID: userId,
          leaveName: data['LeaveMaster.LeaveName'],
          LeaveDesc: data['LeaveMaster.LeaveDesc'],
          LeaveTranId: data.LeaveTranId,
          LeaveID: data.LeaveID,
          totalDays,
        });
      } else {
        const addBal = addBalances.find(
          (ab) =>
            ab.userMasterID == userId && ab.LeaveTranId == data.LeaveTranId,
        );
        const usedBal = usedBalances.find(
          (ub) =>
            ub.userMasterID == userId && ub.LeaveTranId == data.LeaveTranId,
        );

        if (addBal) finalAddBalance.push(addBal);
        if (usedBal) finalUsedBalance.push(usedBal);

        if (!addBal) {
          finalAddBalance.push({
            userMasterID: userId,
            leaveName: data['LeaveMaster.LeaveName'],
            LeaveDesc: data['LeaveMaster.LeaveDesc'],
            LeaveTranId: data.LeaveTranId,
            LeaveID: data.LeaveID,
            totalDays: 0,
          });
        }
        if (!usedBal) {
          finalUsedBalance.push({
            userMasterID: userId,
            leaveName: data['LeaveMaster.LeaveName'],
            LeaveDesc: data['LeaveMaster.LeaveDesc'],
            LeaveTranId: data.LeaveTranId,
            LeaveID: data.LeaveID,
            totalDays: 0,
          });
        }
      }
    }

    const usedLeaveTotalDaysMap = Object.fromEntries(
      finalUsedBalance.map((item) => [
        item.LeaveTranId,
        parseFloat(item.totalDays),
      ]),
    );

    const userLapseForUser = userLapseleave.filter(
      (ul) => ul.userMasterID == userId,
    );
    const userEncashForUser = userEncashLeave.filter(
      (ue) => ue.userMasterID == userId,
    );

    const finalBalance = finalAddBalance.map((item) => {
      const usedLeaveValue = usedLeaveTotalDaysMap[item.LeaveTranId] || 0;

      const lapsleave =
        item.LeaveID == 6
          ? 0
          : userLapseForUser.find((e) => e.LeaveTranId == item.LeaveTranId);

      const encashleave =
        item.LeaveID == 6
          ? 0
          : userEncashForUser.find((e) => e.LeaveTranId == item.LeaveTranId);

      const calculatedTotalDays =
        +item.totalDays -
        +usedLeaveValue -
        (lapsleave ? +lapsleave.totalDays : 0) -
        (encashleave ? +encashleave.totalDays : 0);

      const formattedTotalDays = calculatedTotalDays
        ? Number.isInteger(calculatedTotalDays)
          ? +calculatedTotalDays.toFixed(0)
          : +calculatedTotalDays % 1 === 0.2
            ? +calculatedTotalDays.toFixed(1)
            : +calculatedTotalDays.toFixed(2)
        : 0;

      const { totalDays, ...rest } = item;

      return {
        ...rest,
        Balance: formattedTotalDays == -0 ? 0 : formattedTotalDays,
      };
    });

    userBalanceMap.set(userId, finalBalance);
  });

  return userBalanceMap;
}

function validateBulkEncashment(
  userBalanceMap,
  userMasterID,
  yearMonth,
  leaveHeaders,
  rowData,
  leaveTypeMap,
  currentYearMonth,
  previousYearMonth,
) {
  const remarks = [];

  // if (yearMonth < previousYearMonth || yearMonth > currentYearMonth) {
  //   remarks.push('Month must be previous month or current month');
  //   return remarks;
  // }

  const userBalance = userBalanceMap.get(userMasterID) || [];

  for (const leaveHeader of leaveHeaders) {
    const balance = rowData[leaveHeader];

    if (!balance || balance === '' || balance === 0) continue;

    const leaveInfo = leaveTypeMap.get(leaveHeader);
    if (!leaveInfo) continue;

    const numValue = Number(balance);
    if (isNaN(numValue) || numValue < 0) continue;

    const findLeave = userBalance.find(
      (e) => e.LeaveTranId === leaveInfo.LeaveTranId,
    );

    if (!findLeave) {
      remarks.push(`${leaveHeader}: Leave type not found for user`);
      continue;
    }

    if (findLeave.Balance < numValue) {
      remarks.push(
        `${leaveHeader}: Insufficient balance (Available: ${findLeave.Balance}, Required: ${numValue})`,
      );
    }
  }

  return remarks;
}

function validateBulkLapse(
  userBalanceMap,
  userMasterID,
  yearMonth,
  leaveHeaders,
  rowData,
  leaveTypeMap,
  currentYearMonth,
) {
  const remarks = [];

  if (yearMonth !== currentYearMonth) {
    remarks.push('Month must be current month');
    return remarks;
  }

  const userBalance = userBalanceMap.get(userMasterID) || [];

  for (const leaveHeader of leaveHeaders) {
    const balance = rowData[leaveHeader];

    if (!balance || balance === '' || balance === 0) continue;

    const leaveInfo = leaveTypeMap.get(leaveHeader);
    if (!leaveInfo) continue;

    const numValue = Number(balance);
    if (isNaN(numValue) || numValue < 0) continue;

    const findLeave = userBalance.find(
      (e) => e.LeaveTranId === leaveInfo.LeaveTranId,
    );

    if (!findLeave) {
      remarks.push(`${leaveHeader}: Leave type not found for user`);
      continue;
    }

    if (findLeave.Balance < numValue) {
      remarks.push(
        `${leaveHeader}: Insufficient balance (Available: ${findLeave.Balance}, Required: ${numValue})`,
      );
    }
  }

  return remarks;
}

function validateBulkAddLeaveBalance(
  yearMonth,
  leaveHeaders,
  rowData,
  currentYearMonth,
) {
  const remarks = [];

  if (yearMonth > currentYearMonth) {
    remarks.push('Month must be previous months or current month');
    return remarks;
  }

  for (const leaveHeader of leaveHeaders) {
    const balance = rowData[leaveHeader];

    if (!balance || balance === '' || balance === 0) continue;

    const numValue = Number(balance);
    if (isNaN(numValue)) {
      remarks.push(`${leaveHeader} value is invalid`);
    } else if (numValue < 0) {
      remarks.push(`${leaveHeader} value cannot be negative`);
    }
  }

  return remarks;
}

function validateLeaveOperation({
  operationType,
  userBalanceMap,
  userMasterID,
  yearMonth,
  leaveHeaders,
  rowData,
  leaveTypeMap,
  currentYearMonth,
  previousYearMonth,
}) {
  switch (operationType) {
    case leaveOperationENUM.Encashment:
      return validateBulkEncashment(
        userBalanceMap,
        userMasterID,
        yearMonth,
        leaveHeaders,
        rowData,
        leaveTypeMap,
        currentYearMonth,
        previousYearMonth,
      );

    case leaveOperationENUM.Lapse:
      return validateBulkLapse(
        userBalanceMap,
        userMasterID,
        yearMonth,
        leaveHeaders,
        rowData,
        leaveTypeMap,
        currentYearMonth,
      );

    case leaveOperationENUM.AddLeaveBalance:
      return validateBulkAddLeaveBalance(
        yearMonth,
        leaveHeaders,
        rowData,
        currentYearMonth,
      );

    default:
      return [`Unsupported operation type: ${operationType}`];
  }
}

async function getAllHrLeaveTypes(companyMasterID) {
  const allLeaveTypes = await HrLeaveTypes.findAll({
    where: { companyMasterID, status: 1 },
    include: [
      {
        model: HrLeaveMaster,
        as: 'LeaveMaster',
        attributes: ['LeaveName', 'LeaveDesc', 'LeaveID'],
        where: { status: 1 },
      },
    ],
  });

  return allLeaveTypes;
}

async function getUserDataAndLeaveTypes(
  companyMasterID,
  currentDate,
  fileUploadType = FileUploadType.MOBILE_NUMBER,
) {
  try {
    return Promise.all([
      UserMaster.findAll({
        where: {
          companyMasterId: companyMasterID,
          status: 1,
        },
        include: [
          {
            model: EmployeeJoiningDetails,
            required:
              fileUploadType === FileUploadType.MOBILE_NUMBER ? false : true,
            attributes: ['employeeJoiningDetailId', 'employeeCode'],
          },
          {
            model: EmployeeBranch,
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date(currentDate) },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
                { endDate: { [Sequelize.Op.eq]: null } },
              ],
            },
            required: false,
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
            model: EmployeeDesignation,
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date(currentDate) },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
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
            model: EmployeeDepartment,
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date(currentDate) },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
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
            model: companyMaster,
            required: true,
            attributes: ['companyMasterID', 'companyName'],
          },
          {
            required: false,
            model: empLeavePolicy,
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date(currentDate) },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
                { endDate: null },
              ],
            },
          },
        ],
      }),

      HrLeaveTypes.findAll({
        where: {
          companyMasterID: companyMasterID,
        },
        include: [
          {
            model: HrLeaveMaster,
            as: 'LeaveMaster',
            where: {
              status: 1,
            },
          },
        ],
      }),
    ]);
  } catch (error) {
    throw new Error('Error in getUserDataAndLeaveTypes: ' + error.message);
  }
}

exports.addMissingLeaveBalance = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { userMasterIDs, companyMasterID } = req.body;

    if (userMasterIDs?.length == 0 || !companyMasterID) {
      await transaction.rollback();
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: message.usermessage.passValidValidParameter(
          'userMasterID and companyMasterID',
        ),
      });
    }

    const hrleave = await HrLeaveTypes.findOne({
      where: {
        companyMasterID,
        status: 1,
        LeaveID: 6,
      },
    });

    if (!hrleave) {
      await transaction.rollback();
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'Hrleave type is not found!',
      });
    }

    const allApprovedLeave = await UserLeave.findAll({
      where: {
        authorizationStatus: AuthorizationStatusType.APPROVED,
        userMasterID: {
          [Sequelize.Op.in]: userMasterIDs,
        },
      },
      attributes: ['userMasterID'],
      include: [
        {
          required: true,
          model: UserLeaveTransaction,
          where: {
            status: 1,
          },
          include: [
            {
              model: HrLeaveTypes,
              where: { LeaveID: 6 },
              attributes: ['LeaveID'],
            },
          ],
        },
      ],
    });

    const usedLeaveMap = new Map();

    for (const leave of allApprovedLeave) {
      const userId = +leave.userMasterID;

      if (!usedLeaveMap.has(userId)) {
        usedLeaveMap.set(userId, new Map());
      }

      const dateMap = usedLeaveMap.get(userId);

      for (const tran of leave.userLeaveTransactions || []) {
        const dateKey = moment(tran.date).format('YYYY-MM-DD');

        const existingDays = +dateMap.get(dateKey) || 0;

        dateMap.set(dateKey, existingDays + (+tran.days || 0));
      }
    }

    const hrleaveBalance = await HrLeaveBalance.findAll({
      where: {
        userMasterID: {
          [Sequelize.Op.in]: userMasterIDs,
        },
      },
      include: [
        {
          required: true,
          model: HrLeaveTypes,
          where: { LeaveID: 6 },
          attributes: ['LeaveID'],
        },
        { model: UsedCoffTransaction },
      ],
    });

    const consumeLeaveMap = new Map();

    for (const leave of hrleaveBalance) {
      const userId = +leave.userMasterID;

      if (!consumeLeaveMap.has(userId)) {
        consumeLeaveMap.set(userId, new Map());
      }

      const dateMap = consumeLeaveMap.get(userId);

      for (const tran of leave.usedCoffTransactions || []) {
        const dateKey = moment(tran.date).format('YYYY-MM-DD');

        const existingDays = +dateMap.get(dateKey) || 0;

        dateMap.set(dateKey, existingDays + (+tran.days || 0));
      }
    }

    const data = [];

    for (const userId of userMasterIDs) {
      const usedBalanceMap = usedLeaveMap.get(+userId);
      const consumeBalanceMap = consumeLeaveMap.get(+userId);

      if (usedBalanceMap?.size) {
        for (let [date, days] of usedBalanceMap) {
          const consume_bal = consumeBalanceMap?.get(date);

          if (consume_bal > 0 && days > 0) {
            days -= consume_bal;
          }

          if (days > 0) {
            data.push({
              userMasterID: userId,
              date,
              days,
            });
          }
        }
      }
    }

    const toUpdate = [];
    const toAdd = [];

    const addUsedCoff = [];

    const coff_leavetranid = hrleave.LeaveTranId;

    for (const userId of userMasterIDs) {
      const openingBalance = hrleaveBalance.find(
        (e) => e.userMasterID == userId && +e.OPBal > 0,
      );
      const userwiseRemaining = data.filter((e) => e.userMasterID == userId);
      const sumOfRemaining = userwiseRemaining.reduce(
        (acc, obj) => acc + +obj.days,
        0,
      );

      if (sumOfRemaining > 0) {
        const obj = {
          userMasterID: userId,
          days: sumOfRemaining,
        };

        let LeaveBalTranId = null;

        if (openingBalance) {
          LeaveBalTranId = openingBalance.LeaveBalTranId;

          HrLeaveBalance.update(
            {
              OPBal: +openingBalance.OPBal + +sumOfRemaining,
            },
            {
              where: {
                LeaveBalTranId: openingBalance.LeaveBalTranId,
              },
              transaction,
            },
          );
        } else {
          const addData = await HrLeaveBalance.create(
            {
              OPBal: sumOfRemaining,
              YearMM: 202509,
              LeaveTranId: coff_leavetranid, // add default
              userMasterID: userId,
              availBal: 0,
              createBy: openingBalance?.createBy || userId,
              createByIp: openingBalance?.createByIp || null,
            },
            { transaction },
          );

          LeaveBalTranId = addData.LeaveBalTranId;
        }

        for (const coff of userwiseRemaining) {
          addUsedCoff.push({
            date: coff.date,
            days: coff.days,
            type: CoffUsedTypeEnum.USED,
            LeaveBalTranId: LeaveBalTranId,
            createBy: openingBalance?.createBy || userId,
            createByIp: openingBalance?.createByIp || null,
          });
        }
      }
    }

    await UsedCoffTransaction.bulkCreate(addUsedCoff, {
      transaction,
      individualHooks: true,
      user: req.userDetails,
    });

    await transaction.commit();
    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: 'Data added successfully.',
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};
