<div align="center">

# ✦ STELLAR AI AGENT NETWORK

**AI-Powered Autonomous Agent Infrastructure on Stellar Blockchain**

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue?logo=typescript)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1.18-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![Stellar](https://img.shields.io/badge/Stellar-Testnet-7C3AED?logo=stellar)](https://stellar.org)
[![Gemini AI](https://img.shields.io/badge/Gemini_AI-2.5_Flash-4285F4?logo=google)](https://ai.google.dev)

[Live Demo](#demo-video) · [Screenshots](#screenshots) · [Setup](#setup-instructions) · [Architecture](#architecture)

</div>

---

## Overview

Stellar AI Agent Network is a platform where users interact with the Stellar blockchain through **natural language commands**. Instead of manually building transactions, users type commands like _"Send 10 XLM to GXXX..."_ and an AI agent parses, builds, and executes the transaction — all within a terminal-style HUD interface.

### What It Does (Level 1)

- **Connect** your Freighter wallet with one click
- **View** your real-time XLM balance from Horizon API
- **Type** natural language commands in a chat interface
- **AI parses** your intent using Google Gemini 2.5 Flash
- **Execute** real XLM transactions on Stellar Testnet
- **Track** transaction results with explorer links

---

## Screenshots

### 1. Wallet Connected — Dashboard View
> HUD terminal interface showing connected wallet, balance display, navigation sidebar, and system status panel.

![Dashboard](https://github.com/user-attachments/assets/placeholder-dashboard.png)

### 2. AI Command Parsing — Natural Language Input
> User types "Send 10 XLM to GDAT..." and the AI agent parses the command, extracts destination and amount.

![AI Command](https://github.com/user-attachments/assets/placeholder-ai-command.png)

### 3. Transaction Execution — Success with Hash
> Transaction signed via Freighter, submitted to Stellar Testnet, success message displayed with TX hash.

![Transaction](https://github.com/user-attachments/assets/placeholder-transaction.png)

### 4. Transaction on Stellar Explorer
> Verified on stellar.expert showing the transaction details on testnet.

![Explorer](https://github.com/user-attachments/assets/placeholder-explorer.png)

> **Note:** Replace the placeholder image URLs above with actual screenshots before submission.

---

## Features (Level 1 — White Belt)

| # | Requirement | Status |
|---|------------|--------|
| 1 | Wallet Setup — Freighter integration | ✅ Done |
| 2 | Wallet Connection — Connect / Disconnect | ✅ Done |
| 3 | Balance Handling — Fetch & display XLM balance | ✅ Done |
| 4 | Transaction Flow — Send XLM on testnet | ✅ Done |
| 5 | Transaction Feedback — Success/failure with hash | ✅ Done |
| 6 | Development Standards — Clean code, error handling | ✅ Done |

### Additional Features Built
- AI-powered natural language command parsing (Gemini 2.5 Flash)
- Terminal/HUD-style UI designed from Figma
- Dark/Light theme toggle
- `help`, `status`, `clear` meta commands
- Real-time activity log in right sidebar
- Clickable transaction hash links to Stellar Explorer
- Balance auto-refresh after transactions
- Comprehensive error handling (wallet not found, tx rejected, insufficient balance)

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.1.6 |
| Language | TypeScript | 5.9.3 |
| Styling | Tailwind CSS + custom HUD theme | 4.1.18 |
| Blockchain SDK | @stellar/stellar-sdk | 14.5.0 |
| Wallet | @stellar/freighter-api | 6.0.1 |
| AI Engine | Google Gemini (generative-ai) | 0.24.1 |
| State | React hooks + Zustand | 5.0.11 |
| Validation | Zod | 4.3.6 |
| Icons | Lucide React | 0.563.0 |
| Theme | next-themes | 0.4.6 |

---

## Setup Instructions

### Prerequisites

- **Node.js** 20+ ([download](https://nodejs.org))
- **Freighter Wallet** browser extension ([install](https://freighter.app))
- **Gemini API Key** — free at [aistudio.google.com](https://aistudio.google.com/apikey)
- **Testnet XLM** — fund your wallet at [friendbot](https://friendbot.stellar.org/?addr=YOUR_ADDRESS)

### Installation

```bash
# Clone the repository
git clone https://github.com/n4bi10p/stellar-ai-network.git
cd stellar-ai-network

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

Edit `.env.local` and add your Gemini API key:

```env
# ── Gemini AI ──
GEMINI_API_KEY=your_gemini_key_here

# ── Stellar Network ──
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org

# ── App ──
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

---

## Architecture

```
stellar-ai-network/
├── app/
│   ├── page.tsx                      # Main HUD — wallet + chat + transactions
│   ├── layout.tsx                    # Root layout with ThemeProvider
│   ├── globals.css                   # Tailwind v4 theme tokens + HUD styles
│   ├── dashboard/page.tsx            # Agent dashboard (placeholder)
│   ├── agents/
│   │   ├── create/page.tsx           # Create agent (placeholder)
│   │   └── [id]/page.tsx             # Agent detail (placeholder)
│   └── api/
│       ├── ai/parse/route.ts         # Gemini AI command parsing
│       └── stellar/
│           ├── balance/route.ts      # Fetch XLM balance
│           ├── send/route.ts         # Build unsigned TX XDR
│           └── submit/route.ts       # Submit signed TX to network
│
├── components/
│   ├── layout/
│   │   ├── HudShell.tsx              # Shared HUD layout (header, sidebar, footer)
│   │   └── RightSidebar.tsx          # System status, wallet, activity log
│   └── theme/
│       ├── ThemeProvider.tsx          # next-themes wrapper
│       └── ThemeToggle.tsx           # Dark/Light toggle
│
├── lib/
│   ├── hooks/
│   │   ├── useWallet.ts              # Freighter connect, balance, sign
│   │   ├── useAI.ts                  # AI command parsing hook
│   │   └── useStellar.ts             # Build + sign + submit transactions
│   ├── stellar/
│   │   ├── client.ts                 # Horizon server, buildSendXLM, submitTx
│   │   └── types.ts                  # ChatMessage, TransactionResult, ParsedCommand
│   └── utils/
│       ├── constants.ts              # Network URLs, explorer links
│       ├── errors.ts                 # Error types & messages
│       ├── formatting.ts             # truncateAddress, formatXLM, timestamp
│       └── validation.ts             # Zod schemas for API input
│
├── .env.example                      # Environment template
├── tailwind.config.ts                # Tailwind v4 content paths
├── postcss.config.mjs                # @tailwindcss/postcss plugin
├── eslint.config.mjs                 # ESLint 9 flat config
└── tsconfig.json                     # TypeScript configuration
```

### Data Flow

```
User types command
  → useAI.parseCommand()
    → POST /api/ai/parse
      → Gemini AI extracts { action, destination, amount }
  → useStellar.sendXLM()
    → POST /api/stellar/send (build unsigned XDR)
    → Freighter signs XDR (client-side)
    → POST /api/stellar/submit (submit to Stellar Testnet)
  → Result displayed in chat + right sidebar updated
```

---

## Available Commands

| Command | Description |
|---------|------------|
| `connect wallet` | Connect Freighter wallet |
| `check my balance` | Show current XLM balance |
| `Send 10 XLM to GXXX...` | AI-parsed transaction |
| `help` or `?` | Show all available commands |
| `status` | Show system & wallet status |
| `clear` | Clear chat history |

The AI agent also understands natural language variations like _"transfer 50 lumens to..."_, _"pay 5 XLM to..."_, _"what's my balance?"_, etc.

---

## Transaction Examples

| Action | TX Hash | Explorer Link |
|--------|---------|--------------|
| Send XLM | _Add after testing_ | [View on stellar.expert](https://stellar.expert/explorer/testnet) |

---

## Error Handling

| Error Type | Trigger | User Message |
|-----------|---------|-------------|
| Wallet Not Found | Freighter not installed | "Please install Freighter wallet extension" |
| Connection Rejected | User declines connection | "Wallet connection was declined" |
| Insufficient Balance | Amount > balance | "Insufficient XLM balance" |
| Transaction Rejected | User declines signing | "Transaction was rejected by wallet" |
| AI Parse Failure | Ambiguous command | "Could not extract destination or amount" |
| Network Error | Horizon API down | "Failed to connect to Stellar network" |

---

## Demo Video



---

## Roadmap

| Level | Status | Features |
|-------|--------|----------|
| **1 — White Belt** | ✅ Complete | Wallet, AI commands, transactions |
| 2 — Yellow Belt | 🔜 Next | Multi-wallet, smart contracts, error handling |
| 3 — Orange Belt | ⏳ Planned | Agent templates, dashboard, testing |
| 4 — Green Belt | ⏳ Planned | Advanced agents, E2E tests |
| 5 — Blue Belt | ⏳ Planned | Database, multi-agent management |
| 6 — Black Belt | ⏳ Planned | Analytics, leaderboard, mainnet |

---

## License

MIT

---

<div align="center">

**Built with ✦ on Stellar by @n4bi10p**

</div>
