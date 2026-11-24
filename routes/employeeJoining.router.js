const express = require('express');
const employeeJoiningController = require('../controllers/employeeJoiningDetails.controller');
const router = express.Router();
const {
  uploadEmployeeJoiningUserface,
  uploadEmployeeJoiningDocuments,
} = require('../middleware/uploadFile');
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
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  uploadEmployeeJoiningDocuments,
  employeeJoiningController.AddEmpJoiningnpmDetails,
); // save data

router.get(
  '/v1/getbyuserid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BIOMETRIC,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.ASSIGNINCREMENT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ASSIGNSALARYSTRUCTURE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ME,
        operation: formOperation.SHOW_MENU,
      },
      {
        permissionName: fromPermissionName.RESIGNATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.SALARYSLIP,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeJoiningController.getEmployeeJoiningDetByuserId,
); //get by user id

router.post(
  '/v1/employeeIdCard',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.IDCARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeJoiningController.employeeIdCard,
);

router.post(
  '/v1/updateUserFaces',
  uploadEmployeeJoiningUserface,
  employeeJoiningController.updateUserFaces,
);

router.post('/v1/removeUserFaces', employeeJoiningController.removeUserFaces);

router.post('/v1/checkUserFaces', employeeJoiningController.checkUserFaces);

router.post(
  '/v1/getAssignedBiometricUserList',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeJoiningController.getAssignedBiometricUserList,
);

router.post(
  '/v1/addUpdatePetrolAllowance',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  employeeJoiningController.addUpdatePetrolAllowance,
);

// ----------------------------- add workerType in all data ----------------------------

router.post('/v1/updateWorkerType', employeeJoiningController.updateWorkerType);
router.post(
  '/v1/updateWorkerTypeInHistory',
  employeeJoiningController.updateWorkerTypeInHistory,
);

// -----------------------------------------------------------------------------------------------------

router.post(
  '/v1/checkDuplicateFields',
  employeeJoiningController.checkDuplicateFields,
);
// ----------------------------------------Don't call this Api --------------------------------

router.post('/v1/addNameAsOnBank', employeeJoiningController.addNameAsOnBank);

module.exports = router;
