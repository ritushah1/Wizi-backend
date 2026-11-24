/** @format */

const message = require('../response_message/message');
const CityMaster = require('../models/citymaster');
const Sequelize = require('sequelize');
const UserMaster = require('../models/userMaster');
const sequelize = require('../config/database');
const subscriptionPlan = require('../models/subscriptionPlan');
const HRSalaryFields = require('../models/hrSalaryFields');
const HRLeaveTypes = require('../models/hrLeaveTypes');
const RoleMaster = require('../models/roleMaster');
const RolePermission = require('../models/rolePermission');
const ProductPermission = require('../models/productPermission');
const FormMaster = require('../models/formMaster');
const companyMaster = require('../models/companyMaster');
const { generateExcel } = require('../utils/exportData');
const CompanyType = require('../models/companytypeMaster');
const StateMaster = require('../models/statemaster');
const CountryMaster = require('../models/countrymaster');
const {
  roleType,
  companyAccessType,
  PTCalculationEnum,
  UserTypesEnum,
  defaultPenaltyNames,
  payheadConsiderInEnum,
  payheadMasterIdsMapping,
  setHolidayCoffRulesIn,
  loginOtpMethodENUM,
  companyCreateByDefaultUser,
  distanceCalculationMethodENUM,
  defaultSkillCategory,
  HrLeaveTypesIds,
  OTBasedOnEnum,
  authorizationCriteriaType,
  AuthorizationStatusType,
  correctionStatusEnum,
  employeeCodeTypes,
  probationTypeEnum,
} = require('../utils/dbUtils');
const CompanySubscriptionMaster = require('../models/subscriptionPlan');
const Incentivetype = require('../models/incentivetype');
const ProductMaster = require('../models/productMaster');
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const HrLeaveTypes = require('../models/hrLeaveTypes');
const Task_Stages = require('../models/tasks_stages');
const CompanyProgress = require('../models/companyProgress');
const Inquiries = require('../models/inquiries');
const AttendancePolicy = require('../models/attendancePolicy');
const {
  asiaKolkataDateTime,
  getParentChildCompany,
  getTimezone,
  getDefaultSkillCategoryArray_CompayWise,
} = require('../utils/commonUtilFunctions');
const {
  userAttributes,
  companyPlanwiseForms,
  statusCodes,
  companyTypes,
  adminDashboardTypesObj,
  subscriptionTypes,
} = require('../utils/commonVars');
const BranchMaster = require('../models/branchMaster');
const CompanyManager = require('../models/companyManagers');
const CompanyMarketing = require('../models/companyMarketing');
const CompanyServiceStatus = require('../models/companyServiceStatus');
const Penalty = require('../models/penalty');
const HRSalarySlip = require('../models/hrSalarySlip');
const ExcelJS = require('exceljs');
const CompanySalarySlipFormat = require('../models/companySalarySlipFormat');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeBranch = require('../models/employeeBranch');
const ZohoIntegration = require('../models/zohoIntegration');
const { companyUniqueCodePrefix, TIMEZONE } = require('../utils/labelUtils');
const Timezone = require('../models/timezone');
const CompanySkillCategory = require('../models/companySkillCategory');
const GoogleSheetIntegration = require('../models/googleSheetIntegration');
const { Op } = require('sequelize');
const AttendanceCorrectionRequest = require('../models/attendanceCorrectionRequest');
const attendanceRestrictRole = require('../models/attendanceRestrictRole');

exports.postAddCompany = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    for (const key of Object.keys(req.body)) {
      if (
        req.body[key] == 'null' ||
        !req.body[key] ||
        req.body[key] == 'undefined'
      ) {
        req.body[key] = null;
      }
    }

    let {
      companyName,
      companyAddress,
      companyWebsite,
      companyEmail,
      companyTypeid,
      cpName,
      cpMobileNo,
      cpEmail,
      parentCompanyMasterID,
      subCompanyRequired,
      employeeCodePattern,
      employeeCodeType,
      empCodeSeqLen,
      expenseDatePicker,
      otp = false,
      status,
      cityMasterID,
      panNumber,
      tanNumber,
      companyDescription,
      ownerName,
      ownerFatherName,
      tdsdeduction,
      cinNumber,
      fileUploadType,
      setUpTime,
      CompanyServiceStatusID = 1,
      weekOffSalaryType = null,
      payheadMasterId = null,
      ptDeduction = PTCalculationEnum.MONTHLY,
      relationManagerID,
      hrManagerID,
      marketingPersonID,
      dealerID,
      timezoneID,
      otpForLogin = false,
      loginOtpMethod = loginOtpMethodENUM.EMAIL,
      distanceMethod = distanceCalculationMethodENUM.HAVERSINE,
      otBasedOn = OTBasedOnEnum.AUTO,
      empCodeAutoStartsFrom,
    } = req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    if (!CompanyServiceStatusID) {
      CompanyServiceStatusID = 1;
    }
    if (!timezoneID) {
      timezoneID = (await getTimezone()) || null;
    }

    const find_company = await companyMaster.findOne({
      where: {
        parentCompanyMasterID: {
          [Sequelize.Op.ne]: 0,
        },
        companyMasterID: parentCompanyMasterID,
        status: 1,
      },
    });

    if (find_company) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: 'You can not add child company under child company.',
      });
    }
    const get_one_data = await companyMaster.findOne({
      where: {
        [Sequelize.Op.or]: [
          { companyMasterID: +parentCompanyMasterID },
          { parentCompanyMasterID: +parentCompanyMasterID },
        ],
        [Sequelize.Op.and]: [
          Sequelize.where(
            Sequelize.fn(
              'LOWER',
              Sequelize.fn('TRIM', Sequelize.col('companyName')),
            ),
            Sequelize.Op.eq,
            companyName.trim().toLowerCase(),
          ),
        ],
        status: [0, 1],
      },
    });

    if (get_one_data) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyExists('Company With Same name'),
      });
    }
    const employeecodepattern =
      employeeCodeType == employeeCodeTypes.PATTERN ||
      employeeCodeType == employeeCodeTypes.PATTERN_PLUS_AUTO_INCREMENT
        ? employeeCodePattern
        : null;
    empCodeSeqLen =
      employeeCodeType == employeeCodeTypes.PATTERN_PLUS_AUTO_INCREMENT
        ? empCodeSeqLen
        : null;

    expenseDatePicker =
      expenseDatePicker == 'null' || expenseDatePicker == ''
        ? null
        : expenseDatePicker;

    const companyLogo = req.files?.companyLogo
      ? req.files.companyLogo[0].filename
      : '';
    const authorizedSignature = req.files?.authorizedSignature
      ? req.files.authorizedSignature[0].filename
      : '';
    const letterHead = req.files?.letterHead
      ? req.files.letterHead[0].filename
      : '';

    let insert_db_status = await companyMaster.create(
      {
        companyName,
        companyAddress,
        companyLogo,
        companyWebsite,
        companyEmail,
        companyTypeid,
        cpName,
        cpMobileNo,
        cpEmail,
        parentCompanyMasterID,
        subCompanyRequired,
        employeeCodePattern: employeecodepattern,
        empCodeSeqLen: empCodeSeqLen,
        employeeCodeType,
        expenseDatePicker,
        otp: otp ? otp : false,
        status,
        createBy,
        createByIp,
        cityMasterID,
        panNumber,
        tanNumber,
        companyDescription,
        authorizedSignature,
        ownerName,
        ownerFatherName,
        tdsdeduction,
        cinNumber,
        fileUploadType,
        setUpTime,
        letterHead,
        weekOffSalaryType,
        payheadMasterId,
        ptDeduction,
        timezoneID,
        otpForLogin: otpForLogin ? otpForLogin : false,
        loginOtpMethod: loginOtpMethod
          ? loginOtpMethod
          : loginOtpMethodENUM.EMAIL,
        distanceMethod,
        otBasedOn,
        empCodeAutoStartsFrom,
      },
      { transaction, user: req.userDetails },
    );
    const companyId = insert_db_status.companyMasterID;

    // ✅ Generate code
    const companyCode = `${companyUniqueCodePrefix}${String(companyId).padStart(6, '0')}`;

    // ✅ Update in SAME transaction (important)
    await companyMaster.update(
      { uniqueCompanyCode: companyCode },
      {
        where: { companyMasterID: companyId },
        transaction, // ⚠️ add this
        user: req.userDetails,
        individualHooks: true,
      },
    );

    if (parentCompanyMasterID == 0 || !parentCompanyMasterID) {
      //CompanyProgress Data

      await CompanyProgress.create(
        {
          CompanyServiceStatusID,
          companyMasterID: insert_db_status.companyMasterID,
          // createBy
        },
        { user: req.userDetails, transaction },
      );
    }

    let hrSalaryFieldsArray = [];
    hrSalaryFieldsArray.push(
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 17,
        salaryFieldSide: 'D',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'B',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 16,
        salaryFieldSide: 'D',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'B',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 1,
        salaryFieldSide: 'E',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'A',
        salaryFieldShow: 'N',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 43,
        salaryFieldSide: 'E',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'A',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 9,
        salaryFieldSide: 'D',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'B',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 50,
        salaryFieldSide: 'E',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'A',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },

      {
        salaryFieldActive: 'Y',
        payheadMasterId: 92, // Net Salary
        salaryFieldSide: 'E',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'A',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },

      {
        salaryFieldActive: 'Y',
        payheadMasterId: 24,
        salaryFieldSide: 'E',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'A',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 34,
        salaryFieldSide: 'D',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'B',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 78,
        salaryFieldSide: 'D',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'B',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 83,
        salaryFieldSide: 'E',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'A',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 96,
        salaryFieldSide: 'D',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'B',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 97,
        salaryFieldSide: 'E',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'A',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 4, // pf
        salaryFieldSide: 'D',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'B',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 13, // ESI
        salaryFieldSide: 'D',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'B',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 5, // EPF
        salaryFieldSide: 'D',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'C',
        salaryFieldShow: 'N',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 12, // EPS
        salaryFieldSide: 'D',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'C',
        salaryFieldShow: 'N',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 66, // EDLI
        salaryFieldSide: 'D',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'C',
        salaryFieldShow: 'N',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 25, // Admin charges
        salaryFieldSide: 'D',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'C',
        salaryFieldShow: 'N',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 14, // Employer side ESIC
        salaryFieldSide: 'D',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'C',
        salaryFieldShow: 'N',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 67, // Leave Encashment
        salaryFieldSide: 'E',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'A',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 101, // Bonus Pay
        salaryFieldSide: 'E',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'A',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 15, // PT
        salaryFieldSide: 'D',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'B',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 147, // Weekoff Salary
        salaryFieldSide: 'E',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'A',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 2, // Basic
        salaryFieldSide: 'E',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'A',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 3, // HRA
        salaryFieldSide: 'E',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'A',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 35, // DA
        salaryFieldSide: 'E',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'A',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: payheadMasterIdsMapping.EXPENSE_REIMBURSEMENT, // Expense Reimbursement
        salaryFieldSide: 'E',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'A',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        considerIn: payheadConsiderInEnum.NETSALARY,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: payheadMasterIdsMapping.PAID_LEAVE_HOURS, // Paid Leave Hours
        salaryFieldSide: 'E',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'A',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        considerIn: payheadConsiderInEnum.GROSS,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: payheadMasterIdsMapping.SHORT_FALL_HOURS, // SHORT_FALL_HOURS
        salaryFieldSide: 'D',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'B',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        considerIn: payheadConsiderInEnum.GROSS,
        createBy,
        createByIp,
      },
    );

    const leaveTypeArray = [];
    leaveTypeArray.push(
      {
        LeaveID: 1,
        companyMasterID: insert_db_status.companyMasterID,
        // Allow_Field_Entry: 'Y',
        createBy,
        createByIp,
      },
      {
        LeaveID: 5,
        companyMasterID: insert_db_status.companyMasterID,
        // Allow_Field_Entry: 'N',
        createBy,
        createByIp,
      },
      {
        LeaveID: 6,
        companyMasterID: insert_db_status.companyMasterID,
        // Allow_Field_Entry: 'N',
        Leave_Allow: 'Y',
        createBy,
        createByIp,
      },
      {
        LeaveID: 9,
        companyMasterID: insert_db_status.companyMasterID,
        // Allow_Field_Entry: 'Y',
        createBy,
        createByIp,
      },
      {
        LeaveID: 7,
        companyMasterID: insert_db_status.companyMasterID,
        // Allow_Field_Entry: 'Y',
        createBy,
        createByIp,
      },
      {
        LeaveID: 18,
        companyMasterID: insert_db_status.companyMasterID,
        // Allow_Field_Entry: 'N',
        Leave_Allow: 'Y',
        createBy,
        createByIp,
      },
      {
        LeaveID: 20,
        companyMasterID: insert_db_status.companyMasterID,
        // Allow_Field_Entry: 'N',
        createBy,
        createByIp,
      },
      {
        LeaveID: 21,
        companyMasterID: insert_db_status.companyMasterID,
        // Allow_Field_Entry: 'N',
        createBy,
        createByIp,
      },
      {
        LeaveID: 22,
        companyMasterID: insert_db_status.companyMasterID,
        // Allow_Field_Entry: 'N',
        createBy,
        createByIp,
      },
      {
        LeaveID: 28,
        companyMasterID: insert_db_status.companyMasterID,
        createBy,
        createByIp,
      },
      {
        LeaveID: 29,
        companyMasterID: insert_db_status.companyMasterID,
        createBy,
        createByIp,
      },
      {
        LeaveID: 30,
        companyMasterID: insert_db_status.companyMasterID,
        createBy,
        createByIp,
      },
      {
        LeaveID: 31,
        companyMasterID: insert_db_status.companyMasterID,
        createBy,
        createByIp,
      },
      {
        LeaveID: 32,
        companyMasterID: insert_db_status.companyMasterID,
        createBy,
        createByIp,
      },

      // Out Duty
      {
        LeaveID: 25,
        companyMasterID: insert_db_status.companyMasterID,
        createBy,
        createByIp,
      },
      // Leave Hrs
      {
        LeaveID: 35,
        companyMasterID: insert_db_status.companyMasterID,
        createBy,
        createByIp,
      },

      {
        LeaveID: HrLeaveTypesIds.WA,
        companyMasterID: insert_db_status.companyMasterID,
        createBy,
        createByIp,
      },
    );
    const taskTypeArray = [];
    taskTypeArray.push(
      {
        TaskStage: 'Assigned',
        companyMasterID: insert_db_status.companyMasterID,
        createBy,
        createByIp,
      },
      {
        TaskStage: 'Finished',
        companyMasterID: insert_db_status.companyMasterID,
        createBy,
        createByIp,
      },
    );
    // Attendance Bonus Data && Food Allowance

    const AddIncentiveTypes = [
      {
        incentivetypename: 'Attendance Bonus',
        showinsalaryslip: true,
        consider: 'gross',
        status: 1,
        companyMasterID: insert_db_status.companyMasterID,
        createBy,
        createByIp,
      },
      {
        incentivetypename: 'Food Allowance',
        showinsalaryslip: true,
        consider: 'gross',
        status: 1,
        companyMasterID: insert_db_status.companyMasterID,
        createBy,
        createByIp,
      },
      {
        incentivetypename: 'Tea/Coffee Allowance',
        inc_type_displayName: 'Tea/Coffee Allowance',
        showinsalaryslip: true,
        consider: 'gross',
        status: 1,
        companyMasterID: insert_db_status.companyMasterID,
        createBy,
        createByIp,
      },
      {
        incentivetypename: 'Extra Days',
        inc_type_displayName: 'Extra Days',
        showinsalaryslip: true,
        consider: 'gross',
        status: 1,
        companyMasterID: insert_db_status.companyMasterID,
        createBy,
        createByIp,
      },
    ];

    const addPenaltyTypes = [
      {
        penaltyName: defaultPenaltyNames.CANTEEN,
        penaltyAmount: 0,
        deductionFromSalary: true,
        companyMasterID: insert_db_status.companyMasterID,
        isDefault: true,
        createBy,
        createByIp,
      },
    ];

    if (parentCompanyMasterID) {
      const getActivePlan = await subscriptionPlan.findOne({
        where: {
          companyMasterID: parentCompanyMasterID,
          status: 1,
        },
        raw: true,
      });
      if (getActivePlan) {
        //Add 2 by-default roles for company -Admin -Employee
        {
          const totalPermission = await ProductPermission.findAll({
            raw: true,
            where: {
              productMasterID: getActivePlan.productMasterID,
              status: 1,
            },
            group: ['formMasterID'],
            attributes: ['formMasterID'],
          });
          const totalPermissionID = [];

          for (var item of totalPermission) {
            totalPermissionID.push(item.formMasterID);
          }

          let forms = await FormMaster.findAll({
            where: {
              status: 1,
              formMasterID: totalPermissionID,
            },
          });

          //Admin
          {
            let allrights = [];
            const insertAdminRole = await RoleMaster.create(
              {
                roleName: 'Admin',
                roleType: roleType.COMPANY_WISE,
                companyAccessType: 'ownPlusChildCompany',
                companyMasterID: insert_db_status.companyMasterID,
                createBy,
                createByIp,
              },
              { user: req.userDetails, transaction },
            );

            for (var i = 0; i < forms.length; i++) {
              const totaloperation = await ProductPermission.findAll({
                raw: true,
                where: {
                  productMasterID: getActivePlan.productMasterID,
                  formMasterID: forms[i].formMasterID,
                  status: 1,
                },
              });

              for (var j = 0; j < totaloperation.length; j++) {
                let givenright = {
                  roleMasterID: insertAdminRole.roleMasterID,
                  formMasterID: forms[i].formMasterID,
                  operationID: totaloperation[j].operationID,
                  createBy: createBy,
                  createByIp,
                };
                allrights.push(givenright);
              }
            }
            await RolePermission.bulkCreate(allrights, {
              user: req.userDetails,
              transaction,
            });
          }

          //Employee
          {
            let forms = await FormMaster.findAll({
              where: {
                status: 1,
                defaultRight: true,
                formMasterID: totalPermissionID,
              },
            });
            let allrights = [];
            const insertEmployeeRole = await RoleMaster.create(
              {
                roleName: 'Employee',
                roleType: roleType.COMPANY_WISE,
                companyAccessType: 'ownPlusChildCompany',
                companyMasterID: insert_db_status.companyMasterID,
                createBy,
                createByIp,
              },
              { user: req.userDetails, transaction },
            );

            for (var i = 0; i < forms.length; i++) {
              const totaloperation = await ProductPermission.findAll({
                raw: true,
                where: {
                  productMasterID: getActivePlan.productMasterID,
                  formMasterID: forms[i].formMasterID,
                  status: 1,
                },
              });

              for (var j = 0; j < totaloperation.length; j++) {
                let givenright = {
                  roleMasterID: insertEmployeeRole.roleMasterID,
                  formMasterID: forms[i].formMasterID,
                  operationID: totaloperation[j].operationID,
                  createBy: createBy,
                  createByIp,
                };
                allrights.push(givenright);
              }
            }

            await RolePermission.bulkCreate(allrights, {
              user: req.userDetails,
              transaction,
            });
          }
        }
      }
    }

    // attendance policy
    await AttendancePolicy.create(
      {
        attendanceInMobile: 'InOut',
        attendancePolicyName: 'Default Policy',
        automaticAssignShift: '1',
        coff: 'Overtime',
        companyMasterID: insert_db_status.companyMasterID,
        considerOvertimeAfter: 'totalworkinghours',
        considerWorkingHours: 'includingouthours',
        employeeESICPer: null,
        employerESICPer: null,
        esicApplicable: null,
        missPunchMinutes: 900,
        latePunchRestricted: true,
        monthDays: null,
        outsidePunchInPunchOut: '0',
        overtimeEntryAfterMin: 0,
        overtimeType: 'actual',
        payType: 'grossSalary',
        payheadMasterId: null,
        pfApplicable: null,
        preShiftHrsConsideration: 0,
        sandwichLeave: null,
        selfieAttendance: '0',
        selfieWithFaceDetection: 0,
        showinsalaryslip: 'false',
        singleMultiplePunchInPunchOut: 'Single',
        skipMinutesInOvertime: 10,
        WHPHPriority: 'WH',
        giveOTAs: 'Overtime',
        holidayCoff: 'Overtime',
        holidayCoffRuleIn: setHolidayCoffRulesIn.ATTENDANCE_POLICY,
        createBy: createBy,
        createByIp: createByIp,
      },
      { user: req.userDetails, transaction },
    );

    // create salary slip format
    await CompanySalarySlipFormat.create(
      {
        salarySlipFormatID: 1,
        companyMasterID: insert_db_status.companyMasterID,
      },
      { user: req.userDetails, transaction },
    );

    await HRSalaryFields.bulkCreate(hrSalaryFieldsArray, { transaction });

    await HRLeaveTypes.bulkCreate(leaveTypeArray, { transaction });

    // Attendance Bonus Data && Food Allowance

    await Incentivetype.bulkCreate(AddIncentiveTypes, {
      transaction,
      user: req.userDetails,
    });
    await Penalty.bulkCreate(addPenaltyTypes, {
      transaction,
      user: req.userDetails,
    });

    await Task_Stages.bulkCreate(taskTypeArray, {
      transaction,
      user: req.userDetails,
    });

    if (relationManagerID) {
      const relationManagerAssignDate = new Date();
      await CompanyManager.create(
        {
          companyMasterID: insert_db_status?.companyMasterID,
          userMasterID: +relationManagerID,
          assignDate: relationManagerAssignDate,
        },
        {
          user: req?.userDetails,
          transaction,
        },
      );
    }

    if (hrManagerID) {
      const hrManagerAssignDate = new Date();
      await CompanyManager.create(
        {
          companyMasterID: insert_db_status?.companyMasterID,
          userMasterID: +hrManagerID,
          assignDate: hrManagerAssignDate,
        },
        {
          user: req?.userDetails,
          transaction,
        },
      );
    }

    if (dealerID || marketingPersonID) {
      await CompanyMarketing.create(
        {
          companyMasterID: insert_db_status?.companyMasterID,
          dealerID: dealerID || null,
          marketingPersonID: marketingPersonID || null,
        },
        {
          user: req?.userDetails,
          transaction,
        },
      );
    }

    // create default skill Category
    const skillCategoryArray = getDefaultSkillCategoryArray_CompayWise(
      insert_db_status.companyMasterID,
      createBy,
      createByIp,
    );

    await CompanySkillCategory.bulkCreate(skillCategoryArray, { transaction });

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Company'),
      data: insert_db_status.companyMasterID,
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.postAddCompanyV2 = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    for (const key of Object.keys(req.body)) {
      if (
        req.body[key] == 'null' ||
        !req.body[key] ||
        req.body[key] == 'undefined'
      ) {
        req.body[key] = null;
      }
    }

    let {
      companyName,
      companyAddress,
      companyEmail,
      cpName,
      cpMobileNo,
      cpEmail,
      cityMasterID,
      productMasterID,
      totalUser,
      totalTracking,
      inquiryID,
      timezoneID,
    } = await req.body;
    const createBy = companyCreateByDefaultUser;
    const createByIp = null;
    const parentCompanyMasterID = 0;
    const CompanyServiceStatusID = 1;
    const weekOffSalaryType = null;
    const payheadMasterId = null;
    const ptDeduction = PTCalculationEnum.MONTHLY;
    const product = await ProductMaster.findByPk(productMasterID);
    // ── Idempotency guard: one payment → one company ─────────────────────────
    // If this inquiry already has a linked company, a company was created
    // during a previous (successful) verifySignature call. Return early to
    // prevent duplicate company creation (e.g. duplicate webhooks / retries).
    if (inquiryID) {
      const existingInquiry = await Inquiries.findOne({
        where: { inquiryID },
        attributes: ['inquiryID', 'companyMasterID', 'paymentStatus'],
      });

      if (existingInquiry && existingInquiry.companyMasterID) {
        await transaction.rollback();
        return res.status(409).json({
          status: 409,
          message:
            'A company has already been registered for this inquiry. Duplicate registration is not allowed.',
          data: existingInquiry.companyMasterID,
        });
      }

      // Also guard against creating a company without a verified payment

      if (existingInquiry && existingInquiry.paymentStatus !== 'success') {
        // Allow free trials or zero-price products to bypass payment check
        const isFree = product && Number(product.productPrice) === 0;

        if (!isFree) {
          await transaction.rollback();
          return res.status(400).json({
            status: 400,
            message:
              'Payment has not been verified for this inquiry. Company registration cannot proceed.',
          });
        }

        // Auto-mark as success for the free trial
        await Inquiries.update(
          {
            paymentStatus: 'success',
            paymentAmount: 0,
            paymentOrderId: 'FREE_TRIAL',
            paymentId: 'FREE_TRIAL',
          },
          { where: { inquiryID }, transaction },
        );
      }
    }

    // ── Validate required fields ─────────────────────────────────────────────
    if (!companyName || !String(companyName).trim()) {
      await transaction.rollback();
      return res.status(400).json({
        status: 400,
        message: 'Company name is required.',
      });
    }

    const find_company = await companyMaster.findOne({
      where: {
        parentCompanyMasterID: {
          [Sequelize.Op.ne]: 0,
        },
        companyMasterID: parentCompanyMasterID,
        status: 1,
      },
    });

    if (find_company) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: 'You can not add child company under child company.',
      });
    }
    const get_one_data = await companyMaster.findOne({
      where: {
        [Sequelize.Op.or]: [
          { companyMasterID: +parentCompanyMasterID || 0 },
          { parentCompanyMasterID: +parentCompanyMasterID || 0 },
          ...(!parentCompanyMasterID || +parentCompanyMasterID === 0
            ? [{ parentCompanyMasterID: null }]
            : []),
        ],
        [Sequelize.Op.and]: [
          Sequelize.where(
            Sequelize.fn(
              'LOWER',
              Sequelize.fn('TRIM', Sequelize.col('companyName')),
            ),
            Sequelize.Op.eq,
            companyName.trim().toLowerCase(),
          ),
        ],
        status: [0, 1],
      },
    });

    if (get_one_data) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyExists('Company With Same name'),
      });
    }

    let insert_db_status = await companyMaster.create(
      {
        companyName,
        companyAddress,
        companyEmail,
        cpName,
        cpMobileNo,
        cpEmail,
        parentCompanyMasterID,
        createBy,
        createByIp,
        cityMasterID,
        weekOffSalaryType,
        payheadMasterId,
        ptDeduction,
        inquiryID,
        timezoneID,
      },
      { transaction, hooks: false },
    );
    const companyId = insert_db_status.companyMasterID;

    // ✅ Generate code
    const companyCode = `${companyUniqueCodePrefix}${String(companyId).padStart(6, '0')}`;

    // ✅ Update in SAME transaction (important)
    await companyMaster.update(
      { uniqueCompanyCode: companyCode },
      {
        where: { companyMasterID: companyId },
        transaction, // ⚠️ add this
        hooks: false,
      },
    );

    if (productMasterID) {
      const start = moment();
      // Subtract 1 from duration to make the calculation inclusive
      const end = moment(start).add(Number(product.planDays || 7) - 1, 'days');
      const planStartDate = start.format('YYYY-MM-DD');
      const planEndDate = end.format('YYYY-MM-DD');
      const subscriptionTypeData =
        product &&
        typeof product.productPrice === 'number' &&
        product.productPrice === 0
          ? subscriptionTypes.TRIAL
          : subscriptionTypes.ORDER_RECEIVED;
      await CompanySubscriptionMaster.create(
        {
          companyMasterID: insert_db_status.companyMasterID,
          productMasterID,
          totalUser,
          totalTracking,
          startDate: planStartDate,
          endDate: planEndDate,
          subscriptionType:
            subscriptionTypeData || subscriptionTypes?.ORDER_RECEIVED,
          status: 1,
          createBy: createBy,
          createByIp: createByIp,
        },
        { transaction },
      );
    }

    if (inquiryID) {
      await Inquiries.update(
        { companyMasterID: companyId, completedStep: 2 },
        { where: { inquiryID }, transaction },
      );
    }

    if (parentCompanyMasterID == 0 || !parentCompanyMasterID) {
      //CompanyProgress Data

      await CompanyProgress.create(
        {
          CompanyServiceStatusID,
          companyMasterID: insert_db_status.companyMasterID,
          createBy,
          createByIp,
          updateBy: companyCreateByDefaultUser,
          updateByIp: null,
        },
        { hooks: false, transaction },
      );
    }

    let hrSalaryFieldsArray = [];
    hrSalaryFieldsArray.push(
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 17,
        salaryFieldSide: 'D',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'B',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 16,
        salaryFieldSide: 'D',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'B',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 1,
        salaryFieldSide: 'E',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'A',
        salaryFieldShow: 'N',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 43,
        salaryFieldSide: 'E',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'A',
        salaryFieldShow: 'N',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 9,
        salaryFieldSide: 'D',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'B',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 50,
        salaryFieldSide: 'E',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'A',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },

      {
        salaryFieldActive: 'Y',
        payheadMasterId: 92, // Net Salary
        salaryFieldSide: 'E',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'A',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },

      {
        salaryFieldActive: 'Y',
        payheadMasterId: 24,
        salaryFieldSide: 'E',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'A',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 34,
        salaryFieldSide: 'D',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'B',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 78,
        salaryFieldSide: 'D',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'B',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 83,
        salaryFieldSide: 'E',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'A',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 96,
        salaryFieldSide: 'D',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'B',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 97,
        salaryFieldSide: 'E',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'A',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 4, // pf
        salaryFieldSide: 'D',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'B',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 13, // ESI
        salaryFieldSide: 'D',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'B',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 5, // EPF
        salaryFieldSide: 'D',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'C',
        salaryFieldShow: 'N',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 12, // EPS
        salaryFieldSide: 'D',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'C',
        salaryFieldShow: 'N',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 66, // EDLI
        salaryFieldSide: 'D',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'C',
        salaryFieldShow: 'N',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 25, // Admin charges
        salaryFieldSide: 'D',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'C',
        salaryFieldShow: 'N',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 14, // Employer side ESIC
        salaryFieldSide: 'D',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'C',
        salaryFieldShow: 'N',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 67, // Leave Encashment
        salaryFieldSide: 'E',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'A',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 101, // Bonus Pay
        salaryFieldSide: 'E',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'A',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 15, // PT
        salaryFieldSide: 'D',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'B',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 147, // Weekoff Salary
        salaryFieldSide: 'E',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'A',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 2, // Basic
        salaryFieldSide: 'E',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'A',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 3, // HRA
        salaryFieldSide: 'E',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'A',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: 35, // DA
        salaryFieldSide: 'E',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'A',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: payheadMasterIdsMapping.EXPENSE_REIMBURSEMENT, // Expense Reimbursement
        salaryFieldSide: 'E',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'A',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        considerIn: payheadConsiderInEnum.NETSALARY,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: payheadMasterIdsMapping.PAID_LEAVE_HOURS, // Paid Leave Hours
        salaryFieldSide: 'E',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'A',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        considerIn: payheadConsiderInEnum.GROSS,
        createBy,
        createByIp,
      },
      {
        salaryFieldActive: 'Y',
        payheadMasterId: payheadMasterIdsMapping.SHORT_FALL_HOURS, // SHORT_FALL_HOURS
        salaryFieldSide: 'D',
        salaryFieldAttanChk: 1,
        salaryFieldRound: 'Y',
        salaryFieldSrNo: 'B',
        salaryFieldShow: 'Y',
        salaryFieldWhenMonth: [0],
        companyMasterID: insert_db_status.companyMasterID,
        roundOffType: '1',
        assignSalaryRound: 'Y',
        assignSalaryRoundOffType: 1,
        considerIn: payheadConsiderInEnum.GROSS,
        createBy,
        createByIp,
      },
    );

    const leaveTypeArray = [];
    leaveTypeArray.push(
      {
        LeaveID: 1,
        companyMasterID: insert_db_status.companyMasterID,
        // Allow_Field_Entry: 'Y',
        createBy,
        createByIp,
      },
      {
        LeaveID: 5,
        companyMasterID: insert_db_status.companyMasterID,
        // Allow_Field_Entry: 'N',
        createBy,
        createByIp,
      },
      {
        LeaveID: 6,
        companyMasterID: insert_db_status.companyMasterID,
        // Allow_Field_Entry: 'N',
        Leave_Allow: 'Y',
        createBy,
        createByIp,
      },
      {
        LeaveID: 9,
        companyMasterID: insert_db_status.companyMasterID,
        // Allow_Field_Entry: 'Y',
        createBy,
        createByIp,
      },
      {
        LeaveID: 7,
        companyMasterID: insert_db_status.companyMasterID,
        // Allow_Field_Entry: 'Y',
        createBy,
        createByIp,
      },
      {
        LeaveID: 18,
        companyMasterID: insert_db_status.companyMasterID,
        // Allow_Field_Entry: 'N',
        Leave_Allow: 'Y',
        createBy,
        createByIp,
      },
      {
        LeaveID: 20,
        companyMasterID: insert_db_status.companyMasterID,
        // Allow_Field_Entry: 'N',
        createBy,
        createByIp,
      },
      {
        LeaveID: 21,
        companyMasterID: insert_db_status.companyMasterID,
        // Allow_Field_Entry: 'N',
        createBy,
        createByIp,
      },
      {
        LeaveID: 22,
        companyMasterID: insert_db_status.companyMasterID,
        // Allow_Field_Entry: 'N',
        createBy,
        createByIp,
      },
      {
        LeaveID: 28,
        companyMasterID: insert_db_status.companyMasterID,
        createBy,
        createByIp,
      },
      {
        LeaveID: 29,
        companyMasterID: insert_db_status.companyMasterID,
        createBy,
        createByIp,
      },
      {
        LeaveID: 30,
        companyMasterID: insert_db_status.companyMasterID,
        createBy,
        createByIp,
      },
      {
        LeaveID: 31,
        companyMasterID: insert_db_status.companyMasterID,
        createBy,
        createByIp,
      },
      {
        LeaveID: 32,
        companyMasterID: insert_db_status.companyMasterID,
        createBy,
        createByIp,
      },

      // Out Duty
      {
        LeaveID: 25,
        companyMasterID: insert_db_status.companyMasterID,
        createBy,
        createByIp,
      },
      // Leave Hrs
      {
        LeaveID: 35,
        companyMasterID: insert_db_status.companyMasterID,
        createBy,
        createByIp,
      },

      {
        LeaveID: HrLeaveTypesIds.WA,
        companyMasterID: insert_db_status.companyMasterID,
        createBy,
        createByIp,
      },
    );
    const taskTypeArray = [];
    taskTypeArray.push(
      {
        TaskStage: 'Assigned',
        companyMasterID: insert_db_status.companyMasterID,
        createBy,
        createByIp,
      },
      {
        TaskStage: 'Finished',
        companyMasterID: insert_db_status.companyMasterID,
        createBy,
        createByIp,
      },
    );
    // Attendance Bonus Data && Food Allowance

    const AddIncentiveTypes = [
      {
        incentivetypename: 'Attendance Bonus',
        showinsalaryslip: true,
        consider: 'gross',
        status: 1,
        companyMasterID: insert_db_status.companyMasterID,
        createBy,
        createByIp,
      },
      {
        incentivetypename: 'Food Allowance',
        showinsalaryslip: true,
        consider: 'gross',
        status: 1,
        companyMasterID: insert_db_status.companyMasterID,
        createBy,
        createByIp,
      },
      {
        incentivetypename: 'Tea/Coffee Allowance',
        inc_type_displayName: 'Tea/Coffee Allowance',
        showinsalaryslip: true,
        consider: 'gross',
        status: 1,
        companyMasterID: insert_db_status.companyMasterID,
        createBy,
        createByIp,
      },
      {
        incentivetypename: 'Extra Days',
        inc_type_displayName: 'Extra Days',
        showinsalaryslip: true,
        consider: 'gross',
        status: 1,
        companyMasterID: insert_db_status.companyMasterID,
        createBy,
        createByIp,
      },
    ];

    const addPenaltyTypes = [
      {
        penaltyName: defaultPenaltyNames.CANTEEN,
        penaltyAmount: 0,
        deductionFromSalary: true,
        companyMasterID: insert_db_status.companyMasterID,
        isDefault: true,
        createBy,
        createByIp,
      },
    ];

    //Add 2 by-default roles for company -Admin -Employee
    {
      const totalPermission = await ProductPermission.findAll({
        raw: true,
        where: {
          productMasterID,
          status: 1,
        },
        group: ['formMasterID'],
        attributes: ['formMasterID'],
      });
      const totalPermissionID = [];

      for (var item of totalPermission) {
        totalPermissionID.push(item.formMasterID);
      }

      let forms = await FormMaster.findAll({
        where: {
          status: 1,
          formMasterID: totalPermissionID,
        },
      });

      //Admin
      {
        let allrights = [];
        const insertAdminRole = await RoleMaster.create(
          {
            roleName: 'Admin',
            roleType: roleType.COMPANY_WISE,
            companyAccessType: companyAccessType.OWN_PLUS_CHILD_COMPANY,
            companyMasterID: insert_db_status.companyMasterID,
            createBy,
            createByIp,
          },
          { hooks: false, transaction },
        );

        const adminFormMasterIDs = forms.map((f) => f.formMasterID);
        if (adminFormMasterIDs.length > 0) {
          const totaloperation = await ProductPermission.findAll({
            raw: true,
            where: {
              productMasterID,
              formMasterID: { [Sequelize.Op.in]: adminFormMasterIDs },
              status: 1,
            },
          });

          for (var j = 0; j < totaloperation.length; j++) {
            let givenright = {
              roleMasterID: insertAdminRole.roleMasterID,
              formMasterID: totaloperation[j].formMasterID,
              operationID: totaloperation[j].operationID,
              createBy: createBy,
              createByIp,
            };
            allrights.push(givenright);
          }
        }
        await RolePermission.bulkCreate(allrights, {
          hooks: false,
          transaction,
        });
      }

      //Employee
      {
        let forms = await FormMaster.findAll({
          where: {
            status: 1,
            defaultRight: true,
            formMasterID: totalPermissionID,
          },
        });
        let allrights = [];
        const insertEmployeeRole = await RoleMaster.create(
          {
            roleName: 'Employee',
            roleType: roleType.COMPANY_WISE,
            companyAccessType: companyAccessType.OWN_PLUS_CHILD_COMPANY,
            companyMasterID: insert_db_status.companyMasterID,
            createBy,
            createByIp,
          },
          { hooks: false, transaction },
        );

        const employeeFormMasterIDs = forms.map((f) => f.formMasterID);
        if (employeeFormMasterIDs.length > 0) {
          const totaloperation = await ProductPermission.findAll({
            raw: true,
            where: {
              productMasterID,
              formMasterID: { [Sequelize.Op.in]: employeeFormMasterIDs },
              status: 1,
            },
          });

          for (var j = 0; j < totaloperation.length; j++) {
            let givenright = {
              roleMasterID: insertEmployeeRole.roleMasterID,
              formMasterID: totaloperation[j].formMasterID,
              operationID: totaloperation[j].operationID,
              createBy: createBy,
              createByIp,
            };
            allrights.push(givenright);
          }
        }

        await RolePermission.bulkCreate(allrights, {
          hooks: false,
          transaction,
        });
      }
    }

    // attendance policy
    await AttendancePolicy.create(
      {
        attendanceInMobile: 'InOut',
        attendancePolicyName: 'Default Policy',
        automaticAssignShift: '1',
        coff: 'Overtime',
        companyMasterID: insert_db_status.companyMasterID,
        considerOvertimeAfter: 'totalworkinghours',
        considerWorkingHours: 'includingouthours',
        employeeESICPer: null,
        employerESICPer: null,
        esicApplicable: null,
        missPunchMinutes: 900,
        latePunchRestricted: true,
        monthDays: null,
        outsidePunchInPunchOut: '0',
        overtimeEntryAfterMin: 0,
        overtimeType: 'actual',
        payType: 'grossSalary',
        payheadMasterId: null,
        pfApplicable: null,
        preShiftHrsConsideration: 0,
        sandwichLeave: null,
        selfieAttendance: '0',
        selfieWithFaceDetection: 0,
        showinsalaryslip: 'false',
        singleMultiplePunchInPunchOut: 'Single',
        skipMinutesInOvertime: 10,
        createBy: createBy,
        createByIp: createByIp,
      },
      { hooks: false, transaction },
    );

    await CompanySalarySlipFormat.create(
      {
        salarySlipFormatID: 1,
        companyMasterID: insert_db_status.companyMasterID,
        createBy: companyCreateByDefaultUser,
        createByIp: null,
      },
      { hooks: false, transaction },
    );

    await HRSalaryFields.bulkCreate(hrSalaryFieldsArray, {
      transaction,
      hooks: false,
    });

    await HRLeaveTypes.bulkCreate(leaveTypeArray, { transaction });

    // Attendance Bonus Data && Food Allowance

    await Incentivetype.bulkCreate(AddIncentiveTypes, {
      transaction,
      user: req.userDetails,
    });
    await Penalty.bulkCreate(addPenaltyTypes, {
      transaction,
      user: req.userDetails,
    });

    await Task_Stages.bulkCreate(taskTypeArray, {
      transaction,
      user: req.userDetails,
    });

    // create default skill Category
    const skillCategoryArray = getDefaultSkillCategoryArray_CompayWise(
      insert_db_status.companyMasterID,
      createBy,
      createByIp,
    );

    await CompanySkillCategory.bulkCreate(skillCategoryArray, { transaction });

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Company'),
      data: insert_db_status.companyMasterID,
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getByCompanyMasterID = async (req, res, next) => {
  try {
    let get_one_data = await companyMaster.findOne({
      where: { companyMasterID: req.params.id },
      raw: true,
      include: [
        { model: CompanyType },
        {
          model: CityMaster,
          attributes: ['cityName', 'cityMasterID', 'stateMasterID'],
          include: {
            model: StateMaster,
            attributes: ['stateName', 'stateMasterID', 'countryMasterID'],
            include: {
              model: CountryMaster,
              attributes: ['countryName', 'countryMasterID'],
            },
          },
        },
      ],
    });
    const restrictedRole = await attendanceRestrictRole.findAll({
      where: { companyMasterID: req.params.id },
      attributes: ['companyMasterID', 'id', 'roleID', 'maxAttModDays'],
    });

    get_one_data.restRole = restrictedRole;

    return res.status(200).json({
      status: 200,
      message: message.usermessage.companyget,
      data: get_one_data,
    });
  } catch (err) {
    next(err.message);
  }
};

exports.postUpdatecompanyMaster = async (req, res, next) => {
  try {
    for (const key of Object.keys(req.body)) {
      if (
        req.body[key] == 'null' ||
        !req.body[key] ||
        req.body[key] == 'undefined'
      ) {
        req.body[key] = null;
      }
    }
    let {
      companyMasterID,
      companyName,
      companyAddress,
      companyWebsite,
      companyEmail,
      companyTypeid,
      cpName,
      cpMobileNo,
      cpEmail,
      parentCompanyMasterID,
      subCompanyRequired,
      employeeCodePattern,
      empCodeSeqLen,
      employeeCodeType,
      expenseDatePicker,
      otp = false,
      cityMasterID,
      status,
      panNumber,
      tanNumber,
      companyDescription,
      ownerName,
      ownerFatherName,
      tdsdeduction,
      uniqueEmpCode,
      cinNumber,
      fileUploadType,
      setUpTime,
      weekOffSalaryType = null,
      payheadMasterId = null,
      ptDeduction = PTCalculationEnum.MONTHLY,
      addUserStepper,
      timezoneID,
      otpForLogin = false,
      loginOtpMethod = loginOtpMethodENUM.EMAIL,
      distanceMethod,
      otBasedOn = OTBasedOnEnum.AUTO,
      isAttnStatusChangeable = true,
      empCodeAutoStartsFrom,
      probationType,
      probationValue,
      maxAttMod,
      restRole,
      isAttRestrict,
      isAttRemarkRequired = false,
    } = await req.body;

    addUserStepper = JSON.parse(addUserStepper);
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    const existCompanyData = await companyMaster.findOne({
      where: {
        companyMasterID: companyMasterID,
      },
    });

    if (!existCompanyData) {
      return res.status(200).json({
        status: 404,
        message: message.usermessage.notFoundMessage('Company'),
      });
    }
    if (otp == null || otp == undefined) {
      otp = existCompanyData.otp;
    }
    if (distanceMethod == null || distanceMethod == undefined) {
      distanceMethod = existCompanyData.distanceMethod;
    }
    if (probationType == probationTypeEnum.MONTH) {
      if (probationValue < 1 || probationValue > 30) {
        return res.status(200).json({
          status: 400,
          message:
            'probation for month can not be more then 30 and less then 1 ',
        });
      }
    } else if (probationType == probationTypeEnum.DAY) {
      if (probationValue < 1 || probationValue > 365) {
        return res.status(200).json({
          status: 400,
          message:
            'probation for days cannot be less then 1 and more then 365 ',
        });
      }
    }
    const condition = {
      companyMasterID: { [Sequelize.Op.ne]: companyMasterID },
      [Sequelize.Op.and]: [
        Sequelize.where(
          Sequelize.fn(
            'LOWER',
            Sequelize.fn('TRIM', Sequelize.col('companyName')),
          ),
          Sequelize.Op.eq,
          String(companyName).trim().toLowerCase(),
        ),
      ],
      status: [0, 1],
    };
    if (existCompanyData.parentCompanyMasterID) {
      // For Child Company
      condition[Sequelize.Op.or] = [
        {
          parentCompanyMasterID: existCompanyData.parentCompanyMasterID,
        },
        {
          companyMasterID: existCompanyData.parentCompanyMasterID,
        },
      ];
    } else {
      // For Parent Company
      condition.parentCompanyMasterID = existCompanyData.companyMasterID;
    }
    const get_one_data = await companyMaster.findOne({
      where: condition,
    });

    if (get_one_data) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyExists('Company With Same name'),
      });
    }
    if (
      !uniqueEmpCode ||
      uniqueEmpCode == 'undefined' ||
      uniqueEmpCode == 'null'
    )
      uniqueEmpCode = false;

    const employeecodepattern =
      employeeCodeType == employeeCodeTypes.PATTERN ||
      employeeCodeType == employeeCodeTypes.PATTERN_PLUS_AUTO_INCREMENT
        ? employeeCodePattern
        : null;
    empCodeSeqLen =
      employeeCodeType == employeeCodeTypes.PATTERN_PLUS_AUTO_INCREMENT
        ? empCodeSeqLen
        : null;

    let companyLogo = '';
    let authorizedSignature = '';
    let letterHead = '';

    if (req.files.companyLogo) {
      companyLogo = req.files.companyLogo[0].filename;
    } else {
      companyLogo = existCompanyData.companyLogo;
    }

    if (req.files.authorizedSignature) {
      authorizedSignature = req.files.authorizedSignature[0].filename;
    } else {
      authorizedSignature = existCompanyData.authorizedSignature;
    }

    if (req.files.letterHead) {
      letterHead = req.files.letterHead[0].filename;
    } else {
      letterHead = existCompanyData.letterHead;
    }

    const oldFilePath = path.join(
      __dirname,
      '..',
      './uploads/company/logo/',
      existCompanyData.companyLogo || '',
    );

    if (
      existCompanyData.companyLogo &&
      req.files.companyLogo &&
      fs.existsSync(oldFilePath)
    ) {
      fs.unlink(oldFilePath, (err) => {
        if (err) {
          return res.status(500).json({
            message: 'Error deleting the old company logo',
            error: err,
          });
        }
      });
    }

    const oldAuthorizedSignature = path.join(
      __dirname,
      '..',
      './uploads/company/signature/',
      existCompanyData.authorizedSignature || '',
    );

    if (
      existCompanyData.authorizedSignature &&
      req.files.authorizedSignature &&
      fs.existsSync(oldAuthorizedSignature)
    ) {
      fs.unlink(oldAuthorizedSignature, (err) => {
        if (err) {
          return res.status(500).json({
            message: 'Error deleting the old signature',
            error: err,
          });
        }
      });
    }

    const oldLetterHeadPath = path.join(
      __dirname,
      '..',
      './uploads/company/letterhead/',
      existCompanyData.letterHead || '',
    );

    if (
      existCompanyData.letterHead &&
      req.files.letterHead &&
      fs.existsSync(oldLetterHeadPath)
    ) {
      fs.unlink(oldLetterHeadPath, (err) => {
        if (err) {
          return res.status(500).json({
            message: 'Error deleting the old letter head',
            error: err,
          });
        }
      });
    }

    isAttnStatusChangeable = isAttnStatusChangeable == 'false' ? false : true;
    isAttRemarkRequired = isAttRemarkRequired == 'false' ? false : true;

    const transaction = await sequelize.transaction();

    try {
      await companyMaster.update(
        {
          companyName,
          companyAddress,
          companyLogo,
          companyWebsite,
          companyEmail,
          companyTypeid,
          cpName,
          cpMobileNo,
          cpEmail,
          subCompanyRequired,
          employeeCodePattern: employeecodepattern,
          empCodeSeqLen: empCodeSeqLen,
          employeeCodeType,
          expenseDatePicker,
          cityMasterID,
          otp,
          status,
          updateBy,
          updateByIp,
          panNumber,
          tanNumber,
          companyDescription,
          authorizedSignature,
          ownerName,
          ownerFatherName,
          tdsdeduction,
          uniqueEmpCode,
          cinNumber,
          fileUploadType,
          setUpTime,
          letterHead,
          weekOffSalaryType,
          payheadMasterId,
          ptDeduction,
          addUserStepper,
          ...(timezoneID != null && { timezoneID }),
          otpForLogin,
          loginOtpMethod,
          distanceMethod,
          otBasedOn,
          isAttnStatusChangeable,
          isAttRemarkRequired,
          empCodeAutoStartsFrom,
          probationType,
          probationValue,
          isAttRestrict: isAttRestrict,
        },
        {
          where: { companyMasterID: companyMasterID },
          transaction,
          user: req.userDetails,
          individualHooks: true,
        },
      );

      const roleData = await attendanceRestrictRole.findAll({
        where: { companyMasterID: companyMasterID },
      });

      if (roleData) {
        const roleDeleteID = roleData.map((i) => i.id);
        await attendanceRestrictRole.destroy({
          where: {
            id: {
              [Op.in]: roleDeleteID,
            },
          },
          transaction,
          user: req.userDetails,
          individualHooks: true,
        });
      }
      const finalRole = [];

      if (restRole) {
        for (const r of restRole.split(',')) {
          finalRole.push({
            roleID: r,
            companyMasterID: companyMasterID,
            maxAttModDays: maxAttMod,
          });
        }
      }

      if (finalRole.length > 0) {
        const createRole = await attendanceRestrictRole.bulkCreate(finalRole, {
          transaction,
          user: req.userDetails,
          individualHooks: true,
        });
      }

      // ----------------- for attendance correction request ------------------------

      const isChangeAttnStatusChangeable =
        existCompanyData.isAttnStatusChangeable !== isAttnStatusChangeable;

      if (isChangeAttnStatusChangeable) {
        const attendanceCorrectionRequest =
          await AttendanceCorrectionRequest.findAll({
            attributes: ['attendanceCorrectionRequestId'],
            where: {
              authorizationStatus: {
                [Sequelize.Op.in]: [
                  AuthorizationStatusType.PEDING_ONE,
                  AuthorizationStatusType.PEDING_TWO,
                  AuthorizationStatusType.PENDING_ZERO,
                ],
              },
              correctionStatus: {
                [Sequelize.Op.in]: [
                  correctionStatusEnum.STATUS_CHANGE,
                  correctionStatusEnum.TIME_UNCHANGE,
                ],
              },
            },
            include: [
              {
                model: UserMaster,
                as: 'employee',
                where: {
                  companyMasterId: existCompanyData.companyMasterID,
                },
                attributes: [],
              },
            ],
            transaction,
          });

        if (attendanceCorrectionRequest.length) {
          const correctionStatus = isAttnStatusChangeable
            ? correctionStatusEnum.STATUS_CHANGE
            : correctionStatusEnum.TIME_UNCHANGE;

          await AttendanceCorrectionRequest.update(
            { correctionStatus },
            {
              where: {
                attendanceCorrectionRequestId: {
                  [Sequelize.Op.in]: attendanceCorrectionRequest.map(
                    (e) => e.attendanceCorrectionRequestId,
                  ),
                },
              },
              transaction,
              individualHooks: true,
              user: req.userDetails,
            },
          );
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw new Error(error);
    }

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Company'),
      data: { companyLogo },
    });
  } catch (err) {
    next(err);
  }
};

exports.postDeleteCompanyById = async (req, res, next) => {
  try {
    let { companyMasterID } = await req.body;

    let data = await UserMaster.findOne({
      where: {
        companyMasterId: companyMasterID,
        status: ['1', '0'],
      },
    });

    if (data) {
      return res.status(200).json({
        status: 401,
        message:
          'You can not delete this Company. Already assigned to employees.',
      });
    }
    await companyMaster.destroy({
      where: { companyMasterID: companyMasterID },
      individualHooks: true,
      user: req.userDetails,
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('company'),
    });
  } catch (err) {
    next(err);
  }
};

exports.poststatuschange = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { companyMasterID, status } = await req.body;
    const userType = +req.userDetails.userType;
    if (userType == UserTypesEnum.USER_0 || userType == UserTypesEnum.USER_1) {
      if (status != '1') {
        const data = await UserMaster.findOne({
          where: {
            companyMasterId: companyMasterID,
            status: ['1', '0'],
          },
        });

        if (data) {
          await transaction.rollback();
          return res.status(200).json({
            status: 401,
            message:
              'You can not deactivate this Company. Already assigned to employees.',
          });
        }
      }
      await companyMaster.update(
        {
          status,
        },
        {
          where: { companyMasterID: companyMasterID },
          transaction,
          user: req.userDetails,
          individualHooks: true,
        },
      );
    } else {
      const existCompanyData = await companyMaster.findOne({
        where: {
          companyMasterID: companyMasterID,
        },
      });
      if (!existCompanyData) {
        await transaction.rollback();
        return res.status(200).json({
          status: 404,
          message: message.usermessage.notFoundMessage('Company'),
        });
      }
      const condition = {
        status: {
          [Sequelize.Op.ne]: 2,
        },
      };
      if (+existCompanyData.parentCompanyMasterID != 0) {
        // For Child Company
        condition[Sequelize.Op.or] = [
          {
            parentCompanyMasterID: existCompanyData.parentCompanyMasterID,
          },
          {
            companyMasterID: existCompanyData.parentCompanyMasterID,
          },
        ];
      } else {
        // For Child Company
        condition[Sequelize.Op.or] = [
          {
            parentCompanyMasterID: +companyMasterID,
          },
          {
            companyMasterID: +companyMasterID,
          },
        ];
      }
      const companyData = await companyMaster.findAll({
        where: condition,
      });
      const findParentCompany = companyData.find(
        (e) => +e.parentCompanyMasterID == 0,
      );
      const companyMasterIDs = companyData.map((e) => +e.companyMasterID);
      if (status == '1') {
        const updateCompanyArray = [];
        const userUpdateCondition = {
          status: 3,
        };
        if (+findParentCompany.companyMasterID == +companyMasterID) {
          updateCompanyArray.push(...companyMasterIDs);

          userUpdateCondition.companyMasterId = companyMasterIDs;
        } else {
          updateCompanyArray.push(companyMasterID);

          userUpdateCondition.companyMasterId = companyMasterID;
        }

        const findAllUsers = await UserMaster.findAll({
          where: userUpdateCondition,
        });
        const allUserNumbers = findAllUsers.map((e) => e.userNumber);

        const findUserWithSameNumber = await UserMaster.findAll({
          where: {
            userNumber: {
              [Sequelize.Op.in]: allUserNumbers,
            },
            status: 1,
          },
        });

        const toBeDeActiveUserIDs = new Set();
        for (let user of findUserWithSameNumber) {
          const findUser = findAllUsers.find(
            (e) => e.userNumber == user.userNumber,
          );
          toBeDeActiveUserIDs.add(findUser.userMasterID);
        }
        const toBeActiveUserIDsArray = [...toBeDeActiveUserIDs];
        const toBeActiveUserIDs = findAllUsers
          .filter((e) => !toBeActiveUserIDsArray.includes(e.userMasterID))
          .map((item) => item.userMasterID);

        if (toBeActiveUserIDsArray.length) {
          await UserMaster.update(
            {
              status: 0,
            },
            {
              where: userUpdateCondition,
            },
          );
        }
        if (toBeActiveUserIDs.length) {
          await UserMaster.update(
            {
              status: 1,
            },
            {
              where: userUpdateCondition,
            },
          );
        }
        await companyMaster.update(
          {
            status,
          },
          {
            where: {
              companyMasterID: {
                [Sequelize.Op.in]: updateCompanyArray,
              },
            },
            transaction,
            user: req.userDetails,
            individualHooks: true,
          },
        );
      } else {
        const updateCompanyArray = [];
        const userUpdateCondition = {
          status: 1,
        };
        if (+findParentCompany.companyMasterID == +companyMasterID) {
          updateCompanyArray.push(...companyMasterIDs);
          userUpdateCondition.companyMasterId = companyMasterIDs;
        } else {
          userUpdateCondition.companyMasterId = companyMasterID;
          updateCompanyArray.push(companyMasterID);
        }
        await UserMaster.update(
          {
            status: 3,
          },
          {
            where: userUpdateCondition,
          },
        );
        await companyMaster.update(
          {
            status,
          },
          {
            where: {
              companyMasterID: {
                [Sequelize.Op.in]: updateCompanyArray,
              },
            },
            transaction,
            user: req.userDetails,
            individualHooks: true,
          },
        );
      }
    }
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message:
        status == '1'
          ? message.usermessage.activeMessage('Company')
          : message.usermessage.deactiveMessage('Company'),
      data: {},
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getCompanyByParentCompany = async (req, res, next) => {
  try {
    let {
      limit,
      page,
      searchQuery,
      startdate,
      enddate,
      exportData,
      companyMasterID,
    } = await req.body;
    const paginationQuery = {};
    if (!exportData && page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const companyCondition = {
      status: [0, 1],
      [Sequelize.Op.and]: [
        {
          [Sequelize.Op.or]: [
            { parentCompanyMasterID: companyMasterID },
            { companyMasterID: companyMasterID },
          ],
        },
      ],
    };

    if (searchQuery) {
      companyCondition[Sequelize.Op.and].push({
        [Sequelize.Op.or]: [
          { companyName: { [Sequelize.Op.iLike]: `%${searchQuery}%` } },
          { companyEmail: { [Sequelize.Op.iLike]: `%${searchQuery}%` } },
          {
            '$cityMaster.cityName$': {
              [Sequelize.Op.iLike]: `%${searchQuery}%`,
            },
          },
        ],
      });
    }

    if (startdate && enddate) {
      companyCondition[Sequelize.Op.and].push({
        createdAt: {
          [Sequelize.Op.between]: [new Date(startdate), new Date(enddate)],
        },
      });
    }
    const order = [
      ['parentCompanyMasterID', 'ASC'],
      ['companyMasterID', 'ASC'],
    ];
    const { rows: company_master, count: totalcount } =
      await companyMaster.findAndCountAll({
        where: companyCondition,
        ...paginationQuery,
        order,
        include: [
          {
            model: CityMaster,
            as: 'cityMaster',
            include: {
              model: StateMaster,
              include: {
                model: CountryMaster,
              },
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
      const finalData = [];
      for (let company of company_master) {
        const companyDataObject = {
          'Company Unique Code': company.uniqueCompanyCode,
          'Company Name': company.companyName,
          'Company E-Mail': company.companyEmail,
          'Company WebSite': company.companyWebsite,
          'Company Type': company.companyType?.companyTypename,
          'Company Owner Name': company.ownerName,
          'Company Father Name': company.ownerFatherName,
          'Company Contact Person Name': company.cpName,
          'Company Contact Person Mobile No.': company.cpMobileNo,
          'Company Contact Person E-mail': company.cpEmail,
          'Company Address': company.companyAddress,
          'Company Country':
            company.cityMaster?.stateMaster?.countryMaster?.countryName,
          'Company State': company.cityMaster?.stateMaster?.stateName,
          'Company City': company.cityMaster?.cityName,
          'Pan Number': company.panNumber,
          'Tan Number': company.tanNumber,
          'CIN Number': company.cinNumber,
          'TDS Deduction': company.tdsdeduction == true ? 'YES' : 'NO',
          'Company Created By': company.createByUser?.displayName || '',
          'Company Updated By': company.updateByUser?.displayName || '',
          Status: company.status == 1 ? 'Active' : 'De-Active',
        };
        finalData.push(companyDataObject);
      }

      await generateExcel(finalData, 'Company', 'xlsx', res);
      return;
    }

    return res.status(200).json({
      status: 200,
      message: message.usermessage.companyget,
      data: company_master,
      totalcount,
    });
  } catch (err) {
    next(err);
  }
};

exports.getCompanyListByCompanyAccessType = async (req, res, next) => {
  try {
    const currCompany = await companyMaster.findOne({
      where: { companyMasterID: req.body.companyMasterID, status: 1 },
      raw: true,
      include: [
        {
          model: CityMaster,
          attributes: ['cityName', 'stateMasterID'],
          include: [
            {
              model: StateMaster,
              attributes: ['stateName', 'countryMasterID'],
              include: [
                {
                  model: CountryMaster,
                  attributes: ['countryName'],
                },
              ],
            },
          ],
        },
        { model: CompanyType },
      ],
    });
    if (req.userDetails && req.userDetails.role) {
      if (
        req.userDetails.role.companyAccessType == companyAccessType.OWN_COMPANY
      ) {
        return res.status(200).json({
          status: 200,
          message: message.usermessage.fetchMessage('Company'),
          data: [currCompany],
        });
      }
    }
    const order = [['companyName', 'ASC']];

    const allChildCompany = await companyMaster.findAll({
      where: {
        [Sequelize.Op.or]: [
          { companyMasterID: req.body.companyMasterID },
          { parentCompanyMasterID: req.body.companyMasterID },
        ],
        status: 1,
      },
      order,
      raw: true,
      include: [
        {
          model: CityMaster,
          attributes: ['cityName', 'stateMasterID'],
          include: [
            {
              model: StateMaster,
              attributes: ['stateName', 'countryMasterID'],
              include: [
                {
                  model: CountryMaster,
                  attributes: ['countryName'],
                },
              ],
            },
          ],
        },
        { model: CompanyType },
      ],
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.fetchMessage('Company'),
      data: allChildCompany,
    });
  } catch (err) {
    next(err);
  }
};

function getFirstAndLastDateOfCurrentMonth() {
  // Get current date
  const currentDate = new Date();

  // Get the first day of the current month in UTC
  const firstDate = new Date(
    Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), 1),
  );

  // Get the last day of the current month in UTC
  const lastDate = new Date(
    Date.UTC(
      currentDate.getUTCFullYear(),
      currentDate.getUTCMonth() + 1, // next month
      0, // last day of the current month
      23,
      59,
      59,
      999, // set to the very last moment of the day
    ),
  );

  // Return the first and last date in YYYY-MM-DD format
  return {
    firstDate: firstDate.toISOString().split('T')[0],
    lastDate: lastDate.toISOString().split('T')[0],
  };
}

exports.postUpdateCustomerPreference = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { companyMasterID, customerListPreference } = req.body;

    await companyMaster.update(
      { customerListPreference },
      {
        where: { companyMasterID: companyMasterID },
        transaction,
        user: req.userDetails,
        individualHooks: true,
      },
    );
    await transaction.commit();
    return res.status(200).json({ status: 200, message: 'success' });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getCompanySubscriptionPlanAnalyticsData = async (req, res, next) => {
  try {
    const { productMasterID } = req.query;
    const userType = +req.userDetails.userType;
    const loggedInUserMasterID = +req.userDetails.userMasterId;
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const productCondition = { status: 1 };
    if (productMasterID) {
      productCondition.productMasterID = productMasterID;
    }
    const companyMarketingCondition = {};
    const companyCondition = { parentCompanyMasterID: 0, status: [0, 1] };
    if (userType == UserTypesEnum.DEALER) {
      companyMarketingCondition.dealerID = loggedInUserMasterID;
    } else if (userType == UserTypesEnum.MARKETING_PERSON) {
      companyMarketingCondition.marketingPersonID = loggedInUserMasterID;
    }
    const companyManagerCondition = {};
    if (userType == UserTypesEnum.RM) {
      companyManagerCondition.admin == UserTypesEnum.RM;
    } else if (userType == UserTypesEnum.HRM) {
      companyManagerCondition.admin == UserTypesEnum.HRM;
    }

    let findUserTypeWiseCompanyData = [];
    if (
      userType == UserTypesEnum.DEALER ||
      userType == UserTypesEnum.MARKETING_PERSON
    ) {
      findUserTypeWiseCompanyData = await CompanyMarketing.findAll({
        where: companyMarketingCondition,
      });
      const userTypeCompanyMasterIDs = findUserTypeWiseCompanyData.map(
        (e) => +e.companyMasterID,
      );
      companyCondition.companyMasterID = userTypeCompanyMasterIDs;
    } else if (userType == UserTypesEnum.RM || userType == UserTypesEnum.HRM) {
      findUserTypeWiseCompanyData = await CompanyManager.findAll({
        where: {
          status: 1,
          assignDate: { [Sequelize.Op.lte]: new Date(currentDate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
          userMasterID: loggedInUserMasterID,
        },
        include: [
          {
            model: UserMaster,
            where: companyManagerCondition,
            attributes: [...userAttributes, 'admin'],
          },
        ],
      });
      const userTypeCompanyMasterIDs = findUserTypeWiseCompanyData.map(
        (e) => +e.companyMasterID,
      );
      companyCondition.companyMasterID = userTypeCompanyMasterIDs;
    }

    const companySubscriptionData = await CompanySubscriptionMaster.findAll({
      attributes: [
        'productMasterID',
        [
          Sequelize.fn(
            'COUNT',
            Sequelize.literal(
              `CASE WHEN "companyMaster"."status" = 1 AND "companySubscription"."endDate" >= '${currentDate}' THEN 1 END`,
            ),
          ),
          'activeCount',
        ],
        [
          Sequelize.fn(
            'COUNT',
            Sequelize.literal(
              `CASE WHEN "companyMaster"."status" = 0 THEN 1 END`,
            ),
          ),
          'deactiveCount',
        ],
        [
          Sequelize.fn(
            'COUNT',
            Sequelize.literal(
              `CASE WHEN "companyMaster"."status" = 1 AND "companySubscription"."endDate" < '${currentDate}' THEN 1 END`,
            ),
          ),
          'expiredCount',
        ],
        [
          Sequelize.fn(
            'COUNT',
            Sequelize.col('companySubscription.productMasterID'),
          ),
          'count',
        ],
        [Sequelize.col('productMaster.productName'), 'productName'],
      ],
      include: [
        {
          model: ProductMaster,
          attributes: [],
          where: productCondition,
        },
        {
          model: companyMaster,
          attributes: [],
          where: companyCondition,
        },
      ],
      where: { status: 1 },
      group: [
        'companySubscription.productMasterID',
        'productMaster.productName',
      ],
      order: [
        [
          Sequelize.fn(
            'COUNT',
            Sequelize.col('companySubscription.productMasterID'),
          ),
          'DESC',
        ],
      ],
      raw: true,
    });

    return res.status(200).json({ status: 200, data: companySubscriptionData });
  } catch (err) {
    next(err);
  }
};

exports.getCompanyTree = async (req, res, next) => {
  try {
    const companyMasterID = req?.userDetails?.companyMasterId;
    const allCompanies = await getParentChildCompany(companyMasterID);
    return res.status(200).json({ status: 200, data: allCompanies });
  } catch (err) {
    next(err);
  }
};

exports.getUser = async (req, res, next) => {
  try {
    const { companyMasterID, searchQuery, page, limit, userMasterID } =
      req.body;
    const reqCompanyMasterID = req?.userDetails?.companyMasterId;
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const allCompanies = await getParentChildCompany(reqCompanyMasterID);
    const allCompanyIDs = allCompanies.map(
      (company) => company?.companyMasterID,
    );

    if (!allCompanyIDs.includes(companyMasterID))
      return res.status(200).json({
        status: 200,
        data: [],
      });

    const paginationQuery =
      page && limit
        ? {
            limit,
            offset: (page - 1) * limit,
          }
        : {};

    const condition = {
      companyMasterId: companyMasterID,
      status: 1,
    };

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          displayName: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          userNumber: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          '$employeeJoiningDetails.employeeCode$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
      ];
    if (userMasterID && userMasterID.length > 0) {
      condition.userMasterID = userMasterID;
    }
    const userData = await UserMaster.findAndCountAll({
      where: condition,
      ...paginationQuery,
      order: [['displayName', 'ASC']],
      attributes: [
        'userMasterID',
        'displayName',
        'firstName',
        'lastName',
        'photo',
        'companyMasterId',
        // displayName ( employeeCode ) - userNumber
        [
          Sequelize.literal(`
              "userMaster"."displayName" ||
              CASE
                WHEN "employeeJoiningDetails"."employeeCode" IS NOT NULL
                 AND "employeeJoiningDetails"."employeeCode" != ''
                THEN ' ( ' || "employeeJoiningDetails"."employeeCode" || ' )'
                ELSE ''
              END || ' - ' || "userMaster"."userNumber"
            `),
          'displayNameWithCodeAndNumber',
        ],
      ],
      subQuery: false,
      include: [
        {
          required: false,
          model: EmployeeJoiningDetails,
          attributes: ['employeeCode'],
        },
        {
          required: false,
          model: EmployeeDesignation,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date() },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date() } },
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
      ],
    });

    return res.status(200).json({
      status: 200,
      data: userData.rows,
      totalcount: userData.count,
    });
  } catch (error) {
    next(error);
  }
};

exports.removeCompanyLogoAndAuthSign = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { companyMasterID, imageType } = await req.body;

    const company = await companyMaster.findOne({
      where: { companyMasterID },
      attributes: ['companyLogo', 'authorizedSignature', 'letterHead'],
    });
    if (imageType === 'companyLogo') {
      const logoPath = path.join(
        __dirname,
        '../uploads/company/logo/',
        company.companyLogo,
      );
      if (fs.existsSync(logoPath)) {
        fs.unlinkSync(logoPath);
      }
      await companyMaster.update(
        {
          companyLogo: '',
        },
        {
          where: { companyMasterID: companyMasterID },
          transaction,
          user: req.userDetails,
          individualHooks: true,
        },
      );
      await transaction.commit();
      return res.status(200).json({
        status: 200,
        message: message.usermessage.deleteMessage('Company Logo'),
      });
    } else if (imageType === 'authorizedSignature') {
      const logoPath = path.join(
        __dirname,
        '../uploads/company/signature/',
        company.authorizedSignature,
      );
      if (fs.existsSync(logoPath)) {
        fs.unlinkSync(logoPath);
      }

      await companyMaster.update(
        {
          authorizedSignature: '',
        },
        {
          where: { companyMasterID: companyMasterID },
          transaction,
          user: req.userDetails,
          individualHooks: true,
        },
      );
      await transaction.commit();
      return res.status(200).json({
        status: 200,
        message: message.usermessage.deleteMessage('Authorized Signature'),
      });
    } else {
      const logoPath = path.join(
        __dirname,
        '../uploads/company/letterHead/',
        company.letterHead,
      );
      if (fs.existsSync(logoPath)) {
        fs.unlinkSync(logoPath);
      }

      await companyMaster.update(
        {
          letterHead: '',
        },
        {
          where: { companyMasterID: companyMasterID },
          transaction,
          user: req.userDetails,
          individualHooks: true,
        },
      );

      await transaction.commit();

      return res.status(200).json({
        status: 200,
        message: message.usermessage.deleteMessage('Letter Head'),
      });
    }
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.allChildParentCompanyList = async (req, res, next) => {
  try {
    let {
      limit,
      page,
      searchQuery,
      startdate,
      enddate,
      exportData,
      adminDashboardType,
      companyType, //Child Parent All
      productMasterID,
      userMasterID,
      companyStageID,
    } = req.body;
    let userType = +req.userDetails.userType;
    const loggedInUserMasterID = userMasterID
      ? userMasterID
      : +req.userDetails.userMasterId;
    if (userMasterID) {
      const findUserDataForUserType = await UserMaster.findOne({
        where: {
          userMasterID,
        },
      });
      if (findUserDataForUserType) {
        userType = +findUserDataForUserType.admin;
      }
    }
    const companyStageCondition = {};
    if (companyStageID) {
      companyStageCondition.CompanyServiceStatusID = companyStageID;
    }
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const paginationQuery = {};
    const companyCondition = { status: [0, 1] };
    const subscriptionCondition = { status: 1 };

    const companyMarketingCondition = {};
    if (userType == UserTypesEnum.DEALER) {
      companyMarketingCondition.dealerID = loggedInUserMasterID;
    } else if (userType == UserTypesEnum.MARKETING_PERSON) {
      companyMarketingCondition.marketingPersonID = loggedInUserMasterID;
    }
    const companyManagerCondition = {};
    if (userType == UserTypesEnum.RM) {
      companyManagerCondition.admin == UserTypesEnum.RM;
    } else if (userType == UserTypesEnum.HRM) {
      companyManagerCondition.admin == UserTypesEnum.HRM;
    }

    if (!exportData && page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = +limit;
    }
    const order = [['companyMasterID', 'ASC']];
    if (searchQuery) {
      companyCondition.companyName = {
        [Sequelize.Op.iLike]: '%' + searchQuery + '%',
      };
    }
    if (startdate && enddate) {
      companyCondition.createdAt = {
        [Sequelize.Op.between]: [new Date(startdate), new Date(enddate)],
      };
    }
    const currMonthDate = getFirstAndLastDateOfCurrentMonth();

    if (adminDashboardType) {
      if (
        adminDashboardType == adminDashboardTypesObj.TOTAL_EXPIRED_PLAN_COMPANY
      ) {
        companyCondition.status = 1;
        subscriptionCondition.endDate = {
          [Sequelize.Op.lt]: currentDate,
        };
      } else if (
        adminDashboardType ==
        adminDashboardTypesObj.TOTAL_CURRENT_MONTH_RENEWAL_COMPANY
      ) {
        companyCondition.status = 1;
        subscriptionCondition[Sequelize.Op.and] = [
          { endDate: { [Sequelize.Op.gte]: currMonthDate.firstDate } },
          { endDate: { [Sequelize.Op.lte]: currMonthDate.lastDate } },
        ];
      } else if (
        adminDashboardType == adminDashboardTypesObj.TOTAL_DEACTIVE_COMPANY ||
        adminDashboardType == adminDashboardTypesObj.TOTAL_ACTIVE_COMPANY ||
        adminDashboardType == adminDashboardTypesObj.TOTAL_COMPANY
      ) {
        if (
          adminDashboardType == adminDashboardTypesObj.TOTAL_DEACTIVE_COMPANY
        ) {
          companyCondition.status = 0;
        } else if (
          adminDashboardType == adminDashboardTypesObj.TOTAL_ACTIVE_COMPANY
        ) {
          companyCondition.status = 1;
          subscriptionCondition.endDate = {
            [Sequelize.Op.gte]: currentDate,
          };
        } else if (adminDashboardType == adminDashboardTypesObj.TOTAL_COMPANY) {
          companyCondition.status = [0, 1];
        }
      }
    }

    let findUserTypeWiseCompanyData = [];
    if (
      userType == UserTypesEnum.DEALER ||
      userType == UserTypesEnum.MARKETING_PERSON
    ) {
      findUserTypeWiseCompanyData = await CompanyMarketing.findAll({
        where: companyMarketingCondition,
      });
    } else if (userType == UserTypesEnum.RM || userType == UserTypesEnum.HRM) {
      findUserTypeWiseCompanyData = await CompanyManager.findAll({
        where: {
          status: 1,
          assignDate: { [Sequelize.Op.lte]: new Date(currentDate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
          userMasterID: loggedInUserMasterID,
        },
        include: [
          {
            model: UserMaster,
            where: companyManagerCondition,
            attributes: [...userAttributes, 'admin'],
          },
        ],
      });
    }
    const userTypeCompanyMasterIDs = findUserTypeWiseCompanyData.map(
      (e) => +e.companyMasterID,
    );
    if (
      userType == UserTypesEnum.DEALER ||
      userType == UserTypesEnum.MARKETING_PERSON ||
      userType == UserTypesEnum.RM ||
      userType == UserTypesEnum.HRM
    ) {
      if (companyType) {
        if (companyTypes.PARENT_COMPANY == companyType) {
          companyCondition.parentCompanyMasterID = 0;
          companyCondition.companyMasterID = userTypeCompanyMasterIDs;
        } else if (companyTypes.CHILD_COMPANY == companyType) {
          companyCondition.parentCompanyMasterID = { [Sequelize.Op.ne]: 0 };
        } else {
          companyCondition[Sequelize.Op.or] = [
            { companyMasterID: userTypeCompanyMasterIDs },
            { parentCompanyMasterID: userTypeCompanyMasterIDs },
          ];
        }
      } else {
        companyCondition[Sequelize.Op.or] = [
          { companyMasterID: userTypeCompanyMasterIDs },
          { parentCompanyMasterID: userTypeCompanyMasterIDs },
        ];
      }
    } else {
      if (companyType) {
        if (companyTypes.PARENT_COMPANY == companyType) {
          companyCondition.parentCompanyMasterID = 0;
        } else if (companyTypes.CHILD_COMPANY == companyType) {
          companyCondition.parentCompanyMasterID = { [Sequelize.Op.ne]: 0 };
        }
      }
    }

    if (productMasterID) {
      subscriptionCondition.productMasterID = productMasterID;
    }

    const baseInclude = [
      {
        required: adminDashboardType ? true : false,
        model: CompanySubscriptionMaster,
        where: subscriptionCondition,
        attributes: [
          'companyPlanMasterID',
          'productMasterID',
          'startDate',
          'endDate',
          'totalUser',
          'totalTracking',
          'status',
          'subscriptionType',
        ],
        include: [
          {
            model: ProductMaster,
            attributes: ['productName', 'productCode'],
          },
        ],
      },
      {
        model: CityMaster,
        attributes: ['cityName', 'stateMasterID'],
        include: [
          {
            model: StateMaster,
            attributes: ['stateName', 'countryMasterID'],
            include: [
              {
                model: CountryMaster,
                attributes: ['countryName'],
              },
            ],
          },
        ],
      },
      {
        required: false,
        model: CompanyType,
        attributes: ['companyTypename', 'companyTypeID'],
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
      {
        required: false,
        model: CompanyMarketing,
        include: [
          {
            required: false,
            model: UserMaster,
            as: 'marketingPerson',
            attributes: userAttributes,
          },
          {
            required: false,
            model: UserMaster,
            as: 'dealer',
            attributes: userAttributes,
          },
        ],
      },
      {
        required: false,
        model: CompanyManager,
        where: {
          status: 1,
          assignDate: { [Sequelize.Op.lte]: new Date(currentDate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        include: [
          {
            required: false,
            model: UserMaster,
            attributes: [...userAttributes, 'admin'],
          },
        ],
      },
    ];

    const companyProgressInclude = {
      required: false,
      model: CompanyProgress,
      separate: true,
      limit: 1,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: CompanyServiceStatus,
          attributes: ['CompanyServiceStatusName', 'CompanyServiceStatusID'],
        },
      ],
    };

    // 🔹 Prepare base query options
    const queryOptions = {
      distinct: true,
      where: companyCondition,
      ...paginationQuery,
      order,
      include: [companyProgressInclude, ...baseInclude],
    };

    // 🔹 If companyStageID is given, modify where clause
    if (companyStageID) {
      queryOptions.where = {
        ...companyCondition,
        [Sequelize.Op.and]: Sequelize.literal(`
      "companyMaster"."companyMasterID" IN (
        SELECT cp."companyMasterID"
        FROM "companyProgresses" cp
        WHERE cp."CompanyServiceStatusID" = ${sequelize.escape(companyStageID)}
          AND cp."companyProgressID" = (
            SELECT sub."companyProgressID"
            FROM "companyProgresses" sub
            WHERE sub."companyMasterID" = cp."companyMasterID"
            ORDER BY sub."createdAt" DESC
            LIMIT 1
          )
      )
    `),
      };
    }

    // 🔹 Execute final query
    const { rows: responseCompanyMasterData, count } =
      await companyMaster.findAndCountAll(queryOptions);

    const findAllParentCompanies = await companyMaster.findAll({
      where: {
        parentCompanyMasterID: 0,
      },
    });

    for (let company of responseCompanyMasterData) {
      let parentCompanyName = null;
      if (company.parentCompanyMasterID != 0) {
        const parentcompany = findAllParentCompanies.find(
          (e) => +e.companyMasterID == +company.parentCompanyMasterID,
        );
        parentCompanyName = parentcompany ? parentcompany.companyName : '';
      }
      company.dataValues.parentCompanyName = parentCompanyName;
    }

    if (exportData) {
      const finalData = [];
      for (let company of responseCompanyMasterData) {
        const companyDataObject = {
          'Company ID': company.companyMasterID,
          'Company Unique Code': company.uniqueCompanyCode,
          'Parent Company Name': company.dataValues.parentCompanyName,
          'Company Status':
            company.companyProgresses?.[0]?.companyServiceStatus
              ?.CompanyServiceStatusName || '',
          'Company Name': company.companyName,
          'Company E-Mail': company.companyEmail,
          'Company WebSite': company.companyWebsite,
          'Company Type': company.companyType?.companyTypename,
          'Company Owner Name': company.ownerName,
          'Company Father Name': company.ownerFatherName,
          'Company Contact Person Name': company.cpName,
          'Company Contact Person Mobile No.': company.cpMobileNo,
          'Company Contact Person E-mail': company.cpEmail,
          'Company Address': company.companyAddress,
          'Company Country':
            company.cityMaster?.stateMaster?.countryMaster?.countryName,
          'Company State': company.cityMaster?.stateMaster?.stateName,
          'Company City': company.cityMaster?.cityName,
          'Pan Number': company.panNumber,
          'Tan Number': company.tanNumber,
          'CIN Number': company.cinNumber,
          'TDS Deduction': company.tdsdeduction == true ? 'YES' : 'NO',
          'SubScription Type':
            company.companySubscriptions?.[0]?.subscriptionType || '',
          'SubScription Plan Name':
            company.companySubscriptions?.[0]?.productMaster?.productName || '',
          'SubScription Plan Code':
            company.companySubscriptions?.[0]?.productMaster?.productCode || '',
          'SubScription Start Date':
            company.companySubscriptions &&
            company.companySubscriptions.length > 0
              ? moment(
                  company.companySubscriptions[0].startDate,
                  'YYYY-MM-DD',
                ).format('YYYY-MM-DD')
              : '',
          'SubScription End Date':
            company.companySubscriptions &&
            company.companySubscriptions.length > 0
              ? moment(
                  company.companySubscriptions[0].endDate,
                  'YYYY-MM-DD',
                ).format('YYYY-MM-DD')
              : '',
          'SubScription Users':
            company.companySubscriptions?.[0]?.totalUser || '',
          'SubScription Total Traking Users':
            company.companySubscriptions?.[0]?.totalTracking || '',
          'Company Created By': company.createByUser?.displayName || '',
          'Company Updated By': company.updateByUser?.displayName || '',
          'Marketing Person':
            company.companyMarketings?.[0]?.marketingPerson?.displayName || '',
          Dealer: company.companyMarketings?.[0]?.dealer?.displayName || '',
          RM:
            company.companyManagers
              ?.filter((m) => m.userMaster?.admin == UserTypesEnum.RM)
              .map((m) => m.userMaster?.displayName)
              .filter(Boolean)
              .join(', ') || '',
          HRM:
            company.companyManagers
              ?.filter((m) => m.userMaster?.admin == UserTypesEnum.HRM)
              .map((m) => m.userMaster?.displayName)
              .filter(Boolean)
              .join(', ') || '',
          Status: company.status == 1 ? 'Active' : 'Deactive',
        };
        finalData.push(companyDataObject);
      }

      await generateExcel(finalData, 'Company', 'xlsx', res);
      return;
    }

    return res.status(200).json({
      status: 200,
      data: responseCompanyMasterData,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};

exports.getallCompanyWiseCompanyAndBranchData = async (req, res, next) => {
  try {
    const companyMasterID = req.userDetails.companyMasterId;
    const existCompanyData = await companyMaster.findOne({
      where: {
        companyMasterID: companyMasterID,
      },
    });
    const condition = {
      status: 1,
    };
    if (+existCompanyData.parentCompanyMasterID != 0) {
      // For Child Company
      condition[Sequelize.Op.or] = [
        {
          parentCompanyMasterID: existCompanyData.parentCompanyMasterID,
        },
        {
          companyMasterID: existCompanyData.parentCompanyMasterID,
        },
      ];
    } else {
      // For Child Company
      condition[Sequelize.Op.or] = [
        {
          parentCompanyMasterID: +companyMasterID,
        },
        {
          companyMasterID: +companyMasterID,
        },
      ];
    }
    const findAllCompanyData = await companyMaster.findAll({
      where: condition,
      include: [],
    });
    const findParentCompany = findAllCompanyData.find(
      (e) => +e.parentCompanyMasterID == 0,
    );
    const companyMasterIDs = findAllCompanyData.map((e) => +e.companyMasterID);

    const findAllCompanyBranches = await BranchMaster.findAll({
      where: {
        status: 1,
        companyMasterID: companyMasterIDs,
      },
      order: [['branchName', 'ASC']],
    });
    const parentCompanyBranches = findAllCompanyBranches
      .filter((e) => e.companyMasterID == findParentCompany.companyMasterID)
      .map((e) => ({
        branchMasterID: e.branchMasterID,
        name: e.branchName,
        type: 'Branch',
      }));

    const parentcompany = [];
    const parentCompanyObj = {
      companyMasterID: findParentCompany.companyMasterID,
      name: findParentCompany.companyName,
      type: 'Company',
      children: [],
    };
    for (let company of findAllCompanyData) {
      if (+company.parentCompanyMasterID == 0) {
        continue;
      }
      const companyBranches = findAllCompanyBranches
        .filter((e) => e.companyMasterID == company.companyMasterID)
        .map((e) => ({
          branchMasterID: e.branchMasterID,
          name: e.branchName,
          type: 'Branch',
        }));

      const childObj = {
        companyMasterID: company.companyMasterID,
        name: company.companyName,
        type: 'Company',
        children: companyBranches || [],
      };
      parentCompanyObj.children.push(childObj);
    }
    parentCompanyObj.children.push(...parentCompanyBranches);
    parentcompany.push(parentCompanyObj);

    return res.status(200).json({
      status: 200,
      totalcount: findAllCompanyData.length,
      data: [parentCompanyObj],
    });
  } catch (err) {
    next(err);
  }
};

exports.getCompanyActiveSubscriptionPlanWiseForms = async (req, res, next) => {
  try {
    const companyID =
      +req.userDetails.parentCompanyMasterId == 0
        ? +req.userDetails.companyMasterId
        : +req.userDetails.parentCompanyMasterId;

    const companySubscriptionData = await CompanySubscriptionMaster.findOne({
      where: {
        companyMasterID: companyID,
        status: 1,
      },
      include: [
        {
          model: ProductMaster,
          include: [
            {
              model: ProductPermission,
              as: 'rp',
              include: [
                {
                  model: FormMaster,
                  attributes: ['formName'],
                  where: {
                    formName: {
                      [Sequelize.Op.in]: companyPlanwiseForms,
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    const data = companySubscriptionData?.productMaster?.rp?.map(
      (x) => x?.formMaster?.formName,
    );

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

exports.postUpdate_visit_geo_check = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { companyMasterID, visit_geo_check } = req.body;
    let visit_geo_radius = null;
    if (visit_geo_check == true) {
      visit_geo_radius = 50;
    }
    await companyMaster.update(
      { visit_geo_check, visit_geo_radius },
      {
        where: { companyMasterID: companyMasterID },
        transaction,
        user: req.userDetails,
        individualHooks: true,
      },
    );
    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Visit Geo Check'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.postUpdate_visit_Auto_Check = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { companyMasterID, visit_Auto_Check } = req.body;
    await companyMaster.update(
      {
        visit_Auto_Check,
        showVisitCheckInAttachment: false,
        requiredVisitCheckInAttachment: false,
        showVisitCheckOutAttachment: false,
        requiredVisitCheckOutAttachment: false,
        visit_geo_check: false,
      },
      { where: { companyMasterID: companyMasterID } },
    );
    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Visit Auto Check'),
    });
  } catch (err) {
    await transaction.rollback();

    next(err);
  }
};
exports.postUpdate_visit_image = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      companyMasterID,
      showVisitCheckInAttachment,
      requiredVisitCheckInAttachment,
      showVisitCheckOutAttachment,
      requiredVisitCheckOutAttachment,
    } = req.body;

    await companyMaster.update(
      {
        showVisitCheckInAttachment,
        requiredVisitCheckInAttachment,
        showVisitCheckOutAttachment,
        requiredVisitCheckOutAttachment,
      },
      { where: { companyMasterID: companyMasterID } },
    );
    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Visit Image'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getCompanyMarketingPersonsCountWise = async (req, res, next) => {
  try {
    const today = asiaKolkataDateTime(new Date()).slice(0, 10);
    const { exportData } = req.body;
    const marketingPersons = await UserMaster.findAll({
      attributes: ['userMasterID', 'displayName', 'status'],
      where: { status: [0, 1], admin: UserTypesEnum.MARKETING_PERSON },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: CompanyMarketing,
          as: 'marketingPerson',
          required: false,
          attributes: ['marketingPersonID', 'status', 'companyMasterID'],
          include: [
            {
              model: companyMaster,
              attributes: ['status', 'companyMasterID'],
              required: false,
              where: { status: [0, 1] },
              include: [
                {
                  model: CompanySubscriptionMaster,
                  as: 'csm',
                  attributes: ['startDate', 'endDate', 'subscriptionType'],
                  where: { status: 1 },
                  required: true,
                },
              ],
            },
          ],
        },
      ],
    });

    const marketingStats = [];

    marketingPersons.forEach((person) => {
      const personID = person.userMasterID;
      const personName = person.displayName;
      const personStatus = person.status;

      const companyRecords = person.marketingPerson || [];

      let totalCompanies = 0;
      let activeWithActiveSub = 0;
      let activeWithExpiredSub = 0;
      let inactiveCompanies = 0;
      let currentMonthRenewal = 0;
      let planWiseCount = {};

      companyRecords.forEach((cmpRec) => {
        const company = cmpRec.companyMaster;
        if (!company) return;

        totalCompanies++;

        const subscription = company.csm?.[0];
        const companyStatus = company.status;

        if (companyStatus == 0) {
          inactiveCompanies++;
        } else if (companyStatus == 1) {
          if (subscription && subscription.startDate) {
            const { startDate, endDate, subscriptionType } = subscription;
            if (startDate <= today && endDate >= today) {
              activeWithActiveSub++;
              const end = new Date(endDate);
              const now = new Date();
              if (
                end.getMonth() === now.getMonth() &&
                end.getFullYear() === now.getFullYear()
              ) {
                currentMonthRenewal++;
              }
              if (subscriptionType) {
                planWiseCount[subscriptionType] =
                  (planWiseCount[subscriptionType] || 0) + 1;
              }
            } else if (endDate < today) {
              activeWithExpiredSub++;
            }
          } else {
            activeWithExpiredSub++;
          }
        }
      });

      marketingStats.push({
        marketingPersonID: personID,
        marketingPersonName: personName,
        totalCompanies,
        activeWithActiveSub,
        activePlanWiseCount: planWiseCount,
        activeWithExpiredSub,
        inactiveCompanies,
        currentMonthRenewal,
        status: personStatus,
      });
    });

    if (exportData) {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Marketing Stats');

      const allPlanTypes = Object.values(subscriptionTypes);

      const activeStartCol = 3;
      const activeEndCol = activeStartCol + allPlanTypes.length - 1;
      const deactiveCol = activeEndCol + 1;
      const renewalCol = activeEndCol + 2;

      // Row 1 headers
      sheet.getCell('A1').value = 'Name';
      sheet.getCell('B1').value = 'Total';
      sheet.mergeCells(1, activeStartCol, 1, activeEndCol);
      sheet.getCell(1, activeStartCol).value = 'Active';
      sheet.getCell(1, deactiveCol).value = 'Deactive Company';
      sheet.getCell(1, renewalCol).value = 'Current Month Renewal';

      // Row 2 (Plan Type headers)
      allPlanTypes.forEach((plan, i) => {
        sheet.getCell(2, activeStartCol + i).value = plan;
      });

      // ✅ Merge single-column headers vertically (Row 1–2)
      [
        'A',
        'B',
        sheet.getColumn(deactiveCol).letter,
        sheet.getColumn(renewalCol).letter,
      ].forEach((col) => {
        sheet.mergeCells(`${col}1:${col}2`);
      });

      // Optional: make headers bold & centered
      sheet.getRow(1).font = { bold: true, size: 12 };
      sheet.getRow(2).font = { bold: true, size: 12 };
      sheet.getRow(1).alignment = sheet.getRow(2).alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };

      // Start data from Row 3
      let currentRow = 3;
      marketingStats.forEach((m) => {
        // Basic info
        sheet.getCell(currentRow, 1).value = m.marketingPersonName;
        sheet.getCell(currentRow, 2).value = m.totalCompanies;

        // Active total (merged)
        const totalActive = m.activeWithActiveSub;
        sheet.mergeCells(currentRow, activeStartCol, currentRow, activeEndCol);
        sheet.getCell(currentRow, activeStartCol).value = totalActive;

        // Plan-wise counts in next row
        currentRow++;
        allPlanTypes.forEach((plan, i) => {
          sheet.getCell(currentRow, activeStartCol + i).value =
            m.activePlanWiseCount?.[plan.toUpperCase().replace(/[- ]/g, '_')] ||
            m.activePlanWiseCount?.[plan] ||
            0;
        });

        // Deactive + Renewal columns
        sheet.getCell(currentRow - 1, deactiveCol).value = m.inactiveCompanies;
        sheet.getCell(currentRow - 1, renewalCol).value = m.currentMonthRenewal;

        // ✅ Merge vertically: Name, Total, Deactive, Renewal
        sheet.mergeCells(currentRow - 1, 1, currentRow, 1); // Name
        sheet.mergeCells(currentRow - 1, 2, currentRow, 2); // Total
        sheet.mergeCells(currentRow - 1, deactiveCol, currentRow, deactiveCol); // Deactive Company
        sheet.mergeCells(currentRow - 1, renewalCol, currentRow, renewalCol); // Current Month Renewal

        currentRow += 1;
      });

      // Styling and formatting
      sheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.font = { name: 'Calibri', size: 11 };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        });

        const lastCol = sheet.columnCount;

        // Thicker border under plan header row
        if (rowNumber === 2) {
          for (let col = 1; col <= lastCol; col++) {
            const cell = sheet.getCell(rowNumber, col);
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'medium' },
              right: { style: 'thin' },
            };
          }
        }

        // Thicker bottom border for plan count rows (2nd row per person)
        if (rowNumber >= 4 && (rowNumber - 3) % 2 === 1) {
          for (let col = 1; col <= lastCol; col++) {
            const cell = sheet.getCell(rowNumber, col);
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'medium' },
              right: { style: 'thin' },
            };
          }
        }
      });

      // Light background for even persons (both rows)
      let dataStartRow = 3;
      for (let i = 0; i < marketingStats.length; i++) {
        const personRow1 = dataStartRow + i * 2;
        const personRow2 = personRow1 + 1;

        if ((i + 1) % 2 === 0) {
          for (let col = 1; col <= sheet.columnCount; col++) {
            [personRow1, personRow2].forEach((r) => {
              const cell = sheet.getCell(r, col);
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'E6E8E9' }, // Light gray background
              };
            });
          }
        }
      }

      // Auto width
      sheet.columns.forEach((col) => {
        let maxLength = 12;
        col.eachCell({ includeEmpty: true }, (cell) => {
          const len = cell.value ? cell.value.toString().length : 0;
          if (len > maxLength) maxLength = len;
        });
        col.width = maxLength + 3;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=MarketingStats.xlsx',
      );
      return res.send(buffer);
    }

    return res.status(200).json({
      status: 200,
      data: marketingStats,
    });
  } catch (err) {
    next(err);
  }
};

exports.getCompanyDealersCountWise = async (req, res, next) => {
  try {
    const { exportData } = req.body;
    const today = asiaKolkataDateTime(new Date()).slice(0, 10);

    const marketingPersons = await UserMaster.findAll({
      attributes: ['userMasterID', 'displayName', 'status'],
      where: { status: [0, 1], admin: UserTypesEnum.DEALER },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: CompanyMarketing,
          as: 'dealer',
          required: false,
          attributes: ['dealerID', 'status', 'companyMasterID'],
          include: [
            {
              model: companyMaster,
              attributes: ['status', 'companyMasterID'],
              required: false,
              where: { status: [0, 1] },
              include: [
                {
                  model: CompanySubscriptionMaster,
                  as: 'csm',
                  attributes: ['startDate', 'endDate', 'subscriptionType'],
                  where: { status: 1 },
                  required: true,
                },
              ],
            },
          ],
        },
      ],
    });

    const marketingStats = [];

    marketingPersons.forEach((person) => {
      const personID = person.userMasterID;
      const personName = person.displayName;
      const personStatus = person.status;

      const companyRecords = person.dealer || [];

      let totalCompanies = 0;
      let activeWithActiveSub = 0;
      let activeWithExpiredSub = 0;
      let inactiveCompanies = 0;
      let currentMonthRenewal = 0;
      let planWiseCount = {};

      companyRecords.forEach((cmpRec) => {
        const company = cmpRec.companyMaster;
        if (!company) return;

        totalCompanies++;

        const subscription = company.csm?.[0];
        const companyStatus = company.status;

        if (companyStatus == 0) {
          inactiveCompanies++;
        } else if (companyStatus == 1) {
          if (subscription && subscription.startDate) {
            const { startDate, endDate, subscriptionType } = subscription;
            if (startDate <= today && endDate >= today) {
              activeWithActiveSub++;
              const end = new Date(endDate);
              const now = new Date();
              if (
                end.getMonth() === now.getMonth() &&
                end.getFullYear() === now.getFullYear()
              ) {
                currentMonthRenewal++;
              }
              if (subscriptionType) {
                planWiseCount[subscriptionType] =
                  (planWiseCount[subscriptionType] || 0) + 1;
              }
            } else if (endDate < today) {
              activeWithExpiredSub++;
            }
          } else {
            activeWithExpiredSub++;
          }
        }
      });

      marketingStats.push({
        dealerID: personID,
        marketingPersonName: personName,
        totalCompanies,
        activeWithActiveSub,
        activePlanWiseCount: planWiseCount,
        activeWithExpiredSub,
        inactiveCompanies,
        currentMonthRenewal,
        status: personStatus,
      });
    });

    if (exportData) {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Marketing Stats');

      const allPlanTypes = Object.values(subscriptionTypes);

      const activeStartCol = 3;
      const activeEndCol = activeStartCol + allPlanTypes.length - 1;
      const deactiveCol = activeEndCol + 1;
      const renewalCol = activeEndCol + 2;

      // Row 1 headers
      sheet.getCell('A1').value = 'Name';
      sheet.getCell('B1').value = 'Total';
      sheet.mergeCells(1, activeStartCol, 1, activeEndCol);
      sheet.getCell(1, activeStartCol).value = 'Active';
      sheet.getCell(1, deactiveCol).value = 'Deactive Company';
      sheet.getCell(1, renewalCol).value = 'Current Month Renewal';

      // Row 2 (Plan Type headers)
      allPlanTypes.forEach((plan, i) => {
        sheet.getCell(2, activeStartCol + i).value = plan;
      });

      // ✅ Merge single-column headers vertically (Row 1–2)
      [
        'A',
        'B',
        sheet.getColumn(deactiveCol).letter,
        sheet.getColumn(renewalCol).letter,
      ].forEach((col) => {
        sheet.mergeCells(`${col}1:${col}2`);
      });

      // Optional: make headers bold & centered
      sheet.getRow(1).font = { bold: true, size: 12 };
      sheet.getRow(2).font = { bold: true, size: 12 };
      sheet.getRow(1).alignment = sheet.getRow(2).alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };

      // Start data from Row 3
      let currentRow = 3;
      marketingStats.forEach((m) => {
        // Basic info
        sheet.getCell(currentRow, 1).value = m.marketingPersonName;
        sheet.getCell(currentRow, 2).value = m.totalCompanies;

        // Active total (merged)
        const totalActive = m.activeWithActiveSub;
        sheet.mergeCells(currentRow, activeStartCol, currentRow, activeEndCol);
        sheet.getCell(currentRow, activeStartCol).value = totalActive;

        // Plan-wise counts in next row
        currentRow++;
        allPlanTypes.forEach((plan, i) => {
          sheet.getCell(currentRow, activeStartCol + i).value =
            m.activePlanWiseCount?.[plan.toUpperCase().replace(/[- ]/g, '_')] ||
            m.activePlanWiseCount?.[plan] ||
            0;
        });

        // Deactive + Renewal columns
        sheet.getCell(currentRow - 1, deactiveCol).value = m.inactiveCompanies;
        sheet.getCell(currentRow - 1, renewalCol).value = m.currentMonthRenewal;

        // ✅ Merge vertically: Name, Total, Deactive, Renewal
        sheet.mergeCells(currentRow - 1, 1, currentRow, 1); // Name
        sheet.mergeCells(currentRow - 1, 2, currentRow, 2); // Total
        sheet.mergeCells(currentRow - 1, deactiveCol, currentRow, deactiveCol); // Deactive Company
        sheet.mergeCells(currentRow - 1, renewalCol, currentRow, renewalCol); // Current Month Renewal

        currentRow += 1;
      });

      // Styling and formatting
      sheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.font = { name: 'Calibri', size: 11 };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        });

        const lastCol = sheet.columnCount;

        // Thicker border under plan header row
        if (rowNumber === 2) {
          for (let col = 1; col <= lastCol; col++) {
            const cell = sheet.getCell(rowNumber, col);
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'medium' },
              right: { style: 'thin' },
            };
          }
        }

        // Thicker bottom border for plan count rows (2nd row per person)
        if (rowNumber >= 4 && (rowNumber - 3) % 2 === 1) {
          for (let col = 1; col <= lastCol; col++) {
            const cell = sheet.getCell(rowNumber, col);
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'medium' },
              right: { style: 'thin' },
            };
          }
        }
      });

      // Light background for even persons (both rows)
      let dataStartRow = 3;
      for (let i = 0; i < marketingStats.length; i++) {
        const personRow1 = dataStartRow + i * 2;
        const personRow2 = personRow1 + 1;

        if ((i + 1) % 2 === 0) {
          for (let col = 1; col <= sheet.columnCount; col++) {
            [personRow1, personRow2].forEach((r) => {
              const cell = sheet.getCell(r, col);
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'E6E8E9' }, // Light gray background
              };
            });
          }
        }
      }

      // Auto width
      sheet.columns.forEach((col) => {
        let maxLength = 12;
        col.eachCell({ includeEmpty: true }, (cell) => {
          const len = cell.value ? cell.value.toString().length : 0;
          if (len > maxLength) maxLength = len;
        });
        col.width = maxLength + 3;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=MarketingStats.xlsx',
      );
      return res.send(buffer);
    }

    return res.status(200).json({
      status: 200,
      data: marketingStats,
    });
  } catch (err) {
    next(err);
  }
};

exports.getCompanyHMorRMCountWise = async (req, res, next) => {
  try {
    const { userType, exportData } = req.body;
    const today = asiaKolkataDateTime(new Date()).slice(0, 10);

    const now = new Date();
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = lastMonthDate.getMonth() + 1;
    const lastMonthYear = lastMonthDate.getFullYear();
    const month = `${lastMonthYear}${lastMonth}`;

    const HMPersons = await UserMaster.findAll({
      attributes: ['userMasterID', 'displayName', 'status'],
      where: { status: [0, 1], admin: userType },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: CompanyManager,
          required: false,
          attributes: [
            'companyManagerID',
            'userMasterID',
            'status',
            'companyMasterID',
          ],
          where: {
            status: 1,
            assignDate: { [Sequelize.Op.lte]: new Date(today) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(today) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          include: [
            {
              model: companyMaster,
              attributes: ['status', 'companyMasterID'],
              where: { status: [0, 1], parentCompanyMasterID: 0 },
              include: [
                {
                  as: 'csm',
                  model: CompanySubscriptionMaster,
                  attributes: ['startDate', 'endDate', 'subscriptionType'],
                  where: { status: 1 },
                },
                {
                  required: false,
                  model: UserMaster,
                  where: { status: [0, 1] },
                  attributes: ['displayName', 'status', 'userMasterID'],
                  include: [
                    {
                      separate: true,
                      required: false,
                      model: HRSalarySlip,
                      attributes: ['salaryYYYYMM'],
                      where: {
                        salaryYYYYMM: month,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const marketingStats = [];

    HMPersons.forEach((person) => {
      const personID = person.userMasterID;
      const personName = person.displayName;
      const personStatus = person.status;

      const companyRecords = person.companyManagers || [];

      let totalCompanies = 0;
      let activeWithActiveSub = 0;
      let activeWithExpiredSub = 0;
      let inactiveCompanies = 0;
      let currentMonthRenewal = 0;
      let totalActiveUsers = 0;
      let totalSalaryCalculatedLastMonth = 0;
      let planWiseCount = {};

      companyRecords.forEach((cmpRec) => {
        const company = cmpRec.companyMaster;
        if (!company) return;

        totalCompanies++;

        const subscription = company.csm?.[0];
        const companyStatus = company.status;

        if (companyStatus == 0) {
          inactiveCompanies++;
        } else if (companyStatus == 1) {
          if (subscription && subscription.startDate) {
            const { startDate, endDate, subscriptionType } = subscription;
            if (startDate <= today && endDate >= today) {
              if (subscriptionType) {
                planWiseCount[subscriptionType] =
                  (planWiseCount[subscriptionType] || 0) + 1;
              }
              activeWithActiveSub++;
              if (company.userMasters.length > 0) {
                for (i = 0; i < company.userMasters.length; i++) {
                  if (company.userMasters[i].status == 1) {
                    totalActiveUsers++;
                  }
                }
                totalSalaryCalculatedLastMonth =
                  totalSalaryCalculatedLastMonth +
                  company.userMasters.filter(
                    (u) => (u.dataValues.hrSalarySlips || []).length > 0,
                  ).length;
              }
              const end = new Date(endDate);
              const now = new Date();
              if (
                end.getMonth() === now.getMonth() &&
                end.getFullYear() === now.getFullYear()
              ) {
                currentMonthRenewal++;
              }
            } else if (endDate < today) {
              activeWithExpiredSub++;
            }
          } else {
            activeWithExpiredSub++;
          }
        }
      });

      marketingStats.push({
        hmOrRmID: personID,
        marketingPersonName: personName,
        totalCompanies,
        activeWithActiveSub,
        activePlanWiseCount: planWiseCount,
        activeWithExpiredSub,
        inactiveCompanies,
        currentMonthRenewal,
        totalActiveUsers,
        totalSalaryCalculatedLastMonth,
        status: personStatus,
      });
    });

    if (exportData) {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Marketing Stats');

      const allPlanTypes = Object.values(subscriptionTypes);

      const activeStartCol = 3;
      const activeEndCol = activeStartCol + allPlanTypes.length - 1;
      const deactiveCol = activeEndCol + 1;
      const renewalCol = activeEndCol + 2;

      // Row 1 headers
      sheet.getCell('A1').value = 'Name';
      sheet.getCell('B1').value = 'Total';
      sheet.mergeCells(1, activeStartCol, 1, activeEndCol);
      sheet.getCell(1, activeStartCol).value = 'Active';
      sheet.getCell(1, deactiveCol).value = 'Deactive Company';
      sheet.getCell(1, renewalCol).value = 'Current Month Renewal';

      // Row 2 (Plan Type headers)
      allPlanTypes.forEach((plan, i) => {
        sheet.getCell(2, activeStartCol + i).value = plan;
      });

      // ✅ Merge single-column headers vertically (Row 1–2)
      [
        'A',
        'B',
        sheet.getColumn(deactiveCol).letter,
        sheet.getColumn(renewalCol).letter,
      ].forEach((col) => {
        sheet.mergeCells(`${col}1:${col}2`);
      });

      // Optional: make headers bold & centered
      sheet.getRow(1).font = { bold: true, size: 12 };
      sheet.getRow(2).font = { bold: true, size: 12 };
      sheet.getRow(1).alignment = sheet.getRow(2).alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };

      // Start data from Row 3
      let currentRow = 3;
      marketingStats.forEach((m) => {
        // Basic info
        sheet.getCell(currentRow, 1).value = m.marketingPersonName;
        sheet.getCell(currentRow, 2).value = m.totalCompanies;

        // Active total (merged)
        const totalActive = m.activeWithActiveSub;
        sheet.mergeCells(currentRow, activeStartCol, currentRow, activeEndCol);
        sheet.getCell(currentRow, activeStartCol).value = totalActive;

        // Plan-wise counts in next row
        currentRow++;
        allPlanTypes.forEach((plan, i) => {
          sheet.getCell(currentRow, activeStartCol + i).value =
            m.activePlanWiseCount?.[plan.toUpperCase().replace(/[- ]/g, '_')] ||
            m.activePlanWiseCount?.[plan] ||
            0;
        });

        // Deactive + Renewal columns
        sheet.getCell(currentRow - 1, deactiveCol).value = m.inactiveCompanies;
        sheet.getCell(currentRow - 1, renewalCol).value = m.currentMonthRenewal;

        // ✅ Merge vertically: Name, Total, Deactive, Renewal
        sheet.mergeCells(currentRow - 1, 1, currentRow, 1); // Name
        sheet.mergeCells(currentRow - 1, 2, currentRow, 2); // Total
        sheet.mergeCells(currentRow - 1, deactiveCol, currentRow, deactiveCol); // Deactive Company
        sheet.mergeCells(currentRow - 1, renewalCol, currentRow, renewalCol); // Current Month Renewal

        currentRow += 1;
      });

      // Styling and formatting
      sheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.font = { name: 'Calibri', size: 11 };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        });

        const lastCol = sheet.columnCount;

        // Thicker border under plan header row
        if (rowNumber === 2) {
          for (let col = 1; col <= lastCol; col++) {
            const cell = sheet.getCell(rowNumber, col);
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'medium' },
              right: { style: 'thin' },
            };
          }
        }

        // Thicker bottom border for plan count rows (2nd row per person)
        if (rowNumber >= 4 && (rowNumber - 3) % 2 === 1) {
          for (let col = 1; col <= lastCol; col++) {
            const cell = sheet.getCell(rowNumber, col);
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'medium' },
              right: { style: 'thin' },
            };
          }
        }
      });

      // Light background for even persons (both rows)
      let dataStartRow = 3;
      for (let i = 0; i < marketingStats.length; i++) {
        const personRow1 = dataStartRow + i * 2;
        const personRow2 = personRow1 + 1;

        if ((i + 1) % 2 === 0) {
          for (let col = 1; col <= sheet.columnCount; col++) {
            [personRow1, personRow2].forEach((r) => {
              const cell = sheet.getCell(r, col);
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'E6E8E9' }, // Light gray background
              };
            });
          }
        }
      }

      // Auto width
      sheet.columns.forEach((col) => {
        let maxLength = 12;
        col.eachCell({ includeEmpty: true }, (cell) => {
          const len = cell.value ? cell.value.toString().length : 0;
          if (len > maxLength) maxLength = len;
        });
        col.width = maxLength + 3;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=MarketingStats.xlsx',
      );
      return res.send(buffer);
    }

    return res.status(200).json({
      status: 200,
      data: marketingStats,
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllSubscriptionCountWise = async (req, res, next) => {
  try {
    const today = asiaKolkataDateTime(new Date()).slice(0, 10);

    const subscriptionSummary = Object.values(subscriptionTypes).reduce(
      (acc, type) => {
        acc[type.toLowerCase()] = {
          subscriptionType: type,
          totalCompanies: 0,
          activeWithActiveSub: 0,
          activeWithExpiredSub: 0,
          inactiveCompanies: 0,
        };
        return acc;
      },
      {},
    );

    const companySubscriptionData = await companyMaster.findAll({
      attributes: ['status', 'companyMasterID'],
      where: { status: [0, 1], parentCompanyMasterID: 0 },
      include: [
        {
          model: CompanySubscriptionMaster,
          attributes: [
            'subscriptionType',
            'startDate',
            'endDate',
            'companyMasterID',
          ],
          where: { status: 1 },
        },
      ],
    });

    companySubscriptionData.forEach((company) => {
      const companyStatus = company.status;
      const subscriptions = company.companySubscriptions || [];

      subscriptions.forEach((sub) => {
        const subType = sub.subscriptionType?.toLowerCase();

        const typeKey = Object.values(subscriptionTypes)
          .map((v) => v.toLowerCase())
          .includes(subType)
          ? subType
          : 'unknown';

        if (!subscriptionSummary[typeKey]) {
          subscriptionSummary[typeKey] = {
            subscriptionType: sub.subscriptionType || 'Unknown',
            totalCompanies: 0,
            activeWithActiveSub: 0,
            activeWithExpiredSub: 0,
            inactiveCompanies: 0,
          };
        }

        const stats = subscriptionSummary[typeKey];
        stats.totalCompanies++;

        const { startDate, endDate } = sub;

        if (companyStatus == 0) {
          stats.inactiveCompanies++;
        } else if (companyStatus == 1) {
          if (startDate && endDate) {
            if (startDate <= today && endDate >= today) {
              stats.activeWithActiveSub++;
            } else if (endDate < today) {
              stats.activeWithExpiredSub++;
            }
          } else {
            stats.activeWithExpiredSub++;
          }
        }
      });
    });

    const desiredOrder = Object.values(subscriptionTypes).map((v) =>
      v.toLowerCase(),
    );

    const resultArray = Object.values(subscriptionSummary).sort((a, b) => {
      const indexA = desiredOrder.indexOf(a.subscriptionType.toLowerCase());
      const indexB = desiredOrder.indexOf(b.subscriptionType.toLowerCase());
      return (
        (indexA === -1 ? Infinity : indexA) -
        (indexB === -1 ? Infinity : indexB)
      );
    });

    return res.status(200).json({
      status: 200,
      data: resultArray,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllComopanyStageAnalytics = async (req, res, next) => {
  try {
    const today = asiaKolkataDateTime(new Date()).slice(0, 10);

    const getAllStages = await CompanyServiceStatus.findAll({
      attributes: ['CompanyServiceStatusName', 'CompanyServiceStatusID'],
      where: { status: 1 },
    });

    const getAllCompanyStages = await companyMaster.findAll({
      where: { status: [0, 1], parentCompanyMasterID: 0 },
      attributes: ['status', 'companyMasterID'],
      include: [
        {
          model: CompanyProgress,
          where: { status: 1 },
          attributes: [
            'CompanyServiceStatusID',
            'companyMasterID',
            'companyProgressID',
          ],
          order: [['createdAt', 'DESC']],
          limit: 1,
          offset: 0,
        },
        {
          model: CompanySubscriptionMaster,
          attributes: ['companyMasterID', 'startDate', 'endDate'],
          where: { status: 1 },
        },
      ],
    });

    const getAllStagesCount = getAllStages.map((stage) => ({
      stageID: stage.CompanyServiceStatusID,
      stageName: stage.CompanyServiceStatusName,
      activeWithActiveSub: 0,
      activeWithExpiredSub: 0,
      deactiveCount: 0,
    }));

    getAllCompanyStages.forEach((company) => {
      const subscription = company.companySubscriptions?.[0];
      const companyStatus = company.status;
      const companyStageID =
        company.companyProgresses?.[0]?.CompanyServiceStatusID;

      if (!companyStageID) return;

      const stageObj = getAllStagesCount.find(
        (s) => s.stageID == companyStageID,
      );

      if (stageObj) {
        if (companyStatus == 1) {
          if (subscription && subscription.startDate) {
            const { startDate, endDate } = subscription;
            if (startDate <= today && endDate >= today) {
              stageObj.activeWithActiveSub++;
            } else if (endDate < today) {
              stageObj.activeWithExpiredSub++;
            }
          } else {
            stageObj.activeWithExpiredSub++;
          }
        } else if (companyStatus == 0) stageObj.deactiveCount++;
      }
    });

    return res.status(200).json({
      status: 200,
      data: getAllStagesCount,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllSalaryCalculatedMonthWiseCount = async (req, res, next) => {
  try {
    const { month, limit, page, searchQuery, exportData } = req.body;
    const [year, monthNum] = month.split('-');
    const monthEnd = new Date(year, parseInt(monthNum), 0, 23, 59, 59, 999);
    const newMonth = month.split('-').join('');

    const condition = { status: [0, 1] };

    if (searchQuery) {
      condition[Sequelize.Op.or] = [
        {
          '$companyMaster.companyName$': {
            [Sequelize.Op.iLike]: `%${searchQuery}%`,
          },
        },
      ];
    }

    const paginationQuery = {};
    if (page && limit && !exportData) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const order = [['companyName', 'ASC']];

    const { rows: companies, count: totalCompanies } =
      await companyMaster.findAndCountAll({
        distinct: true,
        attributes: [
          'companyName',
          'companyLogo',
          'companyMasterID',
          'cpName',
          'cpMobileNo',
        ],
        where: condition,
        ...paginationQuery,
        order,
        include: [
          {
            required: false,
            model: UserMaster,
            where: { status: [0, 1] },
            attributes: ['displayName'],
            include: [
              {
                required: false,
                model: HRSalarySlip,
                attributes: ['salaryYYYYMM'],
                where: {
                  salaryYYYYMM: newMonth,
                },
              },
            ],
          },
          {
            model: CompanyManager,
            required: false,
            where: {
              status: 1,
              assignDate: { [Sequelize.Op.lte]: new Date(currentDate) },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
                { endDate: { [Sequelize.Op.eq]: null } },
              ],
            },
            include: [
              {
                required: false,
                model: UserMaster,
                where: { admin: UserTypesEnum.HRM },
                attributes: [...userAttributes, 'admin'],
              },
            ],
          },
          {
            model: CompanySubscriptionMaster,
            attributes: [
              'totalUser',
              'startDate',
              'endDate',
              'totalTracking',
              'subscriptionType',
            ],
            where: {
              status: [1, 0],
              startDate: { [Sequelize.Op.lte]: monthEnd },
              endDate: { [Sequelize.Op.gte]: monthEnd },
            },
            include: [
              {
                model: ProductMaster,
                attributes: ['productName'],
              },
            ],
          },
          {
            model: CityMaster,
            attributes: ['cityName', 'stateMasterID'],
          },
          {
            model: CompanySubscriptionMaster,
            as: 'csm',
            attributes: [
              'totalUser',
              'startDate',
              'endDate',
              'totalTracking',
              'subscriptionType',
            ],
            where: {
              status: 1,
            },
            include: [
              {
                model: ProductMaster,
                attributes: ['productName'],
              },
            ],
          },
          {
            separate: true,
            model: companyMaster,
            as: 'child',
            attributes: ['companyName', 'companyLogo', 'companyMasterID'],
            where: { status: [0, 1] },
            include: [
              {
                required: false,
                model: UserMaster,
                where: { status: [0, 1] },
                attributes: ['displayName'],
                include: [
                  {
                    required: false,
                    model: HRSalarySlip,
                    attributes: ['salaryYYYYMM'],
                    where: {
                      salaryYYYYMM: newMonth,
                    },
                  },
                ],
              },
            ],
          },
        ],
      });

    let totalCalculatedUsers = 0;
    const exportDataList = [];
    const responseData = [];

    for (const company of companies) {
      const users = company?.userMasters || [];
      const city = company?.cityMaster?.cityName || '';
      const subscription = company?.companySubscriptions?.[0] || {};
      const product = subscription?.productMaster || {};
      const currentPlan = company?.csm?.[0] || {};

      const parentCalculatedCount = users.filter(
        (u) => (u.hrSalarySlips || []).length > 0,
      ).length;

      totalCalculatedUsers += parentCalculatedCount;

      const childCompanies = company.child || [];
      const childArray = [];

      // ✅ First push parent to Excel
      exportDataList.push({
        'Company Name': company.companyName,
        City: city,
        'Contact Person Name': company.cpName,
        'Contact Person Number': company.cpMobileNo,
        HRM:
          company.companyManagers
            ?.filter((m) => m.userMaster?.admin == UserTypesEnum.HRM)
            .map((m) => m.userMaster?.displayName)
            .filter(Boolean)
            .join(', ') || '',
        'Subscription Type When Salary Calculated':
          subscription.subscriptionType || '',
        'Subscription Name When Salary Calculated': product.productName || '',
        'Start Date': subscription.startDate
          ? moment(subscription.startDate).format('MM-DD-YYYY')
          : '',
        'End Date': subscription.endDate
          ? moment(subscription.endDate).format('MM-DD-YYYY')
          : '',
        'Total Users': subscription.totalUser || '',
        'Total Tracking User': subscription.totalTracking || '',
        'Total Calculated Users': parentCalculatedCount,
        'Current Plan Name': currentPlan?.productMaster?.productName || '',
        'Current Plan Type': currentPlan.subscriptionType || '',
        'Current Plan Start Date': currentPlan.startDate
          ? moment(currentPlan.startDate).format('MM-DD-YYYY')
          : '',
        'Current Plan End Date': currentPlan.endDate
          ? moment(currentPlan.endDate).format('MM-DD-YYYY')
          : '',
      });

      // ✅ Then handle children
      for (const child of childCompanies) {
        const childUsers = child?.userMasters || [];
        const childCalculatedCount = childUsers.filter(
          (u) => (u.hrSalarySlips || []).length > 0,
        ).length;

        totalCalculatedUsers += childCalculatedCount;

        childArray.push({
          companyName: child.companyName,
          totalCalculatedUsers: childCalculatedCount,
        });

        exportDataList.push({
          'Company Name': `    ${child.companyName}`, // indentation for clarity
          City: '',
          'Subscription Type': '',
          'Subscription Name': '',
          'Start Date': '',
          'End Date': '',
          'Total Users': '',
          'Total Tracking User': '',
          'Total Calculated Users': childCalculatedCount,
          'Current Plan Name': '',
          'Current Plan Type': '',
          'Current Plan Start Date': '',
          'Current Plan End Date': '',
        });
      }

      //  prepare JSON data
      responseData.push({
        companyName: company.companyName,
        city,
        subscriptionType: subscription.subscriptionType || '',
        subscriptionName: product.productName || '',
        startDate: subscription.startDate || '',
        endDate: subscription.endDate || '',
        totalUsers: subscription.totalUser || '',
        totalTrackingUser: subscription.totalTracking || '',
        totalCalculatedUsers: parentCalculatedCount,
        currentPlanName: currentPlan?.productMaster?.productName || '',
        currentPlanType: currentPlan.subscriptionType || '',
        currentPlanStartDate: currentPlan.startDate || '',
        currentPlanEndDate: currentPlan.endDate || '',
        child: childArray,
      });
    }

    if (exportData) {
      const sheetName = 'Salary Calculated Data';
      const fileType = 'xlsx';
      const dataList = exportDataList.map(({ companyLogo, ...rest }) => rest);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(sheetName);

      const headers = Object.keys(dataList[0] || {});
      worksheet.columns = headers.map((key) => ({
        header: key,
        key,
      }));

      let groupRowIndex = 1;

      for (let i = 0; i < dataList.length; i++) {
        const row = dataList[i];
        worksheet.addRow(row);
        groupRowIndex++;

        const isChild =
          row['Company Name'] && row['Company Name'].startsWith('    ');
        const nextRow = dataList[i + 1];
        const nextIsChild =
          nextRow && nextRow['Company Name']?.startsWith('    ');

        const isParent =
          row['Company Name'] && !row['Company Name'].startsWith('    ');

        const nextIsParent =
          nextRow && !nextRow['Company Name']?.startsWith('    ');

        if (isParent && (!nextRow || nextIsParent)) {
          const currentRow = worksheet.getRow(groupRowIndex);
          currentRow.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
              left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
              right: { style: 'thin', color: { argb: 'FFBFBFBF' } },
              bottom: { style: 'medium', color: { argb: 'FF000000' } },
            };
          });
        }

        if (isChild && (!nextRow || !nextIsChild)) {
          const currentRow = worksheet.getRow(groupRowIndex);
          currentRow.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
              left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
              right: { style: 'thin', color: { argb: 'FFBFBFBF' } },
              bottom: { style: 'medium', color: { argb: 'FF000000' } },
            };
          });
        }
      }

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F4E78' }, // dark blue
      };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
      headerRow.height = 20;

      // ✅ Auto-style all cells (alignment + border)
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        row.eachCell((cell) => {
          cell.alignment = {
            vertical: 'middle',
            horizontal: 'left',
          };
          // Don’t override bottom border if separator already applied
          if (!cell.border?.bottom || cell.border.bottom.style !== 'medium') {
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
              left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
              bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } },
              right: { style: 'thin', color: { argb: 'FFBFBFBF' } },
            };
          }
        });
      });

      const fileName = `${sheetName.replace(/\s+/g, '_')}_${Date.now()}.${fileType}`;
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

      await workbook.xlsx.write(res);
      return res.end();
    }

    return res.status(200).json({
      status: 200,
      totalCalculatedUsers,
      data: responseData,
      totalcount: totalCompanies,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllActivePlanParentChildCompanies = async (req, res, next) => {
  try {
    const {
      limit,
      page,
      searchQuery,
      exportData,
      activeCompanies = false,
    } = await req.body;

    const paginationQuery = {};

    const today = asiaKolkataDateTime(new Date()).slice(0, 10);

    if (!exportData && page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const companyCondition = {};
    const subscriptionCondition = { status: 1 };

    if (activeCompanies) {
      companyCondition.status = [1];
      subscriptionCondition.endDate = {
        [Sequelize.Op.gte]: today,
      };
    } else {
      companyCondition.status = [0, 1];
    }

    if (searchQuery) {
      companyCondition[Sequelize.Op.and].push({
        [Sequelize.Op.or]: [
          { companyName: { [Sequelize.Op.iLike]: `%${searchQuery}%` } },
        ],
      });
    }

    const order = [['companyName', 'ASC']];

    const getActivePlanCompanies = (
      await companyMaster.findAll({
        where: companyCondition,
        include: [
          {
            model: CompanySubscriptionMaster,
            where: subscriptionCondition,
            attributes: ['endDate'],
          },
        ],
      })
    ).map((company) => {
      return company.companyMasterID;
    });

    const condition = {
      [Sequelize.Op.or]: [
        { companyMasterID: { [Sequelize.Op.in]: getActivePlanCompanies } },
        {
          parentCompanyMasterID: { [Sequelize.Op.in]: getActivePlanCompanies },
        },
      ],
      status: [0, 1],
    };
    const { rows: company_master, count: totalcount } =
      await companyMaster.findAndCountAll({
        where: condition,
        ...paginationQuery,
        order,
        attributes: ['companyMasterID', 'companyName'],
      });

    return res.status(200).json({
      status: 200,
      // message: message.usermessage.companyget,
      data: company_master,
      totalcount,
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllRmHRMandHeadandSubAdmin = async (req, res, next) => {
  try {
    const allUsers = await UserMaster.findAll({
      where: {
        admin: {
          [Sequelize.Op.in]: [
            UserTypesEnum.SUB_ADMIN,
            UserTypesEnum.HRM_HEAD,
            UserTypesEnum.RM_HEAD,
            UserTypesEnum.HRM,
            UserTypesEnum.RM,
          ],
        },
        status: 1,
      },
    });

    return res.status(200).json({
      status: 200,
      data: allUsers,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllParentCompany = async (req, res, next) => {
  try {
    const { page, limit, searchQuery, Export } = req.body;

    const paginateCondition =
      page && limit && !Export ? { offset: (page - 1) * limit, limit } : {};

    const condition = { parentCompanyMasterID: 0, status: [0, 1] };

    if (searchQuery) {
      condition[Sequelize.Op.or] = [
        {
          companyName: {
            [Sequelize.Op.iLike]: `%${searchQuery}%`,
          },
        },
      ];
    }

    const allParentCompanies = await companyMaster.findAndCountAll({
      where: condition,
      ...paginateCondition,
      attributes: ['companyName', 'companyMasterID'],
    });

    return res.status(200).json({
      status: statusCodes.OK,
      data: allParentCompanies.rows,
      totalcount: allParentCompanies.count,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllActiveParentChildCompaniesWithZoho = async (req, res, next) => {
  try {
    const { page, limit, search = '' } = req.body;

    const userCompany = req.userDetails.companyMasterId;
    const userAccessType = req.userDetails.role.companyAccessType;
    const userRoleType = req.userDetails.role.roleType;

    let companywhere = {
      status: 1,
    };

    /*
     * ACCESSIBLE COMPANY LOGIC
     */
    if (
      userRoleType === roleType.COMPANY_WISE &&
      userAccessType === companyAccessType.OWN_PLUS_CHILD_COMPANY
    ) {
      companywhere = {
        ...companywhere,
        [Sequelize.Op.or]: [
          { companyMasterID: userCompany },
          { parentCompanyMasterID: userCompany },
        ],
      };
    } else {
      companywhere.companyMasterID = userCompany;
    }

    if (search?.trim()) {
      companywhere = {
        ...companywhere,
        [Sequelize.Op.and]: [
          {
            [Sequelize.Op.or]: [
              {
                companyName: {
                  [Sequelize.Op.iLike]: `%${search}%`,
                },
              },
              {
                '$zohoIntegration.organizationName$': {
                  [Sequelize.Op.iLike]: `%${search}%`,
                },
              },
            ],
          },
        ],
      };
    }

    const offset = (Number(page) - 1) * Number(limit);

    const { rows, count } = await companyMaster.findAndCountAll({
      offset,
      limit: Number(limit),
      distinct: true,
      attributes: [
        'companyMasterID',
        'companyName',
        'parentCompanyMasterID',
        'status',
      ],
      include: [
        {
          model: ZohoIntegration,
          as: 'zohoIntegration',
          attributes: [
            'id',
            'companyMasterID',
            'organizationID',
            'organizationName',
            'isActive',
            'accountingType',
          ],
          required: false,
        },
      ],
      where: companywhere,
      order: [['companyName', 'ASC']],
      subQuery: false,
    });

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: message.usermessage.fetchMessage('Company'),
      data: rows,
      totalRecords: count,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllActiveParentChildCompaniesWithGoogleSheetIntegration = async (
  req,
  res,
  next,
) => {
  try {
    let { page, limit, search = '' } = req.body;

    const userCompany = req.userDetails.companyMasterId;
    const userAccessType = req.userDetails.role.companyAccessType;
    const userRoleType = req.userDetails.role.roleType;

    let condition = {
      status: 1,
    };
    if (
      userRoleType === roleType.COMPANY_WISE &&
      userAccessType === companyAccessType.OWN_PLUS_CHILD_COMPANY
    ) {
      condition = {
        ...condition,
        [Op.or]: [
          { companyMasterID: userCompany },
          { parentCompanyMasterID: userCompany },
        ],
      };
    } else {
      condition.companyMasterID = userCompany;
    }
    let offset = (Number(page) - 1) * Number(limit);

    if (search?.trim()) {
      condition = {
        ...condition,
        [Op.and]: [
          {
            [Op.or]: [
              {
                companyName: {
                  [Op.iLike]: `%${search}%`,
                },
              },
              {
                '$googleSheetIntegration.email$': {
                  [Op.iLike]: `%${search}%`,
                },
              },
            ],
          },
        ],
      };
    }

    const queryOptions = {
      where: condition,
      distinct: true,
      attributes: [
        'companyMasterID',
        'companyName',
        'parentCompanyMasterID',
        'status',
      ],
      include: [
        {
          model: GoogleSheetIntegration,
          as: 'googleSheetIntegration',
          required: false,
          attributes: [
            'googleSheetIntegrationID',
            'companyMasterID',
            'email',
            'isActive',
          ],
        },
      ],
      order: [['companyName', 'ASC']],
      subQuery: false,
    };
    if (page || limit) {
      queryOptions.offset = Number(page - 1) * Number(limit);
      queryOptions.limit = Number(limit);
    }

    const { rows, count } = await companyMaster.findAndCountAll(queryOptions);

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: message.usermessage.fetchMessage('Google Sheet Integration'),
      data: rows,
      totalcount: count,
    });
  } catch (error) {
    next(error);
  }
};
