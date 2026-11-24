const Sequelize = require('sequelize');
const UserExpense = require('../models/userExpense');
const sequelize = require('../config/database');
const message = require('../response_message/message');
const {
  asiaKolkataDateTime,
  paginateArray,
  findAuthorizationDetails,
  sendMailforExpense_With_Transaction,
  findCompanyNotificationPolicy,
  generateHTMLToPDF_base64Path,
  getHTMLFileData,
  getHTMLTemplate,
  readHTMLFile,
} = require('../utils/commonUtilFunctions');

const { generateExcel } = require('../utils/exportData');
const moment = require('moment');
const {
  mainApiUrl,
  ProjectName,
  projectNamesList,
  MEHTA_SERVICE_API_URL,
  MEHTA_SERVICE_API_KEY,
} = require('../utils/labelUtils');
const axios = require('axios');
const { mehtaServiceAPIRoutes } = require('../utils/commonVars');

exports.getEmployeeServiceList = async (req, res, next) => {
  try {
    let {
      serviceDate = null,
      userMasterID = null,
      page,
      limit,
      exportData,
    } = req.body;
    if (!userMasterID) {
      userMasterID = +req.userDetails.userMasterId;
    }

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const paginationQuery = {};
    if (!exportData && page && limit) {
      paginationQuery.offset = (+page - 1) * +limit;
      paginationQuery.limit = +limit;
    }
    let serviceData = [];
    let serviceCount = 0;
    const params = {};
    if (serviceDate) {
      params.docDate = serviceDate;
    }
    const baseURL = `${MEHTA_SERVICE_API_URL}${mehtaServiceAPIRoutes.GET_EMPLOYEE_SERVICE_LIST}${userMasterID}`;
    try {
      const response = await axios.get(baseURL, {
        params,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': MEHTA_SERVICE_API_KEY,
        },
      });

      serviceData = response.data?.data || [];
      serviceCount += response.data?.total || 0;
    } catch (error) {
      console.error(
        'Failed to fetch attendance from server:',
        error.response ? error.response.data : error.message,
      );

      throw new Error(
        (error?.response ? error?.response.data : error?.message) ||
          'Failed to fetch Service from server',
      );
    }
    if (exportData) {
      const finalDataToExport = [];

      await generateExcel(finalDataToExport, 'Employee Service', 'xlsx', res);
      return;
    }
    return res.status(200).json({
      data: serviceData,
      status: 200,
      totalcount: serviceCount || 0,
    });
  } catch (err) {
    next(err);
  }
};

exports.getEmployeeServiceDataByServiceNumber = async (req, res, next) => {
  try {
    let { serviceNumber, userExpenseID } = req.body;
    const baseURL = `${MEHTA_SERVICE_API_URL}${mehtaServiceAPIRoutes.GET_COMPLAIN_VISITLOGS_BY_COMPLAIN_NO}${serviceNumber}`;
    let response = null;

    try {
      response = await axios.get(baseURL, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': MEHTA_SERVICE_API_KEY,
        },
      });
    } catch (error) {
      console.error(
        'Failed to fetch attendance from server:',
        error.response ? error.response.data : error.message,
      );

      throw new Error(
        (error?.response ? error?.response.data : error?.message) ||
          'Failed to fetch Service from server',
      );
    }
    let serviceExpenseAppliedDate = null;
    if (userExpenseID) {
      const findUserExpense = await UserExpense.findOne({
        where: {
          userExpenseID,
        },
      });
      if (findUserExpense && findUserExpense.serviceDate) {
        serviceExpenseAppliedDate = moment(
          findUserExpense.serviceDate,
          'YYYY-MM-DD',
        ).format('DD-MM-YYYY');
      }
    }
    const responseData = response.data?.data || null;
    const responseObj = {
      serviceNumber: responseData?.complainInward?.complainNo || null,
      serviceDate: responseData?.complainInward?.docDate
        ? moment(responseData.complainInward.docDate).format('DD-MM-YYYY')
        : null,
      serviceRemarks: responseData?.complainInward?.remark || null,
      serialNo: responseData?.complainInward?.serialNo || null,
      itemName: responseData?.complainInward?.itemName || null,
      serviceTitle: responseData?.complainInward?.title || null,
      machineStatus: responseData?.complainInward?.machineStatus || null,
      complainStatus: responseData?.complainInward?.ComplainStatus || null,
      customerName: responseData?.customer?.customerName || null,
      customerAddress: responseData?.customer?.customerAddress || null,
      customerCompanyName: responseData?.customer?.companyName || null,
      visitData:
        responseData?.visitLogs?.map((x) => ({
          checkInDateTime: x.checkInDateTime || null,
          checkOutDateTime: x.checkOutDateTime || null,
          visitRemarks: x.remark || null,
        })) || [],
      serviceExpenseAppliedDate,
    };
    return res.status(200).json({
      data: responseObj,
      status: 200,
    });
  } catch (err) {
    next(err);
  }
};

exports.getEmployeeServiceDataByUserDateWise = async (req, res, next) => {
  try {
    const { userMasterID, date } = req.body;

    const responseObj = await this.getUserDateWiseServiceVisitData({
      userMasterID,
      date,
    });
    //  /complainVisitLogs/by-engineer?tpUserId=123&date=2026-05-27

    return res.status(200).json({
      data: responseObj,
      status: 200,
    });
  } catch (err) {
    next(err);
  }
};

exports.getUserDateWiseServiceVisitData = async ({ userMasterID, date }) => {
  const responseObj = {
    totalServiceVisits: 0,
    serviceVisits: [],
  };
  try {
    const baseURL = `${MEHTA_SERVICE_API_URL}${mehtaServiceAPIRoutes.GET_COMPLAIN_VISITLOGS_BY_USER_DATEWISE}`;
    const params = { tpUserId: userMasterID, date: date };
    const response = await axios.get(baseURL, {
      params,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': MEHTA_SERVICE_API_KEY,
      },
    });
    const responseData = response.data || null;
    responseObj.totalServiceVisits = responseData?.total || 0;
    responseObj.serviceVisits = responseData || [];
    return responseObj;
  } catch (error) {
    console.error(
      'Failed to fetch attendance from server:',
      error.response ? error.response.data : error.message,
    );
    return responseObj;
  }
};
