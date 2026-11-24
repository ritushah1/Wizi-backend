'use strict';

const path = require('path');
const fs = require('fs');
const sequelize = require('../config/database');
const Sequelize = require('sequelize');
const message = require('../response_message/message');
const Certificate = require('../models/certificate');
const UserMaster = require('../models/userMaster');
const Course = require('../models/course');
const Enrollment = require('../models/enrollment');
const CompanyMaster = require('../models/companyMaster');
const puppeteer = require('puppeteer');

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'tankhwapatra';
const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';

// Load PIH Certificate Background Template
let pihCertificateTemplateBase64 = '';
try {
  const templatePath = path.join(__dirname, '../assets/pih_certificate_template.jpg');
  if (fs.existsSync(templatePath)) {
    pihCertificateTemplateBase64 = fs.readFileSync(templatePath).toString('base64');
  }
} catch (e) {
  console.error('Error loading PIH certificate template:', e);
}

/**
 * Get user's certificates
 */
exports.getMyCertificates = async (req, res, next) => {
  try {
    // Get user ID from body / query / userDetails
    let targetUserId =
      req.body?.userMasterID ||
      req.query?.userMasterID ||
      req.userDetails?.userMasterID ||
      req.userDetails?.userMasterId;

    if (req?.userDetails?.isMyUserDetails) {
      targetUserId = req.userDetails.userMasterID || req.userDetails.userMasterId;
    }

    if (!targetUserId) {
      return res.status(401).json({
        status: 401,
        message: 'User not authenticated',
      });
    }

    // Support both query params (GET - React) and body params (POST - Angular)
    const {
      isValid,
      isExpired,
      page = 1,
      limit = 10,
      search,
      searchQuery,
    } = { ...req.query, ...req.body };
    const queryTerm = search || searchQuery || '';

    const where = {
      userId: parseInt(targetUserId),
      status: 1,
    };

    // Apply filters
    if (isValid !== undefined) {
      where.isValid = isValid === 'true' || isValid === true;
    }

    // Build query options
    const parsedPage = Math.max(1, parseInt(page) || 1);
    const parsedLimit = parseInt(limit) || 10;
    const offset = (parsedPage - 1) * parsedLimit;

    const queryOptions = {
      where,
      include: [
        {
          model: UserMaster,
          as: 'user',
          attributes: ['userMasterID', 'displayName', 'firstName', 'lastName'],
          required: false,
        },
        {
          model: Course,
          as: 'course',
          paranoid: false,
          attributes: [
            'id',
            'title',
            'companyMasterID',
            'coverImageKey',
            'coverImageUrl',
          ],
          required: false,
          include: [
            {
              model: CompanyMaster,
              paranoid: false,
              attributes: [
                'companyMasterID',
                'companyName',
                'companyLogo',
                'authorizedSignature',
                'ownerName',
                'cpName',
              ],
              required: false,
            },
          ],
        },
      ],
      limit: parsedLimit,
      offset: offset,
      order: [['issuedAt', 'DESC']],
      distinct: true,
    };

    // Add search for certificate number or course title if search query exists
    if (queryTerm && queryTerm.trim()) {
      const term = `%${queryTerm.trim()}%`;
      where[Sequelize.Op.or] = [
        { certificateNumber: { [Sequelize.Op.like]: term } },
        { '$course.title$': { [Sequelize.Op.like]: term } },
      ];
    }

    const { count, rows: certificates } =
      await Certificate.findAndCountAll(queryOptions);

    // Format response
    const formattedCertificates = certificates.map((cert) => {
      const company =
        cert.course?.companyMaster || cert.course?.CompanyMaster || {};
      const isExp = cert.isExpired
        ? cert.isExpired()
        : cert.expiresAt
          ? new Date() > new Date(cert.expiresAt)
          : false;
      const isAct = cert.isActive ? cert.isActive() : cert.isValid && !isExp;
      return {
        id: cert.id,
        certificateNumber: cert.certificateNumber,
        issuedAt: cert.issuedAt,
        expiresAt: cert.expiresAt,
        isValid: cert.isValid,
        finalScore: cert.finalScore,
        finalPercentage: cert.finalPercentage,
        completionTimeHours: cert.completionTimeHours,
        verificationHash: cert.verificationHash,
        userId: cert.userId,
        courseId: cert.courseId,
        recipientName: cert.user
          ? cert.user.displayName ||
            `${cert.user.firstName || ''} ${cert.user.lastName || ''}`.trim()
          : 'Recipient',
        courseName: cert.course ? cert.course.title : 'Course',
        companyName: company.companyName || 'Corporate Training',
        companyLogo: company.companyLogo || '',
        authorizedSignature: company.authorizedSignature || '',
        authorizedSignatoryName:
          company.ownerName || company.cpName || 'Authorized Signatory',
        isExpired: isExp,
        isActive: isAct,
      };
    });

    return res.status(200).json({
      status: 200,
      message: 'Certificates retrieved successfully',
      data: formattedCertificates,
      totalCount: count,
      totalcount: count,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total: count,
        totalPages: Math.ceil(count / parsedLimit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get certificate by ID
 */
exports.getCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;
    const userId = req.userDetails?.userMasterId || req.userDetails?.id;
    const userRole = req.userDetails?.role?.roleName || req.userDetails?.role;

    const certificate = await Certificate.findOne({
      where: { id: certificateId },
      include: [
        {
          model: UserMaster,
          as: 'user',
          attributes: ['userMasterID', 'displayName'],
        },
        {
          model: Course,
          as: 'course',
          paranoid: false,
          attributes: ['id', 'title', 'companyMasterID'],
        },
      ],
    });

    if (!certificate) {
      return res.status(404).json({
        status: 404,
        message: 'Certificate not found',
      });
    }

    // Check access permissions
    const reqCompanyId =
      req.userDetails?.companyMasterId || req.userDetails?.companyMasterID;
    const certCompanyId = certificate.course?.companyMasterID;
    const isSameCompany =
      reqCompanyId &&
      certCompanyId &&
      String(reqCompanyId) === String(certCompanyId);

    if (
      certificate.userId !== userId &&
      !['ADMIN', 'TRAINER', 'HR', 'MANAGER'].includes(
        String(userRole || '').toUpperCase(),
      ) &&
      !isSameCompany
    ) {
      return res.status(403).json({
        status: 403,
        message: 'Access denied to this certificate',
      });
    }

    const formattedCertificate = {
      id: certificate.id,
      certificateNumber: certificate.certificateNumber,
      issuedAt: certificate.issuedAt,
      expiresAt: certificate.expiresAt,
      isValid: certificate.isValid,
      finalScore: certificate.finalScore,
      finalPercentage: certificate.finalPercentage,
      completionTimeHours: certificate.completionTimeHours,
      verificationHash: certificate.verificationHash,
      userId: certificate.userId,
      courseId: certificate.courseId,
      recipientName: certificate.user
        ? certificate.user.displayName
        : 'Unknown',
      courseName: certificate.course
        ? certificate.course.title
        : 'Unknown Course',
      isExpired: certificate.isExpired(),
      isActive: certificate.isActive(),
    };

    return res.status(200).json({
      status: 200,
      message: 'Certificate retrieved successfully',
      data: formattedCertificate,
    });
  } catch (error) {
    console.error('Error fetching certificate:', error);
    return res.status(500).json({
      status: 500,
      message: 'Failed to fetch certificate',
    });
  }
};

/**
 * Download certificate (generates PDF, JPG or HTML certificate)
 */
exports.downloadCertificate = async (req, res, next) => {
  let browser = null;
  try {
    const { certificateId } = req.params;
    const userId = req.userDetails?.userMasterId || req.userDetails?.id;
    const userRole = req.userDetails?.role?.roleName || req.userDetails?.role;
    const format = String(req.query.format || req.body?.format || 'pdf').toLowerCase(); // 'pdf', 'jpg', 'jpeg', 'html', 'url'

    // Get full certificate details with user and course info
    const certificate = await Certificate.findOne({
      where: { id: certificateId },
      include: [
        {
          model: UserMaster,
          as: 'user',
          attributes: ['userMasterID', 'displayName', 'firstName', 'lastName'],
        },
        {
          model: Course,
          as: 'course',
          paranoid: false,
          attributes: ['id', 'title', 'description', 'companyMasterID'],
          include: [
            {
              model: CompanyMaster,
              paranoid: false,
              attributes: [
                'companyMasterID',
                'companyName',
                'companyLogo',
                'authorizedSignature',
                'ownerName',
                'cpName',
              ],
              required: false,
            },
          ],
        },
      ],
    });

    if (!certificate) {
      return res.status(404).json({
        status: 404,
        message: 'Certificate not found',
      });
    }

    // Check access permissions
    const reqCompanyId =
      req.userDetails?.companyMasterId || req.userDetails?.companyMasterID;
    const certCompanyId = certificate.course?.companyMasterID;
    const isSameCompany =
      reqCompanyId &&
      certCompanyId &&
      String(reqCompanyId) === String(certCompanyId);

    if (
      certificate.userId !== userId &&
      !['ADMIN', 'TRAINER', 'HR', 'MANAGER'].includes(
        String(userRole || '').toUpperCase(),
      ) &&
      !isSameCompany
    ) {
      return res.status(403).json({
        status: 403,
        message: 'Access denied to this certificate',
      });
    }

    // If format is 'url', return JSON with download info
    if (format === 'url') {
      const targetFormat = req.query.targetFormat || req.body?.targetFormat || 'pdf';
      return res.status(200).json({
        status: 200,
        message: 'Certificate download URL generated successfully',
        data: {
          downloadUrl: `/certificates/${certificateId}/download?format=${targetFormat}`,
          fileName: `Certificate_${certificate.certificateNumber || certificate.id}.${targetFormat}`,
          expiresIn: 0,
        },
      });
    }

    // Generate certificate template data
    const recipientName = certificate.user
      ? certificate.user.displayName ||
        `${certificate.user.firstName || ''} ${certificate.user.lastName || ''}`.trim()
      : 'Recipient';
    const courseName = certificate.course ? certificate.course.title : 'Course';
    const company = certificate.course?.companyMaster || {};
    const companyName = company.companyName || 'Corporate Training';
    const signatoryName =
      company.ownerName || company.cpName || 'Authorized Signatory';
    const signatureFile = company.authorizedSignature;
    const baseUrl =
      process.env.API_URL || `${req.protocol}://${req.get('host')}`;

    let signatureImgTag = '';
    if (signatureFile) {
      const localSigPath = path.join(__dirname, '../uploads/company/signature/', signatureFile);
      if (fs.existsSync(localSigPath)) {
        const ext = path.extname(signatureFile).replace('.', '').toLowerCase() || 'png';
        const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : (ext === 'svg' ? 'image/svg+xml' : 'image/png');
        const b64 = fs.readFileSync(localSigPath).toString('base64');
        signatureImgTag = `<img src="data:${mime};base64,${b64}" alt="Signature" style="max-height: 60px; max-width: 200px; object-fit: contain; margin-bottom: 6px;" />`;
      } else {
        signatureImgTag = `<img src="${baseUrl}/uploads/company/signature/${signatureFile}" alt="Signature" style="max-height: 60px; max-width: 200px; object-fit: contain; margin-bottom: 6px;" />`;
      }
    }

    const issuedDate = new Date(certificate.issuedAt).toLocaleDateString(
      'en-US',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      },
    );
    const expiryDate = certificate.expiresAt
      ? new Date(certificate.expiresAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : null;

    // Background image data URI
    const bgImageSrc = pihCertificateTemplateBase64
      ? `data:image/jpeg;base64,${pihCertificateTemplateBase64}`
      : `${baseUrl}/assets/pih_certificate_template.jpg`;

    const isHtmlPreview = format === 'html';
    const bodyBg = isHtmlPreview ? '#1a1a2e' : '#ffffff';
    const bodyDisplay = isHtmlPreview ? 'flex' : 'block';
    const bodyPadding = isHtmlPreview ? '20px' : '0px';
    const bodyMinHeight = isHtmlPreview ? '100vh' : 'auto';
    const wrapperMargin = isHtmlPreview ? '0' : '0 auto';
    const wrapperShadow = isHtmlPreview ? '0 15px 50px rgba(0, 0, 0, 0.4)' : 'none';

    const certificateHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Certificate - ${certificate.certificateNumber}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Montserrat:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,400&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 landscape;
      margin: 0;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Montserrat', 'Georgia', sans-serif;
      background: ${bodyBg};
      display: ${bodyDisplay};
      justify-content: center;
      align-items: center;
      min-height: ${bodyMinHeight};
      padding: ${bodyPadding};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .certificate-wrapper {
      width: 297mm;
      height: 210mm;
      background: #ffffff;
      box-shadow: ${wrapperShadow};
      position: relative;
      overflow: hidden;
      margin: ${wrapperMargin};
    }
    .certificate-container {
      width: 100%;
      height: 100%;
      position: relative;
      background-image: url('${bgImageSrc}');
      background-repeat: no-repeat;
      background-position: center center;
      background-size: 100% 100%;
      overflow: hidden;
    }
    .certificate-inner {
      position: absolute;
      top: 27.5%;
      bottom: 11%;
      left: 6%;
      right: 6%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      text-align: center;
      z-index: 2;
    }
    .cert-hero {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
    }
    .awarded-to {
      font-size: 13px;
      font-weight: 600;
      color: #581442;
      letter-spacing: 3.5px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .recipient-name {
      font-family: 'Playfair Display', 'Cinzel', 'Georgia', serif;
      font-size: 34px;
      font-weight: 700;
      color: #3b0f32;
      letter-spacing: 1px;
      line-height: 1.2;
      margin: 2px 0 4px 0;
      text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
    }
    .divider {
      width: 150px;
      height: 2px;
      background: linear-gradient(90deg, transparent, #862d70, #4A154B, #862d70, transparent);
      margin: 4px auto 6px auto;
    }
    .completion-text {
      font-size: 12.5px;
      color: #4b5563;
      font-style: italic;
      margin-bottom: 4px;
    }
    .course-name {
      font-family: 'Playfair Display', 'Cinzel', 'Georgia', serif;
      font-size: 23px;
      font-weight: 700;
      color: #501642;
      line-height: 1.25;
      max-width: 85%;
    }
    .details-grid {
      display: flex;
      justify-content: center;
      gap: 16px;
      width: 100%;
      max-width: 820px;
      margin: 6px 0;
    }
    .detail-card {
      background: rgba(255, 255, 255, 0.92);
      border: 1.5px solid rgba(86, 21, 67, 0.22);
      border-radius: 8px;
      padding: 7px 18px;
      min-width: 140px;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.06);
      text-align: center;
    }
    .detail-label {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.4px;
      color: #7a3a68;
      margin-bottom: 3px;
      display: block;
    }
    .detail-value {
      font-size: 14.5px;
      font-weight: 700;
      color: #1f2937;
      line-height: 1.25;
    }
    .footer-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      width: 100%;
      max-width: 780px;
      padding: 0 10px;
    }
    .signature-block {
      text-align: center;
      min-width: 180px;
    }
    .signature-img-wrap {
      min-height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 2px;
    }
    .signature-line {
      width: 170px;
      border-top: 1.5px solid #4A154B;
      margin: 2px auto 4px auto;
    }
    .signature-name {
      font-size: 12px;
      font-weight: 700;
      color: #2d3748;
    }
    .signature-title {
      font-size: 10px;
      color: #64748b;
    }
    .verification-block {
      text-align: right;
      max-width: 250px;
    }
    .verify-badge {
      display: inline-block;
      background: rgba(74, 21, 75, 0.08);
      border: 1px solid rgba(74, 21, 75, 0.2);
      border-radius: 20px;
      padding: 3px 12px;
      font-size: 10.5px;
      font-weight: 700;
      color: #4A154B;
      margin-bottom: 3px;
    }
    .verify-info {
      font-size: 9.5px;
      color: #64748b;
      line-height: 1.3;
    }
    @media print {
      body {
        background: transparent;
        padding: 0;
        margin: 0;
      }
      .certificate-wrapper {
        box-shadow: none;
        margin: 0;
        width: 297mm;
        height: 210mm;
      }
    }
  </style>
</head>
<body>
  <div class="certificate-wrapper">
    <div class="certificate-container">
      <div class="certificate-inner">
        <div class="cert-hero">
          <div class="awarded-to">This is to certify that</div>
          <div class="recipient-name">${recipientName}</div>
          <div class="divider"></div>
          <div class="completion-text">has successfully fulfilled all requirements and completed the course</div>
          <div class="course-name">${courseName}</div>
        </div>

        <div class="details-grid">
          <div class="detail-card">
            <span class="detail-label">Certificate No</span>
            <span class="detail-value">${certificate.certificateNumber}</span>
          </div>
          <div class="detail-card">
            <span class="detail-label">Issue Date</span>
            <span class="detail-value">${issuedDate}</span>
          </div>
          <div class="detail-card">
            <span class="detail-label">Valid Until</span>
            <span class="detail-value">${expiryDate ? expiryDate : 'Lifetime'}</span>
          </div>
          ${certificate.finalPercentage != null ? `
          <div class="detail-card">
            <span class="detail-label">Final Score</span>
            <span class="detail-value">${certificate.finalPercentage}%</span>
          </div>` : ''}
        </div>

        <div class="footer-row">
          <div class="signature-block">
            <div class="signature-img-wrap">
              ${signatureImgTag}
            </div>
            <div class="signature-line"></div>
            <div class="signature-name">${signatoryName}</div>
            <div class="signature-title">${companyName}</div>
          </div>

          <div class="verification-block">
            <div class="verify-badge">Official Verified Credential</div>
            <div class="verify-info">
              <div>Certificate ID: ${certificate.certificateNumber}</div>
              ${certificate.verificationHash ? `<div>Sec Hash: ${certificate.verificationHash.substring(0, 16)}...</div>` : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  ${isHtmlPreview ? `
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>` : ''}
</body>
</html>
    `;

    // 1. Handle HTML format
    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Certificate_${certificate.certificateNumber || certificate.id}.html"`,
      );
      return res.send(certificateHTML);
    }

    // 2. Handle JPG / JPEG format
    if (format === 'jpg' || format === 'jpeg' || format === 'image') {
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1123, height: 794, deviceScaleFactor: 2 });
      await page.setContent(certificateHTML, { waitUntil: ['load', 'networkidle0'] });
      try {
        await page.evaluateHandle('document.fonts.ready');
      } catch (fontErr) {
        // Continue if fonts.ready fails
      }

      const certElement = await page.$('.certificate-wrapper');
      let imageUint8;
      if (certElement) {
        imageUint8 = await certElement.screenshot({
          type: 'jpeg',
          quality: 95,
        });
      } else {
        imageUint8 = await page.screenshot({
          type: 'jpeg',
          quality: 95,
          fullPage: false,
        });
      }
      await browser.close();
      browser = null;

      const imageBuffer = Buffer.from(imageUint8);
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Length', imageBuffer.length);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Certificate_${certificate.certificateNumber || certificate.id}.jpg"`,
      );
      return res.end(imageBuffer);
    }

    // 3. Default: PDF format
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1123, height: 794, deviceScaleFactor: 2 });
    await page.setContent(certificateHTML, { waitUntil: ['load', 'networkidle0'] });
    try {
      await page.evaluateHandle('document.fonts.ready');
    } catch (fontErr) {
      // Continue if fonts.ready fails
    }

    const pdfUint8 = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
      preferCSSPageSize: true,
    });
    await browser.close();
    browser = null;

    const pdfBuffer = Buffer.from(pdfUint8);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Certificate_${certificate.certificateNumber || certificate.id}.pdf"`,
    );
    return res.end(pdfBuffer);
  } catch (error) {
    if (browser) {
      try {
        await browser.close();
      } catch (closeErr) {
        // ignore
      }
    }
    console.error('Error generating certificate:', error);
    next(error);
  }
};

/**
 * Get user certificates by user ID (for admins/trainers)
 */
exports.getUserCertificates = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId =
      req.userDetails?.userMasterId || req.userDetails?.id;
    const requestingUserRole =
      req.userDetails?.role?.roleName || req.userDetails?.role;
    const { isValid, isExpired } = req.query;

    // Only admins and trainers can view other users' certificates
    if (
      !['ADMIN', 'TRAINER'].includes(requestingUserRole) &&
      requestingUserId !== userId
    ) {
      return res.status(403).json({
        status: 403,
        message: 'Access denied to user certificates',
      });
    }

    let query = `
      SELECT 
        c.id,
        c.certificate_number as certificateNumber,
        c.issued_at as issuedAt,
        c.expires_at as expiresAt,
        c.is_valid as isValid,
        c.final_score as finalScore,
        c.final_percentage as finalPercentage,
        c.completion_time_hours as completionTimeHours,
        c.verification_hash as verificationHash,
        c.user_id as userId,
        c.course_id as courseId,
        CONCAT(u.first_name, ' ', u.last_name) as recipientName,
        co.title as courseName,
        CASE 
          WHEN c.expires_at IS NOT NULL AND c.expires_at < NOW() THEN 1
          ELSE 0
        END as isExpired,
        CASE 
          WHEN c.is_valid = 1 AND (c.expires_at IS NULL OR c.expires_at >= NOW()) THEN 1
          ELSE 0
        END as isActive
      FROM certificates c
      INNER JOIN users u ON c.user_id = u.id
      INNER JOIN courses co ON c.course_id = co.id
      WHERE c.user_id = :userId
    `;

    const replacements = { userId };

    // Apply filters
    if (isValid !== undefined) {
      query += ` AND c.is_valid = :isValid`;
      replacements.isValid = isValid === 'true' ? 1 : 0;
    }

    if (isExpired !== undefined) {
      if (isExpired === 'true') {
        query += ` AND c.expires_at IS NOT NULL AND c.expires_at < NOW()`;
      } else {
        query += ` AND (c.expires_at IS NULL OR c.expires_at >= NOW())`;
      }
    }

    query += ` ORDER BY c.issued_at DESC`;

    const certificates = await sequelize.query(query, {
      replacements,
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      status: 200,
      message: 'User certificates retrieved successfully',
      data: certificates,
    });
  } catch (error) {
    console.error('Error fetching user certificates:', error);
    return res.status(500).json({
      status: 500,
      message: 'Failed to fetch user certificates',
    });
  }
};

/**
 * Get course certificates (for admins/trainers)
 */
exports.getCourseCertificates = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userRole = req.userDetails?.role?.roleName || req.userDetails?.role;
    const { isValid, isExpired, userId } = req.query;

    // Only admins and trainers can view course certificates
    if (!['ADMIN', 'TRAINER'].includes(userRole)) {
      return res.status(403).json({
        status: 403,
        message: 'Access denied to course certificates',
      });
    }

    let query = `
      SELECT 
        c.id,
        c.certificate_number as certificateNumber,
        c.issued_at as issuedAt,
        c.expires_at as expiresAt,
        c.is_valid as isValid,
        c.final_score as finalScore,
        c.final_percentage as finalPercentage,
        c.completion_time_hours as completionTimeHours,
        c.verification_hash as verificationHash,
        c.user_id as userId,
        c.course_id as courseId,
        CONCAT(u.first_name, ' ', u.last_name) as recipientName,
        co.title as courseName,
        CASE 
          WHEN c.expires_at IS NOT NULL AND c.expires_at < NOW() THEN 1
          ELSE 0
        END as isExpired,
        CASE 
          WHEN c.is_valid = 1 AND (c.expires_at IS NULL OR c.expires_at >= NOW()) THEN 1
          ELSE 0
        END as isActive
      FROM certificates c
      INNER JOIN users u ON c.user_id = u.id
      INNER JOIN courses co ON c.course_id = co.id
      WHERE c.course_id = :courseId
    `;

    const replacements = { courseId };

    // Apply filters
    if (isValid !== undefined) {
      query += ` AND c.is_valid = :isValid`;
      replacements.isValid = isValid === 'true' ? 1 : 0;
    }

    if (isExpired !== undefined) {
      if (isExpired === 'true') {
        query += ` AND c.expires_at IS NOT NULL AND c.expires_at < NOW()`;
      } else {
        query += ` AND (c.expires_at IS NULL OR c.expires_at >= NOW())`;
      }
    }

    if (userId) {
      query += ` AND c.user_id = :userId`;
      replacements.userId = userId;
    }

    query += ` ORDER BY c.issued_at DESC`;

    const certificates = await sequelize.query(query, {
      replacements,
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      status: 200,
      message: 'Course certificates retrieved successfully',
      data: certificates,
    });
  } catch (error) {
    console.error('Error fetching course certificates:', error);
    return res.status(500).json({
      status: 500,
      message: 'Failed to fetch course certificates',
    });
  }
};

/**
 * Verify certificate (public endpoint)
 */
exports.verifyCertificate = async (req, res) => {
  try {
    const { certificateNumber, verificationHash } = req.body;

    if (!certificateNumber && !verificationHash) {
      return res.status(400).json({
        status: 400,
        message: 'Certificate number or verification hash is required',
      });
    }

    let query = `
      SELECT 
        c.id,
        c.certificate_number as certificateNumber,
        c.issued_at as issuedAt,
        c.expires_at as expiresAt,
        c.is_valid as isValid,
        c.final_score as finalScore,
        c.final_percentage as finalPercentage,
        c.completion_time_hours as completionTimeHours,
        c.verification_hash as verificationHash,
        c.user_id as userId,
        c.course_id as courseId,
        CONCAT(u.first_name, ' ', u.last_name) as recipientName,
        co.title as courseName,
        CASE 
          WHEN c.expires_at IS NOT NULL AND c.expires_at < NOW() THEN 1
          ELSE 0
        END as isExpired,
        CASE 
          WHEN c.is_valid = 1 AND (c.expires_at IS NULL OR c.expires_at >= NOW()) THEN 1
          ELSE 0
        END as isActive
      FROM certificates c
      INNER JOIN users u ON c.user_id = u.id
      INNER JOIN courses co ON c.course_id = co.id
      WHERE 
    `;

    const replacements = {};

    if (certificateNumber) {
      query += `c.certificate_number = :certificateNumber`;
      replacements.certificateNumber = certificateNumber;
    } else {
      query += `c.verification_hash = :verificationHash`;
      replacements.verificationHash = verificationHash;
    }

    const certificates = await sequelize.query(query, {
      replacements,
      type: Sequelize.QueryTypes.SELECT,
    });

    if (!certificates || certificates.length === 0) {
      return res.status(200).json({
        status: 200,
        message: 'Certificate verification completed',
        data: {
          isValid: false,
          message: 'Certificate not found',
        },
      });
    }

    const certificate = certificates[0];

    if (!certificate.isValid) {
      return res.status(200).json({
        status: 200,
        message: 'Certificate verification completed',
        data: {
          isValid: false,
          certificate,
          message: 'Certificate has been revoked',
        },
      });
    }

    if (certificate.isExpired) {
      return res.status(200).json({
        status: 200,
        message: 'Certificate verification completed',
        data: {
          isValid: false,
          certificate,
          message: 'Certificate has expired',
        },
      });
    }

    return res.status(200).json({
      status: 200,
      message: 'Certificate verification completed',
      data: {
        isValid: true,
        certificate,
        message: 'Certificate is valid',
      },
    });
  } catch (error) {
    console.error('Error verifying certificate:', error);
    return res.status(500).json({
      status: 500,
      message: 'Failed to verify certificate',
    });
  }
};

/**
 * Issue certificate (for admins/trainers)
 */
exports.issueCertificate = async (req, res) => {
  try {
    const userRole = req.userDetails?.role?.roleName || req.userDetails?.role;

    // Only admins and trainers can issue certificates
    if (!['ADMIN', 'TRAINER'].includes(userRole)) {
      return res.status(403).json({
        status: 403,
        message:
          'Access denied - only admins and trainers can issue certificates',
      });
    }

    const {
      userId,
      courseId,
      finalScore,
      finalPercentage,
      completionTimeHours,
      expiresAt,
    } = req.body;

    // Validate required fields
    if (
      !userId ||
      !courseId ||
      finalScore === undefined ||
      finalPercentage === undefined
    ) {
      return res.status(400).json({
        status: 400,
        message: 'Missing required fields',
      });
    }

    // Check if certificate already exists
    const existing = await Certificate.findOne({
      where: { userId, courseId },
    });

    if (existing) {
      return res.status(400).json({
        status: 400,
        message: 'Certificate already issued for this user and course',
      });
    }

    // Generate certificate number
    const certificateNumber = await generateCertificateNumber();

    // Generate verification hash
    const crypto = require('crypto');
    const verificationHash = crypto
      .createHash('sha256')
      .update(`${userId}-${courseId}-${certificateNumber}-${Date.now()}`)
      .digest('hex');

    // Create certificate
    const certificate = await Certificate.create({
      certificateNumber,
      issuedAt: new Date(),
      expiresAt: expiresAt || null,
      isValid: true,
      finalScore,
      finalPercentage,
      completionTimeHours: completionTimeHours || null,
      verificationHash,
      userId,
      courseId,
    });

    // Also mark the enrollment as completed so department compliance stats are accurate
    const enrollment = await Enrollment.findOne({
      where: { userMasterID: userId, courseID: courseId, status: 1 },
    });
    if (enrollment && !enrollment.completedAt) {
      await enrollment.update({
        completedAt: new Date(),
        progressPercentage: 100,
        lastAccessedAt: new Date(),
      });
    }

    return res.status(200).json({
      status: 200,
      message: 'Certificate issued successfully',
      data: {
        certificateId: certificate.id,
        certificateNumber: certificate.certificateNumber,
        issuedAt: certificate.issuedAt,
      },
    });
  } catch (error) {
    console.error('Error issuing certificate:', error);
    return res.status(500).json({
      status: 500,
      message: 'Failed to issue certificate',
    });
  }
};

/**
 * Revoke certificate (for admins only)
 */
exports.revokeCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;
    const userRole = req.userDetails?.role?.roleName || req.userDetails?.role;

    // Only admins can revoke certificates
    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        status: 403,
        message: 'Access denied - only admins can revoke certificates',
      });
    }

    // Check if certificate exists
    const checkQuery = `SELECT id, is_valid FROM certificates WHERE id = :certificateId`;
    const certificates = await sequelize.query(checkQuery, {
      replacements: { certificateId },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (!certificates || certificates.length === 0) {
      return res.status(404).json({
        status: 404,
        message: 'Certificate not found',
      });
    }

    const certificate = certificates[0];

    if (!certificate.is_valid) {
      return res.status(400).json({
        status: 400,
        message: 'Certificate is already revoked',
      });
    }

    // Revoke certificate
    const updateQuery = `UPDATE certificates SET is_valid = 0 WHERE id = :certificateId`;
    await sequelize.query(updateQuery, {
      replacements: { certificateId },
      type: Sequelize.QueryTypes.UPDATE,
    });

    return res.status(200).json({
      status: 200,
      message: 'Certificate revoked successfully',
      data: {
        certificateId,
        isValid: false,
      },
    });
  } catch (error) {
    console.error('Error revoking certificate:', error);
    return res.status(500).json({
      status: 500,
      message: 'Failed to revoke certificate',
    });
  }
};

/**
 * Helper function to generate unique certificate number
 */
async function generateCertificateNumber() {
  const prefix = 'CERT';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * List Certificate Master for admin/HR with Company and Department filtering
 * POST /certificates/v1/listCertificateMaster
 */
exports.listCertificateMaster = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      departmentIds,
      searchQuery,
      page = 1,
      limit = 10,
    } = req.body;

    console.log('📜 listCertificateMaster called with:', {
      companyMasterID,
      departmentIds,
      searchQuery,
      page,
      limit,
    });

    // 1. Normalize companyMasterID
    let companyIds = [];
    if (companyMasterID) {
      if (Array.isArray(companyMasterID)) {
        companyIds = companyMasterID
          .map((id) => parseInt(id))
          .filter((id) => !isNaN(id));
      } else {
        const parsed = parseInt(companyMasterID);
        if (!isNaN(parsed)) companyIds = [parsed];
      }
    } else if (
      req.userDetails?.companyMasterID ||
      req.userDetails?.companyMasterId
    ) {
      companyIds = [
        parseInt(
          req.userDetails.companyMasterID || req.userDetails.companyMasterId,
        ),
      ];
    }

    if (companyIds.length === 0) {
      return res.status(200).json({
        status: 200,
        data: [],
        totalcount: 0,
        total: 0,
        message: 'No company selected',
      });
    }

    const EmployeeDepartment = require('../models/employeeDepartment');
    const Department = require('../models/department');
    const { asiaKolkataDateTime } = require('../utils/commonUtilFunctions');
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    // 2. Normalize departmentIds
    let deptIdArray = [];
    if (departmentIds) {
      if (Array.isArray(departmentIds)) {
        deptIdArray = departmentIds
          .map((d) => parseInt(d))
          .filter((d) => !isNaN(d));
      } else {
        const parsed = parseInt(departmentIds);
        if (!isNaN(parsed)) deptIdArray = [parsed];
      }
    }

    // 3. If department filter is active, find matching userMasterIDs whose active department is in deptIdArray
    let filteredUserIds = null;
    if (deptIdArray.length > 0) {
      const empDepts = await EmployeeDepartment.findAll({
        raw: true,
        where: {
          status: 1,
          applicableDate: { [Sequelize.Op.lte]: currentDate },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: currentDate } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        order: [
          ['applicableDate', 'DESC'],
          ['createdAt', 'DESC'],
        ],
        attributes: ['userMasterID', 'departmentID'],
      });

      const userActiveDeptMap = new Map();
      empDepts.forEach((ed) => {
        if (!userActiveDeptMap.has(ed.userMasterID)) {
          userActiveDeptMap.set(ed.userMasterID, ed.departmentID);
        }
      });

      const matchingUserIds = [];
      for (const [userId, deptId] of userActiveDeptMap.entries()) {
        if (deptIdArray.includes(deptId)) {
          matchingUserIds.push(userId);
        }
      }

      filteredUserIds = matchingUserIds;

      if (filteredUserIds.length === 0) {
        return res.status(200).json({
          status: 200,
          data: [],
          totalcount: 0,
          total: 0,
          message: 'No certificates found for selected department(s)',
        });
      }
    }

    // 4. Build Course filter for company
    const courseWhere = {
      companyMasterID: { [Sequelize.Op.in]: companyIds },
      status: 1,
    };

    // 5. Build Certificate where clause
    const certWhere = {
      status: 1,
    };

    if (filteredUserIds !== null) {
      certWhere.userId = { [Sequelize.Op.in]: filteredUserIds };
    }

    // 6. Handle Search Query
    if (searchQuery && searchQuery.trim()) {
      const term = `%${searchQuery.trim()}%`;
      certWhere[Sequelize.Op.or] = [
        {
          certificateNumber: {
            [Sequelize.Op.iLike || Sequelize.Op.like]: term,
          },
        },
        {
          '$user.firstName$': {
            [Sequelize.Op.iLike || Sequelize.Op.like]: term,
          },
        },
        {
          '$user.lastName$': {
            [Sequelize.Op.iLike || Sequelize.Op.like]: term,
          },
        },
        {
          '$user.displayName$': {
            [Sequelize.Op.iLike || Sequelize.Op.like]: term,
          },
        },
        {
          '$course.title$': { [Sequelize.Op.iLike || Sequelize.Op.like]: term },
        },
      ];
    }

    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    // 7. Find and count certificates
    const { count, rows: certificates } = await Certificate.findAndCountAll({
      where: certWhere,
      include: [
        {
          model: UserMaster,
          as: 'user',
          attributes: [
            'userMasterID',
            'displayName',
            'firstName',
            'lastName',
            'email',
            'userNumber',
          ],
          required: true,
        },
        {
          model: Course,
          as: 'course',
          where: courseWhere,
          attributes: ['id', 'title', 'companyMasterID'],
          required: true,
          include: [
            {
              model: CompanyMaster,
              attributes: [
                'companyMasterID',
                'companyName',
                'companyLogo',
                'authorizedSignature',
                'ownerName',
                'cpName',
              ],
              required: false,
            },
          ],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['issuedAt', 'DESC']],
      distinct: true,
    });

    // 8. Fetch active departments for the returned users
    const resultUserIds = [...new Set(certificates.map((c) => c.userId))];
    const userDeptMap = new Map();

    if (resultUserIds.length > 0) {
      const activeDepts = await EmployeeDepartment.findAll({
        where: {
          userMasterID: { [Sequelize.Op.in]: resultUserIds },
          status: 1,
          applicableDate: { [Sequelize.Op.lte]: currentDate },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: currentDate } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        order: [
          ['applicableDate', 'DESC'],
          ['createdAt', 'DESC'],
        ],
        include: [
          {
            model: Department,
            as: 'department',
            attributes: ['departmentId', 'departmentName'],
          },
        ],
      });

      activeDepts.forEach((ad) => {
        if (ad.department && !userDeptMap.has(ad.userMasterID)) {
          userDeptMap.set(ad.userMasterID, ad.department.departmentName);
        }
      });
    }

    // 9. Format response rows
    const formattedData = certificates.map((cert) => {
      const user = cert.user || {};
      const course = cert.course || {};
      const company = course.companyMaster || {};
      const recipientName =
        (
          user.displayName || `${user.firstName || ''} ${user.lastName || ''}`
        ).trim() || 'Employee';

      let isExp = false;
      let expiringDays = null;
      let expiringInText = 'Lifetime';

      if (cert.expiresAt) {
        const expiryDate = new Date(cert.expiresAt);
        const now = new Date();
        const diffMs = expiryDate.getTime() - now.getTime();
        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (days <= 0) {
          isExp = true;
          expiringDays = 0;
          expiringInText = 'Expired';
        } else {
          isExp = false;
          expiringDays = days;
          expiringInText = `${days} Days`;
        }
      } else {
        isExp = false;
        expiringDays = null;
        expiringInText = 'Lifetime';
      }

      return {
        id: cert.id,
        certificateNumber: cert.certificateNumber,
        issuedAt: cert.issuedAt,
        expiresAt: cert.expiresAt,
        isValid: cert.isValid,
        finalScore: cert.finalScore,
        finalPercentage: cert.finalPercentage,
        completionTimeHours: cert.completionTimeHours,
        verificationHash: cert.verificationHash,
        userId: cert.userId,
        recipientName,
        employeeCode: user.userNumber || '-',
        email: user.email || '-',
        departmentName: userDeptMap.get(cert.userId) || 'General',
        courseId: cert.courseId,
        courseName: course.title || 'Course',
        companyMasterID: course.companyMasterID,
        companyName: company.companyName || 'Corporate Training',
        companyLogo: company.companyLogo || '',
        authorizedSignature: company.authorizedSignature || '',
        authorizedSignatoryName:
          company.ownerName || company.cpName || 'Authorized Signatory',
        isExpired: isExp,
        expiringDays: expiringDays,
        expiringInText: expiringInText,
        isActive: cert.isValid && !isExp,
        status: cert.status,
      };
    });

    return res.status(200).json({
      status: 200,
      message: 'Certificates retrieved successfully',
      data: formattedData,
      totalcount: count,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('❌ Error in listCertificateMaster:', error);
    next(error);
  }
};

/**
 * Update certificate expiration date (for admin/HR in Certificate Master)
 * POST /certificates/v1/updateCertificateExpiry
 */
exports.updateCertificateExpiry = async (req, res, next) => {
  try {
    const { certificateId, expiresAt } = req.body;

    if (!certificateId) {
      return res.status(200).json({
        status: 400,
        message: 'Certificate ID is required',
      });
    }

    const cert = await Certificate.findOne({
      where: { id: certificateId, status: 1 },
    });

    if (!cert) {
      return res.status(200).json({
        status: 404,
        message: 'Certificate not found',
      });
    }

    if (expiresAt && cert.issuedAt) {
      const issuedDateStr = new Date(cert.issuedAt).toISOString().slice(0, 10);
      const expiryDateStr = new Date(expiresAt).toISOString().slice(0, 10);
      if (expiryDateStr < issuedDateStr) {
        return res.status(200).json({
          status: 400,
          message: 'Expiration date cannot be earlier than issued date',
        });
      }
    }

    const newExpiry = expiresAt ? new Date(expiresAt) : null;
    const isStillValid = !newExpiry || new Date() <= newExpiry;

    await cert.update({
      expiresAt: newExpiry,
      isValid: isStillValid,
      updatedBy: req.userDetails?.userMasterId || req.userDetails?.id,
      updatedByIp: req.ip || req.connection?.remoteAddress,
    });

    return res.status(200).json({
      status: 200,
      message: 'Certificate expiration date updated successfully',
      data: cert,
    });
  } catch (error) {
    console.error('❌ Error in updateCertificateExpiry:', error);
    next(error);
  }
};
