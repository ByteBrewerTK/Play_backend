import mongoose, { Schema } from "mongoose";

const settingSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        autoPlayOnStart: {
            type: Boolean,
            default: false,
            required: true,
        },
        autoPlayNext: {
            type: Boolean,
            default: false,
            required: true,
        },
    },
    { timestamps: true }
);

export const Setting = mongoose.model("Setting", settingSchema);
