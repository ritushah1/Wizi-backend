const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const companyMaster = require('../models/companyMaster');
const EmployeeFoodAllowancePolicy = require('../models/employeeFoodAllowancePolicy');
const FoodAllowancePolicy = require('../models/foodAllowancePolicy');
const UserMaster = require('../models/userMaster');
const SalaryPolicy = require('../models/employeeSalaryPolicy');
const Salary_policy = require('../models/salaryPolicy');
const hrLeavesMonthlyTrans = require('../models/hrLeavesMonthlyTrans');
const { userAttributes } = require('../utils/commonVars');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const {
  getMonthsDateByDate,
  getSalaryCycleDateAndMonthByDate,
} = require('../utils/commonUtilFunctions');
const moment = require('moment');

exports.getEmployeeFoodAllowancePolicyByCompany = async (req, res, next) => {
  try {
    const { page, limit, searchQuery, companyMasterID } = req.query;

    const condition = {};

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        { displayName: { [Sequelize.Op.iLike]: '%' + searchQuery + '%' } },
        { userNumber: { [Sequelize.Op.iLike]: '%' + searchQuery + '%' } },
      ];

    if (companyMasterID) {
      condition.companyMasterId = companyMasterID;
    }

    condition.status = 1;

    const paginatecondition =
      page && limit ? { offset: (page - 1) * limit, limit } : {};
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const userData = await UserMaster.findAndCountAll({
      raw: true,
      where: { ...userAccessCondition.where, ...condition },
      include: [...userAccessCondition.includeModels],
      ...paginatecondition,
      order: [['displayName', 'ASC']],
    });

    const user = userData.rows;

    let currdate1 = new Date(
      new Date().getFullYear() +
        '-' +
        ('0' + (new Date().getMonth() + 1)).slice(-2) +
        '-' +
        ('0' + new Date().getDate()).slice(-2),
    );

    for (let i = 0; i < user.length; i++) {
      const userMasterID = user[i].userMasterID;

      const get_one_data = await EmployeeFoodAllowancePolicy.findAll({
        raw: true,
        where: {
          userMasterID: userMasterID,
          status: 1,
        },
        include: [{ model: FoodAllowancePolicy }],
        order: [['startDate', 'ASC']],
      });

      if (get_one_data.length == 0) {
        //no logic require to execute
      } else if (get_one_data.length == 1) {
        if (
          new Date(get_one_data[0].startDate).toISOString().slice(0, 10) >
          new Date(currdate1).toISOString().slice(0, 10)
        ) {
          get_one_data[0].foodAllowancePolicyStatus = 'deactive';
        } else {
          get_one_data[0].foodAllowancePolicyStatus = 'active';
        }
      } else {
        let startdates = [];
        for (let j = 0; j < get_one_data.length; j++) {
          startdates.push(new Date(get_one_data[j].startDate));
        }
        const dateArr = startdates.sort((a, b) => a - b);
        const nearestPastDate = (dateArr, date) => {
          const pastArr = dateArr.filter((n) => n <= date);
          return pastArr.length > 0 ? pastArr[pastArr.length - 1] : null;
        };

        const past = nearestPastDate(dateArr, new Date(currdate1))
          ? nearestPastDate(dateArr, new Date(currdate1))
              .toISOString()
              .slice(0, 10)
          : null;
        for (let k = 0; k < get_one_data.length; k++) {
          let D1 = new Date(get_one_data[k].startDate)
            .toISOString()
            .slice(0, 10);
          let D2;
          if (get_one_data[k].endDate == null) {
            D2 = null;
          } else {
            D2 = new Date(get_one_data[k].endDate).toISOString().slice(0, 10);
          }

          let D3 = new Date(currdate1).toISOString().slice(0, 10);
          if (D3 >= D1 && D3 <= D2) {
            get_one_data[k].foodAllowancePolicyStatus = 'active';
          } else if (D2 == null && D1 <= D3) {
            get_one_data[k].foodAllowancePolicyStatus = 'active';
          } else if (D3 > D1) {
            if (D1 == past) {
              get_one_data[k].foodAllowancePolicyStatus = 'active';
            } else {
              get_one_data[k].foodAllowancePolicyStatus = 'deactive';
            }
          } else if (D3 == D1) {
            get_one_data[k].foodAllowancePolicyStatus = 'active';
          } else {
            get_one_data[k].foodAllowancePolicyStatus = 'deactive';
          }
        }
      }

      user[i].foodAllowancePolicyData = get_one_data;
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

exports.getByUserId = async (req, res, next) => {
  try {
    let userMasterID = req.params.id;
    if (req?.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }
    let currdate1 = new Date(
      new Date().getFullYear() +
        '-' +
        ('0' + (new Date().getMonth() + 1)).slice(-2) +
        '-' +
        ('0' + new Date().getDate()).slice(-2),
    );

    let get_one_data = await EmployeeFoodAllowancePolicy.findAll({
      raw: true,
      where: {
        userMasterID: userMasterID,
        status: 1,
      },
      include: [
        {
          model: UserMaster,
          as: 'createdByUserDetails',
          attributes: userAttributes,
        },
        {
          model: FoodAllowancePolicy,
          attributes: [
            'id',
            'foodAllowancePolicyName',
            'createBy',
            'updateBy',
            'createdAt',
            'updatedAt',
          ],
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
      order: [['startDate', 'ASC']],
      attributes: [
        'id',
        'startDate',
        'endDate',
        'createBy',
        'updateBy',
        'createdAt',
        'updatedAt',
      ],
    });
    if (get_one_data.length == 0) {
      //no logic require to execute
    } else if (get_one_data.length == 1) {
      if (
        new Date(get_one_data[0].startDate).toISOString().slice(0, 10) >
        new Date(currdate1).toISOString().slice(0, 10)
      ) {
        get_one_data[0].foodAllowancePolicyStatus = 'deactive';
      } else {
        get_one_data[0].foodAllowancePolicyStatus = 'active';
      }
    } else {
      let startdates = [];
      for (let j = 0; j < get_one_data.length; j++) {
        startdates.push(new Date(get_one_data[j].startDate));
      }
      const dateArr = startdates.sort((a, b) => a - b);
      const nearestPastDate = (dateArr, date) => {
        const pastArr = dateArr.filter((n) => n <= date);
        return pastArr.length > 0 ? pastArr[pastArr.length - 1] : null;
      };
      const past = nearestPastDate(dateArr, new Date(currdate1))
        ? nearestPastDate(dateArr, new Date(currdate1))
            .toISOString()
            .slice(0, 10)
        : null;
      for (let i = 0; i < get_one_data.length; i++) {
        let D1 = new Date(get_one_data[i].startDate).toISOString().slice(0, 10);
        let D2;
        if (get_one_data[i].endDate == null) {
          D2 = null;
        } else {
          D2 = new Date(get_one_data[i].endDate).toISOString().slice(0, 10);
        }

        let D3 = new Date(currdate1).toISOString().slice(0, 10);
        if (D3 >= D1 && D3 <= D2) {
          get_one_data[i].foodAllowancePolicyStatus = 'active';
        } else if (D2 == null && D1 <= D3) {
          get_one_data[i].foodAllowancePolicyStatus = 'active';
        } else if (D3 > D1) {
          if (D1 == past) {
            get_one_data[i].foodAllowancePolicyStatus = 'active';
          } else {
            get_one_data[i].foodAllowancePolicyStatus = 'deactive';
          }
        } else if (D3 == D1) {
          get_one_data[i].foodAllowancePolicyStatus = 'active';
        } else {
          get_one_data[i].foodAllowancePolicyStatus = 'deactive';
        }
      }
    }

    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.getDataBycompanyId = async (req, res, next) => {
  try {
    const { id } = req.params;

    const data = await FoodAllowancePolicy.findAll({
      raw: true,
      where: {
        companyMasterID: id,
        status: 1,
      },
    });

    return res.status(200).json({
      status: 200,
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

exports.addBulk = async (req, res, next) => {
  try {
    const { userMasterID, foodAllowancePolicyId, startDate } = await req.body;

    let assignedUser = [];
    let notassignedUser = [];

    let applicableDate1;

    const [allSalaryPolicy, allEmployeeFoodAllowancePolicy] = await Promise.all(
      [
        SalaryPolicy.findAll({
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
              model: Salary_policy,
              as: 'salaryPolicy', // Alias
            },
          ],
        }),
        EmployeeFoodAllowancePolicy.findAll({
          where: {
            userMasterID: {
              [Sequelize.Op.in]: userMasterID,
            },
            status: 1,
          },
        }),
      ],
    );

    const currentDate = moment().format('YYYY-MM-DD');

    await sequelize.transaction(async (t) => {
      for (let n = 0; n < userMasterID.length; n++) {
        const active_salary_policy =
          allSalaryPolicy.find((e) => e.userMasterID == userMasterID[n])
            ?.salaryPolicy || null;

        let finalDate = moment().format('YYYY-MM-DD');

        if (Number(startDate) == 0) {
          const date = getMonthsDateByDate(currentDate, -1);

          const { start_date, end_date, YYYYMM } =
            getSalaryCycleDateAndMonthByDate(active_salary_policy, date);
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
            getSalaryCycleDateAndMonthByDate(active_salary_policy, currentDate);
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
            getSalaryCycleDateAndMonthByDate(active_salary_policy, date);
          finalDate = start_date;
        }

        applicableDate1 = new Date(finalDate);

        const data = allEmployeeFoodAllowancePolicy.find(
          (e) =>
            e.userMasterID == userMasterID[n] &&
            new Date(e.startDate).toISOString().slice(0, 10) ==
              new Date(applicableDate1).toISOString().slice(0, 10),
        );

        if (!data) {
          const get_one_data = allEmployeeFoodAllowancePolicy.filter(
            (e) => e.userMasterID == userMasterID[n],
          );

          if (get_one_data.length > 0) {
            let startdates = []; // Fixed typo: `startDates` to `startdates`
            for (let i = 0; i < get_one_data.length; i++) {
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
              await EmployeeFoodAllowancePolicy.update(
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
                { user: req.userDetails, transaction: t },
              );
            }
            if (nearestFutureDate(dateArr, new Date(applicableDate1)) != null) {
              await EmployeeFoodAllowancePolicy.create(
                {
                  userMasterID: userMasterID[n],
                  foodAllowancePolicyId,
                  startDate: applicableDate1,
                  endDate:
                    nearestFutureDate(
                      dateArr,
                      new Date(applicableDate1),
                    ).getTime() - 86400000,
                },
                {
                  user: req.userDetails,
                  transaction: t,
                },
              );
            } else {
              await EmployeeFoodAllowancePolicy.create(
                {
                  userMasterID: userMasterID[n],
                  foodAllowancePolicyId,
                  startDate: applicableDate1,
                },
                { user: req.userDetails, transaction: t },
              );
            }
          } else {
            await EmployeeFoodAllowancePolicy.create(
              {
                userMasterID: userMasterID[n],
                foodAllowancePolicyId,
                startDate: applicableDate1,
              },
              { user: req.userDetails, transaction: t },
            );
          }
        } else {
          await EmployeeFoodAllowancePolicy.update(
            {
              foodAllowancePolicyId,
            },
            {
              where: {
                id: data.id,
              },
            },
            { user: req.userDetails, transaction: t },
          );
        }
      }
    });

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
      'Food Allowance policy has been assigned to (' +
      assignedUser.length +
      ') users.';

    let notassignname = Notassigned.length ? '<br><br>' : '';

    for (let i = 0; i < Notassigned.length; i++) {
      notassignname = notassignname + Notassigned[i].displayName + ',';
    }
    if (Notassigned.length > 0) {
      message =
        message +
        'Food Allowance policy has not been assigned to ' +
        notassignname +
        ' because attendance already verfied.';
    }

    res.status(200).json({ status: 200, message: message, data: {} });
  } catch (err) {
    next(err);
  }
};
