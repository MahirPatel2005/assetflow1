import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

const AI_BASE = process.env.AI_SERVICE_URL || "http://ai-service:8000";

async function proxyAiRequest(url: string, body?: Record<string, unknown>) {
  const opts: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);

  const response = await fetch(url, opts);

  if (!response.ok) {
    let detail = "AI Service Error";
    try {
      const errData = (await response.json()) as { detail?: string };
      if (errData.detail) detail = errData.detail;
    } catch { /* ignore parse errors */ }
    throw ApiError.badRequest(detail);
  }

  return response.json();
}

export const chat = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  
  const data = await proxyAiRequest(`${AI_BASE}/api/ai/chat`, {
    message: req.body.message,
    userId: req.user.sub,
    role: req.user.role,
    departmentId: req.user.departmentId,
  });
  
  res.status(200).json(data);
});

export const analyzeMaintenance = asyncHandler(async (_req: Request, res: Response) => {
  const data = await proxyAiRequest(`${AI_BASE}/api/ai/analyze-maintenance`);
  res.status(200).json(data);
});

export const analyzeAudit = asyncHandler(async (req: Request, res: Response) => {
  const data = await proxyAiRequest(`${AI_BASE}/api/ai/analyze-audit`, {
    auditId: Number(req.params.id),
  });
  res.status(200).json(data);
});
