/**
 * ID Card Generation Helper Functions
 * Optimized helper utilities for employee ID card generation
 * 
 * TEMPLATE DATA FORMATS:
 * 1. ARRAY FORMAT (usesDirectData: false) - Template uses {{#each tempData}}
 *    Data: { tempData: [{idCardData, displayName, ApiURL}, ...], appURL }
 * 
 * 2. DIRECT FORMAT (usesDirectData: true) - Template accesses data directly
 *    Data: { idCardData, displayName, ApiURL, appURL }
 * 
 * Templates using DIRECT format (NO {{#each tempData}}):
 * - monarchIDCard.html
 * - hiraidcard.html
 * 
 * All other templates use ARRAY format with {{#each tempData}}
 */

const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const Handlebars = require('handlebars');
const puppeteer = require('puppeteer');

const { roleType, companyIdEnumIDCard } = require('./dbUtils');
const { mainApiUrl, appURL } = require('./labelUtils');
const { companyAttributes } = require('./commonVars');
const { createZipFileForPortraitidIdCards } = require('./exportData');

// Models
const EmployeeDesignation = require('../models/employeeDesignation');
const EmployeeDepartment = require('../models/employeeDepartment');
const EmployeeDivision = require('../models/employeeDivision');
const EmployeeBranch = require('../models/employeeBranch');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const UserAddress = require('../models/userAddress');
const EmployeeDigitalSignature = require('../models/employeeDigitalSignature');
const Designation = require('../models/designation');
const Department = require('../models/department');
const Division = require('../models/division');
const BranchMaster = require('../models/branchMaster');
const CityMaster = require('../models/citymaster');
const companyMaster = require('../models/companyMaster');
const CompanyIDCardFormat = require('../models/companyIDCardFormat');
const IdCardFormat = require('../models/idCardFormat');
const { getCurrentFinancialYear } = require('./commonUtilFunctions');

// ============== ID CARD CONFIGURATIONS ==============
// usesDirectData: true = template uses direct data (no {{#each tempData}})
// usesDirectData: false/undefined = template uses array format with {{#each tempData}}

const ID_CARD_CONFIGS = {
  // Portrait Single Cards - uses {{#each tempData}}
  portraitSingleIdCard: {
    pdf: { height: 470, width: 303 },
    screenshot: { x: 0, y: 0, width: 302, height: 480 },
    useFullIdCardBuffer: true,
    usesDirectData: false,
  },
  portraitSingleIdCardForAsoplav: {
    pdf: { height: 600, width: 399 },
    screenshot: { x: 0, y: 0, width: 302, height: 480 },
    useFullIdCardBuffer: true,
    usesDirectData: false,
  },
  // Landscape Single Cards - uses {{#each tempData}}
  landscapeSingleIdCard: {
    pdf: { height: 272, width: 529 },
    screenshot: { x: 0, y: 0, width: 539, height: 272 },
    useFullIdCardBuffer: true,
    usesDirectData: false,
  },
  landscapeSingleIdCardForAsoplav: {
    pdf: { height: 272, width: 529 },
    screenshot: { x: 0, y: 0, width: 540, height: 280 },
    useFullIdCardBuffer: true,
    usesDirectData: false,
  },
  // Portrait Preview Cards (A4 format) - uses {{#each tempData}}
  portraitIdCard: {
    pdf: { format: 'A4', margin: { top: '10px', bottom: '10px', left: '10px', right: '10px' } },
    screenshot: { x: 0, y: 28, width: 345, height: 485 },
    useFullIdCardBuffer: false,
    usesDirectData: false,
  },
  portraitIdCardForAsoplav: {
    pdf: { format: 'A4', margin: { top: '10px', bottom: '10px', left: '10px', right: '10px' } },
    screenshot: { x: 0, y: 28, width: 345, height: 485 },
    useFullIdCardBuffer: false,
    usesDirectData: false,
  },
  // Landscape Preview Cards (A4 format) - uses {{#each tempData}}
  landscapeIdCard: {
    pdf: { format: 'A4', margin: { top: '10px', bottom: '10px', left: '10px', right: '10px' } },
    screenshot: { x: 10, y: 23, width: 540, height: 290 },
    useFullIdCardBuffer: false,
    usesDirectData: false,
  },
  landscapeIdCardForAsoplav: {
    pdf: { format: 'A4', margin: { top: '10px', bottom: '10px', left: '10px', right: '10px' } },
    screenshot: { x: 10, y: 23, width: 540, height: 290 },
    useFullIdCardBuffer: false,
    usesDirectData: false,
  },
  // Bulk Downloads - uses {{#each tempData}}
  portraitIdCardForBulkDownload: {
    pdf: { height: 480, width: 303 },
    isBulk: true,
    usesDirectData: false,
  },
  portraitIdCardForAsoplavBulkDownload: {
    pdf: { height: 630, width: 399 },
    isBulk: true,
    usesDirectData: false,
  },
  // ============== MONARCH ID CARD CONFIGS ==============
  // monarchIDCard.html uses DIRECT data format (no {{#each tempData}})
  monarchIDCard: {
    pdf: { height: 472, width: 305 },
    screenshot: { x: 0, y: 0, width: 305, height: 472 },
    useFullIdCardBuffer: true,
    usesDirectData: true,
    template: 'monarchIDCard',
  },
  // monarchSmallIDCard.html uses ARRAY format with {{#each tempData}}
  monarchSmallIDCard: {
    pdf: { format: 'A4', margin: { top: '10px', bottom: '10px', left: '10px', right: '10px' } },
    screenshot: { x: 0, y: 28, width: 345, height: 485 },
    useFullIdCardBuffer: false,
    usesDirectData: false,
    template: 'monarchSmallIDCard',
  },
  // ============== DYNAMIC HIRA ID CARD CONFIGS ==============
  // dynamicHiraIdcard.html uses DIRECT data format (no {{#each tempData}})
  dynamicHiraIdcard: {
    pdf: { height: 473, width: 305 },
    screenshot: { x: 0, y: 0, width: 305, height: 473 },
    useFullIdCardBuffer: true,
    usesDirectData: true,
    template: 'dynamicHiraIdcard',
  },
  // dynamicHiraIdcardSmall.html uses ARRAY format with {{#each tempData}}
  dynamicHiraIdcardSmall: {
    pdf: { format: 'A4', margin: { top: '10px', bottom: '10px', left: '10px', right: '10px' } },
    screenshot: { x: 0, y: 28, width: 345, height: 485 },
    useFullIdCardBuffer: false,
    usesDirectData: false,
    template: 'dynamicHiraIdcardSmall',
  },
  // ============== HIRA ID CARD CONFIGS ==============
  // hiraidcard.html uses DIRECT data format (no {{#each tempData}})
  hiraidcard: {
    pdf: { height: 473, width: 305 },
    screenshot: { x: 0, y: 0, width: 305, height: 473 },
    useFullIdCardBuffer: true,
    usesDirectData: true,
    template: 'hiraidcard',
  },
  // hiraidcardsmall.html uses ARRAY format with {{#each tempData}}
  hiraidcardsmall: {
    pdf: { format: 'A4', margin: { top: '10px', bottom: '10px', left: '10px', right: '10px' } },
    screenshot: { x: 0, y: 28, width: 345, height: 485 },
    useFullIdCardBuffer: false,
    usesDirectData: false,
    template: 'hiraidcardsmall',
  },
  // ============== STAVYA ID CARD CONFIGS ==============
  // stavyaIDCard.html uses DIRECT data format (no {{#each tempData}})
  stavyaIDCard: {
    pdf: { height: 485, width: 305 },
    screenshot: { x: 0, y: 0, width: 305, height: 470 },
    useFullIdCardBuffer: true,
    usesDirectData: true,
    template: 'stavyaIDCard',
  },
  // stavyaSmallIDCard.html uses ARRAY format with {{#each tempData}}
  stavyaSmallIDCard: {
    pdf: { format: 'A4', margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' } },
    screenshot: { x: 0, y: 28, width: 345, height: 470 },
    useFullIdCardBuffer: false,
    usesDirectData: false,
    template: 'stavyaSmallIDCard',
  },
};

// Special company configs (364, MONARCH, STAVYA)
// hiraidcard.html, monarchIDCard.html, and stavyaIDCard.html use DIRECT data format (no {{#each tempData}})
const SPECIAL_COMPANY_CONFIGS = {
  // portraitSingleIdCard for 364/MONARCH/STAVYA uses hiraidcard.html, monarchIDCard.html, or stavyaIDCard.html
  // These templates use DIRECT data format
  portraitSingleIdCard: {
    pdf: { height: 485, width: 305 },
    screenshot: { x: 0, y: 0, width: 305, height: 485 },
    useFullIdCardBuffer: true,
    usesDirectData: true, // hiraidcard.html, monarchIDCard.html, and stavyaIDCard.html use direct data
  },
  // portraitIdCardForBulkDownload for 364/MONARCH/STAVYA uses hiraidcard.html, monarchIDCard.html, or stavyaIDCard.html
  portraitIdCardForBulkDownload: {
    pdf: { height: 485, width: 305 },
    isBulk: true,
    usesDirectData: true, // hiraidcard.html, monarchIDCard.html, and stavyaIDCard.html use direct data
  },
  // portraitIdCard for 364/MONARCH/STAVYA uses hiraidcardsmall.html, monarchSmallIDCard.html, or stavyaSmallIDCard.html
  // These templates use ARRAY format with {{#each tempData}}
  portraitIdCard: {
    pdf: { format: 'A4', margin: { top: '10px', bottom: '10px', left: '10px', right: '10px' } },
    screenshot: { x: 0, y: 28, width: 345, height: 485 },
    useFullIdCardBuffer: false,
    usesDirectData: false, // hiraidcardsmall.html, monarchSmallIDCard.html, and stavyaSmallIDCard.html use {{#each tempData}}
  },
};

// Template mapping for special companies
const TEMPLATE_MAP = {
  portraitSingleIdCard: { '364': 'hiraidcard', monarch: 'monarchIDCard', stavya: 'stavyaIDCard', asopalav: 'portraitSingleIdCardForAsoplav', default: 'portraitSingleIdCard' },
  portraitIdCardForBulkDownload: { '364': 'hiraidcard', monarch: 'monarchIDCard', stavya: 'stavyaIDCard', asopalav: 'portraitIdCardForAsoplavBulkDownload', default: 'portraitIdCardForBulkDownload' },
  portraitIdCard: { '364': 'hiraidcardsmall', monarch: 'monarchSmallIDCard', stavya: 'stavyaSmallIDCard', asopalav: 'portraitIdCardForAsoplav', default: 'portraitIdCard' },
  landscapeSingleIdCard: { '364': 'landscapeSingleIdCard', monarch: 'landscapeSingleIdCard', stavya: 'landscapeSingleIdCard', asopalav: 'landscapeSingleIdCardForAsoplav', default: 'landscapeSingleIdCard' },
  landscapeIdCard: { '364': 'landscapeIdCard', monarch: 'landscapeIdCard', stavya: 'landscapeIdCard', asopalav: 'landscapeIdCardForAsoplav', default: 'landscapeIdCard' },
};

// Default config for unknown card types
const DEFAULT_CONFIG = {
  pdf: { format: 'A4', margin: { top: '10px', bottom: '10px', left: '10px', right: '10px' } },
  screenshot: { x: 10, y: 23, width: 540, height: 290 },
  useFullIdCardBuffer: false,
  usesDirectData: false,
};

// Templates that use DIRECT data format (no {{#each tempData}})
const DIRECT_DATA_TEMPLATES = ['monarchIDCard', 'hiraidcard', 'stavyaIDCard'];

/**
 * Check if a template uses direct data format
 * @param {string} templateName - The template name (e.g., 'monarchIDCard', 'portraitIdCard')
 * @returns {boolean} - true if template uses direct data format
 */
function templateUsesDirectData(templateName) {
  if (!templateName) return false;
  // Check if template is in the direct data templates list
  if (DIRECT_DATA_TEMPLATES.includes(templateName)) return true;
  // Check if template has a config with usesDirectData: true
  const templateConfig = ID_CARD_CONFIGS[templateName];
  return templateConfig?.usesDirectData === true;
}

// ============== HELPER FUNCTIONS ==============

/**
 * Build order clause for query
 */
function buildOrderClause(orderBy) {
  if (!orderBy) return [];
  if (orderBy === 'displayName') return [['displayName', 'ASC']];
  if (orderBy === 'joiningDate') return [[sequelize.literal(`"employeeJoiningDetails.joiningDate"`), 'ASC']];
  return [];
}

/**
 * Build pagination condition
 */
function buildPaginationCondition(page, limit) {
  return page && limit ? { offset: (page - 1) * limit, limit } : {};
}

/**
 * Get branch IDs based on user role
 */
function getBranchIds(branchMasterID, userDetails) {
  if (branchMasterID) return [branchMasterID];
  if (userDetails?.role?.roleType === roleType.BRANCH_WISE) {
    return [...userDetails.accessibleBranches];
  }
  return [];
}

/**
 * Build joining condition for non-single card types
 */
function buildJoiningCondition(date) {
  return {
    [Sequelize.Op.or]: [
      { leavingDate: { [Sequelize.Op.gte]: date } },
      { leavingDate: { [Sequelize.Op.eq]: null } },
    ],
  };
}

/**
 * Build user where clause
 */
function buildUserWhereClause(date, isSingleCardType, companyMasterID, userMasterID) {
  return {
    [Sequelize.Op.or]: [
      { deactiveDate: { [Sequelize.Op.gte]: date } },
      { deactiveDate: { [Sequelize.Op.eq]: null } },
    ],
    status: isSingleCardType ? [1, 0] : 1,
    ...(companyMasterID && { companyMasterId: companyMasterID }),
    ...(userMasterID && { userMasterID }),
  };
}

/**
 * Build include clause for Sequelize query
 * Note: companyMaster is fetched separately via getCompanyData() for better performance
 */
function buildIncludeClause(date, branchIds, joiningCondition) {
  const dateObj = new Date(date);
  const dateCondition = {
    status: 1,
    applicableDate: { [Sequelize.Op.lte]: dateObj },
    [Sequelize.Op.or]: [
      { endDate: { [Sequelize.Op.gte]: dateObj } },
      { endDate: { [Sequelize.Op.eq]: null } },
    ],
  };

  return [
    {
      model: EmployeeDesignation,
      where: dateCondition,
      required: false,
      attributes: ['designationID'],
      include: [{ model: Designation, as: 'designation', attributes: ['designationName'] }],
    },
    {
      model: EmployeeDepartment,
      where: dateCondition,
      required: false,
      attributes: ['departmentID'],
      include: [{ model: Department, as: 'department', attributes: ['departmentName'] }],
    },
    {
      model: EmployeeDivision,
      where: {
        status: 1,
        startDate: { [Sequelize.Op.lte]: dateObj },
        [Sequelize.Op.or]: [
          { endDate: { [Sequelize.Op.gte]: dateObj } },
          { endDate: { [Sequelize.Op.eq]: null } },
        ],
      },
      required: false,
      attributes: ['divisionId', 'startDate'],
      include: [{ model: Division, attributes: ['divisionName'] }],
    },
    {
      model: EmployeeBranch,
      where: {
        ...dateCondition,
        ...(branchIds.length > 0 && { branchID: branchIds }),
      },
      required: branchIds.length > 0,
      attributes: ['branchID'],
      include: [{ model: BranchMaster, as: 'branchMaster', attributes: ['branchName', 'branchAddress'] }],
    },
    {
      model: EmployeeJoiningDetails,
      where: joiningCondition,
      attributes: ['dob', 'joiningDate', 'employeeCode', 'bloodgroup', 'adharCard'],
      required: true,
    },
    {
      model: UserAddress,
      attributes: ['houseNumber', 'houseName', 'landmark', 'zipcode'],
      where: { status: 1, verifyStatus: 1, addressType: 'permanent' },
      include: [{ model: CityMaster, attributes: ['cityName'] }],
      required: false,
    },
    {
      model: EmployeeDigitalSignature,
      attributes: ['signature'],
      order: [['employeeDigitalSignatureID', 'DESC']],
      where: { status: 1 },
      required: false,
      limit: 1
    },
  ];
}

/**
 * Get company data with ID card format configuration
 * Fetches company master data separately for better query performance
 * @param {number} companyMasterID - The company ID to fetch
 * @returns {Promise<Object|null>} - Company data with cidf association or null
 */
async function getCompanyData(companyMasterID) {
  if (!companyMasterID) return null;
  
  return companyMaster.findOne({
    where: { companyMasterID },
    attributes: [...companyAttributes, 'companyAddress', 'companyEmail', 'authorizedSignature', 'cpMobileNo'],
    include: [{
      required: false,
      model: CompanyIDCardFormat,
      as: 'cidf',
      include: [{ model: IdCardFormat }],
    }],
  });
}


/**
 * Transform user data for ID card template
 * @param {Array} AllUsersData - Array of user data from database query
 * @param {Object} companyData - Company data fetched separately via getCompanyData()
 * @returns {Object} - { finalArray, userCompanyMasterID, userCompanyData }
 */
async function transformUserData(AllUsersData, companyData, companyMasterID) {
  const finalArray = [];
  const userCompanyMasterID = companyData?.companyMasterID || null;
  const userCompanyData = companyData || null;

  for (const userData of AllUsersData) {
    const joiningDetails = userData.employeeJoiningDetails?.[0] || null;
    const branchDetails = userData.employeeBranches?.[0] || null;
    const departmentDetails = userData.employeeDepartments?.[0] || null;
    const divisionDetails = userData.employeeDivisions?.[0] || null;
    const designationDetails = userData.employeeDesignations?.[0] || null;
    const userAddress = userData.userAddresses?.[0] || null;
    const userSignature = userData.employeeDigitalSignatures?.[0] || null;

    const financialYear = await getCurrentFinancialYear(new Date());
    const expiryDate = companyIdEnumIDCard.STAVYA.includes(companyMasterID) ? '31-03-' + financialYear.split('-')[1] : null;

    const idCardData = {
      employeeCode: joiningDetails?.employeeCode || '',
      // HARDCODED COMPANY LOGO FOR ABCD COMPANY OF ASOPALAV
      showCompanyLogo: companyData?.companyMasterID !== 298,
      companyLogo: companyData?.companyLogo || '',
      companyName: companyData?.companyName || '',
      companyEmail: companyData?.companyEmail || '',
      companyWebsite: companyData?.companyWebsite || '',
      companyNameLength: companyData ? companyData.companyName.length >= 24 : false,
      companyAddress: branchDetails?.branchMaster?.branchAddress || companyData?.companyAddress || '',
      authorizedSignature: companyData?.authorizedSignature || '',
      userPhoto: userData.photo,
      profilePicName: userData.firstName && userData.lastName
        ? `${userData.firstName.charAt(0)}${userData.lastName.charAt(0)}`.toUpperCase()
        : '',
      userFirstName: userData.firstName || ' ',
      userDisplayName: userData.displayName || '',
      userLastName: userData.lastName || ' ',
      userNumber: userData.userNumber || ' ',
      otherContactNumber: userData.otherContactNumber || ' ',
      designationName: designationDetails?.designation?.designationName || ' ',
      departmentName: departmentDetails?.department?.departmentName || ' ',
      divisionName: divisionDetails?.division?.divisionName || ' ',
      branchName: branchDetails?.branchMaster?.branchName || '',
      joiningDate: expiryDate && expiryDate != null ? expiryDate : joiningDetails?.joiningDate ? moment(joiningDetails.joiningDate).format('DD-MM-YYYY') : '',
      dob: joiningDetails?.dob ? moment(joiningDetails.dob).format('DD-MM-YYYY') : '',
      bloodgroup: joiningDetails?.bloodgroup || ' ',
      houseNumber: userAddress?.houseNumber || '',
      houseName: userAddress?.houseName || '',
      landmark: userAddress?.landmark || '',
      cityName: userAddress?.cityMaster?.cityName || '',
      zipcode: userAddress?.zipcode || '',
      userSignature: userSignature?.signature || '',
      companyContactNo: companyData?.cpMobileNo || '',
      userAdharCardNumber: joiningDetails?.adharCard || '',
    };

    finalArray.push({
      userId: userData.userMasterID,
      displayName: userData.displayName,
      idCardData,
      ApiURL: mainApiUrl,
    });
  }

  return { finalArray, userCompanyMasterID, userCompanyData };
}

/**
 * Register Handlebars helpers
 */
function registerHandlebarsHelpers() {
  Handlebars.registerHelper({
    eq: (v1, v2) => v1 === v2,
    ne: (v1, v2) => v1 !== v2,
    lt: (v1, v2) => v1 < v2,
    gt: (v1, v2) => v1 > v2,
    lte: (v1, v2) => v1 <= v2,
    gte: (v1, v2) => v1 >= v2,
    and() { return Array.prototype.every.call(arguments, Boolean); },
    or() { return Array.prototype.slice.call(arguments, 0, -1).some(Boolean); },
  });
}

/**
 * Get template file path
 */
function getTemplate(type) {
  return path.join(__dirname, `../html/${type}.html`);
}

/**
 * Get custom template format path from company's idCardFormat
 * Returns the actual path value based on idCardType:
 * - Single ID Cards (portraitSingleIdCard, landscapeSingleIdCard): uses portraitHtmlPath/landscapeHtmlPath
 * - Bulk Download (portraitIdCardForBulkDownload): uses portraitHtmlPath (single card template for each PDF)
 * - PDF/A4 ID Cards (portraitIdCard, landscapeIdCard): uses pdfPortraitHtmlPath/pdfLandscapeHtmlPath
 *   NOTE: For PDF/A4 cards, we do NOT fallback to single card templates because they have different layouts
 * @param {Object} userCompanyData - The company data with cidf association
 * @param {string} idCardType - The card type (e.g., 'portraitSingleIdCard', 'landscapeIdCard')
 * @returns {string|null} - The actual path value or null if not found/not configured
 */
function getCustomTemplateFormatPath(userCompanyData, idCardType) {
  const companyIDCardFormat = userCompanyData?.cidf?.[0];
  const idCardFormat = companyIDCardFormat?.idCardFormat;
  
  if (!idCardFormat) {
    return null;
  }

  const idCardTypeLower = idCardType?.toLowerCase() || '';
  const isLandscape = idCardTypeLower.includes('landscape');
  
  // Determine card type category:
  // 1. Single card types: portraitSingleIdCard, landscapeSingleIdCard
  // 2. Bulk download types: portraitIdCardForBulkDownload, portraitIdCardForAsoplavBulkDownload
  //    - These generate individual PDFs per employee, so they use SINGLE card templates
  // 3. PDF/A4 card types: portraitIdCard, landscapeIdCard (multiple cards on A4 page)
  const isSingleCardType = idCardTypeLower.includes('single');
  const isBulkDownload = idCardTypeLower.includes('bulk');
  
  // Single cards and Bulk downloads both use single card templates (portraitHtmlPath/landscapeHtmlPath)
  const usesSingleCardTemplate = isSingleCardType || isBulkDownload;
  
  let formatKey;
  if (usesSingleCardTemplate) {
    // Single ID Cards and Bulk Downloads use portraitHtmlPath/landscapeHtmlPath
    formatKey = isLandscape ? 'landscapeHtmlPath' : 'portraitHtmlPath';
    // Check if the required path exists
    if (!idCardFormat.portraitHtmlPath && !idCardFormat.landscapeHtmlPath) {
      return null;
    }
  } else {
    // PDF/A4 ID Cards use pdfPortraitHtmlPath/pdfLandscapeHtmlPath
    // IMPORTANT: Do NOT fallback to single card templates for PDF/A4 views
    // because single card templates have different layouts (one card vs grid)
    formatKey = isLandscape ? 'pdfLandscapeHtmlPath' : 'pdfPortraitHtmlPath';
    
    // If the specific PDF path doesn't exist, return null to use default template
    // Do NOT fallback to single card templates
    if (!idCardFormat[formatKey]) {
      return null;
    }
  }
  
  return idCardFormat[formatKey] || null;
}

/**
 * Get template path based on company and card type
 * FIXED: Correctly accesses idCardFormat from the association (alias: 'cidf')
 */
function getTemplatePath(userCompanyData, userCompanyMasterID, idCardType) {
  // Use custom template if available - paths are already full paths
  const customPath = getCustomTemplateFormatPath(userCompanyData, idCardType);
  if (customPath) {
    return getTemplate(customPath);
  }

  // Fallback to default templates
  const isCompany364 = +userCompanyMasterID === 364;
  const isMonarch = companyIdEnumIDCard.MONARCH.includes(+userCompanyMasterID);
  const isStavya = companyIdEnumIDCard.STAVYA.includes(+userCompanyMasterID);
  const isAsopalav = companyIdEnumIDCard.ASOPALAV.includes(+userCompanyMasterID);
  const typeConfig = TEMPLATE_MAP[idCardType];

  if (typeConfig) {
    if (isCompany364) return getTemplate(typeConfig['364']);
    if (isMonarch) return getTemplate(typeConfig.monarch);
    if (isStavya) return getTemplate(typeConfig.stavya);
    if (isAsopalav) return getTemplate(typeConfig.asopalav);
    return getTemplate(typeConfig.default);
  }

  return getTemplate(idCardType);
}

/**
 * Check if company is special (364, MONARCH, STAVYA, or ASOPALAV)
 */
function isSpecialCompany(userCompanyMasterID) {
  return +userCompanyMasterID === 364 || 
    companyIdEnumIDCard.MONARCH.includes(+userCompanyMasterID) ||
    companyIdEnumIDCard.STAVYA.includes(+userCompanyMasterID) ||
    companyIdEnumIDCard.ASOPALAV.includes(+userCompanyMasterID);
}

/**
 * Get the resolved template name for special companies
 */
function getResolvedTemplateName(idCardType, userCompanyMasterID) {
  const isCompany364 = +userCompanyMasterID === 364;
  const isMonarch = companyIdEnumIDCard.MONARCH.includes(+userCompanyMasterID);
  const isStavya = companyIdEnumIDCard.STAVYA.includes(+userCompanyMasterID);
  const isAsopalav = companyIdEnumIDCard.ASOPALAV.includes(+userCompanyMasterID);
  const typeConfig = TEMPLATE_MAP[idCardType];

  if (typeConfig) {
    if (isCompany364) return typeConfig['364'];
    if (isMonarch) return typeConfig.monarch;
    if (isStavya) return typeConfig.stavya;
    if (isAsopalav) return typeConfig.asopalav;
  }
  return idCardType;
}

/**
 * Get ID card configuration based on card type and company
 * First checks for template-specific config (e.g., monarchIDCard, hiraidcard)
 * Then falls back to SPECIAL_COMPANY_CONFIGS or ID_CARD_CONFIGS
 */
function getIdCardConfig(idCardType, isSpecial, userCompanyMasterID) {
  // If special company, get the resolved template name and check for its config
  if (isSpecial && userCompanyMasterID) {
    const templateName = getResolvedTemplateName(idCardType, userCompanyMasterID);
    // Check if there's a specific config for this template (e.g., monarchIDCard, hiraidcard)
    if (ID_CARD_CONFIGS[templateName]) {
      return ID_CARD_CONFIGS[templateName];
    }
    // Fall back to SPECIAL_COMPANY_CONFIGS
    if (SPECIAL_COMPANY_CONFIGS[idCardType]) {
      return SPECIAL_COMPANY_CONFIGS[idCardType];
    }
  }
  return ID_CARD_CONFIGS[idCardType] || DEFAULT_CONFIG;
}

/**
 * Read file asynchronously
 */
function readFileAsync(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf-8', (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

/**
 * Launch puppeteer browser
 */
async function launchBrowser() {
  return puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox'],
    timeout: 120000,
  });
}

/**
 * Handle bulk download PDF generation
 * usesDirectData: true = template uses direct data format (no {{#each tempData}})
 * usesDirectData: false = template uses array format with {{#each tempData}}
 */
async function handleBulkDownload(browser, template, finalArray, config, idCardType) {
  const idCardDataforBulkDownload = [];

  for (const item of finalArray) {
    let templateData;
    
    if (config.usesDirectData === true) {
      // Direct data format - templates like hiraidcard.html, monarchIDCard.html
      // These templates access data directly without {{#each tempData}}
      templateData = { idCardData: item.idCardData, displayName: item.displayName, ApiURL: item.ApiURL, appURL };
    } else if (idCardType === 'portraitIdCardForAsoplavBulkDownload') {
      // Asoplav bulk - original code did NOT include appURL
      templateData = { tempData: [item] };
    } else {
      // Array format - templates use {{#each tempData}}
      templateData = { tempData: [item], appURL };
    }

    const htmlContent = template(templateData);
    const pdfPage = await browser.newPage();
    await pdfPage.setContent(htmlContent);

    const pdfBuffer = await pdfPage.pdf({
      printBackground: true,
      timeout: 120000,
      ...config.pdf,
    });

    idCardDataforBulkDownload.push({
      displayName: item.displayName || '',
      path: Buffer.from(pdfBuffer).toString('base64'),
    });

    await pdfPage.close();
  }

  await browser.close();
  return idCardDataforBulkDownload;
}

/**
 * Generate PDF from page
 */
async function generatePdf(pdfPage, config) {
  return pdfPage.pdf({
    printBackground: true,
    timeout: 120000,
    ...config.pdf,
  });
}

/**
 * Generate screenshot from page
 */
async function generateScreenshot(pdfPage, config, hasData) {
  let jpegBuffer = '';
  let fullIdCardBuffer = '';

  if (!hasData || !config.screenshot) {
    return { jpegBuffer, fullIdCardBuffer };
  }

  const screenshotConfig = {
    type: 'jpeg',
    quality: 100,
    fullPage: false,
    timeout: 120000,
    clip: config.screenshot,
  };

  const buffer = await pdfPage.screenshot(screenshotConfig);

  if (config.useFullIdCardBuffer) {
    fullIdCardBuffer = buffer;
  } else {
    jpegBuffer = buffer;
  }

  return { jpegBuffer, fullIdCardBuffer };
}

/**
 * Prepare template data
 */
function prepareTemplateData(finalArray) {
  const data = { tempData: finalArray, appURL };
  const companyWiseData = {
    idCardData: finalArray[0]?.idCardData,
    displayName: finalArray[0]?.displayName,
    ApiURL: finalArray[0]?.ApiURL,
    appURL, // Required for special company templates (364, MONARCH)
  };

  return { data, companyWiseData };
}

/**
 * Build response name
 */
function buildResponseName(finalArray, totalUsers) {
  if (totalUsers === 1) {
    return `${finalArray[0].displayName}(${finalArray[0].idCardData.employeeCode || ''})`;
  }
  return '';
}

// ============== EXPORTS ==============
module.exports = {
  // Configurations
  ID_CARD_CONFIGS,
  SPECIAL_COMPANY_CONFIGS,
  TEMPLATE_MAP,
  DEFAULT_CONFIG,
  DIRECT_DATA_TEMPLATES,
  
  // Query builders
  buildOrderClause,
  buildPaginationCondition,
  getBranchIds,
  buildJoiningCondition,
  buildUserWhereClause,
  buildIncludeClause,
  
  // Data fetchers
  getCompanyData,
  
  // Data transformers
  transformUserData,
  prepareTemplateData,
  buildResponseName,
  
  // Template helpers
  registerHandlebarsHelpers,
  getTemplate,
  getCustomTemplateFormatPath,
  getTemplatePath,
  readFileAsync,
  templateUsesDirectData,
  
  // Company helpers
  isSpecialCompany,
  getIdCardConfig,
  getResolvedTemplateName,
  
  // PDF/Browser helpers
  launchBrowser,
  handleBulkDownload,
  generatePdf,
  generateScreenshot,
  
  // Re-exports for convenience
  createZipFileForPortraitidIdCards,
  appURL,
  mainApiUrl,
};
