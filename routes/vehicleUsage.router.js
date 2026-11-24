const express = require('express');
const vehicleUsageController = require('../controllers/vehicleUsage.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/addStartingVehicleUsage',
  vehicleUsageController.addStartingVehicleUsage,
);
router.post(
  '/v1/addEndingVehicleUsage',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TEAMVEHICLEMETERDETAILS,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ADMINVEHICLEMETERDETAILS,
        operation: formOperation.VIEW,
      },
    ],
  }),
  vehicleUsageController.addEndingVehicleUsage,
);
router.post(
  '/v1/getuserdailyvehicleusagereport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.USERPERMISSION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  vehicleUsageController.getUserDailyVehicleUsageReport,
);

router.post(
  '/v1/getVehicleUsageByCompanyId',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TEAMVEHICLEMETERDETAILS,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ADMINVEHICLEMETERDETAILS,
        operation: formOperation.VIEW,
      },
    ],
  }),
  vehicleUsageController.getVehicleUsageByCompanyId,
);

router.post(
  '/v1/myVehicleMeterDetails',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VEHICLEMETERDETAILS,
        operation: formOperation.VIEW,
      },
    ],
  }),
  vehicleUsageController.getMyVehicleMeterUsage,
);

module.exports = router;
