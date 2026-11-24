const express = require('express');
const employeeTaxRegimeController = require('../controllers/employeeTaxRegime.controller');
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
        permissionName: fromPermissionName.MYINCOMETAXREGIME,
        operation: formOperation.CREATE,
      },
    ],
  }),
  employeeTaxRegimeController.postAddData,
);
router.put(
  '/v1/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEINCOMETAXREGIME,
        operation: formOperation.EDIT,
      },
    ],
  }),
  employeeTaxRegimeController.updatedata,
);
router.get('/v1/getbyid/:id', checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEINCOMETAXREGIME,
        operation: formOperation.EDIT,
      },
    ],
  }), employeeTaxRegimeController.getById);
router.delete(
  '/v1/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEINCOMETAXREGIME,
        operation: formOperation.DELETE,
      },
    ],
  }),
  employeeTaxRegimeController.deleteById,
);
router.post(
  '/v1/getlist',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEINCOMETAXREGIME,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeTaxRegimeController.getlistdata,
);
router.get(
  '/v1/getnonRegimeUserlist',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEINCOMETAXREGIME,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeTaxRegimeController.getnonRegimeUserlist,
);
router.get(
  '/v1/getByUserId',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYINCOMETAXREGIME,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeTaxRegimeController.getByUserId,
);

module.exports = router;
