import nodemailer from "nodemailer";
import { ApiError } from "./ApiError.js";
import emailVerificationTemplate from "../templates/emailVerificationTemplate.js";
export const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // Use `true` for port 465, `false` for all other ports
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

export const sendMail = (email, fullName, confirmationLink) => {
    const template = emailVerificationTemplate(
        fullName.split(" "),
        confirmationLink
    );
    const mailOptions = {
        from: process.env.EMAIL_USER || "talifkh2003@gmail.com",
        to: email || "abutalifkh1@gmail.com",
        subject: "Confirm your registration",
        priority: "high",
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
