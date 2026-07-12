import { pool } from "../config/db";

export async function getReportsSummary(role: string, departmentId: number | null) {
  let assetWhere = `WHERE a.status NOT IN ('Retired', 'Disposed')`;
  const params: unknown[] = [];

  if (role === "DepartmentHead") {
    params.push(departmentId);
    assetWhere += ` AND a.current_department_id = $1`;
  }

  const [totalValuation, statusCounts, categoryCounts] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int as count, COALESCE(SUM(a.acquisition_cost), 0)::numeric as valuation FROM assets a ${assetWhere}`, params),
    pool.query(
      `SELECT a.status, COUNT(*)::int as count, COALESCE(SUM(a.acquisition_cost), 0)::numeric as valuation 
       FROM assets a ${assetWhere} 
       GROUP BY a.status`,
      params
    ),
    pool.query(
      `SELECT c.name as category_name, COUNT(a.id)::int as count, COALESCE(SUM(a.acquisition_cost), 0)::numeric as valuation 
       FROM assets a
       JOIN asset_categories c ON a.category_id = c.id
       ${assetWhere}
       GROUP BY c.name`,
      params
    ),
  ]);

  return {
    totalAssets: totalValuation.rows[0].count,
    totalValuation: Number(totalValuation.rows[0].valuation),
    byStatus: statusCounts.rows.map((row) => ({
      status: row.status,
      count: row.count,
      valuation: Number(row.valuation),
    })),
    byCategory: categoryCounts.rows.map((row) => ({
      categoryName: row.category_name,
      count: row.count,
      valuation: Number(row.valuation),
    })),
  };
}
