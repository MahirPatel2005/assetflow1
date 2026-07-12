import { api } from "../lib/api";

export interface Asset {
  id: number;
  asset_tag: string;
  name: string;
  category_id: number | null;
  serial_number: string | null;
  acquisition_date: string | null;
  acquisition_cost: string | null;
  condition: string;
  location: string | null;
  status: string;
  shared_bookable: boolean;
  current_holder_user_id: number | null;
  current_department_id: number | null;
  created_at: string;
  current_holder_name?: string;
  current_department_name?: string;
  history?: Allocation[];
}

export interface PaginatedAssets {
  items: Asset[];
  total: number;
  page: number;
  pageSize: number;
}

export const assetApi = {
  search: (params: { q?: string; status?: string; categoryId?: number; page?: number; pageSize?: number }) =>
    api.get<PaginatedAssets>("/assets", { params }).then((r) => r.data),
  getOne: (id: number) => api.get<Asset>(`/assets/${id}`).then((r) => r.data),
  create: (payload: Partial<Asset> & { assetTag: string; name: string }) =>
    api.post<Asset>("/assets", payload).then((r) => r.data),
  update: (id: number, payload: Partial<Asset>) => api.patch<Asset>(`/assets/${id}`, payload).then((r) => r.data),
  allocate: (id: number, payload: { userId: number; departmentId?: number | null; expectedReturnDate?: string | null }) =>
    api.post(`/assets/${id}/allocate`, payload).then((r) => r.data),
  return: (id: number, conditionOnReturn: string) =>
    api.post(`/assets/${id}/return`, { conditionOnReturn }).then((r) => r.data),
  requestTransfer: (payload: { assetId: number; requestedToUserId?: number; requestedToDepartmentId?: number; reason?: string }) =>
    api.post("/transfers/request", payload).then((r) => r.data),
  approveTransfer: (id: number) => api.post(`/transfers/${id}/approve`).then((r) => r.data),
  rejectTransfer: (id: number) => api.post(`/transfers/${id}/reject`).then((r) => r.data),
  listTransfers: () => api.get<TransferRequest[]>("/transfers").then((r) => r.data),
  listActiveAllocations: () => api.get<Allocation[]>("/assets/allocations/active").then((r) => r.data),
};

export interface Allocation {
  id: number;
  asset_id: number;
  allocated_to_user_id: number | null;
  allocated_to_department_id: number | null;
  allocated_by_user_id: number | null;
  expected_return_date: string | null;
  actual_return_date: string | null;
  status: "Active" | "Returned" | "Cancelled";
  condition_on_return: string | null;
  created_at: string;
  asset_name: string;
  asset_tag: string;
  allocated_to_name: string | null;
  department_name: string | null;
  allocated_by_name: string | null;
}

export interface TransferRequest {
  id: number;
  asset_id: number;
  requested_by_user_id: number;
  requested_to_user_id: number | null;
  requested_to_department_id: number | null;
  approved_by_user_id: number | null;
  status: "Pending" | "Approved" | "Rejected";
  reason: string | null;
  created_at: string;
  asset_name: string;
  asset_tag: string;
  requester_name: string | null;
  receiver_name: string | null;
  department_name: string | null;
}
