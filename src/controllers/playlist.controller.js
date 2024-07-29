import { Playlist } from "../model/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    if (!(name || description)) {
        throw new ApiError(400, "Playlist name field is required");
    }

    const playlist = await Playlist.create({
        name,
        description,
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

    const playlists = await Playlist.find({ owner: userId });
    if (!playlist) {
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

    const playlist = await Playlist.findOne({
        $and: [{ _id: playlistId }, { owner: req.user.id }],
    });

    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!(playlistId && videoId)) {
        throw new ApiError(400, "Playlist or videoId is missing");
    }

    const updatedPlaylist = await Playlist.updateOne(
        {
            $and: [{ _id: playlistId }, { owner: req.user._id }],
        },
        {
            $push: {
                videos: videoId,
            },
        }
    );

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

    const updatedPlaylist = await Playlist.updateOne(
        {
            $and: [{ _id: playlistId }, { owner: req.user._id }],
        },
        {
            $pop: {
                videos: videoId,
            },
        }
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
    console.log("deletedPlaylist : ", deletedPlaylist);

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
        }
    );

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
