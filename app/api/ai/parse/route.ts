import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const { input } = await request.json();

    if (!input || typeof input !== "string") {
      return NextResponse.json(
        { error: "Missing 'input' field" },
        { status: 400 }
      );
    }

    const prompt = `You are a Stellar blockchain agent parser. Parse this command into JSON.

User command: "${input}"

Return ONLY valid JSON with this structure:
{
  "action": "send_xlm" | "check_balance" | "create_agent",
  "destination": "GXXX..." (if sending — must be a full 56-character Stellar address starting with G),
  "amount": "100" (if sending — as a string number)
}

Examples:
"Send 10 XLM to GABC...WXYZ" → {"action":"send_xlm","destination":"GABC...WXYZ","amount":"10"}
"What's my balance?" → {"action":"check_balance"}
"Check balance" → {"action":"check_balance"}
"Create an agent" → {"action":"create_agent"}
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
