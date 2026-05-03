import Order from "../models/order.model.js";
import Product from '../models/product.model.js';
import asyncHandler from '../utils/asyncHandler.js';

// @desc Create new order
// @route POST /api/orders
export const createOrder = asyncHandler(async (req, res) => {

    const { orderItems, shippingAddress, paymentMethod } = req.body;

    if (!orderItems || orderItems.length == 0) {
        const error = new Error('No order items provided');
        error.statusCode = 400;
        throw error;
    }

    // Fetch all products in the order in one DB call
    const productIds = orderItems.map((item) => item.product);
    const products = await Product.find({ _id: { $in: productIds }, isActive: true });

    if (products.length !== orderItems.length) {
        const error = new Error('One or more products not found or unavailable');
        error.statusCode = 404;
        throw error;
    }

    // Validate stock and build enriched order items
    const enrichedItems = [];

    for (const item of orderItems) {
        const product = products.find(
            (p) => p._id.toString() === item.product.toString()
        );

        if (product.stock < item.quantity) {
            const error = new Error(
                `Insufficient stock for "${product.name}". Available: ${product.stock}`
            );
            error.statusCode = 400;
            throw error;
        }

        if (!product.sizes.includes(item.size)) {
            const error = new Error(
                `Size "${item.size}" is not available for "${product.name}"`
            );
            error.statusCode = 400;
            throw error;
        }

        enrichedItems.push({
            product: product._id,
            name: product.name,
            size: item.size,
            quantity: item.quantity,
            price: product.price
        });
    }

    // Calculate total server-side -- never trust client-side totals
    const totalPrice = enrichedItems.reduce(
        (acc, item) => acc + item.price * item.quantity, 0
    );

    // Create the order
    const order = await Order.create({
        user: req.user._id,
        orderItems: enrichedItems,
        shippingAddress,
        paymentMethod,
        totalPrice: Math.round(totalPrice * 100) / 100,
    });

    // Deduct stock for each product after order is confirmed
    const stockUpdates = enrichedItems.map((item) =>
        Product.findByIdAndUpdate(item.product, {
            $inc: { stock: -item.quantity },
        })
    );

    await Promise.all(stockUpdates);

    res.status(201).json({
        success: true,
        data: order,
    });
});

// @desc    Get logged in user's orders
// @route   GET /api/orders/my-orders
export const getMyOrders = asyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user._id }).sort('-createdAt');

    res.status(200).json({
        success: true,
        count: orders.length,
        data: orders,
    });
});

// @desc    Get single order by ID
// @route   GET /api/orders/:id
export const getOrderById = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id).populate(
        'user',
        'name email'
    );

    if (!order) {
        const error = new Error('Order not found');
        error.statusCode = 404;
        throw error;
    }

    // Users can only view their own orders — admins can view any
    if (
        order.user._id.toString() !== req.user._id.toString() &&
        req.user.role !== 'admin'
    ) {
        const error = new Error('Not authorized to view this order');
        error.statusCode = 403;
        throw error;
    }

    res.status(200).json({
        success: true,
        data: order,
    });
});

// @desc    Get all orders (admin)
// @route   GET /api/orders
export const getAllOrders = asyncHandler(async (req, res) => {
    const orders = await Order.find()
        .populate('user', 'name email')
        .sort('-createdAt');

    const totalRevenue = orders
        .filter((o) => o.status !== 'cancelled')
        .reduce((acc, o) => acc + o.totalPrice, 0);

    res.status(200).json({
        success: true,
        count: orders.length,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        data: orders,
    });
});

// @desc    Update order status (admin)
// @route   PUT /api/orders/:id/status
export const updateOrderStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!status || !validStatuses.includes(status)) {
        const error = new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        error.statusCode = 400;
        throw error;
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
        const error = new Error('Order not found');
        error.statusCode = 404;
        throw error;
    }

    // Restore stock if order is being cancelled
    if (status === 'cancelled' && order.status !== 'cancelled') {
        const stockRestores = order.orderItems.map((item) =>
            Product.findByIdAndUpdate(item.product, {
                $inc: { stock: item.quantity },
            })
        );
        await Promise.all(stockRestores);
    }

    order.status = status;

    if (status === 'delivered') {
        order.isDelivered = true;
        order.deliveredAt = new Date();
    }

    await order.save();

    res.status(200).json({
        success: true,
        data: order,
    });
});