const { google } = require('googleapis');
const GoogleSheetIntegration = require('../models/googleSheetIntegration');
const GoogleSheetExportSetting = require('../models/googleSheetExportSetting');
const FormMaster = require('../models/formMaster');

/**
 * Build an authenticated Google Sheets + Drive client using a stored refresh token.
 * Requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI in .env
 */
function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

function getSheetsClient(refreshToken) {
  const auth = getOAuthClient();
  auth.setCredentials({ refresh_token: refreshToken });
  return google.sheets({ version: 'v4', auth });
}

function getDriveClient(refreshToken) {
  const auth = getOAuthClient();
  auth.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: 'v3', auth });
}

/**
 * Exchange an authorization code for tokens (used during OAuth callback).
 */
async function exchangeCodeForTokens(code) {
  const auth = getOAuthClient();
  const { tokens } = await auth.getToken(code);
  return tokens;
}

/**
 * Get the Google OAuth consent URL.
 */
function getAuthUrl(state) {
  const auth = getOAuthClient();
  return auth.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    state: state,
  });
}

/**
 * Get the authenticated user's email address.
 */
async function getGoogleUserEmail(refreshToken) {
  const auth = getOAuthClient();
  auth.setCredentials({ refresh_token: refreshToken });
  const oauth2 = google.oauth2({ version: 'v2', auth });
  const { data } = await oauth2.userinfo.get();
  return data.email;
}

/**
 * Create a new spreadsheet with a given title and return its ID.
 */
async function createSpreadsheet(refreshToken, title, initialSheetTitle) {
  const sheets = getSheetsClient(refreshToken);
  const requestBody = { properties: { title } };
  // If an initial sheet title is provided, create the spreadsheet with that sheet.
  if (initialSheetTitle) {
    requestBody.sheets = [{ properties: { title: initialSheetTitle } }];
  }
  const response = await sheets.spreadsheets.create({ requestBody });
  return response.data;
}

async function updateRange(refreshToken, spreadsheetId, range, values) {
  const sheets = getSheetsClient(refreshToken);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

async function deleteSheetRow(refreshToken, spreadsheetId, sheetId, rowIndex) {
  const sheets = getSheetsClient(refreshToken);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex - 1,
              endIndex: rowIndex,
            },
          },
        },
      ],
    },
  });
}

/**
 * Get all sheet (tab) titles in a spreadsheet.
 */
async function getSheetTitles(refreshToken, spreadsheetId) {
  const sheets = getSheetsClient(refreshToken);
  const response = await sheets.spreadsheets.get({ spreadsheetId });
  return response.data.sheets.map((s) => s.properties.title);
}

/**
 * Get all sheet metadata (title + sheetId) in a spreadsheet.
 */
async function getSheetsMeta(refreshToken, spreadsheetId) {
  const sheets = getSheetsClient(refreshToken);
  const response = await sheets.spreadsheets.get({ spreadsheetId });
  return response.data.sheets.map((s) => ({
    title: s.properties.title,
    sheetId: s.properties.sheetId,
  }));
}

/**
 * Add a new sheet tab to an existing spreadsheet.
 */
async function addSheet(refreshToken, spreadsheetId, sheetTitle) {
  const sheets = getSheetsClient(refreshToken);
  const response = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title: sheetTitle } } }],
    },
  });
  return response.data.replies[0].addSheet.properties;
}

/**
 * Delete a sheet tab by its numeric sheetId.
 */
async function deleteSheet(refreshToken, spreadsheetId, sheetId) {
  const sheets = getSheetsClient(refreshToken);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ deleteSheet: { sheetId } }],
    },
  });
}

/**
 * Move a sheet to a specific index position (0-based).
 */
async function moveSheet(refreshToken, spreadsheetId, sheetId, newIndex) {
  const sheets = getSheetsClient(refreshToken);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: {
              sheetId,
              index: newIndex,
            },
            fields: 'index',
          },
        },
      ],
    },
  });
}

async function hideSheetColumn(
  refreshToken,
  spreadsheetId,
  sheetId,
  columnIndex,
) {
  const sheets = getSheetsClient(refreshToken);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: 'COLUMNS',
              startIndex: columnIndex,
              endIndex: columnIndex + 1,
            },
            properties: {
              hiddenByUser: true,
            },
            fields: 'hiddenByUser',
          },
        },
      ],
    },
  });
}

/**
 * Append rows to a sheet. values is an array of arrays.
 */
async function appendRows(refreshToken, spreadsheetId, sheetTitle, values) {
  const sheets = getSheetsClient(refreshToken);
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${sheetTitle}'!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

/**
 * Overwrite all data in a sheet (clear then write).
 */
async function overwriteSheet(refreshToken, spreadsheetId, sheetTitle, values) {
  const sheets = getSheetsClient(refreshToken);
  // Clear first
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'${sheetTitle}'`,
  });
  if (values.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${sheetTitle}'!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
  }
}

/**
 * Read all values from a sheet.
 */
async function readSheet(refreshToken, spreadsheetId, sheetTitle) {
  const sheets = getSheetsClient(refreshToken);
  const range = sheetTitle.includes('!') ? sheetTitle : `'${sheetTitle}'`;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
    valueRenderOption: 'FORMULA',
  });
  return response.data.values || [];
}

async function getIntegrationAndPermissionData(companyMasterID, formMasterID) {
  const integration = await GoogleSheetIntegration.findOne({
    where: { companyMasterID },
  });
  const permissions = await GoogleSheetExportSetting.findAll({
    where: { companyMasterID, formMasterID },
    include: [{ model: FormMaster, attributes: ['formMasterID', 'formName'] }],
  });
  const hasPermission = permissions.find((p) => p.formMasterID === formMasterID)
    ?.formMaster?.formName;
  if (!permissions.some((p) => p.formMasterID === formMasterID)) {
    console.log('Google Sheets export not enabled for this form.');
    return;
  }
  if (!integration) {
    console.log(
      'Google Sheets integration not found for companyMasterID:',
      companyMasterID,
    );
    return;
  }

  return { integration: integration, permissions: hasPermission };
}

module.exports = {
  getAuthUrl,
  exchangeCodeForTokens,
  getGoogleUserEmail,
  createSpreadsheet,
  updateRange,
  deleteSheetRow,
  getSheetTitles,
  getSheetsMeta,
  addSheet,
  deleteSheet,
  moveSheet,
  hideSheetColumn,
  appendRows,
  overwriteSheet,
  readSheet,
  getIntegrationAndPermissionData,
};
