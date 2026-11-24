const UserMaster = require('../models/userMaster');
const message = require('../response_message/message');
const bcrypt = require('bcrypt');
const readXlsxFile = require('read-excel-file/node');
const { Sequelize, where } = require('sequelize');
const Op = Sequelize.Op;
const EmployeeShift = require('../models/employeeShift');
const Shift = require('../models/shift');
const EmployeeSalarypolicy = require('../models/employeeSalaryPolicy');
const SalaryPolicy = require('../models/salaryPolicy');
const EmployeeAttendancePolicy = require('../models/employeeAttendancePolicy');
const AttendancePolicy = require('../models/attendancePolicy');
const EmployeeDepartment = require('../models/employeeDepartment');
const EmployeeDesignation = require('../models/employeeDesignation');
const UserAddress = require('../models/userAddress');
const UserSkills = require('../models/userSkills');
const EmployeeBranch = require('../models/employeeBranch');
const EmployeeWeekOff = require('../models/employeeWeekOff');
const EmployeeHolidayPolicy = require('../models/employeeHolidayPolicy');
const sequelize = require('../config/database');
const CompanySubscriptionMaster = require('../models/subscriptionPlan');
const Designation = require('../models/designation');
const EmployeeReportTo = require('../models/employeeReportTo');
const Department = require('../models/department');
const CityMaster = require('../models/citymaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const BankMaster = require('../models/bankMaster');
const BranchMaster = require('../models/branchMaster');
const weekOffPolicy = require('../models/weekOffPolicy');
const holidayPolicy = require('../models/holidayPolicy');
const { executeQuery } = require('./common.controller');
const GradeStructure = require('../models/gradeStructure');
const GradeSalaryStructure = require('../models/gradeSalaryStructure');
const HrSalaryMaster = require('../models/hrSalaryMaster');
const StateMaster = require('../models/statemaster');
const Employeeemployeement = require('../models/employeeEmployeement');
const HrSalaryTransaction = require('../models/hrSalaryTransaction');
const RoleMaster = require('../models/roleMaster');
const companyMaster = require('../models/companyMaster');
const weekoffHolidayTran = require('../models/weekoffHolidayTran');
const fs = require('fs');
const UserRole = require('../models/userRole');
const GatePassAuthorizationRequest = require('../models/gatePassAuthorization');
const EmployeeGatepass = require('../models/employeeGatepass');
const {
  Nationality,
  PayrollFrequencyType,
  allowedAttendanceSources,
  authorizationMasterTypes,
  companyMasterIDENUM,
  roleType,
  FileUploadType,
  SkillCategoryType,
  saveraCompanyIDs,
  AuthorizationStatusType,
  AuthStatusInAuthorizationRequest,
  authorizationCriteriaType,
  notificationTitleTypes,
  notificationScreentTypes,
  BankDetailsStatusEnum,
  employeementTypeEnum,
  listWorkerTypes,
  employeementTypeEnumList,
  companyCreateByDefaultUser,
  listSaveraWorkerType,
  payheadMasterIdsMapping,
} = require('../utils/dbUtils');
const UserFamily = require('../models/userfamily');
const UserReportTO = require('../models/employeeReportTo');
const CompanyDocument = require('../models/companyDocument');
const EmployeeHolidayPolicyModel = require('../models/employeeHolidayPolicy');
const EmployeeDigitalSignature = require('../models/employeeDigitalSignature');
const HrLeaveBalance = require('../models/hrLeaveBalance');
const HRSalaryMaster = require('../models/hrSalaryMaster');
const path = require('path');
const {
  isValidDate,
  getUserSalaryMasterByMonth,
  assignSalaryStructure,
  employeeWeekoffPolicy,
  employeeHolidayPolicy,
  employeeDesignation,
  employeeBranch,
  employeeDepartment,
  asiaKolkataDateTime,
  getHolidayDates,
  ToformatAddress,
  destroyLeaveAuthAndApprovedLeaveAuth,
  add_WeekOffHoliday_With_Transaction,
  createEmployeeJoiningDetailHistory,
  sendBulkNotification,
  month_dict,
  checkEmployeePermission,
  getTimezone,
  checkDuplicateValueByFieldsInExcel,
  getDuplicationValidation,
  checkAlreayExistUsernumber,
  getParentChildCompany,
  getSalaryCycleDateAndMonthByDate,
  getEmployeeCodeCompanyWise,
  checkCompanySubscription,
  isStrongPassword,
  salaryIncrementAuthorizationHandling,
} = require('../utils/commonUtilFunctions');
const {
  generateExcel,
  generateAuthorozationExcel,
  generateAuthorozationExcelWithUserData,
  createZipFileForProfilePics,
} = require('../utils/exportData');
const CountryMaster = require('../models/countrymaster');
const UserDocument = require('../models/userDocument');
const {
  userAttributes,
  companyAttributes,
  statusCodes,
  companyPlanwiseForms,
  mehtaERPCompanyMasterIDs,
  erpStoredProcedures,
  orderByEmployeeMasterFields,
  validMaritalStatus,
  validBloodGroups,
} = require('../utils/commonVars');
const AuthorizationDetails = require('../models/AuthorizationDetails');
const AuthorizationCriteriaMaster = require('../models/authorizationCriteriaMaster');
const moment = require('moment');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');
const EmployeeLateEarlyPolicy = require('../models/employeeLateEarlyPolicy');
const LateEarlyPolicy = require('../models/lateEarlyPolicy');
const attendanceTransaction = require('../models/attendanceTransaction');
const EmployeeFoodAllowancePolicy = require('../models/employeeFoodAllowancePolicy');
const FoodAllowancePolicy = require('../models/foodAllowancePolicy');
const EmployeeAttendanceBonusPolicy = require('../models/empattandancebonuspolicy');
const AttendanceBonusPolicy = require('../models/attendanceBonusPolicy');
const EmployeeSalaryPolicy = require('../models/employeeSalaryPolicy');
const EmployeeWorkingLocation = require('../models/employeeWorkingLocation');
const WorkingLocation = require('../models/workingLocation');
const employeeLeavePolicy = require('../models/employeeLeavePolicy');
const HRSalaryFields = require('../models/hrSalaryFields');
const userFamily = require('../models/userfamily');
const UserEducation = require('../models/userEducation');
const UserExperience = require('../models/userExperience');
const empLeavePolicy = require('../models/empLeavePolicy');
const BankBranch = require('../models/bankBranch');
const JoiningDocument = require('../models/joiningDocument');
const DistrictMaster = require('../models/districtMaster');
const EmployeeSkillCategory = require('../models/employeeSkillCategory');
const EmployeeProject = require('../models/employeeProject');
const Project = require('../models/project');
const Contractor = require('../models/contractor');
const {
  convertNameToLocalName,
  pihMobileNo,
  othernumberLabel,
  showPayrollFrequency,
  validatePFNumber,
  validateAadharNumber,
  validatePanNumber,
  validateUAN,
  validateIfscCode,
  validateESICNumber,
  EmployementTypeList,
  ProjectName,
  projectNamesList,
  TIMEZONE,
} = require('../utils/labelUtils');
const EmployeeShortLeavePolicy = require('../models/employeeShortLeavePolicy');
const ShortLeave = require('../models/shortLeave');
const Payheadmaster = require('../models/payhead');
const Corporation = require('../models/corporation');
const ProductMaster = require('../models/productMaster');
const FormMaster = require('../models/formMaster');
const { Translate } = require('@google-cloud/translate').v2;
const ProductPermission = require('../models/productPermission');
const { sendEmailFornewuser } = require('../middleware/sendemail');
const EmployeeEmployeement = require('../models/employeeEmployeement');
const BankDetailRequest = require('../models/bankDetailRequest');
const bankDetailRequestService = require('../services/bankDetailRequestService');
const BankDetailAuthorization = require('../models/bankDetailAuthorization');
const bankDetailAuthorizationService = require('../services/bankDetailAuthorizationService');
const authorizationDetailService = require('../services/authorizationDetailService');
const userInboxService = require('../services/userInboxService');
const userMasterService = require('../services/userMasterService');
const EmployeeBonusPolicy = require('../models/employeeBonusPolicy');
const sql = require('mssql');
const { getErpDatabaseConfig } = require('../config/erpdatabase');
const HrLeaveMonthlyTrans = require('../models/hrLeavesMonthlyTrans');
const RolePermission = require('../models/rolePermission');
const OperationMaster = require('../models/operation');
const Timezone = require('../models/timezone');
const Inquiries = require('../models/inquiries');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const CompanySkillCategory = require('../models/companySkillCategory');
const WorkerTypeWiseShift = require('../models/workerTypeWiseShifts');
const UserInbox = require('../models/UserInbox');
const PIP = require('../models/pip');
const { required } = require('@hapi/joi');
const UserTracking = require('../models/userTracking');
const FormAuthorizationDetails = require('../models/AuthorizationDetails');

exports.postAddCompanyContact = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const salt = await bcrypt.genSalt(10);
    const formData = req.body;
    let {
      firstName,
      middleName,
      lastName,
      displayName,
      userNumber,
      gender,
      dob,
      maratialStatus,
      physicalDisability,
      isonboarding,
      companyMasterID,
      email,
      branchMasterID,
      applicableDatebranch,
      departmentID,
      applicableDatedepartment,
      designationID,
      applicableDatedesignation,
      roleMasterID,
      dob1,
      joiningDate,
      biometricCode,
      biometricSerialNo,
      overtime,
      preboardingID,
      otherContactNumber,
      admin,
      attendanceFrom,
      employeeType,
      joiningDocumentData,
      userNumberCountryMasterID,
      officalEmail,
      cugNumber,
      panName,
      panNumber,
      aadhaarNumber,
      aadhaarName,
      sendCredentialsInMail,
      userNamePrefix,
      attendancePolicyID,
      attendanceBonusPolicyId,
      lateEarlyPolicyMasterID,
      employeeLeavePolicyID,
      salaryPolicyID,
      foodAllowancePolicyId,
      weekOffPolicyID,
      holidayPolicyID,
      shortLeavePolicyID,
      bonusPolicyId,
      skillCategory = null,
      employeeCode = null,
    } = req.body;
    const mappedFields = req.body.mappedFields
      ? JSON.parse(req.body.mappedFields)
      : [];
    if (!isStrongPassword(req.body.password)) {
      await transaction.rollback();
      return res.status(200).json({
        status: statusCodes.BAD_REQUEST,
        message: message.errorMessage.STRONG_PASSWORD,
      });
    }
    const files = req.files;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    employeeLeavePolicyID = employeeLeavePolicyID
      ? employeeLeavePolicyID.split(',').map(Number)
      : [];
    sendCredentialsInMail = sendCredentialsInMail
      ? JSON.parse(sendCredentialsInMail)
      : false;
    let userCompanyName;
    let timezoneID = null;
    const companySubscriptionCheck =
      await checkCompanySubscription(companyMasterID);
    if (companySubscriptionCheck.status != 200) {
      await transaction.rollback();
      return res.status(200).json({
        status: companySubscriptionCheck.status,
        message: companySubscriptionCheck.message,
      });
    }
    const allParentChildCompanyData = companySubscriptionCheck?.companyData;
    if (companyMasterID != companyMasterIDENUM.TANKHWAPATRA) {
      userCompanyName = companySubscriptionCheck?.userCompanyData?.companyName;

      //timezone set
      if (ProjectName == projectNamesList.PIH) {
        timezoneID = (await getTimezone()) || null;
      } else if (ProjectName == projectNamesList.MARS) {
        timezoneID = (await getTimezone()) || null;
      } else {
        timezoneID =
          companySubscriptionCheck?.userCompanyData?.timezoneID ||
          (await getTimezone()) ||
          null;
      }
    }
    let companyMasterId = companyMasterID;
    let branchID = branchMasterID;
    const alreadyExistUserNumberCheck = await checkAlreayExistUsernumber({
      userNumber,
      companyMasterID,
    });

    if (alreadyExistUserNumberCheck.hasUser) {
      await transaction.rollback();
      return res.status(200).json({
        status: alreadyExistUserNumberCheck.status,
        message: alreadyExistUserNumberCheck.message,
      });
    }
    const employeeCodeData = await getEmployeeCodeCompanyWise({
      allCompanies: allParentChildCompanyData,
      companyMasterID: companyMasterID,
      employeeCode: employeeCode,
      joiningDate: joiningDate,
    });

    if (employeeCodeData.status != 200) {
      await transaction.rollback();
      return res.status(200).json({
        status: employeeCodeData.status,
        message: employeeCodeData.message,
      });
    }

    employeeCode = employeeCodeData.employeeCode;
    const entryCount = Object.keys(formData).filter((key) =>
      key.startsWith('joiningDocumentMasterID'),
    ).length;
    const joiningDocumnetData = [];
    let attachmentIndex = 0;
    for (let i = 0; i < entryCount; i++) {
      joiningDocumnetData.push({
        fromDate: formData[`fromDate${i}`],
        issueDate: formData[`issueDate${i}`],
        expiryDate: formData[`expiryDate${i}`],
        identificationNumber: formData[`identificationNumber${i}`],
        joiningDocumentMasterID: +formData[`joiningDocumentMasterID${i}`],
        designationWiseDocumentID: +formData[`designationWiseDocumentID${i}`],
        attachment:
          formData[`isChanged${i}`] === '0'
            ? [formData[`attachment${i}`]]
            : [
                'uploads/user/document/' +
                  files.attachment[attachmentIndex].filename,
              ],
        status: 1,
        createBy,
        createByIp: req.userDetails.userIpAddress,
      });
      if (formData[`isChanged${i}`] != '0') {
        attachmentIndex++;
      }
    }

    const password = bcrypt.hashSync(req.body.password, salt);
    let photo = '';
    if (files && files.photo) {
      photo = files.photo.filename;
    }

    let resetpassword = 1;
    if (companyMasterId == 165 || companyMasterId == 166) {
      resetpassword = 0;
    }
    let localFName = null;
    let localMName = null;
    let localLName = null;
    let localDisplayName = null;
    if (convertNameToLocalName) {
      if (saveraCompanyIDs.includes(+companyMasterID)) {
        try {
          const translate = new Translate({
            key: process.env.GOOGLE_CLOUD_TRANSLATE_API_KEY,
          });

          const response = await translate.translate(
            [firstName, middleName ? middleName : '', lastName],
            {
              from: 'en', // Explicitly specify English as the source
              to: 'mr',
              format: 'text',
              model: 'base',
            },
          );

          // Extract transliterated values
          localFName = response[0]?.[0] || null;
          localMName = response[0]?.[1] || null;
          localLName = response[0]?.[2] || null;

          localDisplayName = localMName
            ? `${localFName} ${localMName} ${localLName}`
            : `${localFName} ${localLName}`;
        } catch (error) {
          console.error('Error in translation:', error);
        }
      }
    }
    const customFieldData = {
      maritalStatus: null,
      uanNumber: null,
      bloodGroup: null,
      esicNumber: null,
      esicJoiningDate: null,
    };
    if (mappedFields && mappedFields.length > 0) {
      for (const field of mappedFields) {
        const value = field.value?.toString().trim();
        switch (field.fieldMapID) {
          // Marital Status
          case 2:
            if (!validMaritalStatus.includes(value)) {
              await transaction.rollback();
              return res.status(200).json({
                status: 400,
                message: `Marital Status can only be: ${validMaritalStatus.join(', ')}`,
              });
            }

            customFieldData.maritalStatus = value;
            break;

          // ESIC Joining Date
          case 3:
            if (!value || isNaN(Date.parse(value))) {
              await transaction.rollback();
              return res.status(200).json({
                status: 400,
                message: 'ESIC Joining Date must be a valid date',
              });
            }

            customFieldData.esicJoiningDate = value;
            break;

          // UAN Number
          case 4:
            if (!/^\d{12}$/.test(value)) {
              await transaction.rollback();
              return res.status(200).json({
                status: 400,
                message: 'UAN Number must contain exactly 12 digits',
              });
            }

            customFieldData.uanNumber = value;
            break;

          // ESIC Number
          case 6:
            if (!/^\d{10,17}$/.test(value)) {
              await transaction.rollback();
              return res.status(200).json({
                status: 400,
                message: 'ESIC Number must contain 10 to 17 digits only',
              });
            }

            customFieldData.esicNumber = value;
            break;

          // Blood Group
          case 7:
            if (!validBloodGroups.includes(value)) {
              await transaction.rollback();
              return res.status(200).json({
                status: 400,
                message: `Blood Group can only be: ${validBloodGroups.join(', ')}`,
              });
            }

            customFieldData.bloodGroup = value;
            break;

          default:
            break;
        }
      }
    }
    const createdUserData = await UserMaster.create(
      {
        firstName,
        middleName: middleName ? middleName : null,
        lastName,
        displayName,
        userNumber,
        photo,
        gender,
        dob,
        maratialStatus: customFieldData.maritalStatus,
        physicalDisability,
        isonboarding,
        companyMasterId,
        password: password,
        email: email,
        admin: admin ? admin : 0,
        status: '1',
        resetpassword: resetpassword,
        preboardingID,
        otherContactNumber,
        createBy,
        createByIp: req.userDetails.userIpAddress,
        userNumberCountryMasterID: +userNumberCountryMasterID
          ? +userNumberCountryMasterID
          : null,
        localFName,
        localMName,
        localLName,
        localDisplayName,
        officalEmail,
        cugNumber,
        userNamePrefix,
        timezoneID: timezoneID,
      },
      { transaction },
    );

    const createQueryArray = [];
    //----------------for skill Category -----------------

    if (skillCategory) {
      const joiningMonth = moment(joiningDate, 'YYYY-MM-DD').format('YYYYMM');
      createQueryArray.push(
        EmployeeSkillCategory.create(
          {
            userMasterID: createdUserData.userMasterID,
            skillCategory,
            applicableYYYYMM: +joiningMonth,
            status: '1',
          },
          { user: req.userDetails, transaction },
        ),
      );
    }

    // let update_data = await sequelize.transaction(async (t) => {
    if (branchID && applicableDatebranch) {
      createQueryArray.push(
        EmployeeBranch.create(
          {
            userMasterID: createdUserData.userMasterID,
            branchID: +branchID,
            applicableDate: new Date(applicableDatebranch),
            status: '1',
            createBy,
            createByIp: req.userDetails.userIpAddress,
          },
          { transaction },
        ),
      );
    }
    if (departmentID && applicableDatedepartment) {
      createQueryArray.push(
        EmployeeDepartment.create(
          {
            userMasterID: createdUserData.userMasterID,
            departmentID: +departmentID,
            applicableDate: new Date(applicableDatedepartment),
            status: '1',
            createBy,
            createByIp: req.userDetails.userIpAddress,
          },
          { transaction },
        ),
      );
    }
    if (designationID && applicableDatedesignation) {
      createQueryArray.push(
        EmployeeDesignation.create(
          {
            userMasterID: createdUserData.userMasterID,
            designationID: +designationID,
            applicableDate: new Date(applicableDatedesignation),
            status: '1',
            createBy,
            createByIp: req.userDetails.userIpAddress,
          },
          { transaction },
        ),
      );
    }
    if (roleMasterID) {
      createQueryArray.push(
        UserRole.create(
          {
            userMasterID: createdUserData.userMasterID,
            roleMasterID,
          },
          { user: req.userDetails, transaction },
        ),
      );
    }

    if (
      dob1 ||
      joiningDate ||
      biometricCode ||
      biometricSerialNo ||
      overtime ||
      employeeCode
    ) {
      // biometricSerialNo = biometricSerialNo.join(',');
      biometricSerialNo =
        biometricSerialNo &&
        biometricSerialNo != 'undefined' &&
        Array.isArray(biometricSerialNo)
          ? biometricSerialNo.join(',')
          : biometricSerialNo && biometricSerialNo != 'undefined'
            ? [biometricSerialNo].join(',')
            : null;

      let aadhaarFrontPhoto = null;
      let aadhaarBackPhoto = null;
      let panPhoto = null;
      if (files) {
        const front =
          files?.['aadhaar[aadhaarFrontPhoto]']?.[0]?.filename || '';
        const back = files?.['aadhaar[aadhaarBackPhoto]']?.[0]?.filename || '';
        const pan = files?.['panPhoto']?.[0]?.filename || '';

        aadhaarFrontPhoto = front ? front : '';
        aadhaarBackPhoto = back ? back : '';
        panPhoto = pan ? pan : '';
      }

      // if adhar or pan exist

      if (aadhaarNumber || panNumber) {
        const data = {
          pancard: panNumber,
          adharCard: aadhaarNumber,
        };

        const message = await getDuplicationValidation(
          data,
          null,
          companyMasterID,
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

      if (
        aadhaarName ||
        aadhaarNumber ||
        aadhaarFrontPhoto ||
        aadhaarBackPhoto
      ) {
        insert_db_status = await UserDocument.create(
          {
            userMasterID: createdUserData.userMasterID,
            documentListID: 1,
            document: aadhaarFrontPhoto,
            createBy,
            createByIp: req.userDetails.createByIp,
            documentNumber: aadhaarNumber,
            nameOnDocument: aadhaarName,
            document1: aadhaarBackPhoto,
            verifyStatus: 1,
            verifyBy: createBy,
            isMultiPageAadharCard: true,
          },
          { transaction },
        );
      }
      if (panName || panNumber || panPhoto) {
        insert_db_status = await UserDocument.create(
          {
            userMasterID: createdUserData.userMasterID,
            documentListID: 2,
            document: panPhoto,
            createBy,
            createByIp: req.userDetails.createByIp,
            documentNumber: panNumber,
            nameOnDocument: panName,
            verifyStatus: 1,
            verifyBy: createBy,
          },
          { transaction },
        );
      }

      createQueryArray.push(
        EmployeeJoiningDetails.create(
          {
            userMasterID: createdUserData.userMasterID,
            dob: dob1,
            joiningDate: joiningDate,
            attendanceFrom,
            biometricCode: biometricCode,
            nameAsBank: displayName,
            biometricSerialNo: biometricSerialNo,
            overtime: overtime,
            employeeType,
            createBy,
            createByIp: req.userDetails.userIpAddress,
            adharCard: aadhaarNumber ? aadhaarNumber : null,
            adharName: aadhaarName ? aadhaarName : null,
            pancard: panNumber ? panNumber : null,
            panPhoto: panPhoto ? panPhoto : null,
            adharPhoto: aadhaarFrontPhoto ? aadhaarFrontPhoto : null,
            adharPhoto1: aadhaarBackPhoto ? aadhaarBackPhoto : null,
            skillCategory,
            employeeCode: employeeCode ? employeeCode : null,
            uanNumber: customFieldData.uanNumber,
            bloodgroup: customFieldData.bloodGroup,
            esicNumber: customFieldData.esicNumber,
            esicjoiningDate: customFieldData.esicJoiningDate,
          },
          { transaction },
        ),
      );
    }
    if (joiningDocumnetData.length > 0) {
      const createData = [];
      for (doc of joiningDocumnetData) {
        const create = {
          attachment: [doc.attachment],
          fromDate: doc.fromDate && doc.fromDate != '' ? doc.fromDate : null,
          issueDate:
            doc.issueDate && doc.issueDate != '' ? doc.issueDate : null,
          expiryDate:
            doc.expiryDate && doc.expiryDate != '' ? doc.expiryDate : null,
          identificationNumber: doc.identificationNumber,
          userMasterID: createdUserData.userMasterID,
          joiningDocumentMasterID: doc.joiningDocumentMasterID,
          designationWiseDocumentID: doc.designationWiseDocumentID,
          createBy,
          createByIp: req.userDetails.userIpAddress,
        };
        createData.push(create);
      }
      if (createData.length > 0) {
        createQueryArray.push(
          JoiningDocument.bulkCreate(createData, {
            hooks: false,
            transaction,
          }),
        );
      }
    }
    const isValid = (val) =>
      val !== null &&
      val !== undefined &&
      val !== 'null' &&
      val !== 'undefined' &&
      val !== '';
    if (isValid(joiningDate)) {
      if (isValid(attendancePolicyID)) {
        createQueryArray.push(
          EmployeeAttendancePolicy.create(
            {
              userMasterID: createdUserData.userMasterID,
              attendancePolicyID,
              startDate: joiningDate,
              createBy,
              createByIp,
            },
            { transaction },
          ),
        );
      }

      if (isValid(attendanceBonusPolicyId)) {
        createQueryArray.push(
          EmployeeAttendanceBonusPolicy.create(
            {
              userMasterID: createdUserData.userMasterID,
              attendanceBonusPolicyId,
              startDate: joiningDate,
            },
            { user: req.userDetails, individualHooks: true, transaction },
          ),
        );
      }

      if (isValid(lateEarlyPolicyMasterID)) {
        createQueryArray.push(
          EmployeeLateEarlyPolicy.create(
            {
              userMasterID: createdUserData.userMasterID,
              lateEarlyPolicyMasterID,
              startDate: joiningDate,
              createBy,
              createByIp,
            },
            { transaction },
          ),
        );
      }

      if (isValid(employeeLeavePolicyID) && employeeLeavePolicyID.length) {
        createQueryArray.push(
          empLeavePolicy.create(
            {
              userMasterID: createdUserData.userMasterID,
              employeeLeavePolicyID: employeeLeavePolicyID,
              applicableDate: joiningDate,
            },
            { user: req.userDetails, individualHooks: true, transaction },
          ),
        );
      }

      let salaryPolicyApplicableDate = moment(joiningDate, 'YYYY-MM-DD')
        .startOf('month')
        .format('YYYY-MM-DD');

      if (isValid(salaryPolicyID)) {
        const salaryPolicy = await SalaryPolicy.findOne({
          where: {
            salaryPolicyID,
          },
        });

        if (salaryPolicy) {
          const { start_date } = getSalaryCycleDateAndMonthByDate(
            salaryPolicy,
            joiningDate,
          );

          salaryPolicyApplicableDate = start_date;
        }

        createQueryArray.push(
          EmployeeSalaryPolicy.create(
            {
              userMasterID: createdUserData.userMasterID,
              salaryPolicyID,
              startDate: salaryPolicyApplicableDate,
              createBy,
              createByIp,
            },
            { transaction },
          ),
        );
      }

      if (isValid(foodAllowancePolicyId)) {
        createQueryArray.push(
          EmployeeFoodAllowancePolicy.create(
            {
              userMasterID: createdUserData.userMasterID,
              foodAllowancePolicyId,
              startDate: joiningDate,
            },
            { user: req.userDetails, individualHooks: true, transaction },
          ),
        );
      }

      if (isValid(shortLeavePolicyID)) {
        createQueryArray.push(
          EmployeeShortLeavePolicy.create(
            {
              userMasterID: createdUserData.userMasterID,
              shortLeavePolicyID,
              applicableDate: joiningDate,
            },
            { user: req.userDetails, individualHooks: true, transaction },
          ),
        );
      }

      if (isValid(bonusPolicyId)) {
        const applicableYYYYMM = moment(joiningDate).format('YYYYMM');

        createQueryArray.push(
          EmployeeBonusPolicy.create(
            {
              userMasterID: createdUserData.userMasterID,
              bonusPolicyId,
              applicableYYYYMM,
            },
            { user: req.userDetails, individualHooks: true, transaction },
          ),
        );
      }

      const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
      const baseDate = moment(currentDate, 'YYYY-MM-DD');

      if (isValid(weekOffPolicyID)) {
        await EmployeeWeekOff.create(
          {
            userMasterID: createdUserData.userMasterID,
            weekOffPolicyID,
            applicableDate: salaryPolicyApplicableDate,
            createBy,
            createByIp,
          },
          { transaction },
        );

        await add_WeekOffHoliday_With_Transaction(
          companyMasterID,
          [createdUserData.userMasterID],
          salaryPolicyApplicableDate,
          weekOffPolicyID,
          null,
          false,
          null,
          transaction,
        );
      }

      if (isValid(holidayPolicyID)) {
        const holiday_Policy = await holidayPolicy.findOne({
          where: {
            holidayPolicyID,
          },
        });

        let holidayPolicyStartDate = baseDate;

        if (holiday_Policy) {
          holidayPolicyStartDate = moment(
            holiday_Policy.holidayYear,
            'YYYY',
          ).startOf('year');
        }

        const currentYearStartDate = holidayPolicyStartDate
          .clone()
          .startOf('year')
          .format('YYYY-MM-DD');

        await EmployeeHolidayPolicy.create(
          {
            userMasterID: createdUserData.userMasterID,
            holidayPolicyID,
            applicableDate: currentYearStartDate,
            createBy,
            createByIp,
          },
          { transaction },
        );

        await add_WeekOffHoliday_With_Transaction(
          companyMasterID,
          [createdUserData.userMasterID],
          currentYearStartDate,
          null,
          holidayPolicyID,
          false,
          null,
          transaction,
        );
      }
    }

    await Promise.all(createQueryArray);

    await transaction.commit();
    if (sendCredentialsInMail && email) {
      await sendEmailFornewuser({
        email,
        mobile: userNumber,
        password: req.body.password,
        companyName: userCompanyName,
        employeeName: displayName,
      });
    }
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('User'),
      data: [],
      user: createdUserData,
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.postAddCompanyContactV2 = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const salt = await bcrypt.genSalt(10);
    let {
      firstName,
      middleName,
      lastName,
      displayName,
      userNumber,
      userNumberCountryMasterID,
      gender,
      dob,
      companyMasterID,
      email,
      branchMasterID,
      departmentID,
      designationID,
      joiningDate,
      inquiryID,
    } = req.body;

    if (dob) {
      const today = new Date();
      const birthDate = new Date(dob);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 18) {
        await transaction.rollback();
        return res.status(200).json({
          status: 400,
          message: 'User must be at least 18 years old.',
        });
      }
    }

    const createBy = companyCreateByDefaultUser;
    const createByIp = null;
    let userCompanyName;

    if (companyMasterID != companyMasterIDENUM.TANKHWAPATRA) {
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
      userCompanyName = existCompanyData?.companyName;
      const condition = {
        // companyMasterID: { companyMasterID },
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
        // condition.parentCompanyMasterID = existCompanyData.companyMasterID;
      }
      const companyData = await companyMaster.findAll({
        where: condition,
        include: [
          {
            required: false,
            model: CompanySubscriptionMaster,
            where: { status: 1 },
          },
        ],
      });
      const findParentCompany = companyData.find(
        (e) => +e.parentCompanyMasterID == 0,
      );
      const companyMasterIDs = companyData.map((e) => +e.companyMasterID);

      const companySubscription =
        findParentCompany?.companySubscriptions?.[0] || null;

      if (companySubscription) {
        const totalCompanyUser = await UserMaster.count({
          raw: true,
          where: {
            companyMasterId: {
              [Sequelize.Op.in]: companyMasterIDs,
            },
            status: 1,
          },
        });

        if (totalCompanyUser >= companySubscription.totalUser) {
          await transaction.rollback();

          return res.status(200).json({
            status: 401,
            message:
              'Your user limit has been reached. Please upgrade your plan.',
          });
        }
      } else {
        await transaction.rollback();

        return res.status(200).json({
          status: 401,
          message: message.usermessage.usersubscribeplan,
        });
      }
    }

    let companyMasterId = companyMasterID;
    let branchID = branchMasterID;
    const alreadyExistUserNumberCheck = await checkAlreayExistUsernumber({
      userNumber,
      companyMasterID,
    });
    if (alreadyExistUserNumberCheck.hasUser) {
      await transaction.rollback();
      return res.status(200).json({
        status: alreadyExistUserNumberCheck.status,
        message: alreadyExistUserNumberCheck.message,
      });
    } else {
      const password = bcrypt.hashSync(req.body.password, salt);
      let photo = '';

      let resetpassword = 1;
      if (
        companyMasterId ==
          companyMasterIDENUM.CHATTERJEE_CLEANING_ARTS_SERVICES_LIMITED ||
        companyMasterId == companyMasterIDENUM.MRINMOYEE_SUPPLY_PVT_LTD
      ) {
        resetpassword = 0;
      }
      let localFName = null;
      let localMName = null;
      let localLName = null;
      let localDisplayName = null;
      if (convertNameToLocalName) {
        if (saveraCompanyIDs.includes(+companyMasterID)) {
          try {
            const translate = new Translate({
              key: process.env.GOOGLE_CLOUD_TRANSLATE_API_KEY,
            });

            const response = await translate.translate(
              [firstName, middleName ? middleName : '', lastName],
              {
                from: 'en', // Explicitly specify English as the source
                to: 'mr',
                format: 'text',
                model: 'base',
              },
            );

            // Extract transliterated values
            localFName = response[0]?.[0] || null;
            localMName = response[0]?.[1] || null;
            localLName = response[0]?.[2] || null;

            localDisplayName = localMName
              ? `${localFName} ${localMName} ${localLName}`
              : `${localFName} ${localLName}`;
          } catch (error) {
            console.error('Error in translation:', error);
          }
        }
      }
      const createdUserData = await UserMaster.create(
        {
          firstName,
          middleName: middleName ? middleName : null,
          lastName,
          displayName,
          userNumber,
          userNumberCountryMasterID: +userNumberCountryMasterID
            ? +userNumberCountryMasterID
            : null,
          photo,
          gender,
          dob,
          companyMasterId,
          password: password,
          email: email,
          admin: 0,
          status: '1',
          resetpassword: resetpassword,
          createBy,
          createByIp,
          localFName,
          localMName,
          localLName,
          localDisplayName,
        },
        { transaction },
      );

      const createQueryArray = [];
      if (branchID && joiningDate) {
        createQueryArray.push(
          EmployeeBranch.create(
            {
              userMasterID: createdUserData.userMasterID,
              branchID: +branchID,
              applicableDate: new Date(joiningDate),
              status: '1',
              createBy,
              createByIp,
            },
            { transaction },
          ),
        );
      }
      if (departmentID && joiningDate) {
        createQueryArray.push(
          EmployeeDepartment.create(
            {
              userMasterID: createdUserData.userMasterID,
              departmentID: +departmentID,
              applicableDate: new Date(joiningDate),
              status: '1',
              createBy,
              createByIp,
            },
            { transaction },
          ),
        );
      }
      if (designationID && joiningDate) {
        createQueryArray.push(
          EmployeeDesignation.create(
            {
              userMasterID: createdUserData.userMasterID,
              designationID: +designationID,
              applicableDate: new Date(joiningDate),
              status: '1',
              createBy,
              createByIp,
            },
            { transaction },
          ),
        );
      }

      const findRoleMasterID = await RoleMaster.findOne({
        where: {
          companyMasterID: companyMasterId,
          roleName: { [Sequelize.Op.iLike]: 'admin' },
        },
      });

      if (findRoleMasterID) {
        const roleMasterID = findRoleMasterID.roleMasterID;
        createQueryArray.push(
          UserRole.create(
            {
              userMasterID: createdUserData.userMasterID,
              roleMasterID,
              createBy,
              createByIp,
            },
            { hooks: false, transaction },
          ),
        );
      }

      if (dob || joiningDate) {
        createQueryArray.push(
          EmployeeJoiningDetails.create(
            {
              userMasterID: createdUserData.userMasterID,
              dob,
              joiningDate,
              createBy,
              createByIp,
            },
            { transaction },
          ),
        );
      }

      await Promise.all(createQueryArray);

      if (inquiryID) {
        await Inquiries.update(
          { completedStep: 5 },
          { where: { inquiryID }, transaction },
        );
      }

      await transaction.commit();
      if (email) {
        await sendEmailFornewuser({
          email,
          mobile: userNumber,
          password: req.body.password,
          companyName: userCompanyName,
          employeeName: displayName,
        });
      }
      return res.status(200).json({
        status: 200,
        message: message.usermessage.addMessage('User'),
        data: [],
        user: createdUserData,
      });
    }
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getCompanyContactId = async (req, res, next) => {
  try {
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    let get_one_data = await UserMaster.findOne({
      where: { userMasterID: req.params.id, status: ['0', '1'] },
      include: [
        { model: companyMaster },
        { model: EmployeeJoiningDetails, attributes: ['salarytype'] },
        {
          model: PIP,
          attributes: ['userMasterID'],
          as: 'employees',
          required: false,
          where: {
            startDate: {
              [Sequelize.Op.lte]: currentDate,
            },
            endDate: {
              [Sequelize.Op.gte]: currentDate,
            },
            authorizationStatus: 3,
          },
        },
        
      ],
      raw: true,
    });


const refByUser = await UserMaster.findOne({
  where: {
    userMasterID: get_one_data?.referenceBy,
    status: ['0', '1'],
  },
  attributes: [
    'userMasterID',
    'displayName',
    'companyMasterId',
  ],
  raw: true,
});

if (refByUser?.companyMasterId) {
  const refByCompany = await companyMaster.findOne({
    where: {
      companyMasterID: refByUser.companyMasterId,
    },
    attributes: ['companyName'],
    raw: true,
  });

  refByUser.companyName = refByCompany?.companyName || null;
}

get_one_data.ref_By = refByUser || null;


    const currentMonth = moment().format('YYYYMM');

    const empSkillCategory = await EmployeeSkillCategory.findOne({
      where: {
        userMasterID: req.params.id,
        applicableYYYYMM: {
          [Sequelize.Op.lte]: +currentMonth,
        },
        [Sequelize.Op.or]: [
          {
            endYYYYMM: {
              [Sequelize.Op.gte]: +currentMonth,
            },
          },
          {
            endYYYYMM: {
              [Sequelize.Op.is]: null,
            },
          },
        ],
      },
    });

    get_one_data.skillCategory = empSkillCategory?.skillCategory || null;

    const userRights = await UserRole.findOne({
      raw: true,
      where: {
        userMasterID: req.params.id,
        roleMasterID: { [Sequelize.Op.ne]: null },
      },
      include: [{ model: RoleMaster }],
    });

    get_one_data.role = userRights ? userRights['roleMaster.roleName'] : '';
    get_one_data.roleMasterID = userRights ? userRights.roleMasterID : null;

    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.postUpdateCompanyContact = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      userMasterID,
      firstName,
      middleName,
      displayName,
      lastName,
      userNumber,
      gender,
      dob,
      maratialStatus,
      physicalDisability,
      isonboarding,
      email,
      roleMasterID,
      status,
      removeFace,
      otherContactNumber,
      isPhotoLock,
      userNumberCountryMasterID,
      cugNumber,
      officalEmail,
      userNamePrefix,
      timezoneID,
      tdsDeduction = true,
    } = await req.body;

    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    let get_one_data = await UserMaster.findOne({
      where: { userMasterID: userMasterID },
      include: [{ required: false, model: UserRole }],
    });

    if (!get_one_data) {
      await transaction.rollback();
      return res.status(200).json({
        status: 200,
        message: message.usermessage.notFoundMessage('User'),
        data: {},
      });
    }

    if (removeFace) {
      if (get_one_data.userFaces && get_one_data.userFaces.length != 0) {
        for (let item of get_one_data.userFaces) {
          const filePath = path.join(
            __dirname,
            `../uploads/user-faces/${item}`,
          );

          fs.unlink(filePath, function (err) {});
        }
      }
    }
    const alreadyExistUserNumberCheck = await checkAlreayExistUsernumber({
      userNumber,
      companyMasterID: get_one_data.companyMasterId,
      userMasterID,
    });

    if (alreadyExistUserNumberCheck.hasUser) {
      await transaction.rollback();
      return res.status(200).json({
        status: alreadyExistUserNumberCheck.status,
        message: alreadyExistUserNumberCheck.message,
      });
    }

    const roleId =
      get_one_data.userRoles && get_one_data.userRoles.length > 0
        ? get_one_data.userRoles[0].roleMasterID
        : null;

    if (roleMasterID && roleMasterID != roleId) {
      await UserRole.destroy({
        where: {
          userMasterID: userMasterID,
        },
        hooks: true,
        individualHooks: true,
        user: req.userDetails,
        transaction,
      });

      await UserRole.create(
        {
          userMasterID,
          roleMasterID,
        },
        { user: req.userDetails, transaction },
      );
    }

    if (tdsDeduction == 'false') {
      tdsDeduction = false;
    } else {
      tdsDeduction = true;
    }

    const updateData = {
      firstName,
      middleName: middleName ? middleName : null,
      lastName,
      userNumber,
      displayName,
      gender,
      dob,
      maratialStatus,
      physicalDisability: req.body.physicalDisability,
      isonboarding,
      email,
      status,
      updateBy,
      updateByIp,
      userFaces: removeFace ? null : get_one_data.userFaces,
      facePhotoArray: removeFace ? null : get_one_data.facePhotoArray,
      otherContactNumber,
      userNumberCountryMasterID: +userNumberCountryMasterID
        ? +userNumberCountryMasterID
        : null,
      localFName: null,
      localMName: null,
      localLName: null,
      localDisplayName: null,
      cugNumber,
      officalEmail,
      isPhotoLock: isPhotoLock == null ? 1 : +isPhotoLock,
      userNamePrefix: userNamePrefix ? userNamePrefix : null,
      tdsDeduction,
      ...(timezoneID != null && { timezoneID }),
    };
    if (convertNameToLocalName) {
      if (saveraCompanyIDs.includes(+get_one_data.companyMasterId)) {
        try {
          const translate = new Translate({
            key: process.env.GOOGLE_CLOUD_TRANSLATE_API_KEY,
          });

          const response = await translate.translate(
            [firstName, middleName ? middleName : '', lastName],
            {
              from: 'en', // Explicitly specify English as the source
              to: 'mr',
              format: 'text',
              model: 'base',
            },
          );

          // Extract transliterated values
          updateData.localFName = response[0]?.[0] || null;
          updateData.localMName = response[0]?.[1] || null;
          updateData.localLName = response[0]?.[2] || null;

          updateData.localDisplayName = localMName
            ? `${localFName} ${localMName} ${localLName}`
            : `${localFName} ${localLName}`;
        } catch (error) {
          console.error('Error in translation:', error);
        }
      }
    }
    if (req.file) {
      updateData.photo = req.file.filename;
    }
    await UserMaster.update(updateData, {
      where: { userMasterID: userMasterID },
      transaction,
    });

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('User'),
      data: {},
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.postDeleteCompanyContactById = async (req, res, next) => {
  try {
    let { userMasterID } = req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    await UserMaster.update(
      {
        status: '2',
        updateBy,
        updateByIp,
      },
      {
        where: { userMasterID: userMasterID },
      },
    );
    await UserTracking.update(
      {
        trackStatus: 0,
      },
      {
        where: { trackStatus: 1, userMasterID: userMasterID },
      },
    );
    await EmployeeReportTo.destroy({
      where: {
        userMasterID: userMasterID,
      },
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('User'),
      data: {},
    });
  } catch (err) {
    next(err.message);
  }
};

exports.poststatuschange = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { userMasterID, status, deactiveRemarks, leavingDate } = await req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const findUserToStatusChange = await UserMaster.findOne({
      where: {
        userMasterID: userMasterID,
      },
      transaction,
      raw: true,
    });
    if (status == '1') {
      const userCompanyMasterID = findUserToStatusChange.companyMasterId;
      if (userCompanyMasterID != companyMasterIDENUM.TANKHWAPATRA) {
        const existCompanyData = await companyMaster.findOne({
          where: {
            companyMasterID: userCompanyMasterID,
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
              parentCompanyMasterID: +userCompanyMasterID,
            },
            {
              companyMasterID: +userCompanyMasterID,
            },
          ];
        }
        const companyData = await companyMaster.findAll({
          where: condition,
          include: [
            {
              required: false,
              model: CompanySubscriptionMaster,
              where: { status: 1 },
            },
          ],
        });
        const findParentCompany = companyData.find(
          (e) => +e.parentCompanyMasterID == 0,
        );
        const companyMasterIDs = companyData.map((e) => +e.companyMasterID);

        const companySubscription =
          findParentCompany?.companySubscriptions?.[0] || null;

        if (companySubscription) {
          const totalCompanyUser = await UserMaster.count({
            raw: true,
            where: {
              companyMasterId: {
                [Sequelize.Op.in]: companyMasterIDs,
              },
              status: 1,
            },
          });

          if (totalCompanyUser >= companySubscription.totalUser) {
            await transaction.rollback();
            return res.status(200).json({
              status: 401,
              message:
                'Your user limit has been reached. Please upgrade your plan.',
            });
          }
        } else {
          await transaction.rollback();
          return res.status(200).json({
            status: 401,
            message: message.usermessage.usersubscribeplan,
          });
        }
      }
      if (findUserToStatusChange) {
        const alreadyExistUserNumberCheck = await checkAlreayExistUsernumber({
          userNumber: findUserToStatusChange.userNumber,
          companyMasterID: findUserToStatusChange.companyMasterId,
        });

        if (alreadyExistUserNumberCheck.hasUser) {
          await transaction.rollback();
          return res.status(200).json({
            status: alreadyExistUserNumberCheck.status,
            message: alreadyExistUserNumberCheck.message,
          });
        } else {
          if (findUserToStatusChange.deactiveDate) {
            const weekoffID = await employeeWeekoffPolicy(
              userMasterID,
              currentDate,
            );
            const holidayID = await employeeHolidayPolicy(
              userMasterID,
              new Date(),
            );
            if (weekoffID) {
              await add_WeekOffHoliday_With_Transaction(
                findUserToStatusChange.companyMasterId,
                [userMasterID],
                findUserToStatusChange.deactiveDate,
                weekoffID ? weekoffID.weekOffPolicyID : null,
                null,
                false,
                weekoffID.endDate,
                transaction,
              );
            }
            if (holidayID) {
              await add_WeekOffHoliday_With_Transaction(
                findUserToStatusChange.companyMasterId,
                [userMasterID],
                findUserToStatusChange.deactiveDate,
                null,
                holidayID ? holidayID.holidayPolicyID : null,
                false,
                holidayID.endDate,
                transaction,
              );
            }
          }
        }
      }
    }

    if (status == '0') {
      await UserTracking.update(
        {
          trackStatus: 0,
        },
        {
          where: { trackStatus: 1, userMasterID: userMasterID },
          transaction,
        },
      );

      await EmployeeReportTo.update(
        {
          status: 0,
        },
        {
          where: { userMasterID: userMasterID },
          transaction,
          user: req.userDetails,
        },
      );
      const findEmployeeJoiningData = await EmployeeJoiningDetails.findOne({
        where: {
          userMasterID: userMasterID,
        },
        transaction,
        raw: true,
      });

      const joiningDate = findEmployeeJoiningData?.joiningDate || null;
      const existingLeavingDate = findEmployeeJoiningData?.leavingDate || null;
      const leaving_date = leavingDate || existingLeavingDate || null;

      if (
        leaving_date &&
        joiningDate &&
        new Date(leaving_date) < new Date(joiningDate)
      ) {
        await transaction.rollback();
        return res.status(statusCodes.OK).json({
          status: statusCodes.BAD_REQUEST,
          message: `Relieving date must be greater than the joining date.`,
        });
      }

      if (leaving_date && !existingLeavingDate) {
        const checkAttnCal = await HrLeaveMonthlyTrans.findOne({
          where: {
            userMasterID: findEmployeeJoiningData.userMasterID,
            monthenddate: {
              [Sequelize.Op.gte]: leaving_date,
            },
            verified: 1,
          },
        });

        if (checkAttnCal) {
          await transaction.rollback();
          return res.status(statusCodes.OK).json({
            status: statusCodes.BAD_REQUEST,
            message: `You cannot change the relieving date because attendance for ${month_dict[String(checkAttnCal.AttnYearMon).slice(4, 6)] + '-' + String(checkAttnCal.AttnYearMon).slice(0, 4)} has already been verified.`,
          });
        }
      }

      if (
        !findUserToStatusChange.isFNF &&
        !findEmployeeJoiningData.leavingDate
      ) {
        await createEmployeeJoiningDetailHistory(userMasterID, transaction);
        await EmployeeJoiningDetails.update(
          {
            leavingDate: leavingDate,
            updateBy,
            updateByIp,
          },
          {
            where: { userMasterID: userMasterID },
            transaction,
          },
        );
      }
      if (
        findUserToStatusChange &&
        mehtaERPCompanyMasterIDs.includes(
          findUserToStatusChange.companyMasterId,
        ) &&
        findUserToStatusChange.AccountID &&
        leavingDate
      ) {
        await updateLeavingDateToERP(
          findUserToStatusChange.AccountID,
          leavingDate,
          findUserToStatusChange.companyMasterId,
        );
      }
    }
    await UserMaster.update(
      {
        status,
        deactiveDate: status == '0' ? currentDate : null,
        deactiveRemarks: status == '0' ? deactiveRemarks : null,
      },
      {
        where: { userMasterID: userMasterID },
        transaction,
      },
    );
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message:
        status == '1'
          ? message.usermessage.activeMessage('User')
          : message.usermessage.deactiveMessage('User'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};
async function updateLeavingDateToERP(
  AccountMasterid,
  leavingDate,
  companyMasterID,
) {
  const erpConfig = getErpDatabaseConfig(companyMasterID);
  console.log('[GET_ERP_ACCOUNT][DB_CONFIG_READY]');

  sql.connect(erpConfig, async function (err) {
    if (err) {
      console.error('[GET_ERP_ACCOUNT][DB_CONNECTION_FAILED]', err);
      sql.close();
      return;
    }

    console.log('[GET_ERP_ACCOUNT][DB_CONNECTED]');

    try {
      console.log('[MHIL_Tankhwapatra_EMP_AccountMaster_LeavingDate][START]');

      const request = new sql.Request();

      // Match exact SP parameters
      request.input('AccountMasterid', sql.BigInt, AccountMasterid);
      request.input('LeavingDate', sql.Date, leavingDate);

      await request.execute(
        erpStoredProcedures.ERP_EMPLOYEE_MASTER_LEAVINGDATE,
      );

      console.log(
        '[MHIL_Tankhwapatra_EMP_AccountMaster_LeavingDate][UPDATED_SUCCESSFULLY]',
      );
    } catch (erpError) {
      console.error(
        '[MHIL_Tankhwapatra_EMP_AccountMaster_LeavingDate][SP_ERROR]',
        erpError,
      );
    }

    sql.close();
    console.log('[GET_ERP_ACCOUNT][DB_CONNECTION_CLOSED]');
  });
}

exports.postCheckUser = async (req, res, next) => {
  try {
    const companyid = [];
    companyid.push(parseInt(req.body.companyMasterID));
    let get_one_data = await companyMaster.findAll({
      where: { parentCompanyMasterID: req.body.companyMasterID, status: 1 },
    });

    if (get_one_data == []) {
      let companyid = [];
      let get_one_data1 = await companyMaster.findOne({
        where: { userMasterID: req.body.companyMasterID, status: 1 },
      });
      companyid.push(get_one_data1.parentCompanyMasterID);
      let get_one_data2 = await companyMaster.findAll({
        where: {
          parentCompanyMasterID: get_one_data1.parentCompanyMasterID,
          status: 1,
        },
      });
      for (let i = 0; i < get_one_data2.length; i++) {
        companyid.push(get_one_data2[i].companyMasterID);
      }
    } else {
      for (let i = 0; i < get_one_data.length; i++) {
        companyid.push(get_one_data[i].companyMasterID);
      }
    }

    let dataforchild = await companyMaster.findOne({
      where: { companyMasterID: req.body.companyMasterID, status: 1 },
    });
    let check_tracking;
    if (dataforchild.parentCompanyMasterID == 0) {
      check_tracking = await CompanySubscriptionMaster.findOne({
        attributes: ['totalUser'],
        where: {
          companyMasterID: req.body.companyMasterID,

          // [Sequelize.Op.in]: companyid,
          status: 1,
        },
      });
    } else {
      check_tracking = await CompanySubscriptionMaster.findOne({
        attributes: ['totalUser'],
        where: {
          companyMasterID: dataforchild.parentCompanyMasterID,

          // [Sequelize.Op.in]: companyid,
          status: 1,
        },
      });
    }
    const totalcount = await UserMaster.count({
      raw: true,
      where: {
        companyMasterId: {
          [Sequelize.Op.in]: companyid,
        },
        status: 1,
      },
    });
    check_tracking.setDataValue('totalCount', totalcount);
    check_tracking.setDataValue(
      'addUserStepper',
      dataforchild?.addUserStepper || false,
    );

    if (totalcount >= check_tracking.totalUser) {
      check_tracking.setDataValue('exceed', true);
      res.status(200).json({
        status: 200,
        message: message.usermessage.userexceed,
        data: check_tracking,
      });
    } else {
      check_tracking.setDataValue('exceed', false);
      res.status(200).json({
        status: 200,
        message: message.usermessage.userallow,
        data: check_tracking,
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.employeepolicy = async (req, res, next) => {
  try {
    const { userMasterID, page, limit, Export } = await req.body;
    const condition = {
      userMasterID: userMasterID,
      status: 1,
    };
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const paginationQuery = !Export
      ? page && limit
        ? { offset: (page - 1) * limit, limit }
        : {}
      : {};
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    const { rows: user, count } = await UserMaster.findAndCountAll({
      distinct: true,
      where: { ...condition, ...userAccessCondition.where },
      ...paginationQuery,

      order: [['displayName', 'ASC']],
      include: [
        ...userAccessCondition.includeModels,
        {
          model: EmployeeDesignation,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
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
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
          attributes: ['departmentID', 'applicableDate'],
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
            applicableDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
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
          model: EmployeeShift,
          where: {
            status: 1,
            startDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
          attributes: ['shiftsID', 'startDate', 'shiftID'],
        },

        {
          model: EmployeeWorkingLocation,
          where: {
            status: 1,
            startDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
          attributes: ['workingLocationIDs', 'startDate'],
        },

        {
          model: EmployeeDivision,
          where: {
            status: 1,
            startDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },

          required: false,
          separate: true,
          attributes: ['divisionId', 'startDate'],
          include: [
            {
              model: Division,
              attributes: ['divisionName'],
            },
          ],
        },

        {
          model: EmployeeWorkingArea,
          where: {
            status: 1,
            startDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },

          required: false,
          separate: true,
          attributes: ['workingAreaId', 'startDate'],
          include: [
            {
              model: WorkingArea,
              attributes: ['workingAreaName'],
            },
          ],
        },

        {
          model: EmployeeAttendancePolicy,
          where: {
            status: 1,
            startDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
          separate: true,
          attributes: ['attendancePolicyID', 'startDate'],
          include: [
            {
              model: AttendancePolicy,
              as: 'attendancePolicy',
              attributes: ['attendancePolicyName'],
            },
          ],
        },
        {
          model: EmployeeSalaryPolicy,
          where: {
            status: 1,
            startDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
          separate: true,
          attributes: ['salaryPolicyID', 'startDate'],
          include: [
            {
              model: SalaryPolicy,
              as: 'salaryPolicy',
              attributes: ['salaryPolicyName'],
            },
          ],
        },
        {
          model: EmployeeWeekOff,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
          separate: true,
          attributes: ['weekOffPolicyID', 'applicableDate'],
          include: [
            {
              model: weekOffPolicy,
              as: 'weekoff',
              attributes: ['weekOffPolicyName'],
            },
          ],
        },
        {
          model: EmployeeHolidayPolicy,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
          separate: true,
          attributes: ['holidayPolicyID', 'applicableDate'],
          include: [
            {
              model: holidayPolicy,
              as: 'HolidayPolicy',
              attributes: ['holidayPolicyName'],
            },
          ],
        },
        {
          model: EmployeeLateEarlyPolicy,
          where: {
            status: 1,
            startDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
          separate: true,
          attributes: ['lateEarlyPolicyMasterID', 'startDate'],
          include: [
            {
              model: LateEarlyPolicy,
              as: 'lateEarlyPolicy',
              attributes: ['lateEarlyPolicyName'],
            },
          ],
        },
        {
          model: EmployeeAttendanceBonusPolicy,
          where: {
            status: 1,
            startDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
          separate: true,
          attributes: ['attendanceBonusPolicyId', 'startDate'],
          include: [
            {
              model: AttendanceBonusPolicy,
              attributes: ['attendanceBonusPolicyName'],
            },
          ],
        },
        {
          model: EmployeeFoodAllowancePolicy,
          where: {
            status: 1,
            startDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },

          required: false,
          separate: true,
          attributes: ['foodAllowancePolicyId', 'startDate'],
          include: [
            {
              model: FoodAllowancePolicy,
              attributes: ['foodAllowancePolicyName'],
            },
          ],
        },

        // Projects
        // Employee project
        {
          required: false,
          model: EmployeeProject,
          where: {
            startDate: {
              [Sequelize.Op.lte]: currentDate,
            },
            [Sequelize.Op.or]: [
              {
                releaseDate: {
                  [Sequelize.Op.gte]: currentDate,
                },
              },
              {
                releaseDate: {
                  [Sequelize.Op.eq]: null,
                },
              },
            ],
          },
          include: [{ model: Project }],
        },

        // Employee Leave Policy
        {
          model: empLeavePolicy,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(currentDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
          attributes: ['employeeLeavePolicyID', 'applicableDate'],
        },

        // Employee Short Leave Policy
        {
          model: EmployeeShortLeavePolicy,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(currentDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
          separate: true,
          attributes: ['shortLeavePolicyID', 'applicableDate'],
          include: [
            {
              model: ShortLeave,
              attributes: ['shortLeaveName'],
            },
          ],
        },
      ],
      attributes: [
        'userMasterID',
        'displayName',
        'userNumber',
        'companyMasterId',
      ],
    });

    const companyId = user?.[0]?.companyMasterId || null;

    let allShiftData = [],
      allWorkingLocationData = [],
      allLeavePolicyData = [];

    if (companyId) {
      [allShiftData, allWorkingLocationData, allLeavePolicyData] =
        await Promise.all([
          // allShiftData
          Shift.findAll({
            raw: true,
            where: {
              companyMasterID: companyId,
            },
          }),
          // allWorkingLocationData
          WorkingLocation.findAll({
            raw: true,
            where: {
              companyMasterID: companyId,
            },
          }),
          // allLeavePolicyData
          employeeLeavePolicy.findAll({
            raw: true,
            where: {
              companyMasterId: companyId,
            },
          }),
        ]);
    }

    const finalData = await Promise.all(
      user.map(async (e) => {
        let shiftNames = '',
          workingLocation = '',
          leavePolicyName = '';
        if (e.employeeShifts.length > 0) {
          if (e.employeeShifts?.[0]?.shiftID) {
            shiftNames = allShiftData
              .filter((d) => d.shiftID == e.employeeShifts[0].shiftID)
              .map((s) => s.shiftName)
              .join(',');
          }

          if (e.employeeShifts?.[0]?.shiftsID) {
            shiftNames = allShiftData
              .filter((d) =>
                [...e.employeeShifts[0].shiftsID].includes(
                  d.shiftID.toString(),
                ),
              )
              .map((s) => s.shiftName)
              .join(',');
          }
        }

        if (e.employeeWorkingLocations.length > 0) {
          workingLocation = allWorkingLocationData
            .filter((w) =>
              [...e.employeeWorkingLocations?.[0]?.workingLocationIDs].includes(
                w.workingLocationID,
              ),
            )
            .map((s) => s?.workingLocationName)
            .join(',');
        }

        if (e.empLeavePolicies.length > 0) {
          leavePolicyName = allLeavePolicyData
            .filter((l) =>
              [...e.empLeavePolicies?.[0]?.employeeLeavePolicyID].includes(
                l.id,
              ),
            )
            .map((s) => s?.leavePolicyName)
            .join(',');
        }

        const projectNames =
          (e.employeeProjects || [])
            .map((p) => p.project?.projectName)
            .join(',') || '';

        return {
          ...(!Export && { userMasterID: e.userMasterID }),
          'Employee Name': e.displayName,
          Number: e.userNumber,
          'Branch Assign Date':
            e.employeeBranches.length > 0
              ? e.employeeBranches?.[0]?.applicableDate
              : '',
          'Branch Name':
            e.employeeBranches.length > 0
              ? e.employeeBranches?.[0]?.branchMaster?.branchName
              : '',
          'Department Assign Date':
            e.employeeDepartments.length > 0
              ? e.employeeDepartments?.[0]?.applicableDate
              : '',
          'Department Name':
            e.employeeDepartments.length > 0
              ? e.employeeDepartments?.[0]?.department?.departmentName
              : '',
          'Designation Assign Date':
            e.employeeDesignations.length > 0
              ? e.employeeDesignations?.[0]?.applicableDate
              : '',
          'Designation Name':
            e.employeeDesignations.length > 0
              ? e.employeeDesignations?.[0]?.designation?.designationName
              : '',
          'Division Assign Date':
            e.employeeDivisions.length > 0
              ? e.employeeDivisions?.[0]?.startDate
              : '',
          'Division Name':
            e.employeeDivisions.length > 0
              ? e.employeeDivisions?.[0]?.division?.divisionName
              : '',
          'WorkingArea Assign Date':
            e.employeeWorkingAreas.length > 0
              ? e.employeeWorkingAreas?.[0]?.startDate
              : '',
          'WorkingArea Name':
            e.employeeWorkingAreas.length > 0
              ? e.employeeWorkingAreas?.[0]?.workingArea?.workingAreaName
              : '',
          'WorkingLocation Assign Date':
            e.employeeWorkingLocations.length > 0
              ? e.employeeWorkingLocations?.[0]?.startDate
              : '',
          'WorkingLocation Name': workingLocation,
          'Shift Assign Date':
            e.employeeShifts.length > 0 ? e.employeeShifts?.[0]?.startDate : '',
          'Shift Name': shiftNames,
          Project: projectNames,
          'Leave Policy Assign Date':
            e.empLeavePolicies.length > 0
              ? e.empLeavePolicies?.[0]?.applicableDate
              : '',
          'Leave Policy Name': leavePolicyName,
          'ShortLeave Policy Assign Date':
            e.employeeShortLeavePolicies.length > 0
              ? e.employeeShortLeavePolicies?.[0]?.applicableDate
              : '',
          'ShortLeave Policy Name':
            e.employeeShortLeavePolicies?.[0]?.shortLeave?.shortLeaveName,
          'Attendance Policy Assign Date':
            e.employeeAttendancePolicies.length > 0
              ? asiaKolkataDateTime(
                  e.employeeAttendancePolicies?.[0]?.startDate,
                ).slice(0, 10)
              : '',
          'Attendance Policy Name':
            e.employeeAttendancePolicies.length > 0
              ? e.employeeAttendancePolicies?.[0]?.attendancePolicy
                  ?.attendancePolicyName
              : '',
          'Salary Policy Assign Date':
            e.employeeSalaryPolicies.length > 0
              ? e.employeeSalaryPolicies?.[0]?.startDate
              : '',
          'Salary Policy Name':
            e.employeeSalaryPolicies.length > 0
              ? e.employeeSalaryPolicies?.[0]?.salaryPolicy?.salaryPolicyName
              : '',
          'WeekOff Policy Assign Date':
            e.employeeWeekOffs.length > 0
              ? e.employeeWeekOffs?.[0]?.applicableDate
              : '',
          'WeekOff Policy Name':
            e.employeeWeekOffs.length > 0
              ? e.employeeWeekOffs?.[0]?.weekoff?.weekOffPolicyName
              : '',
          'Holiday Policy Assign Date':
            e.employeeHolidayPolicies.length > 0
              ? asiaKolkataDateTime(
                  e.employeeHolidayPolicies?.[0]?.applicableDate,
                ).slice(0, 10)
              : '',
          'Holiday Policy Name':
            e.employeeHolidayPolicies.length > 0
              ? e.employeeHolidayPolicies?.[0]?.HolidayPolicy?.holidayPolicyName
              : '',
          'LC-EG Policy Assign Date':
            e.employeeLateEarlyPolicies.length > 0
              ? e.employeeLateEarlyPolicies?.[0]?.startDate
              : '',
          'LC-EG Policy Name':
            e.employeeLateEarlyPolicies.length > 0
              ? e.employeeLateEarlyPolicies?.[0]?.lateEarlyPolicy
                  ?.lateEarlyPolicyName
              : '',
          'Attendance Bonus Policy Assign Date':
            e.employeeAttendanceBonusPolicies.length > 0
              ? asiaKolkataDateTime(
                  e.employeeAttendanceBonusPolicies?.[0]?.startDate,
                ).slice(0, 10)
              : '',
          'Attendance Bonus Policy Name':
            e.employeeAttendanceBonusPolicies.length > 0
              ? e.employeeAttendanceBonusPolicies?.[0]?.attendanceBonusPolicy
                  ?.attendanceBonusPolicyName
              : '',
          'Food Allowance Policy Assign Date':
            e.employeeFoodAllowancePolicies.length > 0
              ? e.employeeFoodAllowancePolicies?.[0]?.startDate
              : '',
          'Food Allowance Policy Name':
            e.employeeFoodAllowancePolicies.length > 0
              ? e.employeeFoodAllowancePolicies?.[0]?.foodAllowancePolicy
                  ?.foodAllowancePolicyName
              : '',
        };
      }),
    );

    if (Export)
      return await generateExcel(finalData, 'Employee Policy', 'xlsx', res);

    res.status(200).json({
      status: 200,
      data: finalData,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};

exports.dashboardeEmpstatus = async (req, res, next) => {
  try {
    let finaldata = [];
    let total_employee;
    let total_active_user;
    let total_active;
    let total_deactive;
    let userid = [];
    let empjoining;

    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !req.params.id,
    });

    total_employee = await UserMaster.count({
      where: {
        companyMasterId: req.params.id,
        status: ['0', '1'],
        ...userAccessCondition.where,
      },
      include: [...userAccessCondition.includeModels],
    });
    total_active_user = await UserMaster.findAll({
      where: {
        companyMasterId: req.params.id,
        status: 1,
        ...userAccessCondition.where,
      },
      include: [...userAccessCondition.includeModels],
    });

    for (let i = 0; i < total_active_user.length; i++) {
      userid.push(total_active_user[i].userMasterID);
    }

    empjoining = await EmployeeJoiningDetails.count({
      where: {
        userMasterID: userid,
        [Sequelize.Op.and]: [
          {
            leavingDate: {
              [Sequelize.Op.ne]: null,
            },
          },
          {
            leavingDate: {
              [Sequelize.Op.ne]: '',
            },
          },
        ],
      },
      include: [
        {
          required: true,
          model: UserMaster,
          where: { ...userAccessCondition.where },
          include: [...userAccessCondition.includeModels],
        },
      ],
    });

    total_active = await UserMaster.count({
      where: {
        companyMasterId: req.params.id,
        status: 1,
        ...userAccessCondition.where,
      },
      include: [...userAccessCondition.includeModels],
    });

    total_deactive = await UserMaster.count({
      where: {
        companyMasterId: req.params.id,
        status: 0,
        ...userAccessCondition.where,
      },
      include: [...userAccessCondition.includeModels],
    });

    finaldata.push({
      total_employee: total_employee,
      total_active: total_active,
      total_deactive: total_deactive,
      total_left_employee: empjoining,
    });

    return res.status(200).json({ status: 200, data: finaldata });
  } catch (err) {
    next(err);
  }
};

exports.postAddUserFaceData = async (req, res, next) => {
  try {
    let { userMasterID, facePhotoArray, updateBy, updateByIp } = await req.body;
    let facePhoto = '';
    if (req.file) {
      facePhoto = req.file.filename;
    }

    if (facePhotoArray) facePhotoArray = facePhotoArray.split(',');

    let change_data = await UserMaster.update(
      {
        facePhoto,
        facePhotoArray,
        updateBy,
        updateByIp,
      },
      {
        where: { userMasterID: userMasterID },
      },
    );
    return res
      .status(200)
      .json({ status: 200, message: 'User Photo data added Successfully' });
  } catch (err) {
    next(err);
  }
};

exports.uploaduserExcel = async (req, res, next) => {
  try {
    let { companyMasterID, showBankBranch, disableSalaryCalculateAct } =
      req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    disableSalaryCalculateAct = JSON.parse(disableSalaryCalculateAct);
    let BranchCheck = [];
    let AllBranches = [];
    let DepartmentCheck = [];
    let DesignationCheck = [];
    let userContacts = [];
    let mobileArr = [];
    let employeejoining = [];
    let employeeBankDetailRequest = [];
    let Empdocument = [];
    let localAddress = [];
    let PermanentAddress = [];
    let branchIDArr = [];
    let departmentIDArr = [];
    let designationIDArr = [];
    let divisionIDArr = [];
    let workingAreaIDArr = [];
    let ShiftIDArr = [];
    let AttendanceIDArr = [];
    let SalaryIDArr = [];
    let WeekoffIDArr = [];
    let HolidayIDArr = [];
    const SkillCategoryArray = [];
    const finalSkillCategoryArray = [];
    let SalaryGradeIDArr = [];
    let employeementIDArr = [];
    // let SalaryIDArr = [];
    let userid;
    let AllDepartment = [];
    let AllDesignation = [];

    let UserList = [];

    let AllHolidayPolicy = [];
    let AllWeekoffPolicy = [];
    let AllSalaryPolicy = [];
    let AllAttendancePolicy = [];
    let AllShift = [];
    let AllSalaryGrade = [];
    let AllState = [];
    let AllBank = [];
    let AllBankBranch = [];
    let finaldata = [];
    let AllContractor = [];
    let AllDivision = [];
    let AllWorkingArea = [];

    let f_localAddress = [];
    let f_permanentAddress = [];
    let f_employeement = [];
    let f_shift = [];
    let f_division = [];
    let f_workingArea = [];
    let f_attendance = [];
    let f_salary = [];
    let f_wekoff = [];
    let f_holiday = [];
    let f_salarymaster = [];
    let ShiftCheck = [];
    let trackingArr = [];
    let f_tracking = [];
    const AllRoles = [];
    const f_permission = [];
    const employeeCodeArray = [];

    let check = req.body.check;
    const currentYear = moment().year();

    let startdate = new Date().toISOString().slice(0, 8) + '01';
    if (check == 0) {
      BranchCheck = await BranchMaster.findAll({
        where: {
          companyMasterID: companyMasterID,
          status: 1,
        },
      });

      if (BranchCheck.length == 0) {
        return res.status(200).send({
          status: 402,
          message: "You don't have any branch! Add a branch",
        });
      }

      for (var b = 0; b < BranchCheck.length; b++) {
        AllBranches.push(BranchCheck[b].branchName);
      }

      DepartmentCheck = await Department.findAll({
        where: {
          companyMasterID: companyMasterID,
          status: 1,
        },
      });

      if (DepartmentCheck.length == 0) {
        return res.status(200).send({
          status: 402,
          message: "You don't have any Department! Add a department",
        });
      }

      for (var d = 0; d < DepartmentCheck.length; d++) {
        AllDepartment.push(DepartmentCheck[d].departmentName);
      }

      DesignationCheck = await Designation.findAll({
        where: {
          companyMasterID: companyMasterID,
          status: 1,
        },
      });

      if (DesignationCheck.length == 0) {
        return res.status(200).send({
          status: 402,
          message: "You don't have any Designation! Add a desigantion",
        });
      }

      for (var e = 0; e < DesignationCheck.length; e++) {
        AllDesignation.push(DesignationCheck[e].designationName);
      }

      // check company's shift

      ShiftCheck = await Shift.findAll({
        where: {
          companyMasterID: companyMasterID,
          status: 1,
        },
        include: [
          {
            model: WorkerTypeWiseShift,
            as: 'workerType',
            attributes: ['workerType'],
          },
        ],
      });

      for (var s = 0; s < ShiftCheck.length; s++) {
        AllShift.push(ShiftCheck[s].shiftName);
      }
    }

    const roles = await RoleMaster.findAll({
      raw: true,
      where: {
        companyMasterID: companyMasterID,
        status: 1,
      },
    });

    for (const item of roles) {
      AllRoles.push(item.roleName);
    }

    // check company's attendance policy

    let AttendancePolicyCheck = await AttendancePolicy.findAll({
      where: {
        companyMasterID: companyMasterID,
        status: 1,
      },
    });

    for (let a = 0; a < AttendancePolicyCheck.length; a++) {
      AllAttendancePolicy.push(AttendancePolicyCheck[a].attendancePolicyName);
    }

    // check company's salary policy

    let SalaryPolicyCheck = await SalaryPolicy.findAll({
      where: {
        companyMasterID: companyMasterID,
        status: 1,
      },
    });

    for (var sa = 0; sa < SalaryPolicyCheck.length; sa++) {
      AllSalaryPolicy.push(SalaryPolicyCheck[sa].salaryPolicyName);
    }

    // check company's weekoff policy

    let WeekoffPolicyCheck = await weekOffPolicy.findAll({
      where: {
        companyMasterID: companyMasterID,
        status: 1,
      },
    });

    for (var w = 0; w < WeekoffPolicyCheck.length; w++) {
      AllWeekoffPolicy.push(WeekoffPolicyCheck[w].weekOffPolicyName);
    }

    // check company's holiday policy

    let HolidayPolicyCheck = await holidayPolicy.findAll({
      where: {
        companyMasterID: companyMasterID,
        status: 1,
      },
    });

    for (let h = 0; h < HolidayPolicyCheck.length; h++) {
      AllHolidayPolicy.push(HolidayPolicyCheck[h].holidayPolicyName);
    }

    // check company's salary grade

    let SalaryGradeCheck = await GradeStructure.findAll({
      where: {
        companyMasterID: companyMasterID,
        status: 1,
      },
    });

    for (let sg = 0; sg < SalaryGradeCheck.length; sg++) {
      AllSalaryGrade.push(SalaryGradeCheck[sg].gradeName);
    }

    // check state

    let StateCheck = await StateMaster.findAll({
      where: {
        countryMasterID: 103,
        status: 1,
      },
    });

    for (var st = 0; st < StateCheck.length; st++) {
      AllState.push(StateCheck[st].stateName);
    }

    // check bank

    let BankCheck = await BankMaster.findAll({
      where: {
        status: 1,
      },
    });

    for (let b = 0; b < BankCheck.length; b++) {
      AllBank.push(BankCheck[b].bankName);
    }
    // check bank branch
    let bankBranchCheck = [];
    if (showBankBranch == 'true') {
      bankBranchCheck = await BankBranch.findAll({
        where: {
          status: 1,
        },
      });
      for (let b = 0; b < bankBranchCheck.length; b++) {
        AllBankBranch.push(bankBranchCheck[b]);
      }
    }

    let contractorCheck = await Contractor.findAll({
      where: {
        companyMasterID: companyMasterID,
        status: 1,
      },
    });
    for (let ct = 0; ct < contractorCheck.length; ct++) {
      AllContractor.push(contractorCheck[ct].contractorName);
    }

    let divisionCheck = await Division.findAll({
      where: {
        companyMasterID: companyMasterID,
        status: 1,
      },
    });
    for (let div = 0; div < divisionCheck.length; div++) {
      AllDivision.push(divisionCheck[div].divisionName);
    }
    let workingAreaCheck = await WorkingArea.findAll({
      where: {
        companyMasterID: companyMasterID,
        status: 1,
      },
    });
    for (let wor = 0; wor < workingAreaCheck.length; wor++) {
      AllWorkingArea.push(workingAreaCheck[wor].workingAreaName);
    }

    if (req.file == undefined) {
      return res
        .status(200)
        .send({ status: 400, message: 'Please upload an excel file!' });
    }

    const skillCategoryList = await CompanySkillCategory.findAll({
      where: {
        companyMasterID: companyMasterID,
      },
    });

    const allSkillCategory = skillCategoryList.map((e) =>
      String(e.skillCategory).toLocaleLowerCase().trim(),
    );

    const filepath = path.join(__dirname, `../uploads/${req.file.filename}`);

    // let path = './uploads/' + req.file.filename;
    const salt = await bcrypt.genSalt(10);

    const assignSalaryPermission = await checkEmployeePermission(
      req.userDetails?.userMasterId,
      'AssignSalaryStructure',
      'Create',
    );

    readXlsxFile(filepath).then(async (rows) => {
      rows.shift();
      if (check == 0) {
        // Check == 0 (Add)
        rows.forEach((row) => {
          if (row[2]) row[2] = ' ' + row[2] + ' ';
          else row[2] = ' ';
          let CompanyContact2 = {
            Employee_Code: row[0],
            First_Name: row[1],
            Middle_Name: row[2],
            Last_Name: row[3],
            Full_Name: row[1] + row[2] + row[3],

            Department: row[4],
            Depart_Applicable_Date: row[5],
            Designation: row[6],
            Desig_Applicable_Date: row[7],
            Branch: row[8],
            Branch_Applicable_Date: row[9],
            Local_Address: row[10],
            Permanent_Address: row[11],
            Mobileno: row[12] ? String(row[12]).replace(/\s/g, '') : null,
            Email_Id: row[13],
            Marital_Status: row[14],
            SalaryBase: disableSalaryCalculateAct ? 'S' : row[15],
            Gender: row[16],
            Bank: row[17],
            AccountNo: row[18],
            IFSCCode: row[19],
            bankBranchID: showBankBranch == 'true' ? row[19] : null,
            Name_As_On_Bank: row[20],
            BirthDate: row[21],
            JoinDate: row[22],
            LeftDate: row[23],
            PANNo: row[24],
            AadharNo: row[25],
            AadharName: row[26],
            PFNo: row[27],
            UANNo: row[28],
            PF_JoinDate: row[29],
            ESINo: row[30],
            ESI_JoinDate: row[31],
            PF_Bank: row[32],
            PF_bankIFSC: row[33],
            PF_bankACNO: row[34],
            Salary_Type: row[35],
            Employeement_Type: row[36],
            Employment_Applicable_Date: row[37],
            Employment_End_Date: row[38],
            contractor_Name: row[39],
            Overtime: row[40],
            Notice_Period: row[41],
            BloodGroup: row[42],
            Nationality: row[43],
            Physical_Handicap: row[44],
            SHIFT: row[45],
            Attendance_Policy: row[46],
            Salary_Policy: row[47],
            WeekOff_Policy: row[48],
            Holiday_Policy: row[49],
            SkillCategory: row[50],
            BiometricSerialNo: row[51],
            BiometricCode: row[52],
            otherContactNumber: row[53]
              ? String(row[53]).replace(/\s/g, '')
              : null,
            localFName: null,
            localMName: null,
            localLName: null,
            localDisplayName: null,
            attendanceFrom: row[54],
            cugNumber: row[55] ? String(row[55]).replace(/\s/g, '') : null,
            officalEmail: row[56],
            Division: row[57],
            Division_Applicable_Date: row[58],
            WorkingArea: row[59],
            WorkingArea_Applicable_Date: row[60],
            fullMonthPresence: row[61],
            Tracking: row[62],
            TrackingTimeInterval: row[63],
            StatusMonitoring: row[64],
          };

          // Salary fields
          let currentIndex = 65;

          if (assignSalaryPermission) {
            Object.assign(CompanyContact2, {
              Gross_Salary: row[currentIndex++],
              Salary_Grade: row[currentIndex++],
              StateForPT: row[currentIndex++],
              Corporation: row[currentIndex++],
            });
          }

          // Payroll frequency
          let payrollFrequency = PayrollFrequencyType.MONTHLY;

          if (showPayrollFrequency) {
            payrollFrequency = row[currentIndex];
          }

          CompanyContact2.payrollFrequency = payrollFrequency;

          userContacts.push(CompanyContact2);
          mobileArr.push(CompanyContact2.Mobileno);
          employeeCodeArray.push(CompanyContact2.Employee_Code);
        });
      } else {
        // Check == 1 (Update)
        rows.forEach((row) => {
          if (row[2]) row[2] = ' ' + row[2] + ' ';
          else row[2] = ' ';
          let CompanyContact2 = {
            Employee_Code: row[0],
            First_Name: row[1],
            Middle_Name: row[2],
            Last_Name: row[3],
            Full_Name: row[1] + row[2] + row[3],

            Local_Address: row[4],
            Permanent_Address: row[5],
            Mobileno: row[6] ? String(row[6]).replace(/\s/g, '') : null,
            Email_Id: row[7],
            Marital_Status: row[8],
            SalaryBase: disableSalaryCalculateAct ? 'S' : row[9],
            Gender: row[10],
            Bank: row[11],
            AccountNo: row[12],
            IFSCCode: row[13],
            bankBranchID: showBankBranch == 'true' ? row[13] : null,
            Name_As_On_Bank: row[14],
            BirthDate: row[15],
            JoinDate: row[16],
            LeftDate: row[17],
            PANNo: row[18],
            AadharNo: row[19],
            AadharName: row[20],
            PFNo: row[21],
            UANNo: row[22],
            PF_JoinDate: row[23],
            ESINo: row[24],
            ESI_JoinDate: row[25],
            PF_Bank: row[26],
            PF_bankIFSC: row[27],
            PF_bankACNO: row[28],
            Salary_Type: row[29],
            Employeement_Type: row[30],
            Employment_Applicable_Date: row[31],
            Employment_End_Date: row[32],
              contractor_Name: row[33],
            Overtime: row[34],
            Notice_Period: row[35],
            BloodGroup: row[36],
            Nationality: row[37],
            Physical_Handicap: row[38],

            Attendance_Policy: row[39],
            Salary_Policy: row[40],
            WeekOff_Policy: row[41],
            Holiday_Policy: row[42],

            BiometricSerialNo: row[43],
            BiometricCode: row[44],
            otherContactNumber: row[45]
              ? String(row[45]).replace(/\s/g, '')
              : null,
            localFName: null,
            localMName: null,
            localLName: null,
            localDisplayName: null,
            attendanceFrom: row[46],
            cugNumber: row[47] ? String(row[47]).replace(/\s/g, '') : null,
            officalEmail: row[48],
            fullMonthPresence: row[49],
          };

          // Salary fields
          let currentIndex = 50;

          if (assignSalaryPermission) {
            Object.assign(CompanyContact2, {
              Gross_Salary: row[currentIndex++],
              Salary_Grade: row[currentIndex++],
              StateForPT: row[currentIndex++],
              Corporation: row[currentIndex++],
              SalaryFromYYYYMM: row[currentIndex++],
            });
          }

          //  Payroll frequency
          let payrollFrequency = PayrollFrequencyType.MONTHLY;

          if (showPayrollFrequency) {
            payrollFrequency = row[currentIndex];
          }

          CompanyContact2.payrollFrequency = payrollFrequency;

          userContacts.push(CompanyContact2);
          mobileArr.push(CompanyContact2.Mobileno);
          employeeCodeArray.push(CompanyContact2.Employee_Code);
        });
      }

      let sameNumber = mobileArr.filter((number, index) => {
        return mobileArr.indexOf(number) !== index;
      });

      if (sameNumber.length != 0) {
        return res.status(200).send({
          status: 402,
          message:
            'You have entered Mobileno' +
            ' ' +
            `${sameNumber}` +
            ' ' +
            'more than once!' +
            ' ' +
            ' Check your Excel',
        });
      }

      // For check same employee Code in Excel

      const sameEmployeeCode = employeeCodeArray.filter(
        (employeeCode, index) => {
          if (employeeCode && String(employeeCode).trim()) {
            const lowerCaseEmployeeCode = String(employeeCode)
              .trim()
              .toLowerCase();
            return (
              employeeCodeArray.findIndex((code, idx) => {
                return (
                  String(code).trim().toLowerCase() == lowerCaseEmployeeCode &&
                  idx !== index
                );
              }) !== -1
            );
          }
          return false;
        },
      );

      if (sameEmployeeCode.length != 0) {
        return res.status(200).send({
          status: 402,
          message:
            'You have entered employee code' +
            ' ' +
            `${sameEmployeeCode}` +
            ' ' +
            'more than once!' +
            ' ' +
            ' Check your Excel',
        });
      }

      const findCompany = await companyMaster.findOne({
        raw: true,
        where: {
          companyMasterID,
        },
        attributes: [
          'companyMasterID',
          'parentCompanyMasterID',
          'uniqueEmpCode',
        ],
      });

      // check duplicate fields value in excel

      const fieldsMap = {
        ESINo: 'ESIC number',
        UANNo: 'UAN number',
        AadharNo: 'Adhar number',
        PANNo: 'PAN number',
      };

      const message = checkDuplicateValueByFieldsInExcel(
        userContacts,
        fieldsMap,
      );

      if (message) {
        fs.unlink(filepath, function (err) {
          if (err) {
            console.log(err);
          } else {
          }
        });
        return res.status(statusCodes.OK).json({
          status: 401,
          message,
        });
      }

      // To check unique code in all company

      let uniqueEmpCodeInAllCompany = false;
      if (findCompany.parentCompanyMasterID == 0)
        uniqueEmpCodeInAllCompany = findCompany.uniqueEmpCode;
      else {
        const parentCompanyData = await companyMaster.findOne({
          raw: true,
          where: {
            companyMasterID: findCompany.parentCompanyMasterID,
          },
        });

        uniqueEmpCodeInAllCompany = parentCompanyData.uniqueEmpCode;
      }

      // unique Employee Code is true for all company

      let AllcompanyIds = [+companyMasterID];

      if (uniqueEmpCodeInAllCompany) {
        const companyCodition =
          findCompany.parentCompanyMasterID == 0
            ? {
                parentCompanyMasterID: +companyMasterID,
                status: {
                  [Sequelize.Op.in]: [0, 1],
                },
              }
            : {
                parentCompanyMasterID: +findCompany.parentCompanyMasterID,
                status: {
                  [Sequelize.Op.in]: [0, 1],
                },
              };

        const findCompanies = await companyMaster.findAll({
          raw: true,
          where: companyCodition,
          attributes: ['companyMasterID'],
        });

        AllcompanyIds = [
          ...findCompanies.map((e) => e.companyMasterID),
          findCompany.parentCompanyMasterID != 0
            ? +findCompany.parentCompanyMasterID
            : +companyMasterID,
        ];
      }

      let UpdateArray = [];
      let AddArray = [];

      for (let i = 0; i < userContacts.length; i++) {
        let user;
        if (check == 1) {
          // Check == 1 (Update)
          user = await UserMaster.findOne({
            // raw: true,
            where: {
              userNumber: userContacts[i].Mobileno,
              companyMasterId: companyMasterID,
              status: 1,
            },
            include: [
              { model: EmployeeJoiningDetails, attributes: ['leavingDate'] },
            ],
          });
        }

        // for duplicate uan esic pan and adhar

        const adharCard = userContacts[i].AadharNo?.toString().trim() || null;
        const uanNumber = userContacts[i].UANNo?.toString().trim() || null;
        const esicNumber = userContacts[i].ESINo?.toString().trim() || null;
        const pancard = userContacts[i].PANNo?.toString().trim() || null;

        if (adharCard || uanNumber || esicNumber || pancard) {
          const data = {
            adharCard,
            uanNumber,
            esicNumber,
            pancard,
          };

          const userId = check == 1 ? user?.userMasterID : null;

          const message = await getDuplicationValidation(
            data,
            userId,
            companyMasterID,
            true,
          );

          if (message) {
            fs.unlink(filepath, function (err) {
              if (err) {
                console.log(err);
              } else {
              }
            });
            return res.status(statusCodes.OK).json({
              status: 401,
              message,
            });
          }
        }

        // For Same EmployeeCode

        if (
          userContacts[i].Employee_Code &&
          String(userContacts[i].Employee_Code).trim()
        ) {
          const find_SameData = await EmployeeJoiningDetails.findOne({
            where: Sequelize.and(
              Sequelize.where(
                sequelize.fn(
                  'TRIM',
                  sequelize.fn('LOWER', sequelize.col('employeeCode')),
                ),
                String(userContacts[i].Employee_Code).trim().toLowerCase(),
              ),
            ),
            include: [
              {
                required: true,
                model: UserMaster,
                where: {
                  companyMasterId: { [Sequelize.Op.in]: AllcompanyIds },
                  ...(user && {
                    userMasterID: { [Sequelize.Op.ne]: user.userMasterID },
                  }),
                  status: [0, 1],
                },
                attributes: [],
              },
            ],
          });

          if (find_SameData) {
            fs.unlink(filepath, function (err) {
              if (err) {
                console.log(err);
              } else {
              }
            });

            return res.status(200).json({
              status: 401,
              message: `An employee with the same Employee Code : '${find_SameData.employeeCode}' already exists in the company.`,
            });
          }
        }

        // All require fields

        if (
          userContacts[i].First_Name == null ||
          userContacts[i].First_Name == ''
        ) {
          return res.status(200).send({
            status: 402,
            message: 'First_Name is Required',
          });
        }

        if (
          userContacts[i].Last_Name == null ||
          userContacts[i].Last_Name == ''
        ) {
          return res.status(200).send({
            status: 402,
            message: 'Last_Name is Required',
          });
        }
        // if (convertNameToLocalName) {
        //   if (saveraCompanyIDs.includes(companyMasterID)) {
        //     try {
        //       const translate = new Translate({
        //         key: process.env.GOOGLE_CLOUD_TRANSLATE_API_KEY,
        //       });

        //       const response = await translate.translate(
        //         [
        //           userContacts[i].First_Name,
        //           userContacts[i].Middle_Name
        //             ? userContacts[i].Middle_Name
        //             : '',
        //           userContacts[i].Last_Name,
        //         ],
        //         {
        //           from: 'en', // Explicitly specify English as the source
        //           to: 'mr',
        //           format: 'text',
        //           model: 'base',
        //         }
        //       );

        //       // Extract transliterated values
        //       userContacts[i].localFName = response[0]?.[0] || null;
        //       userContacts[i].localMName = response[0]?.[1] || null;
        //       userContacts[i].localLName = response[0]?.[2] || null;

        //       userContacts[i].localDisplayName = userContacts[i].localMName
        //         ? `${userContacts[i].localFName} ${userContacts[i].localMName} ${userContacts[i].localLName}`
        //         : `${userContacts[i].localFName} ${userContacts[i].localLName}`;
        //     } catch (error) {
        //       console.error(`Error in translation for user ${i}:`, error);
        //     }
        //   }
        // }
        if (
          userContacts[i].Mobileno == null ||
          userContacts[i].Mobileno == ''
        ) {
          return res.status(200).send({
            status: 402,
            message: 'Mobileno is Required',
          });
        }

        // if (userContacts[i].role == null || userContacts[i].role == '') {
        //   return res.status(200).send({
        //     status: 402,
        //     message: 'Role is Required',
        //   });
        // } else {
        //   const roleValidate = AllRoles.filter((s) => {
        //     if (
        //       s.trim().toLowerCase() ===
        //       userContacts[i].role.trim().toLowerCase()
        //     ) {
        //       return s;
        //     }
        //   });

        //   if (roleValidate.length == 0) {
        //     return res.status(200).send({
        //       status: 402,
        //       message:
        //         'Role' +
        //         ' ' +
        //         `${userContacts[i].role}` +
        //         ' ' +
        //         'Does Not Exist',
        //     });
        //   }
        // }

        if (check == 0) {
          // Check == 0 (Add)
          if (
            userContacts[i].Department == null ||
            userContacts[i].Department == ''
          ) {
            return res.status(200).send({
              status: 402,
              message: 'Department is Required',
            });
          }

          if (
            userContacts[i].Designation == null ||
            userContacts[i].Designation == ''
          ) {
            return res.status(200).send({
              status: 402,
              message: 'Designation is Required',
            });
          }

          if (userContacts[i].Branch == null || userContacts[i].Branch == '') {
            return res.status(200).send({
              status: 402,
              message: 'Branch is Required',
            });
          }

          if (
            userContacts[i].Depart_Applicable_Date != null &&
            userContacts[i].Depart_Applicable_Date != ''
          ) {
            if (typeof userContacts[i].Depart_Applicable_Date == 'number') {
              userContacts[i].Depart_Applicable_Date = new Date(
                Math.round(userContacts[i].Depart_Applicable_Date - 25569) *
                  86400 *
                  1000,
              )
                .toISOString()
                .slice(0, 10);
            } else {
              if (
                isValidDate(userContacts[i].Depart_Applicable_Date) === true
              ) {
                userContacts[i].Depart_Applicable_Date = new Date(
                  `${userContacts[i].Depart_Applicable_Date}`,
                )
                  .toISOString()
                  .slice(0, 10);
              } else {
                return res.status(200).send({
                  status: 402,
                  message:
                    "Department Applicable_Date Should be in 'yyyy-mm-dd' Format" +
                    ': ' +
                    userContacts[i].Mobileno,
                });
              }
            }
          } else {
            return res.status(200).send({
              status: 402,
              message:
                'Department Applicable_Date is require for' +
                ': ' +
                userContacts[i].Mobileno,
            });
          }

          if (
            userContacts[i].Desig_Applicable_Date != null &&
            userContacts[i].Desig_Applicable_Date != ''
          ) {
            if (typeof userContacts[i].Desig_Applicable_Date == 'number') {
              userContacts[i].Desig_Applicable_Date = new Date(
                Math.round(userContacts[i].Desig_Applicable_Date - 25569) *
                  86400 *
                  1000,
              )
                .toISOString()
                .slice(0, 10);
            } else {
              if (isValidDate(userContacts[i].Desig_Applicable_Date) === true) {
                userContacts[i].Desig_Applicable_Date = new Date(
                  `${userContacts[i].Desig_Applicable_Date}`,
                )
                  .toISOString()
                  .slice(0, 10);
              } else {
                return res.status(200).send({
                  status: 402,
                  message:
                    "Designation Applicable_Date Should be in 'yyyy-mm-dd' Format" +
                    ': ' +
                    userContacts[i].Mobileno,
                });
              }
            }
          } else {
            return res.status(200).send({
              status: 402,
              message:
                'Designation Applicable_Date is require for' +
                ': ' +
                userContacts[i].Mobileno,
            });
          }

          if (
            userContacts[i].Branch_Applicable_Date != null &&
            userContacts[i].Branch_Applicable_Date != ''
          ) {
            if (typeof userContacts[i].Branch_Applicable_Date == 'number') {
              userContacts[i].Branch_Applicable_Date = new Date(
                Math.round(userContacts[i].Branch_Applicable_Date - 25569) *
                  86400 *
                  1000,
              )
                .toISOString()
                .slice(0, 10);
            } else {
              if (
                isValidDate(userContacts[i].Branch_Applicable_Date) === true
              ) {
                userContacts[i].Branch_Applicable_Date = new Date(
                  `${userContacts[i].Branch_Applicable_Date}`,
                )
                  .toISOString()
                  .slice(0, 10);
              } else {
                return res.status(200).send({
                  status: 402,
                  message:
                    "Branch Applicable_Date Should be in 'yyyy-mm-dd' Format" +
                    ': ' +
                    userContacts[i].Mobileno,
                });
              }
            }
          } else {
            return res.status(200).send({
              status: 402,
              message:
                'Location Applicable_Date is require for' +
                ': ' +
                userContacts[i].Mobileno,
            });
          }

          if (
            userContacts[i].Division_Applicable_Date != null &&
            userContacts[i].Division_Applicable_Date != ''
          ) {
            if (typeof userContacts[i].Division_Applicable_Date == 'number') {
              userContacts[i].Division_Applicable_Date = new Date(
                Math.round(userContacts[i].Division_Applicable_Date - 25569) *
                  86400 *
                  1000,
              )
                .toISOString()
                .slice(0, 10);
            } else {
              if (
                isValidDate(userContacts[i].Division_Applicable_Date) === true
              ) {
                userContacts[i].Division_Applicable_Date = new Date(
                  `${userContacts[i].Division_Applicable_Date}`,
                )
                  .toISOString()
                  .slice(0, 10);
              } else {
                return res.status(200).send({
                  status: 402,
                  message:
                    "Division Applicable_Date Should be in 'yyyy-mm-dd' Format" +
                    ': ' +
                    userContacts[i].Mobileno,
                });
              }
            }
          }
          if (
            userContacts[i].WorkingArea_Applicable_Date != null &&
            userContacts[i].WorkingArea_Applicable_Date != ''
          ) {
            if (
              typeof userContacts[i].WorkingArea_Applicable_Date == 'number'
            ) {
              userContacts[i].WorkingArea_Applicable_Date = new Date(
                Math.round(
                  userContacts[i].WorkingArea_Applicable_Date - 25569,
                ) *
                  86400 *
                  1000,
              )
                .toISOString()
                .slice(0, 10);
            } else {
              if (
                isValidDate(userContacts[i].WorkingArea_Applicable_Date) ===
                true
              ) {
                userContacts[i].WorkingArea_Applicable_Date = new Date(
                  `${userContacts[i].WorkingArea_Applicable_Date}`,
                )
                  .toISOString()
                  .slice(0, 10);
              } else {
                return res.status(200).send({
                  status: 402,
                  message:
                    "Working Area Applicable_Date Should be in 'yyyy-mm-dd' Format" +
                    ': ' +
                    userContacts[i].Mobileno,
                });
              }
            }
          }
        }

        if (
          userContacts[i].JoinDate != null &&
          userContacts[i].JoinDate != ''
        ) {
          if (typeof userContacts[i].JoinDate == 'number') {
            userContacts[i].JoinDate = new Date(
              Math.round(userContacts[i].JoinDate - 25569) * 86400 * 1000,
            )
              .toISOString()
              .slice(0, 10);
          } else {
            if (isValidDate(userContacts[i].JoinDate) === true) {
              userContacts[i].JoinDate = new Date(`${userContacts[i].JoinDate}`)
                .toISOString()
                .slice(0, 10);
            } else {
              return res.status(200).send({
                status: 402,
                message:
                  "JoinDate Should be in 'yyyy-mm-dd' Format" +
                  ': ' +
                  userContacts[i].Mobileno,
              });
            }
          }
        } else {
          return res.status(200).send({
            status: 402,
            message:
              'Join Date is require for' + ': ' + userContacts[i].Mobileno,
          });
        }

        if (
          userContacts[i].BirthDate != null &&
          userContacts[i].BirthDate != ''
        ) {
          if (typeof userContacts[i].BirthDate == 'number') {
            userContacts[i].BirthDate = new Date(
              Math.round(userContacts[i].BirthDate - 25569) * 86400 * 1000,
            )
              .toISOString()
              .slice(0, 10);
          } else {
            if (isValidDate(userContacts[i].BirthDate) === true) {
              userContacts[i].BirthDate = new Date(
                `${userContacts[i].BirthDate}`,
              )
                .toISOString()
                .slice(0, 10);
            } else {
              return res.status(200).send({
                status: 402,
                message:
                  "BirthDate Should be in 'yyyy-mm-dd' Format" +
                  ': ' +
                  userContacts[i].Mobileno,
              });
            }
          }
        } else {
          userContacts[i].BirthDate = null;
        }

        // Tracking (fully optional — only touches DB if any of the 3 fields are provided)
        const hasTrackingInput =
          (userContacts[i].Tracking != null &&
            String(userContacts[i].Tracking).trim() != '') ||
          (userContacts[i].TrackingTimeInterval != null &&
            String(userContacts[i].TrackingTimeInterval).trim() != '') ||
          (userContacts[i].StatusMonitoring != null &&
            String(userContacts[i].StatusMonitoring).trim() != '');

        if (hasTrackingInput) {
          // Tracking
          if (
            userContacts[i].Tracking != null &&
            String(userContacts[i].Tracking).trim() != ''
          ) {
            const trackingVal = String(userContacts[i].Tracking)
              .toLowerCase()
              .trim();
            if (trackingVal == 'yes') {
              userContacts[i].Tracking = 1;
            } else if (trackingVal == 'no') {
              userContacts[i].Tracking = 0;
            } else
              return res.status(200).send({
                status: 402,
                message:
                  'Invalid Tracking value for' +
                  ': ' +
                  userContacts[i].Mobileno,
              });
          } else {
            userContacts[i].Tracking = 0;
          }

          // TrackingTimeInterval
          if (
            userContacts[i].Tracking == 1 &&
            (userContacts[i].TrackingTimeInterval == null ||
              String(userContacts[i].TrackingTimeInterval).trim() === '')
          ) {
            return res.status(200).send({
              status: 402,
              message:
                'TrackingTimeInterval is required for' +
                ': ' +
                userContacts[i].Mobileno,
            });
          }
          if (isNaN(Number(userContacts[i].TrackingTimeInterval))) {
            return res.status(200).send({
              status: 402,
              message:
                'TrackingTimeInterval must be numeric for' +
                ': ' +
                userContacts[i].Mobileno,
            });
          }
          userContacts[i].TrackingTimeInterval = Number(
            userContacts[i].TrackingTimeInterval,
          );

          // StatusMonitoring
          if (
            userContacts[i].StatusMonitoring != null &&
            String(userContacts[i].StatusMonitoring).trim() != ''
          ) {
            const statusVal = String(userContacts[i].StatusMonitoring)
              .toLowerCase()
              .trim();
            if (statusVal == 'yes') {
              userContacts[i].StatusMonitoring = 1;
            } else if (statusVal == 'no') {
              userContacts[i].StatusMonitoring = 0;
            } else
              return res.status(200).send({
                status: 402,
                message:
                  'Invalid Status Monitoring value for' +
                  ': ' +
                  userContacts[i].Mobileno,
              });
          } else {
            if (userContacts[i].Tracking == 1) {
              return res.status(200).send({
                status: 402,
                message:
                  'Status Monitoring is required for ' +
                  ': ' +
                  userContacts[i].Mobileno,
              });
            } else {
              userContacts[i].StatusMonitoring = 0;
            }
          }

          userContacts[i].hasTrackingData = true;
        } else {
          userContacts[i].Tracking = null;
          userContacts[i].TrackingTimeInterval = null;
          userContacts[i].StatusMonitoring = null;
          userContacts[i].hasTrackingData = false;
        }

        // Payroll Frequency
        if (showPayrollFrequency) {
          if (userContacts[i].payrollFrequency) {
            if (
              String(userContacts[i].payrollFrequency).toLowerCase().trim() ==
              String(PayrollFrequencyType.MONTHLY).toLowerCase().trim()
            ) {
              userContacts[i].payrollFrequency = PayrollFrequencyType.MONTHLY;
            } else if (
              String(userContacts[i].payrollFrequency).toLowerCase().trim() ==
              String(PayrollFrequencyType.FORTNIGHTLY).toLowerCase().trim()
            ) {
              userContacts[i].payrollFrequency =
                PayrollFrequencyType.FORTNIGHTLY;
            } else if (
              String(userContacts[i].payrollFrequency).toLowerCase().trim() ==
              String(PayrollFrequencyType.WEEKLY).toLowerCase().trim()
            ) {
              userContacts[i].payrollFrequency = PayrollFrequencyType.WEEKLY;
            } else {
              return res.status(200).send({
                status: 402,
                message:
                  'Invalid Payroll Frequency for' +
                  ': ' +
                  userContacts[i].Mobileno,
              });
            }
          } else {
            return res.status(200).send({
              status: 402,
              message:
                'Payroll Frequency is required for' +
                ': ' +
                userContacts[i].Mobileno,
            });
          }
        }

        if (
          userContacts[i].Employment_Applicable_Date != null &&
          userContacts[i].Employment_Applicable_Date != ''
        ) {
          if (typeof userContacts[i].Employment_Applicable_Date == 'number') {
            userContacts[i].Employment_Applicable_Date = new Date(
              Math.round(userContacts[i].Employment_Applicable_Date - 25569) *
                86400 *
                1000,
            )
              .toISOString()
              .slice(0, 10);
          } else {
            if (
              isValidDate(userContacts[i].Employment_Applicable_Date) === true
            ) {
              userContacts[i].Employment_Applicable_Date = new Date(
                `${userContacts[i].Employment_Applicable_Date}`,
              )
                .toISOString()
                .slice(0, 10);
            } else {
              return res.status(200).send({
                status: 402,
                message:
                  "Employment_Applicable_Date Should be in 'yyyy-mm-dd' Format" +
                  ':' +
                  userContacts[i].Mobileno,
              });
            }
          }
        } else {
          return res.status(200).send({
            status: 402,
            message:
              'Employment_Applicable_Date is required for' +
              ':' +
              userContacts[i].Mobileno,
          });
          // userContacts[i].Employment_Applicable_Date = null;
        }

        if (
          userContacts[i].Employment_End_Date != null &&
          userContacts[i].Employment_End_Date != ''
        ) {
          if (typeof userContacts[i].Employment_End_Date == 'number') {
            userContacts[i].Employment_End_Date = new Date(
              Math.round(userContacts[i].Employment_End_Date - 25569) *
                86400 *
                1000,
            )
              .toISOString()
              .slice(0, 10);
          } else {
            if (isValidDate(userContacts[i].Employment_End_Date) === true) {
              userContacts[i].Employment_End_Date = new Date(
                `${userContacts[i].Employment_End_Date}`,
              )
                .toISOString()
                .slice(0, 10);
            } else {
              return res.status(200).send({
                status: 402,
                message:
                  "Employment_End_Date Should be in 'yyyy-mm-dd' Format" +
                  ':' +
                  userContacts[i].Mobileno,
              });
            }
          }
        } else {
          userContacts[i].Employment_End_Date = null;
        }

        if (
          userContacts[i].LeftDate != null &&
          userContacts[i].LeftDate != ''
        ) {
          if (typeof userContacts[i].LeftDate == 'number') {
            userContacts[i].LeftDate = new Date(
              Math.round(userContacts[i].LeftDate - 25569) * 86400 * 1000,
            )
              .toISOString()
              .slice(0, 10);
          } else {
            if (isValidDate(userContacts[i].LeftDate) === true) {
              userContacts[i].LeftDate = new Date(`${userContacts[i].LeftDate}`)
                .toISOString()
                .slice(0, 10);
            } else {
              return res.status(200).send({
                status: 402,
                message:
                  "LeftDate Should be in 'yyyy-mm-dd' Format" +
                  ':' +
                  userContacts[i].Mobileno,
              });
            }
          }
        } else {
          userContacts[i].LeftDate = null;
        }

        // for joining and releaving date

        if (
          userContacts[i].JoinDate &&
          userContacts[i].LeftDate &&
          new Date(userContacts[i].JoinDate) >
            new Date(userContacts[i].LeftDate)
        ) {
          fs.unlink(filepath, function (err) {
            if (err) {
              console.log(err);
            } else {
            }
          });
          return res.status(statusCodes.OK).json({
            status: 401,
            message: `Relieving date must be after joining date for mobile number: ${userContacts[i].Mobileno}`,
          });
        }

        if (user && check == 1) {
          const existedLeavingDate =
            user['employeeJoiningDetails.leavingDate'] || null;
          if (
            (userContacts[i].LeftDate || existedLeavingDate) &&
            userContacts[i].LeftDate != existedLeavingDate
          ) {
            const checkAttnCal = await HrLeaveMonthlyTrans.findOne({
              where: {
                userMasterID: user.userMasterID,
                [Sequelize.Op.or]: [
                  {
                    monthenddate: {
                      [Sequelize.Op.gte]: userContacts[i].LeftDate,
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
              fs.unlink(filepath, function (err) {
                if (err) {
                  console.log(err);
                } else {
                }
              });
              return res.status(statusCodes.OK).json({
                status: 401,
                message: `Attendance already verified for ${month_dict[String(checkAttnCal.AttnYearMon).slice(4, 6)] + '-' + String(checkAttnCal.AttnYearMon).slice(0, 4)}. Relieving date change not allowed (Mobile: ${userContacts[i].Mobileno}).`,
              });
            }
          }
        }

        if (
          userContacts[i].PF_JoinDate != null &&
          userContacts[i].PF_JoinDate != ''
        ) {
          if (typeof userContacts[i].PF_JoinDate == 'number') {
            userContacts[i].PF_JoinDate = new Date(
              Math.round(userContacts[i].PF_JoinDate - 25569) * 86400 * 1000,
            )
              .toISOString()
              .slice(0, 10);
          } else {
            if (isValidDate(userContacts[i].PF_JoinDate) === true) {
              userContacts[i].PF_JoinDate = new Date(
                `${userContacts[i].PF_JoinDate}`,
              )
                .toISOString()
                .slice(0, 10);
            } else {
              return res.status(200).send({
                status: 402,
                message:
                  "PF_JoinDate Should be in 'yyyy-mm-dd' Format" +
                  ':' +
                  userContacts[i].Mobileno,
              });
            }
          }
        } else {
          userContacts[i].PF_JoinDate = null;
        }

        if (
          userContacts[i].ESI_JoinDate != null &&
          userContacts[i].ESI_JoinDate != ''
        ) {
          if (typeof userContacts[i].ESI_JoinDate == 'number') {
            userContacts[i].ESI_JoinDate = new Date(
              Math.round(userContacts[i].ESI_JoinDate - 25569) * 86400 * 1000,
            )
              .toISOString()
              .slice(0, 10);
          } else {
            if (isValidDate(userContacts[i].ESI_JoinDate) === true) {
              userContacts[i].ESI_JoinDate = new Date(
                `${userContacts[i].ESI_JoinDate}`,
              )
                .toISOString()
                .slice(0, 10);
            } else {
              return res.status(200).send({
                status: 402,
                message:
                  "ESI_JoinDate Should be in 'yyyy-mm-dd' Format" +
                  ':' +
                  userContacts[i].Mobileno,
              });
            }
          }
        } else {
          userContacts[i].ESI_JoinDate = null;
        }

        //validate mobile

        if (
          userContacts[i].Mobileno != null &&
          userContacts[i].Mobileno != ''
        ) {
          // let regex = new RegExp('^[0-9]{10}$');

          let regex;
          if (!pihMobileNo) {
            regex = new RegExp('^[0-9]{10}$');
          } else {
            regex = new RegExp('^[0-9]{8,14}$');
          }
          let data = regex.test(userContacts[i].Mobileno);

          if (data == false) {
            return res.status(200).send({
              status: 402,
              message:
                'Mobile No. is not valid ' + ': ' + userContacts[i].Mobileno,
            });
          }
        }

        // validate other contact number
        if (userContacts[i].otherContactNumber) {
          // let regex = new RegExp("^[0-9]{10}$");
          let regex;
          if (!pihMobileNo) {
            regex = new RegExp('^[0-9]{10}$');
          } else {
            regex = new RegExp('^[0-9]{8,14}$');
          }
          let data = regex.test(userContacts[i].otherContactNumber);

          if (data == false) {
            return res.status(200).send({
              status: 402,
              message: `${othernumberLabel} is not valid : ${userContacts[i].Mobileno}`,
            });
          }
        }
        // validate other contact number
        if (userContacts[i].cugNumber) {
          // let regex = new RegExp("^[0-9]{10}$");
          let regex;
          if (!pihMobileNo) {
            regex = new RegExp('^[0-9]{10}$');
          } else {
            regex = new RegExp('^[0-9]{8,14}$');
          }
          let data = regex.test(userContacts[i].cugNumber);

          if (data == false) {
            return res.status(200).send({
              status: 402,
              message: `Cug Number is not valid : ${userContacts[i].Mobileno}`,
            });
          }
        }
        //validate email

        if (
          userContacts[i].Email_Id != null &&
          userContacts[i].Email_Id != ''
        ) {
          let regex = new RegExp(
            '^[a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,6}$',
          );

          let email = regex.test(userContacts[i].Email_Id);

          if (email == false) {
            return res.status(200).send({
              status: 402,
              message:
                'Enter Valid Email for' + ': ' + userContacts[i].Mobileno,
            });
          }
        }
        // Validate Official Email
        if (
          userContacts[i].officalEmail != null &&
          userContacts[i].officalEmail != ''
        ) {
          let regex = new RegExp(
            '^[a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,6}$',
          );

          let email = regex.test(userContacts[i].officalEmail);

          if (email == false) {
            return res.status(200).send({
              status: 402,
              message:
                'Enter Valid Official Email for' +
                ': ' +
                userContacts[i].Mobileno,
            });
          }
        }
        // validate account number

        if (
          userContacts[i].AccountNo != null &&
          userContacts[i].AccountNo != ''
        ) {
          let regex = new RegExp('[0-9]$');

          let data = regex.test(userContacts[i].AccountNo);

          if (data == false) {
            return res.status(200).send({
              status: 402,
              message:
                'Account No. Should be Only Numbers for' +
                ': ' +
                userContacts[i].Mobileno,
            });
          }
        }

        // validate IFSC code

        if (
          userContacts[i].IFSCCode != null &&
          userContacts[i].IFSCCode != '' &&
          showBankBranch == 'false' &&
          validateIfscCode
        ) {
          let regExp = new RegExp('^[A-Z]{4}0[A-Z0-9]{6}$');

          let data = regExp.test(userContacts[i].IFSCCode);

          if (data == false) {
            return res.status(200).send({
              status: 402,
              message:
                'IFSC code Invalid for' + ': ' + userContacts[i].Mobileno,
            });
          }
        }
        // Check For Bank Branch
        if (userContacts[i].bankBranchID != null) {
          const bankBranchValidate = AllBankBranch.find(
            (s) =>
              s.bankBranchCode.trim().toLowerCase() ===
              userContacts[i].bankBranchID.toString().trim().toLowerCase(),
          );
          if (!bankBranchValidate) {
            return res.status(200).send({
              status: 402,
              message:
                'Bank Branch Code With ' +
                `${userContacts[i].bankBranchID}` +
                ' Does Not Exist',
            });
          } else {
            userContacts[i].bankBranchID = bankBranchValidate.bankBranchID;
          }
        }
        // validate bithdate

        if (
          userContacts[i].BirthDate != null &&
          userContacts[i].BirthDate != ''
        ) {
          if (new Date(userContacts[i].BirthDate) > new Date()) {
            return res.status(200).send({
              status: 402,
              message:
                "Birth Date can't be future date for" +
                ': ' +
                userContacts[i].Mobileno,
            });
          }
        }

        // validate pancard

        if (
          userContacts[i].PANNo != null &&
          userContacts[i].PANNo != '' &&
          validatePanNumber
        ) {
          let regex = new RegExp('^[A-Z]{5}[0-9]{4}[A-Z]{1}$');

          let data = regex.test(userContacts[i].PANNo);

          if (data == false) {
            return res.status(200).send({
              status: 402,
              message:
                'PANNo is not valid of' + ': ' + userContacts[i].Mobileno,
            });
          }
        }

        // validate adhar

        if (
          userContacts[i].AadharNo != null &&
          userContacts[i].AadharNo != '' &&
          validateAadharNumber
        ) {
          let regex = new RegExp('^([0-9]){12}$');

          let data = regex.test(userContacts[i].AadharNo);

          if (data == false) {
            return res.status(200).send({
              status: 402,
              message:
                'AadharNo is not valid of' + ': ' + userContacts[i].Mobileno,
            });
          }
        }

        //validate pf number

        if (
          userContacts[i].PFNo != null &&
          userContacts[i].PFNo != '' &&
          validatePFNumber
        ) {
          let regex = new RegExp(
            '^[A-Z]{2}[\\s\\/]?[A-Z]{3}[\\s\\/]?[0-9]{7}[\\s\\/]?[0-9]{3}[\\s\\/]?[0-9]{7}$',
          );
          let data = regex.test(userContacts[i].PFNo);

          if (data == false) {
            return res.status(200).send({
              status: 402,
              message: 'PFNo is not valid of' + ': ' + userContacts[i].Mobileno,
            });
          }
        }

        //validate UANNo

        if (
          userContacts[i].UANNo != null &&
          userContacts[i].UANNo != '' &&
          validateUAN
        ) {
          let regex = new RegExp('^[0-9]{12}$');
          let data = regex.test(userContacts[i].UANNo);

          if (data == false) {
            return res.status(200).send({
              status: 402,
              message:
                'UANNo is not valid of' + ': ' + userContacts[i].Mobileno,
            });
          }
        }

        //validate ESINo

        if (
          userContacts[i].ESINo != null &&
          userContacts[i].ESINo != '' &&
          validateESICNumber
        ) {
          let regex = new RegExp('[0-9]$');
          let data = regex.test(userContacts[i].ESINo);

          if (data == false) {
            return res.status(200).send({
              status: 402,
              message:
                'ESINo is not valid of' + ': ' + userContacts[i].Mobileno,
            });
          }
        }

        // PF_bankACNO

        if (
          userContacts[i].PF_bankACNO != null &&
          userContacts[i].PF_bankACNO != ''
        ) {
          let regex = new RegExp('[0-9]$');

          let data = regex.test(userContacts[i].PF_bankACNO);

          if (data == false) {
            return res.status(200).send({
              status: 402,
              message:
                'PF_bankACNO Should be Only Numbers for' +
                ': ' +
                userContacts[i].Mobileno,
            });
          }
        }

        // PF_bankIFSC

        if (
          userContacts[i].PF_bankIFSC != null &&
          userContacts[i].PF_bankIFSC != '' &&
          validateIfscCode
        ) {
          let regExp = new RegExp('^[A-Z]{4}0[A-Z0-9]{6}$');

          let data = regExp.test(userContacts[i].PF_bankIFSC);

          if (data == false) {
            return res.status(200).send({
              status: 402,
              message:
                'PF_bankIFSC code Invalid for' +
                ': ' +
                userContacts[i].Mobileno,
            });
          }
        }

        // notice period

        if (
          userContacts[i].Notice_Period != null &&
          userContacts[i].Notice_Period != ''
        ) {
          let regExp = new RegExp('[0-9]$');

          let data = regExp.test(userContacts[i].Notice_Period);

          if (data == false) {
            return res.status(200).send({
              status: 402,
              message:
                'Notice_Period is allow only numbers ' +
                ': ' +
                userContacts[i].Mobileno,
            });
          }
        }

        // Overtime

        if (
          userContacts[i].Overtime != null &&
          userContacts[i].Overtime != ''
        ) {
          if (userContacts[i].Overtime.toLowerCase().trim() == 'yes') {
            userContacts[i].Overtime = 1;
          } else if (userContacts[i].Overtime.toLowerCase().trim() == 'no') {
            userContacts[i].Overtime = 0;
          } else {
            return res.status(200).send({
              status: 402,
              message: 'Invalid Overtime of' + ': ' + userContacts[i].Mobileno,
            });
          }
        } else {
          userContacts[i].Overtime = null;
        }

        // Full Month Presence

        if (userContacts[i].fullMonthPresence) {
          if (
            String(userContacts[i].fullMonthPresence).toLowerCase().trim() ==
            'yes'
          ) {
            userContacts[i].fullMonthPresence = 1;
          } else if (
            String(userContacts[i].fullMonthPresence).toLowerCase().trim() ==
            'no'
          ) {
            userContacts[i].fullMonthPresence = 0;
          } else {
            return res.status(200).send({
              status: 402,
              message:
                'Invalid Full Month Presence of' +
                ': ' +
                userContacts[i].Mobileno,
            });
          }
        } else {
          userContacts[i].fullMonthPresence = 0;
        }

        // for nationality
        if (
          userContacts[i].Nationality != null &&
          userContacts[i].Nationality != ''
        ) {
          const findNationality = Nationality.find(
            (e) => e == userContacts[i].Nationality,
          );
          if (!findNationality) {
            return res.status(200).send({
              status: 402,
              message:
                'Invalid Nationality for ' + ': ' + userContacts[i].Mobileno,
            });
          }
        } else {
          userContacts[i].Nationality = null;
        }

        // for blood group

        if (
          userContacts[i].BloodGroup != null &&
          userContacts[i].BloodGroup != ''
        ) {
          if (userContacts[i].BloodGroup.toLowerCase().trim() == 'a+') {
            userContacts[i].BloodGroup = 'A+';
          } else if (userContacts[i].BloodGroup.toLowerCase().trim() == 'a-') {
            userContacts[i].BloodGroup = 'A-';
          } else if (userContacts[i].BloodGroup.toLowerCase().trim() == 'b+') {
            userContacts[i].BloodGroup = 'B+';
          } else if (userContacts[i].BloodGroup.toLowerCase().trim() == 'b-') {
            userContacts[i].BloodGroup = 'B-';
          } else if (userContacts[i].BloodGroup.toLowerCase().trim() == 'o+') {
            userContacts[i].BloodGroup = 'O+';
          } else if (userContacts[i].BloodGroup.toLowerCase().trim() == 'o-') {
            userContacts[i].BloodGroup = 'O-';
          } else if (userContacts[i].BloodGroup.toLowerCase().trim() == 'ab+') {
            userContacts[i].BloodGroup = 'AB+';
          } else if (userContacts[i].BloodGroup.toLowerCase().trim() == 'ab-') {
            userContacts[i].BloodGroup = 'AB-';
          } else {
            return res.status(200).send({
              status: 402,
              message:
                'Invalid BloodGroup for ' + ': ' + userContacts[i].Mobileno,
            });
          }
        } else {
          userContacts[i].BloodGroup = null;
        }

        // for marital status check

        if (
          userContacts[i].Marital_Status != null &&
          userContacts[i].Marital_Status != ''
        ) {
          if (userContacts[i].Marital_Status.toLowerCase().trim() == 'single') {
            userContacts[i].Marital_Status = 'Single';
          } else if (
            userContacts[i].Marital_Status.toLowerCase().trim() == 'married'
          ) {
            userContacts[i].Marital_Status = 'Married';
          } else if (
            userContacts[i].Marital_Status.toLowerCase().trim() == 'widowed'
          ) {
            userContacts[i].Marital_Status = 'Widowed';
          } else if (
            userContacts[i].Marital_Status.toLowerCase().trim() == 'separated'
          ) {
            userContacts[i].Marital_Status = 'Separated';
          } else if (
            userContacts[i].Marital_Status.toLowerCase().trim() == 'divorced'
          ) {
            userContacts[i].Marital_Status = 'Divorced';
          } else {
            return res.status(200).send({
              status: 402,
              message:
                'Invalid Marital_Status' + ': ' + userContacts[i].Mobileno,
            });
          }
        } else {
          userContacts[i].Marital_Status = null;
        }

        // for salary base check

        if (
          userContacts[i].SalaryBase != null &&
          userContacts[i].SalaryBase != ''
        ) {
          if (userContacts[i].SalaryBase.toLowerCase().trim() == 's') {
            userContacts[i].SalaryBase = 'S';
          } else if (userContacts[i].SalaryBase.toLowerCase().trim() == 'f') {
            userContacts[i].SalaryBase = 'F';
          } else if (userContacts[i].SalaryBase.toLowerCase().trim() == 'w') {
            userContacts[i].SalaryBase = 'W';
          } else {
            return res.status(200).send({
              status: 402,
              message: 'Invalid Salary_Base' + ': ' + userContacts[i].Mobileno,
            });
          }
        } else {
          userContacts[i].SalaryBase = null;
        }

        // for gender check

        if (userContacts[i].Gender != null && userContacts[i].Gender != '') {
          if (userContacts[i].Gender.toLowerCase().trim() == 'male') {
            userContacts[i].Gender = 'male';
          } else if (userContacts[i].Gender.toLowerCase().trim() == 'female') {
            userContacts[i].Gender = 'female';
          } else if (userContacts[i].Gender.toLowerCase().trim() == 'other') {
            userContacts[i].Gender = 'other';
          } else {
            return res.status(200).send({
              status: 402,
              message: 'Invalid Gender' + ': ' + userContacts[i].Mobileno,
            });
          }
        } else {
          userContacts[i].Gender = null;
        }

        // Salary_Type

        const workertTypeList = saveraCompanyIDs.includes(+companyMasterID)
          ? listSaveraWorkerType
          : listWorkerTypes;

        if (userContacts[i].Salary_Type) {
          const workerType =
            workertTypeList.find(
              (e) =>
                e.key.toLowerCase().trim() ==
                String(userContacts[i].Salary_Type).toLowerCase().trim(),
            ) || null;

          if (!workerType)
            return res.status(200).send({
              status: 402,
              message:
                'Invalid Worker Type for' + ': ' + userContacts[i].Mobileno,
            });

          userContacts[i].Salary_Type = workerType.value;
        } else {
          return res.status(200).send({
            status: 402,
            message:
              'Worker Type is required for' + ': ' + userContacts[i].Mobileno,
          });
        }

        // for employee role check

        if (userContacts[i].Employeement_Type) {
          const employeementType =
            EmployementTypeList.find(
              (e) =>
                e.key.toLowerCase().trim() ==
                String(userContacts[i].Employeement_Type).toLowerCase().trim(),
            ) || null;

          if (!employeementType) {
            return res.status(200).send({
              status: 402,
              message:
                'Invalid Employeement_Type for' +
                ': ' +
                userContacts[i].Mobileno,
            });
          }

          const workerCategory =
            workertTypeList.find(
              (e) =>
                e.value.toLowerCase().trim() ==
                String(userContacts[i].Salary_Type).toLowerCase().trim(),
            )?.category || null;

          if (workerCategory != employeementType?.category) {
            return res.status(200).send({
              status: 402,
              message:
                `Invalid Worker Type OR Employment Type For` +
                ': ' +
                userContacts[i].Mobileno,
            });
          }

          userContacts[i].Employeement_Type = employeementType.value;

          if (
            userContacts[i].Employeement_Type ==
              employeementTypeEnumList.Contract
          ) {
            if (userContacts[i].contractor_Name) {
              const contractorValidate = AllContractor.find((s) => {
                if (
                  s.trim().toLowerCase() ===
                  userContacts[i].contractor_Name.trim().toLowerCase()
                ) {
                  return s;
                }
              });

              if (!contractorValidate) {
                return res.status(200).send({
                  status: 402,
                  message: `Contractor With Name ${userContacts[i].contractor_Name} Does Not Exist`,
                });
              } else {
                const findContractor = contractorCheck.find((s) => {
                  if (
                    s.contractorName.trim().toLowerCase() ===
                    userContacts[i].contractor_Name.trim().toLowerCase()
                  ) {
                    return s;
                  }
                });
                userContacts[i].contractor_Name = findContractor.contractorId;
              }
            } else {
              return res.status(200).send({
                status: 402,
                message: `For contractual employee, Contractor Name is mandatory. Please check entry with Mobile No: ${userContacts[i].Mobileno}`,
              });
            }
          }
          // if (
          //   userContacts[i].Employeement_Type.toLowerCase().trim() == 'confirm'
          // ) {
          //   userContacts[i].Employeement_Type = 'Confirm';
          // } else if (
          //   userContacts[i].Employeement_Type.toLowerCase().trim() ==
          //   'permanent'
          // ) {
          //   userContacts[i].Employeement_Type = 'Permanent';
          // } else if (
          //   userContacts[i].Employeement_Type.toLowerCase().trim() ==
          //   'probation'
          // ) {
          //   userContacts[i].Employeement_Type = 'Probation';
          // } else if (
          //   userContacts[i].Employeement_Type.toLowerCase().trim() == 'trainee'
          // ) {
          //   userContacts[i].Employeement_Type = 'Trainee';
          // } else if (
          //   userContacts[i].Employeement_Type.toLowerCase().trim() ==
          //   'apprenticeship'
          // ) {
          //   userContacts[i].Employeement_Type = 'Apprenticeship';
          // } else if (
          //   userContacts[i].Employeement_Type.toLowerCase().trim() == 'contract'
          // ) {
          //   userContacts[i].Employeement_Type = 'Contract';
          //   if (check == 0) {
          //     if (
          //       userContacts[i].contractor_Name != null &&
          //       userContacts[i].contractor_Name != ''
          //     ) {
          //       const contractorValidate = AllContractor.find((s) => {
          //         if (
          //           s.trim().toLowerCase() ===
          //           userContacts[i].contractor_Name.trim().toLowerCase()
          //         ) {
          //           return s;
          //         }
          //       });

          //       if (!contractorValidate) {
          //         return res.status(200).send({
          //           status: 402,
          //           message: `Contractor With Name ${userContacts[i].contractor_Name} Does Not Exist`,
          //         });
          //       } else {
          //         const findContractor = contractorCheck.find((s) => {
          //           if (
          //             s.contractorName.trim().toLowerCase() ===
          //             userContacts[i].contractor_Name.trim().toLowerCase()
          //           ) {
          //             return s;
          //           }
          //         });
          //         userContacts[i].contractor_Name = findContractor.contractorId;
          //       }
          //     } else {
          //       return res.status(200).send({
          //         status: 402,
          //         message: `For contractual employee, Contractor Name is mandatory. Please check entry with Mobile No: ${userContacts[i].Mobileno}`,
          //       });
          //     }
          //   }
          // } else if (
          //   userContacts[i].Employeement_Type.toLowerCase().trim() == 'locum'
          // ) {
          //   userContacts[i].Employeement_Type = 'Locum';
          // } else {
          //   return res.status(200).send({
          //     status: 402,
          //     message:
          //       'Invalid Employeement_Type for' +
          //       ': ' +
          //       userContacts[i].Mobileno,
          //   });
          // }
        } else {
          return res.status(200).send({
            status: 402,
            message:
              ' Employeement_Type is required for' +
              ': ' +
              userContacts[i].Mobileno,
          });
        }

        // physical disability check
        if (
          userContacts?.[i].Physical_Handicap?.toLowerCase().trim() == 'yes'
        ) {
          userContacts[i].Physical_Handicap = 'Yes';
        } else {
          userContacts[i].Physical_Handicap = 'No';
        }

        // Allowed attendance From

        if (userContacts[i].attendanceFrom) {
          let attendanceFrom = String(userContacts[i].attendanceFrom)
            .toLowerCase()
            .trim();

          if (allowedAttendanceSources.includes(attendanceFrom)) {
            userContacts[i].attendanceFrom = attendanceFrom;
          } else {
            return res.status(200).send({
              status: 402,
              message:
                ' Attendance From for' +
                ': ' +
                userContacts[i].Mobileno +
                ' is Not Valid',
            });
          }
        } else {
          userContacts[i].attendanceFrom = null;
        }

        if (check == 0) {
          const branchvalidate = AllBranches.filter((s) => {
            if (
              s.trim().toLowerCase() ===
              userContacts[i].Branch.trim().toLowerCase()
            ) {
              return s;
            }
          });

          if (branchvalidate.length == 0) {
            return res.status(200).send({
              status: 402,
              message:
                'Branch' +
                ' ' +
                `${userContacts[i].Branch}` +
                ' ' +
                'Does Not Exist',
            });
          }

          const departmentvalidate = AllDepartment.filter((s) => {
            if (
              s.trim().toLowerCase() ===
              userContacts[i].Department.trim().toLowerCase()
            ) {
              return s;
            }
          });

          if (departmentvalidate.length == 0) {
            return res.status(200).send({
              status: 402,
              message:
                'Department' +
                ' ' +
                `${userContacts[i].Department}` +
                ' ' +
                'Does Not Exist',
            });
          }

          // Check skillCategory

          let skillCategory = null;

          if (userContacts[i].SkillCategory) {
            skillCategory = String(userContacts[i].SkillCategory)
              .toLowerCase()
              .trim();

            if (!allSkillCategory.includes(skillCategory)) {
              return res.status(200).send({
                status: 402,
                message: 'Please pass Valid SkillCategory!',
              });
            }

            skillCategory = skillCategory == 'na' ? 'NA' : skillCategory;

            userContacts[i].SkillCategory = skillCategory;
          } else {
            return res.status(200).send({
              status: 402,
              message:
                ' SkillCategory is required for' +
                ': ' +
                userContacts[i].Mobileno,
            });
          }

          const filteredDesignation = DesignationCheck.find((item) => {
            const isDesignationMatch =
              item.designationName?.trim().toLowerCase() ===
              String(userContacts[i].Designation).trim().toLowerCase();

            const isSkillCategoryMatch =
              !skillCategory ||
              !item.skillCategory?.length ||
              item.skillCategory.includes(skillCategory);

            return isDesignationMatch && isSkillCategoryMatch;
          });

          if (!filteredDesignation) {
            const msg = skillCategory
              ? `Designation (${userContacts[i].Designation}) does not belong to Skill Category '${skillCategory}'`
              : `Designation (${userContacts[i].Designation}) does not exist `;

            return res.status(200).send({
              status: 402,
              message: `${msg} for ${userContacts[i].Mobileno}`,
            });
          }

          // const desigantionvalidate = AllDesignation.filter((s) => {
          //   if (
          //     s.trim().toLowerCase() ===
          //     userContacts[i].Designation.trim().toLowerCase()
          //   ) {
          //     return s;
          //   }
          // });

          // if (desigantionvalidate.length == 0) {
          //   return res.status(200).send({
          //     status: 402,
          //     message:
          //       'Designation' +
          //       ' ' +
          //       `${userContacts[i].Designation}` +
          //       ' ' +
          //       'Does Not Exist',
          //   });
          // }
          if (
            userContacts[i].Division_Applicable_Date != null &&
            userContacts[i].Division_Applicable_Date != '' &&
            userContacts[i].Division != null &&
            userContacts[i].Division != ''
          ) {
            const divisionValidate = AllDivision.filter((s) => {
              if (
                s.trim().toLowerCase() ===
                userContacts[i].Division.trim().toLowerCase()
              ) {
                return s;
              }
            });

            if (divisionValidate.length == 0) {
              return res.status(200).send({
                status: 402,
                message:
                  'Division' +
                  ' ' +
                  `${userContacts[i].Division}` +
                  ' ' +
                  'Does Not Exist',
              });
            }
          }
          if (
            userContacts[i].WorkingArea_Applicable_Date != null &&
            userContacts[i].WorkingArea_Applicable_Date != '' &&
            userContacts[i].WorkingArea != null &&
            userContacts[i].WorkingArea != ''
          ) {
            const workingAreaValidate = AllWorkingArea.filter((s) => {
              if (
                s.trim().toLowerCase() ===
                userContacts[i].WorkingArea.trim().toLowerCase()
              ) {
                return s;
              }
            });

            if (workingAreaValidate.length == 0) {
              return res.status(200).send({
                status: 402,
                message:
                  'Working Area' +
                  ' ' +
                  `${userContacts[i].WorkingArea}` +
                  ' ' +
                  'Does Not Exist',
              });
            }
          }
          // shift check

          if (userContacts[i].SHIFT != null && userContacts[i].SHIFT != '') {
            const Shiftvalidate = AllShift.filter((s) => {
              if (
                s.trim().toLowerCase() ===
                userContacts[i].SHIFT.trim().toLowerCase()
              ) {
                return s;
              }
            });

            const shiftData = ShiftCheck.find(
              (e) =>
                String(e.shiftName).trim().toLowerCase() ==
                String(userContacts[i].SHIFT).trim().toLowerCase(),
            );

            if (Shiftvalidate.length == 0 || !shiftData) {
              return res.status(200).send({
                status: 402,
                message:
                  'Shift' +
                  ' ' +
                  `${userContacts[i].SHIFT}` +
                  ' ' +
                  'Does Not Exist',
              });
            }

            const shiftWorkerType = shiftData.workerType || [];

            if (shiftWorkerType.length) {
              const match = shiftWorkerType.some(
                (e) => e.workerType == userContacts[i].Salary_Type,
              );

              if (!match) {
                return res.status(200).send({
                  status: 402,
                  message: `Shift and User workerType does not match for ${userContacts[i].Mobileno}`,
                });
              }
            }
          }
        }

        //  check attendance policy

        if (
          userContacts[i].Attendance_Policy != null &&
          userContacts[i].Attendance_Policy != ''
        ) {
          const AttendancePolicyvalidate = AllAttendancePolicy.filter((s) => {
            if (
              s.trim().toLowerCase() ===
              userContacts[i].Attendance_Policy.trim().toLowerCase()
            ) {
              return s;
            }
          });

          if (AttendancePolicyvalidate.length == 0) {
            return res.status(200).send({
              status: 402,
              message:
                'Attendance Policy' +
                ' ' +
                `${userContacts[i].Attendance_Policy}` +
                ' ' +
                'Does Not Exist',
            });
          }
        }

        //  check salary policy

        if (
          userContacts[i].Salary_Policy != null &&
          userContacts[i].Salary_Policy != ''
        ) {
          const SalaryPolicyvalidate = SalaryPolicyCheck.find(
            (e) =>
              String(e.salaryPolicyName).trim().toLowerCase() ==
              String(userContacts[i].Salary_Policy).trim().toLowerCase(),
          );

          if (!SalaryPolicyvalidate) {
            return res.status(200).send({
              status: 402,
              message:
                'Salary Policy' +
                ' ' +
                `${userContacts[i].Mobileno}` +
                ' ' +
                'Does Not Exist',
            });
          }

          // check assign salary policy validation

          const payrollFrequency =
            userContacts[i].payrollFrequency || PayrollFrequencyType.MONTHLY;

          if (SalaryPolicyvalidate?.payrollFrequency != payrollFrequency) {
            return res.status(200).send({
              status: 402,
              message: `Payroll frequency mismatch between the employee and the salary policy for mobile number '${userContacts[i].Mobileno}'.`,
            });
          }
        }

        //  check weekoff policy

        if (
          userContacts[i].WeekOff_Policy != null &&
          userContacts[i].WeekOff_Policy != ''
        ) {
          const WeekPolicyvalidate = AllWeekoffPolicy.filter((s) => {
            if (
              s.trim().toLowerCase() ===
              userContacts[i].WeekOff_Policy.trim().toLowerCase()
            ) {
              return s;
            }
          });

          if (WeekPolicyvalidate.length == 0) {
            return res.status(200).send({
              status: 402,
              message:
                'WeekOff Policy' +
                ' ' +
                `${userContacts[i].WeekOff_Policy}` +
                ' ' +
                'Does Not Exist',
            });
          }
        }

        //  check Holiday policy

        if (
          userContacts[i].Holiday_Policy != null &&
          userContacts[i].Holiday_Policy != ''
        ) {
          const HolidayPolicyvalidate = AllHolidayPolicy.filter((s) => {
            if (
              s.trim().toLowerCase() ===
              userContacts[i].Holiday_Policy.trim().toLowerCase()
            ) {
              return s;
            }
          });

          if (HolidayPolicyvalidate.length == 0) {
            return res.status(200).send({
              status: 402,
              message:
                'Holiday Policy' +
                ' ' +
                `${userContacts[i].Holiday_Policy}` +
                ' ' +
                'Does Not Exist',
            });
          }

          // only for update

          if (check == 1) {
            const checkHoliday = HolidayPolicyCheck.find(
              (e) =>
                String(e.holidayPolicyName).trim().toLowerCase() ==
                String(userContacts[i].Holiday_Policy).trim().toLowerCase(),
            );

            if (checkHoliday) {
              const holidayPolicyYear = checkHoliday.holidayYear;

              if (holidayPolicyYear != currentYear) {
                return res.status(200).send({
                  status: 402,
                  message: `Hoiday Policy (${userContacts[i].Holiday_Policy}) year and current year does not match for '${userContacts[i].Mobileno}' `,
                });
              }
            }
          }
        }

        //  check  salary structure

        if (
          userContacts[i].Salary_Grade != null &&
          userContacts[i].Salary_Grade != ''
        ) {
          const SalaryGradevalidate = AllSalaryGrade.filter((s) => {
            if (
              s.trim().toLowerCase() ===
              userContacts[i].Salary_Grade.trim().toLowerCase()
            ) {
              return s;
            }
          });

          if (SalaryGradevalidate.length == 0) {
            return res.status(200).send({
              status: 402,
              message:
                'Salary Grade' +
                ' ' +
                `${userContacts[i].Salary_Grade}` +
                ' ' +
                'Does Not Exist',
            });
          }
        }

        //  check State

        if (
          userContacts[i].StateForPT != null &&
          userContacts[i].StateForPT != ''
        ) {
          const Statevalidate = AllState.filter((s) => {
            if (
              s.trim().toLowerCase() ===
              userContacts[i].StateForPT.trim().toLowerCase()
            ) {
              return s;
            }
          });

          if (Statevalidate.length == 0) {
            return res.status(200).send({
              status: 402,
              message:
                'State' +
                ' ' +
                `${userContacts[i].StateForPT}` +
                ' ' +
                'Does Not Exist',
            });
          }
        }

        // bank

        if (userContacts[i].Bank != null && userContacts[i].Bank != '') {
          const bankvalidate = AllBank.filter((s) => {
            if (
              s.trim().toLowerCase() ===
              userContacts[i].Bank.trim().toLowerCase()
            ) {
              return s;
            }
          });

          if (bankvalidate.length == 0) {
            return res.status(200).send({
              status: 402,
              message:
                'Bank' +
                ' ' +
                `${userContacts[i].Bank}` +
                ' ' +
                'Does Not Exist',
            });
          }
        }

        // pf bank

        if (userContacts[i].PF_Bank != null && userContacts[i].PF_Bank != '') {
          const pfbankvalidate = AllBank.filter((s) => {
            if (
              s.trim().toLowerCase() ===
              userContacts[i].PF_Bank.trim().toLowerCase()
            ) {
              return s;
            }
          });

          if (pfbankvalidate.length == 0) {
            return res.status(200).send({
              status: 402,
              message:
                ' PF Bank' +
                ' ' +
                `${userContacts[i].PF_Bank}` +
                ' ' +
                'Does Not Exist',
            });
          }
        }

        if (
          userContacts[i].Gross_Salary != null &&
          userContacts[i].Gross_Salary != ''
        ) {
          if (
            userContacts[i].Salary_Grade != null &&
            userContacts[i].Salary_Grade != ''
          ) {
          } else {
            return res.status(200).send({
              status: 402,
              message:
                'Salary_Grade is required for employee ' +
                ' : ' +
                `'${userContacts[i].First_Name}'` +
                ' ',
            });
          }
          //only for update
          if (check == 1) {
            if (!userContacts[i].SalaryFromYYYYMM) {
              return res.status(200).send({
                status: 402,
                message:
                  'SalaryFromYYYYMM is required for employee ' +
                  ' : ' +
                  `'${userContacts[i].First_Name}'` +
                  ' ',
              });
            }

            let regex = new RegExp('^[0-9]{6}$');

            let data = regex.test(userContacts[i].SalaryFromYYYYMM);

            if (data == false) {
              return res.status(200).send({
                status: 402,
                message:
                  'SalaryFromYYYYMM is not valid for ' +
                  ': ' +
                  userContacts[i].First_Name,
              });
            }

            const joiningMonth =
              String(userContacts[i].JoinDate).slice(0, 4) +
              String(userContacts[i].JoinDate).slice(5, 7);

            if (+joiningMonth > +userContacts[i].SalaryFromYYYYMM) {
              return res.status(200).send({
                status: 402,
                message:
                  'SalaryFromYYYYMM can not be less than joining Month for' +
                  ': ' +
                  userContacts[i].First_Name,
              });
            }
          }
        }

        // check state for grade

        if (
          userContacts[i].Salary_Grade != null &&
          userContacts[i].Salary_Grade != ''
        ) {
          if (
            userContacts[i].Gross_Salary != null &&
            userContacts[i].Gross_Salary != ''
          ) {
            const excelGross = Number(userContacts[i].Gross_Salary);

            if (!(excelGross > 0)) {
              return res.status(200).send({
                status: 402,
                message:
                  'Invalid Gross_Salary for employee ' +
                  ' : ' +
                  `'${userContacts[i].First_Name}'` +
                  ' ',
              });
            }

            let uniquedata7 = await executeQuery(
              ` 

  select * from "gradeStructures" WHERE LOWER(TRIM("gradeName")) = '` +
                userContacts[i].Salary_Grade.trim().toLowerCase() +
                `' and "companyMasterID" = ` +
                companyMasterID +
                ` and status =1 `,
            );

            let gradeid = uniquedata7[0]?.gradeStructureID || null;

            const structurePayrollFrequency =
              uniquedata7[0]?.payrollFrequency || 'Monthly';

            const grade_salary_structure_data =
              await GradeSalaryStructure.findAll({
                raw: true,
                where: {
                  gradeStructureID: gradeid,
                },
                include: [
                  {
                    model: HRSalaryFields,
                    attributes: [],
                    include: [{ model: Payheadmaster, attributes: [] }],
                  },
                  {
                    model: GradeStructure,
                    attributes: [],
                  },
                ],
                order: [
                  [
                    { model: HRSalaryFields, as: 'hrSalaryField' },
                    'salaryFieldSrNo',
                    'ASC',
                  ],
                  ['salaryfieldindex', 'ASC'],

                  // Order by payheadName in Payheadmaster
                  [
                    { model: HRSalaryFields, as: 'hrSalaryField' },
                    { model: Payheadmaster, as: 'Payheadmaster' },
                    'payheadName',
                    'ASC',
                  ],
                ],
                attributes: [
                  'gradeSalaryStructureID',
                  'gradeStructureID',
                  'salaryFieldID',
                  'fieldFixAmount',
                  'formula',
                  'salaryfieldindex',
                  'salaryfieldmaxrange',
                  'fieldFixAmount1',
                  'formula1',
                  'formulaPreference',
                  [
                    sequelize.col('hrSalaryField.payheadMasterId'),
                    'payheadMasterId',
                  ],
                  [
                    sequelize.col('hrSalaryField.salaryFieldSide'),
                    'salaryFieldSide',
                  ],
                  [
                    sequelize.col('hrSalaryField.salaryFieldAttanChk'),
                    'salaryFieldAttanChk',
                  ],
                  [
                    sequelize.col('hrSalaryField.salaryFieldWhenMonth'),
                    'salaryFieldWhenMonth',
                  ],
                  [
                    sequelize.col('hrSalaryField.salaryFieldSrNo'),
                    'salaryFieldSrNo',
                  ],
                  [
                    sequelize.col('hrSalaryField.companyMasterID'),
                    'companyMasterID',
                  ],
                  [
                    sequelize.col('hrSalaryField.payheadDisplayName'),
                    'payheadDisplayName',
                  ],

                  [sequelize.col('hrSalaryField.considerIn'), 'considerIn'],
                  [
                    sequelize.col('hrSalaryField.Payheadmaster.payheadName'),
                    'payheadName',
                  ],
                  [
                    sequelize.col('gradeStructure.baseOnCalculation'),
                    'baseOnCalculation',
                  ],

                  [
                    sequelize.col('hrSalaryField.assignSalaryRound'),
                    'assignSalaryRound',
                  ],
                  [
                    sequelize.col('hrSalaryField.assignSalaryRoundNo'),
                    'assignSalaryRoundNo',
                  ],
                  [
                    sequelize.col('hrSalaryField.assignSalaryRoundOffType'),
                    'assignSalaryRoundOffType',
                  ],
                ],
              });

            let stateRequired = false;
            let hasMinimumWages = false;

            for (const item of grade_salary_structure_data) {
              const isMinimumWages =
                item.formula?.includes('Minimum Wages') ||
                item.formula1?.includes('Minimum Wages');

              if (isMinimumWages) {
                hasMinimumWages = true;
              }

              if (
                item.payheadMasterId == payheadMasterIdsMapping.PTAX ||
                item.payheadMasterId == payheadMasterIdsMapping.EMPLOYEE_LWF ||
                item.payheadMasterId == payheadMasterIdsMapping.EMPLOYER_LWF ||
                isMinimumWages
              ) {
                stateRequired = true;
              }

              if (stateRequired && hasMinimumWages) {
                break;
              }
            }

            let user = null;

            if (check == 1) {
              user = await UserMaster.findOne({
                where: {
                  userNumber: userContacts[i].Mobileno,
                  companyMasterId: companyMasterID,
                  status: 1,
                },
              });
            }

            let SkillCategory_MinWages = null;
            // for add
            if (check == 0) {
              SkillCategory_MinWages = userContacts[i].SkillCategory;
            } else {
              if (hasMinimumWages && user) {
                const findSkillCategory = await EmployeeSkillCategory.findOne({
                  where: {
                    applicableYYYYMM: {
                      [Sequelize.Op.lte]: +userContacts[i].SalaryFromYYYYMM,
                    },
                    userMasterID: user.userMasterID,
                    [Sequelize.Op.or]: [
                      {
                        endYYYYMM: {
                          [Sequelize.Op.gte]: +userContacts[i].SalaryFromYYYYMM,
                        },
                      },
                      {
                        endYYYYMM: {
                          [Sequelize.Op.is]: null,
                        },
                      },
                    ],
                  },
                });

                SkillCategory_MinWages =
                  findSkillCategory?.skillCategory || null;
              }
            }

            // set minWagesCategory

            userContacts[i].SkillCategory_MinWages = SkillCategory_MinWages;

            // set hasMinimumWages flag

            userContacts[i].hasMinimumWages = hasMinimumWages;

            if (hasMinimumWages && !SkillCategory_MinWages) {
              return res.status(200).send({
                status: 402,
                message:
                  'SkillCategory is  required For ' +
                  ' ' +
                  `'${userContacts[i].Salary_Grade}'` +
                  ' ' +
                  ' Grade ',
              });
            }

            let stateid = null,
              corporationId = null;

            if (stateRequired) {
              if (
                userContacts[i].StateForPT != null &&
                userContacts[i].StateForPT != ''
              ) {
                let uniquedata = await executeQuery(
                  `                 
    select * from "stateMasters" where LOWER(TRIM("stateName")) = '` +
                    userContacts[i].StateForPT.trim().toLowerCase() +
                    `' and "countryMasterID"=103 and status=1 
                      `,
                );

                stateid = uniquedata[0].stateMasterID;

                // check for corpoaration

                if (userContacts[i].Corporation) {
                  const corpo = await executeQuery(
                    `                 
SELECT * from "corporations" where "stateMasterID"=${stateid} and LOWER(TRIM("corporationName")) = '` +
                      String(userContacts[i].Corporation).trim().toLowerCase() +
                      `'
                      `,
                  );

                  if (corpo.length == 0)
                    return res.status(200).send({
                      status: 402,
                      message:
                        'Corporation ' +
                        ' ' +
                        `'${userContacts[i].Corporation}'` +
                        ' ' +
                        ' does not exist!',
                    });

                  corporationId = corpo[0].id;
                } else {
                  userContacts[i].Corporation = null;
                }
              } else {
                return res.status(200).send({
                  status: 402,
                  message:
                    'State Required For ' +
                    ' ' +
                    `'${userContacts[i].Salary_Grade}'` +
                    ' ' +
                    ' Grade ',
                });
              }
            }

            //only for update
            if (check == 1) {
              if (user) {
                const yearmonth = +userContacts[i].SalaryFromYYYYMM;

                const salarydata = await getUserSalaryMasterByMonth(
                  user.userMasterID,
                  yearmonth,
                );

                const gradestructure = await executeQuery(
                  `
                      select gss."gradeStructureID", MAX(hsm."salaryFromYYYYMM") from "hrSalaryMasters" as hsm left OUTER join "gradeSalaryStructures" as gss on hsm."gradeSalaryStructureID" = gss."gradeSalaryStructureID" where hsm."userMasterID"=` +
                    user.userMasterID +
                    ` and hsm."salaryFromYYYYMM" <=` +
                    yearmonth +
                    ` GROUP BY gss."gradeStructureID",hsm."salaryFromYYYYMM" ORDER by hsm."salaryFromYYYYMM" DESC limit 1 
                       `,
                );

                if (salarydata.length > 0) {
                  const gross =
                    salarydata.find((e) => e.payheadMasterId == 50)
                      ?.EmployeeSalaryAmount || 0;

                  if (
                    gross != +userContacts[i].Gross_Salary ||
                    gradestructure[0].gradeStructureID != gradeid ||
                    +yearmonth != +gradestructure[0].max
                  ) {
                    const findsalary = await HrSalaryTransaction.findOne({
                      where: {
                        userMasterID: +user.userMasterID,
                      },
                      order: [['salaryYYYYMM', 'DESC']],
                    });

                    userContacts[i].salaryFromYYYYMM = yearmonth;

                    if (findsalary) {
                      // check if salary calculated of entered month or future month
                      if (+findsalary.salaryYYYYMM >= +yearmonth) {
                        return res.status(200).send({
                          status: 402,
                          message:
                            'Salary Already Calculated for: ' +
                            `'${findsalary.salaryYYYYMM}' month ` +
                            ' of ' +
                            ' ' +
                            `'${userContacts[i].Mobileno}'` +
                            ' ' +
                            'So, you can not update Salary_Grade ',
                        });
                      }
                    }

                    // --------------- check payroll frequency -----------------------

                    if (
                      showPayrollFrequency &&
                      userContacts[i].payrollFrequency &&
                      structurePayrollFrequency !=
                        userContacts[i].payrollFrequency
                    ) {
                      return res.status(200).send({
                        status: 402,
                        message: `Mismatch in payroll frequency for : '${userContacts[i].Mobileno}'. Please align with salary grade. `,
                      });
                    }

                    // check if entered month and current salary structure month is same
                    if (yearmonth == gradestructure[0].max) {
                      userContacts[i].deleteStructure = true;
                    }

                    userContacts[i].body = {
                      grade_salary_structure_data,
                      ctc: +userContacts[i].Gross_Salary,
                      stateid: +stateid || null,
                      AmountIn: '1',
                      yearmonth: yearmonth,
                      gender: user.gender,
                      skillCategory: userContacts[i].SkillCategory_MinWages,
                      hasMinimumWages: userContacts[i].hasMinimumWages,
                      gradeid: gradeid,
                      userMasterID: user.userMasterID,
                      corporationId,
                    };
                  }
                } else {
                  // --------------- check payroll frequency -----------------------

                  if (
                    showPayrollFrequency &&
                    userContacts[i].payrollFrequency &&
                    structurePayrollFrequency !=
                      userContacts[i].payrollFrequency
                  ) {
                    return res.status(200).send({
                      status: 402,
                      message: `Mismatch in payroll frequency for : '${userContacts[i].Mobileno}'. Please align with salary grade. `,
                    });
                  }

                  userContacts[i].body = {
                    grade_salary_structure_data,
                    ctc: +userContacts[i].Gross_Salary,
                    stateid: +stateid || null,
                    AmountIn: '1',
                    yearmonth:
                      String(userContacts[i].JoinDate).slice(0, 4) +
                      String(userContacts[i].JoinDate).slice(5, 7),
                    gender: user.gender,
                    skillCategory: userContacts[i].SkillCategory_MinWages,
                    hasMinimumWages: userContacts[i].hasMinimumWages,
                    gradeid: gradeid,
                    userMasterID: user.userMasterID,
                    corporationId,
                  };

                  userContacts[i].salaryFromYYYYMM =
                    String(userContacts[i].JoinDate).slice(0, 4) +
                    String(userContacts[i].JoinDate).slice(5, 7);
                }
              } else {
                return res.status(200).send({
                  status: 402,
                  message:
                    ' Mobile No. ' +
                    ' ' +
                    `'${userContacts[i].Mobileno}'` +
                    ' ' +
                    ' does not Exist . ',
                });
              }
            } else {
              // --------------- check payroll frequency -----------------------

              if (
                showPayrollFrequency &&
                userContacts[i].payrollFrequency &&
                structurePayrollFrequency != userContacts[i].payrollFrequency
              ) {
                return res.status(200).send({
                  status: 402,
                  message: `Mismatch in payroll frequency for : '${userContacts[i].Mobileno}'. Please align with salary grade. `,
                });
              }
            }
          } else {
            return res.status(200).send({
              status: 402,
              message:
                'Gross_Salary is  Required For ' +
                ' ' +
                `'${userContacts[i].Salary_Grade}'` +
                ' ' +
                ' Grade ',
            });
          }
        }

        const currentUserMobileNumber = userContacts[i].Mobileno.trim();
        if (check == 0) {
          // Check == 0 (Add)
          const alreadyExistUserNumberCheck = await checkAlreayExistUsernumber({
            userNumber: currentUserMobileNumber,
            companyMasterID,
          });

          if (alreadyExistUserNumberCheck.hasUser) {
            return res.status(200).json({
              status: alreadyExistUserNumberCheck.status,
              message: `Mobile No. '${currentUserMobileNumber}' Already Exist.`,
            });
          } else {
            AddArray.push(userContacts[i]);
          }
        } else {
          // Check == 1 (Update)
          if (user) {
            userContacts[i].userMasterID = user.userMasterID;
            UpdateArray.push(userContacts[i]);
          } else {
            return res.status(200).send({
              status: 402,
              message:
                ' Mobile No. ' +
                ' ' +
                `'${userContacts[i].Mobileno}'` +
                ' ' +
                ' does not Exist . ',
            });
          }
        }
      }

      const companyid = [];

      let data = await companyMaster.findOne({
        where: { companyMasterID: companyMasterID, status: 1 },
      });

      let compid;
      if (
        data.parentCompanyMasterID != null &&
        data.parentCompanyMasterID != '0'
      ) {
        compid = data.parentCompanyMasterID;

        companyid.push(parseInt(data.parentCompanyMasterID));
        let get_one_data = await companyMaster.findAll({
          where: {
            parentCompanyMasterID: data.parentCompanyMasterID,
            status: [1],
          },
        });
        for (let i = 0; i < get_one_data.length; i++) {
          companyid.push(get_one_data[i].companyMasterID);
        }
      } else {
        compid = companyMasterID;

        companyid.push(parseInt(companyMasterID));
        let get_one_data = await companyMaster.findAll({
          where: {
            parentCompanyMasterID: companyMasterID,
            status: [1],
          },
        });
        for (let i = 0; i < get_one_data.length; i++) {
          companyid.push(get_one_data[i].companyMasterID);
        }
      }

      let check_tracking = await CompanySubscriptionMaster.findOne({
        attributes: ['totalUser', 'totalTracking'],
        where: {
          companyMasterID: compid,
          status: 1,
        },
      });

      const totalcount = await UserMaster.count({
        where: {
          companyMasterId: {
            [Sequelize.Op.in]: companyid,
          },
          status: {
            [Sequelize.Op.in]: ['1'],
          },
        },
      });
      const totalTrackingUsercount = await UserTracking.count({
        where: {
          companyMasterID: {
            [Sequelize.Op.in]: companyid,
          },
          trackStatus: 1,
        },
      });
      // find payhead B and C data
      const payhead_B_C = await HRSalaryFields.findAll({
        where: {
          salaryFieldSrNo: {
            [Sequelize.Op.in]: ['B', 'C'],
          },
          status: 1,
          companyMasterID,
        },
        attributes: ['payheadMasterId', 'salaryFieldSrNo'],
        include: [{ model: Payheadmaster, attributes: ['payheadName'] }],
      });

      if (check_tracking) {
        if (UpdateArray.length > 0) {
          let bankError = false;
          try {
            await sequelize.transaction(async (t) => {
              for (let e of UpdateArray) {
                // add same company

                const userMasterID = e.userMasterID;

                let currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

                let updateusermaster = await UserMaster.update(
                  {
                    firstName: e.First_Name.trim(),
                    middleName: e.Middle_Name ? e.Middle_Name.trim() : null,
                    lastName: e.Last_Name.trim(),

                    userNumber: e.Mobileno,
                    email: e.Email_Id,
                    officalEmail: e.officalEmail,
                    dob: e.BirthDate,
                    gender: e.Gender,
                    companyMasterId: companyMasterID,
                    maratialStatus: e.Marital_Status,
                    physicalDisability: e.Physical_Handicap,
                    status: 1,
                    admin: 0,
                    displayName: e.Full_Name,
                    otherContactNumber: e.otherContactNumber,
                    cugNumber: e.cugNumber,
                    updateBy,
                    updateByIp,
                    localFName: e.localFName,
                    localMName: e.localMName,
                    localLName: e.localLName,
                    localDisplayName: e.localDisplayName,
                  },
                  {
                    where: {
                      userMasterID: userMasterID,
                    },
                    transaction: t,
                  },
                );

                let bankMasterID;

                if (e.Bank != null && e.Bank != '') {
                  let bankmaster = await executeQuery(
                    `
                   
                    select * from "bankMasters" where LOWER(TRIM("bankName")) = '` +
                      e.Bank.trim().toLowerCase() +
                      `' and status =1 
                                       `,
                  );

                  bankMasterID = bankmaster[0].bankMasterID;
                } else {
                  bankMasterID = null;
                }

                // pf bank

                let pfbankMasterID;

                if (e.PF_Bank != null && e.PF_Bank != '') {
                  let bankmaster1 = await executeQuery(
                    `
                   
  select * from "bankMasters" where LOWER(TRIM("bankName")) = '` +
                      e.PF_Bank.trim().toLowerCase() +
                      `' and status =1 
                   `,
                  );

                  pfbankMasterID = bankmaster1[0].bankMasterID;
                } else {
                  pfbankMasterID = null;
                }

                let find_joining = await EmployeeJoiningDetails.findOne({
                  where: {
                    userMasterID: userMasterID,
                  },
                  include: [
                    {
                      model: UserMaster,
                      attributes: ['isFNF'],
                    },
                    {
                      model: BankMaster,
                      attributes: ['bankName'],
                    },
                  ],
                });

                if (find_joining) {
                  const isFNF = find_joining.userMaster?.isFNF || false;
                  let notChangeLeavingDate = isFNF;

                  await createEmployeeJoiningDetailHistory(userMasterID, t);

                  await EmployeeJoiningDetails.update(
                    {
                      employeeCode: e.Employee_Code,
                      dob: e.BirthDate,
                      joiningDate: e.JoinDate,
                      leavingDate: notChangeLeavingDate
                        ? find_joining.leavingDate
                        : e.LeftDate,
                      adharCard: e.AadharNo,
                      esicNumber: e.ESINo,
                      pfNumber: e.PFNo,
                      uanNumber: e.UANNo,
                      pancard: e.PANNo,
                      ...(bankMasterID ? { bankMasterID: bankMasterID } : {}),
                      ...(e.IFSCCode ? { bankIFSC: e.IFSCCode } : {}),
                      ...(e.bankBranchID
                        ? { bankBranchID: e.bankBranchID }
                        : {}),
                      ...(e.AccountNo ? { bankAccountNo: e.AccountNo } : {}),
                      salaryCalculationAct: e.SalaryBase,
                      employment: e.Employeement_Type,
                      ...(e.Employeement_Type != 'Contract'
                        ? { contractorId: null }
                        : {contractorId:e.contractor_Name}),
                      applicableDate: e.Employment_Applicable_Date,
                      salarytype: e.Salary_Type,
                      overtime: e.Overtime ? e.Overtime : 0,
                      noticePeriod: e.Notice_Period,
                      status: 1,
                      adharName: e.AadharName,
                      pfbankMasterID: pfbankMasterID,
                      pfjoiningDate: e.PF_JoinDate,
                      pfbankIFSC: e.PF_bankIFSC,
                      pfbankAccountNo: e.PF_bankACNO,
                      esicjoiningDate: e.ESI_JoinDate,
                      bloodgroup: e.BloodGroup,
                      nationality: e.Nationality,
                      endDate: e.Employment_End_Date,
                      biometricSerialNo: e.BiometricSerialNo,
                      biometricCode: e.BiometricCode,
                      attendanceFrom: e.attendanceFrom,
                      payrollFrequency: e.payrollFrequency,
                      ...(e.Name_As_On_Bank
                        ? { nameAsBank: e.Name_As_On_Bank }
                        : {}),
                      fullMonthPresence: e.fullMonthPresence,
                      updateBy,
                      updateByIp,
                    },
                    {
                      where: {
                        userMasterID: userMasterID,
                      },
                      transaction: t,
                    },
                  );

                  if (
                    !bankMasterID &&
                    !e.IFSCCode &&
                    !e.AccountNo &&
                    !e.Name_As_On_Bank
                  ) {
                  } else {
                    if (
                      !bankMasterID ||
                      !e.IFSCCode ||
                      !e.AccountNo ||
                      !e.Name_As_On_Bank
                    ) {
                      bankError = true;
                      throw new Error();
                    }

                    if (
                      find_joining?.bankMasterID
                        ?.toString()
                        ?.trim()
                        ?.toLowerCase() ==
                        bankMasterID?.toString()?.trim()?.toLowerCase() &&
                      find_joining?.bankIFSC
                        ?.toString()
                        ?.trim()
                        ?.toLowerCase() ==
                        e?.IFSCCode?.toString()?.trim()?.toLowerCase() &&
                      find_joining?.bankAccountNo
                        ?.toString()
                        ?.trim()
                        ?.toLowerCase() ==
                        e?.AccountNo?.toString()?.trim()?.toLowerCase() &&
                      find_joining?.nameAsBank
                        ?.toString()
                        ?.trim()
                        ?.toLowerCase() ==
                        e?.Name_As_On_Bank?.toString()?.trim()?.toLowerCase()
                    ) {
                    } else {
                      if (
                        bankMasterID &&
                        e.IFSCCode &&
                        e.AccountNo &&
                        e.Name_As_On_Bank
                      ) {
                        const iosTokens = [];
                        const androidTokens = [];
                        let bankUserData;
                        let payload = {};
                        //authorization start
                        const authorizationDetailAattribute = [
                          'AuthorizedByUserMasterId',
                          'AuthorizationCriteriaID',
                        ];

                        const authorizationDetailInclude = [
                          {
                            model: AuthorizationCriteriaMaster,
                            attributes: ['AuthorizationCriteria'],
                          },
                        ];

                        const authorizationDetailIncludeWhere = {
                          userMasterID: userMasterID,
                          status: 1,
                          AuthorizationMasterID:
                            authorizationMasterTypes.statutoryDetail,
                        };

                        const authorizeData =
                          await authorizationDetailService.getAuthorizationDetailByUserMasterID(
                            authorizationDetailAattribute,
                            authorizationDetailInclude,
                            authorizationDetailIncludeWhere,
                          );

                        //authorization end

                        let bankDetailRequestData =
                          await bankDetailRequestService.editBankDetailRequest(
                            {
                              userMasterID: userMasterID,
                              authorizationStatus: {
                                [Sequelize.Op.in]: [
                                  AuthorizationStatusType.PENDING_ZERO,
                                  AuthorizationStatusType.PEDING_ONE,
                                  AuthorizationStatusType.PEDING_TWO,
                                ],
                              },
                            },
                            [
                              'bankDetailRequestId',
                              'authorizationStatus',
                              'AuthorizationCriteriaID',
                            ],
                            [],
                            {
                              transaction: t,
                            },
                          );

                        let bankDetailAuthorizationIds = [];

                        if (bankDetailRequestData) {
                          bankDetailAuthorizationIds =
                            await bankDetailAuthorizationService.getBankDetailAuthorizationIDs(
                              {
                                bankDetailRequestId:
                                  +bankDetailRequestData?.bankDetailRequestId,
                              },
                              ['bankDetailAuthorizationId'],
                            );

                          await userInboxService.destroyUserInbox(
                            {
                              activityTable:
                                BankDetailAuthorization.getTableName(),
                              activityTablePK: {
                                [Sequelize.Op.in]: bankDetailAuthorizationIds,
                              },
                            },
                            {
                              individualHooks: true,
                              user: req.userDetails,
                              transaction: t,
                            },
                          );

                          await bankDetailAuthorizationService.destroy(
                            {
                              bankDetailAuthorizationId:
                                bankDetailAuthorizationIds,
                            },
                            {
                              individualHooks: true,
                              user: req.userDetails,
                              transaction: t,
                            },
                          );

                          const [affectedCount, updatedRows] =
                            await bankDetailRequestService.update(
                              {
                                bankMasterID: bankMasterID,
                                IFSCCode: e.IFSCCode,
                                accountNo: e.AccountNo,
                                accountHolderName: e.Name_As_On_Bank,
                                ...(e.bankBranchID
                                  ? { bankBranchID: e.bankBranchID }
                                  : {}),
                              },
                              {
                                bankDetailRequestId:
                                  +bankDetailRequestData?.bankDetailRequestId,
                              },
                              {
                                individualHooks: true,
                                user: req.userDetails,
                                transaction: t,
                              },
                              true,
                            );

                          bankDetailRequestData = updatedRows?.[0];
                        } else {
                          const statusMap = {
                            'Any One': 1,
                            'Any Two': 1,
                            'Any Three': 1,
                            'Sequeance No': 2,
                          };

                          bankDetailRequestData =
                            await bankDetailRequestService.create(
                              {
                                userMasterID: userMasterID,
                                bankMasterID: bankMasterID,
                                IFSCCode: e.IFSCCode,
                                accountNo: e.AccountNo,
                                accountHolderName: e.Name_As_On_Bank,
                                authorizationStatus:
                                  statusMap[
                                    authorizeData?.AuthorizationCriteriaMaster
                                  ] ?? 0,
                                AuthorizationCriteriaID:
                                  authorizeData?.AuthorizationCriteriaID ??
                                  null,
                                ...(e.bankBranchID
                                  ? { bankBranchID: e.bankBranchID }
                                  : {}),
                              },
                              {
                                individualHooks: true,
                                user: req.userDetails,
                                transaction: t,
                              },
                            );
                        }

                        if (authorizeData) {
                          const bankDetailAuthorizationObject = [];
                          const authorizePersonsIDs = [];
                          for (const item of authorizeData.AuthorizedByUserMasterId) {
                            bankDetailAuthorizationObject.push({
                              bankDetailRequestId:
                                +bankDetailRequestData?.dataValues
                                  ?.bankDetailRequestId,
                              userMasterID: item,
                              authStatus:
                                AuthStatusInAuthorizationRequest.PENDING,
                              status: 1,
                              createBy: userMasterID,
                            });

                            authorizePersonsIDs.push(item);
                            if (
                              authorizeData.AuthorizationCriteriaID ==
                              authorizationCriteriaType.SEQUENCENO
                            ) {
                              break;
                            }
                          }

                          const authorizeUserData =
                            await userMasterService.getMultipleUserData(
                              [
                                'userMasterID',
                                'displayName',
                                'firebaseToken',
                                'deviceType',
                              ],
                              {
                                userMasterID: {
                                  [Op.in]: [
                                    ...authorizePersonsIDs,
                                    userMasterID,
                                  ],
                                },
                              },
                            );

                          authorizeUserData.forEach((user) => {
                            if (
                              authorizePersonsIDs.includes(user.userMasterID)
                            ) {
                              if (
                                user.deviceType === 'ios' &&
                                user.firebaseToken
                              ) {
                                iosTokens.push(user.firebaseToken);
                              } else if (
                                user.deviceType === 'android' &&
                                user.firebaseToken
                              ) {
                                androidTokens.push(user.firebaseToken);
                              }
                            }
                            if (userMasterID == user.userMasterID) {
                              bankUserData = user;
                            }
                          });

                          payload = {
                            notification: {
                              title: notificationTitleTypes.BANKDETAIL,
                              body: `${bankUserData.displayName} has requested for Bank Detail approval.`,
                            },
                            data: {
                              screen: notificationScreentTypes.BANKDETAIL,
                            },
                          };

                          const bankDetailAuthorizationBulkcreateData =
                            await bankDetailAuthorizationService.bulkCreate(
                              bankDetailAuthorizationObject,
                              {
                                individualHooks: true,
                                user: req.userDetails,
                                transaction: t,
                              },
                            );

                          //authorization inbox create
                          let userInboxArray = [];
                          bankDetailAuthorizationBulkcreateData.forEach(
                            (item) => {
                              userInboxArray.push({
                                activityTable:
                                  BankDetailAuthorization.getTableName(),
                                activityTablePK: item.bankDetailAuthorizationId,
                                message: `${bankUserData.displayName} has applied for Bank Detail.`,
                                assignedTo: item.userMasterID,
                                assignedBy: userMasterID,
                              });
                            },
                          );

                          await userInboxService.bulkCreateUserInbox(
                            userInboxArray,
                            {
                              individualHooks: true,
                              user: req.userDetails,
                              transaction: t,
                            },
                          );
                          //authorization inbox create end
                        }

                        if (iosTokens.length > 0) {
                          sendBulkNotification(iosTokens, payload, 'ios');
                        }

                        if (androidTokens.length > 0) {
                          sendBulkNotification(
                            androidTokens,
                            payload,
                            'android',
                          );
                        }

                        await EmployeeJoiningDetails.update(
                          {
                            bankAccountStatus: 0,
                            updateBy,
                            updateByIp,
                          },
                          {
                            where: {
                              userMasterID: userMasterID,
                            },
                            transaction: t,
                          },
                        );
                      }
                    }
                  }
                } else {
                  let Add_joingdata = await EmployeeJoiningDetails.create(
                    {
                      userMasterID: userMasterID,
                      employeeCode: e.Employee_Code,
                      dob: e.BirthDate,
                      joiningDate: e.JoinDate,
                      leavingDate: e.LeftDate,
                      adharCard: e.AadharNo,
                      esicNumber: e.ESINo,
                      pfNumber: e.PFNo,
                      uanNumber: e.UANNo,
                      pancard: e.PANNo,
                      bankMasterID: bankMasterID,
                      bankIFSC: e.IFSCCode,
                      bankBranchID: e.bankBranchID,
                      bankAccountNo: e.AccountNo,
                      salaryCalculationAct: e.SalaryBase,
                      employment: e.Employeement_Type,
                      applicableDate: e.Employment_Applicable_Date,
                      salarytype: e.Salary_Type,
                      overtime: e.Overtime ? e.Overtime : 0,
                      noticePeriod: e.Notice_Period,
                      status: 1,
                      adharName: e.AadharName,
                      pfbankMasterID: pfbankMasterID,
                      pfjoiningDate: e.PF_JoinDate,
                      pfbankIFSC: e.PF_bankIFSC,
                      pfbankAccountNo: e.PF_bankACNO,
                      esicjoiningDate: e.ESI_JoinDate,
                      bloodgroup: e.BloodGroup,
                      nationality: e.Nationality,
                      endDate: e.Employment_End_Date,
                      biometricSerialNo: e.BiometricSerialNo,
                      biometricCode: e.BiometricCode,
                      nameAsBank: e.Name_As_On_Bank,
                      attendanceFrom: e.attendanceFrom,
                      payrollFrequency: e.payrollFrequency,
                      fullMonthPresence: e.fullMonthPresence,
                      createBy,
                      createByIp,
                    },
                    {
                      transaction: t,
                    },
                  );

                  if (
                    bankMasterID ||
                    e.IFSCCode ||
                    e.AccountNo ||
                    e.Name_As_On_Bank
                  ) {
                    if (
                      !bankMasterID ||
                      !e.IFSCCode ||
                      !e.AccountNo ||
                      !e.Name_As_On_Bank
                    ) {
                      throw new Error(
                        'Please enter Bank, IFSC Code, Account No, and Account Holder Name.',
                      );
                    }
                    await BankDetailRequest.create(
                      {
                        userMasterID: userMasterID,
                        bankMasterID: bankMasterID,
                        IFSCCode: e.IFSCCode ?? null,
                        accountNo: e.AccountNo ?? null,
                        accountHolderName: e.Name_As_On_Bank ?? null,
                        AuthorizationCriteriaID: null,
                        createBy,
                        createByIp,
                      },
                      {
                        validate: false,
                        transaction: t,
                      },
                    );
                  }
                }

                const findAdhar = await UserDocument.findOne({
                  where: {
                    userMasterID: userMasterID,
                    status: 1,
                    documentListID: 1,
                  },
                  raw: true,
                });
                if (findAdhar) {
                  await UserDocument.update(
                    {
                      documentNumber: e.AadharNo,
                      nameOnDocument: e.AadharName,
                      verifyStatus: 1,
                      verifyBy: createBy,
                      updateBy: createBy,
                      updateByIp: createByIp,
                    },
                    { where: { userDocumentID: findAdhar.userDocumentID } },
                  );
                  await UserInbox.destroy({
                    where: {
                      activityTable: UserDocument.getTableName(),
                      activityTablePK: findAdhar.userDocumentID,
                    },
                  });
                } else if (e.AadharNo || e.AadharName) {
                  await UserDocument.create({
                    userMasterID: userMasterID,
                    documentListID: 1,
                    createBy: createBy,
                    createByIp: createByIp,
                    verifyStatus: 1,
                    verifyBy: createBy,
                    documentNumber: e.AadharNo,
                    nameOnDocument: e.AadharName,
                  });
                }

                //PAN Creation in EMP Document
                const findPAN = await UserDocument.findOne({
                  where: {
                    userMasterID: userMasterID,
                    status: 1,
                    documentListID: 2,
                  },
                  raw: true,
                });

                if (findPAN) {
                  await UserDocument.update(
                    {
                      documentNumber: e.PANNo,
                      verifyStatus: 1,
                      verifyBy: createBy,
                      updateBy: createBy,
                      updateByIp: createByIp,
                    },
                    { where: { userDocumentID: findPAN.userDocumentID } },
                  );
                  await UserInbox.destroy({
                    where: {
                      activityTable: UserDocument.getTableName(),
                      activityTablePK: findPAN.userDocumentID,
                    },
                  });
                } else if (e.PANNo) {
                  await UserDocument.create({
                    userMasterID: userMasterID,
                    documentListID: 2,
                    createBy: createBy,
                    createByIp: createByIp,
                    verifyStatus: 1,
                    verifyBy: createBy,
                    documentNumber: e.PANNo,
                  });
                }

                // for employeement

                if (e.Employeement_Type != null && e.Employeement_Type != '') {
                  let employeement = await Employeeemployeement.findOne({
                    where: {
                      userMasterID: userMasterID,
                      status: 1,
                    },
                    order: [['createdAt', 'DESC']],
                  });

                  let employeementenddate;

                  if (
                    e.Employment_End_Date != null &&
                    e.Employment_End_Date != ''
                  ) {
                    employeementenddate = e.Employment_End_Date;
                  } else {
                    employeementenddate = null;
                  }

                  if (employeement) {
                    let user_employeement = employeement.employeement;

                    if (e.Employeement_Type != user_employeement) {
                      let create = await Employeeemployeement.create(
                        {
                          userMasterID: userMasterID,
                          employeement: e.Employeement_Type,
                          applicableDate: new Date(
                            e.Employment_Applicable_Date,
                          ),
                          endDate:
                            employeementenddate == null
                              ? null
                              : new Date(employeementenddate),
                          createBy,
                          createByIp,
                        },
                        {
                          transaction: t,
                        },
                      );
                    } else {
                      let update = await Employeeemployeement.update(
                        {
                          applicableDate: new Date(
                            e.Employment_Applicable_Date,
                          ),
                          endDate:
                            employeementenddate == null
                              ? null
                              : new Date(employeementenddate),
                          updateBy,
                          updateByIp,
                        },
                        {
                          where: {
                            employeeEmployeementId:
                              employeement.employeeEmployeementId,
                          },
                          transaction: t,
                        },
                      );
                    }
                  } else {
                    let create = await Employeeemployeement.create(
                      {
                        userMasterID: userMasterID,
                        employeement: e.Employeement_Type,
                        applicableDate: new Date(e.Employment_Applicable_Date),
                        endDate:
                          employeementenddate == null
                            ? null
                            : new Date(employeementenddate),
                        createBy,
                        createByIp,
                      },
                      {
                        transaction: t,
                      },
                    );
                  }
                }

                // for local Address

                if (e.Local_Address != null && e.Local_Address != '') {
                  let userlocalAddress = await UserAddress.findOne({
                    where: {
                      userMasterID: userMasterID,
                      addressType: 'temporary',
                      status: 1,
                    },
                  });
                  let localLangAddress = null;
                  // if (convertNameToLocalName) {
                  //   if (saveraCompanyIDs.includes(companyMasterID)) {
                  //     try {
                  //       const translate = new Translate({
                  //         key: process.env.GOOGLE_CLOUD_TRANSLATE_API_KEY,
                  //       });

                  //       const response = await translate.translate(
                  //         [e.Local_Address],
                  //         {
                  //           from: 'en', // Explicitly specify English as the source
                  //           to: 'mr',
                  //           format: 'text',
                  //           model: 'base',
                  //         }
                  //       );

                  //       // Extract transliterated values
                  //       localLangAddress = response[0]?.[0] || null;
                  //     } catch (error) {
                  //       console.error('Error in translation:', error);
                  //     }
                  //   }
                  // }
                  if (userlocalAddress) {
                    await UserAddress.update(
                      {
                        addressType: 'temporary',
                        landmark: e.Local_Address,
                        updateBy,
                        updateByIp,
                        verifyStatus: 1,
                        verifyBy: createBy,
                        localLangAddress,
                      },
                      {
                        where: {
                          userMasterID: userMasterID,
                          addressType: 'temporary',
                          status: 1,
                        },
                        transaction: t,
                      },
                    );
                  } else {
                    await UserAddress.create(
                      {
                        userMasterID: userMasterID,
                        addressType: 'temporary',
                        landmark: e.Local_Address,
                        createBy,
                        createByIp,
                        verifyStatus: 1,
                        verifyBy: createBy,
                        localLangAddress,
                      },
                      {
                        transaction: t,
                      },
                    );
                  }
                } else {
                  await UserAddress.update(
                    {
                      status: 2,
                      updateBy: updateBy,
                      updateByIp: updateByIp,
                    },
                    {
                      where: {
                        userMasterID: userMasterID,
                        addressType: 'temporary',
                      },
                    },
                    {
                      transaction: t,
                    },
                  );
                }

                // for permanent Address

                if (e.Permanent_Address != null && e.Permanent_Address != '') {
                  let Permanent_Address = await UserAddress.findOne({
                    where: {
                      userMasterID: userMasterID,
                      addressType: 'permanent',
                      status: 1,
                    },
                  });
                  let localLangAddress = null;
                  // if (convertNameToLocalName) {
                  //   if (saveraCompanyIDs.includes(companyMasterID)) {
                  //     try {
                  //       const translate = new Translate({
                  //         key: process.env.GOOGLE_CLOUD_TRANSLATE_API_KEY,
                  //       });

                  //       const response = await translate.translate(
                  //         [e.Local_Address],
                  //         {
                  //           from: 'en', // Explicitly specify English as the source
                  //           to: 'mr',
                  //           format: 'text',
                  //           model: 'base',
                  //         }
                  //       );

                  //       // Extract transliterated values
                  //       localLangAddress = response[0]?.[0] || null;
                  //     } catch (error) {
                  //       console.error('Error in translation:', error);
                  //     }
                  //   }
                  // }
                  if (Permanent_Address) {
                    await UserAddress.update(
                      {
                        addressType: 'permanent',
                        landmark: e.Permanent_Address,
                        updateBy,
                        updateByIp,
                        verifyStatus: 1,
                        verifyBy: createBy,
                        localLangAddress,
                      },
                      {
                        where: {
                          userMasterID: userMasterID,
                          addressType: 'permanent',
                          status: 1,
                        },
                        transaction: t,
                      },
                    );
                  } else {
                    await UserAddress.create(
                      {
                        userMasterID: userMasterID,
                        addressType: 'permanent',
                        landmark: e.Permanent_Address,
                        createBy,
                        createByIp,
                        verifyStatus: 1,
                        verifyBy: createBy,
                        localLangAddress,
                      },
                      {
                        transaction: t,
                      },
                    );
                  }
                } else {
                  await UserAddress.update(
                    {
                      status: 2,
                      updateBy: updateBy,
                      updateByIp: updateByIp,
                    },
                    {
                      where: {
                        userMasterID: userMasterID,
                        addressType: 'permanent',
                      },
                    },
                    {
                      transaction: t,
                    },
                  );
                }

                // Attendance Policy

                if (e.Attendance_Policy != null && e.Attendance_Policy != '') {
                  let uniquedata4 = await executeQuery(
                    `
                 
  select * from "attendancePolicies" where LOWER(TRIM("attendancePolicyName")) = '` +
                      e.Attendance_Policy.trim().toLowerCase() +
                      `' and "companyMasterID" = ` +
                      companyMasterID +
                      ` and status =1 and "deletedAt" is null`,
                  );

                  let attendancePolicyID = uniquedata4[0].attendancePolicyID;

                  let userAttendance = await EmployeeAttendancePolicy.findOne({
                    where: {
                      userMasterID: userMasterID,
                      status: 1,
                      startDate: {
                        [Sequelize.Op.lte]: new Date(currentDate),
                      },
                      [Sequelize.Op.or]: [
                        {
                          endDate: {
                            [Sequelize.Op.gte]: new Date(currentDate),
                          },
                        },
                        { endDate: { [Sequelize.Op.is]: null } },
                      ],
                    },
                  });

                  let userAttendanceafter =
                    await EmployeeAttendancePolicy.findOne({
                      where: {
                        userMasterID: userMasterID,
                        status: 1,
                        startDate: {
                          [Sequelize.Op.gt]: currentDate,
                        },
                      },
                    });

                  if (userAttendance) {
                    if (
                      attendancePolicyID != userAttendance.attendancePolicyID
                    ) {
                      let date1 = new Date(currentDate);
                      date1.setDate(date1.getDate() - 1);

                      let end_date =
                        date1.getFullYear() +
                        '-' +
                        String(date1.getMonth() + 1).padStart(2, '0') +
                        '-' +
                        String(date1.getDate()).padStart(2, '0');

                      let end_date1;
                      if (userAttendanceafter) {
                        let date2 = new Date(userAttendanceafter.startDate);

                        date2.setDate(date2.getDate() - 1);

                        end_date1 =
                          date2.getFullYear() +
                          '-' +
                          String(date2.getMonth() + 1).padStart(2, '0') +
                          '-' +
                          String(date2.getDate()).padStart(2, '0');
                      } else {
                        end_date1 = null;
                      }

                      let update = await EmployeeAttendancePolicy.update(
                        {
                          endDate: new Date(end_date),
                          updateBy,
                          updateByIp,
                        },
                        {
                          where: {
                            employeeAttendancePolicyID:
                              userAttendance.employeeAttendancePolicyID,
                          },
                          transaction: t,
                        },
                      );

                      let create = await EmployeeAttendancePolicy.create(
                        {
                          attendancePolicyID: attendancePolicyID,
                          userMasterID: userMasterID,
                          startDate: currentDate,
                          endDate:
                            end_date1 == null ? null : new Date(end_date1),
                          createBy,
                          createByIp,
                        },
                        {
                          transaction: t,
                        },
                      );
                    }
                  } else {
                    let end_date1;
                    if (userAttendanceafter) {
                      let date2 = new Date(userAttendanceafter.startDate);

                      date2.setDate(date2.getDate() - 1);

                      end_date1 =
                        date2.getFullYear() +
                        '-' +
                        String(date2.getMonth() + 1).padStart(2, '0') +
                        '-' +
                        String(date2.getDate()).padStart(2, '0');
                    } else {
                      end_date1 = null;
                    }

                    let create = await EmployeeAttendancePolicy.create(
                      {
                        attendancePolicyID: attendancePolicyID,
                        userMasterID: userMasterID,
                        startDate: currentDate,
                        endDate: end_date1 == null ? null : new Date(end_date1),
                        createBy,
                        createByIp,
                      },
                      {
                        transaction: t,
                      },
                    );
                  }
                }

                // salary policy

                let salaryPolicyApplicableDate = moment(
                  currentDate,
                  'YYYY-MM-DD',
                )
                  .startOf('month')
                  .format('YYYY-MM-DD');

                if (e.Salary_Policy != null && e.Salary_Policy != '') {
                  let uniquedata5 = await executeQuery(
                    ` 
                  select * from "salaryPolicies" where LOWER(TRIM("salaryPolicyName")) = '` +
                      e.Salary_Policy.trim().toLowerCase() +
                      `' and "companyMasterID" = ` +
                      companyMasterID +
                      ` and status =1`,
                  );

                  const { start_date } = getSalaryCycleDateAndMonthByDate(
                    uniquedata5?.[0],
                    currentDate,
                  );

                  salaryPolicyApplicableDate = start_date;

                  let salaryPolicyID = uniquedata5[0].salaryPolicyID;

                  // let cycledate = uniquedata5[0].salaryCycleDate;

                  // salarycycledate =
                  //   currentDate.slice(0, 8) +
                  //   (cycledate < 10 ? '0' + cycledate : cycledate);

                  let usersalary = await EmployeeSalarypolicy.findOne({
                    where: {
                      userMasterID: userMasterID,
                      status: 1,
                      startDate: {
                        [Sequelize.Op.lte]: salaryPolicyApplicableDate,
                      },
                      [Sequelize.Op.or]: [
                        {
                          endDate: {
                            [Sequelize.Op.gte]: salaryPolicyApplicableDate,
                          },
                        },
                        { endDate: { [Sequelize.Op.is]: null } },
                      ],
                    },
                  });

                  let usersalaryafter = await EmployeeSalarypolicy.findOne({
                    where: {
                      userMasterID: userMasterID,
                      status: 1,
                      startDate: {
                        [Sequelize.Op.gt]: new Date(salaryPolicyApplicableDate),
                      },
                    },
                  });

                  let date1 = new Date(salaryPolicyApplicableDate);
                  date1.setDate(date1.getDate() - 1);

                  let end_date =
                    date1.getFullYear() +
                    '-' +
                    String(date1.getMonth() + 1).padStart(2, '0') +
                    '-' +
                    String(date1.getDate()).padStart(2, '0');

                  if (usersalary) {
                    if (salaryPolicyID != usersalary.salaryPolicyID) {
                      let usersalaryyearmonth =
                        new Date(usersalary.startDate)
                          .toISOString()
                          .slice(0, 4) +
                        new Date(usersalary.startDate)
                          .toISOString()
                          .slice(5, 7);
                      let currentyearmonth =
                        salaryPolicyApplicableDate.slice(0, 4) +
                        salaryPolicyApplicableDate.slice(5, 7);

                      if (usersalaryyearmonth == currentyearmonth) {
                        let update = await EmployeeSalarypolicy.update(
                          {
                            salaryPolicyID: salaryPolicyID,

                            updateBy,
                            updateByIp,
                          },
                          {
                            where: {
                              employeeSalaryPolicyID:
                                usersalary.employeeSalaryPolicyID,
                            },
                            transaction: t,
                          },
                        );
                      } else {
                        let end_date1;
                        if (usersalaryafter) {
                          let date2 = new Date(usersalaryafter.startDate);

                          date2.setDate(date2.getDate() - 1);

                          end_date1 =
                            date2.getFullYear() +
                            '-' +
                            String(date2.getMonth() + 1).padStart(2, '0') +
                            '-' +
                            String(date2.getDate()).padStart(2, '0');
                        } else {
                          end_date1 = null;
                        }

                        let update = await EmployeeSalarypolicy.update(
                          {
                            endDate: new Date(end_date),
                            updateBy,
                            updateByIp,
                          },
                          {
                            where: {
                              employeeSalaryPolicyID:
                                usersalary.employeeSalaryPolicyID,
                            },
                            transaction: t,
                          },
                        );

                        let create = await EmployeeSalarypolicy.create(
                          {
                            salaryPolicyID: salaryPolicyID,
                            userMasterID: userMasterID,
                            startDate: new Date(salaryPolicyApplicableDate),
                            endDate: end_date1 ? new Date(end_date1) : null,
                            createBy,
                            createByIp,
                          },
                          {
                            transaction: t,
                          },
                        );
                      }
                    }
                  } else {
                    let end_date1;
                    if (usersalaryafter) {
                      let date2 = new Date(usersalaryafter.startDate);

                      date2.setDate(date2.getDate() - 1);

                      end_date1 =
                        date2.getFullYear() +
                        '-' +
                        String(date2.getMonth() + 1).padStart(2, '0') +
                        '-' +
                        String(date2.getDate()).padStart(2, '0');
                    } else {
                      end_date1 = null;
                    }

                    if (end_date1 != null) {
                      if (salaryPolicyID != usersalaryafter.salaryPolicyID) {
                        let create = await EmployeeSalarypolicy.create(
                          {
                            salaryPolicyID: salaryPolicyID,
                            userMasterID: userMasterID,
                            startDate: new Date(salaryPolicyApplicableDate),
                            endDate: end_date1 ? new Date(end_date1) : null,
                            createBy,
                            createByIp,
                          },
                          {
                            transaction: t,
                          },
                        );
                      }
                    } else {
                      let create = await EmployeeSalarypolicy.create(
                        {
                          salaryPolicyID: salaryPolicyID,
                          userMasterID: userMasterID,
                          startDate: new Date(salaryPolicyApplicableDate),
                          endDate: end_date1 ? new Date(end_date1) : null,
                          createBy,
                          createByIp,
                        },
                        {
                          transaction: t,
                        },
                      );
                    }
                  }
                }

                // weekoff policy0000

                if (e.WeekOff_Policy != null && e.WeekOff_Policy != '') {
                  let uniquedata6 = await executeQuery(
                    `
      select * from "weekOffPolicies" WHERE LOWER(TRIM("weekOffPolicyName")) = '` +
                      e.WeekOff_Policy.trim().toLowerCase() +
                      `'  and "companyMasterID" = ` +
                      companyMasterID +
                      ` and status =1 `,
                  );

                  let weekOffPolicyID = uniquedata6[0].weekOffPolicyID;

                  // let date_1 = ;

                  // if (salarycycledate != null) {
                  //   date_1 = salarycycledate;
                  // } else {
                  //   let usersalary = await EmployeeSalarypolicy.findOne({
                  //     where: {
                  //       userMasterID: userMasterID,
                  //       status: 1,
                  //       startDate: {
                  //         [Sequelize.Op.lte]: currentDate,
                  //       },
                  //       [Sequelize.Op.or]: [
                  //         { endDate: { [Sequelize.Op.gte]: currentDate } },
                  //         { endDate: { [Sequelize.Op.is]: null } },
                  //       ],
                  //     },
                  //   });

                  //   if (usersalary) {
                  //     let cycledate = usersalary.salaryCycleDate;
                  //     date_1 =
                  //       currentDate.slice(0, 8) +
                  //       (cycledate < 10 ? '0' + cycledate : cycledate);
                  //   }

                  //   date_1 = currentDate.slice(0, 8) + '01';
                  // }

                  let userweekoff = await EmployeeWeekOff.findOne({
                    where: {
                      userMasterID: userMasterID,
                      status: 1,
                      applicableDate: {
                        [Sequelize.Op.lte]: salaryPolicyApplicableDate,
                      },
                      [Sequelize.Op.or]: [
                        {
                          endDate: {
                            [Sequelize.Op.gte]: salaryPolicyApplicableDate,
                          },
                        },
                        { endDate: { [Sequelize.Op.is]: null } },
                      ],
                    },
                  });

                  let userweekoffafter = await EmployeeWeekOff.findOne({
                    where: {
                      userMasterID: userMasterID,
                      status: 1,
                      applicableDate: {
                        [Sequelize.Op.gt]: salaryPolicyApplicableDate,
                      },
                    },
                  });

                  let date1 = new Date(salaryPolicyApplicableDate);
                  date1.setDate(date1.getDate() - 1);

                  let end_date =
                    date1.getFullYear() +
                    '-' +
                    String(date1.getMonth() + 1).padStart(2, '0') +
                    '-' +
                    String(date1.getDate()).padStart(2, '0');

                  if (userweekoff) {
                    if (weekOffPolicyID != userweekoff.weekOffPolicyID) {
                      let userweekoffyearmonth =
                        new Date(userweekoff.applicableDate)
                          .toISOString()
                          .slice(0, 4) +
                        new Date(userweekoff.applicableDate)
                          .toISOString()
                          .slice(5, 7);
                      let currentyearmonth =
                        salaryPolicyApplicableDate.slice(0, 4) +
                        salaryPolicyApplicableDate.slice(5, 7);

                      if (currentyearmonth == userweekoffyearmonth) {
                        let update = await EmployeeWeekOff.update(
                          {
                            weekOffPolicyID: weekOffPolicyID,
                            updateBy,
                            updateByIp,
                          },
                          {
                            where: {
                              employeeWeekOffID: userweekoff.employeeWeekOffID,
                            },
                            transaction: t,
                          },
                        );
                      } else {
                        let end_date1;
                        if (userweekoffafter) {
                          let date2 = new Date(userweekoffafter.applicableDate);

                          date2.setDate(date2.getDate() - 1);

                          end_date1 =
                            date2.getFullYear() +
                            '-' +
                            String(date2.getMonth() + 1).padStart(2, '0') +
                            '-' +
                            String(date2.getDate()).padStart(2, '0');
                        } else {
                          end_date1 = null;
                        }

                        let update = await EmployeeWeekOff.update(
                          {
                            endDate: end_date,
                            updateBy,
                            updateByIp,
                          },
                          {
                            where: {
                              employeeWeekOffID: userweekoff.employeeWeekOffID,
                            },
                            transaction: t,
                          },
                        );

                        let create = await EmployeeWeekOff.create(
                          {
                            weekOffPolicyID: weekOffPolicyID,
                            userMasterID: userMasterID,
                            applicableDate: salaryPolicyApplicableDate,
                            endDate: end_date1 || null,
                            createBy,
                            createByIp,
                          },
                          {
                            transaction: t,
                          },
                        );
                      }
                      //Add WeeoffFunction
                      const tempWeekoff =
                        await add_WeekOffHoliday_With_Transaction(
                          companyMasterID,
                          [userMasterID],
                          new Date(salaryPolicyApplicableDate)
                            .toISOString()
                            .slice(0, 10),
                          weekOffPolicyID,
                          null,
                          false,
                          null,
                          t,
                        );

                      // await weekoffHolidayTran.destroy(
                      //   {
                      //     where: {
                      //       userMasterID: userMasterID,
                      //       date: {
                      //         [Sequelize.Op.gte]: new Date(salaryPolicyApplicableDate)
                      //           .toISOString()
                      //           .slice(0, 10),
                      //       },
                      //       tableName: 'weekoff',
                      //     },
                      //   },
                      //   { transaction: t },
                      // );

                      // await weekoffHolidayTran.bulkCreate(tempWeekoff, {
                      //   transaction: t,
                      // });
                    }
                  } else {
                    let end_date1;
                    if (userweekoffafter) {
                      let date2 = new Date(userweekoffafter.applicableDate);

                      date2.setDate(date2.getDate() - 1);

                      end_date1 =
                        date2.getFullYear() +
                        '-' +
                        String(date2.getMonth() + 1).padStart(2, '0') +
                        '-' +
                        String(date2.getDate()).padStart(2, '0');
                    } else {
                      end_date1 = null;
                    }

                    if (end_date1 != null) {
                      if (weekOffPolicyID != userweekoffafter.weekOffPolicyID) {
                        let create = await EmployeeWeekOff.create(
                          {
                            weekOffPolicyID: weekOffPolicyID,
                            userMasterID: userMasterID,
                            applicableDate: salaryPolicyApplicableDate,
                            endDate: end_date1 || null,
                            createBy,
                            createByIp,
                          },
                          {
                            transaction: t,
                          },
                        );
                      } else {
                        let update = await EmployeeWeekOff.update(
                          {
                            applicableDate: salaryPolicyApplicableDate,
                            updateBy,
                            updateByIp,
                          },
                          {
                            where: {
                              employeeWeekOffID:
                                userweekoffafter.employeeWeekOffID,
                            },
                            transaction: t,
                          },
                        );
                      }
                    } else {
                      let create = await EmployeeWeekOff.create(
                        {
                          weekOffPolicyID: weekOffPolicyID,
                          userMasterID: userMasterID,
                          applicableDate: salaryPolicyApplicableDate,
                          endDate: end_date1 || null,
                          createBy,
                          createByIp,
                        },
                        {
                          transaction: t,
                        },
                      );
                    }
                    // Add WeeoffFunction

                    await add_WeekOffHoliday_With_Transaction(
                      companyMasterID,
                      [userMasterID],
                      new Date(salaryPolicyApplicableDate)
                        .toISOString()
                        .slice(0, 10),
                      weekOffPolicyID,
                      null,
                      false,
                      null,
                      t,
                    );
                  }
                }

                // holiday policy

                if (e.Holiday_Policy != null && e.Holiday_Policy != '') {
                  let uniquedata7 = await executeQuery(
                    `
                    
  select * from "holidayPolicies" WHERE LOWER(TRIM("holidayPolicyName")) = '` +
                      e.Holiday_Policy.trim().toLowerCase() +
                      `'  and "companyMasterID" = ` +
                      companyMasterID +
                      ` and status =1
                    `,
                  );

                  let holidayPolicyID = uniquedata7[0].holidayPolicyID;

                  let date_1 = moment().startOf('month').format('YYYY-MM-DD');

                  let userholiday = await EmployeeHolidayPolicy.findOne({
                    where: {
                      userMasterID: userMasterID,
                      status: 1,
                      applicableDate: {
                        [Sequelize.Op.lte]: date_1,
                      },
                      [Sequelize.Op.or]: [
                        { endDate: { [Sequelize.Op.gte]: date_1 } },
                        { endDate: { [Sequelize.Op.is]: null } },
                      ],
                    },
                  });

                  let userholidayafter = await EmployeeHolidayPolicy.findOne({
                    where: {
                      userMasterID: userMasterID,
                      status: 1,
                      applicableDate: {
                        [Sequelize.Op.gt]: date_1,
                      },
                    },
                  });

                  let date1 = new Date(date_1);
                  date1.setDate(date1.getDate() - 1);

                  let end_date =
                    date1.getFullYear() +
                    '-' +
                    String(date1.getMonth() + 1).padStart(2, '0') +
                    '-' +
                    String(date1.getDate()).padStart(2, '0');

                  if (userholiday) {
                    if (holidayPolicyID != userholiday.holidayPolicyID) {
                      let userholidayyearmonth =
                        new Date(userholiday.applicableDate)
                          .toISOString()
                          .slice(0, 4) +
                        new Date(userholiday.applicableDate)
                          .toISOString()
                          .slice(5, 7);
                      let currentyearmonth =
                        currentDate.slice(0, 4) + currentDate.slice(5, 7);

                      if (currentyearmonth == userholidayyearmonth) {
                        let update = await EmployeeHolidayPolicy.update(
                          {
                            holidayPolicyID: holidayPolicyID,

                            updateBy,
                            updateByIp,
                          },
                          {
                            where: {
                              employeeholidayPolicyID:
                                userholiday.employeeholidayPolicyID,
                            },
                            transaction: t,
                          },
                        );
                      } else {
                        let end_date1;
                        if (userholidayafter) {
                          let date2 = new Date(userholidayafter.applicableDate);

                          date2.setDate(date2.getDate() - 1);

                          end_date1 =
                            date2.getFullYear() +
                            '-' +
                            String(date2.getMonth() + 1).padStart(2, '0') +
                            '-' +
                            String(date2.getDate()).padStart(2, '0');
                        } else {
                          end_date1 = null;
                        }

                        let update = await EmployeeHolidayPolicy.update(
                          {
                            endDate: new Date(end_date),

                            updateBy,
                            updateByIp,
                          },
                          {
                            where: {
                              employeeholidayPolicyID:
                                userholiday.employeeholidayPolicyID,
                            },
                            transaction: t,
                          },
                        );

                        let create = await EmployeeHolidayPolicy.create(
                          {
                            holidayPolicyID: holidayPolicyID,
                            userMasterID: userMasterID,
                            applicableDate: new Date(date_1),
                            endDate:
                              end_date1 == null ? null : new Date(end_date1),
                            createBy,
                            createByIp,
                          },
                          {
                            transaction: t,
                          },
                        );
                      }

                      await add_WeekOffHoliday_With_Transaction(
                        companyMasterID,
                        [userMasterID],
                        new Date(date_1).toISOString().slice(0, 10),
                        null,
                        holidayPolicyID,
                        false,
                        null,
                        t,
                      );
                    }
                  } else {
                    let end_date1;
                    if (userholidayafter) {
                      let date2 = new Date(userholidayafter.applicableDate);

                      date2.setDate(date2.getDate() - 1);

                      end_date1 =
                        date2.getFullYear() +
                        '-' +
                        String(date2.getMonth() + 1).padStart(2, '0') +
                        '-' +
                        String(date2.getDate()).padStart(2, '0');
                    } else {
                      end_date1 = null;
                    }

                    if (end_date1 != null) {
                      if (holidayPolicyID != userholidayafter.holidayPolicyID) {
                        let create = await EmployeeHolidayPolicy.create(
                          {
                            holidayPolicyID: holidayPolicyID,
                            userMasterID: userMasterID,
                            applicableDate: new Date(date_1),
                            endDate:
                              end_date1 == null ? null : new Date(end_date1),
                            createBy,
                            createByIp,
                          },
                          {
                            transaction: t,
                          },
                        );
                      } else {
                        let update = await EmployeeHolidayPolicy.update(
                          {
                            applicableDate: new Date(date_1),
                            updateBy,
                            updateByIp,
                          },
                          {
                            where: {
                              employeeholidayPolicyID:
                                userholidayafter.employeeholidayPolicyID,
                            },
                            transaction: t,
                          },
                        );
                      }
                    } else {
                      let create = await EmployeeHolidayPolicy.create(
                        {
                          holidayPolicyID: holidayPolicyID,
                          userMasterID: userMasterID,
                          applicableDate: new Date(date_1),
                          endDate:
                            end_date1 == null ? null : new Date(end_date1),
                          createBy,
                          createByIp,
                        },
                        {
                          transaction: t,
                        },
                      );
                    }
                    await add_WeekOffHoliday_With_Transaction(
                      companyMasterID,
                      [userMasterID],
                      new Date(date_1).toISOString().slice(0, 10),
                      null,
                      holidayPolicyID,
                      false,
                      null,
                      t,
                    );
                  }
                }

                // salary structure

                if (e.Salary_Grade != null && e.Salary_Grade != '') {
                  if (e.deleteStructure) {
                    await HrSalaryMaster.destroy(
                      {
                        where: {
                          userMasterID: userMasterID,
                          salaryFromYYYYMM: e.salaryFromYYYYMM,
                        },
                      },
                      { transaction: t },
                    );
                  }

                  const body = e.body;

                  if (body) {
                    const { salaryStructureData, minWagesMasterId } =
                      await assignSalaryStructure(
                        body.grade_salary_structure_data,
                        body.ctc,
                        body.stateid,
                        body.AmountIn,
                        body.yearmonth,
                        body.gender,
                        body.corporationId,
                        companyMasterID,
                        body.skillCategory,
                        null,
                        0,
                        body.hasMinimumWages,
                        [],
                        null,
                        payhead_B_C,
                        e.SalaryBase,
                      );

                    const finaldata1 = [];

                    const salaryIncrementAuth =
                      await FormAuthorizationDetails.findOne({
                        where: {
                          AuthorizationMasterID:
                            authorizationMasterTypes.salaryIncrement,
                          userMasterID,
                          status: 1,
                        },
                        include: [
                          {
                            model: AuthorizationCriteriaMaster,
                            attributes: ['AuthorizationCriteriaID'],
                          },
                        ],
                      });
                    if (!salaryIncrementAuth) {
                      for (let sd = 0; sd < salaryStructureData.length; sd++) {
                        const gradedata = {
                          userMasterID: userMasterID,
                          gradeSalaryStructureID:
                            salaryStructureData[sd].gradeSalaryStructureID,
                          EmployeeSalaryPer: null,
                          EmployeeSalaryAmount:
                            salaryStructureData[sd].finalvalue,
                          salaryFromYYYYMM: e.salaryFromYYYYMM,
                          stateid: body.stateid || null,
                          AmountIn: '1',
                          createBy,
                          createByIp,
                          ActualEmployeeSalaryAmount:
                            salaryStructureData[sd].actualvalue,
                          skillCategory: body.skillCategory,
                          corporationId: body.corporationId,
                          minWagesMasterId: minWagesMasterId || null,
                        };

                        finaldata1.push(gradedata);
                      }

                      await HrSalaryMaster.bulkCreate(finaldata1, {
                        transaction: t,
                      });
                    } else {
                      await salaryIncrementAuthorizationHandling(
                        salaryIncrementAuth,
                        e,
                        req.userDetails,
                        userMasterID,
                        t,
                      );
                    }
                  }
                }
              }
            });
          } catch (error) {
            console.log(error, 'error--');

            let message = error.message;
            if (bankError) {
              message =
                'Please enter Bank, IFSC Code, Account No, and Account Holder Name.';
            }
            return res.status(400).json({ message: message });
          }

          return res.status(200).send({
            status: 200,
            message: ' The File Updated Successfully: ' + req.file.originalname,
          });
        } else {
          if (
            Number(totalcount) + Number(AddArray.length) >
            Number(check_tracking.totalUser)
          ) {
            return res.status(200).json({
              message:
                'you have exceed your User limit please upgrade your plan! ',
            });
          }

          for (let e of AddArray) {
            const joiningMonth = e.JoinDate
              ? String(e.JoinDate).slice(0, 4) +
                '' +
                String(e.JoinDate).slice(5, 7)
              : new Date().toISOString().slice(0, 4) +
                '' +
                new Date().toISOString().slice(5, 7);

            let UserListMap = {
              firstName: e.First_Name.trim(),
              middleName: e.Middle_Name ? e.Middle_Name.trim() : null,
              lastName: e.Last_Name.trim(),
              userNumber: e.Mobileno,
              email: e.Email_Id,
              officalEmail: e.officalEmail,
              dob: e.BirthDate,
              gender: e.Gender,
              companyMasterId: companyMasterID,
              maratialStatus: e.Marital_Status,
              physicalDisability: e.Physical_Handicap,
              isPhotoLock: 0,
              password: bcrypt.hashSync(
                e.First_Name.substring(0, 4).toLowerCase() +
                  '' +
                  String(e.Mobileno).slice(-4),
                salt,
              ),
              status: 1,
              admin: 0,
              displayName: e.Full_Name,
              otherContactNumber: e.otherContactNumber,
              cugNumber: e.cugNumber,
              createBy,
              createByIp,
              localFName: e.localFName,
              localMName: e.localMName,
              localLName: e.localLName,
              localDisplayName: e.localDisplayName,
            };
            UserList.push(UserListMap);

            let JoiningMap = {
              employeeCode: e.Employee_Code,
              dob: e.BirthDate,
              joiningDate: e.JoinDate,
              leavingDate: e.LeftDate,
              adharCard: e.AadharNo,
              esicNumber: e.ESINo,
              pfNumber: e.PFNo,
              uanNumber: e.UANNo,
              pancard: e.PANNo,
              bankMasterID: e.Bank,
              bankIFSC: e.IFSCCode,
              bankBranchID: e.bankBranchID,
              bankAccountNo: e.AccountNo,
              salaryCalculationAct: e.SalaryBase,
              employment: e.Employeement_Type,
              applicableDate: e.Employment_Applicable_Date,
              endDate: e.Employment_End_Date,
              contractorId:
                e.Employeement_Type == 'Contract' ? e.contractor_Name : null,
              salarytype: e.Salary_Type,
              overtime: e.Overtime ? e.Overtime : 0,
              noticePeriod: e.Notice_Period,
              status: 1,
              adharName: e.AadharName,
              pfbankMasterID: e.PF_Bank,
              pfjoiningDate: e.PF_JoinDate,
              pfbankIFSC: e.PF_bankIFSC,
              pfbankAccountNo: e.PF_bankACNO,
              esicjoiningDate: e.ESI_JoinDate,
              bloodgroup: e.BloodGroup,
              nationality: e.Nationality,
              biometricSerialNo: e.BiometricSerialNo,
              biometricCode: e.BiometricCode,
              attendanceFrom: 'mobileandbiometric',
              nameAsBank: e.Name_As_On_Bank,
              attendanceFrom: e.attendanceFrom,
              createBy,
              createByIp,
              bankBranchID: e.bankBranchID,
              payrollFrequency:
                e.payrollFrequency || PayrollFrequencyType.MONTHLY,
              fullMonthPresence: e.fullMonthPresence,
            };

            employeejoining.push(JoiningMap);

            if (showPayrollFrequency) {
              if (e.Bank || e.IFSCCode || e.AccountNo || e.bankBranchID) {
                if (!e.Bank || !e.IFSCCode || !e.AccountNo || !e.bankBranchID) {
                  return res.status(200).send({
                    status: 402,
                    message: `Please enter the Bank, BSB Code, Account Number, and Account Holder Name for user ${e.Full_Name}.`,
                  });
                } else if (
                  e.Bank &&
                  e.IFSCCode &&
                  e.AccountNo &&
                  e.bankBranchID
                ) {
                  employeeBankDetailRequest.push({
                    bankMasterID: e.Bank,
                    bankBranchID: e.bankBranchID ?? null,
                    IFSCCode: e.IFSCCode ?? null,
                    accountNo: e.AccountNo ?? null,
                    accountHolderName: e.Full_Name ?? null,
                    AuthorizationCriteriaID: null,
                    createBy,
                    createByIp,
                  });
                }
              } else {
                employeeBankDetailRequest.push({
                  bankMasterID: null,
                  bankBranchID: null,
                  IFSCCode: null,
                  accountNo: null,
                  accountHolderName: null,
                  AuthorizationCriteriaID: null,
                  wrongObject: null,
                  createBy,
                  createByIp,
                });
              }
            } else {
              if (e.Bank || e.IFSCCode || e.AccountNo) {
                if (!e.Bank || !e.IFSCCode || !e.AccountNo) {
                  return res.status(200).send({
                    status: 402,
                    message: `Please enter the Bank, IFSC Code, Account Number, and Account Holder Name for user ${e.Full_Name}.`,
                  });
                } else if (e.Bank && e.IFSCCode && e.AccountNo) {
                  employeeBankDetailRequest.push({
                    bankMasterID: e.Bank,
                    IFSCCode: e.IFSCCode ?? null,
                    accountNo: e.AccountNo ?? null,
                    accountHolderName: e.Full_Name ?? null,
                    AuthorizationCriteriaID: null,
                    createBy,
                    createByIp,
                  });
                }
              } else {
                employeeBankDetailRequest.push({
                  bankMasterID: null,
                  IFSCCode: null,
                  accountNo: null,
                  accountHolderName: null,
                  AuthorizationCriteriaID: null,
                  wrongObject: null,
                  createBy,
                  createByIp,
                });
              }
            }

            let localAddressMap = {
              addressType: 'temporary',
              landmark: e.Local_Address,
              createBy,
              createByIp,
              verifyStatus: 1,
              verifyBy: createBy,
            };

            localAddress.push(localAddressMap);

            let PermanentAddressMap = {
              addressType: 'permanent',
              landmark: e.Permanent_Address,
              createBy,
              createByIp,
              verifyStatus: 1,
              verifyBy: createBy,
            };

            PermanentAddress.push(PermanentAddressMap);

            // only for add

            let BranchMap = {
              branchID: e.Branch,
              applicableDate: e.Branch_Applicable_Date,
              createBy,
              createByIp,
            };

            branchIDArr.push(BranchMap);

            let DepartmentMap = {
              departmentID: e.Department,
              applicableDate: e.Depart_Applicable_Date,
              createBy,
              createByIp,
            };

            departmentIDArr.push(DepartmentMap);

            let DesignationMap = {
              designationID: e.Designation,
              applicableDate: e.Desig_Applicable_Date,
              createBy,
              createByIp,
            };

            designationIDArr.push(DesignationMap);

            let divisionMap = {
              divisionId: e.Division,
              startDate: e.Division_Applicable_Date,
              createBy,
              createByIp,
            };

            divisionIDArr.push(divisionMap);

            let workingAreaMap = {
              workingAreaId: e.WorkingArea,
              startDate: e.WorkingArea_Applicable_Date,
              createBy,
              createByIp,
            };

            workingAreaIDArr.push(workingAreaMap);
            // shift

            let ShiftMap = {
              shiftID: e.SHIFT,
              startDate: new Date(startdate),
              createBy,
              createByIp,
            };

            ShiftIDArr.push(ShiftMap);

            // Attendance

            let AttendanceMap = {
              attendancePolicyID: e.Attendance_Policy,
              startDate: new Date(startdate),
              createBy,
              createByIp,
            };

            AttendanceIDArr.push(AttendanceMap);

            // Salary policy

            let SalaryPolicyMap = {
              salaryPolicyID: e.Salary_Policy,
              startDate: new Date(e.JoinDate),
              createBy,
              createByIp,
            };

            SalaryIDArr.push(SalaryPolicyMap);

            // Weekoff policy

            let WeekoffMap = {
              weekOffPolicyID: e.WeekOff_Policy,
              applicableDate: new Date(e.JoinDate),
              createBy,
              createByIp,
            };

            WeekoffIDArr.push(WeekoffMap);

            // Holiday policy

            let HolidayMap = {
              holidayPolicyID: e.Holiday_Policy,
              applicableDate: new Date(startdate),
              createBy,
              createByIp,
            };

            HolidayIDArr.push(HolidayMap);

            // Skill Category Data

            SkillCategoryArray.push({
              skillCategory: e.SkillCategory,
              applicableYYYYMM: +joiningMonth,
              createBy,
              createByIp,
            });

            let TrackingMap = {
              tracking: e.Tracking,
              trackingTime: e.TrackingTimeInterval,
              statusMonitoring: e.StatusMonitoring,
              companyMasterID: companyMasterID,
              createBy,
              createByIp,
            };
            trackingArr.push(TrackingMap);

            // salary structure

            let SalaryStructureMap = {
              gradeStructureID: e.Salary_Grade,
              grossAmount: e.Gross_Salary,
              stateid: e.StateForPT,
              joiningdate: e.JoinDate,
              skillCategory: e.SkillCategory_MinWages,
              corporationId: e.Corporation,
            };

            SalaryGradeIDArr.push(SalaryStructureMap);

            // employyeement

            let employeementMap = {
              employeement: e.Employeement_Type,
              applicableDate: e.Employment_Applicable_Date,
              endDate: e.Employment_End_Date,
              createBy,
              createByIp,
            };
            employeementIDArr.push(employeementMap);

            let employeeRole = {
              roleName: e.role,
            };

            f_permission.push(employeeRole);
          }

          const trackingUserLength = trackingArr.filter(
            (e) => e.tracking == 1,
          ).length;

          if (
            Number(totalTrackingUsercount) + trackingUserLength >
            Number(check_tracking.totalTracking)
          ) {
            return res.status(statusCodes.OK).json({
              status: statusCodes.BAD_REQUEST,
              message:
                'you have exceed your Tracking User limit please upgrade your plan!',
            });
          }

          await sequelize.transaction(async (t) => {
            let usermaster = await UserMaster.bulkCreate(UserList, {
              transaction: t,
            });

            for (let k = 0; k < UserList.length; k++) {
              employeejoining[k].userMasterID = usermaster[k].userMasterID;
              employeeBankDetailRequest[k].userMasterID =
                usermaster[k].userMasterID;
              trackingArr[k].userMasterID = usermaster[k].userMasterID;

              //Aadhar Creation in EMP Document
              if (
                employeejoining[k].adharCard ||
                employeejoining[k].adharName
              ) {
                let tempOBJ = {
                  userMasterID: usermaster[k].userMasterID,
                  documentListID: 1,
                  createBy: createBy,
                  verifyStatus: 1,
                  verifyBy: createBy,
                  documentNumber: employeejoining[k].adharCard,
                  nameOnDocument: employeejoining[k].adharName,
                };
                Empdocument.push(tempOBJ);
              }

              //PAN Creation in EMP Document
              if (employeejoining[k].pancard) {
                let tempOBJ = {
                  userMasterID: usermaster[k].userMasterID,
                  documentListID: 2,
                  createBy: createBy,
                  verifyStatus: 1,
                  verifyBy: createBy,
                  documentNumber: employeejoining[k].pancard,
                };
                Empdocument.push(tempOBJ);
              }

              // only for add

              if (check == 0) {
                branchIDArr[k].userMasterID = usermaster[k].userMasterID;

                departmentIDArr[k].userMasterID = usermaster[k].userMasterID;

                designationIDArr[k].userMasterID = usermaster[k].userMasterID;

                divisionIDArr[k].userMasterID = usermaster[k].userMasterID;

                workingAreaIDArr[k].userMasterID = usermaster[k].userMasterID;

                ShiftIDArr[k].userMasterID = usermaster[k].userMasterID;

                SkillCategoryArray[k].userMasterID = usermaster[k].userMasterID;
              }

              AttendanceIDArr[k].userMasterID = usermaster[k].userMasterID;

              SalaryIDArr[k].userMasterID = usermaster[k].userMasterID;

              WeekoffIDArr[k].userMasterID = usermaster[k].userMasterID;

              HolidayIDArr[k].userMasterID = usermaster[k].userMasterID;

              PermanentAddress[k].userMasterID = usermaster[k].userMasterID;

              localAddress[k].userMasterID = usermaster[k].userMasterID;

              SalaryGradeIDArr[k].userMasterID = usermaster[k].userMasterID;

              employeementIDArr[k].userMasterID = usermaster[k].userMasterID;

              //For Updating RolePermissions of the user

              const RoleID = await RoleMaster.findOne({
                raw: true,
                where: Sequelize.and(
                  Sequelize.where(
                    sequelize.fn(
                      'TRIM',
                      sequelize.fn('LOWER', sequelize.col('roleName')),
                    ),
                    String('Employee').trim().toLowerCase(),
                  ),
                  Sequelize.where(
                    sequelize.col('companyMasterID'),
                    companyMasterID,
                  ),
                ),
              });

              if (RoleID) {
                const Roleid = RoleID.roleMasterID;

                await UserRole.create(
                  {
                    userMasterID: usermaster[k].userMasterID,
                    roleMasterID: Roleid,
                  },
                  { user: req.userDetails, transaction: t },
                );
              }

              // localAddress

              if (
                localAddress[k].landmark != null &&
                localAddress[k].landmark != ''
              ) {
                f_localAddress.push(localAddress[k]);
              }

              // permanent address

              if (
                PermanentAddress[k].landmark != null &&
                PermanentAddress[k].landmark != ''
              ) {
                f_permanentAddress.push(PermanentAddress[k]);
              }

              // employeement

              if (
                employeementIDArr[k].employeement != null &&
                employeementIDArr[k].employeement != ''
              ) {
                f_employeement.push(employeementIDArr[k]);
              }

              // bank

              if (
                employeejoining[k].bankMasterID != null &&
                employeejoining[k].bankMasterID != ''
              ) {
                let bankmaster = await executeQuery(
                  `
                     
                      select * from "bankMasters" where LOWER(TRIM("bankName")) = '` +
                    employeejoining[k].bankMasterID.trim().toLowerCase() +
                    `' and status =1 
                                         `,
                );

                employeejoining[k].bankMasterID = bankmaster[0].bankMasterID;
                employeeBankDetailRequest[k].bankMasterID =
                  bankmaster[0].bankMasterID;
              } else {
                employeejoining[k].bankMasterID = null;
              }

              // pf bank

              if (
                employeejoining[k].pfbankMasterID != null &&
                employeejoining[k].pfbankMasterID != ''
              ) {
                let bankmaster1 = await executeQuery(
                  `
                     
  select * from "bankMasters" where LOWER(TRIM("bankName")) = '` +
                    employeejoining[k].pfbankMasterID.trim().toLowerCase() +
                    `' and status =1 
                     `,
                );

                employeejoining[k].pfbankMasterID = bankmaster1[0].bankMasterID;
              } else {
                employeejoining[k].pfbankMasterID = null;
              }

              // only for add

              if (check == 0) {
                // branch

                if (
                  branchIDArr[k].branchID != null &&
                  branchIDArr[k].branchID != ''
                ) {
                  let uniquedata = await executeQuery(
                    `
                     
  select * from "branchMasters" where LOWER(TRIM("branchName")) ='` +
                      branchIDArr[k].branchID.trim().toLowerCase() +
                      `' and "companyMasterID" = ` +
                      companyMasterID +
                      ` and status =1 and "deletedAt" is null`,
                  );

                  branchIDArr[k].branchID = uniquedata[0].branchMasterID;
                }

                // depart

                if (
                  departmentIDArr[k].departmentID != null &&
                  departmentIDArr[k].departmentID != ''
                ) {
                  let uniquedata1 = await executeQuery(
                    `
                     
  select * from departments WHERE LOWER(TRIM("departmentName")) = '` +
                      departmentIDArr[k].departmentID.trim().toLowerCase() +
                      `' and "companyMasterID" = ` +
                      companyMasterID +
                      ` and status =1 and "deletedAt" is null`,
                  );

                  departmentIDArr[k].departmentID = uniquedata1[0].departmentId;
                }

                // desig

                if (
                  designationIDArr[k].designationID != null &&
                  designationIDArr[k].designationID != ''
                ) {
                  let uniquedata2 = await executeQuery(
                    `
                     
  select * from designations WHERE LOWER(TRIM("designationName")) = '` +
                      designationIDArr[k].designationID.trim().toLowerCase() +
                      `' and "companyMasterID" = ` +
                      companyMasterID +
                      ` and status =1 and "deletedAt" is null`,
                  );

                  designationIDArr[k].designationID =
                    uniquedata2[0].designationId;
                }
              }

              // salary policy

              let salaryPolicyApplicableDate = moment(
                employeejoining[k].joiningDate,
                'YYYY-MM-DD',
              )
                .startOf('month')
                .format('YYYY-MM-DD');

              if (
                SalaryIDArr[k].salaryPolicyID != null &&
                SalaryIDArr[k].salaryPolicyID != ''
              ) {
                let uniquedata5 = await executeQuery(
                  ` 
                      select * from "salaryPolicies" where LOWER(TRIM("salaryPolicyName")) = '` +
                    SalaryIDArr[k].salaryPolicyID.trim().toLowerCase() +
                    `' and "companyMasterID" = ` +
                    companyMasterID +
                    ` and status =1`,
                );

                if (uniquedata5?.length) {
                  SalaryIDArr[k].salaryPolicyID = uniquedata5[0].salaryPolicyID;

                  const { start_date } = getSalaryCycleDateAndMonthByDate(
                    uniquedata5[0],
                    employeejoining[k].joiningDate,
                  );

                  salaryPolicyApplicableDate = start_date;
                }

                SalaryIDArr[k].startDate = new Date(salaryPolicyApplicableDate);

                // push salary policy
                f_salary.push(SalaryIDArr[k]);
              }

              // only for add
              if (check == 0) {
                // shift

                if (
                  ShiftIDArr[k].shiftID != null &&
                  ShiftIDArr[k].shiftID != ''
                ) {
                  let uniquedata3 = await executeQuery(
                    `
                    
  select * from shifts where LOWER(TRIM("shiftName")) = '` +
                      ShiftIDArr[k].shiftID.trim().toLowerCase() +
                      `' and "companyMasterID" = ` +
                      companyMasterID +
                      ` and status =1 and "deletedAt" is null`,
                  );

                  ShiftIDArr[k].shiftID = uniquedata3[0].shiftID;
                  // push shift
                  f_shift.push(ShiftIDArr[k]);
                }

                if (
                  divisionIDArr[k].divisionId != null &&
                  divisionIDArr[k].divisionId != ''
                ) {
                  let uniquedata3 = await executeQuery(
                    `
                    
  select * from divisions where LOWER(TRIM("divisionName")) = '` +
                      divisionIDArr[k].divisionId.trim().toLowerCase() +
                      `' and "companyMasterID" = ` +
                      companyMasterID +
                      ` and status =1 and "deletedAt" is null`,
                  );

                  divisionIDArr[k].divisionId = uniquedata3[0].id;
                  // push shift
                  f_division.push(divisionIDArr[k]);
                }
                if (
                  workingAreaIDArr[k].workingAreaId != null &&
                  workingAreaIDArr[k].workingAreaId != ''
                ) {
                  let uniquedata3 = await executeQuery(
                    `
                    
  select * from "workingAreas" where LOWER(TRIM("workingAreaName")) = '` +
                      workingAreaIDArr[k].workingAreaId.trim().toLowerCase() +
                      `' and "companyMasterID" = ` +
                      companyMasterID +
                      ` and status =1 and "deletedAt" is null`,
                  );

                  workingAreaIDArr[k].workingAreaId = uniquedata3[0].id;
                  // push shift
                  f_workingArea.push(workingAreaIDArr[k]);
                }
                // skill category

                if (SkillCategoryArray[k].skillCategory) {
                  finalSkillCategoryArray.push(SkillCategoryArray[k]);
                }
                trackingArr[k].userMasterID = usermaster[k].userMasterID;
                if (trackingArr[k].tracking) {
                  f_tracking.push({
                    userMasterID: trackingArr[k].userMasterID,
                    trackStatus: trackingArr[k].tracking,
                    trackingTime: trackingArr[k].trackingTime,
                    companyMasterID: companyMasterID,
                    statusMonitoring: trackingArr[k].statusMonitoring,
                    createBy: trackingArr[k].createBy,
                    createByIp: trackingArr[k].createByIp,
                  });
                }
              }

              // Attendance Policy

              if (
                AttendanceIDArr[k].attendancePolicyID != null &&
                AttendanceIDArr[k].attendancePolicyID != ''
              ) {
                let uniquedata4 = await executeQuery(
                  `
                     
  select * from "attendancePolicies" where LOWER(TRIM("attendancePolicyName")) = '` +
                    AttendanceIDArr[k].attendancePolicyID.trim().toLowerCase() +
                    `' and "companyMasterID" = ` +
                    companyMasterID +
                    ` and status =1 and "deletedAt" is null`,
                );

                AttendanceIDArr[k].attendancePolicyID =
                  uniquedata4[0].attendancePolicyID;

                // push Attendance

                f_attendance.push(AttendanceIDArr[k]);
              }

              // weekoff policy

              if (
                WeekoffIDArr[k].weekOffPolicyID != null &&
                WeekoffIDArr[k].weekOffPolicyID != ''
              ) {
                let uniquedata6 = await executeQuery(
                  `
                      select * from "weekOffPolicies" WHERE LOWER(TRIM("weekOffPolicyName")) = '` +
                    WeekoffIDArr[k].weekOffPolicyID.trim().toLowerCase() +
                    `'  and "companyMasterID" = ` +
                    companyMasterID +
                    ` and status =1 `,
                );

                WeekoffIDArr[k].weekOffPolicyID =
                  uniquedata6[0].weekOffPolicyID;

                WeekoffIDArr[k].applicableDate = salaryPolicyApplicableDate;

                // push weekoff policy

                f_wekoff.push(WeekoffIDArr[k]);

                const tempWeekoff = await add_WeekOffHoliday_With_Transaction(
                  companyMasterID,
                  [usermaster[k].userMasterID],
                  salaryPolicyApplicableDate,
                  uniquedata6[0].weekOffPolicyID,
                  null,
                  false,
                  null,
                  t,
                );
              }

              // holiday policy

              if (
                HolidayIDArr[k].holidayPolicyID != null &&
                HolidayIDArr[k].holidayPolicyID != ''
              ) {
                let uniquedata7 = await executeQuery(
                  `
                      
  select * from "holidayPolicies" WHERE LOWER(TRIM("holidayPolicyName")) = '` +
                    HolidayIDArr[k].holidayPolicyID.trim().toLowerCase() +
                    `'  and "companyMasterID" = ` +
                    companyMasterID +
                    ` and status =1
                      `,
                );

                if (uniquedata7?.length) {
                  HolidayIDArr[k].holidayPolicyID =
                    uniquedata7[0].holidayPolicyID;

                  const applicableDate = moment(
                    uniquedata7[0].holidayYear,
                    'YYYY',
                  )
                    .startOf('year')
                    .format('YYYY-MM-DD');

                  HolidayIDArr[k].applicableDate = applicableDate;

                  // push holiday policy
                  f_holiday.push(HolidayIDArr[k]);

                  await add_WeekOffHoliday_With_Transaction(
                    companyMasterID,
                    [usermaster[k].userMasterID],
                    applicableDate,
                    null,
                    uniquedata7[0].holidayPolicyID,
                    false,
                    null,
                    t,
                  );
                }
              }

              // salary structure

              if (
                SalaryGradeIDArr[k].gradeStructureID != null &&
                SalaryGradeIDArr[k].gradeStructureID != ''
              ) {
                let uniquedata7 = await executeQuery(
                  ` 
        
          select * from "gradeStructures" WHERE LOWER(TRIM("gradeName")) = '` +
                    SalaryGradeIDArr[k].gradeStructureID.trim().toLowerCase() +
                    `' and "companyMasterID" = ` +
                    companyMasterID +
                    ` and status =1 `,
                );

                SalaryGradeIDArr[k].gradeStructureID =
                  uniquedata7[0].gradeStructureID;

                const grade_salary_structure_data =
                  await GradeSalaryStructure.findAll({
                    raw: true,
                    where: {
                      gradeStructureID: SalaryGradeIDArr[k].gradeStructureID,
                    },
                    include: [
                      {
                        model: HRSalaryFields,
                        attributes: [],
                        include: [{ model: Payheadmaster, attributes: [] }],
                      },
                      {
                        model: GradeStructure,
                        attributes: [],
                      },
                    ],
                    order: [
                      [
                        { model: HRSalaryFields, as: 'hrSalaryField' },
                        'salaryFieldSrNo',
                        'ASC',
                      ],
                      ['salaryfieldindex', 'ASC'],

                      // Order by payheadName in Payheadmaster
                      [
                        { model: HRSalaryFields, as: 'hrSalaryField' },
                        { model: Payheadmaster, as: 'Payheadmaster' },
                        'payheadName',
                        'ASC',
                      ],
                    ],
                    attributes: [
                      'gradeSalaryStructureID',
                      'gradeStructureID',
                      'salaryFieldID',
                      'fieldFixAmount',
                      'formula',
                      'salaryfieldindex',
                      'salaryfieldmaxrange',
                      'fieldFixAmount1',
                      'formula1',
                      'formulaPreference',
                      [
                        sequelize.col('hrSalaryField.payheadMasterId'),
                        'payheadMasterId',
                      ],
                      [
                        sequelize.col('hrSalaryField.salaryFieldSide'),
                        'salaryFieldSide',
                      ],
                      [
                        sequelize.col('hrSalaryField.salaryFieldAttanChk'),
                        'salaryFieldAttanChk',
                      ],
                      [
                        sequelize.col('hrSalaryField.salaryFieldWhenMonth'),
                        'salaryFieldWhenMonth',
                      ],
                      [
                        sequelize.col('hrSalaryField.salaryFieldSrNo'),
                        'salaryFieldSrNo',
                      ],
                      [
                        sequelize.col('hrSalaryField.companyMasterID'),
                        'companyMasterID',
                      ],
                      [
                        sequelize.col('hrSalaryField.payheadDisplayName'),
                        'payheadDisplayName',
                      ],
                      [sequelize.col('hrSalaryField.considerIn'), 'considerIn'],
                      [
                        sequelize.col(
                          'hrSalaryField.Payheadmaster.payheadName',
                        ),
                        'payheadName',
                      ],
                      [
                        sequelize.col('gradeStructure.baseOnCalculation'),
                        'baseOnCalculation',
                      ],

                      [
                        sequelize.col('hrSalaryField.assignSalaryRound'),
                        'assignSalaryRound',
                      ],
                      [
                        sequelize.col('hrSalaryField.assignSalaryRoundNo'),
                        'assignSalaryRoundNo',
                      ],
                      [
                        sequelize.col('hrSalaryField.assignSalaryRoundOffType'),
                        'assignSalaryRoundOffType',
                      ],
                    ],
                  });

                let stateRequired = false;
                let hasMinimumWages = false;

                for (const item of grade_salary_structure_data) {
                  const isMinimumWages =
                    item.formula?.includes('Minimum Wages') ||
                    item.formula1?.includes('Minimum Wages');

                  if (isMinimumWages) {
                    hasMinimumWages = true;
                  }

                  if (
                    item.payheadMasterId == payheadMasterIdsMapping.PTAX ||
                    item.payheadMasterId ==
                      payheadMasterIdsMapping.EMPLOYEE_LWF ||
                    item.payheadMasterId ==
                      payheadMasterIdsMapping.EMPLOYER_LWF ||
                    isMinimumWages
                  ) {
                    stateRequired = true;
                  }

                  if (stateRequired && hasMinimumWages) {
                    break;
                  }
                }

                let stateid = null,
                  corporationId = null;

                if (stateRequired) {
                  let uniquedata = await executeQuery(
                    `                 
  select * from "stateMasters" where LOWER(TRIM("stateName")) = '` +
                      SalaryGradeIDArr[k].stateid.trim().toLowerCase() +
                      `' and "countryMasterID"=103 and status=1 
                      `,
                  );

                  stateid = uniquedata[0].stateMasterID;

                  // check for corpoaration

                  if (SalaryGradeIDArr[k].corporationId) {
                    const corpo = await executeQuery(
                      `                 
SELECT * from "corporations" where "stateMasterID"=${stateid} and LOWER(TRIM("corporationName")) = '` +
                        String(SalaryGradeIDArr[k].corporationId)
                          .trim()
                          .toLowerCase() +
                        `' and "deletedAt" is null
                      `,
                    );

                    corporationId = corpo[0]?.id || null;
                  }
                }

                let yearmonth =
                  SalaryGradeIDArr[k].joiningdate.toString().slice(0, 4) +
                  SalaryGradeIDArr[k].joiningdate.toString().slice(5, 7);

                const body = {
                  gradeid: SalaryGradeIDArr[k].gradeStructureID,
                  ctc: SalaryGradeIDArr[k].grossAmount,
                  userMasterID: SalaryGradeIDArr[k].userMasterID,
                  stateid: stateid || null,
                  AmountIn: '1',
                  yearmonth: yearmonth,
                  gender: usermaster[k].gender,
                  skillCategory: SalaryGradeIDArr[k].skillCategory,
                  corporationId: corporationId,
                };

                const { salaryStructureData, minWagesMasterId } =
                  await assignSalaryStructure(
                    grade_salary_structure_data,
                    body.ctc,
                    body.stateid,
                    body.AmountIn,
                    body.yearmonth,
                    body.gender,
                    body.corporationId,
                    companyMasterID,
                    body.skillCategory,
                    null,
                    0,
                    hasMinimumWages,
                    [],
                    null,
                    payhead_B_C,
                    employeejoining[k].salaryCalculationAct,
                  );

                for (let sd = 0; sd < salaryStructureData.length; sd++) {
                  let gradedata = {
                    userMasterID: SalaryGradeIDArr[k].userMasterID,
                    gradeSalaryStructureID:
                      salaryStructureData[sd].gradeSalaryStructureID,
                    EmployeeSalaryPer: null,
                    EmployeeSalaryAmount: salaryStructureData[sd].finalvalue,
                    salaryFromYYYYMM: yearmonth,
                    stateid: stateid || null,
                    AmountIn: '1',
                    createBy,
                    createByIp,
                    ActualEmployeeSalaryAmount:
                      salaryStructureData[sd].actualvalue,
                    skillCategory: body.skillCategory,
                    corporationId: body.corporationId,
                    minWagesMasterId: minWagesMasterId || null,
                  };

                  finaldata.push(gradedata);
                }
              }
            }

            await EmployeeJoiningDetails.bulkCreate(employeejoining, {
              transaction: t,
            });
            employeeBankDetailRequest = employeeBankDetailRequest.filter(
              (obj) => !('wrongObject' in obj),
            );

            await BankDetailRequest.bulkCreate(employeeBankDetailRequest, {
              validate: false,
              transaction: t,
            });

            await UserDocument.bulkCreate(Empdocument, {
              transaction: t,
            });

            await UserAddress.bulkCreate(f_localAddress, {
              transaction: t,
            });

            await UserAddress.bulkCreate(f_permanentAddress, {
              transaction: t,
            });

            await Employeeemployeement.bulkCreate(f_employeement, {
              transaction: t,
            });

            await EmployeeBranch.bulkCreate(branchIDArr, {
              transaction: t,
            });

            await EmployeeDepartment.bulkCreate(departmentIDArr, {
              transaction: t,
            });

            await EmployeeDesignation.bulkCreate(designationIDArr, {
              transaction: t,
            });
            await EmployeeDivision.bulkCreate(f_division, {
              transaction: t,
            });
            await EmployeeWorkingArea.bulkCreate(f_workingArea, {
              transaction: t,
            });
            await EmployeeShift.bulkCreate(f_shift, { transaction: t });

            await EmployeeAttendancePolicy.bulkCreate(f_attendance, {
              transaction: t,
            });

            await EmployeeSalarypolicy.bulkCreate(f_salary, {
              transaction: t,
            });

            await EmployeeWeekOff.bulkCreate(f_wekoff, {
              transaction: t,
            });

            await EmployeeHolidayPolicy.bulkCreate(f_holiday, {
              transaction: t,
            });

            await HrSalaryMaster.bulkCreate(finaldata, {
              transaction: t,
            });

            await EmployeeSkillCategory.bulkCreate(finalSkillCategoryArray, {
              transaction: t,
            });
            await UserTracking.bulkCreate(f_tracking, { transaction: t });

            // .catch((error) => {
            //   res.status(200).send({
            //     status: 401,
            //     message: "Fail to import data into database!",
            //     error: error.message,
            //   });
            // });
          });

          return res.status(200).send({
            status: 200,
            message:
              ' The File Uploaded  Successfully: ' + req.file.originalname,
          });
        }
      } else {
        return res.status(200).json({
          message:
            'you do not have subscription plan. please subscribe to a plan',
        });
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.exportuserExcel = async (req, res, next) => {
  try {
    let {
      companyMasterID,
      status,
      filter,
      exportData,
      branchMasterID,
      department,
      designation,
      searchQuery,
      divisionId,
      workingAreaId,
      payrollFrequency,
    } = req.body;
    let companyid = companyMasterID;
    let date = asiaKolkataDateTime(new Date()).slice(0, 10);
    let yearmonth = date.slice(0, 4) + date.slice(5, 7);
    const finaldata = [];

    const condition = {};
    if (+status == 1) condition.status = 1;
    else if (status == '0') condition.status = 0;
    else condition.status = 1;

    if (companyid) condition.companyMasterId = companyid;

    const joiningCondition = {};

    if (payrollFrequency) joiningCondition.payrollFrequency = payrollFrequency;

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
        {
          '$companyMaster.companyName$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
      ];

    const order = [['firstName', 'ASC']];

    const includedModels = [
      { model: companyMaster },
      {
        required: Boolean(payrollFrequency),
        model: EmployeeJoiningDetails,
        where: joiningCondition,
        include: [
          {
            model: BankMaster,

            attributes: ['bankName'],
          },
          {
            model: BankMaster,
            as: 'employeePFBank',
            attributes: ['bankName'],
          },
          {
            model:Contractor,
            attributes:['contractorId','contractorName']
          }
        ],
      },
    ];

    if (req.userDetails && req.userDetails.role) {
      if (
        req.userDetails.role.roleType == roleType.BRANCH_WISE &&
        (!branchMasterID ||
          (Array.isArray(branchMasterID) && !branchMasterID.length))
      )
        branchMasterID = req.userDetails.accessibleBranches;
    }

    includedModels.push(
      // Employee Branch
      {
        model: EmployeeBranch,
        where: {
          status: 1,
          ...(branchMasterID && { branchID: branchMasterID }),
          applicableDate: {
            [Sequelize.Op.lte]: new Date(date),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(date),
              },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: branchMasterID ? true : false,
        attributes: ['branchID', 'applicableDate'],
        include: [
          {
            model: BranchMaster,
            as: 'branchMaster',
            attributes: ['branchName'],
          },
        ],
      },

      // Employee Designation
      {
        model: EmployeeDesignation,
        where: {
          status: 1,
          ...(designation && { designationID: designation }),
          applicableDate: {
            [Sequelize.Op.lte]: new Date(date),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(date),
              },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: designation ? true : false,
        attributes: ['designationID', 'applicableDate'],
        include: [
          {
            model: Designation,
            as: 'designation',
            attributes: ['designationName'],
          },
        ],
      },
      // Employee Department
      {
        model: EmployeeDepartment,
        where: {
          status: 1,
          ...(department && { departmentID: department }),
          applicableDate: {
            [Sequelize.Op.lte]: new Date(date),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(date),
              },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: department ? true : false,
        attributes: ['departmentID', 'applicableDate'],
        include: [
          {
            model: Department,
            as: 'department',
            attributes: ['departmentName'],
          },
        ],
      },
      // Division
      {
        model: EmployeeDivision,
        where: {
          status: 1,
          ...(divisionId && { divisionId: divisionId }),
          startDate: { [Sequelize.Op.lte]: new Date(date) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(date) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: divisionId ? true : false,
        attributes: ['divisionId'],
        include: [
          {
            model: Division,
            attributes: ['divisionName'],
          },
        ],
      },

      // Working Area

      {
        model: EmployeeWorkingArea,
        where: {
          status: 1,
          ...(workingAreaId && { workingAreaId: workingAreaId }),
          startDate: { [Sequelize.Op.lte]: new Date(date) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(date) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: workingAreaId ? true : false,
        attributes: ['workingAreaId'],
        include: [
          {
            model: WorkingArea,
            attributes: ['workingAreaName'],
          },
        ],
      },

      // user Address

      {
        model: UserAddress,
        required: false,
        where: {
          status: 1,
          verifyStatus: 1,
        },
        include: [
          {
            model: CityMaster,
            attributes: ['cityName'],
            include: [
              {
                model: StateMaster,
                attributes: ['stateName'],
                include: [
                  { model: CountryMaster, attributes: ['countryName'] },
                ],
              },
            ],
          },
        ],
      },

      // Employee Shift
      {
        model: EmployeeShift,
        where: {
          status: 1,
          startDate: { [Sequelize.Op.lte]: new Date(date) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(date) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: false,
        attributes: ['shiftsID', 'startDate'],
      },
      // Employee Working Location
      {
        model: EmployeeWorkingLocation,
        where: {
          status: 1,
          startDate: { [Sequelize.Op.lte]: new Date(date) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(date) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: false,
        attributes: ['workingLocationIDs', 'startDate'],
      },

      // Employee Leave Policy

      {
        model: empLeavePolicy,
        where: {
          status: 1,
          applicableDate: { [Sequelize.Op.lte]: new Date(date) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(date) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: false,
        attributes: ['employeeLeavePolicyID'],
      },

      // Attendance Policy

      {
        model: EmployeeAttendancePolicy,
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
        attributes: ['attendancePolicyID'],
        include: [
          {
            model: AttendancePolicy,
            as: 'attendancePolicy',
            attributes: ['attendancePolicyName'],
          },
        ],
      },
      // Salary Policy
      {
        model: EmployeeSalaryPolicy,
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
        attributes: ['salaryPolicyID'],
        include: [
          {
            model: SalaryPolicy,
            as: 'salaryPolicy',
            attributes: ['salaryPolicyName'],
          },
        ],
      },
      // Weekoff Policy
      {
        model: EmployeeWeekOff,
        where: {
          status: 1,
          applicableDate: { [Sequelize.Op.lte]: date },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: date } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: false,
        separate: true,
        attributes: ['weekOffPolicyID'],
        include: [
          {
            model: weekOffPolicy,
            as: 'weekoff',
            attributes: ['weekOffPolicyName'],
          },
        ],
      },
      // Holiday Policy
      {
        model: EmployeeHolidayPolicy,
        where: {
          status: 1,
          applicableDate: { [Sequelize.Op.lte]: new Date(date) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(date) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: false,
        separate: true,
        attributes: ['holidayPolicyID'],
        include: [
          {
            model: holidayPolicy,
            as: 'HolidayPolicy',
            attributes: ['holidayPolicyName'],
          },
        ],
      },
      // LC-EG Policy
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
        attributes: ['lateEarlyPolicyMasterID', 'startDate'],
        include: [
          {
            model: LateEarlyPolicy,
            as: 'lateEarlyPolicy',
            attributes: ['lateEarlyPolicyName'],
          },
        ],
      },
      // Employee Attendance Bonus Policy
      {
        model: EmployeeAttendanceBonusPolicy,
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
        attributes: ['attendanceBonusPolicyId'],
        include: [
          {
            model: AttendanceBonusPolicy,
            attributes: ['attendanceBonusPolicyName'],
          },
        ],
      },

      // Employee Food Allowance Policy
      {
        model: EmployeeFoodAllowancePolicy,
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
        attributes: ['foodAllowancePolicyId'],
        include: [
          {
            model: FoodAllowancePolicy,
            attributes: ['foodAllowancePolicyName'],
          },
        ],
      },

      // Experience
      {
        model: UserExperience,
        required: false,
        where: {
          verifyStatus: 1,
          status: 1,
        },
      },

      // Education
      {
        model: UserEducation,
        required: false,
        where: {
          verifyStatus: 1,
          status: 1,
        },
      },

      // Family
      {
        model: userFamily,
        required: false,
        where: {
          verifyStatus: 1,
          status: 1,
        },
      },

      // user Rights
      {
        model: UserRole,
        attributes: ['roleMasterID'],
        include: [{ model: RoleMaster, attributes: ['roleName'] }],
        limit: 1,
      },
    );
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const userData = await UserMaster.findAll({
      where: { ...userAccessCondition.where, ...condition },
      order,
      include: [...userAccessCondition.includeModels, ...includedModels],
    });

    const allUserIds = userData.map((e) => e.userMasterID) || [];
    const assignSalaryPermission = await checkEmployeePermission(
      req.userDetails?.userMasterId,
      'AssignSalaryStructure',
      'Create',
    );

    let AllUserSalaryData = [];
    if (allUserIds.length && assignSalaryPermission) {
      AllUserSalaryData = await HrSalaryMaster.findAll({
        raw: true,
        where: {
          userMasterID: {
            [Sequelize.Op.in]: allUserIds,
          },
          [Sequelize.Op.and]: Sequelize.literal(`
        ("hrSalaryMaster"."userMasterID", "hrSalaryMaster"."salaryFromYYYYMM") IN (
          SELECT "userMasterID", MAX("salaryFromYYYYMM") AS "maxMonth"
          FROM "hrSalaryMasters"
          WHERE "salaryFromYYYYMM" <= ${yearmonth}
          AND "userMasterID" IN (${allUserIds.join(',')})
          GROUP BY "userMasterID"
        )
      `),
        },
        include: [
          {
            model: GradeSalaryStructure,
            include: [
              { model: GradeStructure, attributes: [] },
              {
                model: HRSalaryFields,
                where: {
                  payheadMasterId: 50,
                },
                attributes: [],
              },
            ],
            attributes: [],
          },
          { model: StateMaster, required: false, attributes: [] },
          {
            model: Corporation,
            attributes: [],
          },
        ],
        attributes: [
          [
            Sequelize.col('gradeSalaryStructure.hrSalaryField.payheadMasterId'),
            'payheadMasterId',
          ],
          'stateid',
          'EmployeeSalaryAmount',
          'salaryFromYYYYMM',
          'userMasterID',
          'skillCategory',
          'corporationId',
          [Sequelize.col('stateMaster.stateName'), 'stateName'],

          [
            Sequelize.col(
              'gradeSalaryStructure.gradeStructure.baseOnCalculation',
            ),
            'baseOnCalculation',
          ],
          [
            Sequelize.col('gradeSalaryStructure.gradeStructure.gradeName'),
            'gradeName',
          ],

          [Sequelize.col('corporation.corporationName'), 'corporationName'],

          [
            Sequelize.col('gradeSalaryStructure.hrSalaryField.salaryFieldSrNo'),
            'salaryFieldSrNo',
          ],
        ],
      });
    }

    for (const user of userData) {
      let shiftNames = '',
        workingLocation = '',
        leavePolicyName = '';
      if (user.employeeShifts.length > 0) {
        const shiftData = await Shift.findAll({
          raw: true,
          where: {
            shiftID: user.employeeShifts[0].shiftsID,
          },
        });

        shiftNames = shiftData.map((s) => s.shiftName).join(',');
      }

      if (user.employeeWorkingLocations.length > 0) {
        const locationData = await WorkingLocation.findAll({
          raw: true,
          where: {
            workingLocationID:
              user.employeeWorkingLocations[0].workingLocationIDs,
          },
        });

        workingLocation = locationData
          .map((s) => s.workingLocationName)
          .join(',');
      }

      if (user.empLeavePolicies.length > 0) {
        const leavePolicyData = await employeeLeavePolicy.findAll({
          raw: true,
          where: {
            id: user.empLeavePolicies[0].employeeLeavePolicyID,
          },
        });

        leavePolicyName = leavePolicyData
          .map((s) => s.leavePolicyName)
          .join(',');
      }

      const userPermanentAddress =
        user.userAddresses && user.userAddresses.length > 0
          ? user.userAddresses.find((e) => e.addressType == 'permanent')
          : null;
      const UserTempAddress =
        user.userAddresses && user.userAddresses.length > 0
          ? user.userAddresses.find((e) => e.addressType == 'temporary')
          : null;
      let user_permanentAddress = '';
      if (userPermanentAddress) {
        if (filter == 0) {
          user_permanentAddress += `${userPermanentAddress.landmark}`;
        } else {
          user_permanentAddress = ToformatAddress(userPermanentAddress);
        }
      }

      let user_tempAddress = '';
      if (UserTempAddress) {
        if (filter == 0) {
          user_tempAddress += `${UserTempAddress.landmark}`;
        } else {
          user_tempAddress = ToformatAddress(UserTempAddress);
        }
      }

      const employeejoining =
        user.employeeJoiningDetails && user.employeeJoiningDetails.length > 0
          ? user.employeeJoiningDetails[0]
          : null;

      const grossSalaryData = AllUserSalaryData.find(
        (e) => e.userMasterID == user.userMasterID && e.payheadMasterId == 50,
      );

      const gross_Salary = grossSalaryData?.EmployeeSalaryAmount || 0;

      const corporation = grossSalaryData?.corporationName || null;

      const workertTypeList = saveraCompanyIDs.includes(+companyMasterID)
        ? listSaveraWorkerType
        : listWorkerTypes;

      const data = {};
      data['Employee_Code'] = employeejoining
        ? employeejoining.employeeCode
        : '';
      data['First_Name'] = user.firstName;
      data['Middle_Name'] = user.middleName;
      data['Last_Name'] = user.lastName;
      if (filter == 1) {
        data['Department'] =
          user.employeeDepartments.length > 0
            ? user.employeeDepartments[0].department.departmentName
            : '';
        data['Department Applicable Date'] =
          user.employeeDepartments.length > 0
            ? user.employeeDepartments[0].applicableDate
            : '';
        data['Designation'] =
          user.employeeDesignations.length > 0
            ? user.employeeDesignations[0].designation.designationName
            : '';
        data['Designation Applicable Date'] =
          user.employeeDesignations.length > 0
            ? user.employeeDesignations[0].applicableDate
            : '';
        data['Branch'] =
          user.employeeBranches.length > 0
            ? user.employeeBranches[0].branchMaster.branchName
            : '';
        data['Branch Applicable Date'] =
          user.employeeBranches.length > 0
            ? user.employeeBranches[0].applicableDate
            : '';
        data['Division'] =
          user.employeeDivisions.length > 0
            ? user.employeeDivisions[0].division.divisionName
            : '';
        data['Working Area'] =
          user.employeeWorkingAreas.length > 0
            ? user.employeeWorkingAreas[0].workingArea.workingAreaName
            : '';
      }

      data['Local_Address'] = user_tempAddress;
      data['Permanent_Address'] = user_permanentAddress;
      data['Mobileno'] = user.userNumber;
      data['Email_Id'] = user.email;
      data['Marital_Status'] = user.maratialStatus;
      data['SalaryBase'] = employeejoining
        ? employeejoining.salaryCalculationAct
        : '';
      data['Gender'] = user.gender;
      data['Bank'] =
        employeejoining && employeejoining.bankMaster
          ? employeejoining.bankMaster.bankName
          : '';
      data['AccountNo'] = employeejoining ? employeejoining.bankAccountNo : '';
      data['IFSCCode'] = employeejoining ? employeejoining.bankIFSC : '';
      data['Name_As_On_Bank'] = employeejoining
        ? employeejoining.nameAsBank
        : '';
      data['BirthDate'] = employeejoining ? employeejoining.dob : '';
      data['JoinDate'] = employeejoining ? employeejoining.joiningDate : '';
      data['LeftDate'] = employeejoining ? employeejoining.leavingDate : '';
      data['PANNo'] = employeejoining ? employeejoining.pancard : '';
      data['AadharNo'] = employeejoining ? employeejoining.adharCard : '';
      data['AadharName'] = employeejoining ? employeejoining.adharName : '';
      data['PFNo'] = employeejoining ? employeejoining.pfNumber : '';
      data['UANNo'] = employeejoining ? employeejoining.uanNumber : '';
      data['PF_JoinDate'] = employeejoining
        ? employeejoining.pfjoiningDate
        : '';
      data['ESINo'] = employeejoining ? employeejoining.esicNumber : '';
      data['ESI_JoinDate'] = employeejoining
        ? employeejoining.esicjoiningDate
        : '';
      data['PF_Bank'] =
        employeejoining && employeejoining.employeePFBank
          ? employeejoining.employeePFBank.bankName
          : '';
      data['PF_bankIFSC'] = employeejoining ? employeejoining.pfbankIFSC : '';
      data['PF_bankACNO'] = employeejoining
        ? employeejoining.pfbankAccountNo
        : '';
      data['Worker Type'] = employeejoining?.salarytype
        ? workertTypeList.find((e) => e.value == employeejoining?.salarytype)
            ?.key || ''
        : '';
      data['Employeement_Type'] = employeejoining
        ? employeejoining.employment
        : '';
      data['Employment Applicable Date'] = employeejoining
        ? employeejoining.applicableDate
        : '';
      data['Employment End Date'] = employeejoining
        ? employeejoining.endDate
        : '';
      data['Contractor'] = employeejoining?.contractor?.contractorName ?? '';
      data['Overtime'] = employeejoining
        ? employeejoining.overtime == 1
          ? 'YES'
          : employeejoining.overtime == 0
            ? 'NO'
            : ''
        : '';
      data['Notice Period(in days)'] = employeejoining
        ? employeejoining.noticePeriod
        : '';
      data['BloodGroup'] = employeejoining ? employeejoining.bloodgroup : '';
      data['Nationality'] = employeejoining ? employeejoining.nationality : '';
      data['Physical_Handicap'] = user.physicalDisability;
      if (filter == 1) {
        data['SHIFT'] = shiftNames;
        data['Working Location'] = workingLocation;
        data['Leave Policy'] = leavePolicyName;
        data['LC-EG Policy'] =
          user.employeeLateEarlyPolicies.length > 0
            ? user.employeeLateEarlyPolicies[0].lateEarlyPolicy
                .lateEarlyPolicyName
            : '';
        data['Attendance Bonus Policy'] =
          user.employeeAttendanceBonusPolicies.length > 0
            ? user.employeeAttendanceBonusPolicies[0].attendanceBonusPolicy
                .attendanceBonusPolicyName
            : '';
        data['Food Allowance Policy'] =
          user.employeeFoodAllowancePolicies.length > 0
            ? user.employeeFoodAllowancePolicies[0].foodAllowancePolicy
                .foodAllowancePolicyName
            : '';
      }
      data['Attendance_Policy'] =
        user.employeeAttendancePolicies.length > 0
          ? user.employeeAttendancePolicies[0].attendancePolicy
              .attendancePolicyName
          : '';
      data['Salary_Policy'] =
        user.employeeSalaryPolicies.length > 0
          ? user.employeeSalaryPolicies[0].salaryPolicy.salaryPolicyName
          : '';
      data['WeekOff_Policy'] =
        user.employeeWeekOffs.length > 0
          ? user.employeeWeekOffs[0].weekoff.weekOffPolicyName
          : '';
      data['Holiday_Policy'] =
        user.employeeHolidayPolicies.length > 0
          ? user.employeeHolidayPolicies[0].HolidayPolicy.holidayPolicyName
          : '';
      data['BiometricSerialNo'] = employeejoining
        ? employeejoining.biometricSerialNo
        : '';
      data['BiometricCode'] = employeejoining
        ? employeejoining.biometricCode
        : '';
      data[`${othernumberLabel}`] = user.otherContactNumber;

      data['Attendance From'] = employeejoining?.attendanceFrom || '';
      data[`Cug Number`] = user.cugNumber;
      data['Offical_MailId'] = user.officalEmail;
      data['Full Month Presence'] =
        employeejoining?.fullMonthPresence == 1 ? 'Yes' : 'No';

      if (assignSalaryPermission) {
        data['Gross_Salary'] = grossSalaryData ? gross_Salary : '';
        data['Salary_Grade'] = grossSalaryData ? grossSalaryData.gradeName : '';
        data['StateForPT'] = grossSalaryData ? grossSalaryData.stateName : '';
        data['Corporation'] = corporation;
        data['SalaryFromYYYYMM'] = grossSalaryData
          ? grossSalaryData.salaryFromYYYYMM
          : '';
      }

      if (showPayrollFrequency) {
        data['Payroll Frequency'] = employeejoining?.payrollFrequency || '';
      }

      if (filter == 1) {
        if (user.userExperiences.length > 0) {
          for (let i = 0; i < user.userExperiences.length; i++) {
            const experience = user.userExperiences[i];
            data[`Experience-${i + 1}`] =
              `designation:${experience.designation} , fromDate:${experience.fromDate} , toDate:${experience.toDate} , organization:${experience.organization} , Role&Respo:${experience.roleRespo}`;
          }
        }

        if (user.userEducations.length > 0) {
          for (let i = 0; i < user.userEducations.length; i++) {
            const education = user.userEducations[i];
            data[`Education-${i + 1}`] =
              `qualification:${education.qualification} , yearOfPassing:${education.yearOfPassing} , grade:${education.grade} , percentageObtained:${education.percentageObtained} , institute:${education.institute} , university:${education.university}`;
          }
        }

        if (user.userFamilies.length > 0) {
          for (let i = 0; i < user.userFamilies.length; i++) {
            const family = user.userFamilies[i];
            data[`Family Member-${i + 1}`] =
              `memberName:${family.memberName} , dob:${family.dob} , gender:${family.gender} , relation:${family.relation} , contact:${family.contact}`;
          }
        }
      }

      finaldata.push(data);
    }

    if (exportData) {
      if (filter == 1) {
        // get All unique keys from array of objects
        const uniqueKeys = new Set();
        finaldata.forEach((obj) => {
          Object.keys(obj).forEach((key) => {
            uniqueKeys.add(key);
          });
        });

        // Convert Set to Array for sorting
        let allKeys = Array.from(uniqueKeys);

        // Define the order of key prefixes
        const keyOrder = ['Education', 'Experience', 'Family Member'];

        //  Sort keys based on the defined order
        allKeys.sort((a, b) => {
          const aPrefix = keyOrder.findIndex((prefix) => a.startsWith(prefix));
          const bPrefix = keyOrder.findIndex((prefix) => b.startsWith(prefix));

          // If both keys have defined prefixes, sort by order in keyOrder
          if (aPrefix !== -1 && bPrefix !== -1) {
            return aPrefix - bPrefix;
          }

          // If only one key has a defined prefix, that key comes first
          if (aPrefix !== -1) return -1;
          if (bPrefix !== -1) return 1;

          // If neither key has a defined prefix, sort alphabetically
          return a.localeCompare(b);
        });

        // Ensure all objects have all unique keys in the sorted order
        finaldata.forEach((obj) => {
          allKeys.forEach((key) => {
            if (!obj.hasOwnProperty(key)) {
              obj[key] = null; // Setting missing keys to null
            }
          });

          // Create a new object to preserve key order
          const orderedObj = {};
          allKeys.forEach((key) => {
            orderedObj[key] = obj[key];
          });

          // Replace original object with ordered object
          Object.assign(obj, orderedObj);
        });
      }
      await generateExcel(finaldata, 'EmployeeData', 'xlsx', res);
      return;
    }

    return res.status(200).json({
      status: 200,
      data: finaldata,
    });
  } catch (error) {
    next(error);
  }
};

const DDMMYYYYFormatDate = (date) => {
  if (!date) return '';
  return String(date).split('-').reverse().join('-');
};

exports.exportUsersAllData = async (req, res, next) => {
  try {
    let {
      companyMasterID,
      status,
      exportData,
      branchMasterID,
      department,
      designation,
      searchQuery,
      divisionId,
      workingAreaId,
      // For Field Name change
      pfNumber,
      pfJoiningDate,
      pfBank,
      pfBankIFSCCode,
      pfBankAccountNumber,
      esicNumber,
      esicJoiningDate,
      esicEndMonth,
      salaryCalculationAct,
      aadharCardNumber,
      nameOnAadhar,
      viewAadhar,
      showBankBranch,
      bankIfscCodeLabel,
      tankhwaPatraNameLabel,
      showUanNumber,
      showpfbankAccountNo,
      showPanCard,
      showpfbankMasterID,
      showpfbankIFSC,
      showesicEndMonth,
      payrollFrequency,
    } = req.body;
    let companyid = companyMasterID;
    let date = asiaKolkataDateTime(new Date()).slice(0, 10);
    let yearmonth = date.slice(0, 4) + date.slice(5, 7);
    const finaldata = [];

    const condition = {};

    if (status) {
      condition.status = status;
    } else {
      condition.status = 1;
    }

    if (companyid) condition.companyMasterId = companyid;

    const joiningCondition = {};

    if (payrollFrequency) joiningCondition.payrollFrequency = payrollFrequency;

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
        {
          '$companyMaster.companyName$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
      ];

    const order = [['firstName', 'ASC']];

    const includedModels = [
      { model: companyMaster },
      {
        required: Boolean(payrollFrequency),
        model: EmployeeJoiningDetails,
        where: joiningCondition,
        include: [
          {
            model: BankMaster,

            attributes: ['bankName'],
          },
          {
            model: BankMaster,
            as: 'employeePFBank',
            attributes: ['bankName'],
          },
          {
            model: Contractor,
            attributes: ['contractorName'],
          },
        ],
      },
    ];

    includedModels.push(
      // Employee Branch
      {
        model: EmployeeBranch,
        where: {
          status: 1,
          ...(branchMasterID && { branchID: branchMasterID }),
          applicableDate: {
            [Sequelize.Op.lte]: new Date(date),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(date),
              },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: branchMasterID ? true : false,
        attributes: ['branchID', 'applicableDate'],
        include: [
          {
            model: BranchMaster,
            as: 'branchMaster',
            attributes: ['branchName'],
          },
        ],
      },

      // Employee Designation
      {
        model: EmployeeDesignation,
        where: {
          status: 1,
          ...(designation && { designationID: designation }),
          applicableDate: {
            [Sequelize.Op.lte]: new Date(date),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(date),
              },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: designation ? true : false,
        attributes: ['designationID', 'applicableDate'],
        include: [
          {
            model: Designation,
            as: 'designation',
            attributes: ['designationName'],
          },
        ],
      },
      // Employee Department
      {
        model: EmployeeDepartment,
        where: {
          status: 1,
          ...(department && { departmentID: department }),
          applicableDate: {
            [Sequelize.Op.lte]: new Date(date),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(date),
              },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: department ? true : false,
        attributes: ['departmentID', 'applicableDate'],
        include: [
          {
            model: Department,
            as: 'department',
            attributes: ['departmentName'],
          },
        ],
      },
      // Division
      {
        model: EmployeeDivision,
        where: {
          status: 1,
          ...(divisionId && { divisionId: divisionId }),
          startDate: { [Sequelize.Op.lte]: new Date(date) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(date) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: divisionId ? true : false,
        attributes: ['divisionId', 'startDate'],
        include: [
          {
            model: Division,
            attributes: ['divisionName'],
          },
        ],
      },

      // Working Area

      {
        model: EmployeeWorkingArea,
        where: {
          status: 1,
          ...(workingAreaId && { workingAreaId: workingAreaId }),
          startDate: { [Sequelize.Op.lte]: new Date(date) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(date) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: workingAreaId ? true : false,
        attributes: ['workingAreaId', 'startDate'],
        include: [
          {
            model: WorkingArea,
            attributes: ['workingAreaName'],
          },
        ],
      },

      // Employee skill category
      {
        required: false,
        model: EmployeeSkillCategory,
        where: {
          applicableYYYYMM: {
            [Sequelize.Op.lte]: +yearmonth,
          },
          [Sequelize.Op.or]: [
            {
              endYYYYMM: {
                [Sequelize.Op.gte]: +yearmonth,
              },
            },
            {
              endYYYYMM: {
                [Sequelize.Op.eq]: null,
              },
            },
          ],
        },
      },

      // Employee project
      {
        required: false,
        model: EmployeeProject,
        where: {
          startDate: {
            [Sequelize.Op.lte]: date,
          },
          [Sequelize.Op.or]: [
            {
              releaseDate: {
                [Sequelize.Op.gte]: date,
              },
            },
            {
              releaseDate: {
                [Sequelize.Op.eq]: null,
              },
            },
          ],
        },
        include: [{ model: Project }],
      },

      // user Address

      {
        model: UserAddress,
        required: false,
        where: {
          status: 1,
          verifyStatus: 1,
        },
        include: [
          {
            model: CityMaster,
            attributes: ['cityName'],
            include: [
              {
                model: StateMaster,
                attributes: ['stateName'],
                include: [
                  { model: CountryMaster, attributes: ['countryName'] },
                ],
              },
            ],
          },
          {
            required: false,
            model: DistrictMaster,
            include: [
              {
                model: StateMaster,
                include: [
                  {
                    model: CountryMaster,
                  },
                ],
              },
            ],
          },
        ],
      },

      // Employee Shift
      {
        model: EmployeeShift,
        where: {
          status: 1,
          startDate: { [Sequelize.Op.lte]: new Date(date) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(date) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: false,
        attributes: ['shiftsID', 'shiftID', 'startDate'],
      },
      // Employee Working Location
      {
        model: EmployeeWorkingLocation,
        where: {
          status: 1,
          startDate: { [Sequelize.Op.lte]: new Date(date) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(date) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: false,
        attributes: ['workingLocationIDs', 'startDate'],
      },

      // Employee Leave Policy
      {
        model: empLeavePolicy,
        where: {
          status: 1,
          applicableDate: { [Sequelize.Op.lte]: new Date(date) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(date) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: false,
        attributes: ['employeeLeavePolicyID'],
      },

      // Employee Short Leave Policy
      {
        model: EmployeeShortLeavePolicy,
        where: {
          status: 1,
          applicableDate: { [Sequelize.Op.lte]: new Date(date) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(date) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: false,
        separate: true,
        attributes: ['shortLeavePolicyID'],
        include: [
          {
            model: ShortLeave,
            attributes: ['shortLeaveName'],
          },
        ],
      },

      // Attendance Policy
      {
        model: EmployeeAttendancePolicy,
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
        attributes: ['attendancePolicyID'],
        include: [
          {
            model: AttendancePolicy,
            as: 'attendancePolicy',
            attributes: ['attendancePolicyName'],
          },
        ],
      },
      // Salary Policy
      {
        model: EmployeeSalaryPolicy,
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
        attributes: ['salaryPolicyID'],
        include: [
          {
            model: SalaryPolicy,
            as: 'salaryPolicy',
            attributes: ['salaryPolicyName'],
          },
        ],
      },
      // Weekoff Policy
      {
        model: EmployeeWeekOff,
        where: {
          status: 1,
          applicableDate: { [Sequelize.Op.lte]: date },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: date } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: false,
        separate: true,
        attributes: ['weekOffPolicyID'],
        include: [
          {
            model: weekOffPolicy,
            as: 'weekoff',
            attributes: ['weekOffPolicyName'],
          },
        ],
      },
      // Holiday Policy
      {
        model: EmployeeHolidayPolicy,
        where: {
          status: 1,
          applicableDate: { [Sequelize.Op.lte]: new Date(date) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(date) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: false,
        separate: true,
        attributes: ['holidayPolicyID'],
        include: [
          {
            model: holidayPolicy,
            as: 'HolidayPolicy',
            attributes: ['holidayPolicyName'],
          },
        ],
      },
      // LC-EG Policy
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
        attributes: ['lateEarlyPolicyMasterID', 'startDate'],
        include: [
          {
            model: LateEarlyPolicy,
            as: 'lateEarlyPolicy',
            attributes: ['lateEarlyPolicyName'],
          },
        ],
      },
      // Employee Attendance Bonus Policy
      {
        model: EmployeeAttendanceBonusPolicy,
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
        attributes: ['attendanceBonusPolicyId'],
        include: [
          {
            model: AttendanceBonusPolicy,
            attributes: ['attendanceBonusPolicyName'],
          },
        ],
      },

      // Employee Food Allowance Policy
      {
        model: EmployeeFoodAllowancePolicy,
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
        attributes: ['foodAllowancePolicyId'],
        include: [
          {
            model: FoodAllowancePolicy,
            attributes: ['foodAllowancePolicyName'],
          },
        ],
      },

      // Experience
      {
        model: UserExperience,
        required: false,
        where: {
          verifyStatus: 1,
          status: 1,
        },
      },

      // Education
      {
        model: UserEducation,
        required: false,
        where: {
          verifyStatus: 1,
          status: 1,
        },
      },

      // Family
      {
        model: userFamily,
        required: false,
        where: {
          verifyStatus: 1,
          status: 1,
        },
      },

      // user Rights
      {
        required: false,
        model: UserRole,
        attributes: ['roleMasterID'],
        include: [{ model: RoleMaster, attributes: ['roleName'] }],
        limit: 1,
      },
      // reports TO

      {
        required: false,
        model: EmployeeReportTo,
        where: {
          status: 1,
        },
        include: [
          {
            model: UserMaster,
            as: 'reportTo',
            attributes: ['displayName', 'userNumber'],
          },
        ],
      },
    );
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const userData = await UserMaster.findAll({
      where: { ...userAccessCondition.where, ...condition },
      order,
      include: [...userAccessCondition.includeModels, ...includedModels],
    });

    if (userData.length == 0) {
      return res.status(statusCodes.OK).json({
        status: 401,
        message: 'User data not found!',
      });
    }

    const allUserIds = userData.map((e) => e.userMasterID);

    const assignSalaryPermission = await checkEmployeePermission(
      req.userDetails?.userMasterId,
      'AssignSalaryStructure',
      'View',
    );

    const queryArray = [
      // allShiftData
      Shift.findAll({
        raw: true,
        where: {
          companyMasterID: companyid,
        },
      }),
      // allWorkingLocationData
      WorkingLocation.findAll({
        raw: true,
        where: {
          companyMasterID: companyid,
        },
      }),
      // allLeavePolicyData
      employeeLeavePolicy.findAll({
        raw: true,
        where: {
          companyMasterId: companyid,
        },
      }),
    ];

    if (assignSalaryPermission) {
      queryArray.push(
        // AllUserSalaryData
        HrSalaryMaster.findAll({
          raw: true,
          where: {
            userMasterID: {
              [Sequelize.Op.in]: allUserIds,
            },
            [Sequelize.Op.and]: Sequelize.literal(`
          ("hrSalaryMaster"."userMasterID", "hrSalaryMaster"."salaryFromYYYYMM") IN (
            SELECT "userMasterID", MAX("salaryFromYYYYMM") AS "maxMonth"
            FROM "hrSalaryMasters"
            WHERE "salaryFromYYYYMM" <= ${yearmonth}
            AND "userMasterID" IN (${allUserIds.join(',')})
            GROUP BY "userMasterID"
          )
        `),
          },
          include: [
            {
              model: GradeSalaryStructure,
              include: [
                { model: GradeStructure, attributes: [] },
                {
                  model: HRSalaryFields,
                  where: {
                    payheadMasterId: {
                      [Sequelize.Op.in]: [1, 50],
                    },
                  },
                  attributes: [],
                },
              ],
              attributes: [],
            },
            { model: StateMaster, required: false, attributes: [] },
            {
              model: Corporation,
              attributes: [],
            },
          ],
          attributes: [
            [
              Sequelize.col(
                'gradeSalaryStructure.hrSalaryField.payheadMasterId',
              ),
              'payheadMasterId',
            ],
            'stateid',
            'EmployeeSalaryAmount',
            'salaryFromYYYYMM',
            'userMasterID',
            'skillCategory',
            'corporationId',
            [Sequelize.col('stateMaster.stateName'), 'stateName'],
            [Sequelize.col('corporation.corporationName'), 'corporationName'],

            [
              Sequelize.col(
                'gradeSalaryStructure.gradeStructure.baseOnCalculation',
              ),
              'baseOnCalculation',
            ],
            [
              Sequelize.col('gradeSalaryStructure.gradeStructure.gradeName'),
              'gradeName',
            ],

            [
              Sequelize.col(
                'gradeSalaryStructure.hrSalaryField.salaryFieldSrNo',
              ),
              'salaryFieldSrNo',
            ],
          ],
        }),
      );
    }

    const [
      allShiftData,
      allWorkingLocationData,
      allLeavePolicyData,
      AllUserSalaryData,
    ] = await Promise.all(queryArray);

    for (const user of userData) {
      let shiftNames = '',
        workingLocation = '',
        leavePolicyName = '';
      if (user.employeeShifts.length > 0) {
        if (user.employeeShifts[0].shiftID) {
          shiftNames = allShiftData
            .filter((e) => e.shiftID == user.employeeShifts[0].shiftID)
            .map((s) => s.shiftName)
            .join(',');
        }

        if (user.employeeShifts[0].shiftsID) {
          shiftNames = allShiftData
            .filter((e) =>
              [...user.employeeShifts[0].shiftsID].includes(
                e.shiftID.toString(),
              ),
            )
            .map((s) => s.shiftName)
            .join(',');
        }
      }

      if (user.employeeWorkingLocations.length > 0) {
        workingLocation = allWorkingLocationData
          .filter((e) =>
            [...user.employeeWorkingLocations[0].workingLocationIDs].includes(
              e.workingLocationID,
            ),
          )
          .map((s) => s.workingLocationName)
          .join(',');
      }

      if (user.empLeavePolicies.length > 0) {
        leavePolicyName = allLeavePolicyData
          .filter((e) =>
            [...user.empLeavePolicies[0].employeeLeavePolicyID].includes(e.id),
          )
          .map((s) => s.leavePolicyName)
          .join(',');
      }

      const userPermanentAddress =
        user.userAddresses && user.userAddresses.length > 0
          ? user.userAddresses.find((e) => e.addressType == 'permanent')
          : null;
      const UserTempAddress =
        user.userAddresses && user.userAddresses.length > 0
          ? user.userAddresses.find((e) => e.addressType == 'temporary')
          : null;

      let user_permanentAddress = '';
      if (userPermanentAddress) {
        user_permanentAddress = ToformatAddress(userPermanentAddress);
      }

      let user_tempAddress = '';
      if (UserTempAddress) {
        user_tempAddress = ToformatAddress(UserTempAddress);
      }

      const employeejoining =
        user.employeeJoiningDetails && user.employeeJoiningDetails.length > 0
          ? user.employeeJoiningDetails[0]
          : null;

      const grossSalaryData =
        AllUserSalaryData?.find(
          (e) => e.userMasterID == user.userMasterID && e.payheadMasterId == 50,
        ) || null;

      const skillCategory_MinWages = grossSalaryData?.skillCategory || null;
      const corporation = grossSalaryData?.corporationName || null;

      const gross_Salary = grossSalaryData?.EmployeeSalaryAmount || 0;

      const ctc_Salary =
        AllUserSalaryData?.find(
          (e) => e.userMasterID == user.userMasterID && e.payheadMasterId == 1,
        )?.EmployeeSalaryAmount || 0;

      const employeeReportsTo =
        user.employeeReportTos && user.employeeReportTos.length > 0
          ? user.employeeReportTos
              .map((e) =>
                e.reportTo
                  ? `${e.reportTo.displayName} - ${e.reportTo.userNumber}`
                  : null,
              )
              .join(',')
          : null;

      const projectNames =
        (user.employeeProjects || [])
          .map((e) => e.project?.projectName)
          .join(',') || '';

      const workertTypeList = saveraCompanyIDs.includes(+companyMasterID)
        ? listSaveraWorkerType
        : listWorkerTypes;

      const data = {};
      data['Status'] = user.status == 1 ? 'Active' : 'DeActive';
      data['Employee_Code'] = employeejoining
        ? employeejoining.employeeCode
        : '';
      data['First_Name'] = user.firstName;
      data['Middle_Name'] = user.middleName;
      data['Last_Name'] = user.lastName;
      data['Mobileno'] = user.userNumber;
      data[`${othernumberLabel}`] = user.otherContactNumber;
      data[`Cug Number`] = user.cugNumber;
      data['Email_Id'] = user.email;
      data['Offical_MailId'] = user.officalEmail;
      data['Gender'] = user.gender;
      data['Marital_Status'] = user.maratialStatus;
      data['BirthDate'] = employeejoining
        ? DDMMYYYYFormatDate(employeejoining.dob)
        : '';
      data['BloodGroup'] = employeejoining ? employeejoining.bloodgroup : '';
      data['PayrollFrequency'] = employeejoining
        ? employeejoining.payrollFrequency
        : '';
      data['Nationality'] = employeejoining ? employeejoining.nationality : '';
      data['BiometricSerialNo'] = employeejoining
        ? employeejoining.biometricSerialNo
        : '';
      data['BiometricCode'] = employeejoining
        ? employeejoining.biometricCode
        : '';
      data['Employee Skill Category'] =
        user.employeeSkillCategories?.[0]?.skillCategory
          ?.toString()
          .toUpperCase() || '';

      data['Department'] =
        user.employeeDepartments.length > 0
          ? user.employeeDepartments[0].department?.departmentName
          : '';
      data['Department Applicable Date'] =
        user.employeeDepartments.length > 0
          ? DDMMYYYYFormatDate(user.employeeDepartments[0].applicableDate)
          : '';
      data['Designation'] =
        user.employeeDesignations.length > 0
          ? user.employeeDesignations[0].designation?.designationName
          : '';
      data['Designation Applicable Date'] =
        user.employeeDesignations.length > 0
          ? DDMMYYYYFormatDate(user.employeeDesignations[0].applicableDate)
          : '';
      data['Branch'] =
        user.employeeBranches.length > 0
          ? user.employeeBranches[0].branchMaster?.branchName
          : '';
      data['Branch Applicable Date'] =
        user.employeeBranches.length > 0
          ? DDMMYYYYFormatDate(user.employeeBranches[0].applicableDate)
          : '';
      data['Division'] =
        user.employeeDivisions.length > 0
          ? user.employeeDivisions[0].division?.divisionName
          : '';
      data['Division Applicable Date'] =
        user.employeeDivisions.length > 0
          ? DDMMYYYYFormatDate(user.employeeDivisions[0].startDate)
          : '';
      data['Working Area'] =
        user.employeeWorkingAreas.length > 0
          ? user.employeeWorkingAreas[0].workingArea?.workingAreaName
          : '';
      data['Working Area Applicable Date'] =
        user.employeeWorkingAreas.length > 0
          ? DDMMYYYYFormatDate(user.employeeWorkingAreas[0].startDate)
          : '';
      data['Local_Address'] = user_tempAddress;
      data['Permanent_Address'] = user_permanentAddress;
      data['JoinDate'] = employeejoining
        ? DDMMYYYYFormatDate(employeejoining.joiningDate)
        : '';
      data['LeftDate'] = employeejoining
        ? DDMMYYYYFormatDate(employeejoining.leavingDate)
        : '';
      data['Physical_Handicap'] = user.physicalDisability;
      data[`${salaryCalculationAct}`] = employeejoining
        ? employeejoining.salaryCalculationAct
        : '';
      data['Bank'] =
        employeejoining && employeejoining.bankMaster
          ? employeejoining.bankMaster.bankName
          : '';
      data['NameAsBank'] = employeejoining ? employeejoining.nameAsBank : '';
      data['AccountNo'] = employeejoining ? employeejoining.bankAccountNo : '';
      data[`${bankIfscCodeLabel}`] = employeejoining
        ? employeejoining.bankIFSC
        : '';
      data['BankDetails Status'] = employeejoining
        ? BankDetailsStatusEnum[`${employeejoining.bankAccountStatus}`]
        : '';
      if (showPanCard) {
        data['PANNo'] = employeejoining ? employeejoining.pancard : '';
      }

      data[`${aadharCardNumber}`] = employeejoining
        ? employeejoining.adharCard
        : '';
      data[`${nameOnAadhar}`] = employeejoining
        ? employeejoining.adharName
        : '';

      data[`${pfNumber}`] = employeejoining ? employeejoining.pfNumber : '';
      if (showUanNumber) {
        data['UANNo'] = employeejoining ? employeejoining.uanNumber : '';
      }
      data[`${pfJoiningDate}`] = employeejoining
        ? DDMMYYYYFormatDate(employeejoining.pfjoiningDate)
        : '';
      data[`${esicNumber}`] = employeejoining ? employeejoining.esicNumber : '';
      data[`${esicJoiningDate}`] = employeejoining
        ? DDMMYYYYFormatDate(employeejoining.esicjoiningDate)
        : '';
      if (showpfbankMasterID) {
        data[`${pfBank}`] =
          employeejoining && employeejoining.employeePFBank
            ? employeejoining.employeePFBank.bankName
            : '';
      }
      if (showpfbankIFSC) {
        data[`${pfBankIFSCCode}`] = employeejoining
          ? employeejoining.pfbankIFSC
          : '';
      }
      if (showpfbankAccountNo) {
        data[`${pfBankAccountNumber}`] = employeejoining
          ? employeejoining.pfbankAccountNo
          : '';
      }

      data['Worker Type'] = employeejoining?.salarytype
        ? workertTypeList.find((e) => e.value == employeejoining?.salarytype)
            ?.key || ''
        : '';
      data['Employee_Employment'] = employeejoining
        ? employeejoining.employment
        : '';
      data['Employment Applicable Date'] = employeejoining
        ? DDMMYYYYFormatDate(employeejoining.applicableDate)
        : '';
      data['Employment End Date'] = employeejoining
        ? DDMMYYYYFormatDate(employeejoining.endDate)
        : '';
      data['Overtime'] = employeejoining
        ? employeejoining.overtime == 1
          ? 'YES'
          : employeejoining.overtime == 0
            ? 'NO'
            : ''
        : '';
      data['Notice Period(in days)'] = employeejoining
        ? employeejoining.noticePeriod
        : '';

      data['SHIFT'] = shiftNames;
      data['Working Location'] = workingLocation;
      data['Contractor'] = employeejoining?.contractor?.contractorName || '';
      data['Project'] = projectNames || '';
      data['Leave Policy'] = leavePolicyName;
      data['Short Leave Policy'] =
        user.employeeShortLeavePolicies?.[0]?.shortLeave?.shortLeaveName || '';
      data['LC-EG Policy'] =
        user.employeeLateEarlyPolicies.length > 0
          ? user.employeeLateEarlyPolicies[0].lateEarlyPolicy
              .lateEarlyPolicyName
          : '';
      data['Attendance Bonus Policy'] =
        user.employeeAttendanceBonusPolicies.length > 0
          ? user.employeeAttendanceBonusPolicies[0].attendanceBonusPolicy
              .attendanceBonusPolicyName
          : '';
      data['Food Allowance Policy'] =
        user.employeeFoodAllowancePolicies.length > 0
          ? user.employeeFoodAllowancePolicies[0].foodAllowancePolicy
              .foodAllowancePolicyName
          : '';
      data['Attendance_Policy'] =
        user.employeeAttendancePolicies.length > 0
          ? user.employeeAttendancePolicies[0].attendancePolicy
              .attendancePolicyName
          : '';
      data['Salary_Policy'] =
        user.employeeSalaryPolicies.length > 0
          ? user.employeeSalaryPolicies[0].salaryPolicy.salaryPolicyName
          : '';
      data['WeekOff_Policy'] =
        user.employeeWeekOffs.length > 0
          ? user.employeeWeekOffs[0].weekoff.weekOffPolicyName
          : '';
      data['Holiday_Policy'] =
        user.employeeHolidayPolicies.length > 0
          ? user.employeeHolidayPolicies[0].HolidayPolicy.holidayPolicyName
          : '';
      data['Employee Reports To'] = employeeReportsTo;

      if (assignSalaryPermission) {
        data['Gross_Salary'] = grossSalaryData ? gross_Salary : '';
        data['CTC Salary'] = ctc_Salary || '';
        data['Salary_Grade'] = grossSalaryData ? grossSalaryData.gradeName : '';
        data['StateForPT'] = grossSalaryData ? grossSalaryData.stateName : '';
        data['Corporation'] = corporation;
        data['SkillCategory(Minimum Wages)'] = skillCategory_MinWages;
        data['SalaryFromYYYYMM'] = grossSalaryData
          ? grossSalaryData.salaryFromYYYYMM
          : '';
      }

      data['Role'] =
        user.userRoles.length > 0 && user.userRoles[0].roleMaster
          ? user.userRoles[0].roleMaster.roleName
          : '';

      data['Full Month Presence'] =
        employeejoining?.fullMonthPresence == 1 ? 'Yes' : 'No';

      if (user.userExperiences.length > 0) {
        for (let i = 0; i < user.userExperiences.length; i++) {
          const experience = user.userExperiences[i];
          data[`Experience-${i + 1}`] =
            `designation:${experience.designation} , fromDate:${experience.fromDate} , toDate:${experience.toDate} , organization:${experience.organization} , Role&Respo:${experience.roleRespo}`;
        }
      }

      if (user.userEducations.length > 0) {
        for (let i = 0; i < user.userEducations.length; i++) {
          const education = user.userEducations[i];
          data[`Education-${i + 1}`] =
            `qualification:${education.qualification} , yearOfPassing:${education.yearOfPassing} , grade:${education.grade} , percentageObtained:${education.percentageObtained} , institute:${education.institute} , university:${education.university}`;
        }
      }

      if (user.userFamilies.length > 0) {
        for (let i = 0; i < user.userFamilies.length; i++) {
          const family = user.userFamilies[i];
          data[`Family Member-${i + 1}`] =
            `memberName:${family.memberName} , dob:${family.dob} , gender:${family.gender} , relation:${family.relation} , contact:${family.contact}`;
        }
      }
      if (status == 0 || (Array.isArray(status) && status.includes(0))) {
        data['Deactive Date'] = user.deactiveDate
          ? DDMMYYYYFormatDate(user.deactiveDate)
          : '';
        data['Deactive Remarks'] = user.deactiveRemarks || '';
      }
      finaldata.push(data);
    }

    if (exportData) {
      // get All unique keys from array of objects
      const uniqueKeys = new Set();
      finaldata.forEach((obj) => {
        Object.keys(obj).forEach((key) => {
          uniqueKeys.add(key);
        });
      });

      // Convert Set to Array for sorting
      let allKeys = Array.from(uniqueKeys);

      // Define the order of key prefixes
      const keyOrder = ['Education', 'Experience', 'Family Member'];

      //  Sort keys based on the defined order
      allKeys.sort((a, b) => {
        const aPrefix = keyOrder.findIndex((prefix) => a.startsWith(prefix));
        const bPrefix = keyOrder.findIndex((prefix) => b.startsWith(prefix));

        // If both keys have defined prefixes, sort by order in keyOrder
        if (aPrefix !== -1 && bPrefix !== -1) {
          return aPrefix - bPrefix;
        }

        // If only one key has a defined prefix, that key comes first
        if (aPrefix !== -1) return -1;
        if (bPrefix !== -1) return 1;

        // If neither key has a defined prefix, sort alphabetically
        return a.localeCompare(b);
      });

      // Ensure all objects have all unique keys in the sorted order
      finaldata.forEach((obj) => {
        allKeys.forEach((key) => {
          if (!obj.hasOwnProperty(key)) {
            obj[key] = null; // Setting missing keys to null
          }
        });

        // Create a new object to preserve key order
        const orderedObj = {};
        allKeys.forEach((key) => {
          orderedObj[key] = obj[key];
        });

        // Replace original object with ordered object
        Object.assign(obj, orderedObj);
      });

      await generateExcel(finaldata, 'EmployeeData', 'xlsx', res);
      return;
    }

    return res.status(200).json({
      status: 200,
      data: userData,
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserbyBranchDepartmentDesgination = async (req, res, next) => {
  try {
    let { companyMasterID, branchMasterID, departmentID, designationID } =
      req.body;
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    if (!companyMasterID) {
      return res
        .status(200)
        .json({ status: 401, message: 'Company is required' });
    }
    const userData = await UserMaster.findAll({
      where: {
        status: 1,
        companyMasterId: companyMasterID,
      },
      attributes: [...userAttributes, 'facePhotoArray', 'userFaces'],
      order: [['displayName', 'ASC']],
      include: [
        {
          // required: true,
          model: EmployeeJoiningDetails,
          attributes: ['employeeCode'],
        },
        {
          required: departmentID && departmentID.length ? true : false,
          model: EmployeeDepartment,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: filterDate },
            ...(departmentID &&
              departmentID.length && { departmentID: departmentID }),
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: filterDate } },
              { endDate: { [Sequelize.Op.is]: null } },
            ],
          },
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
          required: branchMasterID && branchMasterID.length ? true : false,
          model: EmployeeBranch,
          where: {
            status: 1,
            ...(branchMasterID &&
              branchMasterID.length && { branchID: branchMasterID }),
            applicableDate: { [Sequelize.Op.lte]: filterDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: filterDate } },
              { endDate: { [Sequelize.Op.is]: null } },
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
          required: designationID && designationID.length ? true : false,
          model: EmployeeDesignation,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: filterDate },
            ...(designationID &&
              designationID.length && { designationID: designationID }),
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: filterDate } },
              { endDate: { [Sequelize.Op.is]: null } },
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
      data: userData,
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllUsers = async (req, res, next) => {
  try {
    const {
      limit,
      page,
      searchQuery,
      startdate,
      enddate,
      status,
      userMasterID,
      companyMasterID,
      departmentID,
      designationID,
      divisionId,
      workingAreaId,
      workingLocationID,
      lateEarlyPolicyMasterID,
      attendancePolicyID,
      weekOffPolicyID,
      holidayPolicyID,
      salaryPolicyID,
      workingLocationStartDate,
      workingLocationEndDate,
      branchStartDate,
      branchEndDate,
      departmentStartDate,
      departmentEndDate,
      designationStartDate,
      designationEndDate,
      employeeStartDate,
      employeeEndDate,
      attendanceStatus,
      isPhotoLock,
      exportData,
      gender,
      repoteeUserMasterID,
      contractorId,
      projectID,
      salarytype,
      skillCategory,
      employmentType,
      employmentDate,
      employeeType,
      payrollFrequency,
      employment,
      empEmployeementType,
      sortField = orderByEmployeeMasterFields.EMPLOYEENAME,
    } = await req.body;
    let { branchMasterID } = req.body;

    // const filterDate = moment().format('YYYY-MM-DD');
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    //Pagination
    const paginationQuery =
      !exportData && page && limit ? { offset: (page - 1) * limit, limit } : {};
    //Order
    let order = [['displayName', 'ASC']];
    if (sortField == orderByEmployeeMasterFields.EMPLOYEECODE) {
      const employeeCodeSubquery = `
      (
        SELECT ejd."employeeCode"
        FROM "employeeJoiningDetails" ejd
        WHERE ejd."userMasterID" = "userMaster"."userMasterID"
        LIMIT 1
      )
      `;

      order = [
        // 0. NULL / empty FIRST
        [
          Sequelize.literal(`
              CASE 
                WHEN ${employeeCodeSubquery} IS NULL 
                     OR ${employeeCodeSubquery} = '' 
                THEN 0 
                ELSE 1 
              END
            `),
          'ASC',
        ],

        // 1. Pure numbers first
        [
          Sequelize.literal(`
              CASE 
                WHEN ${employeeCodeSubquery} ~ '^[0-9]+$' 
                THEN 0 
                ELSE 1 
              END
            `),
          'ASC',
        ],

        // 2. Numeric sort
        [
          Sequelize.literal(`
              CASE 
                WHEN ${employeeCodeSubquery} ~ '^[0-9]+$' 
                THEN (${employeeCodeSubquery})::int 
              END
            `),
          'ASC',
        ],

        // 3. Prefix (alphabet part)
        [
          Sequelize.literal(`
              substring(${employeeCodeSubquery} FROM '^[^0-9]+')
            `),
          'ASC',
        ],

        // 4. Numeric part (natural sort)
        [
          Sequelize.literal(`
              CASE 
                WHEN ${employeeCodeSubquery} ~ '[0-9]+' 
                THEN substring(${employeeCodeSubquery} FROM '[0-9]+')::int 
              END
            `),
          'ASC',
        ],

        // 5. Final fallback
        [Sequelize.literal(`${employeeCodeSubquery}`), 'ASC'],

        ['displayName', 'ASC'],
      ];
    } else if (sortField == orderByEmployeeMasterFields.CREATEDAT) {
      order = [['createdAt', 'DESC']];
    }
    const empEmployeementCondition =
      empEmployeementType == employeementTypeEnum.ON_PAYROLL
        ? { contractorId: { [Sequelize.Op.is]: null } }
        : empEmployeementType == employeementTypeEnum.ON_CONTRACT
          ? { contractorId: { [Sequelize.Op.ne]: null } }
          : {};

    const contractorCondition = {
      ...(contractorId &&
        (!Array.isArray(contractorId) || contractorId.length) && {
          contractorId,
        }),
    };

    // merge both conditions
    const empJoiningCondition = {
      ...empEmployeementCondition,
      ...contractorCondition,
    };

    if (salarytype) empJoiningCondition.salarytype = salarytype;
    if (employeeType) empJoiningCondition.employeeType = employeeType;
    if (payrollFrequency)
      empJoiningCondition.payrollFrequency = payrollFrequency;

    if (employment) empJoiningCondition.employment = employment;

    const includedModels = [
      {
        required: false,
        model: UserRole,
        attributes: ['roleMasterID'],
        include: [{ model: RoleMaster, attributes: ['roleName'] }],
      },
      { model: companyMaster },
      {
        model: EmployeeJoiningDetails,
        where: empJoiningCondition,
        required:
          Boolean(contractorId) ||
          Boolean(salarytype) ||
          Boolean(employmentType) ||
          Boolean(employeeType) ||
          Boolean(payrollFrequency) ||
          Boolean(empEmployeementType),
      },
      {
        model: UserMaster,
        as: 'createdBy',
        attributes: ['displayName'],
        required: false,
      },
      {
        model: UserMaster,
        as: 'updatedBy',
        attributes: ['displayName'],
        required: false,
      },
      {
        model: EmployeeDesignation,
        where: {
          status: 1,
          ...(designationID &&
            (!Array.isArray(designationID) || designationID.length) && {
              designationID,
            }),
          applicableDate: {
            [Sequelize.Op.lte]: new Date(
              designationStartDate ? designationStartDate : filterDate,
            ),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(
                  designationEndDate ? designationEndDate : filterDate,
                ),
              },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: designationID ? true : false,
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
        model: EmployeeDepartment,
        where: {
          status: 1,
          ...(departmentID &&
            (!Array.isArray(departmentID) || departmentID.length) && {
              departmentID,
            }),
          applicableDate: {
            [Sequelize.Op.lte]: new Date(
              departmentStartDate ? departmentStartDate : filterDate,
            ),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(
                  departmentEndDate ? departmentEndDate : filterDate,
                ),
              },
            },
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
        // separate:
        //   !branchMasterID ||
        //   (Array.isArray(branchMasterID) && !branchMasterID.length)
        //     ? true
        //     : false,
        where: {
          status: 1,
          ...(branchMasterID &&
            (!Array.isArray(branchMasterID) || branchMasterID.length) && {
              branchID: branchMasterID,
            }),
          applicableDate: {
            [Sequelize.Op.lte]: new Date(
              branchStartDate ? branchStartDate : filterDate,
            ),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(
                  branchEndDate ? branchEndDate : filterDate,
                ),
              },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: branchMasterID ? true : false,
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
        model: EmployeeWorkingLocation,
        where: {
          status: 1,
          workingLocationIDs: {
            [Sequelize.Op.contains]: [workingLocationID],
          },
          // ...(workingLocationID &&
          //   (!Array.isArray(workingLocationID) || workingLocationID.length) && {
          //     branchID: workingLocationID,
          //   }),
          startDate: {
            [Sequelize.Op.lte]: new Date(
              workingLocationStartDate ? workingLocationStartDate : filterDate,
            ),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(
                  workingLocationEndDate ? workingLocationEndDate : filterDate,
                ),
              },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: workingLocationID ? true : false,
        // attributes: ['workingLocationIDs'],
        // include: [
        //   {
        //     model: WorkingLocation,
        //     attributes: ['workingLocationName'],
        //   },
        // ],
      },
      {
        model: PIP,
        attributes: ['userMasterID'],
        as: 'employees',
        required: false,
        where: {
          startDate: {
            [Sequelize.Op.lte]: filterDate,
          },
          endDate: {
            [Sequelize.Op.gte]: filterDate,
          },
          authorizationStatus: 3,
        },
      },
    ];

    const finalEmployeementType =
      !employmentType ||
      (employmentType &&
        Array.isArray(employmentType) &&
        employmentType.length == 0)
        ? null
        : employmentType;

    if (finalEmployeementType) {
      includedModels.push({
        model: EmployeeEmployeement,
        where: {
          status: 1,
          ...(finalEmployeementType &&
            (!Array.isArray(finalEmployeementType) ||
              finalEmployeementType.length) && {
              employeement: finalEmployeementType,
            }),
          applicableDate: {
            [Sequelize.Op.lte]: employmentDate ? employmentDate : filterDate,
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: employmentDate
                  ? employmentDate
                  : filterDate,
              },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: finalEmployeementType ? true : false,
        attributes: ['employeement'],
      });
    }

    if (attendanceStatus) {
      includedModels.push({
        model: attendanceTransaction,
        where: {
          AttendanceDate: filterDate,
        },
        required: false,
        attributes: [
          'AttendanceDate',
          'InDatetime',
          'OutDateTime',
          'fulldayhalfday',
        ],
      });
    }
    if (divisionId) {
      includedModels.push({
        model: EmployeeDivision,
        where: {
          status: 1,
          ...(divisionId && { divisionId }),
          startDate: { [Sequelize.Op.lte]: new Date(filterDate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: true,
        attributes: ['divisionId'],
        include: [
          {
            model: Division,
            attributes: ['divisionName'],
          },
        ],
      });
    }
    if (workingAreaId) {
      includedModels.push({
        model: EmployeeWorkingArea,
        where: {
          status: 1,
          ...(workingAreaId && { workingAreaId }),
          startDate: { [Sequelize.Op.lte]: new Date(filterDate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: true,
        attributes: ['workingAreaId'],
        include: [
          {
            model: WorkingArea,
            attributes: ['workingAreaName'],
          },
        ],
      });
    }
    if (lateEarlyPolicyMasterID) {
      includedModels.push({
        model: EmployeeLateEarlyPolicy,
        where: {
          status: 1,
          ...(lateEarlyPolicyMasterID && { lateEarlyPolicyMasterID }),
          startDate: { [Sequelize.Op.lte]: new Date(filterDate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: true,
        attributes: ['lateEarlyPolicyMasterID'],
        include: [
          {
            model: LateEarlyPolicy,
            as: 'lateEarlyPolicy',
            attributes: ['lateEarlyPolicyName'],
          },
        ],
      });
    }
    if (attendancePolicyID) {
      includedModels.push({
        model: EmployeeAttendancePolicy,
        where: {
          status: 1,
          ...(attendancePolicyID && { attendancePolicyID }),
          startDate: { [Sequelize.Op.lte]: new Date(filterDate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: true,
        attributes: ['attendancePolicyID'],
        include: [
          {
            model: AttendancePolicy,
            as: 'attendancePolicy',
            attributes: ['attendancePolicyName'],
          },
        ],
      });
    }
    if (weekOffPolicyID) {
      includedModels.push({
        model: EmployeeWeekOff,
        where: {
          status: 1,
          ...(weekOffPolicyID && { weekOffPolicyID }),
          applicableDate: { [Sequelize.Op.lte]: filterDate },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: filterDate } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: true,
        attributes: ['weekOffPolicyID'],
        include: [
          {
            model: weekOffPolicy,
            as: 'weekoff',
            attributes: ['weekOffPolicyName'],
          },
        ],
      });
    }
    if (holidayPolicyID) {
      includedModels.push({
        model: EmployeeHolidayPolicy,
        where: {
          status: 1,
          ...(holidayPolicyID && { holidayPolicyID }),
          applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: true,
        attributes: ['holidayPolicyID'],
        include: [
          {
            model: holidayPolicy,
            as: 'HolidayPolicy',
            attributes: ['holidayPolicyName'],
          },
        ],
      });
    }
    if (salaryPolicyID) {
      includedModels.push({
        model: EmployeeSalarypolicy,
        where: {
          status: 1,
          ...(salaryPolicyID && { salaryPolicyID }),
          startDate: { [Sequelize.Op.lte]: new Date(filterDate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: true,
        attributes: ['salaryPolicyID'],
        include: [
          {
            model: SalaryPolicy,
            as: 'salaryPolicy',
            attributes: ['salaryPolicyName'],
          },
        ],
      });
    }
    if (repoteeUserMasterID) {
      includedModels.push({
        required: true,
        model: EmployeeReportTo,
        where: {
          status: 1,
          reportToID: repoteeUserMasterID,
        },
        attributes: ['employeeReportToID', 'userMasterID', 'reportToID'],
        include: [
          {
            model: UserMaster,
            required: true,
            as: 'employee',
            attributes: [
              'userMasterID',
              'firstName',
              'lastName',
              'displayName',
              'userNumber',
              'photo',
            ],
          },
        ],
      });
    }

    if (projectID) {
      includedModels.push({
        required: projectID ? true : false,
        model: EmployeeProject,
        where: {
          status: 1,
          projectID,
          startDate: { [Sequelize.Op.lte]: new Date(filterDate) },
          [Sequelize.Op.or]: [
            { releaseDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
            { releaseDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        include: [
          {
            model: Project,
          },
        ],
      });
    }

    const YYYYMM = filterDate.slice(0, 7).replace('-', '');

    const skillCategoryCondition = {};
    if (skillCategory) {
      skillCategoryCondition.skillCategory = skillCategory;
      ((skillCategoryCondition.applicableYYYYMM = {
        [Sequelize.Op.lte]: +YYYYMM,
      }),
        (skillCategoryCondition[Sequelize.Op.or] = [
          { endYYYYMM: { [Sequelize.Op.gte]: +YYYYMM } },
          { endYYYYMM: { [Sequelize.Op.eq]: null } },
        ]));

      includedModels.push({
        model: EmployeeSkillCategory,
        where: skillCategoryCondition,
        required: skillCategory ? true : false,
      });
    }

    //Conditions
    const condition = {};
    if (
      companyMasterID &&
      (!Array.isArray(companyMasterID) || companyMasterID.length)
    )
      condition.companyMasterId = companyMasterID;

    condition.status = status ? status : 1;

    if (userMasterID && (!Array.isArray(userMasterID) || userMasterID.length))
      condition.userMasterID = userMasterID;

    if (employeeStartDate && employeeEndDate) {
      condition['$employeeJoiningDetails.joiningDate$'] = {
        [Sequelize.Op.lte]: new Date(employeeEndDate),
      };
      condition[Sequelize.Op.or] = [
        {
          '$employeeJoiningDetails.leavingDate$': {
            [Sequelize.Op.gte]: new Date(employeeStartDate),
          },
        },
        {
          '$employeeJoiningDetails.leavingDate$': { [Sequelize.Op.eq]: null },
          [Sequelize.Op.or]: [
            {
              deactiveDate: {
                [Sequelize.Op.gte]: new Date(employeeStartDate),
              },
            },
            {
              deactiveDate: { [Sequelize.Op.eq]: null },
            },
          ],
        },
      ];
    }

    if (startdate && enddate)
      condition.createdAt = {
        [Sequelize.Op.between]: [new Date(startdate), new Date(enddate)],
      };

    if (searchQuery) {
      const terms = searchQuery.trim().split(/\s+/);
      condition[Sequelize.Op.or] = [
        {
          [Sequelize.Op.and]: terms.map((term) => ({
            displayName: {
              [Sequelize.Op.iLike]: `%${term}%`,
            },
          })),
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
        {
          '$companyMaster.companyName$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
      ];
    }

    if (isPhotoLock) condition.isPhotoLock = isPhotoLock;
    if (gender) {
      condition.gender = gender;
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });

    //Query
    const AllUser = await UserMaster.findAndCountAll({
      where: { ...userAccessCondition.where, ...condition },
      ...paginationQuery,
      order,
      include: [...userAccessCondition.includeModels, ...includedModels],
      subQuery: false,
      attributes: [
        [
          Sequelize.literal(`
          "userMaster"."displayName" || 
          CASE 
            WHEN "employeeJoiningDetails"."employeeCode" IS NOT NULL AND "employeeJoiningDetails"."employeeCode" != '' THEN ' ( ' || "employeeJoiningDetails"."employeeCode" || ' )'
            ELSE ''
          END
        `),
          'displayName',
        ],
        [
          Sequelize.literal(`
          "userMaster"."displayName" || 
          CASE 
            WHEN "employeeJoiningDetails"."employeeCode" IS NOT NULL AND "employeeJoiningDetails"."employeeCode" != '' THEN ' ( ' || "employeeJoiningDetails"."employeeCode" || ' )'
            ELSE ''
          END || ' - ' || "userMaster"."userNumber"
        `),
          'displayNameWithNumber',
        ],
        'userMasterID',
        'firstName',
        'middleName',
        'lastName',
        'userNumber',
        'photo',
        'companyMasterId',
        'gender',
        'dob',
        'maratialStatus',
        'physicalDisability',
        'isonBoarding',
        'admin',
        'email',
        'firebaseToken',
        'uniqueID',
        'passwordToken',
        'isPhotoLock',
        'createBy',
        'updateBy',
        'createByIp',
        'updateByIp',
        'facePhoto',
        'facePhotoArray',
        'deactiveDate',
        'resetpassword',
        'deviceType',
        'userFaces',
        'otherContactNumber',
        'status',
        'cugNumber',
        'officalEmail',
        'createdAt',
      ],
    });

    if (exportData) {
      const finaldata = AllUser.rows.map((e) => {
        return {
          EmployeeCode:
            e.employeeJoiningDetails && e.employeeJoiningDetails.length > 0
              ? e.employeeJoiningDetails[0].employeeCode
              : '',
          Name: e.displayName,
          userNumber: e.userNumber,
          Branch:
            e.employeeBranches && e.employeeBranches.length > 0
              ? e.employeeBranches[0].branchMaster
                ? e.employeeBranches[0].branchMaster.branchName
                : ''
              : '',
          Department:
            e.employeeDepartments && e.employeeDepartments.length > 0
              ? e.employeeDepartments[0].department
                ? e.employeeDepartments[0].department.departmentName
                : ''
              : '',
          Designation:
            e.employeeDesignations && e.employeeDesignations.length > 0
              ? e.employeeDesignations[0].designation
                ? e.employeeDesignations[0].designation.designationName
                : ''
              : '',
          Employment:
            e.employeeJoiningDetails && e.employeeJoiningDetails.length > 0
              ? e.employeeJoiningDetails[0].employment
              : ' ',
          InDatetime:
            e.attendanceTransactions &&
            e.attendanceTransactions.length > 0 &&
            e.attendanceTransactions[0].InDatetime
              ? new Date(
                  e.attendanceTransactions[0].InDatetime,
                ).toLocaleString()
              : '',
          OutDateTime:
            e.attendanceTransactions &&
            e.attendanceTransactions.length > 0 &&
            e.attendanceTransactions[0].OutDateTime
              ? new Date(
                  e.attendanceTransactions[0].OutDateTime,
                ).toLocaleString()
              : '',
          Status:
            e.attendanceTransactions &&
            e.attendanceTransactions.length > 0 &&
            e.attendanceTransactions[0].fulldayhalfday
              ? e.attendanceTransactions[0].fulldayhalfday == 1
                ? 'Present'
                : e.attendanceTransactions[0].fulldayhalfday == 0.5
                  ? 'Half Day'
                  : ''
              : '',
        };
      });

      return await generateExcel(finaldata, 'EmployeeList', 'xlsx', res);
    }

    return res.status(200).json({
      status: 200,
      data: AllUser.rows,
      totalcount: AllUser.count,
    });
  } catch (err) {
    next(err);
  }
};

exports.postUpdatePhotoLockStatus = async (req, res, next) => {
  try {
    const { userMasterID, isPhotoLock } = req.body;

    await UserMaster.update(
      { isPhotoLock: isPhotoLock },
      {
        where: {
          userMasterID: {
            [Sequelize.Op.in]: userMasterID,
          },
        },
      },
    );

    return res.status(200).json({
      status: 200,
      message:
        isPhotoLock == '1'
          ? 'Photo locked Successfully!'
          : 'Photo Unlocked Successfully!',
    });
  } catch (err) {
    next(err);
  }
};

exports.getalldiler = async (req, res, next) => {
  try {
    let { limit, page, searchQuery, userType, status } = await req.body;

    const paginationQuery =
      page && limit
        ? {
            limit,
            offset: (page - 1) * limit,
          }
        : {};

    const condition = {
      admin: userType,
      status: [0, 1],
    };

    if (status) {
      condition.status = status;
    }

    if (searchQuery) {
      condition[Sequelize.Op.or] = [
        {
          displayName: { [Sequelize.Op.iLike]: '%' + searchQuery + '%' },
        },
      ];
    }

    const userData = await UserMaster.findAndCountAll({
      raw: true,
      ...paginationQuery,
      where: condition,
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.companycontactget,
      data: userData.rows,
      totalcount: userData.count,
    });
  } catch (err) {
    next(err);
  }
};

exports.getProfilePercentage = async (req, res, next) => {
  try {
    const { limit, page, users, companyMasterID, exportData, userMasterID } =
      req.body;

    const condition = { status: 1 };

    if (users && users.length > 0) {
      condition.userMasterID = users;
    }
    const companyCondition = {};
    if (companyMasterID) {
      companyCondition.companyMasterID = companyMasterID;
    }
    const paginationQuery = !exportData
      ? page && limit
        ? { offset: (page - 1) * limit, limit }
        : {}
      : {};

    let date = asiaKolkataDateTime(new Date()).slice(0, 10);

    let month = date.slice(0, 4).concat(date.slice(5, 7));
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const { rows: user, count } = await UserMaster.findAndCountAll({
      distinct: true,
      where: { ...userAccessCondition.where, ...condition },
      include: [
        ...userAccessCondition.includeModels,
        {
          model: companyMaster,
          attributes: ['companyName'],
          where: companyCondition,
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
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(date) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(date) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
          attributes: ['departmentID', 'applicableDate'],
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
            applicableDate: { [Sequelize.Op.lte]: new Date(date) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(date) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
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
          required: false,
          model: EmployeeJoiningDetails,
          as: 'employeeJoiningDetails',
          attributes: ['employeeCode'],
        },
        {
          required: false,
          model: EmployeeDivision,
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
          model: EmployeeWorkingArea,
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
          attributes: ['employeeSalaryPolicyID'],
          limit: 1,
        },
        {
          required: false,
          model: HRSalaryMaster,
          where: {
            salaryFromYYYYMM: {
              [Sequelize.Op.lte]: month,
            },
          },
          limit: 1,
        },
        {
          required: false,
          model: UserAddress,
          where: {
            status: 1,
          },

          attributes: ['addressType'],
          limit: 1,
        },
        {
          required: false,
          model: UserExperience,
          where: {
            status: 1,
            verifyStatus: 1,
          },
          attributes: ['designation'],
          limit: 1,
        },
        {
          required: false,
          model: UserEducation,
          where: {
            status: 1,
            verifyStatus: 1,
          },
          attributes: ['qualification'],
          limit: 1,
        },
        {
          required: false,
          model: UserDocument,
          where: {
            status: 1,
            verifyStatus: 1,
          },
          limit: 1,
        },
        {
          required: false,
          model: UserFamily,
          where: {
            status: 1,
            verifyStatus: 1,
          },
          attributes: ['memberName'],
          limit: 1,
        },
        {
          required: false,
          model: UserSkills,
          where: {
            status: 1,
          },
          attributes: ['type'],
          limit: 1,
        },
        {
          required: false,
          model: UserReportTO,
          where: {
            status: 1,
          },
          attributes: ['employeeReportToID'],
        },
        {
          required: false,
          model: CompanyDocument,
          where: {
            status: 1,
          },
          limit: 1,
        },
        {
          required: false,
          model: EmployeeShift,
          where: {
            status: 1,
          },
          attributes: ['employeeShiftID'],
        },
        {
          required: false,
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
          attributes: ['employeeAttendancePolicyID'],
        },
        {
          required: false,
          model: EmployeeHolidayPolicyModel,
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
          attributes: ['employeeholidayPolicyID'],
        },
        {
          required: false,
          model: EmployeeWeekOff,
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
          attributes: ['employeeWeekOffID'],
        },
        {
          required: false,
          model: CompanyDocument,
          where: {
            status: 1,
          },
          attributes: ['companyDocumentID'],
        },
        {
          required: false,
          model: EmployeeDigitalSignature,
          where: {
            status: 1,
          },
          attributes: ['employeeDigitalSignatureID'],
        },
        {
          required: false,
          model: HrLeaveBalance,
          limit: 1,
        },
        {
          required: false,
          model: AuthorizationDetails,
          where: {
            status: ['0', '1'],
          },
          attributes: ['AuthorizationDetailsId'],
          limit: 1,
        },
        {
          model: empLeavePolicy,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(date) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(date) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
          attributes: ['employeeLeavePolicyID'],
        },
        {
          required: false,
          model: EmployeeLateEarlyPolicy,
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
          attributes: ['employeeLateEarlyPolicyID'],
        },
      ],
      ...paginationQuery,
    });

    const subscribeCompanyMasterId =
      +req.userDetails.parentCompanyMasterId == 0
        ? +req.userDetails.companyMasterId
        : +req.userDetails.parentCompanyMasterId;

    const getSubscriptionPlanData = await CompanySubscriptionMaster.findOne({
      where: {
        companyMasterID: subscribeCompanyMasterId,
        status: 1,
      },
      // raw: true,
      attributes: [
        'companyPlanMasterID',
        'companyMasterID',
        'productMasterID',
        'totalUser',
        'totalTracking',
        'startDate',
        'endDate',
      ],
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

    const fieldsToCheck = [
      { field: 'employeeJoiningDetails', tabName: 'EMPLOYEE JOINING DETAILS' },
      { field: 'employeeDesignations', tabName: 'DESIGNATION' },
      { field: 'employeeDepartments', tabName: 'DEPARTMENT' },
      { field: 'employeeBranches', tabName: 'BRANCH' },
      { field: 'userAddresses', tabName: 'ADDRESS' },
      { field: 'userExperiences', tabName: 'EXPERIENCE' },
      { field: 'userEducations', tabName: 'EDUCATION' },
      { field: 'userDocuments', tabName: 'DOCUMENT' },
      { field: 'userFamilies', tabName: 'FAMILY' },
      { field: 'userSkills', tabName: 'SKILLS' },
      { field: 'employeeReportTos', tabName: 'REPORT TO' },
      { field: 'companyDocuments', tabName: 'COMPANY DOCUMENT' },
      { field: 'employeeShifts', tabName: 'SHIFT' },
      { field: 'employeeAttendancePolicies', tabName: 'ATTENDANCE POLICY' },
      { field: 'employeeHolidayPolicies', tabName: 'HOLIDAY POLICY' },
      { field: 'employeeWeekOffs', tabName: 'WEEKOFF POLICY' },
      { field: 'employeeDigitalSignatures', tabName: 'DIGITAL SIGNATURE' },
      { field: 'hrLeaveBalances', tabName: 'LEAVE OPENING BALANCE' },
      { field: 'empLeavePolicies', tabName: 'LEAVE POLICY' },
      { field: 'authorizationDetails', tabName: 'AUTHORIZATION' },
    ];

    const planwiseForms = getSubscriptionPlanData?.productMaster?.rp?.map(
      (x) => x?.formMaster?.formName,
    );

    if (planwiseForms.includes('WorkingArea'))
      fieldsToCheck.push({
        field: 'employeeWorkingAreas',
        tabName: 'WORKING AREA',
      });
    if (planwiseForms.includes('Division'))
      fieldsToCheck.push({ field: 'employeeDivisions', tabName: 'DIVISION' });
    if (planwiseForms.includes('LateInEarlygoPolicy'))
      fieldsToCheck.push({
        field: 'employeeLateEarlyPolicies',
        tabName: 'LATEINEARLYGOPOLICY',
      });

    if (getSubscriptionPlanData.productMasterID != 9) {
      fieldsToCheck.push({
        field: 'employeeSalaryPolicies',
        tabName: 'SALARY POLICY',
      });
      fieldsToCheck.push({
        field: 'hrSalaryMasters',
        tabName: 'SALARY STRUCTURE',
      });
    }

    const finaldata = [];

    for (let i = 0; i < user.length; i++) {
      let trueCount = 0;
      let falseCount = 0;
      const tabData = [];

      fieldsToCheck.forEach(({ field, tabName }) => {
        if (user[i][field] && user[i][field].length > 0) {
          trueCount += 1;
          tabData.push({
            display: true,
            tabName: tabName,
          });
        } else {
          falseCount += 1;
          tabData.push({
            display: false,
            tabName: tabName,
          });
        }
      });

      let totalCount = trueCount + falseCount;
      let totalPercentage = (trueCount / totalCount) * 100;

      let profilePercentage = Math.floor(totalPercentage);

      finaldata.push({
        'Employee Name': user[i].displayName,
        'Employee Number': user[i].userNumber,
        userMasterID: user[i].userMasterID,
        trueCount: trueCount,
        falseCount: falseCount,
        pendingTabs: tabData,
        profilePercentage,
        'Employee Code':
          user[i].employeeJoiningDetails.length > 0
            ? user[i].employeeJoiningDetails[0].employeeCode
            : '',
        'Company Name': user[i].companyMaster.companyName,
        'Branch Name':
          user[i].employeeBranches.length > 0
            ? user[i].employeeBranches[0].branchMaster.branchName
            : '',
        'Department Name':
          user[i].employeeDepartments.length > 0
            ? user[i].employeeDepartments[0].department.departmentName
            : '',
        'Designation Name':
          user[i].employeeDesignations.length > 0
            ? user[i].employeeDesignations[0].designation.designationName
            : '',
      });
    }

    if (exportData) {
      const data = finaldata.map((row) => ({
        'Employee Code': row['Employee Code'],
        'Employee Name': row['Employee Name'],
        'Employee Number': row['Employee Number'],
        Company: row['Company Name'],
        Branch: row['Branch Name'],
        Department: row['Department Name'],
        Designation: row['Designation Name'],
        'Profile Percentage': row.profilePercentage,
      }));
      await generateExcel(data, 'Profile Percentage', 'xlsx', res);
      return;
    }
    return res.status(200).json({
      status: 200,
      message: 'Profile Percentage fetched Successfully',
      data: finaldata,
      totalcount: count,
    });
  } catch (error) {
    next(error);
  }
};

exports.removeProfilePhoto = async (req, res, next) => {
  try {
    const { userMasterID } = await req.body;

    const GetUserData = await UserMaster.findOne({
      where: { userMasterID: userMasterID },
      attributes: ['photo'],
    });

    const logoPath = path.join('uploads/user/photo/', GetUserData.photo);
    if (fs.existsSync(logoPath)) {
      fs.unlinkSync(logoPath);
    }
    await UserMaster.update(
      {
        photo: '',
        isPhotoLock: 0,
      },
      {
        where: { userMasterID: userMasterID },
      },
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Profile Photo'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getEmployeeSatus = async (req, res, next) => {
  try {
    const {
      companyMasterId,
      status,
      page,
      limit,
      searchQuery,
      exportData,
      userMasterID = [],
    } = await req.body;
    const condition = {};

    condition.status = status ? status : [0, 1];
    const date = asiaKolkataDateTime(new Date()).slice(0, 10);

    if (userMasterID?.length > 0) {
      condition.userMasterID = userMasterID;
    }
    let employeeConditions = null;
    if (status == 2) {
      // If status is 'left'
      employeeConditions = {
        [Sequelize.Op.and]: [
          {
            leavingDate: {
              [Sequelize.Op.ne]: null,
            },
          },
          {
            leavingDate: {
              [Sequelize.Op.ne]: '',
            },
          },
        ],
      };
      condition.status = [1];
    } else if (status === 0 || status === 1) {
      // If status is 'active' or 'deactivated'
      condition.status = status;
    }
    if (companyMasterId) condition.companyMasterId = companyMasterId;

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          displayName: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
      ];

    const paginationQuery =
      !exportData && page && limit ? { offset: (page - 1) * limit, limit } : {};

    const { rows, count } = await UserMaster.findAndCountAll({
      distinct: true,
      where: condition,
      ...paginationQuery,
      include: [
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
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(date) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(date) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
          attributes: ['departmentID', 'applicableDate'],
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
            applicableDate: { [Sequelize.Op.lte]: new Date(date) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(date) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
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
          required: employeeConditions ? true : false,
          model: EmployeeJoiningDetails,
          where: employeeConditions,
          as: 'employeeJoiningDetails',
          attributes: ['employeeCode', 'leavingDate'],
        },
        {
          model: EmployeeDivision,
          where: {
            status: 1,
            startDate: { [Sequelize.Op.lte]: new Date() },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date() } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },

          required: false,
          separate: true,
          attributes: ['divisionId', 'startDate'],
          include: [
            {
              model: Division,
              attributes: ['divisionName'],
            },
          ],
        },
        {
          model: EmployeeWorkingArea,
          where: {
            status: 1,
            startDate: { [Sequelize.Op.lte]: new Date() },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date() } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },

          required: false,
          separate: true,
          attributes: ['workingAreaId', 'startDate'],
          include: [
            {
              model: WorkingArea,
              attributes: ['workingAreaName'],
            },
          ],
        },
      ],
      order: [['displayName', 'ASC']],
    });

    if (exportData) {
      const finaldata = rows.map((e) => {
        return {
          EmployeeCode:
            e.employeeJoiningDetails && e.employeeJoiningDetails.length > 0
              ? e.employeeJoiningDetails[0].employeeCode
              : '',
          Name: e.displayName,
          Number: e.userNumber,
          Branch:
            e.employeeBranches && e.employeeBranches.length > 0
              ? e.employeeBranches[0].branchMaster
                ? e.employeeBranches[0].branchMaster.branchName
                : ''
              : '',
          Department:
            e.employeeDepartments && e.employeeDepartments.length > 0
              ? e.employeeDepartments[0].department
                ? e.employeeDepartments[0].department.departmentName
                : ''
              : '',
          Designation:
            e.employeeDesignations && e.employeeDesignations.length > 0
              ? e.employeeDesignations[0].designation
                ? e.employeeDesignations[0].designation.designationName
                : ''
              : '',
          Division:
            e.employeeDivisions && e.employeeDivisions.length > 0
              ? e.employeeDivisions[0].division
                ? e.employeeDivisions[0].division.divisionName
                : ''
              : '',
          WorkingAreas:
            e.employeeWorkingAreas && e.employeeWorkingAreas.length > 0
              ? e.employeeWorkingAreas[0].workingArea
                ? e.employeeWorkingAreas[0].workingArea.workingAreaName
                : ''
              : '',
          // LeavingDate:
          // e.employeeJoiningDetails && e.employeeJoiningDetails.length > 0
          // ? e.employeeJoiningDetails[0].leavingDate
          // : '',

          LeavingDate:
            e.employeeJoiningDetails && e.employeeJoiningDetails.length > 0
              ? new Date(
                  e.employeeJoiningDetails[0].leavingDate,
                ).toLocaleDateString('en-GB')
              : 'DD-MM-YYYY',
        };
      });

      return await generateExcel(finaldata, 'EmployeeList', 'xlsx', res);
    }

    return res.status(200).json({
      status: 200,
      message: 'Data fetched Successfully',
      data: rows,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const userMasterID = req.params.id;

    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const userDetails = await UserMaster.findOne({
      where: { userMasterID: userMasterID, status: 1 },
      attributes: [
        'userMasterID',
        'displayName',
        'firstName',
        'middleName',
        'lastName',
        'photo',
        'gender',
        'dob',
        'userNumber',
        'passChangedCount',
      ],
      include: [
        { model: companyMaster, attributes: companyAttributes },
        {
          required: false,
          separate: true,
          model: EmployeeDesignation,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(currentDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
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
        {
          required: false,
          separate: true,
          model: EmployeeDepartment,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(currentDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },

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
          required: false,
          separate: true,
          model: EmployeeBranch,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(currentDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
              { endDate: { [Sequelize.Op.eq]: null } },
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
          required: false,
          separate: true,
          model: EmployeeDivision,
          where: {
            status: 1,
            startDate: { [Sequelize.Op.lte]: new Date(currentDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: ['divisionId', 'startDate'],
          include: [
            {
              model: Division,
              attributes: ['divisionName'],
            },
          ],
        },
        {
          required: false,
          separate: true,
          model: EmployeeWorkingArea,
          where: {
            status: 1,
            startDate: { [Sequelize.Op.lte]: new Date(currentDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
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
      ],
    });
    return res.status(200).json({
      status: 200,
      data: userDetails,
    });
  } catch (error) {
    next(error);
  }
};

exports.bulkDownloadProfilePics = async (req, res, next) => {
  try {
    const {
      status,
      companyMasterID,
      branchMasterID,
      departmentID,
      designationID,
      divisionId,
      workingAreaId,
    } = req.body;

    const order = [['displayName', 'ASC']];

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const includedModels = [
      {
        model: EmployeeJoiningDetails,
        attributes: ['employeeCode'],
      },
      {
        model: EmployeeDesignation,
        where: {
          status: 1,
          ...(designationID &&
            (!Array.isArray(designationID) || designationID.length) && {
              designationID,
            }),
          applicableDate: {
            [Sequelize.Op.lte]: new Date(filterDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(filterDate),
              },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: designationID ? true : false,
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
        model: EmployeeDepartment,
        where: {
          status: 1,
          ...(departmentID &&
            (!Array.isArray(departmentID) || departmentID.length) && {
              departmentID,
            }),
          applicableDate: {
            [Sequelize.Op.lte]: new Date(filterDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(filterDate),
              },
            },
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
          ...(branchMasterID &&
            (!Array.isArray(branchMasterID) || branchMasterID.length) && {
              branchID: branchMasterID,
            }),
          applicableDate: {
            [Sequelize.Op.lte]: new Date(filterDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(filterDate),
              },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: branchMasterID ? true : false,
        attributes: ['branchID'],
        include: [
          {
            model: BranchMaster,
            as: 'branchMaster',
            attributes: ['branchName'],
          },
        ],
      },
    ];

    if (divisionId) {
      includedModels.push({
        model: EmployeeDivision,
        where: {
          status: 1,
          ...(divisionId && { divisionId }),
          startDate: { [Sequelize.Op.lte]: new Date(filterDate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: true,
        attributes: ['divisionId'],
        include: [
          {
            model: Division,
            attributes: ['divisionName'],
          },
        ],
      });
    }
    if (workingAreaId) {
      includedModels.push({
        model: EmployeeWorkingArea,
        where: {
          status: 1,
          ...(workingAreaId && { workingAreaId }),
          startDate: { [Sequelize.Op.lte]: new Date(filterDate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: true,
        attributes: ['workingAreaId'],
        include: [
          {
            model: WorkingArea,
            attributes: ['workingAreaName'],
          },
        ],
      });
    }

    const condition = {};
    if (
      companyMasterID &&
      (!Array.isArray(companyMasterID) || companyMasterID.length)
    )
      condition.companyMasterId = companyMasterID;
    condition.status = status ? status : 1;
    condition.photo = {
      [Sequelize.Op.and]: [
        { [Sequelize.Op.ne]: null },
        { [Sequelize.Op.ne]: '' },
      ],
    };

    const attributes = ['userMasterID', 'photo', 'displayName', 'userNumber'];
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const AllUser = await UserMaster.findAndCountAll({
      where: { ...userAccessCondition.where, ...condition },
      order,
      include: [...userAccessCondition.includeModels, ...includedModels],
      attributes: attributes,
    });

    if (AllUser.rows.length > 0) {
      return await createZipFileForProfilePics(AllUser.rows, res);
    } else {
      return res.status(200).json({
        status: 200,
        message: message.usermessage.notFoundMessage('User'),
      });
    }
  } catch (error) {
    next(error);
  }
};

exports.checkExistUserNumber = async (req, res, next) => {
  try {
    const { userNumber } = req.body;
    const companyMasterID = req.userDetails.companyMasterId;

    const alreadyExistUserNumberCheck = await checkAlreayExistUsernumber({
      userNumber,
      companyMasterID,
    });

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data: {
        isValid: !alreadyExistUserNumberCheck.hasUser,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.checkExistAdharNumber = async (req, res, next) => {
  try {
    const { adharCard } = req.body;
    const companyMasterID = req?.userDetails?.companyMasterId;

    if (!companyMasterID) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Company'),
        isValid: false,
      });
    }

    if (!adharCard) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.requiredMessage('Adhar Card'),
        isValid: false,
      });
    }

    const allCompanies = await getParentChildCompany(companyMasterID);
    const allCompanyIDs = allCompanies.map(
      (company) => company?.companyMasterID,
    );

    const userData = await UserMaster.findOne({
      where: {
        companyMasterId: {
          [Sequelize.Op.in]: allCompanyIDs,
        },
        status: 1,
      },
      include: [
        {
          required: true,
          model: EmployeeJoiningDetails,
          where: {
            adharCard: String(adharCard),
          },
          attributes: ['employeeJoiningDetailId', 'adharCard'],
        },
        {
          model: companyMaster,
          attributes: ['companyName', 'companyMasterID'],
        },
      ],
    });

    if (userData) {
      const existCompanyName = userData.companyMaster.companyName;
      return res.status(200).json({
        status: 401,
        message:
          'Employee with this Adhar Card already exist in ' +
          existCompanyName +
          '!',
        isValid: false,
      });
    }

    return res.status(statusCodes.OK).json({
      status: 200,
      message: message.usermessage.validateMessage('Adhar Card'),
      isValid: true,
    });
  } catch (error) {
    throw error;
  }
};

exports.postAdminSideUserStatusChange = async (req, res, next) => {
  try {
    let { userMasterID, status } = await req.body;
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    if (!userMasterID) {
      return res.status(200).json({
        status: 404,
        message: message.usermessage.notFoundMessage('User'),
      });
    }

    await UserMaster.update(
      {
        status,
        deactiveDate: status == '0' ? currentDate : null,
      },
      {
        where: { userMasterID: userMasterID },
      },
    );
    return res.status(200).json({
      status: 200,
      message:
        status == '1'
          ? message.usermessage.activeMessage('User')
          : message.usermessage.deactiveMessage('User'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllUsersForDropdown = async (req, res, next) => {
  try {
    const {
      limit,
      page,
      searchQuery,
      status,
      userMasterID,
      companyMasterID,
      departmentID,
      designationID,
      divisionId,
      workingAreaId,
      workingLocationID,
      workingLocationStartDate,
      workingLocationEndDate,
      branchStartDate,
      branchEndDate,
      departmentStartDate,
      departmentEndDate,
      designationStartDate,
      designationEndDate,
      employeeStartDate,
      employeeEndDate,
      gender,
      repoteeUserMasterID,
      contractorId,
      projectID,
      salarytype,
      skillCategory,
      employmentType,
      employmentDate,
      employeeType,
      payrollFrequency,
      employment,
    } = req.body;
    let { branchMasterID } = req.body;

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    //Pagination
    const paginationQuery =
      page && limit ? { offset: (page - 1) * limit, limit } : {};

    //Order
    const order = [['displayName', 'ASC']];

    //Models Included
    const empJoiningCondition = {
      ...(contractorId &&
        (!Array.isArray(contractorId) || contractorId.length) && {
          contractorId,
        }),
    };

    if (salarytype) empJoiningCondition.salarytype = salarytype;
    // if (employmentType) empJoiningCondition.employment = employmentType;
    if (employeeType) empJoiningCondition.employeeType = employeeType;
    if (payrollFrequency)
      empJoiningCondition.payrollFrequency = payrollFrequency;

    if (employment) empJoiningCondition.employment = employment;
    const isValidFilter = (value) =>
      value && (!Array.isArray(value) || value.length);

    const includedModels = [];

    /* ================= Employee Joining ================= */
    includedModels.push({
      model: EmployeeJoiningDetails,
      as: 'emp_join',
      where: empJoiningCondition,
      required:
        Boolean(contractorId) ||
        Boolean(salarytype) ||
        Boolean(employmentType) ||
        Boolean(employeeType) ||
        Boolean(payrollFrequency),
      attributes: [],
    });
    /* ================= Branch ================= */
    if (isValidFilter(branchMasterID)) {
      includedModels.push({
        required: true,
        model: EmployeeBranch,
        as: 'emp_branch',
        where: {
          status: 1,
          branchID: branchMasterID,
          applicableDate: {
            [Sequelize.Op.lte]: new Date(branchStartDate || filterDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(branchEndDate || filterDate),
              },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },

        attributes: [],
      });
    }
    /* ================= Department ================= */
    if (isValidFilter(departmentID)) {
      includedModels.push({
        required: true,
        model: EmployeeDepartment,
        as: 'emp_dept',
        where: {
          status: 1,
          departmentID,
          applicableDate: {
            [Sequelize.Op.lte]: new Date(departmentStartDate || filterDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(departmentEndDate || filterDate),
              },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        attributes: [],
      });
    }
    /* ================= Designation ================= */
    if (isValidFilter(designationID)) {
      includedModels.push({
        required: true,
        model: EmployeeDesignation,
        as: 'emp_desig',
        where: {
          status: 1,
          designationID,
          applicableDate: {
            [Sequelize.Op.lte]: new Date(designationStartDate || filterDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(designationEndDate || filterDate),
              },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        attributes: [],
      });
    }
    /* ================= Division ================= */
    if (isValidFilter(divisionId)) {
      includedModels.push({
        model: EmployeeDivision,
        required: true,
        where: {
          status: 1,
          divisionId: divisionId,
          startDate: { [Sequelize.Op.lte]: new Date(filterDate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        attributes: [],
      });
    }
    /* ================= Working Area ================= */
    if (isValidFilter(workingAreaId)) {
      includedModels.push({
        required: true,
        model: EmployeeWorkingArea,
        where: {
          status: 1,
          workingAreaId: workingAreaId,
          startDate: { [Sequelize.Op.lte]: new Date(filterDate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        attributes: [],
      });
    }
    /* ================= Working Location ================= */
    if (isValidFilter(workingLocationID)) {
      includedModels.push({
        required: true,
        model: EmployeeWorkingLocation,
        where: {
          status: 1,
          workingLocationIDs: {
            [Sequelize.Op.contains]: [workingLocationID],
          },
          startDate: {
            [Sequelize.Op.lte]: new Date(
              workingLocationStartDate || filterDate,
            ),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(
                  workingLocationEndDate || filterDate,
                ),
              },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        attributes: [],
      });
    }
    /* ================= Project ================= */
    if (isValidFilter(projectID)) {
      includedModels.push({
        required: true,
        model: EmployeeProject,
        where: {
          status: 1,
          projectID: projectID,
          startDate: { [Sequelize.Op.lte]: new Date(filterDate) },
          [Sequelize.Op.or]: [
            { releaseDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
            { releaseDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        attributes: [],
      });
    }
    /* ================= Skill Category ================= */
    const YYYYMM = filterDate.slice(0, 7).replace('-', '');

    const skillCategoryCondition = {};
    if (isValidFilter(skillCategory)) {
      skillCategoryCondition.skillCategory = skillCategory;
      ((skillCategoryCondition.applicableYYYYMM = {
        [Sequelize.Op.lte]: +YYYYMM,
      }),
        (skillCategoryCondition[Sequelize.Op.or] = [
          { endYYYYMM: { [Sequelize.Op.gte]: +YYYYMM } },
          { endYYYYMM: { [Sequelize.Op.eq]: null } },
        ]));

      includedModels.push({
        model: EmployeeSkillCategory,
        where: skillCategoryCondition,
        required: true,
      });
    }

    if (isValidFilter(employmentType)) {
      includedModels.push({
        model: EmployeeEmployeement,
        required: true,
        where: {
          status: 1,
          employeement: employmentType,
          applicableDate: {
            [Sequelize.Op.lte]: employmentDate || filterDate,
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: employmentDate || filterDate,
              },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        attributes: [],
      });
    }

    if (isValidFilter(repoteeUserMasterID)) {
      includedModels.push({
        required: true,
        model: EmployeeReportTo,
        where: {
          status: 1,
          reportToID: repoteeUserMasterID,
        },
        attributes: [],
      });
    }

    //Conditions
    const condition = {};
    if (
      companyMasterID &&
      (!Array.isArray(companyMasterID) || companyMasterID.length)
    )
      condition.companyMasterId = companyMasterID;

    condition.status = status ? status : 1;

    if (userMasterID && (!Array.isArray(userMasterID) || userMasterID.length))
      condition.userMasterID = userMasterID;

    if (employeeStartDate && employeeEndDate) {
      condition['$emp_join.joiningDate$'] = {
        [Sequelize.Op.lte]: new Date(employeeEndDate),
      };
      condition[Sequelize.Op.or] = [
        {
          '$emp_join.leavingDate$': {
            [Sequelize.Op.gte]: new Date(employeeStartDate),
          },
        },
        {
          '$emp_join.leavingDate$': { [Sequelize.Op.eq]: null },
          [Sequelize.Op.or]: [
            {
              deactiveDate: {
                [Sequelize.Op.gte]: new Date(employeeStartDate),
              },
            },
            {
              deactiveDate: { [Sequelize.Op.eq]: null },
            },
          ],
        },
      ];
    }

    if (searchQuery) {
      const terms = searchQuery.trim().split(/\s+/);
      condition[Sequelize.Op.or] = [
        {
          [Sequelize.Op.and]: terms.map((term) => ({
            displayName: {
              [Sequelize.Op.iLike]: `%${term}%`,
            },
          })),
        },
        {
          userNumber: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          '$emp_join.employeeCode$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          '$companyMaster.companyName$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
      ];
    }

    if (gender) {
      condition.gender = gender;
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    //Query
    const AllUser = await UserMaster.findAndCountAll({
      where: { ...userAccessCondition.where, ...condition },
      ...paginationQuery,
      order,
      include: [...userAccessCondition.includeModels, ...includedModels],
      subQuery: false,
      attributes: [
        // normal column
        'userMasterID',
        'displayName',
        'userNumber',
        [Sequelize.literal(`"emp_join"."employeeCode"`), 'employeeCode'],
        // displayName - userNumber
        [
          Sequelize.literal(
            `"userMaster"."displayName" || ' - ' || "userMaster"."userNumber"`,
          ),
          'displayNameWithNumber',
        ],

        // displayName ( employeeCode )
        [
          Sequelize.literal(`
      "userMaster"."displayName" ||
      CASE
        WHEN "emp_join"."employeeCode" IS NOT NULL
         AND "emp_join"."employeeCode" != ''
        THEN ' ( ' || "emp_join"."employeeCode" || ' )'
        ELSE ''
      END
    `),
          'displayNameWithEmployeeCode',
        ],

        // displayName ( employeeCode ) - userNumber
        [
          Sequelize.literal(`
      "userMaster"."displayName" ||
      CASE
        WHEN "emp_join"."employeeCode" IS NOT NULL
         AND "emp_join"."employeeCode" != ''
        THEN ' ( ' || "emp_join"."employeeCode" || ' )'
        ELSE ''
      END || ' - ' || "userMaster"."userNumber"
    `),
          'displayNameWithCodeAndNumber',
        ],
      ],
    });

    return res.status(200).json({
      status: 200,
      data: AllUser.rows,
      totalcount: AllUser.count,
    });
  } catch (err) {
    next(err);
  }
};
