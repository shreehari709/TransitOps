const authService = require("../services/auth.service");

const asyncHandler =
require("../utils/asyncHandler");

const User = require("../models/User");

const me = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select("-password");

    res.status(200).json({
        success: true,
        user,
    });
});

const register = asyncHandler(

async(req,res)=>{

    const user =
    await authService.register(req.body);

    res.status(201).json({

        success:true,

        data:user

    });

});

const login = asyncHandler(

async(req,res)=>{

    const {email,password}=req.body;

    const result =
    await authService.login(email,password);

    res.status(200).json({

        success:true,

        data:result

    });

});

module.exports = {
    register,
    login,
    me,
};