const express = require('express');
const { checkRolePermission } = require('../middleware/checkRolePermission');
const { permissionAccess } = require('../middleware/permissionAccess');
const fieldMapController = require('../controllers/fieldMap.controller');
const preboardingController = require('../controllers/preboarding.controller');

const DepartmentController = require('../controllers/department.controller');
const companyContactController = require('../controllers/companyContact.controller');
const companyMasterController = require('../controllers/companymaster.controller');
const biometricIntegration = require('../controllers/biometricIntegration.controller');
const bonusPolicyController = require('../controllers/bonusPolicy.controller');
const branchMasterController = require('../controllers/branchmaster.controller');
const depositcategoryController = require('../controllers/depositCategory.controller');
const assetCategoryController = require('../controllers/assetcategory.controller');
const employeeAssetController = require('../controllers/assignassettoemp.controller');
const attendanceBonusPolicycontroller = require('../controllers/attendanceBonusPolicy.controller');
const AttendanceCorrectionReasonController = require('../controllers/attendanceCorrectionReason.controller');
const attendancePolicyController = require('../controllers/attendancepolicy.controller');
const AuthorizationDetailsController = require('../controllers/authorizationDetails.controller');
const foodAllowancePolicyController = require('../controllers/foodAllowancePolicy.controller');
const designationController = require('../controllers/designation.controller');
const divisionController = require('../controllers/division.controller');
const canteenDetailsController = require('../controllers/canteenDetails.controller');
const CheckListController = require('../controllers/checklist.controller');
const CompanySkillCategoryController = require('../controllers/companySkillCategory.controller');
const contractorcontroller = require('../controllers/contractor.controller');
const customerController = require('../controllers/customer.controller');
const CustomerIndustry = require('../controllers/customerIndustry.controller');
const GoalController = require('../controllers/goal.controller');
const GoalSettingController = require('../controllers/goalSetting.controller');
const holidayPolicyController = require('../controllers/holidaypolicy.controller');
const hrLeaveTypesController = require('../controllers/hrLeaveTypes.controller');
const hrSalaryFieldsController = require('../controllers/hrsalaryfields.controller');
const EmployeeProjectController = require('../controllers/employeeProject.controller');
const expensecategoryController = require('../controllers/expensecategory.controller');
const LateEarlyPolicyController = require('../controllers/lateEarlyPolicy.controller');
const Ndacategorycontroller = require('../controllers/Ndacategory.controller');
const officeExpenseCategoryController = require('../controllers/officeExpenseCategory.controller');
const officeExpenseHeadController = require('../controllers/officeExpenseHead.controller');
const orgAuthorizationTypeController = require('../controllers/orgAuthorizationType.controller');
const payheadController = require('../controllers/payhead.controller');
const PaySlipGeneratorController = require('../controllers/paySlipGenerator.controller');
const penaltyController = require('../controllers/penalty.controller');
const productController = require('../controllers/product.controller');
const ProjectController = require('../controllers/project.controller');
const salaryPolicyController = require('../controllers/salarypolicy.controller');
const shiftController = require('../controllers/shift.controller');
const shortLeaveController = require('../controllers/shortLeave.controller');
const SiteController = require('../controllers/site.controller');
const ticketCategoryController = require('../controllers/ticketCategory.controller');
const ticketSubCategoryController = require('../controllers/ticketSubCategory.controller');
const expenseheadController = require('../controllers/expensehead.controller');
const expensePolicyController = require('../controllers/expensePolicy.controller');
const ExpensePurposeController = require('../controllers/expensePurpose.controller');
const meetingplaceController = require('../controllers/meetingPlace.controller');
const MeetingPurpose = require('../controllers/meetingPurpose.controller');
const ReviewFormController = require('../controllers/reviewForm.controller');
const RoleMasterController = require('../controllers/roleMaster.controller');
const weekOffPolicyController = require('../controllers/weekoffpolicy.controller');
const workingAreaController = require('../controllers/workingArea.controller');
const WorkingLocation = require('../controllers/workingLocation.controller');
const visitController = require('../controllers/visit.controller');
const toursMastercontroller = require('../controllers/toursMaster.controller');
const visitPurposeController = require('../controllers/visitpurpose.controller');
const lmsCourseController = require('../controllers/lmsCourse.controller');
const router = express.Router();
const { verifyChildParent } = require('../middleware/verifyChildParent');
const { validateSchema } = require('../middleware/validateSchema');
const { listGoalSchema } = require('../validators/goal');
const { reqObjectType } = require('../utils/commonVars');
const { listGoalSettingSchema } = require('../validators/goalSetting');
const { listReviewForm } = require('../validators/reviewForm');

// Department
router.get(
  '/v1/getDepartmentDropdown/:id',
  DepartmentController.getDepartmentByCompanyId,
);

// Company Contact
router.post(
  '/v1/usersDropdown',
  checkRolePermission,
  permissionAccess,
  companyContactController.getAllUsersForDropdown,
);

router.post('/v1/fieldMapDropdown', fieldMapController.getFieldMapDropdown);
router.post(
  '/v1/preboardingFormCustomizeFieldDropdown',
  preboardingController.getPreboardingFormCustomizeDropdown,
);
// Company Master
router.post(
  '/v1/companyDropdown',
  companyMasterController.getCompanyListByCompanyAccessType,
);

router.post('/v1/allCompanyDropdown', companyMasterController.getCompanyTree);
router.post('/v1/allCompanyWiseUsersDropdown', companyMasterController.getUser);

// Biometric Integration
router.post(
  '/v1/biometricIntegrationDropdown',
  biometricIntegration.getBiometricIntegrationByCompId,
);
router.post(
  '/v1/allChildParentCompanyBiometricIntegrationDropdown',
  biometricIntegration.getbyChildParentCompany,
);

// Bonus Policy
router.get(
  '/v1/bonusPolicyDropdown/:id',
  bonusPolicyController.getActiveBonusPolicyByCompanyId,
);
router.post(
  '/v1/bonusPolicyBranchDepartmentDesignationWiseDropdown',
  bonusPolicyController.getBranchDepartmentDesignationWisePolicies,
);

// Branch Master
router.get(
  '/v1/branchDropdown/:id',
  permissionAccess,
  branchMasterController.getBranchByCompanyId,
);

// Deposit Category
router.get(
  '/v1/depositCategoryDropdown/:id',
  depositcategoryController.getDepositCategoryByCompanyId,
);

// Asset Category
router.get(
  '/v1/assetCategoryDropdown/:id',
  assetCategoryController.getactiveassetcategorybycompanyid,
);

// Assign Asset
router.post(
  '/v1/assetByAssetCategoryDropdown',
  employeeAssetController.GetbyAssetCategoryID,
);

// AttendanceBonus Policy
router.get(
  '/v1/attendanceBonusPolicyDropdown',
  attendanceBonusPolicycontroller.listdata,
);

// AttendanceCorrection Reason
router.post(
  '/v1/attendanceCorrectionReasonDropdown',
  AttendanceCorrectionReasonController.listAttendanceCorrectionReason,
);

// attendance Policy
router.post(
  '/v1/attendancePolicyDropdown',
  attendancePolicyController.getAllAttendancePolicyData,
);
router.get(
  '/v1/activeAttendancePolicyDropdown/:id',
  attendancePolicyController.getactiveattendancebycompanyid,
);
router.post(
  '/v1/attendancePolicyBranchDepartmentDesignationWiseDropdown',
  attendancePolicyController.getBranchDepartmentDesignationWisePolicies,
);

// Authorization Details
router.post(
  '/v1/authorizationedUserDropDown',
  checkRolePermission,
  AuthorizationDetailsController.getAuthorizationedUserForDropDown,
);

// FoodAllowance Policy
router.post(
  '/v1/foodAllowancePolicyBranchDepartmentDesignationWiseDropdown',
  foodAllowancePolicyController.getBranchDepartmentDesignationWisePolicies,
);

// Designation
router.get(
  '/v1/designationDropdown/:id',
  designationController.getDesignationByCompanyId,
); //get by id

// DIVISION
router.get(
  '/v1/divisionDropdown',
  verifyChildParent,
  divisionController.listData,
);

// Canteen Details
router.post('/v1/canteenDropdown', canteenDetailsController.list);

// Check List
router.post('/v1/checkListDropdown', CheckListController.getAllCheckList);

// Company Skill Category
router.post(
  '/v1/companyWiseSkillCategoryDropdown',
  CompanySkillCategoryController.getCompanyWiseSkillCategory,
);

// contractor
router.get('/v1/contractorDropdown', contractorcontroller.listdata);

// Customer
router.post(
  '/v1/companyCustomerDropdown',
  customerController.getCustomerByCompanyId,
);
router.post(
  '/v1/userWiseCustomerDropdown',
  customerController.getAllCustomerDataNew,
);

// Customer Industry
router.post(
  '/v1/customerIndustryDropdown',
  CustomerIndustry.getCustomerIndustryByCompanyId,
);

// Goal
router.get(
  '/v1/goalDropdown',
  validateSchema(listGoalSchema, reqObjectType.QUERY),
  verifyChildParent,
  GoalController.listGoal,
);
router.get(
  '/v1/companyWiseGoalDropdown/:companyMasterID',
  verifyChildParent,
  GoalController.getCompanyWiseGoal,
);

// Goal Settings
router.get(
  '/v1/goalSettingDropdown',
  validateSchema(listGoalSettingSchema, reqObjectType.QUERY),
  verifyChildParent,
  GoalSettingController.listGoalSetting,
);

// Holiday Policy
router.get(
  '/v1/holidayPolicyDropdown/:id',
  holidayPolicyController.getactiveholidaypolicybycompanyid,
);
router.post(
  '/v1/holidayPolicyBranchDepartmentDesignationWiseDropdown',
  holidayPolicyController.getBranchDepartmentDesignationWisePolicies,
);

// HR Leave Types
router.post(
  '/v1/leaveTypesByUserDropdown',
  hrLeaveTypesController.leaveTypesByUser,
);
router.get(
  '/v1/leaveTypesWithoutOutDutyDropdown/:id',
  hrLeaveTypesController.listDataWithoutOutdoorDuty,
);
router.get(
  '/v1/leaveTypeForManageLeaveDropdown/:id',
  hrLeaveTypesController.listLeaveTypeForManageLeave,
);

// hr Salary Fields
router.post('/v1/hrFieldsDropdown', hrSalaryFieldsController.getallbycompany);
router.post(
  '/v1/companywiseHrFieldsDropdown',
  hrSalaryFieldsController.getbycompanyidforgradedropdown,
);
router.post(
  '/v1/companyPayheadDropdown',
  hrSalaryFieldsController.getpayheadbycompany,
);

// Employee project
router.post(
  '/v1/employeeProjectDropdown',
  EmployeeProjectController.getAllEmployeeProject,
);

// Expense Category
router.post(
  '/v1/expenseCategoryDropdown',
  expensecategoryController.getexpenseCategorycompanyid,
);

// Late Early Policy
router.post(
  '/v1/lateEarlyPolicyDropdown',
  LateEarlyPolicyController.listLateEarlyPolicy,
);
router.post(
  '/v1/lateEarlyPolicyBranchDepartmentDesignationWiseDropdown',
  LateEarlyPolicyController.getBranchDepartmentDesignationWisePolicies,
);

// Nda category
router.post('/v1/ndaCategoryDropdown', Ndacategorycontroller.getuserCompanyId);

// Office Expense Category
router.post(
  '/v1/officeExpenseCategoryDropdown',
  officeExpenseCategoryController.getAllOfficeExpenseCategory,
);

// Office Expense Head
router.post(
  '/v1/officeExpenseHeadDropdown',
  officeExpenseHeadController.getAllOfficeExpenseHead,
);

// Org Authorization Type
router.post(
  '/v1/orgAuthorizationTypeDropdown',
  orgAuthorizationTypeController.getOrgAuthorizationType,
);

// Payhead
router.post('/v1/allPayheadDropdown', payheadController.getAllPayhead);

// Payslip Generator
router.post('/v1/dateRangesDropdown', PaySlipGeneratorController.getDateRanges);

// Penalty
router.get(
  '/v1/penaltyDropdown/:id',
  penaltyController.getactivepenaltybycompanyid,
);

// Product
router.post('/v1/productDropdown', productController.getActiveProductByCompanyId);

// Project
router.post('/v1/projectDropdown', ProjectController.listProjects);

// Salary Policy
router.post(
  '/v1/salaryPolicyBranchDepartmentDesignationWiseDropdown',
  salaryPolicyController.getBranchDepartmentDesignationWisePolicies,
);

// Shift
router.get('/v1/shiftDropdown/:id', shiftController.getactiveshiftbycompanyid);
router.post('/v1/userWiseShiftDropdown', shiftController.getUserListOfShift);
router.post(
  '/v1/workerTypeWiseShiftDropdown',
  shiftController.getShiftByWorkerType,
);

// Short Leave
router.get(
  '/v1/shortLeavePolicyDropdown',
  shortLeaveController.getAllShortLeaveData,
);
router.post(
  '/v1/shortLeavePolicyBranchDepartmentDesignationWiseDropdown',
  shortLeaveController.getBranchDepartmentDesignationWisePolicies,
);

// Site
router.post('/v1/siteDropdown', SiteController.listSite);

// Ticket Category
router.get(
  '/v1/ticketCategoryDropdown',
  verifyChildParent,
  ticketCategoryController.listTicketCategory,
);

// Ticket Sub Category
router.get(
  '/v1/ticketSubCategoryDropdown',
  verifyChildParent,
  ticketSubCategoryController.listTicketSubCategory,
);

// Expense Head
router.post(
  '/v1/expenseHeadByCompanyDropdown',
  expenseheadController.getexpenseHeadcompanyid,
);
router.get(
  '/v1/expenseHeadByCategoryDropdown/:id',
  expenseheadController.getactiveexpenseheadbycategoryid,
);

// Expense Policy
router.post(
  '/v1/availableExpensePolicyDropdown',
  expensePolicyController.getAvailableExpenseTypes,
);

// Expense Purpose
router.post(
  '/v1/expensePurposeDropdown',
  ExpensePurposeController.getAllActiveExpensePurpose,
);

// Meeting Place
router.get(
  '/v1/meetingPlaceDropdown/:id',
  meetingplaceController.getmeetingPlaceByCompanyId,
);

// Meeting Purpose
router.post('/v1/meetingPurposeDropdown', MeetingPurpose.listMeetingPurposes);

// ReviewForm
router.get(
  '/v1/reviewFormDropdown',
  validateSchema(listReviewForm, reqObjectType.QUERY),
  verifyChildParent,
  ReviewFormController.listReviewForm,
);

// Role Master
router.post('/v1/roleDropdown', RoleMasterController.listRoleMaster);

// Weekoff Policy
router.get(
  '/v1/weekoffPolicyDropdown/:id',
  weekOffPolicyController.getactiveweekoffbycompanyid,
);
router.post(
  '/v1/weekoffeavePolicyBranchDepartmentDesignationWiseDropdown',
  weekOffPolicyController.getBranchDepartmentDesignationWisePolicies,
);

// Working Area
router.get(
  '/v1/workingAreaDropdown',
  verifyChildParent,
  workingAreaController.listData,
);

// Working Location
router.post(
  '/v1/workinglocationDropdown',
  WorkingLocation.getWorkingLocationReports,
);

// Visit
router.get(
  '/v1/approvedAssignedVisitDropdown/:id',
  visitController.getApprovedVisitByAssignID,
);

// Tour
router.post('/v1/tourDropdown', toursMastercontroller.getApprovedUserID);
router.post(
  '/v1/visitPurposeDropdown',
  visitPurposeController.getVisitActivePurposeByCompanyId,
);

// Course Dropdown
router.post('/v1/courseDropdown', lmsCourseController.getCourseDropdown);
router.get('/v1/courseDropdown', lmsCourseController.getCourseDropdown);

module.exports = router;
