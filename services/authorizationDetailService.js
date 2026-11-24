const AuthorizationDetails = require('../models/AuthorizationDetails');

class AuthorizationDetailService {
  async getAuthorizationDetailByUserMasterID(
    attributes = [],
    include = [],
    where = {},
    options = {}
  ) {
    const authorizeData = await AuthorizationDetails.findOne({
      attributes: attributes,
      include: include,
      where: where,
      ...options,
    });

    return authorizeData;
  }
}

module.exports = new AuthorizationDetailService();
