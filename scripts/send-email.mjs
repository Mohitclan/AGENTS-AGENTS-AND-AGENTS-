#!/usr/bin/env node

import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.dirname(__dir);

// Load .env
function loadEnv() {
  const envPath = path.join(projectRoot, '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error(`.env file not found at ${envPath}`);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};

  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      env[key.trim()] = value.trim();
    }
  });

  return env;
}

// Send email
async function sendEmail(to, subject, body, leadId) {
  try {
    const env = loadEnv();

    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: parseInt(env.SMTP_PORT),
      secure: false, // true for 465, false for other ports
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `${env.SENDER_NAME} <${env.SENDER_EMAIL}>`,
      to: to,
      subject: subject,
      text: body,
    };

    console.log('📧 Sending email...');
    console.log(`   To: ${to}`);
    console.log(`   From: ${mailOptions.from}`);
    console.log(`   Subject: ${subject}`);

    const info = await transporter.sendMail(mailOptions);

    console.log('\n✅ Email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}`);

    // Update pipeline
    if (leadId) {
      const leadsPath = path.join(projectRoot, 'pipeline/leads.jsonl');
      const now = new Date().toISOString().split('T')[0];

      console.log(`\n📝 Updating pipeline for lead ${leadId}...`);

      // For test lead, just log (it's not in main pipeline)
      if (leadId === 'L-test-shivam') {
        console.log(`   Test lead status would be: contacted`);
        console.log(`   Timestamp: ${now}`);
      }
    }

    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('\n❌ Error sending email:');
    console.error(`   ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Get email content from test-shivam.md
function getEmailContent() {
  const testEmailPath = path.join(projectRoot, 'outputs/outreach/test-shivam.md');
  if (!fs.existsSync(testEmailPath)) {
    throw new Error(`Test email file not found at ${testEmailPath}`);
  }

  const content = fs.readFileSync(testEmailPath, 'utf8');

  // Extract Email 1 content
  const match = content.match(/## Email 1 \(Day 0\)\n\n\*\*To:\*\* (.+?)\n\n\*\*Subject:\*\* (.+?)\n\n---\n\n([\s\S]+?)---/);

  if (!match) {
    throw new Error('Could not parse email content from test-shivam.md');
  }

  return {
    to: match[1].trim(),
    subject: match[2].trim(),
    body: match[3].trim(),
  };
}

// Main
async function main() {
  console.log('🚀 AI Sales & Growth Team - Email Sender\n');
  console.log('=' .repeat(60));

  try {
    // Get email content
    const emailData = getEmailContent();

    console.log('\n📄 Email Details:');
    console.log(`   To: ${emailData.to}`);
    console.log(`   Subject: ${emailData.subject}`);
    console.log(`   Body length: ${emailData.body.length} characters`);

    // Send email
    const result = await sendEmail(emailData.to, emailData.subject, emailData.body, 'L-test-shivam');

    console.log('\n' + '='.repeat(60));

    if (result.success) {
      console.log('\n🎉 TEST COMPLETE - Email sent successfully!');
      console.log('\nNext steps:');
      console.log('1. Check shivamkgjj2005@gmail.com for the test email');
      console.log('2. Reply to verify the pipeline tracks replies correctly');
      console.log('3. Run: node scripts/leads.mjs set-status L-test-shivam replied "<paste reply>"');
      process.exit(0);
    } else {
      console.log('\n⚠️  Email send failed. Check .env credentials and SMTP settings.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Fatal error:');
    console.error(`   ${error.message}`);
    process.exit(1);
  }
}

main();
