const express = require('express');
const DailyTask = require('../controllers/dailyTask.controller');
const { uploadDailyTask } = require('../middleware/uploadFile');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const router = express.Router();

// V1 routes
router.post('/v1/add', uploadDailyTask, DailyTask.postAdddailyTask);

router.post(
  '/v1/getAll',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DAILYUSERREPORTING,
        operation: formOperation.VIEW,
      },
    ],
  }),
  DailyTask.getAllTask,
);
router.post('/v1/deletebyID', DailyTask.postDelete);

router.get(
  '/v1/getbyID/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DAILYUSERREPORTING,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.DAILYUSERREPORTING,
        operation: formOperation.EDIT,
      },
    ],
  }),
  DailyTask.getById,
);
router.post('/v1/getAllbyCompany', DailyTask.getAllTaskbyCompany);

// V2 routes
router.post('/v2/add', uploadDailyTask, DailyTask.postAdddailyTaskNew);

router.post(
  '/v2/getAll',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VIEWDAILYREPORTING,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.TEAMDAILYREPORTING,
        operation: formOperation.VIEW,
      },
    ],
  }),
  DailyTask.getAllTaskNew,
);

router.post('/v2/update', uploadDailyTask, DailyTask.updateNew);

module.exports = router;
