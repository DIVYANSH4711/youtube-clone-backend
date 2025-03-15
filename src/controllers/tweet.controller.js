import mongoose from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Subscription } from "../models/subscription.model.js";

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

    const responseTweet = await Tweet.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(tweet._id) } // ✅ Corrected Match
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "owner",
                as: "owner"
            }
        },
        {
            $unwind: "$owner",
        }, 
    ]);

    return res.status(201).json(new ApiResponse(201, responseTweet[0], "Tweet created successfully"));
});


const getUserTweets = asyncHandler(async (req, res) => {
    let { page = 1, limit = 9 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    
    const { userId } = req.params
    console.log(userId)
    console.log("in getUserTweets")
    if (!mongoose.isValidObjectId(userId))
        throw new ApiError(
            200,
            "Invalid userId"
        )

    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    const tweets = await Tweet.aggregate([
        {
            $match: { owner: new mongoose.Types.ObjectId(user._id) }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $unwind: "$owner"
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
                likes: { $size: "$likes" },  
                isLiked: {
                    $in: [new mongoose.Types.ObjectId(userId), "$likes.likedBy"] // Check if the user has liked the tweet
                }
            }
        },
        {
            $project: {
                _id: 1,
                content: 1,
                createdAt: 1,
                likes: 1,
                isLiked: 1,
                owner: {
                    username: "$owner.username",
                    avatar: "$owner.avatar"
                }
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
        }
    ]);

    return res.status(200).json(new ApiResponse(200, tweets, "Fetched user tweets"));
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

const userFollowingTweet = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    console.log(userId)
    console.log("in User Following tweets")
    if (!mongoose.isValidObjectId(userId))
        throw new ApiError(400, "Invalid user ID");

    const user = await User.findById(userId);
    if (!user)
        throw new ApiError(404, "User Not Found in UserFollowing Tweet");

    let { page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const tweets = await Subscription.aggregate([
        {
            $match: { subscriber: new mongoose.Types.ObjectId(userId) }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "owner"
            }
        },
        { $unwind: "$owner" },
        {
            $lookup: {
                from: "tweets",
                localField: "owner._id",
                foreignField: "owner",
                as: "Followingtweets"
            }
        },
        { $unwind: "$Followingtweets" },
        {
            $lookup: {
                from: "likes",
                localField: "Followingtweets._id",
                foreignField: "tweet",
                as: "likes"
            }
        },
        {
            $addFields: {
                isLiked: {
                    $gt: [
                        {
                            $size: {
                                $filter: {
                                    input: "$likes",
                                    as: "like",
                                    cond: { 
                                        $eq: ["$$like.likedBy", new mongoose.Types.ObjectId(userId)] 
                                    }
                                }
                            }
                        },
                        0
                    ]
                },
                likes: { $size: "$likes" }
            }
        },
        {
            $project: {
                _id: "$Followingtweets._id",
                content: "$Followingtweets.content",
                createdAt: "$Followingtweets.createdAt",
                likes: 1,
                isLiked: 1,
                owner: {
                    username: "$owner.username",
                    avatar: "$owner.avatar"
                }
            }
        },
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit }
    ]);

    return res.status(200).json(new ApiResponse(200, tweets, "Fetched tweets of subscribed users"));
});




const getGlobalTweets = asyncHandler(async (req, res) => {
    let { page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const userId = req.user?._id; // Get logged-in user's ID

    const tweets = await Tweet.aggregate([
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
            }
        },
        {
            $unwind: "$ownerDetails"
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
                likesCount: { $size: "$likes" },
                isLiked: userId
                    ? {
                        $in: [
                            new mongoose.Types.ObjectId(userId), // Convert userId to ObjectId
                            {
                                $map: {
                                    input: "$likes",
                                    as: "like",
                                    in: "$$like.likedBy"
                                }
                            }
                        ]
                    }
                    : false
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
        },
        {
            $project: {
                _id: 1,
                content: 1,
                createdAt: 1,
                likes: "$likesCount",
                isLiked: 1,
                owner: {
                    username: "$ownerDetails.username",
                    avatar: "$ownerDetails.avatar"
                }
            }
        }
    ]);

    return res.status(200).json({ success: true, data: tweets });
});



export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet,
    userFollowingTweet,
    getGlobalTweets
};
