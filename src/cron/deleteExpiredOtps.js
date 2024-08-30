import { OTP } from "../model/otp.js";

const deleteExpiredOtps = async () => {
    try {
        const now = new Date();
        const result = await OTP.deleteMany({ expiresAt: { $lt: now } });
        console.log(`Deleted ${result.deletedCount} expired OTPs`);
    } catch (error) {
        console.error("Error deleting expired OTPs:", error);
    }
};

export default deleteExpiredOtps;
