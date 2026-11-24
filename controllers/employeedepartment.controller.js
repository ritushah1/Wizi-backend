const Sequelize = require('sequelize');
const UserMaster = require('../models/userMaster');
const EmployeeDepartment = require('../models/employeeDepartment');
const sequelize = require('../config/database');
const message = require('../response_message/message');
const Department = require('../models/department');
const { userAttributes } = require('../utils/commonVars');

exports.postAddEmployeeDepartment = async (req, res, next) => {
  try {
    let { userMasterID, departmentID, applicableDate } = req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    const data = await EmployeeDepartment.findOne({
      where: {
        userMasterID: userMasterID,
        applicableDate: new Date(applicableDate),
        status: 1,
      },
    });

    if (data) {
      await EmployeeDepartment.update(
        {
          departmentID,
          updateBy: updateBy,
          updateByIp,
        },
        {
          where: {
            employeeDepartmentID: data.employeeDepartmentID,
          },
        },
      );
      return res.status(200).json({
        status: 200,
        message: message.usermessage.updateMessage('Employee Department'),
        data: {},
      });
    }

    let get_one_data = await EmployeeDepartment.findAll({
      where: {
        userMasterID: userMasterID,
        status: 1,
      },
    });

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

      if (nearestPastDate(dateArr, new Date(applicableDate)) != null) {
        await EmployeeDepartment.update(
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
        await EmployeeDepartment.create({
          userMasterID,
          departmentID,
          applicableDate,
          endDate:
            nearestFutureDate(dateArr, new Date(applicableDate)).getTime() -
            86400000,
          createBy,
          createByIp,
        });
        return res.status(200).json({
          status: 200,
          message: message.usermessage.addMessage('Employee Department'),
          data: {},
        });
      } else {
        await sequelize.transaction(async (t) => {
          await EmployeeDepartment.create(
            {
              userMasterID,
              departmentID,
              applicableDate,
              createBy,
              createByIp,
            },
            { transaction: t },
          );
        });

        return res.status(200).json({
          status: 200,
          message: message.usermessage.addMessage('Employee Department'),
          data: {},
        });
      }
    } else {
      await sequelize.transaction(async (t) => {
        await EmployeeDepartment.create(
          {
            userMasterID,
            departmentID,
            applicableDate,
            createBy,
            createByIp,
          },
          { transaction: t },
        );
      });
      return res.status(200).json({
        status: 200,
        message: message.usermessage.addMessage('Employee Department'),
        data: {},
      });
    }

    // }
  } catch (err) {
    next(err);
  }
};

/**
 * find data with userMaster id
 *
 * @param {id} userMasterID  to fetch employee department
 */

exports.getEmployeeDepartmentByUserId = async (req, res, next) => {
  try {
    let userMasterID = req.params.id;
    if (req?.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }

    const get_one_data = await EmployeeDepartment.findAll({
      where: {
        userMasterID: userMasterID,
        status: 1,
      },
      order: [['applicableDate', 'ASC']],
      include: [
        {
          model: UserMaster,
          as: 'createdByUserDetails',
          attributes: userAttributes,
        },
        {
          model: Department,
          as: 'department',
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
      ],
    });

    if (get_one_data.length == 1) {
      get_one_data[0].dataValues.showDelete = true;
      if (
        new Date(get_one_data[0].applicableDate).toISOString().slice(0, 10) >
        new Date().toISOString().slice(0, 10)
      ) {
        get_one_data[0].dataValues.departmentstatus = 'deactive';
      } else {
        get_one_data[0].dataValues.departmentstatus = 'active';
      }
    } else {
      let startdates = [];
      for (let j = 0; j < get_one_data.length; j++) {
        startdates.push(new Date(get_one_data[j].applicableDate));
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
            get_one_data[i].dataValues.departmentstatus = 'active';
            get_one_data[i].dataValues.showDelete = true;
          } else if (D3 >= D1 && D3 <= D2 && D3 == D1) {
            get_one_data[i].dataValues.departmentstatus = 'active';
            get_one_data[i].dataValues.showDelete = true;
          } else if (D2 == null && D1 <= D3) {
            get_one_data[i].dataValues.departmentstatus = 'active';
            get_one_data[i].dataValues.showDelete = true;
          } else if (D3 > D1) {
            if (D1 == past) {
              get_one_data[i].dataValues.departmentstatus = 'active';
              get_one_data[i].dataValues.showDelete = true;
            } else {
              get_one_data[i].dataValues.departmentstatus = 'deactive';
              get_one_data[i].dataValues.showDelete = false;
            }
          } else {
            get_one_data[i].dataValues.departmentstatus = 'deactive';
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
 * update data
 *
 * @param {id} employeeDepartmentID  to update id
 */
exports.postUpdateEmployeeDepartment = async (req, res, next) => {
  try {
    let = {
      employeeDepartmentID,
      userMasterID,
      departmentID,
      applicableDate,
      updateBy,
      updateByIp,
    } = await req.body;

    let data = await EmployeeDepartment.findOne({
      where: {
        userMasterID: userMasterID,
        employeeDepartmentID: { [Sequelize.Op.notIn]: [employeeDepartmentID] },
        applicableDate: new Date(applicableDate),
        status: 1,
      },
    });
    if (!data) {
      let get_one_data = await EmployeeDepartment.findAll({
        where: {
          userMasterID: userMasterID,
          employeeDepartmentID: {
            [Sequelize.Op.notIn]: [employeeDepartmentID],
          },
          status: 1,
        },
      });

      if (get_one_data.length > 0) {
        startdates = [];
        for (var i = 0; i < get_one_data.length; i++) {
          startdates.push(new Date(get_one_data[i].applicableDate));
        }
        const dateArr = startdates.sort((a, b) => a - b);
        const reverse = dateArr.reverse();

        const nearestPastDate = (dateArr, date) => {
          const pastArr = dateArr.filter((n) => n <= date);
          return pastArr.length > 0 ? pastArr[pastArr.length - 1] : null;
        };

        const nearestFutureDate = (dateArr, date) => {
          const futArr = dateArr.filter((n) => n >= date);
          return futArr.length > 0 ? futArr[0] : null;
        };

        if (nearestPastDate(dateArr, new Date(applicableDate)) != null) {
          let date_change = await EmployeeDepartment.update(
            {
              endDate: new Date(new Date(applicableDate).getTime() - 86400000),
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
          let insert_db_status = await EmployeeDepartment.update(
            {
              userMasterID,
              departmentID,
              applicableDate,
              endDate:
                nearestFutureDate(dateArr, new Date(applicableDate)).getTime() -
                86400000,
              updateBy,
              updateByIp,
            },
            {
              where: {
                employeeDepartmentID: employeeDepartmentID,
              },
            },
          );

          res.status(200).json({
            status: 200,
            message: message.usermessage.employeedepartmentupdate,
            data: insert_db_status,
          });
          return insert_db_status;
        } else {
          let result = await sequelize.transaction(async (t) => {
            let insert_db_status = await EmployeeDepartment.update(
              {
                userMasterID,
                departmentID,
                applicableDate,
                updateBy,
                updateByIp,
              },
              {
                where: {
                  employeeDepartmentID: employeeDepartmentID,
                },
              },
              { transaction: t },
            );

            res.status(200).json({
              status: 200,
              message: message.usermessage.employeedepartmentupdate,
              data: insert_db_status,
            });
            return insert_db_status;
          });
        }
      } else {
        let result = await sequelize.transaction(async (t) => {
          let insert_db_status = await EmployeeDepartment.update(
            {
              userMasterID,
              departmentID,
              applicableDate,
              updateBy,
              updateByIp,
            },
            {
              where: {
                employeeDepartmentID: employeeDepartmentID,
              },
            },
            { transaction: t },
          );
          res.status(200).json({
            status: 200,
            message: message.usermessage.employeedepartmentupdate,
            data: insert_db_status,
          });
          return insert_db_status;
        });
      }
    } else {
      res.status(200).json({
        status: 401,
        message: message.usermessage.employeedepartmentpolicydate,
        data: {},
      });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * delete by i
 *
 * @param {id} employeeDepartmentID  to delete id
 */

exports.postDeleteEmployeeDepartmentById = async (req, res, next) => {
  try {
    const { employeeDepartmentID, userMasterID } = await req.body;

    const get_All_Data = await EmployeeDepartment.findAll({
      where: {
        userMasterID: userMasterID,
        status: 1,
      },
    });

    const get_one_data = get_All_Data.filter(
      (e) => e.employeeDepartmentID != employeeDepartmentID,
    );
    const current_Data = get_All_Data.find(
      (e) => e.employeeDepartmentID == employeeDepartmentID,
    );

    await sequelize.transaction(async (t) => {
      if (get_one_data.length > 0) {
        let startdates = [];
        for (let i = 0; i < get_one_data.length; i++) {
          startdates.push(new Date(get_one_data[i].applicableDate));
        }
        const dateArr = startdates.sort((a, b) => a - b);
        const get_previous_data = current_Data;

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
            await EmployeeDepartment.update(
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
            await EmployeeDepartment.update(
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

      await EmployeeDepartment.update(
        {
          status: 2,
        },
        {
          where: {
            employeeDepartmentID: employeeDepartmentID,
          },
        },
        { transaction: t },
      );
    });
    return res.status(200).json({
      status: 200,
      message: message.usermessage.employeedepartmentdelete,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * change status by applicable date
 *
 * @param {id} employeeDepartmentID  to change status of employee department
 */
exports.changeStatusByDate = async () => {
  try {
    // const today = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' });
    const today = new Date();

    let get_data = await EmployeeDepartment.findAll({
      attributes: ['userMasterID'],
      where: { applicableDate: today },
    });
    let users = [];
    get_data.forEach((user) => {
      users.push(user.userMasterID);
    });

    let result = await sequelize.transaction(async (t) => {
      let department_active = await EmployeeDepartment.update(
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
          transaction: t,
        },
      );

      let deactive_prev = await EmployeeDepartment.update(
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
          transaction: t,
        },
      );
      return deactive_prev;
    });
  } catch (err) {
    next(err);
  }
};

