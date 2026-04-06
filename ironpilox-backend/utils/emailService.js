const axios = require('axios');

const sendVerificationEmail = async (toEmail, code) => {
  const payload = {
    sender: {
      name: 'IRONPILOX Support',
      email: 'support@ironpilox.com',
    },
    to: [
      {
        email: toEmail,
      },
    ],
    subject: 'Verify your email - IRONPILOX',
    htmlContent: `
      <h2>Verify your email</h2>
      <p>Welcome to IRONPILOX.</p>
      <p>Your verification code is:</p>
      <h1 style="letter-spacing: 4px;">${code}</h1>
      <p>This code expires in 10 minutes.</p>
    `,
    textContent: `Welcome to IRONPILOX.\nYour verification code is: ${code}\nThis code expires in 10 minutes.`,
  };

  try {
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      payload,
      {
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'api-key': process.env.BREVO_API_KEY,
        },
      }
    );

    console.log('Verification email sent:', response.data);
    return response.data;
  } catch (error) {
    console.error(
      'Verification email error:',
      error.response?.data || error.message || error
    );
    throw new Error('Failed to send verification email');
  }
};

const sendResetEmail = async (toEmail, resetToken) => {
  const clientUrl = process.env.CLIENT_URL || 'https://ironpilox.com';
  const resetUrl = `${clientUrl}/#/reset-password/${resetToken}`;

  const payload = {
    sender: {
      name: 'IRONPILOX Support',
      email: 'support@ironpilox.com',
    },
    to: [{ email: toEmail }],
    subject: 'Reset your password - IRONPILOX',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
        <h2>Reset your password</h2>
        <p>We received a request to reset your IRONPILOX account password.</p>
        <p>Click the button below to set a new password:</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}"
             style="display: inline-block; background: #B71C1C; color: white; text-decoration: none; padding: 14px 24px; border-radius: 8px; font-weight: bold;">
             Reset Password
          </a>
        </p>
        <p>If you did not request this, you can safely ignore this email.</p>
        <p>This link expires in 10 minutes.</p>
      </div>
    `,
    textContent: `Reset your password here: ${resetUrl}`,
  };

  try {
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      payload,
      {
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'api-key': process.env.BREVO_API_KEY,
        },
      }
    );

    console.log('Reset email sent:', response.data);
    return response.data;
  } catch (error) {
    console.error(
      'Reset email error:',
      error.response?.data || error.message || error
    );
    throw new Error('Failed to send reset email');
  }
};

module.exports = {
  sendVerificationEmail,
  sendResetEmail,
};