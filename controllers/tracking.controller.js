const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const Tracking = require('../models/tracking');
const message = require('../response_message/message');
const UserMaster = require('../models/userMaster');
const Visit = require('../models/visit');
const UserExpense = require('../models/userExpense');
const UserExpenseTransaction = require('../models/userExpenseTransaction');
const TrackingKM = require('../models/trackingKM');
const {
  asiaKolkataDateTime,
  sendNotification_NEW,
  getUserAndDateWiseTrackingKms,
  getTrackingDateWiseData,
  isCompanyWithServiceExpense,
} = require('../utils/commonUtilFunctions');
const UserTracking = require('../models/userTracking');
const BranchMaster = require('../models/branchMaster');
const EmployeeBranch = require('../models/employeeBranch');
const { userAttributes } = require('../utils/commonVars');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const {
  geoFenseType,
  distanceCalculationMethodENUM,
  AuthorizationStatusType,
} = require('../utils/dbUtils');
const EmployeeReportTo = require('../models/employeeReportTo');
const OutsideNotification = require('../models/outsideNotification');
const TrackingOld = require('../models/trackingOld');
const TrackingKMsOld = require('../models/trackingKMOld');
const { TRACKING_MIGRATION_DATE } = require('../utils/labelUtils');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const axios = require('axios');
const { getUserDateWiseServiceVisitData } = require('./mehtaService.contoller');
const Customer = require('../models/customer');
const {
  getOSRMTrackingPoints_Match_API,
  getOSRMTrackingPoints_Route_API,
  calculateOSRMDistance,
  getDistanceByTableAPI,
  getDistanceByMatchAPI,
} = require('../utils/osrm.utils');
function calcCrow(lat1, lon1, lat2, lon2) {
  const p = Math.PI / 180; // 0.017453292519943295
  const c = Math.cos;
  const a =
    0.5 -
    c((lat2 - lat1) * p) / 2 +
    (c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))) / 2;
  return 12742 * Math.asin(Math.sqrt(a)); // 2 * R (R=6371 km)
}

async function getCustomerByLatLong(latitude, longitude, customerData) {
  let response = {
    isInsideRadius: false,
    distance: 0,
  };

  if (
    !customerData ||
    !customerData.latitude ||
    !customerData.longitude ||
    !customerData.radius
  ) {
    return response;
  }

  function toRad(value) {
    return (value * Math.PI) / 180;
  }

  const R = 6371000;

  const dLat = toRad(latitude - customerData.latitude);
  const dLon = toRad(longitude - customerData.longitude);

  const lat1 = toRad(customerData.latitude);
  const lat2 = toRad(latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;

  response.distance = distance;

  if (+customerData.radius >= distance) {
    response.isInsideRadius = true;
  }

  return response;
}

async function visitAutoCheckInCheckout({
  userMasterID,
  visitDate,
  log,
  transaction,
}) {
  try {
    const findUserVisitData = await Visit.findAll({
      where: {
        assignID: userMasterID,
        visitDate,
        status: 1,
        [Sequelize.Op.or]: [
          { checkInDateTime: { [Sequelize.Op.eq]: null } },
          { checkOutDateTime: { [Sequelize.Op.eq]: null } },
        ],
        authorizationStatus: AuthorizationStatusType.APPROVED,
      },
      include: [
        {
          model: Customer,
          required: true,
          where: {
            latitude: {
              [Sequelize.Op.and]: [{ [Sequelize.Op.ne]: null }],
            },
            longitude: {
              [Sequelize.Op.and]: [{ [Sequelize.Op.ne]: null }],
            },
            radius: {
              [Sequelize.Op.and]: [{ [Sequelize.Op.ne]: null }],
            },
          },
        },
      ],
      order: [
        ['checkInDateTime', 'ASC'],
        ['visitTime', 'ASC'],
      ],
      transaction,
    });

    if (!findUserVisitData.length) {
      return log;
    }

    // ================= FIRST VISIT OF SAME CUSTOMER =================
    const customerVisitMap = {};

    for (const visit of findUserVisitData) {
      if (!customerVisitMap[visit.customerID]) {
        customerVisitMap[visit.customerID] = visit;
      }
    }

    for (const customerID in customerVisitMap) {
      const visit = customerVisitMap[customerID];

      const customer = visit.customer || null;

      const radiusData = await getCustomerByLatLong(
        +log.latitude,
        +log.longitude,
        customer,
      );

      // ================= AUTO CHECK-IN =================
      if (radiusData.isInsideRadius && !visit.checkInDateTime) {
        Object.assign(visit, {
          checkInDateTime: log.trackDateTime,
          checkInLatitude: log.latitude,
          checkInLongitude: log.longitude,
          checkInLocation: log.address,
          isAutoCheckIn: true,
        });

        await visit.save({
          transaction,
        });

        // change tracking type
        log.type = 'autocheckin';

        break;
      }

      // ================= AUTO CHECK-OUT =================
      if (
        visit.checkInDateTime &&
        !visit.checkOutDateTime &&
        !radiusData.isInsideRadius
      ) {
        const checkInTime = new Date(visit.checkInDateTime);
        const checkOutTime = new Date(log.trackDateTime);

        const diffMinutes = (checkOutTime - checkInTime) / 60000;

        // Checkout must be more than 1 minute after checkin
        if (diffMinutes <= 1) {
          continue;
        }

        Object.assign(visit, {
          checkOutDateTime: log.trackDateTime,
          checkOutLatitude: log.latitude,
          checkOutLongitude: log.longitude,
          checkOutLocation: log.address,
          visitMinutes: Math.floor(diffMinutes),
          isAutoCheckOut: true,
        });

        await visit.save({
          transaction,
        });

        // change tracking type
        log.type = 'autocheckout';

        break;
      }
    }

    return log;
  } catch (error) {
    // throw error;
  }
}
exports.postTrackingBulk = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { tracking } = req.body;
    const checkOpenSourceDistence = [
      distanceCalculationMethodENUM.OSRM,
      distanceCalculationMethodENUM.BOTH,
    ].includes(req.userDetails?.trackingRouteAPI);
    // Find user tracking once
    const findUserTracking = await UserTracking.findOne({
      where: { userMasterID: req.userDetails.userMasterId, trackStatus: 1 },
    });

    let employeeReportToData = [];
    let findUserData = null;

    if (findUserTracking?.notifyReportTo) {
      findUserData = await UserMaster.findOne({
        where: { userMasterID: req.userDetails.userMasterId, status: 1 },
        attributes: userAttributes,
        include: [
          {
            required: false,
            model: EmployeeReportTo,
            where: { status: 1 },
            include: [
              { model: UserMaster, as: 'reportTo', attributes: userAttributes },
            ],
          },
        ],
      });
      employeeReportToData = findUserData?.employeeReportTos || [];
    }
    const newTrackingData = [];

    // Cache for notification
    let exeFirstTime = true;
    let findOutsideNotification = null;

    // ✅ Cache per date
    const kmCache = {};
    for (const e of tracking) {
      const logDatetime = new Date(e.Track_datetime);

      // Skip logs before or equal to 2025-09-01
      if (logDatetime <= new Date('2025-09-01')) {
        continue;
      }
      const currentPlus10Minutes = new Date(Date.now() + 10 * 60 * 1000);

      // Skip logs after current time + 10 minutes
      if (logDatetime.getTime() > currentPlus10Minutes.getTime()) {
        continue;
      }
      if (e.type == '' && e.accuracy !== null && e.accuracy > 200) {
        continue;
      }
      const trackDateTime = logDatetime;
      const trackDateOnly = asiaKolkataDateTime(e.Track_datetime).slice(0, 10);

      // ✅ Step 1: Load KM reference for this date
      if (!kmCache[trackDateOnly]) {
        const lastKM = await TrackingKM.findOne({
          where: {
            userMasterID: req.userDetails.userMasterId,
            date: trackDateOnly,
          },
          transaction,
        });
        kmCache[trackDateOnly] = {
          lastTrackDateTime: lastKM ? new Date(lastKM.Track_datetime) : null,
          findKM: lastKM || null,
          osrmCoordinates: [],
        };
      }

      const cacheRef = kmCache[trackDateOnly];

      // ❌ Skip older or duplicate records (per date)
      if (
        cacheRef.lastTrackDateTime &&
        trackDateTime <= cacheRef.lastTrackDateTime
      ) {
        continue;
      }

      // ✅ Update cache
      cacheRef.lastTrackDateTime = trackDateTime;

      // ================= NOTIFICATION LOGIC =================
      if (
        findUserTracking &&
        employeeReportToData.length &&
        (e.geofence === geoFenseType.OUTSIDE ||
          e.geofence === geoFenseType.INSIDE)
      ) {
        if (exeFirstTime) {
          findOutsideNotification = await OutsideNotification.findOne({
            where: {
              userMasterID: req.userDetails.userMasterId,
              date: trackDateOnly,
            },
            order: [['id', 'DESC']],
            transaction,
          });
          exeFirstTime = false;
        }

        if (e.geofence === geoFenseType.OUTSIDE) {
          if (!findOutsideNotification || findOutsideNotification.inDatetime) {
            await OutsideNotification.create(
              {
                userMasterID: req.userDetails.userMasterId,
                date: trackDateOnly,
                outDatetime: e.Track_datetime,
              },
              { user: req.userDetails, transaction },
            );

            for (const reports of employeeReportToData) {
              const userData = reports.reportTo;
              if (!userData.firebaseToken || !userData.deviceType) continue;
              sendNotification_NEW(
                userData.firebaseToken,
                userData.deviceType,
                {
                  title: 'Team Member Outside Notification',
                  body: `Your team member ${findUserData.displayName} is currently outside the premises`,
                },
                {
                  screen: 'trackingOutside',
                  isScheduled: 'true',
                  scheduledTime: new Date().toISOString(),
                },
              );
            }

            findOutsideNotification = await OutsideNotification.findOne({
              where: {
                userMasterID: req.userDetails.userMasterId,
                date: trackDateOnly,
              },
              order: [['id', 'DESC']],
              transaction,
            });
          }
        } else if (
          e.geofence === geoFenseType.INSIDE &&
          findOutsideNotification &&
          !findOutsideNotification.inDatetime
        ) {
          const inTime = new Date(e.Track_datetime);
          const outTime = new Date(findOutsideNotification.outDatetime);
          const diffMinutes = Math.floor((inTime - outTime) / 60000);

          Object.assign(findOutsideNotification, {
            inDatetime: e.Track_datetime,
            minutes: diffMinutes,
          });
          await findOutsideNotification.save({
            user: req.userDetails,
            transaction,
          });

          // Notify reporting managers (INSIDE)
          for (const reports of employeeReportToData) {
            const userData = reports.reportTo;
            if (!userData.firebaseToken || !userData.deviceType) continue;
            sendNotification_NEW(
              userData.firebaseToken,
              userData.deviceType,
              {
                title: 'Team Member Inside Notification',
                body: `Your team member ${findUserData.displayName} has returned inside the premises`,
              },
              {
                screen: 'trackingInside',
                isScheduled: 'true',
                scheduledTime: new Date().toISOString(),
              },
            );
          }
        }
      }

      if (
        req.userDetails?.visitAutoCheckInOut &&
        e.type == '' &&
        e.Lattitude &&
        e.Longitude &&
        e.Lattitude !== 'not found' &&
        e.Longitude !== 'not found'
      ) {
        const updatedLog = await visitAutoCheckInCheckout({
          userMasterID: req.userDetails.userMasterId,
          visitDate: trackDateOnly,
          transaction,
          log: {
            latitude: e.Lattitude,
            longitude: e.Longitude,
            trackDateTime: e.Track_datetime,
            address: e.Address,
            type: e.type,
          },
        });

        e.type = updatedLog?.type || e.type;
      }
      // ✅ Push valid tracking
      newTrackingData.push({
        ...e,
        userMasterID: req.userDetails.userMasterId,
      });
      // ================= KM CALCULATION =================
      if (
        !e.Lattitude ||
        !e.Longitude ||
        e.Lattitude === 'not found' ||
        e.Longitude === 'not found'
      ) {
        continue;
      }

      if (!cacheRef.findKM) {
        cacheRef.findKM = {
          ...e,
          date: trackDateOnly,
          kilometer: 0,
          isNew: true, // 👈 mark new
        };
        cacheRef.osrmCoordinates.push({
          Lattitude: e.Lattitude,
          Longitude: e.Longitude,
          address: e.Address,
          Track_datetime: e.Track_datetime,
        });
      } else {
        if (cacheRef.osrmCoordinates.length === 0) {
          cacheRef.osrmCoordinates.push({
            Lattitude: cacheRef.findKM.Lattitude,
            Longitude: cacheRef.findKM.Longitude,
            address: cacheRef.findKM.Address,
            Track_datetime: cacheRef.findKM.Track_datetime,
          });
        }
        const kms = calcCrow(
          +cacheRef.findKM.Lattitude,
          +cacheRef.findKM.Longitude,
          +e.Lattitude,
          +e.Longitude,
        );

        let totalKM = +cacheRef.findKM.kilometer || 0;

        if (kms > 0.085) {
          cacheRef.osrmCoordinates.push({
            Lattitude: e.Lattitude,
            Longitude: e.Longitude,
            address: e.Address,
            Track_datetime: e.Track_datetime,
          });
          totalKM += kms;

          Object.assign(cacheRef.findKM, {
            Lattitude: e.Lattitude,
            Longitude: e.Longitude,
            kilometer: totalKM.toFixed(2),
            Address: e.Address,
            Track_datetime: e.Track_datetime,
            Battery: e.Battery,
            Gps: e.Gps,
            Wifi: e.Wifi,
            Mobile_name: e.Mobile_name,
            type: e.type,
            developerMode: e.developerMode,
            geofence: e.geofence,
            accuracy: e.accuracy,
            batteryOptimization: e.batteryOptimization,
            batterySaver: e.batterySaver,
            osr_Km: +cacheRef?.findKM?.osr_Km || 0,
          });
        }
      }
    }

    // ================= BULK INSERT =================
    const chunkInsert = async (rows) => {
      for (let i = 0; i < rows.length; i += 1000) {
        await Tracking.bulkCreate(rows.slice(i, i + 1000), { transaction });
      }
    };

    await chunkInsert(newTrackingData);

    // ================= FINAL KM SAVE =================
    for (const key in kmCache) {
      const cacheData = kmCache[key];
      const km = cacheData.findKM;

      if (!km) continue;

      // ✅ Calculate OSRM KM
      let osrmKM = 0;

      if (checkOpenSourceDistence && cacheData.osrmCoordinates.length >= 2) {
        osrmKM = await getDistanceByMatchAPI(cacheData.osrmCoordinates);
      }

      osrmKM = +osrmKM.toFixed(2);

      if (km.isNew) {
        delete km.isNew;

        km.osr_Km = osrmKM;

        await TrackingKM.create(km, {
          transaction,
        });
      } else {
        km.osr_Km = (+km.osr_Km || 0) + osrmKM;

        km.osr_Km = +km.osr_Km.toFixed(2);

        await km.save({
          transaction,
        });
      }
    }
    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Tracking'),
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

exports.getUserTrackingInfoById = async (req, res, next) => {
  try {
    const { userMasterID, date } = req.body;

    if (!userMasterID || !date)
      return res
        .status(200)
        .json({ status: 401, message: 'Invalid parameters!', data: [] });
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    const checkOpenSourceDistence = [
      distanceCalculationMethodENUM.OSRM,
      distanceCalculationMethodENUM.BOTH,
    ].includes(req.userDetails?.trackingRouteAPI);
    const checkHaversineDistence = [
      distanceCalculationMethodENUM.HAVERSINE,
      distanceCalculationMethodENUM.BOTH,
    ].includes(req.userDetails?.trackingRouteAPI);
    const findUserData = await UserMaster.findOne({
      where: {
        userMasterID: userMasterID,
        status: [0, 1],
        ...userAccessCondition.where,
      },
      include: [
        ...userAccessCondition.includeModels,
        {
          required: false,
          model: EmployeeDesignation,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },

          attributes: ['designationID'],
          include: [
            {
              model: Designation,
              as: 'designation',
              attributes: ['designationName'],
            },
          ],
        },
        {
          required: false,
          model: EmployeeDepartment,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },

          attributes: ['departmentID'],
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['departmentName'],
            },
          ],
        },
      ],
    });
    if (!findUserData) {
      return res.status(200).json({
        status: 200,
        message: message.usermessage.notFoundMessage('user'),
        data: [],
      });
    }
    let [trackingData, trackingKMs, getVisitData, totalDateWiseExpenseAmount] =
      await Promise.all([
        getTrackingDateWiseData(date, userMasterID),
        getUserAndDateWiseTrackingKms(userMasterID, date),
        Visit.count({
          where: {
            visitDate: date,
            assignID: userMasterID,
            status: 1,
          },
        }),
        UserExpenseTransaction.findOne({
          where: {
            [Sequelize.Op.and]: [
              { '$userExpense.userMasterID$': userMasterID },
              Sequelize.where(
                sequelize.fn('date', sequelize.col('expense_date')),
                '=',
                date,
              ),
            ],
          },
          attributes: [
            [
              sequelize.fn('sum', sequelize.col('expenseAmount')),
              'total_amount',
            ],
          ],
          include: [
            {
              model: UserExpense,
              as: 'userExpense',
              attributes: ['userMasterID'],
            },
          ],
          group: ['userExpense.userMasterID'],
          raw: true,
        }),
      ]);

    const kmData = [];
    const finalTracking = [];
    let lat = null;
    let long = null;
    let totalKilometers = 0;
    let totalOpenSourceKiloMeters = 0;
    for (const item of trackingData) {
      finalTracking.push({
        address:
          item.Address && item.Address !== 'not found'
            ? item.Address
            : 'not found',
        time: item.Track_datetime,
        type: item.type,
        battery: item.Battery,
        gps: item.Gps,
        wifi: item.Wifi,
        developerMode: item.developerMode,
        mobile_name: item.Mobile_name,
        geofence: item.geofence,
        accuracy: item.accuracy,
        batteryOptimization: item.batteryOptimization,
        batterySaver: item.batterySaver,
      });

      // skip invalid coordinates
      if (
        !item.Lattitude ||
        !item.Longitude ||
        item.Lattitude === 'not found' ||
        item.Longitude === 'not found'
      ) {
        continue;
      }

      if (!lat || !long) {
        lat = item.Lattitude;
        long = item.Longitude;
        // ✅ push first valid point
        kmData.push(item);
        continue;
      }

      const lat1 = parseFloat(lat);
      const lon1 = parseFloat(long);
      const lat2 = parseFloat(item.Lattitude);
      const lon2 = parseFloat(item.Longitude);

      const kms = calcCrow(lat1, lon1, lat2, lon2) || 0;

      const isPunchType = [
        'punchin',
        'checkin',
        'checkout',
        'punchout',
        'login',
        'logout',
        'pluggedin',
        'pluggedout',
        'servicecheckin',
        'servicecheckout',
        'autocheckin',
        'autocheckout',
      ].includes(item.type);

      if (isPunchType) {
        kmData.push(item);
      }

      if (kms > 0.085) {
        totalKilometers += kms;
        lat = item.Lattitude;
        long = item.Longitude;
        const itemIndex = kmData?.findIndex(
          (x) => +x?.UserTrackingID === +item?.UserTrackingID,
        );
        if (itemIndex == -1) kmData.push(item);
      }
    }

    if (trackingKMs) {
      totalKilometers = trackingKMs.kilometer || 0;
      totalOpenSourceKiloMeters = trackingKMs.osr_Km || 0;
    }
    const showServiceCount = isCompanyWithServiceExpense(
      +findUserData.companyMasterId,
    );
    let totalServiceVisits = 0;
    if (showServiceCount) {
      const responseObj = await getUserDateWiseServiceVisitData({
        userMasterID,
        date,
      });
      totalServiceVisits = responseObj?.totalServiceVisits || 0;
    }
    const finalResponseObj = {
      tracking: kmData,
      trackingPoints: finalTracking,
      trackingKM: totalKilometers?.toFixed(2),
      trackingOpenSourceKM: totalOpenSourceKiloMeters?.toFixed(2),
      user: findUserData.displayName,
      firstName: findUserData.firstName,
      lastName: findUserData.lastName,
      photo: findUserData.photo,
      department:
        findUserData?.employeeDepartments?.[0]?.department?.departmentName ||
        '',
      designation:
        findUserData?.employeeDesignations?.[0]?.designation?.designationName ||
        '',
      totalVisit: getVisitData,
      totalExpense:
        totalDateWiseExpenseAmount == null
          ? 0
          : totalDateWiseExpenseAmount.total_amount,
      showOpenSourceDistance: checkOpenSourceDistence,
      showHarversineDistance: checkHaversineDistence,
      showServiceCount,
      totalServiceVisits,
    };

    return res.status(200).json({
      status: 200,
      message: message.usermessage.fetchMessage('Tracking'),
      data: finalResponseObj,
    });
  } catch (err) {
    next(err);
  }
};

exports.getUserTrackingInfo = async (req, res, next) => {
  try {
    const { userMasterID, date } = req.body;
    const get_one_data = await getTrackingDateWiseData(date, userMasterID, req);

    const trackingPoints = get_one_data
      .map((item) => ({
        address:
          item.Address !== 'not found' ? item.Address : 'Address Not Found',
        time: item.Track_datetime,
        type: item.type,
        battery: item.Battery,
        gps: item.Gps,
        wifi: item.Wifi,
        mobile_name: item.Mobile_name,
        developerMode: item.developerMode,
        geofence: item.geofence,
        accuracy: item.accuracy,
        batteryOptimization: item.batteryOptimization,
        batterySaver: item.batterySaver,
      }))
      .filter(
        (item) => item.type && item.type.toLowerCase() !== 'location timeout',
      );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.fetchMessage('Tracking'),
      data: trackingPoints,
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.getActiveUserandTrackingUserCount = async (req, res, next) => {
  try {
    const { companyMasterID, branchMasterID } = req.body;
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const findActiveUserCount = await UserMaster.findAll({
      where: {
        status: 1,
        companyMasterId: companyMasterID,
        ...userAccessCondition.where,
      },
      attributes: userAttributes,
      include: [
        ...userAccessCondition.includeModels,
        {
          required: branchMasterID && branchMasterID.length ? true : false,
          model: EmployeeBranch,
          where: {
            status: 1,
            ...(branchMasterID &&
              branchMasterID.length && { branchID: branchMasterID }),
            applicableDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
              { endDate: { [Sequelize.Op.is]: null } },
            ],
          },
          attributes: ['branchID'],
        },
        {
          required: false,
          model: UserTracking,
          as: 'userTracking',
          where: {
            trackStatus: 1,
          },
        },
      ],
    });

    const findTrackingUserCount = findActiveUserCount.filter(
      (e) => e.userTracking.length,
    ).length;

    return res.status(200).json({
      status: 200,
      data: {
        activeUser: findActiveUserCount.length,
        trackingUser: findTrackingUserCount,
      },
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.getTrackingGeoFenceWiseData = async (req, res, next) => {
  try {
    const { companyMasterID, branchMasterID, page, limit, type } = req.body;
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const trackingMigrationDate = new Date(TRACKING_MIGRATION_DATE);

    const trackingTargetModel =
      new Date(currentDate) >= trackingMigrationDate ? Tracking : TrackingOld;
    const trackingRowTable =
      new Date(currentDate) >= trackingMigrationDate
        ? 'trackings'
        : 'trackingOld';
    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const trackingSubquery = `( 
  SELECT t."geofence"
  FROM "${trackingRowTable}" t
  WHERE t."userMasterID" = "userMaster"."userMasterID"
  AND DATE(t."Track_datetime") = '${currentDate}'
  ORDER BY t."Track_datetime" DESC
  LIMIT 1
)`;
    let geofenceWhere = {};

    if (type === geoFenseType.INSIDE || type === geoFenseType.OUTSIDE) {
      geofenceWhere = Sequelize.where(
        Sequelize.literal(trackingSubquery),
        type,
      );
    } else if (type === geoFenseType.OFFLINE) {
      geofenceWhere = Sequelize.where(
        Sequelize.literal(`NOT EXISTS (
      SELECT 1 FROM "${trackingRowTable}" t
      WHERE t."userMasterID" = "userMaster"."userMasterID"
        AND DATE(t."Track_datetime") = '${currentDate}'
    )`),
        true,
      );
    } else if (type === geoFenseType.GPS_OFF) {
      geofenceWhere = {
        [Sequelize.Op.and]: [
          Sequelize.where(
            Sequelize.literal(`EXISTS (
          SELECT 1 FROM "${trackingRowTable}" t
          WHERE t."userMasterID" = "userMaster"."userMasterID"
          AND DATE(t."Track_datetime") = '${currentDate}'
        )`),
            true,
          ),
          Sequelize.where(
            Sequelize.literal(`(
          SELECT t."Gps"
          FROM "${trackingRowTable}" t
          WHERE t."userMasterID" = "userMaster"."userMasterID"
          AND DATE(t."Track_datetime") = '${currentDate}'
          ORDER BY t."Track_datetime" DESC
          LIMIT 1
        )`),
            'off',
          ),
        ],
      };
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const { rows: findActiveUserCount, count } =
      await UserMaster.findAndCountAll({
        distinct: true,
        where: {
          status: 1,
          companyMasterId: companyMasterID,
          ...userAccessCondition.where,
          ...(type &&
            [
              geoFenseType.INSIDE,
              geoFenseType.OUTSIDE,
              geoFenseType.OFFLINE,
              geoFenseType.GPS_OFF,
            ].includes(type) && {
              [Sequelize.Op.and]: [geofenceWhere],
            }),
        },

        ...paginationQuery,
        attributes: userAttributes,
        order: [['displayName', 'ASC']],

        include: [
          ...userAccessCondition.includeModels,
          {
            required: false,
            model: EmployeeJoiningDetails,
            attributes: ['employeeCode'],
          },
          {
            required: false,
            model: EmployeeDepartment,
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: currentDate },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: currentDate } },
                { endDate: { [Sequelize.Op.is]: null } },
              ],
            },
            attributes: ['departmentID'],
            include: [
              {
                model: Department,
                as: 'department',
                attributes: ['departmentName'],
              },
            ],
          },
          {
            required: branchMasterID && branchMasterID.length ? true : false,
            model: EmployeeBranch,
            where: {
              status: 1,
              ...(branchMasterID &&
                branchMasterID.length && { branchID: branchMasterID }),
              applicableDate: { [Sequelize.Op.lte]: currentDate },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: currentDate } },
                { endDate: { [Sequelize.Op.is]: null } },
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
          {
            required: false,
            model: EmployeeDesignation,
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: currentDate },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: currentDate } },
                { endDate: { [Sequelize.Op.is]: null } },
              ],
            },
            attributes: ['designationID'],
            include: [
              {
                model: Designation,
                as: 'designation',
                attributes: ['designationName'],
              },
            ],
          },
          {
            required: true,
            model: UserTracking,
            as: 'userTracking',
            where: {
              trackStatus: 1,
            },
          },
          {
            required: false,
            separate: false,
            model: trackingTargetModel,
            where: Sequelize.where(
              Sequelize.fn('DATE', Sequelize.col('Track_datetime')),
              currentDate,
            ),
            order: [['Track_datetime', 'DESC']],
            limit: 1,
          },
        ],
      });

    return res.status(200).json({
      status: 200,
      data: findActiveUserCount,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};

exports.calculateKmsByUserAndDate = async (req, res, next) => {
  try {
    const { userMasterID, date, fromDateTime, toDateTime } = req.body;

    if (!userMasterID) {
      return res.status(200).json({
        status: 401,
        message: 'userMasterID required',
      });
    }

    let start;
    let end;

    // Case 1: If datetime range provided
    if (fromDateTime && toDateTime) {
      start = fromDateTime;
      end = toDateTime;
    }
    // Case 2: fallback to full day
    else if (date) {
      start = `${date} 00:00:00`;
      end = `${date} 23:59:59`;
    } else {
      return res.status(200).json({
        status: 401,
        message: 'Provide either date OR fromDateTime & toDateTime',
      });
    }

    const logs = await Tracking.findAll({
      where: {
        userMasterID,
        Track_datetime: {
          [Sequelize.Op.between]: [start, end],
        },
      },
      order: [['Track_datetime', 'ASC']],
    });

    if (!logs.length) {
      return res.status(200).json({
        status: 404,
        message: 'No tracking found',
        data: {
          haversineKM: 0,
          osrmRouteWithGeometryKM: 0,
          osrmRouteDistanceKM: 0,
          osrmTableKM: 0,
          osrmMatchKM: 0,
        },
      });
    }
    const calcCrow = (lat1, lon1, lat2, lon2) => {
      const p = Math.PI / 180;
      const c = Math.cos;
      const a =
        0.5 -
        c((lat2 - lat1) * p) / 2 +
        (c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))) / 2;

      return 12742 * Math.asin(Math.sqrt(a));
    };

    let totalKM = 0;
    let lastLat = null;
    let lastLng = null;

    const osrmCoordinates = [];

    for (const item of logs) {
      if (
        !item.Lattitude ||
        !item.Longitude ||
        item.Lattitude === 'not found' ||
        item.Longitude === 'not found'
      ) {
        continue;
      }

      const lat = Number(item.Lattitude);
      const lng = Number(item.Longitude);

      // First valid point
      if (!lastLat || !lastLng) {
        lastLat = lat;
        lastLng = lng;

        osrmCoordinates.push({
          Lattitude: lat,
          Longitude: lng,
          Track_datetime: item.Track_datetime,
        });

        continue;
      }

      const kms = calcCrow(lastLat, lastLng, lat, lng);

      totalKM += kms;

      // Add only meaningful movement
      if (kms > 0.085) {
        osrmCoordinates.push({
          Lattitude: lat,
          Longitude: lng,
          Track_datetime: item.Track_datetime,
        });

        lastLat = lat;
        lastLng = lng;
      }
    }

    let routeWithGeometryKM = 0;
    let routeDistanceKM = 0;
    let tableDistanceKM = 0;
    let matchDistanceKM = 0;
    let routePointsCount = 0;

    if (osrmCoordinates.length >= 2) {
      const [geometryResult, routeResult, tableResult, matchResult] =
        await Promise.allSettled([
          getOSRMTrackingPoints_Route_API(osrmCoordinates),
          calculateOSRMDistance(osrmCoordinates),
          getDistanceByTableAPI(osrmCoordinates),
          getDistanceByMatchAPI(osrmCoordinates),
        ]);

      if (geometryResult.status === 'fulfilled') {
        routeWithGeometryKM = geometryResult.value?.distanceKM || 0;
        routePointsCount = geometryResult.value?.trackingPoints?.length || 0;
      }

      if (routeResult.status === 'fulfilled') {
        routeDistanceKM = routeResult.value || 0;
      }

      if (tableResult.status === 'fulfilled') {
        tableDistanceKM = tableResult.value || 0;
      }

      if (matchResult.status === 'fulfilled') {
        matchDistanceKM = matchResult.value || 0;
      }
    }

    return res.status(200).json({
      status: 200,
      userMasterID,
      start,
      end,

      totalLogs: logs.length,
      totalValidCoordinates: osrmCoordinates.length,
      routePointsCount,
      distance: {
        haversineKM: +totalKM.toFixed(2),
        osrmRouteWithGeometryKM: +routeWithGeometryKM.toFixed(2),
        osrmRouteDistanceKM: +routeDistanceKM.toFixed(2),
        osrmTableKM: +tableDistanceKM.toFixed(2),
        osrmMatchKM: +matchDistanceKM.toFixed(2),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getTrackingDirectionPoints = async (req, res, next) => {
  try {
    const { userMasterID, date } = req.body;

    if (!userMasterID || !date)
      return res
        .status(200)
        .json({ status: 401, message: 'Invalid parameters!', data: [] });
    const checkOpenSourceDistence = [
      distanceCalculationMethodENUM.OSRM,
      distanceCalculationMethodENUM.BOTH,
    ].includes(req.userDetails?.trackingRouteAPI);
    const checkHaversineDistence = [
      distanceCalculationMethodENUM.HAVERSINE,
      distanceCalculationMethodENUM.BOTH,
    ].includes(req.userDetails?.trackingRouteAPI);
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    const findUserData = await UserMaster.findOne({
      where: {
        userMasterID: userMasterID,
        status: [0, 1],
        ...userAccessCondition.where,
      },
      include: [...userAccessCondition.includeModels],
    });
    if (!findUserData) {
      return res.status(200).json({
        status: 200,
        message: message.usermessage.notFoundMessage('user'),
        data: [],
      });
    }
    let [trackingData, trackingKMs] = await Promise.all([
      getTrackingDateWiseData(date, userMasterID),
      getUserAndDateWiseTrackingKms(userMasterID, date),
    ]);

    const kmData = [];

    const trackingPoints = [];

    let lat = null;
    let long = null;
    let totalKilometers = 0;
    let totalOpenSourceKiloMeters = 0;
    for (const item of trackingData) {
      // Skip invalid coordinates
      if (
        !item.Lattitude ||
        !item.Longitude ||
        item.Lattitude === 'not found' ||
        item.Longitude === 'not found'
      ) {
        continue;
      }
      // First point
      if (!lat || !long) {
        lat = item.Lattitude;
        long = item.Longitude;
        trackingPoints.push(item);
        continue;
      }
      const kms =
        calcCrow(
          parseFloat(lat),
          parseFloat(long),
          parseFloat(item.Lattitude),
          parseFloat(item.Longitude),
        ) || 0;
      const isPunchType = [
        'punchin',
        'checkin',
        'checkout',
        'punchout',
        'login',
        'logout',
        'pluggedin',
        'pluggedout',
      ].includes(item.type);
      if (isPunchType || kms > 0.085) {
        trackingPoints.push(item);
        if (kms > 0.085) {
          totalKilometers += kms;
          lat = item.Lattitude;
          long = item.Longitude;
        }
      }
    }

    // Use stored KM values if available
    if (trackingKMs) {
      totalKilometers = Number(trackingKMs.kilometer || 0);
      totalOpenSourceKiloMeters = Number(trackingKMs.osr_Km || 0);
    }

    // Generate OSRM Route only when enabled
    let openSourceTrackingPoints = {
      trackingPoints: [],
      distanceKM: 0,
    };

    if (checkOpenSourceDistence && trackingPoints.length >= 2) {
      openSourceTrackingPoints =
        await getOSRMTrackingPoints_Match_API(trackingPoints);
    }

    return res.status(200).json({
      status: 200,
      message: message.usermessage.fetchMessage('Tracking'),
      data: {
        showOpenSourceDistance: checkOpenSourceDistence,
        showHarversineDistance: checkHaversineDistence,
        trackingKM: Number(totalKilometers).toFixed(2),
        trackingOpenSourceKM: Number(totalOpenSourceKiloMeters).toFixed(2),
        tracking: trackingPoints,
        openSourceTrackingPoints:
          openSourceTrackingPoints?.trackingPoints || [],
        trackingOpenSourceKMCalculated: Number(
          openSourceTrackingPoints?.distanceKM || 0,
        ).toFixed(2),
      },
    });
  } catch (err) {
    next(err);
  }
};
