import { pool } from "../config/db";
import { ApiError } from "../utils/ApiError";

export async function listBookings(assetId?: number) {
  const { rows } = await pool.query(
    assetId
      ? `SELECT b.*, u.name as user_name FROM bookings b LEFT JOIN users u ON b.user_id = u.id WHERE b.asset_id = $1 ORDER BY b.start_time ASC`
      : `SELECT b.*, u.name as user_name FROM bookings b LEFT JOIN users u ON b.user_id = u.id ORDER BY b.start_time ASC`,
    assetId ? [assetId] : []
  );
  return rows;
}

export async function createBooking(input: {
  assetId: number;
  resourceName: string;
  startTime: string;
  endTime: string;
  notes?: string;
  userId: number;
  departmentId: number | null;
}) {
  // Friendly application-level check first (fast feedback, good UX)
  const overlap = await pool.query(
    `SELECT id FROM bookings
     WHERE asset_id = $1 AND status IN ('Upcoming','Ongoing')
       AND start_time < $3 AND end_time > $2`,
    [input.assetId, input.startTime, input.endTime]
  );
  if (overlap.rowCount) {
    throw ApiError.conflict("Overlap detected: this resource is already booked for part of that time range.");
  }

  // DB exclusion constraint is the real guard against race conditions
  const { rows } = await pool.query(
    `INSERT INTO bookings (asset_id, resource_name, user_id, department_id, start_time, end_time, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [input.assetId, input.resourceName, input.userId, input.departmentId, input.startTime, input.endTime, input.notes ?? null]
  );
  return rows[0];
}

export async function cancelBooking(id: number, userId: number, role: string, userDeptId: number | null) {
  const { rows: findRows } = await pool.query(`SELECT * FROM bookings WHERE id = $1`, [id]);
  const booking = findRows[0];
  if (!booking) throw ApiError.notFound("Booking not found");
  if (booking.status !== "Upcoming") throw ApiError.badRequest("Only upcoming bookings can be cancelled");

  // Validate authorization
  let allowed = false;
  if (role === "Admin" || role === "AssetManager") {
    allowed = true;
  } else if (role === "DepartmentHead" && userDeptId) {
    if (booking.user_id === userId || booking.department_id === userDeptId) {
      allowed = true;
    } else {
      const userRes = await pool.query("SELECT department_id FROM users WHERE id = $1", [booking.user_id]);
      if (userRes.rows[0]?.department_id === userDeptId) {
        allowed = true;
      }
    }
  } else {
    allowed = booking.user_id === userId;
  }

  if (!allowed) throw ApiError.forbidden("You are not authorized to cancel this booking");

  const { rows } = await pool.query(
    `UPDATE bookings SET status = 'Cancelled', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0];
}

export async function rescheduleBooking(
  id: number,
  userId: number,
  role: string,
  userDeptId: number | null,
  startTime: string,
  endTime: string
) {
  const { rows: findRows } = await pool.query(`SELECT * FROM bookings WHERE id = $1`, [id]);
  const booking = findRows[0];
  if (!booking) throw ApiError.notFound("Booking not found");
  if (booking.status !== "Upcoming") throw ApiError.badRequest("Only upcoming bookings can be rescheduled");

  // Validate authorization
  let allowed = false;
  if (role === "Admin" || role === "AssetManager") {
    allowed = true;
  } else if (role === "DepartmentHead" && userDeptId) {
    if (booking.user_id === userId || booking.department_id === userDeptId) {
      allowed = true;
    } else {
      const userRes = await pool.query("SELECT department_id FROM users WHERE id = $1", [booking.user_id]);
      if (userRes.rows[0]?.department_id === userDeptId) {
        allowed = true;
      }
    }
  } else {
    allowed = booking.user_id === userId;
  }

  if (!allowed) throw ApiError.forbidden("You are not authorized to reschedule this booking");

  const overlap = await pool.query(
    `SELECT b.id FROM bookings b
     WHERE b.asset_id = $1
       AND b.id != $2 AND b.status IN ('Upcoming','Ongoing')
       AND b.start_time < $4 AND b.end_time > $3`,
    [booking.asset_id, id, startTime, endTime]
  );
  if (overlap.rowCount) {
    throw ApiError.conflict("Overlap detected for the new time range.");
  }

  const { rows } = await pool.query(
    `UPDATE bookings SET start_time = $1, end_time = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
    [startTime, endTime, id]
  );
  return rows[0];
}
