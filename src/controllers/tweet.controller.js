import mongoose from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const { isValidObjectId } = mongoose;

const createTweet = asyncHandler(async (req, res) => {
    if (!req.user || !req.user._id) throw new ApiError(401, "Unauthorized");

    const { content } = req.body;
    if (!content) throw new ApiError(400, "Content is required");

    const tweet = await Tweet.create({
        content,
        owner: req.user._id
    });

    if (!tweet) throw new ApiError(500, "An error occurred while creating tweet");

    return res.status(201).json(new ApiResponse(201, tweet, "Tweet created successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
    let { page = 1, limit = 9 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const { username } = req.params;
    if (!username.trim()) throw new ApiError(400, "Username is required");

    const user = await User.findOne({ username });
    if (!user) throw new ApiError(404, "User not found");

    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(user._id)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likes"
            }
        },
        {
            $addFields: {
                likes: {
                    $size: "$likes"
                }
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $skip: (page - 1) * limit
        },
        {
            $limit: limit
        }
    ])

    if (!tweets.length) throw new ApiError(404, "No tweets found");

    return res.status(200).json(new ApiResponse(200, tweets));
});

const updateTweet = asyncHandler(async (req, res) => {
    if (!req.user || !req.user._id) throw new ApiError(401, "Unauthorized");

    const { tweetId } = req.params;
    if (!isValidObjectId(tweetId)) throw new ApiError(400, "Invalid tweet id");

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) throw new ApiError(404, "Tweet not found");

    if (tweet.owner.toString() !== req.user._id.toString()) 
        throw new ApiError(403, "You are not authorized to update this tweet");

    const { content } = req.body;
    if (!content) throw new ApiError(400, "Content is required");

    tweet.content = content;
    await tweet.save();

    return res.status(200).json(new ApiResponse(200, tweet, "Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
    if (!req.user || !req.user._id) throw new ApiError(401, "Unauthorized");

    const { tweetId } = req.params;
    if (!isValidObjectId(tweetId)) throw new ApiError(400, "Invalid tweet id");

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) throw new ApiError(404, "Tweet not found");

    if (tweet.owner.toString() !== req.user._id.toString()) 
        throw new ApiError(403, "You are not authorized to delete this tweet");

    await Tweet.findByIdAndDelete(tweetId);

    return res.status(200).json(new ApiResponse(200, {}, "Tweet deleted successfully"));
});

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
};
