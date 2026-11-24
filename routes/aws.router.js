const express = require('express');
const AWSController = require('../controllers/aws.controller');
const {
  verifyToken,
  verifyAwsSignedFileToken,
} = require('../middleware/tokenverify');
const router = express.Router();

router.post(
  '/v1/getSignedFileURL',
  verifyToken,
  AWSController.getSignedFileURL,
);
router.post(
  '/v1/getAwsSignedOrLocalFileURL',
  verifyAwsSignedFileToken,
  AWSController.getAwsSignedOrLocalFileURL,
);
module.exports = router;
