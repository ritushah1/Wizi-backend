const express = require('express');
const canteenMealsController = require('../controllers/canteenMeals.controller');
const { checkRoleOperationPermission } = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post('/v1/add', checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CANTEENMEALS,
        operation: formOperation.CREATE,
      },
    ],
  }),canteenMealsController.add); // save data
router.put('/v1/update/:id',checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CANTEENMEALS,
        operation: formOperation.EDIT,
      },
    ],
  }), canteenMealsController.update); // update data
router.get('/v1/getById/:id',checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CANTEENMEALS,
        operation: formOperation.EDIT,
      },
    ],
  }), canteenMealsController.getById); // get data by id
router.post('/v1/list',checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CANTEENMEALS,
        operation: formOperation.VIEW,
      },
    ],
  }), canteenMealsController.list); // list data
router.put('/v1/statusChangeById/:id',checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CANTEENMEALS,
        operation: formOperation.EDIT,
      },
    ],
  }), canteenMealsController.statusChangeById); // list data


module.exports = router;