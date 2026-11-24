const Sequelize = require('sequelize');
const UserMaster = require('../models/userMaster');
const EmployeeAttendancePolicy = require('../models/employeeAttendancePolicy');
const AttendancePolicyModel = require('../models/attendancePolicy');
const sequelize = require('../config/database');
const message = require('../response_message/message');
const { asiaKolkataDateTime } = require('../utils/commonUtilFunctions');
const { userAttributes } = require('../utils/commonVars');
const EmployeeDesignation = require('../models/employeeDesignation');
const EmployeeDepartment = require('../models/employeeDepartment');
const EmployeeBranch = require('../models/employeeBranch');
const { policyScope } = require('../utils/dbUtils');
const AttendancePolicyBranch = require('../models/attendancePolicyBranch');
const AttendancePolicyDepartment = require('../models/attendancePolicyDepartment');
const AttendancePolicyDesignation = require('../models/attendancePolicyDesignation');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');

exports.postAddAttendancePolicy = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { userMasterID, attendancePolicyID, startDate } = req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    let data = await EmployeeAttendancePolicy.findOne(
      {
        raw: true,
        where: {
          userMasterID: userMasterID,
          startDate: new Date(startDate),
          status: 1,
        },
      },
      { transaction },
    );
    if (!data) {
      {
        let get_one_data = await EmployeeAttendancePolicy.findAll(
          {
            where: {
              userMasterID: userMasterID,
              status: 1,
            },
          },
          { transaction },
        );

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

          if (nearestPastDate(dateArr, new Date(startDate)) != null) {
            await EmployeeAttendancePolicy.update(
              {
                endDate: new Date(new Date(startDate).getTime() - 86400000),
              },
              {
                where: {
                  startDate: nearestPastDate(dateArr, new Date(startDate)),
                  userMasterID: userMasterID,
                },
              },
              { transaction },
            );
          }
          if (nearestFutureDate(dateArr, new Date(startDate)) != null) {
            await EmployeeAttendancePolicy.create(
              {
                userMasterID,
                attendancePolicyID,
                startDate,
                endDate:
                  nearestFutureDate(dateArr, new Date(startDate)).getTime() -
                  86400000,
                createBy,
                createByIp,
              },
              { transaction },
            );
          } else {
            await EmployeeAttendancePolicy.create(
              {
                userMasterID,
                attendancePolicyID,
                startDate,
                createBy,
                createByIp,
              },
              { transaction },
            );
          }
        } else {
          await EmployeeAttendancePolicy.create(
            {
              userMasterID,
              attendancePolicyID,
              startDate,
              createBy,
              createByIp,
            },
            { transaction },
          );
        }
      }
    } else {
      await EmployeeAttendancePolicy.update(
        {
          attendancePolicyID: attendancePolicyID,
          updateBy: createBy,
          updateByIp: createByIp,
        },
        {
          where: {
            employeeAttendancePolicyID: data.employeeAttendancePolicyID,
          },
        },
        { transaction },
      );
    }
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: 'Policy assigned successfully',
      data: {},
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getAttendancePolicyByUserId = async (req, res, next) => {
  try {
    let userMasterID = req.params.id;
    if (req?.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }
    let get_one_data = await EmployeeAttendancePolicy.findAll({
      where: {
        userMasterID: userMasterID,
        status: 1,
      },
      include: [
        {
          model: AttendancePolicyModel,
          as: 'attendancePolicy',
          include: [
            {
              model: UserMaster,
              as: 'createdByUserDetails',
              attributes: userAttributes,
            },
            {
              required: false,
              model: UserMaster,
              as: 'updatedByUserDetails',
              attributes: userAttributes,
            },
          ],
        },
        {
          model: UserMaster,
          as: 'employee',
        },
        {
          model: UserMaster,
          as: 'createdByUserDetails',
          attributes: userAttributes,
        },
      ],
      order: [['startDate', 'ASC']],
    });
    if (get_one_data.length == 0) {
    } else if (get_one_data.length == 1) {
      get_one_data[0].dataValues.showDelete = true;
      if (
        new Date(get_one_data[0].startDate).toISOString().slice(0, 10) >
        new Date().toISOString().slice(0, 10)
      ) {
        get_one_data[0].dataValues.attendancepolicystatus = 'deactive';
      } else {
        get_one_data[0].dataValues.attendancepolicystatus = 'active';
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
            get_one_data[i].dataValues.attendancepolicystatus = 'active';
            get_one_data[i].dataValues.showDelete = true;
          } else if (D3 >= D1 && D3 <= D2 && D3 == D1) {
            get_one_data[i].dataValues.attendancepolicystatus = 'active';
            get_one_data[i].dataValues.showDelete = true;
          } else if (D2 == null && D1 <= D3) {
            get_one_data[i].dataValues.attendancepolicystatus = 'active';
            get_one_data[i].dataValues.showDelete = true;
          } else if (D3 > D1) {
            if (D1 == past) {
              get_one_data[i].dataValues.attendancepolicystatus = 'active';
              get_one_data[i].dataValues.showDelete = true;
            } else {
              get_one_data[i].dataValues.attendancepolicystatus = 'deactive';
              get_one_data[i].dataValues.showDelete = false;
            }
          } else {
            get_one_data[i].dataValues.attendancepolicystatus = 'deactive';
            get_one_data[i].dataValues.showDelete = true;
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

exports.postDeletAttendancePolicyById = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { employeeAttendancePolicyID, userMasterID } = await req.body;
    const get_one_data = await EmployeeAttendancePolicy.findAll(
      {
        where: {
          userMasterID: userMasterID,
          employeeAttendancePolicyID: {
            [Sequelize.Op.notIn]: [employeeAttendancePolicyID],
          },
          status: 1,
        },
      },
      { transaction },
    );
    if (get_one_data.length > 0) {
      let startdates = [];
      for (var i = 0; i < get_one_data.length; i++) {
        startdates.push(new Date(get_one_data[i].startDate));
      }
      const dateArr = startdates.sort((a, b) => a - b);
      let get_previous_data = await EmployeeAttendancePolicy.findOne(
        {
          where: {
            employeeAttendancePolicyID: employeeAttendancePolicyID,
          },
        },
        { transaction },
      );

      const nearestPastDate = (dateArr, date) => {
        const pastArr = dateArr.filter((n) => n <= date);
        return pastArr.length > 0 ? pastArr[pastArr.length - 1] : null;
      };

      const nearestFutureDate = (dateArr, date) => {
        const futArr = dateArr.filter((n) => n >= date);
        return futArr.length > 0 ? futArr[0] : null;
      };

      const pastDate = nearestPastDate(
        dateArr,
        new Date(get_previous_data.startDate),
      );

      let futureDate = nearestFutureDate(
        dateArr,
        new Date(get_previous_data.startDate),
      );
      if (futureDate != null) {
        futureDate = futureDate.getTime() - 86400000;
      }

      if (pastDate != null) {
        if (futureDate != null) {
          await EmployeeAttendancePolicy.update(
            {
              endDate: futureDate,
            },
            {
              where: {
                startDate: pastDate,
                userMasterID: userMasterID,
              },
            },
            { transaction },
          );
        } else {
          await EmployeeAttendancePolicy.update(
            {
              endDate: null,
            },
            {
              where: {
                startDate: pastDate,
                userMasterID: userMasterID,
              },
            },
            { transaction },
          );
        }
      }
    }

    await EmployeeAttendancePolicy.update(
      {
        status: 2,
      },
      {
        where: {
          employeeAttendancePolicyID: employeeAttendancePolicyID,
        },
      },
      { transaction },
    );

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.employeeattendancepolicydelete,
      // data: insert_db_status,
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getAttendancePolicy = async (req, res, next) => {
  try {
    let { limit, page, companyMasterID } = await req.body;
    let offset = (page - 1) * limit;

    if (companyMasterID) req.userDetails.accessibleCompanies = companyMasterID;
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
      let get_one_data = await EmployeeAttendancePolicy.findAll({
        where: {
          userMasterID: company_contact[i].userMasterID,
          status: {
            [Sequelize.Op.in]: [1],
          },
        },
        include: [
          {
            model: AttendancePolicyModel,
            as: 'attendancePolicy',
          },
        ],
        order: [['startDate', 'ASC']],
        limit: limit,
        offset: offset,
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

    totalcount = await UserMaster.count({
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

exports.postAddAllPolicyBULKATTENDANCE = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { userMasterID, attendancePolicyID, startDate } = req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    for (let n = 0; n < userMasterID.length; n++) {
      let data = await EmployeeAttendancePolicy.findOne(
        {
          raw: true,
          where: {
            userMasterID: userMasterID[n],
            startDate: new Date(startDate),
            status: 1,
          },
        },
        { transaction },
      );
      if (!data) {
        {
          let get_one_data = await EmployeeAttendancePolicy.findAll(
            {
              where: {
                userMasterID: userMasterID[n],
                status: 1,
              },
            },
            { transaction },
          );

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
            const pastDate = nearestPastDate(dateArr, new Date(startDate));

            const futureDate = nearestFutureDate(dateArr, new Date(startDate));
            if (pastDate != null) {
              await EmployeeAttendancePolicy.update(
                {
                  endDate: new Date(new Date(startDate).getTime() - 86400000),
                },
                {
                  where: {
                    startDate: pastDate,
                    userMasterID: userMasterID[n],
                  },
                },
                { transaction },
              );
            }
            if (futureDate != null) {
              await EmployeeAttendancePolicy.create(
                {
                  userMasterID: userMasterID[n],
                  attendancePolicyID,
                  startDate,
                  endDate: futureDate,
                  createBy,
                  createByIp,
                },
                { transaction },
              );
            } else {
              // let result = await sequelize.transaction(async (t) => {
              await EmployeeAttendancePolicy.create(
                {
                  userMasterID: userMasterID[n],
                  attendancePolicyID,
                  startDate,
                  createBy,
                  createByIp,
                },
                { transaction },
              );
              // });
            }
          } else {
            // let result = await sequelize.transaction(async (t) => {
            await EmployeeAttendancePolicy.create(
              {
                userMasterID: userMasterID[n],
                attendancePolicyID,
                startDate,
                createBy,
                createByIp,
              },
              { transaction },
            );
            // });
          }
        }
      } else {
        await EmployeeAttendancePolicy.update(
          {
            attendancePolicyID: attendancePolicyID,
            updateBy: createBy,
            updateByIp: createByIp,
          },
          {
            where: {
              employeeAttendancePolicyID: data.employeeAttendancePolicyID,
            },
          },
          { transaction },
        );
      }
    }

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: 'Policy assigned successfully',
    });
    // }
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};
