import mongoose, { Schema } from "mongoose";
import aggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
    {
        videoFile: {
            type: String,
            required: true,
        },
        thumbnail: {
            type: String,
            required: true,
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
        },
        duration: {
            type: Number,
        },
        isPublished: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

const viewSchema = new Schema({
    video: {
        type: Schema.Types.ObjectId,
        ref: "Video",
    },
    viewedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    viewedAt: {
        type: Date,
        default: Date.now,
    },
});

videoSchema.plugin(aggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);
export const View = mongoose.model("View", viewSchema);
