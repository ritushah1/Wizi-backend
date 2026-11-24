const CompanyApiKey = require('../models/companyApiKey');
const companyMaster = require('../models/companyMaster');
const { sendAuthorizationDenied, sendForbidden } = require('./tokenverify');

async function verifyApiKey(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return sendForbidden({ res, message: 'API Key missing' });
    }

    const apiData = await CompanyApiKey.findOne({
      where: {
        apiKey: apiKey,
        status: 1,
      },
      include: [
        {
          model: companyMaster,
          where: { status: 1 },
          required: true,
        },
      ],
    });

    if (!apiData) {
      return sendAuthorizationDenied({
        res,
        message: 'Invalid token payload.',
      });
    }

    let parentChildCompanyMasterIDs = [apiData.companyMasterID];

    if (
      apiData?.showChildParentCompanyData &&
      +apiData.companyMaster?.parentCompanyMasterID === 0
    ) {
      const findCompanyIDs = await companyMaster.findAll({
        where: {
          parentCompanyMasterID: apiData.companyMasterID,
          status: 1,
        },
        attributes: ['companyMasterID'],
        raw: true,
      });

      parentChildCompanyMasterIDs = [
        apiData.companyMasterID,
        ...findCompanyIDs.map((company) => company.companyMasterID),
      ];
    }

    req.company = {
      apiKeyID: apiData.companyApiKeyID,
      companyMasterID: apiData.companyMasterID,
      company: apiData.companyMaster,
      parentChildCompanyMasterIDs,
    };

    return next();
  } catch (err) {
    return sendAuthorizationDenied({ res });
  }
}

module.exports = { verifyApiKey };
