const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const logger = require('../config/logger');
const message = require('../response_message/message');
const reportTo = require('../models/employeeReportTo');
const designation = require('../models/designation');
const UserMaster = require('../models/userMaster');
const moment = require('moment');
const EmployeeDepartment = require('../models/employeeDepartment');
const EmployeeDesignation = require('../models/employeeDesignation');
const attendanceTransaction = require('../models/attendanceTransaction');
const Visit = require('../models/visit');
const ResignProcess = require('../models/resignProcess');
const ResignTask = require('../models/resignTask');
const Designation = require('../models/designation');
const ResignTaskAssign = require('../models/resignTaskAssign');
const UserResignation = require('../models/resignation');

const ResignationTask = require('../models/resignTask');
const Department = require('../models/department');
const companyMaster = require('../models/companyMaster');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const { asiaKolkataDateTime } = require('../utils/commonUtilFunctions');
const Division = require('../models/division');
const ExcelJS = require('exceljs');

exports.postAddResignProcess = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      departmentID,
      taskData,
      branchID,
      designationID,
      divisionID,
    } = req.body;

    if (!departmentID && !branchID && !designationID && !divisionID) {
      return res.status(200).json({
        status: 400,
        message:
          'Atleast one field Branch, Department, Designation or Division is required!',
      });
    }

    const already_applied = await ResignProcess.findOne({
      where: {
        status: { [Sequelize.Op.in]: [0, 1] },

        companyMasterID: companyMasterID,

        branchID: branchID || null,

        departmentID: departmentID || null,

        divisionID: divisionID || null,

        designationID: designationID || null,
      },
    });

    if (already_applied) {
      return res.status(200).json({
        status: 401,
        message: 'Clearance & Exit Process already added for this combination!',
      });
    }

    if (already_applied)
      return res.status(200).json({
        status: 401,
        message: 'Clearance & Exit Process already added for these Department!',
      });

    await sequelize.transaction(async (t) => {
      const createProcess = await ResignProcess.create(
        {
          companyMasterID: companyMasterID,
          departmentID: departmentID,
          divisionID: divisionID,
          designationID: designationID,
          branchID: branchID,
          createBy: req.userDetails.userMasterId,
          createByIp: req.userDetails.userIpAddress,
          status: 1,
        },
        { transaction: t, user: req.userDetails },
      );

      const reignTaskData = taskData.map((task) => ({
        ...task,
        createBy: req.userDetails.userMasterId,
        createByIp: req.userDetails.userIpAddress,
        resignProcessID: createProcess.resignProcessID,
      }));
      await ResignTask.bulkCreate(reignTaskData, { transaction: t });
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Clearance & Exit'),
    });
  } catch (err) {
    next(err);
  }
};

exports.updateResignProcess = async (req, res, next) => {
  try {
    const { id } = req.params;

    const {
      companyMasterID,
      departmentID,
      taskData,
      branchID,
      designationID,
      divisionID,
    } = req.body;

    if (!departmentID && !branchID && !designationID && !divisionID) {
      return res.status(200).json({
        status: 400,
        message:
          'Atleast one field Branch, Department, Designation or Division is required!',
      });
    }

    const existingProcess = await ResignProcess.findOne({
      where: {
        resignProcessID: id,
        status: { [Sequelize.Op.in]: [0, 1] },
      },
    });

    if (!existingProcess) {
      return res.status(200).json({
        status: 404,
        message: 'Clearance & Exit Process not found!',
      });
    }

    const already_applied = await ResignProcess.findOne({
      where: {
        status: { [Sequelize.Op.in]: [0, 1] },

        companyMasterID: companyMasterID,

        branchID: branchID || null,

        departmentID: departmentID || null,

        divisionID: divisionID || null,

        designationID: designationID || null,

        resignProcessID: {
          [Sequelize.Op.ne]: id,
        },
      },
    });

    if (already_applied) {
      return res.status(200).json({
        status: 401,
        message: 'Clearance & Exit Process already added for this combination!',
      });
    }

    await sequelize.transaction(async (t) => {
      await ResignProcess.update(
        {
          companyMasterID: companyMasterID,
          departmentID: departmentID,
          divisionID: divisionID,
          designationID: designationID,
          branchID: branchID,
          updateBy: req.userDetails.userMasterId,
          updateByIp: req.userDetails.userIpAddress,
        },
        {
          where: { resignProcessID: id },
          transaction: t,
          individualHooks: true,
          user: req.userDetails,
        },
      );

      await ResignTask.update(
        {
          status: 2,
        },
        {
          where: { resignProcessID: id },
        },
        { transaction: t },
      );

      const reignTaskData = taskData.map((task) => ({
        ...task,
        updateBy: req.userDetails.userMasterId,
        updateByIp: req.userDetails.userIpAddress,
        resignProcessID: id,
      }));

      await ResignTask.bulkCreate(reignTaskData, { transaction: t });
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Clearance & Exit'),
    });
  } catch (err) {
    next(err);
  }
};

exports.postAddResignProcess1 = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { companyMasterID, departmentID, createBy, createByIp } =
      await req.body;

    let already_applied = await ResignProcess.findOne({
      where: {
        departmentID: departmentID,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
    });

    if (already_applied) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: 'Designation already added',
        data: {},
      });
    } else {
      await ResignProcess.create(
        {
          companyMasterID,
          departmentID: departmentID,
          createBy,
          createByIp,
        },
        { transaction, user: req.userDetails },
      );
      await transaction.commit();
      return res.status(200).json({
        status: 200,
        message: message.usermessage.addMessage('Resignation'),
      });
    }
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.postAddResignProcess2 = async (req, res, next) => {
  try {
    let {
      resignProcessID,
      userMasterID,
      description,
      isMandatory,
      createBy,
      createByIp,
    } = await req.body;

    let attachment = '';
    if (req.file) {
      attachment = req.file.filename;
    }

    await ResignTask.create({
      resignProcessID,
      userMasterID,
      description,
      isMandatory,
      attachment,
      status: 1,
      createBy,
      createByIp,
    });

    return res.status(200).json({
      status: 200,
      message: 'Task added Successfully',
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllresignProcess = async (req, res, next) => {
  try {
    let { limit, page, companyMasterID, searchQuery, isExport } =
      await req.body;

    const paginationQuery = {};
    if (!isExport && page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = +limit;
    }

    const condition = {
      companyMasterID: companyMasterID,
      status: {
        [Sequelize.Op.in]: [0, 1],
      },
    };

    if (searchQuery) {
      condition[Sequelize.Op.or] = [
        {
          '$department.departmentName$': {
            [Sequelize.Op.iLike]: `%${searchQuery}%`,
          },
        },
        {
          '$designation.designationName$': {
            [Sequelize.Op.iLike]: `%${searchQuery}%`,
          },
        },
        {
          '$branch.branchName$': {
            [Sequelize.Op.iLike]: `%${searchQuery}%`,
          },
        },
        {
          '$division.divisionName$': {
            [Sequelize.Op.iLike]: `%${searchQuery}%`,
          },
        },
      ];
    }

    const resignProcessData = await ResignProcess.findAndCountAll({
      order: [['resignProcessID', 'ASC']],
      where: condition,
      subQuery: false,
      distinct: true,
      include: [
        {
          model: companyMaster,
          as: 'company',
          attributes: ['companyMasterID', 'companyName'],
        },
        {
          model: Department,
          as: 'department',
          attributes: ['departmentId', 'departmentName', 'status'],
        },
        {
          model: Designation,
          as: 'designation',
          attributes: ['designationName'],
        },
        {
          model: BranchMaster,
          as: 'branch',
          attributes: ['branchName'],
        },
        {
          model: Division,
          as: 'division',
          attributes: ['divisionName'],
        },
        {
          model: ResignTask,
          attributes: ['description'],
          separate: true,
          where: {
            status: 1,
          },
          include: [
            {
              model: UserMaster,
              attributes: ['displayName'],
            },
          ],
        },
      ],
      ...paginationQuery,
    });

    if (isExport) {
      const workbook = new ExcelJS.Workbook();

      const worksheet = workbook.addWorksheet('Clearance & Exit Process');

      worksheet.columns = [
        { header: 'Company Name', key: 'companyName', width: 30 },
        { header: 'Branch', key: 'branchName', width: 25 },
        { header: 'Department', key: 'departmentName', width: 25 },
        { header: 'Designation', key: 'designationName', width: 25 },
        { header: 'Division', key: 'divisionName', width: 25 },
        { header: 'Task', key: 'taskName', width: 40 },
        { header: 'Assign Person', key: 'Assign Person', width: 40 },
      ];

      // Header Style
      worksheet.getRow(1).eachCell((cell) => {
        cell.font = {
          bold: true,
          color: { argb: 'FFFFFF' },
        };

        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '4472C4' },
        };

        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
        };
      });

      let currentRow = 2;

      resignProcessData.rows.forEach((item) => {
        const tasks = item.resignTasks || [];

        const startRow = currentRow;

        // If no task
        if (tasks.length === 0) {
          worksheet.addRow({
            companyName: item.company?.companyName || '',
            branchName: item.branch?.branchName || '',
            departmentName: item.department?.departmentName || '',
            designationName: item.designation?.designationName || '',
            divisionName: item.division?.divisionName || '',
            taskName: '',
          });

          currentRow++;
        } else {
          // Add task rows
          tasks.forEach((task) => {
            worksheet.addRow({
              companyName: item.company?.companyName || '',
              branchName: item.branch?.branchName || '',
              departmentName: item.department?.departmentName || '',
              designationName: item.designation?.designationName || '',
              divisionName: item.division?.divisionName || '',
              taskName: task.description || '',
              'Assign Person': task?.userMaster?.displayName,
            });

            currentRow++;
          });

          const endRow = currentRow - 1;

          // Merge only if multiple tasks
          if (tasks.length > 1) {
            worksheet.mergeCells(`A${startRow}:A${endRow}`);
            worksheet.mergeCells(`B${startRow}:B${endRow}`);
            worksheet.mergeCells(`C${startRow}:C${endRow}`);
            worksheet.mergeCells(`D${startRow}:D${endRow}`);
            worksheet.mergeCells(`E${startRow}:E${endRow}`);
          }
        }
      });

      // Border + Alignment
      worksheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };

          cell.alignment = {
            vertical: 'middle',
            horizontal: 'left',
            wrapText: true,
          };
        });
      });

      // Download
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );

      res.setHeader(
        'Content-Disposition',
        'attachment; filename=clearance-exit-process.xlsx',
      );

      await workbook.xlsx.write(res);

      return res.end();
    }

    return res.status(200).json({
      status: 200,
      data: resignProcessData.rows,
      totalcount: resignProcessData.count,
    });
  } catch (err) {
    next(err);
  }
};

exports.poststatus = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { resignProcessID, status } = await req.body;
    let delete_status;

    delete_status = await ResignProcess.destroy({
      where: { resignProcessID: resignProcessID },
      user: req.userDetails,
      individualHooks: true,
      transaction,
    });

    await ResignTask.update(
      {
        status: status,
      },
      {
        where: { resignProcessID: resignProcessID },
        transaction,
      },
    );
    let message1 = 'Status changed successfully';
    if (+status == 2) message1 = message.usermessage.deleteMessage('Process');
    await transaction.commit();

    return res.status(200).json({ status: 200, message: message1 });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.postUpdateResignProcess = async (req, res, next) => {
  try {
    let { resignProcessID, task, createBy, createByIp } = await req.body;

    let already_ID = [];

    await ResignTask.destroy({
      where: {
        resignProcessID: resignProcessID,
      },
    });

    for (var j = 0; j < task.length; j++) {
      await ResignTask.create({
        resignProcessID: resignProcessID,
        userMasterID: task[j].userMasterID,
        description: task[j].description,
        isMandatory: task[j].isMandatory,
        attachment: task[j].attachment,
        status: 1,
        createBy,
        createByIp,
      });
    }

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Resignation'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getResignationProcessById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const date = asiaKolkataDateTime(new Date()).slice(0, 10);

    const resignProcess = await ResignProcess.findOne({
      where: { resignProcessID: id },
      include: [
        {
          model: ResignTask,
          where: { status: 1 },
          include: [
            {
              model: UserMaster,
              attributes: ['userMasterID', 'displayName'],
              include: [
                {
                  model: EmployeeBranch,
                  where: {
                    status: 1,
                    applicableDate: { [Sequelize.Op.lte]: new Date(date) },
                    [Sequelize.Op.or]: [
                      { endDate: { [Sequelize.Op.gte]: new Date(date) } },
                      { endDate: { [Sequelize.Op.eq]: null } },
                    ],
                  },
                  required: false,
                  attributes: ['branchID', 'applicableDate'],
                  include: [
                    {
                      model: BranchMaster,
                      as: 'branchMaster',
                      attributes: ['branchName'],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    res.status(200).json({ status: 200, data: resignProcess });
  } catch (error) {
    next(error);
  }
};
