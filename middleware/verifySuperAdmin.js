const { UserTypesEnum } = require('../utils/dbUtils');
const { sendAuthorizationDenied } = require('./tokenverify');

/**
 * Verifies that the logged-in user is a Super Admin
 * Must be used after verifyToken middleware
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns App to proceed with next step in lifecycle of application
 */

async function verifySuperAdmin(req, res, next) {
  try {
    const userDetails = req.userDetails;

    if (
      !userDetails ||
      Number(userDetails.userType) !== UserTypesEnum.SUPER_ADMIN
    ) {
      return sendAuthorizationDenied({ res });
    }

    next();
  } catch (err) {
    return sendAuthorizationDenied({ res });
  }
}

module.exports = { verifySuperAdmin };
