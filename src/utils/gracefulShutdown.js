import mongoose from 'mongoose';

const gracefulShutdown = (server) => {
    const shutdown = async (signal) => {
        console.log(`\n${signal} received. Starting graceful shutdown...`);

        // Stop accepting new connections
        server.close(async () => {
            console.log('HTTP server closed — no longer accepting connections');

            try {
                // Close MongoDB connection cleanly
                await mongoose.connection.close();
                console.log('MongoDB connection closed');
                process.exit(0);
            } catch (err) {
                console.error('Error closing MongoDB connection:', err.message);
                process.exit(1);
            }
        });

        // Force shutdown after 10 seconds if graceful shutdown hangs
        setTimeout(() => {
            console.error('Forced shutdown — graceful shutdown timed out');
            process.exit(1);
        }, 10000);
    };

    // SIGTERM — sent by platforms like Render when deploying or scaling down
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // SIGINT — sent when you press Ctrl+C locally
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle unhandled promise rejections — last safety net
    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        shutdown('UNHANDLED_REJECTION');
    });

    // Handle uncaught exceptions — last safety net
    process.on('uncaughtException', (err) => {
        console.error('Uncaught Exception:', err.message);
        shutdown('UNCAUGHT_EXCEPTION');
    });
};

export default gracefulShutdown;