const express = require('express');
const branchMasterController = require('../controllers/branchmaster.controller');
const router = express.Router();
const { verifyToken, verifyOtpToken } = require('../middleware/tokenverify');
const { permissionAccess } = require('../middleware/permissionAccess');
const { validateSchema } = require('../middleware/validateSchema');
const { addBranchV2Schema } = require('../validators/branchMasterValidation');
const { uploadImportExcelFile } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v2/add',
  verifyOtpToken,
  validateSchema(addBranchV2Schema, 'body'),
  branchMasterController.postAddBranchV2,
);

router.post(
  '/v1/add',
  verifyToken,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BRANCH,
        operation: formOperation.CREATE,
      },
    ],
  }),
  branchMasterController.postAddBranch,
); // save data

router.get(
  '/v1/getbyid/:id',
  verifyToken,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MANUALATTENDANCE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.MANUALATTENDANCE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ATTENDANCESHEETREPORT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.FORM1,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.FORM14,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.FORM29,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.IDCARDREGISTERY,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.FORMDATTEDANCEREGISTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.BRANCH,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.STRUCTURE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.LOANREPORTWITHEMI,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.WAGESSALARYREGISTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  branchMasterController.getBranchById,
); //get by id
router.get(
  '/v1/getbycompanyid/:id',
  verifyToken,
  permissionAccess,
  branchMasterController.getBranchByCompanyId,
); //get by company id
router.get(
  '/v1/getbycityid/:id',
  verifyToken,
  permissionAccess,
  branchMasterController.getBranchByCityId,
); //get by city id
router.post(
  '/v1/updatebyid',
  verifyToken,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BRANCH,
        operation: formOperation.EDIT,
      },
    ],
  }),
  branchMasterController.postUpdateBranch,
); //update branch data
router.post(
  '/v1/deletebyid',
  verifyToken,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BRANCH,
        operation: formOperation.DELETE,
      },
    ],
  }),
  branchMasterController.postDeleteBranchById,
); //delete by id
router.post(
  '/v1/statuschange',
  verifyToken,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BRANCH,
        operation: formOperation.EDIT,
      },
    ],
  }),
  branchMasterController.poststatuschange,
); //delete by id
router.post(
  '/v1/getAllBranchDataByCompanyId',
  verifyToken,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BRANCH,
        operation: formOperation.VIEW,
      },
    ],
  }),
  branchMasterController.getAllBranchDataByCompanyId,
); //delete by id
router.get(
  '/v1/getactivebranchbycompanyid/:id',
  verifyToken,
  permissionAccess,
  branchMasterController.getactivebranchbycompanyid,
);
router.post(
  '/v1/uploadexcel',
  verifyToken,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BRANCH,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.BRANCH,
        operation: formOperation.VIEW,
      },
    ],
  }),
  uploadImportExcelFile,
  branchMasterController.uploadexcel,
);

router.post(
  '/v1/validateExcel',
  verifyToken,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BRANCH,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  branchMasterController.validateUploadExcel,
);

router.post(
  '/v1/revalidateBranch',
  verifyToken,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BRANCH,
        operation: formOperation.CREATE,
      },
    ],
  }),
  branchMasterController.revalidateBranch,
);

router.post(
  '/v1/addValidateBranch',
  verifyToken,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BRANCH,
        operation: formOperation.CREATE,
      },
    ],
  }),
  branchMasterController.addValidateBranch,
);

router.post(
  '/v1/generateDemoExcel',
  verifyToken,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BRANCH,
        operation: formOperation.CREATE,
      },
    ],
  }),
  branchMasterController.generateDemoExcel,
);
router.get(
  '/v1/getactivebranchbycompanyWise/:id',
  verifyToken,
  permissionAccess,
  branchMasterController.getactivebranchbycompanyWise,
);
module.exports = router;
