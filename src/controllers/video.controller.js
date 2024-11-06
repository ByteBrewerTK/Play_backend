import mongoose from "mongoose";
import Busboy from "busboy";
import { User } from "../model/user.model.js";
import { Video, View } from "../model/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteCloudinary, uploadCloudinary } from "../utils/cloudinary.js";
import { Comment } from "../model/comment.model.js";
import { Like } from "../model/like.model.js";
import { v2 as cloudinary } from "cloudinary";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

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

ffmpeg.setFfmpegPath(ffmpegPath);
const validateFields = (title, description) => {
    const errors = [];

    if (!title || typeof title !== "string" || title.trim().length < 3) {
        errors.push("Title must be at least 3 characters long");
    }
    if (title && title.length > 100) {
        errors.push("Title must not exceed 100 characters");
    }

    if (
        !description ||
        typeof description !== "string" ||
        description.trim().length < 10
    ) {
        errors.push("Description must be at least 10 characters long");
    }
    if (description && description.length > 500) {
        errors.push("Description must not exceed 500 characters");
    }

    return errors;
};

const handleFileUpload = (fieldname, file, filename, cloudinary) => {
    return new Promise((resolve, reject) => {
        const resource_type = fieldname === "thumbnail" ? "image" : "video";

        const uploadStream = cloudinary.uploader.upload_stream(
            { resource_type },
            (error, result) => {
                if (error) {
                    console.error(`Error uploading ${fieldname}:`, error);
                    reject(error);
                    return;
                }
                resolve(result.secure_url);
            }
        );

        file.pipe(uploadStream);
    });
};
const getVideoDuration = (videoUrl) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoUrl, (err, metadata) => {
            if (err) {
                return reject(err);
            }
            const duration = metadata.format.duration;
            resolve(duration);
        });
    });
};

const publishAVideo = asyncHandler(async (req, res) => {
    return new Promise((resolve, reject) => {
        const busboy = Busboy({
            headers: req.headers,
            limits: {
                fileSize: 100 * 1024 * 1024, // 100MB limit
                files: 2, // Only allow 2 files (video and thumbnail)
            },
        });

        let thumbnailUrl = "";
        let videoUrl = "";
        let title = "";
        let description = "";
        const uploadPromises = [];

        busboy.on("file", (fieldname, file, filename) => {
            if (!["thumbnail", "videoFile"].includes(fieldname)) {
                file.resume(); // Ignore unwanted files
                return;
            }

            const uploadPromise = handleFileUpload(
                fieldname,
                file,
                filename,
                cloudinary
            ).then((url) => {
                if (fieldname === "thumbnail") thumbnailUrl = url;
                if (fieldname === "videoFile") videoUrl = url;
            });

            uploadPromises.push(uploadPromise);
        });

        busboy.on("field", (fieldname, val) => {
            if (fieldname === "title") title = val.trim();
            if (fieldname === "description") description = val.trim();
        });

        busboy.on("finish", async () => {
            try {
                // Validate fields
                const validationErrors = validateFields(title, description);
                if (validationErrors.length > 0) {
                    reject({
                        status: 400,
                        message: validationErrors.join(", "),
                    });
                    return;
                }

                // Wait for all uploads to complete
                await Promise.all(uploadPromises);

                // Verify both files were uploaded
                if (!thumbnailUrl || !videoUrl) {
                    reject({
                        status: 400,
                        message: "Both video and thumbnail are required",
                    });
                    return;
                }

                // Get video duration
                const duration = await getVideoDuration(videoUrl);

                resolve({
                    status: 200,
                    data: {
                        videoUrl,
                        thumbnailUrl,
                        title,
                        description,
                        duration,
                    },
                    message: "Video uploaded successfully",
                });
            } catch (error) {
                console.log("Processing upload error : ", error)
                reject({
                    status: 500,
                    message: "Error processing uploads",
                });
            }
        });

        busboy.on("error", (error) => {
            console.error("Busboy error:", error);
            reject({
                status: 500,
                message: "Error processing request",
            });
        });

        req.pipe(busboy);
    })
        .then(async (result) => {
            const { title, description, videoUrl, thumbnailUrl, duration } =
                result.data;
            const video = await Video.create({
                videoFile: videoUrl,
                thumbnail: thumbnailUrl,
                owner: req.user._id,
                duration, // Add the duration here
                title,
                description,
            });

            if (!video) {
                throw new ApiError(
                    500,
                    "Something went wrong while creating new video object on db"
                );
            }
            return res
                .status(result.status)
                .json(new ApiResponse(result.status, video, result.message));
        })
        .catch((error) => {
            return res
                .status(error.status)
                .json(new ApiResponse(error.status, null, error.message));
        });
});
const updateVideo = asyncHandler(async (req, res) => {
    const busboy = Busboy({ headers: req.headers });

    const { videoId } = req.params;
    const { title, description } = req.body;

    if (!(title || description || videoId)) {
        throw new ApiError(400, "Title, description, or videoId is missing");
    }

    // Validate if the video exists and belongs to the user
    const video = await Video.findOne({
        _id: videoId,
        owner: req.user._id,
    });

    if (!video) {
        throw new ApiError(404, "Video not found for this ID or user");
    }

    let thumbnailUrl = video.thumbnail; // Retain the existing thumbnail URL in case a new one is not provided

    busboy.on("file", async (fieldname, file, filename) => {
        try {
            // If the uploaded file is a thumbnail
            if (fieldname === "thumbnail") {
                console.log("file : ", file);
                //TODO: Delete the previous thumbnail from Cloudinary
                // await deleteCloudinary(video.thumbnail); // Ensure you call with the correct identifier for the thumbnail

                // Upload the new thumbnail to Cloudinary
                const uploadResult = await uploadCloudinary(file); // Adjust this function to accept a stream
                thumbnailUrl = uploadResult.url; // Update thumbnailUrl with the newly uploaded thumbnail URL
            }
        } catch (error) {
            throw new ApiError(
                500,
                "Error uploading thumbnail: " + error.message
            );
        }
    });

    busboy.on("finish", async () => {
        // Proceed to update the video details in the database
        const updatedVideo = await Video.findByIdAndUpdate(
            videoId,
            {
                $set: {
                    title,
                    description,
                    thumbnail: thumbnailUrl,
                },
            },
            { new: true }
        );

        if (!updatedVideo) {
            throw new ApiError(
                403,
                "Something went wrong while updating video details"
            );
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    updatedVideo,
                    "Video details updated successfully"
                )
            );
    });

    req.pipe(busboy); // Pipe the request to Busboy for processing
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
                pipeline: [
                    {
                        $lookup: {
                            from: "views",
                            localField: "_id",
                            foreignField: "video",
                            as: "views",
                        },
                    },
                    {
                        $addFields: {
                            views: {
                                $size: "$views",
                            },
                        },
                    },
                ],
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
