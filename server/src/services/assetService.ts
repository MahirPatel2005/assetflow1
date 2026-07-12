import type { PoolClient } from "pg";
import { pool, withTransaction } from "../config/db";
import { acquireLock } from "../config/redis";
import { ApiError } from "../utils/ApiError";
import { notifyUser } from "./notificationService";

export async function listAssets(params: {
  q?: string;
  status?: string;
  categoryId?: number;
  page: number;
  pageSize: number;
  userRole?: string;
  userId?: number;
}) {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (params.q) {
    values.push(`%${params.q}%`);
    conditions.push(`(name ILIKE $${values.length} OR asset_tag ILIKE $${values.length})`);
  }
  if (params.status) {
    values.push(params.status);
    conditions.push(`status = $${values.length}`);
  }
  if (params.categoryId) {
    values.push(params.categoryId);
    conditions.push(`category_id = $${values.length}`);
  }
  if (params.userRole === "Employee" && params.userId) {
    values.push(params.userId);
    conditions.push(`current_holder_user_id = $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (params.page - 1) * params.pageSize;
  values.push(params.pageSize, offset);

  const { rows } = await pool.query(
    `SELECT * FROM assets ${where} ORDER BY created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );
  const countResult = await pool.query(`SELECT COUNT(*) FROM assets ${where}`, values.slice(0, -2));
  return { items: rows, total: Number(countResult.rows[0].count), page: params.page, pageSize: params.pageSize };
}

export async function getAssetById(id: number, userRole?: string, userId?: number) {
  const { rows } = await pool.query(
    `SELECT a.*, 
            u.name as current_holder_name,
            d.name as current_department_name
     FROM assets a
     LEFT JOIN users u ON a.current_holder_user_id = u.id
     LEFT JOIN departments d ON a.current_department_id = d.id
     WHERE a.id = $1`,
    [id]
  );
  const asset = rows[0];
  if (!asset) throw ApiError.notFound("Asset not found");
  
  if (userRole === "Employee" && userId && asset.current_holder_user_id !== userId) {
    throw ApiError.forbidden("Access denied: you can only view your assigned assets");
  }

  const historyRes = await pool.query(
    `SELECT al.*, 
            u.name as allocated_to_name,
            d.name as department_name,
            ub.name as allocated_by_name
     FROM allocations al
     LEFT JOIN users u ON al.allocated_to_user_id = u.id
     LEFT JOIN departments d ON al.allocated_to_department_id = d.id
     LEFT JOIN users ub ON al.allocated_by_user_id = ub.id
     WHERE al.asset_id = $1
     ORDER BY al.created_at DESC`,
    [id]
  );

  asset.history = historyRes.rows;
  return asset;
}

export async function createAsset(input: {
  assetTag: string;
  name: string;
  categoryId?: number | null;
  serialNumber?: string | null;
  acquisitionDate?: string | null;
  acquisitionCost?: number | null;
  condition: string;
  location?: string | null;
  sharedBookable: boolean;
}) {
  const { rows } = await pool.query(
    `INSERT INTO assets (asset_tag, name, category_id, serial_number, acquisition_date, acquisition_cost, condition, location, shared_bookable)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [
      input.assetTag,
      input.name,
      input.categoryId ?? null,
      input.serialNumber ?? null,
      input.acquisitionDate ?? null,
      input.acquisitionCost ?? null,
      input.condition,
      input.location ?? null,
      input.sharedBookable,
    ]
  );
  return rows[0];
}

export async function updateAsset(id: number, patch: Record<string, unknown>) {
  const fieldMap: Record<string, string> = {
    assetTag: "asset_tag",
    name: "name",
    categoryId: "category_id",
    serialNumber: "serial_number",
    acquisitionDate: "acquisition_date",
    acquisitionCost: "acquisition_cost",
    condition: "condition",
    location: "location",
    sharedBookable: "shared_bookable",
  };
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [key, value] of Object.entries(patch)) {
    const column = fieldMap[key];
    if (!column || value === undefined) continue;
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  }
  if (!sets.length) return getAssetById(id);

  values.push(id);
  const { rows } = await pool.query(
    `UPDATE assets SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
    values
  );
  if (!rows[0]) throw ApiError.notFound("Asset not found");
  return rows[0];
}

/**
 * Allocate an asset to a user, guarded by a Redis distributed lock (prevents a
 * race between two concurrent requests) and a Postgres transaction with a
 * row-level lock + a partial unique index as the ultimate source of truth.
 */
export async function allocateAsset(
  assetId: number,
  input: { userId: number; departmentId?: number | null; expectedReturnDate?: string | null },
  actorId: number
) {
  const release = await acquireLock(`asset:${assetId}`, 5000);
  if (!release) {
    throw ApiError.conflict("Asset is currently being processed by another request. Please retry.");
  }

  try {
    return await withTransaction(async (client: PoolClient) => {
      const { rows } = await client.query("SELECT * FROM assets WHERE id = $1 FOR UPDATE", [assetId]);
      const asset = rows[0];
      if (!asset) throw ApiError.notFound("Asset not found");

      if (asset.status !== "Available") {
        const holder = await client.query(
          `SELECT u.name FROM allocations a JOIN users u ON u.id = a.allocated_to_user_id
           WHERE a.asset_id = $1 AND a.status = 'Active'`,
          [assetId]
        );
        throw ApiError.conflict(
          `Asset is currently held by ${holder.rows[0]?.name ?? "another user"}. You may request a transfer instead.`,
          { currentHolder: holder.rows[0]?.name ?? null, canRequestTransfer: true }
        );
      }

      const allocationResult = await client.query(
        `INSERT INTO allocations (asset_id, allocated_to_user_id, allocated_to_department_id, allocated_by_user_id, expected_return_date, status)
         VALUES ($1,$2,$3,$4,$5,'Active') RETURNING *`,
        [assetId, input.userId, input.departmentId ?? null, actorId, input.expectedReturnDate ?? null]
      );

      await client.query(
        `UPDATE assets SET status = 'Allocated', current_holder_user_id = $1, current_department_id = $2 WHERE id = $3`,
        [input.userId, input.departmentId ?? null, assetId]
      );

      await notifyUser(client, input.userId, "Asset Assigned", `Asset "${asset.name}" has been assigned to you.`);

      return allocationResult.rows[0];
    });
  } finally {
    await release();
  }
}

export async function returnAsset(assetId: number, conditionOnReturn: string) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT * FROM allocations WHERE asset_id = $1 AND status = 'Active' FOR UPDATE`,
      [assetId]
    );
    const allocation = rows[0];
    if (!allocation) throw ApiError.badRequest("This asset has no active allocation to return");

    await client.query(
      `UPDATE allocations SET status = 'Returned', actual_return_date = CURRENT_DATE, condition_on_return = $1 WHERE id = $2`,
      [conditionOnReturn, allocation.id]
    );
    await client.query(
      `UPDATE assets SET status = 'Available', current_holder_user_id = NULL, current_department_id = NULL, condition = $1 WHERE id = $2`,
      [conditionOnReturn, assetId]
    );
    return { ...allocation, status: "Returned" };
  });
}

export async function listActiveAllocations(role: string, departmentId: number | null, userId: number) {
  let query = `
    SELECT al.*, 
           a.name as asset_name, a.asset_tag,
           u.name as allocated_to_name,
           d.name as department_name,
           ub.name as allocated_by_name
    FROM allocations al
    JOIN assets a ON al.asset_id = a.id
    LEFT JOIN users u ON al.allocated_to_user_id = u.id
    LEFT JOIN departments d ON al.allocated_to_department_id = d.id
    LEFT JOIN users ub ON al.allocated_by_user_id = ub.id
    WHERE al.status = 'Active'
  `;
  const params: unknown[] = [];
  if (role === "DepartmentHead" && departmentId) {
    params.push(departmentId);
    query += ` AND (al.allocated_to_department_id = $1 OR u.department_id = $1)`;
  } else if (role === "Employee") {
    params.push(userId);
    query += ` AND al.allocated_to_user_id = $1`;
  }
  query += ` ORDER BY al.created_at DESC`;
  const { rows } = await pool.query(query, params);
  return rows;
}
