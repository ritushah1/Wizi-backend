const Timezone = require('../models/timezone');

class TimezoneService {
  async createTimezone(data = {}, options = {}) {
    return await Timezone.create(data, options);
  }

  async updateTimezone(data = {}, where = {}, options = {}) {
    return await Timezone.update(data, {
      where,
      ...options,
    });
  }

  async listTimezone(
    offset = null,
    limit = null,
    order = [],
    where = {},
    attributes = [],
    include = [],
    distinct = false
  ) {
    return await Timezone.findAndCountAll({
      distinct: distinct,
      offset,
      limit,
      order,
      where,
      attributes: attributes,
      include: include,
    });
  }

  async editTimezone(where = null, attributes = [], include = []) {
    return await Timezone.findOne({
      where: where,
      attributes: attributes,
      include: include,
    });
  }

  async getAllTimezone(attributes, where, include, options = {}) {
    return await Timezone.findAll({
      attributes: attributes,
      where: where,
      include: include,
      ...options
    });
  }

  async destroyTimezone(
    id = null,
    transaction,
    user,
    individualHooks = true
  ) {
    return await Timezone.destroy({
      where: { timezoneID: id },
      individualHooks,
      transaction,
      user,
    });
  }
}

module.exports = new TimezoneService();