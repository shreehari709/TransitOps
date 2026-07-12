const User = require("../models/User");
const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");

class AuthService {

    async register(userData){

        const { email } = userData;

        const existingUser = await User.findOne({ email });

        if(existingUser){
            throw new ApiError(
    409,
    "Email already registered"
);
        }

        const user = await User.create(userData);

        return {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        };

    }

    async login(email, password) {

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
        throw new Error("Invalid email or password");
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
        throw new Error("Invalid email or password");
    }

    const token = this.generateToken(user);

    return {
        token,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        },
    };
}

    generateToken(user){

    return jwt.sign(

        {
            id:user._id,
            role:user.role
        },

        process.env.JWT_SECRET,

        {
            expiresIn:"1d"
        }

    );

}

}

module.exports = new AuthService();