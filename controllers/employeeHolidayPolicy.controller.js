const Sequelize = require('sequelize');
const EmployeeHolidayPolicy = require('../models/employeeHolidayPolicy');
const message = require('../response_message/message');
const UserMaster = require('../models/userMaster');
const sequelize = require('../config/database');
const {
  userDetails,
  getHolidayDates,
} = require('../utils/commonUtilFunctions');
const companyMaster = require('../models/companyMaster');
const holidayPolicy = require('../models/holidayPolicy');
const weekoffHolidayTran = require('../models/weekoffHolidayTran');
const { userAttributes } = require('../utils/commonVars');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');

exports.postAddEmployeeHolidayPolicy = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { userMasterID, holidayPolicyID, monthYear } = req.body;
    const year = monthYear.toString().substring(0, 4);
    const month = monthYear.toString().substring(5, 7);
    const applicableDate = `${year}-${month}-01`;
    const lastDateOfYear = new Date(year, 11, 31);
    const endDate = lastDateOfYear.toISOString().split('T')[0];

    const holidayPolicyExists = await holidayPolicy.findOne({
      raw: true,
      where: {
        holidayPolicyID,
        status: 1,
        holidayYear: {
          [Sequelize.Op.eq]: year,
        },
      },
      transaction,
    });

    if (!holidayPolicyExists) {
      await transaction.rollback();
      return res.status(400).json({
        message:
          'Cannot assign this Holiday Policy for the selected month/year',
      });
    }

    let employeeHolidayPolicyExist = await EmployeeHolidayPolicy.findOne({
      raw: true,
      where: {
        userMasterID,
        [Sequelize.Op.and]: [
          Sequelize.where(
            sequelize.fn('date', sequelize.col('applicableDate')),
            '=',
            applicableDate,
          ),
        ],
        status: 1,
      },
      transaction,
    });

    if (!employeeHolidayPolicyExist) {
      let employeeHolidayPolicy = await EmployeeHolidayPolicy.findAll({
        where: {
          userMasterID,
          status: 1,
        },
        transaction,
      });

      if (employeeHolidayPolicy.length > 0) {
        const startdates = employeeHolidayPolicy
          .map((policy) => new Date(policy.applicableDate))
          .sort((a, b) => a - b);

        const nearestPastDate = (dateArr, date) => {
          const pastArr = dateArr.filter((n) => n <= date);
          return pastArr.length > 0 ? pastArr[pastArr.length - 1] : null;
        };

        const nearestFutureDate = (dateArr, date) => {
          const futArr = dateArr.filter((n) => n >= date);
          return futArr.length > 0 ? futArr[0] : null;
        };

        const pastDate = nearestPastDate(startdates, new Date(applicableDate));

        const futureDate = nearestFutureDate(
          startdates,
          new Date(applicableDate),
        );

        if (pastDate != null) {
          await EmployeeHolidayPolicy.update(
            {
              endDate: new Date(new Date(applicableDate).getTime() - 86400000),
            },
            {
              where: {
                applicableDate: pastDate,
                userMasterID,
              },
              transaction,
            },
          );
        }

        if (futureDate != null) {
          await EmployeeHolidayPolicy.create(
            {
              userMasterID,
              holidayPolicyID,
              applicableDate,
              endDate: futureDate.getTime() - 86400000,
              createBy: req.userDetails.userMasterId,
              createByIp: req.userDetails.userIpAddress,
            },
            { transaction },
          );

          finalEndDate = futureDate.getTime() - 86400000;
        } else {
          await EmployeeHolidayPolicy.create(
            {
              userMasterID,
              holidayPolicyID,
              applicableDate,
              createBy: req.userDetails.userMasterId,
              createByIp: req.userDetails.userIpAddress,
            },
            { transaction },
          );
        }
      } else {
        await EmployeeHolidayPolicy.create(
          {
            userMasterID,
            holidayPolicyID,
            applicableDate,
            createBy: req.userDetails.userMasterId,
            createByIp: req.userDetails.userIpAddress,
          },
          { transaction },
        );
      }
    } else {
      finalEndDate = employeeHolidayPolicyExist.endDate;

      await EmployeeHolidayPolicy.update(
        {
          holidayPolicyID,
          updateBy: req.userDetails.userMasterId,
          updateByIp: req.userDetails.userIpAddress,
        },
        {
          where: {
            employeeholidayPolicyID:
              employeeHolidayPolicyExist.employeeholidayPolicyID,
          },
          transaction,
        },
      );
    }

    const userDetail = await userDetails(userMasterID);

    if (userDetail) {
      const start_Date = new Date(applicableDate).toISOString().slice(0, 10);

      let holidayDates = [];

      holidayDates = await getHolidayDates(
        holidayPolicyID,
        start_Date,
        endDate,
        userMasterID,
        transaction,
      );
      await weekoffHolidayTran.destroy(
        {
          where: {
            userMasterID,
            date: {
              [Sequelize.Op.and]: [
                { [Sequelize.Op.gte]: start_Date },
                { [Sequelize.Op.lte]: endDate },
              ],
            },
            tableName: 'holiday',
          },
        },
        { transaction },
      );

      await weekoffHolidayTran.bulkCreate(holidayDates, { transaction });
    }

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.assignMessage('Holiday Policy'),
    });
  } catch (err) {
    console.error(err);
    await transaction.rollback();
    next(err);
  }
};

exports.getEmployeeHolidayPolicyByUserId = async (req, res, next) => {
  try {
    let userMasterID = req.params.id;
    if (req?.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }
    let get_one_data = await EmployeeHolidayPolicy.findAll({
      where: {
        userMasterID: userMasterID,
        status: 1,
      },
      order: [['applicableDate', 'ASC']],
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
          model: holidayPolicy,
          as: 'HolidayPolicy',
        },
      ],
    });
    if (get_one_data.length == 0) {
    } else if (get_one_data.length == 1) {
      if (
        new Date(get_one_data[0].applicableDate).toISOString().slice(0, 10) >
        new Date().toISOString().slice(0, 10)
      ) {
        get_one_data[0].dataValues.holidaypolicystatus = 'deactive';
      } else {
        get_one_data[0].dataValues.holidaypolicystatus = 'active';
      }
    } else {
      let startdates = [];
      for (var j = 0; j < get_one_data.length; j++) {
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
      for (var i = 0; i < get_one_data.length; i++) {
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
        if (D3 == D1) {
          get_one_data[i].dataValues.holidaypolicystatus = 'active';
        } else if (D3 >= D1 && D3 <= D2 && D3 == D1) {
          get_one_data[i].dataValues.holidaypolicystatus = 'active';
        } else if (D2 == null && D1 <= D3) {
          get_one_data[i].dataValues.holidaypolicystatus = 'active';
        } else if (D3 > D1) {
          if (D1 == past) {
            get_one_data[i].dataValues.holidaypolicystatus = 'active';
          } else {
            get_one_data[i].dataValues.holidaypolicystatus = 'deactive';
          }
        } else {
          get_one_data[i].dataValues.holidaypolicystatus = 'deactive';
        }
      }
    }

    if (!get_one_data)
      res
        .status(200)
        .json({ status: 200, message: message.usermessage.deletedrecord });
    res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.postDeleteEmployeeHolidayPolicyById = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { employeeholidayPolicyID, userMasterID } = await req.body;
    let get_one_data = await EmployeeHolidayPolicy.findAll({
      where: {
        userMasterID: userMasterID,
        employeeholidayPolicyID: {
          [Sequelize.Op.notIn]: [employeeholidayPolicyID],
        },
        status: 1,
      },
    });
    if (get_one_data.length > 0) {
      let get_previous_data = await EmployeeHolidayPolicy.findOne({
        where: {
          employeeholidayPolicyID: employeeholidayPolicyID,
        },
      });
      let startdates = [];
      for (let i = 0; i < get_one_data.length; i++) {
        startdates.push({
          applicableDate: new Date(get_one_data[i].applicableDate),
          holidayPolicyID: get_one_data[i].holidayPolicyID,
        });
      }

      const dateArr = startdates.sort(
        (a, b) => a.applicableDate.getTime() - b.applicableDate.getTime(),
      );
      const year = get_previous_data.applicableDate
        .toISOString()
        .substring(0, 4);
      const lastDateOfYear = new Date(year, 11, 31);
      const endDate = lastDateOfYear.toISOString().split('T')[0];

      const nearestPastDate = (dateArr, date) => {
        const pastArr = dateArr.filter((n) => n.applicableDate <= date);
        return pastArr.length > 0 ? pastArr[pastArr.length - 1] : null;
      };
      const nearestFutureDate = (dateArr, date) => {
        const futArr = dateArr.filter((n) => n.applicableDate >= date);
        return futArr.length > 0 ? futArr[0] : null;
      };
      const pastDate = nearestPastDate(
        dateArr,
        new Date(get_previous_data.applicableDate),
      );
      const futureDate = nearestFutureDate(
        dateArr,
        new Date(get_previous_data.applicableDate),
      );

      if (pastDate != null) {
        if (futureDate != null) {
          await EmployeeHolidayPolicy.update(
            {
              endDate: futureDate.applicableDate,
            },
            {
              where: {
                applicableDate: pastDate.applicableDate,
                userMasterID: userMasterID,
              },
            },
            { transaction },
          );
          let holidayDates = [];

          holidayDates = await getHolidayDates(
            futureDate.holidayPolicyID,
            futureDate.applicableDate,
            endDate,
            userMasterID,
            transaction,
          );
          await weekoffHolidayTran.destroy(
            {
              where: {
                userMasterID,
                date: {
                  [Sequelize.Op.and]: [
                    { [Sequelize.Op.gte]: futureDate.applicableDate },
                    { [Sequelize.Op.lte]: endDate },
                  ],
                },
                tableName: get_previous_data.holidayPolicyID
                  ? ['holiday']
                  : 'holiday',
              },
            },
            { transaction },
          );
          await weekoffHolidayTran.bulkCreate(holidayDates, transaction);
        } else {
          await EmployeeHolidayPolicy.update(
            {
              endDate: null,
            },
            {
              where: {
                applicableDate: pastDate.applicableDate,
                userMasterID: userMasterID,
              },
            },
            { transaction },
          );
          let holidayDates1 = [];

          holidayDates1 = await getHolidayDates(
            pastDate.holidayPolicyID,
            pastDate.applicableDate,
            endDate,
            userMasterID,
            transaction,
          );
          await weekoffHolidayTran.destroy(
            {
              where: {
                userMasterID,
                date: {
                  [Sequelize.Op.and]: [
                    { [Sequelize.Op.gte]: pastDate.applicableDate },
                    { [Sequelize.Op.lte]: endDate },
                  ],
                },
                tableName: get_previous_data.holidayPolicyID
                  ? ['holiday']
                  : 'holiday',
              },
            },
            { transaction },
          );
          await weekoffHolidayTran.bulkCreate(holidayDates1, transaction);
        }
      }
    } else {
      await weekoffHolidayTran.destroy(
        {
          where: {
            userMasterID,
            tableName: 'holiday',
          },
        },
        { transaction },
      );
    }
    await EmployeeHolidayPolicy.update(
      {
        status: 2,
      },
      {
        where: {
          employeeholidayPolicyID: employeeholidayPolicyID,
        },
      },
      { transaction },
    );
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.EmployeeHolidayPolicydelete,
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getEmployeeHoliday = async (req, res, next) => {
  try {
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !req.body.companyMasterID,
    });
    let company_contact = await UserMaster.findAll({
      raw: true,
      where: {
        status: 1,
        companyMasterId: req.body.companyMasterID,
        ...userAccessCondition.where,
      },
      include: [...userAccessCondition.includeModels],
    });
    for (let i = 0; i < company_contact.length; i++) {
      let get_one_data = await EmployeeHolidayPolicy.findAll({
        where: {
          userMasterID: company_contact[i].userMasterID,
          status: {
            [Sequelize.Op.in]: [1],
          },
        },
        include: [
          {
            model: UserMaster,
            as: 'employee',
            include: [{ model: companyMaster }],
          },
          { model: holidayPolicy, as: 'HolidayPolicy' },
        ],
        order: [['applicableDate', 'ASC']],
      });
      company_contact[i]['department'] = get_one_data;

      if (get_one_data.length == 0) {
      } else if (get_one_data.length == 1) {
        if (
          new Date(get_one_data[0].applicableDate).toISOString().slice(0, 10) >
          new Date().toISOString().slice(0, 10)
        ) {
          get_one_data[0].status = 0;
        } else {
          get_one_data[0].status = 1;
        }
      } else {
        let startdates = [];
        for (var j = 0; j < get_one_data.length; j++) {
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

        for (var j = 0; j < get_one_data.length; j++) {
          let D1 = new Date(get_one_data[j].applicableDate)
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

    const totalcount = await UserMaster.count({
      raw: true,
      where: {
        status: 1,
        companyMasterId: req.body.companyMasterID,
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

exports.postAddEmployeeWeekoffBULK = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { userMasterID, holidayPolicyID, monthYear } = req.body;

    const year = monthYear.toString().substring(0, 4);
    const month = monthYear.toString().substring(5, 7);
    const applicableDate = `${year}-${month}-01`;
    const lastDateOfYear = new Date(year, 11, 31);
    const endDate = lastDateOfYear.toISOString().split('T')[0];

    const holidayPolicyExists = await holidayPolicy.findOne({
      raw: true,
      where: {
        holidayPolicyID,
        status: 1,
        holidayYear: {
          [Sequelize.Op.eq]: year,
        },
      },
      transaction,
    });
    if (!holidayPolicyExists) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message:
          'Cannot assign this Holiday Policy for the selected month/year',
      });
    }

    for (var n = 0; n < userMasterID.length; n++) {
      let finalEndDate = null;

      let employeeHolidayPolicyExist = await EmployeeHolidayPolicy.findOne({
        raw: true,
        where: {
          userMasterID: userMasterID[n],
          [Sequelize.Op.and]: [
            Sequelize.where(
              sequelize.fn('date', sequelize.col('applicableDate')),
              '=',
              applicableDate,
            ),
          ],
          status: 1,
        },
        transaction,
      });
      if (!employeeHolidayPolicyExist) {
        let employeeHolidayPolicy = await EmployeeHolidayPolicy.findAll({
          where: {
            userMasterID: userMasterID[n],
            status: 1,
          },
          transaction,
        });

        if (employeeHolidayPolicy.length > 0) {
          startdates = [];
          for (var i = 0; i < employeeHolidayPolicy.length; i++) {
            startdates.push(new Date(employeeHolidayPolicy[i].applicableDate));
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

          if (nearestPastDate(dateArr, new Date(applicableDate)) != null) {
            await EmployeeHolidayPolicy.update(
              {
                endDate: new Date(
                  new Date(applicableDate).getTime() - 86400000,
                ),
              },
              {
                where: {
                  applicableDate: nearestPastDate(
                    dateArr,
                    new Date(applicableDate),
                  ),
                  userMasterID: userMasterID[n],
                },
                transaction,
              },
            );
          }

          if (nearestFutureDate(dateArr, new Date(applicableDate)) != null) {
            let addEmpHolidayPolicy = await EmployeeHolidayPolicy.create(
              {
                userMasterID: userMasterID[n],
                holidayPolicyID,
                applicableDate,
                endDate:
                  nearestFutureDate(
                    dateArr,
                    new Date(applicableDate),
                  ).getTime() - 86400000,
                createBy: req.userDetails.userMasterId,
                createByIp: req.userDetails.userIpAddress,
              },
              { transaction },
            );
            finalEndDate =
              nearestFutureDate(dateArr, new Date(applicableDate)).getTime() -
              86400000;
          } else {
            await EmployeeHolidayPolicy.create(
              {
                userMasterID: userMasterID[n],
                holidayPolicyID,
                applicableDate,
                createBy: req.userDetails.userMasterId,
                createByIp: req.userDetails.userIpAddress,
              },
              { transaction },
            );
          }
        } else {
          await EmployeeHolidayPolicy.create(
            {
              userMasterID: userMasterID[n],
              holidayPolicyID,
              applicableDate,
              createBy: req.userDetails.userMasterId,
              createByIp: req.userDetails.userIpAddress,
            },
            { transaction },
          );
        }
      } else {
        finalEndDate = employeeHolidayPolicyExist.endDate;

        await EmployeeHolidayPolicy.update(
          {
            holidayPolicyID,
            updateBy: req.userDetails.userMasterId,
            updateByIp: req.userDetails.userIpAddress,
          },
          {
            where: {
              employeeholidayPolicyID:
                employeeHolidayPolicyExist.employeeholidayPolicyID,
            },
            transaction,
          },
        );
      }

      const userDetail = await userDetails(userMasterID[n]);
      if (userDetail) {
        const start_Date = new Date(applicableDate).toISOString().slice(0, 10);
        let holidayDates = await getHolidayDates(
          holidayPolicyID,
          start_Date,
          endDate,
          userMasterID[n],
          transaction,
        );

        await weekoffHolidayTran.destroy(
          {
            where: {
              userMasterID: userMasterID[n],
              date: {
                [Sequelize.Op.and]: [
                  { [Sequelize.Op.gte]: start_Date },
                  { [Sequelize.Op.lte]: endDate },
                ],
              },
              tableName: holidayPolicyID ? ['holiday'] : 'holiday',
            },
          },
          { transaction },
        );

        await weekoffHolidayTran.bulkCreate(holidayDates, { transaction });
      }
    }

    await transaction.commit();
    res
      .status(200)
      .json({ status: 200, message: 'Policy assigned Successfully' });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};
