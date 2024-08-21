import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Like } from "../model/like.model.js";
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
        return res.status(200).json(new ApiResponse(200, {}, "Like removed"));
    }

    const newLike = new Like({
        user: userId,
        entity: entityId,
        onModel: entityType,
    });

    await newLike.save();

    return res.status(200).json(new ApiResponse(200, newLike, "Like added"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
    const likedVideos = await Like.aggregate([
        {
            $match: {
                user: req.user._id,
                onModel: "Video",
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "entity",
                foreignField: "_id",
                as: "likedVideos",
            },
        },
        {
            $unwind: "$likedVideos",
        },

        {
            $facet: {
                likedVideos: [
                    {
                        $project: {
                            _id: "$likedVideos._id",
                            owner: "$likedVideos.owner",
                            title: "$likedVideos.title",
                            thumbnail: "$likedVideos.thumbnail",
                            duration: "$likedVideos.duration",
                            views: "$likedVideos.views",
                            createdAt: "$likedVideos.createdAt",
                        },
                    },
                ],
                totalLikedVideos: [
                    {
                        $count: "count",
                    },
                ],
            },
        },
    ]);

    if (!likedVideos) {
        throw new ApiError(
            500,
            "something went wrong while fetching all liked videos"
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
