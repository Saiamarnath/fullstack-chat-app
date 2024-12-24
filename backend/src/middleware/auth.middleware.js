import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
    try {
        // Retrieve the JWT token from cookies
        const token = req.cookies?.jwt;

        // Check if the token exists
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: "Unauthorized - No token provided." 
            });
        }

        // Verify the token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized - Invalid or expired token.",
            });
        }

        // Ensure the decoded token contains a valid `userId`
        if (!decoded?.userId) {
            return res.status(400).json({
                success: false,
                message: "Invalid token payload - Missing userId.",
            });
        }

        // Find the user by ID and exclude the password field
        const user = await User.findById(decoded.userId).select("-password");
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: "User not found." 
            });
        }

        // Attach the user to the request object
        req.user = user;

        // Proceed to the next middleware or route handler
        next();
    } catch (error) {
        console.error("Error in protectRoute middleware:", error.message);
        res.status(500).json({ 
            success: false, 
            message: "Server Error - An error occurred while protecting the route." 
        });
    }
};
