const Designation = require('../models/designation');
const message = require('../response_message/message');
const companyMaster = require('../models/companyMaster');
const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const readXlsxFile = require('read-excel-file/node');
const UserMaster = require('../models/userMaster');
const EmployeeDesignation = require('../models/employeeDesignation');
const { generateExcel } = require('../utils/exportData');
const {
  DatabaseOperationEnum,
  companyCreateByDefaultUser,
} = require('../utils/dbUtils');
const fs = require('fs');
const path = require('path');
const { userAttributes, statusCodes } = require('../utils/commonVars');
const {
  capitalize,
  getDepartment_SkillCategoryWise,
} = require('../utils/commonUtilFunctions');
const CompanySkillCategory = require('../models/companySkillCategory');
const ExcelJS = require('exceljs');
const { includes } = require('lodash');
/**
 * save city data.
 *
 * @body {createBy} createBy user id of user who added the city.
 * @body {number} createBy if any user change data then updateBy id change.
 
 */
exports.postAddDesignation = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      designationName,
      jobdescription,
      companyMasterID,
      status,
      parentDesignation,
      skillCategory,
    } = await req.body;

    designationName = designationName.trim();
    const dbOperation = DatabaseOperationEnum.CREATE;

    const findDesignation = await Designation.findOne({
      where: {
        designationName: {
          [Sequelize.Op.iLike]: designationName,
        },
        companyMasterID: companyMasterID,
        status: 1,
      },
      transaction,
    });

    if (findDesignation) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyExists(
          'Designation With Same Name',
        ),
      });
    }

    let designationObject = {
      designationName,
      companyMasterID,
      jobdescription,
      status,
      parentDesignation,
      skillCategory,
      createBy: req.userDetails.userMasterId,
      createByIp: req.userDetails.userIpAddress,
    };

    await Designation.create(designationObject, {
      individualHooks: true,
      transaction,
      dbOperation,
      user: req.userDetails,
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Designation'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

/**
 * find data with Designation id
 *
 * @param {id} DesignationID  to fetch city name
 */

exports.getDesignationId = async (req, res, next) => {
  try {
    const getDesignationByID = await Designation.findOne({
      where: { designationId: req.params.id, status: ['0', '1'] },
      raw: true,
    });

    if (!getDesignationByID) {
      return res.status(200).json({
        status: 200,
        message: message.usermessage.notFoundMessage('Designation'),
      });
    }

    return res.status(200).json({ status: 200, data: getDesignationByID });
  } catch (err) {
    next(err);
  }
};

/**
 * update data
 *
 * @param {id} DesignationID  to update id
 */
exports.postUpdateDesignation = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      designationId,
      designationName,
      jobdescription,
      companyMasterID,
      parentDesignation,
      skillCategory,
      status,
    } = await req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    designationName = designationName.trim();
    const dbOperation = DatabaseOperationEnum.UPDATE;

    const findDesignation = await Designation.findOne({
      where: {
        designationName: {
          [Sequelize.Op.iLike]: designationName,
        },
        companyMasterID: companyMasterID,
        designationId: { [Sequelize.Op.notIn]: [designationId] },
        status: 1,
      },
      transaction,
    });

    if (findDesignation) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyExists('Designation'),
        data: {},
      });
    }

    await Designation.update(
      {
        designationName,
        jobdescription,
        parentDesignation,
        status,
        updateBy,
        updateByIp,
        skillCategory,
      },
      {
        where: { designationId: designationId },
        individualHooks: true,
        dbOperation,
        transaction,
        user: req.userDetails,
      },
    );
    if (!transaction.finished) await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Designation'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

/**
 * delete by i
 *
 * @param {id} DesignationID  to delete id
 */
exports.postDeleteDesignationById = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { designationId } = await req.body;
    const userMasterID = req.userDetails.userMasterId;
    const dbOperation = DatabaseOperationEnum.DELETE;
    const findDesignationData = await Designation.findOne({
      where: {
        designationId: designationId,
        status: [0, 1],
      },
      transaction,
    });
    if (!findDesignationData) {
      await transaction.rollback();
      return res.status(200).json({
        status: 404,
        message: message.usermessage.notFoundMessage('Designation'),
      });
    }
    const findEmployeeDesignation = await EmployeeDesignation.findOne({
      where: {
        designationID: designationId,
        status: ['0', '1'],
      },
      include: [
        {
          required: true,
          model: UserMaster,
          as: 'employee',
          where: {
            status: [0, 1],
          },
        },
      ],
      transaction,
    });

    if (findEmployeeDesignation) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyAssign('Designation', 'Deleted'),
      });
    }

    await Designation.destroy({
      where: { designationId: findDesignationData.designationId },
      individualHooks: true,
      user: req.userDetails,
    });

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Designation'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.poststatuschange = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { designationId, status } = await req.body;
    const findDesignationData = await Designation.findOne({
      where: {
        designationId: designationId,
        status: [0, 1],
      },
      transaction,
    });

    if (!findDesignationData) {
      await transaction.rollback();
      return res.status(200).json({
        status: 404,
        message: message.usermessage.notFoundMessage('Designation'),
      });
    }

    const dbOperation = DatabaseOperationEnum.UPDATE;

    if (status == '0') {
      const findEmployeeDesignation = await EmployeeDesignation.findOne({
        where: {
          designationID: designationId,
          status: ['0', '1'],
        },
        include: [
          {
            required: true,
            model: UserMaster,
            as: 'employee',
            where: {
              status: [0, 1],
            },
          },
        ],
        transaction,
      });

      if (findEmployeeDesignation) {
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message: message.usermessage.alreadyAssign(
            'Designation',
            'deactivate',
          ),
        });
      }
    }

    await Designation.update(
      {
        status: status,
      },
      {
        where: { designationId: designationId, status: ['1', '0'] },
        individualHooks: true,
        transaction,
        dbOperation,
        user: req.userDetails,
      },
    );

    return res.status(200).json({
      status: 200,
      message:
        status == '1'
          ? message.usermessage.activeMessage('Designation')
          : message.usermessage.deactiveMessage('Designation'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getDesignationcompanyid = async (req, res, next) => {
  try {
    const { companyMasterID, limit, page, searchQuery, exportData } =
      await req.body;

    const condition = {};

    condition.status = [0, 1];

    if (companyMasterID) condition.companyMasterID = companyMasterID;

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          designationName: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          '$companyMaster.companyName$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
      ];

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const order = [['createdAt', 'DESC']];

    const { rows: designationData, count } = await Designation.findAndCountAll({
      raw: true,
      where: condition,
      ...paginationQuery,
      order,
      include: [
        {
          model: companyMaster,
        },
        {
          model: Designation,
          as: 'parentSingleDesignation',
          attributes: ['designationId', 'designationName'],
        },
      ],
    });

    const uniqueUserIds = new Set();
    designationData.map((row) => {
      if (row.createBy) {
        uniqueUserIds.add(+row.createBy);
      }
      if (row.updateBy) {
        uniqueUserIds.add(+row.updateBy);
      }
    });
    const userData = await UserMaster.findAll({
      raw: true,
      where: {
        userMasterID: [...uniqueUserIds],
        status: [0, 1],
      },
      attributes: userAttributes,
    });

    for (const designation of designationData) {
      const createUser = userData.find(
        (e) => e.userMasterID == designation.createBy,
      );
      designation.createBy = createUser
        ? createUser.displayName
        : designation.createBy;
      if (designation.updateBy) {
        const updateUser = userData.find(
          (e) => e.userMasterID == designation.updateBy,
        );
        designation.updateBy = updateUser
          ? updateUser.displayName
          : designation.updateBy;
      }

      const skillCategory = designation.skillCategory?.length
        ? designation.skillCategory
        : null;

      designation.skillCategory = skillCategory
        ? skillCategory.map((e) => capitalize(e)).join(',')
        : '';
    }

    if (exportData) {
      const finalData = [];

      for (const designation of designationData) {
        const data1 = {
          DesignationName: designation.designationName,
          CompanyName: designation['companyMaster.companyName'],
          Status: designation.status == 1 ? 'Active' : 'Deactive',
          ParentDesignation: designation[
            'parentSingleDesignation.designationName'
          ]
            ? designation['parentSingleDesignation.designationName']
            : '-',
          SkillCategory: designation.skillCategory || '',
        };
        finalData.push(data1);
      }
      await generateExcel(finalData, 'Designation', 'xlsx', res);
      return;
    }

    return res.status(200).json({
      status: 200,
      data: designationData,
      totalcount: count,
    });
  } catch (err) {
    next(err.message);
  }
};

exports.getDesignationByCompanyId = async (req, res, next) => {
  try {
    const get_one_data = await Designation.findAll({
      where: {
        companyMasterID: req.params.id,
        status: 1,
      },
    });

    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.validateUploadExcel = async (req, res, next) => {
  if (!req.file) {
    return res
      .status(200)
      .send({ status: 400, message: 'Please upload an excel file!' });
  }

  const filePath = path.join(__dirname, `../uploads/${req.file.filename}`);

  try {
    const rows = await readXlsxFile(filePath);

    // Skip header
    rows.shift();

    const allSkillCategory = await CompanySkillCategory.findAll({
      where: {
        companyMasterID: req.body.companyMasterID,
      },
      attributes: ['skillCategory'],
    });

    const allCategoryArray = allSkillCategory.map((e) =>
      String(e.skillCategory).toLowerCase().trim(),
    );

    const data = [];

    for (const row of rows) {
      if (row[0] != null && row[0].trim() != '') {
        let designationMaster = {
          designationName: row[0].trim(),
          jobdescription: row[1],
          companyMasterID: req.body.companyMasterID,
          skillCategory: null,
          remarks: '',
          allSkillCategory: allSkillCategory.map((e) => e.skillCategory),
        };

        const inputSkillCategory = row[2];

        if (inputSkillCategory) {
          const skillCategory = String(inputSkillCategory).split(',');

          const finalArray = [];

          skillCategory.forEach((e) => {
            const category = String(e).toLowerCase().trim();

            if (category == 'na') {
              finalArray.push('NA');
            } else {
              finalArray.push(category);
            }
            if (category) {
              if (!allCategoryArray.includes(category)) {
                designationMaster.remarks = `Invalid Skill Category : ${category}`;
              }
            }
          });

          designationMaster.skillCategory = finalArray;
        }

        const duplicateInExcel = data.find(
          (s) =>
            s.designationName &&
            typeof s.designationName === 'string' &&
            s.designationName.toLowerCase() ===
              designationMaster.designationName.toLowerCase(),
        );

        if (duplicateInExcel) {
          designationMaster.remarks = 'Duplicate Designation Name in Excel';
        } else {
          const condition = {
            companyMasterID: req.body.companyMasterID,
            status: [0, 1],
            designationName: {
              [Sequelize.Op.iLike]: designationMaster.designationName,
            },
          };

          const uniquedata = await Designation.findAll({
            where: condition,
          });

          if (uniquedata.length > 0) {
            designationMaster.remarks = 'Designation Already Exists';
          }
        }
        data.push(designationMaster);
      }
    }
    fs.unlink(filePath, function (err) {});
    return res.status(200).json({
      status: 200,
      message: message.usermessage.designationValidate,
      data: data,
    });
  } catch (error) {
    next(error);
    // res.status(500).send({
    //   message: 'Could not upload the file: ' + req.file.originalname,
    // });
  }
};

exports.reValidateDesignation = async (req, res, next) => {
  try {
    const { designationData, companyMasterID } = req.body;
    let data = [];

    for (const row of designationData) {
      // Ensure the row is an object and has the required fields
      if (row.designationName && row.designationName.trim() !== '') {
        let designationMaster = {
          designationName: row.designationName.trim(),
          jobdescription: row.jobdescription || '',
          remarks: '',
          skillCategory: null,
          allSkillCategory: row.allSkillCategory,
        };

        const inputSkillCategory = row.skillCategory;
        const allCategoryArray = row.allSkillCategory.map((e) =>
          String(e).toLowerCase().trim(),
        );

        if (inputSkillCategory) {
          const skillCategory = String(inputSkillCategory).split(',');

          const finalArray = [];

          skillCategory.forEach((e) => {
            const category = String(e).toLowerCase().trim();

            if (category == 'na') {
              finalArray.push('NA');
            } else {
              finalArray.push(category);
            }
            if (category) {
              if (!allCategoryArray.includes(category)) {
                designationMaster.remarks = `Invalid Skill Category : ${category}`;
              }
            }
          });

          designationMaster.skillCategory = finalArray;
        }

        // Check for duplicates in `data` array
        const duplicateInData = data.some(
          (s) =>
            s.designationName.trim().toLowerCase() ===
            designationMaster.designationName.trim().toLowerCase(),
        );

        if (duplicateInData) {
          designationMaster.remarks = 'Duplicate Designation Name in Data';
        } else {
          // Check for duplicates in the database
          const condition = {
            companyMasterID: companyMasterID,
            status: [0, 1],
            designationName: {
              [Sequelize.Op.iLike]: designationMaster.designationName,
            },
          };

          const uniquedata = await Designation.findAll({
            where: condition,
          });

          if (uniquedata && uniquedata.length > 0) {
            designationMaster.remarks = 'Designation Already Exists';
          }
        }

        // Add the processed designation to the `data` array
        data.push(designationMaster);
      }
    }

    return res.status(200).json({
      status: 200,
      message: 'Designation validation complete',
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

exports.addValidateDesignation = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { designationData, companyMasterID } = req.body;
    const dbOperation = DatabaseOperationEnum.CREATE;

    await Designation.bulkCreate(
      designationData.map((item) => ({
        designationName: item.designationName.trim(),
        jobdescription: item.jobdescription,
        companyMasterID,
        skillCategory: item.skillCategory,
        status: 1,
        createBy: req.userDetails.userMasterId,
        createByIp: req.userDetails.userIpAddress,
      })),
      {
        transaction,
        dbOperation,
        individualHooks: false,
        user: req.userDetails,
      },
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.designationadd,
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

const getDesignationTree = async (companyMasterID, parentId = null) => {
  const designations = await Designation.findAll({
    where: {
      companyMasterID,
      parentDesignation: parentId,
      status: [1],
    },
    attributes: ['designationId', 'designationName'],
    order: [['designationId', 'ASC']],
  });

  const tree = [];

  for (const designation of designations) {
    const children = await getDesignationTree(
      companyMasterID,
      designation.designationId,
    );

    tree.push({
      designationId: designation.designationId,
      label: designation.designationName,
      type: 'designation',
      title: designation.designationName,
      data: {
        name: designation.designationName,
        title: designation.designationName,
      },
      children: children,
    });
  }

  return tree;
};

exports.getDesignationHierarchy = async (req, res, next) => {
  try {
    const { companyMasterID } = req.params;

    if (!companyMasterID) {
      return res.status(400).json({ message: 'companyMasterID is required' });
    }

    const hierarchy = await getDesignationTree(companyMasterID, null);
    return res.status(200).json({
      status: 200,
      data: [
        {
          children: hierarchy,
          name: 'Root',
          title: 'Root',
          type: 'root',
        },
      ],
    });
  } catch (error) {
    next(error);
  }
};

exports.downloadDemoExcel = async (req, res, next) => {
  try {
    const { companyMasterID } = req.body;

    if (!companyMasterID)
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: message.usermessage.requiredMessage('companyMasterID'),
      });

    const skillCategory = await CompanySkillCategory.findAll({
      where: {
        companyMasterID,
      },
      attributes: ['skillCategory'],
    });

    // --------------------- generate excel ------------------

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Designation');
    const SkillCategoryWorkSheet = workbook.addWorksheet('Skill Category');

    worksheet.addRow(['Desigantion Name', 'Job Description', 'SkillCategory']);

    SkillCategoryWorkSheet.addRow(['SkillCategory']);

    skillCategory.forEach((e) =>
      SkillCategoryWorkSheet.addRow([e.skillCategory]),
    );

    // Style only A1 and B1 in Designation sheet
    ['A1', 'B1', 'C1'].forEach((cellAddress) => {
      const cell = worksheet.getCell(cellAddress);

      cell.font = {
        bold: true,
      };

      if (cellAddress == 'A1') {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFF6666' },
        };
      }
    });

    // Make Skill Category header bold
    SkillCategoryWorkSheet.getCell('A1').font = {
      bold: true,
    };

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="ManPowerRequisitionRequest.xlsx"',
    );

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    next(error);
  }
};

exports.getDesignationBySkillCategory = async (req, res, next) => {
  try {
    const { skillCategory, companyMasterID } = req.body;

    if (!companyMasterID) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: message.usermessage.requiredMessage('companyMasterID'),
      });
    }

    const allData = await getDepartment_SkillCategoryWise(
      companyMasterID,
      skillCategory,
    );

    return res.status(200).json({
      status: 200,
      data: allData,
    });
  } catch (err) {
    next(err);
  }
};
