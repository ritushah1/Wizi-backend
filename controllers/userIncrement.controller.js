const userIncrementLetter = require('../models/userIncrementLetter');
const { Sequelize, Op } = require('sequelize');
const companyMaster = require('../models/companyMaster');
const sequelize = require('../config/database');
const { usermessage } = require('../response_message/message');
const UserIncrementLetter = require('../models/userIncrementLetter');
const UserMaster = require('../models/userMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const IncrementLetter = require('../models/incrementLetter');
const {
  employeeBranch,
  employeeDesignation,
  employeeDepartment,
  getEmployeeAddress,
  asiaKolkataDateTime,
  userReportTo,
  addPageBreak,
  addSalaryStructureKeyword,
  onTableHtmlAddSalaryStructureKeyword,
  findCompanyNotificationPolicy,
  getRoundOffSalary,
  toWords,
} = require('../utils/commonUtilFunctions');
const EmployeeShift = require('../models/employeeShift');
const Shift = require('../models/shift');
const GradeSalaryStructure = require('../models/gradeSalaryStructure');
const HRSalaryMaster = require('../models/hrSalaryMaster');
const GradeStructure = require('../models/gradeStructure');
const HRSalaryFields = require('../models/hrSalaryFields');
const Payheadmaster = require('../models/payhead');
const { month_dict } = require('../utils/commonUtilFunctions');
const { join } = require('path');
const { readFileSync } = require('fs');
const { launch } = require('puppeteer');
const fs = require('fs');
const base64Img = require('base64-img');
const path = require('path');
const Handlebars = require('handlebars');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const mailTemplateEditor = require('../models/mailTemplateEditor');
const { sendOfferLetter } = require('../middleware/sendemail');
const { log } = require('winston');
const UserReportTO = require('../models/employeeReportTo');
const moment = require('moment');
const { generateOfferLetterPdf } = require('../utils/pdfGenerate');
const incrementLetter = require('../models/incrementLetter');
const { showEmployerLWF, showActualEDLI } = require('../utils/labelUtils');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const EmployeeProject = require('../models/employeeProject');
const Project = require('../models/project');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');

let t;
exports.getAllIncrementLetter = async (req, res, next) => {
  try {
    const { userMasterID } = req.body;

    const UserIncrements = await UserIncrementLetter.findAll({
      where: {
        userMasterID: userMasterID,
      },
    });

    if (!UserIncrements || UserIncrements.length === 0) {
      return res.status(200).json({
        status: 200,
        data: [
          {
            label: 'Increment Letter',
            path: '',
            htmlContent: '',
            incrementLetterID: null,
            userincrementLetterID: null,
          },
        ],
      });
    }

    UserIncrements.forEach((increment) => {
      increment.incrementletterHTML = addPageBreak(
        increment.incrementletterHTML,
      );
      increment.incrementletterHTML = addSalaryStructureKeyword(
        increment.incrementletterHTML,
      );
      increment.incrementletterHTML = onTableHtmlAddSalaryStructureKeyword(
        increment.incrementletterHTML,
      );
    });

    return res.status(200).json({
      status: 200,
      data: UserIncrements.map((increment) => ({
        label: 'Increment Letter',
        path: increment.incrementLetter,
        htmlContent: increment.incrementletterHTML,
        incrementLetterID: increment.incrementLetterID,
        userincrementLetterID: increment.userincrementLetterID,
        oldSalaryStructure: increment.oldSalaryStructure,
        newSalaryStructure: increment.newSalaryStructure,
        isVisibleToEmp: increment.isVisibleToEmp,
      })),
    });
  } catch (err) {
    next(err);
  }
};
function renderHtmlTemplate(content, values) {
  return Object.entries(values).reduce((html, [key, value]) => {
    return html.split(`{{${key}}}`).join(value == null ? '' : String(value));
  }, content);
}
async function generatePDF(htmlFileName, obj, headerTemplate) {
  try {
    const templatePath = join(__dirname, '../html/', `${htmlFileName}.html`);

    let content = fs.readFileSync(templatePath, 'utf-8');
    content = renderHtmlTemplate(content, obj);

    const browser = await launch({
      // headless: true,
      headless: 'new',
      args: ['--no-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(content, {
      waitUntil: 'domcontentloaded',
    });
    await page.emulateMediaType('screen');

    if (headerTemplate) {
      const pdfBuffer = await page.pdf({
        format: 'A4',
        displayHeaderFooter: true,
        headerTemplate: headerTemplate,
        footerTemplate: ' ',
        margin: {
          top: '240px',
          bottom: '140px',
          right: '60px',
          left: '60px',
        },
        preferCSSPageSize: true,
      });
      await browser.close();
      return Buffer.from(pdfBuffer);
    } else {
      const pdfBuffer = await page.pdf({
        format: 'A4',
        displayHeaderFooter: false,
        margin: {
          top: '240px',
          bottom: '140px',
          right: '60px',
          left: '60px',
        },

        preferCSSPageSize: true,
      });
      await browser.close();
      return Buffer.from(pdfBuffer);
    }
  } catch (error) {
    console.log('Error in Generate PDF Function', error);
  }
}

async function getAddress(userMasterID) {
  let Address = '';
  const EmpAddress = await getEmployeeAddress(userMasterID);
  if (EmpAddress) {
    if (EmpAddress.houseNumber) Address += `${EmpAddress.houseNumber}, `;
    if (EmpAddress.houseName) Address += `${EmpAddress.houseName}, `;
    if (EmpAddress.landmark) Address += `${EmpAddress.landmark}, `;
    if (EmpAddress.area) Address += `${EmpAddress.area}, `;
    if (EmpAddress['cityMaster.cityName'])
      Address += `${EmpAddress['cityMaster.cityName']}, `;
    if (EmpAddress['cityMaster.stateMaster.stateName'])
      Address += `${EmpAddress['cityMaster.stateMaster.stateName']}, `;
    if (EmpAddress['cityMaster.stateMaster.countryMaster.countryName'])
      Address += `${EmpAddress['cityMaster.stateMaster.countryMaster.countryName']} `;
    if (EmpAddress.zipcode) Address += `${EmpAddress.zipcode}`;
  }
  return Address;
}

async function getSalaryStructureHTML(
  userMasterID,
  salaryFromYYYYMM,
  isWithHeading,
  increaseWidth,
) {
  let finalOBJ = {
    CTC: '',
    Net: '',
    Gross: '',
    MonthlyCTC: '',
    MonthlyNet: '',
    MonthlyGross: '',
    SalaryStructure: '',
    CTCInWords: '',
    MonthlyCTCInWords: '',
    GrossInWords: '',
    MonthlyGrossInWords: '',
    NetInWords: '',
    MonthlyNetInWords: '',
  };

  const notIncludeIds = [
    16, 17, 9, 24, 34, 43, 78, 83, 96, 97, 99, 67, 101, 102, 103, 104, 107, 112,
    116, 135, 123, 125, 126, 127, 133, 130, 122, 147, 148, 151, 152,
  ];

  if (!showEmployerLWF) notIncludeIds.push(59);

  const salaryMasterdata = await HRSalaryMaster.findAll({
    raw: true,
    where: {
      userMasterID: userMasterID,
      salaryFromYYYYMM: salaryFromYYYYMM,
      '$gradeSalaryStructure.hrSalaryField.payheadMasterId$': {
        [Sequelize.Op.notIn]: notIncludeIds,
      },
    },
    include: [
      {
        model: GradeSalaryStructure,
        include: [
          { model: GradeStructure, attributes: [] },
          {
            model: HRSalaryFields,
            include: [
              {
                model: Payheadmaster,
                attributes: [],
              },
            ],
            attributes: [],
          },
        ],
        attributes: [],
        order: [
          ['salaryfieldindex', 'ASC'],
          [
            { model: HRSalaryFields, model: Payheadmaster },
            'payheadName',
            'ASC',
          ],
        ],
      },
    ],
    attributes: [
      [
        Sequelize.col(
          'gradeSalaryStructure.hrSalaryField.Payheadmaster.payheadName',
        ),
        'payheadName',
      ],
      [
        Sequelize.col('gradeSalaryStructure.hrSalaryField.payheadDisplayName'),
        'payheadDisplayName',
      ],
      'EmployeeSalaryAmount',
      'salaryFromYYYYMM',
      'ActualEmployeeSalaryAmount',
      [
        Sequelize.col('gradeSalaryStructure.gradeStructure.baseOnCalculation'),
        'baseOnCalculation',
      ],
      [Sequelize.col('gradeSalaryStructure.formula'), 'formula'],
      [
        Sequelize.col('gradeSalaryStructure.hrSalaryField.salaryFieldSrNo'),
        'salaryFieldSrNo',
      ],
      [
        Sequelize.col('gradeSalaryStructure.hrSalaryField.payheadMasterId'),
        'payheadMasterId',
      ],
      [
        Sequelize.col('gradeSalaryStructure.hrSalaryField.considerIn'),
        'considerIn',
      ],
      [
        Sequelize.col('gradeSalaryStructure.hrSalaryField.assignSalaryRound'),
        'assignSalaryRound',
      ],

      [
        Sequelize.col('gradeSalaryStructure.hrSalaryField.assignSalaryRoundNo'),
        'assignSalaryRoundNo',
      ],
      [
        Sequelize.col(
          'gradeSalaryStructure.hrSalaryField.assignSalaryRoundOffType',
        ),
        'assignSalaryRoundOffType',
      ],
      [
        Sequelize.col(
          'gradeSalaryStructure.hrSalaryField.salaryFieldWhenMonth',
        ),
        'salaryFieldWhenMonth',
      ],
    ],
  });

  const groupedData = {
    A: [],
    gross: [], // Gross
    B: [], // Employee Deduction
    AB: [],
    netPay: [], // add In Net Pay
    C: [],
    ctc: [], // Employer Deduction
  };

  const finalDataTemp = salaryMasterdata.filter(
    (f) => ![1, 50, 92].includes(+f.payheadMasterId),
  );
  const Net_Ctc_Gross = salaryMasterdata.filter((f) =>
    [1, 50, 92].includes(+f.payheadMasterId),
  );

  let yearly_aTotal = 0;
  let yearly_bTotal = 0;
  let yearly_extra_aTotal = 0;
  let yearly_cTotal = 0;

  finalDataTemp.forEach((item) => {
    let length = 12;
    if (
      Array.isArray(item.salaryFieldWhenMonth) &&
      item.salaryFieldWhenMonth[0] != 0
    ) {
      length = item.salaryFieldWhenMonth.length;
    }

    let amount = +item.EmployeeSalaryAmount;
    // for EDLI
    if (item.payheadMasterId == 66 && showActualEDLI) {
      amount = getRoundOffSalary(
        +item.ActualEmployeeSalaryAmount,
        item.assignSalaryRound,
        item.assignSalaryRoundOffType,
        item.assignSalaryRoundNo,
      );
    }

    const yearlyAmount = amount * length;

    item.EmployeeSalaryAmount = amount;
    item.yearlyAmount = yearlyAmount;
    item.payheadName = item.payheadDisplayName?.trim() || item.payheadName;

    if (item.salaryFieldSrNo == 'A' && item.considerIn !== 'net') {
      groupedData.A.push(item);
      yearly_aTotal += yearlyAmount;
    }
    if (item.salaryFieldSrNo == 'A' && item.considerIn === 'net') {
      groupedData.AB.push(item);
      yearly_extra_aTotal += yearlyAmount;
    }
    if (item.salaryFieldSrNo == 'B') {
      groupedData.B.push(item);
      yearly_bTotal += yearlyAmount;
    }
    if (item.salaryFieldSrNo == 'C') {
      groupedData.C.push(item);
      yearly_cTotal += yearlyAmount;
    }
  });

  Net_Ctc_Gross.forEach((el) => {
    if (el.payheadMasterId == 1) {
      el.yearlyAmount = getRoundOffSalary(
        yearly_aTotal + yearly_extra_aTotal + yearly_cTotal,
        el.assignSalaryRound,
        el.assignSalaryRoundOffType,
        el.assignSalaryRoundNo,
      );

      groupedData.ctc.push(el);

      finalOBJ.MonthlyCTC = +el.EmployeeSalaryAmount;
      finalOBJ.MonthlyCTCInWords = toWords.convert(+el.EmployeeSalaryAmount);
      finalOBJ.CTC = el.yearlyAmount;
      finalOBJ.CTCInWords = toWords.convert(el.yearlyAmount);
    }
    if (el.payheadMasterId == 50) {
      el.yearlyAmount = getRoundOffSalary(
        yearly_aTotal,
        el.assignSalaryRound,
        el.assignSalaryRoundOffType,
        el.assignSalaryRoundNo,
      );
      groupedData.gross.push(el);

      finalOBJ.MonthlyGross = +el.EmployeeSalaryAmount;
      finalOBJ.MonthlyGrossInWords = toWords.convert(+el.EmployeeSalaryAmount);
      finalOBJ.Gross = el.yearlyAmount;
      finalOBJ.GrossInWords = toWords.convert(el.yearlyAmount);
    }
    if (el.payheadMasterId == 92) {
      el.yearlyAmount = getRoundOffSalary(
        yearly_aTotal + yearly_extra_aTotal - yearly_bTotal,
        el.assignSalaryRound,
        el.assignSalaryRoundOffType,
        el.assignSalaryRoundNo,
      );

      groupedData.netPay.push(el);

      finalOBJ.MonthlyNet = +el.EmployeeSalaryAmount;
      finalOBJ.MonthlyNetInWords = toWords.convert(+el.EmployeeSalaryAmount);
      finalOBJ.Net = el.yearlyAmount;
      finalOBJ.NetInWords = toWords.convert(el.yearlyAmount);
    }
  });

  const finalData = [
    ...groupedData.A,
    ...groupedData.gross,
    ...groupedData.B,
    ...groupedData.AB,
    ...groupedData.netPay,
    ...groupedData.C,
    ...groupedData.ctc,
  ];

  let salaryType = finalData[0]?.baseOnCalculation || '';
  let baseOnCalculation = finalData[0]?.baseOnCalculation || '';

  // Format the salaryFromYYYYMM as "Month-Year"
  let monthYearHeading =
    month_dict[String(salaryFromYYYYMM).slice(4, 6)] +
    '-' +
    String(salaryFromYYYYMM).slice(0, 4);

  // Adjust headers based on baseOnCalculation
  let tableHeaders = '';
  if (baseOnCalculation === 'H') {
    tableHeaders = `
      <th style="text-align: center;padding : 2px; width:${increaseWidth ? '250px' : 'auto'};">Amount(Hourly)</th>
    `;
  } else if (baseOnCalculation === 'D') {
    tableHeaders = `
      <th style="text-align: center;padding : 2px; width:${increaseWidth ? '250px' : 'auto'};">Amount(Daily)</th>
    `;
  } else if (baseOnCalculation === 'M') {
    tableHeaders = `
      <th style="text-align: center;padding : 2px; width:${increaseWidth ? '250px' : 'auto'};">Amount(Monthly)</th>
      <th style="text-align: center;padding : 2px; width:${increaseWidth ? '250px' : 'auto'};">Amount(Yearly)</th>
    `;
  }

  let html = `<table border='1' id='SalaryStructureOfUser'
  style='border:1px solid black;border-collapse: collapse;'>`;
  if (!isWithHeading) {
    html += `
    <tr>
      <th colspan="5" style="text-align: center; background-color: lightgray">
        Salary Structure from ${monthYearHeading}
      </th>
    </tr>`;
  }
  html += `
  
  <tr>
    <th style="text-align: center;padding : 2px;width:${increaseWidth ? '250px' : 'auto'};">Payhead Name</th>
    ${tableHeaders} 
    </tr>`;

  // Add rows with data based on baseOnCalculation
  for (var item of finalData) {
    let tempData = '<tr>';
    if (
      item.payheadName == 'GROSS' ||
      item.payheadName == 'CTC' ||
      item.payheadName == 'NET SALARY'
    ) {
      tempData =
        tempData +
        '<td style="text-align: left;padding : 2px">' +
        '<b>' +
        item.payheadName +
        '</b>' +
        '</td>';
    } else {
      tempData =
        tempData +
        '<td style="text-align: left;padding : 2px">' +
        item.payheadName +
        '</td>';
    }

    if (baseOnCalculation === 'H') {
      if (
        item.payheadName == 'GROSS' ||
        item.payheadName == 'CTC' ||
        item.payheadName == 'NET SALARY'
      ) {
        tempData =
          tempData +
          '<td style="text-align: right;padding : 2px"><b> ' +
          item.EmployeeSalaryAmount +
          '</b></td>';
      } else {
        tempData =
          tempData +
          '<td style="text-align: right;padding : 2px">' +
          item.EmployeeSalaryAmount +
          '</td>';
      }
    } else if (baseOnCalculation === 'D') {
      if (
        item.payheadName == 'GROSS' ||
        item.payheadName == 'CTC' ||
        item.payheadName == 'NET SALARY'
      ) {
        tempData =
          tempData +
          '<td style="text-align: right;padding : 2px"><b>' +
          item.EmployeeSalaryAmount +
          '</b></td>';
      } else {
        tempData =
          tempData +
          '<td style="text-align: right;padding : 2px">' +
          item.EmployeeSalaryAmount +
          '</td>';
      }
    } else if (baseOnCalculation === 'M') {
      if (
        item.payheadName == 'GROSS' ||
        item.payheadName == 'CTC' ||
        item.payheadName == 'NET SALARY'
      ) {
        tempData =
          tempData +
          '<td style="text-align: right;padding : 2px"><b>' +
          item.EmployeeSalaryAmount +
          '</b></td>';
        let amt = salaryType == 'M' ? +item.yearlyAmount : '';
        tempData =
          tempData +
          '<td style="text-align: right;padding : 2px"><b>' +
          amt +
          '</b></td>';
      } else {
        tempData =
          tempData +
          '<td style="text-align: right;padding : 2px">' +
          item.EmployeeSalaryAmount +
          '</td>';
        let amt = salaryType == 'M' ? +item.yearlyAmount : '';
        tempData =
          tempData +
          '<td style="text-align: right;padding : 2px">' +
          amt +
          '</td>';
      }
    }

    tempData = tempData + '</tr>';
    html = html + tempData;
  }

  html = html + `</table>`;

  finalOBJ.SalaryStructure = html;

  if (salaryType != 'M') {
    finalOBJ.CTC = '';
    finalOBJ.Gross = '';
    finalOBJ.Net = '';
    finalOBJ.NetInWords = '';
    finalOBJ.GrossInWords = '';
    finalOBJ.CTCInWords = '';
  }
  return finalOBJ;
}

async function getEmployeeShift(userid, date) {
  let shiftName = '';
  const getShift = await EmployeeShift.findOne({
    raw: true,
    where: {
      userMasterID: userid,
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
  });

  if (getShift) {
    if (getShift.shiftID) {
      const getShiftName = await Shift.findOne({
        raw: true,
        where: {
          shiftID: getShift.shiftID,
        },
        attributes: ['shiftName'],
      });
      shiftName = getShiftName ? getShiftName.shiftName : '';
    } else if (getShift.shiftsID && getShift.shiftsID.length) {
      const getShiftName = await Shift.findOne({
        raw: true,
        where: {
          shiftID: getShift.shiftsID[0],
        },
        attributes: ['shiftName'],
      });
      shiftName = getShiftName ? getShiftName.shiftName : '';
    }
  }
  return shiftName;
}

async function getEmployeeDetails(userMasterID) {
  const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

  const data = await UserMaster.findOne({
    where: {
      userMasterID,
    },

    include: [
      {
        model: companyMaster,
        required: true,
        attributes: ['companyName', 'companyLogo', 'companyMasterID'],
      },
      {
        required: false,
        model: EmployeeJoiningDetails,
        attributes: [
          'employeeCode',
          'joiningDate',
          'dob',
          'adharCard',
          'employment',
          'adharName',
        ],
      },
      {
        required: false,
        model: EmployeeBranch,
        where: {
          status: 1,
          applicableDate: {
            [Sequelize.Op.lte]: new Date(currentDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: { [Sequelize.Op.gte]: new Date(currentDate) },
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
            attributes: ['branchName', 'branchAddress'],
          },
        ],
      },
      {
        required: false,
        model: EmployeeDepartment,
        attributes: ['departmentID'],
        where: {
          status: 1,
          applicableDate: {
            [Sequelize.Op.lte]: new Date(currentDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: { [Sequelize.Op.gte]: new Date(currentDate) },
            },
            {
              endDate: { [Sequelize.Op.eq]: null },
            },
          ],
        },
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
        model: EmployeeWorkingArea,
        where: {
          status: 1,
          startDate: { [Sequelize.Op.lte]: currentDate },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: currentDate } },
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
      {
        required: false,
        model: EmployeeDesignation,
        attributes: ['designationID'],
        where: {
          status: 1,
          applicableDate: {
            [Sequelize.Op.lte]: new Date(currentDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: { [Sequelize.Op.gte]: new Date(currentDate) },
            },
            {
              endDate: { [Sequelize.Op.eq]: null },
            },
          ],
        },
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
        model: EmployeeDivision,
        attributes: ['id'],
        where: {
          status: 1,
          startDate: {
            [Sequelize.Op.lte]: new Date(currentDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: { [Sequelize.Op.gte]: new Date(currentDate) },
            },
            {
              endDate: { [Sequelize.Op.eq]: null },
            },
          ],
        },
        include: [
          {
            model: Division,
            attributes: ['divisionName'],
          },
        ],
      },
      {
        required: false,
        model: EmployeeProject,
        attributes: ['employeeProjectID'],
        where: {
          status: 1,
          startDate: {
            [Sequelize.Op.lte]: new Date(currentDate),
          },
          [Sequelize.Op.or]: [
            {
              releaseDate: { [Sequelize.Op.gte]: new Date(currentDate) },
            },
            {
              releaseDate: { [Sequelize.Op.eq]: null },
            },
          ],
        },
        include: [
          {
            model: Project,
            attributes: ['projectName'],
          },
        ],
      },
      {
        required: false,
        model: UserReportTO,
        include: [
          {
            model: UserMaster,
            as: 'reportTo',
            attributes: ['displayName'],
          },
        ],
        attributes: ['reportToID'],
      },
    ],

    attributes: [
      'email',
      'displayName',
      'userNumber',
      'userMasterID',
      'companyMasterId',
      'officalEmail',
    ],
  });

  return data;
}

const sanitizeTable = (tableHtml, type) => {
  return tableHtml.replace(
    /id=['"]SalaryStructureOfUser['"]/gi,
    `id="SalaryStructureOfUser_${type}"`,
  );
};

async function generateLetter(
  userMasterID,
  letterDetails,
  user,
  // empjoining,
  lettertype,
  oldSalaryStructure,
  newSalaryStructure,
  req,
  letterHead,
  isVisibleToEmp = false,
) {
  let cont;
  try {
    let referenceNumber = null;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now();
    const date = asiaKolkataDateTime(new Date()).slice(0, 10);

    const EmployeeData = await getEmployeeDetails(userMasterID);
    const getIncrementLetter = await incrementLetter.findOne({
      raw: true,
      where: {
        incrementLetterID: letterDetails.incrementLetterID,
      },
    });
    const isWithHeading = getIncrementLetter.letterWithoutHeading;
    if (
      getIncrementLetter?.setReferenceNumber &&
      getIncrementLetter?.resetRefNumber &&
      getIncrementLetter?.currentSequence !== 1
    ) {
      const currentMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1,
      );

      const getCurrentMonthGeneratedLetters = await UserIncrementLetter.findAll(
        {
          where: {
            incrementLetterID: letterDetails.incrementLetterID,
            createdAt: { [Op.gt]: currentMonth },
          },
        },
      );
      if (getCurrentMonthGeneratedLetters.length == 0) {
        await incrementLetter.update(
          {
            startingSequence: 1,
            currentSequence: 1,
          },
          { where: { incrementLetterID: letterDetails.incrementLetterID } },
        );

        letterDetails.currentSequence = 1;
      }
    }

    if (letterDetails.setReferenceNumber) {
      referenceNumber =
        letterDetails.refNoFormat === 'prefixFormat'
          ? letterDetails.prefix +
            '/' +
            year +
            '/' +
            month +
            '/' +
            letterDetails.currentSequence
          : letterDetails.prefix + '/' + letterDetails.currentSequence;
    }

    const Employeejoining =
      EmployeeData.employeeJoiningDetails &&
      EmployeeData.employeeJoiningDetails.length > 0
        ? EmployeeData.employeeJoiningDetails[0]
        : null;

    const Branch =
      EmployeeData.employeeBranches &&
      EmployeeData.employeeBranches.length > 0 &&
      EmployeeData.employeeBranches[0].branchMaster
        ? EmployeeData.employeeBranches[0].branchMaster.branchName
        : '';

    const Department =
      EmployeeData.employeeDepartments &&
      EmployeeData.employeeDepartments.length > 0 &&
      EmployeeData.employeeDepartments[0].department
        ? EmployeeData.employeeDepartments[0].department.departmentName
        : '';

    const Designation =
      EmployeeData.employeeDesignations &&
      EmployeeData.employeeDesignations.length > 0 &&
      EmployeeData.employeeDesignations[0].designation
        ? EmployeeData.employeeDesignations[0].designation.designationName
        : '';

    const ReportTOPerson =
      EmployeeData.employeeReportTos &&
      EmployeeData.employeeReportTos.length > 0 &&
      EmployeeData.employeeReportTos[0].reportTo
        ? EmployeeData.employeeReportTos[0].reportTo.displayName
        : '';

    const BranchAddress =
      EmployeeData.employeeBranches &&
      EmployeeData.employeeBranches.length > 0 &&
      EmployeeData.employeeBranches[0].branchMaster
        ? EmployeeData.employeeBranches[0].branchMaster.branchAddress
        : '';

    const CompanyName = EmployeeData.companyMaster.companyName;
    const UserName = EmployeeData.displayName;
    const UserNumber = EmployeeData.userNumber;

    const DateOfBirth =
      Employeejoining && Employeejoining.dob
        ? Employeejoining.dob.split('-').reverse().join('-')
        : '';

    const employeement =
      EmployeeData.employeeJoiningDetails &&
      EmployeeData.employeeJoiningDetails.length > 0 &&
      EmployeeData.employeeJoiningDetails.employment
        ? EmployeeData.employeeJoiningDetails.employment
        : '';

    const employeecode =
      EmployeeData.employeeJoiningDetails &&
      EmployeeData.employeeJoiningDetails.length > 0 &&
      EmployeeData.employeeJoiningDetails[0].employeeCode
        ? EmployeeData.employeeJoiningDetails[0].employeeCode
        : '';

    //userLetters
    if (employeecode) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[EmployeeCode]')
        .join(employeecode);
    }

    const Email = EmployeeData.email;

    const officialEmail = EmployeeData?.officalEmail || '';
    const workingArea =
      EmployeeData?.employeeWorkingAreas?.[0]?.workingArea?.workingAreaName ||
      '';

    const divisionName =
      EmployeeData?.employeeDivisions?.[0]?.division?.divisionName;

    const employeeProjects = EmployeeData?.employeeProjects;
    let allProjectsName = null;
    if (employeeProjects.length > 0) {
      allProjectsName = employeeProjects
        .map((pro) => pro?.project?.projectName)
        .join(', ');
    }

    const JoiningDate =
      EmployeeData && Employeejoining.joiningDate
        ? Employeejoining.joiningDate.split('-').reverse().join('-')
        : '';

    const AdharcardNo = EmployeeData.employeeJoiningDetails[0]
      ? EmployeeData.employeeJoiningDetails[0].adharCard
      : '';

    const NameAsOnAadhaar = EmployeeData.employeeJoiningDetails[0]
      ? EmployeeData.employeeJoiningDetails[0].adharName
      : '';

    if (referenceNumber) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[ReferenceNumber]')
        .join(referenceNumber);
    }

    if (AdharcardNo) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[AadhaarCardNumber]')
        .join(AdharcardNo);
    }

    if (NameAsOnAadhaar) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[NameAsOnAadhaar]')
        .join(NameAsOnAadhaar);
    }

    if (allProjectsName) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[Project]')
        .join(allProjectsName);
    }

    if (divisionName) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[Division]')
        .join(divisionName);
    }
    if (officialEmail) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[OfficialEmail]')
        .join(officialEmail);
    }
    if (workingArea) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[WorkingArea]')
        .join(workingArea);
    }

    const shiftName = await getEmployeeShift(userMasterID, date);
    const systemDate = new Date()
      .toISOString()
      .slice(0, 10)
      .split('-')
      .reverse()
      .join('-');
    let currentDateTime = new Date().toISOString();
    currentDateTime = moment(currentDateTime).format('DD-MM-YYYY HH:mm:ss');
    const PageBreak = `<div class="pageBreak"> </div>`;
    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('[PageBreak]')
      .join(PageBreak);
    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('class="ql-align-right"')
      .join('style="text-align:right"');
    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('class="ql-align-center"')
      .join('style="text-align:center"');
    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('class="ql-align-justify"')
      .join('style="text-align:justify;text-justify: inter-word;"');

    let OldNet = '';
    let NewNet = '';
    let OldMonthlyNet = '';
    let NewNetMonethlyNet = '';

    let oldSalaryStructureData;
    const hasOld = letterDetails.letterTemplate.includes(
      '[OldSalaryStructure]',
    );
    const hasNew = letterDetails.letterTemplate.includes(
      '[NewSalaryStructure]',
    );

    const increaseWidth = (hasOld && !hasNew) || (!hasOld && hasNew);
    if (oldSalaryStructure) {
      const DATA = await getSalaryStructureHTML(
        userMasterID,
        oldSalaryStructure,
        isWithHeading,
        increaseWidth,
      );

      OldNet = DATA.Net;
      OldMonthlyNet = DATA.MonthlyNet;

      // letterDetails.letterTemplate = letterDetails.letterTemplate
      //   .split('[OldCTC]')
      //   .join(DATA.CTC);
      // letterDetails.letterTemplate = letterDetails.letterTemplate
      //   .split('[OldNet]')
      //   .join(DATA.Net);
      // letterDetails.letterTemplate = letterDetails.letterTemplate
      //   .split('[OldGross]')
      //   .join(DATA.Gross);
      // letterDetails.letterTemplate = letterDetails.letterTemplate
      //   .split('[OldMonthlyCTC]')
      //   .join(DATA.MonthlyCTC);
      // letterDetails.letterTemplate = letterDetails.letterTemplate
      //   .split('[OldMonthlyNet]')
      //   .join(DATA.MonthlyNet);
      // letterDetails.letterTemplate = letterDetails.letterTemplate
      //   .split('[OldMonthlyGross]')
      //   .join(DATA.MonthlyGross);

      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[OldCTC]')
        .join(DATA.CTC ? `${DATA.CTC}/- (Rupees ${DATA.CTCInWords} Only)` : '');
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[OldNet]')
        .join(
          DATA.Net ? `${DATA.Net}/- (Rupees ${DATA.NetInWords} Only) ` : '',
        );
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[OldGross]')
        .join(
          DATA.Gross
            ? `${DATA.Gross}/- (Rupees ${DATA.GrossInWords} Only) `
            : '',
        );
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[OldMonthlyCTC]')
        .join(
          DATA.MonthlyCTC
            ? `${DATA.MonthlyCTC}/- (Rupees ${DATA.MonthlyCTCInWords} Only)`
            : '',
        );
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[OldMonthlyNet]')
        .join(
          DATA.MonthlyNet
            ? `${DATA.MonthlyNet}/- (Rupees ${DATA.MonthlyNetInWords} Only) `
            : '',
        );
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[OldMonthlyGross]')
        .join(
          DATA.MonthlyGross
            ? `${DATA.MonthlyGross}/- (Rupees ${DATA.MonthlyGrossInWords} Only) `
            : '',
        );
      oldSalaryStructureData = DATA.SalaryStructure;
      oldSalaryStructureData = sanitizeTable(oldSalaryStructureData, 'old');
    }

    if (newSalaryStructure) {
      const DATA = await getSalaryStructureHTML(
        userMasterID,
        newSalaryStructure,
        isWithHeading,
        increaseWidth,
      );

      NewNet = DATA.Net;
      NewNetMonethlyNet = DATA.MonthlyNet;

      const monthName = String(newSalaryStructure);
      // Extract the year and month
      const year = parseInt(monthName.substring(0, 4), 10); // Extract year
      const month = parseInt(monthName.substring(4, 6), 10) - 1; // Extract month (0-indexed)

      // Get the month's name
      const EffectiveMonth = new Date(year, month).toLocaleString('en-US', {
        month: 'long',
      });

      const monthNameFull = new Date(year, month).toLocaleString('en-US', {
        month: 'long',
      });

      // Construct EffectiveDate
      const EffectiveDate = `01 ${monthNameFull} ${year}`;

      // letterDetails.letterTemplate = letterDetails.letterTemplate
      //   .split('[NewCTC]')
      //   .join(DATA.CTC);
      // letterDetails.letterTemplate = letterDetails.letterTemplate
      //   .split('[NewNet]')
      //   .join(DATA.Net);
      // letterDetails.letterTemplate = letterDetails.letterTemplate
      //   .split('[NewGross]')
      //   .join(DATA.Gross);
      // letterDetails.letterTemplate = letterDetails.letterTemplate
      //   .split('[NewMonthlyCTC]')
      //   .join(DATA.MonthlyCTC);
      // letterDetails.letterTemplate = letterDetails.letterTemplate
      //   .split('[NewMonthlyNet]')
      //   .join(DATA.MonthlyNet);
      // letterDetails.letterTemplate = letterDetails.letterTemplate
      //   .split('[NewMonthlyGross]')
      //   .join(DATA.MonthlyGross);
      // if (!letterDetails.letterTemplate.includes('[OldSalaryStructure]') || !letterDetails.letterTemplate.includes('[NewSalaryStructure]')) {
      //   letterDetails.letterTemplate = letterDetails.letterTemplate
      //     .split('[NewSalaryStructure]')
      //     .join(DATA.SalaryStructure);
      // }
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[NewCTC]')
        .join(DATA.CTC ? `${DATA.CTC}/- (Rupees ${DATA.CTCInWords} Only)` : '');
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[NewNet]')
        .join(
          DATA.Net ? `${DATA.Net}/- (Rupees ${DATA.NetInWords} Only) ` : '',
        );
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[NewGross]')
        .join(
          DATA.Gross
            ? `${DATA.Gross}/- (Rupees ${DATA.GrossInWords} Only) `
            : '',
        );
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[NewMonthlyCTC]')
        .join(
          DATA.MonthlyCTC
            ? `${DATA.MonthlyCTC}/- (Rupees ${DATA.MonthlyCTCInWords} Only)`
            : '',
        );
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[NewMonthlyNet]')
        .join(
          DATA.MonthlyNet
            ? `${DATA.MonthlyNet}/- (Rupees ${DATA.MonthlyNetInWords} Only) `
            : '',
        );
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[NewMonthlyGross]')
        .join(
          DATA.MonthlyGross
            ? `${DATA.MonthlyGross}/- (Rupees ${DATA.MonthlyGrossInWords} Only) `
            : '',
        );

      const newTable = sanitizeTable(DATA.SalaryStructure, 'new');

      if (
        !letterDetails.letterTemplate.includes('[OldSalaryStructure]') ||
        !letterDetails.letterTemplate.includes('[NewSalaryStructure]')
      ) {
        letterDetails.letterTemplate = letterDetails.letterTemplate
          .split('[NewSalaryStructure]')
          .join(newTable);
      }
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[EffectiveMonth]')
        .join(EffectiveMonth);
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[EffectiveDate]')
        .join(EffectiveDate);

      if (
        letterDetails.letterTemplate.includes('[OldSalaryStructure]') &&
        letterDetails.letterTemplate.includes('[NewSalaryStructure]')
      ) {
        const pTags = getParagraphTags(letterDetails.letterTemplate);

        if (pTags.length > 0) {
          for (const p of pTags) {
            if (
              p.includes('[OldSalaryStructure]') &&
              !p.includes('[NewSalaryStructure]')
            ) {
              letterDetails.letterTemplate = letterDetails.letterTemplate
                .split('[OldSalaryStructure]')
                .join(oldSalaryStructureData);
            }

            if (
              !p.includes('[OldSalaryStructure]') &&
              p.includes('[NewSalaryStructure]')
            ) {
              letterDetails.letterTemplate = letterDetails.letterTemplate
                .split('[NewSalaryStructure]')
                .join(newTable);
            }

            if (
              p.includes('[OldSalaryStructure]') &&
              p.includes('[NewSalaryStructure]')
            ) {
              const oldPos = p.indexOf('[OldSalaryStructure]');
              const newPos = p.indexOf('[NewSalaryStructure]');

              const leftTable =
                oldPos < newPos ? oldSalaryStructureData : newTable;
              const rightTable =
                oldPos < newPos ? newTable : oldSalaryStructureData;

              // --------- MAIN FIX: TABLE FOR 2 COLUMNS ----------
              const salaryStructuresDiv = `
        <table style="width:100%; border-collapse: collapse; border: none !important; border-color:white !important">
          <tr>
            <td style="vertical-align: top; border-color: white !important; border: none !important">
              ${leftTable}
            </td>
            <td style="vertical-align: top; border-color: white !important; border: none !important">
              ${rightTable}
            </td>
          </tr>
        </table>
      `;

              letterDetails.letterTemplate =
                letterDetails.letterTemplate.replace(p, salaryStructuresDiv);
              break;
            }
          }
        }
      }
    }
    const NetDifferenceYearly = NewNet - OldNet;
    const NetDifferenceMonthly = NewNetMonethlyNet - OldMonthlyNet;

    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('[Address]')
      .join(await getAddress(userMasterID));
    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('[CompanyName]')
      .join(CompanyName);
    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('[UserName]')
      .join(UserName);
    if (UserNumber) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[UserNumber]')
        .join(UserNumber);
    }
    if (DateOfBirth) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[DateOfBirth]')
        .join(DateOfBirth);
    }
    if (employeement) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[EmployeementType]')
        .join(employeement);
    }
    if (Email) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[Email]')
        .join(Email);
    }
    if (shiftName) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[ShiftName]')
        .join(shiftName);
    }
    if (Branch) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[Branch]')
        .join(Branch);
    }
    if (Designation) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[Designation]')
        .join(Designation);
    }
    if (Department) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[Department]')
        .join(Department);
    }
    if (JoiningDate) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[JoiningDate]')
        .join(JoiningDate);
    }
    if (BranchAddress) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[BranchAddress]')
        .join(BranchAddress);
    }
    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('[SystemDate]')
      .join(systemDate);
    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('[CurrentDate]')
      .join(systemDate);
    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('[CurrentDateTime]')
      .join(currentDateTime);
    if (UserName) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[EmployeeName]')
        .join(UserName);
    }
    if (UserNumber) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[EmployeeNumber]')
        .join(UserNumber);
    }
    if (employeecode) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[EmployeeCode]')
        .join(employeecode);
    }
    if (Email) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[EmployeeEmailid]')
        .join(Email);
    }
    if (NetDifferenceMonthly) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[NetDifferenceMonthly]')
        .join(NetDifferenceMonthly);
    }
    if (NetDifferenceYearly) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[NetDifferenceYearly]')
        .join(NetDifferenceYearly);
    }

    let letterName;

    if (lettertype == 'incrementletter') {
      letterName = 'Increment Letter';
    }

    if (letterDetails.letterHead == 'yes') {
      const companyDetails = await companyMaster.findOne({
        raw: true,
        where: { companyMasterID: user.companyMasterId },
      });
      let base64 = '';

      if (companyDetails.companyLogo) {
        const imagePath = path.join(
          __dirname,
          `../uploads/company/logo/${companyDetails.companyLogo}`,
        );

        // ✅ Check if logo exists
        if (!fs.existsSync(imagePath)) {
          throw new Error(
            'Company logo not found. Please upload company logo.',
          );
        }

        base64 = await new Promise((resolve, reject) => {
          base64Img.base64(imagePath, (err, data) => {
            if (err) {
              return reject(
                new Error(
                  'Unable to read company logo. Please upload company logo again.',
                ),
              );
            }
            resolve(data);
          });
        });
      }

      const getTemplate = (type) =>
        path.join(__dirname, `../html/${type}.html`);
      const readFile = (name) => fs.promises.readFile(name, 'utf-8');

      const filePath = await getTemplate('preboardingLetterHead');
      companyDetails.base64 = base64;
      const file = await readFile(filePath);
      const template = Handlebars.compile(file);
      const headerTemplate = template(companyDetails);

      cont = `<div class="main1" style="font-size: 12px !important">${letterDetails.letterTemplate}</div>`;
      const data1 = { content: cont, letterName: letterName };
      const pdfBuffer = await generatePDF(
        'preboardingOfferLetter',
        data1,
        headerTemplate,
      );

      // const pdfFilePath = `./uploads/letter/${lettertype}_${userMasterID}.pdf`;

      const pdfFilePath = path.join(
        __dirname,
        `../uploads/letter/${lettertype}_${userMasterID}_${timestamp}.pdf`,
      ); // Append timestamp to filename
      fs.writeFileSync(pdfFilePath, pdfBuffer);
    } else if (letterDetails.letterHead == 'no') {
      cont = `<div class="main1" style="font-size: 12px !important">${letterDetails.letterTemplate}</div>`;
      const data1 = { content: cont, letterName: letterName };
      const pdfBuffer = await generatePDF(
        'preboardingOfferLetter',
        data1,
        null,
      );

      const pdfFilePath = path.join(
        __dirname,
        `../uploads/letter/${lettertype}_${userMasterID}_${timestamp}.pdf`,
      ); // Append timestamp to filename
      fs.writeFileSync(pdfFilePath, pdfBuffer);
    } else {
      if (letterHead) {
        imagePath =
          process.env.APIURL + `uploads/company/letterHead/${letterHead}`;
      }

      cont = `<div class="main1">
        ${letterDetails.letterTemplate}
      </div>`;

      const data1 = {
        content: cont,
        letterName: letterName,
        letterHead: letterHead,
      };
      const pdfBuffer = await generateOfferLetterPdf(
        'preboardingOfferLetter',
        data1,
      );
      const pdfFilePath = path.join(
        __dirname,
        `../uploads/letter/${lettertype}_${userMasterID}_${timestamp}.pdf`,
      );
      fs.writeFileSync(pdfFilePath, pdfBuffer);
    }
    t = await sequelize.transaction();
    await UserIncrementLetter.create(
      {
        userMasterID,
        incrementLetter: `${lettertype}_${userMasterID}_${timestamp}.pdf`,
        incrementletterHTML: cont,
        incrementLetterID: letterDetails.incrementLetterID,
        oldSalaryStructure,
        newSalaryStructure,
        referenceNumber: referenceNumber,
        isVisibleToEmp: isVisibleToEmp,
      },
      {
        user: req.userDetails,
        transaction: t,
      },
    );

    if (letterDetails.setReferenceNumber) {
      await IncrementLetter.update(
        {
          currentSequence: parseInt(letterDetails.currentSequence) + 1,
        },
        {
          where: { incrementLetterID: letterDetails.incrementLetterID },
          transaction: t,
        },
      );
    }
    await t.commit();
  } catch (err) {
    if (t && !t.finished) await t.rollback();
    throw err;
  }
}

exports.postAddIncrementLetters = async (req, res, next) => {
  try {
    const {
      userMasterID,
      lettertype,
      incrementLetterID,
      oldSalaryStructure,
      newSalaryStructure,
    } = req.body;

    if (oldSalaryStructure > newSalaryStructure) {
      return res.status(200).json({
        status: 401,
        message:
          'New  salary structure cannot be less than Old salary structure',
      });
    }

    let letterDetails;
    if (lettertype === 'incrementletter') {
      letterDetails = await IncrementLetter.findOne({
        raw: true,
        where: { incrementLetterID },
        include: [{ model: companyMaster, attributes: ['letterHead'] }],
      });
    }

    const user = await UserMaster.findOne({
      where: { userMasterID: userMasterID },
      include: [{ model: companyMaster, attributes: ['companyName'] }],
    });

    if (!letterDetails || !user) {
      return res
        .status(200)
        .json({ status: 401, message: 'User or letter not found' });
    }

    const letterHead = letterDetails['companyMaster.letterHead'];
    if (letterDetails.letterHead == 'uploaded') {
      if (!letterHead || letterHead == '') {
        return res.status(200).json({
          message:
            'Company letter head not found! Please upload company letter head.',
          status: 401,
        });
      }
    }

    await generateLetter(
      userMasterID,
      letterDetails,
      user,
      lettertype,
      oldSalaryStructure,
      newSalaryStructure,
      req,
      letterHead,
    );

    return res
      .status(200)
      .json({ status: 200, message: 'Letter generated successfully' });
  } catch (err) {
    next(err);
  }
};

exports.postUpdateUserIncrementLetters = async (req, res, next) => {
  try {
    let {
      userMasterID,
      lettertype,
      incrementLetterID,
      incrementletterHTML,
      userincrementLetterID,
      oldSalaryStructure,
      newSalaryStructure,
    } = await req.body;
    let filePathToUpdate;
    if (lettertype === 'incrementletter') {
      const incrementLetter = await IncrementLetter.findOne({
        raw: true,
        where: { incrementLetterID: incrementLetterID },
        include: [{ model: companyMaster, attributes: ['letterHead'] }],
      });
      const isWithHeading = incrementLetter.letterWithoutHeading;
      const user = await UserMaster.findOne({
        raw: true,
        where: { userMasterID: userMasterID },
        include: [{ model: companyMaster, attributes: ['companyName'] }],
      });
      if (!incrementLetter || !user)
        return res
          .status(200)
          .json({ status: 401, message: 'User or Offer Letter not found' });

      const date = new Date().toISOString().slice(0, 10);
      const PageBreak = `<div class="pageBreak"> </div>`;
      incrementletterHTML = incrementletterHTML
        .split('[PageBreak]')
        .join(PageBreak);

      incrementletterHTML = incrementletterHTML
        .split('class="ql-align-right"')
        .join('style="text-align:right"');
      incrementletterHTML = incrementletterHTML
        .split('class="ql-align-center"')
        .join('style="text-align:center"');
      incrementletterHTML = incrementletterHTML
        .split('class="ql-align-justify"')
        .join('style="text-align:justify;text-justify: inter-word;"');

      // const DATA = await getSalaryStructureHTML(userMasterID);

      // incrementletterHTML = incrementletterHTML
      //   .split('[SalaryStructure]')
      //   .join(DATA.SalaryStructure);

      const sanitizeTable = (tableHtml, type) => {
        return tableHtml.replace(
          /id=['"]SalaryStructureOfUser['"]/gi,
          `id="SalaryStructureOfUser_${type}"`,
        );
      };
      const hasOld = incrementletterHTML.includes('[OldSalaryStructure]');
      const hasNew = incrementletterHTML.includes('[NewSalaryStructure]');

      const increaseWidth = (hasOld && !hasNew) || (!hasOld && hasNew);
      if (oldSalaryStructure) {
        const DATA = await getSalaryStructureHTML(
          userMasterID,
          oldSalaryStructure,
          isWithHeading,
          increaseWidth,
        );

        incrementletterHTML = incrementletterHTML
          .split('[OldCTC]')
          .join(DATA.CTC);
        incrementletterHTML = incrementletterHTML
          .split('[OldNet]')
          .join(DATA.Net);
        incrementletterHTML = incrementletterHTML
          .split('[OldGross]')
          .join(DATA.Gross);
        incrementletterHTML = incrementletterHTML
          .split('[OldMonthlyCTC]')
          .join(DATA.MonthlyCTC);
        incrementletterHTML = incrementletterHTML
          .split('[OldMonthlyNet]')
          .join(DATA.MonthlyNet);
        incrementletterHTML = incrementletterHTML
          .split('[OldMonthlyGross]')
          .join(DATA.MonthlyGross);

        const oldTable = sanitizeTable(DATA.SalaryStructure, 'old');

        incrementletterHTML = incrementletterHTML
          .split('[OldSalaryStructure]')
          .join(oldTable);
      }

      if (newSalaryStructure) {
        const DATA = await getSalaryStructureHTML(
          userMasterID,
          newSalaryStructure,
          isWithHeading,
          increaseWidth,
        );

        incrementletterHTML = incrementletterHTML
          .split('[NewCTC]')
          .join(DATA.CTC);
        incrementletterHTML = incrementletterHTML
          .split('[NewNet]')
          .join(DATA.Net);
        incrementletterHTML = incrementletterHTML
          .split('[NewGross]')
          .join(DATA.Gross);
        incrementletterHTML = incrementletterHTML
          .split('[NewMonthlyCTC]')
          .join(DATA.MonthlyCTC);
        incrementletterHTML = incrementletterHTML
          .split('[NewMonthlyNet]')
          .join(DATA.MonthlyNet);
        incrementletterHTML = incrementletterHTML
          .split('[NewMonthlyGross]')
          .join(DATA.MonthlyGross);

        const newTable = sanitizeTable(DATA.SalaryStructure, 'new');

        incrementletterHTML = incrementletterHTML
          .split('[NewSalaryStructure]')
          .join(newTable);
      }

      const pdfRecord = await UserIncrementLetter.findOne({
        where: { userincrementLetterID },
      });

      let letterName;

      if (lettertype == 'incrementletter') {
        letterName = 'Increment Letter';
      }

      if (incrementLetter.letterHead == 'yes') {
        const companyDetails = await companyMaster.findOne({
          raw: true,
          where: { companyMasterID: user.companyMasterId },
        });

        companyDetails.companyName = companyDetails.companyName
          ? companyDetails.companyName
          : '';
        companyDetails.companyAddress = companyDetails.companyAddress
          ? companyDetails.companyAddress
          : '';
        companyDetails.companyEmail = companyDetails.companyEmail
          ? companyDetails.companyEmail
          : '';
        companyDetails.companyLogo = companyDetails.companyLogo
          ? companyDetails.companyLogo
          : '';
        companyDetails.cpMobileNo = companyDetails.cpMobileNo
          ? companyDetails.cpMobileNo
          : '';
        companyDetails.companyWebsite = companyDetails.companyWebsite
          ? companyDetails.companyWebsite
          : '';

        const imagePath = path.join(
          __dirname,
          `../uploads/company/logo/${companyDetails.companyLogo}`,
        );
        let base64 = '';
        try {
          const imagePath = path.join(
            __dirname,
            `../uploads/company/logo/${companyDetails.companyLogo}`,
          );

          // ✅ Validate logo existence
          if (!fs.existsSync(imagePath)) {
            throw new Error(
              'Company logo not found. Please upload company logo.',
            );
          }

          // ✅ Convert base64 safely
          base64 = await new Promise((resolve, reject) => {
            base64Img.base64(imagePath, (err, data) => {
              if (err) {
                return reject(
                  new Error(
                    'Unable to read company logo. Please upload company logo again.',
                  ),
                );
              }
              resolve(data);
            });
          });

          // ✅ Template helpers
          const getTemplate = (type) =>
            path.join(__dirname, `../html/${type}.html`);

          const readFile = (name) => fs.promises.readFile(name, 'utf-8');

          // ✅ Prepare template
          const filePath = getTemplate('preboardingLetterHead');
          companyDetails.base64 = base64;

          const file = await readFile(filePath);
          const template = Handlebars.compile(file);
          const headerTemplate = template(companyDetails);

          const cont =
            `<div class="main1" style="font-size: 12px !important">` +
            incrementletterHTML +
            `</div>`;

          const data1 = { content: cont, letterName };

          const pdfBuffer = await generatePDF(
            'preboardingOfferLetter',
            data1,
            headerTemplate,
          );

          // ✅ Save PDF
          const pdfFilePath = path.join(
            __dirname,
            `../uploads/letter/${pdfRecord.incrementLetter}`,
          );

          await fs.promises.writeFile(pdfFilePath, pdfBuffer);
        } catch (err) {
          // ✅ Controlled failure – server WILL NOT crash
          console.error('PDF generation failed:', err.message);
          throw err; // let controller / middleware handle response
        }
      } else if (incrementLetter.letterHead == 'no') {
        const pdfRecord = await UserIncrementLetter.findOne({
          where: { userincrementLetterID },
          attributes: ['incrementLetter'],
        });

        let cont =
          `<div class="main1" style="font-size: 12px !important">` +
          incrementletterHTML +
          `</div>`;
        const data1 = { content: cont, letterName };
        const pdfBuffer = await generatePDF(
          'preboardingOfferLetter',
          data1,
          null,
        );

        // Saving the PDF buffer to the uploaded file path

        const pdfFilePath = path.join(
          __dirname,
          `../uploads/letter/${pdfRecord.incrementLetter}`,
        );
        fs.writeFileSync(pdfFilePath, pdfBuffer);
      } else {
        const timestamp = Date.now();
        const letterHead = incrementLetter['companyMaster.letterHead'];
        if (!letterHead || letterHead == '') {
          return res.status(200).json({
            message:
              'Company letter head not found! Please upload company letter head.',
            status: 401,
          });
        }
        if (letterHead) {
          imagePath =
            process.env.APIURL + `uploads/company/letterHead/${letterHead}`;
        }

        let cont =
          `<div class="main1" style="font-size: 12px !important">` +
          incrementletterHTML +
          `</div>`;
        const data1 = {
          content: cont,
          letterName: letterName,
          letterHead: letterHead,
        };
        const pdfBuffer = await generateOfferLetterPdf(
          'preboardingOfferLetter',
          data1,
        );
        const pdfFilePath = path.join(
          __dirname,
          `../uploads/letter/${lettertype}_${userMasterID}_${timestamp}.pdf`,
        );
        filePathToUpdate = `${lettertype}_${userMasterID}_${timestamp}.pdf`;
        fs.writeFileSync(pdfFilePath, pdfBuffer);
      }

      const userOfferLetter = await UserIncrementLetter.findOne({
        where: {
          userincrementLetterID,
        },
      });

      if (userOfferLetter) {
        await UserIncrementLetter.update(
          {
            incrementLetter: filePathToUpdate,
            incrementletterHTML: incrementletterHTML,
            incrementLetterID: incrementLetterID,
            updateBy: req.userDetails.userMasterId,
            updateByIp: req.userDetails.userIpAddress,
          },
          {
            where: {
              userincrementLetterID: userOfferLetter.userincrementLetterID,
            },
          },
        );
      } else {
        let filename = path.join(
          __dirname,
          `../uploads/letter/${pdfRecord.incrementLetter}`,
        );

        await UserIncrementLetter.create(
          {
            userMasterID,
            UserIncrementLetter: filename,
            incrementletterHTML: incrementletterHTML,
            incrementLetterID,
          },
          {
            user: req.userDetails,
          },
        );
      }
      return res.status(200).json({
        status: 200,
        message: 'Increment Letter Updated Successfully',
      });
    } else {
      return res
        .status(200)
        .json({ status: 401, message: 'letter type not found' });
    }
  } catch (err) {
    next(err);
  }
};

exports.postDeleteIncrementLetters = async (req, res, next) => {
  try {
    const { userMasterID, userincrementLetterID } = req.body;

    const userLetter = await UserIncrementLetter.findOne({
      where: { userMasterID, userincrementLetterID },
    });

    if (!userLetter) {
      return res.status(200).json({ status: 401, message: 'Data not found' });
    }

    await userLetter.destroy({
      user: req.userDetails, // Assuming you have proper handling for this
    });

    return res
      .status(200)
      .json({ status: 200, message: 'Letter Deleted Successfully' });
  } catch (err) {
    next(err);
  }
};

async function getUserLetter(userMasterID, latterType, userincrementLetterID) {
  const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

  const data = await UserIncrementLetter.findOne({
    where: {
      userMasterID,
      userincrementLetterID,
    },
    include: [
      {
        required: true,
        model: UserMaster,
        attributes: ['email', 'displayName'],
        include: [
          {
            model: EmployeeJoiningDetails,
            attributes: ['employeeCode'],
          },
          {
            model: EmployeeBranch,
            where: {
              status: 1,
              applicableDate: {
                [Sequelize.Op.lte]: new Date(currentDate),
              },
              [Sequelize.Op.or]: [
                {
                  endDate: { [Sequelize.Op.gte]: new Date(currentDate) },
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
            model: EmployeeDepartment,
            attributes: ['departmentID'],
            where: {
              status: 1,
              applicableDate: {
                [Sequelize.Op.lte]: new Date(currentDate),
              },
              [Sequelize.Op.or]: [
                {
                  endDate: { [Sequelize.Op.gte]: new Date(currentDate) },
                },
                {
                  endDate: { [Sequelize.Op.eq]: null },
                },
              ],
            },
            include: [
              {
                model: Department,
                as: 'department',
                attributes: ['departmentName'],
              },
            ],
          },
          {
            model: EmployeeDesignation,
            attributes: ['designationID'],
            where: {
              status: 1,
              applicableDate: {
                [Sequelize.Op.lte]: new Date(currentDate),
              },
              [Sequelize.Op.or]: [
                {
                  endDate: { [Sequelize.Op.gte]: new Date(currentDate) },
                },
                {
                  endDate: { [Sequelize.Op.eq]: null },
                },
              ],
            },
            include: [
              {
                model: Designation,
                as: 'designation',
                attributes: ['designationName'],
              },
            ],
          },
        ],
      },
    ],
    attributes: [latterType],
  });

  return data;
}

function getParagraphTags(html) {
  if (!html) return [];

  const tags = [];
  const lowerHtml = String(html).toLowerCase();
  let searchFrom = 0;

  while (searchFrom < lowerHtml.length) {
    const start = lowerHtml.indexOf('<p', searchFrom);
    if (start === -1) break;

    const openEnd = lowerHtml.indexOf('>', start + 2);
    if (openEnd === -1) break;

    const end = lowerHtml.indexOf('</p>', openEnd + 1);
    if (end === -1) break;

    tags.push(String(html).slice(start, end + 4));
    searchFrom = end + 4;
  }

  return tags;
}

exports.sendEmailIncrementLetter = async (req, res, next) => {
  try {
    const { userMasterID, companyMasterID, userincrementLetterID } = req.body;

    const fromtomail = await findCompanyNotificationPolicy(+companyMasterID);

    if (!fromtomail) {
      return res.status(200).json({
        status: 401,
        message: 'Mail Template Not Found.',
      });
    }

    const get_MailTemplate = await mailTemplateEditor.findOne({
      raw: true,
      where: {
        companyMasterID: companyMasterID,
        status: 1,
        mailTypeID: 14,
      },
    });

    if (!get_MailTemplate) {
      return res.status(200).json({
        status: 401,
        message: 'Email template not found.',
      });
    }

    const data1 = await getUserLetter(
      userMasterID,
      'incrementLetter',
      userincrementLetterID,
    );

    const userData = data1 ? data1.userMaster : null;
    const empJoining =
      data1 &&
      data1.userMaster.employeeJoiningDetails &&
      data1.userMaster.employeeJoiningDetails.length > 0
        ? data1.userMaster.employeeJoiningDetails[0]
        : '';
    const empBranch =
      data1 &&
      data1.userMaster.employeeBranchs &&
      data1.userMaster.employeeBranchs.length > 0
        ? data1.userMaster.employeeBranchs[0]
        : '';
    const empDepart =
      data1 &&
      data1.userMaster.employeeDepartments &&
      data1.userMaster.employeeDepartments.length > 0
        ? data1.userMaster.employeeDepartments[0]
        : '';
    const empDesig =
      data1 &&
      data1.userMaster.employeeDesignations &&
      data1.userMaster.employeeDesignations.length > 0
        ? data1.userMaster.employeeDesignations[0]
        : '';

    const recipientEmail = userData && userData.email ? userData.email : null;

    if (!recipientEmail) {
      return res.status(200).json({
        status: 401,
        message: 'User Email Not found.',
      });
    }
    get_MailTemplate.subject = get_MailTemplate.subject
      .replace('[EmployeeCode]', empJoining ? empJoining.employeeCode : '')
      .replace('[EmployeeName]', userData ? userData.displayName : '')
      .replace('[EmployeeNumber]', userData ? userData.userNumber : '')
      .replace(
        '[Branch]',
        empBranch && empBranch.branchMaster
          ? empBranch.branchMaster.branchName
          : '',
      )
      .replace(
        '[Department]',
        empDepart && empDepart.department
          ? empDepart.department.departmentName
          : '',
      )
      .replace(
        '[Designation]',
        empDesig && empDesig.designation
          ? empDesig.designation.designationName
          : '',
      );

    get_MailTemplate.body = get_MailTemplate.body
      .replace('[EmployeeCode]', empJoining ? empJoining.employeeCode : '')
      .replace('[EmployeeName]', userData ? userData.displayName : '')
      .replace(
        '[Branch]',
        empBranch && empBranch.branchMaster
          ? empBranch.branchMaster.branchName
          : '',
      )
      .replace(
        '[Department]',
        empDepart && empDepart.department
          ? empDepart.department.departmentName
          : '',
      )
      .replace(
        '[Designation]',
        empDesig && empDesig.designation
          ? empDesig.designation.designationName
          : '',
      );

    const incrementLetterData = {
      host: fromtomail.hostmail,
      port: fromtomail.port,
      email: fromtomail.email,
      password: fromtomail.password,
      email_id: recipientEmail,
      filePath: path.join(
        __dirname,
        '..',
        'uploads',
        'letter',
        data1.incrementLetter,
      ),
      secure: fromtomail.secure,
    };

    await sendOfferLetter(incrementLetterData, get_MailTemplate);

    return res.status(200).json({
      status: 200,
      message: 'Increment Letter Email sent successfully',
    });
  } catch (err) {
    next(err);
  }
};

exports.bulkIncrementLetter = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      userMasterIDs,
      incrementLetterID,
      isVisibleToEmp,
    } = req.body;

    // ── 1. Resolve user IDs ───────────────────────────────────
    let resolvedUserIds;

    if (userMasterIDs?.length) {
      resolvedUserIds = userMasterIDs;
    } else if (companyMasterID) {
      const companyUsers = await UserMaster.findAll({
        where: { companyMasterId: companyMasterID },
        attributes: ['userMasterID'],
        raw: true,
      });
      resolvedUserIds = companyUsers.map((u) => u.userMasterID);
    }

    if (!resolvedUserIds?.length) {
      return res.status(200).json({ status: 400, message: 'User not found' });
    }

    // ── 2. Fetch letter details ───────────────────────────────
    const letterDetails = await IncrementLetter.findOne({
      raw: true,
      where: { incrementLetterID },
      include: [{ model: companyMaster, attributes: ['letterHead'] }],
    });

    if (!letterDetails) {
      return res.status(200).json({ status: 400, message: 'Letter not found' });
    }

    // ── 3. Letterhead guard ───────────────────────────────────
    const letterHead = letterDetails['companyMaster.letterHead'];
    if (letterDetails.letterHead === 'uploaded' && !letterHead) {
      return res.status(200).json({
        status: 400,
        message:
          'Company letter head not found! Please upload company letter head.',
      });
    }

    // ── 4. Date (computed once) ───────────────────────────────
    const now = new Date();
    const currentYYYYMM = now.getFullYear() * 100 + (now.getMonth() + 1);

    // ── 5. Fetch ALL users in one query ───────────────────────
    const users = await UserMaster.findAll({
      where: { userMasterID: { [Sequelize.Op.in]: resolvedUserIds } },
      include: [{ model: companyMaster, attributes: ['companyName'] }],
    });

    const userMap = new Map(users.map((u) => [u.userMasterID, u]));

    // ── 6. Fetch salary history for ALL users ─────────────────
    // ✅ bind instead of replacements — handles arrays natively
    const salaryHistory = await sequelize.query(
      `
      SELECT *
      FROM (
        SELECT
          "userMasterID",
          "salaryFromYYYYMM",
          ROW_NUMBER() OVER (
            PARTITION BY "userMasterID"
            ORDER BY "salaryFromYYYYMM" DESC
          ) AS rn
        FROM "hrSalaryMasters"
        WHERE "salaryFromYYYYMM" <= $1
          AND "userMasterID" = ANY($2)
        GROUP BY "userMasterID", "salaryFromYYYYMM"
      ) x
      WHERE rn <= 2
      ORDER BY "userMasterID", "salaryFromYYYYMM" DESC
      `,
      {
        bind: [currentYYYYMM, resolvedUserIds],
        type: Sequelize.QueryTypes.SELECT,
      },
    );

    // ── 7. Build salary map ───────────────────────────────────
    const salaryMap = salaryHistory.reduce((acc, item) => {
      const uid = item.userMasterID;
      if (!acc[uid]) acc[uid] = {};
      if (Number(item.rn) === 1) acc[uid].newSalary = item.salaryFromYYYYMM;
      if (Number(item.rn) === 2) acc[uid].oldSalary = item.salaryFromYYYYMM;
      return acc;
    }, {});

    // ── 8. Filter users who have at least new salary ──────────
    // ✅ oldSalary is optional (single structure employees)
    const eligibleUsers = resolvedUserIds.filter(
      (uid) => salaryMap[uid]?.newSalary && salaryMap[uid]?.oldSalary,
    );

    if (!eligibleUsers.length) {
      return res.status(200).json({
        status: 200,
        message: 'No eligible users found for letter generation',
      });
    }

    // ── 9. Fetch already-generated letters in one query ───────
    const alreadyGenerated = await UserIncrementLetter.findAll({
      where: {
        userMasterID: { [Sequelize.Op.in]: eligibleUsers },
        newSalaryStructure: {
          [Sequelize.Op.in]: eligibleUsers.map((uid) =>
            salaryMap[uid].newSalary.toString(),
          ),
        },
      },
      attributes: ['userMasterID', 'newSalaryStructure'],
      raw: true,
    });

    // ── 10. Build skip set ────────────────────────────────────
    const skipSet = new Set(
      alreadyGenerated.map((l) => `${l.userMasterID}_${l.newSalaryStructure}`),
    );

    // ── 11. Filter out already-generated ─────────────────────
    const usersToProcess = eligibleUsers.filter((uid) => {
      const key = `${uid}_${salaryMap[uid].newSalary}`;
      return !skipSet.has(key);
    });

    if (!usersToProcess.length) {
      return res.status(200).json({
        status: 200,
        message: 'Letters already generated for all users',
      });
    }

    // ── 12. Generate PDFs in chunks of ─────────────────────

    for (const uid of usersToProcess) {
      const s = salaryMap[uid];
      const user = userMap.get(uid);

      // ✅ deep clone user to prevent any shared reference mutation
      const isolatedUser = JSON.parse(JSON.stringify(user));
      const isolatedLetterDetails = JSON.parse(JSON.stringify(letterDetails));

      await generateLetter(
        uid,
        isolatedLetterDetails,
        isolatedUser,
        'incrementletter',
        s.oldSalary ?? null,
        s.newSalary,
        req,
        letterHead,
        isVisibleToEmp,
      );
    }

    return res.status(200).json({
      status: 200,
      message: 'Letter generated successfully',
    });
  } catch (error) {
    next(error);
  }
};

exports.getDataForBulkIncrement = async (req, res, next) => {
  try {
    const { companyMasterID, userMasterID, limit, page } = req.body;

    // ── Date helpers ──────────────────────────────────────────
    const now = new Date();
    const currentdate = new Date(asiaKolkataDateTime(now).slice(0, 10));
    const currentYYYYMM = now.getFullYear() * 100 + (now.getMonth() + 1);

    // ── Shared "active record" where clause ───────────────────
    const activeRecordWhere = {
      status: 1,
      applicableDate: { [Sequelize.Op.lte]: currentdate },
      [Sequelize.Op.or]: [
        { endDate: { [Sequelize.Op.gte]: currentdate } },
        { endDate: null },
      ],
    };

    // ── 1. Resolve user IDs ───────────────────────────────────
    let resolvedUserIds;

    if (userMasterID?.length) {
      resolvedUserIds = userMasterID;
    } else if (companyMasterID) {
      const companyUsers = await UserMaster.findAll({
        where: { companyMasterId: companyMasterID },
        attributes: ['userMasterID'],
        order: [['userMasterID', 'ASC']],
        raw: true,
      });
      resolvedUserIds = companyUsers.map((u) => u.userMasterID);
    }

    if (!resolvedUserIds?.length) {
      return res.status(200).json({ status: 200, data: [], totalcount: 0 });
    }

    // ── Pagination ────────────────────────────────────────────
    const paginationQuery =
      page && limit
        ? { offset: (page - 1) * Number(limit), limit: Number(limit) }
        : {};

    // ── Subquery: users with AT LEAST 2 salary structures ─────
    const eligibleUsersSubquery = `
      SELECT "userMasterID"
      FROM (
        SELECT
          "userMasterID",
          COUNT(DISTINCT "salaryFromYYYYMM") AS "structureCount"
        FROM "hrSalaryMasters"
        WHERE "salaryFromYYYYMM" <= $1
          AND "userMasterID" = ANY($2::int[])
        GROUP BY "userMasterID"
      ) x
      WHERE x."structureCount" >= 2
    `;

    // ── 2. Get accurate total count ───────────────────────────
    const countResult = await sequelize.query(
      `
      SELECT COUNT(DISTINCT "userMasterID") AS count
      FROM "userMasters"
      WHERE "userMasterID" IN (${eligibleUsersSubquery}) and status = 1
      `,
      {
        bind: [currentYYYYMM, resolvedUserIds],
      },
      { type: Sequelize.QueryTypes.SELECT },
    );

    const totalcount = Number(countResult[0].count);

    if (!totalcount) {
      return res.status(200).json({ status: 200, data: [], totalcount: 0 });
    }

    // ── 3. Fetch paginated employee rows ──────────────────────
    const getAllEmployees = await UserMaster.findAll({
      subQuery: false,
      ...paginationQuery,
      order: [['displayName', 'ASC']],
      where: {
        userMasterID: {
          [Sequelize.Op.in]: Sequelize.literal(`(${eligibleUsersSubquery})`),
        },
        status: 1,
      },
      attributes: [
        'userMasterID',
        'displayName',
        'companyMasterId',
        'userNumber',
      ],
      include: [
        {
          required: false,
          model: EmployeeBranch,
          where: activeRecordWhere,
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
          where: activeRecordWhere,
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
          where: activeRecordWhere,
          attributes: ['departmentID'],
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['departmentName'],
            },
          ],
        },
        { model: EmployeeJoiningDetails, attributes: ['employeeCode'] },
        {
          model: companyMaster,
          attributes: ['companyMasterID', 'companyName'],
        },
      ],
    });

    if (!getAllEmployees.length) {
      return res.status(200).json({ status: 200, data: [], totalcount: 0 });
    }

    // ── 4. Fetch salary for paginated rows only ───────────────
    const userIds = getAllEmployees.map((emp) => emp.userMasterID);

    const [salaryHistory, alreadyGenerated] = await Promise.all([
      sequelize.query(
        `
    SELECT *
    FROM (
      SELECT
        sm."userMasterID",
        sm."salaryFromYYYYMM",

        SUM(CASE WHEN ph."payheadMasterId" = 50 THEN sm."EmployeeSalaryAmount" ELSE 0 END) AS "grossSalary",
        SUM(CASE WHEN ph."payheadMasterId" = 1  THEN sm."EmployeeSalaryAmount" ELSE 0 END) AS "ctcSalary",
        SUM(CASE WHEN ph."payheadMasterId" = 92 THEN sm."EmployeeSalaryAmount" ELSE 0 END) AS "netSalary",

        ROW_NUMBER() OVER (
          PARTITION BY sm."userMasterID"
          ORDER BY sm."salaryFromYYYYMM" DESC
        ) AS rn

      FROM "hrSalaryMasters" sm
      INNER JOIN "gradeSalaryStructures" gss
        ON gss."gradeSalaryStructureID" = sm."gradeSalaryStructureID"
      INNER JOIN "hrSalaryFields" hsf
        ON hsf."salaryFieldID" = gss."salaryFieldID"
      INNER JOIN "Payheadmasters" ph
        ON ph."payheadMasterId" = hsf."payheadMasterId"

      WHERE sm."salaryFromYYYYMM" <= $1
        AND sm."userMasterID" = ANY($2)
        AND ph."payheadMasterId" IN (1, 50, 92)

      GROUP BY sm."userMasterID", sm."salaryFromYYYYMM"
    ) x
    WHERE rn <= 2
    ORDER BY "userMasterID", "salaryFromYYYYMM" DESC
    `,
        {
          bind: [currentYYYYMM, userIds],
          type: Sequelize.QueryTypes.SELECT,
        },
      ),

      // ✅ fetch already generated letters for all paginated users at once
      UserIncrementLetter.findAll({
        where: {
          userMasterID: { [Sequelize.Op.in]: userIds },
        },
        attributes: ['userMasterID', 'newSalaryStructure'],
        raw: true,
      }),
    ]);

    // ── 5. Build salary map ───────────────────────────────────
    const salaryMap = salaryHistory.reduce((acc, item) => {
      const uid = item.userMasterID;
      if (!acc[uid]) acc[uid] = {};

      if (Number(item.rn) === 1) {
        acc[uid].currentGross = Number(item.grossSalary);
        acc[uid].currentCtc = Number(item.ctcSalary);
        acc[uid].currentNet = Number(item.netSalary);
        acc[uid].currentMonth = item.salaryFromYYYYMM;
      } else {
        acc[uid].previousGross = Number(item.grossSalary);
        acc[uid].previousCtc = Number(item.ctcSalary);
        acc[uid].previousNet = Number(item.netSalary);
        acc[uid].previousMonth = item.salaryFromYYYYMM;
      }

      return acc;
    }, {});

    // ── 6. Build generated letter set ────────────────────────
    // ✅ key = "userMasterID_newSalaryStructure" for exact paired match
    const generatedSet = new Set(
      alreadyGenerated.map((l) => `${l.userMasterID}_${l.newSalaryStructure}`),
    );

    // ── 7. Merge & respond ────────────────────────────────────
    const finalRows = getAllEmployees.map((employee) => {
      const s = salaryMap[employee.userMasterID];
      const currentMonth = s.currentMonth ?? null;

      // ✅ check if letter already generated for this user's current salary month
      const isLetterGenerated = generatedSet.has(
        `${employee.userMasterID}_${currentMonth}`,
      );

      return {
        ...employee.toJSON(),
        currentMonth,
        currentGross: s.currentGross ?? 0,
        currentCtc: s.currentCtc ?? 0,
        currentNet: s.currentNet ?? 0,
        previousMonth: s.previousMonth ?? null,
        previousGross: s.previousGross ?? 0,
        previousCtc: s.previousCtc ?? 0,
        previousNet: s.previousNet ?? 0,
        isLetterGenerated, // ✅ true = letter already exists for current salary month
      };
    });

    return res.status(200).json({
      status: 200,
      data: finalRows,
      totalcount,
    });
  } catch (error) {
    next(error);
  }
};
