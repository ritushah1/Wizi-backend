const express = require('express');
const router = express.Router();
const monthwiseCalender = require('../controllers/monthwiseCalender.controller');
const userAddressController = require('../controllers/useraddress.controller');
const userExperienceController = require('../controllers/userexperience.controller');
const userFamilyController = require('../controllers/userfamily.controller');
const userEducationController = require('../controllers/usereducation.controller');
const employeeReportToController = require('../controllers/employeereportto.controller');
const employeeBranchController = require('../controllers/employeeBranch.controller');
const employeeDepartmentController = require('../controllers/employeedepartment.controller');
const employeeDesignationController = require('../controllers/employeedesignation.controller');
const employeeShiftController = require('../controllers/employeeshift.controller');
const companyDocumentController = require('../controllers/companydocument.controller');
const userDocumentController = require('../controllers/userdocument.controller');
const employeeAttendancePolicyController = require('../controllers/employeeattendancepolicy.controller');
const employeeWeekOffController = require('../controllers/employeeweekoff.controller');
const employeeHolidayPolicyController = require('../controllers/employeeHolidayPolicy.controller');
const employeeShortLeavePolicy = require('../controllers/employeeShortLeavePolicy.controller');
const employeeAttendanceBonusPolicyController = require('../controllers/empattandancebonuspolicy.controller');
const employeeFoodAllowancePolicyController = require('../controllers/employeeFoodAllowancePolicy.controller');
const employeeJoiningController = require('../controllers/employeeJoiningDetails.controller');
const UserLetters = require('../controllers/userLetters.controller');
const JoiningDocumentController = require('../controllers/joiningDocument.controller');
const DailyTask = require('../controllers/dailyTask.controller');
const userTaskController = require('../controllers/User_Tasks.controller');
const attendancetransactionController = require('../controllers/attendancetransaction.controller');
const loanMasterController = require('../controllers/loanMaster.controller');
const advancePaymentController = require('../controllers/advancePayment.controller');
const userleaveController = require('../controllers/userleave.controller');
const attendanceCorrectionRequestController = require('../controllers/attendanceCorrectionRequest.controller');
const UserResignation = require('../controllers/resignation.controller');
const expenseAdvanceRequestController = require('../controllers/expenseAdvanceRequest.controller');
const userShortLeave = require('../controllers/userShortLeave.controller');
const reportToController = require('../controllers/reportTo.controller');
const depositController = require('../controllers/deposit.controller');
const expenseController = require('../controllers/userExpense.controller');
const employeePenaltyController = require('../controllers/employeepenalty.controller');
const employeeincentivecontroller = require('../controllers/employeeincentive.controller');
const empLeavePolicyController = require('../controllers/empLeavePolicy.controller');
const datewiseAttendancepolicycontroller = require('../controllers/datewiseAttendancepolicy.controller');
const coffMaster = require('../controllers/coffMaster.controller');
const shortLeaveAuthorization = require('../controllers/shortLeaveAuthorization.controller');
const hrSalaryTransaction = require('../controllers/hrSalaryTransaction.controller');
const attendanceCorrectionAuthorizationController = require('../controllers/attendanceCorrectionAuthorization.controller');
const authorizationRequestController = require('../controllers/gatePassAuthorization.controller');
const empWorkAgreement = require('../controllers/empWorkAgreement.controller');
const AttendanceApiController = require('../controllers/attendanceApi.controller');
const employeeLateEarlyController = require('../controllers/employeeLateEarlyPolicy.controller');const Certificate = require('../controllers/certificate.controller');

const {
  uploadFamilyDetails,
  uploadEducationDetails,
  uploadUserDocumentDetails,
  uploadDailyTaskDetails,
  uploadResignation,
  uploadUserLeaves,
  uploadWebMobileAttendanceAttachment,
} = require('../middleware/uploadFile');
const { permissionAccess } = require('../middleware/permissionAccess');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
// Monthwise Calender
router.post(
  '/v1/getCalenderMonthwiseUserCalender',
  monthwiseCalender.getCalenderMonthwiseUserCalender,
);
router.post('/v1/getUserAttendance', monthwiseCalender.getUserAttendance);

// Address
router.post('/v1/addMyAddress', userAddressController.postAddUserAddress);
router.get('/v1/getMyAddress', userAddressController.getMyAddress);
router.post('/v1/updateMyAddress', userAddressController.postUpdateUserAddress); //update user address data
router.post(
  '/v1/deleteMyAddress',
  userAddressController.postDeleteUserAddressById,
);
router.get(
  '/v1/getMyAddressById/:id',
  userAddressController.getUserAddressById,
);

//Experience
router.post(
  '/v1/addMyExperience',
  userExperienceController.postAddUserExperience,
);
router.get('/v1/getMyExperience', userExperienceController.getMyExperience);
router.post(
  '/v1/updateMyExperience',
  userExperienceController.postUpdateUserExperience,
);
router.post(
  '/v1/deleteMyExperience',
  userExperienceController.postDeleteUserExperienceById,
);
router.get(
  '/v1/getMyExperienceById/:id',
  userExperienceController.getUserExperienceById,
);

// Family
router.post(
  '/v1/addMyFamily',
  uploadFamilyDetails,
  userFamilyController.postAdduserFamily,
);
router.get('/v1/getMyFamily', userFamilyController.getMyFamily);
router.post(
  '/v1/updateMyFamily',
  uploadFamilyDetails,
  userFamilyController.postUpdateuserFamily,
);
router.post(
  '/v1/deleteMyFamily',
  userFamilyController.postDeleteuserFamilyById,
);
router.get('/v1/getMyFamilyById/:id', userFamilyController.getuserFamilyById);

// Education
router.post(
  '/v1/addMyEducation',
  uploadEducationDetails,
  userEducationController.postAddUserEducation,
);
router.get('/v1/getMyEducation', userEducationController.getMyEducation);
router.post(
  '/v1/updateMyEducation',
  uploadEducationDetails,
  userEducationController.postUpdateUserEducation,
);
router.post(
  '/v1/deleteMyEducation',
  userEducationController.postDeleteUserEducationById,
);
router.get(
  '/v1/getMyEducationById/:id',
  userEducationController.getUserEducationById,
);

// Employee Report To
router.get(
  '/v1/getMyReportTo',
  employeeReportToController.getEmployeeReportToById,
);

// Employee Branch
router.get(
  '/v1/getMyBranch',
  employeeBranchController.getEmployeeBranchByUserId,
);

// Employee Department
router.get(
  '/v1/getMyDepartment',
  employeeDepartmentController.getEmployeeDepartmentByUserId,
);

// Employee Designation
router.get(
  '/v1/getMyDesignation',
  employeeDesignationController.getEmployeeDesignationByUserId,
);

// Employee Shift
router.get('/v1/getMyShift', employeeShiftController.getEmployeeShiftByUserId);

// Company Document
router.get(
  '/v1/getMyCompanyDocument',
  companyDocumentController.getUserDocumentByUserMasterId,
);

// User Document
router.post(
  '/v1/addMyUserDocument',
  uploadUserDocumentDetails,
  userDocumentController.postAddUserDocument_V2,
);
router.get('/v1/getMyUserDocuments', userDocumentController.getMyUserDocuments);
router.post(
  '/v1/updateMyUserDocument',
  uploadUserDocumentDetails,
  userDocumentController.postUpdateUserDocument_V2,
);
router.post(
  '/v1/deleteMyUserDocument',
  userDocumentController.postDeleteUserDocumentById,
);
router.get(
  '/v1/getMyUserDocumentsById/:id',
  userDocumentController.getUserDocumentById,
);

// Employee Attendance Policy
router.get(
  '/v1/getMyAttendancePolicy',
  employeeAttendancePolicyController.getAttendancePolicyByUserId,
);

// Employee Week Off Policy
router.get(
  '/v1/getMyWeekOffPolicy',
  employeeWeekOffController.getEmployeeWeekOffByUserId,
);

// Employee Holiday Policy
router.get(
  '/v1/getMyHolidayPolicy',
  employeeHolidayPolicyController.getEmployeeHolidayPolicyByUserId,
);

// Employee Short Leave Policy
router.get(
  '/v1/getMyShortLeavePolicy',
  employeeShortLeavePolicy.getEmpLeavePolicyByUserId,
);

// Employee Attendance Bonus Policy
router.get(
  '/v1/getMyAttendanceBonusPolicy',
  employeeAttendanceBonusPolicyController.getEmployeeAttendanceBonuByUserId,
);

// Employee Food Allowance Policy
router.get(
  '/v1/getMyFoodAllowancePolicy',
  employeeFoodAllowancePolicyController.getByUserId,
);

// Employee ID Card
router.post('/v1/getMyIdCard', employeeJoiningController.employeeIdCard);

// User Letters
router.post('/v1/getMyLetters', UserLetters.getEmployeeLetters);

// Joining Document
router.post(
  '/v1/getMyJoiningDocument',
  JoiningDocumentController.getEmployeeJoiningDocument,
);

// Daily Task
// V2 routes
router.post(
  '/v1/addMyDailyTask',
  uploadDailyTaskDetails,
  DailyTask.postAdddailyTaskNew,
);

router.post('/v2/getAll', DailyTask.getAllTaskNew);

router.post(
  '/v1/updateMyDailyTask',
  uploadDailyTaskDetails,
  DailyTask.updateNew,
);
router.post('/v1/deleteMyDailyTask', DailyTask.postDelete);

// User Task
router.post('/v1/myTaskAcceptReject', userTaskController.TaskAcceptReject);

// loan master

router.post('/v1/addLoanMasterRequest', loanMasterController.postAddLoanMaster);

router.post(
  '/v1/addMyAdvancePaymentRequest',
  advancePaymentController.postAddRequestAdvancePaymentdata,
);

router.post('/v1/myLeaveAdd', userleaveController.postBulkAddLeave_Web);

router.post('/v1/addMyOutdoorDuty', userleaveController.addOutdoorDuty);

router.post('/v1/getMyWorkAgreement', empWorkAgreement.getMyWorkAgreement);

router.post(
  '/v1/addMyAttendanceCorrection',
  attendanceCorrectionRequestController.addData,
);

router.post(
  '/v1/addMyResignation',
  uploadResignation,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.RESIGNATION,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.ADDEMPLOYEERESIGNATION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  UserResignation.postAddUserResignation,
);

router.post(
  '/v1/updateMyExpenseAdvanceRequest',
  expenseAdvanceRequestController.updateExpenseAdvanceRequestV2,
);

router.post(
  '/v1/updateMyLeave',
  uploadUserLeaves,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LEAVEAPPLICATION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  userleaveController.updateUserData,
);

router.put(
  '/v1/updateMyOutdoorDuty/:id',
  userleaveController.updateOutdoorDuty,
);

router.post(
  '/v1/addMyShortLeave',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYSHORTLEAVEAPPLICATION,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.BULKSHORTLEAVEAPPLICATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  userShortLeave.add,
);

router.put(
  '/v1/updateAttendanceCorrection/:id',
  attendanceCorrectionRequestController.updateData,
);

router.get(
  '/v1/reportstostructure',
  permissionAccess,
  reportToController.reportstoforStructureV2,
);

router.post(
  '/v1/getMyAdvanceRequest',
  advancePaymentController.getadvanceByUseridV2,
);

router.post('/v1/getMyDeposit', depositController.getDepositByuseridV2);

router.post(
  '/v1/getMyExpenseLedger',
  expenseController.employeeSideExpenseLedgerV2,
);

router.post(
  '/v1/getMyPenalty',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEPENALTY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeePenaltyController.getPenaltyByUserIDV2,
); // get by user id

router.get(
  '/v1/getMyIncentive',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYINCENTIVE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeincentivecontroller.getMyIncentiveV2,
);

router.get(
  '/v1/getEmpLeavePolicyByUserId',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LEAVEAPPLICATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.LEAVEAPPLICATION,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  empLeavePolicyController.getEmpLeavePolicyByUserId,
);

router.post(
  '/v1/getMyOutsideAttendance',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OUTSIDEATTENDANCEPERMISSION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.TEAMOUTSIDEATTENDANCEPERMISSION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  datewiseAttendancepolicycontroller.getalldatabyid,
);

router.post(
  '/v1/getAllMyCoff',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYCOMPENSATORYOFF,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.COMPENSATORYOFF,
        operation: formOperation.VIEW,
      },
    ],
  }),
  coffMaster.getAllCoff,
); //get all Coff data

router.post(
  '/v1/getMySalarySlip',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SALARYSLIP,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  hrSalaryTransaction.getUserWiseSalarySlipV2,
);

router.post(
  '/v1/getMyOvertime',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYOVERTIME,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendancetransactionController.getovertimeuserwiseV2,
);

router.post(
  '/v1/getAuthorizationRequestByReferenceId',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SHORTLEAVEAUTHORIZATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.MYSHORTLEAVEAPPLICATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ADMINSHORTLEAVEAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  shortLeaveAuthorization.getAuthorizationRequestByReferenceIdV2,
);

router.post(
  '/v1/myAttendanceCorrectiornDetails',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECORRECTIONREQUEST,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ATTENDANCECORRECTIONREQUEST,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendanceCorrectionAuthorizationController.getAuthorizationRequestByIdV2,
);

router.post(
  '/v1/getMyGatePassDetails',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEGATEPASSAUTHORIZATIONREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  authorizationRequestController.getAuthorizationRequestByIdV2,
);

router.post(
  '/v1/myMarkWebMobileAttendance',
  uploadWebMobileAttendanceAttachment,
  AttendanceApiController.webMobileAttendanceApi,
);
router.get(
  '/v1/getMyLateEarlyPolicy',
  employeeLateEarlyController.getMyLateEarlyPolicy,
);

router.post(
  '/v1/myCPD',
  Certificate.getMyCertificates,
);
module.exports = router;
