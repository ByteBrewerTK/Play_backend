import mongoose from "mongoose";
import { User } from "../model/user.model.js";
import { Video, View } from "../model/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteCloudinary, uploadCloudinary } from "../utils/cloudinary.js";
import { Comment } from "../model/comment.model.js";
import { Like } from "../model/like.model.js";

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType } = req.query;
    //TODO: get all videos based on query, sort, pagination

    if (!(sortBy && sortType)) {
        throw new ApiError(400, "required fields are missing");
    }

    const sortOrder = sortType === "desc" ? -1 : 1;

    const videosAggregate = Video.aggregate([
        {
            $sort: {
                [sortBy]: sortOrder,
            },
        },
        {
            $lookup: {
                from: "views",
                localField: "_id",
                foreignField: "video",
                as: "totalViews",
            },
        },
        {
            $addFields: {
                views: {
                    $size: "$totalViews",
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
                thumbnail: 1,
                title: 1,
                duration: 1,
                views: 1,
                createdAt: 1,
                avatar: "$ownerDetails.avatar",
                username: "$ownerDetails.username",
                channelName: "$ownerDetails.fullName",
            },
        },
    ]);
    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
    };

    const result = await Video.aggregatePaginate(videosAggregate, options);

    if (!result) {
        throw new ApiError(
            500,
            "Something went wrong while fetch all the videos"
        );
    }
    console.log("result : ", options);

    return res
        .status(200)
        .json(new ApiResponse(200, result, "fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
    // 1. get data from req.body
    // 2. validate data,
    // 3. get files
    // 4. validate input files
    // 5. upload files to cloudinary
    // 6. create video object on db,
    // 7. return res

    const { title, description } = req.body;

    if (!(title && description)) {
        throw new ApiError(
            400,
            "All field required title and description are required"
        );
    }

    console.log(req.files);
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
    const videoFileLocalPath = req.files?.videoFile[0]?.path;

    console.log("thumbnailLocalPath : ", thumbnailLocalPath);
    console.log("videoFileLocalPath : ", videoFileLocalPath);

    if (!(thumbnailLocalPath && videoFileLocalPath)) {
        throw new ApiError(400, "All files are required");
    }

    const thumbnail = await uploadCloudinary(thumbnailLocalPath, "thumbnail");
    const videoFile = await uploadCloudinary(videoFileLocalPath, "videoFile");

    if (!(thumbnail && videoFile)) {
        throw new ApiError(
            400,
            "Files are missing after uploading to cloudinary "
        );
    }

    console.log("thumbnail", thumbnail);
    console.log("videoFile", videoFile);

    const video = await Video.create({
        videoFile: videoFile?.url,
        thumbnail: thumbnail?.url,
        owner: req.user._id,
        duration: videoFile?.duration,
        title,
        description,
    });

    if (!video) {
        throw new ApiError(
            500,
            "something went wrong while creating video obj on db"
        );
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video uploaded successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
    // 1. get videoId, data and thumbnail
    // 2. validate inputs
    // 3. find video by id
    // 4. delete previous thumbnail to update new
    // 5. update new thumbnail
    // 6. update video on db
    // 7. return res

    const { videoId } = req.params;
    const { title, description } = req.body;
    const thumbnailLocalPath = req.file?.path;

    if (!(title || description || thumbnail || videoId)) {
        throw new ApiError(400, "title or description missing");
    }
    console.log("thumbnailLocalPath : ", thumbnailLocalPath);

    const video = await Video.findOne({
        $and: [
            {
                _id: videoId,
            },
            {
                owner: req.user._id,
            },
        ],
    });
    if (!video) {
        throw new ApiError(404, "video not found in this id or user");
    }

    let thumbnail;
    if (thumbnailLocalPath) {
        await deleteCloudinary(video.videoFile);
        thumbnail = await uploadCloudinary(thumbnailLocalPath);
    }
    console.log("thumbnail : ", thumbnail);

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: thumbnail?.url,
            },
        },
        { new: true }
    );

    if (!updatedVideo) {
        throw new ApiError(
            403,
            "something went wrong while updating details of video"
        );
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedVideo,
                "title or description updated successfully"
            )
        );
});

const getAllVideosOfUser = asyncHandler(async (req, res) => {
    // find user and use pipeline to extract all videos
    const { username } = req.params;
    const user = await User.aggregate([
        {
            $match: {
                username,
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "_id",
                foreignField: "owner",
                as: "allVideos",
            },
        },
        {
            $project: {
                allVideos: {
                    _id: 1,
                    owner: "$_id",
                    username: "$username",
                    avatar: "$avatar",
                    thumbnail: 1,
                    title: 1,
                    duration: 1,
                    views: 1,
                    createdAt: 1,
                },
            },
        },
    ]);
    if (!user?.length) {
        throw new ApiError(404, "videos doesn't exists");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0].allVideos,
                "All videos fetched successfully"
            )
        );
});

const deleteVideo = asyncHandler(async (req, res) => {
    // 1. get video id
    // 3. validate input
    // 4. find video
    // 5. validate response
    // 6. delete thumbnail & video from cloudinary
    // 7. delete video from db
    // 8. return res
    const session = await mongoose.startSession();
    session.startTransaction();
    const { videoId } = req.params;

    if (!videoId) {
        throw new ApiError(400, "video id is required");
    }

    const video = await Video.find({ _id: videoId, owner: req.user._id });

    if (!video) {
        throw new ApiError(404, "Video not found in this id");
    }

    try {
        // Delete the video
        await Video.findByIdAndDelete(videoId, { session });

        // Delete related likes
        await Like.deleteMany({ entity: videoId }, { session });

        // Delete related views
        await View.deleteMany({ video: videoId }, { session });

        // Delete related comments
        await Comment.deleteMany({ video: videoId }, { session });

        // Commit the transaction
        await deleteCloudinary(video.thumbnail);
        await deleteCloudinary(video.videoFile);

        await session.commitTransaction();
        session.endSession();
    } catch (error) {
        // Abort the transaction in case of error
        await session.abortTransaction();
        session.endSession();
        throw newApiError(
            500,
            "Failed to delete video, related data, or files:"
        );
    }

    return res.status(204).end();
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user._id;

    if (!videoId) {
        throw new ApiError(400, "Video ID is missing");
    }

    const existedView = await View.findOne({
        video: videoId,
        viewedBy: userId,
    });

    if (!existedView) {
        console.log("inside existedView");
        const updatedViews = await View.create({
            video: videoId,
            viewedBy: userId,
        });

        if (!updatedViews) {
            throw newApiError(500, "Something went wrong while fetching video");
        }
    }

    const [videoDetails] = await Video.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(videoId) },
        },
        {
            $lookup: {
                from: "views",
                localField: "_id",
                foreignField: "video",
                as: "totalViews",
            },
        },
        {
            $addFields: {
                views: {
                    $size: "$totalViews",
                },
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "entity",
                as: "videosLike",
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscriptions",
                        },
                    },
                    {
                        $addFields: {
                            isSubscribed: {
                                $in: [
                                    req.user._id,
                                    "$subscriptions.subscriber",
                                ],
                            },
                            subscribersCount: { $size: "$subscriptions" },
                        },
                    },
                    {
                        $project: {
                            fullName: 1,
                            username: 1,
                            avatar: 1,
                            subscribersCount: 1,
                            isSubscribed: 1,
                        },
                    },
                ],
            },
        },
        { $unwind: "$ownerDetails" },
        {
            $addFields: {
                likes: { $size: "$videosLike" },
                isLiked: {
                    $in: [req.user._id, "$videosLike.user"],
                },
            },
        },
        {
            $project: {
                title: 1,
                thumbnail: 1,
                videoFile: 1,
                description: 1,
                duration: 1,
                isLiked: 1,
                likes: 1,
                ownerDetails: 1,
                comments: 1,
                createdAt: 1,
                views: 1,
            },
        },
    ]);

    if (!videoDetails) {
        throw new ApiError(
            500,
            "Something went wrong while fetching the video"
        );
    }

    await User.findByIdAndUpdate(
        userId,
        {
            $addToSet: { watchHistory: videoId },
        },
        { new: true }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, videoDetails, "Video fetched successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    // 1. get video id
    // 2. validate input
    // 3. fetch video from db
    // 4. validate response
    // 5. if video publish then hide it or vice versa
    // 6. validate response
    // 7. return res

    const { videoId } = req.params;

    if (!videoId) {
        throw new ApiError(400, "Video id is required");
    }

    const updatedVideo = await Video.updateOne(
        {
            $and: [{ _id: videoId }, { owner: req.user._id }],
        },
        [
            {
                $set: {
                    isPublished: {
                        $cond: {
                            if: { $eq: ["$isPublished", true] },
                            then: false,
                            else: true,
                        },
                    },
                },
            },
        ]
    );
    if (!updateVideo.modifiedCount) {
        throw new ApiError(404, "video not found on this id");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "publish state updated successfully"));
});

export {
    publishAVideo,
    updateVideo,
    getAllVideosOfUser,
    getVideoById,
    deleteVideo,
    togglePublishStatus,
    getAllVideos,
};
