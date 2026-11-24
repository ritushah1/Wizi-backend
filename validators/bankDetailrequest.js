const { Joi } = require('../utils/joi');

const createBankDetailRequestSchema = Joi.object({
  bankDetailRequestId: Joi.number(),
  userMasterID: Joi.number(),
  bankBranchID: Joi.number(),
  bankMasterID: Joi.number().required(),
  IFSCCode: Joi.when('bankBranchID', {
    is: Joi.exist(),
    then: Joi.string().required().messages({
      'string.empty': 'IFSCCode is required',
    }),
    otherwise: Joi.string()
      .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid IFSCCode format',
        'string.empty': 'IFSCCode is required',
      }),
  }),
  accountNo: Joi.required(),
  accountHolderName: Joi.string().required(),
});

module.exports = {
  createBankDetailRequestSchema,
};
