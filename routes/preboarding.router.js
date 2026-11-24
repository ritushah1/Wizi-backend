const express = require('express');
const preboardingController = require('../controllers/preboarding.controller');
const { verifyToken } = require('../middleware/tokenverify');
const router = express.Router();
const { uploadPreboardingFromDocument } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/add',
  uploadPreboardingFromDocument,
  preboardingController.postAddPreboarding,
);

router.get(
  '/v1/getbyid/:id',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  preboardingController.getPreboardingById,
); //get by id
router.post(
  '/v1/updatebyid',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRPREBOARDINGREQUEST,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.USERPREBOARDINGREQUEST,
        operation: formOperation.EDIT,
      },
    ],
  }),
  preboardingController.postUpdatePreboarding,
); //update visit data
router.post(
  '/v1/onboardStatusChange',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRPREBOARDINGREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  preboardingController.onboardStatusChange,
); //delete by id

router.post(
  '/v1/updatePreboardingForm',
  verifyToken,
  uploadPreboardingFromDocument,
  preboardingController.updatePreboardingForm,
); //update preboarding form custom field values

router.post(
  '/v1/getbycompanyid',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRPREBOARDINGREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  preboardingController.getPreboardingByCompanyId,
); //status change

router.get(
  '/v1/preBoardingFormDownload',
  preboardingController.preBoardingFormDownload,
); //downlaod the form

router.post(
  '/v1/addPreboardingMaster',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PREBOARDINGCUSTOMIZE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  preboardingController.addPreboardingMaster,
);

router.post(
  '/v1/deletePreboardingMaster',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PREBOARDINGCUSTOMIZE,
        operation: formOperation.DELETE,
      },
    ],
  }),
  preboardingController.deletePreboardingMaster,
);
router.post(
  '/v1/getPreboardingMaster',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.JOBAPPLICATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.PREBOARDINGFORM,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.HRPREBOARDINGREQUEST,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.PREBOARDINGCUSTOMIZE,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.PREBOARDINGCUSTOMIZE,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.PREBOARDINGCUSTOMIZE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  preboardingController.getPreboardingMaster,
);

router.post(
  '/v1/getPreboardingOfferLetter',
  preboardingController.getPreboardingOfferLetter,
);

router.post(
  '/v1/updateOfferLetter',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRPREBOARDINGREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  preboardingController.updatePreboardingOfferLetter,
);

router.post(
  '/v1/updateOfferLetter',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRPREBOARDINGREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  preboardingController.updatePreboardingOfferLetter,
);

router.post(
  '/v1/mailSendForAcceptance',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRPREBOARDINGREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  preboardingController.sendMailForAcceptance,
);

router.get(
  '/offer-response/:signedData',
  preboardingController.getOfferResponse,
);

router.post(
  '/v1/mailSendForPreBoardingDocs',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRPREBOARDINGREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  preboardingController.sendMailForPrebordingDocs,
);

router.post(
  '/v2/updatePreboardingMaster',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PREBOARDINGCUSTOMIZE,
        operation: formOperation.EDIT,
      },
    ],
  }),
  preboardingController.updatePreboardingMasterV2,
);

router.post(
  '/v1/savePreboardingFormCustomizeMapping',
  verifyToken,
  preboardingController.savePreboardingFormCustomizeMapping,
);
router.post(
  '/v1/getPreboardingFormCustomizeMapping',
  verifyToken,
  preboardingController.getPreboardingFormCustomizeMapping,
);
module.exports = router;
