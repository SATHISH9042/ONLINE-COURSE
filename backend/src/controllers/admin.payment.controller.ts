import { Request, Response, NextFunction } from 'express';
import { db } from '../database/db';
import { z } from 'zod';

export class AdminPaymentController {
  /**
   * Section 11 & 35: Admin view all payments
   * Filters: status, paymentMethod, search query.
   */
  static async listPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, paymentMethod, search } = req.query;

      let query = `
        SELECT p.id, p.order_id, p.payment_id, p.amount, p.currency, p.status,
               p.payment_method, p.qr_reference_code, p.failure_reason,
               p.created_at, p.verified_at,
               u.id as student_id, u.phone as student_phone, u.email as student_email,
               COALESCE(sp.full_name, 'Student') as student_name,
               c.id as course_id, c.title as course_title,
               admin_u.email as verified_by_admin_email
        FROM payments p
        JOIN users u ON u.id = p.student_id
        LEFT JOIN student_profiles sp ON sp.user_id = u.id
        JOIN courses c ON c.id = p.course_id
        LEFT JOIN users admin_u ON admin_u.id = p.verified_by_admin_id
        WHERE 1=1
      `;
      const values: any[] = [];
      let idx = 1;

      if (status && typeof status === 'string' && status !== 'ALL') {
        query += ` AND p.status = $${idx++}`;
        values.push(status);
      }

      if (paymentMethod && typeof paymentMethod === 'string' && paymentMethod !== 'ALL') {
        query += ` AND p.payment_method = $${idx++}`;
        values.push(paymentMethod);
      }

      if (search && typeof search === 'string') {
        query += ` AND (sp.full_name ILIKE $${idx} OR u.phone ILIKE $${idx} OR u.email ILIKE $${idx} OR c.title ILIKE $${idx} OR p.qr_reference_code ILIKE $${idx})`;
        values.push(`%${search.trim()}%`);
        idx++;
      }

      query += ` ORDER BY p.created_at DESC`;

      const paymentsRes = await db.query(query, values);

      res.status(200).json({
        success: true,
        data: paymentsRes.rows.map((row) => ({
          id: row.id,
          orderId: row.order_id,
          paymentId: row.payment_id,
          amount: parseFloat(row.amount),
          currency: row.currency,
          status: row.status,
          paymentMethod: row.payment_method,
          qrReferenceCode: row.qr_reference_code,
          failureReason: row.failure_reason,
          createdAt: row.created_at,
          verifiedAt: row.verified_at,
          student: {
            id: row.student_id,
            name: row.student_name,
            phone: row.student_phone,
            email: row.student_email,
          },
          course: {
            id: row.course_id,
            title: row.course_title,
          },
          verifiedByAdminEmail: row.verified_by_admin_email,
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Section 11 & 35: Manually verify QR code payment
   */
  static async verifyQrPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const { id } = req.params;

      const paymentRes = await db.query(
        `SELECT p.*, c.title as course_title
         FROM payments p
         JOIN courses c ON c.id = p.course_id
         WHERE p.id = $1`,
        [id]
      );

      if (paymentRes.rowCount === 0) {
        res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Payment record not found.' });
        return;
      }

      const payment = paymentRes.rows[0];

      if (payment.status === 'MANUALLY_VERIFIED' || payment.status === 'SUCCESS') {
        res.status(400).json({
          success: false,
          code: 'ALREADY_VERIFIED',
          message: 'This payment has already been verified.',
        });
        return;
      }

      // Atomic verification and enrollment
      await db.transaction(async (tx) => {
        // 1. Update payment status
        await tx.query(
          `UPDATE payments
           SET status = 'MANUALLY_VERIFIED',
               verified_by_admin_id = $1,
               verified_at = NOW(),
               updated_at = NOW()
           WHERE id = $2`,
          [adminId, id]
        );

        // 2. Activate course enrollment
        await tx.query(
          `INSERT INTO course_enrollments (student_id, course_id, status)
           VALUES ($1, $2, 'ACTIVE')
           ON CONFLICT (student_id, course_id)
           DO UPDATE SET status = 'ACTIVE', updated_at = NOW()`,
          [payment.student_id, payment.course_id]
        );

        // 3. Log audit event
        await tx.query(
          `INSERT INTO audit_logs (admin_id, action, entity_name, entity_id, new_values)
           VALUES ($1, 'PAYMENT_MANUALLY_VERIFIED', 'payments', $2, $3)`,
          [
            adminId,
            id,
            JSON.stringify({
              paymentId: id,
              studentId: payment.student_id,
              courseId: payment.course_id,
              amount: payment.amount,
              qrReference: payment.qr_reference_code,
            }),
          ]
        );

        // 4. Notify student
        const notifRes = await tx.query(
          `INSERT INTO notifications (title, message, type, target_type, target_id, target_audience, target_course_id)
           VALUES ($1, $2, 'PAYMENT', 'COURSE', $3, 'SPECIFIC', $4)
           RETURNING id`,
          [
            'QR Payment Verified!',
            `Your payment of ₹${payment.amount} for "${payment.course_title}" has been manually verified by the administrative team. Your course is now active.`,
            payment.course_id,
            payment.course_id,
          ]
        );

        await tx.query(
          `INSERT INTO notification_recipients (notification_id, student_id)
           VALUES ($1, $2)`,
          [notifRes.rows[0].id, payment.student_id]
        );
      });

      res.status(200).json({
        success: true,
        message: 'Payment verified successfully and student enrolled in course.',
        data: {
          id,
          status: 'MANUALLY_VERIFIED',
          verifiedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Section 11 & 35: Reject QR Payment
   */
  static async rejectPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const { id } = req.params;
      const schema = z.object({
        reason: z.string().trim().min(3, 'Rejection reason must be at least 3 characters'),
      });

      const { reason } = schema.parse(req.body);

      const paymentRes = await db.query(
        `SELECT p.*, c.title as course_title
         FROM payments p
         JOIN courses c ON c.id = p.course_id
         WHERE p.id = $1`,
        [id]
      );

      if (paymentRes.rowCount === 0) {
        res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Payment record not found.' });
        return;
      }

      const payment = paymentRes.rows[0];

      await db.transaction(async (tx) => {
        await tx.query(
          `UPDATE payments
           SET status = 'FAILED',
               failure_reason = $1,
               verified_by_admin_id = $2,
               updated_at = NOW()
           WHERE id = $3`,
          [reason, adminId, id]
        );

        await tx.query(
          `INSERT INTO audit_logs (admin_id, action, entity_name, entity_id, new_values)
           VALUES ($1, 'PAYMENT_REJECTED', 'payments', $2, $3)`,
          [
            adminId,
            id,
            JSON.stringify({
              paymentId: id,
              reason,
            }),
          ]
        );

        // Notify student of payment rejection
        const notifRes = await tx.query(
          `INSERT INTO notifications (title, message, type, target_type, target_id, target_audience, target_course_id)
           VALUES ($1, $2, 'PAYMENT', 'COURSE', $3, 'SPECIFIC', $4)
           RETURNING id`,
          [
            'Payment Verification Notice',
            `Your payment submission for "${payment.course_title}" could not be verified: "${reason}". Please check your transaction details or contact support.`,
            payment.course_id,
            payment.course_id,
          ]
        );

        await tx.query(
          `INSERT INTO notification_recipients (notification_id, student_id)
           VALUES ($1, $2)`,
          [notifRes.rows[0].id, payment.student_id]
        );
      });

      res.status(200).json({
        success: true,
        message: 'Payment rejected.',
        data: {
          id,
          status: 'FAILED',
          failureReason: reason,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
