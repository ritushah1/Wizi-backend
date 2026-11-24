const UserMaster = require('../models/userMaster');
const UserWorkFromHome = require('../models/userWorkFromHome');
const WorkFromHomeAuthorization = require('../models/workFromHomeAuthorizations');

class workFromHomeAuthorization {
  async bulkCreateWorkFromHomeAuthorization(data = {}, option = {}) {
    return await WorkFromHomeAuthorization.bulkCreate(data, option);
  }

  async destroyWorkFromHomeAuthorization(
    id = null,
    transaction,
    user,
    individualHooks = true
  ) {
    return await WorkFromHomeAuthorization.destroy({
      where: {
        userWorkFromHomeID: id,
      },
      individualHooks,
      transaction,
      user,
    });
  }

  async list(offset, limit, order, where, include, distinct = true) {
    return await WorkFromHomeAuthorization.findAndCountAll({
      offset,
      limit,
      order,
      distinct: distinct,
      where: where,
      include: include,
    });
  }

  async update(data, where, options = {}) {
    return await WorkFromHomeAuthorization.update(data, {
      where,
      returning: true,
      ...options,
    });
  }

  async getWorkFromHomeAuthorization(
    attributes = [],
    where = {},
    include = []
  ) {
    return await WorkFromHomeAuthorization.findOne({
      attributes: attributes,
      where: where,
      include: include,
    });
  }

  async getWorkFromHomeAuthorizationCount(id) {
    return await WorkFromHomeAuthorization.count({
      where: {
        userWorkFromHomeID: id,
        authStatus: 1,
        status: 1,
      },
    });
  }

  async getAllWorkFromHomeAuthorization(
    attributes = [],
    where = {},
    include = [],
    options = {}
  ) {
    return await WorkFromHomeAuthorization.findAll({
      attributes: attributes,
      where: where,
      include: include,
      ...options
    });
  }

  async getAllWorkFromHomeAdmin(
    offset,
    limit,
    order,
    where,
    include,
    distinct = true
  ) {
    return await UserWorkFromHome.findAndCountAll({
      offset,
      limit,
      order,
      distinct: distinct,
      where: where,
      include: include,
    });
  }
}

module.exports = new workFromHomeAuthorization();
