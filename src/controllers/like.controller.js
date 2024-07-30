import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Like } from "../model/like.model.js";
import { User } from "../model/user.model.js";
import mongoose from "mongoose";
import { ApiResponse } from "../utils/ApiResponse.js";

const toggleLike = asyncHandler(async (req, res) => {
    const { entityId, entityType } = req.params;
    const userId = req.user._id;

    if (!(entityId && entityType)) {
        throw new ApiError(400, "Entity or model type is missing");
    }

    const entityExists = await mongoose.model(entityType).findById(entityId);

    if (!entityExists) {
        throw new ApiError(404, "Entity not found");
    }

    const existingLike = await Like.findOne({
        user: userId,
        entity: entityId,
        onModel: entityType,
    });

    if (existingLike) {
        await Like.deleteOne({ _id: existingLike._id });
        return res.status(200).json(200, {}, "Like removed");
    }

    const newLike = new Like({
        user: userId,
        entity: entityId,
        onModel: entityType,
    });

    await newLike.save();

    return res.status(200).json(200, newLike, "Like added");
});

const getLikedVideos = asyncHandler(async (req, res) => {
    const likedVideos = await User.aggregate([
        {
            $match: {
                _id: req.user._id,
            },
        },
        {
            $lookup: {
                form: "likes",
                localField: "_id",
                foreignField: "user",
                as: "likedVideos",
            },
        },
        {
            $unwind: "$likedVideos",
        },
        {
            $match: {
                onModel: "Video",
            },
        },
        {
            $project: {
                fullName: 1,
                email: 1,
                username: 1,
                avatar: 1,
                coverImage: 1,
                likedVideos: 1,
            },
        },
    ]);

    if (!likedVideos) {
        throw new ApiError(
            500,
            "Something went wrong while fetching all liked videos"
        );
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                likedVideos,
                "All liked videos fetched successfully"
            )
        );
});

export { toggleLike, getLikedVideos };
