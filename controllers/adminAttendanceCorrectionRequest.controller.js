const { accessibleRoleWiseUsers } = require('../middleware/accessibleRoleWiseUsers');
const AttendanceCorrectionAuthorization = require('../models/attendanceCorrectionAuthorization');
const AttendanceCorrectionLogs = require('../models/attendanceCorrectionLogs');
const AttendanceCorrectionReason = require('../models/attendanceCorrectionReason');
const AttendanceCorrectionRequest = require('../models/attendanceCorrectionRequest');
const UserMaster = require('../models/userMaster');

exports.getAllAttendanceCorrectionRequest = async (req, res, next) => {
  try {
    const {
      page,
      limit,
      userMasterID,
      startDate,
      endDate,
      attendanceCorrectionReasonID,
      authorizationStatus,
    } = req.body;

    const paginateCodition =
      page && limit ? { offset: (page - 1) * limit, limit } : {};

    const condition = {};
    // if (userMasterID.length > 1) {
    //   condition.userMasterID = userMasterID;
    // }

    if (
      (Array.isArray(authorizationStatus) && authorizationStatus.length > 0) ||
      (!Array.isArray(authorizationStatus) && authorizationStatus)
    ) {
      condition.authorizationStatus = authorizationStatus;
    }

    if (attendanceCorrectionReasonID) {
      condition.attendanceCorrectionReasonID = attendanceCorrectionReasonID;
    }

    if (startDate && endDate)
      condition.AttendanceDate = {
        [Op.between]: [startDate, endDate],
      };
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    const { rows: requestData, count: totalcount } =
      await AttendanceCorrectionRequest.findAndCountAll({
        distinct: true,
        where: condition,
        ...paginateCodition,
        include: [
          {
            required: true,
            model: UserMaster,
            as: 'employee',
            where: { ...userAccessCondition.where },
            include: [...userAccessCondition.includeModels],
          },
          { model: AttendanceCorrectionLogs },
          {
            model: AttendanceCorrectionAuthorization,
            attributes: ['id', 'status', 'authStatus', 'remarks'],
          },
          {
            required: false,
            model: AttendanceCorrectionReason,
          },
        ],
        order: [['AttendanceDate', 'DESC']],
      });

    return res.status(200).json({
      status: 200,
      data: requestData,
      totalcount,
    });
  } catch (error) {
    next(error);
  }
};
