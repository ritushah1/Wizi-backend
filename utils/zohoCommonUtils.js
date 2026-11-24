const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const axios  = require('axios');
const ZohoIntegration = require("../models/zohoIntegration");
const HRSalaryMasterFields = require('../models/hrSalaryMaster');
const GradeSalaryStructure = require('../models/gradeSalaryStructure');
const GradeStructure = require('../models/gradeStructure');
const HRSalaryFields = require('../models/hrSalaryFields');
const Payheadmaster = require('../models/payhead');
const UserMaster = require('../models/userMaster');
const HRSalaryTrasaction = require('../models/hrSalaryTransaction');
const { payheadMasterIdsMapping, salaryFieldSrNoFields, salaryConsiderInEnum, default_payheadMasterIds } = require('./dbUtils');
const moment = require('moment');


/* =====================================================
   3️⃣ Get Valid Access Token (with Auto Refresh)
===================================================== */
async function getValidZohoAccessToken(companyMasterID) {
  const integration = await ZohoIntegration.findOne({
    where: { companyMasterID },
  });

  if (!integration) {
    throw new Error(
      'Zoho integration not found. Please connect Zoho Books first.',
    );
  }

  // Check if current token is still valid
  if (
    integration.access_token &&
    new Date(integration.expires_at) > new Date()
  ) {
    return {
      access_token: integration.access_token,
      api_domain: integration.api_domain,
      organizationID: integration.organizationID,
    };
  }

  // Token expired, refresh it
  // Access token expired, refreshing...

  const tokenParams = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: process.env.ZOHO_CLIENT_ID,
    client_secret: process.env.ZOHO_CLIENT_SECRET,
    refresh_token: integration.refresh_token,
  });

  const tokenResponse = await axios.post(
    `${process.env.ZOHO_ACCOUNTS_BASE_URL}/oauth/v2/token`,
    tokenParams.toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );

  const { access_token, expires_in } = tokenResponse.data;

  // Update integration with new token
  await integration.update({
    access_token,
    expires_at: new Date(Date.now() + expires_in * 1000),
  },{hooks:false});

  return {
    access_token,
    api_domain: integration.api_domain,
    organizationID: integration.organizationID,
  };
}


const getDebitCreditType = (salaryFieldSerialNo,payheadMasterId)=>{
    return salaryFieldSerialNo == 'A' ? payheadMasterId == payheadMasterIdsMapping.NETSALARY ? 'credit' : 'debit':'credit';
};


const createSalaryStructure = () => ({
  earning: [],
  gross: [],
  employeeDeduction: [],
  extraEarning: [],
  netPay: [],
  employerDeduction: [],
  ctc: [],
  createBy: null,
  createdAt: null,
  salaryCalculationDays: null,
  otMinutes: null,
});

const getOrCreate = (map, userId) => {
  if (!map.has(userId)) {
    map.set(userId, createSalaryStructure());
  }
  return map.get(userId);
};

const pushItem = (arr, data) => arr.push(data);

const handleSpecialHeads = ({
  payheadMasterId,
  payheadName,
  salaryFieldSrNo,
  salaryFieldSide,
  considerIn,
  EmployeeSalaryAmount,
  actualAmount,
  actualName,
  salaryFieldId,
  transaction
}) => {
  const mapping = {
    [payheadMasterIdsMapping.CTC]: 'ctc',
    [payheadMasterIdsMapping.GROSS]: 'gross',
    [payheadMasterIdsMapping.NETSALARY]: 'netPay',
  };

  const key = mapping[payheadMasterId];
  if (!key) return;

  transaction[key].push({
    payheadName,
    salaryFieldSrNo,
    salaryFieldSide,
    EmployeeSalaryAmount,
    actualAmount,
    considerIn,
    payheadMasterId,
    actualName,
    salaryFieldId
  });

};

// ==============================
// MAIN FUNCTION
// ==============================

async function get_Salary_Transaction_Map(
  userIds = [],
  month,
) {

  const salaryTransactionMap = new Map();

  // ✅ Early return
  if (!userIds.length) {
    return salaryTransactionMap ;
  }

  const includeModel = [
    {
      model: HRSalaryMasterFields,
      as: 'HSM',
      include: [
        {
          model: GradeSalaryStructure,
          as: 'GSS',
          include: [
            { model: GradeStructure, attributes: ['baseOnCalculation'] },
            {
              model: HRSalaryFields,
              as: 'HSF',
              include: [
                {
                  model: Payheadmaster,
                  as: 'PHM',
                  attributes: ['payheadName'],
                },
              ],
              attributes: [
                'payheadMasterId',
                'salaryFieldSide',
                'salaryFieldSrNo',
                'considerIn',
                'payheadDisplayName',
              ],
            },
          ],
          attributes: ['salaryFieldID', 'gradeStructureID', 'salaryfieldindex'],
        },
      ],
      attributes: ['gradeSalaryStructureID', 'EmployeeSalaryAmount'],
    },
    {
      model: UserMaster,
      as: 'createByUser',
      attributes: ['displayName'],
    },
  ];

  const salaryData = await HRSalaryTrasaction.findAll({
    where: {
      userMasterID: {
        [Sequelize.Op.in]: userIds,
      },
      salaryYYYYMM: month,
    },
    include: includeModel,
    attributes: [
      'EmployeeSalaryAmount',
      'salaryYYYYMM',
      'userMasterID',
      'SalaryCalcOnDays',
      'createBy',
      'calculatedOn',
      'createdAt',
    ],
    order: [
      // Order by salaryfieldindex in GradeSalaryStructure
      [
        { model: HRSalaryMasterFields, as: 'HSM' },
        { model: GradeSalaryStructure, as: 'GSS' },
        'salaryfieldindex',
        'ASC',
      ],

      // Order by payheadName in Payheadmaster
      [
        { model: HRSalaryMasterFields, as: 'HSM' },
        { model: GradeSalaryStructure, as: 'GSS' },
        { model: HRSalaryFields, as: 'HSF' },
        { model: Payheadmaster, as: 'PHM' },
        'payheadName',
        'ASC',
      ],
    ],
  });

  const speacialHeads = [
    payheadMasterIdsMapping.CTC,
    payheadMasterIdsMapping.GROSS,
    payheadMasterIdsMapping.NETSALARY,
  ];


  for (const salary of salaryData) {
    const uid = +salary.userMasterID;

    const transaction = getOrCreate(salaryTransactionMap, uid);

    if (!transaction.createBy && salary.createByUser?.displayName) {
      transaction.createBy = salary.createByUser?.displayName || null;
    }

    if (!transaction.createdAt && salary.createdAt) {
      transaction.createdAt = moment(salary.createdAt).format(
        'DD-MM-YYYY hh:mm A',
      );
    }

    if (transaction.salaryCalculationDays == null) {
      transaction.salaryCalculationDays = salary.SalaryCalcOnDays || 0;
    }

    // Extract once (performance)
    const HSM = salary.HSM;
    const GSS = HSM?.GSS;
    const HSF = GSS?.HSF;

    const payheadMasterId = HSF?.payheadMasterId;
    const salaryFieldSrNo = HSF?.salaryFieldSrNo;
    const salaryFieldSide = HSF?.salaryFieldSide;
    const considerIn = HSF?.considerIn;
    const salaryFieldId = GSS.salaryFieldID;

    const EmployeeSalaryAmount = salary.EmployeeSalaryAmount || 0;
    const actualAmount = HSM?.EmployeeSalaryAmount || 0;

    const payheadName =
      HSF?.payheadDisplayName?.trim() || HSF?.PHM?.payheadName;

    const actualName = HSF?.PHM?.payheadName || null;

    // ==============================
    // Special Heads
    // ==============================
    if (speacialHeads.includes(payheadMasterId)) {
      handleSpecialHeads({
        payheadMasterId,
        payheadName,
        salaryFieldSrNo,
        salaryFieldSide,
        considerIn,
        EmployeeSalaryAmount,
        actualAmount,
        transaction,
        actualName,
        salaryFieldId,
        transaction
      });
      continue;
    }

      // ==============================
      // Earnings
      // ==============================
      if (salaryFieldSrNo === salaryFieldSrNoFields.EARNING) {
        const isNet = considerIn === salaryConsiderInEnum.NET_SALARY;

        if (!isNet) {
          if (
            !default_payheadMasterIds.includes(payheadMasterId) ||
            EmployeeSalaryAmount > 0
          ) {
            pushItem(transaction.earning, {
              payheadName,
              salaryFieldSrNo,
              salaryFieldSide,
              EmployeeSalaryAmount,
              actualAmount,
              considerIn,
              payheadMasterId,
              actualName,
              salaryFieldId
            });

          }
        } else {
          if (EmployeeSalaryAmount > 0) {
            pushItem(transaction.extraEarning, {
              payheadName,
              salaryFieldSrNo,
              salaryFieldSide,
              EmployeeSalaryAmount,
              actualAmount,
              considerIn,
              payheadMasterId,
              actualName,
              salaryFieldId
            });
          }
        }
      }

      // ==============================
      // Deductions
      // ==============================
      if (salaryFieldSrNo === salaryFieldSrNoFields.EMPLOYEE_DEDUCTION) {
        if (EmployeeSalaryAmount > 0) {
          pushItem(transaction.employeeDeduction, {
            payheadName,
            salaryFieldSrNo,
            salaryFieldSide,
            EmployeeSalaryAmount,
            actualAmount,
            considerIn,
            payheadMasterId,
            actualName,
            salaryFieldId
          });
        }
      }

      // Employer Deductions ---------------------

      if (salaryFieldSrNo === salaryFieldSrNoFields.EMPLOYER_DEDUCTION) {
        if (EmployeeSalaryAmount > 0) {
          pushItem(transaction.employerDeduction, {
            payheadName,
            salaryFieldSrNo,
            salaryFieldSide,
            EmployeeSalaryAmount,
            considerIn,
            payheadMasterId,
            actualName,
            salaryFieldId
          });
        }
      }
  }

  return salaryTransactionMap;
}

async function createZohoJournal({
  access_token,
  api_domain,
  organizationID,
  salaryForZoho
}) {
  return axios({
    method: 'post',
    url: `${api_domain}/books/v3/journals`,
    params: {
      organization_id: organizationID
    },
    headers: {
      Authorization: `Zoho-oauthtoken ${access_token}`,
      'Content-Type': 'application/json'
    },
    data: {
      journal_date: moment().format('YYYY-MM-DD'),
      line_items: salaryForZoho
    }
  });
}


module.exports = {
    getValidZohoAccessToken,
    getDebitCreditType,
    get_Salary_Transaction_Map,
    createZohoJournal
}