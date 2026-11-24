const erpAccountMaster = require('../models/erpAccountMaster');
const message = require('../response_message/message');
const Sequelize = require('sequelize');
const UserMaster = require('../models/userMaster');
const sql = require('mssql');
const erpIntegration = require('../models/erpIntegration');
const axios = require('axios');
const { companyMasterIDENUM } = require('../utils/dbUtils');
const { getErpDatabaseConfig } = require('../config/erpdatabase');
const { generateExcel } = require('../utils/exportData');
const { erpStoredProcedures, userAttributes } = require('../utils/commonVars');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const {
  asiaKolkataDateTime,
  parseEmployeeInfo,
  parseEmployeeInfoAlias,
} = require('../utils/commonUtilFunctions');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');
const moment = require('moment');
const companyMaster = require('../models/companyMaster');
const BankMaster = require('../models/bankMaster');
const UserAddress = require('../models/userAddress');
const CityMaster = require('../models/citymaster');
const StateMaster = require('../models/statemaster');
const CountryMaster = require('../models/countrymaster');

exports.geterpEmployeeMasterByCompanyID = async (req, res, next) => {
  try {
    let {
      limit,
      page,
      companyMasterID,
      userMasterID,
      exportData = false,
    } = req.body;
    const paginationQuery = {};
    if (page && limit && !exportData) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const userCondition = { companyMasterId: companyMasterID, status: 1 };
    if (userMasterID && userMasterID.length) {
      userCondition.userMasterID = {
        [Sequelize.Op.in]: userMasterID,
      };
    }

    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const { rows: findUserERpData, count } = await UserMaster.findAndCountAll({
      distinct: true,
      subQuery: false,
      where: userCondition,
      ...paginationQuery,
      order: [['displayName', 'ASC']],
      include: [
        {
          model: EmployeeJoiningDetails,
          as: 'emp_join',
          attributes: ['employeeCode'],
        },
        { model: companyMaster, attributes: ['companyName'] },
        {
          model: EmployeeBranch,
          as: 'emp_branch',
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
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
          as: 'emp_dept',
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
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
          model: EmployeeDesignation,
          as: 'emp_desig',
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
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
          model: EmployeeDivision,
          as: 'emp_div',
          where: {
            status: 1,
            startDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: ['divisionId', 'startDate'],
          include: [{ model: Division, attributes: ['divisionName'] }],
        },
        {
          required: false,
          model: EmployeeWorkingArea,
          as: 'emp_area',
          where: {
            status: 1,
            startDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: ['workingAreaId'],
          include: [{ model: WorkingArea, attributes: ['workingAreaName'] }],
        },
      ],
      attributes: [...userAttributes, 'AccountID'],
    });

    if (exportData) {
      const finalData = findUserERpData.map((e) => {
        return {
          'Employee Code': parseEmployeeInfoAlias(e)?.employeeCode,
          'Employee Name': e?.displayName,
          'Employee Number': e?.userNumber,
          Company: parseEmployeeInfoAlias(e)?.companyName,
          Branch: parseEmployeeInfoAlias(e)?.branch,
          Department: parseEmployeeInfoAlias(e)?.department,
          Designation: parseEmployeeInfoAlias(e)?.designation,
          Division: parseEmployeeInfoAlias(e)?.division,
          'Working Area': parseEmployeeInfoAlias(e)?.workingArea,
          'ERP Employee Master Account ID': e.AccountID,
        };
      });
      await generateExcel(finalData, 'Assetreport', 'xlsx', res);
      return;
    }
    return res
      .status(200)
      .json({ status: 200, data: findUserERpData, totalcount: count });
  } catch (err) {
    next(err);
  }
};

exports.linkERPEmployeeMasterAccount = async (req, res, next) => {
  try {
    let { userMasterID, companyMasterID } = req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const userCondition = { companyMasterId: companyMasterID };
    if (userMasterID) {
      userCondition.userMasterID = userMasterID;
    }
    const findUserData = await UserMaster.findAll({
      where: userCondition,
      include: [
        {
          required: false,
          model: EmployeeBranch,
          as: 'emp_branch',
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
          model: EmployeeDepartment,
          as: 'emp_dept',
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
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
          model: EmployeeDesignation,
          as: 'emp_desig',
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
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
          model: EmployeeJoiningDetails,
          as: 'emp_join',
          attributes: [
            'bankAccountNo',
            'bankIFSC',
            'nameAsBank',
            'bankMasterID',
            'bankAccountStatus',
            'joiningDate',
            'leavingDate',
            'dob',
          ],
          include: [
            {
              model: BankMaster,
              attributes: ['bankName'],
            },
          ],
        },
        {
          required: false,
          model: UserAddress,
          where: { addressType: 'permanent', status: 1, verifyStatus: 1 },
          include: [
            {
              model: CityMaster,
              attributes: ['cityMasterID', 'cityName'],
              include: [
                {
                  model: StateMaster,
                  attributes: ['stateMasterID', 'stateName'],

                  include: [
                    {
                      model: CountryMaster,
                      attributes: ['countryMasterID', 'countryName'],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      attributes: [
        'displayName',
        'userMasterID',
        'userNumber',
        'AccountID',
        'gender',
      ],
    });

    const erpConfig = getErpDatabaseConfig(companyMasterID);
    console.log(erpConfig, 'config');

    sql.connect(erpConfig, async function (err) {
      if (err) {
        sql.close();
        console.log(
          'Could not create ERP DB Connection!........................',
        );
        return res
          ?.status(200)
          .json({ status: 401, message: 'Could not create DB Connection!.' });
      }
      const results = await erpDatabaseAccountLinkProcess(
        findUserData,
        sql,
        'add',
        createBy,
        createByIp,
      );

      sql.close();
      if (results && results.length) {
        return res.status(200).json({
          status: results[0].status,
          message:
            results[0].status == 200
              ? 'Erp-Link Successfully'
              : results[0].message,
          results,
        });
      } else {
        return res.status(200).json({
          status: 401,
          message: 'Data Not Fetched',
          results,
        });
      }
    });
  } catch (err) {
    next(err);
  }
};

async function erpDatabaseAccountLinkProcess(
  userData,
  sql,
  linkType,
  createBy,
  createByIp,
) {
  const results = [];

  userLoop: for (const user of userData) {
    const resultObj = {
      userMasterID: user?.userMasterID,
      status: null,
      message: null,
      AccountID: null,
      result: null,
    };
    try {
      const employeeJoiningData = user.emp_join?.[0] || null;
      const userAddressData = user.userAddresses?.[0] || null;
      const userObj = {
        userMasterID: user.userMasterID,
        AccountName: user.displayName?.trim().toUpperCase() || '',
        BranchName: parseEmployeeInfoAlias(user)?.branch || '',
        Phone1: user.userNumber,
        AccountID: user.AccountID ? user.AccountID : 0,
        BankerName:
          +employeeJoiningData?.bankAccountStatus === 1
            ? employeeJoiningData.bankMaster?.bankName
            : '',
        BankAccountNo:
          +employeeJoiningData?.bankAccountStatus === 1
            ? employeeJoiningData.bankAccountNo
            : '',
        IFSCCode:
          +employeeJoiningData?.bankAccountStatus === 1
            ? employeeJoiningData.bankIFSC
            : '',
        EmpBankName:
          +employeeJoiningData?.bankAccountStatus === 1
            ? employeeJoiningData.nameAsBank
            : '',
        Address1: userAddressData
          ? `${userAddressData.houseNumber},${userAddressData.houseName}`
          : '',
        Address2: userAddressData
          ? `${userAddressData.landmark},${userAddressData.area}`
          : '',
        CityName: userAddressData?.cityMaster?.cityName || '',
        PinCode: userAddressData?.zipcode,
        BirthDate: employeeJoiningData?.dob || '',
        Gender:
          user.gender == 'male' ? 'M' : user.gender == 'female' ? 'F' : 'T',
        JoiningDate: employeeJoiningData?.joiningDate || '',
        EmployeeDepartment: parseEmployeeInfoAlias(user)?.department || '',
        Designation: parseEmployeeInfoAlias(user)?.designation || '',
        linkType,
        storedProcedure: erpStoredProcedures.ERP_EMPLOYEE_MASTER_ACCOUNT,
      };

      console.log(
        `[ERP_EMPLOYEE_MASTER_ACCOUNT_LINK][START][userMasterID=${userObj.userMasterID}]`,
        userObj,
      );

      let AccountID;
      let result;
      try {
        const request = new sql.Request();

        request.input('AccountName', sql.VarChar(100), userObj.AccountName);
        request.input('BranchName', sql.VarChar(100), userObj.BranchName);
        request.input('Phone1', sql.VarChar(50), String(userObj.Phone1));
        request.input('AccountID', sql.BigInt, userObj.AccountID);
        request.input('BankerName', sql.VarChar(100), userObj.BankerName);
        request.input(
          'BankAccountNo',
          sql.VarChar(50),
          String(userObj.BankAccountNo),
        );
        request.input('IFSCCode', sql.VarChar(15), userObj.IFSCCode);
        request.input('EmpBankName', sql.VarChar(100), userObj.EmpBankName);
        request.input('Address1', sql.VarChar(250), userObj.Address1 || '');
        request.input('Address2', sql.VarChar(250), userObj.Address2 || '');
        request.input('CityName', sql.VarChar(200), userObj.CityName || '');
        request.input(
          'PinCode',
          sql.VarChar(10),
          String(userObj.PinCode) || '',
        );
        request.input(
          'BirthDate',
          sql.Date,
          userObj.BirthDate ? new Date(userObj.BirthDate) : null,
        );
        request.input('Gender', sql.Char(1), userObj.Gender);
        request.input(
          'JoiningDate',
          sql.Date,
          userObj.JoiningDate ? new Date(userObj.JoiningDate) : null,
        );
        request.input(
          'EmployeeDepartment',
          sql.VarChar(50),
          userObj.EmployeeDepartment || '',
        );
        request.input(
          'Designation',
          sql.VarChar(50),
          userObj.Designation || '',
        );

        // execute
        result = await request.execute(
          erpStoredProcedures.ERP_EMPLOYEE_MASTER_ACCOUNT,
        );

        AccountID = result?.recordset?.[0]?.AccountID;

        console.log(
          `[ERP_EMPLOYEE_MASTER_ACCOUNT_LINK][SP_SUCCESS][userMasterID=${userObj.userMasterID}]`,
          {
            AccountID,
            recordset: result?.recordset,
          },
        );
      } catch (erpError) {
        console.error(
          `[ERP_EMPLOYEE_MASTER_ACCOUNT_LINK][SP_ERROR][userMasterID=${userObj.userMasterID}]`,
          erpError,
        );

        resultObj.status = 500;
        resultObj.message = erpError.message;
        resultObj.result = result;

        continue userLoop; // SAFE
      }

      if (!AccountID) {
        console.warn(
          `[ERP_EMPLOYEE_MASTER_ACCOUNT_LINK][NO_ACCOUNT_ID][userMasterID=${userObj.userMasterID}]`,
          { result },
        );

        resultObj.status = 422;
        resultObj.message = 'Could not get AccountID from ERP';
        resultObj.result = result;

        continue userLoop; // SAFE
      }

      await UserMaster.update(
        {
          AccountID: AccountID,
          updateBy: createBy,
          updateByIp: createByIp,
        },
        {
          where: {
            userMasterID: userObj.userMasterID,
          },
        },
      );

      resultObj.status = 200;
      resultObj.message = `Linked (AccountID = ${AccountID})`;
      resultObj.AccountID = AccountID;
      resultObj.result = result;
    } catch (error) {
      console.error(
        `[ERP_EMPLOYEE_MASTER_ACCOUNT_LINK][ERROR][userMasterID=${user?.userMasterID}]`,
        error,
      );

      resultObj.status = 500;
      resultObj.message = error.message;
    } finally {
      results.push(resultObj);
    }
  }

  console.log('[ERP_EMPLOYEE_MASTER_ACCOUNT_LINK][FINISHED]', {
    total: results.length,
  });
  return results;
}

exports.updateLinkedERPEmployeeMasterAccount = async (req, res, next) => {
  try {
    let { companyMasterID, userMasterID } = req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    const userCondition = { companyMasterId: companyMasterID, status: 1 };
    if (userMasterID) {
      userCondition.userMasterID = userMasterID;
    }
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const findUserData = await UserMaster.findAll({
      where: userCondition,
      include: [
        {
          required: false,
          model: EmployeeBranch,
          as: 'emp_branch',
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
          model: EmployeeDepartment,
          as: 'emp_dept',
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
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
          model: EmployeeDesignation,
          as: 'emp_desig',
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
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
          model: EmployeeJoiningDetails,
          as: 'emp_join',
          attributes: [
            'bankAccountNo',
            'bankIFSC',
            'nameAsBank',
            'bankMasterID',
            'bankAccountStatus',
            'joiningDate',
            'leavingDate',
            'dob',
          ],
          include: [
            {
              model: BankMaster,
              attributes: ['bankName'],
            },
          ],
        },
        {
          required: false,
          model: UserAddress,
          where: { addressType: 'permanent', status: 1, verifyStatus: 1 },
          include: [
            {
              model: CityMaster,
              attributes: ['cityMasterID', 'cityName'],
              include: [
                {
                  model: StateMaster,
                  attributes: ['stateMasterID', 'stateName'],

                  include: [
                    {
                      model: CountryMaster,
                      attributes: ['countryMasterID', 'countryName'],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      attributes: [
        'displayName',
        'userMasterID',
        'userNumber',
        'AccountID',
        'gender',
      ],
    });
    const erpConfig = getErpDatabaseConfig(companyMasterID);
    sql.connect(erpConfig, async function (err) {
      if (err) {
        sql.close();
        console.log(
          'Could not create ERP DB Connection!........................',
        );
        return res
          ?.status(200)
          .json({ status: 200, message: 'Could not create DB Connection!.' });
      }
      const results = await erpDatabaseAccountLinkProcess(
        findUserData,
        sql,
        'update',
        createBy,
        createByIp,
      );

      sql.close();
      console.log(
        'ERP Link Processing completed................................',
        results,
      );
      if (results && results.length) {
        return res.status(200).json({
          status: results[0].status,
          message:
            results[0].status == 200
              ? 'Erp-Link Successfully'
              : results[0].message,
          results,
        });
      } else {
        return res.status(200).json({
          status: 401,
          message: 'Data Not Fetched',
          results,
        });
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getUserWithNotLinkedErpEmployeeMasterAccount = async (
  req,
  res,
  next,
) => {
  try {
    let { companyMasterID } = req.body;
    const userCondition = {
      companyMasterId: companyMasterID,
      status: 1,
      AccountID: null,
    };
    const order = [['displayName', 'ASC']];

    const { rows: findUserData, count } = await UserMaster.findAndCountAll({
      where: userCondition,
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
      order,
      include: [
        {
          required: false,
          model: EmployeeJoiningDetails,
          as: 'emp_join',
          attributes: [],
        },
      ],
    });
    return res.status(200).json({
      status: 200,
      data: findUserData,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};

exports.geterpEmployeeMasteraccount = async (req, res, next) => {
  try {
    console.log('[GET_ERP_ACCOUNT][START]');

    let { companyMasterID } = req.body;
    console.log('[GET_ERP_ACCOUNT][INPUT]', { companyMasterID });

    if (!companyMasterID) {
      console.log('[GET_ERP_ACCOUNT][VALIDATION_FAILED]');
      return res.status(200).json({
        status: 400,
        message: 'companyMasterID is required',
      });
    }

    const erpConfig = getErpDatabaseConfig(companyMasterID);
    console.log('[GET_ERP_ACCOUNT][DB_CONFIG_READY]');

    sql.connect(erpConfig, async function (err) {
      if (err) {
        console.error('[GET_ERP_ACCOUNT][DB_CONNECTION_FAILED]', err);
        sql.close();
        return res.status(200).json({
          status: 401,
          message: 'Could not create DB Connection!',
        });
      }

      console.log('[GET_ERP_ACCOUNT][DB_CONNECTED]');

      try {
        const resultObject = await erpEmployeeMasterAccountList(sql);

        console.log('[GET_ERP_ACCOUNT][SP_RESULT]', {
          status: resultObject.status,
          dataLength: resultObject?.data?.length || 0,
        });

        sql.close();
        console.log('[GET_ERP_ACCOUNT][DB_CONNECTION_CLOSED]');

        return res.status(200).json(resultObject);
      } catch (innerError) {
        console.error('[GET_ERP_ACCOUNT][SP_EXECUTION_FAILED]', innerError);
        sql.close();

        return res.status(200).json({
          status: 500,
          message: innerError.message,
        });
      }
    });
  } catch (err) {
    console.error('[GET_ERP_ACCOUNT][UNHANDLED_ERROR]', err);
    next(err);
  }
};

async function erpEmployeeMasterAccountList(sql) {
  const resultObj = {
    status: null,
    message: null,
    data: [],
  };

  try {
    console.log('[ERP_EMPLOYEE_MASTER_ACCOUNT_LIST][START]');

    const request = new sql.Request();

    console.log(
      `[${erpStoredProcedures.ERP_EMPLOYEE_MASTER_ACCOUNT_LIST}][SP_EXECUTION_STARTED]`,
    );

    const result = await request.execute(
      erpStoredProcedures.ERP_EMPLOYEE_MASTER_ACCOUNT_LIST,
    );

    console.log(
      `[${erpStoredProcedures.ERP_EMPLOYEE_MASTER_ACCOUNT_LIST}][SP_SUCCESS]`,
      {
        rows: result?.recordset?.length || 0,
      },
    );

    resultObj.data = result?.recordset || [];
    resultObj.status = 200;
    resultObj.message = message.usermessage.fetchMessage('Erp Employee Master');
  } catch (erpError) {
    console.error(
      `[${erpStoredProcedures.ERP_EMPLOYEE_MASTER_ACCOUNT_LIST}][SP_ERROR]`,
      erpError,
    );

    resultObj.status = 500;
    resultObj.message = erpError.message;
  }

  console.log('[ERP_EMPLOYEE_MASTER_ACCOUNT_LIST][FINISHED]', {
    total: resultObj?.data?.length || 0,
    status: resultObj.status,
  });

  return resultObj;
}

exports.updateERPEmployeeMasterAccount = async (req, res, next) => {
  try {
    let { AccountID, userMasterID, companyMasterID } = req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    const findEmployeeWithSameAccountID = await UserMaster.findOne({
      where: {
        userMasterID,
        AccountID,
        status: 1,
        companyMasterId: companyMasterID,
      },
    });

    if (findEmployeeWithSameAccountID) {
      return res.status(200).send({
        status: 401,
        message: message.usermessage.alreadyAssign(
          'Erp Employee Master Account',
        ),
      });
    }

    await UserMaster.update(
      {
        AccountID: AccountID,
        updateBy: createBy,
        updateByIp: createByIp,
      },
      {
        where: { userMasterID: userMasterID, companyMasterId: companyMasterID },
      },
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Erp Employee Master Account'),
    });
  } catch (err) {
    next(err);
  }
};
