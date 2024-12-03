const generateOtp = (length = 6) => {
    const chars =
        "A0@B1#C2$D3%E4&F5@G6#H7$I8%J9&K0L1@M2#N3$O4%P5&Q6@R7#S8$T9%U0&V@W#X$Y%Z&";
    let otp = "";
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        otp += chars[randomIndex];
    }
    return otp;
};
export default generateOtp;
