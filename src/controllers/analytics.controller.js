import Order from '../models/order.model.js';
import Product from '../models/product.model.js';
import asyncHandler from '../utils/asyncHandler.js';

// @desc    Get revenue and order stats by category
// @route   GET /api/analytics/revenue
export const getRevenueStats = asyncHandler(async (req, res) => {
    const revenueStats = await Order.aggregate([
        // Stage 1 — Filter out cancelled orders only
        {
            $match: {
                status: { $ne: 'cancelled' },
            },
        },

        // Stage 2 — Unwind orderItems array
        // Turns one order with 3 items into 3 separate documents
        {
            $unwind: '$orderItems',
        },

        // Stage 3 — Join with products collection to get category
        {
            $lookup: {
                from: 'products',
                localField: 'orderItems.product',
                foreignField: '_id',
                as: 'productDetails',
            },
        },

        // Stage 4 — Unwind the productDetails array produced by $lookup
        {
            $unwind: '$productDetails',
        },

        // Stage 5 — Group by product category
        {
            $group: {
                _id: '$productDetails.category',
                totalRevenue: {
                    $sum: {
                        $multiply: ['$orderItems.price', '$orderItems.quantity'],
                    },
                },
                totalOrders: { $sum: 1 },
                totalItemsSold: { $sum: '$orderItems.quantity' },
                averageOrderValue: { $avg: '$orderItems.price' },
            },
        },

        // Stage 6 — Shape the output fields
        {
            $project: {
                _id: 0,
                category: '$_id',
                totalRevenue: { $round: ['$totalRevenue', 2] },
                totalOrders: 1,
                totalItemsSold: 1,
                averageOrderValue: { $round: ['$averageOrderValue', 2] },
            },
        },

        // Stage 7 — Sort by revenue descending
        {
            $sort: { totalRevenue: -1 },
        },
    ]);

    res.status(200).json({
        success: true,
        data: revenueStats,
    });
});

// @desc    Get overall store summary stats
// @route   GET /api/analytics/summary
export const getStoreSummary = asyncHandler(async (req, res) => {
    const [orderStats, productStats] = await Promise.all([
        Order.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    revenue: { $sum: '$totalPrice' },
                },
            },
            {
                $project: {
                    _id: 0,
                    status: '$_id',
                    count: 1,
                    revenue: { $round: ['$revenue', 2] },
                },
            },
        ]),

        Product.aggregate([
            {
                $group: {
                    _id: '$category',
                    totalProducts: { $sum: 1 },
                    activeProducts: {
                        $sum: { $cond: ['$isActive', 1, 0] },
                    },
                    totalStock: { $sum: '$stock' },
                    averagePrice: { $avg: '$price' },
                    lowestPrice: { $min: '$price' },
                    highestPrice: { $max: '$price' },
                },
            },
            {
                $project: {
                    _id: 0,
                    category: '$_id',
                    totalProducts: 1,
                    activeProducts: 1,
                    totalStock: 1,
                    averagePrice: { $round: ['$averagePrice', 2] },
                    lowestPrice: 1,
                    highestPrice: 1,
                },
            },
        ]),
    ]);

    // Calculate overall totals from order stats
    const totalRevenue = orderStats
        .filter((s) => s.status !== 'cancelled')
        .reduce((acc, s) => acc + s.revenue, 0);

    const totalOrders = orderStats.reduce((acc, s) => acc + s.count, 0);

    res.status(200).json({
        success: true,
        data: {
            orders: {
                breakdown: orderStats,
                totalOrders,
                totalRevenue: Math.round(totalRevenue * 100) / 100,
            },
            products: {
                breakdown: productStats,
            },
        },
    });
});

// @desc    Get top selling products
// @route   GET /api/analytics/top-products
export const getTopProducts = asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 5;

    const topProducts = await Order.aggregate([
        // Only count completed or delivered orders
        {
            $match: {
                status: { $in: ['processing', 'shipped', 'delivered'] },
            },
        },

        { $unwind: '$orderItems' },

        {
            $group: {
                _id: '$orderItems.product',
                name: { $first: '$orderItems.name' },
                totalSold: { $sum: '$orderItems.quantity' },
                totalRevenue: {
                    $sum: {
                        $multiply: ['$orderItems.price', '$orderItems.quantity'],
                    },
                },
            },
        },

        { $sort: { totalSold: -1 } },

        { $limit: limit },

        {
            $project: {
                _id: 0,
                productId: '$_id',
                name: 1,
                totalSold: 1,
                totalRevenue: { $round: ['$totalRevenue', 2] },
            },
        },
    ]);

    res.status(200).json({
        success: true,
        count: topProducts.length,
        data: topProducts,
    });
});