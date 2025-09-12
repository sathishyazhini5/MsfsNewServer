import express from 'express';
import { createQuickCode } from "../controllers/Metadata/quickcodeController.js";

const router = express.Router();

router.post('/quickcodes', createQuickCode); // Make sure this matches the Swagger endpoint

export const quickcodeRouter = router;
