const express = require('express');
const employeePenaltyController = require('../controllers/employeepenalty.controller');
const router = express.Router();
const { uploadEmployeePenalty } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNPENALTYEMP,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadEmployeePenalty,
  employeePenaltyController.postAddEmployeePenalty,
); // save data
router.post(
  '/v1/getalldata',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNPENALTYEMP,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeePenaltyController.getAllEmployeePenaltyData,
); //get all emplyee penalty data
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNPENALTYEMP,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeePenaltyController.getEmployeePenaltyById,
); //get by id

router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNPENALTYEMP,
        operation: formOperation.EDIT,
      },
    ],
  }),
  uploadEmployeePenalty,
  employeePenaltyController.postUpdateEmployeePenalty,
); //update emplyee penalty data
router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNPENALTYEMP,
        operation: formOperation.DELETE,
      },
    ],
  }),
  employeePenaltyController.postDeleteEmployeePenaltyById,
); //delete by id
router.post(
  '/v1/statuschanges',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNPENALTYEMP,
        operation: formOperation.EDIT,
      },
    ],
  }),
  employeePenaltyController.poststatuschange,
); //status change
router.post(
  '/v1/getbyuserid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEPENALTY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeePenaltyController.getPenaltyByUserID,
); // get by user id
module.exports = router;
