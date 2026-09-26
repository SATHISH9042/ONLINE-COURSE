import { api } from './api';

export interface CatalogCourseItem {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  thumbnailUrl: string;
  price: number;
  currency: string;
  durationHours: number;
  instructorName: string;
  topicCount: number;
  subtopicCount: number;
  isEnrolled: boolean;
}

export interface CheckoutDetails {
  student: {
    name: string;
    phone: string;
    email: string;
  };
  course: {
    id: string;
    title: string;
    slug: string;
    shortDescription: string;
    price: number;
    currency: string;
    durationHours: number;
    instructorName: string;
    thumbnailUrl?: string;
  };
  alreadyEnrolled: boolean;
  pendingPayment?: {
    id: string;
    order_id: string;
    status: string;
    payment_method: string;
    qr_reference_code?: string;
    created_at: string;
  } | null;
}

export interface RazorpayOrderData {
  paymentId: string;
  orderId: string;
  amountPaise: number;
  amount: number;
  currency: string;
  keyId: string;
  student: {
    name: string;
    phone: string;
    email: string;
  };
  course: {
    id: string;
    title: string;
  };
}

export interface PaymentRecord {
  id: string;
  orderId?: string;
  paymentId?: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'MANUALLY_VERIFIED';
  paymentMethod: 'RAZORPAY' | 'QR_CODE' | 'MANUAL_BANK_TRANSFER' | 'FREE_ENROLLMENT';
  qrReferenceCode?: string;
  failureReason?: string;
  createdAt: string;
  verifiedAt?: string;
  student: {
    id: string;
    name: string;
    phone: string;
    email?: string;
  };
  course: {
    id: string;
    title: string;
  };
  verifiedByAdminEmail?: string;
}

export const paymentService = {
  // Student Catalog
  async getCatalog() {
    return api.get<CatalogCourseItem[]>('/student/catalog');
  },

  // Checkout pre-filled details
  async getCheckoutDetails(courseId: string) {
    return api.get<CheckoutDetails>(`/payments/checkout-details/${courseId}`);
  },

  // Razorpay order creation
  async createRazorpayOrder(courseId: string) {
    return api.post<RazorpayOrderData>('/payments/razorpay/create-order', { courseId });
  },

  // Razorpay verification
  async verifyRazorpayPayment(payload: {
    orderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    return api.post<{
      paymentId: string;
      orderId: string;
      status: string;
      courseId: string;
      enrollmentId: string;
    }>('/payments/razorpay/verify', payload);
  },

  // QR Payment submission
  async submitQrPayment(courseId: string, utrTransactionId: string) {
    return api.post<{
      paymentId: string;
      status: string;
      paymentMethod: string;
      qrReferenceCode: string;
      amount: number;
      courseTitle: string;
    }>('/payments/qr/submit', { courseId, utrTransactionId });
  },

  // Student Payment History
  async getMyPaymentHistory() {
    return api.get<PaymentRecord[]>('/payments/my-history');
  },

  // Admin Payment Audit & Reconciliation
  async listAdminPayments(params?: { status?: string; paymentMethod?: string; search?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.paymentMethod) searchParams.set('paymentMethod', params.paymentMethod);
    if (params?.search) searchParams.set('search', params.search);

    const query = searchParams.toString();
    return api.get<PaymentRecord[]>(`/admin/payments${query ? `?${query}` : ''}`);
  },

  // Admin verify QR payment
  async verifyQrPayment(paymentId: string) {
    return api.post<{ id: string; status: string; verifiedAt: string }>(
      `/admin/payments/${paymentId}/verify-qr`
    );
  },

  // Admin reject payment
  async rejectPayment(paymentId: string, reason: string) {
    return api.post<{ id: string; status: string; failureReason: string }>(
      `/admin/payments/${paymentId}/reject`,
      { reason }
    );
  },
};
