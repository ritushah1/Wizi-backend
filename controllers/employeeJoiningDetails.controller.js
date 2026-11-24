const Sequelize = require('sequelize');
const UserMaster = require('../models/userMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const sequelize = require('../config/database');
const message = require('../response_message/message');
const EmployeeEmployement = require('../models/employeeEmployeement');
const EmployeeBranch = require('../models/employeeBranch');
const EmployeeDepartment = require('../models/employeeDepartment');
const EmployeeDesignation = require('../models/employeeDesignation');
const fs = require('fs');
const axios = require('axios');
const { usermessage } = require('../response_message/message');
const {
  asiaKolkataDateTime,
  createEmployeeJoiningDetailHistory,
  month_dict,
  getDuplicationValidation,
  getEmployeeCodeCompanyWise,
} = require('../utils/commonUtilFunctions');
const companyMaster = require('../models/companyMaster');
const puppeteer = require('puppeteer');
const Handlebars = require('handlebars');
const path = require('path');
const moment = require('moment');
const BankMaster = require('../models/bankMaster');
const Designation = require('../models/designation');
const Department = require('../models/department');
const BranchMaster = require('../models/branchMaster');
const UserAddress = require('../models/userAddress');
const EmployeeDigitalSignature = require('../models/employeeDigitalSignature');
const CityMaster = require('../models/citymaster');
const {
  createZipFileForPortraitidIdCards,
  generateExcel,
} = require('../utils/exportData');
const {
  faceApiUrl,
  mainApiUrl,
  appURL,
  projectNamesList,
  EmployementTypeList,
} = require('../utils/labelUtils');
const {
  PayrollFrequencyType,
  companyIdEnumIDCard,
  workerCategory,
  employeementTypeEnumList,
  workerTypesEnum,
  employeeCodeTypes,
} = require('../utils/dbUtils');
const EmployeeSkillCategory = require('../models/employeeSkillCategory');
const { isArray } = require('lodash');
const { companyAttributes, statusCodes } = require('../utils/commonVars');
const UserDocument = require('../models/userDocument');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const CompanyIDCardFormat = require('../models/companyIDCardFormat');
const IdCardFormat = require('../models/idCardFormat');
const AppraisalFeedbackReq = require('../models/appraisalFeedbacklRequest');
const ProjectName = process.env.PROJECT_NAME;
// Import ID Card Helper
const idCardHelper = require('../utils/idCardHelper');
const HrLeaveMonthlyTrans = require('../models/hrLeavesMonthlyTrans');
const EmployeeJoiningDetailHistory = require('../models/employeeJoiningDetailsHistory');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const UserInbox = require('../models/UserInbox');
exports.AddEmpJoiningnpmDetails = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      userMasterID,
      AccountMasterId,
      dob,
      joiningDate,
      leavingDate,
      adharCard,
      esicNumber,
      esicEndMonth,
      pfNumber,
      uanNumber,
      pancard,
      bankMasterID,
      bankIFSC,
      bankAccountNo,
      retirementAge,
      noticePeriod,
      applicableDate,
      endDate,
      salarytype,
      retirementDate,
      biometricCode,
      biometricSerialNo,
      salaryCalculationAct,
      overtime,
      employment,
      adharName,
      pfjoiningDate,
      pfbankMasterID,
      pfbankIFSC,
      pfbankAccountNo,
      esicjoiningDate,
      bloodgroup,
      nationality,
      attendanceFrom,
      fullMonthPresence,
      nameAsBank,
      employeeType,
      bankBranchID,
      contractorId,
      payrollFrequency,
    } = await req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    let employeeCode = '';
    let adharPhoto = null;
    let panPhoto = null;

    let png_HRA_Applicable = true;
    let png_MVA_Applicable = true;

    if (
      ProjectName == projectNamesList.PIH &&
      req.body?.payrollFrequency == PayrollFrequencyType.MONTHLY
    ) {
      png_HRA_Applicable = req.body.png_HRA_Applicable;
      png_MVA_Applicable = req.body.png_MVA_Applicable;
    }

    // Check For Aadhar Card Photo
    if (req.files.adharPhoto) {
      adharPhoto = req.files.adharPhoto[0].filename;
    }
    // Check For PAN Card Photo
    if (req.files.panPhoto) {
      panPhoto = req.files.panPhoto[0].filename;
    }

    for (const key of Object.keys(req.body)) {
      if (
        req.body[key] == 'null' ||
        !req.body[key] ||
        req.body[key] == 'undefined'
      ) {
        req.body[key] = null;
      }
    }
    // Get User Data
    const employee = await UserMaster.findOne(
      {
        where: {
          userMasterID: req.body.userMasterID,
          status: [0, 1],
        },
        include: [{ model: EmployeeJoiningDetails }, { model: companyMaster }],
      },
      { transaction },
    );

    if (!employee) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: 'User not found!',
      });
    }

    const companyMasterId = employee.companyMasterId;

    // if addhar/uan/esic

    if (
      req.body.adharCard ||
      req.body.uanNumber ||
      req.body.esicNumber ||
      req.body.pancard
    ) {
      const data = {
        adharCard: req.body.adharCard,
        uanNumber: req.body.uanNumber,
        esicNumber: req.body.esicNumber,
        pancard: req.body.pancard,
      };

      // duplication validation
      const message = await getDuplicationValidation(
        data,
        userMasterID,
        companyMasterId,
        true,
      );

      if (message) {
        await transaction.rollback();
        return res.status(statusCodes.OK).json({
          status: statusCodes.BAD_REQUEST,
          message,
        });
      }
    }

    // Check For Employee Joining
    const emp_Joining =
      employee.employeeJoiningDetails &&
      employee.employeeJoiningDetails.length > 0
        ? employee.employeeJoiningDetails[0]
        : null;

    if (
      req.body.leavingDate &&
      req.body.joiningDate &&
      new Date(req.body.leavingDate) < new Date(req.body.joiningDate)
    ) {
      await transaction.rollback();
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: `Relieving date must be greater than the joining date.`,
      });
    }

    // check if employee FNF is completed or not

    const isFNF = employee.isFNF;

    if (isFNF && emp_Joining && req.body.leavingDate) {
      if (emp_Joining.leavingDate != req.body.leavingDate) {
        await transaction.rollback();

        return res.status(200).json({
          status: 401,
          message:
            'Full & Final Settlement (FNF) has already been completed for this employee. The relieving date cannot be changed.',
        });
      }
    }

    const existedLeavingDate = emp_Joining?.leavingDate || null;

    if (
      (req.body.leavingDate || existedLeavingDate) &&
      req.body.leavingDate != existedLeavingDate
    ) {
      const checkAttnCal = await HrLeaveMonthlyTrans.findOne({
        where: {
          userMasterID: employee.userMasterID,
          [Sequelize.Op.or]: [
            {
              monthenddate: {
                [Sequelize.Op.gte]: req.body.leavingDate,
              },
            },
            {
              monthenddate: {
                [Sequelize.Op.gte]: existedLeavingDate,
              },
            },
          ],

          verified: 1,
        },
      });

      if (checkAttnCal) {
        await transaction.rollback();
        return res.status(statusCodes.OK).json({
          status: statusCodes.BAD_REQUEST,
          message: `Attendance already verified for the month of ${month_dict[String(checkAttnCal.AttnYearMon).slice(4, 6)] + '-' + String(checkAttnCal.AttnYearMon).slice(0, 4)}`,
        });
      }
    }

    // Check For Employee Code Type
    const employeeCodeType = employee.companyMaster.employeeCodeType;
    const company = +employee.companyMasterId;
    const findCurrentCompany = employee.companyMaster || null;
    const parentCompanyID =
      +findCurrentCompany?.parentCompanyMasterID === 0
        ? +findCurrentCompany.companyMasterID
        : +findCurrentCompany.parentCompanyMasterID;
    const getallChildParentCompanyData = await companyMaster.findAll({
      where: {
        [Sequelize.Op.or]: [
          { companyMasterID: +parentCompanyID },
          { parentCompanyMasterID: +parentCompanyID },
        ],
        status: [0, 1],
      },
    });
    // const allCompanyIDs = getallChildParentCompanyData.map(
    //   (item) => +item.companyMasterID,
    // );
    if (emp_Joining?.employeeCode) {
      employeeCode =
        employeeCodeType === employeeCodeTypes.MANUAL
          ? req.body.employeeCode
          : emp_Joining.employeeCode;
    } else {
      const generatedEmployeeCode = await getEmployeeCodeCompanyWise({
        allCompanies: getallChildParentCompanyData,
        companyMasterID: companyMasterId,
        employeeCode: req.body.employeeCode,
        joiningDate: joiningDate,
      });

      if (generatedEmployeeCode.status != 200) {
        await transaction.rollback();
        return res.status(200).json({
          status: generatedEmployeeCode.status,
          message: generatedEmployeeCode.message,
        });
      }
      employeeCode = generatedEmployeeCode.employeeCode;
    }

    const duplicateDocument = await UserDocument.findAll({
      where: {
        userMasterID: userMasterID,
        status: 1,
        documentListID: [1, 2],
      },
      raw: true,
    });
    const findPanCard =
      duplicateDocument.find((e) => e.documentListID == 2) || null;
    const findAadharCard =
      duplicateDocument.find((e) => e.documentListID == 1) || null;
    if (emp_Joining) {
      if (!adharPhoto) {
        adharPhoto = emp_Joining.adharPhoto;
      }
      if (!req.body.adharCard && findAadharCard) {
        adharPhoto = null;
      }

      if (!panPhoto) {
        panPhoto = emp_Joining.panPhoto;
      }
      if (!req.body.pancard && findPanCard) {
        panPhoto = null;
      }

      await createEmployeeJoiningDetailHistory(userMasterID, transaction);
      await EmployeeJoiningDetails.update(
        {
          employeeCode: employeeCode,
          AccountMasterId: req.body.AccountMasterId,
          dob: req.body.dob,
          joiningDate: req.body.joiningDate,
          leavingDate: req.body.leavingDate,
          esicNumber: req.body.esicNumber,
          pfNumber: req.body.pfNumber,
          uanNumber: req.body.uanNumber,
          // bankMasterID: req.body.bankMasterID,
          // bankIFSC: req.body.bankIFSC,
          // bankAccountNo: req.body.bankAccountNo,
          retirementAge: req.body.retirementAge,
          retirementDate: req.body.retirementDate,
          noticePeriod: req.body.noticePeriod,
          applicableDate: req.body.applicableDate,
          endDate: req.body.endDate,
          salarytype: req.body.salarytype,
          biometricCode: req.body.biometricCode,
          salaryCalculationAct: req.body.salaryCalculationAct,
          biometricSerialNo: req.body.biometricSerialNo,
          overtime: req.body.overtime,
          employment: req.body.employment,
          esicEndMonth: req.body.esicEndMonth,
          pfjoiningDate: req.body.pfjoiningDate,
          pfbankMasterID: req.body.pfbankMasterID,
          pfbankIFSC: req.body.pfbankIFSC,
          pfbankAccountNo: req.body.pfbankAccountNo,
          esicjoiningDate: req.body.esicjoiningDate,
          bloodgroup: req.body.bloodgroup,
          nationality: req.body.nationality,
          updateBy: createBy,
          updateByIp: createByIp,
          attendanceFrom,
          fullMonthPresence,
          // nameAsBank: req.body.nameAsBank,
          employeeType,
          // bankBranchID:
          //   bankBranchID &&
          //   bankBranchID != 'null' &&
          //   bankBranchID != 'undefined'
          //     ? bankBranchID
          //     : null,
          contractorId: employment == 'Contract' ? contractorId : null,
          payrollFrequency:
            req.body.payrollFrequency || PayrollFrequencyType.MONTHLY,
          adharCard: req.body.adharCard,
          adharName: req.body.adharName,
          pancard: req.body.pancard,
          panPhoto: panPhoto,
          adharPhoto: adharPhoto,
          png_HRA_Applicable,
          png_MVA_Applicable,
        },
        {
          where: { userMasterID: userMasterID },
        },
        { transaction },
      );

      if (findAadharCard) {
        await UserDocument.update(
          {
            updateBy: createBy,
            updateByIp: createByIp,
            verifyStatus: 1,
            verifyBy: createBy,
            documentNumber: req.body.adharCard ? req.body.adharCard : null,
            nameOnDocument: req.body.adharName ? req.body.adharName : null,
          },
          {
            where: { userDocumentID: findAadharCard.userDocumentID },
            transaction,
          },
        );
        await UserInbox.destroy({
          where: {
            activityTable: UserDocument.getTableName(),
            activityTablePK: findAadharCard.userDocumentID,
          },
          transaction,
        });
      } else if (
        (req.body.adharCard || req.body.adharName) &&
        !findAadharCard
      ) {
        await UserDocument.create(
          {
            userMasterID,
            documentListID: 1,
            createBy,
            createByIp,
            verifyStatus: 1,
            verifyBy: createBy,
            documentNumber: req.body.adharCard ? req.body.adharCard : null,
            nameOnDocument: req.body.adharName ? req.body.adharName : null,
          },
          { transaction },
        );
      }

      if (findPanCard) {
        await UserDocument.update(
          {
            updateBy: createBy,
            updateByIp: createByIp,
            verifyStatus: 1,
            verifyBy: createBy,
            documentNumber: req.body.pancard,
          },
          {
            where: { userDocumentID: findPanCard.userDocumentID },
            transaction,
          },
        );
        await UserInbox.destroy({
          where: {
            activityTable: UserDocument.getTableName(),
            activityTablePK: findPanCard.userDocumentID,
          },
          transaction,
        });
      } else if (req.body.pancard && !findPanCard) {
        await UserDocument.create(
          {
            userMasterID,
            documentListID: 2,
            createBy,
            createByIp,
            verifyStatus: 1,
            verifyBy: createBy,
            documentNumber: req.body.pancard,
          },
          { transaction },
        );
      }
    } else {
      await EmployeeJoiningDetails.create(
        {
          userMasterID: req.body.userMasterID,
          employeeCode: employeeCode,
          AccountMasterId: req.body.AccountMasterId,
          dob: req.body.dob,
          joiningDate: req.body.joiningDate,
          leavingDate: req.body.leavingDate,
          esicNumber: req.body.esicNumber,
          pfNumber: req.body.pfNumber,
          uanNumber: req.body.uanNumber,
          bankMasterID: req.body.bankMasterID,
          bankIFSC: req.body.bankIFSC,
          bankAccountNo: req.body.bankAccountNo,
          retirementAge: req.body.retirementAge,
          retirementDate: req.body.retirementDate,
          noticePeriod: req.body.noticePeriod,
          applicableDate: req.body.applicableDate,
          endDate: req.body.endDate,
          salarytype: req.body.salarytype,
          biometricCode: req.body.biometricCode,
          salaryCalculationAct: req.body.salaryCalculationAct,
          biometricSerialNo: req.body.biometricSerialNo,
          overtime: req.body.overtime,
          employment: req.body.employment,
          esicEndMonth: req.body.esicEndMonth,
          pfjoiningDate: req.body.pfjoiningDate,
          pfbankMasterID: req.body.pfbankMasterID,
          pfbankIFSC: req.body.pfbankIFSC,
          pfbankAccountNo: req.body.pfbankAccountNo,
          esicjoiningDate: req.body.esicjoiningDate,
          bloodgroup: req.body.bloodgroup,
          nationality: req.body.nationality,
          createBy,
          createByIp,
          attendanceFrom,
          fullMonthPresence,
          nameAsBank: req.body.nameAsBank,
          employeeType,
          bankBranchID:
            bankBranchID &&
            bankBranchID != 'null' &&
            bankBranchID != 'undefined'
              ? bankBranchID
              : null,
          contractorId: employment == 'Contract' ? contractorId : null,
          payrollFrequency:
            req.body.payrollFrequency || PayrollFrequencyType.MONTHLY,
          adharCard: req.body.adharCard,
          adharName: req.body.adharName,
          pancard: req.body.pancard,
          panPhoto: panPhoto,
          adharPhoto: adharPhoto,
          png_HRA_Applicable,
          png_MVA_Applicable,
        },
        { transaction },
      );
      if (findAadharCard) {
        await UserDocument.update(
          {
            updateBy: createBy,
            updateByIp: createByIp,
            verifyStatus: 1,
            verifyBy: createBy,
            documentNumber: req.body.adharCard ? req.body.adharCard : null,
            nameOnDocument: req.body.adharName ? req.body.adharName : null,
          },
          {
            where: { userDocumentID: findAadharCard.userDocumentID },
            transaction,
          },
        );
        await UserInbox.destroy({
          where: {
            activityTable: UserDocument.getTableName(),
            activityTablePK: findAadharCard.userDocumentID,
          },
        });
      } else if (
        (req.body.adharCard || req.body.adharName) &&
        !findAadharCard
      ) {
        await UserDocument.create(
          {
            userMasterID,
            documentListID: 1,
            createBy,
            createByIp,
            verifyStatus: 1,
            verifyBy: createBy,
            documentNumber: req.body.adharCard ? req.body.adharCard : null,
            nameOnDocument: req.body.adharName ? req.body.adharName : null,
          },
          { transaction },
        );
      }

      if (findPanCard) {
        await UserDocument.update(
          {
            updateBy: createBy,
            updateByIp: createByIp,
            verifyStatus: 1,
            verifyBy: createBy,
            documentNumber: req.body.pancard ? req.body.pancard : null,
          },
          {
            where: { userDocumentID: findPanCard.userDocumentID },
            transaction,
          },
        );
        await UserInbox.destroy({
          where: {
            activityTable: UserDocument.getTableName(),
            activityTablePK: findPanCard.userDocumentID,
          },
        });
      } else if (req.body.pancard && !findPanCard) {
        await UserDocument.create(
          {
            userMasterID,
            documentListID: 2,
            createBy,
            createByIp,
            verifyStatus: 1,
            verifyBy: createBy,
            documentNumber: req.body.pancard ? req.body.pancard : null,
          },
          { transaction },
        );
      }
    }

    if (employment && applicableDate) {
      if (!endDate) {
        endDate = null;
      }

      const find_employee = await EmployeeEmployement.findOne(
        {
          where: {
            userMasterID: req.body.userMasterID,
            employeement: employment,
            status: 1,
          },
        },
        { transaction },
      );

      if (find_employee) {
        await EmployeeEmployement.update(
          {
            applicableDate: new Date(req.body.applicableDate),
            endDate: req.body.endDate ? new Date(req.body.endDate) : null,
            employeement: employment,
            updateBy: createBy,
            updateByIp: createByIp,
          },
          {
            where: { userMasterID: userMasterID, employeement: employment },
          },
          { transaction },
        );
        if (employment == 'Probation') {
          await AppraisalFeedbackReq.update(
            {
              isReassessment: false,
            },
            {
              where: {
                employeeEmploymentID: find_employee.employeeEmployeementId,
              },
            },
          );
        }
      } else {
        await EmployeeEmployement.create(
          {
            userMasterID,
            applicableDate: new Date(req.body.applicableDate),
            endDate: req.body.endDate ? new Date(req.body.endDate) : null,
            employeement: employment,
            createBy,
            createByIp,
          },
          { transaction },
        );
      }
    }

    const findSkillCategory = await EmployeeSkillCategory.findOne({
      where: {
        userMasterID,
      },
    });

    if (req.body.skillCategory && !findSkillCategory) {
      const joiningMonth =
        String(req.body.joiningDate).slice(0, 4) +
        String(req.body.joiningDate).slice(5, 7);

      await EmployeeSkillCategory.create(
        {
          userMasterID,
          skillCategory: req.body.skillCategory,
          applicableYYYYMM: +joiningMonth,
        },
        {
          transaction,
          user: req.userDetails,
        },
      );
    }

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.empJoiningAdd,
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getEmployeeJoiningDetByuserId = async (req, res, next) => {
  try {
    const get_one_data = await EmployeeJoiningDetails.findOne({
      where: {
        userMasterID: req.params.id,
      },
      include: [
        {
          required: true,
          model: UserMaster,
          include: [
            { model: companyMaster, attributes: ['employeeCodeType'] },
            { required: false, model: EmployeeSkillCategory },
          ],
        },
        { model: BankMaster },
        {
          model: UserMaster,
          as: 'updatedBy',
          attributes: ['displayName'],
        },
      ],
    });

    const date = asiaKolkataDateTime(new Date()).slice(0, 10);

    const YYYYMM = String(date).slice(0, 4) + String(date).slice(5, 7);

    const skillCategory = [
      ...get_one_data.userMaster.employeeSkillCategories,
    ].sort((a, b) => +a.applicableYYYYMM - +b.applicableYYYYMM);

    const currentSkillCategory = skillCategory.find(
      (e) =>
        +e.applicableYYYYMM <= +YYYYMM &&
        (+e.endYYYYMM >= +YYYYMM || !e.endYYYYMM),
    );

    const leavingDate = get_one_data?.leavingDate || null;
    let leavingDateDisable = get_one_data.userMaster?.isFNF || false;

    if (leavingDate) {
      const checkAttnCal = await HrLeaveMonthlyTrans.findOne({
        where: {
          userMasterID: get_one_data.userMasterID,
          monthenddate: {
            [Sequelize.Op.gte]: leavingDate,
          },
          verified: 1,
        },
      });

      if (checkAttnCal) leavingDateDisable = true;
    }

    return res.status(200).json({
      status: 200,
      data: get_one_data,
      skillCategory: skillCategory[0]?.skillCategory || null,
      currentSkillCategory: (
        currentSkillCategory?.skillCategory || ''
      ).toUpperCase(),
      disable: skillCategory.length ? true : false,
      leavingDateDisable,
    });
  } catch (err) {
    next(err);
  }
};

exports.employeeIdCard = async (req, res, next) => {
  let browser = null;

  try {
    let { userMasterID, page, limit, branchMasterID, idCardType, orderBy } =
      req.body;
    let companyMasterID = req?.body?.companyMasterID || null;

    if (req?.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
      companyMasterID = req.userDetails.companyMasterId;
    }
    if (!companyMasterID) {
      const userCompany = await UserMaster.findOne({
        where: { userMasterID: userMasterID },
        attributes: ['companyMasterId'],
      });
      companyMasterID = userCompany?.companyMasterId;
      if (!companyMasterID) {
        companyMasterID = req.userDetails.companyMasterId;
      }
    }

    if (!companyMasterID)
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: message.usermessage.requiredMessage('companyMasterID'),
      });

    const date = asiaKolkataDateTime(new Date()).slice(0, 10);
    const isSingleCardType =
      idCardType === 'portraitSingleIdCard' ||
      idCardType === 'landscapeSingleIdCard';

    // Build query parameters using helpers
    const order = idCardHelper.buildOrderClause(orderBy);
    const paginateCondition = idCardHelper.buildPaginationCondition(
      page,
      limit,
    );

    const branchIds = idCardHelper.getBranchIds(
      branchMasterID,
      req.userDetails,
    );
    const joiningCondition = isSingleCardType
      ? {}
      : idCardHelper.buildJoiningCondition(date);

    // Fetch company data separately for better performance
    const companyData = await idCardHelper.getCompanyData(companyMasterID);
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    // Fetch employee data (without companyMaster include)
    const { rows: AllUsersData, count: totalcount } =
      await UserMaster.findAndCountAll({
        distinct: true,
        where: {
          ...userAccessCondition.where,
          ...idCardHelper.buildUserWhereClause(
            date,
            isSingleCardType,
            companyMasterID,
            userMasterID,
          ),
        },
        ...paginateCondition,
        subQuery: false,
        include: [
          ...userAccessCondition.includeModels,
          ...idCardHelper.buildIncludeClause(date, branchIds, joiningCondition),
        ],
        attributes: [
          'userMasterID',
          'displayName',
          'photo',
          'firstName',
          'lastName',
          'userNumber',
          'otherContactNumber',
        ],
        order,
      });

    // Transform data for template using helper (pass company data separately)
    const { finalArray, userCompanyMasterID, userCompanyData } =
      await idCardHelper.transformUserData(
        AllUsersData,
        companyData,
        companyMasterID,
      );

    // Handle empty results
    if (!finalArray?.length) {
      return res.status(200).json({
        message: usermessage.fetchMessage('Id Card Data'),
        jpegBase64Path: '',
        data: '',
        name: '',
        status: 200,
        totalcount: 0,
      });
    }

    // Setup template engine
    idCardHelper.registerHandlebarsHelpers();

    // Determine template path (FIXED: correctly accesses idCardFormat)
    const filePath = idCardHelper.getTemplatePath(
      userCompanyData,
      userCompanyMasterID,
      idCardType,
    );
    const fileFormat = idCardHelper.getCustomTemplateFormatPath(
      userCompanyData,
      idCardType,
    );

    // Compile template
    const file = await idCardHelper.readFileAsync(filePath);
    const template = Handlebars.compile(file);

    // Check company type and get config
    // NOTE: Always use idCardType for config lookup, not fileFormat
    // fileFormat is only for custom template path selection
    const isSpecial = idCardHelper.isSpecialCompany(userCompanyMasterID);
    const config = idCardHelper.getIdCardConfig(
      idCardType,
      isSpecial,
      userCompanyMasterID,
    );

    // Determine if the actual template being used requires direct data format
    // This applies ONLY to:
    // 1. Single card types (portraitSingleIdCard, landscapeSingleIdCard) - one card per PDF
    // 2. Bulk downloads (portraitIdCardForBulkDownload) - one card per PDF in ZIP
    // For PDF/A4 grid views (portraitIdCard, landscapeIdCard), ALWAYS use array format
    // because these templates show multiple cards on one page using {{#each tempData}}
    const idCardTypeLower = idCardType?.toLowerCase() || '';
    const isSingleOrBulk =
      idCardTypeLower.includes('single') || idCardTypeLower.includes('bulk');
    const templateUsesDirectData =
      isSingleOrBulk && fileFormat
        ? idCardHelper.templateUsesDirectData(fileFormat)
        : isSingleOrBulk
          ? config.usesDirectData
          : false;

    // Prepare template data
    const { data, companyWiseData } =
      idCardHelper.prepareTemplateData(finalArray);

    // Launch browser
    browser = await idCardHelper.launchBrowser();

    // Handle bulk download
    if (config.isBulk || idCardTypeLower.includes('bulk')) {
      // Override config.usesDirectData with the actual template's data format requirement
      const bulkConfig = { ...config, usesDirectData: templateUsesDirectData };
      const bulkData = await idCardHelper.handleBulkDownload(
        browser,
        template,
        finalArray,
        bulkConfig,
        idCardType,
      );
      browser = null;
      return await idCardHelper.createZipFileForPortraitidIdCards(
        bulkData,
        res,
      );
    }

    // Generate single/preview ID card
    // usesDirectData: true = template uses direct data (no {{#each tempData}}) - e.g., monarchIDCard.html, hiraidcard.html
    // usesDirectData: false = template uses array format with {{#each tempData}}
    const htmlContent =
      templateUsesDirectData === true
        ? template(companyWiseData)
        : template(data);
    const pdfPage = await browser.newPage();
    await pdfPage.setContent(htmlContent);

    // Generate PDF
    const pdfBuffer = await idCardHelper.generatePdf(pdfPage, config);

    // Generate screenshot
    const { jpegBuffer, fullIdCardBuffer } =
      await idCardHelper.generateScreenshot(
        pdfPage,
        config,
        AllUsersData.length,
      );

    await browser.close();
    browser = null;

    // Prepare response
    const pdfBase64Path = Buffer.from(pdfBuffer).toString('base64');
    const jpegBase64Path = fullIdCardBuffer
      ? fullIdCardBuffer.toString('base64')
      : jpegBuffer.toString('base64');

    return res.status(200).json({
      message: usermessage.fetchMessage('Id Card Data'),
      jpegBase64Path,
      data: pdfBase64Path,
      name: idCardHelper.buildResponseName(finalArray, AllUsersData.length),
      status: 200,
      totalcount,
    });
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    next(err);
  }
};

exports.updateUserFaces = async (req, res, next) => {
  try {
    let { userMasterID, facePhotoArray } = await req.body;

    const userExists = await UserMaster.findByPk(userMasterID);
    if (!userExists)
      return res
        .status(200)
        .json({ message: usermessage.notFoundMessage('User'), status: 401 });

    let userFaces;
    if (req.files) userFaces = req.files.map((file) => file.filename);
    else
      return res.status(200).json({ message: 'Files not found', status: 401 });

    if (
      userExists.dataValues.userFaces &&
      userExists.dataValues.userFaces.length > 0
    ) {
      for (var item of userExists.dataValues.userFaces) {
        const filePath = path.join(__dirname, `../uploads/user-faces/${item}`);

        fs.unlink(filePath, function (err) {});
      }
    }
    if (facePhotoArray) facePhotoArray = facePhotoArray.split(',');

    await UserMaster.update(
      {
        userFaces,
        facePhotoArray:
          facePhotoArray && facePhotoArray.length > 0
            ? facePhotoArray
            : userExists.dataValues.facePhotoArray,
      },
      { where: { userMasterID: userMasterID } },
    );

    return res
      .status(200)
      .json({ status: 200, message: usermessage.addMessage('User Faces') });
  } catch (err) {
    next(err);
  }
};

exports.removeUserFaces = async (req, res, next) => {
  try {
    let { userMasterID } = await req.body;

    const userExists = await UserMaster.findByPk(userMasterID);
    if (!userExists)
      return res
        .status(200)
        .json({ message: usermessage.notFoundMessage('User'), status: 401 });

    if (
      userExists.dataValues.userFaces &&
      userExists.dataValues.userFaces.length > 0
    ) {
      for (let item of userExists.dataValues.userFaces) {
        const filePath = path.join(__dirname, `../uploads/user-faces/${item}`);

        fs.unlink(filePath, function (err) {});
      }
    }

    userExists.userFaces = null;
    userExists.facePhotoArray = null;
    userExists.updatedBy = req.userDetails.userMasterId;
    userExists.updatedByIp = req.userDetails.userIpAddress;
    await userExists.save();

    return res
      .status(200)
      .json({ status: 200, message: usermessage.removeMessage('User Faces') });
  } catch (err) {
    next(err);
  }
};

exports.checkUserFaces = async (req, res, next) => {
  try {
    const { userFace, userMasterID } = await req.body;

    const user = await UserMaster.findOne({
      raw: true,
      where: { userMasterID: userMasterID },
      attributes: ['userFaces'],
    });

    let userLogFace = '';
    if (user && user.userFaces && user.userFaces.length != 0) {
      userLogFace = fs.readFileSync(
        path.join(__dirname, `../uploads/user-faces/${user.userFaces[0]}`),
        { encoding: 'base64' },
      );
    } else {
      return res
        .status(200)
        .send({ status: 401, message: 'User face not found!' });
    }

    // const Response = await axios.post(
    //   faceApiUrl,
    //   {
    //     old_images_base64: [userFace],
    //     new_images_base64: [userLogFace],
    //   },
    //   {
    //     timeout: 60000, // Set timeout to 1 minute (60,000 milliseconds)
    //   },
    // );
    // return res.status(200).send({ status: 200, data: Response.data });
    return res.status(200).send({
      status: 200,
      data: {
        match_result: true,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getAssignedBiometricUserList = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      branchID,
      departmentID,
      designationID,
      page,
      limit,
      assigned,
      exportData,
    } = req.body;
    let branchIds = branchID ? [branchID] : [];
    const paginationQuery = {};
    if (page && limit && !exportData) {
      paginationQuery.limit = limit;
      paginationQuery.offset = (page - 1) * limit;
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const { rows, count } = await EmployeeJoiningDetails.findAndCountAll({
      distinct: true,
      ...paginationQuery,
      where: {
        biometricCode: {
          [assigned ? Sequelize.Op.ne : Sequelize.Op.eq]: null,
          [assigned ? Sequelize.Op.ne : Sequelize.Op.eq]: '',
        },
      },
      attributes: [
        'joiningDate',
        'employeeJoiningDetailId',
        'userMasterID',
        'biometricCode',
        'biometricSerialNo',
        'employeeCode',
      ],
      include: [
        {
          required: true,
          model: UserMaster,
          attributes: ['displayName', 'userNumber', 'userMasterID'],
          where: {
            companyMasterId: companyMasterID,
            status: 1,
            ...userAccessCondition.where,
          },
          include: [
            ...userAccessCondition.includeModels,
            {
              model: EmployeeDesignation,
              where: {
                status: 1,
                ...(designationID && {
                  designationID: designationID,
                }),
                applicableDate: { [Sequelize.Op.lte]: new Date() },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date() } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              required: designationID ? true : false,
              attributes: ['designationID', 'applicableDate'],
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
                ...(departmentID && { departmentID: departmentID }),
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date() },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date() } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              required: departmentID ? true : false,
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
                ...(isArray(branchIds) &&
                  branchIds.length && { branchID: branchIds }),
                applicableDate: { [Sequelize.Op.lte]: new Date() },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date() } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              required: branchID ? true : false,
              attributes: ['branchID', 'applicableDate'],
              include: [
                {
                  model: BranchMaster,
                  as: 'branchMaster',
                  attributes: ['branchName'],
                },
              ],
            },
            {
              required: true,
              model: companyMaster,
              attributes: companyAttributes,
            },
          ],
        },
      ],
    });

    if (exportData) {
      const finalExportData = rows.map((e) => {
        return {
          'Company Name': e.userMaster.companyMaster.companyName,
          'Branch Name':
            e.userMaster?.employeeBranches[0]?.branchMaster?.branchName,
          'Department Name':
            e.userMaster?.employeeDepartments[0]?.department?.departmentName,
          'Designation Name':
            e.userMaster?.employeeDesignations[0]?.designation?.designationName,
          'Employee Name': e.userMaster.displayName,
          'Employee Number': e.userMaster.userNumber,
          'Employee Code': e.employeeCode ? e.employeeCode : '',
          'Biometric Code': e.biometricCode ? e.biometricCode : '',
          'Biometric Serial Number': e.biometricSerialNo
            ? e.biometricSerialNo
            : '',
          'Joining Date': moment(e.joiningDate, 'YYYY-MM-DD').format(
            'DD-MM-YYYY',
          ),
        };
      });
      return await generateExcel(
        finalExportData,
        'Assign Biometric Code to User',
        'xlsx',
        res,
      );
    }
    return res.status(200).json({
      status: 200,
      data: rows,
      totalcount: count,
    });
  } catch (error) {
    next(error);
  }
};

exports.addUpdatePetrolAllowance = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { userMasterID, petrolAllowance } = req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    if (!userMasterID) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: message.usermessage.notFoundMessage('User'),
      });
    }
    await createEmployeeJoiningDetailHistory(userMasterID, transaction);
    await EmployeeJoiningDetails.update(
      {
        petrolAllowance: petrolAllowance,
        updateBy,
        updateByIp,
      },
      {
        where: {
          userMasterID: userMasterID,
        },
      },
    );
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Petrol Allowance'),
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

async function updateBatch(userIds, salaryType) {
  if (!userIds.length) return;

  await EmployeeJoiningDetails.update(
    { salarytype: salaryType },
    {
      where: {
        userMasterID: {
          [Sequelize.Op.in]: userIds,
        },
      },
    },
  );
}

exports.updateWorkerType = async (req, res, next) => {
  try {
    const BATCH_SIZE = 10000;
    let offset = 0;

    // Pre-calculate company category employment types once
    const companyCategoryData = EmployementTypeList.filter(
      (e) => e.category === workerCategory.COMPANY,
    ).map((m) => m.value);

    while (true) {
      // Fetch 10k records at a time
      const allJoiningData = await EmployeeJoiningDetails.findAll({
        attributes: ['userMasterID', 'salarytype', 'employment'],
        limit: BATCH_SIZE,
        offset,
        raw: true,
      });

      // Stop when no more records
      if (!allJoiningData.length) break;

      // Maps for bulk updates
      const companyWorkerMap = [];
      const companyManagermap = [];
      const companyStaffmap = [];
      const companyApprenticemap = [];
      const contractualWorkermap = [];

      // Classify records
      for (const data of allJoiningData) {
        if (!data.employment) {
          companyStaffmap.push(data.userMasterID);
          continue;
        }

        // Company category employees
        if (companyCategoryData.includes(data.employment)) {
          if (data.salarytype === 'M') {
            companyManagermap.push(data.userMasterID);
            continue;
          }

          if (data.salarytype === 'W') {
            companyWorkerMap.push(data.userMasterID);
            continue;
          }

          companyStaffmap.push(data.userMasterID);
          continue;
        }

        // Contractual employees
        if (data.employment === employeementTypeEnumList.Contract) {
          contractualWorkermap.push(data.userMasterID);
          continue;
        }

        // Apprentice / Trainee
        if (
          [
            employeementTypeEnumList.Apprenticeship,
            employeementTypeEnumList.Trainee,
          ].includes(data.employment)
        ) {
          companyApprenticemap.push(data.userMasterID);
          continue;
        }
      }

      // Perform updates in parallel for current chunk
      await Promise.all([
        updateBatch(companyWorkerMap, workerTypesEnum.COMPANY_WORKER),
        updateBatch(companyManagermap, workerTypesEnum.COMPANY_MANAGER),
        updateBatch(companyStaffmap, workerTypesEnum.COMPANY_STAFF),
        updateBatch(companyApprenticemap, workerTypesEnum.COMPANY_APPRENTICE),
        updateBatch(contractualWorkermap, workerTypesEnum.CONTRACTUAL_WORKER),
      ]);

      // Move to next chunk
      offset += BATCH_SIZE;
    }

    return res.status(200).send({
      status: 200,
      message: 'Worker type update completed successfully',
    });
  } catch (error) {
    next(error);
  }
};

async function updateHistoryBatch(employeeJoiningDetailHistoryIDs, salaryType) {
  if (!employeeJoiningDetailHistoryIDs.length) return;

  await EmployeeJoiningDetailHistory.update(
    { salarytype: salaryType },
    {
      where: {
        employeeJoiningDetailHistoryID: {
          [Sequelize.Op.in]: employeeJoiningDetailHistoryIDs,
        },
      },
    },
  );
}

exports.updateWorkerTypeInHistory = async (req, res, next) => {
  try {
    const BATCH_SIZE = 10000;
    let offset = 0;

    // Pre-calculate company category employment types once
    const companyCategoryData = EmployementTypeList.filter(
      (e) => e.category === workerCategory.COMPANY,
    ).map((m) => m.value);

    while (true) {
      // Fetch 10k records at a time
      const allJoiningData = await EmployeeJoiningDetailHistory.findAll({
        attributes: [
          'employeeJoiningDetailHistoryID',
          'salarytype',
          'employment',
        ],
        limit: BATCH_SIZE,
        offset,
        raw: true,
      });

      // Stop when no more records
      if (!allJoiningData.length) break;

      // Maps for bulk updates
      const companyWorkerMap = [];
      const companyManagermap = [];
      const companyStaffmap = [];
      const companyApprenticemap = [];
      const contractualWorkermap = [];

      // Classify records
      for (const data of allJoiningData) {
        if (!data.employment) {
          companyStaffmap.push(data.employeeJoiningDetailHistoryID);
          continue;
        }

        // Company category employees
        if (companyCategoryData.includes(data.employment)) {
          if (data.salarytype === 'M') {
            companyManagermap.push(data.employeeJoiningDetailHistoryID);
            continue;
          }

          if (data.salarytype === 'W') {
            companyWorkerMap.push(data.employeeJoiningDetailHistoryID);
            continue;
          }

          companyStaffmap.push(data.employeeJoiningDetailHistoryID);
          continue;
        }

        // Contractual employees
        if (data.employment === employeementTypeEnumList.Contract) {
          contractualWorkermap.push(data.employeeJoiningDetailHistoryID);
          continue;
        }

        // Apprentice / Trainee
        if (
          [
            employeementTypeEnumList.Apprenticeship,
            employeementTypeEnumList.Trainee,
          ].includes(data.employment)
        ) {
          companyApprenticemap.push(data.employeeJoiningDetailHistoryID);
          continue;
        }
      }

      // Perform updates in parallel for current chunk
      await Promise.all([
        updateHistoryBatch(companyWorkerMap, workerTypesEnum.COMPANY_WORKER),
        updateHistoryBatch(companyManagermap, workerTypesEnum.COMPANY_MANAGER),
        updateHistoryBatch(companyStaffmap, workerTypesEnum.COMPANY_STAFF),
        updateHistoryBatch(
          companyApprenticemap,
          workerTypesEnum.COMPANY_APPRENTICE,
        ),
        updateHistoryBatch(
          contractualWorkermap,
          workerTypesEnum.CONTRACTUAL_WORKER,
        ),
      ]);

      // Move to next chunk
      offset += BATCH_SIZE;
    }

    return res.status(200).send({
      status: 200,
      message: 'Worker type update completed successfully',
    });
  } catch (error) {
    next(error);
  }
};

exports.checkDuplicateFields = async (req, res, next) => {
  try {
    const { data, companyMasterId } = req.body;

    const message = await getDuplicationValidation(
      data,
      null,
      companyMasterId,
      true,
    );

    if (message) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message,
      });
    }

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message,
    });
  } catch (error) {
    next(error);
  }
};

exports.addNameAsOnBank = async (req, res, next) => {
  try {
    const { companyMasterID } = req.body;
    if (!companyMasterID) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: message.usermessage.requiredMessage('companyMasterID'),
      });
    }
    const allJoiningData = await EmployeeJoiningDetails.findAll({
      attributes: ['employeeJoiningDetailId', 'userMasterID', 'nameAsBank'],
      where: {
        nameAsBank: { [Sequelize.Op.is]: null },
      },
      include: [
        {
          model: UserMaster,
          where: {
            companyMasterId: companyMasterID,
            status: 1,
          },
          attributes: [],
        },
      ],
    });

    const userMasterIds = allJoiningData.map((e) => +e.userMasterID);
    if (!userMasterIds.length) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.OK,
        message: 'No records found to update',
      });
    }

    const joiningHistoryData = await EmployeeJoiningDetailHistory.findAll({
      attributes: [
        [
          Sequelize.literal(
            'DISTINCT ON("userMasterID") "employeeJoiningDetailHistoryID"',
          ),
          'employeeJoiningDetailHistoryID',
        ],
        'userMasterID',
        'nameAsBank',
      ],
      where: {
        nameAsBank: {
          [Sequelize.Op.not]: null,
        },
        userMasterID: {
          [Sequelize.Op.in]: userMasterIds,
        },
      },
      order: [
        ['userMasterID', 'ASC'],
        ['employeeJoiningDetailHistoryID', 'DESC'],
      ],
    });

    const historyMap = new Map(
      joiningHistoryData.map((item) => [+item.userMasterID, item.nameAsBank]),
    );

    // Prepare update promises
    const updatePromises = allJoiningData
      .filter((item) => historyMap.has(+item.userMasterID))
      .map((item) =>
        EmployeeJoiningDetails.update(
          {
            nameAsBank: historyMap.get(+item.userMasterID),
          },
          {
            where: {
              employeeJoiningDetailId: item.employeeJoiningDetailId,
            },
          },
        ),
      );

    await Promise.all(updatePromises);

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: `${updatePromises.length} records updated successfully.`,
    });
  } catch (err) {
    next(err);
  }
};
