const Sequelize = require("sequelize");
const message = require("../response_message/message");
const sequelize = require("../config/database");
const { userAttributes, statusCodes } = require("../utils/commonVars");
const LeaveEncashment = require("../models/leaveEncashment");
const { leaveOperationENUM } = require("../utils/dbUtils");
const UserLeaveLapse = require("../models/userLeaveLapse");
const UserMaster = require("../models/userMaster");
const HrLeaveTypes = require("../models/hrLeaveTypes");
const HrLeaveMaster = require("../models/hrLeaveMaster");
const moment = require("moment");
const { generateExcel } = require("../utils/exportData");
const UserLeaveTransaction = require("../models/userLeaveTransaction");
const UserLeave = require("../models/userleave");

exports.getApprovedLeaveTransactionByUser = async (req, res, next) => {
  try {
    let {
      page,
      limit,
      userMasterID,
      fromMonth,
      toMonth,
      exportData,
      status
    } = await req.body;

    if(!userMasterID) return res.status(statusCodes.BAD_REQUEST).json({
      status:statusCodes.BAD_REQUEST,
      message:message.usermessage.requiredMessage('userMasterID')
    });

    const paginationQuery = {};
    if (!exportData && page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const condition = {};

    if(fromMonth && toMonth){
 const fromMonthStart = moment(fromMonth, "YYYYMM")
      .startOf("month")
      .format("YYYY-MM-DD");
    const toMonthEnd = moment(toMonth, "YYYYMM")
      .endOf("month")
      .format("YYYY-MM-DD");
      condition.date = {
        [Sequelize.Op.between]: [fromMonthStart, toMonthEnd],
      };
    }

    if(status) condition.status = status;

        condition['$hrLeaveType.LeaveID$'] = {
          [Sequelize.Op.ne]:25
        };
      

    const order = [["date", "DESC"]];
    const { rows: finLeaveTransactions, count } =
      await UserLeaveTransaction.findAndCountAll({
        where: condition,
        order,
        ...paginationQuery,
        include: [
          {
            model: UserLeave,
            where: { userMasterID: userMasterID },
            attributes: ['Remark','DayType','userMasterID'],
            include: [
              {
                model: UserMaster,
                attributes: userAttributes,
              },
            ],
          },
          {
            model: HrLeaveTypes,
            attributes: ["LeaveID"],
            include: {
              model: HrLeaveMaster,
              as: "LeaveMaster",
              attributes: ["LeaveName"],
            },
          },
          {
            required: false,
            model: UserMaster,
            as: "createByUser",
            attributes: userAttributes,
          },
          {
            required: false,
            model: UserMaster,
            as: "updateByUser",
            attributes: userAttributes,
          },
        ],
      });

    const finalLeaveTransactions = finLeaveTransactions.map((item) => ({
      "Employee Name": item.userLeave?.userMaster?.displayName,
       LeaveName: item.hrLeaveType?.LeaveMaster?.LeaveName || null,
      Days: item.days,
      Date: moment(item.date, "YYYY-MM-DD").format("DD-MM-YYYY"),
      Status:item.status == 10 ? 'Cancelled' : 'Approved',
      'Day Type':item.userLeave?.DayType || '',
      Remark:item.userLeave?.Remark || '',
      "Create By": item.createByUser?.displayName,
      "Update By": item.updateByUser?.displayName || "",
      "Created On": item.createdAt
        ? moment(item.createdAt).format("DD-MM-YYYY HH:mm:ss")
        : "",
      "Updated On": item.updatedAt
        ? moment(item.updatedAt).format("DD-MM-YYYY HH:mm:ss")
        : "",
    }));

    if (exportData) {
      await generateExcel(finalLeaveTransactions, "Approved Leave", "xlsx", res);
      return;
    }
    return res.status(200).json({
      status: 200,
      totalCount: count,
      data: finalLeaveTransactions,
    });
  } catch (err) {
    next(err);
  }
};

exports.pendingLeaveByUser = async(req,res,next)=>{
  try {
    const {
      page,
      limit,
      userMasterID,
      fromMonth,
      toMonth,
      exportData
    } = req.body;

     if(!userMasterID) return res.status(statusCodes.BAD_REQUEST).json({
      status:statusCodes.BAD_REQUEST,
      message:message.usermessage.requiredMessage('userMasterID')
    });

    const paginationQuery = {};
    if (!exportData && page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const condition = {userMasterID,status:1,authorizationStatus:[0,1,2]};

    if(fromMonth && toMonth){
 const fromMonthStart = moment(fromMonth, "YYYYMM")
      .startOf("month")
      .format("YYYY-MM-DD");
    const toMonthEnd = moment(toMonth, "YYYYMM")
      .endOf("month")
      .format("YYYY-MM-DD");
      condition.FromDate = {
        [Sequelize.Op.lte]: toMonthEnd,
      };

       condition.ToDate = {
        [Sequelize.Op.lte]: fromMonthStart,
      };
    }

  
        condition['$hrLeaveType.LeaveID$'] = {
          [Sequelize.Op.ne]:25
        };

    const order = [["FromDate", "DESC"]];

    const {rows:data,count:totalcount} = await UserLeave.findAndCountAll({
      where:condition,
      ...paginationQuery,
      order,
      include:[
        {model:UserMaster,attributes:['displayName']},
         {
            model: HrLeaveTypes,
            attributes: ["LeaveID"],
            include: {
              model: HrLeaveMaster,
              as: "LeaveMaster",
              attributes: ["LeaveName"],
            },
          },
            {
            required: false,
            model: UserMaster,
            as: "createdByUserDetails",
            attributes: userAttributes,
          },
          {
            required: false,
            model: UserMaster,
            as: "updatedByUserDetails",
            attributes: userAttributes,
          },
      ]
    });

    const finalData = data.map(item=>({
      "Employee Name": item.userMaster?.displayName,
       LeaveName: item.hrLeaveType?.LeaveMaster?.LeaveName || null,
      "From Date": moment(item.FromDate, "YYYY-MM-DD").format("DD-MM-YYYY"),
       "To Date": moment(item.ToDate, "YYYY-MM-DD").format("DD-MM-YYYY"),
        "Total Days": item.LeaveDays,
      Status:'Pending',
      "Create By": item.createByUser?.displayName,
      "Update By": item.updateByUser?.displayName || "",
      "Created On": item.createdAt
        ? moment(item.createdAt).format("DD-MM-YYYY HH:mm:ss")
        : "",
      "Updated On": item.updatedAt
        ? moment(item.updatedAt).format("DD-MM-YYYY HH:mm:ss")
        : "",
    }));

     if (exportData) {
      await generateExcel(finalData, "Pending Leaves", "xlsx", res);
      return;
    }
    return res.status(200).json({
      status: 200,
      totalcount,
      data:finalData,
    });
    
  } catch (error) {
    next(error);
  }
}
