const UserMaster = require('../models/userMaster');
const sequelize = require('../config/database');
const message = require('../response_message/message');
const bcrypt = require('bcrypt');
const subscriptionPlan = require('../models/subscriptionPlan');
const EmployeeDepartment = require('../models/employeeDepartment');
const EmployeeDesignation = require('../models/employeeDesignation');
const EmployeeBranch = require('../models/employeeBranch');
const AppVersion = require('../models/appVersion');
const EmployeeAdress = require('../models/userAddress');
const UserTracking = require('../models/userTracking');
const {
  sendEmailForOtp,
  sendEmailForTwoFactorAuthOtp,
} = require('../middleware/sendemail');
const Sequelize = require('sequelize');
const FormMaster = require('../models/formMaster');
const Visit = require('../models/visit');
const Customer = require('../models/customer');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const companyMaster = require('../models/companyMaster');
const operation = require('../models/operation');
const {
  checkDate,
  getFormattedMonthDay,
  formatDateMonthInWords,
  asiaKolkataDateTime,
  isStrongPassword,
} = require('../utils/commonUtilFunctions');
const { statusCodes, customClientTypes } = require('../utils/commonVars');
const Designation = require('../models/designation');
const Department = require('../models/department');
const BranchMaster = require('../models/branchMaster');
const CityMaster = require('../models/citymaster');
const Tracking = require('../models/tracking');
const RolePermission = require('../models/rolePermission');
const UserRole = require('../models/userRole');
const EmployeeAttendancePolicy = require('../models/employeeAttendancePolicy');
const AttendancePolicy = require('../models/attendancePolicy');
const CustomizeProfile = require('../models/customizeProfile');
const {
  adminSideUserTypesArray,
  customerListPreferenceTypes,
} = require('../utils/dbUtils');
const axios = require('axios');
const {
  ProjectName,
  projectNamesList,
  TIMEZONE,
} = require('../utils/labelUtils');
const DeviceType = require('../models/deviceType');
const Timezone = require('../models/timezone');
const Inquiries = require('../models/inquiries');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const UserExpenseTransaction = require('../models/userExpenseTransaction');
const UserExpense = require('../models/userExpense');
const { getJwtTokenData } = require('../utils/jsonwebtoken.utils');
const PIP = require('../models/pip');
const { authenticator } = require('otplib');
const { decryptMFASecretCode } = require('../utils/encryptDecrypt');
const validator = require('validator');
const crypto = require('crypto');
const { decryptText } = require('../utils/encryptDecrypt');
const { bucketName, mainApiUrl } = require('../utils/labelUtils');
const {
  setCookieInResponse,
  clearCookieInResponse,
} = require('../utils/authCookie.utils');
const { sendForbidden } = require('../middleware/tokenverify');

exports.webLoginWithMobileNumberOnly = async (req, res, next) => {
  const {
    phone,
    password,
    companyCode,
    employeeCode,
    companyMasterID,
    isLoginWithEmployeeCode = false,
  } = req.body;
  const currDate = asiaKolkataDateTime(new Date()).slice(0, 10);
  if (isLoginWithEmployeeCode) {
    if (!companyCode || !employeeCode || !password) {
      return res.status(200).json({
        status: 501,
        message: message.usermessage.invalidUserCredentials,
      });
    }
  } else {
    if (!phone || !password) {
      return res.status(200).json({
        status: 501,
        message: message.usermessage.invalidUserCredentials,
      });
    }
  }

  try {
    let findUserData = null;

    // =========================================================
    // LOGIN WITH MOBILE NUMBER
    // =========================================================
    if (!isLoginWithEmployeeCode) {
      const companyCondition = { status: 1 };
      if (companyMasterID) companyCondition.companyMasterID = companyMasterID;
      const findUsers = await UserMaster.findAll({
        subQuery: false,
        where: {
          status: 1,
          userNumber: phone,
        },
        include: [
          {
            model: companyMaster,
            where: companyCondition,
            include: [
              {
                model: Timezone,
                attributes: ['timezone'],
              },
            ],
          },
          {
            model: EmployeeJoiningDetails,
            attributes: ['joiningDate', 'leavingDate', 'employeeCode'],
          },
          {
            model: Timezone,
            attributes: ['timezone'],
          },
        ],
      });

      if (!findUsers.length) {
        return res.status(200).json({
          status: 501,
          message: message.usermessage.invalidUserCredentials,
        });
      }

      // CHECK PASSWORD FOR ALL USERS
      const matchedUsers = [];

      for (const user of findUsers) {
        const verifyUserPasswords = bcrypt.compareSync(password, user.password);

        if (verifyUserPasswords) {
          // ADMIN USERS
          if (adminSideUserTypesArray.includes(+user.admin)) {
            matchedUsers.push(user);
            continue;
          }
          const companyMasterData = user.companyMaster || null;
          const companymasterIDTOFindCompanySubscription =
            companyMasterData?.parentCompanyMasterID == 0
              ? companyMasterData?.companyMasterID
              : companyMasterData?.parentCompanyMasterID;

          const subscription_master = await subscriptionPlan.findOne({
            raw: true,
            where: {
              status: 1,
              companyMasterID: companymasterIDTOFindCompanySubscription,
            },
          });

          const subscriptionValid =
            subscription_master &&
            subscription_master.startDate <= currDate &&
            subscription_master.endDate >= currDate;

          matchedUsers.push(user);
        }
      }

      // NO PASSWORD MATCH
      if (!matchedUsers.length) {
        return res.status(200).json({
          status: 401,
          message: message.usermessage.invalidUserCredentials,
        });
      }

      // MULTIPLE USERS FOUND
      if (matchedUsers.length > 1) {
        const companyIDs = [];

        const companyList = matchedUsers
          .map((user) => {
            const companyMasterID = user.companyMaster?.companyMasterID || null;

            if (companyMasterID) {
              companyIDs.push(companyMasterID);
            }

            const companyData = user.companyMaster || null;
            return {
              companyMasterID,
              companyName: companyData?.companyName || '',
              uniqueCompanyCode: companyData?.uniqueCompanyCode || '',
              companyLogo: companyData?.companyLogo || '',
            };
          })
          .sort((a, b) => a.companyName.localeCompare(b.companyName));

        const token = await getJwtTokenData(
          {
            multiCompanyUser: true,
            companyIDs,
            phone,
            password,
            companies: companyList,
          },
          '15m',
        );

        setCookieInResponse(res, token);
        return res.status(200).json({
          status: 200,
          data: {
            token,
          },
        });
      }
      // SINGLE USER FOUND
      findUserData = matchedUsers?.[0] || null;
      if (!findUserData) {
        return res.status(200).json({
          status: 501,
          message: message.usermessage.invalidUserCredentials,
        });
      }
    } else {
      // =========================================================
      // LOGIN WITH EMPLOYEE CODE
      // =========================================================
      let userWhereCondition = {
        status: 1,
        '$employeeJoiningDetails.employeeCode$': employeeCode,
      };

      findUserData = await UserMaster.findOne({
        subQuery: false,
        where: userWhereCondition,
        include: [
          {
            model: companyMaster,
            where: {
              status: 1,
              ...(companyCode ? { uniqueCompanyCode: companyCode } : {}),
            },
            include: [
              {
                model: Timezone,
                attributes: ['timezone'],
              },
            ],
          },
          {
            model: EmployeeJoiningDetails,
            attributes: ['joiningDate', 'leavingDate', 'employeeCode'],
          },
          {
            model: Timezone,
            attributes: ['timezone'],
          },
        ],
      });

      if (!findUserData) {
        return res.status(200).json({
          status: 501,
          message: message.usermessage.invalidUserCredentials,
        });
      }

      const verifyUserPasswords = bcrypt.compareSync(
        password,
        findUserData.password,
      );

      if (!verifyUserPasswords) {
        return res.status(200).json({
          status: 400,
          message: message.usermessage.invalidUserCredentials,
        });
      }
    }
    const checkUserTwoFactorAuthEnable = await getUserTwoFactorAuthToken({
      userData: findUserData,
      password,
    });
    if (checkUserTwoFactorAuthEnable.isTwoFactorEnabled) {
      setCookieInResponse(res, checkUserTwoFactorAuthEnable.token);
      return res.status(200).json({
        status: 200,
        data: {
          token: checkUserTwoFactorAuthEnable.token,
        },
      });
    }
    const loginResponse = await commonWebLoginFlow(findUserData, res);
    return res.status(200).json(loginResponse);
  } catch (err) {
    next(err);
  }
};

exports.webLoginWithMobileNumberOrEmployeeCode = async (req, res, next) => {
  const { employeeCode, password } = req.body;
  if (!employeeCode || !password) {
    return res.status(200).json({
      status: 501,
      message: message.usermessage.invalidUserCredentials,
    });
  }
  try {
    let employeeCode = req.body.employeeCode.toLowerCase();
    const currDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const findUserData = await UserMaster.findOne({
      where: {
        status: 1,
        [Sequelize.Op.or]: [
          sequelize.where(
            sequelize.fn(
              'LOWER',
              sequelize.col('employeeJoiningDetails.employeeCode'),
            ),
            sequelize.fn('LOWER', employeeCode),
          ),
          { userNumber: employeeCode },
        ],
      },
      subQuery: false,
      include: [
        {
          model: companyMaster,
          where: { status: 1 },
          include: [{ model: Timezone, attributes: ['timezone'] }],
        },
        { model: Timezone, attributes: ['timezone'] },
        { model: EmployeeJoiningDetails },
      ],
    });
    if (!findUserData) {
      return res.status(200).json({
        status: 501,
        message: message.usermessage.notFoundMessage('User'),
      });
    }

    const verifyUserPasswords = bcrypt.compareSync(
      password,
      findUserData.password,
    );
    if (!verifyUserPasswords) {
      return res.status(200).json({
        status: 400,
        message: message.usermessage.invalidUserCredentials,
      });
    }
    const loginResponse = await commonWebLoginFlow(findUserData, res);
    return res.status(200).json(loginResponse);
  } catch (err) {
    next(err);
  }
};

exports.mobileLoginWithMobileNumberOnly = async (req, res, next) => {
  const {
    phone,
    password,
    companyCode,
    employeeCode,
    isLoginWithEmployeeCode = false,
    firebaseToken,
    uniqueID,
    tracking,
  } = req.body;
  if (isLoginWithEmployeeCode) {
    if (!companyCode || !employeeCode || !password) {
      return res.status(200).json({
        status: 501,
        message: message.usermessage.invalidUserCredentials,
        data: {},
      });
    }
  } else {
    if (!phone || !password) {
      return res.status(200).json({
        status: 501,
        message: message.usermessage.invalidUserCredentials,
        data: {},
      });
    }
  }

  try {
    const currDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    let findUserData = null;
    // =========================================================
    // LOGIN WITH MOBILE NUMBER
    // =========================================================
    if (!isLoginWithEmployeeCode) {
      const findUsers = await UserMaster.findAll({
        subQuery: false,
        where: {
          status: 1,
          userNumber: phone,
        },
        include: [
          {
            model: companyMaster,
            where: {
              status: 1,
            },
            include: [
              {
                model: Timezone,
                attributes: ['timezone'],
              },
            ],
          },
          { required: false, model: UserRole, attributes: ['roleMasterID'] },
          {
            model: EmployeeJoiningDetails,
            attributes: ['joiningDate', 'leavingDate', 'employeeCode'],
          },
          {
            model: Timezone,
            attributes: ['timezone'],
          },
        ],
      });
      if (!findUsers.length) {
        return res.status(200).json({
          status: 501,
          message: message.usermessage.invalidUserCredentials,
          data: {},
        });
      }

      // CHECK PASSWORD FOR ALL USERS
      const matchedUsers = [];

      for (const user of findUsers) {
        const verifyUserPasswords = bcrypt.compareSync(password, user.password);

        if (verifyUserPasswords) {
          // ADMIN USERS
          if (adminSideUserTypesArray.includes(+user.admin)) {
            matchedUsers.push(user);
            continue;
          }
          const companyMasterData = user.companyMaster || null;
          const companymasterIDTOFindCompanySubscription =
            companyMasterData?.parentCompanyMasterID == 0
              ? companyMasterData?.companyMasterID
              : companyMasterData?.parentCompanyMasterID;

          const subscription_master = await subscriptionPlan.findOne({
            raw: true,
            where: {
              status: 1,
              companyMasterID: companymasterIDTOFindCompanySubscription,
            },
          });

          const subscriptionValid =
            subscription_master &&
            subscription_master.startDate <= currDate &&
            subscription_master.endDate >= currDate;

          if (subscriptionValid) {
            matchedUsers.push(user);
          }
        }
      }

      // NO PASSWORD MATCH
      if (!matchedUsers.length) {
        return res.status(200).json({
          status: 401,
          message: message.usermessage.invalidUserCredentials,
          data: {},
        });
      }

      // MULTIPLE USERS FOUND
      if (matchedUsers.length > 1) {
        const companyIDs = [];

        const companyList = matchedUsers
          .map((user) => {
            const companyMasterID = user.companyMaster?.companyMasterID || null;

            if (companyMasterID) {
              companyIDs.push(companyMasterID);
            }
            const companyData = user.companyMaster || null;
            return {
              companyMasterID,
              companyName: companyData?.companyName || '',
              uniqueCompanyCode: companyData?.uniqueCompanyCode || '',
              companyLogo: companyData?.companyLogo || '',
            };
          })
          .sort((a, b) => a.companyName.localeCompare(b.companyName));

        const token = await getJwtTokenData(
          {
            multiCompanyUser: true,
            companyIDs,
            phone,
            password,
            companies: companyList,
          },
          '15m',
        );

        return res.status(200).json({
          status: 200,
          data: {
            token,
          },
        });
      }
      // SINGLE USER FOUND
      findUserData = matchedUsers?.[0] || null;
      if (!findUserData) {
        return res.status(200).json({
          status: 501,
          message: message.usermessage.invalidUserCredentials,
          data: {},
        });
      }
    } else {
      // =========================================================
      // LOGIN WITH EMPLOYEE CODE
      // =========================================================
      let userWhereCondition = {
        status: 1,
        '$employeeJoiningDetails.employeeCode$': employeeCode,
      };
      findUserData = await UserMaster.findOne({
        subQuery: false,
        where: userWhereCondition,
        include: [
          {
            model: companyMaster,
            where: {
              status: 1,
              ...(companyCode ? { uniqueCompanyCode: companyCode } : {}),
            },
            include: [
              {
                model: Timezone,
                attributes: ['timezone'],
              },
            ],
          },
          { required: false, model: UserRole, attributes: ['roleMasterID'] },
          {
            model: EmployeeJoiningDetails,
            attributes: ['joiningDate', 'leavingDate', 'employeeCode'],
          },
          {
            model: Timezone,
            attributes: ['timezone'],
          },
        ],
      });
      if (!findUserData) {
        return res.status(200).json({
          status: 501,
          message: message.usermessage.invalidUserCredentials,
          data: {},
        });
      }
    }
    const checkUserTwoFactorAuthEnable = await getUserTwoFactorAuthToken({
      userData: findUserData,
      password,
    });
    if (checkUserTwoFactorAuthEnable.isTwoFactorEnabled) {
      return res.status(200).json({
        status: 200,
        data: {
          token: checkUserTwoFactorAuthEnable.token,
        },
      });
    }
    const loginResponse = await commonMobileLoginFlow(
      findUserData,
      firebaseToken,
      uniqueID,
      tracking,
    );
    return res.status(200).json(loginResponse);
  } catch (err) {
    next(err);
  }
};

exports.mobileLoginWithMobileNumberOrEmployeeCode = async (req, res, next) => {
  const { phone, password, firebaseToken, uniqueID, tracking } = req.body;

  if (!phone || !password)
    return res.status(200).json({
      status: 501,
      message: message.usermessage.invalidUserCredentials,
      data: {},
    });
  try {
    let employeeCode = phone.toLowerCase();
    const currDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const findUserData = await UserMaster.findOne({
      where: {
        status: 1,
        [Sequelize.Op.or]: [
          sequelize.where(
            sequelize.fn(
              'LOWER',
              sequelize.col('employeeJoiningDetails.employeeCode'),
            ),
            sequelize.fn('LOWER', employeeCode),
          ),
          { userNumber: phone },
        ],
      },
      subQuery: false,
      include: [
        {
          model: companyMaster,
          where: { status: 1 },
          include: [
            {
              model: Timezone,
              attributes: ['timezone'],
            },
          ],
        },
        { model: EmployeeJoiningDetails },
        { required: false, model: UserRole },
        {
          model: Timezone,
          attributes: ['timezone'],
        },
      ],
    });
    if (!findUserData) {
      return res.status(200).json({
        status: 501,
        message: message.usermessage.notFoundMessage('User'),
        data: {},
      });
    }
    const verifyUserPasswords = bcrypt.compareSync(
      password,
      findUserData.password,
    );
    if (!verifyUserPasswords) {
      return res.status(200).json({
        status: 400,
        message: message.usermessage.invalidUserCredentials,
        data: {},
      });
    }
    const loginResponse = await commonMobileLoginFlow(
      findUserData,
      firebaseToken,
      uniqueID,
      tracking,
    );
    return res.status(200).json(loginResponse);
  } catch (err) {
    next(err);
  }
};

exports.faceLoginWithMobileNumberOnly = async (req, res, next) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(200).json({
      status: 501,
      message: message.usermessage.invalidUserCredentials,
      data: {},
    });
  }
  try {
    const currDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const findUserData = await UserMaster.findOne({
      where: {
        userNumber: phone,
        status: 1,
      },
      include: [
        { model: companyMaster, where: { status: 1 } },
        { required: false, model: UserRole },
      ],
    });

    if (!findUserData) {
      return res.status(200).json({
        status: 501,
        message: message.usermessage.notFoundMessage('User'),
        data: {},
      });
    }

    if (adminSideUserTypesArray.includes(+findUserData.admin)) {
      return res.status(200).json({
        status: 401,
        message: 'You dont have rights for mobile Login!!',
        data: {},
      });
    }

    const loginUserCompanyMasterID =
      +findUserData.companyMaster?.companyMasterID;
    const companyMasterID =
      findUserData.companyMaster.parentCompanyMasterID == 0
        ? findUserData.companyMaster.companyMasterID
        : findUserData.companyMaster.parentCompanyMasterID;

    const subscription_master = await subscriptionPlan.findOne({
      raw: true,
      where: {
        status: 1,
        companyMasterID: companyMasterID,
      },
    });

    if (!subscription_master) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.usersubscribeplan,
        data: {},
      });
    }
    const token = {
      usermasterid: findUserData.userMasterID,
      userType: findUserData.admin,
      companyMasterID: loginUserCompanyMasterID,
      parentCompanyMasterID:
        findUserData.companyMaster.parentCompanyMasterID == 0
          ? loginUserCompanyMasterID
          : findUserData.companyMaster.parentCompanyMasterID,
      passChangedCount: findUserData.passChangedCount,
    };
    const tokendata = await getJwtTokenData(token, '365d');
    const verifyUserPasswords = bcrypt.compareSync(
      password,
      findUserData.password,
    );
    const data = {
      token: tokendata,
      companyid: findUserData.companyMaster.companyMasterID,
      userid: findUserData.userMasterID,
      firstname: findUserData.firstName,
      middlename: findUserData.middleName ? findUserData.middleName : '',
      lastname: findUserData.lastName,
      userNumber: findUserData.userNumber,
      email: findUserData.email,
      resetpassword: findUserData.resetpassword,
    };

    if (
      subscription_master.startDate <= currDate &&
      subscription_master.endDate >= currDate
    ) {
      if (verifyUserPasswords) {
        const roleMasterID =
          findUserData.userRoles && findUserData.userRoles.length > 0
            ? findUserData.userRoles[0].roleMasterID
            : null;

        const user_right = await RolePermission.findOne({
          raw: true,
          where: {
            operationID: 4,
            roleMasterID,
            status: 1,
          },
          include: [
            {
              model: FormMaster,
              where: { formName: 'FaceAppLogin' },
              attributes: [],
            },
          ],
        });

        if (!user_right) {
          return res.status(200).json({
            status: 400,
            message: "You don't have rights to login in this application.",
            data: {},
          });
        }
        return res.status(200).json({
          status: 200,
          message: message.usermessage.userlogin,
          data: data,
        });
      } else {
        return res.status(200).json({
          status: 400,
          message: message.usermessage.invalidUserCredentials,
          data: {},
        });
      }
    }
  } catch (err) {
    next(err);
  }
};

exports.changepassword = async (req, res, next) => {
  const { body } = req;
  try {
    if (!isStrongPassword(req.body.newpassword)) {
      return res.status(200).json({
        status: statusCodes.BAD_REQUEST,
        message: message.errorMessage.STRONG_PASSWORD,
      });
    }
    const profile = await UserMaster.findOne({
      where: { userMasterID: body.userMasterID },
      include: [
        {
          model: companyMaster,
          attributes: ['companyMasterID', 'parentCompanyMasterID'],
        },
        {
          model: EmployeeJoiningDetails,
          attributes: ['joiningDate', 'leavingDate', 'employeeCode'],
        },
      ],
    });
    if (!profile) {
      return res.status(200).json({
        status: 400,
        message: message.usermessage.notFoundMessage('User'),
        data: {},
      });
    } else {
      if (bcrypt.compareSync(body.password, profile.password)) {
        if (body.password != body.newpassword) {
          const salt = await bcrypt.genSalt(10);
          profile.password = bcrypt.hashSync(req.body.newpassword, salt);
          profile.passChangedCount = profile.passChangedCount + 1;
          profile.save();

          const tokenData = getTokenData(profile, req.userDetails.apiCallFrom);
          const data = await getJwtTokenData(tokenData, '1d');
          setCookieInResponse(res, data);
          return res.status(200).json({
            status: 200,
            message: message.usermessage.passwordchange,
            data: data,
          });
        } else {
          return res.status(200).json({
            status: 400,
            message: message.usermessage.oldnewsame,
            data: {},
          });
        }
      } else {
        return res.status(200).json({
          status: 400,
          message: message.usermessage.oldwrong,
          data: {},
        });
      }
    }
  } catch (err) {
    next(err);
  }
};

exports.getprofile = async (req, res, next) => {
  try {
    const date = asiaKolkataDateTime(new Date()).slice(0, 10);
    const user_master = await UserMaster.findOne({
      where: {
        userMasterID: req.params.id,
        status: [0, 1],
      },
      order: [['userMasterID', 'DESC']],
      include: [
        { model: companyMaster },
        {
          model: EmployeeDesignation,
          as: 'employeeDesignations',
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(date) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(date) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
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
          as: 'employeeDepartments',
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(date) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(date) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
          include: [{ model: Department, as: 'department' }],
        },
        {
          model: EmployeeBranch,
          as: 'employeeBranches',
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(date) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date() } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
          include: [{ model: BranchMaster, as: 'branchMaster' }],
        },
        {
          model: EmployeeAdress,
          as: 'userAddresses',
          where: {
            addressType: 'permanent',
            status: 1,
          },
          required: false,
          include: [{ model: CityMaster }],
        },
        {
          model: EmployeeJoiningDetails,
          as: 'employeeJoiningDetails',
          where: {
            status: 1,
          },
          required: false,
          // include: [{ model: BankMaster }],
          attributes: ['dob', 'employeeCode'],
        },
        {
          model: PIP,
          as: 'employees',
          attributes: ['userMasterID'],
        },
      ],
    });

    if (!user_master) {
      return res.status(200).json({
        status: 400,
        message: message.usermessage.notFoundMessage('User'),
        data: {},
      });
    }

    const photo = user_master.photo
      ? `${process.env.APIURL}uploads/user/photo/${user_master.photo}`
      : '';
    const dobDetails = user_master.employeeJoiningDetails?.[0]?.dob || '';

    const data = {
      name: user_master.displayName,
      firstName: user_master.firstName,
      lastName: user_master.lastName,
      userNumber: user_master.userNumber,
      email: user_master.email,
      dob: dobDetails,
      employeeCode: user_master.employeeJoiningDetails?.[0]?.employeeCode || '',
      profile: photo,
      isPhotoLock: user_master.isPhotoLock,
      companyName: user_master.companyMaster
        ? user_master.companyMaster.companyName
        : '',
      designation:
        user_master.employeeDesignations &&
        user_master.employeeDesignations.length > 0
          ? user_master.employeeDesignations[0].designation.designationName
          : '',
      department:
        user_master.employeeDepartments &&
        user_master.employeeDepartments.length > 0
          ? user_master.employeeDepartments[0].department.departmentName
          : '',
      branch:
        user_master.employeeBranches && user_master.employeeBranches.length > 0
          ? user_master.employeeBranches[0].branchMaster.branchName
          : '',
      address:
        user_master.userAddresses && user_master.userAddresses.length > 0
          ? {
              houseNumber: user_master.userAddresses[0].houseNumber,
              houseName: user_master.userAddresses[0].houseName,
              landmark: user_master.userAddresses[0].landmark,
              area: user_master.userAddresses[0].area,
              zipcode: user_master.userAddresses[0].zipcode,
              city: user_master.userAddresses[0].cityMaster
                ? user_master.userAddresses[0].cityMaster.cityName
                : '',
            }
          : {},
      isPIP:
        user_master.employees && user_master.employees.length > 0
          ? true
          : false,
    };

    return res.status(200).json({
      status: 200,
      message: message.usermessage.getprofile,
      data: data,
    });
  } catch (err) {
    next(err);
  }
};

exports.editprofile = async (req, res, next) => {
  try {
    let photo;
    if (req.file) {
      photo = req.file.filename;
    } else {
      photo = '';
    }
    await UserMaster.update(
      {
        photo,
        isPhotoLock: 1,
        // updateBy:req.body.updateBy,
        // updateByIp:req.body.updateByIp
      },
      { where: { userMasterID: req.body.userMasterID } },
    );
    res.status(200).json({
      status: 200,
      message: message.usermessage.profileupdate,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

exports.forgot = async (req, res, next) => {
  const { mobile } = req.body;
  if (!mobile) {
    return res.status(200).json({
      status: 500,
      message: message.usermessage.emailvalid,
      data: {},
    });
  }
  try {
    const user = await UserMaster.findOne({
      where: {
        userNumber: mobile,
        status: 1,
      },
    });

    if (!user) {
      return res.status(200).json({
        status: 400,
        message: message.usermessage.notFoundMessage('User'),

        data: {},
      });
    } else {
      user.passwordToken = crypto.randomInt(1000, 10000);
      await user.save();
      data = {
        reset_password_token: user.passwordToken,
        email_id: user.email,
      };
      let data1 = { otp: user.passwordToken, mobile: mobile };
      res.json({
        status: 200,
        message: message.usermessage.passwordsentmail,
        data: data1,
      });
      await sendEmailForOtp(data);
    }
  } catch (err) {
    next(err);
  }
};

exports.changepasswordMultipleEmp = async (req, res, next) => {
  try {
    let { mobile, companyMasterID } = req.body;

    if (!isStrongPassword(req.body.new_password)) {
      return res.status(200).json({
        status: statusCodes.BAD_REQUEST,
        message: message.errorMessage.STRONG_PASSWORD,
      });
    }

    if (!mobile)
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ message: message.errorMessage.INVALID_FILTER_FIELDS });

    if (!companyMasterID)
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: message.usermessage.requiredMessage('companyMasterID'),
      });

    mobile = Array.isArray(mobile) ? mobile : [mobile];

    const salt = await bcrypt.genSalt(10);
    const newPassword = await bcrypt.hashSync(req.body.new_password, salt);

    await UserMaster.update(
      {
        password: newPassword,
        passChangedCount: sequelize.literal('"passChangedCount" + 1'),
        updateBy: req?.userDetails?.userMasterId,
        updateByIp: req?.userDetails?.userIpAddress,
      },
      {
        where: {
          userNumber: mobile,
          status: 1,
          companyMasterId: companyMasterID,
        },
      },
    );

    const currentUser = await UserMaster.findOne({
      where: {
        userMasterID: req?.userDetails?.userMasterId,
      },

      include: [
        {
          model: companyMaster,
          attributes: ['companyMasterID', 'parentCompanyMasterID'],
        },
        {
          model: EmployeeJoiningDetails,
          attributes: ['joiningDate', 'leavingDate', 'employeeCode'],
        },
      ],
    });

    let tokenData = null;
    if (mobile.includes(currentUser.userNumber)) {
      const data = getTokenData(currentUser, req.userDetails.apiCallFrom);
      tokenData = await getJwtTokenData(data, '1d');
    }

    return res.status(200).json({
      status: 200,
      message: message.usermessage.passwordchange,
      data: tokenData,
    });
  } catch (e) {
    next(e);
  }
};

exports.otpverifyandchangepassword = async (req, res, next) => {
  const { mobile, passwordToken, new_password, companyMasterID } = req.body;
  if (!isStrongPassword(new_password)) {
    return res.status(200).json({
      status: statusCodes.BAD_REQUEST,
      message: message.errorMessage.STRONG_PASSWORD,
    });
  }
  if (!mobile)
    return res
      .status(statusCodes.BAD_REQUEST)
      .json({ message: message.errorMessage.INVALID_FILTER_FIELDS });

  try {
    const whereCondition = {
      userNumber: mobile,
      status: 1,
    };

    if (companyMasterID) {
      whereCondition.companyMasterId = companyMasterID;
    }
    const userExist = await UserMaster.findOne({
      where: whereCondition,
    });
    if (!userExist) {
      return res.status(200).json({
        status: 500,
        message: message.usermessage.notFoundMessage('User'),

        data: {},
      });
    }

    if (
      userExist?.passwordTokenVerification == true &&
      userExist?.passwordToken == passwordToken
    ) {
      if (bcrypt.compareSync(new_password, userExist.password)) {
        return res.status(200).json({
          status: 501,
          message: message.usermessage.oldnewsame,
          data: {},
        });
      } else {
        const salt = await bcrypt.genSalt(10);
        userExist.password = await bcrypt.hashSync(new_password, salt);
        userExist.passwordTokenExpiry = null;
        userExist.passwordToken = null;
        userExist.passwordTokenVerification = null;
        userExist.passChangedCount = userExist.passChangedCount + 1;
        await userExist.save();
        return res.status(200).json({
          status: 200,
          message: message.usermessage.passwordchange,
          data: {},
        });
      }
    } else {
      return res.status(200).json({
        status: 501,
        message: message.usermessage.otpNotVerified,
        data: {},
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.dashboardcheck = async (req, res, next) => {
  try {
    const {
      userMasterID,
      deviceType,
      deviceModel,
      operatingSystem,
      appVersion,
      FirebaseToken,
    } = req.body;
    const date = asiaKolkataDateTime(new Date()).slice(0, 10);
    const userData = await UserMaster.findOne({
      where: {
        userMasterID: userMasterID,
        status: 1,
      },
      include: [
        {
          model: companyMaster,
          include: [{ required: false, model: CustomizeProfile }],
        },
        {
          separate: true,
          required: false,
          model: EmployeeAttendancePolicy,
          where: {
            userMasterID: userMasterID,
            status: 1,
            startDate: {
              [Sequelize.Op.lte]: new Date(date),
            },
            [Sequelize.Op.or]: [
              {
                endDate: { [Sequelize.Op.gte]: new Date(date) },
              },
              {
                endDate: { [Sequelize.Op.eq]: null },
              },
            ],
          },
          include: [{ model: AttendancePolicy, as: 'attendancePolicy' }],
        },
        {
          required: false,
          model: EmployeeJoiningDetails,
          attributes: ['biometricSerialNo', 'biometricCode', 'attendanceFrom'],
        },
        {
          model: DeviceType,
          limit: 1,
          order: [['createdAt', 'DESC']],
        },
      ],
    });

    if (!userData) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('User'),
        data: {},
      });
    }
    if (+userData.companyMaster.status == 0) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.companydeactive,
        data: {},
      });
    } else if (+userData.companyMaster.status == 2) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.companydeleted,
        data: {},
      });
    }
    const empJoining = userData.employeeJoiningDetails[0] || null;
    const companyMasterIDToFindSubscription =
      userData.companyMaster.parentCompanyMasterID == 0
        ? userData.companyMaster.companyMasterID
        : userData.companyMaster.parentCompanyMasterID;
    const customerListPreference =
      userData.companyMaster?.customerListPreference ||
      customerListPreferenceTypes.ALL_CUSTOMER;
    const subscription_master = await subscriptionPlan.findOne({
      raw: true,
      where: { status: 1, companyMasterID: companyMasterIDToFindSubscription },
    });

    if (
      !subscription_master ||
      subscription_master.startDate > date ||
      subscription_master.endDate < date
    ) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.usersubscribeplan,
        data: {},
      });
    }

    if (deviceType != 'web') {
      const appversion = await AppVersion.findOne({
        where: { deviceType },
      });
      const latestDeviceType = userData?.deviceTypes?.[0] || null;
      if (!latestDeviceType) {
        await DeviceType.create(
          {
            deviceType,
            deviceModel,
            operatingSystem,
            appVersion,
            userMasterID,
          },
          {
            user: req.userDetails,
          },
        );
      } else {
        if (
          latestDeviceType.deviceType != deviceType ||
          latestDeviceType.deviceModel != deviceModel ||
          latestDeviceType.operatingSystem != operatingSystem ||
          latestDeviceType.appVersion != appVersion
        ) {
          await DeviceType.create(
            {
              deviceType,
              deviceModel,
              operatingSystem,
              appVersion,
              userMasterID,
            },
            {
              user: req.userDetails,
            },
          );
        }
      }

      if (appversion.appVersion && appversion.appVersion != appVersion) {
        return res.status(200).json({
          status: 401,
          message: message.usermessage.versionnotmatch,
          data: {
            customizeProfileFields:
              userData?.companyMaster?.customizeProfiles?.[0]?.fields || [],
            customerListPreference: customerListPreference,
          },
        });
      }
      if (FirebaseToken || deviceType) {
        await UserMaster.update(
          {
            firebaseToken: FirebaseToken,
            deviceType: deviceType,
          },
          { where: { userMasterID } },
        );
      }
    }
    const trackingpermission = await UserTracking.findOne({
      where: {
        trackStatus: 1,
        userMasterID: userData.userMasterID,
      },
    });
    const employeeAttendancePolicyData =
      userData.employeeAttendancePolicies?.[0]?.attendancePolicy || null;
    const isPuncinRemarks =
      employeeAttendancePolicyData?.punchInRemarks || false;
    const isPunchOutRemarks =
      employeeAttendancePolicyData?.punchOutRemarks || false;
    const baseData = {
      tracking: !!trackingpermission,
      trackingInterval: trackingpermission?.trackingTime || null,
      statusMonitoring: trackingpermission?.statusMonitoring || null,
      expensesubmittedindays: userData.companyMaster.expenseDatePicker
        ? +userData.companyMaster.expenseDatePicker
        : null,
      attendancepolicy: employeeAttendancePolicyData,
      biometricSerialNo: empJoining?.biometricSerialNo || null,
      biometricCode: empJoining?.biometricCode || null,
      attendanceFrom: empJoining?.attendanceFrom || null,
      customizeProfileFields:
        userData?.companyMaster?.customizeProfiles?.[0]?.fields || [],
      punchInRemarks: isPuncinRemarks,
      punchOutRemarks: isPunchOutRemarks,
      customerListPreference: customerListPreference,
    };

    return res.status(200).json({
      status: 200,
      message: message.usermessage.fetchMessage('User Dashboard'),
      data: baseData,
    });
  } catch (err) {
    next(err);
  }
};

exports.visitCustomerExpenseDashBoard = async (req, res, next) => {
  try {
    function addQuotes(value) {
      var quotedVar = "'" + value + "'";
      return quotedVar;
    }
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    const [totalvisit, totalAmount, newcustomer] = await Promise.all([
      // Total Visit
      Visit.count({
        where: {
          [Sequelize.Op.and]: [
            {
              assignID: req.body.userMasterID,
            },
            {
              visitDate: currentDate,
            },
          ],
        },
        include: [
          {
            required: true,
            model: UserMaster,
            as: 'assign',
            where: { ...userAccessCondition.where },
            include: [...userAccessCondition.includeModels],
          },
        ],
      }),
      // Total Expense Amount
      UserExpenseTransaction.findOne({
        subQuery: false,
        attributes: [
          [
            Sequelize.fn(
              'COALESCE',
              Sequelize.fn('SUM', Sequelize.col('expenseAmount')),
              0,
            ),
            'totalAmount',
          ],
        ],
        include: [
          {
            required: true,
            model: UserExpense,
            as: 'userExpense',
            attributes: [],
            where: {
              userMasterID: req.body.userMasterID,
              expense_date: currentDate,
            },
            include: [
              {
                required: true,
                model: UserMaster,
                where: { ...userAccessCondition.where },
                include: [...userAccessCondition.includeModels],
                attributes: [],
              },
            ],
          },
        ],
        raw: true,
      }),
      // New Customer Count
      Customer.count({
        where: {
          [Sequelize.Op.and]: [
            {
              createBy: req.body.userMasterID,
            },
            Sequelize.where(
              sequelize.fn('date', sequelize.col('createdAt')),
              '=',
              currentDate,
            ),
          ],
        },
      }),
    ]);

    const data = [];
    data.push(
      { title: 'Total Visit', icon: 'iconsminds-embassy', value: totalvisit },
      {
        title: 'New Customer',
        icon: 'iconsminds-business-man',
        value: newcustomer,
      },
      {
        title: 'Total Expense',
        icon: 'iconsminds-money-bag',
        value: totalAmount?.totalAmount,
      },
    );
    return res.status(200).json({
      status: 200,
      data: data,
    });
  } catch (err) {
    next(err);
  }
};

exports.finalcheckpermission = async (req, res, next) => {
  try {
    const { userMasterID } = req.body;

    const userRole = await UserRole.findOne({
      where: {
        userMasterID,
      },
    });

    if (!userRole)
      return res.status(200).json({
        status: 401,
        message: 'User Role not found!',
      });

    const forms = await FormMaster.findAll();

    const userRights = await RolePermission.findAll({
      where: {
        // userMasterID: userMasterID,
        roleMasterID: userRole.roleMasterID,
        formMasterID: forms.map((form) => form.formMasterID),
      },
      include: [
        {
          model: FormMaster,
          attributes: ['formName'],
        },
        {
          model: operation,
          attributes: ['operationName'],
        },
      ],
    });

    let formNamesToFind = forms
      .filter((form) => {
        const userRight = userRights.find(
          (userRight) => userRight.formMasterID === form.formMasterID,
        );
        return userRight !== undefined;
      })
      .map((form) => ({
        formName: form.formName,
        formMasterID: form.formMasterID,
      }));

    const result = formNamesToFind.map((formData) => {
      const operationName = userRights
        .filter(
          (userRight) => userRight.formMaster.formName === formData.formName,
        )
        .map((userRight) => userRight.operation.operationName);

      return {
        ...formData,
        operationName,
      };
    });

    formNamesToFind = formNamesToFind.map((form) => form.formName);

    return res.status(200).json({
      status: 200,
      message: message.usermessage.userrightget,
      master: formNamesToFind,
      data3: formNamesToFind.length,
      data: result,
      resultlength: result.length,
    });
  } catch (e) {
    next(e);
  }
};

exports.resetpassword = async (req, res, next) => {
  const { body } = req;
  try {
    if (!isStrongPassword(req.body.newpassword)) {
      return res.status(200).json({
        status: statusCodes.BAD_REQUEST,
        message: message.errorMessage.STRONG_PASSWORD,
      });
    }
    const profile = await UserMaster.findOne({
      where: { userMasterID: body.userMasterID },
    });
    if (!profile) {
      return res.status(200).json({
        status: 400,
        message: message.usermessage.notFoundMessage('User'),

        data: {},
      });
    } else {
      if (bcrypt.compareSync(body.password, profile.password)) {
        if (body.password != body.newpassword) {
          const salt = await bcrypt.genSalt(10);
          profile.password = bcrypt.hashSync(req.body.newpassword, salt);
          profile.save();

          let change_resetStatus = await UserMaster.update(
            {
              resetpassword: 0,
            },
            { where: { userMasterID: body.userMasterID } },
          );

          return res.status(200).json({
            status: 200,
            message: message.usermessage.passwordchange,
            data: {},
          });
        } else {
          return res.status(200).json({
            status: 400,
            message: 'You can not set same previous password.',
            data: {},
          });
        }
      } else {
        return res.status(200).json({
          status: 400,
          message: 'Invalid old password.',
          data: {},
        });
      }
    }
  } catch (err) {
    next(err);
  }
};

exports.birthdayAnniversaryList = async (
  isBirthday,
  parentCompanyMasterID,
  companyMasterID,
  month,
) => {
  let companyId = [companyMasterID];
  if (+parentCompanyMasterID === 0) {
    const associatedCompanies = await companyMaster.findAll({
      where: { parentCompanyMasterID: companyMasterID, status: 1 },
      attributes: ['companyMasterID'],
      raw: true,
    });
    companyId = [
      ...associatedCompanies.map((company) => company.companyMasterID),
      ...[companyMasterID],
    ];
  }
  const key = isBirthday ? 'dob' : 'joiningDate';
  let query;
  if (month) {
    query = {
      [Sequelize.Op.and]: [
        {
          where: sequelize.where(
            sequelize.fn(
              'EXTRACT',
              sequelize.literal(
                `MONTH FROM "employeeJoiningDetails"."${key}"::date`,
              ),
            ), // Extract month from birthdate
            +month, // Match against the target month
          ),
        },
        {
          [Sequelize.Op.or]: [
            { leavingDate: null },
            { leavingDate: { [Sequelize.Op.gte]: new Date() } },
          ],
        },
      ],
    };
  } else {
    const currentDate = new Date();
    const currentMonthDay = getFormattedMonthDay(currentDate);

    const previousDate = new Date(currentDate);
    previousDate.setDate(currentDate.getDate() - 1);
    const previousMonthDay = getFormattedMonthDay(previousDate);

    const nextDate = new Date(currentDate);
    nextDate.setDate(currentDate.getDate() + 1);
    const nextMonthDay = getFormattedMonthDay(nextDate);

    query = {
      [Sequelize.Op.and]: [
        {
          [Sequelize.Op.or]: [
            sequelize.where(
              sequelize.fn(
                'SUBSTRING',
                sequelize.col(`employeeJoiningDetails.${key}`),
                6,
                5,
              ),
              '=',
              currentMonthDay,
            ),
            sequelize.where(
              sequelize.fn(
                'SUBSTRING',
                sequelize.col(`employeeJoiningDetails.${key}`),
                6,
                5,
              ),
              '=',
              previousMonthDay,
            ),
            sequelize.where(
              sequelize.fn(
                'SUBSTRING',
                sequelize.col(`employeeJoiningDetails.${key}`),
                6,
                5,
              ),
              '=',
              nextMonthDay,
            ),
          ],
        },
        {
          [Sequelize.Op.or]: [
            { leavingDate: null },
            { leavingDate: { [Sequelize.Op.gte]: new Date() } },
          ],
        },
      ],
    };
  }

  const data = await UserMaster.findAll({
    where: {
      companyMasterId: {
        [Sequelize.Op.in]: companyId,
      },
      status: 1,
    },
    raw: true,
    attributes: [
      'userMasterID',
      'firstName',
      'middleName',
      'lastName',
      'displayName',
      'userNumber',
      'photo',
      'email',
    ],
    as: 'userMaster',
    include: {
      model: EmployeeJoiningDetails,
      where: {
        status: 1,
        ...query,
      },
      raw: true,
      attributes: [key, 'employeeCode'],
    },
  });

  data.forEach((element) => {
    element.day = checkDate(
      element[`employeeJoiningDetails.${key}`],
      !isBirthday,
    );
    if (isBirthday)
      element.birthdayInWord = formatDateMonthInWords(
        element[`employeeJoiningDetails.${key}`],
      );
  });
  return data;
};

exports.birthday = async (req, res, next) => {
  try {
    const birthdayList = await this.birthdayAnniversaryList(
      true,
      req.userDetails.parentCompanyMasterId,
      req.userDetails.companyMasterId,
    );
    return res.status(statusCodes.OK).json({
      message: message.usermessage.fetchMessage('Birthdays'),
      data: birthdayList,
      status: statusCodes.OK,
    });
  } catch (err) {
    next(err);
  }
};

exports.anniversary = async (req, res, next) => {
  try {
    const anniversaryList = await this.birthdayAnniversaryList(
      false,
      req.userDetails.parentCompanyMasterId,
      req.userDetails.companyMasterId,
    );
    return res.status(statusCodes.OK).json({
      message: message.usermessage.fetchMessage('Anniversaries'),
      data: anniversaryList,
      status: statusCodes.OK,
    });
  } catch (err) {
    next(err);
  }
};

exports.pageSearch = async (req, res, next) => {
  try {
    const { search } = req.query;
    const searchCondition = {};
    if (search)
      searchCondition.formName = { [Sequelize.Op.iLike]: `${search}%` };

    searchCondition.menuName = { [Sequelize.Op.ne]: null };

    const role = await UserRole.findOne({
      raw: true,
      where: {
        userMasterID: req.userDetails.userMasterId,
      },
      include: [
        {
          required: true,
          model: UserMaster,
          where: {
            admin: {
              [Sequelize.Op.notIn]: [2, 3],
            },
          },
          attributes: [],
        },
      ],
    });

    if (!role)
      return res.status(200).json({
        status: 401,
        message: 'User Role not found!',
        data: [],
      });

    const userRights = await RolePermission.findAndCountAll({
      where: {
        // userMasterID: req.userDetails.userMasterId,
        roleMasterID: role.roleMasterID,
      },
      attributes: [],
      include: [
        {
          model: FormMaster,
          attributes: ['formName', 'path', 'menuName'],
          where: searchCondition,
          include: [
            {
              model: FormMaster,
              as: 'parent',
              attributes: ['formName'],
            },
          ],
        },
        {
          model: operation,
          where: {
            [Sequelize.Op.or]: [
              { operationName: 'Show Menu' },
              { operationName: 'View' },
            ],
          },
          attributes: [],
        },
      ],
    });

    const serachResult = userRights.rows.map((item) => {
      if (!item.formMaster.parent) {
        item.formMaster.parent = {
          formName: item.formMaster.formName,
        };
      }

      return {
        formName: item.formMaster.formName,
        path:
          item.formMaster.formName == 'AttendanceCalculation' &&
          ProjectName == projectNamesList.PIH
            ? '/payrolls/png_attendance_cal'
            : item.formMaster.path,
        menuName: item.formMaster.menuName,
        parent: item.formMaster.parent.formName,
      };
    });

    return res.status(statusCodes.OK).json({
      message: message.usermessage.fetchMessage('Pages'),
      data: serachResult,
      count: userRights.count,
    });
  } catch (err) {
    next(err);
  }
};

exports.userLogout = async (req, res, next) => {
  try {
    const userMasterID = req.userDetails.userMasterId;
    const firebaseToken = null;
    const userData = await UserMaster.findOne({
      where: { userMasterID },
    });
    if (!userData) {
      return res.status(200).json({ status: 400, message: 'no user found' });
    }
    await UserMaster.update(
      {
        firebaseToken: firebaseToken,
      },
      { where: { userMasterID: userMasterID } },
    );
    if (req.userDetails.apiCallFrom == customClientTypes.WEB) {
      await UserMaster.update(
        { webTokenVersion: +userData.webTokenVersion + 1 },
        { where: { userMasterID } },
      );
    } else if (req.userDetails.apiCallFrom == customClientTypes.MOBILE) {
      await UserMaster.update(
        { appTokenVersion: +userData.appTokenVersion + 1 },
        { where: { userMasterID } },
      );
    }
    clearCookieInResponse(res);

    return res.status(200).json({
      status: 200,
      message: 'User logout Successfully',
    });
  } catch (err) {
    next(err);
  }
};

exports.forgotpasswordOtpMARS = async (req, res, next) => {
  const { mobile } = req.body;
  if (!mobile) {
    return res.status(200).json({
      status: 500,
      message: message.usermessage.mobileNumberValid,
    });
  }
  try {
    const user = await UserMaster.findOne({
      where: {
        userNumber: mobile,
        status: 1,
      },
    });

    if (!user) {
      return res.status(200).json({
        status: 400,
        message: message.usermessage.notFoundMessage('User'),
      });
    }
    const otpTobeSent = crypto.randomInt(1000, 10000);
    const now = new Date();
    const otpExpiry = new Date(now.getTime() + 10 * 60 * 1000);
    const params = new URLSearchParams();
    params.append('module', 'TRANS_SMS');
    params.append('apikey', process.env.MARS_FORGOT_OTP_API_KEY);
    params.append('to', mobile);
    params.append('from', 'MRSINT');
    params.append('peid', process.env.MARS_FORGOT_OTP_PEID);
    params.append('ctid', process.env.MARS_FORGOT_OTP_CTID);
    params.append('templatename', 'Forgot Password MiEye');
    params.append('var1', otpTobeSent);

    axios
      .post(process.env.MARS_FORGOT_OTP_API, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
      .then((response) => {})
      .catch((error) => {
        console.error(
          'Error sending SMS:',
          error.response ? error.response.data : error.message,
        );
      });

    user.passwordToken = otpTobeSent;
    user.passwordTokenExpiry = otpExpiry;
    await user.save();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.passwordsentMobile,
      data: { mobile: mobile },
    });
  } catch (err) {
    next(err);
  }
};

exports.checkPasswordTokenMARS = async (req, res, next) => {
  const { mobile, passwordToken } = req.body;
  if (!mobile) {
    return res.status(200).json({
      status: 500,
      message: message.usermessage.mobileNumberValid,
    });
  }
  try {
    const user = await UserMaster.findOne({
      where: {
        userNumber: mobile,
        status: 1,
      },
    });

    if (!user) {
      return res.status(200).json({
        status: 400,
        message: message.usermessage.notFoundMessage('User'),
      });
    }
    let verified = false;
    let responseMessage = message.usermessage.otpinvalid;
    if (user.passwordToken == passwordToken) {
      if (
        new Date() > new Date(user.passwordTokenExpiry) ||
        !user.passwordTokenExpiry
      ) {
        responseMessage = 'Otp Expired';
      } else {
        verified = true;
        responseMessage = message.usermessage.otpVerified;
        user.passwordTokenExpiry = null;
        user.passwordToken = null;
        await user.save();
      }
    } else if (!user.passwordToken) {
      responseMessage = 'Otp Expired';
    }

    return res.status(200).json({
      status: 200,
      message: responseMessage,
      data: { verified },
    });
  } catch (err) {
    next(err);
  }
};

exports.sendForgotPasswordOTP = async (req, res, next) => {
  const { mobile, companyMasterID = null } = req.body;
  if (!mobile) {
    return res.status(200).json({
      status: 500,
      message: message.usermessage.mobileNumberValid,
    });
  }
  try {
    const companyCondition = {};
    if (companyMasterID) companyCondition.companyMasterID = companyMasterID;

    const user = await UserMaster.findAll({
      where: {
        userNumber: mobile,
        status: 1,
      },
      include: [
        {
          model: companyMaster,
          attributes: [
            'otp',
            'companyMasterID',
            'companyName',
            'companyLogo',
            'uniqueCompanyCode',
          ],
          where: companyCondition,
        },
      ],
    });

    if (user?.length == 0) {
      return res.status(200).json({
        status: 400,
        message: message.usermessage.notFoundMessage('User'),
      });
    }

    if (user && user.length > 1) {
      const companyIDs = [];

      const companyList = user
        .map((currentUser) => {
          const companyMasterID =
            currentUser.companyMaster?.companyMasterID || null;

          if (companyMasterID) {
            companyIDs.push(companyMasterID);
          }

          const companyData = currentUser.companyMaster || null;
          return {
            companyMasterID,
            companyName: companyData?.companyName || '',
            uniqueCompanyCode: companyData?.uniqueCompanyCode || '',
            companyLogo: companyData?.companyLogo || '',
          };
        })
        .sort((a, b) => a.companyName.localeCompare(b.companyName));

      const token = await getJwtTokenData(
        {
          multiCompanyUser: true,
          companyIDs,
          companies: companyList,
        },
        '15m',
      );

      return res.status(200).json({
        status: 200,
        data: {
          token,
        },
      });
    }
    // Mask functions

    const finalUser = user?.[0];

    const today = asiaKolkataDateTime(new Date()).slice(0, 10);

    const oldDate = finalUser.otpDate;
    if (new Date(oldDate).getTime() == new Date(today).getTime()) {
      if (finalUser.forgotPasswordCount >= 100) {
        return res.status(200).json({
          status: 401,
          message: message.errorMessage.FORGOT_PASSWORD_LIMIT,
        });
      } else {
        const newCount = finalUser.forgotPasswordCount++;
        await UserMaster.update(
          { forgotPasswordCount: newCount },
          { where: { userMasterID: finalUser.userMasterID } },
        );
      }
    } else {
      const resetCount = 1;
      await UserMaster.update(
        { forgotPasswordCount: resetCount, otpDate: today },
        { where: { userMasterID: finalUser.userMasterID } },
      );
    }

    const otpTobeSent = crypto.randomInt(1000, 10000);
    const now = new Date();
    const otpExpiry = new Date(now.getTime() + 10 * 60 * 1000);
    const data = {
      reset_password_token: otpTobeSent,
      email_id: finalUser.email,
    };
    finalUser.passwordToken = otpTobeSent;
    finalUser.passwordTokenExpiry = otpExpiry;
    await finalUser.save();
    let displayMessage = '';
    let response_message = '';
    let verifyHeading = '';
    if (finalUser?.companyMaster?.otp) {
      const maskedMobile = maskMobile(mobile);

      if (ProjectName == projectNamesList.MARS) {
        displayMessage = `We have sent an OTP to mobile number ${maskedMobile}`;
        verifyHeading = `Verify Mobile Number`;
        const params = new URLSearchParams();
        params.append('module', 'TRANS_SMS');
        params.append('apikey', process.env.MARS_FORGOT_OTP_API_KEY);
        params.append('to', mobile);
        params.append('from', 'MRSINT');
        params.append('peid', process.env.MARS_FORGOT_OTP_PEID);
        params.append('ctid', process.env.MARS_FORGOT_OTP_CTID);
        params.append('templatename', 'Forgot Password MiEye');
        params.append('var1', otpTobeSent);

        axios
          .post(process.env.MARS_FORGOT_OTP_API, params.toString(), {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          })
          .then((response) => {})
          .catch((error) => {
            console.error(
              'Error sending SMS:',
              error.response ? error.response.data : error.message,
            );
          });
        response_message = message.usermessage.passwordsentMobile;
      } else if (ProjectName == projectNamesList.TANKHWA_PATRA) {
        displayMessage = `We have sent an OTP to mobile number ${maskedMobile}`;
        verifyHeading = `Verify Mobile Number`;
        const params = new URLSearchParams();
        params.append('uname', process.env.TANKHWA_PATRA_SMS_UNAME);
        params.append('pass', process.env.TANKHWA_PATRA_SMS_PASS);
        params.append('send', process.env.TANKHWA_PATRA_SMS_SEND);
        params.append('dest', mobile);
        params.append(
          'msg',
          `Your OTP for password reset is ${otpTobeSent}. It is valid for 10 minutes. Do not share this code with anyone. Tankhwa Patra by Mehta.`,
        );

        axios
          .post(process.env.TANKHWA_PATRA_SMS_API, params.toString(), {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          })
          .then((response) => {})
          .catch((error) => {
            console.error(
              'Error sending SMS:',
              error.response ? error.response.data : error.message,
            );
          });
        response_message = message.usermessage.passwordsentMobile;
      } else {
        if (!finalUser.email) {
          return res.status(200).json({
            status: 401,
            message: message.usermessage.notFoundMessage('Email'),
          });
        }
        const maskedEmail = maskEmail(finalUser.email);
        if (!maskedEmail) {
          return res.status(200).json({
            status: 401,
            message: 'Invalid email',
          });
        }
        displayMessage = `We have sent an OTP to your email ${maskedEmail}`;
        verifyHeading = `Verify Email`;
        sendEmailForOtp(data);
        response_message = message.usermessage.passwordsentmail;
      }
    } else {
      if (!finalUser.email) {
        return res.status(200).json({
          status: 401,
          message: message.usermessage.notFoundMessage('Email'),
        });
      }
      const maskedEmail = maskEmail(finalUser.email);
      if (!maskedEmail) {
        return res.status(200).json({
          status: 401,
          message: 'Invalid email',
        });
      }
      displayMessage = `We have sent an OTP to your email ${maskedEmail}`;
      verifyHeading = `Verify Email`;
      sendEmailForOtp(data);
      response_message = message.usermessage.passwordsentmail;
    }
    return res.status(200).json({
      status: 200,
      message: response_message,
      data: {
        mobile: mobile,
        displayMessage,
        verifyHeading,
        multiCompanyUser: false,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.checkPasswordToken = async (req, res, next) => {
  const { mobile, passwordToken, companyMasterID } = req.body;
  if (!mobile) {
    return res.status(200).json({
      status: 500,
      message: message.usermessage.mobileNumberValid,
    });
  }
  try {
    const whereCondition = {
      userNumber: mobile,
      status: 1,
    };

    if (companyMasterID) {
      whereCondition.companyMasterId = companyMasterID;
    }
    const user = await UserMaster.findOne({
      where: whereCondition,
    });

    if (!user) {
      return res.status(200).json({
        status: 400,
        message: message.usermessage.notFoundMessage('User'),
      });
    }
    let verified = false;
    let responseMessage = message.usermessage.otpinvalid;

    // No token found → expired
    if (!user.passwordToken) {
      responseMessage = 'Otp Expired';
    }
    // Token matches
    else if (user.passwordToken == passwordToken) {
      const isExpired =
        !user.passwordTokenExpiry ||
        new Date() > new Date(user.passwordTokenExpiry);

      if (isExpired) {
        responseMessage = 'Otp Expired';
      } else {
        verified = true;
        responseMessage = message.usermessage.otpVerified;
        // user.passwordTokenExpiry = null;
        // user.passwordToken = null;
        user.passwordTokenVerification = true;
        await user.save();
      }
    }

    return res.status(200).json({
      status: 200,
      message: responseMessage,
      data: { verified },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/v1/sendCreateCompanyOTP
 * Step 1 of the Create Company flow.
 * Accepts mobileNumber + email, generates a 4-digit OTP, upserts an
 * inquiries row keyed on mobileNumber, then emails the OTP.
 */
exports.sendCreateCompanyOTP = async (req, res, next) => {
  const { mobileNumber, email, companyName } = req.body;

  if (
    !companyName ||
    typeof companyName !== 'string' ||
    companyName.trim() === ''
  ) {
    return res.json({
      status: 400,
      message: 'Company Name is required',
      data: {},
    });
  }

  const normalizedMobileNumber = String(mobileNumber || '').trim();
  const normalizedEmail = String(email || '').trim();

  if (
    !normalizedMobileNumber ||
    !validator.isMobilePhone(normalizedMobileNumber, 'en-IN', {
      strictMode: false,
    })
  ) {
    return res.json({
      status: 400,
      message: message.usermessage.mobileNumberValid,
      data: {},
    });
  }

  if (!normalizedEmail || !validator.isEmail(normalizedEmail)) {
    return res.json({
      status: 400,
      message: message.usermessage.emailvalid,
      data: {},
    });
  }

  try {
    const inquiryData = await Inquiries.findOne({ where: { mobileNumber } });
    const isAllowedEdgeCase =
      inquiryData &&
      inquiryData.completedStep >= 2 &&
      inquiryData.completedStep < 5 &&
      inquiryData.companyMasterID;

    if (!isAllowedEdgeCase) {
      const existingCompany = await companyMaster.findOne({
        where: {
          [Sequelize.Op.or]: [
            { companyName: { [Sequelize.Op.iLike]: companyName.trim() } },
            { cpMobileNo: mobileNumber },
          ],
          status: [0, 1],
        },
      });

      if (existingCompany) {
        if (
          existingCompany.companyName &&
          existingCompany.companyName.toLowerCase() ===
            companyName.trim().toLowerCase()
        ) {
          return res.json({
            status: 400,
            message:
              'This company name is already registered. Please use a different name.',
            data: {},
          });
        }

        return res.json({
          status: 400,
          message:
            'This mobile number is already used for creating other company, try different mobile number.',
          data: {},
        });
      }
    }

    const otp = crypto.randomInt(1000, 10000);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Upsert: find an existing draft inquiry for this mobile or create one
    const [inquiry] = await Inquiries.findOrCreate({
      where: { mobileNumber },
      defaults: {
        mobileNumber,
        companyName: companyName.trim(),
        otpEmail: email,
        otpCode: otp,
        otpExpiry,
        otpVerified: false,
        otpAttempts: 0,
        completedStep: 0,
      },
    });

    // If the row already existed, update the OTP fields
    if (
      inquiry.otpVerified === true ||
      inquiry.otpCode !== otp ||
      inquiry.companyName !== companyName.trim()
    ) {
      await inquiry.update({
        companyName: companyName.trim(),
        otpEmail: email,
        otpCode: otp,
        otpExpiry,
        otpVerified: false,
        otpAttempts: 0,
      });
    }

    // Send the OTP via email
    await sendEmailForOtp({
      email_id: email,
      reset_password_token: otp,
    });

    return res.json({
      status: 200,
      message: message.usermessage.otpSentToEmail,
      data: { mobileNumber },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/v1/verifyCreateCompanyOTP
 * Step 2 of the Create Company flow.
 * Validates the OTP for the given mobileNumber and — on success —
 * issues a short-lived JWT containing { mobileNumber } that the frontend
 * must carry when loading the Create Company page.
 */
exports.verifyCreateCompanyOTP = async (req, res, next) => {
  const { mobileNumber, otp } = req.body;

  if (!mobileNumber || !/^[0-9]{10}$/.test(mobileNumber)) {
    return res.json({
      status: 400,
      message: message.usermessage.mobileNumberValid,
      data: {},
    });
  }
  if (!otp) {
    return res.json({
      status: 400,
      message: message.usermessage.otpinvalid,
      data: {},
    });
  }

  try {
    const inquiry = await Inquiries.findOne({ where: { mobileNumber } });

    if (!inquiry) {
      return res.json({
        status: 400,
        message: message.usermessage.notFoundMessage('Inquiry'),
        data: {},
      });
    }

    if (inquiry.otpAttempts >= 3) {
      return res.json({
        status: 400,
        message:
          'Maximum OTP verification attempts reached. Please request a new OTP.',
        data: { verified: false },
      });
    }

    // No OTP stored → expired or never sent
    if (!inquiry.otpCode) {
      return res.json({
        status: 400,
        message: 'OTP expired. Please request a new one.',
        data: { verified: false },
      });
    }

    // OTP mismatch
    if (+inquiry.otpCode !== +otp) {
      const attempts = (inquiry.otpAttempts || 0) + 1;
      await inquiry.update({ otpAttempts: attempts });

      if (attempts >= 3) {
        return res.json({
          status: 400,
          message:
            'Maximum OTP verification attempts reached. Please request a new OTP.',
          data: { verified: false },
        });
      }

      return res.json({
        status: 400,
        message: message.usermessage.otpinvalid,
        data: { verified: false },
      });
    }

    // OTP expired
    if (!inquiry.otpExpiry || new Date() > new Date(inquiry.otpExpiry)) {
      return res.json({
        status: 400,
        message: 'OTP expired. Please request a new one.',
        data: { verified: false },
      });
    }

    // Mark verified and clear OTP fields
    await inquiry.update({
      otpVerified: true,
      otpCode: null,
      otpExpiry: null,
    });

    // Issue a short-lived token scoped only to the Create Company flow
    const token = await getJwtTokenData({ mobileNumber }, '1h');
    return res.json({
      status: 200,
      message: message.usermessage.otpVerified,
      data: { verified: true, token, mobileNumber },
    });
  } catch (err) {
    next(err);
  }
};

function getTokenData(profile, apiCallFrom) {
  let timezone = null;
  if (
    ProjectName == projectNamesList.PIH ||
    ProjectName == projectNamesList.MARS
  ) {
    timezone = TIMEZONE;
  } else {
    timezone =
      profile.timezone?.timezone ||
      profile.companyMaster?.timezone?.timezone ||
      TIMEZONE;
  }

  const loginUserCompanyMasterID = +profile.companyMaster?.companyMasterID;
  const employeeJoiningData = profile.employeeJoiningDetails?.[0] || null;

  return {
    usermasterid: profile.userMasterID,
    userType: profile.admin,
    companyMasterID: loginUserCompanyMasterID,
    parentCompanyMasterID:
      profile.companyMaster?.parentCompanyMasterID == 0
        ? loginUserCompanyMasterID
        : profile.companyMaster?.parentCompanyMasterID,
    companySubscriptionData: {
      startDate: null,
      endDate: null,
    },
    joiningData: {
      leavingDate: employeeJoiningData?.leavingDate || null,
      joiningDate: employeeJoiningData?.joiningDate || null,
    },
    timezone: timezone,
    passChangedCount: profile.passChangedCount,
    isTwoFactorEnabled: Boolean(profile?.secretKey),
    webTokenVersion: profile.webTokenVersion,
    appTokenVersion: profile.appTokenVersion,
    apiCallFrom: apiCallFrom,
  };
}

exports.webMultiUserLoginWithMobileNumberOnly = async (req, res, next) => {
  const { companyMasterID } = req.body;
  const currDate = asiaKolkataDateTime(new Date()).slice(0, 10);
  const phone = req.tokenDetails?.phone || null;
  const password = req.tokenDetails?.password || null;
  if (!companyMasterID || !phone || !password) {
    return res.status(200).json({
      status: 501,
      message: message.usermessage.invalidUserCredentials,
    });
  }

  try {
    const findUserData = await UserMaster.findOne({
      subQuery: false,
      where: {
        status: 1,
        userNumber: phone,
        companyMasterId: companyMasterID,
      },
      include: [
        {
          model: companyMaster,
          where: {
            status: 1,
          },
          include: [
            {
              model: Timezone,
              attributes: ['timezone'],
            },
          ],
        },
        {
          model: EmployeeJoiningDetails,
          attributes: ['joiningDate', 'leavingDate', 'employeeCode'],
        },
        {
          model: Timezone,
          attributes: ['timezone'],
        },
      ],
    });

    if (!findUserData) {
      return res.status(200).json({
        status: 501,
        message: message.usermessage.invalidUserCredentials,
      });
    }

    const verifyUserPasswords = bcrypt.compareSync(
      password,
      findUserData.password,
    );

    if (!verifyUserPasswords) {
      return res.status(200).json({
        status: 400,
        message: message.usermessage.invalidUserCredentials,
      });
    }
    const checkUserTwoFactorAuthEnable = await getUserTwoFactorAuthToken({
      userData: findUserData,
      password,
    });
    if (checkUserTwoFactorAuthEnable.isTwoFactorEnabled) {
      setCookieInResponse(res, checkUserTwoFactorAuthEnable.token);
      return res.status(200).json({
        status: 200,
        data: {
          token: checkUserTwoFactorAuthEnable.token,
        },
      });
    }
    const loginResponse = await commonWebLoginFlow(findUserData, res);
    return res.status(200).json(loginResponse);
  } catch (err) {
    next(err);
  }
};

exports.mobileMultiUserLoginWithMobileNumberOnly = async (req, res, next) => {
  const { companyMasterID, firebaseToken, uniqueID, tracking } = req.body;
  const currDate = asiaKolkataDateTime(new Date()).slice(0, 10);
  const phone = req.tokenDetails?.phone || null;
  const password = req.tokenDetails?.password || null;
  if (!companyMasterID || !phone || !password) {
    return res.status(200).json({
      status: 501,
      message: message.usermessage.invalidUserCredentials,
    });
  }

  try {
    const currDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    // =========================================================
    // LOGIN WITH MOBILE NUMBER
    // =========================================================

    const findUserData = await UserMaster.findOne({
      subQuery: false,
      where: {
        status: 1,
        userNumber: phone,
        companyMasterId: companyMasterID,
      },
      include: [
        {
          model: companyMaster,
          where: {
            status: 1,
          },
          include: [
            {
              model: Timezone,
              attributes: ['timezone'],
            },
          ],
        },
        { required: false, model: UserRole, attributes: ['roleMasterID'] },
        {
          model: EmployeeJoiningDetails,
          attributes: ['joiningDate', 'leavingDate', 'employeeCode'],
        },
        {
          model: Timezone,
          attributes: ['timezone'],
        },
      ],
    });
    if (!findUserData) {
      return res.status(200).json({
        status: 501,
        message: message.usermessage.invalidUserCredentials,
      });
    }

    const verifyUserPasswords = bcrypt.compareSync(
      password,
      findUserData.password,
    );

    if (!verifyUserPasswords) {
      return res.status(200).json({
        status: 400,
        message: message.usermessage.invalidUserCredentials,
      });
    }
    const checkUserTwoFactorAuthEnable = await getUserTwoFactorAuthToken({
      userData: findUserData,
      password,
    });
    if (checkUserTwoFactorAuthEnable.isTwoFactorEnabled) {
      return res.status(200).json({
        status: 200,
        data: {
          token: checkUserTwoFactorAuthEnable.token,
        },
      });
    }
    const loginResponse = await commonMobileLoginFlow(
      findUserData,
      firebaseToken,
      uniqueID,
      tracking,
    );
    return res.status(200).json(loginResponse);
  } catch (err) {
    next(err);
  }
};

async function commonWebLoginFlow(userData, res) {
  try {
    // =========================================================
    // COMMON LOGIN FLOW
    // =========================================================
    const currDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const loginUserCompanyMasterID = +userData.companyMaster?.companyMasterID;
    const responseObj = {
      status: 200,
      message: message.usermessage.userlogin,
      data: {
        usermasterid: userData.userMasterID,
        userName: userData.userName,
        userNumber: userData.userNumber,
        email: userData.email,
        admin: userData.admin,
        childcompany:
          userData.companyMaster.parentCompanyMasterID == 0 ? true : false,
        companyMasterID: loginUserCompanyMasterID,
        resetpassword: userData.resetpassword,
      },
    };
    const tokenData = getTokenData(userData, customClientTypes.WEB);
    // =========================================================
    // ADMIN USER LOGIN
    // =========================================================
    if (adminSideUserTypesArray.includes(+userData.admin)) {
      const token = await getJwtTokenData(tokenData, '1d');
      setCookieInResponse(res, token);
      return responseObj;
    }
    // =========================================================
    // SUBSCRIPTION CHECK
    // =========================================================
    const companymasterIDTOFindCompanySubscription =
      userData.companyMaster.parentCompanyMasterID == 0
        ? loginUserCompanyMasterID
        : userData.companyMaster.parentCompanyMasterID;
    const subscription_master = await subscriptionPlan.findOne({
      raw: true,
      where: {
        status: 1,
        companyMasterID: companymasterIDTOFindCompanySubscription,
      },
    });
    const subscriptionValid =
      subscription_master &&
      subscription_master.startDate <= currDate &&
      subscription_master.endDate >= currDate;
    if (!subscriptionValid) {
      responseObj.status = 401;
      responseObj.message = message.usermessage.usersubscribeplan;
      return responseObj;
    }
    tokenData.companySubscriptionData.startDate = subscription_master.startDate;
    tokenData.companySubscriptionData.endDate = subscription_master.endDate;
    const token = await getJwtTokenData(
      { ...tokenData, multiCompanyUser: false },
      '1d',
    );
    setCookieInResponse(res, token);
    return responseObj;
  } catch (error) {
    throw error;
  }
}
async function commonMobileLoginFlow(
  userData,
  firebaseToken,
  uniqueID,
  tracking,
) {
  try {
    // =========================================================
    // COMMON LOGIN FLOW
    // =========================================================
    const currDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const responseObj = {
      status: 200,
      message: message.usermessage.userlogin,
      data: {
        token: null,
        companyid: userData.companyMaster.companyMasterID,
        userid: userData.userMasterID,
        firstname: userData.firstName,
        middlename: userData.middleName || '',
        lastname: userData.lastName,
        userNumber: userData.userNumber,
        email: userData.email,
        resetpassword: userData.resetpassword,
      },
      Permission: [],
    };
    // =========================================================
    // ADMIN USER LOGIN
    // =========================================================
    if (adminSideUserTypesArray.includes(+userData.admin)) {
      responseObj.status = 401;
      responseObj.message = `You don't have rights for mobile Login!!`;
      return responseObj;
    }
    const loginUserCompanyMasterID = +userData.companyMaster?.companyMasterID;
    const tokenData = getTokenData(userData, customClientTypes.MOBILE);

    const companyMasterID =
      userData.companyMaster.parentCompanyMasterID == 0
        ? loginUserCompanyMasterID
        : userData.companyMaster.parentCompanyMasterID;
    const employeeJoiningData = userData.employeeJoiningDetails?.[0] || null;
    // =========================================================
    // SUBSCRIPTION CHECK
    // =========================================================
    const companymasterIDTOFindCompanySubscription =
      userData.companyMaster.parentCompanyMasterID == 0
        ? loginUserCompanyMasterID
        : userData.companyMaster.parentCompanyMasterID;
    const subscription_master = await subscriptionPlan.findOne({
      raw: true,
      where: {
        status: 1,
        companyMasterID: companymasterIDTOFindCompanySubscription,
      },
    });
    const subscriptionValid =
      subscription_master &&
      subscription_master.startDate <= currDate &&
      subscription_master.endDate >= currDate;
    if (!subscriptionValid) {
      responseObj.status = 401;
      responseObj.message = message.usermessage.usersubscribeplan;
      return responseObj;
    }
    tokenData.companySubscriptionData.startDate = subscription_master.startDate;
    tokenData.companySubscriptionData.endDate = subscription_master.endDate;
    responseObj.data.token = await getJwtTokenData(
      { ...tokenData, multiCompanyUser: false },
      '365d',
    );

    if (firebaseToken || uniqueID) {
      await UserMaster.update(
        {
          firebaseToken: firebaseToken,
          uniqueID: uniqueID,
        },
        {
          where: { userMasterID: userData.userMasterID },
        },
      );
    }
    const roleMasterID = userData.userRoles?.[0]?.roleMasterID || null;
    const userRights = await RolePermission.findAll({
      where: {
        roleMasterID: roleMasterID,
      },
      include: [
        {
          model: FormMaster,
          attributes: ['formName'],
          where: {
            formName: [
              'BirthdayList',
              'WorkAnniversaryList',
              'Chat',
              'HrDashboard',
            ],
          },
        },
        {
          model: operation,
          attributes: ['operationName'],
        },
      ],
    });
    responseObj.Permission = userRights;
    if (tracking) {
      tracking.userMasterID = userData.userMasterID;
      tracking.createBy = userData.userMasterID;
      await Tracking.create(tracking);
    }
    return responseObj;
  } catch (error) {
    throw error;
  }
}

async function getUserTwoFactorAuthToken({ userData, password }) {
  try {
    const tokenData = {
      isTwoFactorEnabled: Boolean(userData?.secretKey),
      userMasterID: userData.userMasterID,
      phone: userData.userNumber,
      password,
      companyMasterID: userData.companyMasterId,
    };
    return {
      token: tokenData?.isTwoFactorEnabled
        ? await getJwtTokenData(tokenData, '15m')
        : null,
      isTwoFactorEnabled: tokenData?.isTwoFactorEnabled || false,
    };
  } catch (error) {
    throw error;
  }
}

exports.webLoginTwoFactorAuth = async (req, res, next) => {
  const { mfaCode, isVerifyEmailAuth = false } = req.body;
  const companyMasterID = req.tokenDetails?.companyMasterID || null;

  if (!mfaCode || String(mfaCode).trim() === '' || !companyMasterID) {
    return res.status(200).json({
      status: 401,
      message: 'MFA Code is required.',
    });
  }
  if (String(mfaCode).trim().length !== 6) {
    return res.status(200).json({
      status: 401,
      message: 'Please provide a valid 6-digit MFA Code.',
    });
  }
  const currDate = asiaKolkataDateTime(new Date()).slice(0, 10);
  const phone = req.tokenDetails?.phone || null;
  const password = req.tokenDetails?.password || null;
  if (!companyMasterID || !phone || !password) {
    return res.status(200).json({
      status: 501,
      message: message.usermessage.invalidUserCredentials,
    });
  }

  try {
    const findUserData = await UserMaster.findOne({
      subQuery: false,
      where: {
        status: 1,
        userNumber: phone,
        companyMasterId: companyMasterID,
      },
      include: [
        {
          model: companyMaster,
          where: {
            status: 1,
          },
          include: [
            {
              model: Timezone,
              attributes: ['timezone'],
            },
          ],
        },
        {
          model: EmployeeJoiningDetails,
          attributes: ['joiningDate', 'leavingDate', 'employeeCode'],
        },
        {
          model: Timezone,
          attributes: ['timezone'],
        },
      ],
    });

    if (!findUserData) {
      return res.status(200).json({
        status: 501,
        message: message.usermessage.invalidUserCredentials,
      });
    }

    const verifyUserPasswords = bcrypt.compareSync(
      password,
      findUserData.password,
    );

    if (!verifyUserPasswords) {
      return res.status(200).json({
        status: 400,
        message: message.usermessage.invalidUserCredentials,
      });
    }
    const validateMfaCode = await checkTwoFactorAuthOtpFromMFaValidity({
      userData: findUserData,
      mfaCode: mfaCode,
      isVerifyEmailAuth: isVerifyEmailAuth,
    });
    if (!validateMfaCode.valid) {
      return res.status(200).json({
        status: 401,
        message: 'Incorrect or expired MFA Code.',
      });
    }
    const validatemailCode = await checkTwoFactorAuthOtpFromMailValidity({
      userData: findUserData,
      mfaCode: mfaCode,
      isVerifyEmailAuth: isVerifyEmailAuth,
    });
    if (!validatemailCode.valid) {
      return res.status(200).json({
        status: 401,
        message: validatemailCode.responseMessage,
      });
    }
    const loginResponse = await commonWebLoginFlow(findUserData, res);
    return res.status(200).json(loginResponse);
  } catch (err) {
    next(err);
  }
};
async function checkTwoFactorAuthOtpFromMFaValidity({
  userData,
  mfaCode,
  isVerifyEmailAuth,
}) {
  try {
    const secretKey = userData?.secretKey;

    if (isVerifyEmailAuth) {
      return { valid: true };
    }
    // 2FA is not enabled
    if (!secretKey) {
      return { valid: true };
    }

    // 2FA is enabled but no OTP was provided
    if (!mfaCode) {
      return { valid: false };
    }

    return {
      valid: authenticator.verify({
        token: String(mfaCode).trim(),
        secret: decryptMFASecretCode(secretKey),
      }),
    };
  } catch {
    return { valid: false };
  }
}
async function checkTwoFactorAuthOtpFromMailValidity({
  userData,
  mfaCode,
  isVerifyEmailAuth,
}) {
  let responseMessage = '';

  try {
    // Email-based 2FA is not required
    if (!isVerifyEmailAuth) {
      return {
        valid: true,
        responseMessage,
      };
    }

    const twoFactorToken = userData?.twoFactorToken;
    const twoFactorTokenExpiry = userData?.twoFactorTokenExpiry;

    // OTP or expiry is missing
    if (!twoFactorToken || !twoFactorTokenExpiry) {
      return {
        valid: false,
        responseMessage: 'OTP expired.',
      };
    }

    // Check OTP expiry
    const isExpired =
      Number.isNaN(new Date(twoFactorTokenExpiry).getTime()) ||
      new Date() > new Date(twoFactorTokenExpiry);

    if (isExpired) {
      return {
        valid: false,
        responseMessage: 'OTP expired.',
      };
    }

    // OTP was not provided
    if (
      mfaCode === undefined ||
      mfaCode === null ||
      String(mfaCode).trim() === ''
    ) {
      return {
        valid: false,
        responseMessage: 'OTP is required.',
      };
    }

    // Check OTP
    const isTokenValid =
      String(twoFactorToken).trim() === String(mfaCode).trim();

    if (!isTokenValid) {
      return {
        valid: false,
        responseMessage: 'Invalid OTP.',
      };
    }
    await UserMaster.update(
      {
        twoFactorToken: null,
        twoFactorTokenExpiry: null,
      },
      {
        where: {
          userMasterID: userData?.userMasterID,
        },
      },
    );

    return {
      valid: true,
      responseMessage: message.usermessage.otpVerified,
    };
  } catch (error) {
    return {
      valid: false,
      responseMessage: 'Unable to verify OTP.',
    };
  }
}
exports.mobileLoginTwoFactorAuth = async (req, res, next) => {
  const { firebaseToken, uniqueID, tracking, mfaCode, isVerifyEmailAuth } =
    req.body;
  const currDate = asiaKolkataDateTime(new Date()).slice(0, 10);
  const companyMasterID = req.tokenDetails?.companyMasterID || null;

  const phone = req.tokenDetails?.phone || null;
  const password = req.tokenDetails?.password || null;
  if (!companyMasterID || !phone || !password) {
    return res.status(200).json({
      status: 501,
      message: message.usermessage.invalidUserCredentials,
    });
  }
  if (!mfaCode || String(mfaCode).trim() === '') {
    return res.status(200).json({
      status: 401,
      message: 'MFA Code is required.',
    });
  }
  if (String(mfaCode).trim().length !== 6) {
    return res.status(200).json({
      status: 401,
      message: 'Please provide a valid 6-digit MFA Code.',
    });
  }
  try {
    const currDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    // =========================================================
    // LOGIN WITH MOBILE NUMBER
    // =========================================================

    const findUserData = await UserMaster.findOne({
      subQuery: false,
      where: {
        status: 1,
        userNumber: phone,
        companyMasterId: companyMasterID,
      },
      include: [
        {
          model: companyMaster,
          where: {
            status: 1,
          },
          include: [
            {
              model: Timezone,
              attributes: ['timezone'],
            },
          ],
        },
        { required: false, model: UserRole, attributes: ['roleMasterID'] },
        {
          model: EmployeeJoiningDetails,
          attributes: ['joiningDate', 'leavingDate', 'employeeCode'],
        },
        {
          model: Timezone,
          attributes: ['timezone'],
        },
      ],
    });
    if (!findUserData) {
      return res.status(200).json({
        status: 501,
        message: message.usermessage.invalidUserCredentials,
      });
    }

    const verifyUserPasswords = bcrypt.compareSync(
      password,
      findUserData.password,
    );

    if (!verifyUserPasswords) {
      return res.status(200).json({
        status: 400,
        message: message.usermessage.invalidUserCredentials,
      });
    }
    const validateMfaCode = await checkTwoFactorAuthOtpFromMFaValidity({
      userData: findUserData,
      mfaCode: mfaCode,
      isVerifyEmailAuth: isVerifyEmailAuth,
    });
    if (!validateMfaCode.valid) {
      return res.status(200).json({
        status: 401,
        message: 'Incorrect or expired MFA Code.',
      });
    }
    const validatemailCode = await checkTwoFactorAuthOtpFromMailValidity({
      userData: findUserData,
      mfaCode: mfaCode,
      isVerifyEmailAuth: isVerifyEmailAuth,
    });
    if (!validatemailCode.valid) {
      return res.status(200).json({
        status: 401,
        message: validatemailCode.responseMessage,
      });
    }
    const loginResponse = await commonMobileLoginFlow(
      findUserData,
      firebaseToken,
      uniqueID,
      tracking,
    );
    return res.status(200).json(loginResponse);
  } catch (err) {
    next(err);
  }
};
function maskEmail(email) {
  if (!email || typeof email !== 'string') return null;

  const normalizedEmail = email.trim();
  const atIndex = normalizedEmail.indexOf('@');

  // Ensure exactly one @ and valid name/domain parts
  if (
    atIndex <= 0 ||
    atIndex !== normalizedEmail.lastIndexOf('@') ||
    atIndex === normalizedEmail.length - 1
  ) {
    return null;
  }

  const name = normalizedEmail.slice(0, atIndex);
  const domain = normalizedEmail.slice(atIndex + 1);

  let maskedName;

  if (name.length <= 2) {
    maskedName = `${name.charAt(0)}***`;
  } else {
    maskedName = `${name.slice(0, 2)}***${name.slice(-1)}`;
  }

  const lastDotIndex = domain.lastIndexOf('.');
  let maskedDomain;

  if (lastDotIndex > 1 && lastDotIndex < domain.length - 1) {
    maskedDomain = `${domain.slice(0, 2)}***${domain.slice(lastDotIndex)}`;
  } else {
    maskedDomain = `${domain.slice(0, 2)}***`;
  }

  return `${maskedName}@${maskedDomain}`;
}

function maskMobile(number) {
  return number.replace(/(\d{2})\d+(\d{2})/, '$1****$2');
}
exports.sendForgotTwoFactorAuthOtp = async (req, res, next) => {
  try {
    const companyMasterID = req.tokenDetails?.companyMasterID || null;
    const mobile = req.tokenDetails?.phone || null;

    if (!mobile) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.mobileNumberValid,
      });
    }

    const user = await UserMaster.findOne({
      where: {
        userNumber: mobile,
        status: 1,
        companyMasterId: companyMasterID,
      },
      include: [
        {
          model: companyMaster,
          attributes: [
            'otp',
            'companyMasterID',
            'companyName',
            'companyLogo',
            'uniqueCompanyCode',
          ],
        },
      ],
    });

    if (!user) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('User'),
      });
    }

    if (!user.email) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Email'),
      });
    }

    const maskedEmail = maskEmail(user.email);

    if (!maskedEmail) {
      return res.status(200).json({
        status: 400,
        message: 'Invalid email address.',
      });
    }

    const otp = crypto.randomInt(100000, 1000000);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.twoFactorToken = otp;
    user.twoFactorTokenExpiry = otpExpiry;

    await user.save();

    const emailData = {
      otp,
      email_id: user.email,
      otp_expiry_minutes: 10,
      ProjectName: ProjectName,
    };

    const emailResult = await sendEmailForTwoFactorAuthOtp(emailData);

    if (!emailResult) {
      return res.status(200).json({
        status: 500,
        message: 'Unable to send OTP email. Please try again.',
      });
    }

    return res.status(200).json({
      status: 200,
      message: 'Two Factor Recovery code sent to your email.',
    });
  } catch (error) {
    next(error);
  }
};

exports.decryptDownloadToken = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(200).json({
        status: 400,
        message: 'Token is required.',
      });
    }

    let cleanToken = token;
    if (cleanToken.includes(' ')) {
      cleanToken = cleanToken.replace(/ /g, '+');
    }

    let decryptedPayload;
    try {
      decryptedPayload = decryptText(decodeURIComponent(cleanToken));
    } catch (decryptErr) {
      try {
        decryptedPayload = decryptText(cleanToken);
      } catch (err) {
        console.error('Decryption failed:', err);
        return res.status(200).json({
          status: 400,
          message: 'Invalid or expired token.',
        });
      }
    }

    if (!decryptedPayload) {
      return res.status(200).json({
        status: 400,
        message: 'Invalid token payload.',
      });
    }

    const payload = JSON.parse(decryptedPayload);
    const { filePath, isS3 } = payload;

    if (!filePath) {
      return res.status(200).json({
        status: 400,
        message: 'File path not found in token.',
      });
    }

    let downloadUrl = '';

    if (isS3) {
      const { getSignedS3Url } = require('../utils/s3.utils');
      downloadUrl = await getSignedS3Url(bucketName, filePath, 3600);
    } else {
      const baseApiUrl = mainApiUrl.endsWith('/')
        ? mainApiUrl
        : `${mainApiUrl}/`;
      downloadUrl = `${baseApiUrl}${filePath}`;
    }

    return res.status(200).json({
      status: 200,
      url: downloadUrl,
    });
  } catch (error) {
    next(error);
  }
};

exports.getCurrentUser = async (req, res, next) => {
  try {
    const tokenData = req.userDetails?.tokenData?.token;
    if (!tokenData || !tokenData.usermasterid) {
      sendForbidden({ res });
    }

    const userData = req.userDetails?.userData || null;

    if (!userData) {
      sendForbidden({ res });
    }

    const loginUserCompanyMasterID = +userData.companyMaster?.companyMasterID;

    return res.status(200).json({
      status: 200,
      data: {
        tokenData,
        usermasterid: userData.userMasterID,
        userName: userData.displayName,
        userNumber: userData.userNumber,
        email: userData.email,
        admin: userData.admin,
        childcompany:
          userData.companyMaster.parentCompanyMasterID == 0 ? true : false,
        companyMasterID: loginUserCompanyMasterID,
        resetpassword: userData.resetpassword,
      },
    });
  } catch (error) {
    next(error);
  }
};
