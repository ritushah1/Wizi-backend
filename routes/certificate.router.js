'use strict';

const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificate.controller');

// Get current user's certificates (GET - RESTful)
router.get('/my/certificates', certificateController.getMyCertificates);

// Get current user's certificates (POST - Angular compatibility)
router.post('/my/certificates', certificateController.getMyCertificates);

// List certificate master for company/department (POST - Angular / REST)
router.post('/v1/listCertificateMaster', certificateController.listCertificateMaster);

// Update certificate expiration date
router.post('/v1/updateCertificateExpiry', certificateController.updateCertificateExpiry);

// Get certificate by ID
router.get('/:certificateId', certificateController.getCertificate);

// Download certificate (get signed URL) - GET for React
router.get('/:certificateId/download', certificateController.downloadCertificate);

// Download certificate (get signed URL) - POST for Angular compatibility
router.post('/:certificateId/download', certificateController.downloadCertificate);

// Get user certificates by user ID (for admins/trainers)
router.get('/user/:userId', certificateController.getUserCertificates);

// Get course certificates (for admins/trainers)
router.get('/course/:courseId', certificateController.getCourseCertificates);

// Verify certificate (public endpoint - no auth required)
router.post('/verify', certificateController.verifyCertificate);

// Issue certificate (for admins/trainers)
router.post('/issue', certificateController.issueCertificate);

// Revoke certificate (for admins only)
router.put('/:certificateId/revoke', certificateController.revokeCertificate);

module.exports = router;
