import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { parsedCommandSchema } from "@/lib/utils/validation";

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
      return NextResponse.json({ parsed: { action: "greet", confidence: 0.99 } });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const prompt = `You are an intent classifier and agent-config extractor for the Stellar AI Agent Network.
Classify the user command into exactly one action.

Rules:
- Use "greet" for greetings or small talk (hello/hi/hey/etc).
- Use "check_balance" ONLY when the user explicitly asks about balance, funds, wallet amount, or holdings.
- Use "create_agent" when the user wants to deploy/create/schedule/automate an agent or workflow.
- Use "send_xlm" only for direct transfer/payment intent and include destination + amount when available.
- Never map a greeting to "check_balance".
- For "create_agent", infer the best strategy from this supported list only:
  - "auto_rebalance"
  - "recurring_payment"
  - "price_alert"
  - "dca_bot"
  - "savings_sweep"
- Only return fields that match the selected strategy config.
- For time phrases, convert to seconds.
- If important data is missing, still choose the best strategy and list missing fields in "missingFields".
- Use one of these templateIds when possible:
  - "auto_rebalance"
  - "bill_scheduler"
  - "price_alert"
  - "dca_bot"
  - "savings_sweep"

User command: "${input}"

Return ONLY valid JSON with this structure:
{
  "action": "send_xlm" | "check_balance" | "create_agent" | "greet",
  "destination": "GXXX..." (if sending — must be a full 56-character Stellar address starting with G),
  "amount": "100" (if sending — as a string number),
  "confidence": 0.0,
  "agentIntent": {
    "name": "Weekly Savings Agent",
    "strategy": "recurring_payment",
    "templateId": "bill_scheduler",
    "summary": "Sends 10 XLM every week to a savings wallet.",
    "missingFields": ["recipient"],
    "strategyConfig": {
      "recipient": "G...",
      "amount": 10,
      "intervalSeconds": 604800,
      "maxExecutions": 52
    }
  }
}

Examples:
"Send 10 XLM to GABC...WXYZ" → {"action":"send_xlm","destination":"GABC...WXYZ","amount":"10","confidence":0.97}
"What's my balance?" → {"action":"check_balance","confidence":0.98}
"Create an agent" → {"action":"create_agent","confidence":0.62,"agentIntent":{"strategy":"recurring_payment","templateId":"bill_scheduler","missingFields":["recipient","amount","intervalSeconds"],"strategyConfig":{"amount":10,"intervalSeconds":604800,"maxExecutions":52}}}
"Send 10 XLM to my savings every Monday" → {"action":"create_agent","confidence":0.93,"agentIntent":{"name":"Weekly Savings Agent","strategy":"recurring_payment","templateId":"bill_scheduler","summary":"Sends 10 XLM every Monday to the savings wallet.","missingFields":["recipient"],"strategyConfig":{"recipient":"GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB","amount":10,"intervalSeconds":604800,"maxExecutions":52}}}
"Alert me if XLM drops below 0.09 and send 25 XLM to GDEF..." → {"action":"create_agent","confidence":0.9,"agentIntent":{"strategy":"price_alert","templateId":"price_alert","summary":"Sends 25 XLM when XLM/USD drops below 0.09.","missingFields":[],"strategyConfig":{"recipient":"GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","lowerBound":0.09,"alertAmount":25,"checkIntervalSeconds":300}}}
"hello" → {"action":"greet","confidence":0.99}

Return ONLY the JSON object, no markdown, no explanation.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Could not parse AI response" },
        { status: 422 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]) as unknown;
    const validated = parsedCommandSchema.safeParse(parsed);

    if (!validated.success) {
      return NextResponse.json(
        { error: "AI response did not match the expected schema" },
        { status: 422 }
      );
    }

    return NextResponse.json({ parsed: validated.data });
  } catch (error: unknown) {
    console.error("[AI/PARSE] Error:", error);
    const msg = error instanceof Error ? error.message : "AI parsing failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
