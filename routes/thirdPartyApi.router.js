const express = require('express');
const thirdPartyApiController = require('../controllers/thirdPartyApi.controller');
const router = express.Router();

router.get(
  '/v1/getUserListByCompanyId',
  thirdPartyApiController.getUserListByCompanyId,
);
router.post('/v1/sendNotification', thirdPartyApiController.sendNotification);
router.get(
  '/v1/getSalaryDataByCompanyAndMonth',
  thirdPartyApiController.getSalaryDataByCompanyAndMonth,
);
router.get(
  '/v1/getAttendanceDataByCompanyAndDateRange',
  thirdPartyApiController.getAttendanceDataByCompanyAndDateRange,
);
router.get(
  '/v1/getAllUsersByCompany',
  thirdPartyApiController.getAllUsersByCompany,
);
router.get(
  '/v1/getUserByMobileNumber',
  thirdPartyApiController.getUserByMobileNumber,
);
router.get(
  '/v1/getUserByEmployeeCode',
  thirdPartyApiController.getUserByEmployeeCode,
);
router.get(
  '/v1/getUsersFamilyDetailsByUserMasterID',
  thirdPartyApiController.getUsersFamilyDetailsByUserMasterID,
);
router.get(
  '/v1/getUsersDocumentByUserMasterID',
  thirdPartyApiController.getUsersDocumentByUserMasterID,
);
router.get(
  '/v1/getUsersEducationByUserMasterID',
  thirdPartyApiController.getUsersEducationByUserMasterID,
);
router.get(
  '/v1/getUsersExperienceByUserMasterID',
  thirdPartyApiController.getUsersExperienceByUserMasterID,
);

module.exports = router;
