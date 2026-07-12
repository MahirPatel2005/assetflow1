import { withTransaction, pool } from "../config/db";
import { ApiError } from "../utils/ApiError";
import { notifyUser } from "./notificationService";

export async function listMaintenance(role: string, departmentId: number | null, userId: number) {
  let query = `
    SELECT m.*, a.name as asset_name, a.asset_tag, u.name as raised_by_name
    FROM maintenance_requests m
    JOIN assets a ON m.asset_id = a.id
    LEFT JOIN users u ON m.raised_by_user_id = u.id
  `;
  const params: unknown[] = [];

  if (role === "DepartmentHead" && departmentId) {
    params.push(departmentId);
    query += ` WHERE a.current_department_id = $1 OR u.department_id = $1`;
  } else if (role === "Employee") {
    params.push(userId);
    query += ` WHERE m.raised_by_user_id = $1`;
  }

  query += ` ORDER BY m.created_at DESC`;
  const { rows } = await pool.query(query, params);
  return rows;
}

export async function createMaintenanceRequest(input: {
  assetId: number;
  raisedByUserId: number;
  priority: string;
  issueDescription: string;
}) {
  const { rows } = await pool.query(
    `INSERT INTO maintenance_requests (asset_id, raised_by_user_id, priority, issue_description)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [input.assetId, input.raisedByUserId, input.priority, input.issueDescription]
  );
  return rows[0];
}

export async function approveMaintenance(id: number, approverId: number) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(`SELECT * FROM maintenance_requests WHERE id = $1 FOR UPDATE`, [id]);
    const request = rows[0];
    if (!request) throw ApiError.notFound("Maintenance request not found");
    if (request.status !== "Pending") throw ApiError.badRequest("Only pending requests can be approved");

    await client.query(
      `UPDATE maintenance_requests SET status = 'Approved', approved_by_user_id = $1 WHERE id = $2`,
      [approverId, id]
    );
    await client.query(`UPDATE assets SET status = 'Under Maintenance' WHERE id = $1`, [request.asset_id]);
    await notifyUser(client, request.raised_by_user_id, "Maintenance Approved", "Your maintenance request has been approved.");
    return { ...request, status: "Approved" };
  });
}

export async function rejectMaintenance(id: number, approverId: number) {
  const { rows } = await pool.query(
    `UPDATE maintenance_requests SET status = 'Rejected', approved_by_user_id = $1
     WHERE id = $2 AND status = 'Pending' RETURNING *`,
    [approverId, id]
  );
  if (!rows[0]) throw ApiError.notFound("Maintenance request not found or already actioned");
  return rows[0];
}

export async function resolveMaintenance(
  id: number,
  input: { technicianName?: string; resolutionNotes?: string }
) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(`SELECT * FROM maintenance_requests WHERE id = $1 FOR UPDATE`, [id]);
    const request = rows[0];
    if (!request) throw ApiError.notFound("Maintenance request not found");
    if (!["Approved", "In Progress"].includes(request.status)) {
      throw ApiError.badRequest("Only approved/in-progress requests can be resolved");
    }

    await client.query(
      `UPDATE maintenance_requests SET status = 'Resolved', technician_name = $1, resolution_notes = $2 WHERE id = $3`,
      [input.technicianName ?? request.technician_name, input.resolutionNotes ?? null, id]
    );
    await client.query(`UPDATE assets SET status = 'Available' WHERE id = $1`, [request.asset_id]);
    return { ...request, status: "Resolved" };
  });
}
