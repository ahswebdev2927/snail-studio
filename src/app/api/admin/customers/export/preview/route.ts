import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/middleware/auth";
import { getExportPreview } from "@/services/crm/export/customer-export.service";
import { logRouteHandler } from "@/lib/logger/request";

async function postHandler(req: NextRequest) {
  const reqLogger = (req as any).log;
  try {
    // 1. Authenticate and check Admin authorization
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // 2. Fetch formatted preview rows and pagination info
    const previewData = await getExportPreview(body);
    return NextResponse.json(previewData, { status: 200 });

  } catch (error: any) {
    if (reqLogger) {
      reqLogger.error({ err: error }, "POST /api/admin/customers/export/preview error");
    } else {
      console.error("POST /api/admin/customers/export/preview error:", error);
    }
    
    // Return validation or syntax errors safely
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: error.name === "ZodError" ? 400 : 500 }
    );
  }
}

export const POST = logRouteHandler(postHandler);
