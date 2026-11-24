const express = require('express');
const incentivetypecontroller = require('../controllers/incentivetype.controller');
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
  incentivetypecontroller.postAddincentivetype,
); // save data
router.post(
  '/v1/getalldatabycompanyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.INCENTIVE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  incentivetypecontroller.getAllincentivedatabycompanyid,
); //get all data
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
  incentivetypecontroller.postUpdateincentivetype,
); //update data
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
  incentivetypecontroller.poststatuschange,
); //status change active deavtive

router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.INCENTIVE,
        operation: formOperation.EDIT,
      },
    ],
  }),
  incentivetypecontroller.getbyIncentivetypeId,
); //delete by id
router.post(
  '/v1/destroy',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.INCENTIVE,
        operation: formOperation.DELETE,
      },
    ],
  }),
  incentivetypecontroller.postDeletebyIncentivetypeID,
); //update data

module.exports = router;
