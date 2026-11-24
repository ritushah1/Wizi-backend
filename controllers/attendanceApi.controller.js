const BranchMaster = require('../models/branchMaster');
const Sequelize = require('sequelize');
const attendanceTransaction = require('../models/attendanceTransaction');
const UserMaster = require('../models/userMaster');
const EmployeeShift = require('../models/employeeShift');
const EmployeeBranch = require('../models/employeeBranch');
const message = require('../response_message/message');
const shiftTime = require('../models/shiftTime');
const shiftModel = require('../models/shift');
const AttendanceLogs = require('../models/attendancelogs');
const moment = require('moment');
const userMaster = require('../models/userMaster');
const EmployeeDepartment = require('../models/employeeDepartment');
const EmployeeDesignation = require('../models/employeeDesignation');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const weekoffHolidayTran = require('../models/weekoffHolidayTran');
const datewiseAttendancepolicy = require('../models/datewiseAttendancepolicy');
const EmployeeSalaryPolicy = require('../models/employeeSalaryPolicy');
const SalaryPolicy = require('../models/salaryPolicy');
const AttendancePolicy = require('../models/attendancePolicy');
const {
  formatAMPM,
  lateComingPenalty,
  earlyByPermission,
  calculateEarlyby,
  calculateLateby,
  getBranchByLatLong,
  userDetails,
  addAsopalavBreakTimePenalty,
  addAsopalavBreakTime,
  asiaKolkataDateTime,
  combined_deductionMobile,
  addFoodAllowanceInAttendance,
  getAutomticShiftAssignedMobile,
  addCoffMobile,
  coffOvertimeMobile,
  overtimeMobile,
  getShiftData,
  addExtraDaysMobile,
  deleteOvertimeCoffExtraDaysMobile,
  weekoffOnPhysicalPresentCalculationNoTxn,
  OD_On_Weekoff_MissPunch_Without_Trans,
  add_OD_On_weekOff_Coff_OT_ED_WithOut_Trans,
  getODData_Without_Trans,
  getWeekoffHoliday,
  lcShiftWise_deductionMobile,
  shiftShortfallMinutesDeduction,
  checkIsAttendanceMissPunch,
  getCoffMinutes,
  sendBulkNotification,
  updateShortLeave,
  convertWorkingHrstoOT_IfNotPresent,
  schedule_auto_punchout,
  calculateFullDayHalfDay,
} = require('../utils/commonUtilFunctions');
const ShiftTIme = require('../models/shiftTime');
const EmployeeAttendancePolicy = require('../models/employeeAttendancePolicy');
const EmployeeLateEarlyPolicy = require('../models/employeeLateEarlyPolicy');
const LateEarlyPolicy = require('../models/lateEarlyPolicy');
const { attendancePhotobase64Topng } = require('../utils/base64Topng');
const ShiftRoster = require('../models/shiftRoster');
const UserShortLeave = require('../models/userShortLeave');
const EmployeeShortLeavePolicy = require('../models/employeeShortLeavePolicy');
const {
  attendanceBranchTypeRule,
  PayrollFrequencyType,
  weekoffTypeEnum,
  LCEGPolicyTypeEnum,
  OutsidePunchPermissionEnum,
  overtimeAddedEnum,
  compensationTypeEnum,
  notificationTitleTypes,
  notificationScreentTypes,
  AuthorizationStatusType,
  attendanceFromType,
} = require('../utils/dbUtils');
const EmployeeWeekOff = require('../models/employeeWeekOff');
const weekOffPolicy = require('../models/weekOffPolicy');
const ShortLeavePolicy = require('../models/shortLeave');
const { isStoreFileToS3Bucket } = require('../utils/labelUtils');
const employeeHolidayPolicy = require('../models/employeeHolidayPolicy');
const holidayPolicy = require('../models/holidayPolicy');
const HolidayCompensationRule = require('../models/holidayCompensationRule');
const EmployeeReportTo = require('../models/employeeReportTo');
const otCalcShiftSlab = require('../models/otCalcShiftSlab');
const otCalcShiftSlabRatio = require('../models/otCalcShiftSlabRatio');
const { removePunchoutQueue } = require('../services/autoPunchoutQueueService');
const { s3OrLocalUploadFiles } = require('../middleware/s3UploadFile');
const PunchInOutFormValue = require('../models/punchInOutFormValue');
const { attachmentFilePathFolderNames } = require('../utils/commonVars');

function roundToNearestHour(minutes, roundoff) {
  // Calculate hours and the remaining minutes
  let hours = Math.floor(minutes / 60);
  let remainingMinutes = minutes % 60;

  // Round up if remaining minutes are more
  if (+remainingMinutes > +roundoff) {
    hours += 1;
  }

  return hours;
}

async function check_Employee_Attendance_Permission({
  companyMasterId,
  attendancePolicy,
  branch,
  date,
  userMasterID,
  latitude,
  longitude,
}) {
  if (!userMasterID || !companyMasterId || !attendancePolicy)
    return message.usermessage.ValidParameters;

  if (date) {
    const get_permission = await datewiseAttendancepolicy.findOne({
      where: {
        userMasterID: userMasterID,
        fromDate: {
          [Sequelize.Op.lte]: new Date(date),
        },
        ToDate: {
          [Sequelize.Op.gte]: new Date(date),
        },
      },
    });

    if (get_permission) return null;
  }

  const getLocationMatch = await getBranchByLatLong(
    companyMasterId,
    latitude,
    longitude,
    userMasterID,
    attendancePolicy,
    branch,
  );
  if (!getLocationMatch.id) {
    if (
      attendancePolicy.attBrType == attendanceBranchTypeRule.ASSIGNED &&
      !branch
    ) {
      return 'Branch not assigned';
    } else {
      return message.usermessage.radiusnotmatch;
    }
  }

  return null;
}
const sendPunchNotificationToReporting = ({
  userMasterID,
  displayName,
  direction,
  time,
}) => {
  // Run in background (do not block main flow)
  (async () => {
    try {
      const message = `${displayName} has punched ${direction} at ${time}.`;
      const findReportingManager = await EmployeeReportTo.findAll({
        where: {
          userMasterID,
          status: 1,
        },
        include: [
          {
            model: UserMaster,
            as: 'reportTo',
            where: { status: 1 },
            attributes: [
              'displayName',
              'userNumber',
              'deviceType',
              'firebaseToken',
            ],
          },
        ],
      });

      const iosTokens = [];
      const androidTokens = [];

      const payload = {
        notification: {
          title: notificationTitleTypes.TEAMPUNCHINOUT,
          body: message,
        },
        data: {
          screen: notificationScreentTypes.TEAMPUNCHINOUT,
        },
      };

      for (let report of findReportingManager) {
        const userData = report.reportTo;

        if (!userData || !userData.firebaseToken) continue;

        if (userData.deviceType === 'ios') {
          iosTokens.push(userData.firebaseToken);
        } else if (userData.deviceType === 'android') {
          androidTokens.push(userData.firebaseToken);
        }
      }

      if (iosTokens.length) {
        sendBulkNotification(iosTokens, payload, 'ios');
      }

      if (androidTokens.length) {
        sendBulkNotification(androidTokens, payload, 'android');
      }
    } catch (error) {
      console.error('Punch Notification Error:', error);
    }
  })();
};
const createAttendanceCustomizeField = async ({
  formData,
  attendanceLogID,
  files,
  companyMasterId,
  user,
}) => {
  try {
    const entryCount = Object.keys(formData).filter((key) =>
      key.startsWith('customizeFieldId'),
    ).length;
    const date = asiaKolkataDateTime(new Date()).slice(0, 10);

    const PunchInOutFormValuesArray = [];
    let index_attch = 0;

    for (let i = 0; i <= entryCount; i++) {
      const checkAttach =
        formData[`hascustomizeFieldAttachment_${i}`] == 'true' ? true : false;
      const customizeFieldIndex = formData[`customizeIndex${i}`] || null;
      if (!customizeFieldIndex) {
        continue;
      }
      let customizeFieldValue = formData[`customizeFieldValue${i}`] || null;

      if (Array.isArray(customizeFieldValue)) {
        customizeFieldValue = customizeFieldValue.join(',  ');
      }
      let addObj = {
        punchInOutCustomizeFormID: formData[`punchInOutCustomizeFormID`],
        fieldIndex: formData[`customizeIndex${i}`],
        fieldLabel: formData[`customizeFieldLabel${i}`],
        inputType: formData[`customizeFieldType${i}`],
        fieldValue: customizeFieldValue || null,
        attendanceLogID: attendanceLogID,
        isS3Upload: isStoreFileToS3Bucket,
      };
      if (checkAttach) {
        const attendanceAttachmentUrl =
          files.attendanceCustomizeFieldAttachment?.[index_attch] || null;

        const attachmentPath = await s3OrLocalUploadFiles({
          attachment: attendanceAttachmentUrl?.path,
          attachmentFileName: attendanceAttachmentUrl?.filename,
          companyMasterId: companyMasterId,
          folderName: attachmentFilePathFolderNames.ATTENDANCE_CUSTOMIZE_FIELD,
          isDeleteLocalFile: true,
        });

        addObj.fieldValue = attachmentPath;
        index_attch++;
      }
      PunchInOutFormValuesArray.push(addObj);
    }

    await PunchInOutFormValue.bulkCreate(PunchInOutFormValuesArray, {
      individualHooks: true,
      user,
    });
  } catch (error) {
    console.error('Error uploading attendance attachment:', error);

    throw error;
  }
};

exports.webMobileAttendanceApi = async (req, res, next) => {
  try {
    let formData = req.body;
    const files = req.files;
    for (const key of Object.keys(formData)) {
      if (
        formData[key] == 'null' ||
        !formData[key] ||
        formData[key] == 'undefined'
      ) {
        formData[key] = null;
      }
    }

    if (formData.newpunchin === 'true') {
      formData.newpunchin = true;
    } else if (formData.newpunchin === 'false') {
      formData.newpunchin = false;
    }
    let {
      userMasterID,
      latitude,
      longitude,
      address,
      attendnaceFrom,
      photo,
      attachment,
      attachmentFileName,
      direction,
      newpunchin,
      remarks,
    } = formData;
    const createBy = +req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    if (req?.userDetails.isMyUserDetails) {
      userMasterID = createBy;
    }
    const date = asiaKolkataDateTime(new Date()).slice(0, 10);
    const user_details = await userMaster.findOne({
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
          attributes: ['attendancePolicyID'],
          include: [
            {
              model: AttendancePolicy,
              as: 'attendancePolicy',
              include: [
                {
                  model: otCalcShiftSlab,
                  as: 'otCalcSS',
                  include: [
                    {
                      model: otCalcShiftSlabRatio,
                      as: 'otCalcSSR',
                    },
                  ],
                },
              ],
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
              attributes: [
                'branchMasterID',
                'branchName',
                'latitude',
                'longitude',
                'branchAddress',
                'radius',
              ],
            },
          ],
        },
        {
          model: EmployeeDesignation,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(date) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(date) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
          attributes: ['designationID'],
        },
        {
          model: EmployeeDepartment,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(date) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(date) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
          attributes: ['departmentID'],
        },

        {
          model: EmployeeLateEarlyPolicy,
          where: {
            status: 1,
            startDate: { [Sequelize.Op.lte]: new Date(date) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(date) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
          separate: true,
          attributes: ['lateEarlyPolicyMasterID'],
          include: [
            {
              model: LateEarlyPolicy,
              as: 'lateEarlyPolicy',
            },
          ],
        },
        {
          model: EmployeeJoiningDetails,
          required: false,
        },
        {
          required: false,
          separate: true,
          model: EmployeeSalaryPolicy,
          where: {
            status: 1,
            startDate: {
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
          attributes: ['salaryPolicyID'],
          include: [{ model: SalaryPolicy, as: 'salaryPolicy' }],
        },
        {
          required: false,
          model: ShiftRoster,
          where: {
            shiftRosterDate: date,
          },
          attributes: [
            'shiftRosterID',
            'shiftID',
            'shiftRosterDate',
            'isFromRoster',
          ],
        },
        {
          required: false,
          model: EmployeeShift,
          attributes: ['shiftID', 'shiftsID'],
          where: {
            status: 1,
            startDate: {
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
        },

        {
          required: false,
          model: EmployeeWeekOff,
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
          attributes: ['weekOffPolicyID'],
          include: [{ model: weekOffPolicy, as: 'weekoff' }],
        },

        // holiday policy
        {
          model: employeeHolidayPolicy,
          required: false,
          where: {
            status: 1,
            applicableDate: {
              [Sequelize.Op.lte]: date,
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: date,
                },
              },
              {
                endDate: { [Sequelize.Op.eq]: null },
              },
            ],
          },
          attributes: ['holidayPolicyID'],
          include: [
            {
              model: holidayPolicy,
              as: 'HolidayPolicy',
              attributes: ['holidayPolicyID'],
              required: false,
              include: [
                {
                  model: HolidayCompensationRule,
                  separate: true,
                  required: false,
                  where: {
                    holidayDate: {
                      [Sequelize.Op.contains]: [date],
                    },
                  },
                },
              ],
            },
          ],
        },
        // short leave
        {
          required: false,
          model: UserShortLeave,
          where: {
            date,
            authorizationStatus: AuthorizationStatusType.APPROVED,
          },
        },
        // short leave policy
        {
          required: false,
          separate: true,
          model: EmployeeShortLeavePolicy,
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
          attributes: ['shortLeavePolicyID'],
          include: [{ model: ShortLeavePolicy }],
        },
      ],
      attributes: ['userMasterID', 'displayName', 'companyMasterId'],
    });

    if (!user_details) {
      return res.status(200).json({
        status: 401,
        message: 'User details not found',
        data: {},
      });
    }
    const isWebAttendance = attendnaceFrom == 'web';

    if (+userMasterID === createBy) {
      const empJoining = user_details.employeeJoiningDetails?.[0] || null;
      const isMobileAttendanceAllowed = [attendanceFromType.BIOMETRIC].includes(
        empJoining?.attendanceFrom,
      );
      if (!isWebAttendance && isMobileAttendanceAllowed) {
        return res.status(200).json({
          status: 401,
          message:
            'Attendance not allowed via mobile. Please use the biometric system.',
          data: {},
        });
      }
    }

    const attendancePhotoURL = files?.photo?.[0] || null;
    if (attendancePhotoURL) {
      photo = await s3OrLocalUploadFiles({
        attachment: attendancePhotoURL?.path,
        attachmentFileName: attendancePhotoURL?.filename,
        companyMasterId: user_details.companyMasterId,
        folderName: attachmentFilePathFolderNames.ATTENDANCE_PHOTO,
        isDeleteLocalFile: true,
        contentType: 'image/png',
      });
    } else {
      photo = null;
    }
    const attendanceAttachmentUrl = files.attachment?.[0] || null;

    if (attendanceAttachmentUrl) {
      const attachmentPath = await s3OrLocalUploadFiles({
        attachment: attendanceAttachmentUrl?.path,
        attachmentFileName: attendanceAttachmentUrl?.filename,
        companyMasterId: user_details.companyMasterId,
        folderName: attachmentFilePathFolderNames.ATTENDANCE_ATTACHMENT,
        isDeleteLocalFile: true,
      });

      attachment = attachmentPath;
    } else {
      attachment = null;
    }

    const attendancePolicy =
      user_details?.employeeAttendancePolicies?.[0]?.attendancePolicy || null;
    const branch = user_details.employeeBranches?.[0]?.branchMaster || null;

    const punch = async () => {
      await attendancepunchinpunchout(
        user_details.companyMasterId,
        user_details,
      );
    };

    // Web attendance
    if (isWebAttendance) {
      await punch();
      return;
    }

    // No attendance policy
    if (!attendancePolicy) {
      await punch();
      return;
    }

    // Outside punch permission enabled
    if (attendancePolicy.outsidePunchInPunchOut == 1) {
      const isInvalidDirection =
        (attendancePolicy.outSidePunchPermission ==
          OutsidePunchPermissionEnum.PUNCH_IN &&
          direction == 'out') ||
        (attendancePolicy.outSidePunchPermission ==
          OutsidePunchPermissionEnum.PUNCH_OUT &&
          direction == 'in');

      if (isInvalidDirection) {
        const msg = await check_Employee_Attendance_Permission({
          companyMasterId: user_details.companyMasterId,
          attendancePolicy: attendancePolicy,
          branch: branch,
          date: date,
          userMasterID: userMasterID,
          latitude: latitude,
          longitude: longitude,
        });

        if (msg) {
          return res.status(200).json({
            status: 401,
            message: msg,
          });
        }
      }

      await punch();
      return;
    }

    // Outside permission disabled
    const msg = await check_Employee_Attendance_Permission({
      companyMasterId: user_details.companyMasterId,
      attendancePolicy: attendancePolicy,
      branch: branch,
      date: date,
      userMasterID: userMasterID,
      latitude: latitude,
      longitude: longitude,
    });

    if (msg) {
      return res.status(200).json({
        status: 401,
        message: msg,
      });
    }

    await punch();

    async function attendancepunchinpunchout(companyMasterId, user_details) {
      const today = asiaKolkataDateTime(new Date()).slice(0, 10);

      let live_branch = null,
        LocationType = null;

      if (attendnaceFrom == 'web') {
        live_branch = branch ? branch.branchMasterID : null;
        LocationType = 'branch';
        if (branch) {
          latitude = branch.latitude ? branch.latitude : 'web';
          longitude = branch.longitude ? branch.longitude : 'web';
          address = branch.branchAddress ? branch.branchAddress : ' ';
        } else {
          latitude = 'web';
          longitude = 'web';
          address = 'web';
        }
      } else {
        let getLocationType = await getBranchByLatLong(
          companyMasterId,
          latitude,
          longitude,
          userMasterID,
          attendancePolicy,
          branch,
        );
        live_branch = getLocationType.id;
        LocationType = getLocationType.locationType;
      }

      // ----------------------- Employee Payroll Frequency -----------------------------

      const empPayrollFrequency =
        user_details.employeeJoiningDetails?.[0]?.payrollFrequency ||
        PayrollFrequencyType.MONTHLY;

      // -------------Employee Payroll Frequency compare with salary policy----------------------

      const salaryPolicy =
        user_details.employeeSalaryPolicies?.[0]?.salaryPolicy
          ?.payrollFrequency == empPayrollFrequency
          ? user_details.employeeSalaryPolicies?.[0]?.salaryPolicy
          : null;

      const employeeShiftRoster = user_details.shiftRosters?.[0] || null;
      const employeeShift = user_details.employeeShifts?.[0] || null;

      const empJoing = user_details.employeeJoiningDetails?.[0] || null;
      const joiningDate = empJoing.joiningDate || null;
      const leavingDate = empJoing.leavingDate || null;
      const weekoffPolicy = user_details.employeeWeekOffs?.[0]?.weekoff || null;

      const otAdded =
        salaryPolicy?.salarycalculationBasedon == 'hourwise'
          ? salaryPolicy?.overtimeAdded
          : overtimeAddedEnum.DAILY;
      const monthlyOtCalType =
        otAdded == overtimeAddedEnum.MONHTLY
          ? salaryPolicy.monthly_ot_cal_type
          : null;

      const holidayCoffRuleIn = attendancePolicy?.holidayCoffRuleIn;

      const holidayCompensationRules =
        user_details.employeeHolidayPolicies?.[0]?.HolidayPolicy
          ?.holidayCompensationRules?.[0] || null;
      const typeCondition =
        attendancePolicy?.WHPHPriority == 'PH' ? "'holiday'" : "'weekoff'";

      // user Short leave
      const userShortLeave = user_details?.userShortLeaves?.[0] || null;
      const shortLeavePolicy =
        user_details?.employeeShortLeavePolicies?.[0]?.shortLeave || null;

      if (direction == 'in') {
        if (joiningDate) {
          const todayMoment = moment(today, 'YYYY-MM-DD');

          const isBeforeJoining = todayMoment.isBefore(
            moment(joiningDate, 'YYYY-MM-DD'),
          );

          const isAfterLeaving = leavingDate
            ? todayMoment.isAfter(moment(leavingDate, 'YYYY-MM-DD'))
            : false;

          if (isBeforeJoining) {
            return res.json({
              status: 401,
              message: `Your employment starts on ${moment(joiningDate).format('DD-MM-YYYY')}. You cannot punch in before your joining date.`,
              data: {},
            });
          }

          if (isAfterLeaving) {
            return res.json({
              status: 401,
              message: `Your employment ended on ${moment(leavingDate).format('DD-MM-YYYY')}. You are no longer allowed to punch in/out.`,
              data: {},
            });
          }
        }

        if (newpunchin == true) {
          let new_punchIN = await attendanceTransaction.findOne({
            where: {
              userMasterID: userMasterID,
              Status: 1,
              AttendanceDate: today,
            },
          });

          //If already punch IN for same day
          if (new_punchIN) {
            return res.json({
              status: 401,
              message: 'You have already punch IN and Punch OUT for today',
              data: {},
            });
          }

          let get_one_data = await getShiftData(
            employeeShift,
            employeeShiftRoster,
            date,
          );
          // Find Active Data
          let shift;
          if (get_one_data) {
            shift = get_one_data;
          }

          const designation = user_details.employeeDesignations?.[0] || null;

          const department = user_details.employeeDepartments?.[0] || null;

          let insert_db_status;
          let shiftTimeData = null;

          if (attendancePolicy) {
            if (attendancePolicy.automaticAssignShift == 0) {
              if (shift) {
                let day = new Date().toLocaleString('en-us', {
                  weekday: 'long',
                });
                let get_options = await shiftTime.findOne({
                  where: {
                    shiftID: shift.shiftID,
                    day: day,
                  },
                }); // Find shift time options

                shiftTimeData = get_options;

                let lateby;
                const lateMinutes = await calculateLateby(
                  today,
                  get_options.statTime,
                  new Date(),
                );
                if (lateMinutes) {
                  lateby = lateMinutes;
                } else {
                  lateby = '';
                }

                let penalty;
                let penaltydeduction;

                const assigndepartment = department
                  ? department.departmentID
                  : null;
                const assigndesignation = designation
                  ? designation.designationID
                  : null;
                const assignbranch = branch ? branch.branchMasterID : null;

                insert_db_status = await attendanceTransaction.create({
                  userMasterID: userMasterID,
                  departmentID: assigndepartment,
                  designationID: assigndesignation,
                  branchID: assignbranch,
                  InDatetime: new Date(),
                  AttendanceDate: today,
                  Shift: shift.shiftID,
                  Shifthrs: get_options.totalhours,
                  ShiftIntime: get_options.statTime,
                  ShiftoutTime: get_options.endtime,
                  LateBy: lateby,
                  Panalty: penalty,
                  PanaltyDeduction: penaltydeduction,
                  punchINbranch: live_branch,
                  locationTypeIN: LocationType,
                  createBy: createBy,
                  createByIp: createByIp,
                });
                // Insert In AttendanceLogs

                insert_db = await AttendanceLogs.create({
                  userMasterID: userMasterID,
                  AttendanceTransID:
                    insert_db_status.dataValues.AttendanceTransID,
                  logDateTime: new Date(),
                  direction: direction,
                  photo: photo,
                  isS3Upload: isStoreFileToS3Bucket,
                  attendnaceFrom: attendnaceFrom,
                  longitude: longitude,
                  latitude: latitude,
                  address: address,
                  createBy: createBy,
                  createByIp: createByIp,
                  remarks: remarks,
                  attachments: attachment,
                });
                await createAttendanceCustomizeField({
                  formData,
                  attendanceLogID: insert_db.attendanceLogID,
                  files: req.files,
                  companyMasterId: user_details.companyMasterId,
                  user: req.userDetails,
                });
              } else {
                return res.json({
                  status: 401,
                  message: message.usermessage.assignshift,
                  data: {},
                });
              }
            } else {
              //  Check shift
              if (shift) {
                let day = new Date().toLocaleString('en-us', {
                  weekday: 'long',
                });
                let get_options = await shiftTime.findOne({
                  where: {
                    shiftID: shift.shiftID,
                    day: day,
                  },
                }); // Find shift time options

                shiftTimeData = get_options;

                let lateby;
                const lateMinutes = await calculateLateby(
                  today,
                  get_options.statTime,
                  new Date(),
                );
                if (lateMinutes) {
                  lateby = lateMinutes;
                } else {
                  lateby = '';
                }

                let penalty;
                let penaltydeduction;

                const assigndepartment = department
                  ? department.departmentID
                  : null;
                const assigndesignation = designation
                  ? designation.designationID
                  : null;
                const assignbranch = branch ? branch.branchMasterID : null;

                insert_db_status = await attendanceTransaction.create({
                  userMasterID: userMasterID,
                  departmentID: assigndepartment,
                  designationID: assigndesignation,
                  branchID: assignbranch,
                  InDatetime: new Date(),
                  AttendanceDate: today,
                  Shift: shift.shiftID,
                  Shifthrs: get_options.totalhours,
                  ShiftIntime: get_options.statTime,
                  ShiftoutTime: get_options.endtime,
                  LateBy: lateby,
                  Panalty: penalty,
                  PanaltyDeduction: penaltydeduction,
                  punchINbranch: live_branch,
                  locationTypeIN: LocationType,
                  createBy: createBy,
                  createByIp: createByIp,
                });
                // Insert In AttendanceLogs

                insert_db = await AttendanceLogs.create({
                  userMasterID: userMasterID,
                  AttendanceTransID:
                    insert_db_status.dataValues.AttendanceTransID,
                  logDateTime: new Date(),
                  direction: direction,
                  photo: photo,
                  isS3Upload: isStoreFileToS3Bucket,
                  attendnaceFrom: attendnaceFrom,
                  longitude: longitude,
                  latitude: latitude,
                  address: address,
                  createBy: createBy,
                  createByIp: createByIp,
                  remarks: remarks,
                  attachments: attachment,
                });
                await createAttendanceCustomizeField({
                  formData,
                  attendanceLogID: insert_db.attendanceLogID,
                  files: req.files,
                  companyMasterId: user_details.companyMasterId,
                  user: req.userDetails,
                });
              } else {
                const getAutoShift = await getAutomticShiftAssignedMobile(
                  userMasterID,
                  new Date(),
                  user_details,
                );

                if (getAutoShift) {
                  let lateby;
                  const lateMinutes = await calculateLateby(
                    today,
                    getAutoShift.statTime,
                    new Date(),
                  );
                  if (lateMinutes) {
                    lateby = lateMinutes;
                  } else {
                    lateby = '';
                  }

                  const assigndepartment = department
                    ? department.departmentID
                    : null;
                  const assigndesignation = designation
                    ? designation.designationID
                    : null;
                  const assignbranch = branch ? branch.branchMasterID : null;

                  shiftTimeData = getAutoShift;

                  insert_db_status = await attendanceTransaction.create({
                    userMasterID: userMasterID,
                    InDatetime: new Date(),
                    departmentID: assigndepartment,
                    designationID: assigndesignation,
                    branchID: assignbranch,
                    AttendanceDate: today,
                    Shift: getAutoShift.shiftID,
                    Shifthrs: getAutoShift.totalhours,
                    ShiftIntime: getAutoShift.statTime,
                    ShiftoutTime: getAutoShift.endtime,
                    punchINbranch: live_branch,
                    locationTypeIN: LocationType,
                    LateBy: lateby,
                    createBy: createBy,
                    createByIp: createByIp,
                  });

                  insert_db = await AttendanceLogs.create({
                    userMasterID: userMasterID,
                    AttendanceTransID:
                      insert_db_status.dataValues.AttendanceTransID,
                    logDateTime: new Date(),
                    direction: direction,
                    photo: photo,
                    isS3Upload: isStoreFileToS3Bucket,
                    attendnaceFrom: attendnaceFrom,
                    longitude: longitude,
                    latitude: latitude,
                    address: address,
                    createBy: createBy,
                    createByIp: createByIp,
                    remarks: remarks,
                    attachments: attachment,
                  });
                  await createAttendanceCustomizeField({
                    formData,
                    attendanceLogID: insert_db.attendanceLogID,
                    files: req.files,
                    companyMasterId: user_details.companyMasterId,
                    user: req.userDetails,
                  });
                } else {
                  return res.json({
                    status: 401,
                    message: message.usermessage.shiftadds,
                    data: {},
                  });
                }
              }
            }
          } else {
            //  Check shift
            if (shift) {
              let day = new Date().toLocaleString('en-us', { weekday: 'long' });
              let get_options = await shiftTime.findOne({
                where: {
                  shiftID: shift.shiftID,
                  day: day,
                },
              }); // Find shift time options

              shiftTimeData = get_options;

              let lateby;
              const lateMinutes = await calculateLateby(
                today,
                get_options.statTime,
                new Date(),
              );
              if (lateMinutes) {
                lateby = lateMinutes;
              } else {
                lateby = '';
              }

              let penalty;
              let penaltydeduction;
              const assigndepartment = department
                ? department.departmentID
                : null;
              const assigndesignation = designation
                ? designation.designationID
                : null;
              const assignbranch = branch ? branch.branchMasterID : null;

              insert_db_status = await attendanceTransaction.create({
                userMasterID: userMasterID,
                departmentID: assigndepartment,
                designationID: assigndesignation,
                branchID: assignbranch,
                InDatetime: new Date(),
                AttendanceDate: today,
                Shift: shift.shiftID,
                Shifthrs: get_options.totalhours,
                ShiftIntime: get_options.statTime,
                ShiftoutTime: get_options.endtime,
                LateBy: lateby,
                Panalty: penalty,
                PanaltyDeduction: penaltydeduction,
                punchINbranch: live_branch,
                locationTypeIN: LocationType,
                createBy: createBy,
                createByIp: createByIp,
              });
              // Insert In AttendanceLogs

              insert_db = await AttendanceLogs.create({
                userMasterID: userMasterID,
                AttendanceTransID:
                  insert_db_status.dataValues.AttendanceTransID,
                logDateTime: new Date(),
                direction: direction,
                photo: photo,
                isS3Upload: isStoreFileToS3Bucket,
                attendnaceFrom: attendnaceFrom,
                longitude: longitude,
                latitude: latitude,
                address: address,
                createBy: createBy,
                createByIp: createByIp,
                remarks: remarks,
                attachments: attachment,
              });
              await createAttendanceCustomizeField({
                formData,
                attendanceLogID: insert_db.attendanceLogID,
                files: req.files,
                companyMasterId: user_details.companyMasterId,
                user: req.userDetails,
              });
            } else {
              const getAutoShift = await getAutomticShiftAssignedMobile(
                userMasterID,
                new Date(),
                user_details,
              );

              if (getAutoShift) {
                let lateby;
                const lateMinutes = await calculateLateby(
                  today,
                  getAutoShift.statTime,
                  new Date(),
                );
                if (lateMinutes) {
                  lateby = lateMinutes;
                } else {
                  lateby = '';
                }

                let penalty;
                let penaltydeduction;

                const assigndepartment = department
                  ? department.departmentID
                  : null;
                const assigndesignation = designation
                  ? designation.designationID
                  : null;
                const assignbranch = branch ? branch.branchMasterID : null;

                shiftTimeData = getAutoShift;

                insert_db_status = await attendanceTransaction.create({
                  userMasterID: userMasterID,
                  InDatetime: new Date(),
                  departmentID: assigndepartment,
                  designationID: assigndesignation,
                  branchID: assignbranch,
                  AttendanceDate: today,
                  Shift: getAutoShift.shiftID,
                  Shifthrs: getAutoShift.totalhours,
                  ShiftIntime: getAutoShift.statTime,
                  ShiftoutTime: getAutoShift.endtime,
                  Panalty: penalty,
                  PanaltyDeduction: penaltydeduction,
                  punchINbranch: live_branch,
                  locationTypeIN: LocationType,
                  LateBy: lateby,
                  createBy: createBy,
                  createByIp: createByIp,
                });

                insert_db = await AttendanceLogs.create({
                  userMasterID: userMasterID,
                  AttendanceTransID:
                    insert_db_status.dataValues.AttendanceTransID,
                  logDateTime: new Date(),
                  direction: direction,
                  photo: photo,
                  isS3Upload: isStoreFileToS3Bucket,
                  attendnaceFrom: attendnaceFrom,
                  longitude: longitude,
                  latitude: latitude,
                  address: address,
                  createBy: createBy,
                  createByIp: createByIp,
                  remarks: remarks,
                  attachments: attachment,
                });
                await createAttendanceCustomizeField({
                  formData,
                  attendanceLogID: insert_db.attendanceLogID,
                  files: req.files,
                  companyMasterId: user_details.companyMasterId,
                  user: req.userDetails,
                });
              } else {
                return res.json({
                  status: 401,
                  message: message.usermessage.shiftadds,
                  data: {},
                });
              }
            }
          }

          // if shift roster is not available

          if (!employeeShiftRoster && insert_db_status) {
            await ShiftRoster.create(
              {
                userMasterID: insert_db_status.userMasterID,
                shiftID: insert_db_status.Shift,
                shiftRosterDate: insert_db_status.AttendanceDate,
                isFromRoster: false,
              },
              { individualHooks: true, user: req.userDetails },
            );
          }

          // ----------------------OD on weekoff Logic ----------------

          const whData = await getWeekoffHoliday(
            userMasterID,
            today,
            typeCondition,
          );

          const weekoffType = whData?.tableName || null;

          // if OD on weekoff
          if (whData && attendancePolicy) {
            const odData = await getODData_Without_Trans(userMasterID, today);

            if (odData)
              await OD_On_Weekoff_MissPunch_Without_Trans(
                null,
                userMasterID,
                today,
                whData,
                attendancePolicy,
                shiftTimeData,
                odData,
                companyMasterId,
                otAdded,
                monthlyOtCalType,
                weekoffType,
                holidayCoffRuleIn,
                holidayCompensationRules,
              );
          }
          if (attendancePolicy?.notifyReportingOnPunch) {
            sendPunchNotificationToReporting({
              userMasterID: userMasterID,
              displayName: user_details.displayName,
              direction: direction,
              time: formatAMPM(new Date()),
            });
          }

          // create auto punchout
          await schedule_auto_punchout(
            attendancePolicy,
            shiftTimeData,
            userMasterID,
            insert_db_status.AttendanceTransID,
            insert_db_status.AttendanceDate,
          );

          return res.json({
            status: 200,
            message: message.usermessage.punchin,
          });
        } else {
          let get_one_data = await attendanceTransaction.findOne({
            where: {
              userMasterID: userMasterID,
            },
            include: [
              {
                model: shiftModel,
                attributes: ['shiftID'],
                include: [{ model: shiftTime }],
              },
            ],
            order: [['AttendanceDate', 'DESC']],
          });

          const nextDay = new Date(today);

          nextDay.setDate(nextDay.getDate() + 1);

          const finalDate = nextDay.toISOString().slice(0, 10);

          // delete next day weekoff if from attendance

          weekoffHolidayTran.destroy({
            where: {
              userMasterID: userMasterID,
              date: finalDate,
              from: 'attendance',
            },
          });
          //To destroy Old Coff for continue punch IN
          await deleteOvertimeCoffExtraDaysMobile(userMasterID, today);

          let get_one_data1 = await AttendanceLogs.findOne({
            where: {
              AttendanceTransID: get_one_data.AttendanceTransID,
            },
            order: [['createdAt', 'DESC']],
          });
          if (get_one_data1.logDateTime != null) {
            let punchindate = formatAMPM(get_one_data1.logDateTime);
            let date = formatAMPM(new Date());
            var startTime = moment(date, 'HH:mm a');
            var endTime = moment(punchindate, 'HH:mm: a');
            var duration = moment.duration(startTime.diff(endTime));
            var hours = parseInt(duration.asHours());
            hours = hours * 60;
            var minutes = Math.abs(
              (parseInt(duration.asMinutes()) % 60) + hours,
            );

            let totaltime = Number(get_one_data.OutHrs) + Number(minutes);

            const userdetail = await userDetails(userMasterID);
            if (
              userdetail.companyMasterId == 277 ||
              userdetail.companyMasterId == 300 ||
              userdetail.companyMasterId == 298
            ) {
              await attendanceTransaction.update(
                {
                  OutDateTime: null,
                  OutHrs: totaltime,
                  EarlyBy: null,
                  Panalty: null,
                  PanaltyDeduction: null,
                  goEarlyPanalty: null,
                  goEarlyPanaltyDeduction: null,
                  latePenaltyMinutes: null,
                  earlyPenaltyMinutes: null,
                  fulldayhalfday: null,
                  punchOUTbranch: null,
                  locationTypeOUT: null,
                  roundOffMinutes: null,
                  shiftShortfallMinutes: null,
                  isWHConvertedToOT: false,
                },
                {
                  where: { AttendanceTransID: get_one_data.AttendanceTransID },
                },
              );

              const penaltyID =
                userdetail.companyMasterId == 277
                  ? 90
                  : userdetail.companyMasterId == 298
                    ? 166
                    : 201;

              const breakTime = await addAsopalavBreakTime(
                get_one_data,
                new Date(),
              );

              const totalBreakTime =
                new Date(get_one_data.AttendanceDate + ' 09:35 AM') >
                new Date(get_one_data.InDatetime)
                  ? 90
                  : 45;

              if (breakTime.type == 'teabreak') {
                if (
                  breakTime.diff + +get_one_data.lunchBreak >
                  totalBreakTime
                ) {
                  await addAsopalavBreakTimePenalty(
                    userMasterID,
                    get_one_data.AttendanceDate,
                    penaltyID,
                  );
                }
                await attendanceTransaction.update(
                  {
                    teaBreak: breakTime.diff,
                    teaBreakInStartTime: breakTime.starttime,
                    teaBreakEndTime: breakTime.endtime,
                  },
                  {
                    where: {
                      AttendanceTransID: get_one_data.AttendanceTransID,
                    },
                  },
                );
              } else if (breakTime.type == 'lunchBreak') {
                if (breakTime.diff > totalBreakTime) {
                  await addAsopalavBreakTimePenalty(
                    userMasterID,
                    get_one_data.AttendanceDate,
                    penaltyID,
                  );
                }
                await attendanceTransaction.update(
                  {
                    lunchBreak: breakTime.diff,
                    lunchBreakStartTime: breakTime.starttime,
                    lunchBreakEndTime: breakTime.endtime,
                  },
                  {
                    where: {
                      AttendanceTransID: get_one_data.AttendanceTransID,
                    },
                  },
                );
              }
            } else {
              let change_data = await attendanceTransaction.update(
                {
                  OutDateTime: null,
                  OutHrs: totaltime,
                  EarlyBy: '',
                  Panalty: '',
                  PanaltyDeduction: '',
                  goEarlyPanalty: null,
                  goEarlyPanaltyDeduction: null,
                  latePenaltyMinutes: null,
                  earlyPenaltyMinutes: null,
                  fulldayhalfday: null,
                  punchOUTbranch: null,
                  locationTypeOUT: null,
                  roundOffMinutes: null,
                  shiftShortfallMinutes: null,
                },
                {
                  where: { AttendanceTransID: get_one_data.AttendanceTransID },
                },
              );
            }

            insert_db = await AttendanceLogs.create({
              userMasterID: userMasterID,
              AttendanceTransID: get_one_data.AttendanceTransID,
              logDateTime: new Date(),
              direction: direction,
              photo: photo,
              isS3Upload: isStoreFileToS3Bucket,
              attendnaceFrom: attendnaceFrom,
              longitude: longitude,
              latitude: latitude,
              address: address,
              createBy: createBy,
              createByIp: createByIp,
              remarks: remarks,
              attachments: attachment,
            });
            await createAttendanceCustomizeField({
              formData,
              attendanceLogID: insert_db.attendanceLogID,
              files: req.files,
              companyMasterId: user_details.companyMasterId,
              user: req.userDetails,
            });
            // ----------------------OD on weekoff Logic ----------------

            const whData = await getWeekoffHoliday(
              userMasterID,
              get_one_data.AttendanceDate,
              typeCondition,
            );

            const weekoffType = whData?.tableName || null;

            // if OD on weekoff
            if (whData && attendancePolicy) {
              const odData = await getODData_Without_Trans(
                userMasterID,
                get_one_data.AttendanceDate,
              );
              const dayname = new Date(
                get_one_data.AttendanceDate,
              ).toLocaleString('en-us', {
                weekday: 'long',
              });

              const shiftTimeData = (
                get_one_data?.shift?.shiftTimes || []
              ).find((e) => e.day == dayname);

              if (odData?.length)
                await OD_On_Weekoff_MissPunch_Without_Trans(
                  null,
                  userMasterID,
                  get_one_data.AttendanceDate,
                  whData,
                  attendancePolicy,
                  shiftTimeData,
                  odData,
                  companyMasterId,
                  otAdded,
                  monthlyOtCalType,
                  weekoffType,
                  holidayCoffRuleIn,
                  holidayCompensationRules,
                );
            }
            if (attendancePolicy?.notifyReportingOnPunch) {
              sendPunchNotificationToReporting({
                userMasterID: userMasterID,
                displayName: user_details.displayName,
                direction: direction,
                time: formatAMPM(new Date()),
              });
            }

            const day = new Date(get_one_data.AttendanceDate).toLocaleString(
              'en-us',
              {
                weekday: 'long',
              },
            );

            const shiftTimeData = await shiftTime.findOne({
              where: {
                day,
                shiftID: get_one_data.Shift,
              },
            });

            // create auto punchout
            await schedule_auto_punchout(
              attendancePolicy,
              shiftTimeData,
              get_one_data.userMasterID,
              get_one_data.AttendanceTransID,
              get_one_data.AttendanceDate,
            );

            return res.json({
              status: 200,
              message: message.usermessage.punchin,
              data: get_one_data,
            });
          } else {
            return res.json({
              status: 401,
              message: message.usermessage.punchoutcond,
              data: {},
            });
          }
        }
      } else {
        let get_one_data = await attendanceTransaction.findOne({
          where: {
            userMasterID: userMasterID,
          },
          order: [['AttendanceDate', 'DESC']],
        });
        if (!get_one_data) {
          return res.json({
            status: 200,
            message: message.usermessage.punchoutcond,
            data: {},
          });
        }

        if (get_one_data.OutDateTime) {
          return res.json({
            status: 200,
            message: 'You have already punch out for today.',
          });
        }

        let day = new Date(get_one_data.AttendanceDate).toLocaleString(
          'en-us',
          { weekday: 'long' },
        );

        let [get_one_data1, get_options] = await Promise.all([
          AttendanceLogs.findOne({
            where: {
              AttendanceTransID: get_one_data.AttendanceTransID,
            },
            order: [['createdAt', 'DESC']],
          }),
          shiftTime.findOne({
            where: {
              shiftID: get_one_data.Shift,
              day: day,
            },
            include: [
              {
                model: shiftModel,
                as: 'shift',
              },
            ],
          }),
        ]);

        let dt1 = new Date(get_one_data1.logDateTime);
        let dt2 = new Date();

        diff = (dt2.getTime() - dt1.getTime()) / 1000;
        diff /= 60;
        diff = Math.abs(Math.round(diff));
        var minutes = diff;

        const missPunchObj = await checkIsAttendanceMissPunch(
          attendancePolicy, //Attendance Policy
          get_one_data, // Attendance Data
          get_options, // Day-Wise Shift Time Data
          new Date(), // Attendance Log Time
        );
        if (missPunchObj.isMissPunch) {
          return res.json({
            status: missPunchObj.status,
            message: missPunchObj.message,
            data: {},
          });
        }
        let totaltime = Math.abs(
          (new Date() - new Date(get_one_data.InDatetime)) / (1000 * 60),
        );
        totaltime = Math.round(totaltime - +get_one_data.OutHrs);
        // totaltime = Number(get_one_data.InHrs) + Number(minutes);
        if (
          +user_details.companyMasterId == 168 &&
          new Date(get_one_data.InDatetime) <
            new Date(
              get_one_data.AttendanceDate + ' ' + get_one_data.ShiftIntime,
            )
        ) {
          const difference = Math.abs(
            (new Date(
              get_one_data.AttendanceDate + ' ' + get_one_data.ShiftIntime,
            ) -
              new Date(get_one_data.InDatetime)) /
              (1000 * 60),
          );
          totaltime = Math.round(totaltime - +difference);
        }

        let fulldayHalfdayMinutes = 0,
          skipMinutes = 0;
        const preShiftOT = attendancePolicy?.preShiftOT || false;
        if (attendancePolicy) {
          if (attendancePolicy.considerOvertimeAfter == 'shifthours') {
            const isNextDay = moment(
              get_one_data.ShiftoutTime,
              'h:mm A',
            ).isBefore(moment(get_one_data.ShiftIntime, 'h:mm A'));

            const attendanceDate = moment(get_one_data.AttendanceDate)
              .add(isNextDay ? 1 : 0, 'day')
              .format('YYYY-MM-DD');

            const considerInTime =
              preShiftOT &&
              new Date(attendanceDate + ' ' + get_one_data.ShiftIntime) >
                new Date(get_one_data.InDatetime)
                ? new Date(attendanceDate + ' ' + get_one_data.ShiftIntime)
                : new Date(get_one_data.InDatetime);
            const shiftOutTime = new Date(
              attendanceDate + ' ' + get_one_data.ShiftoutTime,
            );
            const shiftInTime = new Date(
              get_one_data.AttendanceDate + ' ' + get_one_data.ShiftIntime,
            );

            if (new Date().getTime() > shiftOutTime.getTime()) {
              fulldayHalfdayMinutes =
                (shiftOutTime.getTime() - considerInTime.getTime()) /
                (1000 * 60);
            } else {
              fulldayHalfdayMinutes = preShiftOT
                ? (new Date().getTime() - shiftInTime.getTime()) / 60000
                : totaltime + +get_one_data.OutHrs;
            }
          } else {
            fulldayHalfdayMinutes = totaltime + +get_one_data.OutHrs;
          }

          if (attendancePolicy.considerWorkingHours == 'notincludingouthours') {
            fulldayHalfdayMinutes -= Number(get_one_data.OutHrs);
          }

          // if (attendancePolicy.considerWorkingHours == 'includingouthours') {
          //   fulldayHalfdayMinutes =
          //     Number(totaltime) + Number(get_one_data.OutHrs);
          // } else {
          //   fulldayHalfdayMinutes = Number(totaltime);
          // }

          // preshift hours consideration
          if (
            new Date(get_one_data.InDatetime) <
            new Date(
              get_one_data.AttendanceDate + ' ' + get_one_data.ShiftIntime,
            )
          ) {
            const diffMilliseconds =
              new Date(
                get_one_data.AttendanceDate + ' ' + get_one_data.ShiftIntime,
              ) - new Date(get_one_data.InDatetime);

            // Convert the time difference from milliseconds to minutes
            const EarlyMinutes = Math.floor(diffMilliseconds / (1000 * 60));

            // Check if early arrival minutes should be considered for deduction
            if (
              attendancePolicy.preShiftHrsConsideration == 0 || // Policy: Do not consider early arrival
              (attendancePolicy.preShiftHrsConsideration == 1 && // Policy: Consider only if early minutes are less than allowed
                EarlyMinutes < +attendancePolicy.preShiftMin &&
                !preShiftOT)
            ) {
              // Assign the early minutes to skipMinutes for deduction
              skipMinutes = EarlyMinutes;

              // Deduct the skipMinutes from fulldayHalfdayMinutes to avoid counting early arrival towards present time
              fulldayHalfdayMinutes -= +skipMinutes;
            }
          }
        } else {
          fulldayHalfdayMinutes =
            Number(totaltime) + Number(get_one_data.OutHrs);
        }

        let earlyBy;
        const EarlybyMinutes = await calculateEarlyby(
          get_one_data.AttendanceDate,
          get_one_data.ShiftIntime,
          get_one_data.ShiftoutTime,
          new Date(),
        );
        if (EarlybyMinutes) {
          earlyBy = EarlybyMinutes;
        } else {
          earlyBy = '';
        }

        //check this

        let attendancetransaction = await attendanceTransaction.findOne({
          where: {
            AttendanceTransID: get_one_data.AttendanceTransID,
          },
        });

        let dayname = new Date(
          attendancetransaction.AttendanceDate,
        ).toLocaleString('en-us', {
          weekday: 'long',
        });
        let shiftid = Number(attendancetransaction.Shift);

        let shift_Grace = fulldayHalfdayMinutes;
        // -----------------grace minutes to send in overtime function----------
        let grace = 0;
        if (get_options.shift && get_options.shift.shiftGrace) {
          shift_Grace =
            Number(get_options.shift.shiftGrace) + fulldayHalfdayMinutes;

          grace = Number(get_options.shift.shiftGrace);
        }

        // changes for short leave
        if (userShortLeave && shortLeavePolicy) {
          shift_Grace += +shortLeavePolicy.minutesForShortLeave;
          grace += +shortLeavePolicy.minutesForShortLeave;

          const toUpdateData = {
            AttendanceTransID: get_one_data.AttendanceTransID,
            updateBy: createBy,
            updateByIp: createByIp,
          };

          const updateOptions = {
            hooks: false,
          };
          // update short leave
          await updateShortLeave(
            toUpdateData,
            userShortLeave.userShortLeaveId,
            updateOptions,
          );
        }

        let weekOffMinutes = 0;
        let normalDayMinutes = shift_Grace;
        const checkWH = await getWeekoffHoliday(
          attendancetransaction.userMasterID,
          attendancetransaction.AttendanceDate,
          typeCondition,
        );

        if (checkWH && checkWH.WHDayType == 'SH' && +checkWH.value == 0.5) {
          const totalMinuteshalfday = get_options.totalhourshalfday * 60;
          // shift_Grace = 300
          if (
            attendancePolicy &&
            attendancePolicy.considerOvertimeAfter == 'totalworkinghours'
          ) {
            if (shift_Grace > totalMinuteshalfday) {
              weekOffMinutes = shift_Grace - totalMinuteshalfday - grace;
              shift_Grace = shift_Grace - weekOffMinutes;
              normalDayMinutes = shift_Grace;
            }
          } else {
            if (
              new Date(attendancetransaction.InDatetime) <
              new Date(
                attendancetransaction.AttendanceDate +
                  ' ' +
                  get_options.firsthalfendtime,
              )
            ) {
              if (
                new Date() >
                new Date(
                  attendancetransaction.AttendanceDate +
                    ' ' +
                    get_options.firsthalfendtime,
                )
              ) {
                const inTime = new Date(
                  attendancetransaction.InDatetime,
                ).getTime();
                const firstHalfEndTime = new Date(
                  attendancetransaction.AttendanceDate +
                    ' ' +
                    get_options.firsthalfendtime,
                ).getTime();

                let differenceInMinutes = (firstHalfEndTime - inTime) / 60000; // Convert ms to minutes

                differenceInMinutes = differenceInMinutes - skipMinutes - grace;
                if (differenceInMinutes >= 0) {
                  weekOffMinutes = shift_Grace - differenceInMinutes;
                  shift_Grace = differenceInMinutes;
                  normalDayMinutes = shift_Grace;
                }
              } else if (
                new Date(attendancetransaction.InDatetime) >
                new Date(
                  attendancetransaction.AttendanceDate +
                    ' ' +
                    get_options.firsthalfendtime,
                )
              ) {
                weekOffMinutes = shift_Grace - grace;
                shift_Grace = 0;
                normalDayMinutes = shift_Grace;
              }
            }
          }
        }

        const attendanceFullDayHalfDay = await calculateFullDayHalfDay({
          shiftID: shiftid,
          dayName: dayname,
          totalWorkMin: shift_Grace,
        });
        // set roundoff minutes
        let final_totaltime = Math.round(totaltime) + +get_one_data.OutHrs;
        let finalMinutes = +final_totaltime;

        const halfDayOT = attendancePolicy?.Hfd_OT || false;

        if (
          attendancePolicy &&
          attendancePolicy.considerWorkingHours == 'notincludingouthours'
        ) {
          final_totaltime = +Math.round(totaltime);
          finalMinutes = +Math.round(totaltime);
        }

        let final_Minutes = Math.round(+final_totaltime) - +skipMinutes;

        const temp_final_Minutes = final_Minutes;

        if (
          salaryPolicy &&
          salaryPolicy.salarycalculationBasedon == 'hourwise' &&
          salaryPolicy.considerTimeType != 'actual'
        ) {
          if (salaryPolicy.considerTimeValue) {
            if (salaryPolicy.considerTimeType == 'slotwise') {
              final_Minutes =
                Math.floor(
                  Math.round(+final_Minutes) / +salaryPolicy.considerTimeValue,
                ) * +salaryPolicy.considerTimeValue;
            }

            if (salaryPolicy.considerTimeType == 'roundoff') {
              final_Minutes =
                roundToNearestHour(
                  Math.round(+final_Minutes),
                  +salaryPolicy.considerTimeValue,
                ) * 60;
            }
          }
        }

        const extraMinutes = +temp_final_Minutes - +final_Minutes;

        const [updatedRows, updatedData] = await attendanceTransaction.update(
          {
            OutDateTime: new Date(),
            InHrs: +totaltime,
            EarlyBy: earlyBy,
            // Panalty: penalty,
            // PanaltyDeduction: penaltydeduction,
            fulldayhalfday: attendanceFullDayHalfDay,
            punchOUTbranch: live_branch,
            locationTypeOUT: LocationType,
            roundOffMinutes:
              Math.round(+final_Minutes) > 0 ? Math.round(+final_Minutes) : 0,
            Panalty: null,
            PanaltyDeduction: null,
            goEarlyPanalty: null,
            goEarlyPanaltyDeduction: null,
            latePenaltyMinutes: null,
            earlyPenaltyMinutes: null,
            shiftShortfallMinutes: null,
            isWHConvertedToOT: false,
          },
          {
            where: { AttendanceTransID: get_one_data.AttendanceTransID },
            returning: true,
          },
        );
        insert_db = await AttendanceLogs.create({
          userMasterID: userMasterID,
          AttendanceTransID: get_one_data.AttendanceTransID,
          logDateTime: new Date(),
          direction: direction,
          photo: photo,
          isS3Upload: isStoreFileToS3Bucket,
          attendnaceFrom: attendnaceFrom,
          longitude: longitude,
          latitude: latitude,
          address: address,
          createBy: createBy,
          createByIp: createByIp,
          remarks: remarks,
          attachments: attachment,
        });
        await createAttendanceCustomizeField({
          formData,
          attendanceLogID: insert_db.attendanceLogID,
          files: req.files,
          companyMasterId: user_details.companyMasterId,
          user: req.userDetails,
        });
        const LateEarlyPolicy =
          user_details.employeeLateEarlyPolicies?.[0]?.lateEarlyPolicy || null;

        const weekoffType = checkWH?.tableName || null;

        const attendanceData = updatedData?.[0] || null;

        // ------------------------------ for ot minutes if not present ---------------------------

        const isNonPresentOT = attendancePolicy?.isNonPresentOT || false;
        const isPresent = attendanceFullDayHalfDay == 1;

        const shouldConvertWorkingHoursToOT = isNonPresentOT && !isPresent;

        const isHalfWeekOff =
          checkWH?.WHDayType === 'SH' && checkWH?.value === 0.5;

        let otMinutesIfNotPresent = 0;

        const convertToOT = async () =>
          convertWorkingHrstoOT_IfNotPresent(
            attendancePolicy,
            attendanceData,
            userMasterID,
            null,
            otMinutesIfNotPresent,
            otAdded,
            monthlyOtCalType,
            +user_details.companyMasterId,
            null,
          );

        if (checkWH) {
          let withoutOtMinutes = Math.round(+final_Minutes);
          let total_In_Hrs = Math.round(+final_Minutes);
          if (checkWH && checkWH.WHDayType == 'SH' && checkWH.value == 0.5) {
            total_In_Hrs = weekOffMinutes;
            otMinutesIfNotPresent = normalDayMinutes;
          } else {
            weekOffMinutes = Math.round(+final_Minutes);
            normalDayMinutes = 0;
          }
          if (attendancePolicy) {
            const parameterData = {
              attendancePolicy,
              weekoffType,
              holidayCoffRuleIn,
              holidayCompensationRules,
            };

            const { minutesData, compensationType } =
              getCoffMinutes(parameterData);

            if (compensationType == compensationTypeEnum.Overtime)
              withoutOtMinutes = 0;

            if (
              isHalfWeekOff &&
              shouldConvertWorkingHoursToOT &&
              compensationType == compensationTypeEnum.Overtime
            ) {
              otMinutesIfNotPresent += weekOffMinutes;

              await convertToOT();
            } else {
              // ------------------ OD on weekoff -------------------------

              const odData = await getODData_Without_Trans(
                get_one_data.userMasterID,
                get_one_data.AttendanceDate,
              );

              const odDays = odData.reduce((acc, obj) => acc + +obj.days, 0);

              const shiftTimeData = get_options;

              if (attendanceData?.fulldayhalfday != 1 && odDays > 0) {
                let minutes = weekOffMinutes;

                // if absent
                if (+attendanceData?.fulldayhalfday == 0) {
                  if (checkWH?.value == 0.5) {
                    const checkSecondHalfOD = odData.find((e) =>
                      ['Full Day', 'Second Half'].includes(e.userLeave.DayType),
                    );

                    minutes += checkSecondHalfOD
                      ? Math.round(+shiftTimeData.totalhours * 60) -
                        Math.round(+shiftTimeData.totalhourshalfday * 60)
                      : 0;
                  } else {
                    minutes +=
                      odDays == 0.5
                        ? Math.round(+shiftTimeData.totalhourshalfday * 60)
                        : Math.round(+shiftTimeData.totalhours * 60);
                  }
                }

                // if absent
                if (+attendanceData?.fulldayhalfday == 0.5) {
                  // check in time

                  let presentInFH = false;
                  let presentInSH = false;

                  if (
                    new Date(attendanceData.InDatetime) <
                    new Date(
                      get_one_data.AttendanceDate +
                        ' ' +
                        shiftTimeData.firsthalfendtime,
                    )
                  )
                    presentInFH = true;

                  if (
                    new Date(attendanceData.OutDateTime) >=
                    new Date(
                      get_one_data.AttendanceDate + ' ' + shiftTimeData.endtime,
                    )
                  )
                    presentInSH = true;

                  if (presentInFH && !presentInSH) {
                    const checkSecondHalfOD = odData.find((e) =>
                      ['Full Day', 'Second Half'].includes(e.userLeave.DayType),
                    );

                    minutes += checkSecondHalfOD
                      ? Math.round(+shiftTimeData.totalhours * 60) -
                        Math.round(+shiftTimeData.totalhourshalfday * 60)
                      : 0;
                  } else if (!presentInFH && presentInSH) {
                    const checkFirstHalfOD = odData.find((e) =>
                      ['Full Day', 'First Half'].includes(e.userLeave.DayType),
                    );

                    minutes += checkFirstHalfOD
                      ? Math.round(+shiftTimeData.totalhourshalfday * 60)
                      : 0;
                  } else if (!presentInFH && !presentInSH) {
                    minutes += Math.round(
                      +shiftTimeData.totalhourshalfday * 60,
                    );
                  }
                }

                // if OD on weekOff add OT/ED/Coff
                await add_OD_On_weekOff_Coff_OT_ED_WithOut_Trans(
                  attendancePolicy,
                  attendanceData,
                  companyMasterId,
                  minutes,
                  0,
                  minutes,
                  skipMinutes,
                  get_one_data.userMasterID,
                  get_one_data.AttendanceDate,
                  otAdded,
                  monthlyOtCalType,
                  weekoffType,
                  holidayCoffRuleIn,
                  holidayCompensationRules,
                );
              } else {
                //If Overtime
                if (compensationType == compensationTypeEnum.Overtime) {
                  // -----------------add without ot minutes in attendance transaction-------------------------
                  withoutOtMinutes = 0;
                  await coffOvertimeMobile(
                    userMasterID,
                    get_one_data.AttendanceTransID,
                    user_details.companyMasterId,
                    attendancePolicy,
                    skipMinutes,
                    weekOffMinutes,
                    normalDayMinutes,
                    get_one_data.AttendanceDate,
                    false,
                    otAdded,
                    monthlyOtCalType,
                  );
                } else if (compensationType == compensationTypeEnum.AddLeave) {
                  const otAddedMinutes = await addCoffMobile(
                    get_one_data.userMasterID,
                    get_one_data.AttendanceDate,
                    user_details.companyMasterId,
                    attendancePolicy,
                    total_In_Hrs,
                    attendanceData,
                    otAdded,
                    monthlyOtCalType,
                    minutesData,
                  );
                  withoutOtMinutes -= otAddedMinutes;
                } else if (
                  compensationType == compensationTypeEnum.AddExtraDays
                ) {
                  const otAddedMinutes = await addExtraDaysMobile(
                    attendancePolicy,
                    attendanceData,
                    total_In_Hrs,
                    get_one_data.userMasterID,
                    get_one_data.AttendanceDate,
                    otAdded,
                    monthlyOtCalType,
                    minutesData,
                  );
                  withoutOtMinutes -= otAddedMinutes;
                }
              }
            }
            if (
              isHalfWeekOff &&
              shouldConvertWorkingHoursToOT &&
              compensationType != compensationTypeEnum.Overtime
            ) {
              await convertToOT();
            }
          }

          // update attendance transaction
          await attendanceTransaction.update(
            {
              withoutOtMinutes: withoutOtMinutes > 0 ? withoutOtMinutes : 0,
            },
            { where: { AttendanceTransID: get_one_data.AttendanceTransID } },
          );
        } else {
          let earlyattendancetransaction = await attendanceTransaction.findOne({
            where: {
              AttendanceTransID: get_one_data.AttendanceTransID,
            },
          });

          if (shouldConvertWorkingHoursToOT) {
            otMinutesIfNotPresent = attendanceData.roundOffMinutes;

            await convertToOT();
          } else {
            await overtimeMobile(
              userMasterID,
              get_one_data.AttendanceTransID,
              user_details,
              skipMinutes,
              extraMinutes,
              grace,
              halfDayOT,
              get_options,
              otAdded,
              monthlyOtCalType,
            );
          }

          // if short leave is approved then skip lceg policy
          if (!userShortLeave) {
            // Flag To add Onworking hours
            const toaddOnWorkingHours = LateEarlyPolicy
              ? LateEarlyPolicy.onWorkingHours
              : false;

            const finalAdd_LCEG =
              toaddOnWorkingHours &&
              +finalMinutes >= +earlyattendancetransaction.Shifthrs * 60
                ? false
                : true;

            if (
              LateEarlyPolicy &&
              LateEarlyPolicy.lateEarlyPolicyType == LCEGPolicyTypeEnum.COMBINED
            ) {
              await combined_deductionMobile(
                earlyattendancetransaction,
                get_options.shift,
                shift_Grace,
                finalAdd_LCEG,
                salaryPolicy,
              );
            } else if (
              LateEarlyPolicy &&
              LateEarlyPolicy.lateEarlyPolicyType ==
                LCEGPolicyTypeEnum.LC_SHIFT_WISE
            ) {
              await lcShiftWise_deductionMobile(
                earlyattendancetransaction,
                shift_Grace,
                finalAdd_LCEG,
                salaryPolicy,
                LateEarlyPolicy,
              );
            } else {
              let goEarlyUsed = await earlyByPermission(
                earlyattendancetransaction,
                get_options.shift,
                earlyBy,
                shift_Grace,
                finalAdd_LCEG,
                salaryPolicy,
              );

              if (goEarlyUsed && goEarlyUsed == 1) {
                let shift_Grace1 = Number(shift_Grace);
                const attendanceFullDayHalfDay = calculateFullDayHalfDay({
                  shiftID: shiftid,
                  dayName: dayname,
                  totalWorkMin: shift_Grace1,
                });

                let change_data = await attendanceTransaction.update(
                  {
                    goEarlyUsed: 1,
                    fulldayhalfday: attendanceFullDayHalfDay || 0,
                  },
                  {
                    where: {
                      AttendanceTransID: get_one_data.AttendanceTransID,
                    },
                  },
                );
              }

              let lateattendancetransaction =
                await attendanceTransaction.findOne({
                  where: {
                    AttendanceTransID: get_one_data.AttendanceTransID,
                  },
                });
              await lateComingPenalty(
                lateattendancetransaction,
                get_options.shift,
                shift_Grace,
                finalAdd_LCEG,
                salaryPolicy,
              );
            }
          }
        }
        let finaltransation = await attendanceTransaction.findOne({
          where: {
            AttendanceTransID: get_one_data.AttendanceTransID,
          },
        });

        // if half day after late come

        if (
          !shouldConvertWorkingHoursToOT &&
          isNonPresentOT &&
          finaltransation?.fulldayhalfday != 1
        ) {
          otMinutesIfNotPresent = +finaltransation?.roundOffMinutes || 0;
          await convertToOT();
        }

        if (!checkWH)
          await shiftShortfallMinutesDeduction(
            attendancePolicy,
            finaltransation,
          );

        await addFoodAllowanceInAttendance(finaltransation, Boolean(checkWH));

        // ----------------------------- Weekoff on Physical Present ------------------------

        if (
          weekoffPolicy?.weekoffType == weekoffTypeEnum.ONPHYSICALPRESENT &&
          finaltransation &&
          empJoing
        ) {
          const userMasterID = user_details.userMasterID;

          const attendanceDate = new Date(finaltransation.AttendanceDate);

          attendanceDate.setMonth(attendanceDate.getMonth() - 2);

          const startDate = joiningDate
            ? new Date(joiningDate) > new Date(attendanceDate)
              ? joiningDate
              : attendanceDate
            : attendanceDate;

          const currentDate = new Date();

          currentDate.setDate(currentDate.getDate() + 1);

          const endDate = currentDate.toISOString().slice(0, 10);

          // find weekoff holiday

          const weekoffHoliday = await weekoffHolidayTran.findAll({
            where: {
              userMasterID,
              date: {
                [Sequelize.Op.between]: [startDate, endDate],
              },
              [Sequelize.Op.or]: [
                { optionalHoliday: false },
                { optionalHoliday: null },
              ],
            },
            order: [['date', 'DESC']],
          });

          const allWeekoff = weekoffHoliday.filter(
            (e) => e.tableName == 'weekoff',
          );

          const allHoliday = weekoffHoliday.filter(
            (e) => e.tableName == 'holiday',
          );

          const holidayDates = allHoliday.map((e) => e.date);

          const allAttendance = await attendanceTransaction.findAll({
            where: {
              userMasterID,
              [Sequelize.Op.and]: [
                {
                  AttendanceDate: {
                    [Sequelize.Op.between]: [startDate, endDate],
                  },
                },
                { AttendanceDate: { [Sequelize.Op.notIn]: holidayDates } },
              ],
              fulldayhalfday: {
                [Sequelize.Op.gte]: 0.5,
              },
              OutDateTime: {
                [Sequelize.Op.not]: null,
              },
            },
            include: [
              {
                model: shiftModel,
                attributes: ['shiftID', 'shiftGrace'],
                include: [{ model: ShiftTIme }],
              },
            ],
            order: [['AttendanceDate', 'ASC']],
          });

          await weekoffOnPhysicalPresentCalculationNoTxn(
            userMasterID,
            user_details.companyMasterId,
            finaltransation.AttendanceDate,
            attendancePolicy,
            salaryPolicy,
            allAttendance,
            allWeekoff,
            weekoffPolicy.physicalPresent,
            createBy,
            createByIp,
            'attendance',
            allHoliday,
          );
        }
        if (attendancePolicy?.notifyReportingOnPunch) {
          sendPunchNotificationToReporting({
            userMasterID: userMasterID,
            displayName: user_details.displayName,
            direction: direction,
            time: formatAMPM(new Date()),
          });
        }

        // delete auto_punchout
        await removePunchoutQueue(get_one_data.AttendanceTransID);

        return res.json({
          status: 200,
          message: message.usermessage.punchout,
          data: {},
        });
      }
    }
  } catch (err) {
    next(err);
  }
};
