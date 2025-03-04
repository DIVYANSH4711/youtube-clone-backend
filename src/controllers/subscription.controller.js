import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!mongoose.isValidObjectId(channelId))
        throw new ApiError(400, "Invalid channel ID. Please provide a valid channel ID");

    const channel = await User.findById(channelId);
    if (!channel)
        throw new ApiError(404, "Channel not found. Please provide a valid channel ID");

    const existingSubscription = await Subscription.findOne({
        channel: channelId,
        subscriber: req.user._id
    });

    if (existingSubscription) {
        await Subscription.findByIdAndDelete(existingSubscription._id);
        return res.status(200).json(new ApiResponse(200, {}, "Unsubscribed successfully"));
    }

    const subscription = await Subscription.create({
        channel: channelId,
        subscriber: req.user._id
    });

    if (!subscription)
        throw new ApiError(500, "An error occurred while subscribing to the channel");

    return res.status(200).json(new ApiResponse(200, subscription, "Subscribed successfully"));
});


const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    let { page = 1, limit = 10 } = req.query;
    page = Number(page);
    limit = Number(limit);

    if (!mongoose.isValidObjectId(channelId))
        throw new ApiError(400, "Invalid channel ID. Please provide a valid channel ID");

    const channel = await User.findById(channelId);
    if (!channel)
        throw new ApiError(404, "Channel not found. Please provide a valid channel ID");

    const subscribers = await Subscription.aggregate([
        { $match: { channel: new mongoose.Types.ObjectId(channel._id) } },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber"
            }
        },
        { $unwind: "$subscriber" },
        {
            $project: {
                "subscriber.password": 0,
                "subscriber.email": 0,
                "subscriber.createdAt": 0,
                "subscriber.updatedAt": 0,
                "subscriber.refreshToken": 0,
                "subscriber.watchHistory": 0
            }
        },
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit }
    ]);

    return res.status(200).json(new ApiResponse(200, subscribers, "Subscribers fetched successfully"));
});


const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;
    let { page = 1, limit = 10 } = req.query;
    page = Number(page);
    limit = Number(limit);

    if (!mongoose.isValidObjectId(subscriberId))
        throw new ApiError(400, "Invalid subscriber ID. Please provide a valid subscriber ID");

    const user = await User.findById(subscriberId);
    if (!user)
        throw new ApiError(404, "User not found. Please provide a valid user ID");

    const subscriptions = await Subscription.aggregate([
        { $match: { subscriber: new mongoose.Types.ObjectId(user._id) } },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel"
            }
        },
        { $unwind: "$channel" },
        {
            $project: {
                "channel.password": 0,
                "channel.email": 0,
                "channel.createdAt": 0,
                "channel.updatedAt": 0,
                "channel.refreshToken": 0,
                "channel.watchHistory": 0
            }
        },
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit }
    ]);

    if (subscriptions.length === 0)
        throw new ApiError(404, "No subscribed channels found for this user");

    return res.status(200).json(new ApiResponse(200, subscriptions, "Subscribed channels fetched successfully"));
});

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
};
