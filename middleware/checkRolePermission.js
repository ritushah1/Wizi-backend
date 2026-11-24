const RolePermission = require('../models/rolePermission');
const FormMaster = require('../models/formMaster');
const { adminUserTypesSet } = require('../utils/commonVars');
const { sendAuthorizationDenied } = require('./tokenverify');

async function checkRolePermission(req, res, next) {
  try {
    const { userData, role, rolePermissionName } = req.userDetails;

    if (!userData) {
      return sendAuthorizationDenied({ res });
    }
    // ✅ Admin bypass
    if (adminUserTypesSet.has(+userData.admin)) return next();

    if (!role || !role.roleMasterID) {
      return sendAuthorizationDenied({ res });
    }
    if (rolePermissionName) {
      const findRolePermission = await RolePermission.findOne({
        where: {
          roleMasterID: role.roleMasterID,
        },
        order: [['rolePermissionID', 'ASC']],
        include: [
          {
            model: FormMaster,
            where: {
              formName: rolePermissionName,
            },
            attributes: ['formName'],
          },
        ],
        attributes: [
          'rolePermissionID',
          'hasWorkerTypes',
          'workerTypes',
          'formMasterID',
        ],
      });
      if (!findRolePermission) {
        return sendAuthorizationDenied({ res });
      }
      if (findRolePermission.hasWorkerTypes) {
        req.userDetails.accessibleWorkerTypes =
          findRolePermission.workerTypes || [];
      }
    }
    next();
  } catch (err) {
    return sendAuthorizationDenied({ res });
  }
}
module.exports = { checkRolePermission };
