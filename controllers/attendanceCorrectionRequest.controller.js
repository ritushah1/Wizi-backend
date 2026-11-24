const { Op, Sequelize } = require('sequelize');
const moment = require('moment');
const sequelize = require('../config/database');
const AttendanceCorrectionAuthorization = require('../models/attendanceCorrectionAuthorization');
const AttendanceCorrectionLogs = require('../models/attendanceCorrectionLogs');
const AttendanceCorrectionRequest = require('../models/attendanceCorrectionRequest');
const FormAuthorizationDetails = require('../models/AuthorizationDetails');
const AuthorizationCriteriaMaster = require('../models/authorizationCriteriaMaster');
const UserInbox = require('../models/UserInbox');
const UserMaster = require('../models/userMaster');
const {
  sendNotification,
  employeeSalaryPolicy,
  getSalaryMonthBySalaryPolicy,
  daysInMonth,
  asiaKolkataDateTime,
  findCompanyNotificationPolicy,
  encodeSecureBreak,
} = require('../utils/commonUtilFunctions');
const { CustomError } = require('../utils/customError');
const HrLeaveMonthlyTrans = require('../models/hrLeavesMonthlyTrans');
const Shift = require('../models/shift');
const AttendanceCorrectionReason = require('../models/attendanceCorrectionReason');
const EmployeeSalaryPolicy = require('../models/employeeSalaryPolicy');
const SalaryPolicy = require('../models/salaryPolicy');
const EmployeeAttendancePolicy = require('../models/employeeAttendancePolicy');
const AttendancePolicy = require('../models/attendancePolicy');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');
const {
  authorizationMasterTypes,
  PayrollFrequencyType,
  correctionStatusEnum,
  AttendanceCorrectionPermissionEnum,
} = require('../utils/dbUtils');
const message = require('../response_message/message');
const mailTemplateEditor = require('../models/mailTemplateEditor');
const { appURL } = require('../utils/labelUtils');
const { sendEmailForLeave } = require('../middleware/sendemail');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const attendanceTransaction = require('../models/attendanceTransaction');
const AttendanceLogs = require('../models/attendancelogs');
const companyMaster = require('../models/companyMaster');
const { statusCodes } = require('../utils/commonVars');
async function getAttendanceDataObj({
  userMasterID,
  AttendanceDate,
  transaction,
}) {
  try {
    const findAttendanceData = await attendanceTransaction.findOne({
      where: {
        userMasterID,
        AttendanceDate,
      },
      include: [
        {
          model: Shift,
          attributes: ['shiftName'],
        },
        {
          model: AttendanceLogs,
          attributes: ['userMasterID', 'logDateTime', 'direction'],
        },
      ],
      transaction,
    });

    let attDataObj = null;

    if (findAttendanceData) {
      const sortedAttendanceLogs =
        findAttendanceData?.attendancelogs
          ?.sort((a, b) => new Date(a.logDateTime) - new Date(b.logDateTime))
          ?.map((log) => ({
            direction: log.direction || null,
            logDateTime: log.logDateTime
              ? moment(log.logDateTime).format('DD-MM-YYYY HH:mm:ss')
              : null,
          })) || [];

      attDataObj = {
        AttendanceTransID: findAttendanceData.AttendanceTransID || null,
        InDatetime: findAttendanceData.InDatetime
          ? moment(findAttendanceData.InDatetime).format('DD-MM-YYYY HH:mm:ss')
          : null,
        OutDateTime: findAttendanceData.OutDateTime
          ? moment(findAttendanceData.OutDateTime).format('DD-MM-YYYY HH:mm:ss')
          : null,
        AttendanceDate: findAttendanceData.AttendanceDate
          ? moment(findAttendanceData.AttendanceDate).format('DD-MM-YYYY')
          : null,
        ShiftID: findAttendanceData.Shift || null,
        ShiftName: findAttendanceData.shift?.shiftName || null,
        Shifthrs: findAttendanceData.Shifthrs || null,
        ShiftIntime: findAttendanceData.ShiftIntime || null,
        ShiftoutTime: findAttendanceData.ShiftoutTime || null,
        fulldayhalfday:
          +findAttendanceData?.fulldayhalfday == 1
            ? 'Present'
            : +findAttendanceData?.fulldayhalfday == 0.5
              ? 'Half Day'
              : +findAttendanceData?.fulldayhalfday == 0
                ? 'Absent'
                : null,
        roundOffMinutes: findAttendanceData.roundOffMinutes || null,
        attendaceLogs: sortedAttendanceLogs,
      };
    }
    return attDataObj;
  } catch (error) {}
}
exports.addData = async (req, res, next) => {
  try {
    let {
      userMasterID,
      AttendanceDate,
      remark,
      attendaceLogs = [],
      correctionStatus = null,
      attendanceCorrectionReasonID = null,
    } = req.body;

      if (req?.userDetails.isMyUserDetails) {
      userMasterID = +req.userDetails.userMasterId;
    }

    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    if (moment(AttendanceDate).isAfter(moment(currentDate))) {
      return res.status(200).json({
        status: 401,
        message: 'Attendance date cannot be greater than current date',
      });
    }

    if (
      correctionStatus == correctionStatusEnum.ADD_LOG &&
      !attendaceLogs?.length
    ) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'Attendance log is required for Add Log correction.',
      });
    }

    const findSameData = await AttendanceCorrectionRequest.findOne({
      where: {
        userMasterID,
        AttendanceDate,
        authorizationStatus: {
          [Op.notIn]: [4, 3],
        },
      },
    });

    if (findSameData) {
      return res.status(200).json({
        status: 500,
        message: `You have already requested an attendance correction for ${moment(
          AttendanceDate,
        ).format('DD/MM/YYYY')}.`,
      });
    }
    const user_details = await UserMaster.findOne({
      where: {
        userMasterID: userMasterID,
        status: 1,
      },
      include: [
        {
          required: false,
          separate: true,
          model: EmployeeAttendancePolicy,
          where: {
            status: 1,
            startDate: {
              [Sequelize.Op.lte]: new Date(currentDate),
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: new Date(currentDate),
                },
              },
              {
                endDate: { [Sequelize.Op.eq]: null },
              },
            ],
          },
          attributes: ['attendancePolicyID'],
          include: [
            {
              model: AttendancePolicy,
              as: 'attendancePolicy',
            },
          ],
        },
        {
          required: false,
          separate: true,
          model: EmployeeSalaryPolicy,
          where: {
            status: 1,
            startDate: {
              [Sequelize.Op.lte]: new Date(AttendanceDate),
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: new Date(AttendanceDate),
                },
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
          model: EmployeeJoiningDetails,
          attributes: ['payrollFrequency', 'employeeCode'],
        },
        {
          model: EmployeeDesignation,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(AttendanceDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(AttendanceDate) } },
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
            applicableDate: { [Sequelize.Op.lte]: new Date(AttendanceDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(AttendanceDate) } },
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
            applicableDate: { [Sequelize.Op.lte]: new Date(AttendanceDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(AttendanceDate) } },
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
        // company master
        {
          model: companyMaster,
          attributes: ['isAttnStatusChangeable'],
        },
        // attendance transaction
        {
          required: false,
          model: attendanceTransaction,
          where: {
            AttendanceDate,
          },
          attributes: ['AttendanceDate'],
        },
      ],
    });
    if (!user_details) {
      return res.status(200).json({
        status: 401,
        message: 'User details not found',
      });
    }

    const payrollFrequency =
      user_details?.employeeJoiningDetails?.[0]?.payrollFrequency ||
      PayrollFrequencyType.MONTHLY;

    const attendance_verified = await HrLeaveMonthlyTrans.count({
      where: {
        userMasterID: user_details.userMasterID,
        monthstartdate: {
          [Op.lte]: AttendanceDate,
        },
        monthenddate: {
          [Op.gte]: AttendanceDate,
        },
        payrollFrequency,
        verified: 1,
      },
    });

    if (attendance_verified > 0) {
      return res.status(200).json({
        status: 401,
        message:
          'Attendance is already verified for this date. No correction request is allowed.',
      });
    }

    const user_salaryPolicy =
      user_details.employeeSalaryPolicies?.[0]?.salaryPolicy || null;

    const userAttendancePolicy =
      user_details.employeeAttendancePolicies?.[0]?.attendancePolicy || null;

    const attnCorrPermission = userAttendancePolicy?.attnCorrPermission || null;

    // --------------- Check Set Only Description ----------------------
    if (
      attnCorrPermission != AttendanceCorrectionPermissionEnum.DESCRIPTION_ONLY
    ) {
      // ----------------------condition for status changeable allowed or not -------------------------------
      const isAttnStatusChangeable =
        user_details.companyMaster?.isAttnStatusChangeable == false
          ? false
          : true;

      if (
        (!isAttnStatusChangeable &&
          correctionStatus == correctionStatusEnum.STATUS_CHANGE) ||
        (isAttnStatusChangeable &&
          correctionStatus == correctionStatusEnum.TIME_UNCHANGE)
      ) {
        return res.status(statusCodes.BAD_REQUEST).json({
          status: statusCodes.BAD_REQUEST,
          message:
            'The selected attendance correction type is not applicable for your company settings.',
        });
      }
    }

    if (userAttendancePolicy) {
      const {
        setCorrLimit,
        attCorrLimit,
        setCorrDayLimit,
        attCorrDayLimit,
        isAttnCorrOnAbsent,
        isTimeCorrAllowed,
        isStatusChangeAllowed,
        isAddLogAllowed,
      } = userAttendancePolicy;
      if (setCorrLimit) {
        const { salaryCycleDate, salaryCycleConsider } =
          user_salaryPolicy || {};
        const baseMoment = moment(AttendanceDate, 'YYYY-MM');
        let startMoment = baseMoment.clone().startOf('month');
        let endMoment = baseMoment.clone().endOf('month');
        if (salaryCycleDate) {
          startMoment.date(salaryCycleDate);
          if (salaryCycleConsider === 'E') {
            startMoment.subtract(1, 'month');
          }

          endMoment = startMoment
            .clone()
            .add(startMoment.daysInMonth() - 1, 'days');
        }
        const condition = {
          userMasterID,
          AttendanceDate: {
            [Op.between]: [
              startMoment.format('YYYY-MM-DD'),
              endMoment.format('YYYY-MM-DD'),
            ],
          },
        };
        const correctionCount = await AttendanceCorrectionRequest.count({
          distinct: true,
          where: condition,
        });
        if (correctionCount >= attCorrLimit) {
          return res.status(200).json({
            status: 500,
            message: 'You have reached Attendance Correction Request limit.',
          });
        }
      }
      if (setCorrDayLimit) {
        const attendanceDate = moment(AttendanceDate, 'YYYY-MM-DD');
        const lastAllowedDate = attendanceDate
          .clone()
          .add(attCorrDayLimit, 'days');

        const today = moment().startOf('day');

        if (today.isAfter(lastAllowedDate, 'day')) {
          return res.status(200).json({
            status: 500,
            message: `Attendance correction can be applied till ${lastAllowedDate.format(
              'DD-MM-YYYY',
            )}.`,
          });
        }
      }

      const attendance = user_details.attendanceTransactions?.[0] || null;

      if (
        !attendance &&
        attnCorrPermission !=
          AttendanceCorrectionPermissionEnum.DESCRIPTION_ONLY
      ) {
        let notAllowed = false;

        if (!isAttnCorrOnAbsent) notAllowed = true;

        if (
          !isTimeCorrAllowed &&
          correctionStatus == correctionStatusEnum.IN_OUT_TIME
        )
          notAllowed = true;
        if (
          !isStatusChangeAllowed &&
          [
            correctionStatusEnum.STATUS_CHANGE,
            correctionStatusEnum.TIME_UNCHANGE,
          ].includes(correctionStatus)
        )
          notAllowed = true;

        if (
          !isAddLogAllowed &&
          correctionStatus == correctionStatusEnum.ADD_LOG
        )
          notAllowed = true;

        if (notAllowed) {
          return res.status(statusCodes.BAD_REQUEST).json({
            status: statusCodes.BAD_REQUEST,
            message:
              'Attendance correction is not allowed because no attendance record was found.',
          });
        }
      }
    }

    const authorizationdetails = await FormAuthorizationDetails.findOne({
      where: {
        AuthorizationMasterID: authorizationMasterTypes.attendanceCorrection, // Attendance Correction
        userMasterID,
        status: 1,
      },
      include: [
        {
          model: AuthorizationCriteriaMaster,
          attributes: ['AuthorizationCriteria'],
        },
      ],
    });

    const authorizationStatus =
      // eslint-disable-next-line no-nested-ternary
      authorizationdetails && authorizationdetails.AuthorizationCriteriaMaster
        ? authorizationdetails.AuthorizationCriteriaMaster
            .AuthorizationCriteria == 'Sequeance No'
          ? 2
          : 1
        : 0;

    await sequelize.transaction(async (t) => {
      const attDataObj = await getAttendanceDataObj({
        userMasterID,
        AttendanceDate,
        transaction: t,
      });
      // Add Attendance Correction Request
      const requestData = await AttendanceCorrectionRequest.create(
        {
          userMasterID,
          AttendanceDate,
          remark,
          authorizationStatus,
          correctionStatus,
          attendanceCorrectionReasonID: attendanceCorrectionReasonID || 1,
          attData: attDataObj,
          attnCorrPermission:
            attnCorrPermission ||
            AttendanceCorrectionPermissionEnum.IN_TIME_OUT_TIME_DESCRIPTION,
        },
        { user: req.userDetails, transaction: t },
      );

      // Set Attendance RequestId In Log Data
      for (let i = 0; i < attendaceLogs.length; i++) {
        attendaceLogs[i].attendanceCorrectionRequestId =
          requestData.attendanceCorrectionRequestId;
      }
      // Create Attendance Correction Log
      await AttendanceCorrectionLogs.bulkCreate(attendaceLogs, {
        user: req.userDetails,
        individualHooks: true,
        transaction: t,
      });

      // if authorization is set
      if (+authorizationStatus !== 0) {
        // user Details
        const userDetails = await UserMaster.findOne({
          raw: true,
          where: {
            userMasterID,
          },
        });

        if (!userDetails) throw new Error('User not found!');

        // For Sequence No
        if (+authorizationStatus === 2) {
          const authorizationData =
            await AttendanceCorrectionAuthorization.create(
              {
                TableName: 'Attendance Correction',
                attendanceCorrectionRequestId:
                  requestData.attendanceCorrectionRequestId,
                userMasterID: authorizationdetails.AuthorizedByUserMasterId[0],
                authStatus: 2,
              },
              { user: req.userDetails, transaction: t },
            );

          // Create UserInbox
          await UserInbox.create(
            {
              activityTable: AttendanceCorrectionAuthorization.getTableName(),
              activityTablePK: authorizationData.toJSON().id,
              message: `${
                userDetails.displayName
              } has requested an attendance correction for ${moment(
                AttendanceDate,
              ).format('DD/MM/YYYY')}.`,
              assignedTo: authorizationdetails.AuthorizedByUserMasterId[0],
              assignedBy: userMasterID,
            },
            { user: req.userDetails, transaction: t },
          );

          const notification = {
            title: 'Attendance Correction',
            body:
              userDetails.displayName +
              ' requested for an attendance correction.',
          };
          const data = {
            screen: 'attendanceCorrectionauth',
            isScheduled: 'true',
            scheduledTime: new Date().toISOString(),
          };
          // send Notification
          await sendNotification(
            authorizationData.userMasterID,
            notification,
            data,
          );
          const companyMasterID = user_details?.companyMasterId || null;
          const get_NotificationPolicy = await findCompanyNotificationPolicy(
            +companyMasterID || null,
          );
          const user = await UserMaster.findOne({
            where: {
              userMasterID: authorizationdetails.AuthorizedByUserMasterId[0],
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
                  user_details.employeeJoiningDetails?.[0]?.employeeCode || '',
                empname = user_details?.displayName,
                department =
                  user_details.employeeDepartments?.[0]?.department
                    ?.departmentName || '',
                designation =
                  user_details.employeeDesignations?.[0]?.designation
                    ?.designationName || '',
                branch =
                  user_details.employeeBranches?.[0]?.branchMaster
                    ?.branchName || '';

              get_MailTemplate.subject = get_MailTemplate.subject.replace(
                '[EmployeeCode]',
                empcode,
              );
              get_MailTemplate.subject = get_MailTemplate.subject.replace(
                '[EmployeeName]',
                empname,
              );
              let reason;
              if (!remark) {
                const reason = await AttendanceCorrectionReason.findOne({
                  where: {
                    attendanceCorrectionReasonID:
                      req.body.attendanceCorrectionReasonID,
                  },
                });
              }
              const reqReason = remark ? remark : reason?.reason;

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
                AttendanceDate,
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
                AttendanceDate,
              );
            }
          }
          if (
            user.email &&
            get_MailTemplate?.body &&
            authorizationData.toJSON().attendanceCorrectionRequestId
          ) {
            const myTemplate = JSON.parse(JSON.stringify(get_MailTemplate));
            let AuthorizationRequestId =
              authorizationData.toJSON().attendanceCorrectionRequestId;
            const acceptData = {
              AuthorizationRequestId,
              type: 'approve',
              id: authorizationData.id,
              userMasterID: authorizationdetails.AuthorizedByUserMasterId[0],
              companyMasterID: user?.companyMasterId,
            };
            const rejectData = {
              AuthorizationRequestId,
              type: 'reject',
              id: authorizationData.id,
              userMasterID: authorizationdetails.AuthorizedByUserMasterId[0],
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

            console.log("==> MAIL SEND LOG: Sending Attendance Correction Authorization Email to:", data.email_id);
            sendEmailForLeave(data);
          }
        } else {
          // For Any
          for (
            let j = 0;
            j < authorizationdetails.AuthorizedByUserMasterId.length;
            j += 1
          ) {
            const authorizationData =
              await AttendanceCorrectionAuthorization.create(
                {
                  TableName: 'Attendance Correction',
                  attendanceCorrectionRequestId:
                    requestData.attendanceCorrectionRequestId,
                  userMasterID:
                    authorizationdetails.AuthorizedByUserMasterId[j],
                  authStatus: 2,
                },
                { user: req.userDetails, transaction: t },
              );

            // Create UserInbox
            await UserInbox.create(
              {
                activityTable: AttendanceCorrectionAuthorization.getTableName(),
                activityTablePK: authorizationData.toJSON().id,
                message: `${
                  userDetails.displayName
                } has requested an attendance correction for ${moment(
                  AttendanceDate,
                ).format('DD/MM/YYYY')}.`,
                assignedTo: authorizationdetails.AuthorizedByUserMasterId[j],
                assignedBy: userMasterID,
              },
              { user: req.userDetails, transaction: t },
            );

            const notification = {
              title: 'Attendance Correction',
              body:
                userDetails.displayName +
                ' requested for an attendance correction.',
            };
            const data = {
              screen: 'attendanceCorrectionauth',
              isScheduled: 'true',
              scheduledTime: new Date().toISOString(),
            };
            // send Notification
            await sendNotification(
              authorizationData.userMasterID,
              notification,
              data,
            );

            const companyMasterID = user_details?.companyMasterId || null;
            const get_NotificationPolicy = await findCompanyNotificationPolicy(
              +companyMasterID || null,
            );
            const user = await UserMaster.findOne({
              where: {
                userMasterID: authorizationdetails.AuthorizedByUserMasterId[j],
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
                    user_details.employeeJoiningDetails?.[0]?.employeeCode ||
                    '',
                  empname = user_details?.displayName,
                  department =
                    user_details.employeeDepartments?.[0]?.department
                      ?.departmentName || '',
                  designation =
                    user_details.employeeDesignations?.[0]?.designation
                      ?.designationName || '',
                  branch =
                    user_details.employeeBranches?.[0]?.branchMaster
                      ?.branchName || '';

                get_MailTemplate.subject = get_MailTemplate.subject.replace(
                  '[EmployeeCode]',
                  empcode,
                );
                get_MailTemplate.subject = get_MailTemplate.subject.replace(
                  '[EmployeeName]',
                  empname,
                );
                let reason;
                if (!remark) {
                  const reason = await AttendanceCorrectionReason.findOne({
                    where: {
                      attendanceCorrectionReasonID:
                        req.body.attendanceCorrectionReasonID,
                    },
                  });
                }
                const reqReason = remark ? remark : reason?.reason;

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
                  AttendanceDate,
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
                  AttendanceDate,
                );
              }
            }
            if (
              user.email &&
              get_MailTemplate?.body &&
              authorizationData.toJSON().attendanceCorrectionRequestId
            ) {
              const myTemplate = JSON.parse(JSON.stringify(get_MailTemplate));
              let AuthorizationRequestId =
                authorizationData.toJSON().attendanceCorrectionRequestId;
              const acceptData = {
                AuthorizationRequestId,
                type: 'approve',
                id: authorizationData.id,
                userMasterID: authorizationdetails.AuthorizedByUserMasterId[j],
                companyMasterID: user?.companyMasterId,
              };
              const rejectData = {
                AuthorizationRequestId,
                type: 'reject',
                id: authorizationData.id,
                userMasterID: authorizationdetails.AuthorizedByUserMasterId[j],
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

              console.log("==> MAIL SEND LOG: Sending Attendance Correction Authorization Email to:", data.email_id);
              sendEmailForLeave(data);
            }
          }
        }
      }
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Attendance Correction'),
    });
  } catch (error) {
    next(error);
  }
};

exports.updateData = async (req, res, next) => {
  try {
    const { id } = req.params;
    let {
      userMasterID,
      AttendanceDate,
      remark,
      attendaceLogs = [],
      correctionStatus = null,
      attendanceCorrectionReasonID = null,
    } = req.body;

    if(req.userDetails.isMyUserDetails){
      userMasterID=req.userDetails.userMasterId;
    }

    if (
      correctionStatus == correctionStatusEnum.ADD_LOG &&
      !attendaceLogs?.length
    ) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'Attendance log is required for Add Log correction.',
      });
    }

    const findSameData = await AttendanceCorrectionRequest.findOne({
      where: {
        userMasterID,
        AttendanceDate,
        attendanceCorrectionRequestId: {
          [Op.not]: id,
        },
        authorizationStatus: {
          [Op.notIn]: [4, 3],
        },
      },
    });

    if (findSameData) {
      return res.status(200).json({
        status: 500,
        message: `You have already requested an attendance correction for ${moment(
          AttendanceDate,
        ).format('DD/MM/YYYY')}.`,
      });
    }

     const requestData = await AttendanceCorrectionRequest.findOne({
        where: {
          attendanceCorrectionRequestId: id,
        },
      });

      if (!requestData) throw new Error('Request is deleted!');

    const user_salaryPolicy = await employeeSalaryPolicy(
      userMasterID,
      AttendanceDate,
    );

    const { yearmonth, start_Date, end_Date } = getSalaryMonthBySalaryPolicy(
      user_salaryPolicy ? true : false,
      user_salaryPolicy
        ? user_salaryPolicy['salaryPolicy.salaryCycleDate']
        : '',
      user_salaryPolicy
        ? user_salaryPolicy['salaryPolicy.salaryCycleConsider']
        : '',
      AttendanceDate,
    );

    const authorizationdetails = await FormAuthorizationDetails.findOne({
      where: {
        AuthorizationMasterID: authorizationMasterTypes.attendanceCorrection, // Attendance Correction
        userMasterID,
        status: 1,
      },
      include: [
        {
          model: AuthorizationCriteriaMaster,
          attributes: ['AuthorizationCriteria'],
        },
      ],
    });
    const user_details = await UserMaster.findOne({
      where: {
        userMasterID: req.body.userMasterID,
        status: 1,
      },
      include: [
        {
          model: EmployeeJoiningDetails,
          attributes: ['payrollFrequency', 'employeeCode'],
        },
        {
          model: EmployeeDesignation,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(AttendanceDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(AttendanceDate) } },
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
            applicableDate: { [Sequelize.Op.lte]: new Date(AttendanceDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(AttendanceDate) } },
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
            applicableDate: { [Sequelize.Op.lte]: new Date(AttendanceDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(AttendanceDate) } },
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
          model: EmployeeAttendancePolicy,
          where: {
            status: 1,
            startDate: {
              [Sequelize.Op.lte]: new Date(AttendanceDate),
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: new Date(AttendanceDate),
                },
              },
              {
                endDate: { [Sequelize.Op.eq]: null },
              },
            ],
          },
          attributes: ['attendancePolicyID'],
          include: [
            {
              model: AttendancePolicy,
              as: 'attendancePolicy',
            },
          ],
        },
        {
          model: companyMaster,
          attributes: ['isAttnStatusChangeable'],
        },
        // attendance transaction
        {
          required: false,
          model: attendanceTransaction,
          where: {
            AttendanceDate,
          },
          attributes: ['AttendanceDate'],
        },
      ],
    });

    const payrollFrequency =
      user_details?.employeeJoiningDetails?.[0]?.payrollFrequency ||
      PayrollFrequencyType.MONTHLY;

    const attendance_verified = await HrLeaveMonthlyTrans.count({
      where: {
        userMasterID: req.body.userMasterID,
        monthstartdate: {
          [Op.lte]: AttendanceDate,
        },
        monthenddate: {
          [Op.gte]: AttendanceDate,
        },
        payrollFrequency,
        verified: 1,
      },
    });

    if (attendance_verified > 0) {
      return res.status(200).json({
        status: 401,
        message:
          'Attendance is already verified for this date. No correction request is allowed.',
      });
    }

    const userAttendancePolicy =
      user_details.employeeAttendancePolicies?.[0]?.attendancePolicy || null;

    const attnCorrPermission = userAttendancePolicy?.attnCorrPermission || null;

    // --------------- Check Set Only Description ----------------------
    if (
      attnCorrPermission != AttendanceCorrectionPermissionEnum.DESCRIPTION_ONLY
    ) {
      // ----------------------condition for status changeable allowed or not -------------------------------

      const isAttnStatusChangeable =
        user_details.companyMaster?.isAttnStatusChangeable == false
          ? false
          : true;

      if (
        (!isAttnStatusChangeable &&
          correctionStatus == correctionStatusEnum.STATUS_CHANGE) ||
        (isAttnStatusChangeable &&
          correctionStatus == correctionStatusEnum.TIME_UNCHANGE)
      ) {
        return res.status(statusCodes.BAD_REQUEST).json({
          status: statusCodes.BAD_REQUEST,
          message:
            'The selected attendance correction type is not applicable for your company settings.',
        });
      }
    }

    if (userAttendancePolicy) {
      const {
        isAttnCorrOnAbsent,
        isTimeCorrAllowed,
        isStatusChangeAllowed,
        isAddLogAllowed,
      } = userAttendancePolicy;

      const attendance = user_details.attendanceTransactions?.[0] || null;

      if (
        !attendance &&
        attnCorrPermission !=
          AttendanceCorrectionPermissionEnum.DESCRIPTION_ONLY
      ) {
        let notAllowed = false;

        if (!isAttnCorrOnAbsent) notAllowed = true;

        if (
          !isTimeCorrAllowed &&
          correctionStatus == correctionStatusEnum.IN_OUT_TIME
        )
          notAllowed = true;
        if (
          !isStatusChangeAllowed &&
          [
            correctionStatusEnum.STATUS_CHANGE,
            correctionStatusEnum.TIME_UNCHANGE,
          ].includes(correctionStatus)
        )
          notAllowed = true;

        if (
          !isAddLogAllowed &&
          correctionStatus == correctionStatusEnum.ADD_LOG
        )
          notAllowed = true;

        if (notAllowed) {
          return res.status(statusCodes.BAD_REQUEST).json({
            status: statusCodes.BAD_REQUEST,
            message:
              'Attendance correction is not allowed because no attendance record was found.',
          });
        }
      }
    }

    const authorizationStatus =
      authorizationdetails && authorizationdetails.AuthorizationCriteriaMaster
        ? authorizationdetails.AuthorizationCriteriaMaster
            .AuthorizationCriteria == 'Sequeance No'
          ? 2
          : 1
        : 0;

    await sequelize.transaction(async (t) => {
      const requestData = await AttendanceCorrectionRequest.findOne({
        where: {
          attendanceCorrectionRequestId: id,
          userMasterID:userMasterID
        },
      });

      if (!requestData) throw new Error('Request is deleted!');
      const attDataObj = await getAttendanceDataObj({
        userMasterID: requestData.userMasterID,
        AttendanceDate: requestData.AttendanceDate,
        transaction: t,
      });
      requestData.authorizationStatus = authorizationStatus;
      requestData.AttendanceDate = AttendanceDate;
      requestData.remark = remark;
      requestData.correctionStatus = correctionStatus;
      requestData.attendanceCorrectionReasonID =
        attendanceCorrectionReasonID || 1;
      requestData.attData = attDataObj || null;
      requestData.attnCorrPermission =
        attnCorrPermission ||
        AttendanceCorrectionPermissionEnum.IN_TIME_OUT_TIME_DESCRIPTION;

      // Update Attendance Correction Request
      await requestData.save({ user: req.userDetails, transaction: t });

      // Delete All Logs

      await AttendanceCorrectionLogs.destroy(
        {
          where: {
            attendanceCorrectionRequestId: id,
          },
        },
        { user: req.userDetails, individualHooks: true, transaction: t },
      );

      attendaceLogs.map((e) => {
        e.attendanceCorrectionRequestId = id;
      });
      // Create Attendance Correction Log
      await AttendanceCorrectionLogs.bulkCreate(attendaceLogs, {
        user: req.userDetails,
        individualHooks: true,
        transaction: t,
      });

      // Find Auth data
      const findAuthData = await AttendanceCorrectionAuthorization.findAll({
        where: {
          attendanceCorrectionRequestId: id,
        },
      });

      const authids = findAuthData.map((e) => e.id);

      // Delete Inbox Data
      await UserInbox.destroy(
        {
          where: {
            activityTable: AttendanceCorrectionAuthorization.getTableName(),
            activityTablePK: authids,
          },
        },
        { transaction: t },
      );

      // ``Delete Authorization
      await AttendanceCorrectionAuthorization.destroy({
        where: { id: authids },
        individualHooks: true,
        transaction: t,
        user: req.userDetails,
      });

      // if authorization is set
      if (+authorizationStatus !== 0) {
        // user Details
        const userDetails = await UserMaster.findOne({
          raw: true,
          where: {
            userMasterID,
          },
        });

        if (!userDetails) throw new Error('User not found!');

        // For Sequence No
        if (+authorizationStatus === 2) {
          const authorizationData =
            await AttendanceCorrectionAuthorization.create(
              {
                TableName: 'Attendance Correction',
                attendanceCorrectionRequestId:
                  requestData.attendanceCorrectionRequestId,
                userMasterID: authorizationdetails.AuthorizedByUserMasterId[0],
                authStatus: 2,
              },
              { user: req.userDetails, transaction: t },
            );

          // Create UserInbox
          await UserInbox.create(
            {
              activityTable: AttendanceCorrectionAuthorization.getTableName(),
              activityTablePK: authorizationData.toJSON().id,
              message: `${
                userDetails.displayName
              } has requested an attendance correction for ${moment(
                AttendanceDate,
              ).format('DD/MM/YYYY')}.`,
              assignedTo: authorizationdetails.AuthorizedByUserMasterId[0],
              assignedBy: userMasterID,
            },
            { user: req.userDetails, transaction: t },
          );

          const notification = {
            title: 'Attendance Correction',
            body:
              userDetails.displayName +
              ' requested for an attendance correction.',
          };
          const data = {
            screen: 'attendanceCorrectionauth',
            isScheduled: 'true',
            scheduledTime: new Date().toISOString(),
          };
          const companyMasterID = user_details?.companyMasterId || null;
          const get_NotificationPolicy = await findCompanyNotificationPolicy(
            +companyMasterID || null,
          );
          const user = await UserMaster.findOne({
            where: {
              userMasterID: authorizationdetails.AuthorizedByUserMasterId[0],
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
                  user_details.employeeJoiningDetails?.[0]?.employeeCode || '',
                empname = user_details?.displayName,
                department =
                  user_details.employeeDepartments?.[0]?.department
                    ?.departmentName || '',
                designation =
                  user_details.employeeDesignations?.[0]?.designation
                    ?.designationName || '',
                branch =
                  user_details.employeeBranches?.[0]?.branchMaster
                    ?.branchName || '';

              get_MailTemplate.subject = get_MailTemplate.subject.replace(
                '[EmployeeCode]',
                empcode,
              );
              get_MailTemplate.subject = get_MailTemplate.subject.replace(
                '[EmployeeName]',
                empname,
              );
              let reason;
              if (!remark) {
                reason = await AttendanceCorrectionReason.findOne({
                  where: {
                    attendanceCorrectionReasonID:
                      req.body.attendanceCorrectionReasonID,
                  },
                });
              }
              const reqReason = remark ? remark : reason?.reason;

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
                AttendanceDate,
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
                AttendanceDate,
              );
            }
          }
          if (
            user.email &&
            get_MailTemplate?.body &&
            authorizationData.toJSON().attendanceCorrectionRequestId
          ) {
            const myTemplate = JSON.parse(JSON.stringify(get_MailTemplate));
            let AuthorizationRequestId =
              authorizationData.toJSON().attendanceCorrectionRequestId;
            const acceptData = {
              AuthorizationRequestId,
              type: 'approve',
              id: authorizationData.id,
              userMasterID: authorizationdetails.AuthorizedByUserMasterId[0],
              companyMasterID: user?.companyMasterId,
            };
            const rejectData = {
              AuthorizationRequestId,
              type: 'reject',
              id: authorizationData.id,
              userMasterID: authorizationdetails.AuthorizedByUserMasterId[0],
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

            console.log("==> MAIL SEND LOG: Sending Attendance Correction Authorization Email to:", data.email_id);
            sendEmailForLeave(data);
          }
          // send Notification
          await sendNotification(
            authorizationData.userMasterID,
            notification,
            data,
          );
        } else {
          // For Any
          for (
            let j = 0;
            j < authorizationdetails.AuthorizedByUserMasterId.length;
            j++
          ) {
            const authorizationData =
              await AttendanceCorrectionAuthorization.create(
                {
                  TableName: 'Attendance Correction',
                  attendanceCorrectionRequestId:
                    requestData.attendanceCorrectionRequestId,
                  userMasterID:
                    authorizationdetails.AuthorizedByUserMasterId[j],
                  authStatus: 2,
                },
                { user: req.userDetails, transaction: t },
              );

            // Create UserInbox
            await UserInbox.create(
              {
                activityTable: AttendanceCorrectionAuthorization.getTableName(),
                activityTablePK: authorizationData.toJSON().id,
                message: `${
                  userDetails.displayName
                } has requested an attendance correction for ${moment(
                  AttendanceDate,
                ).format('DD/MM/YYYY')}.`,
                assignedTo: authorizationdetails.AuthorizedByUserMasterId[j],
                assignedBy: userMasterID,
              },
              { user: req.userDetails, transaction: t },
            );

            const notification = {
              title: 'Attendance Correction',
              body:
                userDetails.displayName +
                ' requested for an attendance correction.',
            };
            const data = {
              screen: 'attendanceCorrectionauth',
              isScheduled: 'true',
              scheduledTime: new Date().toISOString(),
            };
            // send Notification
            await sendNotification(
              authorizationData.userMasterID,
              notification,
              data,
            );
            const companyMasterID = user_details?.companyMasterId || null;
            const get_NotificationPolicy = await findCompanyNotificationPolicy(
              +companyMasterID || null,
            );
            const user = await UserMaster.findOne({
              where: {
                userMasterID: authorizationdetails.AuthorizedByUserMasterId[j],
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
                    user_details.employeeJoiningDetails?.[0]?.employeeCode ||
                    '',
                  empname = user_details?.displayName,
                  department =
                    user_details.employeeDepartments?.[0]?.department
                      ?.departmentName || '',
                  designation =
                    user_details.employeeDesignations?.[0]?.designation
                      ?.designationName || '',
                  branch =
                    user_details.employeeBranches?.[0]?.branchMaster
                      ?.branchName || '';

                get_MailTemplate.subject = get_MailTemplate.subject.replace(
                  '[EmployeeCode]',
                  empcode,
                );
                get_MailTemplate.subject = get_MailTemplate.subject.replace(
                  '[EmployeeName]',
                  empname,
                );
                let reason;
                if (!remark) {
                  reason = await AttendanceCorrectionReason.findOne({
                    where: {
                      attendanceCorrectionReasonID:
                        req.body.attendanceCorrectionReasonID,
                    },
                  });
                }
                const reqReason = remark ? remark : reason?.reason;

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
                  AttendanceDate,
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
                  AttendanceDate,
                );
              }
            }
            if (
              user.email &&
              get_MailTemplate?.body &&
              authorizationData.toJSON().attendanceCorrectionRequestId
            ) {
              const myTemplate = JSON.parse(JSON.stringify(get_MailTemplate));
              let AuthorizationRequestId =
                authorizationData.toJSON().attendanceCorrectionRequestId;
              const acceptData = {
                AuthorizationRequestId,
                type: 'approve',
                id: authorizationData.id,
                userMasterID: authorizationdetails.AuthorizedByUserMasterId[j],
                companyMasterID: user?.companyMasterId,
              };
              const rejectData = {
                AuthorizationRequestId,
                type: 'reject',
                id: authorizationData.id,
                userMasterID: authorizationdetails.AuthorizedByUserMasterId[j],
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

              console.log("==> MAIL SEND LOG: Sending Attendance Correction Authorization Email to:", data.email_id);
              sendEmailForLeave(data);
            }
          }
        }
      }
    });

    return res.status(200).json({
      status: 200,
      message:
        'An attendance correction request has been updated successfully!',
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteData = async (req, res, next) => {
  try {
    const { id } = req.params;

    const requestData = await AttendanceCorrectionRequest.findOne({
      where: {
        attendanceCorrectionRequestId: id,
      },
    });

    if (!requestData) {
      return res.status(200).json({
        status: 401,
        message: 'Record Is Deleted',
      });
    }

    await sequelize.transaction(async (t) => {
      await AttendanceCorrectionLogs.destroy(
        {
          where: {
            attendanceCorrectionRequestId:
              requestData.attendanceCorrectionRequestId,
          },
        },
        { user: req.userDetails, individualHooks: true, transaction: t },
      );

      const authData = await AttendanceCorrectionAuthorization.findAll({
        where: {
          attendanceCorrectionRequestId:
            requestData.attendanceCorrectionRequestId,
        },
      });

      const authids = authData.map((e) => e.id);

      // Delete Inbox Data
      await UserInbox.destroy(
        {
          where: {
            activityTable: AttendanceCorrectionAuthorization.getTableName(),
            activityTablePK: authids,
          },
        },
        { transaction: t },
      );

      await AttendanceCorrectionAuthorization.destroy({
        where: {
          id: authids,
        },
        user: req.userDetails,
        individualHooks: true,
        transaction: t,
      });

      await requestData.destroy({
        user: req.userDetails,
        transaction: t,
      });
    });

    return res.status(200).json({
      status: 200,
      message:
        'An attendance correction request has been deleted successfully!',
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteDataV2 = async (req, res, next) => {
  try {
    const { id,userMasterID } = req.body;

    const requestData = await AttendanceCorrectionRequest.findOne({
      where: {
        attendanceCorrectionRequestId: id,
        userMasterID:userMasterID
      },
    });

    if (!requestData) {
      return res.status(200).json({
        status: 401,
        message: 'Record Is Deleted',
      });
    }

    await sequelize.transaction(async (t) => {
      await AttendanceCorrectionLogs.destroy(
        {
          where: {
            attendanceCorrectionRequestId:
              requestData.attendanceCorrectionRequestId,
          },
        },
        { user: req.userDetails, individualHooks: true, transaction: t },
      );

      const authData = await AttendanceCorrectionAuthorization.findAll({
        where: {
          attendanceCorrectionRequestId:
            requestData.attendanceCorrectionRequestId,
        },
      });

      const authids = authData.map((e) => e.id);

      // Delete Inbox Data
      await UserInbox.destroy(
        {
          where: {
            activityTable: AttendanceCorrectionAuthorization.getTableName(),
            activityTablePK: authids,
          },
        },
        { transaction: t },
      );

      await AttendanceCorrectionAuthorization.destroy({
        where: {
          id: authids,
          userMasterID:userMasterID
        },
        user: req.userDetails,
        individualHooks: true,
        transaction: t,
      });

      await requestData.destroy({
        user: req.userDetails,
        transaction: t,
      });
    });

    return res.status(200).json({
      status: 200,
      message:
        'An attendance correction request has been deleted successfully!',
    });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
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

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const requestData = await AttendanceCorrectionRequest.findOne({
      where: {
        attendanceCorrectionRequestId: id,
      },
      include: [
        {
          model: UserMaster,
          as: 'authorizer',
          attributes: ['displayName'],
        },
        {
          model: AttendanceCorrectionLogs,
          include: [{ model: Shift, attributes: ['shiftName'] }],
        },
        {
          required: false,
          model: AttendanceCorrectionReason,
        },
        {
          model: UserMaster,
          as: 'employee',
          attributes: ['userMasterID', 'displayName', 'userNumber'],
          include: [
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
    });

    if (!requestData) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage(
          'Attendance Correction Request',
        ),
      });
    }

    return res.status(200).json({
      status: 200,
      data: requestData,
    });
  } catch (error) {
    next(error);
  }
};

exports.getByUserId = async (req, res, next) => {
  try {
    const {
      page,
      limit,
      userMasterID,
      startDate,
      endDate,
      attendanceCorrectionReasonID,
      authorizationStatus,
    } = req.body;

    const paginateCodition =
      page && limit ? { offset: (page - 1) * limit, limit } : {};

    const condition = {
      userMasterID,
    };

    if (
      (Array.isArray(authorizationStatus) && authorizationStatus.length > 0) ||
      (!Array.isArray(authorizationStatus) && authorizationStatus)
    ) {
      condition.authorizationStatus = authorizationStatus;
    }

    if (attendanceCorrectionReasonID) {
      condition.attendanceCorrectionReasonID = attendanceCorrectionReasonID;
    }

    if (startDate && endDate)
      condition.AttendanceDate = {
        [Op.between]: [startDate, endDate],
      };
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    const { rows: requestData, count: totalcount } =
      await AttendanceCorrectionRequest.findAndCountAll({
        distinct: true,
        where: condition,
        ...paginateCodition,
        include: [
          {
            required: true,
            model: UserMaster,
            as: 'employee',
            where: { ...userAccessCondition.where },
            include: [...userAccessCondition.includeModels],
          },
          { model: AttendanceCorrectionLogs },
          {
            model: AttendanceCorrectionAuthorization,
            attributes: ['id', 'status', 'authStatus', 'remarks'],
          },
          {
            required: false,
            model: AttendanceCorrectionReason,
          },
        ],
        order: [['AttendanceDate', 'DESC']],
      });

    return res.status(200).json({
      status: 200,
      data: requestData,
      totalcount,
    });
  } catch (error) {
    next(error);
  }
};
