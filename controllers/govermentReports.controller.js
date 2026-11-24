const { Sequelize, where } = require('sequelize');
const sequelize = require('../config/database');
const message = require('../response_message/message');
const UserMaster = require('../models/userMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const {
  parseEmployeeInfoAlias,
  ToformatAddress,
  asiaKolkataDateTime,
  getHTMLFileData,
} = require('../utils/commonUtilFunctions');
const moment = require('moment');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const BankMaster = require('../models/bankMaster');
const UserAddress = require('../models/userAddress');
const { generateExcel } = require('../utils/exportData');
const {
  expenseReportFileToBase64,
  fileToBase64,
} = require('../utils/base64Topng');
const { mainApiUrl } = require('../utils/labelUtils');
const companyMaster = require('../models/companyMaster');
const EmployeeBranch = require('../models/employeeBranch');
const puppeteer = require('puppeteer');
const LoanMaster = require('../models/loanMaster');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const CompanyTypeMaster = require('../models/companytypeMaster');
const EmployeeBonus = require('../models/employeeBonus');

exports.form_A_Employee_Register = async (req, res, next) => {
  try {
    const { companyMasterID, branchMasterID = [], exportFileType } = req.body;
    if (!companyMasterID || !exportFileType) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.ValidParameters,
      });
    }
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const findCompanyData = await companyMaster.findOne({
      where: {
        companyMasterID,
      },
      attributes: ['companyName', 'ownerName'],
    });
    const includeModels = [
      {
        model: EmployeeJoiningDetails,
        as: 'emp_join',
        attributes: [
          'employeeCode',
          'nationality',
          'joiningDate',
          'employment',
          'uanNumber',
          'pancard',
          'esicNumber',
          'adharCard',
          'bankAccountNo',
          'bankIFSC',
          'leavingDate',
        ],
        include: [{ model: BankMaster, attributes: ['bankName'] }],
      },
      {
        required: false,
        model: UserAddress,
        where: { status: 1 },
      },
    ];
    if (branchMasterID && branchMasterID.length) {
      includeModels.push({
        required: true,
        model: EmployeeBranch,
        where: {
          branchID: branchMasterID,
          status: 1,
          applicableDate: {
            [Sequelize.Op.lte]: new Date(currentDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: { [Sequelize.Op.gte]: new Date(currentDate) },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
      });
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const findAllUserData = await UserMaster.findAll({
      where: {
        companyMasterId: companyMasterID,
        status: [0, 1],
        ...userAccessCondition.where,
      },
      attributes: [
        'userMasterID',
        'gender',
        'firstName',
        'lastName',
        'middleName',
        'dob',
        'userNumber',
        'photo',
      ],
      order: [['displayName', 'ASC']],
      include: [...includeModels, ...userAccessCondition.includeModels],
    });
    let serialNumber = 1;
    const finalUserData = [];
    for (const user of findAllUserData) {
      const userdetails = parseEmployeeInfoAlias(user);
      const joiningDetails = user.emp_join?.[0] || null;
      const userAddresses = user.userAddresses || [];

      const userPermanentAddress =
        userAddresses.find((e) => e.addressType === 'permanent') || null;

      const userTempAddress =
        userAddresses.find((e) => e.addressType === 'temporary') || null;
      const userObj = {
        'SL NO': serialNumber,
        'Employee Code': userdetails.employeeCode,
        Name: user.firstName,
        Surname: user.lastName,
        Gender: user.gender,
        'Father/Spouse Name': user.middleName,
        'Date of Birth': user.dob ? moment(user.dob).format('DD-MM-YYYY') : '',
        Nationality: joiningDetails?.nationality || '',
        'Education Level': '',
        'Date of Joining': joiningDetails?.joiningDate
          ? moment(joiningDetails.joiningDate).format('DD-MM-YYYY')
          : '',
        Designation: userdetails.designation || '',
        'Category Address': '',
        'Type of Employment': joiningDetails?.employment || '',
        MobileNO: user.userNumber,
        UAN: joiningDetails?.uanNumber || '',
        PAN: joiningDetails?.pancard || '',
        'ESIC IP': joiningDetails?.esicNumber || '',
        LWF: '',
        'Aadhar NO': joiningDetails?.adharCard || '',
        'Bank Account No': joiningDetails?.bankAccountNo || '',
        Bank: joiningDetails?.bankMaster?.bankName || '',
        'Branch(IFSC)': joiningDetails?.bankIFSC || '',
        'Present Address': ToformatAddress(userTempAddress),
        'Permanent Address': ToformatAddress(userPermanentAddress),
        'Service Book No': '',
        'Date Of Exit': joiningDetails?.leavingDate
          ? moment(joiningDetails?.leavingDate).format('DD-MM-YYYY')
          : '',
        'Reason For Exit': '',
        'Mark of Identification': '',
        Photo: user.photo
          ? getAttachmentValue(`uploads/user/photo/${user.photo}`)
          : '',
        'Speciment Signature/Thumb Impression': '',
        Remarks: '',
      };
      serialNumber++;
      finalUserData.push(userObj);
    }
    if (exportFileType == 'xlsx') {
      return await generateExcel(
        finalUserData,
        'Form-A Employee Register',
        'xlsx',
        res,
      );
    } else if (exportFileType == 'pdf') {
      const headers = Object.keys(finalUserData?.[0] || {});
      const pdfData = {
        datalength: headers.length,
        headers,
        companyName: findCompanyData?.companyName || '',
        ownerName: findCompanyData?.ownerName || '',
        userData: finalUserData,
      };
      const htmlData = await getHTMLFileData(
        pdfData,
        'form_A_Employee_Register',
        'html',
      );
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox'],
      });
      const page = await browser.newPage();
      // Set the HTML content of the page
      await page.setContent(htmlData, {
        waitUntil: 'networkidle0',
      });

      // Generate PDF

      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        preferCSSPageSize: true,
        timeout: 120000,
      });
      await browser.close();
      base64path = Buffer.from(pdfBuffer).toString('base64');
      return res.status(200).json({
        status: 200,
        data: base64path,
      });
    }
    return res.status(200).json({
      status: 200,
      data: finalUserData,
    });
  } catch (err) {
    next(err);
  }
};

const getAttachmentValue = (file) => {
  if (!file) return '-';
  const base64 = fileToBase64(file);
  return base64 || '-';
};

exports.formCLoanRegister = async (req, res, next) => {
  try {
    let {
      companyMasterID,
      branchMasterID = [],
      exportFileType,
      YearMM,
    } = req.body;
    if (!companyMasterID || !exportFileType || !YearMM) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.ValidParameters,
      });
    }
    YearMM = moment(String(YearMM), 'YYYY-MM').format('YYYYMM');
    const startDate = moment(String(YearMM), 'YYYYMM')
      .startOf('month')
      .format('YYYY-MM-DD');

    const endDate = moment(String(YearMM), 'YYYYMM')
      .endOf('month')
      .format('YYYY-MM-DD');
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const findCompanyData = await companyMaster.findOne({
      where: {
        companyMasterID,
      },
      attributes: ['companyName', 'ownerName'],
    });
    const employeeJoiningCondition = {
      joiningDate: {
        [Sequelize.Op.lte]: new Date(endDate),
      },
      [Sequelize.Op.or]: [
        {
          leavingDate: { [Sequelize.Op.gte]: new Date(startDate) },
        },
        {
          leavingDate: { [Sequelize.Op.eq]: null },
        },
      ],
    };
    const includeModels = [
      {
        model: EmployeeJoiningDetails,
        as: 'emp_join',
        where: employeeJoiningCondition,
        attributes: ['employeeCode', 'joiningDate', 'leavingDate'],
      },
      {
        required: false,
        model: LoanMaster,
        where: {
          status: 1,
          startMonth: YearMM,
        },
      },
    ];
    if (branchMasterID && branchMasterID.length) {
      includeModels.push({
        required: true,
        model: EmployeeBranch,
        where: {
          branchID: branchMasterID,
          status: 1,
          applicableDate: {
            [Sequelize.Op.lte]: new Date(currentDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: { [Sequelize.Op.gte]: new Date(currentDate) },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
      });
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const findAllUserData = await UserMaster.findAll({
      where: {
        companyMasterId: companyMasterID,
        status: [0, 1],
        ...userAccessCondition.where,
      },
      attributes: ['userMasterID', 'displayName', 'photo'],
      order: [['displayName', 'ASC']],
      include: [...includeModels, ...userAccessCondition.includeModels],
    });
    let serialNumber = 1;
    const finalUserData = [];
    const formattedMonthStartDate = moment(startDate).format('DD-MMMM-YYYY');
    const formattedMonthEndDate = moment(endDate).format('DD-MMMM-YYYY');
    const formattedMonth = moment(String(YearMM), 'YYYYMM').format('MMMM-YYYY');
    for (const user of findAllUserData) {
      const userdetails = parseEmployeeInfoAlias(user);
      const userLoanDetails = user.loanMasters || [];
      if (userLoanDetails.length) {
        for (const loan of userLoanDetails) {
          const userObj = {
            'SL NO': serialNumber,
            'Employee Code': userdetails.employeeCode,
            Name: user.displayName,
            'Recovery Type': `Loan`,
            Particular: 'NIL',
            'Date of Damage/Loss/Fine': loan.givenDate,
            Amount: loan.LoanAmount,
            'Whether show Cause Issued': 'NIL',
            'Explaination Heared In Presence Of': 'NIL',
            'Number Of Instalments': 'NIL',
            'First Month/Year': loan.startMonth,
            'Date Of Complete Recovery': 'NIL',
            Remarks: loan.LoanRemark || 'NIL',
          };
          serialNumber++;
          finalUserData.push(userObj);
        }
      } else {
        const userObj = {
          'SL NO': serialNumber,
          'Employee Code': userdetails.employeeCode,
          Name: user.displayName,
          'Recovery Type': `NO Loan for the Month Of ${formattedMonthStartDate} to ${formattedMonthEndDate}`,
          Particular: 'NIL',
          'Date of Damage/Loss/Fine': 'NIL',
          Amount: 'NIL',
          'Whether show Cause Issued': 'NIL',
          'Explaination Heared In Presence Of': 'NIL',
          'Number Of Instalments': 'NIL',
          'First Month/Year': 'NIL',
          'Date Of Complete Recovery': 'NIL',
          Remarks: `For the Month Of ${formattedMonth}`,
        };
        serialNumber++;
        finalUserData.push(userObj);
      }
    }
    if (exportFileType == 'xlsx') {
      return await generateExcel(
        finalUserData,
        'Form-A Employee Register',
        'xlsx',
        res,
      );
    } else if (exportFileType == 'pdf') {
      const headers = Object.keys(finalUserData?.[0] || {});
      const pdfData = {
        datalength: headers.length,
        headers,
        companyName: findCompanyData?.companyName || '',
        ownerName: findCompanyData?.ownerName || '',
        userData: finalUserData,
        month: formattedMonth,
      };
      const htmlData = await getHTMLFileData(
        pdfData,
        'formCLoanRegister',
        'html',
      );
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox'],
      });
      const page = await browser.newPage();
      // Set the HTML content of the page
      await page.setContent(htmlData, {
        waitUntil: 'networkidle0',
      });

      // Generate PDF

      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        preferCSSPageSize: true,
        timeout: 120000,
      });
      await browser.close();
      base64path = Buffer.from(pdfBuffer).toString('base64');
      return res.status(200).json({
        status: 200,
        data: base64path,
      });
    }
    return res.status(200).json({
      status: 200,
      data: finalUserData,
    });
  } catch (err) {
    next(err);
  }
};

exports.formDPaymentOfBonus = async (req, res, next) => {
  try {
    let {
      companyMasterID,
      branchMasterID = [],
      paymentType,
      fromYYYYMMToYYYYMM,
    } = req.body;
    if (!companyMasterID || !paymentType || !fromYYYYMMToYYYYMM) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.ValidParameters,
      });
    }
    const [startYear, endYear] = fromYYYYMMToYYYYMM.split('-');

    const fromYearMM = moment(`${startYear}-04`, 'YYYY-MM').format('YYYYMM');
    const toYearMM = moment(`${endYear}-03`, 'YYYY-MM').format('YYYYMM');
    const startDate = moment(String(fromYearMM), 'YYYYMM')
      .startOf('month')
      .format('YYYY-MM-DD');

    const endDate = moment(String(toYearMM), 'YYYYMM')
      .endOf('month')
      .format('YYYY-MM-DD');
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const findCompanyData = await companyMaster.findOne({
      where: {
        companyMasterID,
      },
      attributes: ['companyName', 'ownerName', 'companyAddress'],
      include: [
        {
          model: CompanyTypeMaster,
          attributes: ['companyTypename'],
        },
      ],
    });

    const userIncludeModel = [];
    if (branchMasterID && branchMasterID.length) {
      userIncludeModel.push({
        required: true,
        model: EmployeeBranch,
        where: {
          branchID: branchMasterID,
          status: 1,
          applicableDate: {
            [Sequelize.Op.lte]: new Date(currentDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: { [Sequelize.Op.gte]: new Date(currentDate) },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        attributes: [],
      });
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const result = await EmployeeBonus.findAll({
      attributes: [
        [
          Sequelize.fn(
            'COALESCE',
            Sequelize.fn('SUM', Sequelize.col('employeeBonus.amount')),
            0,
          ),
          'totalBonusAmount',
        ],
        [
          Sequelize.fn(
            'COUNT',
            Sequelize.fn(
              'DISTINCT',
              Sequelize.col('employeeBonus.userMasterID'),
            ),
          ),
          'totalUsers',
        ],
      ],
      where: {
        payYYYYMM: {
          [Sequelize.Op.between]: [Number(fromYearMM), Number(toYearMM)],
        },
        status: 1,
      },
      include: [
        {
          model: UserMaster,
          attributes: [],
          required: true,
          where: {
            companyMasterId: companyMasterID,
            ...userAccessCondition.where,
          },
          include: [...userIncludeModel, ...userAccessCondition.includeModels],
        },
      ],
      raw: true,
      subQuery: false,
    });

    const bonusSummary = result?.[0] || {};

    const totalBonusAmount = Number(bonusSummary.totalBonusAmount || 0);

    const totalUsers = Number(bonusSummary.totalUsers || 0);
    const pdfData = {
      companyName: findCompanyData?.companyName || '',
      ownerName: findCompanyData?.ownerName || '',
      companyAddress: findCompanyData?.companyAddress || '',
      companyTypeName: findCompanyData?.companyType?.companyTypename || '',
      endDate: moment(String(toYearMM), 'YYYYMM')
        .endOf('month')
        .format('Do-MMMM-YYYY'),
      paymentType,
      totalUsers,
      totalBonusAmount,
    };
    const htmlData = await getHTMLFileData(
      pdfData,
      'formDPaymentOfBonus',
      'html',
    );
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox'],
    });
    const page = await browser.newPage();
    // Set the HTML content of the page
    await page.setContent(htmlData, {
      waitUntil: 'networkidle0',
    });

    // Generate PDF

    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      timeout: 120000,
    });
    await browser.close();
    base64path = Buffer.from(pdfBuffer).toString('base64');
    return res.status(200).json({
      status: 200,
      data: base64path,
    });
  } catch (err) {
    next(err);
  }
};
