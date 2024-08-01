import mongoose from "mongoose";
import { User } from "../model/user.model.js";
import { Video } from "../model/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteCloudinary, uploadCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
    //TODO: get all videos based on query, sort, pagination

    const options = {
        page,
        limit,
    };

    const videosAggregate = Video.aggregate([
        {
            $project: {
                thumbnail: 1,
                title: 1,
            },
        },
    ]);

    const result = await Video.aggregatePaginate(videosAggregate, options);


    console.log("video : ", options);

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
    console.log("object");
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id),
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
                username: 1,
                email: 1,
                avatar: 1,
                allVideos: {
                    $map: {
                        input: "$allVideos",
                        as: "video",
                        in: {
                            videoFile: "$$video.videoFile",
                            thumbnail: "$$video.thumbnail",
                            title: "$$video.title",
                            description: "$$video.description",
                            duration: "$$video.duration",
                            views: "$$video.views",
                        },
                    },
                },
            },
        },
    ]);
    if (!user?.length) {
        throw new ApiError(404, "videos doesn't exists");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, user[0], "All videos fetched successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    // 1. get video id
    // 3. validate input
    // 4. find video
    // 5. validate response
    // 6. delete thumbnail & video from cloudinary
    // 7. delete video from db
    // 8. return res

    const { videoId } = req.params;

    if (!videoId) {
        throw new ApiError(400, "video id is required");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found in this id");
    }

    await deleteCloudinary(video.thumbnail);
    await deleteCloudinary(video.videoFile);

    await Video.findByIdAndDelete(videoId);

    return res.status(204).end();
});

const getVideoById = asyncHandler(async (req, res) => {
    // 1. get video id
    // 2. validate -> id
    // 3. fetch video from db
    // 4. validate response
    // 5. return response

    const { videoId } = req.params;

    if (!videoId) {
        throw new ApiError(400, "video id is missing");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found on this id");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video, "video fetched successfully"));
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
