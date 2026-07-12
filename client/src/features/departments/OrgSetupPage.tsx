import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { orgApi } from "../../services/domainApi";

const ROLES = ["Employee", "DepartmentHead", "AssetManager", "Admin"];

export default function OrgSetupPage() {
  const queryClient = useQueryClient();
  
  // Create inputs
  const [deptName, setDeptName] = useState("");
  const [catName, setCatName] = useState("");

  // Inline edits
  const [editingDeptId, setEditingDeptId] = useState<number | null>(null);
  const [editingDeptName, setEditingDeptName] = useState("");
  const [confirmDeleteDeptId, setConfirmDeleteDeptId] = useState<number | null>(null);

  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editingCatName, setEditingCatName] = useState("");
  const [confirmDeleteCatId, setConfirmDeleteCatId] = useState<number | null>(null);

  // Queries
  const { data: departments } = useQuery({ queryKey: ["departments"], queryFn: orgApi.listDepartments });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: orgApi.listCategories });
  const { data: employees } = useQuery({ queryKey: ["employees"], queryFn: orgApi.listEmployees });

  // Mutations
  const createDept = useMutation({
    mutationFn: () => orgApi.createDepartment({ name: deptName }),
    onSuccess: () => {
      toast.success("Department created");
      setDeptName("");
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });

  const updateDept = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => orgApi.updateDepartment(id, { name }),
    onSuccess: () => {
      toast.success("Department updated");
      setEditingDeptId(null);
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: () => toast.error("Update failed"),
  });

  const deleteDept = useMutation({
    mutationFn: (id: number) => orgApi.deleteDepartment(id),
    onSuccess: () => {
      toast.success("Department deleted");
      setConfirmDeleteDeptId(null);
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: () => toast.error("Could not delete department (it may have references)"),
  });

  const createCategory = useMutation({
    mutationFn: () => orgApi.createCategory({ name: catName }),
    onSuccess: () => {
      toast.success("Category created");
      setCatName("");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const updateCat = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => orgApi.updateCategory(id, { name }),
    onSuccess: () => {
      toast.success("Category updated");
      setEditingCatId(null);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: () => toast.error("Update failed"),
  });

  const deleteCat = useMutation({
    mutationFn: (id: number) => orgApi.deleteCategory(id),
    onSuccess: () => {
      toast.success("Category deleted");
      setConfirmDeleteCatId(null);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: () => toast.error("Could not delete category (it may have references)"),
  });

  const promote = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) => orgApi.promoteEmployee(id, role),
    onSuccess: () => {
      toast.success("Role updated");
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Organization setup</h1>
        <p className="text-sm text-slate-500">Departments, categories, and role promotion — Admin only.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Departments Panel */}
        <Panel title="Departments">
          <div className="mb-3 flex gap-2">
            <input value={deptName} onChange={(e) => setDeptName(e.target.value)} placeholder="New department name" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button onClick={() => deptName && createDept.mutate()} className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600">Add</button>
          </div>
          <ul className="divide-y divide-slate-100 text-sm">
            {departments?.map((d) => (
              <li key={d.id} className="py-2 flex justify-between items-center text-slate-700 min-h-[40px]">
                {editingDeptId === d.id ? (
                  <div className="flex-1 flex gap-2 items-center">
                    <input
                      value={editingDeptName}
                      onChange={(e) => setEditingDeptName(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                    />
                    <button
                      onClick={() => updateDept.mutate({ id: d.id, name: editingDeptName })}
                      disabled={updateDept.isPending}
                      className="text-xs font-semibold text-brand-600 hover:underline"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingDeptId(null)}
                      className="text-xs text-slate-400 hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <span>{d.name}</span>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setEditingDeptId(d.id);
                          setEditingDeptName(d.name);
                        }}
                        className="text-xs text-brand-600 hover:underline font-semibold"
                      >
                        Edit
                      </button>
                      
                      {confirmDeleteDeptId === d.id ? (
                        <div className="flex gap-2 items-center">
                          <button
                            onClick={() => deleteDept.mutate(d.id)}
                            disabled={deleteDept.isPending}
                            className="text-xs font-semibold text-red-600 hover:underline"
                          >
                            Confirm?
                          </button>
                          <button
                            onClick={() => setConfirmDeleteDeptId(null)}
                            className="text-xs text-slate-400 hover:underline"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteDeptId(d.id)}
                          className="text-xs text-red-600 hover:underline font-semibold"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </Panel>

        {/* Asset Categories Panel */}
        <Panel title="Asset categories">
          <div className="mb-3 flex gap-2">
            <input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="New category name" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button onClick={() => catName && createCategory.mutate()} className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600">Add</button>
          </div>
          <ul className="divide-y divide-slate-100 text-sm">
            {categories?.map((c) => (
              <li key={c.id} className="py-2 flex justify-between items-center text-slate-700 min-h-[40px]">
                {editingCatId === c.id ? (
                  <div className="flex-1 flex gap-2 items-center">
                    <input
                      value={editingCatName}
                      onChange={(e) => setEditingCatName(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                    />
                    <button
                      onClick={() => updateCat.mutate({ id: c.id, name: editingCatName })}
                      disabled={updateCat.isPending}
                      className="text-xs font-semibold text-brand-600 hover:underline"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingCatId(null)}
                      className="text-xs text-slate-400 hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <span>{c.name}</span>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setEditingCatId(c.id);
                          setEditingCatName(c.name);
                        }}
                        className="text-xs text-brand-600 hover:underline font-semibold"
                      >
                        Edit
                      </button>

                      {confirmDeleteCatId === c.id ? (
                        <div className="flex gap-2 items-center">
                          <button
                            onClick={() => deleteCat.mutate(c.id)}
                            disabled={deleteCat.isPending}
                            className="text-xs font-semibold text-red-600 hover:underline"
                          >
                            Confirm?
                          </button>
                          <button
                            onClick={() => setConfirmDeleteCatId(null)}
                            className="text-xs text-slate-400 hover:underline"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteCatId(c.id)}
                          className="text-xs text-red-600 hover:underline font-semibold"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Employees Directory Panel */}
      <Panel title="Employee directory & role promotion">
        <table className="w-full text-left text-sm">
          <thead className="text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="py-2">Name</th>
              <th className="py-2">Email</th>
              <th className="py-2">Role</th>
              <th className="py-2">Promote to</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employees?.map((e) => (
              <tr key={e.id}>
                <td className="py-2 text-slate-800">{e.name}</td>
                <td className="py-2 text-slate-500">{e.email}</td>
                <td className="py-2 text-slate-500">{e.role}</td>
                <td className="py-2">
                  <select
                    defaultValue={e.role}
                    onChange={(ev) => promote.mutate({ id: e.id, role: ev.target.value })}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">{title}</h2>
      {children}
    </div>
  );
}
