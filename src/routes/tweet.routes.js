import { Router } from 'express';
import {
    createTweet,
    deleteTweet,
    getGlobalTweets,
    getUserTweets,
    updateTweet,
    userFollowingTweet,
} from "../controllers/tweet.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/").post(createTweet);
router.route("/user/:userId").get(getUserTweets);
router.route("/following").get(userFollowingTweet)
router.route("/global").get(getGlobalTweets)
router.route("/:tweetId").patch(updateTweet).delete(deleteTweet);

export default router