const express = require('express');
const shiftController = require('../controllers/shift.controller');
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
        permissionName: fromPermissionName.SHIFT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  shiftController.postAddShift,
); // save data
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DAILYATTENDANCE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.TEAMDAILYATTENDANCE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.SHIFT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.ME,
        operation: formOperation.SHOW_MENU,
      },
    ],
  }),
  shiftController.getShiftById,
); //get by id
router.post(
  '/v1/getbycompanyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SHIFT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  shiftController.getShiftByCompanyId,
); //get by company id
router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SHIFT,
        operation: formOperation.EDIT,
      },
    ],
  }),
  shiftController.postUpdateShift,
); //update bank data
router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SHIFT,
        operation: formOperation.DELETE,
      },
    ],
  }),
  shiftController.postDeleteShiftById,
); //delete by id
router.post(
  '/v1/statuschanges',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SHIFT,
        operation: formOperation.DELETE,
      },
    ],
  }),
  shiftController.poststatuschange,
); //status change
router.get(
  '/v1/getactiveshiftbycompanyid/:id',
  shiftController.getactiveshiftbycompanyid,
);
router.post('/v1/getUserListOfShift', shiftController.getUserListOfShift);

router.post('/v1/getShiftByWorkerType', shiftController.getShiftByWorkerType);

//-------------------------------------- add shift type --------------------------

router.post('/v1/addShiftType', shiftController.addShiftType);

module.exports = router;
