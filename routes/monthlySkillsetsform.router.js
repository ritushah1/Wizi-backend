const express = require('express');
const router = express.Router();
const monthlySkillsetsformController = require('../controllers/monthlySkillsetsform.controller');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');

router.post(
  '/v1/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GENERATEMONTHLYSKILLSETSFORM,
        operation: formOperation.CREATE,
      },
    ],
  }),
  monthlySkillsetsformController.addmonthlySkillsetsform,
);
router.post(
  '/v1/getall',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GENERATEMONTHLYSKILLSETSFORM,
        operation: formOperation.VIEW,
      },
    ],
  }),
  monthlySkillsetsformController.getAllData,
);
router.post(
  '/v1/addSkillsetsAnswers',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYSKILLSETSFORM,
        operation: formOperation.CREATE,
      },
    ],
  }),
  monthlySkillsetsformController.addSkillsetsAnswers,
);
router.post(
  '/v1/verifySkillsetsAnswers',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SKILLSETSFORMAUTHORIZATION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  monthlySkillsetsformController.verifySkillsetsAnswers,
);
router.get(
  '/v1/getbymonthlySkillsetsid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYSKILLSETSFORM,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.SKILLSETSFORMAUTHORIZATION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  monthlySkillsetsformController.getbymonthlySkillsetsid,
);
// router.post('/v1/getbyReportToid', monthlySkillsetsformController.getbyReportToid);
router.post(
  '/v1/getbyuserid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYSKILLSETSFORM,
        operation: formOperation.VIEW,
      },
    ],
  }),
  monthlySkillsetsformController.getbyuserid,
);
router.post(
  '/v1/getbyreporttoid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SKILLSETSFORMAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  monthlySkillsetsformController.getbyreporttoid,
);

router.post(
  '/v1/updateaSkillsetsAnswers',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SKILLSETSFORMAUTHORIZATION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  monthlySkillsetsformController.UpdateaSkillsetsAnswers,
);

router.post(
  '/v1/skillsetsReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SKILLSETSREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  monthlySkillsetsformController.SkillsetsReport,
);
router.post(
  '/v1/userSkillsetsReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.USERSKILLSETFORMREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  monthlySkillsetsformController.UserSkillsetsReport,
);

module.exports = router;
