import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
    addVideoToPlaylist,
    createPlaylist,
    deletePlaylist,
    getPlaylistById,
    getUserPlaylists,
    removeVideoFromPlaylist,
    updatePlaylist,
} from "../controllers/playlist.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/:privacyType").post(createPlaylist);
router
    .route("/:playlistId")
    .get(getPlaylistById)
    .patch(updatePlaylist)
    .delete(deletePlaylist);

router
    .route("/:playlistId/:videoId")
    .patch(addVideoToPlaylist)
    .delete(removeVideoFromPlaylist);

router.route("/user/:userId").get(getUserPlaylists);

export default router;
