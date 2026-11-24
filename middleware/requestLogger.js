const ApiLogs = require('../models/apiLog');
const { cookieNamesEnum } = require('../utils/commonVars');
const { getDecodedJwtToken } = require('../utils/jsonwebtoken.utils');

const MAX_LOG_SIZE = 500 * 1024;
const SKIP_URL_PREFIXES = [
  '/health',
  '/favicon.ico',
  '/uploads',
  '/Tracking/v1/savedatabulk',
  '/menuClick/v1/addClick',
];

function isBase64(str) {
  if (typeof str !== 'string') return false;
  // Rough check for Base64 (length > 100 to avoid false positives)
  return str.length > 100 && /^[A-Za-z0-9+/=\s]+$/.test(str);
}

function replaceBase64Values(obj) {
  if (Array.isArray(obj)) {
    return obj.map(replaceBase64Values);
  } else if (obj && typeof obj === 'object') {
    const result = {};
    for (const key in obj) {
      const val = obj[key];
      if (typeof val === 'string' && isBase64(val)) {
        result[key] = 'Base64 Data';
      } else {
        result[key] = replaceBase64Values(val);
      }
    }
    return result;
  }
  return obj;
}

function safeJson(payload) {
  try {
    if (!payload || Object.keys(payload).length === 0) return null;

    const sanitizedPayload = replaceBase64Values(payload);

    const json = JSON.stringify(sanitizedPayload);
    if (Buffer.byteLength(json, 'utf8') > MAX_LOG_SIZE) {
      return { skipped: true, reason: 'payload too large' };
    }
    return sanitizedPayload;
  } catch {
    return { skipped: true, reason: 'json stringify failed' };
  }
}

async function extractUserDetails(req) {
  const authHeader =
    req.cookies?.[cookieNamesEnum.AUTHENTICATION_TOKEN] || req.headers.authorization;
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || null;

  if (!authHeader?.startsWith('Bearer ')) {
    return { userMasterId: null, companyMasterId: null, userIpAddress: ip };
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = await getDecodedJwtToken(token);

    return {
      userMasterId: decoded?.token?.usermasterid || null,
      companyMasterId: decoded?.token?.companyMasterID || null,
      userIpAddress: ip,
    };
  } catch {
    return { userMasterId: null, companyMasterId: null, userIpAddress: ip };
  }
}

const requestLogger = async (req, res, next) => {
  const shouldSkip = SKIP_URL_PREFIXES.some((p) => req.path.startsWith(p));
  if (shouldSkip) return next();

  req.userDetails = await extractUserDetails(req);

  const reqStartTime = new Date();
  const startMs = Date.now();
  let apiLogId = null;
  let updated = false;
  const apiCallFrom = req.userDetails.apiCallFrom;
  /** 1️⃣ CREATE LOG AT START */
  try {
    const log = await ApiLogs.create(
      {
        companyMasterID: req.userDetails.companyMasterId,
        method: req.method,
        url: req.originalUrl,
        requestBody: safeJson(req.body),
        requestParams: safeJson(req.params),
        requestQuery: safeJson(req.query),
        reqStartTime,
        callFrom: apiCallFrom,
      },
      { user: req.userDetails },
    );

    apiLogId = log.requestLogID;
  } catch (err) {
    console.error('API log start insert failed:', err.message);
  }

  /** 2️⃣ UPDATE LOG AT END */
  const updateLog = (reason = 'finished') => {
    if (!apiLogId || updated) return;
    updated = true;

    setImmediate(async () => {
      try {
        await ApiLogs.update(
          {
            reqEndTime: new Date(),
            responseTimeMs: Date.now() - startMs,
            statusCode: res.statusCode || 0,
            failureReason: reason !== 'finished' ? reason : null,
          },
          {
            where: { requestLogID: apiLogId },
            user: req.userDetails,
          },
        );
      } catch (err) {
        console.error('API log update failed:', err.message);
      }
    });
  };

  res.on('finish', () => updateLog('finished')); // normal
  res.on('close', () => updateLog('connection closed')); // client abort
  res.on('error', () => updateLog('response error')); // rare

  next();
};

module.exports = requestLogger;
