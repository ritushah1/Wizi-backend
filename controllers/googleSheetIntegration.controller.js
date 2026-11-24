const { includes } = require('lodash');
const GoogleSheetIntegration = require('../models/googleSheetIntegration');
const GoogleSheet = require('../models/googleSheet');
const Visit = require('../models/visit');
const visitFormCustomize = require('../models/visitformcustomize');
const {
  stripHtml,
  getVisitProductNames,
  getPurposeOfVisitNames,
} = require('../utils/commonUtilFunctions');
const message = require('../response_message/message');
const {
  getAuthUrl,
  exchangeCodeForTokens,
  getGoogleUserEmail,
  createSpreadsheet,
  updateRange,
  deleteSheetRow,
  getSheetsMeta,
  addSheet,
  deleteSheet,
  hideSheetColumn,
  appendRows,
  overwriteSheet,
  readSheet,
  moveSheet,
  getIntegrationAndPermissionData,
} = require('../utils/googleSheets.utils');
const companyMaster = require('../models/companyMaster');
const UserMaster = require('../models/userMaster');
const Customer = require('../models/customer');
const VisitPurpose = require('../models/visitPurpose');
const Product = require('../models/product');
const VisitFormCustomizeValue = require('../models/visitformcustomizevalue');
const VisitReportCustomizeValue = require('../models/visitreportcustomizevalue');
const VisitReportCustomize = require('../models/visitreportcustomize');
const VisitReportMaster = require('../models/visitReportMaster');
const FormMaster = require('../models/formMaster');
const { fromPermissionName } = require('../constants/formPermission');
const vehicleUsage = require('../models/vehicleUsage');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const VisitMeetings = require('../models/visitMeetings');
const MeetingPurpose = require('../models/meetingPurpose');
const MeetingCopeople = require('../models/meetingCopeople');
const MeetingProduct = require('../models/meetingProducts');
const VisitProduct = require('../models/visitProduct');
const PurposeOfVisit = require('../models/purposeOfVisit');

// ─── Column headers written to every date-wise sub-sheet ─────────────────────
// First visible column is the row index, last hidden column stores the visit ID.
const SHEET_HEADERS = [
  'Date',
  'Time',
  'Purpose',
  'Assign person',
  'Customer',
  'Product',
  'Customize Fields',
  'Created Date',
  'Created By',
  'Check-in-time',
  'Check-in-location',
  'Check-out-time',
  'Check-out-location',
  'Report Type',
  'Report Customize Fields',
  'visitID',
];
const SHEET_HEADERS_VEHICLE = [
  'User',
  'User number',
  'Branch',
  'Starting date',
  'Starting time',
  'Start kilometer',
  'Ending date',
  'Ending time',
  'Ending kilometer',
  'Total kilometer',
  'Vehicle type',
  'vehicleUsageID',
];

const SHEET_HEADERS_VISIT_MEETING = [
  'Employee name',
  'Customer name',
  'Product name',
  'Meeting purpose',
  'Meeting date',
  'Meeting from time',
  'Meeting to time',
  'Co persons',
  'Assigned by',
  'Meeting status',
  'Agenda',
  'Created by',
  'Created at',
  'visitMeetingID',
];

// months array for formatting month names in sheet titles
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const displayEnum = {
  Visit: 'Visit',
  VehicleMeterDetails: 'Vehicle meter', // Note: your original text has a typo "Vechile", left as is.
  MyMeetings: 'Visit meeting',
};

const formatDisplayName = (text) => {
  // 1. Check if a custom override exists in displayEnum
  if (displayEnum[text]) {
    return displayEnum[text];
  }

  // 2. Fallback to RegEx if it's not in the override list
  return (
    text
      // Insert a space before any capital letter followed by a lowercase letter
      .replace(/(?<!^)([A-Z][a-z])/g, ' $1')
      // Insert a space before a capital letter if it's preceded by a lowercase letter
      .replace(/(?<=[a-z])([A-Z])/g, ' $1')
      .trim()
  );
};

const GOOGLE_SHEET_CONFIGS = {
  [fromPermissionName.VISIT]: {
    model: Visit,
    rowIdKey: 'visitID',
    dateKey: 'visitDate',
    headers: SHEET_HEADERS,
    fetchRecord: async (id) =>
      Visit.findOne({
        where: { visitID: id },
        include: [
          {
            model: companyMaster,
            attributes: ['companyName', 'companyMasterID'],
          },
          {
            model: UserMaster,
            as: 'createdByUserDetails',
            attributes: ['displayName', 'userMasterID'],
          },
          {
            model: UserMaster,
            as: 'assign',
            attributes: ['displayName', 'userMasterID'],
          },
          { model: Customer, attributes: ['customerID', 'customerName'] },
          {
            model: PurposeOfVisit,
            as: 'pov',
            include: [{ model: VisitPurpose, attributes: ['visitPurpose'] }],
          },
          {
            model: VisitProduct,
            as: 'vp',
            include: [
              {
                required: false,
                model: Product,
                attributes: ['productID', 'productName', 'companyMasterID'],
              },
            ],
          },
          {
            model: VisitFormCustomizeValue,
            include: [
              { model: visitFormCustomize, attributes: ['fieldLabel'] },
            ],
          },
          {
            model: VisitReportCustomizeValue,
            include: [
              {
                model: VisitReportCustomize,
                attributes: ['fieldLabel', 'inputType'],
                include: [
                  {
                    model: VisitReportMaster,
                    as: 'vrMaster',
                    attributes: ['visitReportName'],
                  },
                ],
              },
            ],
          },
        ],
      }),
    buildRow: _buildVisitRow,
    hasIdColumn: true,
  },
  [fromPermissionName.ADMINVEHICLEMETERDETAILS]: {
    model: vehicleUsage,
    rowIdKey: 'vehicleUsageID',
    dateKey: 'startingDateTime',
    headers: SHEET_HEADERS_VEHICLE,
    fetchRecord: async (id) =>
      vehicleUsage.findOne({
        where: { vehicleUsageID: id },
        include: [
          { model: UserMaster, attributes: ['userMasterID', 'displayName'] },
        ],
      }),
    buildRow: _buildVehicleRow,
    hasIdColumn: true,
  },
  [fromPermissionName.VISITMEETINGS]: {
    model: VisitMeetings,
    rowIdKey: 'visitMeetingID',
    dateKey: 'meetingDate',
    headers: SHEET_HEADERS_VISIT_MEETING,
    fetchRecord: async (id) =>
      VisitMeetings.findOne({
        where: { visitMeetingID: id },
        include: [
          {
            model: UserMaster,
            as: 'user',
            attributes: ['displayName'],
          },
          {
            model: VisitMeetings,
            as: 'previousMeeting',
            attributes: [
              'visitMeetingID',
              'meetingDate',
              'meetingStatus',
              'agenda',
            ],
          },
          {
            required: true,
            model: MeetingPurpose,
            attributes: ['meetingPurpose'],
          },
          {
            required: true,
            model: Customer,
            attributes: ['customerName'],
          },
          {
            model: MeetingCopeople,
            attributes: ['userMasterID'],
            include: [
              {
                model: UserMaster,
                as: 'coPeople',
                attributes: ['displayName'],
              },
            ],
          },
          {
            model: MeetingProduct,
            attributes: ['productID'],
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['productName'],
              },
            ],
          },
          {
            model: UserMaster,
            as: 'createBy',
            attributes: ['displayName'],
          },
          {
            model: UserMaster,
            as: 'updateBy',
            attributes: ['displayName'],
          },
        ],
      }),
    buildRow: _buildVisitMeeting,
    hasIdColumn: true,
  },
};
function getSheetConfig(formPermissionName) {
  const config = GOOGLE_SHEET_CONFIGS[formPermissionName];
  if (!config) {
    throw new Error(
      `Google Sheet configuration not found for ${formPermissionName}`,
    );
  }
  return config;
}

async function getCompanyName(companyMasterID) {
  if (!companyMasterID) return undefined;
  const company = await companyMaster.findOne({
    where: { companyMasterID },
    attributes: ['companyName'],
  });
  return company?.companyName;
}

async function resolveSheetIntegration(
  companyMasterID,
  formPermissionName,
  rowData = {},
) {
  const config = getSheetConfig(formPermissionName);
  const formMaster = await FormMaster.findOne({
    where: { formName: formPermissionName },
  });
  if (!formMaster) {
    throw new Error(`FormMaster not found for ${formPermissionName}`);
  }

  const integrationAndPermission = await getIntegrationAndPermissionData(
    companyMasterID,
    formMaster.formMasterID,
  );
  if (!integrationAndPermission) {
    return;
  }

  const companyName =
    rowData.companyMaster?.companyName ||
    rowData.companyName ||
    (await getCompanyName(companyMasterID)) ||
    `Company ${companyMasterID}`;

  return {
    config,
    formMaster,
    integration: integrationAndPermission.integration,
    permissions: integrationAndPermission.permissions,
    companyName,
  };
}

async function getTabName(date) {
  return formatDateTab(date);
}

async function getExistingSheetTitles(refreshToken, spreadsheetId) {
  return getSheetsMeta(refreshToken, spreadsheetId).then((sheets) =>
    sheets.map((sheet) => sheet.title),
  );
}

async function ensureSheetTabs(
  refreshToken,
  spreadsheetId,
  tabName,
  headers,
  sheetId,
) {
  const rows = await readSheet(refreshToken, spreadsheetId, tabName);
  if (rows && rows.length > 0) return;

  await appendRows(refreshToken, spreadsheetId, tabName, [headers]);
  if (sheetId) {
    await hideSheetColumn(
      refreshToken,
      spreadsheetId,
      sheetId,
      headers.length - 1,
    );
  }
}

async function updateOrAppendRow(
  refreshToken,
  spreadsheetId,
  tabName,
  headers,
  row,
  rowId,
) {
  const rowIndex = await findRowIndexById(
    refreshToken,
    spreadsheetId,
    tabName,
    rowId,
    headers.length,
  );
  if (!rowIndex) {
    await appendRows(refreshToken, spreadsheetId, tabName, [row]);
    return;
  }
  const range = `'${tabName}'!A${rowIndex}`;
  await updateRange(refreshToken, spreadsheetId, range, [row]);
}

async function findRowIndexById(
  refreshToken,
  spreadsheetId,
  tabName,
  id,
  columnCount,
) {
  const idColumnLetter = _getColumnLetter(columnCount);
  const lastColumn = `${tabName}!${idColumnLetter}:${idColumnLetter}`;
  const rows = await readSheet(refreshToken, spreadsheetId, lastColumn);
  if (!rows || rows.length === 0) return null;

  for (let index = 0; index < rows.length; index += 1) {
    if (String(rows[index][0]) === String(id)) {
      return index + 1;
    }
  }
  return null;
}

async function createOrEnsureTab(
  refreshToken,
  spreadsheetId,
  tabName,
  headers,
) {
  const sheetList = await getSheetsMeta(refreshToken, spreadsheetId);
  const existingSheet = sheetList.find((sheet) => sheet.title === tabName);
  if (existingSheet) {
    await ensureSheetTabs(
      refreshToken,
      spreadsheetId,
      tabName,
      headers,
      existingSheet.sheetId,
    );
    return;
  }

  const sheet = await addSheet(refreshToken, spreadsheetId, tabName);
  await ensureSheetTabs(
    refreshToken,
    spreadsheetId,
    tabName,
    headers,
    sheet.sheetId,
  );
  await _sortSheetsByDate(refreshToken, spreadsheetId);
}

async function loadRecord(formPermissionName, id) {
  const config = getSheetConfig(formPermissionName);
  return config.fetchRecord(id);
}

async function saveRecord(formPermissionName, rowData, companyMasterID, token) {
  const integrationPermissionData = await resolveSheetIntegration(
    companyMasterID,
    formPermissionName,
    rowData,
  );
  if (!integrationPermissionData) {
    return;
  }
  const { config, integration, companyName } = integrationPermissionData;
  const { refreshToken } = integration;
  const date = rowData[config.dateKey];
  const tabName = await getTabName(date);
  const monthlySheet = await _getOrCreateMonthlySheet(
    integration,
    companyName,
    date,
    formPermissionName,
    token,
  );
  const spreadsheetId = monthlySheet.spreadsheetId;
  await createOrEnsureTab(refreshToken, spreadsheetId, tabName, config.headers);
  await updateOrAppendRow(
    refreshToken,
    spreadsheetId,
    tabName,
    config.headers,
    config.buildRow(rowData),
    rowData[config.rowIdKey],
  );
}

async function updateOrCreateSheetRow(
  formPermissionName,
  rowData,
  companyMasterID,
  token,
) {
  return saveRecord(formPermissionName, rowData, companyMasterID, token);
}

// private helper functions

async function getIntegration(companyMasterID) {
  return GoogleSheetIntegration.findOne({
    where: { companyMasterID, isActive: true },
  });
}

function _getVisitReportType(rowData) {
  const values =
    rowData.visitReportCustomizeValues ||
    rowData.VisitReportCustomizeValues ||
    rowData.vrcv ||
    [];

  for (const value of values) {
    const reportCustomize = value.visitReportCustomize || value.vrc || {};
    const master =
      reportCustomize.vrMaster || reportCustomize.visitReportMaster;
    if (master?.visitReportName) {
      return master.visitReportName;
    }
  }

  return '';
}

function formatYearMonth(date) {
  const d = new Date(date);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${mm}`;
}

function formatMonthTitle(date) {
  const d = new Date(date);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function formatSpreadsheetName(companyName, date, formMasterName) {
  const name = companyName?.trim() || 'Company';
  return `${formMasterName} - ${formatMonthTitle(date)}`;
}

function formateSpreadsheetNameForDataBase(companyName, date, formMasterName) {
  const name = companyName?.trim() || 'Company';
  return `${name}-${formMasterName}-${formatMonthTitle(date)}`;
}

function _normalizeVisitReportCustomizeValues(values) {
  return values.map((v) => ({
    ...v,
    visitReportCustomize: v.visitReportCustomize || v.vrc,
  }));
}

function _formatVisitReportCustomizeValues(values) {
  return values
    .map((v) => {
      const reportCustomize = v.visitReportCustomize || v.vrc;
      const label = reportCustomize?.fieldLabel || 'Field';
      const inputType = reportCustomize?.inputType;

      let value = v.dataValues?.value;

      if (Array.isArray(value)) {
        value = value.join(', ');
      }

      if (value === null || value === undefined) {
        value = '';
      }

      if (inputType === 'image' || inputType === 'signature') {
        value = Boolean(value);
      }

      return `${label}: ${value}`;
    })
    .join(', ');
}

async function findMonthlySheet(integrationId, spreadsheetName) {
  return GoogleSheet.findOne({
    where: { integrationId, spreadsheetName },
  });
}

function _buildVisitRow(rowData) {
  const formCustomizeValues =
    rowData.VisitFormCustomizeValues ||
    rowData.visitFormCustomizeValues ||
    rowData.visitFormCustomizeValue ||
    [];
  const CustomizeValues = {};

  return [
    rowData.visitDate ? _formatDateDDMMYYYY(rowData.visitDate) : '',
    rowData.visitTime || '',
    getPurposeOfVisitNames(rowData) || '',
    rowData?.assign?.displayName || '',
    rowData?.customer?.customerName || '',
    getVisitProductNames(rowData) || '',
    formCustomizeValues && formCustomizeValues.length > 0
      ? formCustomizeValues
          .map((v) => {
            const key =
              v.visitFormCustomize?.fieldLabel || v.vfc?.fieldLabel || 'Field';

            return `${key}: ${v.value || ''}`;
          })
          .join(', ')
      : '',
    rowData.createdAt ? _formatDateDDMMYYYY(rowData.createdAt) : '',
    rowData?.createdByUserDetails?.displayName || '',
    rowData.checkInDateTime ? _formatTimeAmPm(rowData?.checkInDateTime) : '',
    rowData?.checkInLocation || '',
    rowData.checkOutTime ? _formatTimeAmPm(rowData?.checkOutTime) : '',
    rowData?.checkOutLocation || '',
    _getVisitReportType(rowData),
    _formatVisitReportCustomizeValues(rowData.VisitReportCustomizeValues || []),
    rowData?.visitID || '',
  ];
}

function _buildVehicleRow(rowData) {
  return [
    rowData?.userMaster?.displayName || '',
    rowData?.userMaster?.userNumber || '',
    rowData?.userMaster?.employeeBranches[0]?.branchMaster?.branchName || '',
    rowData?.startingDateTime
      ? _formatDateDDMMYYYY(rowData.startingDateTime)
      : '',
    rowData?.startingDateTime ? _formatTimeAmPm(rowData.startingDateTime) : '',
    rowData?.startkilometer || '',
    rowData?.endingDateTime ? _formatDateDDMMYYYY(rowData.endingDateTime) : '',
    rowData?.endingDateTime ? _formatTimeAmPm(rowData.endingDateTime) : '',
    rowData?.endkilometer || '',
    rowData?.endkilometer
      ? rowData?.endkilometer - rowData?.startkilometer
      : '',
    rowData.vehicleType ? formatVehicleType(rowData.vehicleType) : '',
    rowData?.vehicleUsageID || '',
  ];
}

function _buildVisitMeeting(rowData) {
  return [
    rowData?.user?.displayName || '',
    rowData?.customer?.customerName || '',
    rowData?.meetingProducts
      ?.map((item) => item.product.productName)
      .join(', ') || '',
    rowData?.meetingPurpose?.meetingPurpose || '',
    rowData?.meetingDate ? _formatDateDDMMYYYY(rowData.meetingDate) : '',
    rowData?.fromTime || '',
    rowData?.toTime || '',
    rowData?.meetingCopeople
      ?.map((item) => item?.coPeople?.displayName)
      .join(', ') || '',
    rowData?.createBy?.displayName || '',
    rowData?.meetingStatus || '',
    rowData?.agenda ? stripHtml(rowData?.agenda) : '',
    rowData?.createBy?.displayName || '',
    rowData?.createdAt ? _formatDateDDMMYYYY(rowData.createdAt) : '',
    rowData?.visitMeetingID || '',
  ];
}
function formatVehicleType(vehicleType) {
  if (!vehicleType) return '';

  return vehicleType
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (str) => str.toUpperCase());
}
async function _getOrCreateMonthlySheet(
  integration,
  companyName,
  date,
  formMasterName,
  token,
) {
  const yearMonth = formateSpreadsheetNameForDataBase(
    companyName,
    date,
    formMasterName,
  );
  const spreadSheetName = formateSpreadsheetNameForDataBase(
    companyName,
    date,
    formMasterName,
  );
  let googleSheet = await findMonthlySheet(
    integration.googleSheetIntegrationID,
    spreadSheetName,
  );

  if (googleSheet) {
    try {
      await getSheetsMeta(integration.refreshToken, googleSheet.spreadsheetId);
      return googleSheet;
    } catch (error) {
      const status = error?.response?.status || error?.code;
      if (status === 404 || status === '404' || status === 'NOT_FOUND') {
        await googleSheet.destroy();
      } else {
        // If the spreadsheet cannot be accessed for another reason, rethrow so callers can handle it.
        throw error;
      }
    }
  }
  const displayName = formatDisplayName(formMasterName);

  const spreadsheetName = formatSpreadsheetName(companyName, date, displayName);
  const tabName = formatDateTab(date);
  const spreadsheet = await createSpreadsheet(
    integration.refreshToken,
    spreadsheetName,
    tabName,
  );

  // Ensure headers exist and hide the visitID column
  try {
    const meta = await getSheetsMeta(
      integration.refreshToken,
      spreadsheet.spreadsheetId,
    );
    const sheet = meta.find((s) => s.title === tabName);
    if (sheet) {
      await _ensureSheetHeaders(
        integration.refreshToken,
        spreadsheet.spreadsheetId,
        tabName,
        sheet.sheetId,
        formMasterName,
      );
    }
  } catch (e) {
    // non-fatal
  }
  const formattedNameForDB = formateSpreadsheetNameForDataBase(
    companyName,
    date,
    formMasterName,
  );
  return await GoogleSheet.create(
    {
      integrationId: integration.googleSheetIntegrationID,
      yearMonth,
      spreadsheetId: spreadsheet.spreadsheetId,
      spreadsheetName: formattedNameForDB,
    },
    { user: token },
  );
}

function _getColumnLetter(colIndex) {
  let letter = '';
  let index = colIndex;
  while (index > 0) {
    const mod = (index - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    index = Math.floor((index - 1) / 26);
  }
  return letter;
}

async function _ensureSheetHeaders(
  refreshToken,
  spreadsheetId,
  tabName,
  sheetId,
  formMasterName,
) {
  const rows = await readSheet(refreshToken, spreadsheetId, tabName);
  if (!rows || rows.length === 0) {
    const config = getSheetConfig(formMasterName);
    await appendRows(refreshToken, spreadsheetId, tabName, [config.headers]);
    if (sheetId) {
      await hideSheetColumn(
        refreshToken,
        spreadsheetId,
        sheetId,
        config.headers.length - 1,
      );
    }
  }
}

function formatDateTab(date) {
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

async function _findRowIndexByVisitID(
  refreshToken,
  spreadsheetId,
  tabName,
  visitID,
) {
  const visitIdColLetter = _getColumnLetter(SHEET_HEADERS.length);
  const lastColumn = `${tabName}!${visitIdColLetter}:${visitIdColLetter}`;
  const rows = await readSheet(refreshToken, spreadsheetId, lastColumn);
  if (!rows || rows.length === 0) return null;

  for (let index = 0; index < rows.length; index += 1) {
    if (String(rows[index][0]) === String(visitID)) {
      return index + 1;
    }
  }
  return null;
}

function _formatDateDDMMYYYY(dateTime) {
  if (!dateTime) return '';
  const d = new Date(dateTime);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  return `${dd}-${mm}-${yyyy}`;
}

function _formatTimeAmPm(dateTime) {
  if (!dateTime) return '';
  const d = new Date(dateTime);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
}

/**
 * Parse date from DD-MM-YYYY format (used in sheet tab names like "10-09-2026")
 * Returns a Date object for comparison
 */
function _parseTabDateString(dateStr) {
  // dateStr format: "10-09-2026" (DD-MM-YYYY)
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  return new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
}

/**
 * Sort sheet tabs by date in ascending order.
 * Gets all sheets, sorts them by date, and moves them to correct positions.
 * This keeps sheets organized without rewriting data.
 */
async function _sortSheetsByDate(refreshToken, spreadsheetId) {
  try {
    const sheetsMeta = await getSheetsMeta(refreshToken, spreadsheetId);

    // Separate date sheets from non-date sheets
    const dateSheets = [];
    const nonDateSheets = [];

    sheetsMeta.forEach((sheet) => {
      // Check if sheet title matches date format (DD-MM-YYYY)
      if (/^\d{2}-\d{2}-\d{4}$/.test(sheet.title)) {
        dateSheets.push(sheet);
      } else {
        nonDateSheets.push(sheet);
      }
    });

    // Sort date sheets in ascending order
    dateSheets.sort((a, b) => {
      const dateA = _parseTabDateString(a.title);
      const dateB = _parseTabDateString(b.title);
      if (!dateA || !dateB) return 0;
      return dateA - dateB;
    });

    // Combine: non-date sheets first, then sorted date sheets
    const sortedSheets = [...nonDateSheets, ...dateSheets];

    // Move sheets to correct positions
    for (let i = 0; i < sortedSheets.length; i++) {
      const currentPosition = sheetsMeta.findIndex(
        (s) => s.sheetId === sortedSheets[i].sheetId,
      );

      if (currentPosition !== i) {
        await moveSheet(
          refreshToken,
          spreadsheetId,
          sortedSheets[i].sheetId,
          i,
        );
      }
    }
  } catch (err) {
    console.error('Error sorting sheets by date:', err);
    // Don't throw - sorting is not critical, data should still be valid
  }
}

async function _updateCheckInOutColumns(
  refreshToken,
  spreadsheetId,
  tabName,
  checkInOutData,
) {
  const rowIndex = await _findRowIndexByVisitID(
    refreshToken,
    spreadsheetId,
    tabName,
    checkInOutData.visitID,
  );
  if (!rowIndex) {
    const visitData = await loadRecord(
      fromPermissionName.VISIT,
      checkInOutData.visitID,
    );

    await appendRows(refreshToken, spreadsheetId, tabName, [
      _buildVisitRow(visitData),
    ]);

    return;
  }

  const checkInTimeCol = _getColumnLetter(10);
  const checkInLocCol = _getColumnLetter(11);
  const checkOutTimeCol = _getColumnLetter(12);
  const checkOutLocCol = _getColumnLetter(13);

  const checkInTime = _formatTimeAmPm(checkInOutData.checkInTime);
  const checkInLoc = checkInOutData.checkInLocation || '';
  const checkOutTime = _formatTimeAmPm(checkInOutData.checkOutTime);
  const checkOutLoc = checkInOutData.checkOutLocation || '';

  const updates = [
    {
      range: `'${tabName}'!${checkInTimeCol}${rowIndex}`,
      values: [[checkInTime]],
    },
    {
      range: `'${tabName}'!${checkInLocCol}${rowIndex}`,
      values: [[checkInLoc]],
    },
    {
      range: `'${tabName}'!${checkOutTimeCol}${rowIndex}`,
      values: [[checkOutTime]],
    },
    {
      range: `'${tabName}'!${checkOutLocCol}${rowIndex}`,
      values: [[checkOutLoc]],
    },
  ];

  for (const update of updates) {
    await updateRange(refreshToken, spreadsheetId, update.range, update.values);
  }
}

// update report type and report customize fields in sheet
async function _updateReportColumns(
  refreshToken,
  spreadsheetId,
  tabName,
  reportData,
) {
  const rowIndex = await _findRowIndexByVisitID(
    refreshToken,
    spreadsheetId,
    tabName,
    reportData.visitID,
  );
  if (!rowIndex) {
    const visitData = await loadRecord(
      fromPermissionName.VISIT,
      reportData.visitID,
    );

    await appendRows(refreshToken, spreadsheetId, tabName, [
      _buildVisitRow(visitData),
    ]);

    return;
  }
  const reportTypeCol = _getColumnLetter(15);
  const reportCustomizeCol = _getColumnLetter(16);
  const reportType = reportData.reportType || '';
  const reportCustomizeFields = JSON.stringify(
    _formatVisitReportCustomizeValues(reportData.reportCustomizeValues || []),
  );
  const updates = [
    {
      range: `'${tabName}'!${reportTypeCol}${rowIndex}`,
      values: [[reportType]],
    },
    {
      range: `'${tabName}'!${reportCustomizeCol}${rowIndex}`,
      values: [[reportCustomizeFields]],
    },
  ];
  for (const update of updates) {
    await updateRange(refreshToken, spreadsheetId, update.range, update.values);
  }
}

/**
 * Update a row identified by rowData.visitID inside a sheet tab.
 * Rewrites only the matching row instead of the whole sheet.
 */
async function _updateRowInSheet(
  refreshToken,
  spreadsheetId,
  tabName,
  rowData,
) {
  const rowIndex = await _findRowIndexByVisitID(
    refreshToken,
    spreadsheetId,
    tabName,
    rowData.visitID,
  );
  if (!rowIndex) {
    // Row doesn't exist in sheet, create it instead
    await appendRows(refreshToken, spreadsheetId, tabName, [
      _buildVisitRow(rowData),
    ]);
    return;
  }
  const range = `'${tabName}'!A${rowIndex}`;
  await updateRange(refreshToken, spreadsheetId, range, [
    _buildVisitRow(rowData),
  ]);
}

/**
 * Remove a row identified by id (last hidden column) from a sheet tab.
 * Deletes only the matching row instead of rewriting the whole sheet.
 */
async function _removeRowFromSheet(refreshToken, spreadsheetId, tabName, id) {
  const sheetsMeta = await getSheetsMeta(refreshToken, spreadsheetId);
  const sheet = sheetsMeta.find((s) => s.title === tabName);
  if (!sheet) return;

  const rowIndex = await _findRowIndexByVisitID(
    refreshToken,
    spreadsheetId,
    tabName,
    id,
  );
  if (!rowIndex) return;

  await deleteSheetRow(refreshToken, spreadsheetId, sheet.sheetId, rowIndex);
}

/**
 * Delete a sheet tab if it has no data rows (only header or completely empty).
 */
async function _deleteTabIfEmpty(refreshToken, spreadsheetId, tabName) {
  const sheetsMeta = await getSheetsMeta(refreshToken, spreadsheetId);
  const sheet = sheetsMeta.find((s) => s.title === tabName);
  if (!sheet) return;

  const rows = await readSheet(refreshToken, spreadsheetId, tabName);
  const dataRows = (rows || []).filter(
    (row) => row.length > 0 && String(row[0]) !== SHEET_HEADERS[0],
  );

  // Do not delete the last remaining sheet in the spreadsheet.
  if (dataRows.length === 0 && sheetsMeta.length > 1) {
    await deleteSheet(refreshToken, spreadsheetId, sheet.sheetId);
  }
}

async function _deleteAnyTabIfEmpty(refreshToken, spreadsheetId, tabName) {
  const sheetsMeta = await getSheetsMeta(refreshToken, spreadsheetId);

  const sheet = sheetsMeta.find((s) => s.title === tabName);

  if (!sheet) return;

  const rows = await readSheet(refreshToken, spreadsheetId, tabName);

  // Only header exists or sheet is empty
  if ((rows?.length || 0) <= 1 && sheetsMeta.length > 1) {
    await deleteSheet(refreshToken, spreadsheetId, sheet.sheetId);
  }
}

/**
 * Clean up all empty date tabs in the spreadsheet (except the current/active tab).
 * This ensures that when a new record is added to a different date, orphaned empty tabs are removed.
 */
async function _cleanupEmptyTabs(refreshToken, spreadsheetId, currentTabName) {
  try {
    const sheetsMeta = await getSheetsMeta(refreshToken, spreadsheetId);

    // Process each sheet
    for (const sheet of sheetsMeta) {
      // Skip the current active tab
      if (sheet.title === currentTabName) continue;

      try {
        const rows = await readSheet(refreshToken, spreadsheetId, sheet.title);
        const dataRows = (rows || []).filter(
          (row) => row.length > 0 && String(row[0]) !== SHEET_HEADERS[0],
        );

        // Delete empty tabs, but keep at least one sheet in the spreadsheet
        if (dataRows.length === 0 && sheetsMeta.length > 1) {
          await deleteSheet(refreshToken, spreadsheetId, sheet.sheetId);
          console.log(`Cleaned up empty sheet: ${sheet.title}`);
        }
      } catch (error) {
        console.error(
          `Error checking sheet ${sheet.title} for cleanup:`,
          error.message,
        );
      }
    }
  } catch (error) {
    console.error('Error during sheet cleanup:', error.message);
    // Non-fatal error, continue
  }
}

// for delete common function

async function deleteRecord(
  formPermissionName,
  companyMasterID,
  recordID,
  recordDate,
) {
  if (!recordDate || !recordID) {
    console.log('date and id are required');
    return;
  }

  const integrationAndPermission = await resolveSheetIntegration(
    companyMasterID,
    formPermissionName,
  );

  if (!integrationAndPermission) {
    return;
  }

  const { integration, companyName, config } = integrationAndPermission;
  const { refreshToken } = integration;

  const spreadsheetName = formateSpreadsheetNameForDataBase(
    companyName,
    recordDate,
    formPermissionName,
  );

  const monthlySheet = await findMonthlySheet(
    integration.googleSheetIntegrationID,
    spreadsheetName,
  );

  if (!monthlySheet) {
    console.log('No monthly sheet found');
    return;
  }

  const spreadsheetId = monthlySheet.spreadsheetId;
  const tabName = formatDateTab(recordDate);

  await _removeRowFromAnySheet(
    refreshToken,
    spreadsheetId,
    tabName,
    recordID,
    config.headers.length,
  );

  await _deleteAnyTabIfEmpty(refreshToken, spreadsheetId, tabName);

  return message.usermessage.deleteMessage('Google Sheet record');
}

// for remove row

async function _removeRowFromAnySheet(
  refreshToken,
  spreadsheetId,
  tabName,
  id,
  columnCount,
) {
  const sheetsMeta = await getSheetsMeta(refreshToken, spreadsheetId);

  const sheet = sheetsMeta.find((s) => s.title === tabName);

  if (!sheet) return;

  const rowIndex = await findRowIndexById(
    refreshToken,
    spreadsheetId,
    tabName,
    id,
    columnCount,
  );

  if (!rowIndex) return;

  await deleteSheetRow(refreshToken, spreadsheetId, sheet.sheetId, rowIndex);
}

async function updateMeetingStatusColumn(
  refreshToken,
  spreadsheetId,
  tabName,
  visitMeetingID,
  status,
) {
  const rowIndex = await findRowIndexById(
    refreshToken,
    spreadsheetId,
    tabName,
    visitMeetingID,
    SHEET_HEADERS_VISIT_MEETING.length,
  );

  if (!rowIndex) return;

  const statusColumn = _getColumnLetter(10); // Meeting Status column

  await updateRange(
    refreshToken,
    spreadsheetId,
    `'${tabName}'!${statusColumn}${rowIndex}`,
    [[status]],
  );
}

async function _removeRowFromAnySheet(
  refreshToken,
  spreadsheetId,
  tabName,
  id,
  columnCount,
) {
  const sheetsMeta = await getSheetsMeta(refreshToken, spreadsheetId);

  const sheet = sheetsMeta.find((s) => s.title === tabName);

  if (!sheet) return;

  const rowIndex = await findRowIndexById(
    refreshToken,
    spreadsheetId,
    tabName,
    id,
    columnCount,
  );

  if (!rowIndex) return;

  await deleteSheetRow(refreshToken, spreadsheetId, sheet.sheetId, rowIndex);
}

// main functions for google sheet oprations for various modules //

exports.getAuthUrl = async (req, res, next) => {
  try {
    const { companyMasterID, userMasterId } = req.query;
    const state = `${companyMasterID}:${userMasterId}`;
    const url = getAuthUrl(state);
    return res.status(200).json({ status: 200, url });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /v1/googleSheet/connect
 * Body: { code }
 * Exchanges the OAuth code for tokens and saves the integration.
 * The monthly spreadsheet is created only when the first visit is added.
 */
exports.connect = async (req, res, next) => {
  try {
    const { code } = req.query;

    const companyMasterID = +req.query.state.split(':')[0];
    const createBy = +req.query.state.split(':')[1];
    if (!companyMasterID) {
      return res
        .status(400)
        .json({ status: 400, message: 'company ID not found' });
    }
    // const createByIp = req.userDetails.userIpAddress;

    if (!code) {
      return res
        .status(400)
        .json({ status: 400, message: 'Authorization code is required.' });
    }

    // Exchange code → tokens
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      return res.status(400).json({
        status: 400,
        message:
          'No refresh token received. Please revoke app access in your Google account and try again.',
      });
    }

    // Get the user's email from Google
    const email = await getGoogleUserEmail(tokens.refresh_token);

    // Check if already connected for this company
    const existing = await GoogleSheetIntegration.findOne({
      where: { companyMasterID },
    });

    let integration;

    if (existing) {
      console.log('integration already exists for this company');
      return res.redirect(
        `${process.env.HRMS_WEB_URL}/app/utilitys/google-sheet-integration`,
      );
    } else {
      integration = await GoogleSheetIntegration.create({
        companyMasterID,
        email,
        refreshToken: tokens.refresh_token,
        isActive: true,
        createBy,
      });
    }
    return res.redirect(
      `${process.env.HRMS_WEB_URL}/app/utilitys/google-sheet-integration`,
    );
  } catch (err) {
    next(err);
  }
};

exports.disconnect = async (req, res, next) => {
  try {
    const companyMasterID = +req.body.companyMasterID;
    const deleteBy = +req.userDetails.userMasterId;
    const deleteByIp = req.userDetails.userIpAddress;

    const integration = await getIntegration(companyMasterID);
    if (!integration) {
      return res.status(200).json({
        status: 401,
        message: 'No active Google Sheets integration found.',
      });
    }

    await integration.update(
      { deleteBy, deleteByIp, isActive: false },
      { hooks: false },
    );
    await integration.destroy();

    await GoogleSheet.destroy({
      where: { integrationId: integration.googleSheetIntegrationID },
      individualHooks: true,
      user: req.userDetails,
    });

    return res.status(200).json({
      status: 200,
      message: 'Google Sheets disconnected successfully.',
    });
  } catch (err) {
    next(err);
  }
};

// ─── Sheet data operations ────────────────────────────────────────────────────

exports.addVisitRecord = async (visitID, token) => {
  const rowData = await loadRecord(fromPermissionName.VISIT, visitID);
  if (!rowData) {
    console.log(`No visit found with ID: ${visitID}`);
    return;
  }
  await saveRecord(
    fromPermissionName.VISIT,
    rowData,
    rowData.companyMasterID,
    token,
  );
  return message.usermessage.addMessage('Google Sheet record');
};

exports.updateVisitRecord = async (visitID, oldDate, token) => {
  const rowData = await loadRecord(fromPermissionName.VISIT, visitID);
  const newDate = rowData?.visitDate;
  const companyMasterID = rowData?.companyMasterID;

  if (!oldDate || !newDate || !rowData) {
    console.log('oldDate, newDate, and rowData are required.');
    return;
  }

  const integrationAndPermission = await resolveSheetIntegration(
    companyMasterID,
    fromPermissionName.VISIT,
    rowData,
  );
  if (!integrationAndPermission) {
    return;
  }
  const { integration, companyName, config } = integrationAndPermission;
  const { refreshToken } = integration;

  const oldMonth = formatYearMonth(oldDate);
  const newMonth = formatYearMonth(newDate);
  const oldTab = formatDateTab(oldDate);
  const newTab = formatDateTab(newDate);

  if (oldMonth === newMonth) {
    const monthlySheet = await _getOrCreateMonthlySheet(
      integration,
      companyName,
      newDate,
      fromPermissionName.VISIT,
      token,
    );
    const spreadsheetId = monthlySheet.spreadsheetId;

    if (oldTab === newTab) {
      await updateOrAppendRow(
        refreshToken,
        spreadsheetId,
        oldTab,
        config.headers,
        config.buildRow(rowData),
        rowData[config.rowIdKey],
      );
    } else {
      await _removeRowFromSheet(
        refreshToken,
        spreadsheetId,
        oldTab,
        rowData[config.rowIdKey],
        config.headers.length,
      );
      await _deleteTabIfEmpty(refreshToken, spreadsheetId, oldTab);

      await createOrEnsureTab(
        refreshToken,
        spreadsheetId,
        newTab,
        config.headers,
      );

      await appendRows(refreshToken, spreadsheetId, newTab, [
        config.buildRow(rowData),
      ]);
      await _cleanupEmptyTabs(refreshToken, spreadsheetId, newTab);
    }
  } else {
    // Cross-month: remove from old spreadsheet
    const oldSpreadSheetName = formateSpreadsheetNameForDataBase(
      companyName,
      oldDate,
      fromPermissionName.VISIT,
    );
    const oldMonthlySheet = await findMonthlySheet(
      integration.googleSheetIntegrationID,
      oldSpreadSheetName,
    );

    if (oldMonthlySheet) {
      try {
        await _removeRowFromSheet(
          refreshToken,
          oldMonthlySheet.spreadsheetId,
          oldTab,
          rowData[config.rowIdKey],
          config.headers.length,
        );
        await _deleteTabIfEmpty(
          refreshToken,
          oldMonthlySheet.spreadsheetId,
          oldTab,
        );
      } catch (err) {
        const status = err?.response?.status || err?.code;
        if (status === 404 || status === '404' || status === 'NOT_FOUND') {
          await oldMonthlySheet.destroy();
        } else {
          throw err;
        }
      }
    }

    const newMonthlySheet = await _getOrCreateMonthlySheet(
      integration,
      companyName,
      newDate,
      fromPermissionName.VISIT,
      token,
    );
    const spreadsheetId = newMonthlySheet.spreadsheetId;

    await createOrEnsureTab(
      refreshToken,
      spreadsheetId,
      newTab,
      config.headers,
    );

    await appendRows(refreshToken, spreadsheetId, newTab, [
      config.buildRow(rowData),
    ]);
  }

  return message.usermessage.updateMessage('Google Sheet record');
};

exports.deleteVisitRecord = async (companyMasterID, visitID, visitDate) => {
  if (!visitDate || !visitID) {
    console.log('date and id are required.');
    return;
  }

  const company = await companyMaster.findOne({
    where: { companyMasterID: companyMasterID },
  });

  const formMaster = await FormMaster.findOne({
    where: { formName: fromPermissionName.VISIT },
  });
  const formMasterID = formMaster?.formMasterID;
  if (!formMasterID) {
    console.log('FormMaster not found for VISIT form.');
    return;
  }

  const integrationAndPermission = await resolveSheetIntegration(
    companyMasterID,
    formMaster.formName,
  );
  if (!integrationAndPermission) {
    return;
  }
  const { integration, permissions, config } = integrationAndPermission;

  const { refreshToken } = integration;
  const spreadSheetName = formateSpreadsheetNameForDataBase(
    company.companyName,
    visitDate,
    fromPermissionName.VISIT,
  );
  const yearMonth = formatYearMonth(visitDate);
  const monthlySheet = await findMonthlySheet(
    integration.googleSheetIntegrationID,
    spreadSheetName,
  );

  if (!monthlySheet) {
    throw new Error('No Google Sheet found for this visit month.');
  }

  const spreadsheetId = monthlySheet.spreadsheetId;
  const tabName = formatDateTab(visitDate);

  await _removeRowFromSheet(
    refreshToken,
    spreadsheetId,
    tabName,
    visitID,
    config.headers.length,
  );
  await _deleteTabIfEmpty(refreshToken, spreadsheetId, tabName);

  return message.usermessage.deleteMessage('Google Sheet record');
};

exports.updateVisitCheckInOutRecord = async (visitID) => {
  const rowData = await Visit.findOne({
    where: { visitID: visitID },
    include: [
      { model: companyMaster, attributes: ['companyName', 'companyMasterID'] },
      {
        model: UserMaster,
        as: 'createdByUserDetails',
        attributes: ['displayName', 'userMasterID'],
      },
      {
        model: UserMaster,
        as: 'assign',
        attributes: ['displayName', 'userMasterID'],
      },
      { model: Customer, attributes: ['customerID', 'customerName'] },
      {
        model: PurposeOfVisit,
        as: 'pov',
        include: [{ model: VisitPurpose, attributes: ['visitPurpose'] }],
      },
      {
        model: VisitProduct,
        as: 'vp',
        include: [
          {
            required: false,
            model: Product,
            attributes: ['productID', 'productName', 'companyMasterID'],
          },
        ],
      },
      ,
      {
        model: VisitFormCustomizeValue,
        include: [{ model: visitFormCustomize, attributes: ['fieldLabel'] }],
      },
    ],
  });
  if (!rowData) {
    console.log('No visit found with ID:', visitID);
    return;
  }
  const formMaster = await FormMaster.findOne({
    where: { formName: fromPermissionName.VISIT },
  });
  const formMasterID = formMaster?.formMasterID;
  if (!formMasterID) {
    console.log('FormMaster not found for VISIT form.');
    return;
  }

  const integrationAndPermission = await getIntegrationAndPermissionData(
    rowData.companyMasterID,
    formMasterID,
  );
  if (!integrationAndPermission) {
    return;
  }
  const { integration, permissions } = integrationAndPermission;

  const { refreshToken } = integration;
  const companyName =
    rowData.companyMaster?.companyName || `Company ${rowData.companyMasterID}`;
  const date = rowData.visitDate;
  const yearMonth = formatYearMonth(date);
  const tabName = formatDateTab(date);

  const spreadSheetName = formateSpreadsheetNameForDataBase(
    companyName,
    rowData.visitDate,
    fromPermissionName.VISIT,
  );
  const monthlySheet = await findMonthlySheet(
    integration.googleSheetIntegrationID,
    spreadSheetName,
  );
  if (!monthlySheet) {
    console.log('No monthly sheet found for yearMonth:', yearMonth);
    return;
  }
  const spreadsheetId = monthlySheet.spreadsheetId;
  const existingTitles = await getSheetsMeta(refreshToken, spreadsheetId);
  const tabExists = existingTitles.some((s) => s.title === tabName);
  if (!tabExists) {
    console.log('No tab found with name:', tabName);
    return;
  }
  const body = {
    visitID: visitID,
    checkInTime: rowData?.checkInDateTime || '',
    checkInLocation: rowData?.checkInLocation || '',
    checkOutTime: rowData?.checkOutDateTime || '',
    checkOutLocation: rowData?.checkOutLocation || '',
  };
  await _updateCheckInOutColumns(refreshToken, spreadsheetId, tabName, body);
  return message.usermessage.updateMessage(
    'Google Sheet record for Check-In/Check-Out',
  );
};

exports.updateVisitReportInSheet = async (visitID) => {
  const rowData = await Visit.findOne({
    where: { visitID: visitID },
    include: [
      { model: companyMaster, attributes: ['companyName', 'companyMasterID'] },
      {
        model: UserMaster,
        as: 'createdByUserDetails',
        attributes: ['displayName', 'userMasterID'],
      },
      {
        model: UserMaster,
        as: 'assign',
        attributes: ['displayName', 'userMasterID'],
      },
      { model: Customer, attributes: ['customerID', 'customerName'] },
      {
        model: PurposeOfVisit,
        as: 'pov',
        include: [{ model: VisitPurpose, attributes: ['visitPurpose'] }],
      },
      {
        model: VisitProduct,
        as: 'vp',
        include: [
          {
            required: false,
            model: Product,
            attributes: ['productID', 'productName', 'companyMasterID'],
          },
        ],
      },
      ,
      {
        model: VisitFormCustomizeValue,
        as: 'vfcv',
        include: [
          { model: visitFormCustomize, as: 'vfc', attributes: ['fieldLabel'] },
        ],
      },
      {
        model: VisitReportCustomizeValue,
        as: 'vrcv',
        include: [
          {
            model: VisitReportCustomize,
            as: 'vrc',
            attributes: ['fieldLabel', 'inputType'],
            include: [
              {
                model: VisitReportMaster,
                as: 'vrMaster',
                attributes: ['visitReportName'],
              },
            ],
          },
        ],
      },
    ],
  });
  if (!rowData) {
    console.log('No visit found with ID:', visitID);
    return;
  }
  const formMaster = await FormMaster.findOne({
    where: { formName: fromPermissionName.VISIT },
  });
  const formMasterID = formMaster?.formMasterID;
  if (!formMasterID) {
    console.log('FormMaster not found for VISIT form.');
    return;
  }

  const integrationAndPermission = await getIntegrationAndPermissionData(
    rowData.companyMasterID,
    formMasterID,
  );
  if (!integrationAndPermission) {
    return;
  }
  const { integration, permissions } = integrationAndPermission;
  const { refreshToken } = integration;
  const companyName =
    rowData.companyMaster?.companyName || `Company ${rowData.companyMasterID}`;
  const date = rowData.visitDate;
  const yearMonth = formatYearMonth(date);
  const tabName = formatDateTab(date);
  const spreadSheetName = formateSpreadsheetNameForDataBase(
    companyName,
    date,
    fromPermissionName.VISIT,
  );
  const monthlySheet = await findMonthlySheet(
    integration.googleSheetIntegrationID,
    spreadSheetName,
  );
  if (!monthlySheet) {
    console.log('No monthly sheet found for yearMonth:', yearMonth);
    return;
  }
  const spreadsheetId = monthlySheet.spreadsheetId;
  const existingTitles = await getSheetsMeta(refreshToken, spreadsheetId);
  const tabexists = existingTitles.some((s) => s.title === tabName);
  if (!tabexists) {
    console.log('No tab found with name:', tabName);
    return;
  }
  const reportCustomizeValues =
    rowData.visitReportCustomizeValues ||
    rowData.VisitReportCustomizeValues ||
    rowData.vrcv ||
    [];
  const body = {
    visitID: visitID,
    reportType: _getVisitReportType(rowData),
    reportCustomizeValues: _normalizeVisitReportCustomizeValues(
      reportCustomizeValues,
    ),
  };
  await _updateReportColumns(refreshToken, spreadsheetId, tabName, body);
};

exports.addStartingVehicleMeterData = async (
  vehicleUsageID,
  companyMasterID,
  token,
) => {
  const rowData = await vehicleUsage.findOne({
    where: { vehicleUsageID: vehicleUsageID },
    include: [
      {
        model: UserMaster,
        attributes: ['userMasterID', 'displayName', 'userNumber'],
        include: [
          {
            model: EmployeeBranch,
            attributes: ['employeeBranchID'],
            where: { endDate: null },
            include: [
              {
                model: BranchMaster,
                as: 'branchMaster',
                attributes: ['branchMasterID', 'branchName'],
              },
            ],
          },
        ],
      },
    ],
  });
  const companyMasterModel = await companyMaster.findOne({
    where: { companyMasterID: companyMasterID },
  });
  if (!rowData) {
    console.log(`no data with VechileUsageID ${vehicleUsageID} found`);
    return;
  }
  const formPermissionName = fromPermissionName.ADMINVEHICLEMETERDETAILS;
  const formMaster = await FormMaster.findOne({
    where: { formName: formPermissionName },
  });

  const permissionData = await getIntegrationAndPermissionData(
    companyMasterID,
    formMaster?.formMasterID,
  );
  if (!permissionData) {
    return;
  }
  const { integration, permissions } = permissionData;
  const { refreshToken } = integration;
  const companyName = companyMasterModel?.companyName;
  const date = rowData.startingDateTime;
  const yearMonth = formatYearMonth(date);
  const tabName = formatDateTab(date);
  const spreadSheetName = `${companyName}-${formPermissionName}-${yearMonth}`;
  const monthlySheet = await _getOrCreateMonthlySheet(
    integration,
    companyName,
    date,
    formPermissionName,
    token,
  );

  //
  const spreadsheetId = monthlySheet?.spreadsheetId;

  // Create the date tab if it doesn't exist
  const existingTitles = await getSheetsMeta(refreshToken, spreadsheetId);
  const tabExists = existingTitles.some((s) => s.title === tabName);
  if (!tabExists) {
    const sheet = await addSheet(refreshToken, spreadsheetId, tabName);
    await _ensureSheetHeaders(
      refreshToken,
      spreadsheetId,
      tabName,
      sheet.sheetId,
      formPermissionName,
    );
    // Sort sheets by date in ascending order
    await _sortSheetsByDate(refreshToken, spreadsheetId);
  } else {
    const existingSheet = existingTitles.find((s) => s.title === tabName);
    if (existingSheet) {
      await _ensureSheetHeaders(
        refreshToken,
        spreadsheetId,
        tabName,
        existingSheet.sheetId,
        formPermissionName,
      );
    }
  }
  // await appendRows(refreshToken, spreadsheetId, tabName, [
  //   _buildVehicleRow(rowData),
  // ]);
  await saveRecord(formPermissionName, rowData, companyMasterID, token);

  // Clean up any empty tabs in the same spreadsheet
  await _cleanupEmptyTabs(refreshToken, spreadsheetId, tabName);

  return message.usermessage.addMessage('Google Sheet record');
};

/**
 * Update the vehicle usage row when ending meter is added.
 * It will locate the monthly sheet based on the record's startingDateTime
 * and update only the matching row (vehicleUsageID). Date/tab should not change.
 */
exports.addEndingVehicleUsageToGoogleSheet = async (
  vehicleUsageID,
  companyMasterID,
  token,
) => {
  const rowData = await vehicleUsage.findOne({
    where: { vehicleUsageID: vehicleUsageID },
    include: [
      {
        model: UserMaster,
        attributes: ['userMasterID', 'displayName', 'userNumber'],
        include: [
          {
            model: EmployeeBranch,
            attributes: ['employeeBranchID'],
            where: { endDate: null },
            include: [
              {
                model: BranchMaster,
                as: 'branchMaster',
                attributes: ['branchMasterID', 'branchName'],
              },
            ],
          },
        ],
      },
    ],
  });
  const config = await getSheetConfig(
    fromPermissionName.ADMINVEHICLEMETERDETAILS,
  );

  const companyMasterModel = await companyMaster.findOne({
    where: { companyMasterID: companyMasterID },
  });

  if (!rowData) {
    console.log(`no data with VehicleUsageID ${vehicleUsageID} found`);
    return;
  }

  const formPermissionName = fromPermissionName.ADMINVEHICLEMETERDETAILS;
  const formMaster = await FormMaster.findOne({
    where: { formName: formPermissionName },
  });

  const permissionData = await getIntegrationAndPermissionData(
    companyMasterID,
    formMaster?.formMasterID,
  );
  if (!permissionData) {
    return;
  }

  const { integration } = permissionData;
  const { refreshToken } = integration;
  const companyName = companyMasterModel?.companyName;

  // Use the startingDateTime to determine which monthly sheet and tab the original row was written to.
  const date = rowData.startingDateTime || new Date();
  const tabName = formatDateTab(date);

  // Ensure the monthly spreadsheet exists (create if missing) based on the starting date
  const monthlySheet = await _getOrCreateMonthlySheet(
    integration,
    companyName,
    date,
    formPermissionName,
    token,
  );
  const spreadsheetId = monthlySheet.spreadsheetId;

  // Ensure headers exist for vehicle form
  const existingTitles = await getSheetsMeta(refreshToken, spreadsheetId);
  const tabExists = existingTitles.some((s) => s.title === tabName);
  if (!tabExists) {
    // If tab does not exist, create it and add headers — then append the row
    const sheet = await addSheet(refreshToken, spreadsheetId, tabName);
    await _ensureSheetHeaders(
      refreshToken,
      spreadsheetId,
      tabName,
      sheet.sheetId,
      formPermissionName,
    );
    await appendRows(refreshToken, spreadsheetId, tabName, [
      _buildVehicleRow(rowData),
    ]);
    return message.usermessage.addMessage('Google Sheet record');
  }

  // Update only the matching row for this vehicleUsageID
  // await _updateVehicleRowInSheet(refreshToken, spreadsheetId, tabName, rowData);
  await updateOrAppendRow(
    refreshToken,
    spreadsheetId,
    tabName,
    config.headers,
    config.buildRow(rowData),
    rowData[config.rowIdKey],
  );
  return message.usermessage.updateMessage('Google Sheet record');
};

exports.addVisitMeetingData = async (
  visitMeetingId,
  companyMasterID,
  token,
) => {
  const rowData = await loadRecord(
    fromPermissionName.VISITMEETINGS,
    visitMeetingId,
  );

  const integrationAndPermission = await resolveSheetIntegration(
    companyMasterID,
    fromPermissionName.VISITMEETINGS,
    rowData,
  );
  if (!integrationAndPermission) {
    return;
  }
  const { config, integration, permissions, companyName } =
    integrationAndPermission;
  const { refreshToken } = integration;
  const date = rowData[config.dateKey];
  const tabName = await getTabName(date);
  const monthlySheet = await _getOrCreateMonthlySheet(
    integration,
    companyName,
    date,
    fromPermissionName.VISITMEETINGS,
    token,
  );
  const spreadSheetId = monthlySheet?.spreadsheetId;
  await createOrEnsureTab(refreshToken, spreadSheetId, tabName, config.headers);
  await updateOrAppendRow(
    refreshToken,
    spreadSheetId,
    tabName,
    config.headers,
    config.buildRow(rowData),
    rowData[config.rowIdKey],
  );
  return message.usermessage.addMessage('Google Sheet record');
};

exports.updateVisitMeetingData = async (
  visitMeetingID,
  companyMasterID,
  oldDate,
  token,
) => {
  const formPermissionName = fromPermissionName.VISITMEETINGS;
  const rowData = await loadRecord(formPermissionName, visitMeetingID);
  const newDate = rowData?.meetingDate;
  const integrationAndPermission = await resolveSheetIntegration(
    companyMasterID,
    formPermissionName,
    rowData,
  );
  if (!integrationAndPermission) {
    return;
  }
  const { integration, companyName, config } = integrationAndPermission;
  const { refreshToken } = integration;
  const oldMonth = formatYearMonth(oldDate);
  const newMonth = formatYearMonth(newDate);
  const oldTab = formatDateTab(oldDate);
  const newTab = formatDateTab(newDate);
  if (oldMonth === newMonth) {
    const monthlySheet = await _getOrCreateMonthlySheet(
      integration,
      companyName,
      newDate,
      formPermissionName,
      token,
    );
    const spreadSheetId = monthlySheet.spreadsheetId;
    if (oldTab === newTab) {
      await updateOrAppendRow(
        refreshToken,
        spreadSheetId,
        oldTab,
        config.headers,
        config.buildRow(rowData),
        rowData[config.rowIdKey],
      );
    } else {
      await _removeRowFromAnySheet(
        refreshToken,
        spreadSheetId,
        oldTab,
        rowData[config.rowIdKey],
        config.headers.length,
      );
      await _deleteTabIfEmpty(refreshToken, spreadSheetId, oldTab);
      await createOrEnsureTab(
        refreshToken,
        spreadSheetId,
        newTab,
        config.headers,
      );
      await appendRows(refreshToken, spreadSheetId, newTab, [
        config.buildRow(rowData),
      ]);
    }
  } else {
    const oldSpreadSheetName = formateSpreadsheetNameForDataBase(
      companyName,
      oldDate,
      formPermissionName,
    );
    const oldMonthSheet = await findMonthlySheet(
      integration.googleSheetIntegrationID,
      oldSpreadSheetName,
    );
    if (oldMonthSheet) {
      try {
        await _removeRowFromAnySheet(
          refreshToken,
          oldMonthSheet.spreadsheetId,
          oldTab,
          rowData[config.rowIdKey],
          config.headers.length,
        );
        await _deleteTabIfEmpty(
          refreshToken,
          oldMonthSheet.spreadsheetId,
          oldTab,
        );
      } catch (err) {
        const status = err?.response?.status || err?.code;
        if (status === 404 || status === '404' || status === 'NOT_FOUND') {
          await oldMonthSheet.destroy();
        } else {
          throw err;
        }
      }
    }
    const newMonthlySheet = await _getOrCreateMonthlySheet(
      integration,
      companyName,
      newDate,
      formPermissionName,
      token,
    );
    const spreadSheetId = newMonthlySheet.spreadSheetId;
    await createOrEnsureTab(
      refreshToken,
      spreadSheetId,
      newTab,
      config.headers,
    );
    await appendRows(refreshToken, spreadSheetId, newTab, [
      config.buildRow(rowData),
    ]);
    return message.usermessage.updateMessage('Google Sheet record');
  }
};
exports.deleteVisitMeetingData = async (
  companyMasterID,
  visitMeetingID,
  meetingDate,
) => {
  return deleteRecord(
    fromPermissionName.VISITMEETINGS,
    companyMasterID,
    visitMeetingID,
    meetingDate,
  );
};

exports.updateVisitMeetingStatusData = async (
  visitMeetingID,
  companyMasterID,
  token,
) => {
  const formPermissionName = fromPermissionName.VISITMEETINGS;
  const integrationAndPermission = await resolveSheetIntegration(
    companyMasterID,
    formPermissionName,
  );
  if (!integrationAndPermission) {
    return;
  }
  const { integration, config, companyName } = integrationAndPermission;
  const { refreshToken } = integration;
  const rowData = await loadRecord(formPermissionName, visitMeetingID);
  if (!rowData?.previousMeetingID) {
    const tabName = await getTabName(rowData.meetingDate);
    const monthlySheet = await _getOrCreateMonthlySheet(
      integration,
      companyName,
      rowData.meetingDate,
      formPermissionName,
      token,
    );
    const spreadSheetId = monthlySheet.spreadsheetId;
    await updateMeetingStatusColumn(
      refreshToken,
      spreadSheetId,
      tabName,
      visitMeetingID,
      rowData.meetingStatus,
    );
  } else {
    const tabName = await getTabName(rowData.previousMeeting.meetingDate);
    const monthlySheet = await _getOrCreateMonthlySheet(
      integration,
      companyName,
      rowData?.previousMeeting?.meetingDate,
      formPermissionName,
      token,
    );
    const spreadSheetId = monthlySheet.spreadsheetId;
    await updateMeetingStatusColumn(
      refreshToken,
      spreadSheetId,
      tabName,
      rowData?.previousMeeting?.visitMeetingID,
      'Rescheduled',
    );
    this.addVisitMeetingData(visitMeetingID, companyMasterID);
  }
};
exports.bulkAddUpdateVisitMeetingData = async (
  visitMeetingIds,
  companyMasterID,
  bulkData = [],
) => {
  try {
    // 1. Process standard additions/updates
    for (const visitMeetingId of visitMeetingIds) {
      const rowData = await loadRecord(
        fromPermissionName.VISITMEETINGS,
        visitMeetingId,
      );

      const integrationAndPermission = await resolveSheetIntegration(
        companyMasterID,
        fromPermissionName.VISITMEETINGS,
        rowData,
      );
      if (!integrationAndPermission) {
        continue;
      }
      const { config, integration, companyName } = integrationAndPermission;
      const { refreshToken } = integration;
      const date = rowData[config.dateKey];
      const tabName = await getTabName(date);
      const monthlySheet = await _getOrCreateMonthlySheet(
        integration,
        companyName,
        date,
        fromPermissionName.VISITMEETINGS,
      );
      const spreadSheetId = monthlySheet?.spreadsheetId;
      await createOrEnsureTab(
        refreshToken,
        spreadSheetId,
        tabName,
        config.headers,
      );
      await updateOrAppendRow(
        refreshToken,
        spreadSheetId,
        tabName,
        config.headers,
        config.buildRow(rowData),
        rowData[config.rowIdKey],
      );
    }

    // 2. Process Reschedule Status Updates
    for (const root of bulkData) {
      if (
        Array.isArray(root.previousMeetings) &&
        root.previousMeetings.length
      ) {
        const integrationAndPermission = await resolveSheetIntegration(
          companyMasterID,
          fromPermissionName.VISITMEETINGS,
        );
        if (!integrationAndPermission) continue;

        const { integration, companyName } = integrationAndPermission;
        const { refreshToken } = integration;

        for (const prevNode of root.previousMeetings) {
          if (prevNode.visitMeetingID && prevNode.meetingDate) {
            const tabName = await getTabName(prevNode.meetingDate);
            const monthlySheet = await _getOrCreateMonthlySheet(
              integration,
              companyName,
              prevNode.meetingDate,
              fromPermissionName.VISITMEETINGS,
            );
            const spreadSheetId = monthlySheet?.spreadsheetId;

            if (spreadSheetId) {
              await updateMeetingStatusColumn(
                refreshToken,
                spreadSheetId,
                tabName,
                prevNode.visitMeetingID,
                'Rescheduled',
              );
            }
          }
        }
      }
    }
  } catch (err) {
    console.log('Error in bulkAddUpdateVisitMeetingData:', err);
  }
};
