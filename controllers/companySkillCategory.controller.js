
const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanySkillCategory = require('../models/companySkillCategory');
const { statusCodes } = require('../utils/commonVars');
const message = require('../response_message/message');
const companyMaster = require('../models/companyMaster');
const { SkillCategoryType, defaultSkillCategory } = require('../utils/dbUtils');

exports.getCompanyWiseSkillCategory = async (req, res, next) => {
  try {
    let { page, limit,companyMasterID } = await req.body;

    if(!companyMasterID)return res.status(statusCodes.BAD_REQUEST).json({ status: statusCodes.BAD_REQUEST, message:message.usermessage.requiredMessage('companyMasterID') });

    const condition = {companyMasterID};

    const paginationQuery =
      page && limit ? { offset: (page - 1) * limit, limit } : {};
    
    const { rows, count } = await CompanySkillCategory.findAndCountAll({
      where: condition,
      ...paginationQuery,
      order: [['createdAt', 'ASC']],
    });

    return res.status(200).json({ status: 200, data: rows, totalcount: count });
  } catch (error) {
    next(error);
  }
};

exports.addDataCompanyWiseSkillCategory = async (req,res,next)=>{
  try {

    const companyData = await companyMaster.findAll({
      where:{
        status:[0,1],
      },
      order:[['companyMasterID','ASC']]
    });

    const companyIds = companyData.map(e=>e.companyMasterID);

    const allCompanySkillCategory = await CompanySkillCategory.findAll({
      where:{
        companyMasterID:{
          [Sequelize.Op.in]:companyIds
        }
      }
    });

 const companyWiseMap = new Map();

for (const category of allCompanySkillCategory) {
  const key = +category.companyMasterID;

  if (!companyWiseMap.has(key)) {
    companyWiseMap.set(key, []);
  }

  companyWiseMap.get(key).push(category.skillCategory);
}

    const finalData = [];

    const defaultSkillCategoryData = defaultSkillCategory;

    for(const data of companyData){
      const companyId = +data.companyMasterID;
      const createBy = data.createBy;
      const createByIp = data.createByIp;

      const companyWiseData = companyWiseMap.get(companyId);

      for(const skillCategory of defaultSkillCategoryData){

        const category = skillCategory.value;

        if(companyWiseData?.includes(category)) continue;

        finalData.push({
companyMasterID:companyId,
skillCategory:category,
displayName:skillCategory.key,
createBy,
createByIp
        });
      }

    };


    await CompanySkillCategory.bulkCreate(finalData);

    return res.status(statusCodes.OK).json({
      status:statusCodes.OK,
      message:'Data added successfully.',
      recordAdded:finalData.length
    });
    
  } catch (error) {
    next(error);
  }
}