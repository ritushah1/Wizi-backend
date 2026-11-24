const { Sequelize } = require('sequelize');
const { adminUserTypesSet, customClientTypes } = require('../utils/commonVars');
const RolePermission = require('../models/rolePermission');
const {
  getCompanyActiveSubscriptionData,
} = require('../utils/commonUtilFunctions');
const ProductPermission = require('../models/productPermission');
const FormMaster = require('../models/formMaster');
const OperationMaster = require('../models/operation');
const { sendForbidden } = require('./tokenverify');
const { checkOperationPermission } = require('../utils/labelUtils');
const { companyMasterIDENUM } = require('../utils/dbUtils');

function checkRoleOperationPermission({ requiredPermissionList = [] }) {
  return async (req, res, next) => {
    try {
      const { userType, role, companyMasterId, apiCallFrom } =
        req.userDetails || {};
      // Bypass For Other Projects
      if (!checkOperationPermission) {
        return next();
      }
      // Admin bypass
      if (adminUserTypesSet.has(+userType)) {
        return next();
      }

      if (
        (!apiCallFrom || apiCallFrom == customClientTypes.MOBILE) &&
        companyMasterId &&
        +companyMasterId !== +companyMasterIDENUM.N_S_Construction
      ) {
        return next();
      }
      if (!requiredPermissionList.length || !role || !companyMasterId) {
        return sendForbidden({ res });
      }

      // Check company subscription
      const subscriptionData =
        await getCompanyActiveSubscriptionData(companyMasterId);

      const companySubScriptionData =
        subscriptionData?.companySubscription || null;
      if (!companySubScriptionData) {
        return sendForbidden({
          res,
          message: 'Company subscription is not active!',
        });
      }

      const permissionNames = [
        ...new Set(
          requiredPermissionList.map(({ permissionName }) => permissionName),
        ),
      ];

      // Get forms
      const findFormMaster = await FormMaster.findAll({
        attributes: ['formMasterID', 'formName'],
        where: {
          formName: {
            [Sequelize.Op.in]: permissionNames,
          },
        },
      });
      if (!findFormMaster.length) {
        return sendForbidden({
          res,
          message: 'Your Do not Have Access To this Module',
        });
      }
      const formMasterIDs = findFormMaster.map(
        ({ formMasterID }) => formMasterID,
      );

      // Check whether requested modules are available in plan
      const findProductPermission = await ProductPermission.findAll({
        attributes: ['formMasterID'],
        where: {
          productMasterID: companySubScriptionData.productMasterID,
          formMasterID: {
            [Sequelize.Op.in]: formMasterIDs,
          },
        },
      });

      if (!findProductPermission.length) {
        return sendForbidden({
          res,
          message: 'You Plan Do not Have Access To this Module',
        });
      }

      // Get role permissions
      const findRolePermission = await RolePermission.findAll({
        attributes: ['formMasterID'],
        where: {
          roleMasterID: role.roleMasterID,
          formMasterID: {
            [Sequelize.Op.in]: formMasterIDs,
          },
        },
        include: [
          {
            model: FormMaster,
            attributes: ['formMasterID', 'formName'],
          },
          {
            model: OperationMaster,
            attributes: ['operationID', 'operationName'],
          },
        ],
      });

      if (!findRolePermission.length) {
        return sendForbidden({
          res,
          message: 'Your Role Do not Have Access To this Module',
        });
      }

      // Create O(1) lookup set
      const rolePermissionSet = new Set(
        findRolePermission.map(
          ({ formMaster, operation }) =>
            `${formMaster.formName}:${operation.operationName}`,
        ),
      );

      // Check required permission
      const hasPermission = requiredPermissionList.some(
        ({ permissionName, operation }) =>
          rolePermissionSet.has(`${permissionName}:${operation}`),
      );

      if (!hasPermission) {
        return sendForbidden({
          res,
          message: 'Your Role Do not Have Access To this Module Permssion',
        });
      }

      return next();
    } catch (error) {
      console.error('check Role Operation Permission:', error);
      next();
    }
  };
}

module.exports = {
  checkRoleOperationPermission,
};
