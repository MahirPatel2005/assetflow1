import { pool, withTransaction } from "../config/db";
import { ApiError } from "../utils/ApiError";

export async function listAudits(role: string, departmentId: number | null, userId: number) {
  if (role === "Admin") {
    const { rows } = await pool.query(
      `SELECT a.*, COUNT(ai.id)::int as total_items, 
              COUNT(case when ai.verification_status != 'Pending' then 1 end)::int as verified_items
       FROM audits a
       LEFT JOIN audit_items ai ON a.id = ai.audit_id
       GROUP BY a.id
       ORDER BY a.created_at DESC`
    );
    return rows;
  }

  if (role === "AssetManager") {
    const { rows } = await pool.query(
      `SELECT DISTINCT a.*, 
              COUNT(ai.id)::int as total_items, 
              COUNT(case when ai.verification_status != 'Pending' then 1 end)::int as verified_items
       FROM audits a
       JOIN audit_items ai ON a.id = ai.audit_id
       WHERE ai.auditor_user_id = $1
       GROUP BY a.id
       ORDER BY a.created_at DESC`,
      [userId]
    );
    return rows;
  }

  if (role === "DepartmentHead") {
    const deptStr = String(departmentId);
    const { rows } = await pool.query(
      `SELECT DISTINCT a.*,
              COUNT(ai.id)::int as total_items, 
              COUNT(case when ai.verification_status != 'Pending' then 1 end)::int as verified_items
       FROM audits a
       JOIN audit_items ai ON a.id = ai.audit_id
       JOIN assets ast ON ai.asset_id = ast.id
       WHERE (a.scope_type = 'department' AND a.scope_value = $1)
          OR ast.current_department_id = $2
       GROUP BY a.id
       ORDER BY a.created_at DESC`,
      [deptStr, departmentId]
    );
    return rows;
  }

  return [];
}

export async function getAuditById(id: number, role: string, departmentId: number | null, userId: number) {
  const { rows } = await pool.query(
    `SELECT a.*, u.name as creator_name
     FROM audits a
     LEFT JOIN users u ON a.created_by_user_id = u.id
     WHERE a.id = $1`,
    [id]
  );
  const audit = rows[0];
  if (!audit) throw ApiError.notFound("Audit not found");

  const itemsRes = await pool.query(
    `SELECT ai.*, ast.name as asset_name, ast.asset_tag, ast.location as asset_location, 
            ast.status as asset_status, u.name as auditor_name
     FROM audit_items ai
     JOIN assets ast ON ai.asset_id = ast.id
     LEFT JOIN users u ON ai.auditor_user_id = u.id
     WHERE ai.audit_id = $1
     ORDER BY ast.asset_tag ASC`,
    [id]
  );

  // Scoping checks
  if (role === "DepartmentHead") {
    const deptStr = String(departmentId);
    const hasAccess = 
      (audit.scope_type === "department" && audit.scope_value === deptStr) ||
      itemsRes.rows.some((item) => item.current_department_id === departmentId);
    if (!hasAccess) throw ApiError.forbidden("Access denied to department head");
  } else if (role === "AssetManager") {
    const hasAccess = itemsRes.rows.some((item) => item.auditor_user_id === userId);
    if (!hasAccess) throw ApiError.forbidden("Access denied: you are not assigned as auditor to this audit");
  } else if (role === "Employee") {
    throw ApiError.forbidden("Access denied to audits");
  }

  return { ...audit, items: itemsRes.rows };
}

export async function createAudit(input: {
  scopeType: "all" | "department" | "category";
  scopeValue?: string;
  startDate: string;
  creatorId: number;
  auditorUserId?: number;
}) {
  return withTransaction(async (client) => {
    const { rows: auditRows } = await client.query(
      `INSERT INTO audits (scope_type, scope_value, start_date, created_by_user_id, status)
       VALUES ($1, $2, $3, $4, 'In Progress') RETURNING *`,
      [input.scopeType, input.scopeValue ?? null, input.startDate, input.creatorId]
    );
    const audit = auditRows[0];

    let assetQuery = `SELECT id FROM assets WHERE status NOT IN ('Retired', 'Disposed')`;
    const params: unknown[] = [];

    if (input.scopeType === "department" && input.scopeValue) {
      params.push(Number(input.scopeValue));
      assetQuery += ` AND current_department_id = $1`;
    } else if (input.scopeType === "category" && input.scopeValue) {
      params.push(Number(input.scopeValue));
      assetQuery += ` AND category_id = $1`;
    }

    const { rows: assets } = await client.query(assetQuery, params);

    for (const asset of assets) {
      await client.query(
        `INSERT INTO audit_items (audit_id, asset_id, auditor_user_id, verification_status)
         VALUES ($1, $2, $3, 'Pending')`,
        [audit.id, asset.id, input.auditorUserId ?? null]
      );
    }

    return { ...audit, itemCount: assets.length };
  });
}

export async function updateAuditItem(
  auditId: number,
  itemId: number,
  updaterId: number,
  role: string,
  input: { status: "Pending" | "Verified" | "Missing" | "Damaged"; remarks?: string }
) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT * FROM audit_items WHERE id = $1 AND audit_id = $2 FOR UPDATE`,
      [itemId, auditId]
    );
    const item = rows[0];
    if (!item) throw ApiError.notFound("Audit item not found");

    if (role !== "Admin" && item.auditor_user_id !== updaterId) {
      throw ApiError.forbidden("You are not assigned as the auditor for this item");
    }

    await client.query(
      `UPDATE audit_items SET verification_status = $1, remarks = $2, updated_at = NOW() WHERE id = $3`,
      [input.status, input.remarks ?? null, itemId]
    );

    // Apply consequences to assets
    if (input.status === "Missing") {
      await client.query(`UPDATE assets SET status = 'Lost' WHERE id = $1`, [item.asset_id]);
    } else if (input.status === "Damaged") {
      await client.query(`UPDATE assets SET condition = 'Damaged' WHERE id = $1`, [item.asset_id]);
    }

    return { ...item, verification_status: input.status, remarks: input.remarks };
  });
}

export async function closeAudit(id: number) {
  const { rows } = await pool.query(
    `UPDATE audits SET status = 'Closed', end_date = CURRENT_DATE WHERE id = $1 RETURNING *`,
    [id]
  );
  if (!rows[0]) throw ApiError.notFound("Audit not found");
  return rows[0];
}
