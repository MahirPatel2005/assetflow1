import { pool, withTransaction } from "../config/db";
import { ApiError } from "../utils/ApiError";
import { notifyUser } from "./notificationService";

export async function requestTransfer(input: {
  assetId: number;
  requestedByUserId: number;
  requestedToUserId?: number | null;
  requestedToDepartmentId?: number | null;
  reason?: string;
}) {
  // Enforce Employee role cannot transfer to themselves
  if (input.requestedToUserId === input.requestedByUserId) {
    throw ApiError.badRequest("You cannot transfer an asset to yourself.");
  }

  const { rows } = await pool.query(
    `INSERT INTO transfer_requests (asset_id, requested_by_user_id, requested_to_user_id, requested_to_department_id, reason)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [
      input.assetId,
      input.requestedByUserId,
      input.requestedToUserId ?? null,
      input.requestedToDepartmentId ?? null,
      input.reason ?? null,
    ]
  );
  return rows[0];
}

export async function listTransfers(role: string, departmentId: number | null, userId: number) {
  let query = `
    SELECT t.*, a.name as asset_name, a.asset_tag, 
           u1.name as requester_name, u2.name as receiver_name, 
           d.name as department_name
    FROM transfer_requests t
    JOIN assets a ON t.asset_id = a.id
    LEFT JOIN users u1 ON t.requested_by_user_id = u1.id
    LEFT JOIN users u2 ON t.requested_to_user_id = u2.id
    LEFT JOIN departments d ON t.requested_to_department_id = d.id
  `;
  const params: unknown[] = [];

  if (role === "DepartmentHead") {
    params.push(departmentId);
    query += `
      WHERE t.requested_to_department_id = $1 
         OR a.current_department_id = $1
         OR u1.department_id = $1
         OR u2.department_id = $1
    `;
  } else if (role === "Employee") {
    params.push(userId);
    query += `
      WHERE t.requested_by_user_id = $1 
         OR t.requested_to_user_id = $1
    `;
  }

  query += ` ORDER BY t.created_at DESC`;
  const { rows } = await pool.query(query, params);
  return rows;
}

export async function approveTransfer(
  id: number,
  approverId: number,
  role: string,
  approverDeptId: number | null
) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT * FROM transfer_requests WHERE id = $1 FOR UPDATE`,
      [id]
    );
    const transfer = rows[0];
    if (!transfer) throw ApiError.notFound("Transfer request not found");
    if (transfer.status !== "Pending") throw ApiError.badRequest("Transfer request already actioned");

    if (role === "DepartmentHead") {
      const assetRes = await client.query("SELECT current_department_id FROM assets WHERE id = $1", [
        transfer.asset_id,
      ]);
      const assetDeptId = assetRes.rows[0]?.current_department_id;

      let targetUserDeptId = null;
      if (transfer.requested_to_user_id) {
        const uRes = await client.query("SELECT department_id FROM users WHERE id = $1", [
          transfer.requested_to_user_id,
        ]);
        targetUserDeptId = uRes.rows[0]?.department_id;
      }

      let reqUserDeptId = null;
      if (transfer.requested_by_user_id) {
        const uRes = await client.query("SELECT department_id FROM users WHERE id = $1", [
          transfer.requested_by_user_id,
        ]);
        reqUserDeptId = uRes.rows[0]?.department_id;
      }

      if (
        transfer.requested_to_department_id !== approverDeptId &&
        assetDeptId !== approverDeptId &&
        targetUserDeptId !== approverDeptId &&
        reqUserDeptId !== approverDeptId
      ) {
        throw ApiError.forbidden(
          "Access denied: Department Heads can only action transfer requests for their own department"
        );
      }
    }

    // Close current active allocation (if any) and open a new one
    await client.query(
      `UPDATE allocations SET status = 'Returned', actual_return_date = CURRENT_DATE
       WHERE asset_id = $1 AND status = 'Active'`,
      [transfer.asset_id]
    );

    await client.query(
      `INSERT INTO allocations (asset_id, allocated_to_user_id, allocated_to_department_id, allocated_by_user_id, status)
       VALUES ($1,$2,$3,$4,'Active')`,
      [transfer.asset_id, transfer.requested_to_user_id, transfer.requested_to_department_id, approverId]
    );

    await client.query(
      `UPDATE assets SET status = 'Allocated', current_holder_user_id = $1, current_department_id = $2 WHERE id = $3`,
      [transfer.requested_to_user_id, transfer.requested_to_department_id, transfer.asset_id]
    );

    await client.query(
      `UPDATE transfer_requests SET status = 'Approved', approved_by_user_id = $1 WHERE id = $2`,
      [approverId, id]
    );

    if (transfer.requested_to_user_id) {
      await notifyUser(
        client,
        transfer.requested_to_user_id,
        "Transfer Approved",
        "An asset has been transferred to you."
      );
    }
    await notifyUser(
      client,
      transfer.requested_by_user_id,
      "Transfer Approved",
      "Your transfer request has been approved."
    );

    return { ...transfer, status: "Approved" };
  });
}

export async function rejectTransfer(
  id: number,
  approverId: number,
  role: string,
  approverDeptId: number | null
) {
  const { rows: findRows } = await pool.query(`SELECT * FROM transfer_requests WHERE id = $1`, [id]);
  const transfer = findRows[0];
  if (!transfer) throw ApiError.notFound("Transfer request not found");
  if (transfer.status !== "Pending") throw ApiError.badRequest("Transfer request already actioned");

  if (role === "DepartmentHead") {
    const assetRes = await pool.query("SELECT current_department_id FROM assets WHERE id = $1", [
      transfer.asset_id,
    ]);
    const assetDeptId = assetRes.rows[0]?.current_department_id;

    let targetUserDeptId = null;
    if (transfer.requested_to_user_id) {
      const uRes = await pool.query("SELECT department_id FROM users WHERE id = $1", [
        transfer.requested_to_user_id,
      ]);
      targetUserDeptId = uRes.rows[0]?.department_id;
    }

    let reqUserDeptId = null;
    if (transfer.requested_by_user_id) {
      const uRes = await pool.query("SELECT department_id FROM users WHERE id = $1", [
        transfer.requested_by_user_id,
      ]);
      reqUserDeptId = uRes.rows[0]?.department_id;
    }

    if (
      transfer.requested_to_department_id !== approverDeptId &&
      assetDeptId !== approverDeptId &&
      targetUserDeptId !== approverDeptId &&
      reqUserDeptId !== approverDeptId
    ) {
      throw ApiError.forbidden(
        "Access denied: Department Heads can only action transfer requests for their own department"
      );
    }
  }

  const { rows } = await pool.query(
    `UPDATE transfer_requests SET status = 'Rejected', approved_by_user_id = $1
     WHERE id = $2 AND status = 'Pending' RETURNING *`,
    [approverId, id]
  );

  await notifyUser(
    null,
    transfer.requested_by_user_id,
    "Transfer Rejected",
    "Your transfer request has been rejected."
  );

  return rows[0];
}
