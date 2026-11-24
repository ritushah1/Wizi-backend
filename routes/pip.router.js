const express = require('express');
const pipController = require('../controllers/pip.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/createPIP',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PERFORMANCEIMPROVEMENTPLAN,
        operation: formOperation.CREATE,
      },
    ],
  }),
  pipController.createPIP,
);
router.post(
  '/v1/updatePIP',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PERFORMANCEIMPROVEMENTPLAN,
        operation: formOperation.EDIT,
      },
    ],
  }),
  pipController.updatePIP,
);
router.post('/v1/getPIPList', pipController.getPIPList);
router.get(
  '/v1/getPIPByID/:pipID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PERFORMANCEIMPROVEMENTPLAN,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.PERFORMANCEIMPROVEMENTPLANREVIEWER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.PERFORMANCEIMPROVEMENTPLANREQUEST,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.PERFORMANCEIMPROVEMENTPLANREVIEWER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  pipController.getPIPByID,
);
router.get(
  '/v1/deletePIP/:pipID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PERFORMANCEIMPROVEMENTPLAN,
        operation: formOperation.DELETE,
      },
    ],
  }),
  pipController.deletePIP,
);

module.exports = router;
