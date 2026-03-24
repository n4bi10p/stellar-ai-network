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
        { error: "Please provide a description of what you want to automate." },
        { status: 400 }
      );
    }

    if (input.trim().length < 5) {
      return NextResponse.json(
        { 
          error: "Your description is too short. Please provide more details about what automation you want to create. For example: 'Send 10 XLM every Monday to my savings wallet' or 'Alert me if XLM price drops below $0.10'" 
        },
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
        { error: "AI service is not configured. Please contact support." },
        { status: 500 }
      );
    }

    const prompt = `You are an intent classifier and agent-config extractor for the Stellar AI Agent Network.
Your job is to understand what automation the user wants to create and extract the necessary configuration.

Supported agent types:
1. "auto_rebalance" - Rebalance wallet between assets
2. "recurring_payment" - Send XLM on a schedule (daily, weekly, monthly)
3. "price_alert" - Alert or execute action when price changes
4. "dca_bot" - Dollar-cost averaging: send fixed amounts regularly
5. "savings_sweep" - Automatically move funds to savings

Rules:
- Use "greet" for greetings or small talk.
- Use "check_balance" ONLY when asked about balance, funds, holdings, or "how much".
- Use "create_agent" when user wants to deploy/automate/schedule something.
- Use "send_xlm" only for immediate direct transfers.
- For "send_xlm": extract destination and amount, DO NOT include agentIntent.
- For "create_agent": extract agentIntent with strategy, name, summary, missing fields, and config.
- For time phrases: 1 hour=3600s, 1 day=86400s, 1 week=604800s, 1 month≈2592000s.
- If fields are missing, list them in "missingFields" but still try to extract what you can.
- Match to the best strategy from the supported list above.
- Generate a helpful summary of what the agent will do.

User input: "${input}"

Return ONLY valid JSON (with CORRECT structure for each action type):

For send_xlm:
{
  "action": "send_xlm",
  "confidence": 0.0,
  "destination": "GABC...",
  "amount": "100.5"
}

For create_agent:
{
  "action": "create_agent",
  "confidence": 0.0,
  "agentIntent": {
    "name": "Agent Name",
    "strategy": "recurring_payment" | "auto_rebalance" | "price_alert" | "dca_bot" | "savings_sweep",
    "templateId": "auto_rebalance" | "bill_scheduler" | "price_alert" | "dca_bot" | "savings_sweep",
    "summary": "Clear explanation of what this agent does",
    "missingFields": ["field1", "field2"],
    "strategyConfig": {
      "configKey": "value"
    }
  }
}

For check_balance or greet:
{
  "action": "check_balance" | "greet",
  "confidence": 0.0
}

Examples:
"Send 100 XLM to GABC..." → {"action":"send_xlm","confidence":0.95,"destination":"GABC...","amount":"100"}
"Alert me when XLM drops below 10 cents" → {"action":"create_agent","confidence":0.88,"agentIntent":{"name":"XLM Price Alert","strategy":"price_alert","templateId":"price_alert","summary":"Monitors XLM/USD price and alerts when it drops below $0.10","missingFields":["alertAction"],"strategyConfig":{"lowerBound":0.10}}}
"How much XLM do I have?" → {"action":"check_balance","confidence":0.98}
"Hello!" → {"action":"greet","confidence":0.99}

Return ONLY the JSON object, no markdown, no extra text.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[AI/PARSE] No JSON found in response:", text);
      return NextResponse.json(
        { 
          error: "I couldn't understand your request. Please describe it more clearly. Example: 'Send 10 XLM every week to my savings wallet' or 'Create an agent to send funds automatically'" 
        },
        { status: 422 }
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonMatch[0]) as unknown;
    } catch (e) {
      console.error("[AI/PARSE] JSON parse error:", jsonMatch[0], e);
      return NextResponse.json(
        { 
          error: "Failed to parse AI response. Please try again with a clearer description." 
        },
        { status: 422 }
      );
    }

    const validated = parsedCommandSchema.safeParse(parsed);
    if (!validated.success) {
      console.error("[AI/PARSE] Validation error:", JSON.stringify({
        input,
        aiResponse: parsed,
        validationErrors: validated.error.issues
      }, null, 2));
    }

    if (!validated.success) {
      const issues = validated.error.issues;
      const firstIssue = issues[0];
      
      if (firstIssue) {
        const fieldPath = firstIssue.path.join(".");
        let errorMsg = `Invalid field: ${fieldPath}`;
        
        if (fieldPath.includes("strategy")) {
          errorMsg = `Please choose a valid strategy type. Supported: recurring_payment, auto_rebalance, price_alert, dca_bot, or savings_sweep`;
        } else if (fieldPath.includes("amount")) {
          errorMsg = "Please provide a valid amount in XLM for the payment or transfer.";
        } else if (fieldPath.includes("recipient") || fieldPath.includes("destination")) {
          errorMsg = "Please provide a valid Stellar wallet address (starts with G and is 56 characters long).";
        }
        
        return NextResponse.json(
          { error: errorMsg },
          { status: 422 }
        );
      }

      return NextResponse.json(
        { error: "The request configuration is incomplete. Please provide more details." },
        { status: 422 }
      );
    }

    return NextResponse.json({ parsed: validated.data });
  } catch (error: unknown) {
    console.error("[AI/PARSE] Error:", error);
    const msg = error instanceof Error ? error.message : "Failed to process your request. Please try again with a clearer description.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
