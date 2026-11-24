const { Sequelize } = require('sequelize');
const CompanyType = require('../models/companytypeMaster');
const CityMaster = require('../models/citymaster');
const ProductMaster = require('../models/productMaster');
const ExistingAttendanceProcess = require('../models/existingAttendanceProcess');
const moment = require('moment');
const { generateExcel } = require('../utils/exportData');
const { UserTypesEnum } = require('../utils/dbUtils');
const UserMaster = require('../models/userMaster');
const StateMaster = require('../models/statemaster');
const CountryMaster = require('../models/countrymaster');
const MomDetails = require('../models/momDetails');
const message = require('../response_message/message');
const {
  generateHTMLToPDF_base64Path,
} = require('../utils/commonUtilFunctions');
const { statusCodes } = require('../utils/commonVars');
const { mainApiUrl } = require('../utils/labelUtils');
const MomFollowUp = require('../models/momFollowUp');
const Handlebars = require('handlebars');

exports.addMomDetails = async (req, res, next) => {
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
      userMasterID = null,
      meetingMode=null,
      meetingOn=null,
      meetingLink=null
    } = req.body;
    const userType = +req.userDetails.userType;
    const loggedInUserMasterID = +req.userDetails.userMasterId;
    await MomDetails.create(
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
        meetingMode,
        meetingOn,
        meetingLink
      },
      { user: req.userDetails },
    );
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Demo MOM'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllMomDetails = async (req, res, next) => {
  try {
    const {
      limit,
      page,
      searchQuery,
      exportData,
      fromDate,
      toDate,
      userMasterID,
    } = req.body;
    const userType = +req.userDetails.userType;
    const loggedInUserMasterID = +req.userDetails.userMasterId;

    const condition = {};
    if (userType == UserTypesEnum.SUPER_ADMIN) {
      if (userMasterID) {
        condition.userMasterID = userMasterID;
      }
    } else {
      condition.userMasterID = loggedInUserMasterID;
    }
    if (searchQuery) {
      condition[Sequelize.Op.or] = [
        {
          companyName: {
            [Sequelize.Op.iLike]: `%${searchQuery}%`,
          },
        },
        {
          meetingWith: {
            [Sequelize.Op.iLike]: `%${searchQuery}%`,
          },
        },
        {
          designation: {
            [Sequelize.Op.iLike]: `%${searchQuery}%`,
          },
        },
      ];
    }

    const paginationQuery = {};
    if (!exportData && page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    if (fromDate && toDate) {
      condition.meetingDate = {
        [Sequelize.Op.between]: [new Date(fromDate), new Date(toDate)],
      };
    }

    const { rows: momDetailsData, count } = await MomDetails.findAndCountAll({
      distinct: true,
      where: condition,
      ...paginationQuery,
      attributes: {
        include: [
          [
            Sequelize.literal(`(
              SELECT COUNT(*)
              FROM "momFollowUps" AS "mfu"
              WHERE "mfu"."momDetailID" = "momDetail"."momDetailID"
              AND "mfu"."deletedAt" IS NULL
            )`),
            'momFollowUpsCount',
          ],
        ],
      },
      order: [
        ['meetingDate', 'DESC'],
        ['meetingTime', 'DESC'],
      ],
      include: [
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
      const finaldata = momDetailsData.map((e, index) => {
        return {
          // ================= DETAILS Of Meetings =================

          'Demo Participant': e.marketingPerson?.displayName || null,
          'Meeting Date': e.meetingDate
            ? moment(e.meetingDate).format('DD-MM-YYYY')
            : null,
          'Meeting Time': e.meetingTime || null,
          'Meeting Mode':e.meetingMode || null,
          'Meeting On':e.meetingOn || null,
          // ================= Customer DETAILS =================
          'Company Name': e.companyName || null,
          'Meeting With': e.meetingWith || null,
          Designation: e.designation || null,
          'Company Industry': e.companyType?.companyTypename || null,
          City: e.cityMaster?.cityName || null,
          State: e.cityMaster?.stateMaster?.stateName || null,
          Country:
            e.cityMaster?.stateMaster?.countryMaster?.countryName || null,
          'Total Employees': e.totalEmployees || 0,
          'Field Employees': e.fieldEmployee || 0,
          'Existing Attendance':
            e.existingAttendance?.attendanceProcessName || null,
          'Meeting Remarks': e.meetingRemarks || null,
          // ================= Point Discussed =================
          'Intrested Plan': e.productMaster?.productName || null,
          // ================= MOBILE APPLICATION =================
          'Mobile Application': e.mobileApplication ? 'Yes' : 'No',
          'Mobile Punch In/Out': e.ma_PunchInPunchOut ? 'Yes' : 'No',
          'Mobile Leave Management': e.ma_Leave ? 'Yes' : 'No',
          'Mobile Visit Management': e.ma_Visit ? 'Yes' : 'No',
          'Mobile Customer Creation': e.ma_Customer ? 'Yes' : 'No',
          'Mobile Expense Management': e.ma_Expense ? 'Yes' : 'No',
          'Mobile Loan & Advance Management': e.ma_LoanAndAdvance
            ? 'Yes'
            : 'No',
          'Mobile Mirayo AI': e.ma_MirayoAi ? 'Yes' : 'No',
          // ================= WEB APPLICATION =================
          'Web Application': e.webApplication ? 'Yes' : 'No',
          'WA Org Details': e.wa_OrgDetails ? 'Yes' : 'No',
          'WA Employee Master': e.wa_EmployeeMaster ? 'Yes' : 'No',
          'WA Payroll Management': e.wa_Payroll ? 'Yes' : 'No',
          'WA Salary': e.wa_Salary ? 'Yes' : 'No',
          'WA Overtime Management': e.wa_Overtime ? 'Yes' : 'No',
          'WA Reports': e.wa_Reports ? 'Yes' : 'No',
          'WA Tracking Application': e.wa_Tracking ? 'Yes' : 'No',
          'WA Mirayo AI': e.wa_MirayoAi ? 'Yes' : 'No',
          // ================= Interest =================
          Interested: e.interested ? 'Yes' : 'No',
          'Next Follow Up': e.nextFollowUpDate
            ? moment(e.nextFollowUpDate).format('DD-MM-YYYY')
            : null,
          'Follow-Up Remarks': e.followUpRemarks || null,
          // ================= AUDIT =================
          'Created Details': e.createdBy
            ? `${e.createdBy?.displayName} - ${moment(e.createdAt).format('DD-MM-YYYY HH:mm')}`
            : null,
          'Updated Details': e.updatedBy
            ? `${e.updatedBy?.displayName} - ${moment(e.updatedAt).format('DD-MM-YYYY HH:mm')}`
            : '',
        };
      });

      return await generateExcel(finaldata, 'Demo Mom', 'xlsx', res);
    }

    return res.status(200).json({
      status: 200,
      data: momDetailsData,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};
exports.getMomDetailsById = async (req, res, next) => {
  try {
    const { momDetailID, exportData } = await req.body;
    if (!momDetailID)
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ message: message.errorMessage.INVALID_FILTER_FIELDS });
    const findMoMData = await MomDetails.findOne({
      where: { momDetailID },
      order: [
        [{ model: MomFollowUp, as: 'momFollowUps' }, 'meetingDate', 'ASC'],
        [{ model: MomFollowUp, as: 'momFollowUps' }, 'meetingTime', 'ASC'],
      ],

      include: [
        {
          model: MomFollowUp,
          as: 'momFollowUps',
          include: [
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
        meetingMode:findMoMData.meetingMode || null,
        meetingOn:findMoMData.meetingOn || null,
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
          findMoMData.existingAttendanceProcess?.attendanceProcessName || null,
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

      const followUp = findMoMData.momFollowUps?.map((f, index) => ({
        ApiURL: mainApiUrl,
        // ================= DETAILS Of Meetings =================
        index: index + 1,
        demoParticipant: f.marketingPerson?.displayName || null,
        meetingDate: f.meetingDate
          ? moment(f.meetingDate).format('DD-MM-YYYY')
          : null,
        meetingTime: f.meetingTime || null,
        // ================= Customer DETAILS =================
        companyName: f.companyName || null,
        meetingWith: f.meetingWith || null,
        designation: f.designation || null,
        companyIndustry: f.companyType?.companyTypename || null,
        city: f.cityMaster?.cityName || null,
        state: f.cityMaster?.stateMaster?.stateName || null,
        country: f.cityMaster?.stateMaster?.countryMaster?.countryName || null,
        totalEmployees: f.totalEmployees || 0,
        fieldEmployees: f.fieldEmployee || 0,
        existingAttendance: f.existingAttendance?.attendanceProcessName || null,
        meetingRemarks: f.meetingRemarks || null,
        // ================= Point Discussed =================
        intrestedPlan: f.productMaster?.productName || null,
        // ================= MOBILE APPLICATION =================
        mobileApplication: f.mobileApplication ? 'Yes' : 'No',
        ma_PunchInPunchOut: f.ma_PunchInPunchOut ? 'Yes' : 'No',
        ma_Leave: f.ma_Leave ? 'Yes' : 'No',
        ma_Visit: f.ma_Visit ? 'Yes' : 'No',
        ma_Customer: f.ma_Customer ? 'Yes' : 'No',
        ma_Expense: f.ma_Expense ? 'Yes' : 'No',
        ma_LoanAndAdvance: f.ma_LoanAndAdvance ? 'Yes' : 'No',
        ma_MirayoAi: f.ma_MirayoAi ? 'Yes' : 'No',

        // ================= WEB APPLICATION =================
        WebApplication: f.webApplication ? 'Yes' : 'No',
        wa_OrgDetails: f.wa_OrgDetails ? 'Yes' : 'No',
        wa_EmployeeMaster: f.wa_EmployeeMaster ? 'Yes' : 'No',
        wa_Payroll: f.wa_Payroll ? 'Yes' : 'No',
        wa_Salary: f.wa_Salary ? 'Yes' : 'No',
        wa_Overtime: f.wa_Overtime ? 'Yes' : 'No',
        wa_Reports: f.wa_Reports ? 'Yes' : 'No',
        wa_Tracking: f.wa_Tracking ? 'Yes' : 'No',
        wa_MirayoAi: f.wa_MirayoAi ? 'Yes' : 'No',

        // ================= Interest =================
        interested: f.interested ? 'Yes' : 'No',

        nextFollowUpDate: f.nextFollowUpDate
          ? moment(f.nextFollowUpDate).format('DD-MM-YYYY')
          : null,
        followUpRemarks: f.followUpRemarks || null,

        // ================= AUDIT =================
        createdDetails: f.createdBy
          ? `${f.createdBy?.displayName} - ${moment(f.createdAt).format('DD-MM-YYYY HH:mm')}`
          : null,
        updatedDetails: f.updatedBy
          ? `${f.updatedBy?.displayName} - ${moment(f.updatedAt).format('DD-MM-YYYY HH:mm')}`
          : '',
      }));

      const pdfData = {
        ...voucherData,
        followUp,
      };

      let base64path = '';

      base64path = await generateHTMLToPDF_base64Path(
        pdfData,
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
        status: 200,
      });
    }
  } catch (err) {
    next(err);
  }
};
exports.updateMomDetails = async (req, res, next) => {
  try {
    const loggedInUserMasterID = +req.userDetails.userMasterId;
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
      meetingMode=null,
      meetingOn=null,
      meetingLink=null
    } = req.body;
    const momDetails = await MomDetails.findOne({
      where: { momDetailID: momDetailID },
    });
    if (!momDetails) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('no MOM details found'),
      });
    }
    await MomDetails.update(
      {
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
        meetingMode,
        meetingOn,
        meetingLink
      },
      {
        where: { momDetailID: momDetailID },
        individualHooks: true,
        user: req.userDetails,
      },
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('MOM details'),
    });
  } catch (err) {
    next(err);
  }
};
