import { GoogleGenAI } from "@google/genai";
import { createAppError } from "../utils/createAppError.js";

const MODEL = "gemini-3.5-flash-lite";

const SYSTEM_INSTRUCTION = `You improve programming questions for a Q&A site before they are posted.
Rewrite the title, description and tags so the question is clear, specific and easy to answer.
Keep the author's original intent and technical details; never invent facts, code or error messages.
Title: concise, one line. Description: well structured, plain text/markdown. Tags: at most 5 short, lowercase, relevant technology names.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "Improved question title." },
    description: { type: "string", description: "Improved question description." },
    tags: {
      type: "array",
      items: { type: "string" },
      maxItems: 5,
      description: "Improved tags, lowercase.",
    },
  },
  required: ["title", "description", "tags"],
};

let client = null;

// The client is created lazily (on first use) rather than at import time:
// main.js imports the app before dotenv.config() runs, so GEMINI_API_KEY is
// not available while modules are being evaluated.
export const getClient = () => {
  if (client) return client;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw createAppError("AI suggestions are not configured on the server.", 503);
  }

  client = new GoogleGenAI({ apiKey });
  return client;
};

// Test helper: drop the cached client.
export const resetClient = () => {
  client = null;
};

export const improveQuestionService = async ({ title, description, tags = "" }) => {
  const ai = getClient();

  let interaction;
  try {
    interaction = await ai.interactions.create({
      model: MODEL,
      system_instruction: SYSTEM_INSTRUCTION,
      input: `Title: ${title}\n\nDescription:\n${description}\n\nTags: ${tags || "(none)"}`,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: RESPONSE_SCHEMA,
      },
    });
  } catch (error) {
    console.error("Gemini request failed:", error?.message || error);
    throw createAppError("The AI service is unavailable. Please try again.", 502);
  }

  let parsed;
  try {
    parsed = JSON.parse(interaction.output_text);
  } catch {
    throw createAppError("The AI service returned an invalid response.", 502);
  }

  const valid =
    parsed &&
    typeof parsed.title === "string" &&
    typeof parsed.description === "string" &&
    Array.isArray(parsed.tags) &&
    parsed.tags.every((t) => typeof t === "string");
  if (!valid) {
    throw createAppError("The AI service returned an invalid response.", 502);
  }

  return {
    title: parsed.title.trim(),
    description: parsed.description.trim(),
    tags: parsed.tags
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 5)
      .join(", "),
  };
};

const SUMMARY_INSTRUCTION = `You summarize the answers given to a programming question on a Q&A site.
Write a concise plain-text TL;DR of 3 to 5 sentences covering the main solutions and any disagreement between answers.
Use only information in the answers; never invent facts or code. No markdown, bullet points or headings.`;

export const summarizeAnswersService = async ({ title, description, answers }) => {
  const ai = getClient();

  const answersText = answers.map((text, i) => `Answer ${i + 1}:\n${text}`).join("\n\n");

  let interaction;
  try {
    interaction = await ai.interactions.create({
      model: MODEL,
      system_instruction: SUMMARY_INSTRUCTION,
      input: `Question: ${title}\n\n${description}\n\n${answersText}`,
    });
  } catch (error) {
    console.error("Gemini request failed:", error?.message || error);
    throw createAppError("The AI service is unavailable. Please try again.", 502);
  }

  const summary = typeof interaction?.output_text === "string" ? interaction.output_text.trim() : "";
  if (!summary) {
    throw createAppError("The AI service returned an invalid response.", 502);
  }

  return summary;
};
