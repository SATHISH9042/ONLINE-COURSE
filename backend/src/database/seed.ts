import { db } from './db';
import { hashPassword } from '../utils/password';

export async function seedDatabase() {
  console.log('[Seed] Checking and seeding default records...');

  const adminPhone = '+919999999999';
  const adminEmail = 'admin@institute.edu';
  const adminPass = 'Admin@123';

  const existing = await db.query(
    'SELECT id FROM users WHERE phone = $1 OR email = $2',
    [adminPhone, adminEmail]
  );

  if (existing.rowCount === 0) {
    const passwordHash = await hashPassword(adminPass);
    
    // Create admin user
    const userRes = await db.query(
      `INSERT INTO users (phone, email, password_hash, role, status)
       VALUES ($1, $2, $3, 'ADMIN', 'ACTIVE')
       RETURNING id`,
      [adminPhone, adminEmail, passwordHash]
    );

    const adminId = userRes.rows[0].id;

    // Create admin profile
    await db.query(
      `INSERT INTO admin_profiles (user_id, full_name, department)
       VALUES ($1, $2, $3)`,
      [adminId, 'Institute Administrator', 'Academic Administration']
    );

    console.log('[Seed] Default administrator created:');
    console.log(`       Email:    ${adminEmail}`);
    console.log(`       Phone:    ${adminPhone}`);
    console.log(`       Password: ${adminPass}`);
  } else {
    console.log('[Seed] Administrator already exists. Skipping admin creation.');
  }

  // Create a sample pending student if table is empty of students, to make testing easy
  const studentCheck = await db.query("SELECT id FROM users WHERE role = 'STUDENT'");
  if (studentCheck.rowCount === 0) {
    const samplePass = await hashPassword('Student@123');
    const studentRes = await db.query(
      `INSERT INTO users (phone, email, password_hash, role, status)
       VALUES ($1, $2, $3, 'STUDENT', 'PENDING_APPROVAL')
       RETURNING id`,
      ['+919876543210', 'rahul.sharma@example.com', samplePass]
    );

    await db.query(
      `INSERT INTO student_profiles (user_id, full_name, city, state)
       VALUES ($1, $2, $3, $4)`,
      [studentRes.rows[0].id, 'Rahul Sharma', 'Bengaluru', 'Karnataka']
    );

    console.log('[Seed] Sample pending student created:');
    console.log('       Name:     Rahul Sharma');
    console.log('       Phone:    +919876543210');
    console.log('       Email:    rahul.sharma@example.com');
    console.log('       Status:   PENDING_APPROVAL');
  }

  console.log('[Seed] Database seeding completed successfully.');
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed] Error during seeding:', err);
      process.exit(1);
    });
}
