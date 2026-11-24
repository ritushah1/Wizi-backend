const { Joi } = require('../utils/joi');

const addInquirySchema = Joi.object({
  totalEmployees: Joi.number().integer().min(10).required(),
  fieldEmployees: Joi.number()
    .integer()
    .min(0)
    .max(Joi.ref('totalEmployees'))
    .required(),

  companyEmail: Joi.string().trim().email().max(255).required(),

  contactPersonFirstName: Joi.string().trim().min(1).max(100).required(),

  contactPersonLastName: Joi.string().trim().min(1).max(100).required(),

  address: Joi.string().trim().min(1).max(255).required(),

  cityMasterID: Joi.number().integer().positive().required(),
  timezoneID: Joi.optional(),
});

module.exports = {
  addInquirySchema,
};
