const Sequelize = require('sequelize');
const Task_Stages = require('../models/tasks_stages');
const UserTasks = require('../models/User_Tasks');
const message = require('../response_message/message');
const sequelize = require('../config/database');
const companyMaster = require('../models/companyMaster');
const TaskReminder = require('../models/task_reminder');
const { generateExcel } = require('../utils/exportData');
const readXlsxFile = require('read-excel-file/node');
const fs = require('fs');
const { sendNotification } = require('../utils/commonUtilFunctions');
const path = require('path');

exports.postAddTaskStage = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { TaskStage, companyMasterID } = await req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    const find_SameData = await Task_Stages.findOne({
      where: Sequelize.and(
        Sequelize.where(
          sequelize.fn(
            'TRIM',
            sequelize.fn('LOWER', sequelize.col('TaskStage')),
          ),
          TaskStage.trim().toLowerCase(),
        ),
        Sequelize.where(sequelize.col('companyMasterID'), companyMasterID),
        Sequelize.or(
          Sequelize.where(sequelize.col('status'), 0),
          Sequelize.where(sequelize.col('status'), 1),
        ),
      ),
    });
    if (find_SameData) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyExists('Task Stage With Same Name'),
      });
    }
    await Task_Stages.create(
      {
        TaskStage,
        companyMasterID,
        createBy,
        createByIp,
      },
      { transaction, user: req.userDetails },
    );
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Task Stage'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getAllTaskStage = async (req, res, next) => {
  try {
    const { companyMasterID, limit, page, searchQuery, exportData } =
      await req.body;

    const condition = {};

    condition.status = [0, 1];

    if (companyMasterID) condition.companyMasterID = companyMasterID;

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          TaskStage: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          '$company.companyName$': {
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

    const task_stages = await Task_Stages.findAndCountAll({
      raw: true,
      where: condition,
      ...paginationQuery,
      order,
      include: [
        {
          model: companyMaster,
          as: 'company',
          attributes: ['companyName'],
        },
      ],
    });

    for (var i = 0; i < task_stages.rows.length; i++) {
      let get_one_data = await UserTasks.findOne({
        where: {
          allTaskStage: {
            [Sequelize.Op.contains]: [task_stages.rows[i].tasks_stagesID],
          },
          status: 1,
        },
        raw: true,
      });
      if (get_one_data) {
        task_stages.rows[i].delete = false;
      } else {
        task_stages.rows[i].delete = true;
      }
    }

    if (exportData) {
      const finalData = [];

      for (let i = 0; i < task_stages.rows.length; i++) {
        const data1 = {
          TaskStage: task_stages.rows[i].TaskStage,
          CompanyName: task_stages.rows[i]['company.companyName'],
          Status: task_stages.rows[i].status,
        };
        data1.Status == 1
          ? (data1.Status = 'Active')
          : (data1.Status = 'Deactive');
        finalData.push(data1);
      }

      await generateExcel(finalData, 'TaskStages', 'xlsx', res);
      return;
    }

    return res.status(200).json({
      status: 200,
      data: task_stages.rows,
      totalcount: task_stages.count,
    });
  } catch (err) {
    next(err);
  }
};

exports.getTaskStageById = async (req, res, next) => {
  try {
    const get_one_data = await Task_Stages.findOne({
      where: {
        tasks_stagesID: req.params.id,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      raw: true,
    });
    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.getTaskStageByIdArray = async (req, res, next) => {
  try {
    const get_one_data = await Task_Stages.findAll({
      where: {
        tasks_stagesID: {
          [Sequelize.Op.in]: req.body.id,
        },
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      raw: true,
    });

    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.postUpdateTaskStage = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { tasks_stagesID, companyMasterID, TaskStage } = await req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    const findTaskStages = await Task_Stages.findAll({
      where: {
        tasks_stagesID: tasks_stagesID,
        status: ['0', '1'],
      },
    });
    if (
      findTaskStages &&
      (findTaskStages.TaskStage == 'Assigned' ||
        findTaskStages.TaskStage == 'Finished')
    ) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: 'You can not Update this Task Stage.',
      });
    }

    const find_SameData = await Task_Stages.findOne({
      where: Sequelize.and(
        Sequelize.where(
          sequelize.fn(
            'TRIM',
            sequelize.fn('LOWER', sequelize.col('TaskStage')),
          ),
          TaskStage.trim().toLowerCase(),
        ),
        Sequelize.where(sequelize.col('companyMasterID'), companyMasterID),
        Sequelize.or(
          Sequelize.where(sequelize.col('status'), 0),
          Sequelize.where(sequelize.col('status'), 1),
        ),
        Sequelize.where(sequelize.col('tasks_stagesID'), {
          [Sequelize.Op.ne]: tasks_stagesID,
        }),
      ),
    });
    if (find_SameData) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyExists('Task Stage With Same Name'),
      });
    }
    await Task_Stages.update(
      {
        TaskStage,
        updateBy,
        updateByIp,
      },
      {
        where: { tasks_stagesID: tasks_stagesID },
        transaction,
        individualHooks: true,
        user: req.userDetails,
      },
    );
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Task Stage'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.poststatuschange = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { tasks_stagesID, status } = await req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;

    const findTaskStages = await Task_Stages.findAll({
      where: {
        tasks_stagesID: tasks_stagesID,
        status: ['0', '1'],
      },
    });
    if (
      findTaskStages &&
      (findTaskStages.TaskStage == 'Assigned' ||
        findTaskStages.TaskStage == 'Finished')
    ) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: 'You can not Change Status this Task Stage.',
      });
    }
    if (status != '1') {
      let data = await UserTasks.findOne({
        where: {
          tasks_stagesID: tasks_stagesID,
          status: ['0', '1'],
        },
      });
      if (data) {
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message:
            'You can not deactivate this Task Stage.Already used in User Task.',
        });
      }
    }
    await Task_Stages.update(
      {
        status: status,
        updateBy,
        updateByIp,
      },
      {
        where: { tasks_stagesID: tasks_stagesID, status: ['1', '0'] },
        transaction,
        individualHooks: true,
        user: req.userDetails,
      },
    );
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message:
        status == '1'
          ? message.usermessage.activeMessage('Task Stage')
          : message.usermessage.deactiveMessage('Task Stage'),
      data: {},
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.postDeleteTaskStageById = async (req, res, next) => {
  try {
    let { tasks_stagesID } = await req.body;
    const userMaster = req.userDetails.userMasterId;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    const data = await UserTasks.findOne({
      where: {
        tasks_stagesID: tasks_stagesID,
        status: ['0', '1'],
      },
    });
    if (data) {
      return res.status(200).json({
        status: 401,
        message:
          'You can not delete this Task Stage.Already used in User Task.',
      });
    }
    const findTaskStages = await Task_Stages.findAll({
      where: {
        tasks_stagesID: tasks_stagesID,
        status: ['0', '1'],
      },
    });
    if (
      findTaskStages &&
      (findTaskStages.TaskStage == 'Assigned' ||
        findTaskStages.TaskStage == 'Finished')
    ) {
      return res.status(200).json({
        status: 401,
        message: 'You can not delete this Task Stage.',
      });
    }

    await Task_Stages.destroy({
      where: { tasks_stagesID: tasks_stagesID },
      user: req.userDetails,
      individualHooks: true,
    });
    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Task Stage'),
    });
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
    const data = [];

    for (const row of rows) {
      if (row && row.length > 0) {
        const TaskStage = row[0]; // Assuming the Task Stage name is in the first column
        let taskStagesMaster = {
          TaskStage: TaskStage,
          companyMasterID: req.body.companyMasterID,
          remarks: '',
        };

        const duplicateInExcel = data.find(
          (s) =>
            s.TaskStage &&
            typeof s.TaskStage === 'string' &&
            s.TaskStage.toLowerCase() ===
              taskStagesMaster.TaskStage.toLowerCase(),
        );

        if (duplicateInExcel) {
          taskStagesMaster.remarks = 'Duplicate Task Stage Name in Excel';
        } else {
          const condition = {
            companyMasterID: req.body.companyMasterID,
            status: [0, 1],
            TaskStage: {
              [Sequelize.Op.iLike]: taskStagesMaster.TaskStage,
            },
          };

          const uniquedata = await Task_Stages.findAll({
            where: condition,
          });

          if (uniquedata.length > 0) {
            taskStagesMaster.remarks = 'Task Stage Already Exists';
          }
        }

        data.push(taskStagesMaster);
      }
    }
    fs.unlink(filePath, function (err) {});
    return res.status(200).json({
      status: 200,
      message: message.usermessage.taskStagesValidate,
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

exports.reValidateTaskStages = async (req, res, next) => {
  try {
    const { TaskStage, companyMasterID } = req.body;

    let data = [];
    for (const row of TaskStage) {
      if (row != null && row != '') {
        let taskStagesMaster = {
          TaskStage: row.trim(),
          remarks: '',
        };
        const duplicateInData = data.some(
          (s) =>
            s.TaskStage.trim().toLowerCase() ===
            taskStagesMaster.TaskStage.trim().toLowerCase(),
        );

        if (duplicateInData) {
          taskStagesMaster.remarks = 'Duplicate Task Stage Name in Data';
        } else {
          const condition = {};
          condition.companyMasterID = companyMasterID;
          condition.status = [0, 1];
          condition.TaskStage = {
            [Sequelize.Op.iLike]: taskStagesMaster.TaskStage,
          };
          let uniquedata = await Task_Stages.findAll({
            where: condition,
          });
          if (uniquedata && uniquedata.length > 0) {
            taskStagesMaster.remarks = 'Task Stage Already Exists';
          }
        }

        data.push(taskStagesMaster);
      }
    }
    return res.status(200).json({
      status: 200,
      message: message.usermessage.taskStagesValidate,
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

exports.addValidateTaskStages = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { TaskStage, companyMasterID } = req.body;

    await Task_Stages.bulkCreate(
      TaskStage.map((item) => ({
        TaskStage: item.trim(),
        companyMasterID,
        createBy: req.userDetails.userMasterId,
        createByIp: req.userDetails.userIpAddress,
      })),
      { transaction, user: req.userDetails },
    );

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.taskStagesadd,
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.sendReminder = async (req, res, next) => {
  try {
    let { user_TasksID, userMasterID, TaskName, startDate, endDate, message } =
      await req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const lastReminder = await TaskReminder.findOne({
      where: {
        user_TasksID,
        createBy,
        receiverId: userMasterID,
        createdAt: {
          [Sequelize.Op.gt]: oneHourAgo,
        },
      },
      order: [['createdAt', 'DESC']],
    });

    if (lastReminder) {
      const nextAllowedTime = new Date(
        lastReminder.createdAt.getTime() + 60 * 60 * 1000,
      ); // 1 hour later
      return res.status(200).json({
        status: 429,
        message: 'A reminder has already been sent within the last hour.',
        nextReminderTime: nextAllowedTime, // Include this in the response
      });
    }

    const payload = {
      user_TasksID,
      userMasterID: req.userDetails.userMasterId,
      message,
      receiverId: userMasterID,
      createBy,
      createByIp,
    };
    const data = await TaskReminder.create(payload);
    if (data.taskReminderID) {
      const notification = {
        title: 'Task Reminder',
        body: TaskName,
      };
      const data = {
        screen: 'task',
        isScheduled: 'true',
        scheduledTime: new Date().toISOString(),
      };
      await sendNotification(+userMasterID, notification, data);
    }
    return res.status(200).json({
      status: 200,
      message: 'Reminder Send to this user',
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

exports.findAllReminder = async (req, res, next) => {
  try {
    let { limit = 10, page = 1, receiverId, user_TasksID } = req.body;
    limit = parseInt(limit);
    page = parseInt(page);

    if (isNaN(limit) || limit <= 0) limit = 10;
    if (isNaN(page) || page <= 0) page = 1;

    const offset = (page - 1) * limit;

    const result = await TaskReminder.findAndCountAll({
      where: { receiverId, status: 1, user_TasksID },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({
      status: 200,
      totalRecords: result.count,
      totalPages: Math.ceil(result.count / limit),
      currentPage: page,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};
