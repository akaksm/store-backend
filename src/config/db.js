import mongoose from "mongoose";

const uri = process.env.MONGO_URI; // keep your URI in .env

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(uri, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000
        })
        console.log(`MongoDB connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB connection error: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;
