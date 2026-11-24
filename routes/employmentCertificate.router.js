const express = require('express');
const EmploymentCertificate = require('../controllers/employmentCertificate.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/addEmploymentCertificate',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYMENTPROOFCERTIFICATE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  EmploymentCertificate.addEmploymentCertificate,
);
router.post(
  '/v1/listEmploymentCertificate',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNLETTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EMPLOYMENTPROOFCERTIFICATE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  EmploymentCertificate.listEmploymentCertificate,
);
router.post(
  '/v1/getEmploymentCertificateByID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYMENTPROOFCERTIFICATE,
        operation: formOperation.EDIT,
      },
    ],
  }),
  EmploymentCertificate.getEmploymentCertificateByID,
);
router.post(
  '/v1/updateEmploymentCertificate',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYMENTPROOFCERTIFICATE,
        operation: formOperation.EDIT,
      },
    ],
  }),
  EmploymentCertificate.updateEmploymentCertificate,
);

router.post(
  '/v1/deleteEmploymentCertificate',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYMENTPROOFCERTIFICATE,
        operation: formOperation.DELETE,
      },
    ],
  }),
  EmploymentCertificate.deleteEmploymentCertificate,
);
module.exports = router;
