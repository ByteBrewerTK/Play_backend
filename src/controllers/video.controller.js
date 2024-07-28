import { User } from "../model/user.model.js";
import { Video } from "../model/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadCloudinary } from "../utils/cloudinary.js";

const uploadVideo = asyncHandler(async (req, res) => {
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

const updateVideoDetails = asyncHandler(async (req, res) => {
    // get data
    // validate date
    // find video and update the new data
    // return res

    const { title, description } = req.body;

    if (!(title || description)) {
        throw new ApiError(400, "title or description missing");
    }

    const video = await Video.findByIdAndUpdate(req.params.id, {
        $set: {
            title,
            description,
        },
    });

    if (!video) {
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
                video,
                "title or description updated successfully"
            )
        );
});

const getAllVideosOfUser = asyncHandler(async (req, res) => {
    // find user and use pipeline to extract all videos

    const videos = await User.aggregate([
        {
            $match: {
                _id: req.user._id,
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
    if (!videos?.length) {
        throw new ApiError(404, "videos doesn't exists");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, videos[0], "All videos fetched successfully")
        );
});

const deleteVideos = asyncHandler(async (req, res) => {});

export { uploadVideo, updateVideoDetails, getAllVideosOfUser };
