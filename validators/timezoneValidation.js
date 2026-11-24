const { Joi } = require('../utils/joi');

const createTimezoneSchema = Joi.object({
  timezone: Joi.string().required(),
  timezoneOffset: Joi.string().required(),
  timezoneName: Joi.string().required(),
});

const updateTimezoneSchema = Joi.object({
  id: Joi.string().required(),
  timezone: Joi.string(),
  timezoneOffset: Joi.string().optional(),
  timezoneName: Joi.string().optional(),
  status: Joi.number().optional().valid(0, 1),
});

module.exports = {
  createTimezoneSchema,
  updateTimezoneSchema,
};