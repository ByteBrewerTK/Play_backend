import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            index: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        age: {
            type: String,
            enum: ["18+", "13+", "kid"],
            default: "kid",
        },
        gender: {
            type: String,
            enum: ["Male", "Female", "Other"],
            default: "Other",
        },
        avatar: {
            type: String,
            required: true,
        },
        coverImage: {
            type: String,
        },
        password: {
            type: String,
        },
        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video",
            },
        ],
        isConfirmed: {
            type: Boolean,
            default: false,
        },
        googleId: {
            type: String,
            unique: true,
        },
        role: {
            type: String,
            enum: ["admin", "user"],
            default: "user",
        },
        newEmail: String,
        confirmationToken: String,
        confirmationExpires: Number,
        refreshToken: String,
    },
    { timestamps: true }
);

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10);
    next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = async function () {
    const payload = {
        _id: this._id,
        email: this.email,
        username: this.username,
        fullName: this.fullName,
    };

    const token = await jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    });

    return token;
};

userSchema.methods.generateRefreshToken = async function () {
    const payload = {
        _id: this._id,
    };

    return await jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    });
};

export const User = mongoose.model("User", userSchema);
