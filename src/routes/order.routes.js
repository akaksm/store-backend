import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { createOrder, getAllOrders, getMyOrders, getOrderById, updateOrderStatus } from "../controllers/order.controller.js";



const router = Router();


// All order routes require authentication
router.use(protect)

router.post('/', createOrder);
router.get('/my-orders', getMyOrders);
router.get('/:id', getOrderById);

// Admin only
router.get('/', restrictTo('admin'), getAllOrders);
router.put('/:id/status', restrictTo('admin'), updateOrderStatus);

export default router;