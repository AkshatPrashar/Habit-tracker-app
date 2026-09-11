import nodemailer from 'nodemailer';
import Mailgen from 'mailgen';

const mailgen = new Mailgen({
  theme: 'default',
  product: {
    name: 'Streakies',
    link: 'http://localhost:3000',
    logo: 'https://placehold.co/200x200',
  },
});

let transporter = null;

const getTransporter = () => {
  console.log('📧 Mailtrap Config:');
  console.log('  Host:', process.env.MAILTRAP_SMTP_HOST);
  console.log('  Port:', process.env.MAILTRAP_SMTP_PORT);
  console.log('  User:', process.env.MAILTRAP_SMTP_USER ? '✓' : '❌ Missing');
  console.log('  Pass:', process.env.MAILTRAP_SMTP_PASS ? '✓' : '❌ Missing');

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.MAILTRAP_SMTP_HOST,
      port: Number(process.env.MAILTRAP_SMTP_PORT),
      auth: {
        user: process.env.MAILTRAP_SMTP_USER,
        pass: process.env.MAILTRAP_SMTP_PASS,
      },
    });
  }
  return transporter;
};

export const sendVerificationEmail = async (email, verificationLink) => {
  const emailBody = mailgen.generate({
    body: {
      intro: 'Welcome to Streakies! Please verify your email.',
      action: {
        instructions: 'Click the button below to verify your email:',
        button: {
          color: '#D6FF4D',
          text: 'Verify Email',
          link: verificationLink,
        },
      },
      outro: 'This link expires in 20 minutes.',
    },
  });

  const mailOptions = {
    from: process.env.MAILTRAP_FROM_EMAIL,
    to: email,
    subject: 'Email Verification - Streakies',
    html: emailBody,
  };

  return getTransporter().sendMail(mailOptions);
};

export const sendForgotPasswordEmail = async (email, resetLink) => {
  const emailBody = mailgen.generate({
    body: {
      intro: 'You requested a password reset. Here is your link.',
      action: {
        instructions: 'Click the button below to reset your password:',
        button: {
          color: '#D6FF4D',
          text: 'Reset Password',
          link: resetLink,
        },
      },
      outro: 'This link expires in 20 minutes. If you didn\'t request this, ignore this email.',
    },
  });

  const mailOptions = {
    from: process.env.MAILTRAP_FROM_EMAIL,
    to: email,
    subject: 'Password Reset - Streakies',
    html: emailBody,
  };

  return getTransporter().sendMail(mailOptions);
};

export const sendLoginNotificationEmail = async (email) => {
  const emailBody = mailgen.generate({
    body: {
      intro: 'You just logged into your Streakies account.',
      action: {
        instructions: 'If this wasn\'t you, secure your account immediately.',
        button: {
          color: '#D6FF4D',
          text: 'Change Password',
          link: 'http://localhost:3000/change-password',
        },
      },
      outro: 'Stay safe!',
    },
  });

  const mailOptions = {
    from: process.env.MAILTRAP_FROM_EMAIL,
    to: email,
    subject: 'Login Notification - Streakies',
    html: emailBody,
  };

  return getTransporter().sendMail(mailOptions);
};

export const sendLogoutNotificationEmail = async (email) => {
  const emailBody = mailgen.generate({
    body: {
      intro: 'You just logged out from your Streakies account.',
      outro: 'See you soon!',
    },
  });

  const mailOptions = {
    from: process.env.MAILTRAP_FROM_EMAIL,
    to: email,
    subject: 'Logout Notification - Streakies',
    html: emailBody,
  };

  return getTransporter().sendMail(mailOptions);
};
