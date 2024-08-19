import mongoose from "mongoose";
import { Comment } from "../model/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortType = "asc",
    } = req.query;

    if (!videoId) {
        throw new ApiError(400, "videoId is missing");
    }

    const sortOrder = sortType === "asc" ? 1 : -1;
    const userId = req.user._id; // Assuming user ID is available in the request

    const aggregate = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId),
            },
        },
        {
            $sort: {
                [sortBy]: sortOrder,
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "entity",
                as: "likes",
            },
        },
        {
            $addFields: {
                likes: { $size: "$likes" },
                isLiked: {
                    $in: [userId, "$likes.user"], // Check if the user has liked the comment
                },
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
            },
        },
        {
            $unwind: "$ownerDetails",
        },
        {
            $project: {
                likes: 1,
                isLiked: 1,
                content: 1,
                createdAt: 1,
                owner: "$ownerDetails._id",
                username: "$ownerDetails.username",
                avatar: "$ownerDetails.avatar",
            },
        },
    ]);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    };

    const result = await Comment.aggregatePaginate(aggregate, options);
    if (!result) {
        throw new ApiError(
            500,
            "Something went wrong while fetching all comments"
        );
    }

    return res
        .status(200)
        .json(new ApiResponse(200, result, "All comments are fetched"));
});

const addComment = asyncHandler(async (req, res) => {
    // 1. get video id
    // 2. validate video id
    // 3. create comment
    // 4. return res

    const { videoId } = req.params;
    const { content } = req.body;

    if (!(videoId && content)) {
        throw new ApiError(400, "Video id or content is missing");
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user._id,
    });

    if (!comment) {
        throw new ApiError(
            500,
            "Something went wrong while creating new comment"
        );
    }

    return res
        .status(200)
        .json(new ApiResponse(200, comment, "New comment created"));
});

const updateComment = asyncHandler(async (req, res) => {
    // 1. get comment id
    // 2. validate input
    // 3. update the comment
    // 4. return res

    const { commentId } = req.params;
    const { content } = req.body;

    if (!(commentId && content)) {
        throw new ApiError(400, "commentId or content is missing");
    }

    const updatedComment = await Comment.findOneAndUpdate(
        {
            _id: commentId,
            owner: req.user._id,
        },
        {
            content,
        }
    ).populate();

    if (!updatedComment) {
        throw new ApiError(500, "something went wrong while updating comment");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedComment, "comment updated"));
});

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!commentId) {
        throw new ApiError(400, "commentId is missing");
    }

    const deletedComment = await Comment.deleteOne({
        _id: commentId,
        owner: req.user._id,
    });

    if (!deletedComment.deletedCount) {
        throw new ApiError(500, "something went wrong while deleting comment");
    }

    return res.status(204).end();
});

export { getVideoComments, addComment, updateComment, deleteComment };
