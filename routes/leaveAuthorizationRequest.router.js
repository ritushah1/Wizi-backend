const express = require('express');
const authorizationRequestController = require('../controllers/leaveAuthorization.controller');
const { permissionAccess } = require('../middleware/permissionAccess');
const { checkRolePermission } = require('../middleware/checkRolePermission');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v2/listLeaveAuthRequestNew',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LEAVEAUTHREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  authorizationRequestController.listLeaveAuthRequestNew,
); // not used in web

//------------------------out door duty ---------------------

router.post(
  '/v1/listOutdoorDutyAuthRequest',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OUTDOORDUTYAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  authorizationRequestController.listOutdoorDutyAuthRequest,
); // show data

router.post(
  '/v1/acceptRejectOutdoorDuty',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OUTDOORDUTYAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  authorizationRequestController.acceptRejectOutdoorDuty,
); // Acccept Reject data

router.post(
  '/v1/outdoorDutyCancellation',
  checkRolePermission,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OUTDOORDUTYCANCELLATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  authorizationRequestController.outdoorDutyCancellationList,
);

router.post(
  '/v1/cancelOutdoorDuty',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OUTDOORDUTYCANCELLATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  authorizationRequestController.cancelOutdoorDuty,
);

// ----------------------------------------

router.post(
  '/v1/authorizationacceptreject',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LEAVEAUTHREQUEST,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.WORKFROMHOMEAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  authorizationRequestController.authorizationacceptreject,
); // Acccept Reject data

router.get(
  '/v1/getAuthorizationRequestByReferanceId/:id',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADMINLEAVEAUTHORIZATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.LEAVEAUTHREQUEST,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.WORKFROMHOMEAUTHORIZATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ADMINOUTDOORDUTYAUTHORIZATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.LEAVEAPPLICATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.MYOUTDOORDUTY,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.OUTDOORDUTYAUTHORIZATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  authorizationRequestController.getAuthorizationRequestByReferanceId,
);

router.get(
  '/v1/leavedetails/:id',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LEAVEAUTHREQUEST,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.WORKFROMHOMEAUTHORIZATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ADMINLEAVEAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  authorizationRequestController.leavedetails,
);

router.get(
  '/v1/leaveAuthCriteria/:id',
  permissionAccess,
  authorizationRequestController.leaveAuthCriteria,
); //not used in web and used in mobile

router.post(
  '/v1/leavecancellist',
  checkRolePermission,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LEAVECANCELLATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  authorizationRequestController.leavecancellist,
);
router.post(
  '/v1/leavecancel',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LEAVECANCELLATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  authorizationRequestController.leavecancel,
);

router.post(
  '/v1/updateViewStatus',
  permissionAccess,
  authorizationRequestController.updateViewStatus,
);

router.post(
  '/v1/countpending',
  authorizationRequestController.countPendingRequests,
);

router.get(
  '/v1/requestCountforHRdashboard',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  authorizationRequestController.requestCountforHRdashboard,
);

router.post(
  '/v1/leavedatashow',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  authorizationRequestController.leavedatashow,
);

router.get(
  '/v1/getAuthorizationRequestByAuthorizationRequestId/:id',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LEAVEAUTHREQUEST,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.WORKFROMHOMEAUTHORIZATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ADMINLEAVEAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  authorizationRequestController.getAuthorizationRequestByAuthorizationRequestId,
);
router.get(
  '/v1/getApprovedAuthorizationRequestByUserLeaveApplicationID/:id',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LEAVEAUTHREQUEST,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.WORKFROMHOMEAUTHORIZATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ADMINLEAVEAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  authorizationRequestController.getApprovedAuthorizationRequestByUserLeaveApplicationID,
);

router.post(
  '/v1/getAdminOutdoorDutyAuthorizationRequest',
  checkRolePermission,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ADMINOUTDOORDUTYAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  authorizationRequestController.getAdminOutdoorDutyAuthorizationRequest,
);

router.post(
  '/v1/acceptRejectOutdoorDutyAdmin',
  checkRolePermission,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADMINOUTDOORDUTYAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  authorizationRequestController.acceptRejectOutdoorDutyAdmin,
);

router.post(
  '/v1/adminLeaveAuthorizationRequest',
  checkRolePermission,
  permissionAccess,
  authorizationRequestController.adminLeaveAuthorizationRequest,
);

router.post(
  '/v1/acceptRejectLeaveAdmin',
  checkRolePermission,
  permissionAccess,
  authorizationRequestController.acceptRejectLeaveAdmin,
);

module.exports = router;
