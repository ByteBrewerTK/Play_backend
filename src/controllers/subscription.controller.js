import mongoose from "mongoose";
import { Subscription } from "../model/subscription.model.js";
import { User } from "../model/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../model/video.model.js";
const toggleSubscription = asyncHandler(async (req, res) => {
    // 1. get channel id
    // 2. validate
    // 3. check channel in db
    // 4. if found then delete else create
    // 5. validate response
    // 6. return res

    const { channelId } = req.params;

    if (!channelId) {
        throw new ApiError(400, "channel id is missing");
    }

    const channel = await User.findById(req.user._id);

    if (!channel) {
        throw new ApiError(404, "Channel not found");
    }

    const deletedSubscription = await Subscription.findOneAndDelete({
        $and: [
            {
                channel: channelId,
            },
            {
                subscriber: req.user._id,
            },
        ],
    });
    console.log("deletedSubscription : ", deletedSubscription);

    let addSubscription;
    if (!deletedSubscription) {
        addSubscription = await Subscription.create({
            channel: channelId,
            subscriber: req.user._id,
        });
    }

    if (!(deletedSubscription || addSubscription)) {
        throw new ApiError(
            500,
            "Something went wrong while toggling subscription"
        );
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                addSubscription,
                "Subscription toggled successfully"
            )
        );
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    // 1. get channel id
    // 2. validate id
    // 3. add aggregate pipeline to get subscribers list
    // 4. validate response
    // 5. return res

    const { channelId } = req.params;

    if (!channelId) {
        throw new ApiError(400, "channel id is missing");
    }

    const subscribersList = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(channelId),
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
            },
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers",
                },
            },
        },
        {
            $project: {
                fullName: 1,
                email: 1,
                username: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount: 1,
                subscribers: 1,
            },
        },
    ]);

    if (!subscribersList) {
        throw new ApiError(
            500,
            "Something went wrong while fetching subscribers list"
        );
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                subscribersList,
                "Subscribers list fetched successfully"
            )
        );
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
    // 1. apply aggregate pipeline to get all channel list
    // 2. validate response
    // 3. return res

    const subscribedChannels = await User.aggregate([
        {
            $match: {
                _id: req.user._id,
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedChannels",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "channel",
                            foreignField: "_id",
                            as: "channel",
                        },
                    },

                    {
                        $unwind: "$channel",
                    },
                    {
                        $project: {
                            _id: "$channel._id",
                            fullName: "$channel.fullName",
                            username: "$channel.username",
                            avatar: "$channel.avatar",
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                subscribedChannelsCount: {
                    $size: "$subscribedChannels",
                },
            },
        },
        {
            $project: {
                subscribedChannelsCount: 1,
                subscribedChannels: 1,
            },
        },
    ]);

    if (!subscribedChannels) {
        throw new ApiError(
            500,
            "Something went wrong while fetching all subscribed channels"
        );
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                subscribedChannels[0].subscribedChannels,
                "Subscribed channel fetched successfully"
            )
        );
});

const getSubscriptionVideos = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // const { page = 1, limit = 10, query, sortBy, sortType } = req.query;
    //TODO: get all videos based on query, sort, pagination

    // if (!(sortBy && sortType)) {
    //     throw new ApiError(400, "required fields are missing");
    // }
    // const sortOrder = sortType === "desc" ? -1 : 1;

    const VideoAggregate = await Subscription.aggregate([
        {
            $match: {
                subscriber: userId,
            },
        },
        {
            $preset: [
                {
                    $lookup: {
                        from: "videos",
                        localField: "channel",
                        foreignField: "owner",
                        as: "videos",
                    },
                },
            ],
        },
    ]);
    if (!VideoAggregate) {
        throw new ApiError(500, "Something went wrong");
    }
    return res
        .status(200)
        .json(new ApiResponse(200, VideoAggregate[0], "Video fetched"));
});

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels,
    getSubscriptionVideos,
};
