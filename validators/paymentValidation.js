/** @format */
const { Joi } = require('../utils/joi');

const createOrderSchema = Joi.object({
  amount: Joi.number().min(0).required(),
  currency: Joi.string().default('INR').optional(),
  receipt: Joi.string().optional(),
  notes: Joi.object().optional(),
  // Link payment order to inquiry
  inquiryID: Joi.number().integer().positive().required(),
});

const verifySignatureSchema = Joi.object({
  razorpayOrderId: Joi.string().required(),
  razorpayPaymentId: Joi.string().required(),
  razorpaySignature: Joi.string().required(),
  inquiryID: Joi.number().integer().positive().required(),
  productMasterID: Joi.number().integer().positive().required(),
});

module.exports = {
  createOrderSchema,
  verifySignatureSchema,
};
