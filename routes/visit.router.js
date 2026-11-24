const express = require('express');
const visitController = require('../controllers/visit.controller');
const { permissionAccess } = require('../middleware/permissionAccess');
const { checkRolePermission } = require('../middleware/checkRolePermission');
const { uploadVisit } = require('../middleware/uploadFile');
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
        permissionName: fromPermissionName.TEAMVISIT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.VISIT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  visitController.postAddVisit,
); // save data
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEREQUEST,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.TEAMVISIT,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.VISIT,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.VISITAUTHORIZATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EXPENSEREQUEST,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.EXPENSE,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.EXPENSE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EXPENSEREQUEST,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEEXPENSEREIMBURSEMENT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.TEAMVISIT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.VISIT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  visitController.getVisitById,
); //get by id
router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TEAMVISIT,
        operation: formOperation.EDIT,
      },
    ],
  }),
  visitController.postUpdateVisit,
); //update visit data
router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TEAMVISIT,
        operation: formOperation.DELETE,
      },
      {
        permissionName: fromPermissionName.VISIT,
        operation: formOperation.DELETE,
      },
    ],
  }),
  visitController.postDeleteVisitById,
); //delete by id
router.post(
  '/v1/statuschanges',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TEAMVISIT,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.VISIT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  visitController.poststatuschange,
); //status change
router.post(
  '/v1/getbycompanyid',
  checkRolePermission,
  permissionAccess,
  visitController.getVisitByCompanyId,
); //status change
router.get(
  '/v1/getApprovedVisitByAssignID/:id',
  visitController.getApprovedVisitByAssignID,
); //get by id
router.post(
  '/v1/getVisitByUserID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEEXPENSEREIMBURSEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  checkRolePermission,
  permissionAccess,
  visitController.getVisitByUserID,
); //get by id

router.post(
  '/v1/Team_Visit',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TEAMVISIT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  visitController.TeamVisit,
);

router.post(
  '/v1/visitCheckInCheckOut_web',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TEAMVISIT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.VISIT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  uploadVisit,
  visitController.visitCheckInCheckOut_web,
);

router.post(
  '/v1/visitCheckInCheckOut_mobile',
  uploadVisit,
  visitController.visitCheckInCheckOut_mobile,
);

router.post(
  '/v2/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TEAMVISIT,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.VISIT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  visitController.addVisitV2,
);

router.post(
  '/v2/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISIT,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.TEAMVISIT,
        operation: formOperation.EDIT,
      },
    ],
  }),
  visitController.updateVisitV2,
);
router.post('/v1/getVisitCountUserWise', visitController.getVisitCountUserWise);
router.get(
  '/v1/getUpcomingVisitCountUserWise',
  visitController.getUpcomingVisitCountUserWise,
);

router.post(
  '/v1/getUpcomingVisitByUserID',
  checkRolePermission,
  permissionAccess,
  visitController.getUpcomingVisitByUserID,
);

module.exports = router;
