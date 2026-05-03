import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import mongoSanitize from 'express-mongo-sanitize'
import compression from 'compression'
import logger from './config/logger.js'
import xssSanitizer from './middleware/xssSanitizer.js'

import productRoutes from './routes/product.routes.js'
import authRouter from './routes/auth.routes.js'
import orderRouter from './routes/order.routes.js'
import analyticsRouter from './routes/analytics.routes.js'
import errorHandler from './middleware/errorHandler.js'


const app = express()

// ─── Security Headers ────────────────────────────────────────────
app.use(helmet())

// ─── CORS ─────────────────────────────────────────────────────────
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    process.env.CLIENT_URL,
].filter(Boolean);

const corsOptions = {
    origin: (origin, callBack) => {

        if (!origin) return callBack(null, true)

        if (allowedOrigins.includes(origin)) {
            callBack(null, true)
        } else {
            callBack(new Error(`CORS policy: Origin ${origin} is not allowed`))
        }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200,
}

// Handle preflight requests for all routes
app.options('/{*wildcard}', cors(corsOptions))
app.use(cors(corsOptions))

// compression
app.use(compression({
    level: 6,
    threshold: 1024
}))

// Request logger
app.use(logger)

// ─── Rate Limiting ───────────────────────────────────────────────
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    validate: { trustProxy: false },
    keyGenerator: (req) => ipKeyGenerator(req),
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again after 15 minutes'
    },
    standardHeaders: true, // Return rate limit info in RateLimit-* headers
    legacyHeaders: false,
})

// Strict limiter for auth routes — 10 attempts per 15 minutes per IP
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    validate: { trustProxy: false },
    keyGenerator: (req) => ipKeyGenerator(req),
    requestPropertyName: 'authRateLimit',
    message: {
        success: false,
        error: 'Too many login attempts from this IP, please try again after 15 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
})

app.use(globalLimiter)

// ─── Query Parser ─────────────────────────────────────────────────
// Extended parser supports bracket notation: price[lt]=50
// Express 5 defaults to simple parser which breaks this
app.set('query parser', 'extended')

// ─── Body Parser ─────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }))

// ─── Data Sanitization ───────────────────────────────────────────
app.use((req, res, next) => {
    if (req.body) mongoSanitize.sanitize(req.body);
    if (req.query) mongoSanitize.sanitize(req.query);
    if (req.params) mongoSanitize.sanitize(req.params);
    next();
});

// Sanitize user input against XSS attacks Converts <script>alert('xss')</script> to safe HTML entities
app.use(xssSanitizer)

// Product routes
app.use('/api/v1/auth', authLimiter, authRouter)
app.use('/api/v1/products', productRoutes)
app.use('/api/v1/orders', orderRouter)
app.use('/api/v1/analytics', analyticsRouter)

// ─── Health Check ─────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'Apparel API is running',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
    });
});

// Catch unmatched routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: `Route ${req.originalUrl} not found`
    })
})

// Global error handler - must be last
app.use(errorHandler)

export default app