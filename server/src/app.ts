import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import "dotenv/config";

import apiRoutes from "./routes";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Generic API rate limit; auth routes get a stricter one below
app.use(
  "/api",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false })
);
app.use(
  "/api/auth",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false })
);

app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

app.use("/api", apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
