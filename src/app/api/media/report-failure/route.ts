import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { cookies } from "next/headers";
import { triggerAdminNotification } from "@/services/notifications/notification-service";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;

    let user = null;
    if (token) {
      user = await getSessionUser(token);
    }

    let body;
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    
    const { error, fileName, folder } = body;

    // Trigger admin system notification for upload failure
    await triggerAdminNotification({
      category: "system",
      title: "Cloudinary Upload Failure",
      message: `Media upload failed for file '${fileName || "unknown"}' to folder '${folder || "general"}'.\nError: ${error || "Unknown upload error"}\nUser: ${user ? `${user.name} (${user.role})` : "Guest/Customer"}`,
      priority: "high",
      data: {
        action: "cloudinary_upload_failure",
        entityType: "media",
        entityId: fileName || "unknown",
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Failed to report Cloudinary failure:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
