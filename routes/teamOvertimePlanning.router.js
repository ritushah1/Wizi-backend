const express = require('express');
const router = express.Router();
const TeamOvertimePlanningController = require('../controllers/teamOvertimePlanning.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/addTeamOvertimePlanning',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TEAMOVERTIMEPLANNING,
        operation: formOperation.CREATE,
      },
    ],
  }),
  TeamOvertimePlanningController.addTeamOvertimePlanning,
);

router.post(
  '/v1/listTeamOvertimePlanning',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TEAMOVERTIMEPLANNING,
        operation: formOperation.VIEW,
      },
    ],
  }),
  TeamOvertimePlanningController.listTeamOvertimePlanning,
);

router.post(
  '/v1/editTeamOvertimePlanning',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TEAMOVERTIMEPLANNING,
        operation: formOperation.EDIT,
      },
    ],
  }),
  TeamOvertimePlanningController.editTeamOvertimePlanningByID,
);

router.post(
  '/v1/getTeamOvertimePlanningById',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TEAMOVERTIMEPLANNING,
        operation: formOperation.EDIT,
      },
    ],
  }),
  TeamOvertimePlanningController.getTeamOvertimePlanningByID,
);

router.post(
  '/v1/deleteTeamOvertimePlanning',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TEAMOVERTIMEPLANNING,
        operation: formOperation.DELETE,
      },
    ],
  }),
  TeamOvertimePlanningController.deleteTeamOvertimePlanning,
);

module.exports = router;
