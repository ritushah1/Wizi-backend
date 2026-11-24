const { Joi } = require('../utils/joi');

const createWorkFromHomeSchema = Joi.object({
  userMasterID: Joi.number(),
  dayType: Joi.string().required(),
  fromDate: Joi.date().iso().required(),
  toDate: Joi.date()
    .iso()
    .when('dayType', {
      is: 'Full Day',
      then: Joi.required(),
      otherwise: Joi.optional().allow(null, ''),
    }),
  workFromHomeDays: Joi.required(),
  remark: Joi.string().required(),
  createByIp: Joi.optional(),
});

const updateWorkFromHomeSchema = Joi.object({
  userMasterID: Joi.number(),
  dayType: Joi.string().required(),
  fromDate: Joi.date().iso().required(),
  toDate: Joi.date()
    .iso()
    .when('dayType', {
      is: 'Full Day',
      then: Joi.required(),
      otherwise: Joi.optional().allow(null, ''),
    }),
  workFromHomeDays: Joi.required(),
  remark: Joi.string().required(),
});

module.exports = {
  createWorkFromHomeSchema,
  updateWorkFromHomeSchema,
};
