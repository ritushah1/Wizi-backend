const Sequelize = require('sequelize');
const logger = require('../config/logger');
const message = require('../response_message/message');
const sequelize = require('../config/database');
const UserTasks = require('../models/User_Tasks');
const Task_Stages = require('../models/tasks_stages');
const UserMaster = require('../models/userMaster');
const companyMaster = require('../models/companyMaster');
const {
  sendNotification,
  asiaKolkataDateTime,
  getDatesFromDateRange,
} = require('../utils/commonUtilFunctions');
const { generateExcel } = require('../utils/exportData');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const moment = require('moment');
const UserInbox = require('../models/UserInbox');
const {
  userAttributes,
  companyAttributes,
  attachmentFilePathFolderNames,
} = require('../utils/commonVars');
const { taskStatus } = require('../utils/dbUtils');
const TaskRemark = require('../models/taskremark');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const sanitizeHtml = require('sanitize-html');
const { s3OrLocalUploadFiles } = require('../middleware/s3UploadFile');
const { isStoreFileToS3Bucket } = require('../utils/labelUtils');

exports.postAddTaskStage = async (req, res, next) => {
  try {
    let {
      userMasterID,
      TaskName,
      TaskDesc,
      priority,
      tasktype,
      isrecurringtype,
      recurringtimeline,
      startDate,
      startTime,
      endDate,
      tasks_stagesID,
      allTaskStage,
      taskStatus,
      createBy,
      createByIp,
    } = await req.body;
    let attachment = '';
    if (req.file) {
      attachment = req.file.filename;
    }

    userMasterID = userMasterID.split(',');
    allTaskStage = allTaskStage.split(',');

    let cronjob = null;

    //noncron
    let insert_db_status;
    for (var i = 0; i < userMasterID.length; i++) {
      insert_db_status = await UserTasks.create({
        userMasterID: userMasterID[i],
        TaskName,
        TaskDesc,
        attachment,
        priority,
        tasktype,
        isrecurringtype,
        recurringtimeline,
        startDate,
        startTime,
        endDate: endDate ? endDate : null,
        tasks_stagesID,
        allTaskStage,
        taskStatus,
        createBy,
        createByIp,
      });

      let get_user = await UserMaster.findOne({
        raw: true,
        where: {
          userMasterID: userMasterID[i],
          status: 1,
        },
      });

      if (get_user) {
        const notification = {
          title: 'New Task Assign To You Please Check',
          body: TaskName,
        };
        const data = {
          screen: 'task',
          isScheduled: 'true',
          scheduledTime: new Date().toISOString(),
        };
        await sendNotification(get_user.userMasterID, notification, data);
      }
    }
    return res.status(200).json({
      status: 200,
      message: 'Task added Successfully',
      data: insert_db_status,
    });
  } catch (err) {
    next(err);
  }
};

exports.getTaskById = async (req, res, next) => {
  try {
    if (req.params.id == 'undefined' || req.params.id == null) {
      return res
        .status(200)
        .json({ status: 401, message: 'Task ID is required' });
    }
    let get_one_data = await UserTasks.findOne({
      where: {
        user_TasksID: req.params.id,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      include: [
        {
          model: UserMaster,
          attributes: userAttributes,
          include: [
            {
              model: companyMaster,
              attributes: companyAttributes,
            },
          ],
        },
        {
          model: Task_Stages,
        },
      ],
      raw: true,
    });
    if (!get_one_data)
      return res
        .status(200)
        .json({ status: 200, message: message.usermessage.deletedrecord });
    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.postUpdateTask = async (req, res, next) => {
  try {
    let {
      user_TasksID,
      userMasterID,
      TaskName,
      TaskDesc,
      priority,
      tasktype,
      isrecurringtype,
      recurringtimeline,
      startDate,
      startTime,
      endDate,
      tasks_stagesID,
      allTaskStage,
      taskStatus,
      updateBy,
      updateByIp,
    } = req.body;
    let attachment = '';
    if (req.file?.length > 0) {
      attachment = req.file?.filename;
    }

    if (!endDate || endDate == 'null') {
      endDate = null;
    }
    allTaskStage = allTaskStage.split(',');

    await UserTasks.update(
      {
        userMasterID,
        TaskName,
        TaskDesc,
        attachment,
        priority,
        tasktype,
        isrecurringtype,
        recurringtimeline,
        startDate,
        startTime,
        endDate,
        tasks_stagesID,
        allTaskStage,
        taskStatus,
        updateBy,
        updateByIp,
      },
      {
        where: { user_TasksID: user_TasksID },
      },
    );

    return res
      .status(200)
      .json({ status: 200, message: message.usermessage.taskUpdateSuccess });
  } catch (err) {
    next(err);
  }
};

exports.postDeleteTaskById = async (req, res, next) => {
  try {
    const { user_TasksID } = await req.body;
    await UserTasks.update(
      { status: 2 },
      { where: { user_TasksID: user_TasksID } },
    );
    return res
      .status(200)
      .json({ status: 200, message: 'Task Deleted Successfully' });
  } catch (err) {
    next(err);
  }
};

exports.getNextStageById = async (req, res, next) => {
  try {
    let get_one_data = await UserTasks.findOne({
      where: {
        user_TasksID: req.params.id,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      include: [
        {
          model: UserMaster,
          include: [
            {
              model: companyMaster,
            },
          ],
        },
        {
          model: Task_Stages,
        },
      ],
      raw: true,
    });

    if (get_one_data) {
      let taskStage = Number(get_one_data.tasks_stagesID);
      let index = get_one_data.allTaskStage.indexOf(taskStage);
      if (index == get_one_data.allTaskStage.length - 1) {
        return res.status(200).json({ status: 200, data: [] });
      } else {
        let get_TaskStage = await Task_Stages.findOne({
          where: {
            tasks_stagesID: get_one_data.allTaskStage[index + 1],
            status: {
              [Sequelize.Op.in]: [0, 1],
            },
          },
          raw: true,
        });
        if (get_TaskStage) {
          let dd = [];
          dd.push(get_TaskStage);
          return res.status(200).json({ status: 200, data: dd });
        } else {
          return res.status(200).json({ status: 200, data: [] });
        }
      }
    } else {
      return res
        .status(200)
        .json({ status: 401, data: [], message: 'Data not found' });
    }
  } catch (err) {
    next(err);
  }
};

exports.TaskAcceptReject = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { user_TasksID, status } = await req.body;
    const taskCondition = {
      user_TasksID,
    };
    if (req?.userDetails.isMyUserDetails) {
      taskCondition.userMasterID = req.userDetails.userMasterId;
    }
    await UserTasks.update(
      {
        taskStatus: status,
      },
      {
        where: taskCondition,
      },
      { transaction },
    );
    await UserInbox.destroy(
      {
        where: {
          activityTable: UserTasks.getTableName(),
          activityTablePK: user_TasksID,
        },
      },
      { transaction },
    );
    await transaction.commit();
    return res
      .status(200)
      .json({ status: 200, message: 'Operation performed Successfully' });
    //}
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getTaskReport = async (req, res, next) => {
  try {
    let { userMasterID, startDate, endDate } = await req.body;
    let TaskList = [];
    let pending = 0,
      accepted = 0,
      rejected = 0,
      completed = 0;
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    if (userMasterID && startDate && endDate) {
      TaskList = await UserTasks.findAll({
        raw: true,
        where: {
          status: 1,
          startDate: {
            [Sequelize.Op.between]: [new Date(startDate), new Date(endDate)],
          },
          userMasterID: userMasterID,
        },
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: UserMaster,
            required: true,
            where: { ...userAccessCondition.where },
            include: [...userAccessCondition.includeModels],
          },
        ],
      });
    }

    for (var i = 0; i < TaskList.length; i++) {
      if (TaskList[i].taskStatus == '0') {
        pending++;
      } else if (TaskList[i].taskStatus == '1') {
        accepted++;
      } else if (TaskList[i].taskStatus == '2') {
        rejected++;
      } else {
        completed++;
      }
    }

    let data = {
      pending: pending,
      accepted: accepted,
      rejected: rejected,
      completed: completed,
    };

    return res.status(200).json({
      status: 200,
      data: data,
      totalcount: pending + accepted + rejected + completed,
    });
  } catch (err) {
    next(err);
  }
};

exports.postAddTaskStageV2 = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const formData = req.body;
    const files = req.files;

    const entryCount = Object.keys(formData).filter((key) =>
      key.startsWith('taskDataType'),
    ).length;
    const taskData = [];
    let index_attch = 0;
    for (let i = 0; i < entryCount; i++) {
      const checkAttach = formData[`isattachment${i}`] == 'yes' ? true : false;
      const addObj = {
        userMasterID: +formData[`userMasterID${i}`],
        TaskName: formData[`TaskName${i}`],
        ToDate: formData[`ToDate${i}`],
        TaskDesc: formData[`TaskDesc${i}`],
        priority: formData[`priority${i}`],
        tasktype: formData[`tasktype${i}`],
        isrecurringtype: formData[`isrecurringtype${i}`]
          ? formData[`isrecurringtype${i}`]
          : '',
        recurringtimeline: formData[`recurringtimeline${i}`]
          ? formData[`recurringtimeline${i}`]
          : '',
        startDate: formData[`startDate${i}`],
        startTime: formData[`startTime${i}`],
        endDate: formData[`endDate${i}`],
        tasks_stagesID: formData[`tasks_stagesID${i}`]
          ? formData[`tasks_stagesID${i}`]
          : null,
        allTaskStage: formData[`allTaskStage${i}`],
        taskStatus: formData[`taskStatus${i}`],
        taskWeightage: +formData[`taskWeightage${i}`],
        taskDataType: formData[`taskDataType${i}`],
        attachment: null,
        attachmentThumb: null,
        createBy: req.userDetails.userMasterId,
        createByIp: req.userDetails.userIpAddress,
        companyMasterID: formData[`companyMasterID${i}`],
        hasSubTask: formData[`hasSubTask${i}`],
      };

      if (checkAttach) {
        const findUser = await UserMaster.findOne({
          where: { userMasterID: addObj.userMasterID },
          attributes: ['companyMasterId'],
        });
        const attendanceAttachmentUrl = files?.[index_attch] || null;

        const attachmentPath = await s3OrLocalUploadFiles({
          attachment: attendanceAttachmentUrl?.path,
          attachmentFileName: attendanceAttachmentUrl?.filename,
          companyMasterId: findUser.companyMasterId,
          folderName: attachmentFilePathFolderNames.USER_TASK,
          isDeleteLocalFile: true,
        });

        addObj.attachment = attachmentPath || null;
        if (attendanceAttachmentUrl.thumbnailPath) {
          const thumbnailPath = await s3OrLocalUploadFiles({
            attachment: attendanceAttachmentUrl.thumbnailPath,
            attachmentFileName: attendanceAttachmentUrl.thumbnailFilename,
            companyMasterId: findUser.companyMasterId,
            folderName: attachmentFilePathFolderNames.USER_TASK,
            isDeleteLocalFile: true,
          });

          addObj.attachmentThumb = thumbnailPath || null;
        }
        index_attch++;
      }
      taskData.push(addObj);
    }

    const subTaskData = taskData.filter(
      (item) => item.taskDataType === 'subTask',
    );
    const mainTaskData = taskData.filter(
      (item) => item.taskDataType === 'mainTask',
    );

    let mainUserAddTask;
    for (mainTask of mainTaskData) {
      const condition = {
        [Sequelize.Op.and]: [
          {
            [Sequelize.Op.or]: [
              { TaskStage: { [Sequelize.Op.iLike]: '%Finished%' } },
              { TaskStage: { [Sequelize.Op.iLike]: '%Assigned%' } },
            ],
          },
          { companyMasterID: +mainTask.companyMasterID },
        ],
      };
      const getTaskStages = await Task_Stages.findAll({
        where: condition,
      });
      mainTask.allTaskStage = mainTask.allTaskStage.split(',');
      if (mainTask.hasSubTask === 'YES') {
        mainTask.allTaskStage = [];
      }
      getTaskStages.forEach((stage) => {
        if (stage.TaskStage === 'Assigned') {
          mainTask.allTaskStage.unshift(stage.tasks_stagesID);
          mainTask.tasks_stagesID = stage.tasks_stagesID;
        } else if (stage.TaskStage === 'Finished') {
          mainTask.allTaskStage.push(stage.tasks_stagesID);
        }
      });
      mainUserAddTask = await UserTasks.create(
        {
          parentuserTasksID: 0,
          userMasterID: mainTask.userMasterID,
          TaskName: mainTask.TaskName,
          TaskDesc: mainTask.TaskDesc,
          attachment: mainTask.attachment ? mainTask.attachment : '',
          priority: mainTask.priority,
          tasktype: '0',
          isrecurringtype: mainTask.isrecurringtype
            ? mainTask.isrecurringtype
            : '',
          recurringtimeline: mainTask.recurringtimeline
            ? mainTask.recurringtimeline
            : '',
          startDate: mainTask.startDate,
          startTime: mainTask.startTime ? mainTask.startTime : '',
          endDate: mainTask.endDate ? mainTask.endDate : null,
          tasks_stagesID: mainTask.tasks_stagesID,
          allTaskStage: mainTask.allTaskStage,
          taskStatus:
            mainTask.userMasterID == mainTask.createBy
              ? 1
              : mainTask.taskStatus,
          createBy: mainTask.createBy,
          createByIp: mainTask.createByIp,
          taskWeightage: mainTask.taskWeightage,
          hasSubTask: mainTask.hasSubTask,
          isS3Upload: isStoreFileToS3Bucket,
          attachmentThumb: mainTask.attachmentThumb,
          migration: true,
        },
        { transaction },
      );
      if (mainTask.userMasterID == mainTask.createBy) {
        await TaskRemark.create(
          {
            remark: '',
            tasks_stagesID: mainUserAddTask.tasks_stagesID,
            user_TasksID: mainUserAddTask.user_TasksID,
            createBy: req.userDetails.userMasterId,
            createByIp: req.userDetails.userIpAddress,
            isS3Upload: isStoreFileToS3Bucket,
            migration: true,
          },
          { transaction },
        );
      }
      const userinfo = await UserMaster.findOne(
        {
          raw: true,
          where: {
            userMasterID: mainUserAddTask.createBy,
          },
        },
        { transaction },
      );

      if (!(mainTask.userMasterID == mainTask.createBy)) {
        const notification = {
          title: `${userinfo.displayName} has assigned  ${mainUserAddTask.TaskName} Task To you`,
          body: mainUserAddTask.TaskName,
        };
        const data = {
          screen: 'task',
          isScheduled: 'true',
          scheduledTime: new Date().toISOString(),
        };

        await UserInbox.create(
          {
            activityTable: UserTasks.getTableName(),
            activityTablePK: mainUserAddTask.user_TasksID,
            message: `${userinfo.displayName} has assigned  ${mainUserAddTask.TaskName} Task To you`,
            assignedTo: mainUserAddTask.userMasterID,
            assignedBy: mainUserAddTask.createBy,
          },
          { transaction },
        );
        await sendNotification(
          mainUserAddTask.userMasterID,
          notification,
          data,
        );
      }
    }
    for (subTask of subTaskData) {
      const condition = {
        [Sequelize.Op.and]: [
          {
            [Sequelize.Op.or]: [
              { TaskStage: { [Sequelize.Op.iLike]: '%Finished%' } },
              { TaskStage: { [Sequelize.Op.iLike]: '%Assigned%' } },
            ],
          },
          { companyMasterID: +subTask.companyMasterID },
        ],
      };
      const getTaskStages = await Task_Stages.findAll({
        where: condition,
      });

      subTask.allTaskStage = subTask.allTaskStage.split(',');

      getTaskStages.forEach((stage) => {
        if (stage.TaskStage === 'Assigned') {
          subTask.allTaskStage.unshift(stage.tasks_stagesID);
          subTask.tasks_stagesID = stage.tasks_stagesID;
        } else if (stage.TaskStage === 'Finished') {
          subTask.allTaskStage.push(stage.tasks_stagesID);
        }
      });
      const subUserAddTask = await UserTasks.create(
        {
          parentuserTasksID: mainUserAddTask.user_TasksID,
          userMasterID: subTask.userMasterID,
          TaskName: subTask.TaskName,
          TaskDesc: subTask.TaskDesc,
          attachment: subTask.attachment ? subTask.attachment : '',
          priority: subTask.priority,
          tasktype: '0',
          isrecurringtype: subTask.isrecurringtype
            ? subTask.isrecurringtype
            : '',
          recurringtimeline: subTask.recurringtimeline
            ? subTask.recurringtimeline
            : '',
          startDate: subTask.startDate,
          startTime: subTask.startTime ? subTask.startTime : '',
          endDate: subTask.endDate ? subTask.endDate : null,
          tasks_stagesID: subTask.tasks_stagesID,
          allTaskStage: subTask.allTaskStage,
          taskStatus:
            subTask.userMasterID == subTask.createBy ? 1 : subTask.taskStatus,
          createBy: subTask.createBy,
          createByIp: subTask.createByIp,
          taskWeightage: subTask.taskWeightage,
          hasSubTask: subTask.hasSubTask,
          isS3Upload: isStoreFileToS3Bucket,
          attachmentThumb: subTask.attachmentThumb || null,
          migration: true,
        },
        { transaction },
      );
      const userinfo = await UserMaster.findOne(
        {
          raw: true,
          where: {
            userMasterID: subUserAddTask.createBy,
          },
        },
        { transaction },
      );
      if (!(subTask.userMasterID == mainTask.createBy)) {
        const notification = {
          title: `${userinfo.displayName} has assigned  ${subUserAddTask.TaskName} Task To you`,
          body: subUserAddTask.TaskName,
        };
        const data = {
          screen: 'task',
          isScheduled: 'true',
          scheduledTime: new Date().toISOString(),
        };

        await UserInbox.create(
          {
            activityTable: UserTasks.getTableName(),
            activityTablePK: subUserAddTask.user_TasksID,
            message: `${userinfo.displayName} has assigned  ${subUserAddTask.TaskName} Task To you`,
            assignedTo: subUserAddTask.userMasterID,
            assignedBy: subUserAddTask.createBy,
          },
          { transaction },
        );
        await sendNotification(subUserAddTask.userMasterID, notification, data);
      }
    }
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Task'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.postUpdateTaskStageV2 = async (req, res, next) => {
  try {
    let { user_TasksID } = await req.body;

    let get_one_data = await UserTasks.findOne({
      where: {
        user_TasksID: user_TasksID,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      raw: true,
    });
    if (get_one_data) {
      let taskStage = Number(get_one_data.tasks_stagesID);
      let index = get_one_data.allTaskStage.indexOf(taskStage);
      if (
        get_one_data.parentuserTasksID == '0' &&
        index + 1 == get_one_data.allTaskStage.length - 1
      ) {
        let getSubTask = await UserTasks.findAll({
          where: {
            parentuserTasksID: user_TasksID,
            status: 1,
            taskStatus: {
              [Sequelize.Op.notIn]: [3],
            },
          },
          raw: true,
        });
        if (getSubTask.length > 0) {
          return res
            .status(200)
            .json({ status: 400, message: 'Please Complete Sub-Task' });
        } else {
          let get_TaskStage = await Task_Stages.findOne({
            where: {
              tasks_stagesID: get_one_data.allTaskStage[index + 1],
              status: {
                [Sequelize.Op.in]: [0, 1],
              },
            },
            raw: true,
          });

          if (get_TaskStage && index == get_one_data.allTaskStage.length - 1) {
            await UserTasks.update(
              {
                tasks_stagesID: get_one_data.allTaskStage[index + 1],
                taskStatus: 3,
              },
              {
                where: { user_TasksID: user_TasksID },
              },
            );
            return res.status(200).json({
              status: 200,
              data: get_TaskStage,
              message: message.usermessage.updateMessage('Task'),
            });
          } else if (get_TaskStage) {
            await UserTasks.update(
              {
                tasks_stagesID: get_one_data.allTaskStage[index + 1],
              },
              {
                where: { user_TasksID: user_TasksID },
              },
            );
            let get_task = await UserTasks.findOne({
              where: {
                user_TasksID: user_TasksID,
                status: {
                  [Sequelize.Op.in]: [0, 1],
                },
              },
              raw: true,
            });

            if (
              get_task.tasks_stagesID ==
              get_task.allTaskStage[get_task.allTaskStage.length - 1]
            ) {
              await UserTasks.update(
                {
                  taskStatus: 3,
                },
                {
                  where: { user_TasksID: user_TasksID },
                },
              );
            }

            return res.status(200).json({
              status: 200,
              data: get_TaskStage,
              message: message.usermessage.updateMessage('Task'),
            });
          }
        }
      } else {
        let get_TaskStage = await Task_Stages.findOne({
          where: {
            tasks_stagesID: get_one_data.allTaskStage[index + 1],
            status: {
              [Sequelize.Op.in]: [0, 1],
            },
          },
          raw: true,
        });

        if (get_TaskStage && index == get_one_data.allTaskStage.length - 1) {
          await UserTasks.update(
            {
              tasks_stagesID: get_one_data.allTaskStage[index + 1],
              taskStatus: 3,
            },
            {
              where: { user_TasksID: user_TasksID },
            },
          );
          return res.status(200).json({
            status: 200,
            data: get_TaskStage,
            message: message.usermessage.updateMessage('Task'),
          });
        } else if (get_TaskStage) {
          await UserTasks.update(
            {
              tasks_stagesID: get_one_data.allTaskStage[index + 1],
            },
            {
              where: { user_TasksID: user_TasksID },
            },
          );
          let get_task = await UserTasks.findOne({
            where: {
              user_TasksID: user_TasksID,
              status: {
                [Sequelize.Op.in]: [0, 1],
              },
            },
            raw: true,
          });

          if (
            get_task.tasks_stagesID ==
            get_task.allTaskStage[get_task.allTaskStage.length - 1]
          ) {
            await UserTasks.update(
              {
                taskStatus: 3,
              },
              {
                where: { user_TasksID: user_TasksID },
              },
            );
          }

          return res.status(200).json({
            status: 200,
            data: get_TaskStage,
            message: message.usermessage.updateMessage('Task'),
          });
        }
      }
    }
  } catch (err) {
    next(err);
  }
};

exports.postUpdateTask2 = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      user_TasksID,
      userMasterID,
      TaskName,
      TaskDesc,
      priority,
      tasktype,
      isrecurringtype,
      recurringtimeline,
      startDate,
      startTime,
      endDate,
      tasks_stagesID,
      allTaskStage,
      taskStatus,
      taskWeightage,
      parentuserTasksID,
      hasSubTask,
      attachment,
      attachmentThumb = null,
    } = await req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;

    if (req.files.length > 0) {
      const findUser = await UserMaster.findOne({
        where: { userMasterID: userMasterID },
        attributes: ['companyMasterId'],
      });
      const attendanceAttachmentUrl = req.files?.[0] || null;

      const attachmentPath = await s3OrLocalUploadFiles({
        attachment: attendanceAttachmentUrl?.path,
        attachmentFileName: attendanceAttachmentUrl?.filename,
        companyMasterId: findUser.companyMasterId,
      });
      if (attendanceAttachmentUrl.thumbnailPath) {
        const thumbnailPath = await s3OrLocalUploadFiles({
          attachment: attendanceAttachmentUrl.thumbnailPath,
          attachmentFileName: attendanceAttachmentUrl.thumbnailFilename,
          companyMasterId: findUser.companyMasterId,
          folderName: attachmentFilePathFolderNames.USER_TASK,
          isDeleteLocalFile: true,
        });

        attachmentThumb = thumbnailPath || null;
      }
      attachment = attachmentPath || null;
    }
    let get_one_data = await UserTasks.findOne({
      where: {
        user_TasksID: user_TasksID,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      raw: true,
    });
    if (parentuserTasksID != 0) {
      const getSubTask = await UserTasks.findAll(
        {
          where: {
            parentuserTasksID: parentuserTasksID,
            status: 1,
            user_TasksID: {
              [Sequelize.Op.notIn]: [user_TasksID],
            },
          },
          raw: true,
        },
        { transaction },
      );
      const totalWeightageSubTask =
        getSubTask.length > 0
          ? getSubTask.reduce((total, task) => total + +task.taskWeightage, 0)
          : 0;

      const sumdata = totalWeightageSubTask + +taskWeightage;
      if (sumdata > 100) {
        await transaction.rollback();
        return res.status(200).json({
          status: 400,
          message: 'Sub-Task Weightage Can Not be greater than 100',
        });
      } else {
        await UserTasks.update(
          {
            updateBy,
            updateByIp,
            taskWeightage: sumdata,
          },
          {
            where: { user_TasksID: parentuserTasksID },
          },
          { transaction },
        );
      }
    }
    if (!endDate || endDate == 'null') {
      endDate = null;
    }
    if (attachment == null || attachment == '' || attachment == undefined) {
      attachment = get_one_data.attachment;
    }
    allTaskStage = allTaskStage.split(',');

    await UserTasks.update(
      {
        userMasterID,
        TaskName,
        TaskDesc,
        attachment,
        priority,
        tasktype,
        isrecurringtype,
        recurringtimeline,
        startDate,
        startTime,
        endDate,
        tasks_stagesID,
        allTaskStage,
        taskStatus,
        updateBy,
        updateByIp,
        taskWeightage,
        isS3Upload: isStoreFileToS3Bucket,
        attachmentThumb,
      },
      {
        where: { user_TasksID: user_TasksID },
      },
      { transaction },
    );
    if (get_one_data.userMasterID != userMasterID) {
      const userinfo = await UserMaster.findOne(
        {
          raw: true,
          where: {
            userMasterID: updateBy,
          },
        },
        { transaction },
      );

      const notification = {
        title: `${userinfo.displayName} has assigned  ${TaskName} Task To you`,
        body: TaskName,
      };
      const data = {
        screen: 'task',
        isScheduled: 'true',
        scheduledTime: new Date().toISOString(),
      };
      await UserInbox.destroy(
        {
          where: {
            activityTable: UserTasks.getTableName(),
            activityTablePK: user_TasksID,
          },
        },
        { transaction },
      );
      await UserInbox.create(
        {
          activityTable: UserTasks.getTableName(),
          activityTablePK: user_TasksID,
          message: `${userinfo.displayName} has assigned  ${TaskName} Task To you`,
          assignedTo: userMasterID,
          assignedBy: updateBy,
        },
        { transaction },
      );
      await sendNotification(userMasterID, notification, data);
    }
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Task'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.postDeleteTaskById2 = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { user_TasksID } = await req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    const GetTask = await UserTasks.findOne(
      {
        where: {
          user_TasksID: user_TasksID,
          status: 1,
        },
        raw: true,
      },
      { transaction },
    );
    if (GetTask.parentuserTasksID == '0' && GetTask.hasSubTask == 'YES') {
      await transaction.rollback();
      return res.status(400).json({
        status: 400,
        message: 'You can Not Delete Because It has Sub Task',
      });
    }
    await UserInbox.destroy(
      {
        where: {
          activityTable: UserTasks.getTableName(),
          activityTablePK: user_TasksID,
        },
      },
      { transaction },
    );
    await UserTasks.update(
      { status: 2 },
      { where: { user_TasksID: user_TasksID } },
      { transaction },
    );
    const getSubTaskForWeightage = await UserTasks.findAll(
      {
        where: {
          parentuserTasksID: GetTask.parentuserTasksID,
          status: 1,
        },
        raw: true,
      },
      { transaction },
    );

    const totalWeightageSubTask =
      getSubTaskForWeightage.length > 0
        ? getSubTaskForWeightage.reduce(
            (total, task) => total + +task.taskWeightage,
            0,
          )
        : 100;
    if (getSubTaskForWeightage.length > 0) {
      await UserTasks.update(
        {
          updateBy,
          updateByIp,
          taskWeightage: totalWeightageSubTask,
        },
        {
          where: { user_TasksID: GetTask.parentuserTasksID },
        },
        { transaction },
      );
    } else {
      await UserTasks.update(
        {
          updateBy,
          updateByIp,
          taskWeightage: totalWeightageSubTask,
          hasSubTask: 'NO',
        },
        {
          where: { user_TasksID: GetTask.parentuserTasksID },
        },
        { transaction },
      );
    }

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Task'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getAllTaskStagebyUserV3 = async (req, res, next) => {
  try {
    const {
      limit,
      page,
      searchQuery,
      userMasterID,
      tasks_stagesID,
      startDate,
      endDate,
      taskstatus,
    } = await req.body;

    if (!userMasterID) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.ValidParameters,
      });
    }

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const condition = { userMasterID };
    if (taskstatus) condition.taskStatus = taskstatus;
    if (tasks_stagesID) condition.tasks_stagesID = tasks_stagesID;
    condition.status = 1;
    if (startDate && endDate)
      condition.startDate = {
        [Sequelize.Op.between]: [new Date(startDate), new Date(endDate)],
      };

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          '$userMaster.displayName$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          TaskName: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          '$userMaster.companyMaster.companyName$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          '$tasks_stage.TaskStage$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
      ];

    let TaskList = await UserTasks.findAndCountAll({
      where: condition,
      ...paginationQuery,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: UserMaster,
          where: {
            status: 1,
          },
          required: true,
          include: [
            {
              model: companyMaster,
              attributes: [
                'companyMasterID',
                'companyName',
                'companyAddress',
                'status',
                'createBy',
                'updateBy',
              ],
            },
          ],
          attributes: [
            'userMasterID',
            'firstName',
            'middleName',
            'lastName',
            'displayName',
            'userNumber',
            'companyMasterId',
            'createBy',
            'updateBy',
          ],
        },
        {
          model: Task_Stages,
          attributes: [
            'tasks_stagesID',
            'TaskStage',
            'companyMasterID',
            'status',
            'createBy',
            'updateBy',
          ],
        },
        {
          model: UserMaster,
          as: 'createByUser',
          attributes: ['displayName'],
        },
      ],
    });

    // Declare async for the function

    const result = await calculateTaskCompletionPercentage(TaskList.rows);

    // Make the function async as it contains await
    function calculateTaskCompletionPercentage(data) {
      return data.map((taskInstance) => {
        const task = taskInstance.get({ plain: true });

        let totalWeightage_Of_Subtask = 0;

        if (+task.parentuserTasksID == 0 && task.hasSubTask === 'YES') {
          totalWeightage_Of_Subtask = data
            .filter(
              (e) =>
                e.parentuserTasksID == task.user_TasksID && e.taskStatus == '3',
            )
            .reduce((acc, obj) => acc + +obj.taskWeightage, 0);
        } else if (+task.parentuserTasksID == 0 && task.hasSubTask === 'NO') {
          totalWeightage_Of_Subtask =
            task.taskStatus == '3' ? +task.taskWeightage : 0;
        } else {
          totalWeightage_Of_Subtask =
            task.taskStatus == '3' ? +task.taskWeightage : 0;
        }

        return {
          ...task,
          completionPercentage: totalWeightage_Of_Subtask,
        };
      });
    }

    return res.status(200).json({
      status: 200,
      data: result,
      totalcount: TaskList.count,
    });
  } catch (err) {
    next(err);
  }
};

exports.getSubTaskByID = async (req, res, next) => {
  try {
    const { user_TasksID } = await req.body;

    let get_one_data = await UserTasks.findAll({
      where: {
        parentuserTasksID: user_TasksID,
        status: 1,
      },
      include: [
        {
          model: UserMaster,
          attributes: [
            'userMasterID',
            'firstName',
            'middleName',
            'lastName',
            'displayName',
            'userNumber',
            'companyMasterId',
            'createBy',
            'updateBy',
          ],
          include: [
            {
              model: companyMaster,
              attributes: [
                'companyMasterID',
                'companyName',
                'companyAddress',
                'status',
                'createBy',
                'updateBy',
              ],
            },
          ],
        },
        {
          model: Task_Stages,
          attributes: [
            'tasks_stagesID',
            'TaskStage',
            'companyMasterID',
            'status',
            'createBy',
            'updateBy',
          ],
        },
      ],
      raw: true,
    });
    for (var i = 0; i < get_one_data.length; i++) {
      let user1 = await UserMaster.findOne({
        raw: true,
        where: {
          userMasterID: get_one_data[i].createBy,
        },
      });

      if (user1) {
        get_one_data[i].createByUser = user1.displayName;
      }
    }
    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.getMainTaskByID = async (req, res, next) => {
  try {
    const { parentuserTasksID } = await req.body;

    let get_one_data = await UserTasks.findAll({
      where: {
        user_TasksID: parentuserTasksID,
        status: 1,
      },
      include: [
        {
          model: UserMaster,
          attributes: [
            'userMasterID',
            'firstName',
            'middleName',
            'lastName',
            'displayName',
            'userNumber',
            'companyMasterId',
            'createBy',
            'updateBy',
          ],
          include: [
            {
              model: companyMaster,
              attributes: [
                'companyMasterID',
                'companyName',
                'companyAddress',
                'status',
                'createBy',
                'updateBy',
              ],
            },
          ],
        },
        {
          model: Task_Stages,
          attributes: [
            'tasks_stagesID',
            'TaskStage',
            'companyMasterID',
            'status',
            'createBy',
            'updateBy',
          ],
        },
      ],
      raw: true,
    });

    for (var i = 0; i < get_one_data.length; i++) {
      let user1 = await UserMaster.findOne({
        raw: true,
        where: {
          userMasterID: get_one_data[i].createBy,
        },
      });

      if (user1) {
        get_one_data[i].createByUser = user1.displayName;
      }
    }
    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.getAllTaskStagebyCompany2 = async (req, res, next) => {
  try {
    const {
      limit,
      page,
      searchQuery,
      companyMasterID,
      userMasterID,
      tasks_stagesID,
      startDate,
      endDate,
      exportData,
    } = await req.body;

    if (!companyMasterID) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.ValidParameters,
      });
    }

    const condition = { status: 1 };

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          '$userMaster.displayName$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        { TaskName: { [Sequelize.Op.iLike]: '%' + searchQuery + '%' } },
      ];

    condition['$userMaster.companyMasterId$'] = companyMasterID;
    req.userDetails.accessibleCompanies = companyMasterID;

    if (tasks_stagesID) condition.tasks_stagesID = tasks_stagesID;

    condition.createBy = req.userDetails.userMasterId;
    if (startDate && endDate)
      condition.startDate = {
        [Sequelize.Op.between]: [new Date(startDate), new Date(endDate)],
      };

    const order = [['createdAt', 'DESC']];
    if (userMasterID) condition.userMasterID = userMasterID;

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const TaskList = await UserTasks.findAndCountAll({
      where: condition,
      ...paginationQuery,
      order,
      include: [
        {
          required: true,
          model: UserMaster,
          where: { ...userAccessCondition.where },
          include: [...userAccessCondition.includeModels],
          attributes: [
            'userMasterID',
            'displayName',
            'userNumber',
            'companyMasterId',
          ],
          include: [
            {
              required: false,
              model: EmployeeDesignation,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },

              attributes: ['designationID'],
              include: [
                {
                  model: Designation,
                  as: 'designation',
                  attributes: ['designationName'],
                },
              ],
            },
            {
              required: false,
              model: EmployeeDepartment,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },

              attributes: ['departmentID'],
              include: [
                {
                  model: Department,
                  as: 'department',
                  attributes: ['departmentName'],
                },
              ],
            },
            {
              required: false,
              model: EmployeeBranch,
              where: {
                // ...(branchMasterID && { branchID: branchMasterID }),
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              required: false,
              attributes: ['branchID'],
              include: [
                {
                  model: BranchMaster,
                  as: 'branchMaster',
                  attributes: ['branchName'],
                },
              ],
            },
            {
              required: false,
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode'],
            },
            {
              // required: false,
              model: companyMaster,
              attributes: ['companyMasterID', 'companyName'],
            },
          ],
        },
        {
          required: false,
          model: UserMaster,
          as: 'updateByUser',
          attributes: userAttributes,
        },
        { model: Task_Stages, attributes: ['TaskStage'] },
      ],
    });

    // Create a map to cache user display names (optional but improves performance)
    const userCache = {};

    for (const task of TaskList.rows) {
      const taskObj = typeof task.toJSON === 'function' ? task.toJSON() : task;

      // ✅ 1. Calculate completionPercentage
      let totalWeightage_Of_Subtask = 0;

      if (+taskObj.parentuserTasksID === 0 && taskObj.hasSubTask === 'YES') {
        totalWeightage_Of_Subtask = TaskList.rows
          .filter(
            (e) =>
              e.parentuserTasksID === taskObj.user_TasksID &&
              e.taskStatus === '3',
          )
          .reduce((acc, obj) => acc + +obj.taskWeightage, 0);
      } else if (
        +taskObj.parentuserTasksID === 0 &&
        taskObj.hasSubTask === 'NO'
      ) {
        totalWeightage_Of_Subtask =
          taskObj.taskStatus === '3' ? +taskObj.taskWeightage : 0;
      } else {
        totalWeightage_Of_Subtask =
          taskObj.taskStatus === '3' ? +taskObj.taskWeightage : 0;
      }

      // ✅ 2. Set completionPercentage
      task.setDataValue('completionPercentage', totalWeightage_Of_Subtask);

      // ✅ 3. Set createByUser (use cache to avoid duplicate DB calls)
      if (!userCache[task.createBy]) {
        const user1 = await UserMaster.findOne({
          raw: true,
          where: { userMasterID: task.createBy },
        });

        userCache[task.createBy] = user1 ? user1.displayName : null;
      }

      task.setDataValue('createByUser', userCache[task.createBy]);
    }

    if (exportData) {
      const finalExportData = TaskList.rows.map((e) => {
        return {
          'Task Type':
            e.parentuserTasksID == '0'
              ? 'Main Task'
              : e.parentuserTasksID == null || e.parentuserTasksID == ''
                ? ''
                : 'Sub Task',
          'Employee Code': e.userMaster.employeeJoiningDetails[0].employeeCode,
          'Assigned To': e.userMaster.displayName,
          'Task Name': e.TaskName,
          'Task Description': sanitizeHtml(e.TaskDesc || '', {
            allowedTags: [],
            allowedAttributes: {},
          }),
          Priority: e.priority,
          'Start Date': moment(e.startDate).format('DD-MM-YYYY'),
          'Start Time':
            e.startTime && e.startTime != 'undefined' ? e.startTime : '',
          'End Date': e.endDate ? moment(e.endDate).format('DD-MM-YYYY') : '',
          'Task Status': taskStatus[e.taskStatus],
          Completion:
            e.dataValues.completionPercentage + ' / ' + e.taskWeightage,
          'Created At': moment(e.createdAt).format('DD-MM-YYYY HH:mm:ss'),
          'Created By': e.createByUser,
        };
      });

      await generateExcel(finalExportData, 'Task-Excel', 'xlsx', res);
      return;
    }
    return res
      .status(200)
      .json({ status: 200, data: TaskList.rows, totalcount: TaskList.count });
  } catch (err) {
    next(err);
  }
};

exports.taskDashBoard = async (req, res, next) => {
  try {
    let { companyMasterID, fromDate, toDate, listBy, exportData } =
      await req.query;
    const companyData = await companyMaster.findOne({
      where: {
        companyMasterID: companyMasterID,
        status: 1,
      },
      raw: true,
    });

    if (!companyData) {
      return res
        .status(200)
        .json({ status: 401, message: 'Company is Deactivated or Deleted.' });
    }

    const datesArray = await getDatesFromDateRange(
      new Date(fromDate),
      new Date(toDate),
    );

    const label = [];
    const taskData = [];
    const dataToBeExported = [];

    taskData.push(
      { data: [], label: 'MainTask' },
      { data: [], label: 'SubTask' },
    );
    let TaskList = [];

    let condition = { status: 1 };
    if (companyMasterID) {
      condition['$userMaster.companyMasterId$'] = companyMasterID;
      condition['$userMaster.status$'] = 1;
    }
    const toDateWithOneDay = new Date(toDate);
    toDateWithOneDay.setDate(toDateWithOneDay.getDate() + 1);
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    if (listBy == 'CreatedDate') {
      condition.createdAt = {
        [Sequelize.Op.between]: [new Date(fromDate), toDateWithOneDay],
      };
      TaskList = await UserTasks.findAll({
        raw: true,
        where: condition,
        include: [
          {
            required: true,
            model: UserMaster,
            where: { ...userAccessCondition.where },
            attributes: [
              'userMasterID',
              'displayName',
              'userNumber',
              'companyMasterId',
            ],
            include: [...userAccessCondition.includeModels],
          },
        ],
      });
    } else if (listBy == 'StartDate') {
      condition.startDate = {
        [Sequelize.Op.between]: [new Date(fromDate), toDateWithOneDay],
      };
      TaskList = await UserTasks.findAll({
        raw: true,
        where: condition,
        include: [
          {
            required: true,
            model: UserMaster,
            attributes: [
              'userMasterID',
              'displayName',
              'userNumber',
              'companyMasterId',
            ],
            where: { ...userAccessCondition.where },
            include: [...userAccessCondition.includeModels],
          },
        ],
      });
    }

    for (const date of datesArray) {
      const day = String(date.getUTCDate()).padStart(2, '0');
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const year = String(date.getUTCFullYear());
      label.push(`${day}-${month}`);
      let start = new Date(date);
      start.setUTCHours(0, 0, 0, 0);

      let end = new Date(date);
      end.setUTCHours(23, 59, 59, 999);
      const tasksForDay = TaskList.filter(
        (item) =>
          new Date(item.createdAt) >= start && new Date(item.createdAt) <= end,
      );
      const subTaskData = tasksForDay.filter(
        (item) => item.parentuserTasksID != '0',
      );
      const mainTaskData = tasksForDay.filter(
        (item) => item.parentuserTasksID == '0',
      );
      taskData[0].data.push(mainTaskData.length);
      taskData[1].data.push(subTaskData.length);
      dataToBeExported.push({
        Date: `${day}-${month}-${year}`,
        'Main Task': mainTaskData.length,
        'Sub Task': subTaskData.length,
      });
    }
    if (exportData) {
      await generateExcel(dataToBeExported, 'Task-Excel', 'xlsx', res);
      return;
    }
    return res.status(200).json({ status: 200, label: label, data: taskData });
  } catch (err) {
    next(err);
  }
};

exports.getTaskReportByCompany = async (req, res, next) => {
  try {
    let { companyMasterID, fromDate, toDate, listBy, exportData } =
      await req.query;

    let TaskList = [];
    let pending = 0,
      accepted = 0,
      rejected = 0,
      completed = 0;

    let condition = { status: 1 };
    if (companyMasterID) {
      condition['$userMaster.companyMasterId$'] = companyMasterID;
      condition['$userMaster.status$'] = 1;
    }
    const toDateWithOneDay = new Date(toDate);
    toDateWithOneDay.setDate(toDateWithOneDay.getDate() + 1);
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    if (listBy == 'CreatedDate') {
      condition.createdAt = {
        [Sequelize.Op.between]: [new Date(fromDate), toDateWithOneDay],
      };
      TaskList = await UserTasks.findAll({
        raw: true,
        where: condition,
        include: [
          {
            model: UserMaster,
            attributes: [
              'userMasterID',
              'displayName',
              'userNumber',
              'companyMasterId',
            ],
            required: true,
            where: { ...userAccessCondition.where },
            include: [...userAccessCondition.includeModels],
          },
        ],
      });
    } else if (listBy == 'StartDate') {
      condition.startDate = {
        [Sequelize.Op.between]: [new Date(fromDate), toDateWithOneDay],
      };
      TaskList = await UserTasks.findAll({
        raw: true,
        where: condition,
        include: [
          {
            model: UserMaster,
            attributes: [
              'userMasterID',
              'displayName',
              'userNumber',
              'companyMasterId',
            ],
            required: true,
            where: { ...userAccessCondition.where },
            include: [...userAccessCondition.includeModels],
          },
        ],
      });
    }

    for (var i = 0; i < TaskList.length; i++) {
      if (TaskList[i].taskStatus == '0') {
        pending++;
      } else if (TaskList[i].taskStatus == '1') {
        accepted++;
      } else if (TaskList[i].taskStatus == '2') {
        rejected++;
      } else {
        completed++;
      }
    }
    let data = {
      pending: pending,
      accepted: accepted,
      rejected: rejected,
      completed: completed,
    };
    const dataToBeExported = [
      {
        Pending: pending,
        Accepted: accepted,
        Rejected: rejected,
        Completed: completed,
        'Total Task': pending + accepted + rejected + completed,
      },
    ];
    if (exportData) {
      await generateExcel(dataToBeExported, 'Task-Excel', 'xlsx', res);
      return;
    }
    return res.status(200).json({
      status: 200,
      data: data,
      totalcount: pending + accepted + rejected + completed,
    });
  } catch (err) {
    next(err);
  }
};

exports.getTaskReportByUsers = async (req, res, next) => {
  try {
    let {
      companyid,
      fromDate,
      toDate,
      listBy,
      userMasterID,
      branchMasterID,
      exportData,
    } = await req.body;

    const dataToBeExported = [];
    let TaskList = [];
    const label = [];
    const taskData = [];
    taskData.push(
      { data: [], label: 'Completed' },
      { data: [], label: 'Accepted' },
      { data: [], label: 'Pending' },
      { data: [], label: 'Rejected' },
    );

    let condition = { status: 1 };
    if (companyid) {
      condition['$userMaster.companyMasterId$'] = companyid;
    }
    if (userMasterID && userMasterID.length > 0) {
      condition.userMasterID = {
        [Sequelize.Op.in]: userMasterID,
      };
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    const currentdate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const userMasterData = await UserMaster.findAll({
      where: { ...condition, ...userAccessCondition.where },
      order: [['userMasterID', 'ASC']],
      attributes: [
        'userMasterID',
        'displayName',
        'userNumber',
        'companyMasterId',
      ],
      distinct: true,
      include: [
        ...userAccessCondition.includeModels,
        {
          required: false,
          model: EmployeeJoiningDetails,
          attributes: ['employeeCode'],
        },
        {
          model: EmployeeBranch,
          where: {
            status: 1,
            applicableDate: {
              [Sequelize.Op.lte]: new Date(currentdate),
            },
            ...(branchMasterID &&
              (!Array.isArray(branchMasterID) || branchMasterID.length) && {
                branchID: branchMasterID,
              }),
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: new Date(currentdate),
                },
              },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: branchMasterID && branchMasterID.length > 0 ? true : false,
          attributes: ['branchID'],
          include: [
            {
              model: BranchMaster,
              as: 'branchMaster',
              attributes: ['branchMasterID', 'branchName'],
            },
          ],
        },
        {
          required: false,
          model: EmployeeDepartment,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(currentdate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(currentdate) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },

          attributes: ['departmentID'],
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['departmentName'],
            },
          ],
        },
        {
          required: false,
          model: EmployeeDesignation,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(currentdate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(currentdate) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },

          attributes: ['designationID'],
          include: [
            {
              model: Designation,
              as: 'designation',
              attributes: ['designationName'],
            },
          ],
        },
        {
          required: false,
          model: companyMaster,
          attributes: ['companyMasterID', 'companyName'],
        },
      ],
    });
    const userMasterDataArray = userMasterData.map((e) => {
      return {
        displayNameForLabel:
          e.displayName +
          (e.employeeJoiningDetails &&
          e.employeeJoiningDetails.length > 0 &&
          e.employeeJoiningDetails[0].employeeCode != null
            ? ' (' + e.employeeJoiningDetails[0].employeeCode + ')'
            : ''),
        userMasterID: e.userMasterID,
        displayName: e.displayName,
        employeeCode:
          e.employeeJoiningDetails.length > 0
            ? e.employeeJoiningDetails[0].employeeCode
            : '',
        companyName: e.companyMaster.companyName,
        branchName:
          e.employeeBranches.length > 0
            ? e.employeeBranches[0].branchMaster.branchName
            : '',
        departmentName:
          e.employeeDepartments.length > 0
            ? e.employeeDepartments[0].department.departmentName
            : '',
        designationName:
          e.employeeDesignations.length > 0
            ? e.employeeDesignations[0].designation.designationName
            : '',
        userNumber: e.userNumber,
      };
    });
    const toDateWithOneDay = new Date(toDate);
    toDateWithOneDay.setDate(toDateWithOneDay.getDate() + 1);
    if (listBy == 'CreatedDate') {
      condition.createdAt = {
        [Sequelize.Op.between]: [new Date(fromDate), toDateWithOneDay],
      };
      TaskList = await UserTasks.findAll({
        raw: true,
        where: condition,
        include: [
          {
            model: UserMaster,
            attributes: [
              'userMasterID',
              'displayName',
              'userNumber',
              'companyMasterId',
            ],
            required: true,
            where: { ...userAccessCondition.where },
            include: [...userAccessCondition.includeModels],
          },
        ],
      });
    } else if (listBy == 'StartDate') {
      condition.startDate = {
        [Sequelize.Op.between]: [new Date(fromDate), toDateWithOneDay],
      };
      TaskList = await UserTasks.findAll({
        raw: true,
        where: condition,
        include: [
          {
            model: UserMaster,
            attributes: [
              'userMasterID',
              'displayName',
              'userNumber',
              'companyMasterId',
            ],
            required: true,
            where: { ...userAccessCondition.where },
            include: [...userAccessCondition.includeModels],
          },
        ],
      });
    }
    for (const user of userMasterDataArray) {
      label.push(user.displayNameForLabel);
      const completed = TaskList.filter(
        (item) =>
          item.taskStatus != '0' &&
          item.taskStatus != '1' &&
          item.taskStatus != '2' &&
          item.userMasterID == user.userMasterID,
      );
      taskData[0].data.push(completed.length);

      const accepted = TaskList.filter(
        (item) =>
          item.taskStatus == '1' && item.userMasterID == user.userMasterID,
      );
      taskData[1].data.push(accepted.length);

      const pending = TaskList.filter(
        (item) =>
          item.taskStatus == '0' && item.userMasterID == user.userMasterID,
      );
      taskData[2].data.push(pending.length);

      const rejected = TaskList.filter(
        (item) =>
          item.taskStatus == '2' && item.userMasterID == user.userMasterID,
      );
      taskData[3].data.push(rejected.length);
      dataToBeExported.push({
        'Company Name': user.companyName,
        'Employee Code': user.employeeCode,
        'Employee Name': user.displayName,
        'Employee Number': user.userNumber,
        Branch: user.branchName,
        Department: user.departmentName,
        Designation: user.designationName,
        Completed: completed.length,
        Accepted: accepted.length,
        Pending: pending.length,
        Rejected: rejected.length,
      });
    }
    if (exportData) {
      await generateExcel(dataToBeExported, 'Task-Excel', 'xlsx', res);
      return;
    }

    return res.status(200).json({
      status: 200,
      data: taskData,
      label: label,
    });
  } catch (err) {
    next(err);
  }
};

exports.pendingTaskDashBoard = async (req, res, next) => {
  try {
    let { companyMasterID, exportData } = await req.query;
    const companyData = await companyMaster.findOne({
      where: {
        companyMasterID: companyMasterID,
        status: 1,
      },
      raw: true,
    });

    if (!companyData) {
      return res
        .status(200)
        .json({ status: 401, message: 'Company is Deactivated or Deleted.' });
    }

    const label = [];
    const taskData = [];
    const dataToBeExported = [];

    taskData.push(
      { data: [], label: 'Pending' },
      { data: [], label: 'Completed' },
    );
    let TaskList = [];

    let condition = { status: 1 };
    condition['$userMaster.companyMasterId$'] = companyMasterID;
    condition['$userMaster.status$'] = 1;
    const order = [['createdAt', 'ASC']];
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    TaskList = await UserTasks.findAll({
      raw: true,
      where: condition,
      order,
      include: [
        {
          required: true,
          model: UserMaster,
          where: { ...userAccessCondition.where },
          attributes: [
            'userMasterID',
            'displayName',
            'userNumber',
            'companyMasterId',
          ],
          include: [
            ...userAccessCondition.includeModels,
            {
              required: false,
              model: EmployeeDesignation,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },

              attributes: ['designationID'],
              include: [
                {
                  model: Designation,
                  as: 'designation',
                  attributes: ['designationName'],
                },
              ],
            },
            {
              required: false,
              model: EmployeeDepartment,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },

              attributes: ['departmentID'],
              include: [
                {
                  model: Department,
                  as: 'department',
                  attributes: ['departmentName'],
                },
              ],
            },
            {
              required: false,
              model: EmployeeBranch,
              where: {
                // ...(branchMasterID && { branchID: branchMasterID }),
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              required: false,
              attributes: ['branchID'],
              include: [
                {
                  model: BranchMaster,
                  as: 'branchMaster',
                  attributes: ['branchName'],
                },
              ],
            },
            {
              required: false,
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode'],
            },
            {
              required: false,
              model: companyMaster,
              attributes: ['companyMasterID', 'companyName'],
            },
          ],
        },
      ],
    });
    const result = await calculateTaskCompletionPercentage(TaskList);
    function calculateTaskCompletionPercentage(data) {
      return data.map((task) => {
        let totalWeightage_Of_Subtask = 0;

        if (+task.parentuserTasksID == 0 && task.hasSubTask === 'YES') {
          totalWeightage_Of_Subtask = data
            .filter(
              (e) =>
                e.parentuserTasksID == task.user_TasksID && e.taskStatus == '3',
            )
            .reduce((acc, obj) => acc + +obj.taskWeightage, 0);
        } else if (+task.parentuserTasksID == 0 && task.hasSubTask === 'NO') {
          totalWeightage_Of_Subtask =
            task.taskStatus == '3' ? +task.taskWeightage : 0;
        } else {
          totalWeightage_Of_Subtask =
            task.taskStatus == '3' ? +task.taskWeightage : 0;
        }

        return {
          ...task,
          completionPercentage: totalWeightage_Of_Subtask,
        };
      });
    }

    for (data of result) {
      if (data.taskStatus == '0' || data.taskStatus == '1') {
        // label.push(`${data.TaskName}-${data['userMaster.employeeJoiningDetails.employeeCode'] ? data['userMaster.employeeJoiningDetails.employeeCode'] : data['userMaster.displayName']}`);
        label.push(`${data.TaskName}`);
        const pendingWeightage =
          +data.taskWeightage - +data.completionPercentage;
        taskData[0].data.push(pendingWeightage);
        taskData[1].data.push(+data.completionPercentage);
        dataToBeExported.push({
          // "Task Name": `${data.TaskName}`,
          // "Assigned To": `${data['userMaster.displayName']}`,
          // // "Sub Task": subTaskData.length,

          'Employee Code':
            data['userMaster.employeeJoiningDetails.employeeCode'],
          'Assigned To': data['userMaster.displayName'],
          'User Number': data['userMaster.userNumber'],
          'Company Name': data['userMaster.companyMaster.companyName'],
          'Branch Name':
            data['userMaster.employeeBranches.branchMaster.branchName'],
          'Department Name':
            data['userMaster.employeeDepartments.department.departmentName'],
          'Designation Name':
            data['userMaster.employeeDesignations.designation.designationName'],
          'Task Type':
            data.parentuserTasksID == '0'
              ? 'Main Task'
              : data.parentuserTasksID == null || data.parentuserTasksID == ''
                ? ''
                : 'Sub Task',
          'Task Name': data.TaskName,
          'Task Description': sanitizeHtml(data.TaskDesc || '', {
            allowedTags: [],
            allowedAttributes: {},
          }),
          Priority: data.priority,
          'Start Date': moment(data.startDate).format('DD-MM-YYYY'),
          'Start Time':
            data.startTime && data.startTime != 'undefined'
              ? data.startTime
              : '',
          'End Date': data.endDate
            ? moment(data.endDate).format('DD-MM-YYYY')
            : '',
          // 'Start Date': e.startDate,
          // 'Current Stage': data['tasks_stage.TaskStage'],
          'Total Weightage': +data.taskWeightage,
          'Pending Weightage': pendingWeightage,
          'Completed Weightage': +data.completionPercentage,
        });
      }

      // Make the function async as it contains await
    }

    if (exportData) {
      await generateExcel(dataToBeExported, 'Task-Excel', 'xlsx', res);
      return;
    }
    return res.status(200).json({ status: 200, label: label, data: taskData });
  } catch (err) {
    next(err);
  }
};

exports.updateTaskAssignee = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { user_TasksID, userMasterID } = req.body;

    if (!user_TasksID) {
      await transaction.rollback();
      return res.status(200).json({ status: 400, message: 'Task Not Found.' });
    }

    if (!userMasterID) {
      await transaction.rollback();
      return res.status(200).json({ status: 400, message: 'User Not Found.' });
    }

    await UserTasks.update(
      {
        userMasterID: userMasterID,
        taskStatus: userMasterID == req.userDetails.userMasterId ? 1 : 0,
        updateBy: req.userDetails.userMasterId,
        updateByIp: req.userDetails.userIpAddress,
      },
      {
        where: {
          user_TasksID: user_TasksID,
        },
        transaction,
      },
    );

    if (!(userMasterID == req.userDetails.userMasterId)) {
      const subUserAddTask = await UserTasks.findOne({
        where: {
          user_TasksID,
        },
        attributes: ['TaskName'],
        transaction,
      });

      const userinfo = await UserMaster.findOne({
        raw: true,
        where: {
          userMasterID: req.userDetails.userMasterId,
        },
        transaction,
      });

      const notification = {
        title: `${userinfo.displayName} has assigned ${subUserAddTask.TaskName} Task To you`,
        body: subUserAddTask.TaskName,
      };

      const data = {
        screen: 'task',
        isScheduled: 'true',
        scheduledTime: new Date().toISOString(),
      };

      await UserInbox.create(
        {
          activityTable: UserTasks.getTableName(),
          activityTablePK: user_TasksID,
          message: `${userinfo.displayName} has assigned ${subUserAddTask.TaskName} Task To you`,
          assignedTo: userMasterID,
          assignedBy: req.userDetails.userMasterId,
        },
        { transaction },
      );

      await sendNotification(userMasterID, notification, data);
    }

    await transaction.commit();

    return res
      .status(200)
      .json({ status: 200, message: 'Task Assignee Updated Successfully' });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

exports.updateTaskStageandRemarks = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { user_TasksID, remark, tasks_stagesID } = req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    const userCompanyMasterId = req.userDetails.companyMasterId;
    if (!user_TasksID) {
      await transaction.rollback();

      return res.status(200).json({
        status: 400,
        message: message.usermessage.requiredMessage('Task'),
      });
    }

    const userTask = await UserTasks.findOne({
      where: {
        user_TasksID,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      transaction,
    });

    if (!userTask) {
      await transaction.rollback();

      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Task'),
      });
    }

    const allTaskStages = Array.isArray(userTask.allTaskStage)
      ? userTask.allTaskStage.map(Number)
      : [];

    if (!allTaskStages.length) {
      await transaction.rollback();

      return res.status(200).json({
        status: 400,
        message: 'Task stages are not configured',
      });
    }

    const currentStageID = Number(userTask.tasks_stagesID);
    const currentStageIndex = allTaskStages.indexOf(currentStageID);

    if (currentStageIndex === -1) {
      await transaction.rollback();

      return res.status(200).json({
        status: 400,
        message: 'Current task stage is not available in the task stage list',
      });
    }

    const lastStageIndex = allTaskStages.length - 1;

    // Task is already at the final stage.
    if (currentStageIndex === lastStageIndex) {
      if (Number(userTask.taskStatus) !== 3) {
        await UserTasks.update(
          {
            taskStatus: 3,
            updateBy: updateBy,
            updateByIp: updateByIp,
          },
          { where: { user_TasksID }, transaction },
        );
      }

      await transaction.commit();

      return res.status(200).json({
        status: 200,
        message: 'Task is already completed',
      });
    }

    const nextStageIndex = currentStageIndex + 1;
    const nextStageID = allTaskStages[nextStageIndex];
    const isMovingToFinalStage = nextStageIndex === lastStageIndex;

    /*
     * Before completing a parent task, ensure all active subtasks
     * are completed.
     */
    if (Number(userTask.parentuserTasksID) === 0 && isMovingToFinalStage) {
      const incompleteSubTaskCount = await UserTasks.count({
        where: {
          parentuserTasksID: user_TasksID,
          status: 1,
          taskStatus: {
            [Sequelize.Op.ne]: 3,
          },
        },
        transaction,
      });

      if (incompleteSubTaskCount > 0) {
        await transaction.rollback();

        return res.status(200).json({
          status: 401,
          message: 'Please complete all sub-tasks first',
        });
      }
    }

    const nextTaskStage = await Task_Stages.findOne({
      where: {
        tasks_stagesID: nextStageID,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      transaction,
    });

    if (!nextTaskStage) {
      await transaction.rollback();

      return res.status(200).json({
        status: 404,
        message: message.usermessage.notFoundMessage('Next task stage'),
      });
    }

    await UserTasks.update(
      {
        tasks_stagesID: nextStageID,
        ...(isMovingToFinalStage && {
          taskStatus: 3,
        }),
        updateBy: updateBy,
        updateByIp: updateByIp,
      },
      { where: { user_TasksID }, transaction },
    );
    let file = null;
    let filePath = null;
    let attachmentThumbnail = null;
    if (req.file) {
      const findUser = await UserMaster.findOne({
        where: { userMasterID: userTask.userMasterID },
        attributes: ['companyMasterId'],
      });
      attachment = req.file.filename;
      file = req.file;
      filePath = await s3OrLocalUploadFiles({
        attachment: file.path,
        attachmentFileName: file.filename,
        companyMasterId: findUser.companyMasterId,
        folderName: attachmentFilePathFolderNames.USER_TASK_REMARKS,
        isDeleteLocalFile: true,
      });
      if (file.thumbnailPath) {
        const thumbnailPath = await s3OrLocalUploadFiles({
          attachment: file.thumbnailPath,
          attachmentFileName: file.thumbnailFilename,
          companyMasterId: findUser.companyMasterId,
          folderName: attachmentFilePathFolderNames.USER_TASK_REMARKS,
          isDeleteLocalFile: true,
        });

        attachmentThumbnail = thumbnailPath || null;
      }
    }

    await TaskRemark.create(
      {
        remark,
        tasks_stagesID,
        user_TasksID,
        createBy: updateBy,
        createByIp: updateByIp,
        attachment: filePath,
        attachmentThunbnail: attachmentThumbnail,
        isS3Upload: isStoreFileToS3Bucket,
        migration: true,
      },
      { transaction },
    );

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Task'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};
