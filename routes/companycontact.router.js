const express = require('express');
const companyContactController = require('../controllers/companyContact.controller');
const router = express.Router();
const { permissionAccess } = require('../middleware/permissionAccess');
const { verifyToken, verifyOtpToken } = require('../middleware/tokenverify');
const { validateSchema } = require('../middleware/validateSchema');
const {
  addCompanyContactV2Schema,
} = require('../validators/companyContactValidation');
const { checkRolePermission } = require('../middleware/checkRolePermission');
const {
  uploadUserProfilePhoto,
  uploadTankhwaFace,
  uploadImportExcelFile,
  uploadUserCreateDocumentFiles,
} = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
router.post(
  '/v2/add',
  verifyOtpToken,
  validateSchema(addCompanyContactV2Schema, 'body'),
  companyContactController.postAddCompanyContactV2,
);

router.post(
  '/v1/add',
  verifyToken,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.HRPREBOARDINGREQUEST,
        operation: formOperation.EDIT,
      },
    ],
  }),
  uploadUserCreateDocumentFiles,
  companyContactController.postAddCompanyContact,
); // save data

router.get(
  '/v1/getbyid/:id',
  verifyToken,
  permissionAccess,
  companyContactController.getCompanyContactId,
); //get by id
router.post(
  '/v1/updatebyid',
  verifyToken,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
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
  uploadUserProfilePhoto,
  companyContactController.postUpdateCompanyContact,
);
router.post(
  '/v1/deletebyid',
  verifyToken,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.DELETE,
      },
    ],
  }),
  companyContactController.postDeleteCompanyContactById,
); //update by id
router.post(
  '/v1/statuschanges',
  verifyToken,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  companyContactController.poststatuschange,
); //status by id
router.post(
  '/v1/checkuser',
  verifyToken,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.HRPREBOARDINGREQUEST,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.HRPREBOARDINGREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  companyContactController.postCheckUser,
); //get all rights

router.post(
  '/v1/employeepolicy',
  verifyToken,
  checkRolePermission,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEPOLICY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  companyContactController.employeepolicy,
);
router.get(
  '/v1/dashboardempstatus/:id',
  verifyToken,
  checkRolePermission,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  companyContactController.dashboardeEmpstatus,
);

router.post(
  '/v1/userFaceData',
  verifyToken,
  permissionAccess,
  uploadTankhwaFace,
  companyContactController.postAddUserFaceData,
);
router.post(
  '/v1/uploaduserExcel',
  verifyToken,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  uploadImportExcelFile,
  companyContactController.uploaduserExcel,
); // upload all employeedata with salary
router.post(
  '/v1/exportuserExcel',
  verifyToken,
  checkRolePermission,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  uploadImportExcelFile,
  companyContactController.exportuserExcel,
);

router.post(
  '/v1/exportUsersAllData',
  verifyToken,
  checkRolePermission,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  permissionAccess,
  companyContactController.exportUsersAllData,
);

router.post(
  '/v1/getUserbyBranchDepartmentDesgination',
  verifyToken,
  permissionAccess,
  companyContactController.getUserbyBranchDepartmentDesgination, // tp mirror
);
router.post(
  '/v1/getAllUsers',
  verifyToken,
  checkRolePermission,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DAILYATTENDANCE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.DELETE,
      },
      {
        permissionName: fromPermissionName.MANAGETEAMLEAVEBALANCE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.MANAGETEAMLEAVEBALANCE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.USERTRANSFERLETTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.AUTOMAILSETUP,
        operation: formOperation.VIEW,
      },
    ],
  }),
  companyContactController.getAllUsers,
);

router.post(
  '/v1/lockstatus',
  verifyToken,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  companyContactController.postUpdatePhotoLockStatus,
);

router.post(
  '/v1/getalldiler',
  verifyToken,
  permissionAccess,
  companyContactController.getalldiler,
);
router.post(
  '/v1/getProfilePercentage',
  verifyToken,
  checkRolePermission,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  companyContactController.getProfilePercentage,
);

router.post(
  '/v1/removeProfilePhoto',
  verifyToken,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  companyContactController.removeProfilePhoto,
);

router.post(
  '/v1/getEmployeeSatus',
  verifyToken,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  companyContactController.getEmployeeSatus,
);

router.post(
  '/v1/bulkDownloadProfilePics',
  verifyToken,
  checkRolePermission,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  companyContactController.bulkDownloadProfilePics,
);

router.get(
  '/v1/getUserById/:id',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.STRUCTURE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  companyContactController.getUserById,
);
router.post(
  '/v1/checkExistUserNumber',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  companyContactController.checkExistUserNumber,
);
router.post(
  '/v1/postAdminSideUserStatusChange',
  verifyToken,
  companyContactController.postAdminSideUserStatusChange,
);
router.post(
  '/v1/getAllUsersForDropdown',
  verifyToken,
  checkRolePermission,
  permissionAccess,
  companyContactController.getAllUsersForDropdown,
);

router.post(
  '/v1/checkExistAdharNumber',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  companyContactController.checkExistAdharNumber,
);
module.exports = router;
