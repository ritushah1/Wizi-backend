const express = require('express');
const policyDocuments = require('../controllers/policyDocument.controller');
const { verifyChildParent } = require('../middleware/verifyChildParent');
const { roles, formOperation } = require('../utils/commonVars');
const { uploadPolicyDocument } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');

const router = express.Router();
router.get(
  '/v1',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ORGANIZATIONPOLICYDOCUMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  verifyChildParent,
  policyDocuments.listPolicyDocument,
);
router.get(
  '/v1/:id',
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ORGANIZATIONPOLICYDOCUMENT,
        operation: formOperation.EDIT,
      },
    ],
  }),
  policyDocuments.getPolicyDocumentDetails,
);
router.post(
  '/v1',
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ORGANIZATIONPOLICYDOCUMENT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadPolicyDocument,
  policyDocuments.createPolicyDocument,
);
router.put(
  '/v1/:id',
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ORGANIZATIONPOLICYDOCUMENT,
        operation: formOperation.EDIT,
      },
    ],
  }),
  uploadPolicyDocument,
  policyDocuments.updatePolicyDocument,
);
router.delete(
  '/v1/:id',
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ORGANIZATIONPOLICYDOCUMENT,
        operation: formOperation.DELETE,
      },
    ],
  }),
  policyDocuments.deletePolicyDocument,
);
router.post(
  '/v1/getBranchDepartmentDesignationWiseDocuments',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ORGANIZATIONPOLICYDOCUMENTLIST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  policyDocuments.getBranchDepartmentDesignationWiseDocuments,
);

router.post(
  '/v1/getOrgDocumentAcceptanceByPolicyDocumentID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ORGANIZATIONPOLICYDOCUMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  policyDocuments.getOrgDocumentAcceptanceByPolicyDocumentID,
);

module.exports = router;
