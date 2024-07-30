import { Tweet } from "../model/tweet.model.js";
import { User } from "../model/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
    // 1. get data from user
    // 2. validate data
    // 3. create tweet
    // 4. return res

    const { content } = req.body;
    console.log("tweetContent : ", content);

    if (!content) {
        throw new ApiError(400, "content is missing");
    }

    const tweet = await Tweet.create({
        owner: req.user._id,
        content,
    });

    if (!tweet) {
        throw new ApiError(400, "something went wrong while creating tweet");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, tweet, "tweet created successfully"));
});

const getTweetById = asyncHandler(async (req, res) => {
    const tweetId = req.params?.tweetId;

    if (!tweetId) {
        throw new ApiError(400, "tweetId is missing");
    }

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(500, "Something went wrong while finding tweet");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, tweet, "Tweet fetched successfully"));
});
const getUserTweets = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: req.user._id,
            },
        },
        {
            $lookup: {
                from: "tweets",
                localField: "_id",
                foreignField: "owner",
                as: "tweets",
            },
        },
        {
            $project: {
                username: 1,
                fullName: 1,
                avatar: 1,
                tweets: 1,
            },
        },
    ]);

    if (!user) {
        throw new ApiError(404, "Tweets not found of this user");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "All tweets are fetched successfully")
        );
});

const updateTweet = asyncHandler(async (req, res) => {
    // 1. get data
    // 2. validate data
    // 3. update tweet
    // 4. validate response
    // 5. return res

    const tweetId = req.params?.tweetId;
    const { content } = req.body;

    if (!tweetId) {
        throw new ApiError(400, "tweetId is missing");
    }

    if (!content) {
        throw new ApiError(400, "Content is missing");
    }

    const updatedTweet = await Tweet.findOneAndUpdate(
        {
            $and: [{ _id: tweetId }, { owner: req.user._id }],
        },
        { content },
        { new: true }
    );

    if (!updatedTweet) {
        throw new ApiError(500, "Something went wrong while updating tweet");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedTweet, "Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
    const deletedTweet = await Tweet.findOneAndDelete({
        $and: [{ _id: req.params?.tweetId }, { owner: req.user._id }],
    });

    if (!deletedTweet) {
        throw new ApiError(500, "Something went wrong while deleting tweet");
    }
    return res.status(204).end();
});

export { createTweet, getUserTweets, updateTweet, deleteTweet, getTweetById };
