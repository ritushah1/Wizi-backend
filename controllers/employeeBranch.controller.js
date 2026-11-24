const Sequelize = require('sequelize');
const EmployeeBranch = require('../models/employeeBranch');
const UserMaster = require('../models/userMaster');
const message = require('../response_message/message');
const sequelize = require('../config/database');
const BranchMaster = require('../models/branchMaster');
const {
  asiaKolkataDateTime,
  employeeWorkingLocation,
} = require('../utils/commonUtilFunctions');
const { userAttributes } = require('../utils/commonVars');
const EmployeeAttendancePolicy = require('../models/employeeAttendancePolicy');
const AttendancePolicy = require('../models/attendancePolicy');
const { attendanceBranchTypeRule } = require('../utils/dbUtils');

exports.postAddEmployeeBranch = async (req, res, next) => {
  try {
    let { userMasterID, branchMasterID, applicableDate } = req.body;
    let branchID = branchMasterID;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    const data = await EmployeeBranch.findOne({
      where: {
        userMasterID: userMasterID,
        applicableDate: new Date(applicableDate),
        status: 1,
      },
    });
    if (data) {
      await EmployeeBranch.update(
        {
          branchID: branchMasterID,
          updateBy: updateBy,
          updateByIp,
        },
        {
          where: {
            employeeBranchID: data.employeeBranchID,
          },
        },
      );
      return res.status(200).json({
        status: 200,
        message: message.usermessage.updateMessage('Employee Branch'),
        data: {},
      });
    }

    let get_one_data = await EmployeeBranch.findAll({
      where: {
        userMasterID: userMasterID,
        status: 1,
      },
    });

    if (get_one_data.length > 0) {
      const startdates = [];
      for (var i = 0; i < get_one_data.length; i++) {
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

      if (nearestPastDate(dateArr, new Date(applicableDate)) != null) {
        await EmployeeBranch.update(
          {
            endDate: new Date(new Date(applicableDate).getTime() - 86400000),
            updateBy,
            updateByIp,
          },
          {
            where: {
              applicableDate: nearestPastDate(
                dateArr,
                new Date(applicableDate),
              ),
              userMasterID: userMasterID,
            },
          },
        );
      }
      if (nearestFutureDate(dateArr, new Date(applicableDate)) != null) {
        await EmployeeBranch.create({
          userMasterID,
          branchID,
          applicableDate,
          endDate:
            nearestFutureDate(dateArr, new Date(applicableDate)).getTime() -
            86400000,
          createBy: updateBy,
          createByIp: updateByIp,
        });

        return res.status(200).json({
          status: 200,
          message: message.usermessage.addMessage('Employee Branch'),
          data: {},
        });
      } else {
        await sequelize.transaction(async (t) => {
          await EmployeeBranch.create(
            {
              userMasterID,
              branchID,
              applicableDate,
              createBy: updateBy,
              createByIp: updateByIp,
            },
            { transaction: t },
          );

          return res.status(200).json({
            status: 200,
            message: message.usermessage.addMessage('Employee Branch'),
            data: {},
          });
        });
      }
    } else {
      await sequelize.transaction(async (t) => {
        await EmployeeBranch.create(
          {
            userMasterID,
            branchID,
            applicableDate,
            createBy: updateBy,
            createByIp: updateByIp,
          },
          { transaction: t },
        );

        return res.status(200).json({
          status: 200,
          message: message.usermessage.addMessage('Employee Branch'),

          data: {},
        });
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.getEmployeeBranchByUserId = async (req, res, next) => {
  try {
    let userMasterID = req.params.id;
    if (req?.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }

    const get_one_data = await EmployeeBranch.findAll({
      where: {
        userMasterID: userMasterID,
        status: 1,
      },
      order: [['applicableDate', 'ASC']],
      include: [
        {
          model: BranchMaster,
          as: 'branchMaster',
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
          as: 'createdByUserDetails',
          attributes: userAttributes,
        },
      ],
    });

    if (get_one_data.length > 0) {
      if (get_one_data.length == 1) {
        get_one_data[0].dataValues.showDelete = true;
        if (
          new Date(get_one_data[0].applicableDate).toISOString().slice(0, 10) >
          new Date().toISOString().slice(0, 10)
        ) {
          get_one_data[0].dataValues.branchpolicystatus = 'deactive';
        } else {
          get_one_data[0].dataValues.branchpolicystatus = 'active';
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
          if (D3 == D1) {
            get_one_data[i].dataValues.branchpolicystatus = 'active';
            get_one_data[i].dataValues.showDelete = true;
          } else if (D3 >= D1 && D3 <= D2 && D3 == D1) {
            get_one_data[i].dataValues.branchpolicystatus = 'active';
            get_one_data[i].dataValues.showDelete = true;
          } else if (D2 == null && D1 <= D3) {
            get_one_data[i].dataValues.branchpolicystatus = 'active';
            get_one_data[i].dataValues.showDelete = true;
          } else if (D3 > D1) {
            if (D1 == past) {
              get_one_data[i].dataValues.branchpolicystatus = 'active';
              get_one_data[i].dataValues.showDelete = true;
            } else {
              get_one_data[i].dataValues.branchpolicystatus = 'deactive';
              get_one_data[i].dataValues.showDelete = false;
            }
          } else {
            get_one_data[i].dataValues.branchpolicystatus = 'deactive';
            get_one_data[i].dataValues.showDelete = true;
          }
        }
      }
    }
    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

/**
 * delete by i
 *
 * @param {id} employeeBranchID  to delete id
 */
exports.postDeleteEmployeeBranchById = async (req, res, next) => {
  try {
    const { employeeBranchID, userMasterID } = await req.body;

    const get_All_Data = await EmployeeBranch.findAll({
      where: {
        userMasterID: userMasterID,
        status: 1,
      },
    });

    const currentData = get_All_Data.find(
      (e) => e.employeeBranchID == employeeBranchID,
    );

    const get_one_data = get_All_Data.filter(
      (e) => e.employeeBranchID != employeeBranchID,
    );

    await sequelize.transaction(async (t) => {
      if (get_one_data.length > 0) {
        let startdates = [];
        for (let i = 0; i < get_one_data.length; i++) {
          startdates.push(new Date(get_one_data[i].applicableDate));
        }
        const dateArr = startdates.sort((a, b) => a - b);

        const get_previous_data = currentData;

        const nearestPastDate = (dateArr, date) => {
          const pastArr = dateArr.filter((n) => n <= date);
          return pastArr.length > 0 ? pastArr[pastArr.length - 1] : null;
        };

        const nearestFutureDate = (dateArr, date) => {
          const futArr = dateArr.filter((n) => n >= date);
          return futArr.length > 0 ? futArr[0] : null;
        };

        if (
          nearestPastDate(
            dateArr,
            new Date(get_previous_data.applicableDate),
          ) != null
        ) {
          if (
            nearestFutureDate(
              dateArr,
              new Date(get_previous_data.applicableDate),
            ) != null
          ) {
            await EmployeeBranch.update(
              {
                endDate:
                  nearestFutureDate(
                    dateArr,
                    new Date(get_previous_data.applicableDate),
                  ).getTime() - 86400000,
              },
              {
                where: {
                  applicableDate: nearestPastDate(
                    dateArr,
                    new Date(get_previous_data.applicableDate),
                  ),
                  userMasterID: userMasterID,
                },
                transaction: t,
              },
            );
          } else {
            await EmployeeBranch.update(
              {
                endDate: null,
              },
              {
                where: {
                  applicableDate: nearestPastDate(
                    dateArr,
                    new Date(get_previous_data.applicableDate),
                  ),
                  userMasterID: userMasterID,
                },
                transaction: t,
              },
            );
          }
        }
      }

      await EmployeeBranch.update(
        {
          status: 2,
        },
        {
          where: {
            employeeBranchID: employeeBranchID,
          },
        },
        { transaction: t },
      );
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Employe Branch'),
    });
  } catch (err) {
    next(err);
  }
};

exports.changeStatusByDate = async () => {
  try {
    const today = new Date();

    let get_data = await EmployeeBranch.findAll({
      attributes: ['userMasterID'],
      where: { applicableDate: today },
    });
    let users = [];
    get_data.forEach((user) => {
      users.push(user.userMasterID);
    });
    let department_active = await EmployeeBranch.update(
      {
        status: 1,
      },
      {
        where: {
          applicableDate: today,
          userMasterID: {
            [Sequelize.Op.in]: users,
          },
        },
      },
    );

    let deactive_prev = await EmployeeBranch.update(
      {
        status: 0,
        endDate: today,
      },
      {
        where: {
          userMasterID: {
            [Sequelize.Op.in]: users,
          },
          applicableDate: {
            [Sequelize.Op.ne]: today,
          },
        },
      },
    );
  } catch (err) {
    next(err);
  }
};

exports.getEmployeeBranchByAttendacePolicy = async (req, res, next) => {
  try {
    const date = asiaKolkataDateTime(new Date()).slice(0, 10);
    const userMasterID = req.params.id;
    const user_details = await UserMaster.findOne({
      where: {
        userMasterID,
        status: 1,
      },
      include: [
        {
          required: false,
          separate: true,
          model: EmployeeAttendancePolicy,
          where: {
            status: 1,
            startDate: {
              [Sequelize.Op.lte]: new Date(date),
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: new Date(date),
                },
              },
              {
                endDate: { [Sequelize.Op.eq]: null },
              },
            ],
          },
          attributes: ['attendancePolicyID'],
          include: [
            {
              model: AttendancePolicy,
              as: 'attendancePolicy',
            },
          ],
        },
        {
          separate: true,
          required: false,
          model: EmployeeBranch,
          where: {
            status: 1,
            applicableDate: {
              [Sequelize.Op.lte]: new Date(date),
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: new Date(date),
                },
              },
              {
                endDate: { [Sequelize.Op.eq]: null },
              },
            ],
          },
          attributes: ['branchID'],
          include: [
            {
              model: BranchMaster,
              as: 'branchMaster',
            },
          ],
        },
      ],
    });

    if (!user_details) {
      return res.status(200).json({
        status: 401,
        message: 'User details not found',
        data: {},
      });
    }
    const employeeAttendancePolicy =
      user_details?.employeeAttendancePolicies?.[0]?.attendancePolicy || null;
    const employeeBranch =
      user_details?.employeeBranches?.[0]?.branchMaster || null;

    const branchMasterCondition = {
      companyMasterID: req.userDetails.companyMasterId,
      status: 1,
    };
    if (employeeAttendancePolicy) {
      if (
        employeeAttendancePolicy.attBrType == attendanceBranchTypeRule.SELECTED
      ) {
        branchMasterCondition.branchMasterID = {
          [Sequelize.Op.in]: employeeAttendancePolicy.attBranch?.map((e) => +e),
        };
      } else if (
        employeeAttendancePolicy.attBrType == attendanceBranchTypeRule.ASSIGNED
      ) {
        if (employeeBranch) {
          branchMasterCondition.branchMasterID = +employeeBranch.branchMasterID;
        } else {
          return res.status(200).json({ status: 200, data: [] });
        }
      }
    }
    const responseArray = [];
    const all_company_branch = await BranchMaster.findAll({
      where: branchMasterCondition,
    });
    responseArray.push(...all_company_branch);
    const allWorkingLocation = await employeeWorkingLocation(
      userMasterID,
      new Date(date),
    );
    for (let location of allWorkingLocation) {
      const obj = {
        branchMasterID: location.workingLocationID,
        branchName: location.workingLocationName,
        branchCode: '',
        branchAddress: location.workingLocationAddress,
        latitude: location.latitude,
        longitude: location.longitude,
        radius: location.radius,
        status: location.status,
        companyMasterID: location.companyMasterID,
      };
      responseArray.push(obj);
    }
    return res.status(200).json({ status: 200, data: responseArray });
  } catch (err) {
    next(err);
  }
};
