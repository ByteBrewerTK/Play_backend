import mongoose, { Schema } from "mongoose";

const otpSchema = new Schema({
    code: {
        type: String,
        required: true,
        minlength: 6,
        maxlength: 6,
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    type: {
        type: String,
        enum: ["Email"],
        required: true,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
});

export const OTP = mongoose.model("OTP", otpSchema);
