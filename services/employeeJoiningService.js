const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');

class EmployeeJoiningService {
  async update(data, where, option = {}, returning = false) {
    const defaultOption = {
      where,
    };
    return await EmployeeJoiningDetails.update(data, {
      ...defaultOption,
      ...option,
      returning: returning,
    });
  }
}

module.exports = new EmployeeJoiningService();
