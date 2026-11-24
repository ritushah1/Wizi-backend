const Sequelize = require('sequelize');
const SkillsetsformModel = require('../models/skillsetsform');
const logger = require('../config/logger');
const message = require('../response_message/message');
const sequelize = require('../config/database');
const companyMaster = require('../models/companyMaster');
const DesignationMaster = require('../models/designation');
const UserMaster = require('../models/userMaster');
const SkillSets = require('../models/skillsets');
const MonthlySkillsetsForm = require('../models/monthlySkillsetsform');

exports.AddSkillSetsForm = async (req, res, next) => {
  try {
    let { skillSetsID, companyMasterID, designationID } = await req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    let insert_db_status;

    let checkPerDesignation = await SkillsetsformModel.findAll({
      raw: true,
      where: {
        companyMasterId: companyMasterID,
        designationID: designationID,
        status: 1,
      },
    });

    if (checkPerDesignation.length > 0) {
      return res.status(200).json({
        status: 400,
        message:
          'Form is there for This Designation You Can Only Update form For this Designation',
      });
    }

    const duplicates = [];
    const uniqueValues = new Set();

    for (const value of skillSetsID) {
      if (uniqueValues.has(value)) {
        let get_one_data = await SkillSets.findAll({
          raw: true,
          where: {
            skillSetID: value,
          },
        });
        duplicates.push(get_one_data[0].skillSet);
      } else {
        uniqueValues.add(value);
      }
    }

    if (duplicates.length > 0) {
      return res.status(200).json({
        status: 400,
        message: duplicates + ' Duplicate SkillSets Found',
      });
    }

    let result = await sequelize.transaction(async (t) => {
      insert_db_status = await SkillsetsformModel.create({
        skillSetsID: skillSetsID,
        companyMasterId: companyMasterID,
        designationID: designationID,
        createBy: createBy,
        createByIp: createByIp,
      });
    });

    res.status(200).json({
      status: 200,
      message: 'SkillsetsForm Added Successfully.',
    });
  } catch (err) {
    next(err);
  }
};

exports.UpdateSkillSetsForm = async (req, res, next) => {
  try {
    let = { skillsetsFormID, skillSetsID } = await req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    let change_data_status;

    const duplicates = [];
    const uniqueValues = new Set();

    for (const value of skillSetsID) {
      if (uniqueValues.has(value)) {
        duplicates.push(value);
      } else {
        uniqueValues.add(value);
      }
    }

    if (duplicates.length > 0) {
      return res
        .status(200)
        .json({ status: 400, message: 'Duplicate SkillSets Found' });
    }

    let result = await sequelize.transaction(async (t) => {
      change_data_status = await SkillsetsformModel.update(
        {
          skillSetsID,
          updateBy,
          updateByIp,
        },
        {
          where: { skillsetsFormID: skillsetsFormID },
        },
      );
    });

    res
      .status(200)
      .json({ status: 200, message: 'SkillsetsForm Updated Successfully' });
  } catch (err) {
    next(err);
  }
};

exports.getSkillSetsFormById = async (req, res, next) => {
  try {
    let SkillsetsformData = await SkillsetsformModel.findAll({
      raw: true,
      where: {
        skillsetsFormID: req.params.id,
      },
      include: [
        {
          model: companyMaster,
          attributes: ['companyMasterID', 'companyName'],
        },
        {
          model: DesignationMaster,
          attributes: ['designationId', 'designationName'],
        },
      ],
    });

    for (var j = 0; j < SkillsetsformData.length; j++) {
      let get_one_data = await SkillSets.findAll({
        where: {
          skillSetID: SkillsetsformData[j].skillSetsID,
        },
        include: [
          {
            model: companyMaster,
            attributes: ['companyMasterID', 'companyName'],
          },
        ],
      });

      let user1 = await UserMaster.findOne({
        where: {
          userMasterID: SkillsetsformData[j].createBy,
        },
      });
      let user2 = await UserMaster.findOne({
        where: {
          userMasterID: SkillsetsformData[j].updateBy,
        },
      });

      if (user1) {
        SkillsetsformData[j].createBy = user1.displayName;
      }
      if (user2) {
        SkillsetsformData[j].updateBy = user2.displayName;
      }
      if (get_one_data) {
        SkillsetsformData[j].skillSetsID = get_one_data;
      }
    }

    if (!SkillsetsformData)
      res.status(200).json({ status: 200, message: 'No Record Found' });

    res.status(200).json({ status: 200, data: SkillsetsformData });
  } catch (err) {
    next(err);
  }
};

exports.getSkillSetsFormByCompanyId = async (req, res, next) => {
  try {
    let { limit, page, companyMasterID, designationID } = await req.body;
    let offset = (page - 1) * limit;
    let SkillsetsformData, totalcount;
    if (page == '' && limit == '') {
      if (!designationID) {
        SkillsetsformData = await SkillsetsformModel.findAll({
          where: {
            companyMasterId: companyMasterID,
            status: 1,
          },
          order: [['createdAt', 'ASC']],
          include: [
            {
              model: companyMaster,
              attributes: ['companyMasterID', 'companyName'],
            },
            {
              model: DesignationMaster,
              attributes: ['designationId', 'designationName'],
            },
          ],
        });

        for (var j = 0; j < SkillsetsformData.length; j++) {
          let get_one_data = await SkillSets.findAll({
            where: {
              skillSetID: SkillsetsformData[j].skillSetsID,
            },
            include: [
              {
                model: companyMaster,
                attributes: ['companyMasterID', 'companyName'],
              },
            ],
          });

          let user1 = await UserMaster.findOne({
            where: {
              userMasterID: SkillsetsformData[j].createBy,
            },
          });
          let user2 = await UserMaster.findOne({
            where: {
              userMasterID: SkillsetsformData[j].updateBy,
            },
          });

          if (user1) {
            SkillsetsformData[j].createBy = user1.displayName;
          }
          if (user2) {
            SkillsetsformData[j].updateBy = user2.displayName;
          }
          if (get_one_data) {
            SkillsetsformData[j].skillSetsID = get_one_data;
          }
        }

        totalcount = await SkillsetsformModel.count({
          raw: true,
          where: {
            companyMasterId: companyMasterID,
            status: 1,
          },
        });
      } else {
        SkillsetsformData = await SkillsetsformModel.findAll({
          where: {
            companyMasterId: companyMasterID,
            designationID: designationID,
            status: 1,
          },
          order: [['createdAt', 'ASC']],
          include: [
            {
              model: companyMaster,
              attributes: ['companyMasterID', 'companyName'],
            },
            {
              model: DesignationMaster,
              attributes: ['designationId', 'designationName'],
            },
          ],
        });

        for (var j = 0; j < SkillsetsformData.length; j++) {
          let get_one_data = await SkillSets.findAll({
            where: {
              skillSetID: SkillsetsformData[j].skillSetsID,
            },
            include: [
              {
                model: companyMaster,
                attributes: ['companyMasterID', 'companyName'],
              },
            ],
          });

          let user1 = await UserMaster.findOne({
            where: {
              userMasterID: SkillsetsformData[j].createBy,
            },
          });
          let user2 = await UserMaster.findOne({
            where: {
              userMasterID: SkillsetsformData[j].updateBy,
            },
          });

          if (user1) {
            SkillsetsformData[j].createBy = user1.displayName;
          }
          if (user2) {
            SkillsetsformData[j].updateBy = user2.displayName;
          }
          if (get_one_data) {
            SkillsetsformData[j].skillSetsID = get_one_data;
          }
        }

        totalcount = await SkillsetsformModel.count({
          raw: true,
          where: {
            companyMasterId: companyMasterID,
            designationID: designationID,
            status: 1,
          },
        });
      }
    } else {
      if (!designationID) {
        SkillsetsformData = await SkillsetsformModel.findAll({
          where: {
            companyMasterId: companyMasterID,
            status: 1,
          },
          limit: limit,
          offset: offset,
          order: [['createdAt', 'ASC']],
          include: [
            {
              model: companyMaster,
              attributes: ['companyMasterID', 'companyName'],
            },
            {
              model: DesignationMaster,
              attributes: ['designationId', 'designationName'],
            },
          ],
        });

        for (var j = 0; j < SkillsetsformData.length; j++) {
          let get_one_data = await SkillSets.findAll({
            where: {
              skillSetID: SkillsetsformData[j].skillSetsID,
            },
            include: [
              {
                model: companyMaster,
                attributes: ['companyMasterID', 'companyName'],
              },
            ],
          });

          let user1 = await UserMaster.findOne({
            where: {
              userMasterID: SkillsetsformData[j].createBy,
            },
          });
          let user2 = await UserMaster.findOne({
            where: {
              userMasterID: SkillsetsformData[j].updateBy,
            },
          });

          if (user1) {
            SkillsetsformData[j].createBy = user1.displayName;
          }
          if (user2) {
            SkillsetsformData[j].updateBy = user2.displayName;
          }
          if (get_one_data) {
            SkillsetsformData[j].skillSetsID = get_one_data;
          }
        }

        totalcount = await SkillsetsformModel.count({
          raw: true,
          where: {
            companyMasterId: companyMasterID,
            status: 1,
          },
        });
      } else {
        SkillsetsformData = await SkillsetsformModel.findAll({
          where: {
            companyMasterId: companyMasterID,
            designationID: designationID,
            status: 1,
          },
          limit: limit,
          offset: offset,
          order: [['createdAt', 'ASC']],
          include: [
            {
              model: companyMaster,
              attributes: ['companyMasterID', 'companyName'],
            },
            {
              model: DesignationMaster,
              attributes: ['designationId', 'designationName'],
            },
          ],
        });

        for (var j = 0; j < SkillsetsformData.length; j++) {
          let get_one_data = await SkillSets.findAll({
            where: {
              skillSetID: SkillsetsformData[j].skillSetsID,
            },
            include: [
              {
                model: companyMaster,
                attributes: ['companyMasterID', 'companyName'],
              },
            ],
          });

          let user1 = await UserMaster.findOne({
            where: {
              userMasterID: SkillsetsformData[j].createBy,
            },
          });
          let user2 = await UserMaster.findOne({
            where: {
              userMasterID: SkillsetsformData[j].updateBy,
            },
          });

          if (user1) {
            SkillsetsformData[j].createBy = user1.displayName;
          }
          if (user2) {
            SkillsetsformData[j].updateBy = user2.displayName;
          }
          if (get_one_data) {
            SkillsetsformData[j].skillSetsID = get_one_data;
          }
        }

        totalcount = await SkillsetsformModel.count({
          raw: true,
          where: {
            companyMasterId: companyMasterID,
            designationID: designationID,
            status: 1,
          },
        });
      }
    }

    res.status(200).json({
      status: 200,
      data: SkillsetsformData,
      totalcount: totalcount,
    });
  } catch (err) {
    next(err);
  }
};
