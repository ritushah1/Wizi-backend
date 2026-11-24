/** @format */

const Inquiries = require('../models/inquiries');
const CityMaster = require('../models/citymaster');
const StateMaster = require('../models/statemaster');
const CountryMaster = require('../models/countrymaster');
const message = require('../response_message/message');
const { statusCodes } = require('../utils/commonVars');
const { getTimezone } = require('../utils/commonUtilFunctions');

/**
 * POST /inquiries/v1/addInquiry
 * Upserts the inquiry row (created as a draft during OTP flow) with full form data.
 */
exports.addInquiry = async (req, res, next) => {
  try {
    const {
      totalEmployees,
      fieldEmployees,
      companyEmail,
      contactPersonFirstName,
      contactPersonLastName,
      address,
      cityMasterID,
    } = req.body;

    const { mobileNumber } = req;
    let timezoneID = req.body?.timezoneID;
    if(!timezoneID){
      timezoneID = await getTimezone() || null;
    }

    if (totalEmployees < 10) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'Minimum 10 employees are required.',
      });
    }

    if (Number(fieldEmployees) > Number(totalEmployees)) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'Field employees cannot be greater than total employees.',
      });
    }

    if (!mobileNumber) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.UNAUTHORIZED,
        message: 'Mobile number not found in session.',
      });
    }

    // Find the draft row created during OTP flow and update it,
    // or create a fresh record if somehow none exists.
    const [inquiry, created] = await Inquiries.findOrCreate({
      where: { mobileNumber },
      defaults: {
        totalEmployees,
        fieldEmployees,
        companyEmail,
        mobileNumber,
        contactPersonFirstName,
        contactPersonLastName,
        address,
        cityMasterID,
        completedStep: 1,
        timezoneID
      },
    });

    if (!created) {
      await inquiry.update({
        totalEmployees,
        fieldEmployees,
        companyEmail,
        contactPersonFirstName,
        contactPersonLastName,
        address,
        cityMasterID,
        completedStep: 1,
        timezoneID
      });
    }

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: message.usermessage.addMessage('Inquiry'),
      data: {
        inquiryID: inquiry.inquiryID,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /inquiries/v1/getInquiry
 * Returns the existing draft inquiry for the authenticated mobile number
 */
exports.getInquiry = async (req, res, next) => {
  try {
    const { mobileNumber } = req;

    const inquiry = await Inquiries.findOne({
      where: { mobileNumber },
      include: [
        {
          model: CityMaster,
          attributes: ['cityMasterID', 'cityName', 'stateMasterID'],
          include: [
            {
              model: StateMaster,
              attributes: ['stateMasterID', 'stateName', 'countryMasterID'],
              include: [
                {
                  model: CountryMaster,
                  attributes: ['countryMasterID', 'countryName'],
                },
              ],
            },
          ],
        },
      ],
    });

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: inquiry
        ? message.usermessage.fetchMessage('Inquiry')
        : message.usermessage.notFoundMessage('Inquiry'),
      data: inquiry || {},
    });
  } catch (err) {
    next(err);
  }
};
