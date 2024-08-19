function emailVerificationTemplate(name, verificationLink) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; font-family: Arial, sans-serif; }
        .container { width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
        .header { text-align: center; padding: 20px; background-color: #333; color: #ffffff; border-radius: 10px 10px 0 0; }
        .content { padding: 20px; text-align: center; }
        a{color:#ffffff; text-decoration : none}
        .button { display: inline-block; padding: 15px 30px; margin: 20px 0; font-size: 16px; color: #ffffff; background-color: #000000; text-decoration: none; border-radius: 5px; transition: background-color 0.3s ease; }
        .button:hover { background-color: #1f1f; }
        .footer { text-align: center; padding: 10px; background-color: #333; color: #ffffff; border-radius: 0 0 10px 10px; }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .animate { animation: bounce 1s infinite; }
    </style>
    </head>
    <body>
        <div class="container">
        <div class="header">
            <h1>Email Verification</h1>
        </div>
        <div class="content">
            <p>Hi ${name},</p>
            <p>Thank you for signing up! Please verify your email address by clicking the button below:</p>
            <a href="${verificationLink}" class="button animate">Verify Email</a>
        </div>
        <div class="footer">
            <p>StreamIt | <a href="mailto:support.streamit@bytebrewer.site">support.streamit@bytebrewer.com</a> Info</p>
        </div>
        </div>
    </body>
    </html>
    `;
}

export default emailVerificationTemplate;
