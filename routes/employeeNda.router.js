const express = require('express');
const employeeNdacontroller = require('../controllers/employeeNda.controller');
const router = express.Router();
const { uploadCompanyNDA } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const { generateMulterThumbnails } = require('../middleware/uploadThumbnails');

router.post(
  '/v1/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.NDA,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadCompanyNDA,
  generateMulterThumbnails,
  employeeNdacontroller.postAddemployee,
); //save the data
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.NDA,
        operation: formOperation.EDIT,
      },
    ],
  }),
  employeeNdacontroller.getemployeeById,
); //get data by id
router.post(
  '/v1/update',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.NDA,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  uploadCompanyNDA,
  generateMulterThumbnails,
  employeeNdacontroller.updateemployeeData,
); //update the data by id
router.get(
  '/v1/delete/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.NDA,
        operation: formOperation.DELETE,
      },
    ],
  }),
  employeeNdacontroller.deleteemployee,
); //delete data
router.post(
  '/v1/bycompanyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.NDA,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeNdacontroller.getbyCompanyId,
); //get by company id

module.exports = router;
