const express = require('express');
const router = express.Router();
const IdCardFormatController = require('../controllers/idCardFormat.controller');
const { uploadIDCardFormat } = require('../middleware/uploadFile');

router.post(
  '/v1/addIdCardFormat',
  uploadIDCardFormat,
  IdCardFormatController.postAddIdCardFormat,
);

router.post(
  '/v1/updateIdCardFormat',
  uploadIDCardFormat,
  IdCardFormatController.updateIdCardFormat,
);

router.post(
  '/v1/getAllIdCardFormat',
  IdCardFormatController.getAllIdCardFormat,
);
router.post(
  '/v1/getIdCardFormatByID',
  IdCardFormatController.getIdCardFormatByID,
);

module.exports = router;
