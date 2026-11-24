const Sequelize = require('sequelize');
const HrLeaveTypes = require('../models/hrLeaveTypes');
const HrLeaveMaster = require('../models/hrLeaveMaster');
const UserMaster = require('../models/userMaster');
const companyMaster = require('../models/companyMaster');
const logger = require('../config/logger');
const sequelize = require('../config/database');
const message = require('../response_message/message');
const hrLeaveBalance = require('../models/hrLeaveBalance');
const EmployeeSalaryPolicy = require('../models/employeeSalaryPolicy');
const SalaryPolicy = require('../models/salaryPolicy');
const { daysInMonth } = require('../utils/commonUtilFunctions');
const { generateExcel } = require('../utils/exportData');
const path = require('path');
const { statusCodes } = require('../utils/commonVars');
const { listLeaveTypesFrom } = require('../utils/dbUtils');
const empLeavePolicy = require('../models/empLeavePolicy');
const employeeLeavePolicy = require('../models/employeeLeavePolicy');
const moment = require('moment');

/**
 * save hr Leave Types fields data.
 *
 * @body {createBy} createBy user id of user who added the hr salary field.
 * @body {number} createBy if any user change data then updateBy id change.
 
 */

exports.postAddHrLeaveTypes = async (req, res, next) => {
  try {
    let {
      LeaveID,
      companyMasterID,
      SortIndex,
      Leave_Allow,
      leaveTypeChange = true,
    } = await req.body;

    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    let uniquedata = await HrLeaveTypes.findOne({
      where: {
        LeaveID: LeaveID,
        companyMasterID: companyMasterID,
        status: 1,
      },
    });
    if (uniquedata) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.leavetypealreadyexist,
      });
    }
    await sequelize.transaction(async (t) => {
      await HrLeaveTypes.create(
        {
          LeaveID,
          companyMasterID,
          SortIndex,
          Leave_Allow,
          createBy,
          createByIp,
          leaveTypeChange,
        },
        { transaction: t },
      );

      const CF_LeaveData = await HrLeaveMaster.findOne({
        where: {
          CF_LeaveID: LeaveID,
          status: 1,
        },
      });

      if (CF_LeaveData) {
        // Create CF Leave Type
        await HrLeaveTypes.create(
          {
            LeaveID: CF_LeaveData.LeaveID,
            companyMasterID,
            SortIndex,
            Leave_Allow: 'N',
            createBy,
            createByIp,
            leaveTypeChange,
          },
          { transaction: t },
        );
      }
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.HrLeaveTypesadd,
      // data: insert_db_status,
    });
  } catch (err) {
    next(err);
  }
};

exports.getHrLeaveTypesByCompany = async (req, res, next) => {
  try {
    const { companyMasterID, limit, page, searchQuery, exportData } =
      await req.body;

    const condition = {};

    condition.status = [0, 1];

    if (companyMasterID) condition.companyMasterID = companyMasterID;

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          '$LeaveMaster.LeaveName$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          '$companyMaster.companyName$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
      ];

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const order = [['createdAt', 'DESC']];

    const hrLeaveTypes = await HrLeaveTypes.findAndCountAll({
      where: condition,
      ...paginationQuery,
      order,
      include: [
        {
          model: companyMaster,
          attributes: ['companyName'],
        },
        {
          model: HrLeaveMaster,
          as: 'LeaveMaster',
          where: {
            CF_LeaveID: {
              [Sequelize.Op.is]: null,
            },
          },
        },
      ],
    });
    for (var j = 0; j < hrLeaveTypes.rows.length; j++) {
      let user1 = await UserMaster.findOne({
        raw: true,
        where: {
          userMasterID: hrLeaveTypes.rows[j].createBy,
        },
      });
      let user2 = await UserMaster.findOne({
        raw: true,
        where: {
          userMasterID: hrLeaveTypes.rows[j].updateBy,
        },
      });

      if (user1) {
        hrLeaveTypes.rows[j].createBy = user1.displayName;
      }
      if (user2) {
        hrLeaveTypes.rows[j].updateBy = user2.displayName;
      }
    }
    if (exportData) {
      const finalData = [];
      for (let i = 0; i < hrLeaveTypes.rows.length; i++) {
        const data1 = {
          LeaveName: hrLeaveTypes.rows[i].LeaveMaster.LeaveName,
          CompanyName: hrLeaveTypes.rows[i].companyMaster.companyName,
          Description: hrLeaveTypes.rows[i].LeaveMaster.LeaveDesc,
          Status: hrLeaveTypes.rows[i].status,
        };
        data1.Status == 1
          ? (data1.Status = 'Active')
          : (data1.Status = 'Deactive');
        finalData.push(data1);
      }

      await generateExcel(finalData, 'Leave_Types', 'xlsx', res);
      return;
    }

    return res.status(200).json({
      status: 200,
      data: hrLeaveTypes.rows,
      totalcount: hrLeaveTypes.count,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * find data with LeaveTypes id
 *
 * @param {id} LeaveTranId  to fetch Payhead name
 */

exports.getHrLeaveTypesById = async (req, res, next) => {
  try {
    let get_one_data = await HrLeaveTypes.findOne({
      where: {
        LeaveTranId: req.params.id,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      raw: true,
    });

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

/**
 * update data
 *
 * @param {id} LeaveTranId  to update id
 */
exports.postUpdateHrLeaveTypes = async (req, res, next) => {
  try {
    let {
      LeaveTranId,
      LeaveID,
      SortIndex,
      Leave_Allow,
      companyMasterID,
      leaveTypeChange = true,
    } = await req.body;

    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;

    let uniquedata = await HrLeaveTypes.findOne({
      where: {
        LeaveID: LeaveID,
        companyMasterID: companyMasterID,
        LeaveTranId: { [Sequelize.Op.notIn]: [LeaveTranId] },
        status: 1,
      },
    });
    if (uniquedata) {
      res.status(200).json({
        status: 401,
        message: message.usermessage.leavetypealreadyexist,
      });
    } else {
      let change_data_status = await HrLeaveTypes.update(
        {
          LeaveID,
          SortIndex,
          Leave_Allow,
          updateBy,
          updateByIp,
          leaveTypeChange,
        },
        {
          where: { LeaveTranId: LeaveTranId },
        },
      );

      res
        .status(200)
        .json({ status: 200, message: message.usermessage.HrLeaveTypesUpdate });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * update status
 *
 * @param {id} LeaveTranId  to update status of Payhead
 */

exports.poststatuschange = async (req, res, next) => {
  try {
    let = { LeaveTranId, status } = await req.body;
    let delete_status;
    if (status == '1') {
      delete_status = await HrLeaveTypes.update(
        {
          status: '1',
        },
        {
          where: { LeaveTranId: LeaveTranId, status: ['1', '0'] },
        },
      );
    } else {
      let data = await hrLeaveBalance.findOne({
        where: {
          LeaveTranId: LeaveTranId,
        },
      });

      if (data) {
        return res.status(200).json({
          status: 401,
          message:
            'You can not deactive this leaveType. Already assigned to employees.',
        });
      } else {
        delete_status = await HrLeaveTypes.update(
          {
            status: '0',
          },
          {
            where: { LeaveTranId: LeaveTranId, status: ['1', '0'] },
          },
        );
      }
    }

    if (delete_status != 0) {
      res.status(200).json({
        status: 200,
        message: message.usermessage.payheaddelete,
        data: {},
      });
    } else {
      res.status(200).json({
        status: 200,
        message: message.usermessage.deletedrecord,
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
 * @param {id} LeaveTranId  to delete id
 */
exports.postDeleteHrLeaveTypeById = async (req, res, next) => {
  try {
    let { LeaveTranId } = await req.body;

    let data = await hrLeaveBalance.findOne({
      where: {
        LeaveTranId: LeaveTranId,
      },
    });

    if (data) {
      return res.status(200).json({
        status: 401,
        message:
          'You can not delete this leaveType. Already assigned to employees.',
      });
    }

    const currentLeave = await HrLeaveTypes.findOne({
      where: {
        LeaveTranId: LeaveTranId,
      },
    });

    if (!currentLeave) throw new Error('LeaveType not found!');

    await sequelize.transaction(async (t) => {
      currentLeave.status = 2;

      await currentLeave.save({ transaction: t });

      const findCFData = await HrLeaveTypes.findOne({
        where: {
          status: 1,
        },
        include: [
          {
            required: true,
            model: HrLeaveMaster,
            as: 'LeaveMaster',
            where: { CF_LeaveID: currentLeave.LeaveID, status: 1 },
            attributes: [],
          },
        ],
      });

      if (findCFData) {
        findCFData.status = 2;
        await findCFData.save({ transaction: t });
      }
    });

    return res
      .status(200)
      .json({ status: 200, message: 'Leave Type Deleted Successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * import Hr Leave Types  data
 * @param {file}
 */
exports.postImportData = async (req, res, next) => {
  try {
    const file = req.file;
    let { createBy, createByIp } = req.body;

    if (!file) {
      const error = new Error('No File');
      error.httpStatusCode = 400;
      return next(error);
    } else {
      const filePath = path.join(__dirname, `../uploads/${req.file.filename}`);

      fs.readFile(filePath, async (err, data) => {
        if (err) throw err;

        const HrLeaveTypes = JSON.parse(data);

        let insert_db_status = await HrLeaveTypes.bulkCreate(HrLeaveTypes, {
          returning: true,
        });

        res.json({ success: 200, message: 'data inserted' });
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.listDataWithoutOutdoorDuty = async (req, res, next) => {
  try {
    const { id } = req.params;

    const data = await HrLeaveTypes.findAll({
      where: {
        LeaveID: {
          [Sequelize.Op.notIn]: [5, 18, 25],
        },
        status: 1,
        companyMasterID: id,
        Leave_Allow: 'Y',
      },
      include: [{ model: HrLeaveMaster, as: 'LeaveMaster' }],
    });

    return res.status(200).json({
      status: 200,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// --------------- add default leave type in all company ---------------

exports.addDefaultLeaveTypeInAllCompany = async (req, res, next) => {
  try {
    const { leaveID } = req.body;

    const allCompany = await companyMaster.findAll({
      where: {
        status: [0, 1],
      },
      attributes: ['companyMasterID', 'createBy', 'createByIp'],
    });

    const allLeaveTypes = await HrLeaveTypes.findAll({
      where: {
        companyMasterID: {
          [Sequelize.Op.in]: allCompany.map((e) => e.companyMasterID),
        },
        status: 1,
        LeaveID: leaveID,
      },
    });

    const finalData = [];

    for (const company of allCompany) {
      const companyMasterID = company.companyMasterID;
      const data = allLeaveTypes.find(
        (e) => e.companyMasterID == companyMasterID,
      );

      if (data) continue;

      finalData.push({
        LeaveID: leaveID,
        companyMasterID,
        Leave_Allow: 'N',
        leaveTypeChange: false,
        createBy: company.createBy,
        createByIp: company.createByIp,
      });
    }

    await HrLeaveTypes.bulkCreate(finalData);

    return res.status(200).json({
      status: 200,
      message: 'data added successfully.',
      recordAdded: finalData.length,
    });
  } catch (error) {
    next(error);
  }
};

exports.listLeaveTypeForManageLeave = async (req, res, next) => {
  try {
    const { id } = req.params;

    const data = await HrLeaveTypes.findAll({
      where: {
        LeaveID: {
          [Sequelize.Op.notIn]: [5, 18, 25],
        },
        status: 1,
        companyMasterID: id,
        Leave_Allow: 'Y',
      },
      include: [{ model: HrLeaveMaster, as: 'LeaveMaster' }],
    });

    return res.status(200).json({
      status: 200,
      data,
    });
  } catch (error) {
    next(error);
  }
};

exports.leaveTypesByUser = async (req, res, next) => {
  try {
    const { companyMasterID } = req.body;
    let { userMasterID } = req.body;

    if (!companyMasterID)
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: message.usermessage.requiredMessage('companyMasterID'),
      });

    const condition = {
      companyMasterID,
      status: 1,
      Leave_Allow: 'Y',
      LeaveID: {
        [Sequelize.Op.notIn]: [5, 25],
      },
    };

    let leaveTypes = await HrLeaveTypes.findAll({
      raw: true,
      where: condition,
      include: [{ model: HrLeaveMaster, as: 'LeaveMaster', attributes: [] }],
      order: [['LeaveTranId', 'ASC']],
      attributes: [
        [Sequelize.col('LeaveMaster.LeaveName'), 'leavename'],
        [Sequelize.col('LeaveMaster.LeaveDesc'), 'leavedesc'],
        ['LeaveTranId', 'leavetran'],
        ['LeaveID', 'leaveid'],
      ],
    });

    const currentDate = moment().format('YYYY-MM-DD');

    if (!userMasterID) userMasterID = req.userDetails.userMasterId;

    const employee_LeavePolicy = await empLeavePolicy.findOne({
      where: {
        userMasterID,
        status: 1,
        applicableDate: { [Sequelize.Op.lte]: new Date(currentDate) },
        [Sequelize.Op.or]: [
          {
            endDate: { [Sequelize.Op.gte]: new Date(currentDate) },
          },
          {
            endDate: { [Sequelize.Op.eq]: null },
          },
        ],
      },
    });

    if (employee_LeavePolicy) {
      const policyIds = employee_LeavePolicy.employeeLeavePolicyID || [];

      const leavePolicy = await employeeLeavePolicy.findAll({
        where: {
          id: {
            [Sequelize.Op.in]: policyIds,
          },
          applyLeave: false,
        },
      });

      const leaveIds = leavePolicy.map((e) => +e.leaveId);

      leaveTypes = leaveTypes.filter((e) => !leaveIds.includes(+e.leaveid));
    }

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data: leaveTypes,
    });
  } catch (error) {
    next(error);
  }
};
