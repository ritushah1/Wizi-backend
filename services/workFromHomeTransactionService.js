const WorkFromHomeTransaction = require('../models/workFromHomeTransaction');

class workFromHomeTransaction {
  async bulkCreateWorkFromHomeTransaction(data = {}, option = {}) {
    return await WorkFromHomeTransaction.bulkCreate(data, option);
  }

  async update(data = {}, where = {}) {
    return await WorkFromHomeTransaction.update(data, { where });
  }

  async checkTransaction(attributes = [], where = {}, include = []) {
    return await WorkFromHomeTransaction.findOne({
      attributes: attributes,
      where: where,
      include: include,
    });
  }
}

module.exports = new workFromHomeTransaction();
