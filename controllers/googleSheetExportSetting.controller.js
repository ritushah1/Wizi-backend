const Sequelize = require('sequelize');
const GoogleSheetExportSetting = require('../models/googleSheetExportSetting');
const message = require('../response_message/message');
const companyMaster = require('../models/companyMaster');
const FormMaster = require('../models/formMaster');
const ProductPermission = require('../models/productPermission');
const subscriptionPlan = require('../models/subscriptionPlan');
const ProductMaster = require('../models/productMaster');

exports.postAddGoogleSheetExportSetting = async (req, res, next) => {
  try {
    const { companyMasterID, formMasterID } = req.body;
    const existing = await GoogleSheetExportSetting.findOne({
      where: { companyMasterID, formMasterID },
    });
    if (existing) {
      return res.status(400).json({
        status: 400,
        message:
          'Google Sheet Export Setting already exists for this company and form.',
      });
    }

    await GoogleSheetExportSetting.create(
      { companyMasterID, formMasterID },
      { user: req.userDetails },
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Google Sheet Export Setting'),
    });
  } catch (err) {
    next(err);
  }
};

exports.postDeleteGoogleSheetExportSettingById = async (req, res, next) => {
  try {
    const { companyMasterID, formMasterID } = req.body;
    const updateBy = req.userDetails.userMasterId;
    const googleSheetExportSetting = await GoogleSheetExportSetting.findOne({
      where: { companyMasterID, formMasterID },
    });

    if (!googleSheetExportSetting) {
      return res.status(200).json({
        status: 404,
        message:
          'Google Sheet Export Setting not found for this company and form.',
      });
    }
    await GoogleSheetExportSetting.destroy({
      where: {
        googleSheetExportSettingID:
          googleSheetExportSetting.googleSheetExportSettingID,
      },
      individualHooks: true,
      user: req.userDetails,
    });
    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Google Sheet Export Setting'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getGoogleSheetExportSettingByCompanyId = async (req, res, next) => {
  try {
    const companyid = req.params.id;
    const data = await GoogleSheetExportSetting.findAll({
      where: { companyMasterID: companyid },
      order: [['createdAt', 'DESC']],
    });
    return res.status(200).json({ status: 200, data });
  } catch (err) {
    next(err);
  }
};

// Toggle endpoint: update isEnabled for a company + form

exports.getAllGoogleSheetExportSettingDataById = async (req, res, next) => {
  try {
    const { companyMasterID } = req.body;

    // Child company condition
    const findCompany = await companyMaster.findOne({
      where: { companyMasterID },
      raw: true,
    });

    const companyMasterIDCheck =
      +findCompany.parentCompanyMasterID === 0
        ? findCompany.companyMasterID
        : findCompany.parentCompanyMasterID;

    const getActivePlan = await subscriptionPlan.findOne({
      where: {
        companyMasterID: companyMasterIDCheck,
        status: 1,
      },
      include: [
        {
          model: ProductMaster,
          attributes: ['productMasterID'],
          include: [
            {
              model: ProductPermission,
              attributes: ['formMasterID'],
              include: [
                {
                  model: FormMaster,
                  attributes: ['formName', 'formMasterID', 'isGoogleSheet'],
                  where: { isGoogleSheet: true },
                },
              ],
            },
          ],
        },
      ],
    });

    const enabledForm = await GoogleSheetExportSetting.findAll({
      where: {
        companyMasterID,
      },
      raw: true,
    });

    const enabledFormMap = new Map(
      enabledForm.map((item) => [item.formMasterID, item]),
    );

    const processedForms = new Set();
    const responseArray = [];

    const formMasterData =
      getActivePlan?.productMaster?.productPermissions || [];

    for (const data of formMasterData) {
      const formMasterID = data.formMaster?.formMasterID;

      // Skip duplicate forms
      if (!formMasterID || processedForms.has(formMasterID)) {
        continue;
      }

      processedForms.add(formMasterID);

      const formWiseEnabledData = enabledFormMap.get(formMasterID);

      responseArray.push({
        formName: data.formMaster?.formName || '',
        formMasterID,
        isEnabled: !!formWiseEnabledData,
        googleSheetExportSettingID:
          formWiseEnabledData?.googleSheetExportSettingID || null,
      });
    }

    return res.status(200).json({
      status: 200,
      data: responseArray,
    });
  } catch (err) {
    next(err);
  }
};
