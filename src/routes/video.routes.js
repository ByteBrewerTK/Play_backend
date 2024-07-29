import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
    getAllVideosOfUser,
    publishAVideo,
    getVideoById,
    deleteVideo,
    updateVideo,
} from "../controllers/video.controller.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/").post(
    upload.fields([
        {
            name: "thumbnail",
            maxCount: 1,
        },
        {
            name: "videoFile",
            maxCount: 1,
        },
    ]),
    publishAVideo
);

router
    .route("/:videoId")
    .get(getVideoById)
    .delete(deleteVideo)
    .patch(upload.single("thumbnail"), updateVideo);

router.route("/fetch-all-videos").get(getAllVideosOfUser);
router.route("/toggle/publish/:videoId").get(getAllVideosOfUser);

export default router;
