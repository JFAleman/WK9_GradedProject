import express from "express";
import { improveQuestion, summarizeAnswers } from "../controllers/aiController.js";
import authenticate from "../middleware/authHandler.js";

const router = express.Router();

// Protected: each call spends Gemini API quota
router.post("/improve-question", authenticate, improveQuestion);

router.post("/summarize-answers", authenticate, summarizeAnswers);

export default router;
