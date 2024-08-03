import mongoose from "mongoose";
import { Video } from "../model/video.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Subscription } from "../model/subscription.model.js";

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

    const userId = req.user._id;
    const stats = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        },

        {
            $facet: {
                totalViews: [
                    {
                        $group: {
                            _id: null,
                            views: { $sum: "$views" },
                        },
                    },
                ],
                totalVideos: [
                    {
                        $count: "totalVideos",
                    },
                ],

                totalLikes: [
                    {
                        $lookup: {
                            from: "likes",
                            localField: "_id",
                            foreignField: "entity",
                            as: "likedVideos",
                        },
                    },
                    {
                        $unwind: "$likedVideos",
                    },
                    {
                        $group: {
                            _id: null,
                            likes: { $sum: 1 },
                        },
                    },
                ],
            },
        },
        {
            $project: {
                totalViews: {
                    $arrayElemAt: ["$totalViews.views", 0],
                },
                totalVideos: {
                    $arrayElemAt: ["$totalVideos.totalVideos", 0],
                },
                totalLikes: {
                    $arrayElemAt: ["$totalLikes.likes", 0],
                },
            },
        },
    ]);

    const totalSubscribers = await Subscription.countDocuments({
        channel: userId,
    });

    const startsWithSubscribers = {
        ...stats[0],
        totalSubscribers,
    };
    console.log(startsWithSubscribers);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                startsWithSubscribers,
                "All stats fetched successfully"
            )
        );
});

const getChannelVideos = asyncHandler(async (req, res) => {

    const videos = await Video.find({ owner: req.user._id });

    if (!videos) {
        throw new ApiError(
            500,
            "Something went wrong while fetching all videos"
        );
    }

    return res
        .status(200)
        .json(new ApiResponse(200, videos, "All videos are fetched"));
});

export { getChannelStats, getChannelVideos };
