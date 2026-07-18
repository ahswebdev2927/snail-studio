"use client";

import React, { useState, useEffect, useRef } from "react";
import Sidebar from "./sidebar";
import Header from "./header";
import { SessionUser } from "@/lib/auth/session";
import OtpVerificationModal from "./otp-verification-modal";

interface AdminShellProps {
  user: SessionUser;
  children: React.ReactNode;
}

export default function AdminShell({ user, children }: AdminShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // OTP Verification Modal states
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpActionName, setOtpActionName] = useState("");
  const [otpDevCode, setOtpDevCode] = useState<string | undefined>(undefined);
  const resolveVerificationRef = useRef<((value: boolean) => void) | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("admin-theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Set up transparent token refresh on 401, and OTP verification on 403
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async function (input, init) {
      let response = await originalFetch(input, init);

      if (response.status === 401) {
        const url = typeof input === "string" 
          ? input 
          : input instanceof URL 
            ? input.toString() 
            : input.url;

        // Don't intercept refresh token or login requests to avoid loops
        if (url.includes("/api/auth/refresh") || url.includes("/api/auth/login")) {
          return response;
        }

        try {
          const refreshRes = await originalFetch("/api/auth/refresh", {
            method: "POST",
          });

          if (refreshRes.ok) {
            // Re-fetch the original request with updated cookies
            response = await originalFetch(input, init);
          } else {
            // Refresh failed, redirect to login
            window.location.href = "/admin/login";
          }
        } catch (err) {
          console.error("Transparent session refresh failed:", err);
          window.location.href = "/admin/login";
        }
      } else if (response.status === 403) {
        // Intercept 403 and check if security verification is required
        try {
          const clonedRes = response.clone();
          const data = await clonedRes.json();
          if (data && data.verificationRequired) {
            setOtpActionName(data.action || "sensitive_action");
            setOtpDevCode(data.devOtp);
            setShowOtpModal(true);

            // Wait for user to verify OTP in modal
            const verified = await new Promise<boolean>((resolve) => {
              resolveVerificationRef.current = resolve;
            });

            setShowOtpModal(false);

            if (verified) {
              // Retry original request (which will now send the newly set securitySession cookie)
              return await originalFetch(input, init);
            }
          }
        } catch (err) {
          console.warn("Non-JSON or unhandled 403 Forbidden response:", err);
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const handleOtpSuccess = () => {
    if (resolveVerificationRef.current) {
      resolveVerificationRef.current(true);
    }
  };

  const handleOtpClose = () => {
    if (resolveVerificationRef.current) {
      resolveVerificationRef.current(false);
    }
  };


  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("admin-theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const toggleSidebar = () => {
    setIsCollapsed((prev) => !prev);
  };

  const toggleMobileSidebar = () => {
    setIsMobileOpen((prev) => !prev);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground transition-colors duration-300 font-sans">
      {/* Mobile Sidebar Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={toggleMobileSidebar}
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden transition-all duration-300"
        />
      )}

      {/* Sidebar Component */}
      <Sidebar
        isCollapsed={isCollapsed}
        isMobileOpen={isMobileOpen}
        closeMobileSidebar={() => setIsMobileOpen(false)}
        user={user}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Header */}
        <Header
          isCollapsed={isCollapsed}
          toggleSidebar={toggleSidebar}
          toggleMobileSidebar={toggleMobileSidebar}
          theme={theme}
          toggleTheme={toggleTheme}
          user={user}
        />

        {/* Scrollable page body */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 bg-secondary/10 dark:bg-secondary/5 transition-colors duration-300">
          <div className="max-w-7xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      <OtpVerificationModal
        isOpen={showOtpModal}
        actionName={otpActionName}
        devOtp={otpDevCode}
        onClose={handleOtpClose}
        onSuccess={handleOtpSuccess}
      />
    </div>
  );
}
