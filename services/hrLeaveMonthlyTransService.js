const AuthorizationDetails = require('../models/AuthorizationDetails');
const HrLeaveMonthlyTrans = require('../models/hrLeavesMonthlyTrans');

class HrLeaveMonthlyTransService {
  async getAttendanceVerifyCheck(attributes = [], where = {}, include = [] ) {
    return await HrLeaveMonthlyTrans.findOne({
      attributes: attributes,
      where: where,
      include:include
    });
  }
}

module.exports = new HrLeaveMonthlyTransService();
