const express = require('express');
const router = express.Router();
const { verifySuperAdmin } = require('../middleware/verifySuperAdmin');
const CompanySkillCategoryController = require('../controllers/companySkillCategory.controller');

router.post(
  '/v1/getCompanyWiseSkillCategory',
  CompanySkillCategoryController.getCompanyWiseSkillCategory,
);

// ----------------------- Don't call this api ---------------------------------------------------------------
router.post(
  '/v1/addDataCompanyWiseSkillCategory',
  verifySuperAdmin,
  CompanySkillCategoryController.addDataCompanyWiseSkillCategory,
);
//=====================================================================================================

module.exports = router;
