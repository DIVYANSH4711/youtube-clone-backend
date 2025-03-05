import mongoose from "mongoose"
import { Video } from "../models/video.model.js"
import { Subscription } from "../models/subscription.model.js"
import { Like } from "../models/like.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    const { userId } = req.params
    if (!mongoose.isValidObjectId(userId)) throw new ApiError(400, "Invalid user ID. Please provide a valid ID.")
    const user = await User.findById(userId)

    if (!user) throw new ApiError(404, "User not found")

    // Get total subscribers count
    const totalSubscribers = await Subscription.aggregate([
        { $match: { channel: new mongoose.Types.ObjectId(user._id) } },
        { $count: "totalSubscribers" }
    ])

    // Get total views, videos, and likes
    const viewsAndTotalVideos = await Video.aggregate([
        {
            $match: { owner: new mongoose.Types.ObjectId(user._id) }
        },
        {
            $facet: {
                totalViews: [
                    { $group: { _id: null, totalViews: { $sum: "$views" } } }
                ],
                totalVideos: [
                    { $count: "totalVideos" }
                ],
                totalLikes: [
                    {
                        $lookup: {
                            from: "likes",
                            localField: "_id",
                            foreignField: "video",
                            as: "likes"
                        }
                    },
                    {
                        $addFields: { likeCount: { $size: "$likes" } }
                    },
                    {
                        $group: { _id: null, totalLikes: { $sum: "$likeCount" } }
                    }
                ]
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200, {
            totalSubscribers: totalSubscribers?.[0]?.totalSubscribers || 0,
            totalViews: viewsAndTotalVideos?.[0]?.totalViews?.[0]?.totalViews || 0,
            totalVideos: viewsAndTotalVideos?.[0]?.totalVideos?.[0]?.totalVideos || 0,
            totalLikes: viewsAndTotalVideos?.[0]?.totalLikes?.[0]?.totalLikes || 0
        })
    )
})

const getChannelVideos = asyncHandler(async (req, res) => {
    const { userId } = req.params
    if (!mongoose.isValidObjectId(userId)) throw new ApiError(400, "Invalid user ID. Please provide a valid ID.")
    let { page = 1, limit = 10 } = req.query
    limit = Number(limit)
    page = Number(page)

    const user = await User.findById(userId)

    if (!user) throw new ApiError(404, "User not found")

    const videos = await Video.aggregate([
        { $match: { owner: new mongoose.Types.ObjectId(user._id) } },
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit }
    ])

    return res.status(200).json(
        new ApiResponse(200, videos.length > 0 ? videos : "No more videos found for this channel")
    )
})


export {
    getChannelStats,
    getChannelVideos
}
