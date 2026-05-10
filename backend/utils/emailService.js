const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', // Standard configuration for Gmail
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// HTML Template Wrapper for Khelo Karachi Branding
const getHtmlTemplate = (title, content) => `
  <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0f1d; color: #ffffff; padding: 20px; border-radius: 10px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <h1 style="color: #3b82f6; margin: 0; font-size: 28px; font-weight: 800;">KHELO KARACHI</h1>
    </div>
    <div style="background-color: #1e293b; padding: 20px; border-radius: 8px;">
      <h2 style="color: #ffffff; margin-top: 0;">${title}</h2>
      <div style="color: #cbd5e1; line-height: 1.6; font-size: 16px;">
        ${content}
      </div>
    </div>
    <div style="text-align: center; margin-top: 20px; color: #64748b; font-size: 12px;">
      <p>This is an automated message from Khelo Karachi. Please do not reply.</p>
    </div>
  </div>
`;

exports.sendVerificationEmail = async (toEmail, code) => {
  const content = `
    <p>Welcome to Khelo Karachi! To complete your registration, please verify your email address using the code below.</p>
    <div style="text-align: center; margin: 30px 0;">
      <span style="background-color: #3b82f6; color: white; padding: 15px 30px; font-size: 24px; font-weight: bold; border-radius: 5px; letter-spacing: 5px;">${code}</span>
    </div>
    <p>This code will expire in 15 minutes.</p>
  `;
  try {
    await transporter.sendMail({
      from: `"Khelo Karachi" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Khelo Karachi - Email Verification Code',
      html: getHtmlTemplate('Verify Your Email', content)
    });
  } catch (error) {
    console.error('Email sending error:', error);
  }
};

exports.sendEmail = async (toEmail, subject, title, bodyContent) => {
  if (!toEmail) return;
  try {
    await transporter.sendMail({
      from: `"Khelo Karachi" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: subject,
      html: getHtmlTemplate(title, bodyContent)
    });
  } catch (error) {
    console.error('Email sending error:', error);
  }
};
