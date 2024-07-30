import mongoose from "mongoose";
import { Comment } from "../model/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;
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
    );

    if (!updatedComment) {
        throw new ApiError(500, "something went wrong while updating comment");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updateComment, "comment updated"));
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

    if (!commentId.deletedCount) {
        throw new ApiError(500, "something went wrong while deleting comment");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, deletedComment, "comment deleted"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
