const Sequelize = require('sequelize');
const UserMaster = require('../models/userMaster');
const AttendanceLogs = require('../models/attendancelogs');
const UserTracking = require('../models/userTracking');
const { sendNotification } = require('../utils/commonUtilFunctions');

const changeOnlineStatus = async (userId, isOnline) => {
  try {
    const trackingpermission = await UserTracking.findOne({
      where: {
        userMasterID: userId,
        trackStatus: 1,
        statusMonitoring: 1,
      },
    });

    if (
      trackingpermission?.statusMonitoring &&
      trackingpermission?.statusMonitoring == 1
    ) {
      const [affectedRows] = await UserMaster.update(
        { isOnline },
        { where: { userMasterID: userId } },
      );

      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
};

const sendNotificationToInactiveUser = async (userId) => {
  try {
    let attendanceLog = await AttendanceLogs.findOne({
      where: {
        userMasterID: userId,
      },
      attributes: ['direction'],
      order: [['logDateTime', 'DESC']],
      raw: true,
    });
    if (attendanceLog?.direction && attendanceLog.direction == 'in') {
      // Send Notification to main User -- Code Start
      const data = {
        screen: 'home',
      };
      // Send Notification to main User -- Code End
      await sendNotification(userId, {}, data, {
        isSilent: true,
      });
    }
  } catch (error) {}
};

module.exports = {
  sendNotificationToInactiveUser,
  changeOnlineStatus,
};
