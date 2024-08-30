const otpTemplate = (otpCode) => {
    return `
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your OTP Code</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            background-color: #f9f9f9;
            border-radius: 5px;
            padding: 20px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }
        h1 {
            color: #2c3e50;
        }
        .otp-container {
            background-color: #000000;
            color: white;
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            padding: 10px;
            margin: 20px 0;
            border-radius: 5px;
            cursor: pointer;
        }
        .footer {
            font-size: 12px;
            color: #7f8c8d;
            margin-top: 20px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Your One-Time Password (OTP)</h1>
        <p>Hello,</p>
        <p>You have requested a one-time password for authentication. Please use the code below to complete your login:</p>
        <div class="otp-container" id="otpCode">
            ${otpCode}
        </div>
        <p>This code will expire in 5 minutes. If you didn't request this code, please ignore this email.</p>
        <p>Best regards,<br>Your App Team</p>
    </div>
    <div class="footer">
        This is an automated message. Please do not reply to this email.
    </div>

    <script>
        const otpContainer = document.getElementById('otpCode');
        otpContainer.addEventListener('click', function() {
            const otp = this.innerText;
            navigator.clipboard.writeText(otp).then(() => {
                alert('OTP copied to clipboard!');
            }).catch(err => {
                console.error('Failed to copy OTP: ', err);
            });
        });
    </script>
</body>
</html>
    `;
};

export default otpTemplate;
