"use client";

import React, { useState, useEffect } from "react";
import { Mail, Save, RefreshCw, Send, CheckCircle2, XCircle, AlertCircle, Eye, EyeOff } from "lucide-react";

interface EmailLog {
  id: string;
  recipient: string;
  subject: string;
  templateName: string;
  status: "success" | "failed";
  errorMessage: string | null;
  sentAt: string;
}

export default function AdminSmtpSettingsPage() {
  // Tabs: 'settings' | 'logs'
  const [activeTab, setActiveTab] = useState<"settings" | "logs">("settings");

  // Form State
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("465");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Connection Test State
  const [testRecipient, setTestRecipient] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: string } | null>(null);

  // Global State
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Logs state
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [totalLogs, setTotalLogs] = useState(0);

  // Load configuration on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setSmtpHost(data.smtp_host || "");
        setSmtpPort(data.smtp_port || "465");
        setSmtpUser(data.smtp_user || "");
        setSmtpPassword(data.smtp_password || "");
      } else {
        showStatus("error", "Failed to retrieve configuration settings.");
      }
    } catch (err) {
      console.error(err);
      showStatus("error", "An error occurred while fetching settings.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch("/api/admin/email-logs?limit=50");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotalLogs(data.totalCount || 0);
      }
    } catch (err) {
      console.error("Failed to load logs:", err);
    } finally {
      setLogsLoading(false);
    }
  };

  // Fetch logs whenever active tab changes to logs
  useEffect(() => {
    if (activeTab === "logs") {
      fetchLogs();
    }
  }, [activeTab]);

  const showStatus = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 5000);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtp_host: smtpHost,
          smtp_port: smtpPort,
          smtp_user: smtpUser,
          smtp_password: smtpPassword,
        }),
      });

      if (res.ok) {
        showStatus("success", "SMTP configuration successfully updated and verified!");
        // Refresh to get masked passwords
        fetchSettings();
      } else {
        const errData = await res.json();
        showStatus("error", errData.error || "Failed to save configuration settings.");
      }
    } catch (err) {
      console.error(err);
      showStatus("error", "An error occurred while saving the configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient) {
      setTestResult({ success: false, message: "Please specify a recipient email address for the test." });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/admin/settings/smtp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtp_host: smtpHost,
          smtp_port: smtpPort,
          smtp_user: smtpUser,
          smtp_password: smtpPassword,
          test_recipient: testRecipient,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message || "Test email dispatched successfully!",
        });
        // Refresh logs in case they are active
        if (activeTab === "logs") fetchLogs();
      } else {
        setTestResult({
          success: false,
          message: data.error || "SMTP test failed.",
          details: data.details,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: "An unexpected error occurred during connection testing.",
        details: err.message || String(err),
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground font-light">Loading SMTP mail settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl">
        <div className="space-y-1">
          <h1 className="font-serif text-2xl font-normal text-foreground">SMTP Mailer Settings</h1>
          <p className="text-xs text-muted-foreground font-light">
            Set up Nodemailer Hostinger SMTP credentials for transactional store emails.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2 text-xs font-medium rounded-xl transition-all ${
              activeTab === "settings"
                ? "bg-secondary text-secondary-foreground border border-border/60"
                : "text-muted-foreground hover:bg-secondary/30"
            }`}
          >
            Configuration
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2 text-xs font-medium rounded-xl transition-all ${
              activeTab === "logs"
                ? "bg-secondary text-secondary-foreground border border-border/60"
                : "text-muted-foreground hover:bg-secondary/30"
            }`}
          >
            Delivery Logs ({totalLogs})
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-start gap-3 border text-xs leading-relaxed animate-fade-in ${
            statusMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4.5 h-4.5 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Form Card */}
          <div className="lg:col-span-2 bg-card border border-border/40 rounded-3xl p-6 space-y-6">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" /> SMTP Server Setup
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    required
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.hostinger.com"
                    className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    SMTP Port
                  </label>
                  <input
                    type="text"
                    required
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="465"
                    className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    SMTP Username / Sender
                  </label>
                  <input
                    type="email"
                    required
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    placeholder="noreply@snailstudio.com"
                    className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    SMTP Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={smtpPassword}
                      onChange={(e) => setSmtpPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-4 pr-10 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/80 hover:text-foreground cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100 rounded-xl text-xs font-medium transition-all shadow-sm cursor-pointer"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSaving ? "Saving Configuration..." : "Save Configuration"}
                </button>
              </div>
            </form>
          </div>

          {/* Test connection panel */}
          <div className="bg-card border border-border/40 rounded-3xl p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Send className="w-4 h-4 text-primary" /> Test SMTP Delivery
              </h2>
              <p className="text-xs font-light text-muted-foreground leading-relaxed">
                Dispatch an elegant system greetings email to verify if your server hosts accept Nodemailer connections securely.
              </p>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Recipient Test Address
                </label>
                <input
                  type="email"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="recipient@example.com"
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                />
              </div>

              {testResult && (
                <div
                  className={`p-4 rounded-xl flex items-start gap-2.5 border text-[11px] leading-relaxed animate-fade-in ${
                    testResult.success
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                      : "bg-destructive/10 border-destructive/20 text-destructive"
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-semibold">{testResult.message}</p>
                    {testResult.details && (
                      <p className="font-mono text-[9px] break-all opacity-85 leading-normal bg-secondary/20 p-1.5 rounded-md mt-1">
                        {testResult.details}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 lg:pt-0">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80 active:scale-[0.99] disabled:opacity-50 disabled:scale-100 rounded-xl text-xs font-medium transition-all cursor-pointer"
              >
                {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isTesting ? "Testing Connection..." : "Test Connection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "logs" && (
        <div className="bg-card border border-border/40 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" /> Delivery History Audit Trail
            </h2>
            <button
              onClick={fetchLogs}
              disabled={logsLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-secondary border border-border rounded-xl text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? "animate-spin" : ""}`} />
              Refresh Logs
            </button>
          </div>

          {logsLoading && logs.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border/50 rounded-2xl">
              <Mail className="w-8 h-8 text-muted-foreground/45 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground font-light">No mailer logs found in audit history.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-border/30 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-secondary/40 border-b border-border/40 text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    <th className="p-3">Sent At (UTC)</th>
                    <th className="p-3">Recipient</th>
                    <th className="p-3">Subject / Event</th>
                    <th className="p-3">Template</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 text-xs">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-secondary/15 transition-colors">
                      <td className="p-3 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(log.sentAt).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-3 font-medium text-foreground">{log.recipient}</td>
                      <td className="p-3">
                        <div className="font-light truncate max-w-xs">{log.subject}</div>
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-[10px] px-2 py-0.5 bg-secondary/45 border border-border/40 rounded text-muted-foreground">
                          {log.templateName}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase ${
                              log.status === "success" ? "text-emerald-500" : "text-destructive"
                            }`}
                          >
                            {log.status === "success" ? "Sent" : "Failed"}
                          </span>
                          {log.errorMessage && (
                            <span className="text-[9px] text-muted-foreground/85 leading-normal max-w-sm block font-mono bg-destructive/5 p-1 border border-destructive/10 rounded">
                              {log.errorMessage}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
