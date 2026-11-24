const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const { statusCodes } = require('../utils/commonVars');
const message = require('../response_message/message');
const { accessibleRoleWiseUsers } = require('../middleware/accessibleRoleWiseUsers');
const PayrollStatutorySalaryTrans = require('../models/payrollStatutorySalaryTrans');
const EmpPayrollStatutoryDetails = require('../models/empPayrollStatutoryDetails');
const GradeSalaryStructure = require('../models/gradeSalaryStructure');
const HRSalaryFields = require('../models/hrSalaryFields');
const Payheadmaster = require('../models/payhead');
const { getPayrollStatutoryTransData } = require('../utils/commonUtilFunctions');
const { generatePayrollStatutoryExcel } = require('../utils/exportData');
const companyMaster = require('../models/companyMaster');
const moment = require('moment');
const puppeteer = require('puppeteer');
const Handlebars = require('handlebars');
const path = require('path');
const fs = require('fs');
const { payheadMasterIdsMapping, salaryFieldSrNoFields, HrLeaveTypesIds } = require('../utils/dbUtils');

exports.payrollReport = async(req,res,next) =>{
    try {
         const {
      companyMasterID,
      branchMasterID,
      departmentID,
      designationID,
      divisionID,
      workingAreaID,
      month,
      userMasterID,
      orderByFields,
      exportType = 'excel'
    } = req.body;

    if (!companyMasterID || !month) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: message.usermessage.requiredMessage(
          'companyMasterID and month',
        ),
      });
    }

    const currentMonth = moment().format('YYYYMM');

    if (+month > +currentMonth) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: 'You cannot retrieve salary data for a future month.',
      });
    }

    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: false,
    });

  const paramsData = {
    companyMasterID,
      branchMasterID,
      departmentID,
      designationID,
      divisionID,
      workingAreaID,
      month,
      userMasterID,
      orderByFields,
      userAccessCondition,
      includeAttnCal : true,
      includeDivision : true,
      includeWorkingArea : true
    }

   const userData = await getPayrollStatutoryTransData(paramsData);

   // Get company details
   const companyData = await companyMaster.findOne({
     where: { companyMasterID },
     attributes: ['companyName', 'companyAddress'],
     raw: true
   });

   const monthFormatted = moment(month, 'YYYYMM').format('MMM YYYY');
   const reportData = [];

   const excludeLeaveIds = [
     HrLeaveTypesIds.WORKING_HRS,
     HrLeaveTypesIds.OT_HRS,
     HrLeaveTypesIds.LEAVE_BEHALF_ON_SANDWICH,
     HrLeaveTypesIds.ATTENDANCE_BONUS,
     HrLeaveTypesIds.LEAVE_HRS,
     HrLeaveTypesIds.ACTUAL_HOLIDAY,
     HrLeaveTypesIds.ACTUAL_WEEKOFF
   ];

   const excludePayheadIds = [
    payheadMasterIdsMapping.GROSS,
    payheadMasterIdsMapping.NETSALARY,
    payheadMasterIdsMapping.CTC
   ];

   // Process each user
   for(const user of userData){
      const payrollData = user.PSST || [];
      const empJoining = user.emp_join?.[0] || null;
      const branch = user.employeeBranches?.[0]?.branchMaster?.branchName || '';
      const department = user.employeeDepartments?.[0]?.department?.departmentName || '';
      const designation = user.employeeDesignations?.[0]?.designation?.designationName || '';
      const division = user.emp_div?.[0]?.division?.divisionName || '';
      const workingArea = user.emp_area?.[0]?.workingArea?.workingAreaName || '';
      const AttnCal = (user.PSAC || []).sort((a,b)=> a.LeaveTranId - b.LeaveTranId);
      const paidDays = payrollData?.[0].SalaryCalcOnDays || 0;
      const monthDays = AttnCal?.[0]?.MonDays || moment(month, 'YYYYMM').daysInMonth();

      // Group by salary field types for all employees
      const earnings = {}; // salaryFieldSrNo = 'A' from trans data
      const deductions = {}; // salaryFieldSrNo = 'B' from trans data
      const employerContributions = {}; // salaryFieldSrNo = 'C' from trans data
      const rateOfWages = {}; // salaryFieldSrNo = 'A' from detail actual amounts
      
      let grossSalary = 0;
      let grossSalaryActual = 0;
      let netSalary = 0;
      let ctc = 0;
      let totalDeductions = 0;

      // Collect all payhead data for sorting (including incentives and penalties)
      const payheadDataArray = [];
      const payheadMapping = {}; // Map payhead names to their IDs

      // Process payroll statutory trans in ONE loop
      for(const psst of payrollData) {
        const detail = psst.EPSD || {}; // One-to-one relation
        const gss = detail.GSS || {};
        const hsf = gss.HSF || {};
        const payhead = hsf.PHM || {};
        
        const payheadName = hsf.payheadDisplayName || payhead.payheadName || '';
        const payheadMasterId = hsf.payheadMasterId;
        const salaryFieldSrNo = hsf.salaryFieldSrNo;
        const salaryFieldIndex = hsf.salaryFieldIndex || 0;
        const actualAmount = detail.EmployeeSalaryAmount || 0;
        const transAmount = psst.EmployeeSalaryAmount || 0;

        // Add to payhead mapping
        if(payheadName && payheadMasterId) {
          payheadMapping[payheadName] = payheadMasterId;
        }

        // -------------------- Incentives --------------------

       if(payheadMasterId == payheadMasterIdsMapping.INCENTIVE){

        const incentiveMap = new Map();

(psst.INC || []).forEach((inc) => {
  const incType = inc.IncType || {};
  const incentiveId = inc.IncentivetypeID;
  const amount = +inc.amount || 0;

  if (amount <= 0) return;

  if (!incentiveMap.has(incentiveId)) {
    incentiveMap.set(incentiveId, {
      payheadName:
        incType.dataValues?.dname ||
        incType.dataValues?.name ||
        'Incentive',
      amount: 0,
    });
  }

  incentiveMap.get(incentiveId).amount += amount;
});

for (const incentive of incentiveMap.values()) {
  payheadDataArray.push({
    payheadName: incentive.payheadName,
    payheadMasterId: payheadMasterIdsMapping.INCENTIVE,
    salaryFieldSrNo: salaryFieldSrNoFields.EARNING,
    salaryFieldIndex: 999,
    actualAmount: 0,
    transAmount: incentive.amount,
  });
}


       }



// -------------------- Penalties --------------------

 if(payheadMasterId == payheadMasterIdsMapping.PENALTY){

  const penaltyMap = new Map();

(psst.EMP || []).forEach((penalty) => {
  const penaltyData = penalty.penalty || {};
  const penaltyId =
    penaltyData.penaltyMasterId ||
    penalty.penaltyMasterId ||
    penalty.penaltyID;

  const amount = +penalty.penaltyAmount || 0;

  if (amount <= 0) return;

  if (!penaltyMap.has(penaltyId)) {
    penaltyMap.set(penaltyId, {
      payheadName: penaltyData.penaltyName || 'Penalty',
      amount: 0,
    });
  }

  penaltyMap.get(penaltyId).amount += amount;
});

for (const penalty of penaltyMap.values()) {
  payheadDataArray.push({
    payheadName: penalty.payheadName,
    payheadMasterId: payheadMasterIdsMapping.PENALTY,
    salaryFieldSrNo: salaryFieldSrNoFields.EMPLOYEE_DEDUCTION,
    salaryFieldIndex: 999,
    actualAmount: 0,
    transAmount: penalty.amount,
  });
}

 }


        // Add regular payheads to array
        if(payheadName && ![payheadMasterIdsMapping.INCENTIVE,payheadMasterIdsMapping.PENALTY].includes(payheadMasterId)) {
          payheadDataArray.push({
            payheadName,
            payheadMasterId,
            salaryFieldSrNo,
            salaryFieldIndex,
            actualAmount,
            transAmount
          });
        }

      }

      // Sort payheads by payheadMasterId first, then salaryFieldIndex
      payheadDataArray.sort((a, b) => {
        if(a.payheadMasterId !== b.payheadMasterId) {
          return a.payheadMasterId - b.payheadMasterId;
        }
        return a.salaryFieldIndex - b.salaryFieldIndex;
      });

      // Process sorted payhead data
      for(const item of payheadDataArray) {
        const { payheadName, payheadMasterId, salaryFieldSrNo, actualAmount, transAmount } = item;

        // Rate of Wages (actual amounts from detail where salaryFieldSrNo = 'A')
        // Exclude Gross (ID = 50)
        if(salaryFieldSrNo === salaryFieldSrNoFields.EARNING && actualAmount > 0 && !excludePayheadIds.includes(payheadMasterId)) {
          rateOfWages[payheadName] = actualAmount;
        }

        // Earnings (trans amounts where salaryFieldSrNo = 'A')
        // Exclude Gross (ID = 50)
        if(salaryFieldSrNo === salaryFieldSrNoFields.EARNING && transAmount > 0 && !excludePayheadIds.includes(payheadMasterId)) {
          earnings[payheadName] = transAmount;
        }

        // Deductions (trans amounts where salaryFieldSrNo = 'B')
        // Exclude Net Salary (ID = 92)
        if(salaryFieldSrNo === salaryFieldSrNoFields.EMPLOYEE_DEDUCTION && transAmount > 0 && !excludePayheadIds.includes(payheadMasterId)) {
          deductions[payheadName] = transAmount;
          totalDeductions += transAmount;
        }

        // Employer Contributions (trans amounts where salaryFieldSrNo = 'C')
        // Exclude CTC (ID = 1)
        if(salaryFieldSrNo === salaryFieldSrNoFields.EMPLOYER_DEDUCTION && transAmount > 0 && !excludePayheadIds.includes(payheadMasterId)) {
          employerContributions[payheadName] = transAmount;
        }

        // Get specific values and check for 0
        if(payheadMasterId === payheadMasterIdsMapping.GROSS) {
          grossSalary = transAmount || 0;
          grossSalaryActual = actualAmount || 0;
        }
        if(payheadMasterId === payheadMasterIdsMapping.NETSALARY) {
          netSalary = transAmount || 0;
          netSalaryActual = actualAmount || 0;
        }
        if(payheadMasterId === payheadMasterIdsMapping.CTC) {
          ctc = transAmount || 0;
        }
      }

      // Calculate attendance data
      const attendanceData = {};

      for(const attn of AttnCal) {
        const leaveId = attn.hrLeaveType?.LeaveID || '';
        const days = attn.AttnVal || 0;
        const leaveName = attn.hrLeaveType?.LeaveMaster?.LeaveName || '';
        
        // Skip excluded leave IDs
        if(!excludeLeaveIds.includes(leaveId)) {
          attendanceData[leaveName] = days;
        }

      }

      reportData.push({
        employeeCode: empJoining?.employeeCode || '',
        displayName: user.displayName || '',
        mobileNo: user.userNumber || '',
        gender: user.gender || '',
        joiningDate: empJoining?.joiningDate ? moment(empJoining.joiningDate).format('YYYY-MM-DD') : '',
        branch,
        department,
        designation,
        division,
        workingArea,
        salaryType: '',
        panNumber: empJoining?.pancard || '',
        accountNo:empJoining?.bankAccountStatus == 1 ? empJoining.bankAccountNo: '',
        ifscNo: empJoining?.bankAccountStatus == 1 ? empJoining.bankIFSC : '',
        esicNo: empJoining?.esicNumber || '',
        uanNo: empJoining?.uanNumber || '',
        pfNo: empJoining?.pfNumber || '',
        paidDays,
        unpaidDays:Math.max(monthDays - paidDays,0),
        totalDays:monthDays,
        actualGrossSalary: grossSalaryActual,
        earnings,
        deductions,
        employerContributions,
        rateOfWages,
        grossSalary,
        grossSalaryActual,
        totalDeductions,
        netSalary,
        ctc,
        attendanceData,
        payheadMapping // Pass the mapping to Excel function
      });
    }

    // Generate Excel or PDF based on exportType
    if(exportType === 'excel') {
      const buffer = await generatePayrollStatutoryExcel(reportData, companyData, monthFormatted);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=PayrollStatutory_${month}.xlsx`);
      return res.send(buffer);
    } else if(exportType === 'pdf') {
      const pdfBuffer = await generatePayrollStatutoryPDF(reportData, companyData, monthFormatted);
      const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
      return res.status(statusCodes.OK).json({
        status: statusCodes.OK,
        data:pdfBase64
      });
    }
        
    } catch (error) {
        next(error);
    }
    
};

// Generate PDF Function
async function generatePayrollStatutoryPDF(reportData, companyData, monthFormatted) {
  const templatePath = path.join(__dirname, '../html/payrollStatutoryReport.html');
  
  // Read HTML template
  const htmlTemplate = fs.readFileSync(templatePath, 'utf8');

  // Calculate grand totals
  const grandTotalRateOfWages = {};
  const grandTotalEarnings = {};
  const grandTotalDeductions = {};
  let grandTotalGross = 0;
  let grandTotalGrossActual = 0;
  let totalDeductionsSum = 0;
  let totalNetSalarySum = 0;

  reportData.forEach(row => {
    // Rate of Wages totals
    Object.entries(row.rateOfWages || {}).forEach(([key, value]) => {
      grandTotalRateOfWages[key] = (grandTotalRateOfWages[key] || 0) + value;
    });

    // Earnings totals
    Object.entries(row.earnings || {}).forEach(([key, value]) => {
      grandTotalEarnings[key] = (grandTotalEarnings[key] || 0) + value;
    });

    // Deductions totals
    Object.entries(row.deductions || {}).forEach(([key, value]) => {
      grandTotalDeductions[key] = (grandTotalDeductions[key] || 0) + value;
    });

    grandTotalGross += row.grossSalary || 0;
    grandTotalGrossActual += row.grossSalaryActual || 0;
    totalDeductionsSum += row.totalDeductions || 0;
    totalNetSalarySum += row.netSalary || 0;
  });

  // Register Handlebars helpers
  Handlebars.registerHelper('add', (a, b) => a + b);
  Handlebars.registerHelper('formatNumber', (num) => {
    return typeof num === 'number' ? num : '0';
  });

  const template = Handlebars.compile(htmlTemplate);
  const html = template({
    companyName: companyData?.companyName || '',
    companyAddress: companyData?.companyAddress || '',
    pfNumber: companyData?.pfNumber || '',
    esicNumber: companyData?.esicNumber || '',
    month: monthFormatted,
    employees: reportData,
    grandTotalRateOfWages,
    grandTotalEarnings,
    grandTotalDeductions,
    grandTotalGross,
    grandTotalGrossActual,
    totalDeductionsSum,
    totalNetSalarySum
  });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  
  const pdfBuffer = await page.pdf({
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: {
      top: '10mm',
      right: '10mm',
      bottom: '10mm',
      left: '10mm'
    }
  });

  await browser.close();
  return pdfBuffer;
}
