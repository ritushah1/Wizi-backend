const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const LwfMaster = require('../models/lwfMaster');
const StateMaster = require('../models/statemaster');
const message = require('../response_message/message');
const { lwfDeductionType, statusCodes } = require('../utils/commonVars');
const { month_dict } = require('../utils/commonUtilFunctions');
const HRSalaryMasterFields = require('../models/hrSalaryMaster');
const GradeSalaryStructure = require('../models/gradeSalaryStructure');
const HRSalaryFields = require('../models/hrSalaryFields');
const { payheadMasterIdsMapping, lwfDeductionMethodEnum } = require('../utils/dbUtils');
const UserMaster = require('../models/userMaster');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const CityMaster = require('../models/citymaster');
const moment = require('moment');


exports.getAllLwfMaster = async (req, res, next) => {
  try {
    const { limit, page, search, stateID } = req.body;

    const condition = {};

    if (stateID) {
      condition.stateID = stateID;
    }

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const { rows: lwfMasterData, count } = await LwfMaster.findAndCountAll({
      where: condition,
      ...paginationQuery,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: StateMaster,
          attributes: ['stateName'],
        },
      ],
    });

    return res.status(200).json({
      status: 200,
      data: lwfMasterData,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};

exports.postAddLwfMaster = async (req, res, next) => {
  try {
    let { stateID, employeeAmt, employerAmt, deductionType, month, applicableYearMonth,applicableAct,deductionMethod,employeePer,employerPer,employeeCapping,employerCapping } = req.body;

    if (!stateID || !deductionType || !applicableAct || !deductionMethod || !applicableYearMonth) {
      return res.status(400).json({
        status: 400,
        message: 'All fields are required (stateID, employeeAmt, employerAmt, deductionType, applicableAct, deductionMethod, applicableYearMonth )',
      });
    }


       const existData = await LwfMaster.findOne({
      where:{
stateID,
applicableYearMonth,
applicableAct:{
  [Sequelize.Op.overlap]:applicableAct
}
      }
    });


    const year = String(applicableYearMonth).slice(0, 4);
    const Month = String(applicableYearMonth).slice(4,6);


   const formattedMonth = month_dict[Month] + '-' + year;


if (existData) {
  return res.status(statusCodes.BAD_REQUEST).json({
    status: statusCodes.BAD_REQUEST,
    message: `Data has already been added for this state from the applicable month ${formattedMonth}.`,
  });
}

if(!Object.values(lwfDeductionMethodEnum).includes(deductionMethod)){
   return res.status(statusCodes.BAD_REQUEST).json({
    status: statusCodes.BAD_REQUEST,
    message: `Invalid deduction method : ${deductionMethod}`,
  });
}

if(deductionMethod == lwfDeductionMethodEnum.GROSS_PERCENTAGE){
employeeAmt = null;
employerAmt = null;
}else{

    employeePer = null;
        employerPer = null;
        employeeCapping = null;
        employerCapping = null;

}

    // Business Logic for months based on deduction type
    if (deductionType === lwfDeductionType.MONTHLY) {
      month = null;
    } else if (deductionType === lwfDeductionType.HALFYEARLY) {
      if (!Array.isArray(month) || month.length !== 2) {
        return res.status(400).json({
          status: 400,
          message: 'Half Yearly deduction requires 2 months in the array',
        });
      }
    } else if (deductionType === lwfDeductionType.YEARLY) {
      if (!Array.isArray(month) || month.length !== 1) {
        return res.status(400).json({
          status: 400,
          message: 'Yearly deduction requires 1 month in the array',
        });
      }
    }

    await LwfMaster.create(
      {
        stateID,
        employeeAmt,
        employerAmt,
        deductionType,
        month,
        applicableYearMonth,
        applicableAct,
        deductionMethod,
        employeePer,
        employerPer,
        employeeCapping,
        employerCapping
      },
      { user: req.userDetails },
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('LWF Master'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getLwfMasterById = async (req, res, next) => {
  try {
    const { lwfMasterID } = req.body;

    if (!lwfMasterID) {
      return res.status(400).json({
        status: 400,
        message: message.usermessage.notFoundMessage('LWF Master ID'),
      });
    }

    const lwfMasterData = await LwfMaster.findOne({
      where: { lwfMasterID },
      include: [
        {
          model: StateMaster,
          attributes: ['stateName'],
        },
      ],
    });

    if (!lwfMasterData) {
      return res.status(404).json({
        status: 404,
        message: message.usermessage.notFoundMessage('LWF Master'),
      });
    }

    return res.status(200).json({
      status: 200,
      data: lwfMasterData,
    });
  } catch (err) {
    next(err);
  }
};

exports.postUpdateLwfMaster = async (req, res, next) => {
  try {
    let { lwfMasterID, stateID, employeeAmt, employerAmt, deductionType, month, applicableYearMonth ,applicableAct,deductionMethod,employeePer,employerPer,employeeCapping,employerCapping} = req.body;


      if (!lwfMasterID || !stateID || !deductionType || !applicableAct || !deductionMethod || !applicableYearMonth) {
      return res.status(400).json({
        status: 400,
        message: 'All fields are required (lwfMasterID, stateID, employeeAmt, employerAmt, deductionType, applicableAct, deductionMethod, applicableYearMonth )',
      });
    }

    const existData = await LwfMaster.findOne({
      where:{
stateID,
applicableYearMonth,
lwfMasterID:{
  [Sequelize.Op.ne]:lwfMasterID
},
applicableAct:{
  [Sequelize.Op.overlap]:applicableAct
}
      }
    });


    const year = String(applicableYearMonth).slice(0, 4);
    const Month = String(applicableYearMonth).slice(4,6);


   const formattedMonth = month_dict[Month] + '-' + year;

if (existData) {
  return res.status(statusCodes.BAD_REQUEST).json({
    status: statusCodes.BAD_REQUEST,
    message: `Data has already been added for this state from the applicable month ${formattedMonth}.`,
  });
}


if(!Object.values(lwfDeductionMethodEnum).includes(deductionMethod)){
   return res.status(statusCodes.BAD_REQUEST).json({
    status: statusCodes.BAD_REQUEST,
    message: `Invalid deduction method : ${deductionMethod}`,
  });
}

if(deductionMethod == lwfDeductionMethodEnum.GROSS_PERCENTAGE){
employeeAmt = null;
employerAmt = null;
}else{

    employeePer = null;
        employerPer = null;
        employeeCapping = null;
        employerCapping = null;

}

    // Business Logic for months based on deduction type
    if (deductionType === lwfDeductionType.MONTHLY) {
      month = null;
    } else if (deductionType === lwfDeductionType.HALFYEARLY) {
      if (!Array.isArray(month) || month.length !== 2) {
        return res.status(400).json({
          status: 400,
          message: 'Half Yearly deduction requires 2 months in the array',
        });
      }
    } else if (deductionType === lwfDeductionType.YEARLY) {
      if (!Array.isArray(month) || month.length !== 1) {
        return res.status(400).json({
          status: 400,
          message: 'Yearly deduction requires 1 month in the array',
        });
      }
    }

    const [updated] = await LwfMaster.update(
      {
        stateID,
        employeeAmt,
        employerAmt,
        deductionType,
        month,
        applicableYearMonth,
        applicableAct,
        deductionMethod,
        employeePer,
        employerPer,
        employeeCapping,
        employerCapping
      },
      {
        where: { lwfMasterID },
        individualHooks: true,
        user: req.userDetails,
      },
    );

    if (!updated) {
      return res.status(404).json({
        status: 404,
        message: message.usermessage.notFoundMessage('LWF Master'),
      });
    }

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('LWF Master'),
    });
  } catch (err) {
    next(err);
  }
};

exports.postDeleteLwfMaster = async (req, res, next) => {
  try {
    const { lwfMasterID } = req.body;

    if (!lwfMasterID) {
      return res.status(400).json({
        status: 400,
        message: message.usermessage.notFoundMessage('LWF Master ID'),
      });
    }

    const deleted = await LwfMaster.destroy({
      where: { lwfMasterID },
      user: req.userDetails,
    });

    if (!deleted) {
      return res.status(404).json({
        status: 404,
        message: message.usermessage.notFoundMessage('LWF Master'),
      });
    }

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('LWF Master'),
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------- don't call/delete this api -------------------------

exports.addState_SalaryMaster = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const currentDate = moment().format('YYYY-MM-DD');

    // 1) Find only those user + gradeStructure combinations
    //    where the assigned structure contains Employee/Employer LWF
    const eligibleStructureRows = await HRSalaryMasterFields.findAll({
      where: {
        stateid: {
          [Sequelize.Op.is]: null,
        },
      },
      attributes: ['salaryMasterID', 'userMasterID'],
      include: [
        {
          model: GradeSalaryStructure,
          as: 'GSS',
          required: true,
          attributes: ['gradeStructureID'],
          include: [
            {
              model: HRSalaryFields,
              as: 'HSF',
              required: true,
              attributes: [],
              where: {
                payheadMasterId: {
                  [Sequelize.Op.in]: [
                    payheadMasterIdsMapping.EMPLOYEE_LWF,
                    payheadMasterIdsMapping.EMPLOYER_LWF,
                  ],
                },
              },
            },
          ],
        },
      ],
      raw: true,
      transaction,
    });

    if (!eligibleStructureRows.length) {
      await transaction.commit();
      return res.status(statusCodes.OK).json({
        status: statusCodes.OK,
        message: 'No records found to update.',
      });
    }

    /**
     * Build eligible combination map:
     * key = `${userMasterID}_${gradeStructureID}`
     */
    const eligibleCombinationMap = new Map();
    const userIds = new Set();
    const gradeStructureIds = new Set();

    for (const row of eligibleStructureRows) {
      const userMasterID = +row.userMasterID;
      const gradeStructureID = +row['GSS.gradeStructureID'];

      const key = `${userMasterID}_${gradeStructureID}`;

      eligibleCombinationMap.set(key, {
        userMasterID,
        gradeStructureID,
      });

      userIds.add(userMasterID);
      gradeStructureIds.add(gradeStructureID);
    }

    // 2) Fetch all salary rows for those user + gradeStructure combinations
    
    const allStructureSalaryRows = await HRSalaryMasterFields.findAll({
      where: {
        stateid: {
          [Sequelize.Op.is]: null,
        },
        userMasterID: {
          [Sequelize.Op.in]: [...userIds],
        },
      },
      attributes: ['salaryMasterID', 'userMasterID'],
      include: [
        {
          model: GradeSalaryStructure,
          as: 'GSS',
          required: true,
          attributes: ['gradeStructureID'],
          where: {
            gradeStructureID: {
              [Sequelize.Op.in]: [...gradeStructureIds],
            },
          },
        },
      ],
      raw: true,
      transaction,
    });

    // Keep only exact eligible combinations (user + gradeStructure)
    const finalSalaryRows = [];
    for (const row of allStructureSalaryRows) {
      const userMasterID = +row.userMasterID;
      const gradeStructureID = +row['GSS.gradeStructureID'];

      const key = `${userMasterID}_${gradeStructureID}`;
      if (eligibleCombinationMap.has(key)) {
        finalSalaryRows.push({
          salaryMasterID: +row.salaryMasterID,
          userMasterID,
          gradeStructureID,
        });
      }
    }

    if (!finalSalaryRows.length) {
      await transaction.commit();
      return res.status(statusCodes.OK).json({
        status: statusCodes.OK,
        message: 'No eligible salary rows found to update.',
      });
    }

    // 3) Fetch state of users
    const userMasterData = await UserMaster.findAll({
      where: {
        userMasterID: {
          [Sequelize.Op.in]: [...userIds],
        },
      },
      attributes: ['userMasterID'],
      include: [
        {
          model: EmployeeBranch,
          as: 'emp_branch',
          required: true,
          attributes: [],
          where: {
            status: 1,
            applicableDate: {
              [Sequelize.Op.lte]: currentDate,
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.is]: null,
                },
              },
              {
                endDate: {
                  [Sequelize.Op.gte]: currentDate,
                },
              },
            ],
          },
          include: [
            {
              model: BranchMaster,
              as: 'branchMaster',
              attributes: [],
              include: [
                {
                  model: CityMaster,
                  attributes: ['stateMasterID'],
                },
              ],
            },
          ],
        },
      ],
      raw: true,
      transaction,
    });

    const userStateMap = new Map();

    for (const user of userMasterData) {
      const userMasterID = +user.userMasterID;
      const stateId =
        user['emp_branch.branchMaster.cityMaster.stateMasterID'] || null;

      if (stateId) {
        userStateMap.set(userMasterID, stateId);
      }
    }

    // 4) Group salaryMasterIDs by state for bulk update
    const stateWiseSalaryIds = new Map();
    const updatedCombinationSet = new Set();

    for (const row of finalSalaryRows) {
      const { salaryMasterID, userMasterID, gradeStructureID } = row;
      const stateId = userStateMap.get(userMasterID);

      if (!stateId) continue;

      if (!stateWiseSalaryIds.has(stateId)) {
        stateWiseSalaryIds.set(stateId, []);
      }

      stateWiseSalaryIds.get(stateId).push(salaryMasterID);
      updatedCombinationSet.add(`${userMasterID}_${gradeStructureID}`);
    }

    // 5) Update state in bulk
    const updatePromises = [];

    for (const [stateId, salaryMasterIDs] of stateWiseSalaryIds.entries()) {
      updatePromises.push(
        HRSalaryMasterFields.update(
          { stateid: stateId },
          {
            where: {
              salaryMasterID: {
                [Sequelize.Op.in]: salaryMasterIDs,
              },
            },
            transaction,
          }
        )
      );
    }

    await Promise.all(updatePromises);
    await transaction.commit();

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: `State updated successfully for ${updatedCombinationSet.size} salary structure assignments.`,
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};
