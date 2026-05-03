
import xss from 'xss';

// Recursively sanitize all string values in an object
const sanitizeValue = (value) => {
    if (typeof value === 'string') {
        return xss(value);
    }

    if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    }

    if (value !== null && typeof value === 'object') {
        Object.keys(value).forEach((key) => {
            value[key] = sanitizeValue(value[key])
        })
        return value
    }

    return value;
};

const xssSanitizer = (req, res, next) => {
    // Mutate properties in place instead of reassigning the object
    if (req.body) {
        Object.keys(req.body).forEach((key) => {
            req.body[key] = sanitizeValue(req.body[key]);
        });
    }

    if (req.query) {
        Object.keys(req.query).forEach((key) => {
            req.query[key] = sanitizeValue(req.query[key]);
        });
    }

    if (req.params) {
        Object.keys(req.params).forEach((key) => {
            req.params[key] = sanitizeValue(req.params[key]);
        });
    }

    next();
};

export default xssSanitizer;