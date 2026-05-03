import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

// Upload a buffer directly to Cloudinary using upload_stream
export const uploadToCloudinary = (buffer, folder) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
                transformation: [
                    {
                        width: 800,
                        height: 800,
                        crop: 'limit',
                        quality: 'auto',
                        fetch_format: 'auto',
                    },
                ],
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );

        stream.end(buffer);
    });
};

export default cloudinary