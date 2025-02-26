import mongoose, { isValidObjectId, mongo } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { Like } from "../models/like.model.js"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body
    // TODO: get video, upload to cloudinary, create video
    if (!title)
        throw new ApiError(400, "Title is required")

    if (!req.files || !req.files.videoFile || !req.files.thumbnail)
        throw new ApiError(400, "Video File and Thumbnail is required")

    if (req.files.videoFile[0].path && req.files.thumbnail[0].path) {
        const videoFile = req.files.videoFile[0].path
        const thumbnail = req.files.thumbnail[0].path

        const videoUrl = await uploadOnCloudinary(videoFile)
        const thumbnailUrl = await uploadOnCloudinary(thumbnail)

        if (!videoUrl || !thumbnailUrl)
            throw new ApiError(500, "Error uploading video or thumbnail")

        const video = await Video.create({
            videoFile: videoUrl,
            thumbnail: thumbnailUrl,
            title,
            description,
            duration: videoUrl.duration,
            owner: req.user._id
        })

        return res
            .status(201)
            .json(
                new ApiResponse(
                    201,
                    video,
                    "Video published Successfully"
                )
            )
    }
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    if (!isValidObjectId(videoId))
        throw new ApiError(400, "Invalid VideoID")

    const video = await Video.aggregate([
        {
            $match: {
                _id: mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "likes",
                foreignField: "video",
                localField: "_id",
                as: "Likes"
            }
        },
        {
            $addFields: {
                Likes: { $size: "$Likes" }  
            }
        }
    ]);

    if (!video)
        throw new ApiError(404, "Video Not found with given VideoID")
    await Video
        .findByIdAndUpdate(videoId, { $inc: { views: 1 } })
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                video,
                "Video fetched Successfully"
            )
        )
    
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid Video ID");

    const video = await Video.findById(videoId);
    if (!video) throw new ApiError(404, "Video not found");

    if (video.owner.toString() !== req.user._id.toString())
        throw new ApiError(403, "You are not authorized to update this video");

    let thumbnailUrl = video.thumbnail; // Keep existing thumbnail if not updated
    if (req.file && req.file.path) {
        thumbnailUrl = await uploadOnCloudinary(req.file.path);
        if (!thumbnailUrl) throw new ApiError(500, "Error uploading thumbnail");
    }

    video.thumbnail = thumbnailUrl;
    await video.save();

    return res.status(200).json(new ApiResponse(200, video, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

    if (!isValidObjectId(videoId))
        throw new ApiError(400, "Invalid VideoID")

    const video = await Video.findById(videoId)

    if (!video)
        throw new ApiError(404, "Video Not found with given VideoID")

    if (video.owner.toString() !== req.user._id.toString())
        throw new ApiError(403, "You are not authorized to delete this video")

    await Like.deleteMany({ video: mongoose.Types.ObjectId(videoId) })

    const comments = await Comment.find({ video: mongoose.Types.ObjectId(videoId) })

    for (const comment of comments) {
        await Like.deleteMany({ comment: mongoose.Types.ObjectId(comment._id) })
    }

    await Comment.deleteMany({ video: mongoose.Types.ObjectId(videoId) })

    await Video.findByIdAndDelete(videoId)

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Video deleted Successfully"
            )
        )
})



export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
}
