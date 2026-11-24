const companyMaster = require('../models/companyMaster');
const UserMaster = require('../models/userMaster');
const {
  roles,
  envType,
  customClientTypes,
  cookieNamesEnum,
} = require('../utils/commonVars');
const {
  roleType,
  companyAccessType,
  distanceCalculationMethodENUM,
} = require('../utils/dbUtils');
const RoleMaster = require('../models/roleMaster');
const UserRole = require('../models/userRole');
const Timezone = require('../models/timezone');
const RoleMasterBranchWise = require('../models/roleMasterBranchWise');
const { getDecodedJwtToken } = require('../utils/jsonwebtoken.utils');
const { clearCookieInResponse } = require('../utils/authCookie.utils');

/**
 * Verifies the token received in the header of each request
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns App to proceed with next step in lifecycle of application
 */

const sendAuthorizationDenied = ({
  res,
  message = 'Authorization Denied!',
  isExpired = true,
}) => {
  clearCookieInResponse(res);
  return res.status(403).json({
    msg: message,
    isExpired,
  });
};
const sendForbidden = ({ res, message = 'Authorization Denied!' }) => {
  return res.status(401).json({
    msg: message,
  });
};
async function verifyToken(req, res, next) {
  const bearerHeader =
    req.cookies?.[cookieNamesEnum.AUTHENTICATION_TOKEN] ||
    req.headers?.authorization;
  if (
    !req.headers?.authorization &&
    !req.cookies?.[cookieNamesEnum.AUTHENTICATION_TOKEN]
  ) {
    return sendAuthorizationDenied({
      res,
      message: 'Login required!',
      isExpired: false,
    });
  }
  if (!bearerHeader) return sendAuthorizationDenied({ res, isExpired: true });

  const token = bearerHeader.replace('Bearer ', '');
  if (!token && !token.trim()) return sendAuthorizationDenied({ res });

  try {
    const tokenData = await getDecodedJwtToken(token);
    const userMasterId = tokenData.token.usermasterid;
    const userType = tokenData.token.userType;
    const passChangedCount = tokenData.token?.passChangedCount;
    const webTokenVersion = tokenData.token?.webTokenVersion || 0;
    const appTokenVersion = tokenData.token?.appTokenVersion || 0;
    const apiCallFrom =
      tokenData.token?.apiCallFrom || req.headers['x-client-type'] || null;
    if (
      !apiCallFrom &&
      [customClientTypes.WEB, customClientTypes.MOBILE].includes(apiCallFrom)
    ) {
      return sendAuthorizationDenied({ res });
    }
    let userDetails = await UserMaster.findOne({
      where: { userMasterID: userMasterId, status: 1 },
      include: [
        {
          model: companyMaster,
          where: { status: 1 },
          attributes: [
            'companyMasterID',
            'parentCompanyMasterID',
            'status',
            'visit_Auto_Check',
            'distanceMethod',
          ],
          include: {
            required: false,
            model: Timezone,
            attributes: ['timezone'],
          },
        },
        {
          required: false,
          model: Timezone,
          attributes: ['timezone'],
        },
        {
          required: false,
          separate: true,
          model: UserRole,
          attributes: ['roleMasterID'],
          include: [
            {
              model: RoleMaster,
              attributes: [
                'roleName',
                'roleType',
                'companyAccessType',
                'roleMasterID',
              ],
              include: [
                {
                  separate: true,
                  model: RoleMasterBranchWise,
                  attributes: ['branchMasterID'],
                },
              ],
            },
          ],
        },
      ],
      attributes: [
        'userMasterID',
        'displayName',
        'passChangedCount',
        'webTokenVersion',
        'appTokenVersion',
        'admin',
        'resetpassword',
        'email',
        'userNumber',
        'companyMasterId',
      ],
      nest: true,
    });
    userDetails = userDetails.toJSON();

    if (
      userDetails.passChangedCount !== 0 &&
      userDetails.passChangedCount !== passChangedCount
    ) {
      return sendAuthorizationDenied({ res });
    }
    if (
      [envType.PRODUCTION, envType.QA, envType.STAGE].includes(
        process.env.NODE_ENV,
      )
    ) {
      if (apiCallFrom === customClientTypes.WEB) {
        if (+userDetails.webTokenVersion !== +webTokenVersion) {
          return sendAuthorizationDenied({ res });
        }
      }
      if (apiCallFrom === customClientTypes.MOBILE) {
        if (+userDetails.appTokenVersion !== +appTokenVersion) {
          return sendAuthorizationDenied({ res });
        }
      }
    }

    const userTimezone = userDetails?.timezone?.timezone;
    const companyTimezone = userDetails?.companyMaster?.timezone?.timezone;
    const tokenTimezone = tokenData?.token?.timezone;

    // if(ProjectName == projectNamesList.PIH || ProjectName == projectNamesList.MARS ) {
    //   if(tokenTimezone !== TIMEZONE) {
    //     return sendAuthorizationDenied({ res });
    //   }
    // } else {
    //   if (userTimezone) {
    //     // User timezone exists — must match
    //     if (userTimezone !== tokenTimezone) {
    //       return sendAuthorizationDenied({ res });
    //     }
    //   } else if (companyTimezone) {
    //     // User timezone missing — check company timezone
    //     if (companyTimezone !== tokenTimezone) {
    //       return sendAuthorizationDenied({ res });
    //     }
    //   } else {
    //     // Both missing — fallback to default asia/kolkata
    //     if (tokenTimezone !== TIMEZONE) {
    //       return sendAuthorizationDenied({ res });
    //     }
    //   }
    // }

    if (!userDetails || +userDetails.companyMaster.status !== 1)
      return sendAuthorizationDenied({ res });

    let role = {
      roleType: roleType.COMPANY_WISE,
      companyAccessType: companyAccessType.OWN_PLUS_CHILD_COMPANY,
      roleMasterID: null,
    };

    const userRoleMaster = userDetails.userRoles?.[0]?.roleMaster || null;
    if (userRoleMaster && userRoleMaster.roleType == roleType.BRANCH_WISE) {
      role.roleMasterID = userRoleMaster.roleMasterID;
      role.roleType = roleType.BRANCH_WISE;
      role.companyAccessType = companyAccessType.OWN_COMPANY;
    } else if (
      userRoleMaster &&
      userRoleMaster.companyAccessType == companyAccessType.OWN_COMPANY
    ) {
      role.roleMasterID = userRoleMaster.roleMasterID;
      role.companyAccessType = companyAccessType.OWN_COMPANY;
    } else if (userRoleMaster) {
      role.roleMasterID = userRoleMaster.roleMasterID;
    }

    req.userDetails = {
      tokenData,
      userData: userDetails,
      userMasterId,
      userIpAddress: req.headers['x-forwarded-for'],
      companyMasterId: userDetails.companyMaster.companyMasterID,
      accessibleCompanies: [+userDetails.companyMaster.companyMasterID],
      accessibleBranches: [],
      accessibleWorkerTypes: [],
      accessibleUsers: [],
      rolePermissionName: req.headers['x-permission-name'] || null,
      parentCompanyMasterId: userDetails?.companyMaster?.parentCompanyMasterID,
      role,
      userType,
      timezone: userTimezone || companyTimezone || 'asia/kolkata',
      trackingRouteAPI:
        userDetails.companyMaster?.distanceMethod ||
        distanceCalculationMethodENUM.HAVERSINE,
      visitAutoCheckInOut:
        userDetails?.companyMaster?.visit_Auto_Check || false,
      isMyUserDetails: false,
      apiCallFrom: apiCallFrom,
    };
    next();
  } catch (err) {
    return sendAuthorizationDenied({ res, isExpired: true });
  }
}

/**
 * Verifies the short-lived JWT issued after OTP verification
 */
async function verifyOtpToken(req, res, next) {
  const bearerHeader =
    req.cookies?.[cookieNamesEnum.AUTHENTICATION_TOKEN] ||
    req.headers?.authorization;
  if (!bearerHeader) return sendAuthorizationDenied({ res });

  const token = bearerHeader.replace('Bearer ', '').trim();
  if (!token) return sendAuthorizationDenied({ res });

  try {
    const decoded = await getDecodedJwtToken(token);
    const tokenData = decoded.token || {};

    if (!tokenData.mobileNumber) {
      return sendAuthorizationDenied({
        res,
        message: 'Invalid token payload.',
      });
    }
    req.mobileNumber = tokenData.mobileNumber;
    next();
  } catch (err) {
    return sendAuthorizationDenied({ res });
  }
}

async function verifyMultiUserLoginToken(req, res, next) {
  const bearerHeader =
    req.cookies?.[cookieNamesEnum.AUTHENTICATION_TOKEN] ||
    req.headers?.authorization;
  if (!bearerHeader) return sendAuthorizationDenied({ res });

  const token = bearerHeader.replace('Bearer ', '').trim();
  if (!token) return sendAuthorizationDenied({ res });

  try {
    const decoded = await getDecodedJwtToken(token);
    const tokenData = decoded.token || {};
    if (!tokenData.phone || !tokenData.password) {
      return sendAuthorizationDenied({
        res,
        message: 'Invalid token payload.',
      });
    }
    req.tokenDetails = {
      phone: tokenData.phone,
      password: tokenData.password,
      multiCompanyUser: tokenData.multiCompanyUser || false,
      companyIDs: tokenData.companyIDs || [],
    };
    next();
  } catch (err) {
    return sendAuthorizationDenied({ res });
  }
}

async function verifyTwoFactorUserLoginToken(req, res, next) {
  const bearerHeader =
    req.cookies?.[cookieNamesEnum.AUTHENTICATION_TOKEN] ||
    req.headers?.authorization;
  if (!bearerHeader) return sendAuthorizationDenied({ res });

  const token = bearerHeader.replace('Bearer ', '').trim();
  if (!token) return sendAuthorizationDenied({ res });

  try {
    const decoded = await getDecodedJwtToken(token);
    const tokenData = decoded.token || {};
    if (!tokenData.phone || !tokenData.password) {
      return sendAuthorizationDenied({
        res,
        message: 'Invalid token payload.',
      });
    }
    req.tokenDetails = {
      phone: tokenData.phone,
      password: tokenData.password,
      isTwoFactorEnabled: tokenData.isTwoFactorEnabled,
      userMasterID: tokenData.userMasterID,
      companyMasterID: tokenData.companyMasterID,
    };
    next();
  } catch (err) {
    return sendAuthorizationDenied({ res });
  }
}
async function verifyAwsSignedFileToken(req, res, next) {
  const token = req.body?.filePathToken || null;
  if (!token) return sendAuthorizationDenied({ res });

  try {
    const decoded = await getDecodedJwtToken(token);
    const tokenData = decoded.token || {};

    req.tokenDetails = tokenData;
    next();
  } catch (err) {
    return sendAuthorizationDenied({ res });
  }
}
module.exports = {
  verifyToken,
  verifyOtpToken,
  verifyMultiUserLoginToken,
  verifyTwoFactorUserLoginToken,
  sendAuthorizationDenied,
  sendForbidden,
  verifyAwsSignedFileToken,
};
