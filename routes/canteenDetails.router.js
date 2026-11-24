const express = require('express');
const canteenDetailsController = require('../controllers/canteenDetails.controller');
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
        permissionName: fromPermissionName.CANTEENDETAILS,
        operation: formOperation.CREATE,
      },
    ],
  }),
  canteenDetailsController.add,
); // save data
router.put(
  '/v1/update/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CANTEENDETAILS,
        operation: formOperation.EDIT,
      },
    ],
  }),
  canteenDetailsController.update,
); // update data
router.get(
  '/v1/getById/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CANTEENDETAILS,
        operation: formOperation.EDIT,
      },
    ],
  }),
  canteenDetailsController.getById,
); // get data by id
router.post(
  '/v1/list',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CANTEENDETAILS,
        operation: formOperation.VIEW,
      },
    ],
  }),
  canteenDetailsController.list,
);

router.delete(
  '/v1/delete/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CANTEENDETAILS,
        operation: formOperation.DELETE,
      },
    ],
  }),
  canteenDetailsController.delete,
); // delete data

module.exports = router;
