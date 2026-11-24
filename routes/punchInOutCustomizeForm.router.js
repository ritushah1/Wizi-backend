const express = require('express');
const router = express.Router();

const punchInOutCustomizeFormController = require('../controllers/punchInOutCustomizeForm.controller');

router.post(
  '/v1/addPunchInOutCustomizeForm',
  punchInOutCustomizeFormController.addPunchInOutCustomizeForm,
);

router.post(
  '/v1/updatePunchInOutCustomizeForm',
  punchInOutCustomizeFormController.updatePunchInOutCustomizeForm,
);

router.post(
  '/v1/getByIdPunchInOutCustomizeForm',
  punchInOutCustomizeFormController.getPunchInOutCustomizeFormById,
);

router.post(
  '/v1/deletePunchInOutCustomizeForm',
  punchInOutCustomizeFormController.deletePunchInOutCustomizeForm,
);

router.post(
  '/v1/listPunchInOutCustomizeForm',
  punchInOutCustomizeFormController.getAllPunchInOutCustomizeForm,
);

router.post(
  '/v1/punchInOutCustomizeFormDropdown',
  punchInOutCustomizeFormController.punchInOutCustomizeFormDropdown,
);

router.post(
  '/v1/getCustomizeFormValueByAttendanceLogID',
  punchInOutCustomizeFormController.getCustomizeFormValueByAttendanceLogID,
);

module.exports = router;
