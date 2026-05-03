import { Router } from "express";
import { createProduct, deleteProduct, getAllProducts, getProductById, searchProducts, updateProduct, uploadProductImage } from "../controllers/product.controller.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";


const router = Router()


router.route('/')
    .get(getAllProducts)
    .post(protect, restrictTo('admin'), createProduct)

router.get('/search', searchProducts)

router.route('/:id')
    .get(getProductById)
    .put(protect, restrictTo('admin'), updateProduct)
    .delete(protect, restrictTo('admin'), deleteProduct)

router.put('/:id/image', protect, restrictTo('admin'), upload.single('image'), uploadProductImage)

export default router