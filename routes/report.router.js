const express = require('express');
const reportController = require('../controllers/report.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/visitReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TEAMVEHICLEMETERDETAILS,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ADMINVEHICLEMETERDETAILS,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.VISITREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.visitReport,
);

router.post(
  '/v1/visitSummaryReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITSUMMARYREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.visitSummaryReport,
);

router.post(
  '/v1/employeedetails',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.IDCARDREGISTERY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.employeedetails,
);

router.post(
  '/v1/adultemployees',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADULTWORKERREGISTERY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.adultemployees,
);

router.post(
  '/v1/form18',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FORM18,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.form18,
);

router.post(
  '/v1/tracking_report',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.KMSREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.tracking_report,
);

router.post(
  '/v1/form14',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FORM14,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.form14,
);

router.post(
  '/v1/increment_report',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEESALARYSTRUCTURE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.INCREMENTREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.increment_report,
);

router.post(
  '/v1/leavebalance_report',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LEAVEBALANCEREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.leavebalance_report,
);

router.post(
  '/v1/formEr01',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FORMER01,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.formEr01,
);

router.post(
  '/v1/salaryRegister',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SALARYWAGESSHEET,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.SALARYREGISTERWITHDATEOFPAY,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.MONTHLYSALARYSUMMARYREGISTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.FORM_B_WAGESREGISTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.SALARYREGISTERREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.salaryRegister,
);

router.post(
  '/v1/esicreport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ESICCHALLAN,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ESICREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.esic,
);

router.post(
  '/v1/pfreport1',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PFCHALLAN,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.PFREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.pfreport1,
);

router.post(
  '/v1/form_29',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FORM29,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.Form29,
);

router.post(
  '/v1/visitReportByCustomer',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CUSTOMERWISEVISITREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.visitReportByCustomer,
);

router.post(
  '/v1/wagesofsalaryregister',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WAGESSALARYREGISTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.wagesofsalaryregister,
);

router.post(
  '/v1/paMusterRoll',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCESHEETREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.paMusterRoll,
);

router.post(
  '/v1/inoutAttendanceRegister',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FORMDATTEDANCEREGISTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.inoutAttendanceRegister,
);

router.post(
  '/v1/form_5',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FORM5,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.Form5,
);

router.post(
  '/v1/hourlySalaryRegister',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HOURLYSALARYREGISTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.hourlySalaryRegister,
);

router.post(
  '/v1/lwf_report',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LWFREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.Lwf_report,
);

router.post(
  '/v1/leaveReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LEAVEAPPLICATIONREPORT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.OUTDOORDUTYAPPLICATIONREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.leaveReport,
);

router.post(
  '/v1/workFromHomeReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WORKFROMHOMEAPPLICATIONREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.workFromHomeReport,
);

router.post(
  '/v1/getDashboardSalary',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.getDashboardSalary,
);

router.post(
  '/v1/getTrackingReports',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TRACKINGREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.getTrackingReports,
);

router.post(
  '/v1/getleaveBalanceReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LEAVEBALANCESUMMARYREPORT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.FORMELEAVEREGISTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.getleaveBalanceReport,
);

router.post(
  '/v1/bankStatementReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BANKSTATEMENTREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.bankStatementReport,
);

router.post(
  '/v1/distinctLoationsTrackingReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DISTINCTLOATIONSTRACKINGREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.distinctLoationsTrackingReport,
);

router.post(
  '/v1/fiveMinuteGapTrackingReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FIVEMINUTEGAPTRACKINGREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.fiveMinuteGapTrackingReport,
);

router.post(
  '/v1/getreportsToreport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEREPORTSTOREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.getreportsToreport,
);

router.post(
  '/v1/getTaleAttreport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TALLYFORMATEATTENDANCEREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.getTaleAttreport,
);

router.post(
  '/v1/dailyInOutReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DAILYINOUTREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.dailyInOutReport,
);

router.post(
  '/v1/monthlyAttendanceReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MONTHLYATTENDANCEREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.monthlyAttendanceReport,
);
router.post(
  '/v1/employeeWiseSalaryReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEWISESALARYREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.employeeWiseSalaryReport,
);

router.post(
  '/v1/form16Report',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FORM16,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.form16Report,
);
router.get(
  '/v1/getPreviousfinancialYear',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FORM16,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.getPreviousfinancialYear,
);

router.get(
  '/v1/shiftwiseattendancecount',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SHIFTWISEATTENDANCECOUNTREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.shiftwiseattendancecount,
);

router.post(
  '/v1/loanreportData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LOANREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.loanReport,
);

router.get(
  '/v1/shiftdepartmentwiseDailyattendancecount',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName:
          fromPermissionName.SHIFTANDDEPARTMENTWISEATTENDANCECOUNTREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.shiftDepartmentWiseDailyAttendanceCount,
);

router.post(
  '/v1/userDocumentExpriyData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.USERDOCUMENTEXPIRYREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.UserDocumentExpriyReport,
);

router.post(
  '/v1/attendanceRegister3',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCEREGISTERTHREE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.attendanceRegister3,
);

router.post(
  '/v1/attendanceReport4',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCEREGISTERFOUR,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.attendanceReport4,
);

router.post(
  '/v1/getWeekoffDayWorkReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WEEKOFFDAYWORKREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.getWeekoffDayWorkReport,
);

//--------------------------Slot Wise Attendance Report --------------------------------------

router.post(
  '/v1/slotwiseAttendanceReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SLOTWISEATTENDANCEREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.slotwiseAttendanceReport,
);

router.post(
  '/v1/shortLeaveApplicationReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SHORTLEAVEAPPLICATIONREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.shortLeaveApplicationReport,
);

router.get(
  '/v1/lwfChallan',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LWFCHALLAN,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.lwfChallan,
);

router.post(
  '/v1/serviceChargesBill',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SERVICECHARGESBILL,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.serviceChargesBill,
);

router.post(
  '/v1/labourChargesBill',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LABOURCHARGESBILL,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.labourChargesBill,
);

router.post(
  '/v1/otReportWithESIC',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OVERTIMESHEETWITHESIC,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.otReportWithESIC,
);

router.post(
  '/v1/salarySummary',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SALARYSUMMARY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.salarySummary,
);

router.post(
  '/v1/PT_register',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PROFESSIONALTAXREGISTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.PT_register,
);

router.post(
  '/v1/attendance_dashboard',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.attendance_dashboard,
);

router.post(
  '/v1/attendanceCorrectionRequestReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECORRECTIONREQUESTREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.attendanceCorrectionRequestReport,
);

router.post(
  '/v1/expenseClaimReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSECLAIMREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.expenseClaimReport,
);

router.post(
  '/v1/marsExpenseReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEREPORTMARS,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.marsExpenseReport,
);

router.post(
  '/v1/completedTenureReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.COMPLETEDTENUREREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.completedTenureReport,
);

router.post(
  '/v1/officeExpenseReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSEREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.officeExpenseReport,
);

router.post(
  '/v1/tallyFormatOfficeExpense',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSEREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.tallyFormatOfficeExpense,
);

// -------------------- Salary Calculation Sheet (Samarth Enterprise)---------------------
router.post(
  '/v1/salaryCalculationSheet',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SALARYCALCULATIONSHEET,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.salaryCalculationSheet,
);

router.post(
  '/v1/attendanceReportWithSalaryCycle',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCEREGISTERONE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.attendanceReportWithSalaryCycle,
);

router.post(
  '/v1/formattedSalaryRegister',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SALARYREGISTERREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.formattedSalaryRegister,
);

router.post(
  '/v1/joinExitEmployeeReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEJOININGANDEXITREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.joinExitEmployeeReport,
);

router.post(
  '/v1/documentSubmissionReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DOCUMENTSUBMISSIONREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.documentSubmissionReport,
);

router.post(
  '/v1/form13',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FORM13,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.form13,
);

router.post(
  '/v1/serviceReportByVisitID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISIT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.TEAMVISIT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.serviceReportByVisitID,
);

router.post(
  '/v1/employeeExpenseLedger',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEEXPENSELEDGER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.employeeExpenseLedger,
);

router.post(
  '/v1/employeeOfficeExpenseLedger',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEOFFICEEXPENSELEDGER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.employeeOfficeExpenseLedger,
);

router.post(
  '/v1/attendanceCorrectionReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECORRECTIONREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.attendanceCorrectionReport,
);

router.post(
  '/v1/employeeBonusReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BONUSREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.employeeBonusReport,
);

router.post(
  '/v1/formF',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FORMF,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.formFZip,
);

router.post(
  '/v1/allTaskReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TASKREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.allTaskReport,
);

router.post(
  '/v1/newForm11',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FORM11,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.newForm11,
);

router.post(
  '/v1/form2Revised',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LEAVEBALANCEREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.form2Revised,
);

router.post(
  '/v1/form1Declaration',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FORM1DECLARATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.form1Declaration,
);

router.post(
  '/v1/physicalPresentAbsentReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PHYSICALPRESENTABSENTREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.physicalPresentAbsentReport,
);

router.post(
  '/v1/loanReportWithEMI',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LOANREPORTWITHEMI,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.loanReportWithEMI,
);

router.post(
  '/v1/projectWiseSalaryReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PROJECTWISESALARYREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.projectWiseSalaryReport,
);

router.post(
  '/v2/expense-report',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.expenseReportV2,
);
router.post(
  '/v1/expense-report-count',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.expenseReportCount,
);
router.post(
  '/v1/visitMeetingReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITMEETINGREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.visitMeetingReport,
);
router.post(
  '/v1/perDaySalaryReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PERDAYSALARYREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.perDaySalaryReport,
);

router.post(
  '/v1/form_C_bonus',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FORMC,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.form_C_bonus,
);
router.post(
  '/v1/contractor-wise-salary-summary',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CONTRACTORWISESALARYSUMMARYREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.contractor_wise_salary_summary,
);

router.post(
  '/v1/yearly-mandays-report',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.YEARLYMANDAYSREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.yearlyMandaysReport,
);

router.post(
  '/v1/absenteeism-report',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ABSENTEEISMREPORT,
        operation: formOperation.VIEW,
      },
      {
        permissionName:
          fromPermissionName.CONTRACTORWISEABSENTEEISMSUMMARYREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.absenteeismReport,
);

router.post(
  '/v1/manpower-requisition-report',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MANPOWERREQUISITIONREQUESTREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.manpowerRequisitionRequestReport,
);

router.post(
  '/v1/loan-outstanding-report',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEELOANOUTSTANDINGREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.loanOutstandingReport,
);

router.post(
  '/v1/leave-encashment-report',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LEAVEENCASHMENTREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.leaveEncashmentReport,
);

router.post(
  '/v1/gender-Wise-salary-summary',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GENDERWISESALARYSUMMARY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.genderWiseSalarySummary,
);

router.post(
  '/v1/payheadWiseSalaryReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PAYHEADWISESALARYREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.payheadWiseSalaryReport,
);

router.post(
  '/v1/employeeGPSTrackingSummaryReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEGPSTRACKINGSUMMARYREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.employeeGPSTrackingSummaryReport,
);

router.post(
  '/v1/lateComeEarlyGoReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LATEINEARLYBYREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.lateComeEarlyGoReport,
);

router.post(
  '/v1/salaryIncrementRequestReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SALARYINCREMENTREQUESTREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.salaryIncrementRequestReport,
);

router.post(
  '/v1/attritionReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTRITIONREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.attritionReport,
);

router.post(
  '/v1/employeeSalaryAndHeadcountReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEESALARYANDHEADCOUNTREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportController.employeeSalaryAndHeadcountReport,
);

module.exports = router;
