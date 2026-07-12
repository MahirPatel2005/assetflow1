import { pool } from "../config/db";
import { ApiError } from "../utils/ApiError";

export async function listDepartments() {
  const { rows } = await pool.query(`SELECT * FROM departments ORDER BY name`);
  return rows;
}

export async function createDepartment(name: string, parentId?: number | null) {
  const { rows } = await pool.query(
    `INSERT INTO departments (name, parent_id) VALUES ($1,$2) RETURNING *`,
    [name, parentId ?? null]
  );
  return rows[0];
}

export async function updateDepartment(id: number, patch: { name?: string; parentId?: number | null }) {
  const { rows } = await pool.query(
    `UPDATE departments SET name = COALESCE($1, name), parent_id = COALESCE($2, parent_id) WHERE id = $3 RETURNING *`,
    [patch.name ?? null, patch.parentId ?? null, id]
  );
  if (!rows[0]) throw ApiError.notFound("Department not found");
  return rows[0];
}

export async function listCategories() {
  const { rows } = await pool.query(`SELECT * FROM asset_categories ORDER BY name`);
  return rows;
}

export async function createCategory(name: string, description?: string | null) {
  const { rows } = await pool.query(
    `INSERT INTO asset_categories (name, description) VALUES ($1,$2) RETURNING *`,
    [name, description ?? null]
  );
  return rows[0];
}

export async function listEmployees() {
  const { rows } = await pool.query(
    `SELECT id, name, email, role, department_id, status, created_at FROM users ORDER BY name`
  );
  return rows;
}

export async function promoteEmployee(id: number, role: string) {
  const { rows } = await pool.query(
    `UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role, department_id, status`,
    [role, id]
  );
  if (!rows[0]) throw ApiError.notFound("Employee not found");
  return rows[0];
}

export async function setEmployeeStatus(id: number, status: "Active" | "Suspended") {
  const { rows } = await pool.query(
    `UPDATE users SET status = $1 WHERE id = $2 RETURNING id, name, email, role, department_id, status`,
    [status, id]
  );
  if (!rows[0]) throw ApiError.notFound("Employee not found");
  return rows[0];
}

export async function deleteDepartment(id: number) {
  const { rowCount } = await pool.query("DELETE FROM departments WHERE id = $1", [id]);
  if (!rowCount) throw ApiError.notFound("Department not found");
}

export async function updateCategory(id: number, patch: { name?: string; description?: string | null }) {
  const { rows } = await pool.query(
    `UPDATE asset_categories SET name = COALESCE($1, name), description = COALESCE($2, description) WHERE id = $3 RETURNING *`,
    [patch.name ?? null, patch.description ?? null, id]
  );
  if (!rows[0]) throw ApiError.notFound("Category not found");
  return rows[0];
}

export async function deleteCategory(id: number) {
  const { rowCount } = await pool.query("DELETE FROM asset_categories WHERE id = $1", [id]);
  if (!rowCount) throw ApiError.notFound("Category not found");
}
