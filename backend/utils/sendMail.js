import nodemailer from "nodemailer";

export const sendDatasetMail = async (
  to,
  subject,
  text
) => {

  try {

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
      to,
      subject,
      text,
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