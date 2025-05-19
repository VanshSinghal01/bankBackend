const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "singhalvansh74@gmail.com",
    pass: "wppzxylumdrymgtr", // App password only
  },
});

async function main(emailId, textVersion, htmlVersion) {

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
