const Sequelize = require('sequelize');
const UserTracking = require('../models/userTracking');
const logger = require('../config/logger');
const message = require('../response_message/message');
const companyMaster = require('../models/companyMaster');
const CompanySubscriptionMaster = require('../models/subscriptionPlan');
const UserMaster = require('../models/userMaster');
const e = require('express');
const sequelize = require('../config/database');
const { asiaKolkataDateTime } = require('../utils/commonUtilFunctions');
const { generateExcel } = require('../utils/exportData');
const { statusCodes } = require('../utils/commonVars');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const BranchMaster = require('../models/branchMaster');
const EmployeeBranch = require('../models/employeeBranch');
const { Op } = require('sequelize');

/**
 *
 * @body {companyMasterID, productMasterID} req to check user tracking for company
 */
exports.postCheckTracking = async (req, res, next) => {
  try {
    let { companyMasterID } = await req.body;
    let companyTree, check_tracking;

    const currCompany = await companyMaster.findOne({
      where: { companyMasterID: companyMasterID, status: 1 },
      attributes: ['companyMasterID', 'parentCompanyMasterID'],
      raw: true,
    });

    if (+currCompany.parentCompanyMasterID) {
      const allCompany = await companyMaster.findAll({
        where: {
          [Sequelize.Op.or]: [
            { companyMasterID: +currCompany.parentCompanyMasterID },
            { parentCompanyMasterID: +currCompany.parentCompanyMasterID },
          ],
          status: 1,
        },
        include: {
          model: CompanySubscriptionMaster,
          required: false,
          where: { status: 1 },
        },
      });

      companyTree = allCompany.map((item) => item.companyMasterID);
      check_tracking = allCompany.find(
        (item) =>
          item.toJSON().companySubscriptions.length &&
          item.toJSON().companySubscriptions[0].companyPlanMasterID,
      );
    } else {
      const allCompany = await companyMaster.findAll({
        where: {
          [Sequelize.Op.or]: [
            { companyMasterID: +companyMasterID },
            { parentCompanyMasterID: +companyMasterID },
          ],
          status: 1,
        },
        include: {
          model: CompanySubscriptionMaster,
          required: false,
          where: { status: 1 },
        },
      });

      companyTree = allCompany.map((item) => item.companyMasterID);
      check_tracking = allCompany.find(
        (item) =>
          item.toJSON().companySubscriptions.length &&
          item.toJSON().companySubscriptions[0].companyPlanMasterID,
      );
    }
    check_tracking = check_tracking.toJSON().companySubscriptions[0];

    const totalcount = await UserTracking.count({
      raw: true,
      where: {
        companyMasterID: companyTree,
        trackStatus: 1,
      },
    });

    check_tracking.totalCount = totalcount;

    if (totalcount >= check_tracking.totalTracking) {
      check_tracking.exceed = true;
      res.status(200).json({
        status: 200,
        message: message.usermessage.usertrackingexceed,
        data: check_tracking,
      });
    } else {
      check_tracking.exceed = false;
      res.status(200).json({
        status: 200,
        message: message.usermessage.usertrackingallow,
        data: check_tracking,
      });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * find data with userTracking id
 *
 * @param {id} userTrackingID  to fetch userTracking name
 */

exports.getUserTrackingById = async (req, res, next) => {
  try {
    let get_one_data = await UserTracking.findOne({
      where: {
        userTrackingID: req.params.id,
        trackStatus: 1,
      },
      include: [
        { model: UserMaster, as: 'user' },
        { model: companyMaster, as: 'company' },
      ],
    });

    if (!get_one_data) {
      return res
        .status(200)
        .json({ status: 200, message: message.usermessage.deletedrecord });
    } else {
      return res.status(200).json({ status: 200, data: get_one_data });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * find data with userTracking id
 *
 * @param {id} userTrackingID  to fetch userTracking name
 */

exports.getUserTrackingByCompanyId = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      limit,
      page,
      searchQuery,
      exportData,
      branchMasterID = [],
    } = await req.body;
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const condition = {};

    condition.trackStatus = 1;

    if (companyMasterID) {
      condition.companyMasterID = companyMasterID;
    }

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          '$user.displayName$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          '$user.userNumber$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          '$company.companyName$': {
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
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const userTracking = await UserTracking.findAndCountAll({
      where: condition,
      ...paginationQuery,
      order,
      include: [
        {
          required: true,
          model: UserMaster,
          as: 'user',
          where: { ...userAccessCondition.where },
          include: [
            ...userAccessCondition.includeModels,
            {
              required: branchMasterID && branchMasterID.length ? true : false,
              model: EmployeeBranch,
              where: {
                ...(branchMasterID &&
                  (!Array.isArray(branchMasterID) || branchMasterID.length) && {
                    branchID: branchMasterID,
                  }),
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(currentDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              attributes: ['branchID'],
              include: [
                {
                  model: BranchMaster,
                  as: 'branchMaster',
                  attributes: ['branchName'],
                },
              ],
            },
          ],
          attributes: ['displayName', 'userMasterID'],
        },
        {
          required: !!searchQuery,
          model: companyMaster,
          as: 'company',
        },
      ],
    });

    if (exportData) {
      const finalData = [];

      for (let i = 0; i < userTracking.rows.length; i++) {
        const data1 = {
          CompanyName: userTracking.rows[i].company.companyName,
          UserName: userTracking.rows[i].user.displayName,
          UserNumber: userTracking.rows[i].user.userNumber,
          TrackingTime: userTracking.rows[i].trackingTime,
          TrackStatus: userTracking.rows[i].trackStatus,
          StatusMonitoring:
            userTracking.rows[i].statusMonitoring == 0 ? 'No' : 'Yes',
          notifyReportTo:
            userTracking.rows[i].notifyReportTo == 0 ? 'No' : 'Yes',
          CreatedAt: asiaKolkataDateTime(userTracking.rows[i].createdAt) || '',
          UpdatedAt: asiaKolkataDateTime(userTracking.rows[i].updatedAt) || '',
        };
        data1.TrackStatus == 1
          ? (data1.TrackStatus = 'Active')
          : (data1.TrackStatus = 'Deactive');

        finalData.push(data1);
      }

      await generateExcel(finalData, 'TrackingEmployee', 'xlsx', res);
      return;
    }

    return res.status(200).json({
      status: 200,
      data: userTracking.rows,
      totalcount: userTracking.count,
    });
  } catch (err) {
    next(err);
  }
};
/**
 * update data
 *
 * @param {id} userTrackingID  to update id
 */
exports.postUpdateUserTracking = async (req, res, next) => {
  try {
    let {
      userTrackingID,
      userMasterID,
      companyMasterID,
      trackingTime,
      trackStatus,
      statusMonitoring,
      notifyReportTo,
    } = await req.body;

    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;

    let result = await sequelize.transaction(async (t) => {
      let change_data_status = await UserTracking.update(
        {
          userMasterID,
          companyMasterID,
          trackingTime,
          trackStatus,
          updateBy,
          updateByIp,
          statusMonitoring,
          notifyReportTo,
        },
        {
          where: { userTrackingID: userTrackingID },
          transaction: t,
        },
      );

      res.status(200).json({
        status: 200,
        message: message.usermessage.updateMessage('User Tracking'),
      });
      return change_data_status;
    });
  } catch (err) {
    next(err);
  }
};

/**
 * update data
 *
 * @param {id} userTrackingID  to update id
 */
exports.postDisableUserTracking = async (req, res, next) => {
  try {
    let { userTrackingID, trackStatus } = await req.body;
    let result = await sequelize.transaction(async (t) => {
      let change_data_status = await UserTracking.update(
        {
          trackStatus,
        },
        {
          where: {
            userTrackingID: Array.isArray(userTrackingID)
              ? { [Op.in]: userTrackingID }
              : userTrackingID,
          },
          transaction: t,
        },
      );

      res.status(200).json({
        status: 200,
        message: message.usermessage.usertrackingdisabled,
      });
      return change_data_status;
    });
  } catch (err) {
    next(err);
  }
};

exports.bulkCreateUserTracking = async (req, res, next) => {
  try {
    const {
      userMasterID,
      companyMasterID,
      trackStatus,
      trackingTime,
      statusMonitoring,
      notifyReportTo,
    } = req.body;

    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    const allowedKeys = [
      userMasterID,
      companyMasterID,
      trackStatus,
      trackingTime,
      createBy,
      createByIp,
      statusMonitoring,
      notifyReportTo,
    ];

    const invalidKeys = invalidKeyParams(req.query, allowedKeys);

    if (invalidKeys.length > 0) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Invalid query parameter(s): ${invalidKeys.join(', ')}`,
      });
    }

    const existingTracking = await UserTracking.findAll({
      attributes: ['userMasterID'],
      where: {
        userMasterID,
        trackStatus: 1,
      },
    });

    const currCompany = await companyMaster.findOne({
      where: { companyMasterID: companyMasterID, status: 1 },
      attributes: ['companyMasterID', 'parentCompanyMasterID'],
      raw: true,
    });

    const allCompany = await companyMaster.findAll({
      where: {
        [Sequelize.Op.or]: [
          {
            companyMasterID: +currCompany?.parentCompanyMasterID
              ? +currCompany?.parentCompanyMasterID
              : +companyMasterID,
          },
          {
            parentCompanyMasterID: +currCompany.parentCompanyMasterID
              ? +currCompany.parentCompanyMasterID
              : +companyMasterID,
          },
        ],
        status: 1,
      },
      include: {
        model: CompanySubscriptionMaster,
        required: false,
        where: { status: 1 },
      },
    });

    companyTree = allCompany.map((item) => item?.companyMasterID);
    check_tracking = allCompany.find(
      (item) =>
        item.toJSON().companySubscriptions?.length &&
        item.toJSON().companySubscriptions[0].companyPlanMasterID,
    );

    check_tracking = check_tracking.toJSON().companySubscriptions[0];

    const totalcount = await UserTracking.count({
      raw: true,
      where: {
        companyMasterID: companyTree,
        trackStatus: 1,
      },
    });

    check_tracking.totalCount = totalcount;

    const alreadyTrackedUserIds = existingTracking.map(
      (item) => item.userMasterID,
    );

    const newUsersToTrack = userMasterID.filter(
      (id) => !alreadyTrackedUserIds.includes(id),
    );

    if (newUsersToTrack.length === 0) {
      return res.status(200).json({
        status: 400,
        message: 'User for tracking already exists.',
      });
    }

    const totalTrackingCount = +totalcount + +newUsersToTrack.length;

    if (totalTrackingCount > check_tracking.totalTracking) {
      return res.status(200).json({
        status: 400,
        message: `User limit reached (${check_tracking.totalTracking}). Please remove some users to continue.`,
      });
    }

    const dataToInsert = newUsersToTrack.map((user) => ({
      userMasterID: user,
      companyMasterID,
      trackStatus,
      trackingTime,
      createBy,
      createByIp,
      statusMonitoring,
      notifyReportTo,
    }));

    await UserTracking.bulkCreate(dataToInsert);

    return res.status(200).json({
      status: 200,
      message: `Total ${newUsersToTrack.length} Users Added Successfully.`,
    });
  } catch (err) {
    next(err);
  }
};

function invalidKeyParams(query, allowedKeys) {
  return Object.keys(query).filter((key) => !allowedKeys.includes(key));
}
