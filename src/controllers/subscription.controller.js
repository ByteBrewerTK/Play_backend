import mongoose from "mongoose";
import { Subscription } from "../model/subscription.model.js";
import { User } from "../model/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
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
                            fullName:"$channel.fullName",
                            avatar:"$channel.avatar",
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
                // fullName: 1,
                // email: 1,
                // username: 1,
                // avatar: 1,
                // coverImage: 1,
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
                subscribedChannels[0],
                "Subscribed channel fetched successfully"
            )
        );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
