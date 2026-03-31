/**
 * Email utility with graceful fallback.
 * If SMTP_HOST is configured, sends real emails via nodemailer.
 * Otherwise, prints the email to the console (dev / test mode).
 */
const nodemailer = require("nodemailer");

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;
  if (!process.env.SMTP_HOST) return null;

  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return _transporter;
}

async function sendMail({ to, subject, text, html }) {
  const t = getTransporter();
  if (!t) {
    // No SMTP configured — log to console for visibility in dev
    console.log(`\n[MAIL] ─── To: ${to} ───────────────────`);
    console.log(`[MAIL] Subject: ${subject}`);
    console.log(`[MAIL] ${text}`);
    console.log(`[MAIL] ──────────────────────────────────\n`);
    return;
  }

  await t.sendMail({
    from: process.env.SMTP_FROM || '"Inventory OS" <noreply@inventory.com>',
    to,
    subject,
    text,
    html: html || `<p>${text}</p>`,
  });
}

module.exports = { sendMail };
