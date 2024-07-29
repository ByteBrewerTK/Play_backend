import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware";
import {
    addVideoToPlaylist,
    createPlaylist,
    deletePlaylist,
    getPlaylistById,
    getUserPlaylists,
    updatePlaylist,
} from "../controllers/playlist.controller";

const router = Router();

router.use(verifyJWT);

router.route("/").post(createPlaylist);
router
    .route("/:playlistId")
    .get(getPlaylistById)
    .patch(updatePlaylist)
    .delete(deletePlaylist);

router
    .route("/:playlistId/:videoId")
    .patch(addVideoToPlaylist)
    .delete(addVideoToPlaylist);

router.route("/user/:userId").get(getUserPlaylists);
