/** @format */
const { Joi } = require('../utils/joi');

const addDepartmentDesignationV2Schema = Joi.object({
  departmentName: Joi.string().max(255).required(),
  designationName: Joi.string().max(255).required(),
  jobdescription: Joi.string().max(500).allow('', null).optional(),
  companyMasterID: Joi.number().integer().positive().required(),
  inquiryID: Joi.number().integer().positive().required(),
});

module.exports = {
  addDepartmentDesignationV2Schema,
};
