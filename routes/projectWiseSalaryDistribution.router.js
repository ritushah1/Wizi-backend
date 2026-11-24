const express = require('express');
const ProjectWiseSalaryDistributionController = require('../controllers/projectWiseSalaryDistribution.controller');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const { checkRoleOperationPermission } = require('../middleware/checkRoleOperationPermission');

const router = express.Router();

router.post(
  '/v1/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PROJECTWISESALARYDISTRIBUTION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  ProjectWiseSalaryDistributionController.add,
); // add project wise salary distribution
router.delete(
  '/v1/deleteById/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PROJECTWISESALARYDISTRIBUTION,
        operation: formOperation.DELETE,
      },
    ],
  }),
  ProjectWiseSalaryDistributionController.delete,
); // delete
router.post(
  '/v1/list',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PROJECTWISESALARYDISTRIBUTION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  ProjectWiseSalaryDistributionController.list,
); // list
router.post(
  '/v1/getCurrentProjectByUserId',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PROJECTWISESALARYDISTRIBUTION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  ProjectWiseSalaryDistributionController.getCurrentProjectByUserId,
); // projects

module.exports = router;
