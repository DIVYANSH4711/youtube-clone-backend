import mongoose from "mongoose";
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Toggle like on a video
 */
const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!mongoose.isValidObjectId(videoId))
        throw new ApiError(400, "Invalid video ID. Please provide a valid video ID");

    const video = await Video.findById(videoId);
    if (!video) throw new ApiError(404, "Video not found");

    const existingLike = await Like.findOne({ video: videoId, likedBy: req.user._id });

    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id);
        return res.status(200).json(new ApiResponse(200, {}, "Video unliked successfully"));
    }

    const like = await Like.create({ video: videoId, likedBy: req.user._id });

    if (!like) throw new ApiError(500, "An error occurred while liking the video");

    return res.status(200).json(new ApiResponse(200, like, "Video liked successfully"));
});

/**
 * Toggle like on a comment
 */
const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!mongoose.isValidObjectId(commentId))
        throw new ApiError(400, "Invalid comment ID. Please provide a valid comment ID");

    const comment = await Comment.findById(commentId);
    if (!comment) throw new ApiError(404, "Comment not found");

    const existingLike = await Like.findOne({ comment: commentId, likedBy: req.user._id });

    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id);
        return res.status(200).json(new ApiResponse(200, {}, "Comment unliked successfully"));
    }

    const like = await Like.create({ comment: commentId, likedBy: req.user._id });

    if (!like) throw new ApiError(500, "An error occurred while liking the comment");

    return res.status(200).json(new ApiResponse(200, like, "Comment liked successfully"));
});

/**
 * Toggle like on a tweet
 */
const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!mongoose.isValidObjectId(tweetId))
        throw new ApiError(400, "Invalid tweet ID. Please provide a valid tweet ID");

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) throw new ApiError(404, "Tweet not found");

    const existingLike = await Like.findOne({ tweet: tweetId, likedBy: req.user._id });

    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id);
        return res.status(200).json(new ApiResponse(200, {}, "Tweet unliked successfully"));
    }

    const like = await Like.create({ tweet: tweetId, likedBy: req.user._id });

    if (!like) throw new ApiError(500, "An error occurred while liking the tweet");

    return res.status(200).json(new ApiResponse(200, like, "Tweet liked successfully"));
});

/**
 * Get all liked videos of a user
 */
const getLikedVideos = asyncHandler(async (req, res) => {
    let { limit = 9, page = 1 } = req.query;
    limit = Number(limit);
    page = Number(page);

    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user._id),
                video: { $ne: null }
            }
        },
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videoDetails"
            }
        },
        { $unwind: "$videoDetails" },
        {
            $lookup: {
                from: "users",
                localField: "videoDetails.owner",
                foreignField: "_id",
                as: "ownerDetails"
            }
        },
        { $unwind: "$ownerDetails" },
        {
            $project: {
                _id: "$videoDetails._id",
                title: "$videoDetails.title",
                description: "$videoDetails.description",
                views: "$videoDetails.views",
                createdAt: "$videoDetails.createdAt",
                thumbnail: "$videoDetails.thumbnail",
                owner: {
                    fullName: "$ownerDetails.fullName",
                    avatar: "$ownerDetails.avatar"
                }
            }
        }
    ]);

    return res.status(200).json(new ApiResponse(200, likedVideos, "Liked videos retrieved successfully"));
});


export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
};
