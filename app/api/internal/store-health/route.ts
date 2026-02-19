import { NextResponse } from "next/server";
import { getAgentsStoreAdapter } from "@/lib/store";

export async function GET() {
  const store = getAgentsStoreAdapter();
  try {
    const agents = await store.readAll();
    return NextResponse.json({
      ok: true,
      backend: store.kind,
      count: agents.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Store check failed";
    return NextResponse.json(
      {
        ok: false,
        backend: store.kind,
        error: message,
      },
      { status: 500 }
    );
  }
}
