/** @format */

const Sequelize = require('sequelize');
const UserMaster = require('../models/userMaster');
const SalaryPolicy = require('../models/employeeSalaryPolicy');
const sequelize = require('../config/database');
const message = require('../response_message/message');
const attendanceTransaction = require('../models/attendanceTransaction');
const Salary_policy = require('../models/salaryPolicy');
const hrLeavesMonthlyTrans = require('../models/hrLeavesMonthlyTrans');
const EmployeeSalaryPolicy = require('../models/employeeSalaryPolicy');
const { executeQuery } = require('./common.controller');
const { userAttributes } = require('../utils/commonVars');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const {
  getSalaryCycleDateAndMonthByDate,
  getMonthsDateByDate,
} = require('../utils/commonUtilFunctions');
const moment = require('moment');

exports.postAddSalaryPolicy = async (req, res, next) => {
  try {
    let { userMasterID, salaryPolicyID, startDate } = await req.body;

    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    let finalStartDate = '01';

    let SALARYPOLICY = await Salary_policy.findOne({
      raw: true,
      where: {
        salaryPolicyID: salaryPolicyID,
        status: 1,
      },
    });

    if (!SALARYPOLICY)
      return res.status(200).json({
        status: 401,
        message: 'Salary policy not found!',
      });

    const empjoining = await EmployeeJoiningDetails.findOne({
      where: {
        userMasterID,
      },
      attributes: ['userMasterID', 'payrollFrequency'],
    });

    if (!empjoining)
      return res.status(200).json({
        status: 401,
        message: 'Employee joining not found!',
      });

    if (SALARYPOLICY.payrollFrequency != empjoining.payrollFrequency)
      return res.status(200).json({
        status: 401,
        message:
          "Mismatch between the salary policy and the employee's payroll frequency.",
      });

    let finalDate = moment().format('YYYY-MM-DD');
    const currentDate = moment().format('YYYY-MM-DD');

    if (Number(startDate) == 0) {
      const date = getMonthsDateByDate(currentDate, -1);

      const { start_date, end_date, YYYYMM } = getSalaryCycleDateAndMonthByDate(
        SALARYPOLICY,
        date,
      );
      let checkAttendanceVerification = await hrLeavesMonthlyTrans.findOne({
        raw: true,
        where: {
          userMasterID: userMasterID,
          AttnYearMon: YYYYMM,
          verified: 1,
        },
      });

      if (checkAttendanceVerification) {
        return res.status(200).json({
          status: 401,
          message:
            'You cannot assign salary policy for the selected month because attendance already verified.',
          data: {},
        });
      }

      finalDate = start_date;
    } else if (Number(startDate) == 1) {
      const { start_date, end_date, YYYYMM } = getSalaryCycleDateAndMonthByDate(
        SALARYPOLICY,
        currentDate,
      );
      let checkAttendanceVerification = await hrLeavesMonthlyTrans.findOne({
        raw: true,
        where: {
          userMasterID: userMasterID,
          AttnYearMon: YYYYMM,
          verified: 1,
        },
      });

      if (checkAttendanceVerification) {
        return res.status(200).json({
          status: 401,
          message:
            'You cannot assign salary policy for the selected month because attendance already verified.',
          data: {},
        });
      }

      finalDate = start_date;
    } else {
      const date = getMonthsDateByDate(currentDate, 1);
      const { start_date, end_date, YYYYMM } = getSalaryCycleDateAndMonthByDate(
        SALARYPOLICY,
        date,
      );

      finalDate = start_date;
    }

    let applicableDate1 = new Date(finalDate);
    let data = await EmployeeSalaryPolicy.findOne({
      raw: true,
      where: {
        userMasterID: userMasterID,
        startDate: new Date(applicableDate1),
        status: 1,
      },
    });

    if (!data) {
      let get_one_data = await EmployeeSalaryPolicy.findAll({
        where: {
          userMasterID: userMasterID,
          status: 1,
        },
      });

      if (get_one_data.length > 0) {
        startdates = [];
        for (var i = 0; i < get_one_data.length; i++) {
          startdates.push(new Date(get_one_data[i].startDate));
        }

        const dateArr = startdates.sort((a, b) => a - b);
        const nearestPastDate = (dateArr, date) => {
          const pastArr = dateArr.filter((n) => n <= date);
          return pastArr.length > 0 ? pastArr[pastArr.length - 1] : null;
        };

        const nearestFutureDate = (dateArr, date) => {
          const futArr = dateArr.filter((n) => n >= date);
          return futArr.length > 0 ? futArr[0] : null;
        };

        if (nearestPastDate(dateArr, new Date(applicableDate1)) != null) {
          let date_change = await EmployeeSalaryPolicy.update(
            {
              endDate: new Date(new Date(applicableDate1).getTime() - 86400000),
            },
            {
              where: {
                startDate: nearestPastDate(dateArr, new Date(applicableDate1)),
                userMasterID: userMasterID,
              },
            },
          );
        }
        if (nearestFutureDate(dateArr, new Date(applicableDate1)) != null) {
          let insert_db_status = await EmployeeSalaryPolicy.create({
            userMasterID: userMasterID,
            salaryPolicyID,
            startDate: applicableDate1,
            endDate:
              nearestFutureDate(dateArr, new Date(applicableDate1)).getTime() -
              86400000,
            createBy,
            createByIp,
          });
        } else {
          let insert_db_status = await EmployeeSalaryPolicy.create({
            userMasterID: userMasterID,
            salaryPolicyID,
            startDate: applicableDate1,
            createBy,
            createByIp,
          });
        }
      } else {
        let insert_db_status = await EmployeeSalaryPolicy.create({
          userMasterID: userMasterID,
          salaryPolicyID,
          startDate: applicableDate1,
          createBy,
          createByIp,
        });
      }
    } else {
      let update_Status = await EmployeeSalaryPolicy.update(
        {
          salaryPolicyID: salaryPolicyID,
          updateBy: createBy,
          updateByIp: createByIp,
        },
        {
          where: { employeeSalaryPolicyID: data.employeeSalaryPolicyID },
        },
      );
    }

    res
      .status(200)
      .json({ status: 200, message: 'Policy assigned Successfully', data: {} });
  } catch (err) {
    next(err);
  }
};

exports.getSalaryPolicyByUserId = async (req, res, next) => {
  try {
    let get_one_data = await SalaryPolicy.findAll({
      where: {
        userMasterID: req.params.id,
        status: 1,
      },
      order: [['startDate', 'ASC']],
      include: [
        {
          model: UserMaster,
          as: 'employee',
        },
        {
          model: UserMaster,
          as: 'createdByUserDetails',
          attributes: userAttributes,
        },
        {
          model: Salary_policy,
          as: 'salaryPolicy',
          include: [
            {
              model: UserMaster,
              as: 'createdByUserDetails',
              attributes: userAttributes,
            },
            {
              model: UserMaster,
              as: 'updatedByUserDetails',
              attributes: userAttributes,
            },
          ],
        },
      ],
    });
    if (get_one_data.length == 0) {
    } else if (get_one_data.length == 1) {
      if (
        new Date(get_one_data[0].startDate).toISOString().slice(0, 10) >
        new Date().toISOString().slice(0, 10)
      ) {
        get_one_data[0].dataValues.salarypolicystatus = 'deactive';
      } else {
        get_one_data[0].dataValues.salarypolicystatus = 'active';
      }

      let attendancedata;
      if (get_one_data[0].endDate) {
        attendancedata = await attendanceTransaction.findOne({
          where: {
            userMasterID: req.params.id,
            AttendanceDate: {
              [Sequelize.Op.between]: [
                new Date(get_one_data[0].startDate),
                new Date(get_one_data[0].endDate),
              ],
            },
            Status: 1,
          },
        });
      } else {
        attendancedata = await attendanceTransaction.findOne({
          where: {
            userMasterID: req.params.id,
            AttendanceDate: {
              [Sequelize.Op.gte]: new Date(get_one_data[0].startDate),
            },
            Status: 1,
          },
        });
      }

      if (attendancedata) {
        get_one_data[0].dataValues.deleteshow = 0;
      } else {
        get_one_data[0].dataValues.deleteshow = 1;
      }
    } else {
      let startdates = [];
      for (var j = 0; j < get_one_data.length; j++) {
        startdates.push(new Date(get_one_data[j].startDate));
      }
      if (startdates.length > 0) {
        const dateArr = startdates.sort((a, b) => a - b);
        const nearestPastDate = (dateArr, date) => {
          const pastArr = dateArr.filter((n) => n <= date);
          return pastArr.length > 0 ? pastArr[pastArr.length - 1] : null;
        };
        const past = nearestPastDate(dateArr, new Date())
          .toISOString()
          .slice(0, 10);
        for (var i = 0; i < get_one_data.length; i++) {
          let D1 = new Date(get_one_data[i].startDate)
            .toISOString()
            .slice(0, 10);
          let D2;
          if (get_one_data[i].endDate == null) {
            D2 = null;
          } else {
            D2 = new Date(get_one_data[i].endDate).toISOString().slice(0, 10);
          }

          let D3 = new Date().toISOString().slice(0, 10);
          if (D3 == D1) {
            get_one_data[i].dataValues.salarypolicystatus = 'active';
          } else if (D3 >= D1 && D3 <= D2 && D3 == D1) {
            get_one_data[i].dataValues.salarypolicystatus = 'active';
          } else if (D2 == null && D1 <= D3) {
            get_one_data[i].dataValues.salarypolicystatus = 'active';
          } else if (D3 > D1) {
            if (D1 == past) {
              get_one_data[i].dataValues.salarypolicystatus = 'active';
            } else {
              get_one_data[i].dataValues.salarypolicystatus = 'deactive';
            }
          } else {
            get_one_data[i].dataValues.salarypolicystatus = 'deactive';
          }

          let attendancedata;
          if (get_one_data[i].endDate) {
            attendancedata = await attendanceTransaction.findOne({
              where: {
                userMasterID: req.params.id,
                AttendanceDate: {
                  [Sequelize.Op.between]: [
                    new Date(get_one_data[i].startDate),
                    new Date(get_one_data[i].endDate),
                  ],
                },
                Status: 1,
              },
            });
          } else {
            attendancedata = await attendanceTransaction.findOne({
              where: {
                userMasterID: req.params.id,
                AttendanceDate: {
                  [Sequelize.Op.gte]: new Date(get_one_data[i].startDate),
                },
                Status: 1,
              },
            });
          }

          if (attendancedata) {
            get_one_data[i].dataValues.deleteshow = 0;
          } else {
            get_one_data[i].dataValues.deleteshow = 1;
          }
        }
      }
    }
    if (!get_one_data) {
      res
        .status(200)
        .json({ status: 200, message: message.usermessage.deletedrecord });
    } else {
      res.status(200).json({ status: 200, data: get_one_data });
    }
  } catch (err) {
    next(err);
  }
};

exports.postDeletSalaryPolicyById = async (req, res, next) => {
  try {
    let { employeeSalaryPolicyID, userMasterID } = await req.body;

    let get_current_salary_data = await EmployeeSalaryPolicy.findOne({
      where: {
        employeeSalaryPolicyID: employeeSalaryPolicyID,
      },
    });

    let end;
    if (get_current_salary_data.endDate) {
      end = new Date(get_current_salary_data.endDate);
    } else {
      end = new Date();
    }

    let start = new Date(get_current_salary_data.startDate);

    let Finalresult = [];
    let currentDate = new Date(start);

    while (currentDate <= end) {
      const yearMonth = currentDate.toISOString().slice(0, 7).replace(/-/g, '');
      Finalresult.push(+yearMonth);

      currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
      currentDate.setUTCDate(1);
    }

    if (Finalresult.length > 0) {
      const placeholders = Finalresult.map((_, index) => `:month${index}`).join(
        ', ',
      );

      const replacements = {
        userMasterID: get_current_salary_data.userMasterID,
      };

      Finalresult.forEach((month, index) => {
        replacements[`month${index}`] = month;
      });

      const checkAttendanceVerification = await executeQuery(
        `
      SELECT DISTINCT "AttnYearMon"
      FROM "hrLeaveMonthlyTrans"
      WHERE "userMasterID" = :userMasterID
        AND verified = 1
        AND "AttnYearMon" IN (${placeholders})
    `,
        {
          replacements,
        },
      );

      if (checkAttendanceVerification.length > 0) {
        let months = '';
        for (var i = 0; i < checkAttendanceVerification.length; i++) {
          months =
            months +
            checkAttendanceVerification[i].AttnYearMon.toString().substring(
              0,
              4,
            ) +
            '-' +
            checkAttendanceVerification[i].AttnYearMon.toString().substring(
              4,
              6,
            ) +
            ',';
        }
        months = months.slice(0, months.length - 1);
        return res.status(200).json({
          status: 401,
          message:
            'You cannot delete salary policy because attendance already verified for months ' +
            months,
          data: {},
        });
      }
    }

    let get_one_data = await SalaryPolicy.findAll({
      where: {
        userMasterID: userMasterID,
        employeeSalaryPolicyID: {
          [Sequelize.Op.notIn]: [employeeSalaryPolicyID],
        },
        status: 1,
      },
    });
    if (get_one_data.length > 0) {
      let startdates = [];
      for (var i = 0; i < get_one_data.length; i++) {
        startdates.push(new Date(get_one_data[i].startDate));
      }
      const dateArr = startdates.sort((a, b) => a - b);
      let get_previous_data = await SalaryPolicy.findOne({
        where: {
          employeeSalaryPolicyID: employeeSalaryPolicyID,
        },
      });

      const nearestPastDate = (dateArr, date) => {
        const pastArr = dateArr.filter((n) => n <= date);
        return pastArr.length > 0 ? pastArr[pastArr.length - 1] : null;
      };

      const nearestFutureDate = (dateArr, date) => {
        const futArr = dateArr.filter((n) => n >= date);
        return futArr.length > 0 ? futArr[0] : null;
      };

      if (
        nearestPastDate(dateArr, new Date(get_previous_data.startDate)) != null
      ) {
        if (
          nearestFutureDate(dateArr, new Date(get_previous_data.startDate)) !=
          null
        ) {
          let date_change = await SalaryPolicy.update(
            {
              endDate:
                nearestFutureDate(
                  dateArr,
                  new Date(get_previous_data.startDate),
                ).getTime() - 86400000,
            },
            {
              where: {
                startDate: nearestPastDate(
                  dateArr,
                  new Date(get_previous_data.startDate),
                ),
                userMasterID: userMasterID,
              },
            },
          );
        } else {
          let date_change = await SalaryPolicy.update(
            {
              endDate: null,
            },
            {
              where: {
                startDate: nearestPastDate(
                  dateArr,
                  new Date(get_previous_data.startDate),
                ),
                userMasterID: userMasterID,
              },
            },
          );
        }
      }
    }
    let result = await sequelize.transaction(async (t) => {
      let insert_db_status = await SalaryPolicy.update(
        {
          status: 2,
        },
        {
          where: {
            employeeSalaryPolicyID: employeeSalaryPolicyID,
          },
        },
        { transaction: t },
      );

      res.status(200).json({
        status: 200,
        message: message.usermessage.employeesalarypolicydelete,
        data: insert_db_status,
      });
      return insert_db_status;
    });
  } catch (err) {
    next(err);
  }
};

exports.getSalaryPolicy = async (req, res, next) => {
  try {
    let { limit, page, companyMasterID } = await req.body;
    let offset = (page - 1) * limit;
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    let company_contact = await UserMaster.findAll({
      raw: true,
      where: {
        status: 1,
        companyMasterId: companyMasterID,
        ...userAccessCondition.where,
      },
      include: [...userAccessCondition.includeModels],
    });
    for (let i = 0; i < company_contact.length; i++) {
      let get_one_data = await SalaryPolicy.findAll({
        where: {
          userMasterID: company_contact[i].userMasterID,
          status: {
            [Sequelize.Op.in]: [1],
          },
        },
        order: [['startDate', 'ASC']],
        limit: limit,
        offset: offset,
        include: [{ model: Salary_policy, as: 'salaryPolicy' }],
      });
      company_contact[i]['department'] = get_one_data;

      if (get_one_data.length == 0) {
      } else if (get_one_data.length == 1) {
        if (
          new Date(get_one_data[0].startDate).toISOString().slice(0, 10) >
          new Date().toISOString().slice(0, 10)
        ) {
          get_one_data[0].status = 0;
        } else {
          get_one_data[0].status = 1;
        }
      } else {
        let startdates = [];
        for (var j = 0; j < get_one_data.length; j++) {
          startdates.push(new Date(get_one_data[j].startDate));
        }
        const dateArr = startdates.sort((a, b) => a - b);
        const nearestPastDate = (dateArr, date) => {
          const pastArr = dateArr.filter((n) => n <= date);
          return pastArr.length > 0 ? pastArr[pastArr.length - 1] : null;
        };
        const past = nearestPastDate(dateArr, new Date())
          .toISOString()
          .slice(0, 10);
        for (var j = 0; j < get_one_data.length; j++) {
          let D1 = new Date(get_one_data[j].startDate)
            .toISOString()
            .slice(0, 10);
          let D2;
          if (get_one_data[j].endDate == null) {
            D2 = null;
          } else {
            D2 = new Date(get_one_data[j].endDate).toISOString().slice(0, 10);
          }

          let D3 = new Date().toISOString().slice(0, 10);
          if (D3 == D1) {
            get_one_data[j].status = 1;
          } else if (D3 >= D1 && D3 <= D2 && D3 == D1) {
            get_one_data[j].status = 1;
          } else if (D2 == null && D1 <= D3) {
            get_one_data[j].status = 1;
          } else if (D3 > D1) {
            if (D1 == past) {
              get_one_data[j].status = 1;
            } else {
              get_one_data[j].status = 0;
            }
          } else {
            get_one_data[j].status = 0;
          }
        }
      }
    }

    let totalcount = await UserMaster.count({
      raw: true,
      where: {
        status: 1,
        companyMasterId: companyMasterID,
        ...userAccessCondition.where,
      },
      include: [...userAccessCondition.includeModels],
    });
    return res
      .status(200)
      .json({ status: 200, data: company_contact, totalcount: totalcount });
  } catch (err) {
    next(err);
  }
};

exports.postAddSalaryPolicyBULK = async (req, res, next) => {
  try {
    let { userMasterID, salaryPolicyID, startDate } = await req.body;

    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    let assignedUser = [];
    let notassignedUser = [];

    let finalStartDate = '01';

    let SALARYPOLICY = await Salary_policy.findOne({
      raw: true,
      where: {
        salaryPolicyID: salaryPolicyID,
        status: 1,
      },
    });

    if (!SALARYPOLICY)
      return res.status(200).json({
        status: 401,
        message: 'Salary Policy not found.',
      });

    const allEmpJoining = await EmployeeJoiningDetails.findAll({
      where: {
        userMasterID: {
          [Sequelize.Op.in]: userMasterID,
        },
      },
      attributes: ['userMasterID', 'payrollFrequency'],
    });

    if (SALARYPOLICY) {
      if (SALARYPOLICY.salaryCycleDate) {
        finalStartDate = SALARYPOLICY.salaryCycleDate
          .toString()
          .padStart(2, '0');
      }
    }

    const currentDate = moment().format('YYYY-MM-DD');

    for (let n = 0; n < userMasterID.length; n++) {
      const empjoining = allEmpJoining.find(
        (e) => e.userMasterID == userMasterID[n],
      );
      // if emp joining not found
      if (!empjoining) {
        continue;
      }

      // if salary policy payroll frequency and emp joining payroll frequency

      if (SALARYPOLICY.payrollFrequency != empjoining.payrollFrequency) {
        continue;
      }

      let finalDate = moment().format('YYYY-MM-DD');

      if (Number(startDate) == 0) {
        const date = getMonthsDateByDate(currentDate, -1);

        const { start_date, end_date, YYYYMM } =
          getSalaryCycleDateAndMonthByDate(SALARYPOLICY, date);
        let checkAttendanceVerification = await hrLeavesMonthlyTrans.findOne({
          raw: true,
          where: {
            userMasterID: userMasterID[n],
            AttnYearMon: YYYYMM,
            verified: 1,
          },
        });

        if (checkAttendanceVerification) {
          notassignedUser.push(userMasterID[n]);
          continue;
        } else {
          assignedUser.push(userMasterID[n]);
        }

        finalDate = start_date;
      } else if (Number(startDate) == 1) {
        const { start_date, end_date, YYYYMM } =
          getSalaryCycleDateAndMonthByDate(SALARYPOLICY, currentDate);
        let checkAttendanceVerification = await hrLeavesMonthlyTrans.findOne({
          raw: true,
          where: {
            userMasterID: userMasterID[n],
            AttnYearMon: YYYYMM,
            verified: 1,
          },
        });

        if (checkAttendanceVerification) {
          notassignedUser.push(userMasterID[n]);
          continue;
        } else {
          assignedUser.push(userMasterID[n]);
        }

        finalDate = start_date;
      } else {
        assignedUser.push(userMasterID[n]);

        const date = getMonthsDateByDate(currentDate, 1);

        const { start_date, end_date, YYYYMM } =
          getSalaryCycleDateAndMonthByDate(SALARYPOLICY, date);

        finalDate = start_date;
      }

      let applicableDate1 = new Date(finalDate);
      let data = await EmployeeSalaryPolicy.findOne({
        raw: true,
        where: {
          userMasterID: userMasterID[n],
          startDate: new Date(applicableDate1),
          status: 1,
        },
      });

      if (!data) {
        let get_one_data = await EmployeeSalaryPolicy.findAll({
          where: {
            userMasterID: userMasterID[n],
            status: 1,
          },
        });

        if (get_one_data.length > 0) {
          let startdates = [];
          for (var i = 0; i < get_one_data.length; i++) {
            startdates.push(new Date(get_one_data[i].startDate));
          }

          const dateArr = startdates.sort((a, b) => a - b);
          const nearestPastDate = (dateArr, date) => {
            const pastArr = dateArr.filter((n) => n <= date);
            return pastArr.length > 0 ? pastArr[pastArr.length - 1] : null;
          };

          const nearestFutureDate = (dateArr, date) => {
            const futArr = dateArr.filter((n) => n >= date);
            return futArr.length > 0 ? futArr[0] : null;
          };

          if (nearestPastDate(dateArr, new Date(applicableDate1)) != null) {
            let date_change = await EmployeeSalaryPolicy.update(
              {
                endDate: new Date(
                  new Date(applicableDate1).getTime() - 86400000,
                ),
              },
              {
                where: {
                  startDate: nearestPastDate(
                    dateArr,
                    new Date(applicableDate1),
                  ),
                  userMasterID: userMasterID[n],
                },
              },
            );
          }
          if (nearestFutureDate(dateArr, new Date(applicableDate1)) != null) {
            let insert_db_status = await EmployeeSalaryPolicy.create({
              userMasterID: userMasterID[n],
              salaryPolicyID,
              startDate: applicableDate1,
              endDate:
                nearestFutureDate(
                  dateArr,
                  new Date(applicableDate1),
                ).getTime() - 86400000,
              createBy,
              createByIp,
            });
          } else {
            let insert_db_status = await EmployeeSalaryPolicy.create({
              userMasterID: userMasterID[n],
              salaryPolicyID,
              startDate: applicableDate1,
              createBy,
              createByIp,
            });
          }
        } else {
          let insert_db_status = await EmployeeSalaryPolicy.create({
            userMasterID: userMasterID[n],
            salaryPolicyID,
            startDate: applicableDate1,
            createBy,
            createByIp,
          });
        }
      } else {
        let update_Status = await EmployeeSalaryPolicy.update(
          {
            salaryPolicyID: salaryPolicyID,
            updateBy: createBy,
            updateByIp: createByIp,
          },
          {
            where: { employeeSalaryPolicyID: data.employeeSalaryPolicyID },
          },
        );
      }
    }

    let Notassigned = await UserMaster.findAll({
      raw: true,
      where: {
        userMasterID: notassignedUser,
        status: 1,
      },
      attributes: ['displayName'],
    });

    let message = '';

    message =
      'Salary policy has been assigned to (' + assignedUser.length + ') users.';

    let notassignname = Notassigned.length ? ' <br><br>' : '';

    for (var i = 0; i < Notassigned.length; i++) {
      notassignname = notassignname + Notassigned[i].displayName + ',';
    }
    if (Notassigned.length > 0) {
      message =
        message +
        'Salary policy has not been assigned to ' +
        notassignname +
        ' because attendance already verfied.';
    }

    res.status(200).json({ status: 200, message: message, data: {} });
  } catch (err) {
    next(err);
  }
};
