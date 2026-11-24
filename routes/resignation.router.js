const express = require('express');
const UserResignation = require('../controllers/resignation.controller');
const { permissionAccess } = require('../middleware/permissionAccess');
const { uploadResignation } = require('../middleware/uploadFile');
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
        permissionName: fromPermissionName.RESIGNATION,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.ADDEMPLOYEERESIGNATION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadResignation,
  permissionAccess,
  UserResignation.postAddUserResignation,
);

router.put(
  '/v1/update/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.RESIGNATION,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.ADDEMPLOYEERESIGNATION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  uploadResignation,
  permissionAccess,
  UserResignation.updateUserResignation,
);
router.put(
  '/v1/updaterelievingdate/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.RESIGNATION,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.ADDEMPLOYEERESIGNATION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  uploadResignation,
  permissionAccess,
  UserResignation.updateRelievingDate,
);

router.post(
  '/v1/getAll',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.RESIGNATIONREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  UserResignation.getAllResignationbyAuth,
);
router.post(
  '/v1/rejectResignation',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.RESIGNATIONTASK,
        operation: formOperation.EDIT,
      },
    ],
  }),
  permissionAccess,
  UserResignation.postRejectResignation,
);
router.post(
  '/v1/acceptResignation',

  permissionAccess,
  UserResignation.postAcceptResignation,
);
router.get(
  '/v1/getResignationByUserId/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.RESIGNATION,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.ADDEMPLOYEERESIGNATION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  permissionAccess,
  UserResignation.getResignationByUserId,
);
router.get(
  '/v1/getauthdatabyid/:id',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADDEMPLOYEERESIGNATION,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.ADMINRESIGNATIONAUTHORIZATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.RESIGNATIONREQUEST,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.RESIGNATIONREQUEST,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.RESIGNATION,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  UserResignation.getAuthorizationRequestById,
);
router.post(
  '/v1/cancelResignation',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.RESIGNATION,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.ADDEMPLOYEERESIGNATION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  UserResignation.postCancelResignationById,
);

router.get(
  '/v1/getresignationtaskbyid/:id',
  permissionAccess,
  UserResignation.getResignationTaskById,
);

router.post(
  '/v1/resignationAuthorizeduser',
  permissionAccess,
  UserResignation.resignationAuthorizeduser,
);

router.post(
  '/resignationAuthorizationacceptreject',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.RESIGNATIONREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  permissionAccess,
  UserResignation.resignationAuthorizationacceptreject,
);

router.post(
  '/getAllAdminAuthorizationAcceptReject',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADMINRESIGNATIONAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  permissionAccess,
  UserResignation.getAllAdminAuthorizationAcceptReject,
);

router.post(
  '/approveRejectAdminAuthorization',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADMINRESIGNATIONAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  permissionAccess,
  UserResignation.approveRejectAdminAuthorization,
);

router.post(
  '/v1/downloadResignationClearancePdf',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  UserResignation.downloadResignationClearancePdf,
);
module.exports = router;
