const generateOtp = (length = 6) => {
    const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let otp = "";
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        otp += chars[randomIndex];
    }
    return otp;
};
export default generateOtp;
