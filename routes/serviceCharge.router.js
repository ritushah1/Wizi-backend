const express = require('express');
const serviceChargeController = require('../controllers/serviceCharge.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

const router = express.Router();

router.post(
  '/v1/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CONTRACTORSERVICECHARGE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  serviceChargeController.addData,
);
router.put(
  '/v1/update/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CONTRACTORSERVICECHARGE,
        operation: formOperation.EDIT,
      },
    ],
  }),
  serviceChargeController.updateData,
);
router.delete(
  '/v1/delete/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CONTRACTORSERVICECHARGE,
        operation: formOperation.DELETE,
      },
    ],
  }),
  serviceChargeController.deleteData,
);
router.get(
  '/v1/getById/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CONTRACTORSERVICECHARGE,
        operation: formOperation.EDIT,
      },
    ],
  }),
  serviceChargeController.getByIdData,
);
router.post(
  '/v1/list',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CONTRACTORSERVICECHARGE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  serviceChargeController.listData,
);

module.exports = router;
