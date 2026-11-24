const Sequelize = require('sequelize');
const EmployeeDesignation = require('../models/employeeDesignation');
const sequelize = require('../config/database');
const UserMaster = require('../models/userMaster');
const companyMaster = require('../models/companyMaster');
const logger = require('../config/logger');
const message = require('../response_message/message');
var nearest = require('nearest-date');
const attendanceTransaction = require('../models/attendanceTransaction');
const Designation = require('../models/designation');
const { userAttributes } = require('../utils/commonVars');

/**
 * save employee designation data.
 *
 * @body {createBy} createBy user id of user who added the employee designation.
 * @body {number} createBy if any user change data then updateBy id change.
 
 */

exports.postAddEmployeeDesignation = async (req, res, next) => {
  try {
    let { userMasterID, designationID, applicableDate } = req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    const data = await EmployeeDesignation.findOne({
      where: {
        userMasterID: userMasterID,
        applicableDate: new Date(applicableDate),
        status: 1,
      },
    });

    if (data) {
      await EmployeeDesignation.update(
        {
          designationID: designationID,
          updateBy,
          updateByIp,
        },
        {
          where: {
            employeeDesignationID: data.employeeDesignationID,
          },
        },
      );
      return res.status(200).json({
        status: 200,
        message: message.usermessage.updateMessage('Employee Designation'),
        data: {},
      });
    }

    let get_one_data = await EmployeeDesignation.findAll({
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
        await EmployeeDesignation.update(
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
        await sequelize.transaction(async (t) => {
          await EmployeeDesignation.create(
            {
              userMasterID,
              designationID,
              applicableDate,
              endDate:
                nearestFutureDate(dateArr, new Date(applicableDate)).getTime() -
                86400000,
              createBy,
              createByIp,
            },
            { transaction: t },
          );
        });

        return res.status(200).json({
          status: 200,
          message: message.usermessage.employeedesignationadd,
          data: {},
        });
      } else {
        await sequelize.transaction(async (t) => {
          await EmployeeDesignation.create(
            {
              userMasterID,
              designationID,
              applicableDate,
              createBy,
              createByIp,
            },
            { transaction: t },
          );
        });

        return res.status(200).json({
          status: 200,
          message: message.usermessage.employeedesignationadd,
          data: {},
        });
      }
    } else {
      await sequelize.transaction(async (t) => {
        await EmployeeDesignation.create(
          {
            userMasterID,
            designationID,
            applicableDate,
            createBy,
            createByIp,
          },
          { transaction: t },
        );
      });

      return res.status(200).json({
        status: 200,
        message: message.usermessage.employeedesignationadd,
        data: {},
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.getEmployeeDesignationByUserId = async (req, res, next) => {
  try {
    let userMasterID = req.params.id;
    if (req?.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }

    const get_one_data = await EmployeeDesignation.findAll({
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
          model: Designation,
          as: 'designation',
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
    if (get_one_data.length == 1) {
      get_one_data[0].dataValues.showDelete = true;
      if (
        new Date(get_one_data[0].applicableDate).toISOString().slice(0, 10) >
        new Date().toISOString().slice(0, 10)
      ) {
        get_one_data[0].dataValues.designationstatus = 'deactive';
      } else {
        get_one_data[0].dataValues.designationstatus = 'active';
      }
    } else {
      let startdates = [];
      for (let j = 0; j < get_one_data.length; j++) {
        startdates.push(new Date(get_one_data[j].dataValues.applicableDate));
      }
      if (startdates.length > 0) {
        const dateArr = startdates.sort((a, b) => a - b);
        const nearestPastDate = (dateArr, date) => {
          const pastArr = dateArr.filter((n) => n <= date);
          return pastArr.length > 0 ? pastArr[pastArr.length - 1] : null;
        };
        let past = nearestPastDate(dateArr, new Date());

        if (past != null) {
          past = past.toISOString().slice(0, 10);
        }
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
            get_one_data[i].dataValues.designationstatus = 'active';
            get_one_data[i].dataValues.showDelete = true;
          } else if (D3 >= D1 && D3 <= D2 && D3 == D1) {
            get_one_data[i].dataValues.designationstatus = 'active';
            get_one_data[i].dataValues.showDelete = true;
          } else if (D2 == null && D1 <= D3) {
            get_one_data[i].dataValues.designationstatus = 'active';
            get_one_data[i].dataValues.showDelete = true;
          } else if (D3 > D1) {
            if (D1 == past) {
              get_one_data[i].dataValues.designationstatus = 'active';
              get_one_data[i].dataValues.showDelete = true;
            } else {
              get_one_data[i].dataValues.designationstatus = 'deactive';
              get_one_data[i].dataValues.showDelete = false;
            }
          } else {
            get_one_data[i].dataValues.designationstatus = 'deactive';
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

exports.postDeleteEmployeeDesignationById = async (req, res, next) => {
  try {
    const { employeeDesignationID, userMasterID } = await req.body;

    const get_All_Data = await EmployeeDesignation.findAll({
      where: {
        userMasterID: userMasterID,
        status: 1,
      },
    });

    const get_one_data = get_All_Data.filter(
      (e) => e.employeeDesignationID != employeeDesignationID,
    );

    const current_Data = get_All_Data.find(
      (e) => e.employeeDesignationID == employeeDesignationID,
    );

    await sequelize.transaction(async (t) => {
      if (get_one_data.length > 0) {
        let startdates = [];
        for (var i = 0; i < get_one_data.length; i++) {
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
            await EmployeeDesignation.update(
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
            await EmployeeDesignation.update(
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

      await EmployeeDesignation.update(
        {
          status: 2,
        },
        {
          where: {
            employeeDesignationID: employeeDesignationID,
          },
        },
        { transaction: t },
      );
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.employeedesignationdelete,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * change status by applicable date
 *
 * @param {id} employeeDesignationID  to change status of employee designation
 */
exports.changeStatusByDate = async () => {
  try {
    // const today = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' });
    const today = new Date();
    let get_data = await EmployeeDesignation.findAll({
      attributes: ['userMasterID'],
      where: { applicableDate: today },
    });
    let users = [];
    get_data.forEach((user) => {
      users.push(user.userMasterID);
    });
    let result = await sequelize.transaction(async (t) => {
      let designation_active = await EmployeeDesignation.update(
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

      let deactive_prev = await EmployeeDesignation.update(
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
