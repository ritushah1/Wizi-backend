const express = require('express');
const penaltyController = require('../controllers/penalty.controller');
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
        permissionName: fromPermissionName.PENALTY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  penaltyController.postAddPenalty,
);
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNPENALTYEMP,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.PENALTY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  penaltyController.getPenaltyById,
); //get by id
router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PENALTY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  penaltyController.postUpdatePenalty,
); //update penalty data
router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PENALTY,
        operation: formOperation.DELETE,
      },
    ],
  }),
  penaltyController.postDeletePenaltyById,
); //delete by id
router.post(
  '/v1/statuschanges',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PENALTY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  penaltyController.poststatuschange,
); //status by id
router.post(
  '/v1/getbycompanyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PENALTY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  penaltyController.getPenaltyByCompanyId,
); //get by company id
router.get(
  '/v1/getactivepenaltybycompanyid/:id',
  penaltyController.getactivepenaltybycompanyid,
); //get by company id

router.post(
  '/v1/addPenaltyToAllCompany',
  penaltyController.addPenaltyToAllCompany,
);
module.exports = router;
