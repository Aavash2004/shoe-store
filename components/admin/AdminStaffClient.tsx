"use client";

import { useState, useTransition } from "react";
import {
  Users,
  UserPlus,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  Search,
  Power,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  createStaffMember,
  regenerateStaffCode,
  setStaffActive,
} from "@/app/admin/staff/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface AdminStaffRow {
  id: string;
  name: string | null;
  email: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  passwordChangedAt?: string | null;
}

interface AdminStaffClientProps {
  initialStaff: AdminStaffRow[];
}

export function AdminStaffClient({ initialStaff }: AdminStaffClientProps) {
  const [staffList, setStaffList] = useState<AdminStaffRow[]>(initialStaff);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");

  // Code Display Modal
  const [codeModalData, setCodeModalData] = useState<{
    code: string;
    staffName: string;
    staffEmail: string;
    isRegeneration?: boolean;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const filteredStaff = staffList.filter((s) => {
    const q = search.toLowerCase();
    return (
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q))
    );
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const res = await createStaffMember({
        name: newName,
        email: newEmail,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to create staff member");
      } else {
        setStaffList((prev) => [
          {
            id: res.staff.id,
            name: res.staff.name,
            email: res.staff.email,
            isActive: true,
            mustChangePassword: true,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
        setCreateModalOpen(false);
        setNewName("");
        setNewEmail("");
        setCodeModalData({
          code: res.accessCode,
          staffName: res.staff.name || "Staff Member",
          staffEmail: res.staff.email || "",
        });
      }
    });
  };

  const handleRegenerateCode = (staff: AdminStaffRow) => {
    if (!confirm(`Are you sure you want to regenerate the access code for ${staff.name || staff.email}? Any active sessions for this account will be invalidated immediately.`)) {
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      const res = await regenerateStaffCode(staff.id);

      if (!res.success) {
        setErrorMessage(res.error || "Failed to regenerate access code");
      } else {
        setStaffList((prev) =>
          prev.map((s) => (s.id === staff.id ? { ...s, mustChangePassword: true } : s))
        );
        setCodeModalData({
          code: res.accessCode,
          staffName: staff.name || "Staff Member",
          staffEmail: staff.email || "",
          isRegeneration: true,
        });
      }
    });
  };

  const handleToggleActive = (staff: AdminStaffRow) => {
    const actionName = staff.isActive ? "deactivate" : "activate";
    if (!confirm(`Are you sure you want to ${actionName} ${staff.name || staff.email}?`)) {
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      const res = await setStaffActive({ staffId: staff.id, active: !staff.isActive });

      if (!res.success) {
        setErrorMessage(res.error || `Failed to ${actionName} staff member`);
      } else {
        setStaffList((prev) =>
          prev.map((s) => (s.id === staff.id ? { ...s, isActive: res.isActive } : s))
        );
        setSuccessBanner(
          `Staff member ${staff.name || staff.email} successfully ${res.isActive ? "activated" : "deactivated"}.`
        );
        setTimeout(() => setSuccessBanner(null), 4000);
      }
    });
  };

  const handleCopyCode = () => {
    if (!codeModalData) return;
    navigator.clipboard.writeText(codeModalData.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-navy)] flex items-center gap-2">
            <Users className="w-7 h-7 text-[var(--color-navy)]/80" />
            Staff Management
          </h1>
          <p className="text-sm text-[var(--color-navy)]/60">
            Provision staff accounts, generate temporary access codes, and manage active status
          </p>
        </div>

        <button
          onClick={() => {
            setCreateModalOpen(true);
            setErrorMessage(null);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--color-navy)] text-white text-xs font-semibold hover:bg-[var(--color-navy)]/90 transition-colors shadow-sm self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          Create Staff Member
        </button>
      </div>

      {successBanner && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successBanner}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-xl border border-[var(--color-sand)] p-4 shadow-sm flex items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[var(--color-navy)]/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--color-sand)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/20 focus:border-[var(--color-navy)]"
          />
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-xl border border-[var(--color-sand)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-[var(--color-sand)] text-[11px] font-bold uppercase tracking-wider text-[var(--color-navy)]/60">
              <tr>
                <th className="px-5 py-3.5">Staff Member</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Password Setup</th>
                <th className="px-4 py-3.5">Provisioned</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-sand)]/60">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-[var(--color-navy)]/50">
                    No staff members found. Click "Create Staff Member" to add one.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-semibold text-xs text-[var(--color-navy)]">
                          {staff.name || "Unnamed Staff"}
                        </p>
                        <p className="text-[11px] text-[var(--color-navy)]/60">
                          {staff.email}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      {staff.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ShieldCheck className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                          <ShieldAlert className="w-3 h-3" /> Deactivated
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      {staff.mustChangePassword ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 font-medium">
                          <KeyRound className="w-3 h-3" /> Code Issued (Setup Pending)
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 font-medium">
                          Permanent Password Set
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-xs text-[var(--color-navy)]/60">
                      {new Date(staff.createdAt).toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRegenerateCode(staff)}
                          disabled={isPending}
                          title="Generate new temporary access code (invalidates live sessions)"
                          className="px-2.5 py-1.5 rounded-lg border border-[var(--color-sand)] bg-white text-xs font-semibold text-[var(--color-navy)] hover:bg-slate-100 transition-colors flex items-center gap-1 shadow-sm"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Regen Code
                        </button>

                        <button
                          onClick={() => handleToggleActive(staff)}
                          disabled={isPending}
                          title={staff.isActive ? "Deactivate account" : "Activate account"}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm ${
                            staff.isActive
                              ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                              : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                        >
                          <Power className="w-3 h-3" />
                          {staff.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Staff Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md bg-white border-[var(--color-sand)]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[var(--color-navy)] flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[var(--color-navy)]/80" />
              Provision New Staff Member
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--color-navy)]/60">
              The system will generate a temporary access code. The staff member will be required to configure their permanent password on first login.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 mt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]/70 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. John Miller"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-sand)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]/70 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="e.g. jmiller@shoes.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-sand)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-[var(--color-sand)] text-[var(--color-navy)]/70 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--color-navy)] text-white hover:bg-[var(--color-navy)]/90 transition-colors disabled:opacity-50"
              >
                {isPending ? "Generating..." : "Generate Access Code"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Code Display Modal */}
      <Dialog open={!!codeModalData} onOpenChange={(open) => !open && setCodeModalData(null)}>
        <DialogContent className="max-w-md bg-white border-[var(--color-sand)]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[var(--color-navy)] flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-600" />
              {codeModalData?.isRegeneration ? "New Access Code Generated" : "Staff Account Created"}
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--color-navy)]/60">
              Provide this one-time code to <strong>{codeModalData?.staffName}</strong> ({codeModalData?.staffEmail}).
            </DialogDescription>
          </DialogHeader>

          {codeModalData && (
            <div className="space-y-4 mt-2">
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-center space-y-2">
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                  Temporary Access Code
                </p>
                <div className="flex items-center justify-center gap-3">
                  <span className="font-mono text-xl sm:text-2xl font-black text-[var(--color-navy)] tracking-wider break-all sm:break-normal">
                    {codeModalData.code}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="p-2 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 transition-colors text-amber-900"
                    title="Copy code"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                {copied && (
                  <p className="text-[11px] text-emerald-700 font-medium">
                    Copied to clipboard!
                  </p>
                )}
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-700">Instructions for staff member:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-[11px]">
                  <li>Navigate to the staff login portal: <code className="bg-white px-1 py-0.5 rounded border">/staff/login</code></li>
                  <li>Enter email ({codeModalData.staffEmail}) and this temporary code</li>
                  <li>Immediately establish a private permanent password</li>
                </ol>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setCodeModalData(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--color-navy)] text-white hover:bg-[var(--color-navy)]/90"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
