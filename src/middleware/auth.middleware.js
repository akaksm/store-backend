import jwt from 'jsonwebtoken'
import User from '../models/user.model.js'
import asyncHandler from '../utils/asyncHandler.js'

// Protect - verifies the jwt and attaches user to req
export const protect = asyncHandler(async (req, res, next) => {

    let token

    // Token must come in Authorization header as: Bearer <token>
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1]
    }

    if (!token) {
        const error = new Error('Not authorized, no token provided')
        error.statusCode = 401
        throw error
    }

    // Verify signature and expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Check the user still exists in DB
    const currentUser = await User.findById(decoded.id)

    if (!currentUser) {
        const error = new Error('User belonging to this token no longer exists')
        error.statusCode = 401
        throw error
    }

    // Attach user to request object for downstream use
    req.user = currentUser
    next()
})

// Restrict - limits access to specific roles
export const restrictTo = (...roles) => {
    return asyncHandler(async (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            const error = new Error('You do not have permission to perform this action')
            error.statusCode = 403
            throw error
        }
        next()
    })
}