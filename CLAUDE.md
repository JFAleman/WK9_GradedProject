# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

DevAnswers is a Q&A app (questions, answers, tags, voting, JWT auth) split into two independent npm projects, each with its own `package.json` and `node_modules`. There is no root package or monorepo tooling; run commands from inside the relevant folder.

- `devanswers-backend/` — Express 5 + Mongoose 8 REST API (ES modules)
- `devanswers-frontend/` — React 19 + Vite 6 + Redux Toolkit + React-Bootstrap SPA

## Commands

### Backend (`cd devanswers-backend`)
- `npm run dev` — start with nodemon (`main.js`); `npm start` without reload
- `npm run populate` — wipe the DB at `MONGODB_URI` and reseed from `src/scripts/seed-data.js`
- `npm test` — run all Vitest tests
- Single file: `npx vitest run tests/unit/services/questionService.test.js`
- Single test by name: `npx vitest run -t "should return all questions"`

Requires a `.env` (see `.env.example`): `PORT`, `NODE_ENV`, `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRATION`. Integration tests also call `dotenv.config()` and need `JWT_SECRET` set.

### Frontend (`cd devanswers-frontend`)
- `npm run dev` — Vite dev server
- `npm run build` / `npm run preview`
- `npm run lint` — ESLint (flat config, `eslint.config.js`)
- `npm test` — Vitest (jsdom); single file: `npx vitest run tests/unit/components/QuestionCard.test.jsx`

The API base URL is hardcoded to `http://localhost:3000/api` in `src/api/axiosInstance.js`, so the backend must run on port 3000 for the frontend to work.

## Backend architecture

Request flow: `main.js` (loads dotenv, connects Mongo via `db.js`, starts `server.js`) → `src/app.js` (helmet, rate limit 100 req/15 min, cors, JSON body) → `src/routes/index.js` mounted at `/api` → route files → controllers → services → Mongoose models → `errorHandler` middleware.

Key conventions:
- **Layering**: controllers only read `req`, call a `*Service` function, and shape the response. Business logic, DB access, and authorization checks (e.g. author/admin ownership in update/delete) live in `src/services/`. Services receive `req.user` where ownership matters.
- **Response shape**: always `{ success, message, data }`. Errors are `{ success: false, message }` (+ `stack` when `NODE_ENV=development`).
- **Errors**: throw `createAppError(message, statusCode)` from `src/utils/createAppError.js`. There are no try/catch blocks in controllers — Express 5 forwards rejected async handlers to `errorHandler` automatically. Errors without `statusCode` become 500.
- **Auth**: `src/middleware/authHandler.js` reads `Authorization: Bearer <token>`, verifies with `JWT_SECRET`, loads the user, and sets `req.user = { id, isAdmin }`. Applied per-route (reads are public, writes/votes are protected).
- **Voting**: `src/services/voteService.js` `handleVote(Model, id, userId, voteType)` is shared by questions and answers; models store `upvotes`/`downvotes` arrays of user IDs plus a denormalized `voteCount`.
- Answer routes are split: list/create are nested under `/api/questions/:questionId/answers` (in `routes/questions.js`), while update/delete/vote are under `/api/answers/:id`.

### Backend tests
- `tests/unit/**` mock models with `vi.mock(...)` (services mock models; controllers mock services) — no DB.
- `tests/integration/**` import `tests/setup.js`, which spins up `mongodb-memory-server` and connects Mongoose, then hit `app` via supertest (the app is imported directly; no server is started). They register/login real users to obtain JWTs.
- `vitest.config.js` disables file parallelism (shared in-memory DB) and uses 60s timeouts for Mongo startup; first run may download a MongoDB binary.

## Frontend architecture

- `src/App.jsx` defines routes; most pages are wrapped in `BaseLayout` + `SideBarLayout`, while `/login` and `/register` only use `BaseLayout`.
- **API layer**: `src/config/config.js` holds all endpoint paths (relative); `src/services/*.js` wrap `axiosInstance` calls and return response data. Components/thunks call services, never axios directly.
- **State**: Redux Toolkit store (`src/store.js`) with `user`, `question`, `theme` slices in `src/reducers/`. Async work uses `createAsyncThunk`; side effects like `localStorage` (`userInfo` = `{ token, userId, name }`) are done in thunks, not reducers.
- **Tests**: `tests/setup.js` starts an MSW server (`tests/mocks/server.js`, `handlers.js`, `mockData.js`) to mock the backend; unknown requests warn. Vitest `globals: true`, jsdom, CSS enabled (configured in `vite.config.js`).

## Known gaps
- Frontend `USER_API.STATS` (`/auth/stats/:userId`) has no matching backend route.
- `src/pages/Profile/Profile.jsx` has a TODO: profile updates are not persisted via API.
