const companyMaster = require('../models/companyMaster');
const UserMaster = require('../models/userMaster');
const { getDecodedJwtToken } = require('../utils/jsonwebtoken.utils');

const { cookieNamesEnum } = require('../utils/commonVars');
const cookie = require('cookie');

/**
 * Verifies the token received in the socket query or cookie
 * @returns App to proceed with next step in lifecycle of application
 */
async function verifyAuthForSocket(socket, next) {
  let token = socket.handshake.query?.Authorization?.replace('Bearer ', '');
  
  if (!token && socket.handshake.headers?.cookie) {
    const parsedCookies = cookie.parse(socket.handshake.headers.cookie);
    token = parsedCookies[cookieNamesEnum.AUTHENTICATION_TOKEN];
  }

  if (!token || !token.trim()) {
    return next(new Error('Authentication error'));
  }
    try {
      const tokenData = await getDecodedJwtToken(token);
      const userMasterId = tokenData.token.usermasterid;
      const userDetails = await UserMaster.findOne({
        where: { userMasterID: userMasterId, status: 1 },
        include: companyMaster,
        nest: true,
      });
      if (!userDetails || +userDetails.companyMaster.status !== 1)
        return next(new Error('Authentication error'));
      socket.userDetails = {
        userMasterId,
        userName: userDetails.displayName,
        companyMasterId: userDetails.companyMaster.companyMasterID,
        parentCompanyMasterId: userDetails.companyMaster.parentCompanyMasterID,
      };
      return next();
    } catch (error) {
      return next(error);
    }
}

module.exports = { verifyAuthForSocket };
