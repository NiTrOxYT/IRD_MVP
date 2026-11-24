import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { roomServiceApi } from "../api";
import type { HousekeepingRequest, HousekeepingSummary } from "../types";
import { getStaffMe } from "../../../core/auth/authApi";
import type { StaffUser } from "../../../core/auth/authTypes";
const { getStaffHousekeepingRequests, updateHousekeepingStatus, getHousekeepingSummary } = roomServiceApi;
import { roomServiceRealtime } from "../realtime";
const { joinHousekeepingRoom, onHousekeepingCreated, onHousekeepingStatusChanged } = roomServiceRealtime;
import { hasPermission } from "../../../core/auth/permissions";
import {
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  Play,
  Check,
  Search,
  Filter,
  User,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  Building,
  BedDouble,
  ShieldAlert,
} from "lucide-react";

const REQUEST_TYPE_OPTIONS = [
  { value: "all", label: "All Categories" },
  { value: "cleaning", label: "Room Cleaning" },
  { value: "towels", label: "Fresh Towels" },
  { value: "toiletries", label: "Toiletries & Amenities" },
  { value: "linen", label: "Fresh Linen" },
  { value: "pillows_blankets", label: "Extra Pillows/Blankets" },
  { value: "turndown", label: "Turndown Service" },
  { value: "luggage", label: "Luggage Assistance" },
  { value: "other", label: "Special Requests" },
];

export function HousekeepingStaff() {
  const [, setLocation] = useLocation();
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [requests, setRequests] = useState<HousekeepingRequest[]>([]);
  const [summary, setSummary] = useState<HousekeepingSummary>({
    pendingCount: 0,
    inProgressCount: 0,
    completedTodayCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [roomSearch, setRoomSearch] = useState("");

  // Decline/Notes Modal State
  const [actionModal, setActionModal] = useState<{
    request: HousekeepingRequest;
    targetStatus: "declined" | "completed";
  } | null>(null);
  const [staffNoteInput, setStaffNoteInput] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check auth
  useEffect(() => {
    getStaffMe()
      .then((res) => {
        const user = res.user;
        setCurrentUser(user);
        setAuthChecked(true);
        const perms = user.permissions || [];
        const isSuperAdmin = user.role === "admin" || perms.includes("*");
        const canView = isSuperAdmin || user.role === "housekeeping" || hasPermission(perms, "housekeeping:view");
        if (!canView) {
          setLocation("/admin/login");
        }
      })
      .catch(() => {
        setLocation("/admin/login");
      });
  }, [setLocation]);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const [reqRes, sumRes] = await Promise.all([
        getStaffHousekeepingRequests(),
        getHousekeepingSummary().catch(() => ({ summary: { pendingCount: 0, inProgressCount: 0, completedTodayCount: 0 } })),
      ]);
      if (reqRes.success) {
        setRequests(reqRes.requests);
      }
      if (sumRes.summary) {
        setSummary(sumRes.summary);
      }
      setErrorMessage(null);
    } catch (err: any) {
      if (!isSilent) setErrorMessage(err.message || "Failed to load requests.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load and periodic sync
  useEffect(() => {
    if (!authChecked) return;
    loadData();

    // Join socket room
    joinHousekeepingRoom();

    const unsubCreated = onHousekeepingCreated((newReq: HousekeepingRequest) => {
      setRequests((prev) => [newReq, ...prev.filter((r) => r.id !== newReq.id)]);
      setSummary((prev) => ({
        ...prev,
        pendingCount: prev.pendingCount + 1,
      }));
    });

    const unsubStatus = onHousekeepingStatusChanged((data) => {
      const updatedReq = data.request;
      setRequests((prev) =>
        prev.map((r) => (r.id === updatedReq.id ? updatedReq : r))
      );
      // Reload summary to reflect accurate counts
      getHousekeepingSummary().then((s) => s.summary && setSummary(s.summary)).catch(() => {});
    });

    // 6-second polling fallback
    const interval = setInterval(() => {
      loadData(true);
    }, 6000);

    return () => {
      unsubCreated();
      unsubStatus();
      clearInterval(interval);
    };
  }, [authChecked, loadData]);

  const handleUpdateStatus = async (
    request: HousekeepingRequest,
    targetStatus: string,
    notes?: string
  ) => {
    try {
      setSubmittingAction(true);
      const res = await updateHousekeepingStatus(request.id, {
        status: targetStatus,
        staffNotes: notes,
      });
      if (res.success && res.request) {
        setRequests((prev) =>
          prev.map((r) => (r.id === res.request.id ? res.request : r))
        );
        setActionModal(null);
        setStaffNoteInput("");
        getHousekeepingSummary().then((s) => s.summary && setSummary(s.summary)).catch(() => {});
      }
    } catch (err: any) {
      alert(err.message || "Could not update request status.");
    } finally {
      setSubmittingAction(false);
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      if (statusFilter !== "all" && req.status !== statusFilter) {
        return false;
      }
      if (typeFilter !== "all" && req.request_type !== typeFilter) {
        return false;
      }
      if (roomSearch.trim()) {
        const query = roomSearch.toLowerCase().trim();
        const roomMatch = req.room_number?.toLowerCase().includes(query);
        const guestMatch = req.guest_name?.toLowerCase().includes(query);
        const titleMatch = req.title?.toLowerCase().includes(query);
        if (!roomMatch && !guestMatch && !titleMatch) return false;
      }
      return true;
    });
  }, [requests, statusFilter, typeFilter, roomSearch]);

  const canEdit = useMemo(() => {
    if (!currentUser) return false;
    const perms = currentUser.permissions || [];
    return (
      currentUser.role === "admin" ||
      currentUser.role === "housekeeping" ||
      perms.includes("*") ||
      hasPermission(perms, "housekeeping:edit") ||
      hasPermission(perms, "housekeeping:manage")
    );
  }, [currentUser]);

  if (!authChecked || loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[#FAF8F5]">
        <div className="flex items-center gap-3 text-sm text-[#766B61]">
          <RefreshCw className="w-5 h-5 animate-spin text-[#8E6314]" />
          <span>Loading Housekeeping Console...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#FAF8F5] pb-16">
      {/* Header bar */}
      <div className="bg-[#FFFDF9] border-b border-[#E5DDD1] px-4 py-6 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#FAF3E6] text-[#8E6314] border border-[#ECD7A9]">
                  <Sparkles className="w-3.5 h-3.5" />
                  Suite Operations
                </span>
                <span className="text-xs text-[#766B61]">Live Dispatch</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#29231F]">
                Housekeeping Console
              </h1>
              <p className="text-xs sm:text-sm text-[#766B61] mt-0.5">
                Manage guest room requests, service dispatch, and suite replenishment in real time.
              </p>
            </div>

            {/* Quick KPI indicators */}
            <div className="flex items-center gap-3 overflow-x-auto pb-1">
              <div className="bg-[#FAF8F5] border border-[#E5DDD1] rounded-2xl px-4 py-2.5 min-w-[110px]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#766B61] flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-amber-600" /> Pending
                </div>
                <div className="text-xl font-bold font-serif text-amber-700 mt-0.5">
                  {summary.pendingCount}
                </div>
              </div>

              <div className="bg-[#FAF8F5] border border-[#E5DDD1] rounded-2xl px-4 py-2.5 min-w-[110px]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#766B61] flex items-center gap-1.5">
                  <Play className="w-3 h-3 text-blue-600" /> Active
                </div>
                <div className="text-xl font-bold font-serif text-blue-700 mt-0.5">
                  {summary.inProgressCount}
                </div>
              </div>

              <div className="bg-[#FAF8F5] border border-[#E5DDD1] rounded-2xl px-4 py-2.5 min-w-[110px]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#766B61] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Completed
                </div>
                <div className="text-xl font-bold font-serif text-emerald-700 mt-0.5">
                  {summary.completedTodayCount}
                </div>
              </div>

              <button
                onClick={() => loadData()}
                disabled={refreshing}
                title="Refresh requests"
                className="p-2.5 rounded-2xl border border-[#E5DDD1] bg-[#FAF8F5] text-[#766B61] hover:text-[#29231F] hover:bg-[#EFE7DA] transition-colors self-center"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-6">
        {errorMessage && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="bg-[#FFFDF9] border border-[#E5DDD1] rounded-2xl p-4 mb-6 shadow-xs flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 md:pb-0">
            {[
              { id: "all", label: "All Requests" },
              { id: "pending", label: "Pending" },
              { id: "accepted", label: "Accepted" },
              { id: "in_progress", label: "In Progress" },
              { id: "completed", label: "Completed" },
              { id: "declined", label: "Declined" },
            ].map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    active
                      ? "bg-[#FAF3E6] text-[#8E6314] border border-[#ECD7A9]"
                      : "text-[#766B61] hover:bg-[#FAF8F5] border border-transparent"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 items-center">
            {/* Category Dropdown */}
            <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:min-w-[220px]">
              <Filter className="h-4 w-4 shrink-0 text-[#766B61]" aria-hidden="true" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                aria-label="Filter by request category"
                className="min-w-0 flex-1 px-3 py-2 bg-[#FAF8F5] border border-[#E5DDD1] rounded-xl text-xs font-medium text-[#29231F] focus:outline-none focus:ring-1 focus:ring-[#B88223]"
              >
                {REQUEST_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Room / Keyword Search */}
            <div className="relative w-full sm:w-48">
              <input
                type="text"
                placeholder="Search suite / guest..."
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-[#FAF8F5] border border-[#E5DDD1] rounded-xl text-xs text-[#29231F] placeholder-[#766B61] focus:outline-none focus:ring-1 focus:ring-[#B88223]"
              />
              <Search className="w-3.5 h-3.5 text-[#766B61] absolute left-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Requests Feed */}
        {filteredRequests.length === 0 ? (
          <div className="bg-[#FFFDF9] border border-[#E5DDD1] rounded-3xl p-12 text-center shadow-xs">
            <Sparkles className="w-10 h-10 text-[#D4C3A3] mx-auto mb-3" />
            <h3 className="font-serif text-lg font-bold text-[#29231F]">No Housekeeping Requests</h3>
            <p className="text-xs text-[#766B61] max-w-sm mx-auto mt-1">
              {statusFilter !== "all" || typeFilter !== "all" || roomSearch
                ? "No service requests match your active filters."
                : "All guest suites are currently serviced and refreshed."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRequests.map((req) => (
              <RequestCard
                key={req.id}
                request={req}
                canEdit={canEdit}
                onUpdateStatus={handleUpdateStatus}
                onOpenDeclineModal={() =>
                  setActionModal({ request: req, targetStatus: "declined" })
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Decline / Note Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-[#FFFDF9] border border-[#E5DDD1] rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-3 text-red-700">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="font-serif text-lg font-bold text-[#29231F]">
                Decline Housekeeping Request
              </h3>
            </div>
            <p className="text-xs text-[#766B61] mb-4">
              Suite <strong className="text-[#29231F]">{actionModal.request.room_number}</strong>:{" "}
              {actionModal.request.title}. Please provide a reason for the guest records.
            </p>

            <textarea
              rows={3}
              placeholder="e.g. Guest requested service outside operational hours or item unavailable."
              value={staffNoteInput}
              onChange={(e) => setStaffNoteInput(e.target.value)}
              className="w-full p-3 bg-[#FAF8F5] border border-[#E5DDD1] rounded-2xl text-xs text-[#29231F] placeholder-[#766B61] focus:outline-none focus:ring-2 focus:ring-[#B88223]/30 mb-4"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setActionModal(null);
                  setStaffNoteInput("");
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#766B61] hover:bg-[#FAF8F5] border border-transparent"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingAction}
                onClick={() =>
                  handleUpdateStatus(
                    actionModal.request,
                    "declined",
                    staffNoteInput.trim() || undefined
                  )
                }
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {submittingAction ? "Updating..." : "Confirm Decline"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component for individual request card
function RequestCard({
  request,
  canEdit,
  onUpdateStatus,
  onOpenDeclineModal,
}: {
  request: HousekeepingRequest;
  canEdit: boolean;
  onUpdateStatus: (req: HousekeepingRequest, status: string, notes?: string) => Promise<void>;
  onOpenDeclineModal: () => void;
}) {
  const [updating, setUpdating] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      case "accepted":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
            <Check className="w-3 h-3" /> Accepted
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Play className="w-3 h-3" /> In Progress
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case "declined":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3 h-3" /> Declined
          </span>
        );
      default:
        return null;
    }
  };

  const handleAction = async (targetStatus: string) => {
    setUpdating(true);
    try {
      await onUpdateStatus(request, targetStatus);
    } finally {
      setUpdating(false);
    }
  };

  const formattedTime = new Date(request.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bg-[#FFFDF9] border border-[#E5DDD1] rounded-3xl p-5 shadow-xs flex flex-col justify-between enterprise-surface-interactive">
      <div>
        {/* Top meta row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-xl bg-[#29231F] text-[#FAF8F5] text-xs font-bold tracking-wide flex items-center gap-1.5 shadow-2xs">
              <Building className="w-3.5 h-3.5 text-[#ECD7A9]" />
              Suite {request.room_number}
            </div>
            {getStatusBadge(request.status)}
          </div>
          <span className="text-[11px] font-medium text-[#766B61]">{formattedTime}</span>
        </div>

        {/* Guest name & Title */}
        <div className="mb-2.5">
          <div className="flex items-center gap-1 text-[11px] text-[#766B61] mb-0.5">
            <User className="w-3 h-3" />
            <span>{request.guest_name}</span>
          </div>
          <h4 className="font-serif text-base font-bold text-[#29231F] leading-snug">
            {request.title}
          </h4>
        </div>

        {/* Guest Note */}
        {request.guest_note && (
          <div className="mb-3 p-3 bg-[#FAF8F5] border border-[#E5DDD1] rounded-2xl text-xs text-[#29231F] flex items-start gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-[#8E6314] shrink-0 mt-0.5" />
            <span className="italic leading-relaxed">"{request.guest_note}"</span>
          </div>
        )}

        {/* Staff note if recorded */}
        {request.staff_notes && (
          <div className="mb-3 text-[11px] text-[#766B61] bg-[#F4EFE6]/60 p-2.5 rounded-xl border border-[#E5DDD1]">
            <strong className="text-[#29231F]">Staff Note:</strong> {request.staff_notes}
          </div>
        )}

        {/* Staff Assigned */}
        {request.assigned_staff_name && (
          <div className="text-[11px] text-[#766B61] mb-3">
            Handled by: <span className="font-semibold text-[#29231F]">{request.assigned_staff_name}</span>
          </div>
        )}
      </div>

      {/* Action Footer */}
      {canEdit && request.status !== "completed" && request.status !== "declined" && (
        <div className="pt-3 border-t border-[#E5DDD1]/70 flex items-center justify-between gap-2 mt-2">
          {request.status === "pending" && (
            <>
              <button
                type="button"
                disabled={updating}
                onClick={onOpenDeclineModal}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 border border-transparent transition-colors"
              >
                Decline
              </button>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleAction("accepted")}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#8E6314] bg-[#FAF3E6] border border-[#ECD7A9] hover:bg-[#F3E7CC] transition-colors shadow-2xs"
                >
                  Accept
                </button>
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleAction("in_progress")}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-[#29231F] hover:bg-[#1E150F] transition-colors shadow-2xs flex items-center gap-1"
                >
                  <Play className="w-3 h-3 text-[#ECD7A9]" />
                  Start
                </button>
              </div>
            </>
          )}

          {request.status === "accepted" && (
            <>
              <button
                type="button"
                disabled={updating}
                onClick={onOpenDeclineModal}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 border border-transparent transition-colors"
              >
                Decline
              </button>
              <button
                type="button"
                disabled={updating}
                onClick={() => handleAction("in_progress")}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-[#29231F] hover:bg-[#1E150F] transition-colors shadow-2xs flex items-center gap-1.5"
              >
                <Play className="w-3 h-3 text-[#ECD7A9]" />
                Start Service
              </button>
            </>
          )}

          {request.status === "in_progress" && (
            <button
              type="button"
              disabled={updating}
              onClick={() => handleAction("completed")}
              className="w-full py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors shadow-2xs flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Mark Completed
            </button>
          )}
        </div>
      )}
    </div>
  );
}
