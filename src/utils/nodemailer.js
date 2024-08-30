import nodemailer from "nodemailer";
import emailVerificationTemplate from "../templates/emailVerificationTemplate.js";
import otpTemplate from "../templates/otpTemplate.js";
export const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: 465,
    secure: true, // Use `true` for port 465, `false` for all other ports
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

const sendMail = (email, template, subject) => {
    const mailOptions = {
        from: `StreamIt ${process.env.MAIL_FROM}`,
        to: email,
        subject: subject,
        priority: "high",
        headers: {
            "X-Priority": "1",
            "X-MSMail-Priority": "High", // High priority in Microsoft clients
        },
        html: template,
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("Error sending email:", error);
            // throw new ApiError(500, "Failed to send confirmation email");
            return;
        }
        console.log("Confirmation email sent:", info.response);
    });
};
export const sendConfirmationOtp = (email, otpCode) => {
    const template = otpTemplate(otpCode);
    sendMail(email, template, "One-Time Password Inside");
};
export const sendVerificationMail = (email, fullName, confirmationLink) => {
    const template = emailVerificationTemplate(
        fullName.split(" ")[0],
        confirmationLink
    );

    sendMail(email, template, "Confirm your registration");
};
