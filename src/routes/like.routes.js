import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { getLikedVideos, toggleLike } from "../controllers/like.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/").get(getLikedVideos);
router.route("/:entityType/:entityId").post(toggleLike);

export default router;
