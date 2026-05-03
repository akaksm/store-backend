import { Router } from "express";
import { forgotPassword, getMe, login, register, resetPassword } from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";


const router = Router()

router.post('/register', register)
router.post('/login', login)
router.get('/me', protect, getMe)
router.post('/forgot-password', forgotPassword)
router.patch('/reset-password/:token', resetPassword)

export default router