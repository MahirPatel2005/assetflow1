import { pool } from "../config/db";
import { redis } from "../config/redis";

const CACHE_TTL_SECONDS = 30;

export async function getDashboardKpis(role: string, departmentId: number | null, userId: number) {
  let cacheKey = "dashboard:kpis:org";
  if (role === "DepartmentHead") {
    cacheKey = `dashboard:kpis:dept:${departmentId}`;
  } else if (role === "Employee") {
    cacheKey = `dashboard:kpis:user:${userId}`;
  }

  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  let statusQuery = `SELECT status, COUNT(*) FROM assets GROUP BY status`;
  let maintenanceQuery = `SELECT COUNT(*) FROM maintenance_requests WHERE status IN ('Approved','In Progress') AND created_at::date = CURRENT_DATE`;
  let bookingsQuery = `SELECT COUNT(*) FROM bookings WHERE status IN ('Upcoming','Ongoing')`;
  let transfersQuery = `SELECT COUNT(*) FROM transfer_requests WHERE status = 'Pending'`;
  let overdueQuery = `SELECT COUNT(*) FROM allocations WHERE status = 'Active' AND expected_return_date < CURRENT_DATE`;

  const statusParams: unknown[] = [];
  const maintenanceParams: unknown[] = [];
  const bookingsParams: unknown[] = [];
  const transfersParams: unknown[] = [];
  const overdueParams: unknown[] = [];

  if (role === "DepartmentHead" && departmentId) {
    statusParams.push(departmentId);
    statusQuery = `SELECT status, COUNT(*) FROM assets WHERE current_department_id = $1 GROUP BY status`;

    maintenanceParams.push(departmentId);
    maintenanceQuery = `
      SELECT COUNT(*) FROM maintenance_requests m
      JOIN assets a ON m.asset_id = a.id
      WHERE m.status IN ('Approved','In Progress') 
        AND m.created_at::date = CURRENT_DATE 
        AND a.current_department_id = $1
    `;

    bookingsParams.push(departmentId);
    bookingsQuery = `SELECT COUNT(*) FROM bookings WHERE status IN ('Upcoming','Ongoing') AND department_id = $1`;

    transfersParams.push(departmentId);
    transfersQuery = `
      SELECT COUNT(*) FROM transfer_requests t
      JOIN assets a ON t.asset_id = a.id
      WHERE t.status = 'Pending' 
        AND (a.current_department_id = $1 OR t.requested_to_department_id = $1)
    `;

    overdueParams.push(departmentId);
    overdueQuery = `
      SELECT COUNT(*) FROM allocations 
      WHERE status = 'Active' 
        AND expected_return_date < CURRENT_DATE 
        AND (allocated_to_department_id = $1 OR allocated_to_user_id IN (SELECT id FROM users WHERE department_id = $1))
    `;
  } else if (role === "Employee") {
    statusParams.push(userId);
    statusQuery = `SELECT status, COUNT(*) FROM assets WHERE current_holder_user_id = $1 GROUP BY status`;

    maintenanceParams.push(userId);
    maintenanceQuery = `
      SELECT COUNT(*) FROM maintenance_requests 
      WHERE status IN ('Approved','In Progress') 
        AND created_at::date = CURRENT_DATE 
        AND raised_by_user_id = $1
    `;

    bookingsParams.push(userId);
    bookingsQuery = `SELECT COUNT(*) FROM bookings WHERE status IN ('Upcoming','Ongoing') AND user_id = $1`;

    transfersParams.push(userId);
    transfersQuery = `
      SELECT COUNT(*) FROM transfer_requests 
      WHERE status = 'Pending' 
        AND (requested_by_user_id = $1 OR requested_to_user_id = $1)
    `;

    overdueParams.push(userId);
    overdueQuery = `
      SELECT COUNT(*) FROM allocations 
      WHERE status = 'Active' 
        AND expected_return_date < CURRENT_DATE 
        AND allocated_to_user_id = $1
    `;
  }

  const [statusCounts, maintenanceToday, activeBookings, pendingTransfers, overdue] = await Promise.all([
    pool.query(statusQuery, statusParams),
    pool.query(maintenanceQuery, maintenanceParams),
    pool.query(bookingsQuery, bookingsParams),
    pool.query(transfersQuery, transfersParams),
    pool.query(overdueQuery, overdueParams),
  ]);

  const byStatus: Record<string, number> = {};
  for (const row of statusCounts.rows) byStatus[row.status] = Number(row.count);

  const kpis = {
    assetsAvailable: byStatus["Available"] ?? 0,
    assetsAllocated: byStatus["Allocated"] ?? 0,
    maintenanceToday: Number(maintenanceToday.rows[0].count),
    activeBookings: Number(activeBookings.rows[0].count),
    pendingTransfers: Number(pendingTransfers.rows[0].count),
    overdueReturns: Number(overdue.rows[0].count),
    assetsByStatus: byStatus,
  };

  await redis.set(cacheKey, JSON.stringify(kpis), "EX", CACHE_TTL_SECONDS);
  return kpis;
}
