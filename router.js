'use strict';
const API = require('./middleware/apikey');
const countryMasterRoutes = require('./routes/countrymaster.router');
const stateMasterRoutes = require('./routes/statemaster.router');
const cityMasterRoutes = require('./routes/citymaster.router');
const professionalTaxMasterRoutes = require('./routes/professionaltaxmaster.router');
const productMasterRoutes = require('./routes/productmaster.router');
const branchMasterRoutes = require('./routes/branchmaster.router');
const bankMasterRoutes = require('./routes/bankmaster.router');
const testRoutes = require('./routes/test');
const companyMasterRoutes = require('./routes/companymaster.router');
const CompanyTypeRoutes = require('./routes/companytype.router');
const formMasterRoutes = require('./routes/formmaster.router');
const CompanyContactRoutes = require('./routes/companycontact.router');
const subscriptionRoutes = require('./routes/subscription.route');
const designationRoutes = require('./routes/designation.router');
const categoryMasterRoutes = require('./routes/categoryMaster.router');
const questionCategoryMasterRoutes = require('./routes/questionCategoryMaster.router');
const departmentRoutes = require('./routes/department.router');
const authRoutes = require('./routes/auth.router');
const lmsSsoRoutes = require('./routes/lmsSso.router');
const hrSalaryFieldsRoutes = require('./routes/hrsalaryfields.router');
const userAddressRoutes = require('./routes/useraddress.router');
const userExperienceRoutes = require('./routes/userexperience.router');
const userEducationRoutes = require('./routes/usereducation.router');
const shiftRoutes = require('./routes/shift.router');
const documentListRoutes = require('./routes/documentlist.router');
const userDocumentRoutes = require('./routes/userdocument.router');
const gradeStructureRoutes = require('./routes/gradestructure.router');
const userfamilyroutes = require('./routes/userfamily.router');
const userSkillsRoutes = require('./routes/userskills.router');
const employeeReportToRoutes = require('./routes/employeereportto.router');
const employeeDepartmentRoutes = require('./routes/employeedepartment.router');
const employeeBranchRoutes = require('./routes/employeebranch.router');
const employeeHolidayPolicyRoutes = require('./routes/employeeholidaypolicy.router');
const employeeDesignationRoutes = require('./routes/employeedesignation.router');
const weekOffPolicyRoutes = require('./routes/weekoffpolicy.router');
const holidayPolicyRoutes = require('./routes/holidaypolicy.router');
const employeeWeekOffRoutes = require('./routes/employeeweekoff.router');
const customerRoutes = require('./routes/customer.router');
const visitPurposeRoutes = require('./routes/visitpurpose.router');
const productRoutes = require('./routes/product.router');
const visitRoutes = require('./routes/visit.router');
const gradeSalaryStructureRoutes = require('./routes/gradesalarystructure.router');
const companyDocumentTypeRoutes = require('./routes/companydocumenttype.router');
const companyDocumentRoutes = require('./routes/companydocument.router');
const announcementRoutes = require('./routes/announcement.router');
const employeeDigitalSignatureRoutes = require('./routes/employeedigitalsignature.router');
const userTrackingRoutes = require('./routes/usertracking.router');
const payheadRoutes = require('./routes/payhead.router');
const assetCategoryRoutes = require('./routes/assetcategory.router');
const penaltyRoutes = require('./routes/penalty.router');
const employeeAssetRoutes = require('./routes/assignassettoemp.router');
const commonRoutes = require('./routes/common.router');
const functionRoutes = require('./routes/function.router');
const empPenaltyRoutes = require('./routes/employeepenalty.router');
const expenseCategoryRoutes = require('./routes/expensecategory.router');
const expenseHeadRoutes = require('./routes/expensehead.router');
const expensePolicyRoutes = require('./routes/expensePolicy.router');
const labourServiceChargeRoutes = require('./routes/labourServiceCharge.router');
const expensePriceRoutes = require('./routes/expenseprice.router');
const visitformcustomizeRoutes = require('./routes/visitformcustomize.router');
const visitformcustomizevalueRoutes = require('./routes/visitfieldcustomizevalue.router');
const hrLeaveTypes = require('./routes/hrleavetypes.router');
const operationRoutes = require('./routes/operation.router');
const hrSalarymasterRoutes = require('./routes/hrSalaryMaster.router');
const authorizationCriteriaMasterRoutes = require('./routes/authorizationcriteriamaster.router');
const visitReportMasterRoutes = require('./routes/visitreportmaster.router');
const empJoiningRoutes = require('./routes/employeeJoining.router');
const hrLeaveMasterRoutes = require('./routes/hrLeaveMaster.router');
const hrLeaveMonthlyTransRoutes = require('./routes/hrleavesmonthlytrans.router');
const VisitReportCustomizeRoutes = require('./routes/visitreportcustomize.router');
const VisitReportCustomizeValueRoutes = require('./routes/visitreportcustomizevalue.router');
const TrackingRoutes = require('./routes/tracking.router');
const toursMasterRoutes = require('./routes/toursMaster.router');
const attendancetransactionRoutes = require('./routes/attendanceTransaction.router');
const advancePaymentRoutes = require('./routes/advancepayment.router');
const overTimeCalculation = require('./routes/overTimeCalculation.router');
const preboardingRoutes = require('./routes/preboarding.router');
const preboardingformcustomizeRoutes = require('./routes/preboardingformcustomize.router');
const preboardingformcustomizevalueRoutes = require('./routes/preboardingfieldcustomizevalue.router');
const callfollowupRoutes = require('./routes/callfollowup.router');
const loanMasterRoutes = require('./routes/loanmaster.router');
const form16Routes = require('./routes/form16.router');
const versionRoutes = require('./routes/appversion.router');
const preboardingRequestRoutes = require('./routes/preboardingRequest.router');
const employeeShiftRoutes = require('./routes/employeeshift.router');
const attendancePolicyRoutes = require('./routes/attendancepolicy.router');
const salaryPolicyRoutes = require('./routes/salarypolicy.router');
const employeeAttendancePolicyRoutes = require('./routes/employeeattendancepolicy.router');
const employeeSalaryPolicyRoutes = require('./routes/employeesalarypolicy.router');
const UserLeaveRoutes = require('./routes/userleave.router');
const authorizationRequestRoutes = require('./routes/authorizationRequest.router');
const leaveauthorizationRequestRoutes = require('./routes/leaveAuthorizationRequest.router');
const authorizationMaster = require('./routes/authorizationmaster.router');
const AuthorizationDetails = require('./routes/AuthorizationDetails.router');
const leavebalRoutes = require('./routes/HrLeaveBalance.router');
const userExpenseRoutes = require('./routes/userExpense.router');
const salaryTransRoutes = require('./routes/hrSalaryTransaction.router');
const reportToRouters = require('./routes/reportTo.router');
const biometricRouters = require('./routes/biometric.router');
const reportRouters = require('./routes/report.router');
const NdacategoryRouters = require('./routes/Ndacategory.router');
const EmployeeNdaRouters = require('./routes/employeeNda.router');
const depositcategory = require('./routes/depositCategory.router');
const depositRoutes = require('./routes/deposit.router');
const meetingPlaceRoutes = require('./routes/meetingPlace.router');
const visitorsRoutes = require('./routes/visitors.router');
const gatePass = require('./routes/gatePass.router');
const NdaReportRouters = require('./routes/Ndareport.router');
const AssetReportRouters = require('./routes/Assetreport.router');
const PenaltyReportRouters = require('./routes/penaltyReport.router');
const AdvanceReportRouters = require('./routes/advancepaymentreport.router');
const assetMasterRoutes = require('./routes/assetMaster.router');
const employeeEmployeement = require('./routes/employeeEmployeement.router');
const erpAccountMaster = require('./routes/erpAccountMaster.router');
const empLetterHeadRouters = require('./routes/empLetterHead.router');
const biometricIntegration = require('./routes/biometricIntegration.router');
const tankhwapatraDatabaseList = require('./routes/biometricconfigurationdb.router');
const mannualAttendanceRouters = require('./routes/mannualAttendance.router');
const datewiseattendancePolicy = require('./routes/datewiseAttendancepolicy.router');
const coffMaster = require('./routes/coffMaster.router');
const hrToolKitRouters = require('./routes/hrToolKit.router');
const Resignation = require('./routes/resignation.router');
const ResignProcessRouters = require('./routes/resignProcess.router');
const ResignTaskAssign = require('./routes/resignTaskAssign.router');
const IncentivetypeRouters = require('./routes/incentivetype.router');
const employeeincentiveRouters = require('./routes/employeeincentive.router');
const dailyTaskRouters = require('./routes/dailyTask.router');
const VehicleUsage = require('./routes/vehicleUsage.router');
const employeeAccident = require('./routes/employeeAccident.router');
const expensePayment = require('./routes/expensePayment.router');
const Task_Stages_Router = require('./routes/tasks_stages.router');
const User_Task_Router = require('./routes/User_Tasks.router');
const UserChatsRouters = require('./routes/userChats.router');
const TaskRemark = require('./routes/taskremark.router');
const MailTemlateType = require('./routes/mailTemplateType.router');
const MailFields = require('./routes/mailFields.router');
const LetterTemplateType = require('./routes/letterTemplateType.router');
const LetterFields = require('./routes/letterFields.router');
const NotificationPolicy = require('./routes/notificationPolicy.router');
const MailTemplateEditor = require('./routes/mailTemplateEditor.router');
const SkillSets = require('./routes/skillsets.router');
const SkillSetsForm = require('./routes/skillsetsform.router');
const MonthlySkillsetsform = require('./routes/monthlySkillsetsform.router');
const UserLetters = require('./routes/userLetters.router');
const TicketCategory = require('./routes/ticketCategory.router');
const TicketSubCategory = require('./routes/ticketSubCategory.router');
const Ticket = require('./routes/ticket.router');
const AttendanceCorrection = require('./routes/attendanceCorrection.router');
const PolicyDocument = require('./routes/policyDocument.router');
const moduleListRoutes = require('./routes/moduleList.router');
const moduleDetailsRoutes = require('./routes/moduleDetails.router');
const CheckListRouter = require('./routes/checklist.router');
const CheckListQuestionRouter = require('./routes/checkListQuestion.router');
const UserCheckListRouter = require('./routes/userCheckList.router');
const RoleMasterRoutes = require('./routes/roleMaster.router');
const incomeTaxSlabMaster = require('./routes/incomeTaxSlabMaster.router');
const incomeTaxSlabs = require('./routes/incomeTaxSlabs.router');
const { verifyToken, verifyOtpToken } = require('./middleware/tokenverify');
const SentimentPunchInRouter = require('./routes/sentimentPunchIn.router');
const WorkingLocationRoutes = require('./routes/workingLocation.router');
const EmployeeWorkingLocationRoutes = require('./routes/employeeWorkingLocation.router');
const Goal = require('./routes/goal.router');
const KRA = require('./routes/kra.router');
const KPI = require('./routes/kpi.router');
const EmployeeGoal = require('./routes/employeeGoal.router');
const PmsPolicy = require('./routes/pmsPolicy.router');
const LateEarlyPolicyRoutes = require('./routes/lateEarlyPolicy.router');
const EmployeeLateEarlyPolicyRoutes = require('./routes/employeeLateEarly.router');
const GoalSettingRoutes = require('./routes/goalSetting.router');
const UserInboxRouter = require('./routes/userInbox.router');
const ReviewFormRouter = require('./routes/reviewForm.router');
const ReviewFormAnswerRouter = require('./routes/reviewFormAnswer.router');
const tdsSubSectionRouter = require('./routes/tdsSubSection.router');
const tdsSectionRouter = require('./routes/tdsSection.router');
const EmployeeTaxRegime = require('./routes/employeeTaxRegime.router');
const PerformanceReview = require('./routes/performanceReview.router');
const EmployeePerformanceReview = require('./routes/employeePerformanceReview.router');
const TdsSubSectionCategory = require('./routes/tdsSubSectionCategory.router');
const EmployeeDeclaration = require('./routes/employeeDeclaration.router');
const EmployeeGoalReview = require('./routes/employeeGoalReview.router');
const OfferLetter = require('./routes/offerLetter.router');
const EmployeeGatepass = require('./routes/employeeGatepass.router');
const EmployeeLeavePolicy = require('./routes/employeeLeavePolicy.router');
const EmployeeShortLeavePolicy = require('./routes/employeeShortLeavePolicy.router');
const CompanyNotificationSetup = require('./routes/companyNotificationSetup.router');
const SN_CodeRouter = require('./routes/sn_code.router');
const Division = require('./routes/division.router');
const WorkingArea = require('./routes/workingArea.router');
const EmployeeDivision = require('./routes/employeeDivision.router');
const EmployeeWorkingArea = require('./routes/employeeWorkingArea.router');
const AutoMailSetup = require('./routes/autoMailSetup.router');
const PreviousSalary = require('./routes/previousSalary.router');
const Contractor = require('./routes/contractor.router');
const EmployeerentedResidence = require('./routes/employeeRentedResidence.router');
const JoiningLetter = require('./routes/joiningLetter.router');
const AttendanceBonusPolicy = require('./routes/attendanceBonusPolicy.router');
const {
  permissionAccess,
  teamPermissionAccess,
  myDetailsAccess,
} = require('./middleware/permissionAccess');
const EmployeeAttendanceBonusPolicy = require('./routes/empattandancebonuspolicy.router');
const FoodAllowancePolicy = require('./routes/foodAllowancePolicy.router');
const EmployeeFoodAllowancePolicy = require('./routes/employeeFoodAllowancePolicy.router');
const EmpLeavePolicy = require('./routes/empLeavePolicy.router');
const shortLeavePolicy = require('./routes/shortLeavePolicy.router');
const TerminationLetter = require('./routes/terminationLetter.router');
const IncrementLetter = require('./routes/incrementLetter.router');
const ExperienceLetter = require('./routes/experienceLetter.router');
const UserIncrementLetter = require('./routes/userIncrementLetter.router');
const AiBiometric = require('./routes/aibiometric.router');
const EmployeeJoiningRequest = require('./routes/employeeJoiningRequest.router');
const AnonymousFeedback = require('./routes/anonymousFeedback.router');
const UniformDetailRoute = require('./routes/uniformDetail.router');
const userIp = require('./routes/userIP.router');
const DealerPlan = require('./routes/dealerPlan.router');
const GatePassAuthorizationRequest = require('./routes/gatePassAuthorization.router');
const LeadMasterRoutes = require('./routes/leadMaster.router');
const BiometricDataTransfer = require('./routes/biometricDataTransfer.router');
const attendanceCorrectionrequest = require('./routes/attendanceCorrectionRequest.router');
const attendanceCorrectionAuthorization = require('./routes/attendanceCorrectionAuthorization.router');
const compensatoryOffAuthorizationRoutes = require('./routes/compensatoryOffAuthorization.router');
const erpIngegration = require('./routes/erpIntegration.router');
const biometricUser = require('./routes/biometricUser.router');
const AppointmentLetter = require('./routes/appointment.router');
const RelievingLetter = require('./routes/relievingLetter.router');
const companyServiceStatus = require('./routes/companyServiceStatus.router');
const companyProgress = require('./routes/companyProgress.router');
const weekoffShuffle = require('./routes/weekoffShuffle.router');
const auditLogs = require('./routes/auditLogs.router');
const companyTraining = require('./routes/companyTraining.router');
const ResigantionReason = require('./routes/resigantionReason.router');
const JiningDocumentTypeRoutes = require('./routes/joiningDocumentType.router');
const DesignationWiseDocumentRoutes = require('./routes/designationWiseDocument.router');
const JobPostingRoutes = require('./routes/jobPosting.router');
const JoningDocumentRoutes = require('./routes/joiningDocument.router');
const JobApplication = require('./routes/jobApplication.router');
const ShiftRosterRoutes = require('./routes/shiftRoster.router');
const BranchBankRoutes = require('./routes/bankBranch.router');
const DiscrepancyLetter = require('./routes/discrepancyLetter.router');
const EmployeeDiscrepancyLetter = require('./routes/employeeDiscrepancyLetter.router');
const UserShortLeaveRoutes = require('./routes/userShortLeave.router');
const ShortLeaveAuthorizationRoutes = require('./routes/shortLeaveAuthorization.router');
const TrackingOutageRoutes = require('./routes/trackingOutageCategory.router');
const TrackingCategoryDetailsRoutes = require('./routes/trackingCategoryDetails.router');
const personalInformationFormRoutes = require('./routes/personalInformationForm.router');
const JobRoleClassificationRoutes = require('./routes/jobRoleClassification.router');
const DistrictRoutes = require('./routes/districtMaster.router');
const employeeSkillCategoryRoutes = require('./routes/employeeSkillCategory.router');
const serviceChargeRoutes = require('./routes/serviceCharge.router');
const ProjectRoutes = require('./routes/project.router');
const EmployeeProjectRoutes = require('./routes/employeeProject.router');
const menuClickRoutes = require('./routes/menuclick.router');
const attendanceCorrectionReason = require('./routes/attendanceCorrectionReason.router');
const extraDaysRoutes = require('./routes/extraDays.router');
const extraDaysAuthorizationRoutes = require('./routes/extraDaysAuthorization.router');
const LeaveEncashmentRoutes = require('./routes/leaveEncashment.router');
const UserLapseLeave = require('./routes/userLeaveLapse.router');
const UserLeaveTransactionRoutes = require('./routes/userLeaveTransaction.router');
const FNFProcess = require('./routes/fnfProcess.router');
const BonusPolicy = require('./routes/bonusPolicy.router');
const EmployeeBonusPolicy = require('./routes/employeeBonusPolicy.router');
const EmployeeBonus = require('./routes/employeeBonus.router');
const EmployeePayment = require('./routes/employeePayment.router');
const bankStatementFormat = require('./routes/bankStatementFormat.router');
const PaySlipGenerator = require('./routes/paySlipGenerator.router');
const PreboardingDocument = require('./routes/prebordingDocument.router');
const customizeProfile = require('./routes/customizeProfile.router');
const TpMirrorRoutes = require('./routes/tpMirror.router');
const TaxRebateRoutes = require('./routes/taxRebate.router');
const TaxStandardDeductionRoutes = require('./routes/taxStandardDeduction.router');
const userExpenseTransactionRoutes = require('./routes/userExpenseTransaction.router');
const OfficeExpenseCategoryRoutes = require('./routes/officeExpenseCategory.router');
const OfficeExpenseHeadRoutes = require('./routes/officeExpenseHead.router');
const tdsSubSectionLimitRoutes = require('./routes/tdsSubSectionLimit.router');
const UpdateBranchJobRoutes = require('./routes/updateBranchJob.router');
const OrgAuthorizationTypeRoutes = require('./routes/orgAuthorizationType.router');
const SiteRoutes = require('./routes/site.router');
const OrganizationAuthorizationRoutes = require('./routes/organizationAuthorization.router');
const EmpNCSLDeductionRoutes = require('./routes/empNCSLDeduction.router');
const PNGPayrollRoutes = require('./routes/pngPayroll.router');
const PngNationalTaxSlabRoutes = require('./routes/pngNationalTaxSlab.router');
const YTDIncomeTaxSlabRoutes = require('./routes/YTDIncomeTaxSlab.router');
const MinWagesMasterRoutes = require('./routes/minWagesMaster.router');
const CorporationRoutes = require('./routes/corporation.router');
const CompanyResourceRoutes = require('./routes/CompanyResource.router');
const OfficeExpenseRoutes = require('./routes/officeExpense.router');
const AllocateOfficeExpense = require('./routes/allocateOfficeExpense.router');
const OfficeExpenseAuthRequest = require('./routes/officeExpenseAuthRequest.router');
const OfficeExpenseAdvance = require('./routes/officeExpenseAdvance.router');
const RolePermissionRoutes = require('./routes/rolePermission.router');
const salaryRegisterFormatRoutes = require('./routes/salaryRegisterFormat.router');
const BranchWiseDesignationRoutes = require('./routes/branchWiseDesignation.router');
const UserStepperRoutes = require('./routes/userStepper.router');
const companyManagerRoutes = require('./routes/companyManagers.router');
const UserWorkFromHome = require('./routes/userWorkFromHome.router');
const workFromHomeAuthorization = require('./routes/workfromhomeauthorization.router');
const customerIndustry = require('./routes/customerIndustry.router');
const YTDTaxEntriesRoutes = require('./routes/YTDTaxEntries.router');
const organizationDocumentRoutes = require('./routes/organizationDocument.router');
const AssignCustomerToEmployeeRoutes = require('./routes/assignCustomerToEmployee.router');
const confirmationAppraisalForm = require('./routes/confirmationAppraisalFormParam.router');
const appraisalFeedbacklRequest = require('./routes/appraisalFeedbacklRequest.router');
const visitDashboardRoutes = require('./routes/visitDashboard.router');
const DeviceTypeRoutes = require('./routes/deviceType.router');
const AutoCreatePartitionTableRoutes = require('./routes/autoCreatePartitionTable.router');
const CanteenMealsRoutes = require('./routes/canteenMeals.router');
const ExpensePurposeRoutes = require('./routes/expensePurpose.router');
const DashboardRoutes = require('./routes/dashboard.router');
const EnrollmentRoutes = require('./routes/enrollment.router');
const queryCategory = require('./routes/queryCategory.router');
const companyQuery = require('./routes/companyQuery.router');
const queryStatus = require('./routes/queryStatus.router');
const salarySlipFormat = require('./routes/salarySlipFormat.router');
const companySalarySlipFormat = require('./routes/companySalarySlipFormat.router');
const ExpenseAdvanceRequestRoutes = require('./routes/expenseAdvanceRequest.router');
const CanteenDetailsRoutes = require('./routes/canteenDetails.router');
const EmployeeJoiningDetailsHistoryRoutes = require('./routes/employeeJoiningDetailsHistory.router');
const CompanyApiKey = require('./routes/companyApiKey.router');
const ProjectWiseSalaryDistributionRoutes = require('./routes/projectWiseSalaryDistribution.router');
const BankDetailRequestRoutes = require('./routes/bankDetailRequest.router');
const BankDetailAuthorizationRoutes = require('./routes/bankDetailAuthorization.router');
const PNGReportRoutes = require('./routes/pngReport.router');
const thirdPartyApiRoutes = require('./routes/thirdPartyApi.router');
const { verifyApiKey } = require('./middleware/verifyApiKey');
const ExpenseAdvanceReqAuthRoutes = require('./routes/expenseAdvanceReqAuth.router');
const ExpensePaymentTransactionRoutes = require('./routes/expensePaymentTransaction.router');
const CompanyBankDetailsRoutes = require('./routes/companyBankDetails.router');
const ImportAuthorizationRoutes = require('./routes/importAuthorization.router');
const SalaryBasedOnDaysRoutes = require('./routes/salaryBasedOnDays.router');
const CallResponseCategory = require('./routes/callResponseCategory.router');
const CallResponse = require('./routes/callResponse.router');
const whatsAppRoutes = require('./routes/whatsApp.router');
const LoanAuthorization = require('./routes/loanAuthorization.router');
const disengagementLetter = require('./routes/disengagementLetter.router');
const employmentCertificate = require('./routes/employmentCertificate.router');
const transferLetter = require('./routes/transferLetter.router');
const userTransferLetter = require('./routes/userTransferLetter.router');
const monthwiseCalenderRoutes = require('./routes/monthwiseCalender.router');
const mehtaServiceRoutes = require('./routes/mehtaService.router');
const zohoRoutes = require('./routes/zoho.router');
const zohoAccountMappingRoutes = require('./routes/zohoAccountMapping.router');
const attendanceRegisterRoutes = require('./routes/attendanceRegister.router');
const PaMusterRollRegisterRoutes = require('./routes/paMusterRollRegister.router');
const ErpEmployeeMasterRoutes = require('./routes/erpEmployeeMaster.router');
const IdCardFormatRoutes = require('./routes/idCardFormat.router');
const CompanyIDCardFormatRoutes = require('./routes/companyIDCardFormat.router');
const ConfirmationLetterRoutes = require('./routes/confirmationLetter.router');
const MeetingPurpose = require('./routes/meetingPurpose.router');
const visitMeetings = require('./routes/visitMeetings.router');
const surchargesTaxSlabRoutes = require('./routes/surchargesTaxSlab.router');
const momDetailsRoutes = require('./routes/momDetails.router');
const googleSheetIntegrationRoutes = require('./routes/googleSheetIntegration.router');
const googleSheetExportSettingRoutes = require('./routes/googleSheetExportSetting.router');
const existingAttendanceProcess = require('./routes/existingAttendanceProcess.router');
const momFollowUp = require('./routes/momFollowUp.router');
const coursesRoutes = require('./routes/course.router');
const contentRoutes = require('./routes/content.router');
const lmsCourseCoverImageRoutes = require('./routes/lmsCourseCoverImage.router');
const analyticsRoutes = require('./routes/analytics.router');
const AWSRoutes = require('./routes/aws.router');
const assessmentRoutes = require('./routes/assessment.router');
const assessmentAttemptRoutes = require('./routes/assessmentAttempt.router');
const questionRoutes = require('./routes/question.router');
const assignmentRoutes = require('./routes/assignment.router');
const certificateRoutes = require('./routes/certificate.router');
const courseAuthorizationRoutes = require('./routes/courseAuthorization.router');
const timeZoneRoutes = require('./routes/timezone.router');
const AttendanceRegisterFormatRoutes = require('./routes/attendanceRegisterFormat.router');
const inquiriesRoutes = require('./routes/inquiries.router');
const paymentRoutes = require('./routes/payment.router');
const OrgDocumentAcceptanceRoutes = require('./routes/orgDocumentAcceptance.router');
const { checkRolePermission } = require('./middleware/checkRolePermission');
const manPowerRequestRoutes = require('./routes/manPowerRequisitionRequest.router');
const manPowerRequestAuthorizationRoutes = require('./routes/manPowerRequisitionAuthorization.router');
const lwfMasterRoutes = require('./routes/lwfMaster.router');
const teamPermissionApiRoutes = require('./routes/teamPermissionApi.router');
const SalaryEligibilityDocumentRoutes = require('./routes/salaryEligibilityDocument.router');
const companySkillCategoryRoutes = require('./routes/companySkillCategory.router');
const zohoSalarySyncRoutes = require('./routes/zohoSalarySync.router');
const WorkerTypeWiseShiftRoutes = require('./routes/workerTypeWiseShift.router');
const googleMapRoutes = require('./routes/googleMap.router');
const DashboardWidgetRoutes = require('./routes/dashboardWidget.router');
const expensePolicy = require('./routes/expensePolicy.router');
const TeamOvertimePlanningRoutes = require('./routes/teamOvertimePlanning.router');
const TeamOvertimePlanningDetailsRoutes = require('./routes/teamOvertimePlanningDetails.router');
const GovernmentReportsRoutes = require('./routes/govermentReports.router');
const TwoFactorAUthenticationRoutes = require('./routes/twoFactorAuthentication.router');
const pipRoutes = require('./routes/pip.router');
const managePipRoutes = require('./routes/pipManagerReveiwer.router');
const myDetailsRoutes = require('./routes/myDetalis.router');
const payrollStatutoryConfigration = require('./routes/payrollStatutoryConfiguration.router');
const empPayrollStatutoryRoutes = require('./routes/empPayrollStatutory.router');
const payrollStatutoryReportRoutes = require('./routes/payrollStatutoryReport.router');
const tourAuthorizationRoutes = require('./routes/tourAuthorization.router');
const VisitAuthorizationRoutes = require('./routes/visitAuthorization.router');
const visitProductRoutes = require('./routes/visitProduct.router');
const DropdownApisRoutes = require('./routes/dropdownApis.router');
const FieldMap = require('./routes/fieldMap.router');
const SalaryIncrementAuthorization = require('./routes/salaryIncrementAuthorization.router');
const designationResponsibility = require('./routes/designationResponsibility.router');
const empWorkAgreement = require('./routes/empWorkAgreement.router');
const workAgreement = require('./routes/workAgreement.router');
const punchInOutCustomizeForm = require('./routes/punchInOutCustomizeForm.router');
const AttendanceApiRoutes = require('./routes/attendanceApi.router');
const FileMigrationScriptRoutes = require('./routes/fileMigrationScript.router');
const { verifySuperAdmin } = require('./middleware/verifySuperAdmin');
const AdminAttendanceCorrectionRequestRoutes = require('./routes/adminAttendanceCorrectionRequest.router');

module.exports = (app) => {
  app.use('/test', verifyToken, testRoutes);
  app.use('/countrymaster', countryMasterRoutes);
  app.use('/statemaster', stateMasterRoutes);
  app.use('/citymaster', cityMasterRoutes);
  app.use('/professionataxmaster', verifyToken, professionalTaxMasterRoutes);
  app.use('/productmaster', productMasterRoutes);
  app.use('/branchmaster', branchMasterRoutes);
  app.use('/bankmaster', verifyToken, bankMasterRoutes);
  app.use('/companymaster', companyMasterRoutes);
  app.use('/companytype', verifyToken, CompanyTypeRoutes);
  app.use('/formmaster', verifyToken, formMasterRoutes);
  app.use('/hrsalaryfields', verifyToken, hrSalaryFieldsRoutes);
  app.use(
    '/useraddress',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    userAddressRoutes,
  );
  app.use(
    '/userexperience',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    userExperienceRoutes,
  );
  app.use('/usereducation', verifyToken, permissionAccess, userEducationRoutes);
  app.use('/shift', verifyToken, shiftRoutes);
  app.use('/documentlist', verifyToken, documentListRoutes);
  app.use(
    '/userdocument',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    userDocumentRoutes,
  );
  app.use('/gradestructure', verifyToken, gradeStructureRoutes);
  app.use(
    '/userskills',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    userSkillsRoutes,
  );
  app.use('/reportto', verifyToken, employeeReportToRoutes);
  app.use('/empdepartment', verifyToken, employeeDepartmentRoutes);
  app.use('/empdesignation', verifyToken, employeeDesignationRoutes);
  app.use(
    '/empholidaypolicy',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    employeeHolidayPolicyRoutes,
  );
  app.use('/empbranch', verifyToken, employeeBranchRoutes);
  app.use('/weekoffpolicy', verifyToken, weekOffPolicyRoutes);
  app.use('/holidayspolicy', verifyToken, holidayPolicyRoutes);
  app.use(
    '/empweekoff',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    employeeWeekOffRoutes,
  );
  app.use('/customer', verifyToken, customerRoutes);
  app.use('/visitpurpose', verifyToken, visitPurposeRoutes);
  app.use('/hrLeaveBal', verifyToken, leavebalRoutes);
  app.use('/product', verifyToken, productRoutes);
  app.use('/visit', verifyToken, visitRoutes);
  app.use('/gradesalarystructure', verifyToken, gradeSalaryStructureRoutes);
  app.use('/compdoctype', verifyToken, companyDocumentTypeRoutes);
  app.use('/compdoc', verifyToken, permissionAccess, companyDocumentRoutes);
  app.use('/announcement', verifyToken, permissionAccess, announcementRoutes);
  app.use('/empdigitalsign', verifyToken, employeeDigitalSignatureRoutes);
  app.use(
    '/usertracking',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    userTrackingRoutes,
  );
  app.use('/assetcategory', verifyToken, assetCategoryRoutes);
  app.use('/penalty', verifyToken, penaltyRoutes);
  app.use(
    '/assignasset',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    employeeAssetRoutes,
  );
  app.use('/common', verifyToken, commonRoutes);
  app.use('/function', verifyToken, functionRoutes);
  app.use(
    '/emppenalty',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    empPenaltyRoutes,
  );

  app.use('/companycontact', CompanyContactRoutes);
  app.use('/subscription', verifyToken, subscriptionRoutes);
  app.use('/designation', verifyToken, designationRoutes);

  app.use('/categorymaster', verifyToken, categoryMasterRoutes);
  app.use('/questioncategorymaster', verifyToken, questionCategoryMasterRoutes);

  app.use('/lms-sso', lmsSsoRoutes);

  app.use('/department', departmentRoutes);
  app.use('/auth', authRoutes);
  app.use(
    '/userfamily',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    userfamilyroutes,
  );

  app.use('/userfamilyDoc', userfamilyroutes);

  app.use('/payhead', verifyToken, payheadRoutes);
  app.use('/expensecategory', verifyToken, expenseCategoryRoutes);
  app.use('/expensehead', verifyToken, expenseHeadRoutes);
  app.use('/expensepolicy', verifyToken, expensePolicyRoutes);
  app.use('/labourServiceCharge', verifyToken, labourServiceChargeRoutes);
  app.use('/expenseprice', verifyToken, expensePriceRoutes);
  app.use('/visitformcustomize', verifyToken, visitformcustomizeRoutes);
  app.use(
    '/visitformcustomizevalue',
    verifyToken,
    visitformcustomizevalueRoutes,
  );
  app.use('/hrleavetypes', verifyToken, hrLeaveTypes);
  app.use('/operation', verifyToken, operationRoutes);
  app.use(
    '/hrSalaryMaster',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    hrSalarymasterRoutes,
  );
  app.use(
    '/empJoining',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    empJoiningRoutes,
  );
  app.use(
    '/authorizationCriteriaMasterRoutes',
    authorizationCriteriaMasterRoutes,
  );
  app.use('/leaveMaster', verifyToken, hrLeaveMasterRoutes);

  app.use('/visitReportMaster', verifyToken, visitReportMasterRoutes);
  app.use(
    '/hrleavesmonthlytrans',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    hrLeaveMonthlyTransRoutes,
  );
  app.use('/visitReportCustomize', verifyToken, VisitReportCustomizeRoutes);
  app.use(
    '/visitReportCustomizevalue',
    verifyToken,
    VisitReportCustomizeValueRoutes,
  );

  app.use('/preboarding', preboardingRoutes);
  app.use('/preboardingformcustomize', preboardingformcustomizeRoutes);
  app.use(
    '/preboardingformcustomizevalue',
    verifyToken,
    preboardingformcustomizevalueRoutes,
  );

  app.use(
    '/callfollowup',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    callfollowupRoutes,
  );
  app.use(
    '/loanmaster',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    loanMasterRoutes,
  );
  app.use('/form16', verifyToken, form16Routes);
  app.use(
    '/Tracking',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    TrackingRoutes,
  );

  app.use(
    '/toursMaster',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    toursMasterRoutes,
  );
  app.use('/appversion', verifyToken, versionRoutes);
  app.use(
    '/preboardingrequest',
    verifyToken,
    permissionAccess,
    preboardingRequestRoutes,
  );
  app.use(
    '/attendanceTransaction',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    attendancetransactionRoutes,
  );
  app.use('/advancePayment', verifyToken, advancePaymentRoutes);
  app.use(
    '/employeeshift',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    employeeShiftRoutes,
  );
  app.use('/attendancepolicy', verifyToken, attendancePolicyRoutes);
  app.use('/salarypolicy', verifyToken, salaryPolicyRoutes);
  app.use(
    '/salaryTrans',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    salaryTransRoutes,
  );
  app.use(
    '/employeeattendancepolicy',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    employeeAttendancePolicyRoutes,
  );
  app.use(
    '/employeesalarypolicy',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    employeeSalaryPolicyRoutes,
  );
  app.use('/userleave', verifyToken, UserLeaveRoutes);
  app.use('/authorizationRequest', verifyToken, authorizationRequestRoutes);
  app.use(
    '/leaveauthorizationRequest',
    verifyToken,
    leaveauthorizationRequestRoutes,
  );
  app.use('/authorizationmaster', verifyToken, authorizationMaster);
  app.use('/AuthorizationDetails', verifyToken, AuthorizationDetails);
  app.use(
    '/overTime',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    overTimeCalculation,
  );
  app.use(
    '/userExpense',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    userExpenseRoutes,
  );
  app.use('/reportTo', verifyToken, reportToRouters);
  app.use('/biometric', verifyToken, biometricRouters);
  app.use(
    '/report',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    reportRouters,
  );
  app.use('/Ndacategory', verifyToken, NdacategoryRouters);
  app.use('/EmployeeNda', verifyToken, permissionAccess, EmployeeNdaRouters);
  app.use('/depositCategory', verifyToken, depositcategory);
  app.use(
    '/deposit',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    depositRoutes,
  );
  app.use('/meetingPlace', verifyToken, meetingPlaceRoutes);
  app.use('/visitors', verifyToken, visitorsRoutes);
  app.use(
    '/gatePass',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    gatePass,
  );
  app.use(
    '/NdaReport',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    NdaReportRouters,
  );
  app.use(
    '/AssetReport',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    AssetReportRouters,
  );
  app.use(
    '/PenaltyReport',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    PenaltyReportRouters,
  );
  app.use(
    '/AdvanceReport',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    AdvanceReportRouters,
  );
  app.use('/assetMaster', verifyToken, assetMasterRoutes);
  app.use(
    '/empEmployeement',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    employeeEmployeement,
  );
  app.use('/erpAccountMaster', verifyToken, erpAccountMaster);
  app.use(
    '/empLetterHead',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    empLetterHeadRouters,
  );
  app.use('/biometricintegration', verifyToken, biometricIntegration);
  app.use('/tankhwapatraDatabaseList', verifyToken, tankhwapatraDatabaseList);
  app.use(
    '/mannualAttendance',
    verifyToken,
    permissionAccess,
    mannualAttendanceRouters,
  );

  app.use(
    '/datewiseattendancepolicy',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    datewiseattendancePolicy,
  );
  app.use(
    '/coffMaster',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    coffMaster,
  );
  app.use('/hrToolKit', verifyToken, hrToolKitRouters);
  app.use('/resignation', verifyToken, checkRolePermission, Resignation);
  app.use('/resignProcess', verifyToken, ResignProcessRouters);
  app.use(
    '/resignTaskAssign',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    ResignTaskAssign,
  );
  app.use('/incentive', verifyToken, IncentivetypeRouters);
  app.use('/lwfMaster', verifyToken, lwfMasterRoutes);
  app.use(
    '/employeeincentive',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    employeeincentiveRouters,
  );
  app.use('/dailyTask', verifyToken, dailyTaskRouters);
  app.use(
    '/vehicleUsage',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    VehicleUsage,
  );
  app.use('/employeeAccident', verifyToken, employeeAccident);

  app.use(
    '/expensePayment',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    expensePayment,
  );
  app.use('/Tasks_Stages', verifyToken, Task_Stages_Router);
  app.use(
    '/user_tasks',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    User_Task_Router,
  );

  app.use('/userchats', verifyToken, UserChatsRouters);
  app.use('/taskRemark', verifyToken, TaskRemark);

  app.use('/letterTemplateType', verifyToken, LetterTemplateType);
  app.use('/letterFields', verifyToken, LetterFields);

  app.use('/mailTemplateType', verifyToken, MailTemlateType);
  app.use('/mailFields', verifyToken, MailFields);

  app.use('/notificationPolicy', verifyToken, NotificationPolicy);
  app.use('/mailTemplateEditor', verifyToken, MailTemplateEditor);

  app.use('/skillSets', verifyToken, SkillSets);

  app.use('/skillSetsForm', verifyToken, SkillSetsForm);
  app.use(
    '/monthlySkillsetsform',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    MonthlySkillsetsform,
  );
  app.use('/userLetters', verifyToken, UserLetters);
  app.use(
    '/ticketCategory',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    TicketCategory,
  );
  app.use(
    '/ticketSubCategory',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    TicketSubCategory,
  );
  app.use('/ticket', verifyToken, permissionAccess, Ticket);
  app.use('/attendanceCorrection', verifyToken, AttendanceCorrection);
  app.use('/policyDocument', verifyToken, PolicyDocument);
  app.use('/moduleList', verifyToken, moduleListRoutes);
  app.use('/moduleDetails', verifyToken, moduleDetailsRoutes);
  app.use('/checkList', verifyToken, CheckListRouter);
  app.use('/checkListQuestion', verifyToken, CheckListQuestionRouter);
  app.use(
    '/usercheckList',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    UserCheckListRouter,
  );
  app.use(
    '/roleMaster',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    RoleMasterRoutes,
  );
  app.use(
    '/sentimentPunchIn',
    verifyToken,
    permissionAccess,
    SentimentPunchInRouter,
  );
  app.use('/workingLocation', verifyToken, WorkingLocationRoutes);
  app.use(
    '/employeeWorkingLocation',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    EmployeeWorkingLocationRoutes,
  );
  app.use('/goal', verifyToken, permissionAccess, Goal);
  app.use('/kra', verifyToken, KRA);
  app.use('/kpi', verifyToken, KPI);
  app.use('/incomeTaxSlabMaster', verifyToken, incomeTaxSlabMaster);
  app.use('/incomeTaxSlabs', verifyToken, incomeTaxSlabs);
  app.use('/employeeGoal', verifyToken, permissionAccess, EmployeeGoal);
  app.use('/pmsPolicy', verifyToken, PmsPolicy);
  app.use('/LateEarlyPolicy', verifyToken, LateEarlyPolicyRoutes);
  app.use(
    '/EmployeeLateEarlyPolicyRoutes',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    EmployeeLateEarlyPolicyRoutes,
  );
  app.use('/goalSetting', verifyToken, GoalSettingRoutes);
  app.use('/userInbox', verifyToken, UserInboxRouter);
  app.use('/reviewForm', verifyToken, permissionAccess, ReviewFormRouter);
  app.use(
    '/reviewFormAnswer',
    verifyToken,
    permissionAccess,
    ReviewFormAnswerRouter,
  );

  app.use('/tdsSubSection', verifyToken, tdsSubSectionRouter);
  app.use('/tdsSection', verifyToken, tdsSectionRouter);

  app.use(
    '/employeeTaxRegime',
    verifyToken,
    permissionAccess,
    EmployeeTaxRegime,
  );
  app.use('/performanceReview', verifyToken, PerformanceReview);
  app.use(
    '/employeePerformanceReview',
    verifyToken,
    permissionAccess,
    EmployeePerformanceReview,
  );
  app.use('/tdsSubSectionCategory', verifyToken, TdsSubSectionCategory);
  app.use(
    '/employeeDeclaration',
    verifyToken,
    permissionAccess,
    EmployeeDeclaration,
  );
  app.use(
    '/employeeGoalReview',
    verifyToken,
    permissionAccess,
    EmployeeGoalReview,
  );
  app.use(
    '/punchInPunchOutNotification',
    verifyToken,
    require('./routes/punchInOutNotificationSchedule.router'),
  );

  app.use('/offerLetter', verifyToken, OfferLetter);
  app.use('/employeeGatepass', verifyToken, permissionAccess, EmployeeGatepass);
  app.use(
    '/employeeLeavePolicy',
    verifyToken,
    permissionAccess,
    EmployeeLeavePolicy,
  );
  app.use(
    '/empShortLeavePolicy',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    EmployeeShortLeavePolicy,
  );
  app.use('/companyNotificationSetup', verifyToken, CompanyNotificationSetup);
  app.use('/SN_Code', verifyToken, permissionAccess, SN_CodeRouter);
  app.use('/division', verifyToken, Division);
  app.use('/workingArea', verifyToken, WorkingArea);
  app.use(
    '/employeeDivision',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    EmployeeDivision,
  );
  app.use(
    '/employeeWorkingArea',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    EmployeeWorkingArea,
  );
  app.use('/autoMailSetup', verifyToken, AutoMailSetup);
  app.use('/previousSalary', verifyToken, permissionAccess, PreviousSalary);
  app.use('/contractor', verifyToken, Contractor);
  app.use(
    '/employeeRentedResidence',
    verifyToken,
    permissionAccess,
    EmployeerentedResidence,
  );
  app.use('/joiningLetter', verifyToken, JoiningLetter);
  app.use('/attendanceBonusPolicy', verifyToken, AttendanceBonusPolicy);
  app.use(
    '/employeeattendancebonuspolicy',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    EmployeeAttendanceBonusPolicy,
  );

  app.use('/foodAllowancePolicy', verifyToken, FoodAllowancePolicy);
  app.use(
    '/employeeFoodAllowancePolicy',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    EmployeeFoodAllowancePolicy,
  );
  app.use(
    '/empLeavePolicy',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    EmpLeavePolicy,
  );
  app.use('/shortLeave', verifyToken, shortLeavePolicy);
  app.use('/experienceLetter', verifyToken, ExperienceLetter);
  app.use('/incrementLetter', verifyToken, IncrementLetter);
  app.use('/terminationLetter', verifyToken, TerminationLetter);
  app.use('/userIncrementLetter', verifyToken, UserIncrementLetter);
  app.use('/aibiometric', verifyToken, AiBiometric);

  app.use(
    '/employeeJoiningRequest',
    verifyToken,
    permissionAccess,
    EmployeeJoiningRequest,
  );
  app.use('/anonymousFeedback', verifyToken, AnonymousFeedback);

  //router
  app.use('/uniform', verifyToken, UniformDetailRoute);
  app.use(
    '/userIp',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    userIp,
  );
  app.use('/dealerPlan', verifyToken, DealerPlan);

  app.use('/gatepassauthorization', verifyToken, GatePassAuthorizationRequest);

  app.use('/leadMaster', LeadMasterRoutes);
  app.use('/biometricDataTransfer', BiometricDataTransfer);
  app.use(
    '/attendanceCorrectionRequest',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    attendanceCorrectionrequest,
  );
  app.use(
    '/attendanceCorrectionAuthorization',
    verifyToken,
    attendanceCorrectionAuthorization,
  );
  app.use(
    '/compensatoryOffAuthorizationRequest',
    verifyToken,
    compensatoryOffAuthorizationRoutes,
  );
  app.use('/erpIngegration', verifyToken, erpIngegration);
  app.use('/biometricUser', verifyToken, biometricUser);
  app.use('/appointmentLetter', verifyToken, AppointmentLetter);
  app.use('/relievingLetter', verifyToken, RelievingLetter);
  app.use('/companyServiceStatus', verifyToken, companyServiceStatus);
  app.use('/companyProgress', verifyToken, companyProgress);
  app.use(
    '/weekoffShuffle',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    weekoffShuffle,
  );
  app.use('/auditLogs', verifyToken, auditLogs);
  app.use('/companyTraining', verifyToken, companyTraining);
  app.use('/resigantionReason', verifyToken, ResigantionReason);
  app.use('/joiningDocumentType', verifyToken, JiningDocumentTypeRoutes);
  app.use('/designationWiseDocument', DesignationWiseDocumentRoutes);
  app.use('/jobPosting', JobPostingRoutes);
  app.use('/joiningDocument', verifyToken, JoningDocumentRoutes);
  app.use('/jobApplication', JobApplication);
  app.use(
    '/shiftRoster',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    ShiftRosterRoutes,
  );
  app.use('/bankBranch', verifyToken, BranchBankRoutes);
  app.use('/discrepancyLetter', verifyToken, DiscrepancyLetter);
  app.use('/employeeDiscrepancyLetter', verifyToken, EmployeeDiscrepancyLetter);

  app.use(
    '/userShortLeave',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    UserShortLeaveRoutes,
  );
  app.use(
    '/shortLeaveAuthorization',
    verifyToken,
    ShortLeaveAuthorizationRoutes,
  );
  app.use(
    '/TrackingOutage',
    verifyToken,
    permissionAccess,
    TrackingOutageRoutes,
  );
  app.use(
    '/TrackingCategoryDetails',
    verifyToken,
    permissionAccess,
    TrackingCategoryDetailsRoutes,
  );

  app.use(
    '/personalInformationForm',
    verifyToken,
    personalInformationFormRoutes,
  );
  app.use('/jobRoleClassification', verifyToken, JobRoleClassificationRoutes);
  app.use('/district', verifyToken, DistrictRoutes);

  app.use(
    '/employeeSkillCategory',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    employeeSkillCategoryRoutes,
  );
  app.use('/serviceCharge', verifyToken, serviceChargeRoutes);
  app.use('/project', verifyToken, ProjectRoutes);
  app.use(
    '/employeeProject',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    EmployeeProjectRoutes,
  );
  app.use('/menuClick', verifyToken, menuClickRoutes);
  app.use(
    '/attendanceCorrectionReason',
    verifyToken,
    attendanceCorrectionReason,
  );
  app.use(
    '/extraDays',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    extraDaysRoutes,
  );
  app.use('/extraDaysAuthorization', verifyToken, extraDaysAuthorizationRoutes);
  app.use(
    '/leaveEncashment',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    LeaveEncashmentRoutes,
  );
  app.use('/userLapseLeave', verifyToken, UserLapseLeave);
  app.use('/userLeaveTransaction', verifyToken, UserLeaveTransactionRoutes);
  app.use(
    '/fnfProcess',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    FNFProcess,
  );

  app.use('/bonusPolicy', verifyToken, BonusPolicy);
  app.use(
    '/employeeBonusPolicy',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    EmployeeBonusPolicy,
  );
  app.use(
    '/employeeBonus',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    EmployeeBonus,
  );

  app.use(
    '/employeePayment',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    EmployeePayment,
  );
  app.use('/bankStatementFormat', verifyToken, bankStatementFormat);
  app.use(
    '/paySlipGenerator',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    PaySlipGenerator,
  );
  app.use('/preboardingDocument', PreboardingDocument);
  app.use('/customizeProfile', verifyToken, customizeProfile);
  app.use('/tpMirror', TpMirrorRoutes);

  app.use('/taxRebate', verifyToken, TaxRebateRoutes);
  app.use('/taxStandardDeduction', verifyToken, TaxStandardDeductionRoutes);
  app.use('/officeExpenseCategory', verifyToken, OfficeExpenseCategoryRoutes);
  app.use('/officeExpenseHead', verifyToken, OfficeExpenseHeadRoutes);
  app.use('/userExpenseTransaction', verifyToken, userExpenseTransactionRoutes);
  app.use('/tdsSubSectionLimit', verifyToken, tdsSubSectionLimitRoutes);
  app.use('/updateBranchJob', verifyToken, UpdateBranchJobRoutes);
  app.use('/orgAuthorizationType', verifyToken, OrgAuthorizationTypeRoutes);
  app.use('/site', verifyToken, SiteRoutes);
  app.use(
    '/organizationAuthorization',
    verifyToken,
    OrganizationAuthorizationRoutes,
  );
  app.use(
    '/empNCSLDeduction',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    EmpNCSLDeductionRoutes,
  );
  app.use(
    '/pngPayroll',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    PNGPayrollRoutes,
  );
  app.use('/pngNationalTaxSlab', verifyToken, PngNationalTaxSlabRoutes);
  app.use('/YTDIncomeTaxSlab', verifyToken, YTDIncomeTaxSlabRoutes);
  app.use('/minWagesMaster', verifyToken, MinWagesMasterRoutes);
  app.use('/corporation', verifyToken, CorporationRoutes);
  app.use('/companyResource', verifyApiKey, CompanyResourceRoutes);

  app.use(
    '/officeExpense',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    OfficeExpenseRoutes,
  );
  app.use('/allocateOfficeExpense', verifyToken, AllocateOfficeExpense);
  app.use('/officeExpenseAuthRequest', verifyToken, OfficeExpenseAuthRequest);
  app.use(
    '/officeExpenseAdvance',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    OfficeExpenseAdvance,
  );
  app.use('/rolePermission', verifyToken, RolePermissionRoutes);
  app.use('/salaryRegisterFormat', verifyToken, salaryRegisterFormatRoutes);
  app.use('/branchWiseDesignation', verifyToken, BranchWiseDesignationRoutes);
  app.use('/userStepper', verifyToken, UserStepperRoutes);
  app.use('/companyManager', verifyToken, companyManagerRoutes);
  app.use('/workFromHome', verifyToken, UserWorkFromHome);
  app.use('/workFromHomeAuthorization', verifyToken, workFromHomeAuthorization);

  app.use('/customerIndustry', verifyToken, customerIndustry);
  app.use(
    '/YTDTaxEntries',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    YTDTaxEntriesRoutes,
  );
  app.use('/organizationDocuments', verifyToken, organizationDocumentRoutes);
  app.use(
    '/assignCustomerToEmployee',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    AssignCustomerToEmployeeRoutes,
  );
  app.use('/confirmationAppraisalForm', verifyToken, confirmationAppraisalForm);
  app.use('/appraisalFeedbackReq', verifyToken, appraisalFeedbacklRequest);
  app.use('/visitDashboard', verifyToken, visitDashboardRoutes);
  app.use('/deviceType', verifyToken, DeviceTypeRoutes);
  app.use(
    '/autoCreatePartitionTable',
    verifyToken,
    AutoCreatePartitionTableRoutes,
  );
  app.use('/canteenMeals', verifyToken, CanteenMealsRoutes);
  app.use('/queryCategory', verifyToken, queryCategory);
  app.use('/expensePurpose', verifyToken, ExpensePurposeRoutes);

  app.use('/enrollments', verifyToken, EnrollmentRoutes);
  app.use(
    '/dashboard',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    DashboardRoutes,
  );

  app.use('/companyQuery', verifyToken, companyQuery);
  app.use('/queryStatus', verifyToken, queryStatus);
  app.use('/salarySlipFormat', verifyToken, salarySlipFormat);
  app.use('/companySalarySlipFormat', verifyToken, companySalarySlipFormat);
  app.use('/expenseAdvanceRequest', verifyToken, ExpenseAdvanceRequestRoutes);
  app.use('/canteenDetails', verifyToken, CanteenDetailsRoutes);

  app.use(
    '/employeeJoiningDetailsHistory',
    verifyToken,
    EmployeeJoiningDetailsHistoryRoutes,
  );
  app.use('/companyApiKey', verifyToken, CompanyApiKey);
  app.use(
    '/projectWiseSalaryDistribution',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    ProjectWiseSalaryDistributionRoutes,
  );
  app.use('/bankDetailRequest', verifyToken, BankDetailRequestRoutes);
  app.use(
    '/bankDetailAuthorization',
    verifyToken,
    BankDetailAuthorizationRoutes,
  );

  app.use('/pngReport', verifyToken, PNGReportRoutes);
  app.use('/hrms', verifyApiKey, thirdPartyApiRoutes);
  app.use('/expenseAdvanceReqAuth', verifyToken, ExpenseAdvanceReqAuthRoutes);
  app.use(
    '/expensePaymentTransaction',
    verifyToken,
    ExpensePaymentTransactionRoutes,
  );
  app.use('/companyBankDetails', verifyToken, CompanyBankDetailsRoutes);
  app.use(
    '/importAuthorization',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    ImportAuthorizationRoutes,
  );
  app.use('/salaryBasedOnDays', verifyToken, SalaryBasedOnDaysRoutes);
  app.use('/callResponseCategory', verifyToken, CallResponseCategory);
  app.use('/callResponse', verifyToken, CallResponse);
  app.use('/whatsApp', whatsAppRoutes);
  app.use('/loanAuthorization', verifyToken, LoanAuthorization);
  app.use('/disengagementLetter', verifyToken, disengagementLetter);
  app.use('/employmentCertificate', verifyToken, employmentCertificate);
  app.use('/transferLetter', verifyToken, transferLetter);
  app.use('/userTransferLetter', verifyToken, userTransferLetter);
  app.use(
    '/monthwiseCalender',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    monthwiseCalenderRoutes,
  );
  app.use('/mehtaService', mehtaServiceRoutes);
  app.use('/zoho', zohoRoutes);
  app.use('/zohoAccountMapping', verifyToken, zohoAccountMappingRoutes);
  app.use(
    '/attendanceRegister',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    attendanceRegisterRoutes,
  );
  app.use(
    '/paMusterRollRegister',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    PaMusterRollRegisterRoutes,
  );
  app.use('/erpEmployeeMaster', verifyToken, ErpEmployeeMasterRoutes);
  app.use('/idCardFormat', verifyToken, IdCardFormatRoutes);
  app.use('/companyIdCardFormat', verifyToken, CompanyIDCardFormatRoutes);
  app.use('/confirmationLetter', verifyToken, ConfirmationLetterRoutes);
  app.use('/meetingPurpose', verifyToken, MeetingPurpose);
  app.use(
    '/visitMeeting',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    visitMeetings,
  );
  app.use('/surchargesTaxSlab', verifyToken, surchargesTaxSlabRoutes);
  app.use('/momdetails', verifyToken, momDetailsRoutes);
  app.use('/googleSheetIntegration', googleSheetIntegrationRoutes);
  app.use(
    '/googleSheetExportSetting',
    verifyToken,
    googleSheetExportSettingRoutes,
  );
  app.use('/extattendanceprocess', verifyToken, existingAttendanceProcess);
  app.use('/momfollowup', verifyToken, momFollowUp);
  app.use('/courses', verifyToken, coursesRoutes);
  app.use('/content', verifyToken, contentRoutes);
  app.use('/lms-course-cover', verifyToken, lmsCourseCoverImageRoutes);
  app.use('/analytics', verifyToken, analyticsRoutes);
  app.use('/aws', AWSRoutes);

  app.use('/assessments', verifyToken, assessmentRoutes);
  app.use('/assessment-attempts', verifyToken, assessmentAttemptRoutes);
  app.use('/questions', verifyToken, questionRoutes);
  app.use('/assignments', verifyToken, assignmentRoutes);
  app.use('/certificates', verifyToken, certificateRoutes);
  app.use('/courseAuthorization', verifyToken, courseAuthorizationRoutes);

  app.use('/timezone', timeZoneRoutes);
  app.use('/salaryRegisterFormat', verifyToken, salaryRegisterFormatRoutes);
  app.use(
    '/attendanceRegisterFormat',
    verifyToken,
    AttendanceRegisterFormatRoutes,
  );
  app.use('/inquiries', verifyOtpToken, inquiriesRoutes);
  app.use('/payment', verifyOtpToken, paymentRoutes);
  app.use(
    '/orgDocumentAcceptance',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    OrgDocumentAcceptanceRoutes,
  );
  app.use('/manPowerRequest', verifyToken, manPowerRequestRoutes);
  app.use(
    '/manPowerRequestAuthorization',
    verifyToken,
    manPowerRequestAuthorizationRoutes,
  );
  app.use(
    '/teamPermissionApi',
    verifyToken,
    teamPermissionAccess,
    teamPermissionApiRoutes,
  );
  app.use(
    '/salaryEligibilityDocument',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    SalaryEligibilityDocumentRoutes,
  );
  app.use(
    '/companySkillCategory',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    companySkillCategoryRoutes,
  );

  app.use('/zohoSalarySync', verifyToken, zohoSalarySyncRoutes);

  app.use(
    '/workerTypeWiseShift',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    WorkerTypeWiseShiftRoutes,
  );
  app.use('/googleMap', verifyToken, googleMapRoutes);
  app.use(
    '/dashboardWidget',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    DashboardWidgetRoutes,
  );
  app.use('/expensePolicy', verifyToken, expensePolicy);
  app.use('/teamOvertimePlanning', verifyToken, TeamOvertimePlanningRoutes);
  app.use(
    '/teamOvertimePlanningDetails',
    verifyToken,
    TeamOvertimePlanningDetailsRoutes,
  );
  app.use(
    '/govermentReports',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    GovernmentReportsRoutes,
  );
  app.use(
    '/twoFactorAuthentication',
    verifyToken,
    TwoFactorAUthenticationRoutes,
  );
  app.use('/pip', verifyToken, pipRoutes);
  app.use('/managePip', verifyToken, managePipRoutes);

  app.use('/myDetails', verifyToken, myDetailsAccess, myDetailsRoutes);

  app.use('/payrollStatutoryConfig', verifyToken, payrollStatutoryConfigration);

  app.use(
    '/empPayrollStatutory',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    empPayrollStatutoryRoutes,
  );

  app.use(
    '/payrollStatutoryReport',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    payrollStatutoryReportRoutes,
  );
  app.use(
    '/tourAuthorization',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    tourAuthorizationRoutes,
  );

  app.use(
    '/visitProduct',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    visitProductRoutes,
  );
  app.use(
    '/visitAuthorization',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    VisitAuthorizationRoutes,
  );
  app.use('/fieldMap', verifyToken, FieldMap);

  app.use('/dropdown', verifyToken, DropdownApisRoutes);
  app.use(
    '/salaryIncrementAuthorization',
    verifyToken,
    SalaryIncrementAuthorization,
  );
  app.use('/designationResponsibility', verifyToken, designationResponsibility);
  app.use('/empWorkAgreement', verifyToken, empWorkAgreement);
  app.use('/workAgreement', verifyToken, workAgreement);
  app.use(
    '/punchInOutCustomize',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    punchInOutCustomizeForm,
  );

  app.use(
    '/attendanceApi',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    AttendanceApiRoutes,
  );
  app.use(
    '/awsFileMigration',
    verifyToken,
    verifySuperAdmin,
    FileMigrationScriptRoutes,
  );
  app.use(
    '/adminAttendanceCorrectionRequest',
    verifyToken,
    checkRolePermission,
    permissionAccess,
    AdminAttendanceCorrectionRequestRoutes
  );
};
