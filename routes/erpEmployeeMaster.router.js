const express = require('express');
const ErpEmployeeMasterController = require('../controllers/erpEmployeeMaster.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/geterpEmployeeMasterByCompanyID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ERPEMPLOYEEMASTERSYNC,
        operation: formOperation.VIEW,
      },
    ],
  }),
  ErpEmployeeMasterController.geterpEmployeeMasterByCompanyID,
);

router.post(
  '/v1/linkERPEmployeeMasterAccount',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ERPEMPLOYEEMASTERSYNC,
        operation: formOperation.CREATE,
      },
    ],
  }),
  ErpEmployeeMasterController.linkERPEmployeeMasterAccount,
);
router.post(
  '/v1/updateLinkedERPEmployeeMasterAccount',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ERPEMPLOYEEMASTERSYNC,
        operation: formOperation.CREATE,
      },
    ],
  }),
  ErpEmployeeMasterController.updateLinkedERPEmployeeMasterAccount,
);
router.post(
  '/v1/getUserWithNotLinkedErpEmployeeMasterAccount',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ERPEMPLOYEEMASTERSYNC,
        operation: formOperation.VIEW,
      },
    ],
  }),
  ErpEmployeeMasterController.getUserWithNotLinkedErpEmployeeMasterAccount,
);
router.post(
  '/v1/geterpEmployeeMasteraccount',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ERPEMPLOYEEMASTERSYNC,
        operation: formOperation.CREATE,
      },
    ],
  }),
  ErpEmployeeMasterController.geterpEmployeeMasteraccount,
);

router.post(
  '/v1/updateERPEmployeeMasterAccount',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ERPEMPLOYEEMASTERSYNC,
        operation: formOperation.CREATE,
      },
    ],
  }),
  ErpEmployeeMasterController.updateERPEmployeeMasterAccount,
); // save data

module.exports = router;
