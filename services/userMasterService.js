const userMaster = require('../models/userMaster');

class UserMasterService {
  async getSingleUserData(attributes = [], where = {}, include = []) {
    return await userMaster.findOne({
        attributes:attributes,
        where:where,
        include:include
    });
  }

  async getMultipleUserData(attributes = [], where = {}, include = []) {
    return await userMaster.findAll({
        attributes:attributes,
        where:where,
        include:include
    });
  }
}

module.exports = new UserMasterService();
