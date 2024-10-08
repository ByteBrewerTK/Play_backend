import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { getLikedVideos, toggleLike } from "../controllers/like.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/").get(getLikedVideos);
router.route("/toggle/:entityType/:entityId").patch(toggleLike);

export default router;
