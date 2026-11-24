/** @format */

const paymentService = require('../services/payment.service');
const { statusCodes } = require('../utils/commonVars');
const Inquiries = require('../models/inquiries');
const companyMasterController = require('./companymaster.controller');

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Fetches an inquiry by ID and validates it exists.
 * Returns the inquiry or throws a structured error.
 */
async function getInquiryOrFail(inquiryID) {
  const inquiry = await Inquiries.findOne({ where: { inquiryID } });
  if (!inquiry) {
    const err = new Error(`Inquiry not found for ID: ${inquiryID}`);
    err.statusCode = statusCodes.NOT_FOUND || 404;
    throw err;
  }
  return inquiry;
}

// ─── Controllers ────────────────────────────────────────────────────────────

/**
 * POST /v1/createOrder
 * Creates a Razorpay order and saves paymentOrderId + paymentAmount
 * with status "pending" on the linked inquiry row.
 *
 * Edge-case rules enforced:
 *  - inquiryID and a valid positive amount are required.
 *  - If paymentStatus === 'success', reject immediately (one payment per inquiry).
 *  - If paymentStatus === 'pending' AND the Razorpay order is still open AND the
 *    amount matches, reuse the existing order (idempotent retry).
 *  - In all other cases (failed, amount changed, order expired) create a fresh order.
 */
exports.createOrder = async (req, res, next) => {
  try {
    const { amount, currency, receipt, notes, inquiryID } = req.body;

    // 1. Validate required fields
    if (!inquiryID) {
      return res.status(statusCodes.BAD_REQUEST || 400).json({
        status: statusCodes.BAD_REQUEST || 400,
        message: 'inquiryID is required to create a payment order.',
      });
    }

    // Handle Free Trial / Zero Amount
    if (amount !== undefined && Number(amount) === 0) {
      // Just check if inquiry exists and isn't already paid
      const inquiry = await getInquiryOrFail(inquiryID);

      if (inquiry.paymentStatus === 'success') {
        return res.status(statusCodes.BAD_REQUEST || 400).json({
          status: statusCodes.BAD_REQUEST || 400,
          message: 'Payment for this inquiry has already been successfully completed.',
        });
      }

      // We do NOT update the DB here to 'success' because we haven't verified
      // the product price yet (registration does this). We just signal the frontend.
      return res.status(statusCodes.OK || 200).json({
        status: statusCodes.OK || 200,
        message: 'Zero amount detected. You can proceed to registration without payment.',
        data: {
          skipPayment: true,
        },
      });
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(statusCodes.BAD_REQUEST || 400).json({
        status: statusCodes.BAD_REQUEST || 400,
        message: 'A valid positive amount is required to create a payment order.',
      });
    }

    // 2. Validate the inquiry exists before creating the order
    const inquiry = await getInquiryOrFail(inquiryID);

    // 3. Block if payment already succeeded for this inquiry (one payment per inquiry)
    if (inquiry.paymentStatus === 'success') {
      return res.status(statusCodes.BAD_REQUEST || 400).json({
        status: statusCodes.BAD_REQUEST || 400,
        message: 'Payment for this inquiry has already been successfully completed. Please contact administrator for any assistance.',
      });
    }

    // 4. If a pending order exists (not failed), try to reuse it
    if (inquiry.paymentStatus === 'pending' && inquiry.paymentOrderId) {
      // If the amount is the same, try to reuse the existing Razorpay order
      if (Number(inquiry.paymentAmount) === Number(amount)) {
        try {
          const existingOrder = await paymentService.fetchOrder(inquiry.paymentOrderId);
          // Reuse only if Razorpay still considers it open
          if (existingOrder.status === 'created' || existingOrder.status === 'attempted') {
            return res.status(statusCodes.OK || 200).json({
              status: statusCodes.OK || 200,
              message: 'Continuing with existing pending payment order',
              data: existingOrder,
            });
          }
          // Order is paid/expired on Razorpay side — fall through to create a new one
        } catch (fetchError) {
          console.warn('[payment] Could not fetch existing order, will create a new one:', fetchError.message);
          // Fall through to create a new order if fetch fails
        }
      }
      // Amount changed or order no longer active — create a fresh order below
    }
    // 'failed' status or no prior order: always create a new order

    // 5. Create the Razorpay order
    const order = await paymentService.createOrder({ amount, currency, receipt, notes });

    // 6. Persist payment tracking data on the inquiry (status → pending)
    await inquiry.update({
      paymentOrderId: order.id,
      paymentAmount: amount,           // stored in INR (not paise)
      paymentStatus: 'pending',
    });

    return res.status(statusCodes.OK || 200).json({
      status: statusCodes.OK || 200,
      message: 'Payment order created successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /v1/verifySignature
 * 1. Validates all required fields are present.
 * 2. Checks the inquiry exists and has not already been paid (idempotency guard).
 * 3. Validates the provided razorpayOrderId matches the one stored on the inquiry
 *    (prevents substituting a different order's valid signature).
 * 4. Verifies the Razorpay HMAC signature.
 * 5. On success → marks inquiry paymentStatus = "success", saves razorpayPaymentId,
 *                 then internally calls postAddCompanyV2 to create the company.
 * 6. On failure → marks inquiry paymentStatus = "failed" and returns 400.
 */
exports.verifySignature = async (req, res, next) => {
  const {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    inquiryID,
    productMasterID,
  } = req.body;

  // ── Step 1: validate required payment fields ──────────────────────────────
  if (!inquiryID || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return res.status(statusCodes.BAD_REQUEST || 400).json({
      status: statusCodes.BAD_REQUEST || 400,
      message: 'inquiryID, razorpayOrderId, razorpayPaymentId and razorpaySignature are all required.',
    });
  }

  // ── Step 2: fetch the inquiry (validates it exists) ──────────────────────
  let inquiry;
  try {
    inquiry = await getInquiryOrFail(inquiryID);
  } catch (err) {
    return next(err);
  }

  // ── Step 3: idempotency guard — block re-processing a successful payment ──
  // If the payment already succeeded, return the stored payment details so the
  // frontend can continue without triggering a duplicate company creation.
  if (inquiry.paymentStatus === 'success') {
    return res.status(statusCodes.BAD_REQUEST || 400).json({
      status: statusCodes.BAD_REQUEST || 400,
      message: 'Payment for this inquiry has already been successfully verified. Duplicate payment is not allowed.',
      payment: {
        verified: true,
        razorpayOrderId: inquiry.paymentOrderId,
        razorpayPaymentId: inquiry.paymentId,
      },
    });
  }

  // ── Step 4: validate order-ID belongs to this inquiry ────────────────────
  // Prevents an attacker from submitting a valid signature from a different order.
  if (inquiry.paymentOrderId && inquiry.paymentOrderId !== razorpayOrderId) {
    console.warn(
      `[payment] Order ID mismatch for inquiryID=${inquiryID}: ` +
      `stored=${inquiry.paymentOrderId}, received=${razorpayOrderId}`,
    );
    return res.status(statusCodes.BAD_REQUEST || 400).json({
      status: statusCodes.BAD_REQUEST || 400,
      message: 'Order ID does not match the payment order created for this inquiry.',
    });
  }

  // ── Step 5: verify Razorpay signature ────────────────────────────────────
  let isValid = false;
  try {
    isValid = paymentService.verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    );
  } catch (sigErr) {
    // Signature verification itself threw — mark payment as failed & bail
    try {
      await inquiry.update({ paymentStatus: 'failed' });
    } catch (_) { /* best-effort — don't mask the original error */ }
    return next(sigErr);
  }

  // ── Step 6: handle invalid signature ─────────────────────────────────────
  if (!isValid) {
    try {
      await inquiry.update({ paymentStatus: 'failed' });
    } catch (updateErr) {
      console.error('[payment] Failed to update inquiry paymentStatus=failed:', updateErr.message);
    }
    return res.status(statusCodes.BAD_REQUEST || 400).json({
      status: statusCodes.BAD_REQUEST || 400,
      message: 'Invalid payment signature. Payment could not be verified.',
    });
  }

  // ── Step 7: payment is valid → update inquiry ─────────────────────────────
  try {
    await inquiry.update({
      paymentId: razorpayPaymentId,
      paymentStatus: 'success',
    });
  } catch (updateErr) {
    console.error('[payment] Failed to update inquiry after payment success:', updateErr.message);
  }

  // ── Step 8: auto-create the company ──────────────────────────────────────
  // We delegate to postAddCompanyV2 by injecting synthetic req/res
  // so all the existing transaction + seeding logic is reused exactly.
  // postAddCompanyV2 itself checks inquiryID.companyMasterID to guard against
  // duplicate company creation
  try {
    await new Promise((resolve, reject) => {
      const fakeReq = {
        body: {
          companyName: inquiry.companyName,
          companyAddress: inquiry.address,
          companyEmail: inquiry.companyEmail,
          cpName: [inquiry.contactPersonFirstName, inquiry.contactPersonLastName].filter(Boolean).join(' '),
          cpMobileNo: inquiry.mobileNumber,
          cityMasterID: inquiry.cityMasterID,
          inquiryID,
          productMasterID,
          totalUser: inquiry.totalEmployees,
          totalTracking: inquiry.fieldEmployees,
          timezoneID: inquiry.timezoneID
        },
      };

      // Build a fake res that captures the controller's response
      const fakeRes = {
        _status: null,
        _json: null,
        status(code) {
          this._status = code;
          return this;
        },
        json(data) {
          this._json = data;
          resolve({ status: this._status, json: data });
          return this;
        },
      };

      // next() in postAddCompanyV2 means an error was thrown
      const fakeNext = (err) => reject(err);

      companyMasterController.postAddCompanyV2(fakeReq, fakeRes, fakeNext);
    }).then(({ status, json }) => {
      // Propagate whatever the company controller decided
      return res.status(status).json({
        ...json,
        // Augment with payment confirmation so the client has both in one response
        payment: {
          verified: true,
          razorpayOrderId,
          razorpayPaymentId,
        },
      });
    });
  } catch (companyErr) {
    // Company creation failed AFTER payment succeeded.
    // Return a clear 500 so the frontend can alert support — payment was captured.
    console.error('[payment] Company creation failed after successful payment:', companyErr.message);
    return res.status(500).json({
      status: 500,
      message:
        'Payment was received successfully but company creation failed. ' +
        'Please contact support with your payment ID: ' + razorpayPaymentId,
      payment: {
        verified: true,
        razorpayOrderId,
        razorpayPaymentId,
      },
    });
  }
};
