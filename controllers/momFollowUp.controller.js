const CityMaster = require('../models/citymaster');
const CompanyType = require('../models/companytypeMaster');
const CountryMaster = require('../models/countrymaster');
const ExistingAttendanceProcess = require('../models/existingAttendanceProcess');
const MomDetails = require('../models/momDetails');
const MomFollowUp = require('../models/momFollowUp');
const ProductMaster = require('../models/productMaster');
const StateMaster = require('../models/statemaster');
const UserMaster = require('../models/userMaster');
const message = require('../response_message/message');
const { mainApiUrl } = require('../utils/labelUtils');
const moment = require('moment');
const {
  generateHTMLToPDF_base64Path,
} = require('../utils/commonUtilFunctions');
const { statusCodes } = require('../utils/commonVars');
const { where } = require('sequelize');

exports.addMomFollowUp = async (req, res, next) => {
  try {
    const {
      meetingDate = null,
      meetingTime = null,
      companyName = null,
      meetingWith = null,
      designation = null,
      companyTypeID = null,
      cityMasterID = null,
      totalEmployees = null,
      fieldEmployee = null,
      attendanceProcessID = null,
      meetingRemarks = null,
      productMasterID = null,
      webApplication = false,
      mobileApplication = false,
      ma_PunchInPunchOut = false,
      ma_Leave = false,
      ma_Visit = false,
      ma_Customer = false,
      ma_Expense = false,
      ma_LoanAndAdvance = false,
      ma_MirayoAi = false,
      wa_OrgDetails = false,
      wa_EmployeeMaster = false,
      wa_Payroll = false,
      wa_Salary = false,
      wa_Overtime = false,
      wa_Reports = false,
      wa_Tracking = false,
      wa_MirayoAi = false,
      interested = false,
      nextFollowUpDate = null,
      followUpRemarks = null,
      momDetailID = null,
      userMasterID = null,
    } = req.body;
    const loggedInUserMasterID = +req.userDetails.userMasterId;
    await MomFollowUp.create(
      {
        userMasterID: loggedInUserMasterID,
        meetingDate,
        meetingTime,
        companyName,
        meetingWith,
        designation,
        companyTypeID,
        cityMasterID,
        totalEmployees,
        fieldEmployee,
        attendanceProcessID,
        meetingRemarks,
        productMasterID,
        webApplication,
        mobileApplication,
        ma_PunchInPunchOut,
        ma_Leave,
        ma_Visit,
        ma_Customer,
        ma_Expense,
        ma_LoanAndAdvance,
        ma_MirayoAi,
        wa_OrgDetails,
        wa_EmployeeMaster,
        wa_Payroll,
        wa_Salary,
        wa_Overtime,
        wa_Reports,
        wa_Tracking,
        wa_MirayoAi,
        interested,
        nextFollowUpDate,
        followUpRemarks,
        momDetailID,
      },
      { user: req.userDetails },
    );
    return res.json({
      status: 200,
      message: message.usermessage.addMessage('MOM Follow up'),
    });
  } catch (err) {
    next(err);
  }
};
exports.getAllMomFollowUpById = async (req, res, next) => {
  try {
    const { momDetailID } = req.body;
    if (!momDetailID) {
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ message: message.errorMessage.INVALID_FILTER_FIELDS });
    }

    const data = await MomFollowUp.findAll({
      where: { momDetailID },
      include: [
        {
          model: MomDetails,
          attributes: ['momDetailID'],
        },
        {
          model: UserMaster,
          as: 'marketingPerson',
          attributes: ['displayName'],
        },
        {
          model: CompanyType,
          attributes: ['companyTypeID', 'companyTypename'],
        },
        {
          model: CityMaster,
          attributes: ['cityName', 'stateMasterID'],
          include: [
            {
              model: StateMaster,
              attributes: ['stateName', 'countryMasterID'],
              include: [
                {
                  model: CountryMaster,
                  attributes: ['countryName'],
                },
              ],
            },
          ],
        },
        {
          model: ProductMaster,
          attributes: ['productMasterID', 'productName'],
        },
        {
          model: ExistingAttendanceProcess,
          attributes: ['attendanceProcessID', 'attendanceProcessName'],
        },
        { model: UserMaster, as: 'createdBy', attributes: ['displayName'] },
        { model: UserMaster, as: 'updatedBy', attributes: ['displayName'] },
      ],
      order: [
        ['meetingDate', 'DESC'],
        ['meetingTime', 'DESC'],
      ],
    });
    return res.json({ status: 200, data: data });
  } catch (err) {
    next(err);
  }
};
exports.getMomFollowUpById = async (req, res, next) => {
  try {
    const { momFollowUpID, exportData } = req.body;
    const findMoMData = await MomFollowUp.findOne({
      where: { momFollowUpID: momFollowUpID },

      include: [
        {
          model: MomDetails,
          attributes: ['momDetailID'],
        },
        {
          model: UserMaster,
          as: 'marketingPerson',
          attributes: ['displayName'],
        },
        {
          model: CompanyType,
          attributes: ['companyTypeID', 'companyTypename'],
        },
        {
          model: CityMaster,
          attributes: ['cityName', 'stateMasterID'],
          include: [
            {
              model: StateMaster,
              attributes: ['stateName', 'countryMasterID'],
              include: [
                {
                  model: CountryMaster,
                  attributes: ['countryName'],
                },
              ],
            },
          ],
        },
        {
          model: ProductMaster,
          attributes: ['productMasterID', 'productName'],
        },
        {
          model: ExistingAttendanceProcess,
          attributes: ['attendanceProcessID', 'attendanceProcessName'],
        },
        { model: UserMaster, as: 'createdBy', attributes: ['displayName'] },
        { model: UserMaster, as: 'updatedBy', attributes: ['displayName'] },
      ],
    });
    if (exportData) {
      const voucherData = {
        ApiURL: mainApiUrl,
        // ================= DETAILS Of Meetings =================
        demoParticipant: findMoMData.marketingPerson?.displayName || null,
        meetingDate: findMoMData.meetingDate
          ? moment(findMoMData.meetingDate).format('DD-MM-YYYY')
          : null,
        meetingTime: findMoMData.meetingTime || null,
        // ================= Customer DETAILS =================
        companyName: findMoMData.companyName || null,
        meetingWith: findMoMData.meetingWith || null,
        designation: findMoMData.designation || null,
        companyIndustry: findMoMData.companyType?.companyTypename || null,
        city: findMoMData.cityMaster?.cityName || null,
        state: findMoMData.cityMaster?.stateMaster?.stateName || null,
        country:
          findMoMData.cityMaster?.stateMaster?.countryMaster?.countryName ||
          null,
        totalEmployees: findMoMData.totalEmployees || 0,
        fieldEmployees: findMoMData.fieldEmployee || 0,
        existingAttendance:
          findMoMData.existingAttendance?.attendanceProcessName || null,
        meetingRemarks: findMoMData.meetingRemarks || null,
        // ================= Point Discussed =================
        intrestedPlan: findMoMData.productMaster?.productName || null,
        // ================= MOBILE APPLICATION =================
        mobileApplication: findMoMData.mobileApplication ? 'Yes' : 'No',
        ma_PunchInPunchOut: findMoMData.ma_PunchInPunchOut ? 'Yes' : 'No',
        ma_Leave: findMoMData.ma_Leave ? 'Yes' : 'No',
        ma_Visit: findMoMData.ma_Visit ? 'Yes' : 'No',
        ma_Customer: findMoMData.ma_Customer ? 'Yes' : 'No',
        ma_Expense: findMoMData.ma_Expense ? 'Yes' : 'No',
        ma_LoanAndAdvance: findMoMData.ma_LoanAndAdvance ? 'Yes' : 'No',
        ma_MirayoAi: findMoMData.ma_MirayoAi ? 'Yes' : 'No',

        // ================= WEB APPLICATION =================
        WebApplication: findMoMData.webApplication ? 'Yes' : 'No',
        wa_OrgDetails: findMoMData.wa_OrgDetails ? 'Yes' : 'No',
        wa_EmployeeMaster: findMoMData.wa_EmployeeMaster ? 'Yes' : 'No',
        wa_Payroll: findMoMData.wa_Payroll ? 'Yes' : 'No',
        wa_Salary: findMoMData.wa_Salary ? 'Yes' : 'No',
        wa_Overtime: findMoMData.wa_Overtime ? 'Yes' : 'No',
        wa_Reports: findMoMData.wa_Reports ? 'Yes' : 'No',
        wa_Tracking: findMoMData.wa_Tracking ? 'Yes' : 'No',
        wa_MirayoAi: findMoMData.wa_MirayoAi ? 'Yes' : 'No',

        // ================= Interest =================
        interested: findMoMData.interested ? 'Yes' : 'No',

        nextFollowUpDate: findMoMData.nextFollowUpDate
          ? moment(findMoMData.nextFollowUpDate).format('DD-MM-YYYY')
          : null,
        followUpRemarks: findMoMData.followUpRemarks || null,

        // ================= AUDIT =================
        createdDetails: findMoMData.createdBy
          ? `${findMoMData.createdBy?.displayName} - ${moment(findMoMData.createdAt).format('DD-MM-YYYY HH:mm')}`
          : null,
        updatedDetails: findMoMData.updatedBy
          ? `${findMoMData.updatedBy?.displayName} - ${moment(findMoMData.updatedAt).format('DD-MM-YYYY HH:mm')}`
          : '',
      };

      let base64path = '';

      base64path = await generateHTMLToPDF_base64Path(
        voucherData,
        'demoMom',
        'portrait',
        'html', //File Extension
      );
      return res.status(200).json({
        data: base64path,
        status: 200,
      });
    } else {
      return res.status(200).json({
        data: findMoMData,
        message: message.usermessage.fetchMessage('MOM Follow Up'),
        status: 200,
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.updateMomFollowUp = async (req, res, next) => {
  try {
    const {
      meetingDate = null,
      meetingTime = null,
      companyName = null,
      meetingWith = null,
      designation = null,
      companyTypeID = null,
      cityMasterID = null,
      totalEmployees = null,
      fieldEmployee = null,
      attendanceProcessID = null,
      meetingRemarks = null,
      productMasterID = null,
      webApplication = false,
      mobileApplication = false,
      ma_PunchInPunchOut = false,
      ma_Leave = false,
      ma_Visit = false,
      ma_Customer = false,
      ma_Expense = false,
      ma_LoanAndAdvance = false,
      ma_MirayoAi = false,
      wa_OrgDetails = false,
      wa_EmployeeMaster = false,
      wa_Payroll = false,
      wa_Salary = false,
      wa_Overtime = false,
      wa_Reports = false,
      wa_Tracking = false,
      wa_MirayoAi = false,
      interested = false,
      nextFollowUpDate = null,
      followUpRemarks = null,
      momDetailID = null,
      momFollowUpID = null,
    } = req.body;
    if (!momFollowUpID) {
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ message: message.errorMessage.INVALID_FILTER_FIELDS });
    }
    const result = await MomFollowUp.findOne({
      where: { momFollowUpID: momFollowUpID },
    });
    if (!result) {
      return res
        .status(statusCodes.NOT_FOUND)
        .json({ message: message.errorMessage.INVALID_FILTER_FIELDS });
    }
    const loggedInUserMasterID = +req.userDetails.userMasterId;
    await MomFollowUp.update(
      {
        meetingDate,
        userMasterID: loggedInUserMasterID,
        meetingTime,
        companyName,
        meetingWith,
        designation,
        companyTypeID,
        cityMasterID,
        totalEmployees,
        fieldEmployee,
        attendanceProcessID,
        meetingRemarks,
        productMasterID,
        webApplication,
        mobileApplication,
        ma_PunchInPunchOut,
        ma_Leave,
        ma_Visit,
        ma_Customer,
        ma_Expense,
        ma_LoanAndAdvance,
        ma_MirayoAi,
        wa_OrgDetails,
        wa_EmployeeMaster,
        wa_Payroll,
        wa_Salary,
        wa_Overtime,
        wa_Reports,
        wa_Tracking,
        wa_MirayoAi,
        interested,
        nextFollowUpDate,
        followUpRemarks,
        momDetailID,
      },
      {
        where: { momFollowUpID: momFollowUpID },
        individualHooks: true,
        user: req.userDetails,
      },
    );
    return res.json({
      status: 200,
      message: message.usermessage.updateMessage('Mom Follow Up'),
    });
  } catch (err) {
    next(err);
  }
};
