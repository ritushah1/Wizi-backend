const { date } = require('@hapi/joi');
const {
  employeeSalaryPolicy,
  getemployeeLeavePolicy,
  getMonthsDateByDate,
  getSalaryCycleDateAndMonthByDate,
} = require('../utils/commonUtilFunctions');
const empLeavePolicy = require('../models/empLeavePolicy');
const { Sequelize, Op } = require('sequelize');
const sequelize = require('../config/database');
const employeeLeavePolicy = require('../models/employeeLeavePolicy');
const UserMaster = require('../models/userMaster');
const companyMaster = require('../models/companyMaster');
const SalaryPolicy = require('../models/salaryPolicy');
const EmployeeSalaryPolicy = require('../models/employeeSalaryPolicy');
const moment = require('moment');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');

exports.addData = async (req, res, next) => {
  try {
    const { userMasterID, employeeLeavePolicyID, month } = req.body;

    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    const arrayToAddData = [];

    const [allSalaryPolicy, allEmployeeLeavePolicyPolicy] = await Promise.all([
      EmployeeSalaryPolicy.findAll({
        where: {
          userMasterID: {
            [Sequelize.Op.in]: userMasterID,
          },
          status: 1,
          startDate: {
            [Sequelize.Op.lte]: new Date(),
          },
          [Sequelize.Op.or]: [
            {
              endDate: { [Sequelize.Op.gte]: new Date() },
            },
            {
              endDate: { [Sequelize.Op.eq]: null },
            },
          ],
        },
        include: [
          {
            model: SalaryPolicy,
            as: 'salaryPolicy', // Alias
          },
        ],
      }),
      empLeavePolicy.findAll({
        raw: true,
        where: {
          userMasterID: {
            [Sequelize.Op.in]: userMasterID,
          },
          status: 1,
        },
      }),
    ]);

    const currentDate = moment().format('YYYY-MM-DD');

    await sequelize.transaction(async (t) => {
      for (const userId of userMasterID) {
        const active_salary_policy =
          allSalaryPolicy.find((e) => e.userMasterID == userId)?.salaryPolicy ||
          null;

        // let tempDate = '01';
        let finalDate = moment().format('YYYY-MM-DD');

        // if (
        //   active_salary_policy &&
        //   active_salary_policy['salaryPolicy.salaryCycleDate']
        // ) {
        //   tempDate = active_salary_policy['salaryPolicy.salaryCycleDate']
        //     .toString()
        //     .padStart(2, '0');
        // }
        // if month is past month
        if (Number(month) == 0) {
          const date = getMonthsDateByDate(currentDate, -1);

          const { start_date, end_date, YYYYMM } =
            getSalaryCycleDateAndMonthByDate(active_salary_policy, date);
          finalDate = start_date;
        }
        // current month
        else if (Number(month) == 1) {
          const { start_date, end_date, YYYYMM } =
            getSalaryCycleDateAndMonthByDate(active_salary_policy, currentDate);
          finalDate = start_date;
        } else {
          const date = getMonthsDateByDate(currentDate, 1);

          const { start_date, end_date, YYYYMM } =
            getSalaryCycleDateAndMonthByDate(active_salary_policy, date);

          finalDate = start_date;
        }

        let applicableDate1 = finalDate;

        // find leave policy if already add on the same date
        const data = allEmployeeLeavePolicyPolicy.find(
          (e) =>
            e.userMasterID == userId &&
            new Date(e.applicableDate).getTime() ==
              new Date(applicableDate1).getTime(),
        );

        if (!data) {
          const get_one_data = allEmployeeLeavePolicyPolicy.filter(
            (e) => e.userMasterID == userId,
          );

          if (get_one_data.length > 0) {
            const startdates = [];
            for (let i = 0; i < get_one_data.length; i++) {
              startdates.push(new Date(get_one_data[i].applicableDate));
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
              await empLeavePolicy.update(
                {
                  endDate: new Date(
                    new Date(applicableDate1).getTime() - 86400000,
                  ),
                  updateBy: req.userDetails.userMasterId,
                  updateByIp: createByIp,
                },
                {
                  where: {
                    applicableDate: nearestPastDate(
                      dateArr,
                      new Date(applicableDate1),
                    ),
                    userMasterID: userId,
                  },
                  transaction: t,
                },
              );
            }

            if (nearestFutureDate(dateArr, new Date(applicableDate1)) != null) {
              arrayToAddData.push({
                userMasterID: userId,
                employeeLeavePolicyID: employeeLeavePolicyID,
                applicableDate: applicableDate1,
                endDate:
                  nearestFutureDate(
                    dateArr,
                    new Date(applicableDate1),
                  ).getTime() - 86400000,
              });
            } else {
              arrayToAddData.push({
                userMasterID: userId,
                employeeLeavePolicyID: employeeLeavePolicyID,
                applicableDate: applicableDate1,
                createBy: createBy,
                createByIp: createByIp,
              });
            }
          } else {
            arrayToAddData.push({
              userMasterID: userId,
              employeeLeavePolicyID: employeeLeavePolicyID,
              applicableDate: applicableDate1,
              createBy: createBy,
              createByIp: createByIp,
            });
          }
        } else {
          await empLeavePolicy.update(
            {
              employeeLeavePolicyID: employeeLeavePolicyID,
              updateBy: req.userDetails.userMasterId,
              updateByIp: createByIp,
            },
            {
              where: { id: data.id },
              transaction: t,
            },
          );
        }
      }

      await empLeavePolicy.bulkCreate(arrayToAddData, {
        user: req.userDetails,
        transaction: t,
      });
    });

    return res.status(200).json({
      status: 200,
      message: 'Employee Leave Policy Added Successfully.',
    });
  } catch (error) {
    next(error);
  }
};

exports.getEmpLeavePolicyByUserId = async (req, res, next) => {
  try {
    let userMasterID = '';
    if (req.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    } else {
      userMasterID = req.params.id;
    }
    const get_one_data = await empLeavePolicy.findAll({
      raw: true,
      where: {
        userMasterID: userMasterID,
        status: 1,
      },
      order: [['applicableDate', 'ASC']],
    });
    if (get_one_data.length == 0) {
      //no logic require to execute
    } else if (get_one_data.length == 1) {
      if (
        new Date(get_one_data[0].applicableDate).toISOString().slice(0, 10) >
        new Date().toISOString().slice(0, 10)
      ) {
        get_one_data[0].leavePolicyStatus = 'deactive';
      } else {
        get_one_data[0].leavePolicyStatus = 'active';
      }
    } else {
      let startdates = [];
      for (let j = 0; j < get_one_data.length; j++) {
        startdates.push(new Date(get_one_data[j].applicableDate));
      }
      const dateArr = startdates.sort((a, b) => a - b);
      const nearestPastDate = (dateArr, date) => {
        const pastArr = dateArr.filter((n) => n <= date);
        return pastArr.length > 0 ? pastArr[pastArr.length - 1] : null;
      };
      const past = nearestPastDate(dateArr, new Date())
        .toISOString()
        .slice(0, 10);

      for (let i = 0; i < get_one_data.length; i++) {
        let D1 = new Date(get_one_data[i].applicableDate)
          .toISOString()
          .slice(0, 10);
        let D2;
        if (get_one_data[i].endDate == null) {
          D2 = null;
        } else {
          D2 = new Date(get_one_data[i].endDate).toISOString().slice(0, 10);
        }

        let D3 = new Date().toISOString().slice(0, 10);

        if (D3 >= D1 && D3 <= D2) {
          get_one_data[i].leavePolicyStatus = 'active';
        } else if (D2 == null && D1 <= D3) {
          get_one_data[i].leavePolicyStatus = 'active';
        } else if (D3 > D1) {
          if (D1 == past) {
            get_one_data[i].leavePolicyStatus = 'active';
          } else {
            get_one_data[i].leavePolicyStatus = 'deactive';
          }
        } else if (D3 == D1) {
          get_one_data[i].leavePolicyStatus = 'active';
        } else {
          get_one_data[i].leavePolicyStatus = 'deactive';
        }
      }
    }

    for (let item of get_one_data) {
      const leavePolicyData = await employeeLeavePolicy.findAll({
        raw: true,
        where: {
          id: item.employeeLeavePolicyID,
        },
      });

      const leavePolicyName = leavePolicyData.map((e) => {
        return {
          leavePolicyName: e.leavePolicyName,
          employeeLeavePolicyID: e.id,
          leaveId: e.leaveId,
          min_leave_attachment: e.min_leave_attachment,
          clubbedLeave: e.clubbedLeave,
          clubIDs: e.clubIDs,
          isHalfDayClubbing: e.isHalfDayClubbing,
        };
      });

      item.leavePolicy = leavePolicyName;
    }

    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.getEmpLeavePolicyByCompany = async (req, res, next) => {
  try {
    const { page, limit, search, companyMasterID } = req.query;

    const condition = {};

    if (search)
      condition[Op.or] = [
        { displayName: { [Op.iLike]: '%' + search + '%' } },
        { userNumber: { [Op.iLike]: '%' + search + '%' } },
      ];

    if (companyMasterID)
      condition.companyMasterId =
        req.userDetails.childCompanies.length > 0
          ? [...req.userDetails.childCompanies, req.userDetails.companyMasterId]
          : req.userDetails.companyMasterId;

    condition.status = 1;

    const paginatecondition =
      page && limit ? { offset: (page - 1) * limit, limit } : {};
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const userData = await UserMaster.findAndCountAll({
      // raw: true,
      where: { ...userAccessCondition.where, ...condition },
      ...paginatecondition,
      include: [
        ...userAccessCondition.includeModels,
        { model: empLeavePolicy, required: false },
      ],
      order: [['displayName', 'ASC']],
      attributes: [
        'displayName',
        'userNumber',
        'photo',
        'firstName',
        'lastName',
      ],
    });

    const user = userData.rows;

    for (let i = 0; i < user.length; i++) {
      const get_one_data = user[i].empLeavePolicies;

      if (get_one_data.length == 0) {
        //no logic require to execute
      } else if (get_one_data.length == 1) {
        if (
          new Date(get_one_data[0].applicableDate).toISOString().slice(0, 10) >
          new Date().toISOString().slice(0, 10)
        ) {
          get_one_data[0].dataValues.leavePolicyStatus = 'deactive';
        } else {
          get_one_data[0].dataValues.leavePolicyStatus = 'active';
        }
      } else {
        let startdates = [];
        for (let j = 0; j < get_one_data.length; j++) {
          startdates.push(new Date(get_one_data[j].applicableDate));
        }
        const dateArr = startdates.sort((a, b) => a - b);
        const nearestPastDate = (dateArr, date) => {
          const pastArr = dateArr.filter((n) => n <= date);
          return pastArr.length > 0 ? pastArr[pastArr.length - 1] : null;
        };
        const past = nearestPastDate(dateArr, new Date())
          .toISOString()
          .slice(0, 10);

        for (let k = 0; k < get_one_data.length; k++) {
          let D1 = new Date(get_one_data[k].applicableDate)
            .toISOString()
            .slice(0, 10);
          let D2;
          if (get_one_data[k].endDate == null) {
            D2 = null;
          } else {
            D2 = new Date(get_one_data[k].endDate).toISOString().slice(0, 10);
          }

          let D3 = new Date().toISOString().slice(0, 10);

          if (D3 >= D1 && D3 <= D2) {
            get_one_data[k].dataValues.leavePolicyStatus = 'active';
          } else if (D2 == null && D1 <= D3) {
            get_one_data[k].dataValues.leavePolicyStatus = 'active';
          } else if (D3 > D1) {
            if (D1 == past) {
              get_one_data[k].dataValues.leavePolicyStatus = 'active';
            } else {
              get_one_data[k].dataValues.leavePolicyStatus = 'deactive';
            }
          } else if (D3 == D1) {
            get_one_data[k].dataValues.leavePolicyStatus = 'active';
          } else {
            get_one_data[k].dataValues.leavePolicyStatus = 'deactive';
          }
        }
      }

      for (let item of get_one_data) {
        const leavePolicyData = await employeeLeavePolicy.findAll({
          raw: true,
          where: {
            id: item.employeeLeavePolicyID,
          },
        });

        item.dataValues.leavePolicyName = leavePolicyData
          .map((e) => e.leavePolicyName)
          .join(',');
      }
    }

    return res.status(200).json({
      status: 200,
      data: user,
      totalcount: userData.count,
    });
  } catch (error) {
    next(error);
  }
};
