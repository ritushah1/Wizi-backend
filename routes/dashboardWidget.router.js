const express = require('express');
const router = express.Router();
const dashboardWidgetController = require('../controllers/dashboardWidget.controller');
const { checkRoleOperationPermission } = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/addDashboardWidget',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  dashboardWidgetController.addDashboardWidget,
);
router.post(
  '/v1/editDashboardWidget',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  dashboardWidgetController.editDashboardWidget,
);
router.post(
  '/v1/getDashboardWidget',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  dashboardWidgetController.getWidgetByCompanyID,
);
router.post(
  '/v1/getByDashboardWidgetID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  dashboardWidgetController.getByWidgetID,
);
router.post(
  '/v1/getWidgetXaxisData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  dashboardWidgetController.getWidgetByXAxis,
);
router.post(
  '/v1/getLabelListing',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  dashboardWidgetController.getWidgetLabelData,
);
router.post(
  '/v1/deleteDashboarWidget',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  dashboardWidgetController.deleteWidget,
);

module.exports = router;
