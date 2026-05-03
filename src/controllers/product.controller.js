import Product from "../models/product.model.js"
import asyncHandler from "../utils/asyncHandler.js"
import QueryBuilder from "../utils/queryBuilder.js"
import cloudinary, { uploadToCloudinary } from "../config/cloudinary.js"


// @desc    Create a new product
// @route   POST /api/products
export const createProduct = asyncHandler(async (req, res) => {
    const product = await Product.create(req.body)
    res.status(201).json({
        success: true,
        data: product,
    })
})

// @dese Get all products
// @route GET /api/products
export const getAllProducts = asyncHandler(async (req, res) => {
    const baseFilter = { isActive: true }

    const builder = new QueryBuilder(Product, req.query, baseFilter)
        .filter()
        .sort()
        .selectFields()
        .paginate()

    const products = await builder.query;

    // Build the same filter that QueryBuilder used, for total count
    const queryObj = { ...req.query };
    ['page', 'sort', 'limit', 'fields'].forEach((f) => delete queryObj[f]);

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    // Cast numeric strings to actual numbers for proper MongoDB comparison
    const parsedFilter = JSON.parse(queryStr);
    const castNumerics = (obj) => {
        for (const key of Object.keys(obj)) {
            const val = obj[key];
            if (typeof val === 'object' && val !== null) castNumerics(val);
            else if (typeof val === 'string' && val !== '' && !isNaN(val)) obj[key] = Number(val);
        }
    };
    castNumerics(parsedFilter);

    const total = await Product.countDocuments({
        ...baseFilter,
        ...parsedFilter,
    });

    const { page, limit } = builder.pagination


    res.status(200).json({
        success: true,
        count: products.length,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        },
        data: products
    })
})

// @desc    Get single product by ID
// @route   GET /api/products/:id
export const getProductById = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (!product || !product.isActive) {
        const error = new Error('Product not found')
        error.statusCode = 404
        throw error
    }

    res.status(200).json({
        success: true,
        data: product
    })
})

// @desc    Search products by name or description
// @route   GET /api/products/search?q=keyword
export const searchProducts = asyncHandler(async (req, res) => {
    const { q, page, limit } = req.query;

    if (!q || q.trim().length === 0) {
        const error = new Error('Search query is required');
        error.statusCode = 400;
        throw error;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    // $text uses the text index we created on name and description
    const searchFilter = {
        $text: { $search: q.trim() },
        isActive: true,
    };

    const [products, total] = await Promise.all([
        Product.find(searchFilter, {
            // textScore sorts by relevance — most relevant result first
            score: { $meta: 'textScore' },
        })
            .sort({ score: { $meta: 'textScore' } })
            .skip(skip)
            .limit(limitNum)
            .select('-__v'),

        Product.countDocuments(searchFilter),
    ]);

    res.status(200).json({
        success: true,
        count: products.length,
        pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
        },
        data: products,
    });
});

// @desc    Upload product image
// @route   PUT /api/products/:id/image
export const uploadProductImage = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
        const error = new Error('Product not found');
        error.statusCode = 404;
        throw error;
    }

    if (!req.file) {
        const error = new Error('Please upload an image file');
        error.statusCode = 400;
        throw error;
    }

    // If product already has an image delete it from Cloudinary
    // to avoid orphaned files piling up in your storage
    if (product.imageUrl) {
        try {
            await cloudinary.uploader.destroy(product.imagePublicId);
        } catch (err) {
            // Log but don't fail — old image cleanup is non-critical
            console.error('Failed to delete old image from Cloudinary:', err.message);
        }
    }

    const result = await uploadToCloudinary(req.file.buffer, 'store-backend/products')

    // multer-storage-cloudinary puts the result on req.file
    product.imageUrl = result.secure_url
    product.imagePublicId = result.public_id;
    await product.save();

    res.status(200).json({
        success: true,
        data: {
            imageUrl: product.imageUrl,
        },
    });
});

// @desc    Update a product
// @route   PUT /api/products/:id
export const updateProduct = asyncHandler(async (req, res) => {
    const product = await Product.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
            new: true, // Return the updated document, not the old one
            runValidators: true // Re-run schema validators on update
        }
    )

    if (!product) {
        const error = new Error('Product not found')
        error.statusCode = 404
        throw error
    }

    res.status(200).json({
        success: true,
        data: product
    })
})

// @desc    Delete a product (soft delete)
// @route   DELETE /api/products/:id
export const deleteProduct = asyncHandler(async (req, res) => {
    const product = await Product.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { new: true }
    )

    if (!product) {
        const error = new Error('Product not found')
        error.statusCode = 404
        throw error
    }

    res.status(200).json({
        success: true,
        message: 'Product deactivated successfully'
    })
})