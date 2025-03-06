import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { Video } from "../models/video.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const { isValidObjectId } = mongoose;
const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    let { page = 1, limit = 10 } = req.query;
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID. Please provide a valid ID.");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found. Please provide a valid video ID.");
    }

    page = parseInt(page);
    limit = parseInt(limit);

    const comments = await Comment.aggregate([
        { $match: { video: new mongoose.Types.ObjectId(videoId) } },
        
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
            },
        },
        { $unwind: "$owner" },
    
        {
            $lookup: {
                from: "likes",
                foreignField: "comment",
                localField: "_id",
                as: "likes",
            },
        },
    
        {
            $addFields: {
                isLiked: {
                    $in: [new mongoose.Types.ObjectId(userId), "$likes.owner"]
                },
                likes: { $size: "$likes" },
            },
        },
    
        {
            $project: {
                _id: 1,
                content: 1,
                createdAt: 1,
                updatedAt: 1,
                "owner.username": 1,
                "owner.avatar": 1,
                "owner._id": 1,
                likes: 1,
                isLiked: 1,
            },
        },
    
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
    ]);
    

    const totalComments = await Comment.countDocuments({ video: videoId });

    return res.status(200).json(
        new ApiResponse(200, { ...comments, }, "Comments retrieved successfully")
    );
});


const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { content } = req.body;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID. Please provide a valid ID.");
    }

    if (!content || content.trim().length === 0) {
        throw new ApiError(400, "Comment content is required.");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found. Please provide a valid video ID.");
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user._id,
    });

    return res.status(201).json(
        new ApiResponse(201, comment, "Comment created successfully")
    );
});

/**
 * Update a comment.
 */
const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID. Please provide a valid ID.");
    }

    if (!content || content.trim().length === 0) {
        throw new ApiError(400, "Comment content cannot be empty.");
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found. Please provide a valid ID.");
    }

    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this comment.");
    }

    comment.content = content;
    await comment.save();

    return res.status(200).json(
        new ApiResponse(200, comment, "Comment updated successfully")
    );
});

/**
 * Delete a comment.
 */
const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID. Please provide a valid ID.");
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found. Please provide a valid ID.");
    }

    if (comment.owner.toString() !== req.user._id.toString() && req.user.role !== "admin") {
        throw new ApiError(403, "You are not authorized to delete this comment.");
    }

    await Comment.deleteOne({ _id: commentId });

    return res.status(200).json(
        new ApiResponse(200, null, "Comment deleted successfully")
    );
});

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment,
};
