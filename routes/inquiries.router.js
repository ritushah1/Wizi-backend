/** @format */

const express = require('express');
const router = express.Router();
const { validateSchema } = require('../middleware/validateSchema');
const inquiriesController = require('../controllers/inquiries.controller');
const { addInquirySchema } = require('../validators/inquiriesValidation');

router.post(
  '/v1/addInquiry',
  validateSchema(addInquirySchema, 'body'),
  inquiriesController.addInquiry,
);

router.get(
  '/v1/getInquiry',
  inquiriesController.getInquiry,
);

module.exports = router;
