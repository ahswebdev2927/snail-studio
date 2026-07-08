"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { 
  Shield, 
  Monitor, 
  Smartphone, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Globe,
  LogOut,
  HelpCircle
} from "lucide-react";
import { revokeSession, revokeOtherSessions, revokeAllSessions } from "@/features/account/actions";

interface Session {
  id: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  isCurrent: boolean;
}

interface SecurityClientProps {
  initialSessions: Session[];
}

// User-Agent parser helper
function parseUserAgent(ua: string | null): { os: string; browser: string; isMobile: boolean } {
  if (!ua) return { os: "Unknown System", browser: "Unknown Browser", isMobile: false };

  let os = "Unknown OS";
  let browser = "Unknown Browser";
  const lowerUa = ua.toLowerCase();

  // Parse OS
  if (lowerUa.includes("windows nt 10.0")) os = "Windows 10/11";
  else if (lowerUa.includes("windows nt 6.3")) os = "Windows 8.1";
  else if (lowerUa.includes("windows nt 6.2")) os = "Windows 8";
  else if (lowerUa.includes("windows nt 6.1")) os = "Windows 7";
  else if (lowerUa.includes("macintosh") || lowerUa.includes("mac os x")) os = "macOS";
  else if (lowerUa.includes("android")) os = "Android";
  else if (lowerUa.includes("iphone") || lowerUa.includes("ipad") || lowerUa.includes("ipod")) os = "iOS";
  else if (lowerUa.includes("linux")) os = "Linux";

  // Parse Browser
  if (lowerUa.includes("edg/")) browser = "Microsoft Edge";
  else if (lowerUa.includes("opr/") || lowerUa.includes("opera")) browser = "Opera";
  else if (lowerUa.includes("firefox/")) browser = "Mozilla Firefox";
  // Chrome check must come after Edge and Opera because they include "Chrome" in UA
  else if (lowerUa.includes("chrome/")) browser = "Google Chrome";
  else if (lowerUa.includes("safari/")) browser = "Apple Safari";
  else if (lowerUa.includes("postmanruntime/")) browser = "Postman API Client";

  const isMobile = lowerUa.includes("mobile") || lowerUa.includes("android") || lowerUa.includes("iphone") || lowerUa.includes("ipad");

  return { os, browser, isMobile };
}

export function SecurityClient({ initialSessions }: SecurityClientProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sessions, setSessions] = useState<Session[]>(initialSessions);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  // UX states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState<"other" | "all" | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Confirmation modal helpers
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    type: "single" | "other" | "all";
    targetId?: string;
  }>({ open: false, type: "single" });

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(""), 6000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const handleRevokeSingle = async (sessionId: string) => {
    setSuccessMessage("");
    setErrorMessage("");
    setActionLoadingId(sessionId);
    setConfirmModal({ open: false, type: "single" });

    try {
      const res = await revokeSession(sessionId);
      if (res.success) {
        if (res.loggedOut) {
          setSuccessMessage("Current session revoked. Logging out...");
          setTimeout(() => {
            window.location.href = "/login";
          }, 1500);
        } else {
          setSessions(sessions.filter((s) => s.id !== sessionId));
          setSuccessMessage("Session revoked successfully. The associated device has been signed out.");
        }
      } else {
        setErrorMessage(res.error || "Failed to revoke session.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage("An error occurred while revoking the session.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRevokeOthers = async () => {
    setSuccessMessage("");
    setErrorMessage("");
    setBulkLoading("other");
    setConfirmModal({ open: false, type: "other" });

    try {
      const res = await revokeOtherSessions();
      if (res.success) {
        setSessions(sessions.filter((s) => s.isCurrent));
        setSuccessMessage("Successfully logged out of all other devices.");
      } else {
        setErrorMessage(res.error || "Failed to revoke other sessions.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage("An error occurred while logging out other devices.");
    } finally {
      setBulkLoading(null);
    }
  };

  const handleRevokeAll = async () => {
    setSuccessMessage("");
    setErrorMessage("");
    setBulkLoading("all");
    setConfirmModal({ open: false, type: "all" });

    try {
      const res = await revokeAllSessions();
      if (res.success) {
        setSuccessMessage("All sessions revoked. Redirecting to login...");
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
      } else {
        setErrorMessage(res.error || "Failed to revoke all sessions.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage("An error occurred while revoking all sessions.");
    } finally {
      setBulkLoading(null);
    }
  };

  // Render modal content dynamically
  const getModalTitle = () => {
    switch (confirmModal.type) {
      case "other":
        return "Sign Out of Other Devices?";
      case "all":
        return "Sign Out of All Devices?";
      default:
        return "Sign Out of this Device?";
    }
  };

  const getModalDescription = () => {
    switch (confirmModal.type) {
      case "other":
        return "This will immediately terminate all active sessions except your current device. You will remain logged in here, but other devices will be forced to authenticate again.";
      case "all":
        return "This will immediately terminate all active sessions including this one. You will be logged out of this device and redirected back to the login page.";
      default:
        return "Are you sure you want to terminate this session? The device using this session will be logged out immediately.";
    }
  };

  const triggerAction = () => {
    if (confirmModal.type === "other") {
      handleRevokeOthers();
    } else if (confirmModal.type === "all") {
      handleRevokeAll();
    } else if (confirmModal.type === "single" && confirmModal.targetId) {
      handleRevokeSingle(confirmModal.targetId);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="space-y-1">
        <h2 className="font-serif text-2xl font-semibold text-foreground tracking-wide flex items-center gap-2">
          Security Settings
        </h2>
        <p className="text-xs text-muted-foreground font-light">
          Monitor your active login sessions and terminate access keys for external devices.
        </p>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="bg-success/15 border border-success/30 text-success p-4 rounded-2xl flex items-start gap-3 text-xs animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-success mt-0.5" />
          <div>
            <p className="font-semibold">Security Updated</p>
            <p className="font-light mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-450 p-4 rounded-2xl flex items-start gap-3 text-xs animate-in slide-in-from-top duration-300">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
          <div>
            <p className="font-semibold">Security Update Failed</p>
            <p className="font-light mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Active Sessions Panel */}
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-border/20">
          <h3 className="font-serif text-base font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary shrink-0" />
            Active Login Sessions ({sessions.length})
          </h3>
        </div>

        <div className="space-y-4">
          {sessions.map((session) => {
            const { os, browser, isMobile } = parseUserAgent(session.deviceInfo);
            const Icon = isMobile ? Smartphone : Monitor;
            const isLoading = actionLoadingId === session.id;

            return (
              <div 
                key={session.id}
                className={`bg-card border rounded-2xl p-5 flex items-center justify-between gap-4 transition-all ${
                  session.isCurrent 
                    ? "border-primary/30 shadow-sm bg-secondary/5" 
                    : "border-border/30 hover:border-primary/10"
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* Device Icon */}
                  <div className={`p-3 rounded-xl shrink-0 ${
                    session.isCurrent ? "bg-primary/10 text-primary" : "bg-secondary/40 text-muted-foreground"
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-semibold text-foreground truncate">
                        {browser} on {os}
                      </h4>
                      {session.isCurrent ? (
                        <span className="text-[8px] tracking-wider uppercase font-bold text-primary bg-primary/15 border border-primary/20 px-2 py-0.5 rounded-full select-none">
                          Current Device
                        </span>
                      ) : (
                        <span className="text-[8px] tracking-wider uppercase font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full select-none border border-secondary/20">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-light flex-wrap">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5" />
                        IP: {session.ipAddress || "Unknown IP"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Expires: {new Date(session.expiresAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Revoke Button */}
                <button
                  type="button"
                  disabled={isLoading || actionLoadingId !== null || bulkLoading !== null}
                  onClick={() => setConfirmModal({ open: true, type: "single", targetId: session.id })}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    session.isCurrent
                      ? "text-rose-600 hover:bg-rose-550/10 hover:text-rose-700 bg-rose-500/5 border border-rose-500/10"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={session.isCurrent ? "Log out of this device" : "Terminate active session"}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogOut className="w-4 h-4" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bulk Logout Actions */}
      {sessions.length > 1 && (
        <div className="pt-6 border-t border-border/20 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Administrative Management
          </h4>
          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              disabled={actionLoadingId !== null || bulkLoading !== null}
              onClick={() => setConfirmModal({ open: true, type: "other" })}
              className="px-5 py-3 border border-border text-foreground hover:bg-secondary/40 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {bulkLoading === "other" ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Processing Sign Out...
                </>
              ) : (
                <>
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out of Other Devices
                </>
              )}
            </button>

            <button
              type="button"
              disabled={actionLoadingId !== null || bulkLoading !== null}
              onClick={() => setConfirmModal({ open: true, type: "all" })}
              className="px-5 py-3 bg-destructive/10 hover:bg-destructive/15 text-destructive border border-destructive/20 hover:border-destructive/30 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {bulkLoading === "all" ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Processing Total Revocation...
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  Sign Out of All Devices
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal Overlay */}
      {confirmModal.open && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-background/60 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300">
          <div 
            className="bg-card border border-border/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 my-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-semibold text-foreground pt-2">
                {getModalTitle()}
              </h3>
              <p className="text-xs text-muted-foreground font-light leading-relaxed">
                {getModalDescription()}
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal({ open: false, type: "single" })}
                className="px-4 py-2 border border-border rounded-xl hover:bg-secondary-surface text-foreground text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={triggerAction}
                className="px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Confirm Sign Out
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
