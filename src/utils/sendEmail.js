import createTransporter from "../config/email.js";

const sendEmail = async ({ to, subject, html }) => {
    const transporter = createTransporter();

    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html,
    };

    await transporter.sendMail(mailOptions);
};

export default sendEmail