const express = require('express');
const hrLeaveBalance = require('../controllers/hrLeaveBalance.controller');
const router = express.Router();
const { checkRolePermission } = require('../middleware/checkRolePermission');
const { permissionAccess } = require('../middleware/permissionAccess');
const { verifySuperAdmin } = require('../middleware/verifySuperAdmin');


router.post('/v1/add', hrLeaveBalance.postBulkAddLeave); //add and save the data for Hr leave Bal
router.get('/v1/user/:id', hrLeaveBalance.getUserLeaveBal); //get HrLeaveBalance by User master Id
router.get('/v1/getLeavesAddedById/:id', hrLeaveBalance.getLeavesAddedById); // automaticAddLeaveBalance HLeaveBalance

router.post('/v1/addHrLeaveBalance', hrLeaveBalance.addHrLeaveBalance); // Add PL Balance for Mars

router.post(
  '/v1/getAddedLeaveBalanceByUser',
  hrLeaveBalance.getAddedLeaveBalanceByUser,
);
router.post(
  '/v1/getExpiredLeaveBalanceByUser',
  hrLeaveBalance.getExpiredLeaveBalanceByUser,
);

// ----------------  Used/Lapse/Encash coff Existing data add into UsedCoffTransaction Table -------------------

router.post(
  '/v1/addUsedCoffTransaction',
  verifySuperAdmin,
  hrLeaveBalance.addUsedCoffTransaction,
);

// ---------------------- delete used coff -----------------------------

router.post('/v1/deleteUsedCoff', hrLeaveBalance.deleteUsedCoff);

router.post('/v1/addExpiryInCoff',hrLeaveBalance.addExpiryInCoff) // kiran motores 

module.exports = router;
