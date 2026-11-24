const express = require('express');
const departmentController = require('../controllers/department.controller');
const router = express.Router();
const { verifyToken, verifyOtpToken } = require('../middleware/tokenverify');
const { validateSchema } = require('../middleware/validateSchema');
const {
  addDepartmentDesignationV2Schema,
} = require('../validators/departmentValidation');
const { uploadImportExcelFile } = require('../middleware/uploadFile');

router.post(
  '/v2/addDepartmentDesignation',
  verifyOtpToken,
  validateSchema(addDepartmentDesignationV2Schema, 'body'),
  departmentController.postAddDepartmentDesignationV2,
); // save data of department and designation
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/add',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DEPARTMENT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  departmentController.postAddDepartment,
); // save data
router.get(
  '/v1/getbyid/:id',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DEPARTMENT,
        operation: formOperation.EDIT,
      },
    ],
  }),
  departmentController.getDepartmentId,
); //get by id
router.post(
  '/v1/updatebyid',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DEPARTMENT,
        operation: formOperation.EDIT,
      },
    ],
  }),
  departmentController.postUpdateDepartment,
); //update companytype tax data
router.post(
  '/v1/deletebyid',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DEPARTMENT,
        operation: formOperation.DELETE,
      },
    ],
  }),
  departmentController.postDeleteDepartmentById,
); //delete by id
router.post(
  '/v1/statuschanges',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DEPARTMENT,
        operation: formOperation.EDIT,
      },
    ],
  }),
  departmentController.poststatuschange,
); //status by id
router.post(
  '/v1/getDepartmentcompanyid',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DEPARTMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  departmentController.getDepartmentcompanyid,
); //get by id
router.get(
  '/v1/getDepartmentByCompanyId/:id',
  verifyToken,
  departmentController.getDepartmentByCompanyId,
); //get by id
router.post(
  '/v1/validateExcel',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DEPARTMENT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  departmentController.validateUploadExcel,
);

router.post(
  '/v1/reValidateDepartment',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DEPARTMENT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  departmentController.revalidateDepartment,
);
router.post(
  '/v1/addValidateDepartment',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DEPARTMENT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  departmentController.addValidateDepartment,
);

module.exports = router;
