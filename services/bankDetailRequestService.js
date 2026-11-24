const BankDetailRequest = require('../models/bankDetailRequest');

class BankDetailRequestService {
  async create(data = {}, option = {}) {
    return await BankDetailRequest.create(data, option);
  }

  async list(
    offset = null,
    limit = null,
    order = [],
    where = {},
    attributes = [],
    include = [],
    distinct = false
  ) {
    return await BankDetailRequest.findAndCountAll({
      distinct: distinct,
      offset,
      limit,
      order,
      where,
      attributes: attributes,
      include: include,
    });
  }

  async getAllBankDetailRequest(attributes, where, include) {
    return await BankDetailRequest.findAll({
      attributes: attributes,
      where: where,
      include: include,
    });
  }

  async editBankDetailRequest(where = null, attributes = [], include = [], options={}) {
    return await BankDetailRequest.findOne({
      where: where,
      attributes: attributes,
      include: include,
      ...options,
    });
  }

  async update(data, where, option = {}, returning = false) {
    const defaultOption = {
      where,
      validate: false,
    };
    return await BankDetailRequest.update(data, {
      ...defaultOption,
      ...option,
      returning: returning,
    });
  }
}

module.exports = new BankDetailRequestService();
