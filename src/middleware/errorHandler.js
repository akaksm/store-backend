const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500
    let message = err.message || 'Server Error'

    // Mongoose bad objectId (e.g. /api/products/badid)
    if (err.name === 'CastError') {
        statusCode = 400;
        message = `Invalid &{err.path}: &{err.value}`
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        statusCode = 400
        message = `Duplicate value for field: ${field}`
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        statusCode = 400
        const field = Object.keys(err.keyValue)[0]
        message = `Duplicate value for field: ${field}`
    }

    // JWT invalid signature or malformed token
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401
        message: 'Invalid token. Please log in again.'
    }

    // JWT expired
    if (err.name == 'TokenExpiredError') {
        statusCode: 401;
        message: 'Your token has expired. Please log in again.'
    }

    // CORS error
    if (err.message && err.message.startsWith('CORS policy')) {
        statusCode: 403;
        message: err.message
    }

    // Multer file size exceeded
    if (err.code === 'LIMIT_FILE_SIZE') {
        statusCode = 400
        message = 'File size cannot exceed 5MB'
    }

    // Multer unexpected field name
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        statusCode = 400
        message = 'Unexpected file field. Use "image" as the field name'
    }

    const responseBody = {
        success: false,
        error: message
    }

    if (process.env.NODE_ENV === 'development') {
        responseBody.stack = err.stack
    }

    res.status(statusCode).json(responseBody)
}

export default errorHandler