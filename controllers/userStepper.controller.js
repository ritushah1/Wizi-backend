/** @format */

const message = require('../response_message/message');
const bcrypt = require('bcrypt');
const { Sequelize } = require('sequelize');
const sequelize = require('../config/database');
const {
  companyMasterIDENUM,
  saveraCompanyIDs,
  addressTypes,
  weekoffTypeApplicableMonthTypes,
  employeeCodeTypes,
} = require('../utils/dbUtils');
const {
  convertNameToLocalName,
  TIMEZONE,
  projectNamesList,
  ProjectName,
} = require('../utils/labelUtils');
const { Translate } = require('@google-cloud/translate').v2;
const UserMaster = require('../models/userMaster');
const companyMaster = require('../models/companyMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const EmployeeBranch = require('../models/employeeBranch');
const EmployeeDepartment = require('../models/employeeDepartment');
const EmployeeDesignation = require('../models/employeeDesignation');
const JoiningDocument = require('../models/joiningDocument');
const UserRole = require('../models/userRole');
const EmployeeWeekOff = require('../models/employeeWeekOff');
const {
  add_WeekOffHoliday_With_Transaction,
  getParentChildCompany,
  getTimezone,
  getDuplicationValidation,
  checkAlreayExistUsernumber,
  getSalaryCycleDateByMonth,
  getSalaryCycleDateAndMonthByDate,
  getEmployeeCodeCompanyWise,
  checkCompanySubscription,
  isStrongPassword,
} = require('../utils/commonUtilFunctions');
const EmployeeHolidayPolicy = require('../models/employeeHolidayPolicy');
const EmployeeSkillCategory = require('../models/employeeSkillCategory');
const EmployeeEmployeement = require('../models/employeeEmployeement');
const UserAddress = require('../models/userAddress');
const CityMaster = require('../models/citymaster');
const HrSalaryMaster = require('../models/hrSalaryMaster');
const moment = require('moment');
const EmployeeAttendancePolicy = require('../models/employeeAttendancePolicy');
const { sendEmailFornewuser } = require('../middleware/sendemail');
const Preboarding = require('../models/preboarding');
const BankDetailRequest = require('../models/bankDetailRequest');
const { CustomError } = require('../utils/customError');
const { statusCodes } = require('../utils/commonVars');
const EmployeeShift = require('../models/employeeShift');
const Timezone = require('../models/timezone');
const empLeavePolicy = require('../models/empLeavePolicy');
const UserDocument = require('../models/userDocument');
const SalaryPolicy = require('../models/salaryPolicy');
const { format } = require('morgan');
const EmployeeSalaryPolicy = require('../models/employeeSalaryPolicy');
const holidayPolicy = require('../models/holidayPolicy');

exports.addStepwiseUser = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    const salt = await bcrypt.genSalt(10);
    const formData = req.body;
    const files = req.files;

    

    for (const key of Object.keys(req.body)) {
      if (
        req.body[key] == 'null' ||
        !req.body[key] ||
        req.body[key] == 'undefined' ||
        req.body[key] == ''
      ) {
        req.body[key] = null;
      }
    }
    let {
      firstName,
      middleName,
      lastName,
      employeeCode,
      displayName,
      gender,
      companyMasterID,
      email,
      dob,
      joiningDate,
      biometricCode,
      biometricSerialNo,
      overtime,
      otherContactNumber,
      attendanceFrom,
      employeeType,
      cugNumber,
      officalEmail,
      userNumberCountryMasterID,
      userNumber,
      houseNumber,
      houseName,
      landmark,
      area,
      cityMasterID,
      zipcode,
      districtID,
      localHouseNumber,
      localHouseName,
      localLandmark,
      localArea,
      localCityMasterID,
      localZipcode,
      localDistrictID,
      contractorId,
      employment,
      employmentApplicableDate,
      employmentEndDate,
      branchMasterID,
      applicableDatebranch,
      departmentID,
      applicableDatedepartment,
      designationID,
      applicableDatedesignation,
      roleMasterID,
      pfNumber,
      pfjoiningDate,
      esicNumber,
      esicjoiningDate,
      esicEndMonth,
      bankMasterID,
      bankBranchID,
      bankIFSC,
      bankAccountNo,
      nameAsBank,
      uanNumber,
      pfbankAccountNo,
      pfbankMasterID,
      pfbankIFSC,
      skillCategory,
      salaryStructureData,
      weekOffPolicyID,
      holidayPolicyID,
      attendancePolicyID,
      shiftIds,
      isonboarding = null,
      preboardingID = null,
      sendCredentialsInMail,
      userNamePrefix,
      salarytype,
      adharCard,
      leavePolicyID,
      password,
      salaryPolicyID,
    } = req.body;

     if (!isStrongPassword(req.body.password)) {
      await transaction.rollback();
      return res.status(200).json({
        status: statusCodes.BAD_REQUEST,
        message: message.errorMessage.STRONG_PASSWORD,
      });
    }

     if (!isStrongPassword(req.body.password)) {
      await transaction.rollback();
      return res.status(200).json({
        status: statusCodes.BAD_REQUEST,
        message: message.errorMessage.STRONG_PASSWORD,
      });
    }

     if (!isStrongPassword(req.body.password)) {
          await transaction.rollback();
          return res.status(200).json({
            status: statusCodes.BAD_REQUEST,
            message: message.errorMessage.STRONG_PASSWORD,
          });
        }

    const isSavera = saveraCompanyIDs.includes(+companyMasterID);

    if (esicNumber || uanNumber) {
      const data = {
        esicNumber,
        uanNumber,
      };

      const duplicateMessage = await getDuplicationValidation(
        data,
        null,
        companyMasterID,
        true,
      );

      if (duplicateMessage) {
        await transaction.rollback();
        return res.status(statusCodes.OK).json({
          status: statusCodes.BAD_REQUEST,
          message: duplicateMessage,
        });
      }
    }

    sendCredentialsInMail = sendCredentialsInMail
      ? JSON.parse(sendCredentialsInMail)
      : false;

    const companySubscriptionCheck =
      await checkCompanySubscription(companyMasterID);
    const allParentChildCompanyData = companySubscriptionCheck?.companyData;
    if (companySubscriptionCheck.status != 200) {
      await transaction.rollback();
      return res.status(200).json({
        status: companySubscriptionCheck.status,
        message: companySubscriptionCheck.message,
      });
    }
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

    // if (employeeCode) {
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
    biometricCode = isSavera ? employeeCode : biometricCode;

    const updatedPassWord = isSavera
      ? String(firstName).substring(0, 4).toLowerCase() +
        '' +
        String(userNumber).slice(-4)
      : password || null;

    const encryptedPassword = bcrypt.hashSync(updatedPassWord, salt);

    const userPhoto = files && files.photo ? files.photo.filename : null;

    const convertNameToLocalNameProcessData =
      await convertNameToLocalNameProcess(
        companyMasterID,
        firstName,
        middleName,
        lastName,
      );
    const localFName = convertNameToLocalNameProcessData?.localFName || null;
    const localMName = convertNameToLocalNameProcessData?.localMName || null;
    const localLName = convertNameToLocalNameProcessData?.localLName || null;
    const localDisplayName =
      convertNameToLocalNameProcessData?.localDisplayName || null;

    //timezone
    const timezoneID = await getTimezoneForCompany(companyMasterID);

    // Create User
    const createdUserData = await UserMaster.create(
      {
        firstName,
        middleName: middleName ? middleName : null,
        lastName,
        displayName,
        userNumber,
        photo: userPhoto,
        gender,
        dob,
        isonboarding, //While Adding User From On-Board
        preboardingID, //While Adding User From On-Board
        companyMasterId: companyMasterID,
        password: encryptedPassword,
        email: email,
        admin: 0,
        otherContactNumber,
        createBy,
        createByIp,
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
    biometricSerialNo =
      biometricSerialNo &&
      biometricSerialNo != 'undefined' &&
      Array.isArray(biometricSerialNo)
        ? biometricSerialNo?.join(',')
        : biometricSerialNo && biometricSerialNo != 'undefined'
          ? [biometricSerialNo]
          : null;

    await employeeRelationCreateQueries(
      transaction,
      createBy,
      createByIp,
      formData,
      files,
      createdUserData.userMasterID,
      dob,
      joiningDate,
      employeeCode,
      attendanceFrom,
      biometricCode,
      displayName,
      biometricSerialNo,
      overtime,
      employeeType,
      branchMasterID,
      applicableDatebranch,
      departmentID,
      applicableDatedepartment,
      designationID,
      applicableDatedesignation,
      roleMasterID,
      skillCategory,
      employment,
      employmentApplicableDate,
      employmentEndDate,
      pfNumber,
      pfjoiningDate,
      esicNumber,
      esicjoiningDate,
      esicEndMonth,
      bankMasterID,
      bankBranchID,
      bankIFSC,
      bankAccountNo,
      nameAsBank,
      contractorId,
      uanNumber,
      pfbankAccountNo,
      pfbankMasterID,
      pfbankIFSC,
      salarytype,
      adharCard,
      req.userDetails,
    );

    await addWeekoffHolidayWithSalaryPolicy(
      companyMasterID,
      weekOffPolicyID,
      holidayPolicyID,
      salaryPolicyID,
      createdUserData.userMasterID,
      joiningDate,
      createBy,
      createByIp,
      transaction,
    );
    await addAttendancePolicy(
      attendancePolicyID,
      joiningDate,
      createdUserData.userMasterID,
      createBy,
      createByIp,
      transaction,
    );

    await addShift(
      shiftIds,
      joiningDate,
      createdUserData.userMasterID,
      createBy,
      createByIp,
      transaction,
    );

    await addLeavePolicy(
      leavePolicyID,
      joiningDate,
      createdUserData.userMasterID,
      transaction,
      req.userDetails,
    );

    await addUserAddress(
      houseNumber,
      houseName,
      landmark,
      area,
      cityMasterID,
      zipcode,
      districtID,
      localHouseNumber,
      localHouseName,
      localLandmark,
      localArea,
      localCityMasterID,
      localZipcode,
      localDistrictID,
      companyMasterID,
      createdUserData.userMasterID,
      createBy,
      createByIp,
      transaction,
    );

    await addSalaryStructureData(
      salaryStructureData,
      createdUserData.userMasterID,
      createBy,
      createByIp,
      transaction,
    );

    if (sendCredentialsInMail) {
      await sendEmailFornewuser({
        email,
        mobile: userNumber,
        password: password,
        companyName: companySubscriptionCheck?.companyName,
        employeeName: displayName,
      });
    }

    if (preboardingID) {
      await preBoardingQuery(preboardingID, createBy, createByIp, transaction);
    }

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('User'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

async function convertNameToLocalNameProcess(
  companyMasterID,
  firstName,
  middleName,
  lastName,
) {
  try {
    const localNameObj = {
      localFName: null,
      localMName: null,
      localLName: null,
      localDisplayName: null,
    };
    if (convertNameToLocalName) {
      if (saveraCompanyIDs.includes(companyMasterID)) {
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
          localNameObj.localFName = response[0]?.[0] || null;
          localNameObj.localMName = response[0]?.[1] || null;
          localNameObj.localLName = response[0]?.[2] || null;

          localNameObj.localDisplayName = localNameObj.localMName
            ? `${localNameObj.localFName} ${localNameObj.localMName} ${localNameObj.localLName}`
            : `${localNameObj.localFName} ${localNameObj.localLName}`;
        } catch (error) {
          console.error('Error in translation:', error);
        }
      }
    }
    return localNameObj;
  } catch (error) {
    throw new Error('Error in Convert Name To Local Name ' + error.message);
  }
}

async function employeeRelationCreateQueries(
  transaction,
  createBy,
  createByIp,
  formData,
  files,
  userMasterID,
  dob,
  joiningDate,
  employeeCode,
  attendanceFrom,
  biometricCode,
  displayName,
  biometricSerialNo,
  overtime,
  employeeType,
  branchMasterID,
  applicableDatebranch,
  departmentID,
  applicableDatedepartment,
  designationID,
  applicableDatedesignation,
  roleMasterID,
  skillCategory,
  employment,
  employmentApplicableDate,
  employmentEndDate,
  pfNumber,
  pfjoiningDate,
  esicNumber,
  esicjoiningDate,
  esicEndMonth,
  bankMasterID,
  bankBranchID,
  bankIFSC,
  bankAccountNo,
  nameAsBank,
  contractorId,
  uanNumber,
  pfbankAccountNo,
  pfbankMasterID,
  pfbankIFSC,
  salarytype,
  adharCard,
  token,
) {
  try {
    const createQueryArray = [];

    createQueryArray.push(
      EmployeeJoiningDetails.create(
        {
          userMasterID: userMasterID,
          dob,
          joiningDate: joiningDate,
          employeeCode,
          attendanceFrom,
          biometricCode: biometricCode,
          nameAsBank: nameAsBank ? nameAsBank : displayName,
          biometricSerialNo: biometricSerialNo?.join(','),
          overtime: overtime,
          employeeType,
          pfNumber,
          pfjoiningDate,
          esicNumber,
          esicjoiningDate,
          esicEndMonth,
          bankMasterID,
          bankBranchID,
          bankIFSC,
          bankAccountNo,
          uanNumber,
          pfbankAccountNo,
          pfbankMasterID,
          pfbankIFSC,
          contractorId,
          createBy,
          createByIp,
          employment,
          applicableDate: employmentApplicableDate,
          endDate: employmentEndDate ? employmentEndDate : '',
          salarytype,
          adharCard,
          adharName: displayName,
        },
        { transaction },
      ),
    );

    if (adharCard && displayName) {
      await createUserDocument(
        userMasterID,
        createBy,
        createByIp,
        adharCard,
        displayName,
        transaction,
      );
    }

    if (bankMasterID && bankAccountNo && bankIFSC) {
      createQueryArray.push(
        BankDetailRequest.create(
          {
            userMasterID: userMasterID,
            bankMasterID,
            IFSCCode: bankIFSC,
            accountNo: bankAccountNo,
            accountHolderName: nameAsBank ? nameAsBank : displayName,
            authorizationStatus: 0,
            AuthorizationCriteriaID: null,
            createBy,
            createByIp,
          },
          { transaction },
        ),
      );
    }

    if (branchMasterID && applicableDatebranch) {
      createQueryArray.push(
        EmployeeBranch.create(
          {
            userMasterID,
            branchID: +branchMasterID,
            applicableDate: new Date(applicableDatebranch),
            createBy,
            createByIp,
          },
          { transaction },
        ),
      );
    }

    if (departmentID && applicableDatedepartment) {
      createQueryArray.push(
        EmployeeDepartment.create(
          {
            userMasterID,
            departmentID: +departmentID,
            applicableDate: new Date(applicableDatedepartment),
            createBy,
            createByIp,
          },
          { transaction, user: token },
        ),
      );
    }

    if (designationID && applicableDatedesignation) {
      createQueryArray.push(
        EmployeeDesignation.create(
          {
            userMasterID,
            designationID: +designationID,
            applicableDate: new Date(applicableDatedesignation),
            createBy,
            createByIp,
          },
          { transaction },
        ),
      );
    }

    if (roleMasterID) {
      createQueryArray.push(
        UserRole.create(
          {
            userMasterID,
            roleMasterID,
            createBy,
            createByIp,
          },
          { hooks: false, transaction },
        ),
      );
    }

    if (skillCategory) {
      const joiningMonth =
        String(joiningDate).slice(0, 4) + String(joiningDate).slice(5, 7);

      createQueryArray.push(
        EmployeeSkillCategory.create(
          {
            userMasterID,
            skillCategory: skillCategory,
            applicableYYYYMM: +joiningMonth,
            createBy,
            createByIp,
          },
          {
            transaction,
            hooks: false,
          },
        ),
      );
    }

    if (employment && employmentApplicableDate) {
      createQueryArray.push(
        EmployeeEmployeement.create(
          {
            userMasterID,
            applicableDate: new Date(employmentApplicableDate),
            endDate: employmentEndDate ? new Date(employmentEndDate) : null,
            employeement: employment,
            createBy,
            createByIp,
          },
          { transaction },
        ),
      );
    }

    const joiningDocumnetData = designationWiseDocumentProcess(
      formData,
      files,
      userMasterID,
      createBy,
      createByIp,
    );

    if (joiningDocumnetData?.length) {
      createQueryArray.push(
        JoiningDocument.bulkCreate(joiningDocumnetData, {
          hooks: false,
          transaction,
        }),
      );
    }

    await Promise.all(createQueryArray);
  } catch (error) {
    throw new Error('Error in Get Create array ' + error.message);
  }
}

function designationWiseDocumentProcess(
  formData,
  files,
  userMasterID,
  createBy,
  createByIp,
) {
  try {
    const entryCount = Object.keys(formData).filter((key) =>
      key.startsWith('joiningDocumentMasterID'),
    ).length;
    const joiningDocumnetData = [];
    let attachmentIndex = 0;

    for (let i = 0; i < entryCount; i++) {
      joiningDocumnetData.push({
        userMasterID,
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
        createByIp,
      });

      if (formData[`isChanged${i}`] != '0') {
        attachmentIndex++;
      }
    }
    return joiningDocumnetData || [];
  } catch (error) {
    throw new Error(
      'Error in Designation Wise Document Process ' + error.message,
    );
  }
}

async function addWeekoffHolidayWithSalaryPolicy(
  companyMasterID,
  weekOffPolicyID,
  holidayPolicyID,
  salaryPolicyID,
  userMasterID,
  joiningDate,
  createBy,
  createByIp,
  transaction,
) {
  try {
    const createQueryArray = [];
    let salaryPolicy = null;

    let salaryPolicyApplicableDate = moment(joiningDate, 'YYYY-MM-DD')
      .startOf('month')
      .format('YYYY-MM-DD');
    // ------------------- salary Policy ------------------

    if (salaryPolicyID) {
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
            userMasterID,
            salaryPolicyID,
            startDate: salaryPolicyApplicableDate,
            createBy,
            createByIp,
          },
          { transaction },
        ),
      );
    }

    // ---------------- WEEK OFF ----------------
    if (weekOffPolicyID) {
      createQueryArray.push(
        EmployeeWeekOff.create(
          {
            userMasterID,
            weekOffPolicyID,
            applicableDate: salaryPolicyApplicableDate,
            createBy,
            createByIp,
          },
          { transaction },
        ),
      );

      await add_WeekOffHoliday_With_Transaction(
        companyMasterID,
        [userMasterID],
        salaryPolicyApplicableDate || '',
        +weekOffPolicyID,
        null,
        false,
        null,
        transaction,
      );
    }

    // ---------------- HOLIDAY ----------------
    if (holidayPolicyID) {
      const holiday_Policy = await holidayPolicy.findOne({
        where: {
          holidayPolicyID,
        },
      });

      let holidayPolicyStartDate = moment();

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

      createQueryArray.push(
        EmployeeHolidayPolicy.create(
          {
            userMasterID,
            holidayPolicyID,
            applicableDate: new Date(currentYearStartDate).toISOString(),
            createBy,
            createByIp,
          },
          { transaction },
        ),
      );

      await add_WeekOffHoliday_With_Transaction(
        companyMasterID,
        [userMasterID],
        currentYearStartDate,
        null,
        holidayPolicyID,
        false,
        null,
        transaction,
      );
    }

    if (createQueryArray.length) {
      await Promise.all(createQueryArray);
    }
  } catch (error) {
    if (error instanceof CustomError) {
      throw error;
    } else {
      throw new Error(
        'Error in Add Weekoff / Holiday Policies: ' + error.message,
      );
    }
  }
}
async function addAttendancePolicy(
  attendancePolicyID,
  attendanceStartDate,
  userMasterID,
  createBy,
  createByIp,
  transaction,
) {
  try {
    // ---------------- ATTENDANCE ----------------
    if (attendancePolicyID && attendanceStartDate) {
      await EmployeeAttendancePolicy.create(
        {
          attendancePolicyID: +attendancePolicyID,
          userMasterID,
          startDate: new Date(attendanceStartDate),
          createBy,
          createByIp,
        },
        { transaction },
      );
    }
  } catch (error) {
    throw new Error('Error in Attendance Policies: ' + error.message);
  }
}

async function addLeavePolicy(
  leavePolicyID,
  leaveDate,
  userMasterID,
  transaction,
  userDetails,
) {
  try {
    if (
      leavePolicyID &&
      Array.isArray(leavePolicyID) &&
      leavePolicyID.length > 0
    ) {
      await empLeavePolicy.create(
        {
          userMasterID,
          employeeLeavePolicyID: leavePolicyID,
          applicableDate: leaveDate,
        },
        {
          transaction,
          user: userDetails,
        },
      );
    }
  } catch (error) {
    throw new Error('Error in Leave Policies: ' + error.message);
  }
}

async function createUserDocument(
  userMasterID,
  createBy,
  createByIp,
  adharCard,
  adharName,
  transaction,
) {
  await UserDocument.create(
    {
      userMasterID,
      documentListID: 1,
      createBy,
      createByIp,
      verifyStatus: 1,
      verifyBy: createBy,
      documentNumber: adharCard,
      nameOnDocument: adharName,
    },
    { transaction },
  );
}

async function addShift(
  shiftIds,
  shiftStartDate,
  userMasterID,
  createBy,
  createByIp,
  transaction,
) {
  try {
    // ----------------SHIFT ----------------
    if (Array.isArray(shiftIds) && shiftIds.length && shiftStartDate) {
      await EmployeeShift.create(
        {
          shiftsID: shiftIds,
          userMasterID,
          startDate: new Date(shiftStartDate),
          createBy,
          createByIp,
        },
        { transaction },
      );
    }
  } catch (error) {
    throw new Error('Error in Attendance Policies: ' + error.message);
  }
}

function getMonthStartDate(type) {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth(); // 0 = Jan, 11 = Dec

  if (type === weekoffTypeApplicableMonthTypes.PAST_MONTH) {
    month -= 1;
  } else if (type === weekoffTypeApplicableMonthTypes.UPCOMING_MONTH) {
    month += 1;
  }

  // Handle year change when moving past January or December
  if (month < 0) {
    month = 11;
    year -= 1;
  } else if (month > 11) {
    month = 0;
    year += 1;
  }

  return new Date(year, month, 1);
}
async function addUserAddress(
  houseNumber,
  houseName,
  landmark,
  area,
  cityMasterID,
  zipcode,
  districtID,
  localHouseNumber,
  localHouseName,
  localLandmark,
  localArea,
  localCityMasterID,
  localZipcode,
  localDistrictID,
  companyMasterID,
  userMasterID,
  createBy,
  createByIp,
  transaction,
) {
  try {
    const createQueryArray = [];
    if (
      houseNumber ||
      houseName ||
      landmark ||
      area ||
      cityMasterID ||
      zipcode ||
      districtID
    ) {
      const localLangAddress = await convertAddressToLocalAddress(
        companyMasterID,
        houseNumber,
        houseName,
        landmark,
        area,
        cityMasterID,
        zipcode,
      );
      createQueryArray.push(
        UserAddress.create(
          {
            userMasterID,
            addressType: addressTypes.PERMANENT,
            houseNumber,
            houseName,
            landmark,
            area,
            cityMasterID: cityMasterID ? cityMasterID : null,
            zipcode,
            createBy,
            createByIp,
            verifyStatus: 1,
            verifyBy: createBy,
            districtID: districtID ? districtID : null,
            localLangAddress,
          },
          { transaction },
        ),
      );
    }

    if (
      houseNumber ||
      houseName ||
      landmark ||
      area ||
      cityMasterID ||
      zipcode ||
      districtID
    ) {
      const localLangAddress = await convertAddressToLocalAddress(
        companyMasterID,
        houseNumber,
        houseName,
        landmark,
        area,
        cityMasterID,
        zipcode,
      );
      createQueryArray.push(
        UserAddress.create(
          {
            userMasterID,
            addressType: addressTypes.TEMPORARY,
            houseNumber: localHouseNumber,
            houseName: localHouseName,
            landmark: localLandmark,
            area: localArea,
            cityMasterID: localCityMasterID ? localCityMasterID : null,
            zipcode: localZipcode,
            createBy,
            createByIp,
            verifyStatus: 1,
            verifyBy: createBy,
            districtID: localDistrictID ? localDistrictID : null,
            localLangAddress,
          },
          { transaction },
        ),
      );
    }
    await Promise.all(createQueryArray);
  } catch (error) {
    throw new Error('Error in Add User Address ' + error.message);
  }
}

async function convertAddressToLocalAddress(
  companyMasterID,
  houseNumber,
  houseName,
  landmark,
  area,
  cityMasterID,
  zipcode,
) {
  let localLangAddress = null;
  try {
    if (convertNameToLocalName) {
      if (saveraCompanyIDs.includes(companyMasterID)) {
        try {
          let formatedAddress = '';
          formatedAddress += `${houseNumber},`;
          formatedAddress += `${houseName},`;
          formatedAddress += `${landmark},`;
          formatedAddress += `${area},`;

          if (cityMasterID) {
            const cityWiseData = await CityMaster.findOne({
              where: { cityMasterID: cityMasterID },
              attributes: ['cityName'],
              include: [
                {
                  required: true,
                  model: StateMaster,
                  attributes: ['stateName'],
                  include: [
                    {
                      required: true,
                      model: CountryMaster,
                      attributes: ['countryName'],
                    },
                  ],
                },
              ],
            });
            formatedAddress += `${cityWiseData.cityName},`;
            formatedAddress += `${cityWiseData.stateMaster.stateName},`;
            formatedAddress += `${cityWiseData.stateMaster.countryMaster.countryName}, `;
          }
          formatedAddress += `${zipcode}`;
          const translate = new Translate({
            key: process.env.GOOGLE_CLOUD_TRANSLATE_API_KEY,
          });

          const response = await translate.translate([formatedAddress], {
            from: 'en', // Explicitly specify English as the source
            to: 'mr',
            format: 'text',
            model: 'base',
          });

          // Extract transliterated values
          localLangAddress = response[0]?.[0] || null;
        } catch (error) {
          console.error('Error in translation:', error);
        }
      }
    }
  } catch {
    return localLangAddress || null;
  }
}

async function addSalaryStructureData(
  salaryStructureData,
  userMasterID,
  createBy,
  createByIp,
  transaction,
) {
  try {
    const parsedSalaryStructureData = JSON.parse(salaryStructureData);

    const salaryStructureArray = parsedSalaryStructureData.map((structure) => ({
      gradeSalaryStructureID: structure.gradeSalaryStructureID,
      EmployeeSalaryAmount: structure.EmployeeSalaryAmount,
      salaryFromYYYYMM: structure.salaryFromYYYYMM,
      stateid: structure.stateid,
      AmountIn: structure.AmountIn,
      ActualEmployeeSalaryAmount: structure.ActualEmployeeSalaryAmount,
      skillCategory: structure.skillCategory,
      corporationId: structure.corporationId,
      minWagesMasterId: structure.minWagesMasterId,
      userMasterID,
      createBy,
      createByIp,
    }));

    await HrSalaryMaster.bulkCreate(salaryStructureArray, {
      transaction,
    });
  } catch (error) {
    throw new Error('Error in Add Salary Structure ' + error.message);
  }
}

async function checkBiometricCodeAssignedUser(
  companyMasterID,
  biometricCode,
  biometricSerialNo,
) {
  try {
    const responseObj = {
      status: 200,
      message: '',
    };
    if (biometricSerialNo && biometricSerialNo.length) {
      const whereConditions = biometricSerialNo.map((serial) => ({
        biometricCode,
        [Sequelize.Op.and]: Sequelize.literal(
          `POSITION('${serial}' IN biometricSerialNo) > 0`,
        ),
      }));
      const findUserWithSameBiometricCode =
        await EmployeeJoiningDetails.findOne({
          where: whereConditions,
          include: [
            {
              required: true,
              model: UserMaster,
              where: {
                companyMasterId: companyMasterID,
                status: [0, 1],
              },
            },
          ],
        });
      if (findUserWithSameBiometricCode) {
        responseObj.status = 401;
        responseObj.message = `Biometric And Serial Numbers Are Already assigned to users`;
      }
    }
    return responseObj;
  } catch (error) {
    throw new Error(
      'Error in Add Check Biometric Code Assigned User ' + error.message,
    );
  }
}

const preBoardingQuery = async (
  preboardingID,
  updateBy,
  updateByIp,
  transaction,
) => {
  try {
    await Preboarding.update(
      { preboardingstatus: 'OnBoarded', updateBy, updateByIp },
      { where: { preboardingID: preboardingID }, transaction },
    );
  } catch (error) {
    throw new Error('Error in onboarding update ' + error.message);
  }
};

const getTimezoneForCompany = async (companyMasterID) => {
  let timezoneID = null;
  if (ProjectName == projectNamesList.PIH) {
    timezoneID = (await getTimezone()) || null;
  } else if (ProjectName == projectNamesList.MARS) {
    timezoneID = (await getTimezone()) || null;
  } else {
    const existCompanyData = await companyMaster.findOne({
      attributes: ['timezoneID'],
      where: {
        companyMasterID: companyMasterID,
      },
    });

    timezoneID = existCompanyData?.timezoneID || (await getTimezone()) || null;
  }
  return timezoneID;
};
