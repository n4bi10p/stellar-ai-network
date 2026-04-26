// GET  /api/agents — List agents (optionally filtered by owner)
// POST /api/agents — Build an initialize-agent transaction + store in JSON

import { NextRequest, NextResponse } from "next/server";
import { buildInitialize } from "@/lib/stellar/contracts";
import { deleteCachedByPrefix, withCached } from "@/lib/cache/cache";
import {
  buildRateLimitKey,
  checkRateLimit,
  rateLimitResponse,
} from "@/lib/middleware/rateLimiter";
import { readAgents, addAgent, getAgentsByOwner } from "@/lib/store/agents";
import { saveUserEvent } from "@/lib/store/analytics";
import {
  supportedAgentStrategySchema,
  validateStrategyConfig,
} from "@/lib/utils/validation";

export async function GET(request: NextRequest) {
  try {
    const owner = request.nextUrl.searchParams.get("owner");
    const cacheKey = owner ? `agents:list:owner:${owner}` : "agents:list:all";
    const agents = await withCached(
      cacheKey,
      () => (owner ? getAgentsByOwner(owner) : readAgents()),
      15
    );
    return NextResponse.json({ agents });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to list agents";
    console.error("[API GET /agents] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit(buildRateLimitKey(request, "agents:create"), {
      maxRequests: 10,
      windowMs: 60_000,
    });
    if (!rateLimit.allowed) {
      return rateLimitResponse(
        rateLimit,
        "Too many agent creation requests. Please try again in a minute."
      );
    }

    const { owner, name, strategy, templateId, strategyConfig } =
      await request.json();

    if (!owner || !name || !strategy) {
      return NextResponse.json(
        { error: "Missing required fields: owner, name, strategy" },
        { status: 400 }
      );
    }

    const parsedStrategy = supportedAgentStrategySchema.safeParse(strategy);
    if (!parsedStrategy.success) {
      return NextResponse.json(
        { error: "Unsupported strategy" },
        { status: 400 }
      );
    }

    const validatedConfig = validateStrategyConfig(
      parsedStrategy.data,
      (strategyConfig as Record<string, unknown> | undefined) ?? {}
    );
    if (!validatedConfig.success) {
      return NextResponse.json(
        {
          error:
            validatedConfig.error.issues[0]?.message ??
            "Invalid strategy configuration",
        },
        { status: 400 }
      );
    }

    const contractId = process.env.NEXT_PUBLIC_AGENT_CONTRACT_ID;
    if (!contractId) {
      return NextResponse.json(
        { error: "Agent contract not deployed. Set NEXT_PUBLIC_AGENT_CONTRACT_ID in .env.local" },
        { status: 500 }
      );
    }

    // Build the unsigned transaction XDR for initialize()
    const xdr = await buildInitialize(
      contractId,
      owner,
      name,
      parsedStrategy.data,
      owner
    );

    // Persist agent metadata in server-side store (include optional strategyConfig)
    const stored = await addAgent({
      contractId,
      owner,
      name,
      strategy: parsedStrategy.data,
      templateId: templateId ?? null,
      txHash: null,
      strategyConfig: validatedConfig.data,
      executionMode: "manual",
      reminders: {
        channels: { inApp: true, email: false, telegram: false, discord: false },
        digestMode: "instant",
      },
      fullAuto: {
        consentAcceptedAt: null,
        consentVersion: null,
        encryptedSecret: null,
        keyStoredAt: null,
        keyRevokedAt: null,
      },
    });

    // Emit analytics event (non-blocking)
    saveUserEvent(owner, "agent_created", {
      agentId: stored.id,
      agentName: name,
      strategy: parsedStrategy.data,
      contractId,
    }).catch(() => {}); // Silently fail if analytics unavailable

    deleteCachedByPrefix("agents:list:");
    deleteCachedByPrefix("analytics:metrics:");

    return NextResponse.json({
      success: true,
      contractId,
      agentId: stored.id,
      xdr,
      message: "Sign and submit this transaction to initialize your agent.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to build agent transaction";
    console.error("[API /agents] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
