/**
 * Make Admin Script
 * ─────────────────
 * Usage: node make-admin.mjs <email>
 * Example: node make-admin.mjs priya@example.com
 *
 * Run from the lib/db/ directory.
 * The user must already have an account (registered in the app).
 */
import postgres from "postgres";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

const email = process.argv[2];
if (!email) {
  console.error("Usage: node make-admin.mjs <email>");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL);

try {
  const [user] = await sql`SELECT id, name, email, role FROM users WHERE email = ${email}`;
  if (!user) {
    console.error(`❌ No user found with email: ${email}`);
    console.error("   The user must register in the app first.");
    await sql.end();
    process.exit(1);
  }

  const [updated] = await sql`
    UPDATE users SET role = 'admin', seller_approved = true
    WHERE email = ${email}
    RETURNING id, name, email, role
  `;

  console.log(`✅ Admin created!`);
  console.log(`   Name:  ${updated.name}`);
  console.log(`   Email: ${updated.email}`);
  console.log(`   Role:  ${updated.role}`);
  console.log(``);
  console.log(`Now log in to the Bazaar app with: ${email}`);
  console.log(`You will see "Admin Panel" in the Account tab.`);
} catch (e) {
  console.error("Error:", e.message);
} finally {
  await sql.end();
}
