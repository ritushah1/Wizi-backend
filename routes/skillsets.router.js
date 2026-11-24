const express = require('express');
const skillSetsController = require('../controllers/skillsets.controllers');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const { uploadImportExcelFile } = require('../middleware/uploadFile');

const router = express.Router();
router.post(
  '/v1/addskillset',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SKILLSETSQUESTIONS,
        operation: formOperation.CREATE,
      },
    ],
  }),
  skillSetsController.addSkillSet,
); // to add skillset
router.post(
  '/v1/getallskillset',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SKILLSETSQUESTIONS,
        operation: formOperation.VIEW,
      },
    ],
  }),
  skillSetsController.getAllSkillSet,
); // to get all skill list
router.get(
  '/v1/getskillsetbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SKILLSETSQUESTIONS,
        operation: formOperation.EDIT,
      },
    ],
  }),
  skillSetsController.getSkillSetById,
); // to get by id
router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SKILLSETSQUESTIONS,
        operation: formOperation.EDIT,
      },
    ],
  }),
  skillSetsController.updateSkillSet,
); // update skill data
router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SKILLSETSQUESTIONS,
        operation: formOperation.DELETE,
      },
    ],
  }),
  skillSetsController.deleteSkillSetById,
); // delete by id
router.post(
  '/v1/statuschanges',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SKILLSETSQUESTIONS,
        operation: formOperation.EDIT,
      },
    ],
  }),
  skillSetsController.statuschange,
); // status change
router.post(
  '/v1/uploadexcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SKILLSETSQUESTIONS,
        operation: formOperation.VIEW,
      },
    ],
  }),
  uploadImportExcelFile,
  skillSetsController.uploadexcel,
);
router.post(
  '/v1/getAllSkillSetUsingCompanyID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SKILLSETSFORM,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.SKILLSETSFORM,
        operation: formOperation.EDIT,
      },
    ],
  }),
  skillSetsController.getAllSkillSetUsingCompanyID,
);

module.exports = router;
