const BankDetailAuthorization = require('../models/bankDetailAuthorization');
const BankDetailRequest = require('../models/bankDetailRequest');

class BankDetailAuthorizationService {
  async bulkCreate(data = {}, option = {}) {
    return await BankDetailAuthorization.bulkCreate(data, option);
  }
  async list(offset, limit, order, where, include, distinct = true) {
    return await BankDetailAuthorization.findAndCountAll({
      offset,
      limit,
      order,
      distinct: distinct,
      where: where,
      include: include,
    });
  }

  async getBankDetailAuthorization(attributes = [], where = {}, include = []) {
    return await BankDetailAuthorization.findOne({
      attributes: attributes,
      where: where,
      include: include,
    });
  }

  async update(data, where, options = {}) {
    return await BankDetailAuthorization.update(data, {
      where,
      returning: true,
      ...options, // <-- transaction, hooks, user, etc
    });
  }

  async getBankDetailAuthorizationCount(id) {
    return await BankDetailAuthorization.count({
      where: {
        bankDetailRequestId: id,
        authStatus: 1,
        status: 1,
      },
    });
  }

  async destroy(where, options = {}) {
    return await BankDetailAuthorization.destroy({
      where,
      ...options,
    });
  }

  async getBankDetailAuthorizationIDs(where = {}, attributes = []) {
    return (
      await BankDetailAuthorization.findAll({
        attributes: attributes,
        where,
        raw: true,
      })
    ).map((item) => item.bankDetailAuthorizationId);
  }

  async listAdmin(offset, limit, order, where, include, distinct = true) {
    return await BankDetailRequest.findAndCountAll({
      offset,
      limit,
      order,
      where: where,
      include: include,
      distinct: distinct,
    });
  }

  async adminDataToApproveReject(
    where,
    include,
    distinct = true,
    attributes = [],
  ) {
    return await BankDetailRequest.findAll({
      where: where,
      include: include,
      distinct: distinct,
      attributes: attributes,
    });
  }

  async getAllAuthData(attributes = [], where, include, distinct = true) {
    return await BankDetailAuthorization.findAll({
      where: where,
      include: include,
      distinct: distinct,
      attributes: attributes,
    });
  }
}

module.exports = new BankDetailAuthorizationService();
