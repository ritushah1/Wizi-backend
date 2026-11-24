const express = require('express');
const employeeincentivecontroller = require('../controllers/employeeincentive.controller');
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
        permissionName: fromPermissionName.INCENTIVE,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEINCENTIVE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  employeeincentivecontroller.postAddemployeeincentivetype,
); // save data
router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.INCENTIVE,
        operation: formOperation.EDIT,
      },
    ],
  }),
  employeeincentivecontroller.postUpdateemployeeincentive,
); //update data
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEINCENTIVE,
        operation: formOperation.EDIT,
      },
    ],
  }),
  employeeincentivecontroller.getbyemployeeincentiveID,
); //delete by id
router.post(
  '/v1/getbyname',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEINCENTIVE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeincentivecontroller.getbyname,
); //delete by id
router.post(
  '/v1/getIncentiveTypeWithOutAttnBonus',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEINCENTIVE,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEINCENTIVE,
        operation: formOperation.EDIT,
      },
    ],
  }),
  employeeincentivecontroller.getIncentiveTypeWithOutAttnBonus,
);
router.post(
  '/v1/statuschanges',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.INCENTIVE,
        operation: formOperation.EDIT,
      },
    ],
  }),
  employeeincentivecontroller.deleteemployeeincentiveData,
); //soft delete

router.post(
  '/v1/getalldata',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEINCENTIVE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeincentivecontroller.getAllincentiveData,
); //get all data

router.get(
  '/v1/getMyIncentive',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYINCENTIVE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeincentivecontroller.getMyIncentive,
);

module.exports = router;
