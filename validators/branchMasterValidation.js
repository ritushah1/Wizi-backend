/** @format */
const { Joi } = require('../utils/joi');

const addBranchV2Schema = Joi.object({
  companyMasterID: Joi.number().integer().positive().required(),
  branchName: Joi.string().max(255).required(),
  branchCode: Joi.string().max(255).required(),
  branchAddress: Joi.string().max(255).required(),
  cityMasterID: Joi.number().integer().positive().required(),
  inquiryID: Joi.number().integer().positive().required(),
});

module.exports = {
  addBranchV2Schema,
};
