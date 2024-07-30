import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        entity: {
            type: Schema.Types.ObjectId,
            require: true,
            refPath: "onModel",
        },
        onModel: {
            type: String,
            required: true,
            enum: ["Video", "Tweet", "Comment"],
        },
    },
    { timestamps: true }
);

export const Like = mongoose.model("Like", likeSchema);
