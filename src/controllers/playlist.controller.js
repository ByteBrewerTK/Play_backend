import mongoose from "mongoose";
import { Playlist } from "../model/playlist.model.js";
import { Video } from "../model/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description = "" } = req.body;
    const { privacyType } = req.params;

    if (!name) {
        throw new ApiError(400, "Playlist name field is required");
    }

    const playlist = await Playlist.create({
        name,
        description,
        privacyType,
        owner: req.user._id,
    });

    if (!playlist) {
        throw new ApiError(404, "Something went wrong while creating playlist");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Playlist created successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    if (!userId) {
        throw new ApiError(400, "userId is missing");
    }
    const playlists = await Playlist.find({ owner: userId }).populate("videos");
    if (!playlists) {
        throw new ApiError(404, "Playlist not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                playlists,
                "All playlists fetched successfully"
            )
        );
});

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!playlistId) {
        throw new ApiError(400, "Playlist id is missing");
    }

    // const playlist = await Playlist.findOne({
    //     _id: playlistId,
    //     owner: req.user._id,
    // }).populate([
    //     {
    //         path: "owner",
    //         select: "fullName avatar",
    //     },
    //     {
    //         path: "videos",
    //         populate: {
    //             path: "owner",
    //             select: "avatar",
    //         },
    //     },
    // ]);

    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
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
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            title: 1,
                            thumbnail: 1,
                            duration: 1,
                            createdAt: 1,
                            owner: { $arrayElemAt: ["$owner", 0] },
                            views: { $size: "$views" },
                        },
                    },
                    {
                        $project: {
                            "owner.username": 1,
                            "owner.fullName": 1,
                            title: 1,
                            thumbnail: 1,
                            views: 1,
                            duration: 1,
                            createdAt: 1,
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
            },
        },
        {
            $project: {
                name: 1,
                description: 1,
                privacyType: 1,
                videos: 1,
                owner: { $arrayElemAt: ["$owner", 0] },
            },
        },
        {
            $project: {
                "owner.avatar": 1,
                "owner.username": 1,
                "owner.fullName": 1,
                name: 1,
                description: 1,
                privacyType: 1,
                videos: 1,
            },
        },
    ]);

    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, playlist[0], "Playlist fetched successfully")
        );
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!(playlistId && videoId)) {
        throw new ApiError(400, "Playlist or videoId is missing");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(400, "Invalid video id");
    }

    const playlist = await Playlist.findOne({
        $and: [{ _id: playlistId }, { owner: req.user._id }],
        videos: videoId,
    });

    if (playlist) {
        throw new ApiError(409, "This video is already exists in the playlist");
    }

    const updatedPlaylist = await Playlist.findOneAndUpdate(
        {
            $and: [{ _id: playlistId }, { owner: req.user._id }],
        },
        {
            $addToSet: {
                videos: videoId,
            },
        },
        { new: true }
    ).populate("videos");

    if (!updatedPlaylist) {
        throw new ApiError(
            402,
            "Something went wrong while adding video to playlist"
        );
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedPlaylist,
                "Video successfully added to playlist"
            )
        );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!(playlistId && videoId)) {
        throw new ApiError(400, "Playlist or videoId is missing");
    }
    // TODO : fix - video removed after the empty playlist

    const updatedPlaylist = await Playlist.findOneAndUpdate(
        {
            $and: [{ _id: playlistId }, { owner: req.user._id }],
        },
        {
            $pull: {
                videos: videoId,
            },
        },
        { new: true }
    );

    if (!updatedPlaylist) {
        throw new ApiError(
            402,
            "Something went wrong while removing video to playlist"
        );
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedPlaylist,
                "Video successfully removed from the playlist"
            )
        );
});

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!playlistId) {
        throw new ApiError(400, "Playlist id is missing");
    }

    const deletedPlaylist = await Playlist.findOneAndDelete({
        $and: [{ _id: playlistId }, { owner: req.user._id }],
    });

    if (!deletedPlaylist) {
        throw new ApiError(500, "Something went wrong while deleting playlist");
    }

    return res.status(204).end();
});

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description } = req.body;

    const updatedPlaylist = await Playlist.findOneAndUpdate(
        {
            $and: [{ _id: playlistId }, { owner: req.user._id }],
        },
        {
            $set: {
                name,
                description,
            },
        },
        { new: true }
    ).populate("videos");

    if (!updatedPlaylist) {
        throw new ApiError(404, "Something went wrong while updating playlist");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedPlaylist,
                "Playlist updated successfully"
            )
        );
});

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist,
};
