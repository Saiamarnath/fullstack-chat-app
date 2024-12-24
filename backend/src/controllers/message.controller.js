import Message from "../models/message.model.js";
import User from "../models/user.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import mongoose from "mongoose";

export const getUsersForSidebar = async (req,res) =>{
    try {
        const loggedInUserId = req.user._id;
        const filteredUsers = await User.find({_id:{$ne:loggedInUserId}}).select("-password");

        res.status(200).json(filteredUsers);
    } catch (error) {
        console.log("Error in getUsersForSidebar controller",error.message);
        res.status(500).json({ success:false, message:"Internal server error"});     
    }

};

export const getMessages = async (req, res) => {
    try {
      const { id: userToChatId } = req.params;
      
      if (!req.user || !req.user._id) {
        return res.status(401).json({ error: "Unauthorized - Missing user information" });
      }
      const myId = req.user._id;
      
  
      if (!mongoose.Types.ObjectId.isValid(userToChatId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
  
      const messages = await Message.find({
        $or: [
          { senderId: myId, receiverId: userToChatId },
          { senderId: userToChatId, receiverId: myId },
        ],
      });
  
      res.status(200).json(messages);
    } catch (error) {
      console.log("Error in getMessages controller: ", error.message);
      res.status(500).json({ error: "Internal server error" });
    }
  };
  

  export const sendMessage = async (req, res) => {
    try {
        const { text, image } = req.body;
        const { id: receiverId } = req.params;
        const senderId = req.user?._id;

        // Validate user authentication
        if (!senderId) {
            return res.status(401).json({ error: "Unauthorized - Missing user information" });
        }

        // Validate receiverId
        if (!mongoose.Types.ObjectId.isValid(receiverId)) {
            return res.status(400).json({ error: "Invalid receiver ID" });
        }

        // Validate message content
        if (!text?.trim() && !image) {
            return res.status(400).json({ error: "Message must contain text or an image" });
        }

        let imageUrl;
        if (image) {
            try {
                const uploadResponse = await cloudinary.uploader.upload(image);
                imageUrl = uploadResponse.secure_url;
            } catch (uploadError) {
                console.error("Error uploading image to Cloudinary:", uploadError.message);
                return res.status(500).json({ error: "Failed to upload image" });
            }
        }

        const newMessage = new Message({
            senderId,
            receiverId,
            text: text?.trim(),
            image: imageUrl,
        });

        await newMessage.save();

        // Emit message to receiver's socket if online
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
        }

        res.status(201).json(newMessage);
    } catch (error) {
        console.error("Error in sendMessage controller:", error.message, error.stack);
        res.status(500).json({ error: "Internal server error" });
    }
};
