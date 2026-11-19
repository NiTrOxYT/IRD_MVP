import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  UserCheck,
  Plus,
  Search,
  RefreshCw,
  Shield,
  ShieldCheck,
  KeyRound,
  Edit3,
  Trash2,
  Lock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users,
  Check,
  UserX,
  Power,
  ChevronRight,
  Info,
} from "lucide-react";
import {
  getUsers,
  createUser,
  updateUser,
  resetUserPassword,
  toggleUserStatus,
  deleteUser,
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getPermissionsCatalog,
  getStaffMe,
  StaffUserRecord,
  RoleRecord,
  StaffUser,
} from "../lib/api";
import { PERMISSION_MODULES, PermissionModule, PermissionAction, hasPermission } from "../lib/permissions";
import { usePropertyName } from "../lib/usePropertyName";
import { Modal } from "../components/Modal";
import { cn } from "../lib/utils";

export function AdminUsers() {
  const propertyName = usePropertyName();
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "roles">("users");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Users state
  const [users, setUsers] = useState<StaffUserRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Roles state
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [modules, setModules] = useState<PermissionModule[]>(PERMISSION_MODULES);

  // Modals state
  // 1. Create User Modal
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRoleId, setNewRoleId] = useState<number | "">("");

  // 2. Edit User Modal
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffUserRecord | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editRoleId, setEditRoleId] = useState<number | "">("");
  const [editIsActive, setEditIsActive] = useState(true);

  // 3. Reset Password Modal
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [targetPasswordUser, setTargetPasswordUser] = useState<StaffUserRecord | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState("");

  // 4. Create / Edit Role Modal
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleSlug, setRoleSlug] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const showNotification = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, usersRes, rolesRes, catalogRes] = await Promise.all([
        getStaffMe().catch(() => null),
        getUsers({ search: searchQuery, roleId: roleFilter, status: statusFilter }),
        getRoles(),
        getPermissionsCatalog().catch(() => ({ success: true, modules: PERMISSION_MODULES })),
      ]);

      if (meRes?.user) setCurrentUser(meRes.user);
      if (usersRes.success) setUsers(usersRes.users);
      if (rolesRes.success) setRoles(rolesRes.roles);
      if (catalogRes?.modules) setModules(catalogRes.modules);
    } catch (err: any) {
      console.error("Error loading user management data:", err);
      showNotification("error", err.message || "Failed to load users and roles");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, roleFilter, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Can current user manage users?
  const canManageUsers = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === "admin") return true;
    return hasPermission(currentUser.permissions, "users:manage");
  }, [currentUser]);

  // ── User Handlers ──

  const handleOpenCreateUser = () => {
    setNewUsername("");
    setNewFullName("");
    setNewPassword("");
    setNewRoleId(roles[0]?.id || "");
    setIsCreateUserOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newFullName.trim() || !newPassword || !newRoleId) {
      showNotification("error", "Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createUser({
        username: newUsername.trim(),
        fullName: newFullName.trim(),
        password: newPassword,
        roleId: Number(newRoleId),
      });
      showNotification("success", `Staff account '${newUsername}' created successfully.`);
      setIsCreateUserOpen(false);
      loadData();
    } catch (err: any) {
      showNotification("error", err.message || "Failed to create staff account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditUser = (user: StaffUserRecord) => {
    setEditingUser(user);
    setEditFullName(user.full_name);
    setEditRoleId(user.role_id || "");
    setEditIsActive(user.is_active);
    setIsEditUserOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsSubmitting(true);
    try {
      await updateUser(editingUser.id, {
        fullName: editFullName.trim(),
        roleId: editRoleId ? Number(editRoleId) : undefined,
        isActive: editIsActive,
      });
      showNotification("success", `Account for '${editingUser.username}' updated.`);
      setIsEditUserOpen(false);
      loadData();
    } catch (err: any) {
      showNotification("error", err.message || "Failed to update staff account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenResetPassword = (user: StaffUserRecord) => {
    setTargetPasswordUser(user);
    setResetNewPassword("");
    setIsResetPasswordOpen(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPasswordUser || !resetNewPassword) return;

    if (resetNewPassword.length < 6) {
      showNotification("error", "Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      await resetUserPassword(targetPasswordUser.id, resetNewPassword);
      showNotification("success", `Password reset for '${targetPasswordUser.username}'.`);
      setIsResetPasswordOpen(false);
    } catch (err: any) {
      showNotification("error", err.message || "Failed to reset password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: StaffUserRecord) => {
    const nextStatus = !user.is_active;
    try {
      await toggleUserStatus(user.id, nextStatus);
      showNotification(
        "success",
        `Account '${user.username}' has been ${nextStatus ? "enabled" : "disabled"}.`
      );
      loadData();
    } catch (err: any) {
      showNotification("error", err.message || "Failed to update status.");
    }
  };

  const handleDeleteUser = async (user: StaffUserRecord) => {
    if (!window.confirm(`Are you sure you want to permanently delete user '${user.username}'?`)) {
      return;
    }
    try {
      await deleteUser(user.id);
      showNotification("success", `User '${user.username}' deleted.`);
      loadData();
    } catch (err: any) {
      showNotification("error", err.message || "Failed to delete user.");
    }
  };

  // ── Role Handlers ──

  const handleOpenRoleModal = (role?: RoleRecord) => {
    if (role) {
      setEditingRole(role);
      setRoleName(role.name);
      setRoleSlug(role.slug);
      setRoleDescription(role.description || "");
      setSelectedPermissions(role.permissions || []);
    } else {
      setEditingRole(null);
      setRoleName("");
      setRoleSlug("");
      setRoleDescription("");
      setSelectedPermissions([
        "overview:view",
        "orders:view",
        "orders:edit",
        "stays:view",
      ]);
    }
    setIsRoleModalOpen(true);
  };

  const handleTogglePermission = (permId: string) => {
    if (selectedPermissions.includes("*")) {
      // If full wildcard was selected and user clicks a specific item, expand all then toggle
      return;
    }
    if (selectedPermissions.includes(permId)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== permId));
    } else {
      setSelectedPermissions([...selectedPermissions, permId]);
    }
  };

  const handleToggleModuleAll = (module: PermissionModule) => {
    const modulePerms = module.actions.map((act) => `${module.id}:${act}`);
    const allSelected = modulePerms.every((p) => selectedPermissions.includes(p));

    if (allSelected) {
      setSelectedPermissions(selectedPermissions.filter((p) => !modulePerms.includes(p)));
    } else {
      const merged = Array.from(new Set([...selectedPermissions, ...modulePerms]));
      setSelectedPermissions(merged);
    }
  };

  const handleToggleWildcard = () => {
    if (selectedPermissions.includes("*")) {
      setSelectedPermissions([]);
    } else {
      setSelectedPermissions(["*"]);
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      showNotification("error", "Role name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingRole) {
        await updateRole(editingRole.id, {
          name: roleName.trim(),
          description: roleDescription.trim() || undefined,
          permissions: selectedPermissions,
        });
        showNotification("success", `Role '${roleName}' updated successfully.`);
      } else {
        await createRole({
          name: roleName.trim(),
          slug: roleSlug.trim() || undefined,
          description: roleDescription.trim() || undefined,
          permissions: selectedPermissions,
        });
        showNotification("success", `Custom role '${roleName}' created successfully.`);
      }
      setIsRoleModalOpen(false);
      loadData();
    } catch (err: any) {
      showNotification("error", err.message || "Failed to save role.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRole = async (role: RoleRecord) => {
    if (!window.confirm(`Are you sure you want to delete custom role '${role.name}'?`)) {
      return;
    }
    try {
      await deleteRole(role.id);
      showNotification("success", `Role '${role.name}' deleted.`);
      loadData();
    } catch (err: any) {
      showNotification("error", err.message || "Failed to delete role.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-serif font-medium bg-[#FAF5EB] text-[#B88223] border border-[#B88223]/20">
              <ShieldCheck size={12} />
              {propertyName ? `${propertyName} · Security & Governance` : "Security & Governance"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-[#29231F] mt-1.5">
            User Management & Access Control
          </h1>
          <p className="text-sm text-[#6E6259]">
            Manage staff credentials, define custom roles, and configure granular permissions across the resort dining system.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E8E2D9] text-xs font-medium text-[#29231F] hover:bg-[#F3EFEA] transition shadow-xs bg-white"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-[#B88223]" : ""} />
            Refresh
          </button>
          {canManageUsers && (
            <>
              {activeTab === "users" ? (
                <button
                  onClick={handleOpenCreateUser}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#29231F] hover:bg-[#3D352E] text-white text-xs font-medium transition shadow-sm"
                >
                  <Plus size={14} />
                  New Staff Account
                </button>
              ) : (
                <button
                  onClick={() => handleOpenRoleModal()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#29231F] hover:bg-[#3D352E] text-white text-xs font-medium transition shadow-sm"
                >
                  <Plus size={14} />
                  Create Custom Role
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={cn(
            "p-3 rounded-lg text-xs font-medium mb-6 flex items-center justify-between transition animate-in fade-in duration-200 shadow-xs",
            feedback.type === "success"
              ? "bg-[#F3F9F4] text-[#1B4328] border border-[#2D6A4F]/20"
              : "bg-[#FDF2F2] text-[#7A1C1C] border border-[#B83A3A]/20"
          )}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-current opacity-70 hover:opacity-100">
            <XCircle size={14} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-[#E8E2D9] flex gap-2 sm:gap-6 overflow-x-auto pb-px mb-6">
        <button
          onClick={() => setActiveTab("users")}
          className={cn(
            "flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition whitespace-nowrap",
            activeTab === "users"
              ? "border-[#B88223] text-[#B88223]"
              : "border-transparent text-[#6E6259] hover:text-[#29231F]"
          )}
        >
          <Users size={16} />
          Staff Users
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-[#FAF5EB] text-[#6E6259] border border-[#E8E2D9]">
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("roles")}
          className={cn(
            "flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition whitespace-nowrap",
            activeTab === "roles"
              ? "border-[#B88223] text-[#B88223]"
              : "border-transparent text-[#6E6259] hover:text-[#29231F]"
          )}
        >
          <Shield size={16} />
          Roles & Permissions
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-[#FAF5EB] text-[#6E6259] border border-[#E8E2D9]">
            {roles.length}
          </span>
        </button>
      </div>

      {/* ── TAB 1: STAFF USERS ── */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white border border-[#E8E2D9] p-3 rounded-xl shadow-2xs">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A3968C]" />
              <input
                type="text"
                placeholder="Search staff by username or full name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#E8E2D9] focus:outline-none focus:border-[#B88223] bg-[#FAF8F5]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="text-xs py-1.5 px-3 rounded-lg border border-[#E8E2D9] bg-[#FAF8F5] text-[#29231F] focus:outline-none focus:border-[#B88223]"
              >
                <option value="all">All Roles</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs py-1.5 px-3 rounded-lg border border-[#E8E2D9] bg-[#FAF8F5] text-[#29231F] focus:outline-none focus:border-[#B88223]"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="disabled">Disabled Only</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white border border-[#E8E2D9] rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAF8F5] text-[#6E6259] border-b border-[#E8E2D9] font-medium">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role & Permissions</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E2D9]">
                  {users.map((user) => {
                    const isSelf = currentUser?.id === user.id;
                    const role = roles.find((r) => r.id === user.role_id) || {
                      name: user.role_name || user.role,
                      is_builtin: true,
                    };

                    return (
                      <tr key={user.id} className="hover:bg-[#FCFBF9] transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#FAF5EB] border border-[#ECD7A9] flex items-center justify-center font-serif font-bold text-[#B88223] text-xs">
                              {user.full_name?.charAt(0) || user.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-[#29231F] flex items-center gap-1.5">
                                <span>{user.full_name}</span>
                                {isSelf && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#EBF7EE] text-[#1B4328] border border-[#2D6A4F]/20">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#6E6259] font-mono">@{user.username}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border",
                              user.role === "admin" || user.role_slug === "admin"
                                ? "bg-[#FAF5EB] text-[#B88223] border-[#B88223]/30"
                                : "bg-[#F3EFEA] text-[#29231F] border-[#E8E2D9]"
                            )}
                          >
                            <Shield size={11} />
                            {user.role_name || user.role}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          {user.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#EBF7EE] text-[#1B4328] border border-[#2D6A4F]/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#2D6A4F]" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FEF2F2] text-[#991B1B] border border-[#DC2626]/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                              Disabled
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-[#6E6259]">
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {canManageUsers && (
                              <>
                                <button
                                  onClick={() => handleOpenResetPassword(user)}
                                  title="Reset Password"
                                  className="p-1.5 rounded hover:bg-[#F3EFEA] text-[#6E6259] hover:text-[#29231F] transition"
                                >
                                  <KeyRound size={14} />
                                </button>
                                <button
                                  onClick={() => handleToggleStatus(user)}
                                  disabled={isSelf}
                                  title={user.is_active ? "Disable Account" : "Enable Account"}
                                  className={cn(
                                    "p-1.5 rounded transition",
                                    user.is_active
                                      ? "text-[#991B1B] hover:bg-[#FEF2F2]"
                                      : "text-[#2D6A4F] hover:bg-[#EBF7EE]",
                                    isSelf && "opacity-30 cursor-not-allowed"
                                  )}
                                >
                                  <Power size={14} />
                                </button>
                                <button
                                  onClick={() => handleOpenEditUser(user)}
                                  title="Edit User Details"
                                  className="p-1.5 rounded hover:bg-[#F3EFEA] text-[#6E6259] hover:text-[#29231F] transition"
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user)}
                                  disabled={isSelf}
                                  title="Delete User"
                                  className={cn(
                                    "p-1.5 rounded text-[#991B1B] hover:bg-[#FEF2F2] transition",
                                    isSelf && "opacity-30 cursor-not-allowed"
                                  )}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-[#A3968C] italic">
                        No staff accounts found matching the filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: ROLES & PERMISSIONS ── */}
      {activeTab === "roles" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => {
              const perms = Array.isArray(role.permissions) ? role.permissions : [];
              const isSuper = perms.includes("*");

              return (
                <div
                  key={role.id}
                  className="bg-white border border-[#E8E2D9] rounded-xl p-4 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-serif font-medium text-base text-[#29231F]">{role.name}</h3>
                          {role.is_builtin && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#FAF5EB] text-[#B88223] border border-[#B88223]/20">
                              System
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-[#A3968C]">slug: {role.slug}</span>
                      </div>

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#F3EFEA] text-[#29231F] border border-[#E8E2D9]">
                        <Users size={12} />
                        {role.user_count || 0} users
                      </span>
                    </div>

                    <p className="text-xs text-[#6E6259] mt-2 mb-3 min-h-[32px] line-clamp-2">
                      {role.description || "Custom operational role with tailored module permissions."}
                    </p>

                    {/* Permissions summary */}
                    <div className="pt-3 border-t border-[#F3EFEA]">
                      <div className="text-[11px] font-medium text-[#29231F] mb-1.5">Granted Permissions:</div>
                      {isSuper ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[#FAF5EB] text-[#B88223] border border-[#B88223]/30">
                          <ShieldCheck size={11} />
                          Full Superuser Access (*)
                        </span>
                      ) : perms.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                          {perms.map((p, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-[#F3EFEA] text-[#29231F] border border-[#E8E2D9]"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#A3968C] italic">No permissions assigned</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#F3EFEA] flex items-center justify-between">
                    <span className="text-[11px] text-[#A3968C]">
                      {isSuper ? "All modules" : `${perms.length} actions allowed`}
                    </span>
                    <div className="flex items-center gap-2">
                      {canManageUsers && (
                        <>
                          <button
                            onClick={() => handleOpenRoleModal(role)}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-[#B88223]/30 text-[#B88223] bg-[#FAF5EB] hover:bg-[#B88223] hover:text-white transition"
                          >
                            Edit Permissions
                          </button>
                          {!role.is_builtin && (
                            <button
                              onClick={() => handleDeleteRole(role)}
                              disabled={(role.user_count || 0) > 0}
                              title={
                                (role.user_count || 0) > 0
                                  ? "Cannot delete role while users are assigned to it"
                                  : "Delete Role"
                              }
                              className={cn(
                                "p-1.5 rounded text-[#991B1B] hover:bg-[#FEF2F2] transition",
                                (role.user_count || 0) > 0 && "opacity-30 cursor-not-allowed"
                              )}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MODAL 1: CREATE USER MODAL ── */}
      <Modal
        isOpen={isCreateUserOpen}
        onClose={() => setIsCreateUserOpen(false)}
        title="Create New Staff Account"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#29231F] mb-1">Username</label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="e.g. concierge_lead"
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D9] bg-white focus:outline-none focus:border-[#B88223]"
              required
            />
            <span className="text-[10px] text-[#A3968C] mt-0.5 block">
              Unique staff identifier for signing into the console.
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#29231F] mb-1">Full Name</label>
            <input
              type="text"
              value={newFullName}
              onChange={(e) => setNewFullName(e.target.value)}
              placeholder="e.g. Julian Montgomery"
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D9] bg-white focus:outline-none focus:border-[#B88223]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#29231F] mb-1">Initial Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D9] bg-white focus:outline-none focus:border-[#B88223]"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#29231F] mb-1">Assigned Role</label>
            <select
              value={newRoleId}
              onChange={(e) => setNewRoleId(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D9] bg-white focus:outline-none focus:border-[#B88223]"
              required
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.is_builtin ? "(Built-in)" : "(Custom)"}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E8E2D9]">
            <button
              type="button"
              onClick={() => setIsCreateUserOpen(false)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#E8E2D9] text-[#6E6259] hover:bg-[#F3EFEA]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-medium rounded-lg bg-[#29231F] text-white hover:bg-[#3D352E] disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create Account"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL 2: EDIT USER MODAL ── */}
      <Modal
        isOpen={isEditUserOpen}
        onClose={() => setIsEditUserOpen(false)}
        title={`Edit Staff Account · @${editingUser?.username}`}
      >
        <form onSubmit={handleUpdateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#29231F] mb-1">Full Name</label>
            <input
              type="text"
              value={editFullName}
              onChange={(e) => setEditFullName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D9] bg-white focus:outline-none focus:border-[#B88223]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#29231F] mb-1">Role</label>
            <select
              value={editRoleId}
              onChange={(e) => setEditRoleId(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D9] bg-white focus:outline-none focus:border-[#B88223]"
              required
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between p-3 bg-[#FAF8F5] border border-[#E8E2D9] rounded-lg">
            <div>
              <div className="text-xs font-medium text-[#29231F]">Account Active</div>
              <div className="text-[11px] text-[#6E6259]">
                Disabled accounts cannot sign in to the staff console
              </div>
            </div>
            <input
              type="checkbox"
              checked={editIsActive}
              onChange={(e) => setEditIsActive(e.target.checked)}
              disabled={currentUser?.id === editingUser?.id}
              className="w-4 h-4 text-[#B88223] rounded focus:ring-[#B88223]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E8E2D9]">
            <button
              type="button"
              onClick={() => setIsEditUserOpen(false)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#E8E2D9] text-[#6E6259] hover:bg-[#F3EFEA]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-medium rounded-lg bg-[#29231F] text-white hover:bg-[#3D352E] disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL 3: RESET PASSWORD MODAL ── */}
      <Modal
        isOpen={isResetPasswordOpen}
        onClose={() => setIsResetPasswordOpen(false)}
        title={`Reset Password · @${targetPasswordUser?.username}`}
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <p className="text-xs text-[#6E6259]">
            Enter a new password for this staff account. Any active sessions for this user will be invalidated immediately.
          </p>

          <div>
            <label className="block text-xs font-medium text-[#29231F] mb-1">New Password</label>
            <input
              type="password"
              value={resetNewPassword}
              onChange={(e) => setResetNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D9] bg-white focus:outline-none focus:border-[#B88223]"
              required
              minLength={6}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E8E2D9]">
            <button
              type="button"
              onClick={() => setIsResetPasswordOpen(false)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#E8E2D9] text-[#6E6259] hover:bg-[#F3EFEA]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-medium rounded-lg bg-[#B83A3A] text-white hover:bg-[#991B1B] disabled:opacity-50"
            >
              {isSubmitting ? "Resetting..." : "Reset Password"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL 4: ROLE & PERMISSION EDITOR MODAL ── */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title={editingRole ? `Edit Role & Permissions · ${editingRole.name}` : "Create Custom Role"}
      >
        <form onSubmit={handleSaveRole} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#29231F] mb-1">Role Name</label>
              <input
                type="text"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="e.g. Concierge Supervisor"
                disabled={editingRole?.is_builtin}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D9] bg-white focus:outline-none focus:border-[#B88223] disabled:bg-[#F3EFEA]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#29231F] mb-1">Slug Identifier</label>
              <input
                type="text"
                value={roleSlug}
                onChange={(e) => setRoleSlug(e.target.value)}
                placeholder="e.g. concierge-supervisor"
                disabled={Boolean(editingRole)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D9] bg-white focus:outline-none focus:border-[#B88223] disabled:bg-[#F3EFEA]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#29231F] mb-1">Description</label>
              <input
                type="text"
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
                placeholder="Summary of operational scope and responsibilities..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D9] bg-white focus:outline-none focus:border-[#B88223]"
              />
            </div>
          </div>

          {/* Superuser Wildcard Option */}
          <div className="flex items-center justify-between p-3 bg-[#FAF5EB] border border-[#ECD7A9] rounded-lg">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#B88223]" />
              <div>
                <div className="text-xs font-medium text-[#29231F]">Full Administrative Access (*)</div>
                <div className="text-[11px] text-[#6E6259]">
                  Grants unrestricted access to all modules, actions, and settings
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={selectedPermissions.includes("*")}
              onChange={handleToggleWildcard}
              className="w-4 h-4 text-[#B88223] rounded focus:ring-[#B88223]"
            />
          </div>

          {/* Module-by-Module Permission Matrix */}
          {!selectedPermissions.includes("*") && (
            <div className="space-y-3 pt-2">
              <div className="text-xs font-serif font-medium text-[#29231F]">
                Granular Permissions Matrix:
              </div>

              {modules.map((mod) => {
                const modulePerms = mod.actions.map((act) => `${mod.id}:${act}`);
                const allSelected = modulePerms.every((p) => selectedPermissions.includes(p));

                return (
                  <div
                    key={mod.id}
                    className="p-3 bg-[#FAF8F5] border border-[#E8E2D9] rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-medium text-[#29231F]">{mod.name}</div>
                        <div className="text-[10px] text-[#6E6259]">{mod.description}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleModuleAll(mod)}
                        className="text-[11px] font-medium text-[#B88223] hover:underline"
                      >
                        {allSelected ? "Deselect All" : "Select All"}
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1 border-t border-[#E8E2D9]/60">
                      {mod.actions.map((act) => {
                        const permId = `${mod.id}:${act}`;
                        const isChecked = selectedPermissions.includes(permId);

                        return (
                          <label
                            key={act}
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border cursor-pointer transition select-none",
                              isChecked
                                ? "bg-white border-[#B88223] text-[#29231F] shadow-2xs font-medium"
                                : "bg-[#F3EFEA]/60 border-[#E8E2D9] text-[#6E6259]"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleTogglePermission(permId)}
                              className="w-3.5 h-3.5 text-[#B88223] rounded focus:ring-[#B88223]"
                            />
                            <span className="capitalize">{act}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E8E2D9]">
            <button
              type="button"
              onClick={() => setIsRoleModalOpen(false)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#E8E2D9] text-[#6E6259] hover:bg-[#F3EFEA]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-medium rounded-lg bg-[#29231F] text-white hover:bg-[#3D352E] disabled:opacity-50"
            >
              {isSubmitting ? "Saving Role..." : editingRole ? "Save Changes" : "Create Role"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default AdminUsers;
