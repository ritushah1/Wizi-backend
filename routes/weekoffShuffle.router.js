const express = require('express');
const router = express.Router();
const weekoffShuffleController = require('../controllers/weekoffShuffle.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WEEKOFFSHUFFLE,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.REPORTEEWISESHIFTROSTER,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.SHIFTROSTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  weekoffShuffleController.postadd,
);

router.post(
  '/v1/getdata',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WEEKOFFSHUFFLE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  weekoffShuffleController.getdata,
);

router.delete(
  '/v1/deletedata/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WEEKOFFSHUFFLE,
        operation: formOperation.DELETE,
      },
    ],
  }),
  weekoffShuffleController.deletedatabyId,
);

router.post(
  '/v1/changeWeekOff',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SHIFTROSTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.REPORTEEWISESHIFTROSTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  weekoffShuffleController.changeWeekOff,
);

module.exports = router;
