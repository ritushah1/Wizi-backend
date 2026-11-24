const express = require('express');
const router = express.Router();
const TeamOvertimePlanningDetailsController = require('../controllers/teamOvertimePlanningDetails.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/removeTeamOvertimePlanningDetails',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TEAMOVERTIMEPLANNING,
        operation: formOperation.EDIT,
      },
    ],
  }),
  TeamOvertimePlanningDetailsController.removeTeamOvertimePlanningDetails,
);

module.exports = router;
