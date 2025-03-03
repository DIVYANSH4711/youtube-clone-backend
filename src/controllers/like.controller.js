import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { Video } from "../models/video.model.js"
import { Comment } from "../models/comment.model.js"
import { Tweet } from "../models/tweet.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: toggle like on video
    if (!isValidObjectId(videoId))
        throw new ApiError(
            400,
            "Invalid video id. Please provide a valid video id"
        )

    const video = await Video.findOne({ _id: videoId })
    if (!video)
        throw new ApiError(
            404,
            "Video not found. Please provide a valid video id"
        )


    const ifAlreadyLiked = await Like.findOne({
        video: videoId,
        likedBy: req.user._id
    })

    if (ifAlreadyLiked) {
        await Like.findByIdAndDelete(ifAlreadyLiked._id)
        return res
            .status(200)
            .json(new ApiResponse(
                200,
                {},
                "Video unliked successfully"
            ))
    }
    const like = await Like.create(
        {
            video: videoId,
            likedBy: mongoose.Types.ObjectId(req.user._id)
        }
    )

    if (!like)
        throw new ApiError(500, "An error occurred while liking the video")

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                like,
                "Video liked successfully"
            )
        )
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    //TODO: toggle like on comment
    if (!isValidObjectId(commentId))
        throw new ApiError(
            400,
            "Invalid comment id. Please provide a valid comment id"
        )
    const comment = await Comment.findOne({ _id: commentId })
    if (!comment)
        throw new ApiError(
            404,
            "Comment not found. Please provide a valid comment id"
        )

    const ifAlreadyLiked = await Like.findOne({
        comment: commentId,
        likedBy: req.user._id
    })

    if (ifAlreadyLiked) {
        await Like.findByIdAndDelete(ifAlreadyLiked._id)
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    {},
                    "Comment unliked successfully"
                )
            )
    }
    const like = await Like.create(
        {
            comment: commentId,
            likedBy: req.user._id
        }
    )

    if (!like)
        throw new ApiError(500, "An error occurred while liking the comment")

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                like,
                "Comment liked successfully"
            )
        )

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    //TODO: toggle like on tweet
    if (!isValidObjectId(tweetId))
        throw new ApiError(
            400,
            "Invalid tweet id. Please provide a valid tweet id"
        )
    const tweet = await Tweet.findOne({ _id: tweetId })
    if (!tweet)
        throw new ApiError(
            404,
            "Tweet not found. Please provide a valid tweet id"
        )

    const ifAlreadyLiked = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user._id
    })

    if (ifAlreadyLiked) {
        await Like.findByIdAndDelete(ifAlreadyLiked._id)
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    {},
                    "Tweet unliked successfully"
                )
            )
    }
    const like = await Like.create(
        {
            tweet: tweetId,
            likedBy: req.user._id
        }
    )

    if (!like)
        throw new ApiError(500, "An error occurred while liking the tweet")

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                like,
                "Tweet liked successfully"
            )
        )
})

const getLikedVideos = asyncHandler(async (req, res) => {
    let { limit = 10, page = 1 } = req.query; // Default values fixed
    limit = Number(limit);
    page = Number(page);

    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user._id),
                video: { $ne: null }
            }
        },
        {
            $sort: { createdAt: -1 }
        },
        {
            $skip: (page - 1) * limit
        },
        {
            $limit: limit
        },
        {
            $lookup: {
                from: "videos", 
                localField: "video",
                foreignField: "_id",
                as: "videoDetails"
            }
        },
        {
            $unwind: "$videoDetails"
        }
    ]);

    if (!likedVideos.length)
        throw new ApiError(404, "No liked videos found");

    return res
        .status(200)
        .json(new ApiResponse(
            200, 
            likedVideos, 
            "Liked videos retrieved successfully"
        ));
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}