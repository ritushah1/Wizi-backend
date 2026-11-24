const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const SalaryBasedOnDays = require('../models/salaryBasedOnDays');
const {
  statusCodes,
} = require('../utils/commonVars');
const { usermessage } = require('../response_message/message');
const HRSalaryMaster = require('../models/hrSalaryMaster');
const GradeSalaryStructure = require('../models/gradeSalaryStructure');
const GradeStructure = require('../models/gradeStructure');
const HRSalaryFields = require('../models/hrSalaryFields');
const { default_payheadMasterIds, salaryFieldSrNoFields, payheadMasterIdsMapping } = require('../utils/dbUtils');
const UserMaster = require('../models/userMaster');
const Payheadmaster = require('../models/payhead');

async function checkAlreadyExist(gradeStructureID){

    if(!gradeStructureID) return null;

    const condition = {gradeStructureID};
    return await SalaryBasedOnDays.findOne({
            where:condition
        });
}

exports.add = async(req,res,next)=>{
    try {

        const {gradeStructureID,salaryFieldID,maxPresentDays,amount,maxPresentDays1,amount1} = req.body;

        let {id = null} = req.body; 

        const alreadyExist = await checkAlreadyExist(gradeStructureID);

        if(alreadyExist) id = alreadyExist.id;

        if(id){

              await SalaryBasedOnDays.update({
salaryFieldID,maxPresentDays,amount,maxPresentDays1,amount1
        },
    {
        where:{
id
        },
        user:req.userDetails,
        individualHooks:true
    });

    return res.status(statusCodes.OK).json({
            status:statusCodes.OK,
            message:usermessage.updateMessage('Based On Days Salary')
        });

        } 

        await SalaryBasedOnDays.create({
gradeStructureID,salaryFieldID,maxPresentDays,amount,maxPresentDays1,amount1
        },
    {
        user:req.userDetails
    });

return res.status(statusCodes.OK).json({
            status:statusCodes.OK,
            message:usermessage.addMessage('Based On Days Salary')
        });

        
    } catch (error) {
        next(error);
    }
}

exports.delete = async(req,res,next)=>{
    try {

        const {id} = req.params;

        const data = await SalaryBasedOnDays.findByPk(id);

        if(!data) return  res.status(statusCodes.NOT_FOUND).json({
            status:statusCodes.NOT_FOUND,
            message:usermessage.notFoundMessage('Based On Days Salary')
        });

        const checkAssignSalary = await HRSalaryMaster.findOne({
            include:[{
                model:GradeSalaryStructure,
                where:{
                    gradeStructureID:data.gradeStructureID
                }
            }]
        });

         if(checkAssignSalary) return  res.status(statusCodes.BAD_REQUEST).json({
            status:statusCodes.BAD_REQUEST,
            message:'Salary structure is already assigned to employees and cannot be deleted.'
        });

await data.destroy({
    user:req.userDetails
});

        
return res.status(statusCodes.OK).json({
            status:statusCodes.OK,
            message:usermessage.deleteMessage('Based On Days Salary')
        });

        
    } catch (error) {
        next(error);
    }
}

exports.getByGradeStructureId = async(req,res,next)=>{
    try {

         const {id} = req.params;

        if(!id) return res.status(statusCodes.BAD_REQUEST).json({
            status:statusCodes.BAD_REQUEST,
            message:usermessage.ValidParameters
        });

             const gradeData = await GradeStructure.findOne({
            where:{
gradeStructureID:id,
baseOnCalculation:'D'
            },
            include:[{required:true,model:GradeSalaryStructure,attributes:['salaryFieldID'],include:[{model:HRSalaryFields,
                where:{
                    payheadMasterId:{
                [Sequelize.Op.notIn]:default_payheadMasterIds,
            },
            salaryFieldSrNo:salaryFieldSrNoFields.EARNING
        },
            attributes:['payheadMasterId']}]}]
        });

        if(!gradeData)
            return res.status(statusCodes.OK).json({
            status:statusCodes.NOT_FOUND,
           message:'Daily Grade Structure not found!'
        });;

           const earning = gradeData.gradeSalaryStructures || [];
           

  if (earning.length != 1) return res.status(statusCodes.OK).json({
            status:statusCodes.BAD_REQUEST,
           message:'This setting is available only when the earning component contains Basic pay and no other pay heads.'
        });
 

        const data = await SalaryBasedOnDays.findOne({
            where:{
                gradeStructureID:id
            },
            include:[
                {model:HRSalaryFields,attributes:['salaryFieldID'],include:[{model:Payheadmaster,attributes:['payheadName']}]},
                {model:UserMaster,as:'createdBy',attributes:['displayName']},
                {model:UserMaster,as:'updatedBy',attributes:['displayName']}
            ]
        });

        const hrsalaryField = !data ? await HRSalaryFields.findOne({
            where:{
                payheadMasterId:payheadMasterIdsMapping.BASIC,
                status:1
            },
            include:[{model:Payheadmaster,attributes:['payheadName']}],
            attributes:['salaryFieldID']
        }):null;

       return res.status(statusCodes.OK).json({
            status:statusCodes.OK,
           data,
           hrsalaryField
        });
        
    } catch (error) {
        next(error);
    }
}