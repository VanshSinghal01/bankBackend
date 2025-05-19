const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "singhalvansh74@gmail.com",
    pass: "wppzxylumdrymgtr", // App password only
  },
});

async function main(emailId, otp, accountNumber) {
  const textVersion = `
Welcome to VS Bank!

Your OTP is: ${otp}
Your account number is: ${accountNumber}

Please do not share this with anyone.
`;

  const htmlVersion = `
<p>Welcome to <strong>VS Bank</strong>!</p>
<p>Your OTP is: <strong>${otp}</strong></p>
<p>Your account number is: <strong>${accountNumber}</strong></p>
<p style="color: gray; font-size: 0.9em;">Please do not share this with anyone.</p>
`;

  try {
    const info = await transporter.sendMail({
      from: '"VS Bank" <singhalvansh74@gmail.com>',
      to: emailId,
      subject: 'Welcome to VS Bank!',
      text: textVersion,
      html: htmlVersion,
    });

    console.log("Email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Email send error:", error);
    throw error;
  }
}

module.exports = main;
