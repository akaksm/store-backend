import { Router } from 'express';
import {
    getRevenueStats,
    getStoreSummary,
    getTopProducts,
} from '../controllers/analytics.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';

const router = Router();

// All analytics routes are admin only
router.use(protect, restrictTo('admin'));

router.get('/revenue', getRevenueStats);
router.get('/summary', getStoreSummary);
router.get('/top-products', getTopProducts);

export default router;