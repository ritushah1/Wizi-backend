const express = require('express');
const router = express.Router();
const JoiningDocumentController = require('../controllers/joiningDocument.controller');
const { checkRolePermission } = require('../middleware/checkRolePermission');
const { permissionAccess } = require('../middleware/permissionAccess');
const { uploadJobApplication } = require('../middleware/uploadFile');

router.post(
  '/v1/addJoiningDocument',
  uploadJobApplication,
  JoiningDocumentController.addJoiningDocument,
);

router.get(
  '/v1/getJoiningDocumentByUserMasterID',
  JoiningDocumentController.getJoiningDocumentByUserMasterID,
);
router.post(
  '/v1/deleteJoiningDocument',
  JoiningDocumentController.deleteJoiningDocument,
);
router.get(
  '/v1/getJoiningDocumnetByID',
  JoiningDocumentController.getJoiningDocumnetByID,
);

router.post(
  '/v1/editJoiningDocument',
  uploadJobApplication,
  JoiningDocumentController.editJoiningDocument,
);

router.post(
  '/v1/renewJoiningDocument',
  uploadJobApplication,
  JoiningDocumentController.renewJoiningDocument,
);

router.get(
  '/v1/getJoiningDocumnetHistroyByID',
  JoiningDocumentController.getJoiningDocumnetHistoryByID,
);

router.post(
  '/v1/expiryJoiningDocument',
  checkRolePermission,
  permissionAccess,
  JoiningDocumentController.expiryJoiningDocument,
);

router.get(
  '/v1/expiryJoiningDocumentCron',
  JoiningDocumentController.expiryJoiningCron,
);

router.post(
  '/v1/showHideDocumentToEmp',
  JoiningDocumentController.showHideDocumentToEmp,
);

router.post(
  '/v1/getEmployeeJoiningDocument',
  JoiningDocumentController.getEmployeeJoiningDocument,
);

module.exports = router;
