import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    // TODO: toggle subscription
    if (!isValidObjectId(channelId))
        throw new ApiError(
            400,
            "Invalid channel id. Please provide a valid channel id"
        )
    
    const channel = await User.findOne({ _id: channelId })

    if (!channel)
        throw new ApiError(
            404,
            "Channel not found. Please provide a valid channel id"
        )
    
    const ifAlreadySubscribed = await Subscription.findOne({
        channel: channelId,
        subscriber: req.user._id
    })

    if (ifAlreadySubscribed) {
        await Subscription.findByIdAndDelete(ifAlreadySubscribed._id)
        return res
            .status(200)
            .json(new ApiResponse(
                200,
                {},
                "Unsubscribed successfully"
            ))
    }

    const subscription = await Subscription.create({
        channel: channelId,
        subscriber: req.user._id
    })

    if (!subscription)
        throw new ApiError(
                500, 
                "An error occurred while subscribing to the channel"
            )

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                subscription,
                "Subscribed successfully"
            )
        ) 
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    let { page = 1, limit = 10} = req.query
    page = Number(page)
    limit = Number(limit)
    if (!isValidObjectId(channelId))
        throw new ApiError(
            400,
            "Invalid channel id. Please provide a valid channel id"
        )

    const channel = await User.findOne({
        _id: channelId
    })

    if (!channel)
        throw new ApiError(
            404,
            "Channel not found. Please provide a valid channel id"
        )
    
    const subscribers = await Subscription.aggregatePaginate([
        {
            $match: {
                channel: mongoose.Types.ObjectId(channel._id)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",   
                foreignField: "_id",
                as: "subscriber"
            }
        },
        {
            $unwind: "$subscriber"
        },
        {
            $project: {
                "subscriber.password": 0,
                "subscriber.email": 0,
                "subscriber.createdAt": 0,
                "subscriber.updatedAt": 0,
                "subscriber.refreshToken": 0,
                "subscriber.watchHistory": 0,
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
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    let { page = 1, limit = 10 } = req.query
    page = Number(page)
    limit = Number(limit)
    if (!isValidObjectId(subscriberId))
        throw new ApiError(
            400,
            "Invalid subscriber id. Please provide a valid subscriber id"
        )
    
    const user = await User.findById(subscriberId)

    if (!user)
        throw new ApiError(
            404,
            "User not found. Please provide a valid user id"
        )
    
    const subscriptions = await Subscription.aggregatePaginate([
        {
            $match: {
                subscriber: mongoose.Types.ObjectId(user._id)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel"
            }
        },
        {
            $unwind: "$channel"
        },
        {
            $project: {
                "channel.password": 0,
                "channel.email": 0,
                "channel.createdAt": 0,
                "channel.updatedAt": 0,
                "channel.refreshToken": 0,
                "channel.watchHistory": 0,
            }
        },
        {
            $sort: {
                createdAt: -1
            },
        },
        {
            $skip: (page - 1) * limit
        },
        {
            $limit: limit
        }
    ])
    if (!subscriptions)
        throw new ApiError(
            404,
            "No subscribed channels found for this user"
        )
    
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                subscriptions,
                "Subscribed channels fetched successfully"
            )
        )
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}