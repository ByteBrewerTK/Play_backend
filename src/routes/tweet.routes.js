import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
    createTweet,
    deleteTweet,
    getTweetById,
    getUserTweets,
    updateTweet,
} from "../controllers/tweet.controller.js";

const router = Router();

router.use(verifyJWT);
router.route("/").post(createTweet).get(getUserTweets);
router
    .route("/:tweetId")
    .get(getTweetById)
    .patch(updateTweet)
    .delete(deleteTweet);

export default router;
