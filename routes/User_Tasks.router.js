const express = require('express');
const User_Task_Router = require('../controllers/User_Tasks.controller');
const {
  uploadUserTask,
  uploadUserTaskRemark,
} = require('../middleware/uploadFile');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { generateMulterThumbnails } = require('../middleware/uploadThumbnails');

const router = express.Router();

router.get(
  '/v1/getbyID/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNTASK,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.MYTASK,
        operation: formOperation.EDIT,
      },
    ],
  }),
  User_Task_Router.getTaskById,
); // save data
router.post(
  '/v1/deleteTask',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.IPWHITELISTING,
        operation: formOperation.DELETE,
      },
    ],
  }),
  User_Task_Router.postDeleteTaskById,
); // save data
router.get(
  '/v1/getNextStageById/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYTASK,
        operation: formOperation.EDIT,
      },
    ],
  }),
  User_Task_Router.getNextStageById,
); // save data
router.post(
  '/v1/TaskAcceptReject',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYTASK,
        operation: formOperation.VIEW,
      },
    ],
  }),
  User_Task_Router.TaskAcceptReject,
); // save data
router.post('/v1/getTaskReport', User_Task_Router.getTaskReport); // Task Report

router.post(
  '/v2/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNTASK,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.MYTASK,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadUserTask,
  generateMulterThumbnails,
  User_Task_Router.postAddTaskStageV2,
); // save data

router.post('/v2/postUpdateTaskStage', User_Task_Router.postUpdateTaskStageV2); // save data

router.post(
  '/v2/updateTask',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNTASK,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.MYTASK,
        operation: formOperation.EDIT,
      },
    ],
  }),
  uploadUserTask,
  generateMulterThumbnails,
  User_Task_Router.postUpdateTask2,
); // save data

router.post(
  '/v2/deleteTask',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNTASK,
        operation: formOperation.DELETE,
      },
      {
        permissionName: fromPermissionName.MYTASK,
        operation: formOperation.DELETE,
      },
    ],
  }),
  User_Task_Router.postDeleteTaskById2,
); // save data

router.post(
  '/v3/getTaskbyUser',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYTASK,
        operation: formOperation.VIEW,
      },
    ],
  }),
  User_Task_Router.getAllTaskStagebyUserV3,
); // save dat

router.post(
  '/v1/getSubTaskByID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYTASK,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ASSIGNTASK,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.TASKREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  User_Task_Router.getSubTaskByID,
); // save data
router.post(
  '/v1/getMainTaskByID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYTASK,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ASSIGNTASK,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.TASKREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  User_Task_Router.getMainTaskByID,
); // save data

router.post(
  '/v2/getTaskbyCompany',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNTASK,
        operation: formOperation.VIEW,
      },
    ],
  }),
  User_Task_Router.getAllTaskStagebyCompany2,
); // save data

router.get(
  '/v1/taskDashBoard',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TASKDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  User_Task_Router.taskDashBoard,
);
router.get(
  '/v1/getTaskReportByCompany',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TASKDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  User_Task_Router.getTaskReportByCompany,
);

router.post(
  '/v1/getTaskReportByUsers',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TASKDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  User_Task_Router.getTaskReportByUsers,
);

router.get(
  '/v1/pendingTaskDashBoard',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TASKDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  User_Task_Router.pendingTaskDashBoard,
);
router.post(
  '/v1/updateTaskAssignee',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNTASK,
        operation: formOperation.EDIT,
      },
    ],
  }),
  User_Task_Router.updateTaskAssignee,
);
router.post(
  '/v1/updateTaskStageandRemarks',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYTASK,
        operation: formOperation.EDIT,
      },
    ],
  }),
  uploadUserTaskRemark,
  generateMulterThumbnails,
  User_Task_Router.updateTaskStageandRemarks,
); // save data

module.exports = router;
