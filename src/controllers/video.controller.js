import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { Subscription } from "../models/subscription.model.js";

const getAllVideos = asyncHandler(async (req, res) => {
    let { page = 1, limit = 10, query = "", sortBy = "createdAt", sortType = "desc", userId } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const filter = {};
    if (query) filter.title = { $regex: query, $options: "i" };
    if (userId && mongoose.isValidObjectId(userId)) filter.owner = userId;

    const sortOrder = sortType === "asc" ? 1 : -1;
    const videos = await Video.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("owner", "name email");

    const totalVideos = await Video.countDocuments(filter);

    return res.status(200).json(new ApiResponse(200, { videos, totalVideos, page, limit }, "Videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    if (!title) throw new ApiError(400, "Title is required");
    if (!req.files || !req.files.videoFile || !req.files.thumbnail)
        throw new ApiError(400, "Video File and Thumbnail are required");

    const videoFilePath = req.files.videoFile[0].path;
    const thumbnailPath = req.files.thumbnail[0].path;

    const videoUpload = await uploadOnCloudinary(videoFilePath);
    const thumbnailUpload = await uploadOnCloudinary(thumbnailPath);

    if (!videoUpload || !videoUpload.url || !thumbnailUpload || !thumbnailUpload.url)
        throw new ApiError(500, "Error uploading video or thumbnail");

    const video = await Video.create({
        videoFile: videoUpload.url,
        thumbnail: thumbnailUpload.url,
        title,
        description,
        duration: videoUpload.duration || 0,
        owner: req.user._id,
    });

    return res.status(201).json(new ApiResponse(201, video, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!mongoose.isValidObjectId(videoId)) throw new ApiError(400, "Invalid Video ID");

    const video = await Video.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(videoId) } },
    
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
            },
        },
        {
            $addFields: {
                isLiked: {
                    $in: [new mongoose.Types.ObjectId(req.user._id),
                        {
                            $map: {
                                input: "$likes",
                                as: "like",
                                in: "$$like.likedBy"
                            }
                        }
                    ]
                },
                likes: { $size: "$likes" }, 
            },
        },
    
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "owner",
                as: "owner",
            },
        },
        { $unwind: "$owner" },
    
        {
            $lookup: {
                from: "subscriptions",
                foreignField: "channel", 
                localField: "owner._id",
                as: "owner.subscribers",
            },
        },
    
        {
            $addFields: {
                "owner.subscriberCount": { $size: "$owner.subscribers" },
            },
        },
    
        {
            $project: {
                "owner.password": 0,
                "owner.createdAt": 0,
                "owner.updatedAt": 0,
                "owner.watchHistory": 0,
                "owner.refreshToken": 0,
                "owner.subscribers": 0, 
            },
        },
    ]);
    

    if (!video || video.length === 0) throw new ApiError(404, "Video not found");

    const Subscribed = await Subscription.findOne({ channel: video[0].owner._id, subscriber: req.user._id });
    const user = await User.findById(req.user._id);
    if (!user.watchHistory.includes(videoId)) {
        user.watchHistory.push(videoId);
        await user.save();
    }
    await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });

    return res.status(200).json(new ApiResponse(200, {...video[0], isSubscribed: Subscribed ? true : false }, "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!mongoose.isValidObjectId(videoId)) throw new ApiError(400, "Invalid Video ID");

    const video = await Video.findById(videoId);
    if (!video) throw new ApiError(404, "Video not found");

    if (video.owner.toString() !== req.user._id.toString())
        throw new ApiError(403, "You are not authorized to update this video");

    let thumbnailUrl = video.thumbnail;
    if (req.file && req.file.path) {
        const uploadResponse = await uploadOnCloudinary(req.file.path);
        if (!uploadResponse || !uploadResponse.url) throw new ApiError(500, "Error uploading thumbnail");
        thumbnailUrl = uploadResponse.url;
    }

    video.thumbnail = thumbnailUrl;
    await video.save();

    return res.status(200).json(new ApiResponse(200, video, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!mongoose.isValidObjectId(videoId)) throw new ApiError(400, "Invalid Video ID");

    const video = await Video.findById(videoId);
    if (!video) throw new ApiError(404, "Video not found");

    if (video.owner.toString() !== req.user._id.toString())
        throw new ApiError(403, "You are not authorized to delete this video");

    await Like.deleteMany({ video: videoId });

    const comments = await Comment.find({ video: videoId });
    for (const comment of comments) {
        await Like.deleteMany({ comment: comment._id });
    }

    await Comment.deleteMany({ video: videoId });
    await Video.findByIdAndDelete(videoId);

    return res.status(200).json(new ApiResponse(200, {}, "Video deleted successfully"));
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
};
