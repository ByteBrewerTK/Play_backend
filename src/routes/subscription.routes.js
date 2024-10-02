import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
    getSubscribedChannels,
    getSubscriptionVideos,
    getUserChannelSubscribers,
    toggleSubscription,
} from "../controllers/subscription.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/").get(getSubscribedChannels);
router
    .route("/channel/:channelId")
    .patch(toggleSubscription)
    .get(getUserChannelSubscribers);

router.route("/videos").get(getSubscriptionVideos);

export default router;
