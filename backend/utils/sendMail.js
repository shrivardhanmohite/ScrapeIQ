import nodemailer from "nodemailer";

export const sendDatasetMail = async (...args) => {

  try {
    const options = typeof args[0] === "object"
      ? args[0]
      : {
          to: args[0],
          subject: args[1],
          text: args[2]
        };

    const transporter =
      nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments || []
    };

    const info =
      await transporter.sendMail(
        mailOptions
      );

    console.log(
      "Mail sent:",
      info.response
    );

    return info;

  } catch (error) {

    console.error(
      "Send Mail Error:",
      error
    );

    throw error;
  }
};
