import mongoose from 'mongoose'

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Product name is required'],
            trim: true,
            maxlength: [120, 'Product name cannot exceed 120 characters'],
        },
        description: {
            type: String,
            required: [true, 'Product description is required'],
            trim: true,
        },
        price: {
            type: Number,
            required: [true, 'Price is required'],
            min: [0, 'Price cannot be negative'],
        },
        category: {
            type: String,
            required: [true, 'Category is required'],
            enum: {
                values: ['t-shirt', 'sweatshirt'],
                message: '{VALUE} is not a supported category',
            },
        },
        sizes: {
            type: [String],
            enum: {
                values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
                message: '{VALUES} is not a valid size',
            },
            default: [],
        },
        stock: {
            type: Number,
            required: [true, 'Stock quantity is required'],
            min: [0, 'Stock cannot be negative'],
            default: 0,
        },
        imageUrl: {
            type: String,
            default: '',
        },
        imagePublicId: {
            type: String,
            default: ''
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
)

// Single field indexes — for filtering by one field at a time
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ stock: 1 });

// Compound index — for the most common storefront query:
// "get all active products in a category sorted by price"
productSchema.index({ isActive: 1, category: 1, price: 1 });

// Text index — for future product search by name and description
productSchema.index({ name: 'text', description: 'text' });

const Product = mongoose.model('Product', productSchema)

export default Product