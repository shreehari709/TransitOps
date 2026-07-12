const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");

const protect = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next(new ApiError(401, "Access denied. No token provided."));
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;

        next();
    } catch (err) {
        return next(new ApiError(401, "Invalid or expired token."));
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new ApiError(
                    403,
                    "You are not authorized to access this resource."
                )
            );
        }

        next();
    };
};

module.exports = {
    protect,
    authorize,
};