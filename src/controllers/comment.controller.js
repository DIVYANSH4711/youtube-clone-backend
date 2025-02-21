import mongoose, { ObjectId } from "mongoose"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query
    if (!ObjectId.isValid(videoId))
        throw new ApiError(
            400,
            "Invalid video id. Please provide a valid video id"
        )
    const video = await Video.findById(videoId);
    if (!video)
        throw new ApiError(404, "Video not found. Please provide a valid video id")

    const comments = await Comment.aggregatePaginate([
        {
            $match: {
                video: mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localfield: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $unwind: "$owner",
        }, 
        {
            $project: {
                "owner.username": 1,
                "content": 1,
                "createdAt": 1,
                "updatedAt": 1,
                "owner.avatar": 1,
                "owner._id": 1,
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
            $limit: limit,
        }
    ])

    if (!comments)
        throw new ApiError(404, "No comments found for this video")

    return new ApiResponse(
        200,
        comments,
        "Comments retrieved successfully"
    )
})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}
