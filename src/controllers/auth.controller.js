import jwt from 'jsonwebtoken'
import User from '../models/user.model.js'
import asyncHandler from '../utils/asyncHandler.js'
import { compare } from 'bcryptjs'
import crypto from 'crypto'
import sendEmail from '../utils/sendEmail.js'

// Helper - generate and sign a JWT
const signToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    )
}

// Helper - send token response consistently
const sendTokenResponse = (user, statusCode, res) => {
    const token = signToken(user._id)

    // Remove password from output even if somehow selected
    user.password = undefined

    res.status(statusCode).json({
        success: true,
        token,
        data: user
    })
}

// @desc Register a new user
// @route POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body

    // Prevent clients from self-assigning admin role
    const user = await User.create({
        name,
        email,
        password,
        role: role === 'admin' ? 'user' : (role || 'user')
    })

    sendTokenResponse(user, 201, res)
})

// @desc Login user
// @route POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body

    // Validate input exists
    if (!email || !password) {
        const error = new Error('Please provide email and password')
        error.statusCode = 400
        throw error
    }

    // Explicitly select password since it's select:false on the schema
    const user = await User.findOne({ email }).select('+password')

    if (!user) {
        const error = new Error('Invalid credentials')
        error.statusCode = 401
        throw error
    }

    const isPasswordCorrect = await compare(password, user.password)

    if (!isPasswordCorrect) {
        const error = new Error('Invalid credentials')
        error.statusCode = 401
        throw error
    }

    sendTokenResponse(user, 200, res)
})

// @desc Get current logged in user
// @route GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
    // req.user is set by the protect middleware
    const user = await User.findById(req.user.id)

    res.status(200).json({
        success: true,
        data: user
    })
})

// @desc    Forgot password — generate token and send email
// @route   POST /api/auth/forgot-password
export const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        const error = new Error('Please provide your email address');
        error.statusCode = 400;
        throw error;
    }

    const user = await User.findOne({ email });

    // Always respond with 200 even if user not found
    // This prevents email enumeration attacks
    if (!user) {
        return res.status(200).json({
            success: true,
            message: 'If an account with that email exists, a reset link has been sent',
        });
    }

    // Generate token and save hashed version to DB
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Build reset URL — this goes into the email
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Password Reset Request</h2>
      <p>Hi ${user.name},</p>
      <p>You requested a password reset for your KSM Apparel account.</p>
      <p>Click the button below to reset your password. This link expires in <strong>10 minutes</strong>.</p>
      <a 
        href="${resetUrl}" 
        style="
          display: inline-block;
          padding: 12px 24px;
          background-color: #000;
          color: #fff;
          text-decoration: none;
          border-radius: 4px;
          margin: 16px 0;
        "
      >
        Reset Password
      </a>
      <p>If you did not request this, please ignore this email. Your password will remain unchanged.</p>
      <p style="color: #999; font-size: 12px;">This link will expire in 10 minutes.</p>
    </div>
  `;

    try {
        await sendEmail({
            to: user.email,
            subject: 'KSM Apparel — Password Reset Request',
            html,
        });

        res.status(200).json({
            success: true,
            message: 'If an account with that email exists, a reset link has been sent',
        });
    } catch (err) {
        // If email fails, clear the reset token so user can try again
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        const error = new Error('Email could not be sent. Please try again later.');
        error.statusCode = 500;
        throw error;
    }
});

// @desc    Reset password using token
// @route   PATCH /api/auth/reset-password/:token
export const resetPassword = asyncHandler(async (req, res) => {
    const { password } = req.body;

    if (!password || password.length < 6) {
        const error = new Error('Password must be at least 6 characters');
        error.statusCode = 400;
        throw error;
    }

    // Hash the incoming raw token to compare with stored hash
    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    // Find user with matching token that has not expired yet
    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    }).select('+password');

    if (!user) {
        const error = new Error('Reset token is invalid or has expired');
        error.statusCode = 400;
        throw error;
    }

    // Set new password — pre-save hook will hash it
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Log the user in immediately after reset
    sendTokenResponse(user, 200, res);
});