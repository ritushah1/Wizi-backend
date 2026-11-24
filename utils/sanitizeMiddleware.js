const xss = require('xss');

// For rich text editors: allows safe HTML tags
const xssOptionsRichText = {
  whiteList: {
    ...xss.whiteList,
  }, // Allow safe HTML tags (like bold, links) for rich text editors
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'], // strip script/style tags completely
  onIgnoreTagAttr: function (tag, name, value, isWhiteAttr) {
    if (name === 'style' || name === 'class') {
      return name + '="' + xss.escapeAttrValue(value) + '"';
    }
  },
};

// For plain text: strips all HTML tags
const xssOptionsPlainText = {
  whiteList: {}, // Empty whitelist strips all HTML tags
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
};

const myXssRichText = new xss.FilterXSS(xssOptionsRichText);
const myXssPlainText = new xss.FilterXSS(xssOptionsPlainText);

// Keys to skip (e.g., passwords where special characters shouldn't be HTML encoded)
const skippedKeys = [
  'password',
  'newPassword',
  'oldPassword',
  'confirmPassword',
];

// Keys that are allowed to have HTML (Rich Text)
const richTextKeys = [
  // Generic rich text fields
  'body',
  'agenda',
  'letter',
  'letterTemplate', // offer/joining/termination/relieving/experience letters
  'description',
  'Description', // uppercase variant (dealer plan, module details, tour)
  'query',
  'reply',
  'remark',
  'Remark', // uppercase variant (call response)
  'remarks',
  'solution',
  'mailBody',
  'letterhead',
  'content',
  'details',
  'comment',
  'TaskDesc',
  'value',
  // Announcement
  'announcement',
  // Job posting
  'jobDescription',
  'jobdescription', // lowercase variant (designation)
  // TDS
  'tdsSectionDescription',
  'tdsSubSectionDescription',
  // Preboarding / offer letter HTML
  'offerLetterHTML',
  // Notes
  'notes',
  // Employee comment (resignation)
  'employeeComment',
  // Generated letter HTML keys (list-employee-letter inline edit)
  'offerletterHTML',
  'joiningletterHTML',
  'experienceletterHTML',
  'incrementletterHTML',
  'terminationletterHTML',
  'appointmentletterHTML',
  'relievingLetterHTML',
  'disengagementLetterHTML',
  'confirmationLetterHTML',
  'transferLetterHTML',
  'discrepancyLetterHTML',
  'employmentCertificateHTML',
  'textContent',
];

function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      if (typeof obj[i] === 'string') {
        // Strip HTML tags but preserve <, >, <=, =>
        obj[i] = obj[i].replace(/<\/?\s*[a-zA-Z][^>]*>/g, '');
      } else if (typeof obj[i] === 'object') {
        sanitizeObject(obj[i]);
      }
    }
  } else {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (skippedKeys.includes(key)) {
          continue;
        }
        if (typeof obj[key] === 'string') {
          if (richTextKeys.includes(key) || key.startsWith('TaskDesc')) {
            obj[key] = myXssRichText.process(obj[key]);
          } else {
            // Strip HTML tags but preserve <, >, <=, =>
            obj[key] = obj[key].replace(/<\/?\s*[a-zA-Z][^>]*>/g, '');
          }
        } else if (typeof obj[key] === 'object') {
          sanitizeObject(obj[key]);
        }
      }
    }
  }
}

function sanitizeMiddleware(req, res, next) {
  if (req.body) {
    sanitizeObject(req.body);
  }
  if (req.query) {
    sanitizeObject(req.query);
  }
  if (req.params) {
    sanitizeObject(req.params);
  }
  next();
}

module.exports = { sanitizeMiddleware, sanitizeObject };
