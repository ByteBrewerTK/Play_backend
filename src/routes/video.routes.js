import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
    getAllVideosOfUser,
    publishAVideo,
    getVideoById,
    deleteVideo,
    updateVideo,
    togglePublishStatus,
    getAllVideos,
    getLikedVideosOfUser,
} from "../controllers/video.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/").post(publishAVideo);

router.route("/").get(getAllVideos);
router.route("/liked-videos").get(getLikedVideosOfUser);
router.route("/fetch-all-videos/:username").get(getAllVideosOfUser);

router
    .route("/:videoId")
    .get(getVideoById)
    .delete(deleteVideo)
    .patch(updateVideo);

router.route("/toggle/publish/:videoId").patch(togglePublishStatus);

export default router;
