import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authenticateToken, requireActive, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Section 34: Razorpay Webhook endpoint (public with signature verification)
router.post('/razorpay/webhook', PaymentController.handleRazorpayWebhook);

// Protected routes: requires active student authentication
router.use(authenticateToken);
router.use(requireActive);
router.use(requireRole(['STUDENT']));

// Section 10: Checkout details (pre-filled student info & course info)
router.get('/checkout-details/:courseId', PaymentController.getCheckoutDetails);

// Section 10 & 34: Razorpay order creation and signature verification
router.post('/razorpay/create-order', PaymentController.createRazorpayOrder);
router.post('/razorpay/verify', PaymentController.verifyRazorpayPayment);

// Section 11 & 35: QR payment submission
router.post('/qr/submit', PaymentController.submitQrPayment);

// Student payment history
router.get('/my-history', PaymentController.getStudentPaymentHistory);

export default router;
