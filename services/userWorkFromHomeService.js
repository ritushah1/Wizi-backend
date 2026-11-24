const WorkFromHome = require('../models/userWorkFromHome');

class UserWorkFromHomeService {
  async createWorkFromHome(data = {}, option = {}) {
    return await WorkFromHome.create(data, option);
  }

  async updateWorkFromHome(data = {}, where = {}, options = {}) {
    return await WorkFromHome.update(data, {
      where,
      ...options,
    });
  }

  async listWorkFromHome(
    offset = null,
    limit = null,
    order = [],
    where = {},
    attributes = [],
    include = [],
    distinct = false
  ) {
    return await WorkFromHome.findAndCountAll({
      distinct: distinct,
      offset,
      limit,
      order,
      where,
      attributes: attributes,
      include: include,
    });
  }

  async editWorkFromHome(where = null, attributes = [], include = []) {
    return await WorkFromHome.findOne({
      where: where,
      attributes: attributes,
      include: include,
    });
  }

  async destroyWorkFromHome(
    id = null,
    transaction,
    user,
    individualHooks = true
  ) {
    return await WorkFromHome.destroy({
      where: { id },
      individualHooks,
      transaction,
      user,
    });
  }

  async update(data, where, options = {}) {
    return await WorkFromHome.update(data, {
      where,
      validate: false,
      ...options,
    });
  }

  async getAllWorkFromHome(attributes, where, include, options = {}) {
    return await WorkFromHome.findAll({
      attributes: attributes,
      where: where,
      include: include,
      ...options
    });
  }
}

module.exports = new UserWorkFromHomeService();
