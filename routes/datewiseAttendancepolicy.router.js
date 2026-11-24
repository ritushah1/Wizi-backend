const express = require('express');
const datewiseAttendancepolicycontroller = require('../controllers/datewiseAttendancepolicy.controller');
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
        permissionName: fromPermissionName.OUTSIDEATTENDANCEPERMISSION,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.TEAMOUTSIDEATTENDANCEPERMISSION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  datewiseAttendancepolicycontroller.postadddatewisepolicy,
); // save data

router.get(
  '/v1/getid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OUTSIDEATTENDANCEPERMISSION,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.TEAMOUTSIDEATTENDANCEPERMISSION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  datewiseAttendancepolicycontroller.getById,
); //get by user id primary key

router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OUTSIDEATTENDANCEPERMISSION,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.TEAMOUTSIDEATTENDANCEPERMISSION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  datewiseAttendancepolicycontroller.datewiseupdateData,
); // update data
router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OUTSIDEATTENDANCEPERMISSION,
        operation: formOperation.DELETE,
      },
      {
        permissionName: fromPermissionName.TEAMOUTSIDEATTENDANCEPERMISSION,
        operation: formOperation.DELETE,
      },
    ],
  }),
  datewiseAttendancepolicycontroller.postDelete,
); // delete by id

router.post(
  '/v1/getalldatabyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OUTSIDEATTENDANCEPERMISSION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.TEAMOUTSIDEATTENDANCEPERMISSION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  datewiseAttendancepolicycontroller.getalldatabyid,
);

router.post(
  '/v2/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OUTSIDEATTENDANCEPERMISSION,
        operation: formOperation.DELETE,
      },
      {
        permissionName: fromPermissionName.TEAMOUTSIDEATTENDANCEPERMISSION,
        operation: formOperation.DELETE,
      },
    ],
  }),
  datewiseAttendancepolicycontroller.postDeleteV2,
); // delete by id

module.exports = router;
