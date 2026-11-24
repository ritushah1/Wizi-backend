const express = require('express');
const UserLetters = require('../controllers/userLetters.controller');
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
        permissionName: fromPermissionName.ASSIGNLETTER,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  UserLetters.postAddUserLetters,
); //save the data
router.post(
  '/v1/getAllUserLetter',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNLETTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  UserLetters.getAllUserLetter,
); //save the data
router.post(
  '/v1/delete',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNLETTER,
        operation: formOperation.DELETE,
      },
    ],
  }),
  UserLetters.postDeleteUserLetters,
); //save the data
router.post(
  '/v1/postUpdateUserLetters',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNLETTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  UserLetters.postUpdateUserLetters,
); //save the data

router.post(
  '/v1/offeremail',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNLETTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  UserLetters.sendEmailOfferLetter,
);

router.post(
  '/v1/joinigemail',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNLETTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  UserLetters.sendEmailJoinigLetter,
);

router.post(
  '/v1/experienceemail',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNLETTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  UserLetters.sendEmailExperienceLetter,
);
router.post(
  '/v1/termination',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNLETTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  UserLetters.sendEmailTerminationLetter,
);
router.post(
  '/v1/appointment',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNLETTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  UserLetters.sendEmailAppointmentLetter,
);
router.post(
  '/v1/relieving',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNLETTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  UserLetters.sendEmailRelievingLetter,
);
router.post(
  '/v1/disengagement',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNLETTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  UserLetters.sendEmailDisengagementLetter,
);
router.post(
  '/v1/employmentCertificate',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNLETTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  UserLetters.sendEmailEmploymentCertificate,
);
router.post(
  '/v1/confirmationLetter',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNLETTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  UserLetters.sendEmailConfirmationLetter,
);
router.post(
  '/v1/showHideLetterToEmp',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.USERTRANSFERLETTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.ASSIGNLETTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ASSIGNDISCREPANCYLETTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  UserLetters.showHideLetterToEmp,
);

module.exports = router;
