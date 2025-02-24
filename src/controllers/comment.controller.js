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
    const { videoId } = req.params
    const { content } = req.body

    if (!ObjectId.isValid(videoId))
        throw new ApiError(
            400,
            "Invalid video id. Please provide a valid video id"
        )

    if (!content)
        throw new ApiError(400, "Comment content is required")

    const video = await Video.findById(videoId)
    if (!video)
        throw new ApiError(404, "Video not found. Please provide a valid video id")

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user._id,
    })

    const createdComment = await Comment.findById(comment._id)

    if (!createdComment)
        throw new ApiError(500, "An error occurred while creating the comment")

    return new ApiResponse(
        201,
        createdComment,
        "Comment created successfully"
    )
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment

    const { commentId } = req.params
    const { content } = req.body

    if (!ObjectId.isValid(commentId))
        throw new ApiError(
            400,
            "Invalid comment id. Please provide a valid comment id"
        )

    const comment = await Comment.findById(commentId);
    if (!comment)
        throw new ApiError(404, "Comment not found. Please provide a valid comment id")

    comment.content = content
    comment.updatedAt = Date.now()
    await comment.save()

    return new ApiResponse(
        200,
        comment,
        "Comment updated successfully"
    )
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params

    if (!ObjectId.isValid(commentId)) {
        throw new ApiError(
            400, 
            "Invalid comment id. Please provide a valid comment id"
        )
    }

    const comment = await Comment.findById(commentId)

    if (!comment) {
        throw new ApiError(
            404, 
            "Comment not found. Please provide a valid comment id"
        )
    }

    await comment.remove()

    return new ApiResponse(
        200,
        null,
        "Comment deleted successfully"
    )
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}
