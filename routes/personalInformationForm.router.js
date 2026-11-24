const express = require('express');
const PersonalInformationFormController = require('../controllers/personalInformationForm.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/downloadPersonalInformationForm',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  PersonalInformationFormController.downloadPersonalInformationForm,
); // save data

router.post(
  '/v1/translateUserNames',
  PersonalInformationFormController.translateUserNames,
);
router.post(
  '/v1/translateContractor',
  PersonalInformationFormController.translateContractor,
);
router.post(
  '/v1/translateUserAddress',
  PersonalInformationFormController.translateUserAddress,
);
module.exports = router;
