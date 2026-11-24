const express = require('express');
const visitDashboardController = require('../controllers/visitDashboard.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/getVisitDashboardData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITDASHBOARD,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.TEAMVISITDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  visitDashboardController.getVisitDashboardData,
); // save data

module.exports = router;
