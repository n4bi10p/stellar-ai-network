import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(request: NextRequest) {
  try {
    const { input } = await request.json();

    if (!input || typeof input !== "string") {
      return NextResponse.json(
        { error: "Missing 'input' field" },
        { status: 400 }
      );
    }

    const normalizedInput = input.trim().toLowerCase();
    const greetingPattern =
      /^(hi|hello|hey|yo|sup|gm|good morning|good afternoon|good evening|namaste|salam|hola)\b/;
    if (greetingPattern.test(normalizedInput)) {
      return NextResponse.json({ parsed: { action: "greet" } });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const prompt = `You are an intent classifier for the Stellar AI Agent Network.
Classify the user command into exactly one action.

Rules:
- Use "greet" for greetings or small talk (hello/hi/hey/etc).
- Use "check_balance" ONLY when the user explicitly asks about balance, funds, wallet amount, or holdings.
- Use "create_agent" when the user wants to deploy/create an agent.
- Use "send_xlm" only for transfer/payment intent and include destination + amount when available.
- Never map a greeting to "check_balance".

User command: "${input}"

Return ONLY valid JSON with this structure:
{
  "action": "send_xlm" | "check_balance" | "create_agent" | "greet",
  "destination": "GXXX..." (if sending — must be a full 56-character Stellar address starting with G),
  "amount": "100" (if sending — as a string number)
}

Examples:
"Send 10 XLM to GABC...WXYZ" → {"action":"send_xlm","destination":"GABC...WXYZ","amount":"10"}
"What's my balance?" → {"action":"check_balance"}
"Check balance" → {"action":"check_balance"}
"Create an agent" → {"action":"create_agent"}
"hello" → {"action":"greet"}
"hey there" → {"action":"greet"}
"Transfer 50 lumens to GDEF..." → {"action":"send_xlm","destination":"GDEF...","amount":"50"}

Return ONLY the JSON object, no markdown, no explanation.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Could not parse AI response" },
        { status: 422 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ parsed });
  } catch (error: unknown) {
    console.error("[AI/PARSE] Error:", error);
    const msg = error instanceof Error ? error.message : "AI parsing failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
