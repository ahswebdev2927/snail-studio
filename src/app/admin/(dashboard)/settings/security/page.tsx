"use client";

import React, { useState, useEffect } from "react";
import { customConfirm } from "@/components/ui/alert-dialog-provider";
import { 
  ShieldCheck, 
  Users, 
  History, 
  SlidersHorizontal, 
  Search, 
  UserCheck, 
  UserMinus, 
  Loader2, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar,
  Lock,
  Globe,
  Monitor
} from "lucide-react";

interface UserProfile {
  id: string;
  phoneNumber: string;
  whatsappNumber: string | null;
  email: string | null;
  name: string | null;
  image: string | null;
  role: "admin" | "customer";
  isActive: boolean;
  isStoreOwner: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface AuditLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetUserId: string | null;
  previousRole: string | null;
  newRole: string | null;
  ipAddress: string | null;
  browser: string | null;
  timestamp: string;
  verificationMethod: string;
  verificationStatus: "verified" | "failed" | "pending";
}

export default function AdminSecuritySettingsPage() {
  const [activeTab, setActiveTab] = useState<"roles" | "logs" | "config">("roles");
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [timeoutMinutes, setTimeoutMinutes] = useState<string>("15");
  
  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "customer">("all");

  // Loading & Action States
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showStatus = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 6000);
  };

  const fetchUsersAndLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/users?role=${roleFilter === "all" ? "" : roleFilter}&q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
        setAuditLogs(data.auditLogs || []);
      } else {
        showStatus("error", "Failed to retrieve access management directories.");
      }
    } catch (err) {
      console.error(err);
      showStatus("error", "An error occurred while loading directories.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.security_verification_timeout_minutes) {
          setTimeoutMinutes(data.security_verification_timeout_minutes);
        }
      }
    } catch (err) {
      console.error("Failed to load timeout setting:", err);
    }
  };

  // Initial load and filter change trigger
  useEffect(() => {
    fetchUsersAndLogs();
  }, [searchQuery, roleFilter]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleRoleChange = async (userId: string, currentRole: "admin" | "customer") => {
    const targetRole = currentRole === "admin" ? "customer" : "admin";
    const confirmMsg = currentRole === "admin"
      ? "Are you sure you want to demote this user? They will lose all access to the administrative dashboard."
      : "Are you sure you want to promote this user to Admin? They will have full read/write access to settings, catalog, and customer records.";
      
    if (!await customConfirm("Modify User Role", confirmMsg)) return;

    setActionUserId(userId);
    showStatus("success", "OTP Verification triggered. Please check your email.");

    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: targetRole }),
      });

      const data = await res.json();
      if (res.ok) {
        showStatus("success", data.message || "User role updated successfully.");
        fetchUsersAndLogs(); // Reload data
      } else {
        showStatus("error", data.error || "Failed to update user role.");
      }
    } catch (err) {
      console.error(err);
      showStatus("error", "An error occurred during the role update process.");
    } finally {
      setActionUserId(null);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          security_verification_timeout_minutes: timeoutMinutes,
        }),
      });

      if (res.ok) {
        showStatus("success", "Security session timeout successfully updated.");
      } else {
        const data = await res.json();
        showStatus("error", data.error || "Failed to save configuration.");
      }
    } catch (err) {
      console.error(err);
      showStatus("error", "An error occurred while saving the configuration.");
    } finally {
      setIsSavingConfig(false);
    }
  };



  const getActionBadgeStyle = (action: string) => {
    if (action.includes("promote")) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800/30";
    if (action.includes("demote")) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800/30";
    if (action.includes("delete")) return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800/30";
    return "bg-secondary text-secondary-foreground border-border";
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-wide text-foreground flex items-center gap-3">
            <Lock className="w-8 h-8 text-primary" />
            Security & Access Management
          </h1>
          <p className="text-xs text-muted-foreground font-light leading-relaxed mt-1">
            Manage administrative personnel roles, monitor system audit logs, and configure security parameters.
          </p>
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 border transition-all animate-fade-in ${
          statusMessage.type === "success" 
            ? "bg-green-500/10 text-green-500 border-green-500/20" 
            : "bg-destructive/10 text-destructive border-destructive/20"
        }`}>
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span className="text-xs font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* Tabs Menu */}
      <div className="flex border-b border-border/40 gap-6">
        <button
          onClick={() => setActiveTab("roles")}
          className={`pb-4 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === "roles"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Admin & Roles
          </span>
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`pb-4 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === "logs"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Security Logs
          </span>
        </button>
        <button
          onClick={() => setActiveTab("config")}
          className={`pb-4 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === "config"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4" />
            Configurations
          </span>
        </button>
      </div>

      {/* Tab: Roles */}
      {activeTab === "roles" && (
        <div className="space-y-6 animate-fade-in">
          {/* Filtering Header */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card border border-border/40 p-4 rounded-2xl shadow-sm">
            {/* Search */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search user by name, phone, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-secondary/10 border border-border/40 focus:border-primary text-xs rounded-full focus:outline-none transition-all"
              />
            </div>
            
            {/* Filter */}
            <div className="flex gap-2 w-full sm:w-auto">
              <span className="text-xs text-muted-foreground flex items-center mr-2">Filter Role:</span>
              {(["all", "admin", "customer"] as const).map((role) => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={`px-4 py-2 rounded-full text-xs font-medium uppercase tracking-wider border transition-all cursor-pointer ${
                    roleFilter === role
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background text-muted-foreground border-border hover:bg-secondary/40 hover:text-foreground"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Directory Grid */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Loading directory index...</span>
            </div>
          ) : usersList.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border/40 bg-card rounded-2xl">
              <p className="text-sm text-muted-foreground">No users match the search criteria.</p>
            </div>
          ) : (
            <div className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-secondary/10 text-muted-foreground text-[10px] font-semibold uppercase tracking-wider border-b border-border/40">
                      <th className="py-4 px-6">Name / Details</th>
                      <th className="py-4 px-6">Contact Info</th>
                      <th className="py-4 px-6">Current Role</th>
                      <th className="py-4 px-6">Permissions & Status</th>
                      <th className="py-4 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20 text-xs">
                    {usersList.map((user) => (
                      <tr key={user.id} className="hover:bg-secondary/10 transition-all">
                        {/* Name & ID */}
                        <td className="py-4 px-6 flex items-center gap-3">
                          {user.image ? (
                            <img src={user.image} alt={user.name || ""} className="w-10 h-10 rounded-full object-cover border border-border/40" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary/10 to-accent/10 text-primary font-bold flex items-center justify-center border border-primary/20">
                              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                            </div>
                          )}
                          <div className="space-y-0.5">
                            <span className="font-semibold text-foreground flex items-center gap-1.5">
                              {user.name || "Unnamed User"}
                              {user.isStoreOwner && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/15 text-primary text-[9px] font-bold rounded-full uppercase tracking-wider border border-primary/25">
                                  Owner
                                </span>
                              )}
                            </span>
                            <span className="block text-[10px] font-mono text-muted-foreground">ID: {user.id}</span>
                          </div>
                        </td>

                        {/* Contacts */}
                        <td className="py-4 px-6">
                          <span className="block font-medium">{user.phoneNumber}</span>
                          {user.email && <span className="block text-[10px] text-muted-foreground">{user.email}</span>}
                        </td>

                        {/* Role */}
                        <td className="py-4 px-6">
                          <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            user.role === "admin"
                              ? "bg-red-500/10 text-red-500 border-red-500/20"
                              : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                          }`}>
                            {user.role}
                          </span>
                        </td>

                        {/* Permissions / CreatedAt */}
                        <td className="py-4 px-6 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${user.isActive ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                            <span className="text-[10px] text-muted-foreground">
                              {user.isActive ? "Active Account" : "Deactivated"}
                            </span>
                          </div>
                          <span className="block text-[10px] text-muted-foreground/60 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            Registered: {new Date(user.createdAt).toLocaleDateString()}
                          </span>
                        </td>

                        {/* Toggle button */}
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => handleRoleChange(user.id, user.role)}
                            disabled={actionUserId !== null}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer border shadow-sm transition-all active:scale-[0.98] ${
                              user.role === "admin"
                                ? "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80 disabled:opacity-50"
                                : "bg-primary text-primary-foreground border-primary hover:bg-primary/95 disabled:opacity-50"
                            }`}
                          >
                            {actionUserId === user.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : user.role === "admin" ? (
                              <>
                                <UserMinus className="w-3.5 h-3.5" />
                                Demote
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3.5 h-3.5" />
                                Promote
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Security Logs */}
      {activeTab === "logs" && (
        <div className="space-y-4 animate-fade-in">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Loading audit log entries...</span>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border/40 bg-card rounded-2xl">
              <p className="text-sm text-muted-foreground">No security logs recorded yet.</p>
            </div>
          ) : (
            <div className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-secondary/10 text-muted-foreground text-[10px] font-semibold uppercase tracking-wider border-b border-border/40">
                      <th className="py-4 px-6">Administrator</th>
                      <th className="py-4 px-6">Action Event</th>
                      <th className="py-4 px-6">Target User ID</th>
                      <th className="py-4 px-6">Verification Method / Status</th>
                      <th className="py-4 px-6">Metadata Details</th>
                      <th className="py-4 px-6">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20 text-xs">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-secondary/10 transition-all font-light">
                        {/* Admin Name */}
                        <td className="py-4 px-6 font-semibold text-foreground">
                          {log.adminName}
                          <span className="block text-[10px] font-mono text-muted-foreground font-normal">ID: {log.adminId}</span>
                        </td>

                        {/* Action badge */}
                        <td className="py-4 px-6">
                          <span className={`inline-block px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${getActionBadgeStyle(log.action)}`}>
                            {log.action.replace("_", " ")}
                          </span>
                        </td>

                        {/* Target User */}
                        <td className="py-4 px-6 font-mono text-[10px]">
                          {log.targetUserId || "None"}
                        </td>

                        {/* Verification details */}
                        <td className="py-4 px-6 space-y-0.5">
                          <span className="block font-medium uppercase text-[9px] tracking-wider text-muted-foreground/80">
                            {log.verificationMethod.replace("_", " ")}
                          </span>
                          <span className={`inline-block font-semibold text-[10px] ${
                            log.verificationStatus === "verified"
                              ? "text-green-500"
                              : log.verificationStatus === "pending"
                                ? "text-amber-500 animate-pulse"
                                : "text-red-500"
                          }`}>
                            ● {log.verificationStatus.toUpperCase()}
                          </span>
                        </td>

                        {/* IP/Browser */}
                        <td className="py-4 px-6 text-[10px] text-muted-foreground/80 space-y-1">
                          <div className="flex items-center gap-1">
                            <Globe className="w-3.5 h-3.5" />
                            <span>IP: {log.ipAddress || "Unknown"}</span>
                          </div>
                          <div className="flex items-center gap-1 max-w-[150px] truncate">
                            <Monitor className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate" title={log.browser || "Unknown"}>
                              {log.browser || "Unknown"}
                            </span>
                          </div>
                        </td>

                        {/* Timestamp */}
                        <td className="py-4 px-6 text-[10px] text-muted-foreground font-mono">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Config */}
      {activeTab === "config" && (
        <div className="bg-card border border-border/40 p-8 rounded-2xl shadow-sm max-w-xl animate-fade-in">
          <form onSubmit={handleSaveConfig} className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold tracking-wide text-foreground">
                Sudo Session Configuration
              </h3>
              <p className="text-xs text-muted-foreground font-light leading-relaxed mt-1">
                Configure the duration of the Security Sudo Session. After completing an OTP verification, the administrator can perform sensitive actions without entering another OTP until this timeout is exceeded.
              </p>
            </div>

            {/* Timeout minutes */}
            <div className="space-y-2">
              <label htmlFor="timeout" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Re-Authentication Timeout (Minutes)
              </label>
              <input
                id="timeout"
                type="number"
                min={1}
                max={120}
                required
                value={timeoutMinutes}
                onChange={(e) => setTimeoutMinutes(e.target.value)}
                className="w-full max-w-xs px-4 py-2.5 bg-secondary/10 border border-border/40 focus:border-primary text-xs rounded-xl focus:outline-none transition-all font-mono"
              />
              <p className="text-[10px] text-muted-foreground/60">
                Recommended value is 15 minutes. High security environments should set this lower (e.g., 5 minutes).
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSavingConfig}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-xs font-semibold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-md shadow-primary/10 cursor-pointer disabled:opacity-50"
            >
              {isSavingConfig ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving
                </>
              ) : (
                "Save Configuration"
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
