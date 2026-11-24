const axios = require('axios');
const crypto = require('crypto');
const OAuthState = require('../models/oauthState');
const ZohoIntegration = require('../models/zohoIntegration');
const { statusCodes } = require('../utils/commonVars');
const message = require('../response_message/message');
const ZohoAccountMapping = require('../models/zohoAccountMapping');
const { accountingTypeEnum } = require('../utils/dbUtils');
const { getValidZohoAccessToken } = require('../utils/zohoCommonUtils');

/* =====================================================
   1️⃣ Generate Zoho Authorization URL
===================================================== */
exports.getZohoAuthUrl = async (req, res, next) => {
  try {
    const allowedKeys = ['companyMasterID'];

    const invalidKeys = invalidKeyParams(req.query, allowedKeys);

    if (invalidKeys.length > 0) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Invalid body parameter(s): ${invalidKeys.join(', ')}`,
      });
    }
    const { companyMasterID } = req.query;

    if (!companyMasterID) {
      return res.status(400).json({
        success: false,
        message: 'companyMasterID is required',
      });
    }

    // Generate unique state for CSRF protection
    const state = crypto.randomBytes(20).toString('hex');

    // ✅ FIXED: Use actual companyMasterID from request
    await OAuthState.create(
      {
        state,
        companyMasterID: companyMasterID, // NOT hardcoded 68!
        expires_at: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
      { user: req.userDetails },
    );

    // ✅ FIXED: Build authorization URL WITHOUT client_secret
    const params = new URLSearchParams({
      scope: 'ZohoBooks.fullaccess.all',
      client_id: process.env.ZOHO_CLIENT_ID,
      // ❌ REMOVED: client_secret (never in auth URL!)
      response_type: 'code',
      redirect_uri: process.env.ZOHO_REDIRECT_URI, // Use env variable
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    const authUrl = `${process.env.ZOHO_ACCOUNTS_BASE_URL}/oauth/v2/auth?${params.toString()}`;

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      authUrl,
      message: 'Authorization URL generated successfully',
    });
  } catch (err) {
    next(err);
  }
};

/* =====================================================
   2️⃣ OAuth Callback Handler
===================================================== */
exports.getAuthorizeUserData = async (req, res, next) => {
  try {
    const allowedKeys = ['code', 'state', 'accounts-server', 'location'];

    const invalidKeys = invalidKeyParams(req.query, allowedKeys);

    if (invalidKeys.length > 0) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Invalid body parameter(s): ${invalidKeys.join(', ')}`,
      });
    }

    const { code, state } = req.query;
    const accountsServer =
      req.query['accounts-server'] || process.env.ZOHO_ACCOUNTS_BASE_URL;

    // Validate required parameters
    if (!code || !state) {
      return res.status(400).json({
        success: false,
        message: 'Missing authorization code or state parameter',
      });
    }

    // Verify state exists and is valid
    const stateRecord = await OAuthState.findOne({
      where: { state },
    });

    if (!stateRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OAuth state - possible CSRF attack',
      });
    }

    // Check if state has expired
    if (new Date(stateRecord.expires_at) < new Date()) {
      await stateRecord.destroy();
      return res.status(400).json({
        success: false,
        message: 'OAuth state has expired. Please try again.',
      });
    }

    // ✅ FIXED: Get companyMasterID from state record (not hardcoded!)
    const companyMasterID = stateRecord.companyMasterID;
    const createBy = stateRecord.createBy;
    const createByIp = stateRecord.createByIp;

    // ✅ FIXED: Clean up used state
    await stateRecord.destroy();

    // Exchange authorization code for tokens
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET,
      redirect_uri: process.env.ZOHO_REDIRECT_URI, // Use env variable
      code,
    });

    const tokenResponse = await axios.post(
      `${accountsServer}/oauth/v2/token`,
      tokenParams.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    const { access_token, refresh_token, expires_in, api_domain } =
      tokenResponse.data;

    if (!access_token || !refresh_token) {
      throw new Error('Failed to obtain access tokens from Zoho');
    }

    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // Update or create integration record
    const [integration, created] = await ZohoIntegration.findOrCreate({
      where: { companyMasterID },
      defaults: {
        companyMasterID,
        refresh_token,
        access_token,
        expires_at: expiresAt,
        api_domain,
        isActive: true,
        organizationID: null,
        organizationName: null,
        createBy,
        createByIp,
      },
      hooks: false,
    });

    if (!created) {
      await integration.update(
        {
          refresh_token,
          access_token,
          expires_at: expiresAt,
          api_domain,
          isActive: true,
          organizationID: null,
          organizationName: null,
          updateBy: createBy,
          updateByIp: createByIp,
        },
        { hooks: false },
      );
    }

    console.log(
      `${process.env.HRMS_WEB_URL}app/utilitys/zoho-integration?companyMasterID=${companyMasterID}`,
    );
    return res.redirect(
      `${process.env.HRMS_WEB_URL}app/utilitys/zoho-integration?companyMasterID=${companyMasterID}`,
    );
  } catch (error) {
    next(error);
  }
};

/* =====================================================
   7️⃣ Fetch Zoho Organizations (Using Stored Token)
===================================================== */
exports.fetchZohoOrganizations = async (req, res, next) => {
  try {
    const allowedKeys = ['companyMasterID'];

    const invalidKeys = invalidKeyParams(req.query, allowedKeys);

    if (invalidKeys.length > 0) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Invalid body parameter(s): ${invalidKeys.join(', ')}`,
      });
    }

    const { companyMasterID } = req.query;

    if (!companyMasterID) {
      return res.status(400).json({
        success: false,
        message: 'companyMasterID is required',
      });
    }

    // ✅ Get valid access token (auto refresh supported)
    const { access_token, api_domain } =
      await getValidZohoAccessToken(companyMasterID);

    // ✅ Call Zoho API
    const response = await axios.get(`${api_domain}/books/v3/organizations`, {
      headers: {
        Authorization: `Zoho-oauthtoken ${access_token}`,
      },
    });

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data: response.data.organizations,
      message: message.usermessage.fetchMessage('organizations'),
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

/* =====================================================
   4️⃣ Fetch Zoho Customers
===================================================== */
exports.fetchZohoCustomers = async (req, res, next) => {
  try {
    const allowedKeys = ['companyMasterID'];

    const invalidKeys = invalidKeyParams(req.query, allowedKeys);

    if (invalidKeys.length > 0) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Invalid body parameter(s): ${invalidKeys.join(', ')}`,
      });
    }

    const { companyMasterID } = req.query;

    if (!companyMasterID) {
      return res.status(400).json({
        success: false,
        message: 'companyMasterID is required',
      });
    }

    const { access_token, api_domain, organizationID } =
      await getValidZohoAccessToken(companyMasterID);

    const response = await axios.get(`${api_domain}/books/v3/contacts`, {
      headers: {
        Authorization: `Zoho-oauthtoken ${access_token}`,
      },
      params: {
        organization_id: organizationID,
      },
    });

    return res.status(200).json({
      success: true,
      data: response.data,
      message: 'Customers fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/* =====================================================
   5️⃣ Check Integration Status
===================================================== */
exports.checkIntegrationStatus = async (req, res, next) => {
  try {
    const allowedKeys = ['companyMasterID'];

    const invalidKeys = invalidKeyParams(req.query, allowedKeys);

    if (invalidKeys.length > 0) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Invalid body parameter(s): ${invalidKeys.join(', ')}`,
      });
    }

    const { companyMasterID } = req.query;

    if (!companyMasterID) {
      return res.status(400).json({
        success: false,
        message: 'companyMasterID is required',
      });
    }

    const integration = await ZohoIntegration.findOne({
      where: { companyMasterID },
      attributes: [
        'id',
        'organizationID',
        'organizationName',
        'expires_at',
        'createdAt',
      ],
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Zoho integration not found',
        isConnected: false,
      });
    }

    return res.status(200).json({
      success: true,
      isConnected: true,
      data: {
        organizationID: integration.organizationID,
        organizationName: integration.organizationName,
        connectedAt: integration.createdAt,
        tokenExpiry: integration.expires_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* =====================================================
   6️⃣ Disconnect Zoho Integration
===================================================== */
exports.disconnectZoho = async (req, res, next) => {
  try {
    const allowedKeys = ['companyMasterID'];

    const invalidKeys = invalidKeyParams(req.query, allowedKeys);

    if (invalidKeys.length > 0) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Invalid body parameter(s): ${invalidKeys.join(', ')}`,
      });
    }

    const { companyMasterID } = req.query;

    if (!companyMasterID) {
      return res.status(400).json({
        success: false,
        message: 'companyMasterID is required',
      });
    }

    const integration = await ZohoIntegration.findOne({
      where: { companyMasterID },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'No integration found to disconnect',
      });
    }

    try {
      const revokeResponse = await axios.post(
        `${process.env.ZOHO_ACCOUNTS_BASE_URL}/oauth/v2/token/revoke`,
        new URLSearchParams({
          token: integration.refresh_token,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
    } catch (revokeError) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: revokeError?.response?.data || revokeError.message,
      });
    }
    integration.organizationID = null;
    integration.organizationName = null;
    integration.refresh_token = null;
    integration.access_token = null;
    integration.isActive = false;
    integration.accountingType = null;

    await integration.save({ user: req.userDetails });

    await ZohoAccountMapping.destroy({
      where: {
        companyMasterID,
      },
    });

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: 'Zoho integration disconnected successfully',
    });
  } catch (error) {
    next(error);
  }
};

/* =====================================================
   6️⃣ Disconnect Zoho Integration
===================================================== */
exports.updateZohoOrganizations = async (req, res, next) => {
  try {
    const allowedKeys = [
      'companyMasterID',
      'organizationID',
      'organizationName',
      'accountingType',
    ];

    const invalidKeys = invalidKeyParams(req.body, allowedKeys);

    if (invalidKeys.length > 0) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Invalid body parameter(s): ${invalidKeys.join(', ')}`,
      });
    }

    const {
      companyMasterID,
      organizationID,
      organizationName,
      accountingType,
    } = req.body;

    if (
      accountingType &&
      !Object.values(accountingTypeEnum).includes(accountingType)
    ) {
      return res.status(statusCodes.BAD_REQUEST).json({
        success: statusCodes.BAD_REQUEST,
        message: 'Invalid Accounting Type!',
      });
    }

    const exists = await ZohoIntegration.count({
      where: { organizationID, isActive: true },
    });

    if (exists) {
      return res.status(statusCodes.BAD_REQUEST).json({
        success: statusCodes.BAD_REQUEST,
        message: 'Organization already integrated',
      });
    }

    const integration = await ZohoIntegration.findOne({
      where: { companyMasterID },
    });

    if (integration.organizationID) {
      return res.status(statusCodes.BAD_REQUEST).json({
        success: statusCodes.BAD_REQUEST,
        message: 'Organization already selected in this integration!',
      });
    }

    integration.organizationID = organizationID;
    integration.organizationName = organizationName;
    integration.accountingType = accountingType;

    await integration.save({ user: req.userDetails });
    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: 'Zoho organization details updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

exports.fetchZohoChartOfAccounts = async (req, res, next) => {
  try {
    const allowedKeys = ['companyMasterID'];

    const invalidKeys = invalidKeyParams(req.query, allowedKeys);

    if (invalidKeys.length > 0) {
      await transaction.rollback();
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Invalid body parameter(s): ${invalidKeys.join(', ')}`,
      });
    }

    const { companyMasterID } = req.query;

    if (!companyMasterID) {
      return res.status(400).json({ message: 'companyMasterID is required' });
    }

    const company = await getValidZohoAccessToken(companyMasterID);

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    if (!company.organizationID) {
      return res
        .status(400)
        .json({ message: 'Zoho organization not connected' });
    }

    const response = await axios.get(
      `${company.api_domain}/books/v3/chartofaccounts`,
      {
        params: {
          organization_id: company.organizationID,
        },
        headers: {
          Authorization: `Zoho-oauthtoken ${company.access_token}`,
        },
      },
    );

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data: response.data,
      message: 'Chart of accounts fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

function invalidKeyParams(query, allowedKeys) {
  return Object.keys(query).filter((key) => !allowedKeys.includes(key));
}

module.exports = exports;
