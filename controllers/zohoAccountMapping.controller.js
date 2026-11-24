const ZohoAccountMapping = require('../models/zohoAccountMapping');
const { statusCodes } = require('../utils/commonVars');
const message = require('../response_message/message');
const ZohoIntegration = require('../models/zohoIntegration');
const { accountingTypeEnum } = require('../utils/dbUtils');
const { Sequelize, Op } = require('sequelize');
const BranchMaster = require('../models/branchMaster');
const UserMaster = require('../models/userMaster');
const HRSalaryFields = require('../models/hrSalaryFields');
const Payheadmaster = require('../models/payhead');

// exports.create = async (req, res, next) => {
//   try {
//     const allowedKeys = [
//       'salaryFieldID',
//       'companyMasterID',
//       'accountID',
//       'accountName',
//       'accountType',
//       'branchMasterID',
//       'userMasterID'
//     ];

//     const invalidKeys = invalidKeyParams(req.body, allowedKeys);

//     if (invalidKeys.length > 0) {
//       return res.status(statusCodes.BAD_REQUEST).json({
//         message: `Invalid body parameter(s): ${invalidKeys.join(', ')}`,
//       });
//     }

//     const {companyMasterID, salaryFieldID, branchMasterID,userMasterID,accountID,accountName,accountType } = req.body;

//     if(!companyMasterID || !salaryFieldID){
//          return res.status(statusCodes.BAD_REQUEST).json({
//         status: statusCodes.BAD_REQUEST,
//         message: message.usermessage.requiredMessage('companyMasterID','salaryFieldID'),
//       });
//     }

//     const integration = await ZohoIntegration.findOne({
//       where:{
//         companyMasterID
//       }
//     });

//     if(!integration) {
//         return res.status(statusCodes.BAD_REQUEST).json({
//         status: statusCodes.BAD_REQUEST,
//         message: message.usermessage.notFoundMessage('Zoho Integration for this company'),
//       });
//     }

//     const zohoIntegrationID = integration.id;
//     const accountingType = integration.accountingType;

//     if(accountingType == accountingTypeEnum.BRANCH_WISE && !branchMasterID?.length){
//  return res.status(statusCodes.BAD_REQUEST).json({
//         status: statusCodes.BAD_REQUEST,
//         message: 'Branch is required for branch wise accounting.',
//       });
//     }

//        if(accountingType == accountingTypeEnum.USER_WISE && !userMasterID?.length){
//  return res.status(statusCodes.BAD_REQUEST).json({
//         status: statusCodes.BAD_REQUEST,
//         message: 'User is required for user wise accounting.',
//       });
//     }

//     const condition = {zohoIntegrationID:zohoIntegrationID,salaryFieldID,companyMasterID};

//     if(accountingType == accountingTypeEnum.BRANCH_WISE){
//       condition.branchMasterID = {
//         [Op.in]:branchMasterID
//       }
//     }

//     if(accountingType == accountingTypeEnum.USER_WISE){
//       condition.userMasterID = {
//         [Op.in]:userMasterID
//       }
//     }

//     const allMapingData = await ZohoAccountMapping.findAll({
//       where: condition,
//       include:[{model:BranchMaster,attributes:['branchName']},{model:UserMaster,attributes:['displayName']}]
//     });

//     const mappingMap = new Map();

//     for(const mapping of allMapingData){

//       if(accountingType == accountingTypeEnum.BRANCH_WISE){
//         mappingMap.set(mapping.branchMasterID,mapping);
//         continue;
//       }

//       if(accountingType == accountingTypeEnum.USER_WISE){
//         mappingMap.set(mapping.userMasterID,mapping);
//         continue;
//       }

//         mappingMap.set(mapping.companyMasterID,mapping);
       
//     }

//     const finalData = [];

//     if(accountingType == accountingTypeEnum.BRANCH_WISE){
//       const existedBranch = [];

//        const obj = {
//             companyMasterID,
//             zohoIntegrationID,
//             salaryFieldID,
//             accountID,
//             accountName,
//             accountType,
//             branchMasterID:null
//           };


//       branchMasterID.forEach(element => {
//         const data = mappingMap.get(+element);
//         if(data){
//         existedBranch.push(data.branchMaster?.branchName || '');
//         }else{

//           obj.branchMasterID = element;
         
//           finalData.push(obj);

//         }
//       });

//       if(existedBranch.length){
//           return res.status(statusCodes.BAD_REQUEST).json({
//         status: statusCodes.BAD_REQUEST,
//         message: `Mapping already exists for this Salary Field and branch (${existedBranch.join(',')}).`,
//       });
//       }

//     }

//     if(accountingType == accountingTypeEnum.USER_WISE){
//         const existedUser = [];

//          const obj = {
//             companyMasterID,
//             zohoIntegrationID,
//             salaryFieldID,
//             accountID,
//             accountName,
//             accountType,
//             userMasterID:null
//           };

//       userMasterID.forEach(element => {
//         const data = mappingMap.get(+element);
//         if(data){
// existedUser.push(data.userMaster?.displayName || '');
//         }else{
           
//           obj.userMasterID = element;

//           finalData.push(obj);
//         }
//       });

//        if(existedUser.length){
//           return res.status(statusCodes.BAD_REQUEST).json({
//         status: statusCodes.BAD_REQUEST,
//         message: `Mapping already exists for this Salary Field and user (${existedUser.join(',')}).`,
//       });
//       }
//     }

//     if(accountingType == accountingTypeEnum.COMPANY_WISE){

//       if(allMapingData.length){
//  return res.status(statusCodes.BAD_REQUEST).json({
//         status: statusCodes.BAD_REQUEST,
//         message: 'Mapping already exists for this Salary Field and company.',
//       });
//       }

//         const obj = {
//             companyMasterID,
//             zohoIntegrationID,
//             salaryFieldID,
//             accountID,
//             accountName,
//             accountType,
//           };

//           finalData.push(obj);

//     }


//     await ZohoAccountMapping.bulkCreate(finalData);

//     return res.status(statusCodes.OK).json({
//       stattus: statusCodes.OK,
//       message: message.usermessage.addMessage('Zoho Account Mapping'),
//     });
//   } catch (err) {
//     next(err);
//   }
// };


exports.create = async (req, res, next) => {
  try {
    const allowedKeys = [
      'salaryFieldID',
      'companyMasterID',
      'accountID',
      'accountName',
      'accountType',
      'branchMasterID',
      'userMasterID',
    ];

    const invalidKeys = invalidKeyParams(req.body, allowedKeys);

    if (invalidKeys.length > 0) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: `Invalid body parameter(s): ${invalidKeys.join(', ')}`,
      });
    }

    const {
      companyMasterID,
      salaryFieldID,
      branchMasterID = [],
      userMasterID = [],
      accountID,
      accountName,
      accountType,
    } = req.body;

    const requiredFields = [];

    if (!companyMasterID) requiredFields.push('companyMasterID');
    if (!salaryFieldID) requiredFields.push('salaryFieldID');

    if (requiredFields.length) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: message.usermessage.requiredMessage(...requiredFields),
      });
    }

    const integration = await ZohoIntegration.findOne({
      where: { companyMasterID },
    });

    if (!integration) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message:
          message.usermessage.notFoundMessage(
            'Zoho Integration for this company',
          ),
      });
    }

    const zohoIntegrationID = integration.id;
    const accountingTypeValue = integration.accountingType;

    if (
      accountingTypeValue === accountingTypeEnum.BRANCH_WISE &&
      !branchMasterID.length
    ) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: 'Please select at least one branch for branch-wise accounting.',
      });
    }

    if (
      accountingTypeValue === accountingTypeEnum.USER_WISE &&
      !userMasterID.length
    ) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: 'Please select at least one user for user-wise accounting.',
      });
    }

    const condition = {
      zohoIntegrationID,
      salaryFieldID,
      companyMasterID,
    };

    const modelInclude = [];

    if (accountingTypeValue === accountingTypeEnum.BRANCH_WISE) {
      condition.branchMasterID = {
        [Op.in]: branchMasterID,
      };

      modelInclude.push({
          model: BranchMaster,
          attributes: ['branchName'],
        });

    }

    if (accountingTypeValue === accountingTypeEnum.USER_WISE) {
      condition.userMasterID = {
        [Op.in]: userMasterID,
      };

         modelInclude.push( {
          model: UserMaster,
          attributes: ['displayName'],
        });
    }

    const allMappingData = await ZohoAccountMapping.findAll({
      where: condition,
      include: modelInclude,
    });

    // Create lookup map
    const mappingMap = new Map();

    for (const mapping of allMappingData) {
      switch (accountingTypeValue) {
        case accountingTypeEnum.BRANCH_WISE:
          mappingMap.set(mapping.branchMasterID, mapping);
          break;

        case accountingTypeEnum.USER_WISE:
          mappingMap.set(mapping.userMasterID, mapping);
          break;

        default:
          mappingMap.set(mapping.companyMasterID, mapping);
      }
    }

    const finalData = [];

    // COMPANY WISE
    if (accountingTypeValue === accountingTypeEnum.COMPANY_WISE) {
      if (allMappingData.length) {
        return res.status(statusCodes.BAD_REQUEST).json({
          status: statusCodes.BAD_REQUEST,
          message:
            'Account mapping already exists for the selected salary field.',
        });
      }

      finalData.push({
        companyMasterID,
        zohoIntegrationID,
        salaryFieldID,
        accountID,
        accountName,
        accountType,
      });
    }

    // BRANCH WISE / USER WISE
    if (
      accountingTypeValue === accountingTypeEnum.BRANCH_WISE ||
      accountingTypeValue === accountingTypeEnum.USER_WISE
    ) {
      const selectedIds =
        accountingTypeValue === accountingTypeEnum.BRANCH_WISE
          ? branchMasterID
          : userMasterID;

      const idField =
        accountingTypeValue === accountingTypeEnum.BRANCH_WISE
          ? 'branchMasterID'
          : 'userMasterID';

      const relationField =
        accountingTypeValue === accountingTypeEnum.BRANCH_WISE
          ? 'branchMaster'
          : 'userMaster';

      const nameField =
        accountingTypeValue === accountingTypeEnum.BRANCH_WISE
          ? 'branchName'
          : 'displayName';

      const existingNames = [];

      for (const id of selectedIds) {
        const existingMapping = mappingMap.get(+id);

        if (existingMapping) {
          existingNames.push(
            existingMapping?.[relationField]?.[nameField] || id,
          );
          continue;
        }

        finalData.push({
          companyMasterID,
          zohoIntegrationID,
          salaryFieldID,
          accountID,
          accountName,
          accountType,
          [idField]: id,
        });
      }

      if (existingNames.length) {
        return res.status(statusCodes.BAD_REQUEST).json({
          status: statusCodes.BAD_REQUEST,
          message:
            accountingTypeValue === accountingTypeEnum.BRANCH_WISE
              ? `Account mapping already exists for the selected salary field and branch(es): ${existingNames.join(', ')}.`
              : `Account mapping already exists for the selected salary field and user(s): ${existingNames.join(', ')}.`,
        });
      }
    }

    await ZohoAccountMapping.bulkCreate(finalData,{user:req.userDetails,individualHooks:true});

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: message.usermessage.addMessage('Zoho Account Mapping'),
    });
  } catch (err) {
    next(err);
  }
};


exports.list = async (req, res, next) => {
  try {
    const allowedKeys = ['id','userMasterID','branchMasterID'];

    const invalidKeys = invalidKeyParams(req.body, allowedKeys);

    if (invalidKeys.length > 0) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Invalid body parameter(s): ${invalidKeys.join(', ')}`,
      });
    }

    const {id,userMasterID,branchMasterID} = req.body;

    if(!id) return res.status(statusCodes.BAD_REQUEST).json({
      status:statusCodes.BAD_REQUEST,
        message: message.usermessage.requiredMessage('zohoIntegrationID'),
      });

      const integration = await ZohoIntegration.findOne({
        where:{
          id
        }
      });

      if(!integration){
         return res.status(statusCodes.BAD_REQUEST).json({
      status:statusCodes.BAD_REQUEST,
        message: message.usermessage.notFoundMessage('Integration'),
      });
      }

      const accountingType = integration.accountingType || accountingTypeEnum.COMPANY_WISE;

const condition = {zohoIntegrationID: id};

const includeModel = [{
  model:HRSalaryFields,
  attributes:['payheadMasterId'],
  include:[{model:Payheadmaster,attributes:['payheadName']}]
}];

let orderBy = [];

if(accountingType == accountingTypeEnum.BRANCH_WISE){

    includeModel.push({
model:BranchMaster,
attributes:['branchName']
  });

  orderBy = [[{model:BranchMaster},'branchName','ASC']]

  if(branchMasterID?.length){
 condition.branchMasterID = {
    [Op.in]:branchMasterID
  }
  }

}

if(accountingType == accountingTypeEnum.USER_WISE){

  includeModel.push({
model:UserMaster,
attributes:['displayName']
  });


  orderBy = [[{model:UserMaster},'displayName','ASC']]


  if(userMasterID?.length){
 condition.userMasterID = {
    [Op.in]:userMasterID
  }

  }

}

    const zohoAccountMappingData = await ZohoAccountMapping.findAll({
      attributes: [
        'id',
        'companyMasterID',
        'zohoIntegrationID',
        'salaryFieldID',
        'accountName',
        'branchMasterID',
        'userMasterID'
      ],
      where: condition,
      include:includeModel,
      order:orderBy
    });

    if(accountingType == accountingTypeEnum.COMPANY_WISE){
       return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data: zohoAccountMappingData,
    });
    }



   const mappingMap = new Map();

for (const data of zohoAccountMappingData) {
  const isBranchWise =
    accountingType === accountingTypeEnum.BRANCH_WISE;

  const id = isBranchWise
    ? data.branchMasterID
    : data.userMasterID;

  const name = isBranchWise
    ? data.branchMaster?.branchName
    : data.userMaster?.displayName;

  if (!mappingMap.has(id)) {
    mappingMap.set(id, {
      id,
      name,
      data: [],
    });
  }

  mappingMap.get(id).data.push(data);
}

const mappingData = Array.from(mappingMap.values());


    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data: mappingData,
    });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const allowedKeys = ['id'];

    const invalidKeys = invalidKeyParams(req.params, allowedKeys);

    if (invalidKeys.length > 0) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Invalid body parameter(s): ${invalidKeys.join(', ')}`,
      });
    }
    const id = Number(req.params.id);

    await ZohoAccountMapping.destroy({
      where: {
        id,
      },
    });

    return res.status(statusCodes.OK).json({
      stattus: statusCodes.OK,
      message: message.usermessage.removeMessage('Zoho Account Mapping'),
    });
  } catch (err) {
    next(err);
  }
};

function invalidKeyParams(query, allowedKeys) {
  return Object.keys(query).filter((key) => !allowedKeys.includes(key));
}
