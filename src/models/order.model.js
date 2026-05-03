import mongoose from 'mongoose'
import User from './user.model.js'

const orderItemSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        name: {
            type: String,
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: [1, 'Quantity must be at least 1']
        },
        size: {
            type: String,
            required: true,
            enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
        },
        price: {
            type: Number,
            required: true
        }
    },
    { _id: false }
)

const shippingAddressSchema = new mongoose.Schema(
    {
        fullName: { type: String, required: true },
        address: { type: String, required: true },
        city: { type: String, required: true },
        country: { type: String, required: true },
        zipCode: { type: String, required: true },
    },
    { _id: false }
)

const orderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        orderItems: {
            type: [orderItemSchema],
            validate: {
                validator: (items) => items.length > 0,
                message: 'Order must contains at least one item'
            }
        },
        shippingAddress: {
            type: shippingAddressSchema,
            required: true
        },
        paymentMethod: {
            type: String,
            required: true,
            enum: {
                values: ['credit_card', 'debit_card', 'paypal', 'cash_on_delivery'],
                message: '{VALUE} is not a supported payment method',
            }
        }, totalPrice: {
            type: Number,
            required: true,
            min: [0, 'Total price cannot be negative'],
        },
        status: {
            type: String,
            enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
            default: 'pending'
        },
        isPaid: {
            type: Boolean,
            default: false
        },
        paidAt: {
            type: Date
        },
        isDelivered: {
            type: Boolean,
            default: false
        },
        deliveredAt: {
            type: Date
        }
    },
    {
        timestamps: true
    }
)

// Fetch all orders for a specific user — used in getMyOrders
orderSchema.index({ user: 1 });

// Admin filtering orders by status
orderSchema.index({ status: 1 });

// Compound — user's orders sorted by newest first
orderSchema.index({ user: 1, createdAt: -1 });

// Compound — admin dashboard: filter by status and sort by date
orderSchema.index({ status: 1, createdAt: -1 });

const Order = mongoose.model('Order', orderSchema)

export default Order