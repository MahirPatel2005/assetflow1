import { api } from "../lib/api";

export interface Booking {
  id: number;
  asset_id: number;
  resource_name: string;
  user_id: number;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
}

export const bookingApi = {
  list: (assetId?: number) => api.get<Booking[]>("/bookings", { params: { assetId } }).then((r) => r.data),
  create: (payload: { assetId: number; resourceName: string; startTime: string; endTime: string; notes?: string; userId?: number }) =>
    api.post<Booking>("/bookings", payload).then((r) => r.data),
  cancel: (id: number) => api.patch(`/bookings/${id}/cancel`).then((r) => r.data),
  reschedule: (id: number, payload: { startTime: string; endTime: string }) =>
    api.patch(`/bookings/${id}/reschedule`, payload).then((r) => r.data),
};

export interface MaintenanceRequest {
  id: number;
  asset_id: number;
  raised_by_user_id: number;
  priority: string;
  issue_description: string;
  status: string;
  technician_name: string | null;
  resolution_notes: string | null;
  created_at: string;
}

export const maintenanceApi = {
  list: () => api.get<MaintenanceRequest[]>("/maintenance").then((r) => r.data),
  create: (payload: { assetId: number; priority: string; issueDescription: string }) =>
    api.post<MaintenanceRequest>("/maintenance", payload).then((r) => r.data),
  approve: (id: number) => api.post(`/maintenance/${id}/approve`).then((r) => r.data),
  reject: (id: number) => api.post(`/maintenance/${id}/reject`).then((r) => r.data),
  resolve: (id: number, payload: { technicianName?: string; resolutionNotes?: string }) =>
    api.post(`/maintenance/${id}/resolve`, payload).then((r) => r.data),
};

export interface Department {
  id: number;
  name: string;
  parent_id: number | null;
  head_user_id: number | null;
}
export interface AssetCategory {
  id: number;
  name: string;
  description: string | null;
}
export interface Employee {
  id: number;
  name: string;
  email: string;
  role: string;
  department_id: number | null;
  status: string;
}

export const orgApi = {
  listDepartments: () => api.get<Department[]>("/departments").then((r) => r.data),
  createDepartment: (payload: { name: string; parentId?: number | null }) =>
    api.post<Department>("/departments", payload).then((r) => r.data),
  updateDepartment: (id: number, payload: { name?: string; parentId?: number | null }) =>
    api.patch<Department>(`/departments/${id}`, payload).then((r) => r.data),
  deleteDepartment: (id: number) => api.delete(`/departments/${id}`).then((r) => r.data),
  listCategories: () => api.get<AssetCategory[]>("/asset-categories").then((r) => r.data),
  createCategory: (payload: { name: string; description?: string }) =>
    api.post<AssetCategory>("/asset-categories", payload).then((r) => r.data),
  updateCategory: (id: number, payload: { name?: string; description?: string }) =>
    api.patch<AssetCategory>(`/asset-categories/${id}`, payload).then((r) => r.data),
  deleteCategory: (id: number) => api.delete(`/asset-categories/${id}`).then((r) => r.data),
  listEmployees: () => api.get<Employee[]>("/employees").then((r) => r.data),
  promoteEmployee: (id: number, role: string) =>
    api.post<Employee>(`/employees/${id}/promote`, { role }).then((r) => r.data),
};

export interface DashboardKpis {
  assetsAvailable: number;
  assetsAllocated: number;
  maintenanceToday: number;
  activeBookings: number;
  pendingTransfers: number;
  overdueReturns: number;
  assetsByStatus: Record<string, number>;
}

export const dashboardApi = {
  getKpis: () => api.get<DashboardKpis>("/dashboard/kpis").then((r) => r.data),
};

export interface ReportSummary {
  totalAssets: number;
  totalValuation: number;
  byStatus: { status: string; count: number; valuation: number }[];
  byCategory: { categoryName: string; count: number; valuation: number }[];
}

export const reportApi = {
  getSummary: () => api.get<ReportSummary>("/reports/summary").then((r) => r.data),
};

export interface AuditItem {
  id: number;
  audit_id: number;
  asset_id: number;
  auditor_user_id: number | null;
  verification_status: "Pending" | "Verified" | "Missing" | "Damaged";
  remarks: string | null;
  asset_name: string;
  asset_tag: string;
  asset_location: string | null;
  asset_status: string;
  auditor_name: string | null;
}

export interface Audit {
  id: number;
  scope_type: string;
  scope_value: string | null;
  start_date: string;
  end_date: string | null;
  status: string;
  created_by_user_id: number;
  creator_name?: string;
  total_items?: number;
  verified_items?: number;
  items?: AuditItem[];
}

export const auditApi = {
  list: () => api.get<Audit[]>("/audits").then((r) => r.data),
  getOne: (id: number) => api.get<Audit>(`/audits/${id}`).then((r) => r.data),
  create: (payload: { scopeType: string; scopeValue?: string; startDate: string; auditorUserId?: number }) =>
    api.post<Audit>("/audits", payload).then((r) => r.data),
  updateItem: (auditId: number, itemId: number, payload: { status: string; remarks?: string }) =>
    api.patch<AuditItem>(`/audits/${auditId}/items/${itemId}`, payload).then((r) => r.data),
  close: (id: number) => api.post<Audit>(`/audits/${id}/close`).then((r) => r.data),
};

export interface AppNotification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  read_status: boolean;
  created_at: string;
}

export const notificationApi = {
  list: () => api.get<AppNotification[]>("/notifications").then((r) => r.data),
  markRead: (id: number) => api.patch(`/notifications/${id}/read`).then((r) => r.data),
};

export const aiApi = {
  chat: (message: string) => api.post<{ reply: string }>("/ai/chat", { message }).then((r) => r.data),
  analyzeMaintenance: () => api.post<{ report: string }>("/ai/analyze-maintenance").then((r) => r.data),
  analyzeAudit: (auditId: number) => api.post<{ report: string }>(`/ai/analyze-audit/${auditId}`).then((r) => r.data),
};
