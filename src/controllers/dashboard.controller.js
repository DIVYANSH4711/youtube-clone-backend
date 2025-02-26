import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { Subscription } from "../models/subscription.model.js"
import { Like } from "../models/like.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const { username } = req.params

    const user = await User.findOne({ username })

    if (!user) throw new ApiError(404, "User not found")

    const totalSubscribers = await Subscription.aggregatePaginate([
        {
            $match: {
                channel: mongoose.Types.ObjectId(user._id),
            }
        },
        {
            $count: "totalSubscribers",
        }
    ])
    const viewsAndTotalVideos = await Video.aggregatePaginate([
        {
            $match: { owner: mongoose.Types.ObjectId(user._id) }
        },
        {
            $facet: {
                totalViews: [
                    {
                        $group: {
                            _id: "$owner",
                            totalViews: { $sum: "$views" }
                        }
                    }
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
                        $group: {
                            _id: "$owner",
                            totalLikes: { $sum: { $size: "$likes" } }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                totalSubscribers,
                totalViews: viewsAndTotalVideos.totalViews[0].totalViews,
                totalVideos: viewsAndTotalVideos.totalVideos[0].totalVideos,
                totalLikes: viewsAndTotalVideos.totalLikes[0].totalLikes
            }
        )
    )

})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const { username } = req.params
    let { page = 1, limit = 10 } = req.query
    limit = Number(limit)
    page = Number(page)
    const user = await User.findOne({ username })

    if (!user)
        throw new ApiError(404, "User not Found")

    const videos = await Video.aggregatePaginate([
        {
            $match: {
                owner: mongoose.Types.ObjectId(user._id),
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
    ])

    return res.status(200).json(
        new ApiResponse(
            200,
            videos.length > 0 ? videos : "No more videos found of this channel"
        )
    )
})

export {
    getChannelStats,
    getChannelVideos
}