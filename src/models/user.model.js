import mongoose from "mongoose"
import bcrypt, { genSalt, hash } from "bcryptjs"
import crypto from 'crypto'



const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [
                /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                'Please provide a valid email',
            ]
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters'],
            select: false
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user'
        },
        passwordResetToken: {
            type: String,
            select: false
        },
        passwordResetExpires: {
            type: Date,
            select: false
        }
    },
    {
        timestamps: true
    }
)

// Index for role-based admin queries
userSchema.index({ role: 1 });

userSchema.pre('save', async function () {
    if (!this.isModified('password')) return

    const salt = await genSalt(12)
    this.password = await hash(this.password, salt)
})

// Instance method — generate reset token, hash it, store hash in DB
userSchema.methods.createPasswordResetToken = function () {
    // Generate raw token — this is what gets emailed to the user
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash the token before storing in DB
    // Never store raw tokens — treat them like passwords
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Token expires in 10 minutes
    this.passwordResetExpires = Date.now() + 3 * 60 * 1000;

    // Return the RAW token — this is what goes in the email link
    return resetToken;
};


const User = mongoose.model('User', userSchema)

export default User