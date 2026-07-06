"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "./sidebar";
import Header from "./header";
import { SessionUser } from "@/lib/auth/session";

interface AdminShellProps {
  user: SessionUser;
  children: React.ReactNode;
}

export default function AdminShell({ user, children }: AdminShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

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

  // Set up transparent token refresh on 401 Unauthorized errors
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
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

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
    </div>
  );
}
