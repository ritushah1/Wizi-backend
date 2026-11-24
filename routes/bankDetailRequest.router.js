const express = require('express');
const BankDetailRequestController = require('../controllers/bankDetailRequest.controller');
const {
  createBankDetailRequestSchema,
} = require('../validators/bankDetailrequest');
const { reqObjectType } = require('../utils/commonVars');
const { validateSchema } = require('../middleware/validateSchema');
const router = express.Router();

router.post(
  '/v1/add',
  validateSchema(createBankDetailRequestSchema, reqObjectType.BODY),
  BankDetailRequestController.add,
);

router.get('/v1', BankDetailRequestController.list);

module.exports = router;
