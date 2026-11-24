const express = require('express');
const router = express.Router();
const skillSetsFormController = require('../controllers/skillsetsform.controller');
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
        permissionName: fromPermissionName.SKILLSETSFORM,
        operation: formOperation.CREATE,
      },
    ],
  }),
  skillSetsFormController.AddSkillSetsForm,
);
router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SKILLSETSFORM,
        operation: formOperation.EDIT,
      },
    ],
  }),
  skillSetsFormController.UpdateSkillSetsForm,
);
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SKILLSETSFORM,
        operation: formOperation.EDIT,
      },
    ],
  }),
  skillSetsFormController.getSkillSetsFormById,
); //get by id
router.post(
  '/v1/getbycompanyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SKILLSETSFORM,
        operation: formOperation.VIEW,
      },
    ],
  }),
  skillSetsFormController.getSkillSetsFormByCompanyId,
); //get by company id
module.exports = router;
