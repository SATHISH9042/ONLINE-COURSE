import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  paymentService,
  CheckoutDetails,
  RazorpayOrderData,
} from '../../services/paymentService';
import {
  ArrowLeft,
  ShieldCheck,
  CreditCard,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
  Lock,
  User,
  Phone,
  Mail,
  Zap,
} from 'lucide-react';

export const CourseCheckoutPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [details, setDetails] = useState<CheckoutDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab: 'razorpay' | 'qr'
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'qr'>('razorpay');

  // Razorpay flow state
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [razorpayOrder, setRazorpayOrder] = useState<RazorpayOrderData | null>(null);
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // QR flow state
  const [utrNumber, setUtrNumber] = useState('');
  const [isSubmittingQr, setIsSubmittingQr] = useState(false);
  const [qrSubmittedNotice, setQrSubmittedNotice] = useState<string | null>(null);

  // Success state
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    if (!courseId) return;

    async function loadDetails() {
      setLoading(true);
      setError(null);
      const res = await paymentService.getCheckoutDetails(courseId!);

      if (res.success && res.data) {
        setDetails(res.data);
        if (res.data.alreadyEnrolled) {
          // If already enrolled, redirect to learn
          navigate(`/student/courses/${courseId}/learn`);
        }
      } else {
        setError(res.message || 'Failed to load course checkout details.');
      }
      setLoading(false);
    }

    loadDetails();
  }, [courseId, navigate]);

  // Section 10: Razorpay Order Creation & Payment
  const handleInitiateRazorpay = async () => {
    if (!courseId) return;
    setIsCreatingOrder(true);
    setError(null);

    const res = await paymentService.createRazorpayOrder(courseId);
    setIsCreatingOrder(false);

    if (res.success && res.data) {
      setRazorpayOrder(res.data);
      setShowRazorpayModal(true);
    } else {
      setError(res.message || 'Could not initiate Razorpay order.');
    }
  };

  // Mock / Real Razorpay Verification trigger
  const handleCompleteRazorpayPayment = async (status: 'SUCCESS' | 'FAIL') => {
    if (!razorpayOrder) return;

    if (status === 'FAIL') {
      setShowRazorpayModal(false);
      setError('Payment was cancelled or failed by the provider.');
      return;
    }

    setIsVerifying(true);
    const mockPaymentId = `pay_${Date.now().toString(36)}`;
    const mockSignature = `mock_sig_${razorpayOrder.orderId}`;

    const res = await paymentService.verifyRazorpayPayment({
      orderId: razorpayOrder.orderId,
      razorpayPaymentId: mockPaymentId,
      razorpaySignature: mockSignature,
    });

    setIsVerifying(false);
    setShowRazorpayModal(false);

    if (res.success) {
      setPaymentSuccess(true);
    } else {
      setError(res.message || 'Payment signature verification failed.');
    }
  };

  // Section 11: Submit Institutional QR Payment
  const handleSubmitQr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !utrNumber.trim()) return;

    setIsSubmittingQr(true);
    setError(null);

    const res = await paymentService.submitQrPayment(courseId, utrNumber.trim());
    setIsSubmittingQr(false);

    if (res.success) {
      setQrSubmittedNotice(
        'Your transaction reference has been successfully submitted! An administrator will review and verify your payment within 1-2 business hours. Your course will become active upon approval.'
      );
    } else {
      setError(res.message || 'Failed to submit QR transaction reference.');
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center items-center">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error && !details) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white rounded-2xl p-8 border border-slate-200 text-center shadow-xs">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Checkout Error</h2>
        <p className="text-sm text-slate-500 mb-6">{error}</p>
        <Link
          to="/student/browse"
          className="inline-flex items-center px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold"
        >
          Return to Catalog
        </Link>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="max-w-lg mx-auto my-12 bg-white rounded-3xl p-8 border border-emerald-200 shadow-xl text-center space-y-4 animate-in zoom-in-95 duration-300">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Payment Verified!</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Congratulations! Your payment for{' '}
          <span className="font-semibold text-slate-900">{details?.course.title}</span> was
          cryptographically verified. Your course enrollment is now active.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate(`/student/courses/${courseId}/learn`)}
            className="flex-1 py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-sm transition shadow-md shadow-brand-600/20"
          >
            Start Learning Now &rarr;
          </button>
          <button
            onClick={() => navigate('/student/my-courses')}
            className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition"
          >
            Go to My Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Back Link */}
      <div className="flex items-center gap-2">
        <Link
          to="/student/browse"
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Catalog
        </Link>
      </div>

      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Course Purchase Confirmation
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Review your enrolled profile information and select your preferred payment method.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Student Info & Payment Selector */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 10: Pre-populated Student Info Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-brand-600" />
                Student Information
              </h2>
              <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <Lock className="w-3 h-3 mr-1" />
                Verified Student Account
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">Full Name</span>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {details?.student.name}
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Registered Phone</span>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {details?.student.phone}
                </div>
              </div>

              <div className="sm:col-span-2">
                <span className="text-slate-400 block mb-1">Email Address</span>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {details?.student.email || 'None registered'}
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 italic">
              * Student credentials are automatically loaded from your verified institutional account.
            </p>
          </div>

          {/* Payment Method Tabs */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <CreditCard className="w-4 h-4 text-brand-600" />
              Select Payment Gateway
            </h2>

            {/* Selector Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('razorpay')}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${paymentMethod === 'razorpay'
                    ? 'border-brand-600 bg-brand-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                  }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-brand-600" /> Razorpay
                  </span>
                  {paymentMethod === 'razorpay' && (
                    <CheckCircle2 className="w-4 h-4 text-brand-600" />
                  )}
                </div>
                <span className="text-[11px] text-slate-500">
                  Instant UPI, Cards & NetBanking
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('qr')}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${paymentMethod === 'qr'
                    ? 'border-brand-600 bg-brand-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                  }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-purple-600" /> Institute QR
                  </span>
                  {paymentMethod === 'qr' && <CheckCircle2 className="w-4 h-4 text-brand-600" />}
                </div>
                <span className="text-[11px] text-slate-500">
                  Scan & Admin Reconciliation
                </span>
              </button>
            </div>

            {/* Tab 1: Razorpay Instant Flow */}
            {paymentMethod === 'razorpay' && (
              <div className="space-y-4 pt-2">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Cryptographic Signature Protected
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Razorpay verifies transactions via server-side HMAC-SHA256 signature verification.
                    Course enrollment is granted immediately upon transaction capture.
                  </p>
                </div>

                <button
                  disabled={isCreatingOrder}
                  onClick={handleInitiateRazorpay}
                  className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-brand-600/25 flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  {isCreatingOrder ? 'Generating Order...' : `Confirm & Continue with Razorpay`}
                </button>
              </div>
            )}

            {/* Tab 2: Institutional QR Flow (Section 11) */}
            {paymentMethod === 'qr' && (
              <div className="space-y-4 pt-2">
                {qrSubmittedNotice ? (
                  <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                    <h3 className="text-sm font-bold text-emerald-900">QR Payment Submitted</h3>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      {qrSubmittedNotice}
                    </p>
                    <button
                      onClick={() => navigate('/student/my-courses')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs"
                    >
                      Return to My Courses
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitQr} className="space-y-4">
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl flex flex-col sm:flex-row items-center gap-4">
                      {/* Simulated QR Code display */}
                      <div className="w-28 h-28 bg-white p-2 border border-purple-300 rounded-xl flex items-center justify-center shrink-0 shadow-xs">
                        <QrCode className="w-20 h-20 text-slate-900" />
                      </div>

                      <div className="space-y-1 text-xs text-center sm:text-left">
                        <span className="font-bold text-purple-900 block">
                          Apex Institute Official UPI QR
                        </span>
                        <p className="text-purple-800 font-mono">
                          UPI ID: <span className="font-bold">institute.fees@okaxis</span>
                        </p>
                        <p className="text-slate-600">
                          Scan using GPay, PhonePe, or Paytm and transfer exact amount:
                        </p>
                        <p className="text-base font-black text-slate-900 font-mono">
                          ₹{details?.course.price.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 block">
                        Enter UTR / Bank Reference Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={utrNumber}
                        onChange={(e) => setUtrNumber(e.target.value)}
                        placeholder="e.g. 427819381204"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:border-brand-600"
                      />
                      <span className="text-[11px] text-slate-400 block">
                        12-digit transaction number displayed in your UPI app payment receipt.
                      </span>
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] leading-relaxed">
                      ⚠️ <span className="font-bold">Security Notice:</span> QR payments require manual
                      administrator verification. Access will not activate immediately upon submission.
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingQr || !utrNumber.trim()}
                      className="w-full py-3 px-4 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition shadow-md shadow-purple-700/20"
                    >
                      {isSubmittingQr ? 'Submitting Reference...' : 'I Have Completed Payment'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Course Order Summary */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
              Order Summary
            </h2>

            <div className="space-y-3">
              <h3 className="text-base font-bold text-slate-900 leading-snug">
                {details?.course.title}
              </h3>
              <p className="text-xs text-slate-500 line-clamp-2">
                {details?.course.shortDescription}
              </p>

              <div className="space-y-1 text-xs text-slate-500 pt-2 border-t border-slate-100">
                <div className="flex justify-between">
                  <span>Instructor</span>
                  <span className="font-semibold text-slate-700">
                    {details?.course.instructorName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Duration</span>
                  <span className="font-semibold text-slate-700">
                    {details?.course.durationHours} Hours
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Access</span>
                  <span className="font-semibold text-emerald-600">Lifetime Validity</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 space-y-1.5">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Course Fee</span>
                  <span>₹{details?.course.price.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Taxes & Gateway Fee</span>
                  <span className="text-emerald-600 font-semibold">₹0 (Free)</span>
                </div>
                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-100">
                  <span>Total Due</span>
                  <span className="text-brand-600 font-mono">
                    ₹{details?.course.price.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Razorpay Gateway Modal Simulator */}
      {showRazorpayModal && razorpayOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  R
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Razorpay Checkout</h3>
                  <p className="text-[10px] text-slate-400">Order ID: {razorpayOrder.orderId}</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-blue-600">
                ₹{razorpayOrder.amount}
              </span>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Account Name:</span>
                <span className="font-semibold text-slate-800">{razorpayOrder.student.name}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Contact Phone:</span>
                <span className="font-semibold text-slate-800">{razorpayOrder.student.phone}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Course:</span>
                <span className="font-semibold text-slate-800 truncate max-w-xs">
                  {razorpayOrder.course.title}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 text-center leading-relaxed">
              [Razorpay Sandbox Gateway Active]
              <br />
              Simulate customer payment completion to verify cryptographic signature.
            </p>

            <div className="space-y-2 pt-2">
              <button
                disabled={isVerifying}
                onClick={() => handleCompleteRazorpayPayment('SUCCESS')}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-md shadow-emerald-600/20"
              >
                {isVerifying ? 'Verifying HMAC Signature...' : 'Simulate Successful Payment (Authorize)'}
              </button>
              <button
                disabled={isVerifying}
                onClick={() => handleCompleteRazorpayPayment('FAIL')}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl text-xs transition"
              >
                Cancel Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
