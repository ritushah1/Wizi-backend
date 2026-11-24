const express = require('express');

const TaskRemarkController = require('../controllers/taskremark.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post('/v1/postAddTaskRemark', TaskRemarkController.postAddTaskRemark); // save data
router.get(
  '/v1/getTaskById/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TASKREPORT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.MYTASK,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ASSIGNTASK,
        operation: formOperation.VIEW,
      },
    ],
  }),
  TaskRemarkController.getTaskById,
); //get by id

router.post(
  '/v2/postAddTaskRemark',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYTASK,
        operation: formOperation.CREATE,
      },
    ],
  }),
  TaskRemarkController.postAddTaskRemark_V2,
); // save data
module.exports = router;
