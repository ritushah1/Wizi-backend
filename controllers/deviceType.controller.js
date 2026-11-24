const DeviceType = require('../models/deviceType');
const UserMaster = require('../models/userMaster');

exports.getUserDeviceAndAppHistory = async (req, res, next) => {
  try {
    const { userMasterID, page, limit, exportData } = req.body;

    const paginationQuery = {};
    if (page && limit && !exportData) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const order = [['createdAt', 'DESC']];

    const { rows: findUserDeviceAndAppHistory, count } =
      await DeviceType.findAndCountAll({
        where: {
          userMasterID,
        },
        ...paginationQuery,
        order,
      });

    return res.status(200).json({
      status: 200,
      data: findUserDeviceAndAppHistory,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};
