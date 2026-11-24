const UserInbox = require('../models/UserInbox');

class UserInboxService {
  async bulkCreateUserInbox(data = [], option = {}) {
    return await UserInbox.bulkCreate(data, option);
  }

  async destroyUserInbox(where = {}, option = {}) {
    return await UserInbox.destroy({
      where,
      ...option,
    });
  }
}

module.exports = new UserInboxService();
