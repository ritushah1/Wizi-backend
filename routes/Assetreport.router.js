const express = require('express');
const AssetReportController = require('../controllers/Assetreport.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/getdata',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSETREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  AssetReportController.getAssetData,
); //get the data

module.exports = router;
