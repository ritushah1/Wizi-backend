const express = require('express');
const overTimeCalculationController = require('../controllers/overTimeCalculation.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();
router.post(
  '/v1/calculateOvertime',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OVERTIMECALCULATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  overTimeCalculationController.calculateOvertime,
);

router.post(
  '/v1/editOvertimeCalculation',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OVERTIMECALCULATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  overTimeCalculationController.editOvertimeCal,
);

router.post(
  '/v1/getdataovertime',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OVERTIMECALCULATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  overTimeCalculationController.getdataovertime,
);

router.post(
  '/v1/getPendingOvertimedata',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OVERTIMECALCULATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  overTimeCalculationController.getPendingOvertimedata,
);

router.post(
  '/v1/deleteovertimecal',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OVERTIMECALCULATION,
        operation: formOperation.DELETE,
      },
    ],
  }),
  overTimeCalculationController.deleteovertimecal,
);
router.post(
  '/v1/getovertimereport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OVERTIMEREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  overTimeCalculationController.getovertimereport,
);
router.post(
  '/v1/getOvertimeDataUserwise',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OVERTIMEREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  overTimeCalculationController.getOvertimeDataUserwise,
);

router.post(
  '/v1/consolidateReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CONSOLIDATEOVERTIMEREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  overTimeCalculationController.getConsolidateReport,
);

router.post(
  '/v1/getDailyOTReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DAILYOVERTIMEREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  overTimeCalculationController.getDailyOTReport,
);

module.exports = router;
