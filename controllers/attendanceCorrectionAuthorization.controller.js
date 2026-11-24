const UserMaster = require('../models/userMaster');
const AuthorizationMaster = require('../models/authorizationMaster');
const AuthorizationDetails = require('../models/AuthorizationDetails');
const AuthorizationCriteria = require('../models/authorizationCriteriaMaster');
const Sequelize = require('sequelize');
const EmployeeBranch = require('../models/employeeBranch');
const AttendanceCorrectionRequest = require('../models/attendanceCorrectionRequest');
const AttendanceCorrectionAuthorization = require('../models/attendanceCorrectionAuthorization');
const sequelize = require('../config/database');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const BranchMaster = require('../models/branchMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const moment = require('moment');
const AttendanceCorrectionLogs = require('../models/attendanceCorrectionLogs');
const {
  sendNotification,
  asiaKolkataDateTime,
  manualAttendnace_Latest,
  findCompanyNotificationPolicy,
  encodeSecureBreak,
} = require('../utils/commonUtilFunctions');
const UserInbox = require('../models/UserInbox');
const HrLeaveMonthlyTrans = require('../models/hrLeavesMonthlyTrans');

const attendanceTransaction = require('../models/attendanceTransaction');
const AttendanceLogs = require('../models/attendancelogs');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');
const {
  authorizationMasterTypes,
  PayrollFrequencyType,
  authorizationCriteriaType,
  correctionStatusEnum,
  AttendanceCorrectionPermissionEnum,
} = require('../utils/dbUtils');
const message = require('../response_message/message');
const AttendanceCorrectionReason = require('../models/attendanceCorrectionReason');
const { sendEmailForLeave } = require('../middleware/sendemail');
const mailTemplateEditor = require('../models/mailTemplateEditor');
const { appURL } = require('../utils/labelUtils');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const Shift = require('../models/shift');
const ExcelJS = require('exceljs');
const AuthorizationCriteriaMaster = require('../models/authorizationCriteriaMaster');
const companyMaster = require('../models/companyMaster');
const { statusCodes } = require('../utils/commonVars');

function formatLogDateTime(datetime) {
  // Create a new Date object from the input
  const dateObj = new Date(datetime);

  // Get the components of the date
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');

  // Format the date and time to the required format "YYYY-MM-DDTHH:mm"
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

exports.authorizationacceptrejectAttendanceCorrection = async (
  req,
  res,
  next,
) => {
  try {
    const { id, remarks, authstatus } = req.body;

    const AttendanceCorrectionAuthorizationIdList = Array.isArray(id)
      ? id
      : [id];
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    let authorizedCount = 0;

    const skippedMap = new Map();

    const addSkipped = (name, reason) => {
      const key = `${name}__${reason}`;

      if (skippedMap.has(key)) {
        skippedMap.get(key).count++;
      } else {
        skippedMap.set(key, {
          name,
          reason,
          count: 1,
        });
      }
    };
    for (let data of AttendanceCorrectionAuthorizationIdList) {
      const transaction = await sequelize.transaction();
      try {
        let addAttendnaceFlag = false;
        const authRequest = await AttendanceCorrectionAuthorization.findOne({
          where: { id: data },
          include: [{ model: AttendanceCorrectionRequest }],
          transaction,
        });

        if (!authRequest) {
          await transaction.rollback();
          addSkipped('Not found', 'Request not found');
          continue;
        }
        

        const date = authRequest?.attendanceCorrectionRequest?.AttendanceDate;

        const attnCorrPermission =
          authRequest?.attendanceCorrectionRequest?.attnCorrPermission ||
          AttendanceCorrectionPermissionEnum.IN_TIME_OUT_TIME_DESCRIPTION;

        const userinfo = await UserMaster.findOne({
          where: {
            userMasterID:
              authRequest?.attendanceCorrectionRequest?.userMasterID,
          },
          include: [
            {
              required: false,
              model: EmployeeBranch,
              where: {
                status: 1,
                applicableDate: {
                  [Sequelize.Op.lte]: new Date(date),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: {
                      [Sequelize.Op.gte]: new Date(date),
                    },
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
              model: EmployeeDesignation,
              where: {
                status: 1,
                applicableDate: {
                  [Sequelize.Op.lte]: new Date(date),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: {
                      [Sequelize.Op.gte]: new Date(date),
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
              model: EmployeeDepartment,
              where: {
                status: 1,
                applicableDate: {
                  [Sequelize.Op.lte]: new Date(date),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: {
                      [Sequelize.Op.gte]: new Date(date),
                    },
                  },
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
              model: EmployeeJoiningDetails,
              attributes: ['payrollFrequency', 'employeeCode'],
            },
          ],
        });

        if (!userinfo) {
          await transaction.rollback();
          addSkipped('Unknown User', 'User not found');
          continue;
        }

        if (
          authRequest.attendanceCorrectionRequest.authorizationStatus == 3 ||
          authRequest.attendanceCorrectionRequest.authorizationStatus == 4
        ) {
          await transaction.rollback();
          addSkipped(
            userinfo?.displayName || 'Unknown User',
            authRequest.attendanceCorrectionRequest.authorizationStatus == 3
              ? 'Attendance Correction Request Already Approved'
              : 'Attendance Correction Request Already Rejected',
          );
          continue;
        }

        if (authstatus == 1) {
          const userId = authRequest.attendanceCorrectionRequest.userMasterID;
          const AttendanceDate =
            authRequest.attendanceCorrectionRequest.AttendanceDate;

          const payrollFrequency =
            userinfo.employeeJoiningDetails?.[0]?.payrollFrequency ||
            PayrollFrequencyType.MONTHLY;

          const attendance_verified = await HrLeaveMonthlyTrans.count({
            where: {
              userMasterID: userId,
              monthstartdate: {
                [Sequelize.Op.lte]: AttendanceDate,
              },
              monthenddate: {
                [Sequelize.Op.gte]: AttendanceDate,
              },
              payrollFrequency,
              verified: 1,
            },
          });

          if (attendance_verified > 0) {
            await transaction.rollback();
            addSkipped(
              userinfo.displayName,
              'Attendance already verified. So can not approve Attendance correction request.',
            );
            continue;
          }
        }

        const allAuthData = await AttendanceCorrectionAuthorization.findAll({
          where: {
            attendanceCorrectionRequestId:
              authRequest.attendanceCorrectionRequestId,
          },
          include: [{ model: AttendanceCorrectionRequest }],
          transaction,
        });

        const allAuthIds = allAuthData.map((e) => e.id);
        const approvedRequests = allAuthData.filter((e) => e.authStatus == 1);

        const authorizationDetails = await AuthorizationDetails.findOne({
          where: {
            AuthorizationMasterID:
              authorizationMasterTypes.attendanceCorrection,
            userMasterID:
              authRequest?.attendanceCorrectionRequest?.userMasterID,
            status: 1,
          },
          transaction,
        });

        if (!authorizationDetails) {
          await transaction.rollback();
          addSkipped('Authorization Detail', 'Authorization details not found');
          continue;
        }

        let isRolledBack = false;

        if (authstatus === 0) {
          await UserInbox.destroy(
            {
              where: {
                activityTable: AttendanceCorrectionAuthorization.getTableName(),
                activityTablePK: allAuthIds,
              },
            },
            { transaction },
          );

          await AttendanceCorrectionRequest.update(
            {
              authorizationStatus: 4,
              authorizedBy: createBy,
              authorizedAt: new Date(),
              isAuthorizedBy: false,
              authorizerRemark: remarks,
            },
            {
              where: {
                attendanceCorrectionRequestId:
                  authRequest.attendanceCorrectionRequestId,
              },
              transaction,
            },
          );
        } else {
          if (
            authorizationDetails.AuthorizationCriteriaID ==
            authorizationCriteriaType.SEQUENCENO
          ) {
            await UserInbox.destroy(
              {
                where: {
                  activityTable:
                    AttendanceCorrectionAuthorization.getTableName(),
                  activityTablePK: allAuthIds,
                },
              },
              { transaction },
            );

            const authRequests = allAuthData.filter((e) => e.authStatus != 0);

            const approvedUserIds = authRequests.map((req) =>
              req.userMasterID.toString(),
            );

            const formAuthUsers =
              authorizationDetails.AuthorizedByUserMasterId.map((id) =>
                id.toString(),
              );

            const remainingUserIds = formAuthUsers.filter(
              (id) => !approvedUserIds.includes(id),
            );

            if (remainingUserIds.length > 0) {
              const attendanceAuth =
                await AttendanceCorrectionAuthorization.create(
                  {
                    attendanceCorrectionRequestId:
                      authRequest.attendanceCorrectionRequestId,
                    userMasterID: remainingUserIds[0],
                    status: 1,
                    authStatus: 2,
                  },
                  { user: req.userDetails, transaction },
                );

              await UserInbox.create(
                {
                  activityTable:
                    AttendanceCorrectionAuthorization.getTableName(),
                  activityTablePK: attendanceAuth.toJSON().id,
                  message: `${
                    userinfo.displayName
                  } has requested an attendance correction for ${moment(
                    authRequest.attendanceCorrectionRequest.AttendanceDate,
                  ).format('DD/MM/YYYY')}.`,
                  assignedTo: remainingUserIds[0],
                  assignedBy: userinfo.userMasterID,
                },
                { transaction },
              );

              const notification = {
                title: 'Attendance Correction',
                body:
                  userinfo.displayName +
                  ' requested for an attendance correction.',
              };
              const data = {
                screen: 'attendanceCorrectionauth',
                isScheduled: 'true',
                scheduledTime: new Date().toISOString(),
              };
              const companyMasterID = userinfo?.companyMasterId || null;
              const get_NotificationPolicy =
                await findCompanyNotificationPolicy(+companyMasterID || null);
              const user = await UserMaster.findOne({
                where: {
                  userMasterID: remainingUserIds[0],
                },
              });
              let get_MailTemplate;

              if (get_NotificationPolicy && +companyMasterID) {
                get_MailTemplate = await mailTemplateEditor.findOne({
                  where: {
                    companyMasterID: companyMasterID,
                    status: 1,
                    mailTypeID: 32,
                  },
                });
              }
              if (get_NotificationPolicy) {
                if (get_MailTemplate) {
                  const empcode =
                      userinfo.employeeJoiningDetails?.[0]?.employeeCode || '',
                    empname = userinfo?.displayName,
                    department =
                      userinfo.employeeDepartments?.[0]?.department
                        ?.departmentName || '',
                    designation =
                      userinfo.employeeDesignations?.[0]?.designation
                        ?.designationName || '',
                    branch =
                      userinfo.employeeBranches?.[0]?.branchMaster
                        ?.branchName || '';

                  get_MailTemplate.subject = get_MailTemplate.subject.replace(
                    '[EmployeeCode]',
                    empcode,
                  );
                  get_MailTemplate.subject = get_MailTemplate.subject.replace(
                    '[EmployeeName]',
                    empname,
                  );

                  const reason = await AttendanceCorrectionReason.findOne({
                    where: {
                      attendanceCorrectionReasonID:
                        authRequest.attendanceCorrectionRequest
                          .attendanceCorrectionReasonID,
                    },
                  });

                  const reqReason = reason?.reason;

                  get_MailTemplate.subject = get_MailTemplate.subject.replace(
                    '[Reason]',
                    reqReason || '',
                  );
                  get_MailTemplate.body = get_MailTemplate.body.replace(
                    '[Reason]',
                    reqReason || '',
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
                    '[AttendanceDate]',
                    date,
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
                    '[AttendanceDate]',
                    date,
                  );
                }
              }
              if (
                user.email &&
                get_MailTemplate?.body &&
                attendanceAuth.toJSON().attendanceCorrectionRequestId
              ) {
                const myTemplate = JSON.parse(JSON.stringify(get_MailTemplate));
                let AuthorizationRequestId =
                  attendanceAuth.toJSON().attendanceCorrectionRequestId;
                const acceptData = {
                  AuthorizationRequestId,
                  type: 'approve',
                  id: attendanceAuth.id,
                  userMasterID: remainingUserIds[0],
                  companyMasterID: user?.companyMasterId,
                };
                const rejectData = {
                  AuthorizationRequestId,
                  type: 'reject',
                  id: attendanceAuth.id,
                  userMasterID: remainingUserIds[0],
                  companyMasterID: user?.companyMasterId,
                };
                const acceptedSigned = encodeSecureBreak(acceptData);
                const acceptUrl = `${appURL}#/app/attendances/attendance_correction_authorization?data=${acceptedSigned}`;
                const rejectedSigned = encodeSecureBreak(rejectData);
                const rejectUrl = `${appURL}#/app/attendances/attendance_correction_authorization?data=${rejectedSigned}`;

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
              await sendNotification(remainingUserIds[0], notification, data);
            } else {
              addAttendnaceFlag = true;
              await AttendanceCorrectionRequest.update(
                {
                  authorizationStatus: 3,
                  authorizedBy: createBy,
                  authorizedAt: new Date(),
                  isAuthorizedBy: false,
                  authorizerRemark: remarks,
                },
                {
                  where: {
                    attendanceCorrectionRequestId:
                      authRequest.attendanceCorrectionRequestId,
                  },
                  transaction,
                },
              );
            }
          } else if (
            authorizationDetails.AuthorizationCriteriaID ==
            authorizationCriteriaType.ANYONE
          ) {
            await UserInbox.destroy(
              {
                where: {
                  activityTable:
                    AttendanceCorrectionAuthorization.getTableName(),
                  activityTablePK: authRequest.id,
                },
              },
              { transaction },
            );
            if (approvedRequests.length + 1 >= 1) {
              addAttendnaceFlag = true;
              await UserInbox.destroy(
                {
                  where: {
                    activityTable:
                      AttendanceCorrectionAuthorization.getTableName(),
                    activityTablePK: allAuthIds,
                  },
                },
                { transaction },
              );

              await AttendanceCorrectionRequest.update(
                {
                  authorizationStatus: 3,
                  authorizedBy: createBy,
                  authorizedAt: new Date(),
                  isAuthorizedBy: false,
                  authorizerRemark: remarks,
                },
                {
                  where: {
                    attendanceCorrectionRequestId:
                      authRequest.attendanceCorrectionRequestId,
                  },
                  transaction,
                },
              );
            }
          } else if (
            authorizationDetails.AuthorizationCriteriaID ==
            authorizationCriteriaType.ANYTWO
          ) {
            await UserInbox.destroy(
              {
                where: {
                  activityTable:
                    AttendanceCorrectionAuthorization.getTableName(),
                  activityTablePK: authRequest.id,
                },
              },
              { transaction },
            );

            if (approvedRequests.length + 1 >= 2) {
              addAttendnaceFlag = true;
              await UserInbox.destroy(
                {
                  where: {
                    activityTable:
                      AttendanceCorrectionAuthorization.getTableName(),
                    activityTablePK: allAuthIds,
                  },
                },
                { transaction },
              );
              await AttendanceCorrectionRequest.update(
                {
                  authorizationStatus: 3,
                  authorizedBy: createBy,
                  authorizedAt: new Date(),
                  isAuthorizedBy: false,
                  authorizerRemark: remarks,
                },
                {
                  where: {
                    attendanceCorrectionRequestId:
                      authRequest.attendanceCorrectionRequestId,
                  },
                  transaction,
                },
              );
            }
          } else if (
            authorizationDetails.AuthorizationCriteriaID ==
            authorizationCriteriaType.ANYTHREE
          ) {
            await UserInbox.destroy(
              {
                where: {
                  activityTable:
                    AttendanceCorrectionAuthorization.getTableName(),
                  activityTablePK: authRequest.id,
                },
              },
              { transaction },
            );

            if (approvedRequests.length + 1 >= 3) {
              addAttendnaceFlag = true;
              await UserInbox.destroy(
                {
                  where: {
                    activityTable:
                      AttendanceCorrectionAuthorization.getTableName(),
                    activityTablePK: allAuthIds,
                  },
                },
                { transaction },
              );
              await AttendanceCorrectionRequest.update(
                {
                  authorizationStatus: 3,
                  authorizedBy: createBy,
                  authorizedAt: new Date(),
                  isAuthorizedBy: false,
                  authorizerRemark: remarks,
                },
                {
                  where: {
                    attendanceCorrectionRequestId:
                      authRequest.attendanceCorrectionRequestId,
                  },
                  transaction,
                },
              );
            }
          }
          // For final Approve
          if (
            addAttendnaceFlag &&
            attnCorrPermission !=
              AttendanceCorrectionPermissionEnum.DESCRIPTION_ONLY
          ) {
            const attendanceCorrectionLogs =
              await AttendanceCorrectionLogs.findAll({
                where: {
                  attendanceCorrectionRequestId:
                    authRequest.attendanceCorrectionRequestId,
                },
              });

            if (attendanceCorrectionLogs.length === 0) {
              await transaction.rollback();
              addSkipped('Logs', 'Attendance logs not found');
              continue;
            }

            const correctionStatus =
              authRequest.attendanceCorrectionRequest?.correctionStatus;

            const attendanceType = attendanceCorrectionLogs[0].attendanceStatus
              ? correctionStatus == correctionStatusEnum.STATUS_CHANGE
                ? '1'
                : correctionStatus
              : '3';
            const companyMasterID = userinfo.companyMasterId;
            const branchMasterID =
              userinfo.employeeBranches && userinfo.employeeBranches.length > 0
                ? userinfo.employeeBranches[0].branchID
                : null;
            const departmentID =
              userinfo.employeeDepartments &&
              userinfo.employeeDepartments.length > 0
                ? userinfo.employeeDepartments[0].departmentID
                : null;
            const designationID =
              userinfo.employeeDesignations &&
              userinfo.employeeDesignations.length > 0
                ? userinfo.employeeDesignations[0].designationID
                : null;
            const attendance = await attendanceTransaction.findOne({
              where: {
                userMasterID: userinfo.userMasterID,
                AttendanceDate:
                  authRequest.attendanceCorrectionRequest.AttendanceDate,
              },
              include: [
                {
                  required: false,
                  model: AttendanceLogs,
                  order: [['logDateTime', 'ASC']],
                },
              ],
            });

            const finaldataarray = [];

            const obj = {
              IN_Change: true,
              Name: userinfo.displayName,
              OUT_Change: true,
              Shift: null,
              Userid: userinfo.userMasterID,
              attendanceTransid: attendance
                ? attendance.AttendanceTransID
                : null,
              attendanceType: 0,
              attendance_date:
                authRequest.attendanceCorrectionRequest.AttendanceDate,
              branchMasterID: branchMasterID,
              departmentId: departmentID,
              designationId: designationID,
              attendanceLogs: [],
              attendanceLogData: [],
            };

            function sortLogsByDateTime(logData) {
              const data = logData.sort((a, b) => {
                const dateA = new Date(a.logDateTime).getTime();
                const dateB = new Date(b.logDateTime).getTime();
                return dateA - dateB; // Ascending order
              });

              return data;
            }

            if (attendanceType == 3) {
              const attendanceLogs =
                attendance && attendance.attendancelogs
                  ? sortLogsByDateTime(attendance.attendancelogs)
                  : [];
              obj.attendanceLogs = attendanceLogs;

              const formatedAttendanceLogs = attendanceCorrectionLogs.map(
                (e) => {
                  return {
                    logId: e.logId,
                    logDateTime: formatLogDateTime(e.logDateTime),
                    direction: String(e.direction).toLocaleLowerCase(),
                    isEdited: e.isChangeLog,
                    isdeleted: false,
                  };
                },
              );

              obj.attendanceLogData = formatedAttendanceLogs || [];
            }

            if (attendanceType == 1 || attendanceType == 4)
              (obj.Shift = attendanceCorrectionLogs[0].shiftID),
                (obj.attendanceType =
                  attendanceCorrectionLogs[0].attendanceStatus == 'P'
                    ? 1
                    : attendanceCorrectionLogs[0].attendanceStatus == 'HD'
                      ? 0.5
                      : 0);

            finaldataarray.push(obj);

            const responseMesage = await manualAttendnace_Latest(
              req,
              attendanceType,
              finaldataarray,
              companyMasterID,
              createBy,
              createByIp,
              transaction,
              false,
            );

            if (responseMesage && responseMesage?.status !== 200) {
              await transaction.rollback();
              isRolledBack = true;
              // userErrorMessage.push(
              //   responseMesage?.message || 'Error in Attendance Correction',
              // );
              addSkipped(
                userinfo.displayName,
                responseMesage?.message || 'Error in Attendance Correction',
              );
            }
          }
        }

        if (!isRolledBack) {
          await AttendanceCorrectionAuthorization.update(
            { authStatus: authstatus, remarks, updateBy: createBy },
            { where: { id: authRequest.id }, transaction },
          );
          await transaction.commit();
          authorizedCount++;
        }
      } catch (error) {
        await transaction.rollback();
        throw new Error('Error in Get User Include Model: ' + error.message);
      }
    }
    const skippedList = Array.from(skippedMap.values());
    // return res.status(200).json({
    //   status:
    //     attendanceVerifiedUserList.length || userErrorMessage.length
    //       ? 401
    //       : 200,
    //   message: userErrorMessage.length
    //     ? `${userErrorMessage.join(', ')}`
    //     : attendanceVerifiedUserList.length
    //       ? `${attendanceVerifiedUserList.join(', ')} Attendance Verified`
    //       : authstatus === 1
    //         ? 'Attendance Correction Authorization Request Accepted Successfully'
    //         : 'Attendance Correction Authorization Request Rejected Successfully',
    // });
    return res.status(200).json({
      status: skippedList.length ? 400 : 200,
      message:
        skippedList.length === 0
          ? authstatus === 1
            ? 'Attendance Correction Authorization Request Accepted Successfully'
            : 'Attendance Correction Authorization Request Rejected Successfully'
          : null,

      skippedUser: skippedList.length ? skippedList : null,

      authorizedCount,
      skippedCount:
        AttendanceCorrectionAuthorizationIdList.length - authorizedCount,
      totalRequests: AttendanceCorrectionAuthorizationIdList.length,
    });
  } catch (err) {
    next(err);
  }
};

exports.viewAuthorizationRequestByUserIdForAttendanceCorrection = async (
  req,
  res,
  next,
) => {
  try {
    const {
      limit,
      page,
      startdate,
      enddate,
      user,
      status,
      companyMasterID,
      isExport = false,
    } = req.body;

    const paginateCondition =
      page && limit && !isExport ? { offset: (page - 1) * limit, limit } : {};
    const authUserMasterID = req.userDetails.userMasterId;

    const condition = {
      status: 1,
      userMasterID: authUserMasterID,
      '$attendanceCorrectionRequest.status$': 1,
    };

    if (status !== null && status !== undefined) {
      condition.authStatus = status;
      if (+status === 2) {
        condition['$attendanceCorrectionRequest.authorizationStatus$'] = {
          [Sequelize.Op.notIn]: [3, 4],
        };
      }
    }

    if (user && user.length > 0) {
      condition['$attendanceCorrectionRequest.userMasterID$'] = {
        [Sequelize.Op.in]: user,
      };
    }

    if (startdate && enddate) {
      condition['$attendanceCorrectionRequest.AttendanceDate$'] = {
        [Sequelize.Op.between]: [startdate, enddate],
      };
    }

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const userCondition = { status: 1 };
    if (companyMasterID) {
      userCondition.companyMasterId = companyMasterID;
    }

    const attendanceCorrectionAuthorization =
      await AttendanceCorrectionAuthorization.findAndCountAll({
        distinct: true,
        where: condition,
        ...paginateCondition,
        order: [['createdAt', 'DESC']],
        include: [
          {
            required: true,
            model: AttendanceCorrectionRequest,
            include: [
              {
                separate: true,
                model: AttendanceCorrectionLogs,
                attributes: ['logDateTime', 'attendanceStatus', 'direction'],
                include: [
                  {
                    model: Shift,
                    attributes: ['shiftName'],
                  },
                ],
              },
              {
                separate: true,
                model: AttendanceCorrectionAuthorization,
                attributes: ['authStatus', 'userMasterID'],
                include: [
                  {
                    model: UserMaster,
                    as: 'authorizedPerson',
                    attributes: ['displayName'],
                  },
                ],
              },
              {
                model: UserMaster,
                as: 'employee',
                where: userCondition,
                attributes: [
                  'userMasterID',
                  'displayName',
                  'userNumber',
                  'photo',
                  'companyMasterId',
                ],
                include: [
                  {
                    model: companyMaster,
                    attributes: ['companyName'],
                  },
                  {
                    separate: true,
                    required: false,
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
                    model: AuthorizationDetails,
                    where: {
                      status: 1,
                      AuthorizationMasterID:
                        authorizationMasterTypes.attendanceCorrection,
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
                    separate: true,
                    required: false,
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
                    separate: true,
                    required: false,
                    model: EmployeeJoiningDetails,
                    attributes: ['employeeCode'],
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
            ],
          },
        ],
      });

    if (isExport) {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(
        'AttendanceCorrectionAuthorizationRequests',
      );

      const columns = [
        { header: 'Company Name', key: 'companyName', width: 18 },
        { header: 'Employee Code', key: 'employeeCode', width: 18 }, // 1
        { header: 'Employee Name', key: 'employeeName', width: 25 }, // 2
        { header: 'Branch', key: 'branchName', width: 20 }, // 3
        { header: 'Department', key: 'departmentName', width: 22 }, // 4
        { header: 'Designation', key: 'designationName', width: 22 }, // 5
        { header: 'Division', key: 'divisionName', width: 20 }, // 6
        { header: 'Working Area', key: 'workingAreaName', width: 20 }, // 7
        { header: 'Attendance Date', key: 'attDate', width: 15 }, // 8
        { header: 'Attendance In Time', key: 'inDateTime', width: 22 }, // 9
        { header: 'Attendance Out Time', key: 'outDateTime', width: 22 }, // 10
        { header: 'Shift', key: 'shiftName', width: 20 }, // 11
        { header: 'Shift In-Time', key: 'shiftInTime', width: 15 }, // 12
        { header: 'Shift Out-Time', key: 'shiftOutTime', width: 15 }, // 13
        { header: 'Shift Hours', key: 'shiftHours', width: 12 }, // 14
        { header: 'Working Minutes', key: 'workMinutes', width: 12 }, // 15
        { header: 'Attendance Status', key: 'attStatus', width: 12 }, // 16
        {
          header: 'Attendance Correction Logs',
          key: 'attCorrectionInOutTime',
          width: 12,
        }, // 17
        // {
        //   header: 'Attendance Correction Out Time',
        //   key: 'attCorrectionOutTime',
        //   width: 12,
        // }, // 18
        { header: 'Status', key: 'authStatus', width: 15 }, // 19
        { header: 'Remarks', key: 'remarks', width: 25 }, // 20
        { header: 'Auth Criteria', key: 'authCriteria', width: 25 }, // 21
        { header: 'Authorizer', key: 'authorizer', width: 25 }, // 22 ← per-row
        { header: 'Authorizer Status', key: 'authorizerStatus', width: 18 }, // 23 ← per-row
        { header: 'Applied On', key: 'createdAt', width: 18 }, // 24
      ];

      worksheet.columns = columns;

      // ── Style header row ─────────────────────────────────────────────────
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' },
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true,
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
      headerRow.height = 30;

      // ── Data rows ────────────────────────────────────────────────────────
      let currentRowIndex = 2;

      for (const request of attendanceCorrectionAuthorization?.rows) {
        const attendanceCorrectionRequest =
          request.attendanceCorrectionRequest || {};
        const userData = attendanceCorrectionRequest.employee || {};
        const attendance = attendanceCorrectionRequest.attData || {};

        // ── Employee identifiers ─────────────────────────────────────────

        const companyName = userData?.companyMaster?.companyName;

        const empCode =
          (userData.employeeJoiningDetails || [])[0]?.employeeCode || '';

        const designationName =
          (userData.employeeDesignations || [])[0]?.designation
            ?.designationName || '';

        const departmentName =
          (userData.employeeDepartments || [])[0]?.department?.departmentName ||
          '';

        const branchName =
          (userData.employeeBranches || [])[0]?.branchMaster?.branchName || '';

        const divisionName =
          (userData.employeeDivisions || [])[0]?.division?.divisionName || '';

        const workingAreaName =
          (userData.employeeWorkingAreas || [])[0]?.workingArea
            ?.workingAreaName || '';

        // ── Attendance transaction fields ────────────────────────────────
        const attDate = attendance.AttendanceDate
          ? attendance?.AttendanceDate
          : '';

        const remarks = attendanceCorrectionRequest?.remark || '';

        const inDateTime = attendance.InDatetime ? attendance.InDatetime : '';

        const outDateTime = attendance.OutDateTime
          ? attendance.OutDateTime
          : '';

        const shiftName = attendance?.ShiftName || '';
        const shiftInTime = attendance.ShiftIntime || '';
        const shiftOutTime = attendance.ShiftoutTime || '';
        const shiftHours = attendance.Shifthrs || '';

        const workMinutes = attendance?.roundOffMinutes || '';

        const attStatus = attendance?.fulldayhalfday;

        // const attCorrectionInTime = attendance?.attendaceLogs?.find(
        //   (log) => log.direction?.toLowerCase() === 'in',
        // )?.logDateTime;

        // const attCorrectionOutTime = attendance?.attendaceLogs?.find(
        //   (log) => log.direction?.toLowerCase() === 'out',
        // )?.logDateTime;

        const attCorrectionInOutTime =
          attendanceCorrectionRequest?.attendanceCorrectionLogs
            ?.map((log) => {
              if (log.attendanceStatus) {
                const statusMap = {
                  P: 'Present',
                  A: 'Absent',
                  H: 'Half Day',
                };

                return `${statusMap[log.attendanceStatus] || log.attendanceStatus}${
                  log.shift?.shiftName ? ` (${log.shift.shiftName})` : ''
                }`;
              }

              const label =
                log.direction === 'IN'
                  ? 'IN'
                  : log.direction === 'OUT'
                    ? 'OUT'
                    : 'Time';

              return `${label}:- ${moment(log.logDateTime).format(
                'DD-MM-YYYY hh:mm A',
              )}`;
            })
            .join('\n');
        // ── Auth status ──────────────────────────────────────────────────
        const authStatus =
          attendanceCorrectionRequest.authorizationStatus == 4
            ? 'Rejected'
            : attendanceCorrectionRequest.authorizationStatus == 3
              ? 'Approved'
              : 'Pending';

        // ── Auth criteria ────────────────────────────────────────────────
        // Sourced from nested AuthorizationDetails → AuthorizationCriteriaMaster
        const authCriteria =
          (userData.authorizationDetails || [])[0]?.AuthorizationCriteriaMaster
            ?.AuthorizationCriteria || '';

        const authorizers = (
          attendanceCorrectionRequest.attendanceCorrectionAuthorizations || []
        ).map((auth) => ({
          name: auth.authorizedPerson?.displayName || '',
          status:
            auth.authStatus == 0
              ? 'Rejected'
              : auth.authStatus == 1
                ? 'Approved'
                : auth.authStatus == 2
                  ? 'Pending'
                  : '',
        }));

        const rowCount = Math.max(authorizers.length, 1);

        // ── Common fields (shared across all merged rows) ────────────────
        const commonFields = {
          companyName,
          employeeCode: empCode,
          employeeName: userData.displayName || '',
          branchName,
          departmentName,
          designationName,
          divisionName,
          workingAreaName,
          inDateTime,
          outDateTime,
          shiftName,
          shiftInTime,
          shiftOutTime,
          shiftHours,
          authStatus,
          attStatus,
          remarks,
          workMinutes,
          attCorrectionInOutTime,
          // attCorrectionOutTime,
          attDate,
          authCriteria,
          createdAt: request.createdAt
            ? moment(request.createdAt).format('DD-MM-YYYY hh:mm')
            : '',
        };

        // ── Write one row per authorizer ─────────────────────────────────
        for (let i = 0; i < rowCount; i++) {
          const auth = authorizers[i] || { name: '', status: '' };
          const excelRow = worksheet.addRow({
            ...commonFields,
            authorizer: auth.name,
            authorizerStatus: auth.status,
          });
          excelRow.height = 20;
          excelRow.eachCell({ includeEmpty: true }, (cell) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
            };
            cell.alignment = { vertical: 'middle', wrapText: true };
          });
        }

        // ── Merge common columns across authorizer rows ──────────────────
        if (rowCount > 1) {
          const mergeStart = currentRowIndex;
          const mergeEnd = currentRowIndex + rowCount - 1;

          // All cols except 22 (authorizer) and 23 (authorizerStatus)
          const columnsToMerge = [
            1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
            20, 21, 24,
          ];

          for (const colNum of columnsToMerge) {
            worksheet.mergeCells(mergeStart, colNum, mergeEnd, colNum);
            const mergedCell = worksheet.getCell(mergeStart, colNum);
            mergedCell.alignment = {
              vertical: 'middle',
              horizontal: 'left',
              wrapText: true,
            };
          }
        }

        currentRowIndex += rowCount;
      }

      // ── Stream response ──────────────────────────────────────────────────
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="AttendanceCorrectionAuthorizationRequests.xlsx"',
      );

      await workbook.xlsx.write(res);
      return res.end();
    }

    return res.status(200).json({
      status: 200,
      data: attendanceCorrectionAuthorization.rows,
      totalcount: attendanceCorrectionAuthorization.count,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAuthorizationRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage(
          'Attendance Correction Request',
        ),
      });
    }

    const authorizationRequest = await AttendanceCorrectionRequest.findOne({
      where: { attendanceCorrectionRequestId: id },
      include: [
        {
          model: UserMaster,
          as: 'employee',
          attributes: ['userMasterID', 'displayName'],
          include: [
            {
              required: false,
              model: AuthorizationDetails,
              as: 'authorizationDetails',
              where: {
                status: 1,
                AuthorizationMasterID:
                  authorizationMasterTypes.attendanceCorrection,
              },
              attributes: ['AuthorizationCriteriaID'],
              include: [
                {
                  model: AuthorizationCriteria,
                  as: 'AuthorizationCriteriaMaster',
                  attributes: ['AuthorizationCriteria'],
                },
              ],
            },
          ],
        },
      ],
    });

    if (!authorizationRequest) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage(
          'Attendance Correction Request',
        ),
      });
    }

    const { AttendanceDate, authorizationStatus, userMasterID, employee } =
      authorizationRequest;

    const { displayName, authorizationDetails } = employee;
    const authCriteriaID =
      authorizationDetails && authorizationDetails.length > 0
        ? authorizationDetails[0].AuthorizationCriteriaID
        : null;

    const authCriteria = await AuthorizationCriteria.findOne({
      where: { AuthorizationCriteriaID: authCriteriaID },
      attributes: ['AuthorizationCriteria'],
    });

    const authUserStatuses = await AttendanceCorrectionAuthorization.findAll({
      where: { attendanceCorrectionRequestId: id },
    });

    const userMasterIDs = authUserStatuses.map((item) => item.userMasterID);

    const users = await UserMaster.findAll({
      where: { userMasterID: userMasterIDs },
      attributes: ['userMasterID', 'displayName'],
    });

    const userMap = new Map(
      users.map((user) => [user.userMasterID.toString(), user.displayName]),
    );

    const authUserStatusData = authUserStatuses.map((status) => ({
      userMasterID: status.userMasterID,
      displayName: userMap.get(status.userMasterID.toString()),
      authstatus: status.authStatus,
      remarks: status.remarks,
      updatedAt: status.updatedAt,
    }));

    const responseData = {
      userMasterID,
      AttendanceDate,
      authorizationStatus,
      displayName,
      AuthorizationCriteria: authCriteria
        ? authCriteria.AuthorizationCriteria
        : '',
      authUserStatus:
        authUserStatusData && authUserStatusData.length > 0
          ? authUserStatusData
          : [],
    };

    return res.status(200).json({ status: 200, data: responseData });
  } catch (error) {
    next(error);
  }
};

exports.getAuthorizationRequestByIdV2 = async (req, res, next) => {
  try {
    let { id, userMasterId } = req.body;
    if (req.userDetails.isMyUserDetails) {
      userMasterId = req.userDetails.userMasterId;
    }

    if (!id) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage(
          'Attendance Correction Request',
        ),
      });
    }

    const authorizationRequest = await AttendanceCorrectionRequest.findOne({
      where: { attendanceCorrectionRequestId: id, userMasterID: userMasterId },
      include: [
        {
          model: UserMaster,
          as: 'employee',
          attributes: ['userMasterID', 'displayName'],
          include: [
            {
              required: false,
              model: AuthorizationDetails,
              as: 'authorizationDetails',
              where: {
                status: 1,
                AuthorizationMasterID:
                  authorizationMasterTypes.attendanceCorrection,
              },
              attributes: ['AuthorizationCriteriaID'],
              include: [
                {
                  model: AuthorizationCriteria,
                  as: 'AuthorizationCriteriaMaster',
                  attributes: ['AuthorizationCriteria'],
                },
              ],
            },
          ],
        },
      ],
    });

    if (!authorizationRequest) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage(
          'Attendance Correction Request',
        ),
      });
    }

    const { AttendanceDate, authorizationStatus, userMasterID, employee } =
      authorizationRequest;

    const { displayName, authorizationDetails } = employee;
    const authCriteriaID =
      authorizationDetails && authorizationDetails.length > 0
        ? authorizationDetails[0].AuthorizationCriteriaID
        : null;

    const authCriteria = await AuthorizationCriteria.findOne({
      where: { AuthorizationCriteriaID: authCriteriaID },
      attributes: ['AuthorizationCriteria'],
    });

    const authUserStatuses = await AttendanceCorrectionAuthorization.findAll({
      where: { attendanceCorrectionRequestId: id },
    });

    const userMasterIDs = authUserStatuses.map((item) => item.userMasterID);

    const users = await UserMaster.findAll({
      where: { userMasterID: userMasterIDs },
      attributes: ['userMasterID', 'displayName'],
    });

    const userMap = new Map(
      users.map((user) => [user.userMasterID.toString(), user.displayName]),
    );

    const authUserStatusData = authUserStatuses.map((status) => ({
      userMasterID: status.userMasterID,
      displayName: userMap.get(status.userMasterID.toString()),
      authstatus: status.authStatus,
      remarks: status.remarks,
      updatedAt: status.updatedAt,
    }));

    const responseData = {
      userMasterID,
      AttendanceDate,
      authorizationStatus,
      displayName,
      AuthorizationCriteria: authCriteria
        ? authCriteria.AuthorizationCriteria
        : '',
      authUserStatus:
        authUserStatusData && authUserStatusData.length > 0
          ? authUserStatusData
          : [],
    };

    return res.status(200).json({ status: 200, data: responseData });
  } catch (error) {
    next(error);
  }
};

exports.getAllAttendanceAuthorizationRequestAdmin = async (req, res, next) => {
  try {
    const {
      authorizationstatus,
      companyMasterID,
      limit,
      page,
      userMasterID,
      startdate,
    } = req.body;

    let { enddate } = req.body;
    if (!companyMasterID) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Company'),
      });
    }

    const allowedKeys = [
      'companyMasterID',
      'userMasterID',
      'startdate',
      'enddate',
      'page',
      'limit',
      'authorizationstatus',
    ];

    const invalidKeys = invalidKeyParams(
      { ...req.body, ...req.params },
      allowedKeys,
    );

    if (invalidKeys.length > 0) {
      return res.status(200).json({
        status: 400,
        message: `Invalid body parameter(s): ${invalidKeys.join(', ')}`,
      });
    }

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const condition = {
      status: 1,
    };

    if (authorizationstatus) {
      if (authorizationstatus == 1) {
        condition.authorizationStatus = [0, 1, 2];
      } else {
        condition.authorizationStatus = authorizationstatus;
      }
    } else {
      condition.authorizationStatus = [0, 1, 2];
    }

    if (startdate) {
      if (enddate == '' || enddate == undefined || enddate == null) {
        enddate = asiaKolkataDateTime(new Date()).slice(0, 10);
      }
      condition.AttendanceDate = {
        [Sequelize.Op.between]: [startdate, enddate],
      };
    }

    if (userMasterID.length > 0) {
      condition.userMasterID = userMasterID;
    }

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: false,
    });

    const getAllAttendanceCorrectionRequests =
      await AttendanceCorrectionRequest.findAndCountAll({
        distinct: true,
        where: condition,
        ...paginationQuery,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: UserMaster,
            as: 'employee',
            attributes: ['userMasterID', 'displayName', 'userNumber', 'photo'],
            where: {
              ...where,
              companyMasterId: companyMasterID,
              status: 1,
            },
            include: [
              ...includeModels,
              {
                required: false,
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
                model: EmployeeJoiningDetails,
                attributes: ['employeeCode'],
              },

              {
                required: false,

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
        ],
      });

    return res.status(200).json({
      status: 200,
      data: getAllAttendanceCorrectionRequests.rows,
      totalcount: getAllAttendanceCorrectionRequests.count,
    });
  } catch (error) {
    next(error);
  }
};

function invalidKeyParams(query, allowedKeys) {
  return Object.keys(query).filter((key) => !allowedKeys.includes(key));
}

// exports.approveRejectAdminAttendanceAuthorization = async (req, res, next) => {
//   const transaction = await sequelize.transaction();
//   try {
//     const { attendanceCorrectionRequestId, authstatus, rejectionRemarks } =
//       await req.body;
//     if (!attendanceCorrectionRequestId) {
//       await transaction.rollback();
//       return res.status(200).json({
//         status: 401,
//         message: message.usermessage.notFoundMessage(
//           'Attendance Authorization Request ',
//         ),
//       });
//     }

//     const allowedKeys = [
//       'attendanceCorrectionRequestId',
//       'authstatus',
//       'rejectionRemarks',
//     ];

//     const invalidKeys = invalidKeyParams(
//       { ...req.body, ...req.params },
//       allowedKeys,
//     );

//     if (invalidKeys.length > 0) {
//       await transaction.rollback();
//       return res.status(200).json({
//         status: 400,
//         message: `Invalid body parameter(s): ${invalidKeys.join(', ')}`,
//       });
//     }
//     const userAccessCondition = accessibleRoleWiseUsers({
//       userDetails: req.userDetails,
//     });
//     const getLeaveRequest = await AttendanceCorrectionRequest.findOne({
//       where: {
//         attendanceCorrectionRequestId,
//       },
//       attributes: [
//         'authorizationStatus',
//         'AttendanceDate',
//         'userMasterID',
//         'attendanceCorrectionRequestId',
//         'correctionStatus',
//       ],
//       include: [
//         {
//           model: UserMaster,
//           as: 'employee',
//           where: { ...userAccessCondition.where },
//           include: [...userAccessCondition.includeModels],
//         },
//       ],
//     });
//     if (!getLeaveRequest) {
//       await transaction.rollback();
//       return res.status(200).json({
//         status: 401,
//         message: message.usermessage.notFoundMessage(
//           'Attendance Correction Request',
//         ),
//       });
//     }

//     if (
//       getLeaveRequest.authorizationStatus == 3 ||
//       getLeaveRequest.authorizationStatus == 4
//     ) {
//       await transaction.rollback();
//       return res.status(200).json({
//         status: 401,
//         message:
//           getLeaveRequest.authorizationStatus == 3
//             ? 'Attendance Correction Request Already Approved'
//             : 'Attendance Correction Request Already Rejected',
//       });
//     }
//     const date = getLeaveRequest?.AttendanceDate;

//     const userinfo = await UserMaster.findOne({
//       where: {
//         userMasterID: getLeaveRequest?.userMasterID,
//       },
//       include: [
//         {
//           required: false,
//           model: EmployeeBranch,
//           where: {
//             status: 1,
//             applicableDate: {
//               [Sequelize.Op.lte]: new Date(date),
//             },
//             [Sequelize.Op.or]: [
//               {
//                 endDate: {
//                   [Sequelize.Op.gte]: new Date(date),
//                 },
//               },
//               {
//                 endDate: { [Sequelize.Op.eq]: null },
//               },
//             ],
//           },
//           attributes: ['branchID'],
//         },
//         {
//           required: false,
//           model: EmployeeDesignation,
//           where: {
//             status: 1,
//             applicableDate: {
//               [Sequelize.Op.lte]: new Date(date),
//             },
//             [Sequelize.Op.or]: [
//               {
//                 endDate: {
//                   [Sequelize.Op.gte]: new Date(date),
//                 },
//               },
//               { endDate: { [Sequelize.Op.eq]: null } },
//             ],
//           },
//           attributes: ['designationID'],
//         },
//         {
//           model: EmployeeDepartment,
//           where: {
//             status: 1,
//             applicableDate: {
//               [Sequelize.Op.lte]: new Date(date),
//             },
//             [Sequelize.Op.or]: [
//               {
//                 endDate: {
//                   [Sequelize.Op.gte]: new Date(date),
//                 },
//               },
//               { endDate: { [Sequelize.Op.eq]: null } },
//             ],
//           },
//           required: false,
//           attributes: ['departmentID'],
//         },
//         {
//           model: EmployeeJoiningDetails,
//           attributes: ['payrollFrequency'],
//         },
//       ],
//     });

//     if (!userinfo) {
//       await transaction.rollback();
//       return res.status(200).json({
//         status: 401,
//         message: message.usermessage.notFoundMessage('User'),
//       });
//     }
//     const createBy = req.userDetails.userMasterId;
//     const createByIp = req.userDetails.userIpAddress;
//     if (authstatus == 1) {
//       const userId = getLeaveRequest?.userMasterID;
//       const AttendanceDate = getLeaveRequest?.AttendanceDate;
//       const payrollFrequency =
//         userinfo.employeeJoiningDetails?.[0]?.payrollFrequency ||
//         PayrollFrequencyType.MONTHLY;

//       const attendance_verified = await HrLeaveMonthlyTrans.count({
//         where: {
//           userMasterID: userId,
//           monthstartdate: {
//             [Sequelize.Op.lte]: AttendanceDate,
//           },
//           monthenddate: {
//             [Sequelize.Op.gte]: AttendanceDate,
//           },
//           payrollFrequency,
//           verified: 1,
//         },
//       });
//       if (attendance_verified > 0) {
//         await transaction.rollback();
//         return res.status(200).json({
//           status: 401,
//           message:
//             'Attendance already verified. So can not approve Attendance correction request.',
//         });
//       }
//     }
//     const allAuthData = await AttendanceCorrectionAuthorization.findAll({
//       where: {
//         attendanceCorrectionRequestId:
//           getLeaveRequest.attendanceCorrectionRequestId,
//       },
//     });
//     const allAuthIds = allAuthData.map((e) => e.id);

//     await UserInbox.destroy(
//       {
//         where: {
//           activityTable: AttendanceCorrectionAuthorization.getTableName(),
//           activityTablePK: allAuthIds,
//         },
//       },
//       { transaction },
//     );
//     await AttendanceCorrectionRequest.update(
//       {
//         authorizationStatus: authstatus == 0 ? 4 : 3,
//         remark: rejectionRemarks,
//         authorizedBy: createBy,
//         authorizedAt: new Date(),
//         isAuthorizedBy: true,
//       },
//       {
//         where: {
//           attendanceCorrectionRequestId:
//             getLeaveRequest.attendanceCorrectionRequestId,
//         },
//         transaction,
//       },
//     );

//      const attnCorrPermission = getLeaveRequest.attnCorrPermission || AttendanceCorrectionPermissionEnum.IN_TIME_OUT_TIME_DESCRIPTION;

//     if (authstatus == 1 && attnCorrPermission != AttendanceCorrectionPermissionEnum.DESCRIPTION_ONLY) {
//       const attendanceCorrectionLogs = await AttendanceCorrectionLogs.findAll({
//         where: {
//           attendanceCorrectionRequestId:
//             getLeaveRequest.attendanceCorrectionRequestId,
//         },
//       });
//       if (attendanceCorrectionLogs.length === 0) {
//         await transaction.rollback();
//         return res.status(200).json({
//           status: 400,
//           message: message.usermessage.notFoundMessage('Attendance Logs'),
//         });
//       }

//       const correctionStatus = getLeaveRequest.correctionStatus;

//       const attendanceType = attendanceCorrectionLogs[0].attendanceStatus
//         ? correctionStatus == correctionStatusEnum.STATUS_CHANGE
//           ? '1'
//           : correctionStatus
//         : '3';
//       const companyMasterID = userinfo?.companyMasterId;
//       const branchMasterID =
//         userinfo?.employeeBranches && userinfo?.employeeBranches?.length > 0
//           ? userinfo?.employeeBranches?.[0]?.branchID
//           : null;
//       const departmentID =
//         userinfo?.employeeDepartments &&
//         userinfo?.employeeDepartments?.length > 0
//           ? userinfo?.employeeDepartments[0]?.departmentID
//           : null;
//       const designationID =
//         userinfo?.employeeDesignations &&
//         userinfo?.employeeDesignations?.length > 0
//           ? userinfo?.employeeDesignations?.[0]?.designationID
//           : null;
//       const attendance = await attendanceTransaction.findOne({
//         where: {
//           userMasterID: userinfo?.userMasterID,
//           AttendanceDate: getLeaveRequest?.AttendanceDate,
//         },
//         include: [
//           {
//             required: false,
//             model: AttendanceLogs,
//             order: [['logDateTime', 'ASC']],
//           },
//         ],
//       });
//       const finaldataarray = [];

//       const obj = {
//         IN_Change: true,
//         Name: userinfo?.displayName,
//         OUT_Change: true,
//         Shift: null,
//         Userid: userinfo?.userMasterID,
//         attendanceTransid: attendance ? attendance?.AttendanceTransID : null,
//         attendanceType: 0,
//         attendance_date: getLeaveRequest?.AttendanceDate,
//         branchMasterID: branchMasterID,
//         departmentId: departmentID,
//         designationId: designationID,
//         attendanceLogs: [],
//         attendanceLogData: [],
//       };
//       function sortLogsByDateTime(logData) {
//         const data = logData.sort((a, b) => {
//           const dateA = new Date(a.logDateTime).getTime();
//           const dateB = new Date(b.logDateTime).getTime();
//           return dateA - dateB; // Ascending order
//         });

//         return data;
//       }

//       if (attendanceType == 3) {
//         const attendanceLogs =
//           attendance && attendance?.attendancelogs
//             ? sortLogsByDateTime(attendance?.attendancelogs)
//             : [];
//         obj.attendanceLogs = attendanceLogs;

//         const formatedAttendanceLogs = attendanceCorrectionLogs.map((e) => {
//           return {
//             logId: e?.logId,
//             logDateTime: formatLogDateTime(e.logDateTime),
//             direction: String(e.direction).toLocaleLowerCase(),
//             isEdited: e?.isChangeLog,
//             isdeleted: false,
//           };
//         });

//         obj.attendanceLogData = formatedAttendanceLogs || [];
//       }

//       if (attendanceType == 1 || attendanceType == 4)
//         ((obj.Shift = attendanceCorrectionLogs?.[0]?.shiftID),
//           (obj.attendanceType =
//             attendanceCorrectionLogs?.[0]?.attendanceStatus == 'P'
//               ? 1
//               : attendanceCorrectionLogs?.[0]?.attendanceStatus == 'HD'
//                 ? 0.5
//                 : 0));

//       finaldataarray.push(obj);

//       const responseMessage = await manualAttendnace_Latest(
//         req,
//         attendanceType,
//         finaldataarray,
//         companyMasterID,
//         createBy,
//         createByIp,
//         transaction,
//       );
//       if (responseMessage && responseMessage?.status != statusCodes.OK) {
//         await transaction.rollback();
//         return res.status(statusCodes.BAD_REQUEST).json({
//           status: statusCodes.BAD_REQUEST,
//           message: responseMessage.message,
//         });
//       }
//     }

//     await transaction.commit();
//     return res.status(200).json({
//       status: 200,
//       message:
//         authstatus == 1
//           ? 'Attendance Correction Request Approved Successfully'
//           : 'Attendance Correction Request Rejected Successfully',
//     });
//   } catch (error) {
//     await transaction.rollback();
//     next(error);
//   }
// };

exports.approveRejectAdminAttendanceAuthorization = async (req, res, next) => {
  try {
    const { attendanceCorrectionRequestId, authstatus, rejectionRemarks } =
      req.body;
    let authorizedCount = 0;
    if (!attendanceCorrectionRequestId) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage(
          'Attendance Authorization Request ',
        ),
      });
    }

    const allowedKeys = [
      'attendanceCorrectionRequestId',
      'authstatus',
      'rejectionRemarks',
    ];
    const invalidKeys = invalidKeyParams(
      { ...req.body, ...req.params },
      allowedKeys,
    );
    if (invalidKeys.length > 0) {
      return res.status(200).json({
        status: 400,
        message: `Invalid body parameter(s): ${invalidKeys.join(', ')}`,
      });
    }

    const attCorrectionAuthorizationIDList = Array.isArray(
      attendanceCorrectionRequestId,
    )
      ? attendanceCorrectionRequestId
      : [attendanceCorrectionRequestId];

    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });

    const getAttCorrectionRequests = await AttendanceCorrectionRequest.findAll({
      where: {
        attendanceCorrectionRequestId: attCorrectionAuthorizationIDList,
      },
      attributes: [
        'authorizationStatus',
        'AttendanceDate',
        'userMasterID',
        'attendanceCorrectionRequestId',
        'correctionStatus',
        'attnCorrPermission',
      ],
      include: [
        {
          model: UserMaster,
          as: 'employee',
          where: { ...userAccessCondition.where },
          include: [...userAccessCondition.includeModels],
        },
      ],
    });

    if (!getAttCorrectionRequests.length) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage(
          'Attendance Correction Request',
        ),
      });
    }

    // ---------------- BULK PRE-FETCH (read-only, no transaction needed) ----------------

    const userMasterIDs = [
      ...new Set(getAttCorrectionRequests.map((r) => r.userMasterID)),
    ];
    const attCorrReqIds = getAttCorrectionRequests.map(
      (r) => r.attendanceCorrectionRequestId,
    );
    const attendanceDates = [
      ...new Set(getAttCorrectionRequests.map((r) => String(r.AttendanceDate))),
    ];

    const userInfoList = await UserMaster.findAll({
      where: { userMasterID: userMasterIDs },
      include: [
        {
          required: false,
          model: EmployeeBranch,
          where: { status: 1 },
          attributes: ['branchID', 'applicableDate', 'endDate'],
        },
        {
          required: false,
          model: EmployeeDesignation,
          where: { status: 1 },
          attributes: ['designationID', 'applicableDate', 'endDate'],
        },
        {
          model: EmployeeDepartment,
          where: { status: 1 },
          required: false,
          attributes: ['departmentID', 'applicableDate', 'endDate'],
        },
        { model: EmployeeJoiningDetails, attributes: ['payrollFrequency'] },
      ],
    });
    const userInfoMap = new Map(userInfoList.map((u) => [u.userMasterID, u]));

    const pickApplicable = (records, date) => {
      if (!records || !records.length) return null;
      const d = new Date(date);
      return (
        records.find(
          (r) =>
            new Date(r.applicableDate) <= d &&
            (r.endDate == null || new Date(r.endDate) >= d),
        ) || null
      );
    };

    const allAuthDataAll = await AttendanceCorrectionAuthorization.findAll({
      where: { attendanceCorrectionRequestId: attCorrReqIds },
    });
    const authByReqId = new Map();
    for (const auth of allAuthDataAll) {
      const list = authByReqId.get(auth.attendanceCorrectionRequestId) || [];
      list.push(auth);
      authByReqId.set(auth.attendanceCorrectionRequestId, list);
    }

    const allCorrectionLogs = await AttendanceCorrectionLogs.findAll({
      where: { attendanceCorrectionRequestId: attCorrReqIds },
    });
    const correctionLogsByReqId = new Map();
    for (const log of allCorrectionLogs) {
      const list =
        correctionLogsByReqId.get(log.attendanceCorrectionRequestId) || [];
      list.push(log);
      correctionLogsByReqId.set(log.attendanceCorrectionRequestId, list);
    }

    const allAttendanceTx = await attendanceTransaction.findAll({
      where: { userMasterID: userMasterIDs, AttendanceDate: attendanceDates },
      include: [
        {
          required: false,
          model: AttendanceLogs,
          order: [['logDateTime', 'ASC']],
        },
      ],
    });
    const attendanceTxMap = new Map(
      allAttendanceTx.map((tx) => [
        `${tx.userMasterID}_${tx.AttendanceDate}`,
        tx,
      ]),
    );

    const verifiedTrans =
      authstatus == 1
        ? await HrLeaveMonthlyTrans.findAll({
            where: { userMasterID: userMasterIDs, verified: 1 },
            attributes: [
              'userMasterID',
              'monthstartdate',
              'monthenddate',
              'payrollFrequency',
            ],
          })
        : [];
    const isAttendanceVerified = (userId, attendanceDate, payrollFrequency) =>
      verifiedTrans.some(
        (v) =>
          v.userMasterID == userId &&
          v.payrollFrequency == payrollFrequency &&
          new Date(v.monthstartdate) <= new Date(attendanceDate) &&
          new Date(v.monthenddate) >= new Date(attendanceDate),
      );

    const sortLogsByDateTime = (logData) =>
      logData.sort(
        (a, b) =>
          new Date(a.logDateTime).getTime() - new Date(b.logDateTime).getTime(),
      );

    // ---------------- MAIN LOOP — one transaction per request ----------------

    const skippedMap = new Map();

    const addSkipped = (name, reason) => {
      const key = `${name}__${reason}`;

      if (skippedMap.has(key)) {
        skippedMap.get(key).count++;
      } else {
        skippedMap.set(key, {
          name,
          reason,
          count: 1,
        });
      }
    };

    for (const getAttCorrectionRequest of getAttCorrectionRequests) {
      const { attendanceCorrectionRequestId: reqId, userMasterID } =
        getAttCorrectionRequest;
      const userinfo = userInfoMap.get(userMasterID);
      const employeeName =
        userinfo?.displayName || `Unknown (ID: ${userMasterID})`;

      if (
        getAttCorrectionRequest.authorizationStatus == 3 ||
        getAttCorrectionRequest.authorizationStatus == 4
      ) {
        addSkipped(
          employeeName,
          getAttCorrectionRequest.authorizationStatus == 3
            ? 'Attendance Correction Request Already Approved'
            : 'Attendance Correction Request Already Rejected',
        );
        continue;
      }
      if (!userinfo) {
        addSkipped(employeeName, 'User not found');
        continue;
      }

      const date = getAttCorrectionRequest?.AttendanceDate;

      if (authstatus == 1) {
        const payrollFrequency =
          userinfo.employeeJoiningDetails?.[0]?.payrollFrequency ||
          PayrollFrequencyType.MONTHLY;
        if (isAttendanceVerified(userMasterID, date, payrollFrequency)) {
          addSkipped(
            employeeName,
            'Attendance already verified. So can not approve Attendance correction request.',
          );
          continue;
        }
      }

      const transaction = await sequelize.transaction();
      try {
        const createBy = req.userDetails.userMasterId;
        const createByIp = req.userDetails.userIpAddress;

        const allAuthIds = (authByReqId.get(reqId) || []).map((e) => e.id);

        await UserInbox.destroy(
          {
            where: {
              activityTable: AttendanceCorrectionAuthorization.getTableName(),
              activityTablePK: allAuthIds,
            },
          },
          { transaction },
        );

        await AttendanceCorrectionRequest.update(
          {
            authorizationStatus: authstatus == 0 ? 4 : 3,
            remark: rejectionRemarks,
            authorizedBy: createBy,
            authorizedAt: new Date(),
            isAuthorizedBy: true,
          },
          { where: { attendanceCorrectionRequestId: reqId }, transaction },
        );

        const attnCorrPermission =
          getAttCorrectionRequest.attnCorrPermission ||
          AttendanceCorrectionPermissionEnum.IN_TIME_OUT_TIME_DESCRIPTION;

        if (
          authstatus == 1 &&
          attnCorrPermission !=
            AttendanceCorrectionPermissionEnum.DESCRIPTION_ONLY
        ) {
          const attendanceCorrectionLogs =
            correctionLogsByReqId.get(reqId) || [];
          if (attendanceCorrectionLogs.length === 0) {
            throw new Error('Attendance Logs not found');
          }

          const correctionStatus = getAttCorrectionRequest.correctionStatus;
          const attendanceType = attendanceCorrectionLogs[0].attendanceStatus
            ? correctionStatus == correctionStatusEnum.STATUS_CHANGE
              ? '1'
              : correctionStatus
            : '3';

          const companyMasterID = userinfo?.companyMasterId;
          const branchMasterID =
            pickApplicable(userinfo?.employeeBranches, date)?.branchID || null;
          const departmentID =
            pickApplicable(userinfo?.employeeDepartments, date)?.departmentID ||
            null;
          const designationID =
            pickApplicable(userinfo?.employeeDesignations, date)
              ?.designationID || null;

          const attendance = attendanceTxMap.get(
            `${userinfo?.userMasterID}_${getAttCorrectionRequest?.AttendanceDate}`,
          );

          const obj = {
            IN_Change: true,
            Name: userinfo?.displayName,
            OUT_Change: true,
            Shift: null,
            Userid: userinfo?.userMasterID,
            attendanceTransid: attendance
              ? attendance?.AttendanceTransID
              : null,
            attendanceType: 0,
            attendance_date: getAttCorrectionRequest?.AttendanceDate,
            branchMasterID,
            departmentId: departmentID,
            designationId: designationID,
            attendanceLogs: [],
            attendanceLogData: [],
          };

          if (attendanceType == 3) {
            obj.attendanceLogs =
              attendance && attendance?.attendancelogs
                ? sortLogsByDateTime(attendance?.attendancelogs)
                : [];

            obj.attendanceLogData = attendanceCorrectionLogs.map((e) => ({
              logId: e?.logId,
              logDateTime: formatLogDateTime(e.logDateTime),
              direction: String(e.direction).toLocaleLowerCase(),
              isEdited: e?.isChangeLog,
              isdeleted: false,
            }));
          }

          if (attendanceType == 1 || attendanceType == 4) {
            obj.Shift = attendanceCorrectionLogs?.[0]?.shiftID;
            obj.attendanceType =
              attendanceCorrectionLogs?.[0]?.attendanceStatus == 'P'
                ? 1
                : attendanceCorrectionLogs?.[0]?.attendanceStatus == 'HD'
                  ? 0.5
                  : 0;
          }

          const finaldataarray = [obj];

          const responseMessage = await manualAttendnace_Latest(
            req,
            attendanceType,
            finaldataarray,
            companyMasterID,
            createBy,
            createByIp,
            transaction,
          );

          if (responseMessage && responseMessage?.status != statusCodes.OK) {
            // Use the exact message manualAttendnace_Latest returned (e.g. "No shift assigned")
            throw new Error(
              responseMessage.message || 'Failed to process manual attendance',
            );
          }
        }
        authorizedCount++;
        await transaction.commit();
      } catch (err) {
        await transaction.rollback();
        addSkipped(employeeName, err.message);
      }
    }

    const skippedList = Array.from(skippedMap.values());
    const skippedCount = skippedMap.size;

    const successMsg =
      authstatus == 1
        ? 'Attendance Correction Request Approved Successfully'
        : 'Attendance Correction Request Rejected Successfully';

    const message = !skippedCount ? successMsg : null;
    // : skippedCount === totalCount
    //   ? `${skippedText} Skipped.`
    //   : `${skippedText} Skipped and others saved successfully.`;

    return res.status(200).json({
      status: message ? 200 : 400,
      message,
      skippedUser: message ? null : skippedList,
      skippedCount: attCorrectionAuthorizationIDList.length - authorizedCount,
      authorizedCount: authorizedCount,
      totalRequests: attCorrectionAuthorizationIDList.length,
    });
  } catch (error) {
    next(error);
  }
};
