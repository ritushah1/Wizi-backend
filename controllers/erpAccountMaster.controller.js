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
const {
  erpStoredProcedures,
  userAttributes,
  mehtaERPCompanyMasterIDs,
} = require('../utils/commonVars');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const {
  asiaKolkataDateTime,
  parseEmployeeInfo,
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

exports.postAdderpAccountMaster = async (req, res, next) => {
  try {
    let {
      erpAccountMasterID,
      userMasterID,
      companyMasterID,
      erpAcountID,
      status,
    } = await req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    let erp_Account = await erpAccountMaster.findOne({
      where: {
        userMasterID: userMasterID,
        status: 1,
      },
    });

    if (erp_Account) {
      return res.status(200).send({
        status: 401,
        message: message.usermessage.alreadyAssign('Erp Account'),
      });
    }

    await erpAccountMaster.create({
      erpAccountMasterID,
      userMasterID,
      companyMasterID,
      erpAcountID,
      status,
      createBy,
      createByIp,
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Erp Account Master'),
    });
  } catch (err) {
    next(err);
  }
};

exports.geterpAccountMasterId = async (req, res, next) => {
  try {
    let get_one_data = await erpAccountMaster.findOne({
      where: { erpAcountMasterID: req.params.id, status: 1 },
      raw: true,
    });
    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.postUpdateerpAccountMaster = async (req, res, next) => {
  try {
    let {
      erpAcountMasterID,
      userMasterID,
      companyMasterID,
      erpAcountID,
      status,
    } = req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    await erpAccountMaster.update(
      {
        erpAcountMasterID,
        userMasterID,
        companyMasterID,
        erpAcountID,
        status,
        updateBy,
        updateByIp,
      },
      {
        where: { erpAcountMasterID: erpAcountMasterID },
      },
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Erp Account Master'),
    });
  } catch (err) {
    next(err);
  }
};

exports.postDeleteerpAccountMasterById = async (req, res, next) => {
  try {
    let { erpAcountMasterID } = await req.body;
    await erpAccountMaster.destroy({
      where: { erpAcountMasterID: erpAcountMasterID, status: ['1', '0'] },
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Erp Account Master'),
    });
  } catch (err) {
    next(err);
  }
};

exports.geterpAccountMastercompanyid = async (req, res, next) => {
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
          required: false,
          model: erpAccountMaster,
          attributes: ['erpAcountMasterID', 'erpAcountID', 'erpAccountName'],
          where: {
            status: 1,
          },
          include: [
            {
              model: UserMaster,
              as: 'c_By',
              attributes: userAttributes,
            },
            {
              model: UserMaster,
              as: 'u_By',
              attributes: userAttributes,
            },
          ],
        },

        { model: EmployeeJoiningDetails, attributes: ['employeeCode'] },
        { model: companyMaster, attributes: ['companyName'] },
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
          model: EmployeeDesignation,
          where: {
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
          model: EmployeeDivision,
          where: {
            status: 1,
            startDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
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
      ],
    });

    if (exportData) {
      const finalData = findUserERpData.map((e) => {
        return {
          'Employee Code': parseEmployeeInfo(e)?.employeeCode,
          'Employee Name': e?.displayName,
          'Employee Number': e?.userNumber,
          Company: parseEmployeeInfo(e)?.companyName,
          Branch: parseEmployeeInfo(e)?.branch,
          Department: parseEmployeeInfo(e)?.department,
          Designation: parseEmployeeInfo(e)?.designation,
          Division: parseEmployeeInfo(e)?.division,
          'Working Area': parseEmployeeInfo(e)?.workingArea,
          'ERP Account Name': e.erpAcountMasters?.[0]?.erpAccountName || '',
          'ERP Account ID': e.erpAcountMasters?.[0]?.erpAcountID || '',
          'Create By': e.erpAcountMasters?.[0]
            ? `${e.erpAcountMasters?.[0]?.c_By?.displayName} On ${moment(e.erpAcountMasters?.[0]?.createdAt).format('DD-MM-YYYY HH:mm')}`
            : '',
          'Update By': e.erpAcountMasters?.[0]?.updateBy
            ? `${e.erpAcountMasters?.[0]?.u_By?.displayName} On ${moment(e.erpAcountMasters?.[0]?.updatedAt).format('DD-MM-YYYY HH:mm')}`
            : '',
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

exports.geterpaccount = async (req, res, next) => {
  try {
    if (mehtaERPCompanyMasterIDs.includes(req.body.companyMasterID)) {
      const erpConfig = getErpDatabaseConfig(req.body.companyMasterID);
      sql.connect(erpConfig, (err) => {
        if (err) {
          console.log('Could not create DB Connection!', err);
          return res.status(200).json({
            status: 200,
            message: err,
          });
        }

        var request = new sql.Request();

        request
          .execute('Mccs_veritrack_TAD_Account')
          .then(function (recordsets, err, returnValue, affected) {
            if (err) {
              console.log(err);
              return res.status(200).json({
                status: 200,
                message: err,
              });
            }
            return res.status(200).json({
              status: 200,
              message: 'Data Get SuccessFully.',
              data: recordsets.recordsets[0],
            });
          })
          .catch(function (err) {
            console.log(err);
            return res.status(200).json({
              status: 401,
              message: err.message,
            });
          });
      });
    } else {
      const record = await erpIntegration.findOne({
        where: {
          companyMasterID: req.body.companyMasterID,
        },
        attributes: ['erpName', 'baseUrl', 'apiSecret', 'apiKey', 'empCodeUrl'],
      });

      if (record) {
        if (record.erpName === 'ERPNext') {
          try {
            const apiKey = `${record.apiKey}`;
            const apiSecret = `${record.apiSecret}`;

            // Create the base64 encoded string
            const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString(
              'base64',
            );

            // Set up the Authorization header
            const headers = {
              Authorization: `Basic ${auth}`,
            };

            const apiUrl = `${record.empCodeUrl}`;

            const response = await axios.get(apiUrl, { headers });

            const data = response.data.message;

            const employees = Array.isArray(data)
              ? data.map((emp) => ({
                  AccountMasterId: emp.Name,
                  AccountName: `${emp.Employee_Name} (${emp.Name})`,
                }))
              : [];

            return res.status(200).json({
              status: 200,
              message: 'Data found successfully',
              data: employees,
            });
          } catch (err) {
            return res.status(200).json({
              status: 500,
              message: 'Error fetching data from ERP API',
            });
          }
        } else if (record.erpName === 'Munimji') {
          console.log('Munimji ERP');
        }
      } else {
        return res.status(200).json({
          status: 401,
          message: 'ERP Integration not found.',
        });
      }
    }
  } catch (err) {
    next(err);
  }
};

exports.getErpClosingBalance = async (req, res, next) => {
  const logTag = '[ERP_CLOSING_BAL]';
  try {
    let { companyMasterID, userMasterID } = req.body;
    const findUserERPAccount = await erpAccountMaster.findOne({
      where: { companyMasterID, status: 1, userMasterID },
    });

    console.log(
      `${logTag} ERP Account lookup result:`,
      findUserERPAccount ? findUserERPAccount.toJSON() : null,
    );

    if (!findUserERPAccount) {
      console.warn(
        `${logTag} ERP Account NOT FOUND`,
        JSON.stringify({ companyMasterID, userMasterID }),
      );

      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('User Erp Account'),
      });
    }

    const ERPAccountID = findUserERPAccount.erpAcountID;

    console.log(`${logTag} ERP Account ID resolved`, ERPAccountID);

    // STEP 2: ERP DB Config
    const erpConfig = getErpDatabaseConfig(companyMasterID);

    console.log(`${logTag} ERP DB Config loaded`);

    // STEP 3: Connect to ERP DB
    sql.connect(erpConfig, (err) => {
      if (err) {
        console.error(`${logTag} ERP DB Connection Error`, err);

        return res.status(200).json({
          status: 401,
          message: err.message,
        });
      }

      console.log(`${logTag} ERP DB Connected successfully`);

      const storedProcedureName =
        erpStoredProcedures.GET_USERWISE_CLOSING_BALANCE;

      console.log(
        `${logTag} Executing Stored Procedure`,
        JSON.stringify({
          storedProcedureName,
          TADPartyAccountMasterId: ERPAccountID,
        }),
      );

      const request = new sql.Request();
      request.input('TADPartyAccountMasterId', sql.BigInt, ERPAccountID);

      request
        .execute(storedProcedureName)
        .then((result) => {
          console.log(`${logTag} Stored Procedure executed successfully`);

          console.log(
            `${logTag} Raw SP Result`,
            JSON.stringify(result?.recordsets),
          );
          const closingBalance = result?.recordset?.[0]?.ClosingBalance || '';
          console.log(`${logTag} Closing Balance extracted`, closingBalance);
          return res.status(200).json({
            status: 200,
            message: 'Data Get Successfully.',
            data: closingBalance,
            result: result?.recordset,
          });
        })
        .catch((err) => {
          console.error(`${logTag} Stored Procedure Execution Error`, err);
          return res.status(200).json({
            status: 401,
            message: err.message,
          });
        });
    });
  } catch (err) {
    console.error(`${logTag} Unexpected Error`, err);
    next(err);
  }
};

exports.linkTADAERPAccount = async (req, res, next) => {
  try {
    let { userMasterID, companyMasterID } = await req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const findUserData = await UserMaster.findOne({
      where: {
        userMasterID,
        companyMasterId: companyMasterID,
      },
      include: [
        {
          required: false,
          model: erpAccountMaster,
          attributes: ['erpAcountMasterID', 'erpAcountID'],
          where: {
            status: 1,
          },
        },
        {
          required: false,
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
          model: EmployeeJoiningDetails,
          attributes: [
            'employeeCode',
            'bankIFSC',
            'bankAccountNo',
            'nameAsBank',
            'bankMasterID',
            'bankAccountStatus',
          ],
          include: [
            {
              model: BankMaster,
              attributes: ['bankName'],
            },
          ],
        },
      ],
    });
    const userErpAccount = findUserData.erpAcountMasters?.[0];
    if (userErpAccount) {
      return res.status(200).send({
        status: 401,
        message: message.usermessage.alreadyAssign('Erp Account'),
      });
    }
    const employeeJoiningData = findUserData.employeeJoiningDetails?.[0];
    if (
      !employeeJoiningData.bankIFSC ||
      !employeeJoiningData.bankAccountNo ||
      !employeeJoiningData.bankMasterID ||
      !employeeJoiningData.nameAsBank
    ) {
      return res.status(200).send({
        status: 401,
        message: message.usermessage.notFoundMessage('Bank'),
      });
    }
    if (employeeJoiningData.bankAccountStatus != 1) {
      return res.status(200).send({
        status: 401,
        message: 'Employee Bank Details Is Not Authorized',
      });
    }
    const erpConfig = getErpDatabaseConfig(companyMasterID);

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
        [findUserData],
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
    // return res.status(200).json({
    //   status: 200,
    //   message: message.usermessage.addMessage('Erp Account Master'),
    // });
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
      erpAccountID: null,
      result: null,
    };

    try {
      const employeeJoiningData = user.employeeJoiningDetails?.[0];
      const userObj = {
        branchName: parseEmployeeInfo(user)?.branch || null,
        displayName: user.displayName?.trim().toUpperCase() || '',
        userMasterID: user.userMasterID,
        companyMasterID: user.companyMasterId,
        userErpAccount: user.erpAcountMasters?.[0] || null,
        accountID:
          linkType === 'add' ? 0 : user.erpAcountMasters?.[0]?.erpAcountID || 0,
        linkType,
        erpAccountName: null,
        bankIFSC: employeeJoiningData.bankIFSC,
        bankAccountNo: employeeJoiningData.bankAccountNo,
        bankName: employeeJoiningData.bankMaster?.bankName,
        nameAsBank: employeeJoiningData.nameAsBank,
      };

      userObj.erpAccountName = `${userObj.displayName} TAD A/C ${userObj.branchName} | ${userObj.userMasterID}`;

      console.log(
        `[ERP_ACCOUNT_LINK][START][userMasterID=${userObj.userMasterID}]`,
        userObj,
      );

      let erpAccountID;
      let result;

      console.log(
        `[ERP_ACCOUNT_LINK][SP_CALL][userMasterID=${userObj.userMasterID}]`,
        {
          AccountName: userObj.displayName,
          BranchName: userObj.branchName,
          Phone1: String(userObj.userMasterID),
          AccountID: userObj.accountID,
          storedProcedure: erpStoredProcedures.ERP_TADA_ACCOUNT,
          BankerName: userObj.bankName,
          BankAccountNo: userObj.bankAccountNo,
          IFSCCode: userObj.bankIFSC,
          EmpBankName: userObj.nameAsBank,
        },
      );

      try {
        const request = new sql.Request();

        request.input('AccountName', sql.VarChar(100), userObj.displayName);
        request.input('BranchName', sql.VarChar(100), userObj.branchName);
        request.input('Phone1', sql.VarChar(50), String(userObj.userMasterID));
        request.input('AccountID', sql.BigInt, userObj.accountID);
        request.input('BankerName', sql.VarChar(100), userObj.bankName);
        request.input(
          'BankAccountNo',
          sql.VarChar(50),
          String(userObj.bankAccountNo),
        );
        request.input('IFSCCode', sql.VarChar(15), userObj.bankIFSC);
        request.input('EmpBankName', sql.VarChar(100), userObj.nameAsBank);

        result = await request.execute(erpStoredProcedures.ERP_TADA_ACCOUNT);

        erpAccountID = result?.recordset?.[0]?.AccountID;

        console.log(
          `[ERP_ACCOUNT_LINK][SP_SUCCESS][userMasterID=${userObj.userMasterID}]`,
          {
            erpAccountID,
            recordset: result?.recordset,
          },
        );
      } catch (erpError) {
        console.error(
          `[ERP_ACCOUNT_LINK][SP_ERROR][userMasterID=${userObj.userMasterID}]`,
          erpError,
        );

        resultObj.status = 500;
        resultObj.message = erpError.message;
        resultObj.result = result;

        continue userLoop; // SAFE
      }

      if (!erpAccountID) {
        console.warn(
          `[ERP_ACCOUNT_LINK][NO_ACCOUNT_ID][userMasterID=${userObj.userMasterID}]`,
          { result },
        );

        resultObj.status = 422;
        resultObj.message = 'Could not get AccountID from ERP';
        resultObj.result = result;

        continue userLoop; // SAFE
      }

      if (linkType === 'add') {
        console.log(
          `[ERP_ACCOUNT_LINK][DB_CREATE][userMasterID=${userObj.userMasterID}]`,
          {
            companyMasterID: userObj.companyMasterID,
            erpAccountID,
          },
        );

        await erpAccountMaster.create({
          userMasterID: userObj.userMasterID,
          companyMasterID: userObj.companyMasterID,
          erpAcountID: erpAccountID,
          createBy,
          createByIp,
          erpAccountName: userObj.erpAccountName,
        });
      } else {
        console.log(
          `[ERP_ACCOUNT_LINK][DB_UPDATE][userMasterID=${userObj.userMasterID}]`,
          {
            companyMasterID: userObj.companyMasterID,
            erpAccountID,
          },
        );

        if (userObj.userErpAccount) {
          await erpAccountMaster.update(
            {
              erpAccountName: userObj.erpAccountName,
            },
            {
              where: {
                userMasterID: userObj.userMasterID,
                erpAcountMasterID: userObj.userErpAccount.erpAcountMasterID,
              },
            },
          );
        }
      }

      resultObj.status = 200;
      resultObj.message = `Linked (erpAccountID = ${erpAccountID})`;
      resultObj.erpAccountID = erpAccountID;
      resultObj.result = result;
    } catch (error) {
      console.error(
        `[ERP_ACCOUNT_LINK][ERROR][userMasterID=${user?.userMasterID}]`,
        error,
      );

      resultObj.status = 500;
      resultObj.message = error.message;
    } finally {
      results.push(resultObj);
    }
  }

  console.log('[ERP_ACCOUNT_LINK][FINISHED]', { total: results.length });
  return results;
}

exports.updateLinkedTADAERPAccount = async (req, res, next) => {
  try {
    let { companyMasterID, userMasterID } = await req.body;
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
          model: erpAccountMaster,
          attributes: ['erpAcountMasterID', 'erpAcountID'],
          where: {
            status: 1,
          },
        },
        {
          required: false,
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
          model: EmployeeJoiningDetails,
          attributes: [
            'employeeCode',
            'bankIFSC',
            'bankAccountNo',
            'nameAsBank',
            'bankMasterID',
            'bankAccountStatus',
          ],
          include: [
            {
              model: BankMaster,
              attributes: ['bankName'],
            },
          ],
        },
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
      return res?.status(200).json({
        status: 200,
        message: 'Processing completed..........',
        results,
      });
    });
  } catch (err) {
    next(err);
  }
};
