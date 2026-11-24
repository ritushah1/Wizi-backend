/** @format */

const express = require('express');
const router = express.Router();
const { validateSchema } = require('../middleware/validateSchema');
const paymentController = require('../controllers/payment.controller');
const { createOrderSchema, verifySignatureSchema } = require('../validators/paymentValidation');

router.post(
  '/v1/createOrder',
  validateSchema(createOrderSchema, 'body'),
  paymentController.createOrder
);

router.post(
  '/v1/verifySignature',
  validateSchema(verifySignatureSchema, 'body'),
  paymentController.verifySignature
);

module.exports = router;
