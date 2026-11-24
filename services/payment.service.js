/** @format */

const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay instance
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

class PaymentService {
  /**
   * Create a new order
   * @param {Object} orderData
   * @returns {Promise<Object>}
   */
  async createOrder(orderData) {
    try {
      const options = {
        amount: orderData.amount * 100, // Razorpay expects amount in paise
        currency: orderData.currency || 'INR',
        receipt: orderData.receipt || `receipt_${Date.now()}`,
        payment_capture: 1, // Auto capture
        notes: orderData.notes || {},
      };

      const order = await razorpayInstance.orders.create(options);
      return order;
    } catch (error) {
      throw new Error(`Error creating order: ${error?.error?.description || error?.message}`);
    }
  }

  /**
   * Verify the payment signature to ensure valid callback
   * @param {string} razorpayOrderId
   * @param {string} razorpayPaymentId
   * @param {string} razorpaySignature
   * @returns {boolean}
   */
  verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    try {
      const secret = process.env.RAZORPAY_KEY_SECRET;

      const body = razorpayOrderId + '|' + razorpayPaymentId;

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body.toString())
        .digest('hex');

      return expectedSignature === razorpaySignature;
    } catch (error) {
      throw new Error(`Error verifying signature: ${error.message}`);
    }
  }

  /**
   * Fetch payment details
   * @param {string} paymentId 
   */
  async fetchPayment(paymentId) {
    try {
      const payment = await razorpayInstance.payments.fetch(paymentId);
      return payment;
    } catch (error) {
      throw new Error(`Error fetching payment: ${error.message}`);
    }
  }

  /**
   * Fetch order details
   * @param {string} orderId 
   */
  async fetchOrder(orderId) {
    try {
      const order = await razorpayInstance.orders.fetch(orderId);
      return order;
    } catch (error) {
      throw new Error(`Error fetching order: ${error.message}`);
    }
  }
}

module.exports = new PaymentService();
