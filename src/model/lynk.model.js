import mongoose from "mongoose";

const lynkSchema = new mongoose.Schema(
    {
        content: {
            type: String,
            required: true,
            trim: true,
            maxlength: 280, // like Twitter
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        media: [
            {
                url: String,
                public_id: String, // For Cloudinary or other storage
                type: {
                    type: String,
                    enum: ["image", "video", "gif"],
                },
            },
        ],
        likes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        replies: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Lynk",
            },
        ],
        parentLynk: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Lynk",
        },
        isReply: {
            type: Boolean,
            default: false,
        },
        hashtags: [String],
        mentions: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
    },
    { timestamps: true }
);

export default mongoose.model("Lynk", lynkSchema);
