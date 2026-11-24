const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const { statusCodes } = require('../utils/commonVars');
const { usermessage } = require('../response_message/message');
const ZohoSalarySync = require('../models/zohoSalarySync');
const ZohoIntegration = require('../models/zohoIntegration');
const { accountingTypeEnum, payheadMasterIdsMapping } = require('../utils/dbUtils');
const BranchMaster = require('../models/branchMaster');
const UserMaster = require('../models/userMaster');
const ZohoSalarySyncDetails = require('../models/zohoSalarySyncDetails');
const HRSalaryFields = require('../models/hrSalaryFields');
const Payheadmaster = require('../models/payhead');
const EmployeeBranch = require('../models/employeeBranch');
const { daysInMonth } = require('../utils/commonUtilFunctions');
const ZohoAccountMapping = require('../models/zohoAccountMapping');
const moment = require('moment');
const { getValidZohoAccessToken, getDebitCreditType, get_Salary_Transaction_Map, createZohoJournal } = require('../utils/zohoCommonUtils');
const { default: axios } = require('axios');


exports.syncSalary = async(req,res,next)=>{
    try {

        const {companyMasterID,branchMasterID,userMasterID,salaryMonth,syncData}=req.body;

          if(!companyMasterID || !salaryMonth){
            return res.status(statusCodes.BAD_REQUEST).json({
                status:statusCodes.BAD_REQUEST,
                message:usermessage.requiredMessage('companyMasterID,salaryMonth')
            })
        };

        const zohoIntegrationData = await ZohoIntegration.findOne({
            where:{
companyMasterID,
isActive:true
            },
            include:[{
                model:ZohoAccountMapping,
                as:'zam',
                include:[{model:HRSalaryFields,attributes:['payheadMasterId']}]
            }]
        });

        if(!zohoIntegrationData) {
             return res.status(statusCodes.OK).json({
                status:statusCodes.NOT_FOUND,
                message:usermessage.notFoundMessage('Zoho Integration with company')
            })
        }

        const accountingType = zohoIntegrationData.accountingType || accountingTypeEnum.COMPANY_WISE;

          const condition = {companyMasterID,salaryMonth};

        const includeModel = [];
        let orderBy = [];

        if(accountingType == accountingTypeEnum.BRANCH_WISE){

            includeModel.push({
                model:BranchMaster,
                attributes:['branchName']
            });

              if(branchMasterID?.length){
              condition.branchMasterID = {
                [Sequelize.Op.in]:branchMasterID
            }
        }

        }

          if(accountingType == accountingTypeEnum.USER_WISE){

            includeModel.push({
                model:UserMaster,
                attributes:['displayName']
            });

        if(userMasterID?.length){
            condition.userMasterID = {
                [Sequelize.Op.in]:userMasterID
            }
        }

    };

        const syncedData = await ZohoSalarySync.findAll({
            where:condition,
            include:includeModel,
        });

        if(accountingType == accountingTypeEnum.COMPANY_WISE && syncedData?.length){
return res.status(statusCodes.BAD_REQUEST).json({
    status:statusCodes.BAD_REQUEST,
    message: 'Salary for the selected month has already been synced to Zoho.'
})
        }

        const alreadySyncedSet = new Set();

        for(const synced of syncedData){
            const key = +synced.userMasterID || +synced.branchMasterID || +synced.companyMasterID;
            alreadySyncedSet.add(key);
        }

        // Get valid access token (auto refresh supported)
let {
  access_token,
  api_domain,
  organizationID
} = await getValidZohoAccessToken(companyMasterID);

const alreadySyncData = [];
const zeroAmountData = [];
const failedData = [];

const syncRecords = [];
const detailRecords = [];

for (const sync of syncData) {
  const id = +sync.id;

  // Already synced
  if (alreadySyncedSet.has(id)) {
    alreadySyncData.push(sync.accountingName);
    continue;
  }

  const mappedSalary = sync.mappedField || [];

  // Check if any salary amount is greater than 0
  const hasValidAmount = mappedSalary.some(
    salary => +salary.amount > 0
  );

  if (!hasValidAmount) {
    zeroAmountData.push(sync.accountingName);
    continue;
  }

  const salaryForZoho = [];
  const detailsData = [];

  let totalDebit = 0;
  let totalCredit = 0;

  for (const salary of mappedSalary) {
    detailsData.push({
      salaryFieldID: salary.salaryFieldId,
      amount: salary.amount,
      accountID: salary.accountID,
      accountName: salary.accountName,
      accountType: salary.accountType
    });

    if (+salary.amount <= 0) {
      continue;
    }

    const debitOrCredit = getDebitCreditType(
      salary.salaryFieldSrNo,
      salary.payheadMasterId
    );

    salaryForZoho.push({
      account_id: salary.accountID,
      amount: +salary.amount,
      debit_or_credit: debitOrCredit
    });

    if (debitOrCredit === 'debit') {
      totalDebit += +salary.amount;
    } else {
      totalCredit += +salary.amount;
    }
  }

  // No valid Zoho entries
  if (!salaryForZoho.length) {
    zeroAmountData.push(sync.accountingName);
    continue;
  }

  // Debit / Credit mismatch validation
  if (
    Number(totalDebit.toFixed(2)) !==
    Number(totalCredit.toFixed(2))
  ) {
    failedData.push(
      `${sync.accountingName} (Debit: ${totalDebit}, Credit: ${totalCredit})`
    );
    continue;
  }


  try {
  let response;

  try {
    response = await createZohoJournal({
      access_token,
      api_domain,
      organizationID,
      salaryForZoho
    });
  } catch (error) {
    const isTokenExpired =
      error?.response?.status === 401 ||
      error?.response?.data?.code === 57 ||
      error?.response?.data?.message
        ?.toLowerCase()
        ?.includes('invalid oauth');

    if (!isTokenExpired) {
      throw error;
    }

    // Refresh token and retry once
  const tokenData =
  await getValidZohoAccessToken(companyMasterID);

access_token = tokenData.access_token;
api_domain = tokenData.api_domain;
organizationID = tokenData.organizationID;

    response = await createZohoJournal({
      access_token,
      api_domain,
      organizationID,
      salaryForZoho
    });
  }

  const syncObject = {
    zohoIntegrationID: zohoIntegrationData.id,
    companyMasterID,
    branchMasterID: null,
    userMasterID: null,
    salaryMonth,
    journal_id: response?.data?.journal?.journal_id || null
  };

  if (
    accountingType === accountingTypeEnum.BRANCH_WISE
  ) {
    syncObject.branchMasterID = sync.id;
  } else if (
    accountingType === accountingTypeEnum.USER_WISE
  ) {
    syncObject.userMasterID = sync.id;
  }

  syncRecords.push(syncObject);

  detailRecords.push({
    referenceId: sync.id,
    details: detailsData
  });

} catch (error) {
  console.error(
    `Zoho sync failed for ${sync.accountingName}`,
    error?.response?.data || error.message
  );

  failedData.push(
    `${sync.accountingName}${
      error?.code === 'ECONNABORTED'
        ? ' (Request Timeout)'
        : ''
    }`
  );
}


//   try {
//     // call zoho api for add journal
//     const response = await axios({
//       method: 'post',
//       url: `${api_domain}/books/v3/journals`,
//       params: {
//         organization_id: organizationID
//       },
//       headers: {
//         Authorization: `Zoho-oauthtoken ${access_token}`,
//         'Content-Type': 'application/json'
//       },
//       data: {
//         journal_date: moment().format('YYYY-MM-DD'),
//         line_items: salaryForZoho
//       }
//     });

//     const syncObject = {
//       zohoIntegrationID: zohoIntegrationData.id,
//       companyMasterID,
//       branchMasterID: null,
//       userMasterID: null,
//       salaryMonth,
//       journal_id: response?.data?.journal?.journal_id || null
//     };

//     if (accountingType === accountingTypeEnum.BRANCH_WISE) {
//       syncObject.branchMasterID = sync.id;
//     } else if (
//       accountingType === accountingTypeEnum.USER_WISE
//     ) {
//       syncObject.userMasterID = sync.id;
//     }

//     syncRecords.push(syncObject);

//     detailRecords.push({
//       referenceId: sync.id,
//       details: detailsData
//     });
//   } catch (error) {
//     console.error(
//       `Zoho sync failed for ${sync.accountingName}`,
//       error?.response?.data || error.message
//     );

//     failedData.push(sync.accountingName);
//   }
}

// No successful syncs
if (!syncRecords.length) {
  const messages = [];

  if (alreadySyncData.length) {
    messages.push(
      `Already synced: (${alreadySyncData.join(', ')})`
    );
  }

  if (zeroAmountData.length) {
    messages.push(
      `Skipped due to zero amount: (${zeroAmountData.join(', ')})`
    );
  }

  if (failedData.length) {
    messages.push(
      `Failed: (${failedData.join(', ')})`
    );
  }

  return res.status(statusCodes.BAD_REQUEST).json({
    status: statusCodes.BAD_REQUEST,
    message:
      messages.join('. ') ||
      'No records available for Zoho sync.'
  });
}

const transaction = await sequelize.transaction();

try {
  // Bulk insert sync master records
  const createdSyncs = await ZohoSalarySync.bulkCreate(
    syncRecords,
    {
      returning: true,
      transaction,
      individualHooks:true,
      user: req.userDetails
    }
  );

  // Prepare details records
  const finalDetails = [];

  createdSyncs.forEach((createdSync, index) => {
    const details =
      detailRecords[index]?.details || [];

    details.forEach(detail => {
      finalDetails.push({
        ...detail,
        zohoSalarySyncID: createdSync.id
      });
    });
  });

  // Bulk insert details
  if (finalDetails.length) {
    await ZohoSalarySyncDetails.bulkCreate(
      finalDetails,
      {
        transaction,
        individualHooks: true,
        user: req.userDetails
      }
    );
  }

  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  throw error;
}

// Final response message
const messages = [
  `Successfully synced ${syncRecords.length} record(s) to Zoho.`
];

if (alreadySyncData.length) {
  messages.push(
    `Already synced: (${alreadySyncData.join(', ')})`
  );
}

if (zeroAmountData.length) {
  messages.push(
    `Skipped due to zero amount: (${zeroAmountData.join(', ')})`
  );
}

if (failedData.length) {
  messages.push(
    `Failed: (${failedData.join(', ')})`
  );
}

return res.status(statusCodes.OK).json({
  status: statusCodes.OK,
  message: messages.join('. ')
});
        
    } catch (error) {
        next(error);
    }
}

const createSalaryObject = (salary) => ({
    payheadName: salary.hrSalaryField?.PHM?.payheadName || '',
    accountName: salary.accountName || '',
    amount: salary.amount,
    salaryFieldSrNo: salary.hrSalaryField?.salaryFieldSrNo || '',
    isMapped: true,
    salaryFieldId: salary.salaryFieldID
});

exports.listSyncSalary = async(req,res,next)=>{
    try {

        const {userMasterID,branchMasterID,companyMasterID,salaryMonth} = req.body;

        if(!companyMasterID || !salaryMonth){
            return res.status(statusCodes.BAD_REQUEST).json({
                status:statusCodes.BAD_REQUEST,
                message:usermessage.requiredMessage('companyMasterID,salaryMonth')
            })
        };

        const zohoIntegrationData = await ZohoIntegration.findOne({
            where:{
companyMasterID,
isActive:true
            },
            include:[{
                model:ZohoAccountMapping,
                as:'zam',
                include:[{model:HRSalaryFields,attributes:['payheadMasterId']}]
            }]
        });

        if(!zohoIntegrationData) {
             return res.status(statusCodes.OK).json({
                status:statusCodes.NOT_FOUND,
                message:usermessage.notFoundMessage('Zoho Integration with company')
            })
        }

        const accountingType = zohoIntegrationData.accountingType || accountingTypeEnum.COMPANY_WISE;

        const condition = {companyMasterID,salaryMonth};

        const includeModel = [{
            model:ZohoSalarySyncDetails,
             as:'zscd',
             attributes:['salaryFieldID','amount','accountName'],
             include:[{model:HRSalaryFields,attributes:['payheadMasterId','salaryFieldSrNo'],include:[{model:Payheadmaster,as:'PHM',attributes:['payheadName']}]}]
        }];
        let orderBy = [];

        if(accountingType == accountingTypeEnum.BRANCH_WISE){

            includeModel.push({
                model:BranchMaster,
                attributes:['branchName']
            });

            orderBy = [[{model:BranchMaster},'branchName','ASC']];

              if(branchMasterID?.length){
              condition.branchMasterID = {
                [Sequelize.Op.in]:branchMasterID
            }
        }

        }

          if(accountingType == accountingTypeEnum.USER_WISE){

            includeModel.push({
                model:UserMaster,
                attributes:['displayName']
            });

            orderBy = [[{model:UserMaster},'displayName','ASC']];



        if(userMasterID?.length){
            condition.userMasterID = {
                [Sequelize.Op.in]:userMasterID
            }
        }

    };

        const syncedData =  await ZohoSalarySync.findAll({
            where:condition,
            include:includeModel,
            order:orderBy
        });

        const finalData = [];
        const excludeIds = new Set();

        if(syncedData.length){

            if(accountingType == accountingTypeEnum.COMPANY_WISE){

                const obj = {
                    id:companyMasterID,
                    accountingName: '',
                    mappedField:[],
                    unMappedField:[],
                    isSynced:true,
                    salaryCalculated:true
                };

                const salaryDetails = syncedData?.[0]?.zohoSalarySyncDetails || [];

                obj.mappedField = salaryDetails.map(createSalaryObject);

               return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data: [obj],
    }); 



            }

            for(const synced of syncedData){

                let accountingName = '';
                let id = null;

                if(accountingType == accountingTypeEnum.BRANCH_WISE){
                    accountingName = synced.branchMaster?.branchName || '';
                    id = +synced.branchMasterID;
                }else{
                    accountingName = synced.userMaster?.displayName || '';
                    id = +synced.userMasterID;

                }

                 excludeIds.add(id);

                    const obj = {
                    id,
                    accountingName,
                    mappedField:[],
                    unMappedField:[],
                    isSynced:true,
                    salaryCalculated:true
                };

                const salaryDetails = synced.zscd  || [];

                 obj.mappedField = salaryDetails.map(createSalaryObject);

               finalData.push(obj);

            }

        }

        // --------------------------------------------------------------------

        const year = String(salaryMonth).slice(0,4);
        const month = String(salaryMonth).slice(4,6);


        const endDate = year +'-'+month +'-'+daysInMonth(month,year);


        const userCondition = {companyMasterId:companyMasterID,status:1};

        const userIncludeModels= [];

        const excludeIdsArray = [...excludeIds];

        if(accountingType == accountingTypeEnum.BRANCH_WISE){
            userIncludeModels.push({
                required:branchMasterID?.length ? true : false,
                model:EmployeeBranch,
                where:{
                    branchID:{
                        ...(branchMasterID?.length && {
                      [Sequelize.Op.in]:branchMasterID,
                        }),
                       [Sequelize.Op.notIn]:excludeIdsArray
                        
                    },
                    applicableDate:{
                        [Sequelize.Op.lte]:endDate
                    },
                    status:1,
                    [Sequelize.Op.or]:[
                        {
                            endDate:{
                                [Sequelize.Op.gte]:endDate
                            }
                        },
                          {
                            endDate:{
                                [Sequelize.Op.is]:null
                            }
                        }
                    ]
                },
                attributes:['branchID'],
                include:[{model:BranchMaster, as: 'branchMaster',attributes:['branchName']}]
            });

        }

        if(accountingType == accountingTypeEnum.USER_WISE){

            userCondition.userMasterID = {
    ...(userMasterID?.length && {
        [Sequelize.Op.in]: userMasterID
    }),
    [Sequelize.Op.notIn]: excludeIdsArray
};

            
        }

        const userData = await UserMaster.findAll({
            where:userCondition,
            include:userIncludeModels,
            attributes:['userMasterID','displayName']
        });

        const userMasterIds = userData.map(e=>e.userMasterID);

        const zohoMappingFields = zohoIntegrationData.zam || [];

        const zohoMappingFieldsMap = new Map();

for (const field of zohoMappingFields) {
    const accountingKey =
        +field.userMasterID ||
        +field.branchMasterID ||
        +field.companyMasterID;

    const payheadMasterId =
        +field.hrSalaryField?.payheadMasterId || null;

    if (!zohoMappingFieldsMap.has(accountingKey)) {
        zohoMappingFieldsMap.set(accountingKey, new Map());
    }

    zohoMappingFieldsMap
        .get(accountingKey)
        .set(payheadMasterId, {
            accountName: field.accountName,
            payheadMasterId,
            accountName:field.accountName,
            accountID:field.accountID,
            accountType:field.accountType
        });
}

        const salaryTransactionMap = await get_Salary_Transaction_Map(userMasterIds,salaryMonth);

        const mappingAccountingTypeWise = new Map();

        for(const user of userData){
            const userMasterID = +user.userMasterID;

            const salaryData = salaryTransactionMap?.get(userMasterID);

            // if(!salaryData) continue;

         let name = null;
         let key = null;

switch (accountingType) {
  case accountingTypeEnum.BRANCH_WISE:
    name = user.employeeBranches?.[0]?.branchMaster?.branchName;
    key = +user.employeeBranches?.[0]?.branchID;
    break;

  case accountingTypeEnum.USER_WISE:
    name = user.displayName;
    key = userMasterID;
    break;

  default:
    name = null;
    key = companyMasterID;
    break;
}

           if(!mappingAccountingTypeWise.has(key)){
            mappingAccountingTypeWise.set(key,{
                accountingName:name,
                salary:new Map(),
            });
           };

           const allSalaryData = [
    ...(salaryData?.earning || []),
    ...(salaryData?.extraEarning || []),
    ...(salaryData?.netPay || []),
    ...(salaryData?.employeeDeduction || [])
];

           const data = mappingAccountingTypeWise.get(key);

           const mappingFields = zohoMappingFieldsMap.get(key);

           const salaryMap = data.salary;

           for(const salary of allSalaryData){
            const key = +salary.payheadMasterId;

            const mappedData = mappingFields?.get(key);

            if(!salaryMap.has(key)){
salaryMap.set(key,{
payheadName:salary.actualName || salary.payheadName,
accountName:mappedData?.accountName || '',
amount:0,
salaryFieldSrNo:salary.salaryFieldSrNo,
isMapped:!!mappedData,
salaryFieldId:salary.salaryFieldId,
accountName:mappedData?.accountName || '',
accountID:mappedData?.accountID || '',
accountType:mappedData?.accountType || '',
});
            }

            const mappedSalary = salaryMap.get(key);

            mappedSalary.amount += salary.EmployeeSalaryAmount;

           }

        }


        const response = Array.from(
    mappingAccountingTypeWise,
    ([id, value]) => {
        const salaryArray = Array.from(
            value.salary,
            ([payheadMasterId, salaryData]) => ({
                payheadMasterId,
                ...salaryData,
                amount: +(+salaryData.amount).toFixed(2)
            })
        );

      const mappedField = salaryArray.filter(e => e.isMapped);

return {
    id,
    accountingName: value.accountingName,
    mappedField,
    unMappedField: salaryArray.filter(e => !e.isMapped),
    isSynced: false,
    salaryCalculated: Boolean(salaryArray.length),
    zeroAmountFlag: !mappedField.some(e => +e.amount > 0)
};
    }
)

const finalRespone  = [...finalData,...response].sort((a, b) =>
    (a.accountingName || '').localeCompare(
        b.accountingName || '',
        undefined,
        { sensitivity: 'base' }
    )
);;

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data: finalRespone,
    });
        
    } catch (error) {
        next(error);
    }
}