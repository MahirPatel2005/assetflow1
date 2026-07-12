import type { Request, Response } from "express";
import * as orgService from "../services/orgService";
import { asyncHandler } from "../utils/asyncHandler";

export const listDepartments = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json(await orgService.listDepartments());
});

export const createDepartment = asyncHandler(async (req: Request, res: Response) => {
  const dept = await orgService.createDepartment(req.body.name, req.body.parentId);
  res.locals.entityId = dept.id;
  res.status(201).json(dept);
});

export const updateDepartment = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(await orgService.updateDepartment(Number(req.params.id), req.body));
});

export const listCategories = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json(await orgService.listCategories());
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const cat = await orgService.createCategory(req.body.name, req.body.description);
  res.locals.entityId = cat.id;
  res.status(201).json(cat);
});

export const listEmployees = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json(await orgService.listEmployees());
});

export const promoteEmployee = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(await orgService.promoteEmployee(Number(req.params.id), req.body.role));
});

export const setEmployeeStatus = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(await orgService.setEmployeeStatus(Number(req.params.id), req.body.status));
});

export const deleteDepartment = asyncHandler(async (req: Request, res: Response) => {
  await orgService.deleteDepartment(Number(req.params.id));
  res.status(204).end();
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(await orgService.updateCategory(Number(req.params.id), req.body));
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  await orgService.deleteCategory(Number(req.params.id));
  res.status(204).end();
});
