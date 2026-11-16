import { improveQuestionService, summarizeAnswersService } from "../services/aiService.js";
import { createAppError } from "../utils/createAppError.js";

const MAX_TITLE = 300;
const MAX_DESCRIPTION = 20000;
const MAX_TAGS = 500;

export const improveQuestion = async (req, res) => {
    const { title, description, tags = "" } = req.body;

    if (typeof title !== "string" || !title.trim()) {
        throw createAppError("Title is required.", 400);
    }
    if (typeof description !== "string" || !description.trim()) {
        throw createAppError("Description is required.", 400);
    }
    if (typeof tags !== "string") {
        throw createAppError("Tags must be a comma-separated string.", 400);
    }
    if (title.length > MAX_TITLE || description.length > MAX_DESCRIPTION || tags.length > MAX_TAGS) {
        throw createAppError("Question is too long to improve.", 400);
    }

    const suggestions = await improveQuestionService({ title, description, tags });

    res.status(200).json({
        success: true,
        message: "Suggestions generated successfully",
        data: suggestions,
    });
};

const MAX_ANSWERS = 50;
const MAX_ANSWER_LENGTH = 10000;
const MIN_ANSWERS_TO_SUMMARIZE = 3;

export const summarizeAnswers = async (req, res) => {
    const { title, description, answers } = req.body;

    if (typeof title !== "string" || !title.trim()) {
        throw createAppError("Title is required.", 400);
    }
    if (typeof description !== "string" || !description.trim()) {
        throw createAppError("Description is required.", 400);
    }
    if (!Array.isArray(answers) || !answers.every((a) => typeof a === "string" && a.trim())) {
        throw createAppError("Answers must be an array of non-empty strings.", 400);
    }
    if (answers.length < MIN_ANSWERS_TO_SUMMARIZE) {
        throw createAppError(`At least ${MIN_ANSWERS_TO_SUMMARIZE} answers are required to summarize.`, 400);
    }
    if (
        title.length > MAX_TITLE ||
        description.length > MAX_DESCRIPTION ||
        answers.length > MAX_ANSWERS ||
        answers.some((a) => a.length > MAX_ANSWER_LENGTH)
    ) {
        throw createAppError("Question or answers are too long to summarize.", 400);
    }

    const summary = await summarizeAnswersService({ title, description, answers });

    res.status(200).json({
        success: true,
        message: "Summary generated successfully",
        data: { summary },
    });
};
