const express = require('express');
const reportToController = require('../controllers/reportTo.controller');
const {
  permissionAccess,
  teamPermissionAccess,
} = require('../middleware/permissionAccess');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.get('/v1/reportsto/:id', reportToController.reportsto);

router.get(
  '/v1/reportstowithoutchild/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TEAMVISIT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  permissionAccess,
  reportToController.reportstowithoutchild,
);

router.post(
  '/v1/reportstowithoutchildvisit',
  permissionAccess,
  reportToController.reportstowithoutchildvisit,
);

router.get(
  '/v1/reportstostructure/:id',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.STRUCTURE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  reportToController.reportstoforstructure,
);

router.post(
  '/v1/reportstowithoutchilddatewise',
  permissionAccess,
  reportToController.reportstowithoutchilddatewise,
);

router.get(
  '/v1/reportstoImmediateChild',
  reportToController.reportstoImmediateChild,
);

router.get(
  '/v1/reportstoImmediateParent',
  reportToController.reportstoImmediateParent,
);

router.get(
  '/v1/reportsToForOrgStructure/:companyMasterId',
  reportToController.reportsToForOrgStructure,
);

//V2 routes
router.get('/v2/reportsto/:id', reportToController.reportstoV2);
router.get(
  '/v2/reportstostructure/:id',
  permissionAccess,
  reportToController.reportstoforstructureV2,
);

router.get(
  '/v2/reportstowithoutchild',
  // checkRoleOperationPermission({
  //   requiredPermissionList: [
  //     {
  //       permissionName: fromPermissionName.TEAMOUTSIDEATTENDANCEPERMISSION,
  //       operation: formOperation.VIEW,
  //     },
  //     {
  //       permissionName: fromPermissionName.TEAMOUTSIDEATTENDANCEPERMISSION,
  //       operation: formOperation.CREATE,
  //     },
  //     {
  //       permissionName: fromPermissionName.TEAMOUTSIDEATTENDANCEPERMISSION,
  //       operation: formOperation.EDIT,
  //     },
  //     {
  //       permissionName: fromPermissionName.TEAMADVANCEREQUEST,
  //       operation: formOperation.VIEW,
  //     },
  //     {
  //       permissionName: fromPermissionName.TEAMADVANCEREQUEST,
  //       operation: formOperation.CREATE,
  //     },
  //     {
  //       permissionName: fromPermissionName.TEAMADVANCEREQUEST,
  //       operation: formOperation.EDIT,
  //     },
  //     {
  //       permissionName: fromPermissionName.TEAMDAILYREPORTING,
  //       operation: formOperation.VIEW,
  //     },
  //     {
  //       permissionName: fromPermissionName.TEAMVISIT,
  //       operation: formOperation.VIEW,
  //     },
  //     {
  //       permissionName: fromPermissionName.TEAMVISIT,
  //       operation: formOperation.CREATE,
  //     },
  //     {
  //       permissionName: fromPermissionName.TEAMVISIT,
  //       operation: formOperation.EDIT,
  //     },
  //     {
  //       permissionName: fromPermissionName.TEAMVEHICLEMETERDETAILS,
  //       operation: formOperation.VIEW,
  //     },
  //     {
  //       permissionName: fromPermissionName.TEAMVISITDASHBOARD,
  //       operation: formOperation.VIEW,
  //     },
  //     {
  //       permissionName: fromPermissionName.TEAMOVERTIMEPLANNING,
  //       operation: formOperation.VIEW,
  //     },
  //     {
  //       permissionName: fromPermissionName.TEAMOVERTIMEPLANNING,
  //       operation: formOperation.CREATE,
  //     },
  //     {
  //       permissionName: fromPermissionName.TEAMOVERTIMEPLANNING,
  //       operation: formOperation.EDIT,
  //     },
  //   ],
  // }),
  permissionAccess,
  reportToController.reportstowithoutchildV2,
);

router.post(
  '/v2/reportstowithoutchildvisit',
  permissionAccess,
  reportToController.reportstowithoutchildvisitV2,
);

router.post(
  '/v1/getTeamMembersExcludingSelf',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MANAGETEAMLEAVEBALANCE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.TEAMDAILYATTENDANCE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  teamPermissionAccess,
  reportToController.getTeamMembersExcludingSelf,
);

module.exports = router;
