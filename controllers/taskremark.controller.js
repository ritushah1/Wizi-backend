const Sequelize = require('sequelize');
const message = require('../response_message/message');
const Task_Stages = require('../models/tasks_stages');
const TaskRemark = require('../models/taskremark');
const { isStoreFileToS3Bucket } = require('../utils/labelUtils');

exports.postAddTaskRemark = async (req, res, next) => {
  try {
    let { remark, tasks_stagesID, user_TasksID } = await req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    TaskRemark.create({
      remark,
      tasks_stagesID,
      user_TasksID,
      createBy,
      createByIp,
      migration: true,
      isS3Upload: isStoreFileToS3Bucket,
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Task Remarks'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getTaskById = async (req, res, next) => {
  try {
    const order = [['createdAt', 'ASC']];

    let get_one_data = await TaskRemark.findAll({
      where: {
        user_TasksID: req.params.id,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      order,
      include: [
        {
          model: Task_Stages,
        },
      ],
    });

    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.postAddTaskRemark_V2 = async (req, res, next) => {
  try {
    let { remark, tasks_stagesID, user_TasksID } = await req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    TaskRemark.create({
      remark,
      tasks_stagesID,
      user_TasksID,
      createBy,
      createByIp,
      migration: true,
      isS3Upload: isStoreFileToS3Bucket,
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Task Remarks'),
    });
  } catch (err) {
    next(err);
  }
};
