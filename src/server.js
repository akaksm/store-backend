import 'dotenv/config'
import app from './app.js'
import connectDB from './config/db.js'
import gracefulShutdown from './utils/gracefulShutdown.js'

const PORT = process.env.PORT || 5000

app.set('trust proxy', 1)

// Connect to DB first, then start the server
connectDB().then(() => {
    const server = app.listen(PORT, () => {
        console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
    })

    // Pass server instance to graceful shutdown handler
    gracefulShutdown(server)
})

