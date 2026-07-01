import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth/session";
import { registerClient, unregisterClient } from "@/services/notifications/sse-manager";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;

    if (!token) {
      return new Response("Unauthorized", { status: 401 });
    }

    const user = await getSessionUser(token);
    if (!user || user.role !== "admin") {
      return new Response("Unauthorized", { status: 401 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // 1. Send initial connection status
        controller.enqueue(
          encoder.encode("event: welcome\ndata: Connected to Snail Studio Live SSE Gateway\n\n")
        );

        // 2. Define safe event sender
        const sendEvent = (event: string, data: any) => {
          try {
            controller.enqueue(
              encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
            );
          } catch (err) {
            console.error("[SSE] Failed writing event to stream:", err);
          }
        };

        // 3. Register client in the memory registry
        registerClient(user.id, user.role, sendEvent);

        // 4. Set up periodic heartbeat check-ins
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(": heartbeat\n\n"));
          } catch (err) {
            clearInterval(heartbeat);
          }
        }, 20000);

        // 5. Release resources on client connection abort
        req.signal.addEventListener("abort", () => {
          clearInterval(heartbeat);
          unregisterClient(user.id, sendEvent);
          try {
            controller.close();
          } catch (err) {}
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("GET /api/notifications/sse error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
