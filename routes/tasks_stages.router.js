const express = require('express');
const Task_Stages_Router = require('../controllers/tasks_stages.controller');
const { uploadImportExcelFile } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TASKSTAGES,
        operation: formOperation.CREATE,
      },
    ],
  }),
  Task_Stages_Router.postAddTaskStage,
); // save data
router.post(
  '/v1/getalldata',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TASKREPORT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.MYTASK,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.MYTASK,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.ASSIGNTASK,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.ASSIGNTASK,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.ASSIGNTASK,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.TASKSTAGES,
        operation: formOperation.VIEW,
      },
    ],
  }),
  Task_Stages_Router.getAllTaskStage,
); // get all task stage data
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TASKSTAGES,
        operation: formOperation.EDIT,
      },
    ],
  }),
  Task_Stages_Router.getTaskStageById,
); //get by id
router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TASKSTAGES,
        operation: formOperation.EDIT,
      },
    ],
  }),
  Task_Stages_Router.postUpdateTaskStage,
); //update task stage data
router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TASKSTAGES,
        operation: formOperation.DELETE,
      },
    ],
  }),
  Task_Stages_Router.postDeleteTaskStageById,
); //delete by id
router.post(
  '/v1/statuschange',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TASKSTAGES,
        operation: formOperation.EDIT,
      },
    ],
  }),
  Task_Stages_Router.poststatuschange,
); //delete by id
router.post(
  '/v1/getTaskStageByIdArray',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYTASK,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.ASSIGNTASK,
        operation: formOperation.EDIT,
      },
    ],
  }),
  Task_Stages_Router.getTaskStageByIdArray,
); //get all by ID

router.post(
  '/v1/validateExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TASKSTAGES,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  Task_Stages_Router.validateUploadExcel,
);

router.post(
  '/v1/reValidateTaskStages',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TASKSTAGES,
        operation: formOperation.CREATE,
      },
    ],
  }),
  Task_Stages_Router.reValidateTaskStages,
);

router.post(
  '/v1/addValidateTaskStages',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TASKSTAGES,
        operation: formOperation.CREATE,
      },
    ],
  }),
  Task_Stages_Router.addValidateTaskStages,
);

router.post(
  '/v1/send-reminder',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNTASK,
        operation: formOperation.VIEW,
      },
    ],
  }),
  Task_Stages_Router.sendReminder,
);
router.post(
  '/v1/list-reminder',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNTASK,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.MYTASK,
        operation: formOperation.VIEW,
      },
    ],
  }),
  Task_Stages_Router.findAllReminder,
);

module.exports = router;
