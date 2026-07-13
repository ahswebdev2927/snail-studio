import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import AdminShell from "@/components/admin/admin-shell";
import { ShieldAlert, LogOut, Home } from "lucide-react";

export const metadata = {
  title: "Admin Portal | Snail Studio",
  description: "Management portal for Snail Studio Press-On Nails store.",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    redirect("/admin/login");
  }

  const user = await getSessionUser(token);

  if (!user) {
    redirect("/admin/login");
  }

  // RBAC check: only admins allowed
  if (user.role !== "admin") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-6 bg-gradient-to-br from-background via-secondary/10 to-background text-foreground font-sans">
        <div className="w-full max-w-md bg-card border border-destructive/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden transition-all duration-300 hover:shadow-destructive/5">
          {/* Top subtle red gradient glow */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-destructive/40 via-destructive to-destructive/40" />
          
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="p-4 bg-destructive/10 text-destructive rounded-2xl animate-pulse">
              <ShieldAlert className="w-10 h-10" />
            </div>
            
            <div className="space-y-2">
              <h1 className="font-serif text-2xl font-semibold tracking-wide">
                Access Denied
              </h1>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                Your account (<span className="font-medium text-foreground">{user.phoneNumber}</span>) does not have administrative privileges. Please contact the system administrator if this is an error.
              </p>
            </div>

            <div className="w-full pt-4 flex flex-col sm:flex-row gap-3">
              <a
                href="/"
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-xs font-semibold uppercase tracking-wider bg-secondary text-secondary-foreground hover:bg-secondary/95 transition-all border border-secondary"
              >
                <Home className="w-4 h-4" />
                Storefront
              </a>
              <form action="/api/auth/logout" method="POST" className="flex-1">
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-xs font-semibold uppercase tracking-wider bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm shadow-destructive/10"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <AdminShell user={user}>{children}</AdminShell>;
}
