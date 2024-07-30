import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware";
import {
    getSubscribedChannels,
    toggleSubscription,
} from "../controllers/subscription.controller";

const router = Router();

router.use(verifyJWT);

router.route("/").get(getSubscribedChannels);
router
    .route("/channel/:channelId")
    .post(toggleSubscription)
    .get(getUserChannelSubscribers);
