const express = require('express');
const router = express.Router();
const designationWiseDocumentController = require('../controllers/designationWiseDocument.controller');
const { verifyToken } = require('../middleware/tokenverify');
const { uploadImportExcelFile } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/addDesignationWiseDocument',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DESIGNATIONWISEDOCUMENT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  designationWiseDocumentController.addDesignationWiseDocument,
);

router.get(
  '/v1/listDesignationWiseDocument',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DESIGNATIONWISEDOCUMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  designationWiseDocumentController.listDesignationWiseDocument,
);

router.get(
  '/v1/getjoiningDocumentTypeByCompanyMasterID',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DESIGNATIONWISEDOCUMENT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  designationWiseDocumentController.getjoiningDocumentTypeByCompanyMasterID,
);
router.get(
  '/v1/getdesignationWiseDocumentByDesignationID',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DESIGNATIONWISEDOCUMENT,
        operation: formOperation.EDIT,
      },
    ],
  }),
  designationWiseDocumentController.getdesignationWiseDocumentByDesignationID,
);
router.post(
  '/v1/editDesignationWiseDocument',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DESIGNATIONWISEDOCUMENT,
        operation: formOperation.EDIT,
      },
    ],
  }),
  designationWiseDocumentController.editDesignationWiseDocument,
);

router.post(
  '/v1/deleteDesignationWiseDocument',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DESIGNATIONWISEDOCUMENT,
        operation: formOperation.DELETE,
      },
    ],
  }),
  designationWiseDocumentController.deleteDesignationWiseDocument,
);

router.get(
  '/v1/getDocumentByDesignationIDAndRequiredUserType',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.HRPREBOARDINGREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  designationWiseDocumentController.getDocumentByDesignationIDAndRequiredUserType,
);

router.get(
  '/v1/getDocumentByDesignationIDAndRequiredUserTypeOpen',
  designationWiseDocumentController.getDocumentByDesignationIDAndRequiredUserType,
);

router.post(
  '/v1/generateDemoExcel',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DESIGNATIONWISEDOCUMENT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  designationWiseDocumentController.generateDemoExcel,
);

router.post(
  '/v1/validateExcel',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DESIGNATIONWISEDOCUMENT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  designationWiseDocumentController.validateUploadExcel,
);

router.post(
  '/v1/revalidateDesignationWiseDocument',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DESIGNATIONWISEDOCUMENT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  designationWiseDocumentController.revalidateDesignationWiseDocument,
);

router.post(
  '/v1/addValidateDesignationWiseDocument',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DESIGNATIONWISEDOCUMENT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  designationWiseDocumentController.addValidateDesignationWiseDocument,
);
module.exports = router;
