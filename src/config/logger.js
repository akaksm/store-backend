import morgan from 'morgan';

// Compact format for production — method, url, status, response time
const productionFormat = ':method :url :status :response-time ms';

// Detailed format for development — includes date and body size
const developmentFormat = ':method :url :status :response-time ms - :res[content-length]';

const logger = morgan(
    process.env.NODE_ENV === 'production'
        ? productionFormat
        : developmentFormat
);

export default logger;