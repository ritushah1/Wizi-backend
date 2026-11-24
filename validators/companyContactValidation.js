/** @format */
const { Joi } = require('../utils/joi');

const addCompanyContactV2Schema = Joi.object({
  firstName: Joi.string().max(255).required(),
  middleName: Joi.string().max(255).allow('', null).optional(),
  lastName: Joi.string().max(255).allow('', null).required(),
  displayName: Joi.string().max(255).required(),
  userNumber: Joi.string().max(15).required(),
  userNumberCountryMasterID: Joi.number().integer().positive().required(),
  gender: Joi.string().required(),
  dob: Joi.date().custom((value, helpers) => {
    const today = new Date();
    const birthDate = new Date(value);
    if (birthDate.getFullYear() > 9999 || birthDate.getFullYear() < 1900) {
      return helpers.message('Please provide a valid year for date of birth (e.g., YYYY).');
    }
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 18) {
      return helpers.message('User must be at least 18 years old.');
    }
    return value;
  }).required(),
  companyMasterID: Joi.number().integer().positive().required(),
  email: Joi.string().email().max(255).required(),
  branchMasterID: Joi.number().integer().positive().required(),
  departmentID: Joi.number().integer().positive().required(),
  designationID: Joi.number().integer().positive().required(),
  joiningDate: Joi.date().custom((value, helpers) => {
    const date = new Date(value);
    if (date.getFullYear() > 9999 || date.getFullYear() < 1900) {
      return helpers.message('Please provide a valid year for joining date (e.g., YYYY).');
    }
    return value;
  }).required(),
  inquiryID: Joi.number().integer().positive().required(),
  password: Joi.string().max(255).required(),
});

module.exports = {
  addCompanyContactV2Schema,
};
