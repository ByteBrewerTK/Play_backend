import mongoose, { Schema } from "mongoose";

const messageModel = new Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        content: {
            type: String,
            trim: true,
            required: true,
        },
        chat: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Chat",
        },
    },
    {
        timestamps: true,
    }
);

export const Message = mongoose.model("Message", messageModel);
