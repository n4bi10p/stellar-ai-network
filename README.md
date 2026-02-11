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

### What It Does

- **Connect** any supported wallet (Freighter, Albedo, Rabet) via wallet selector
- **View** your real-time XLM balance from Horizon API
- **Type** natural language commands in a chat interface
- **AI parses** your intent using Google Gemini 2.5 Flash
- **Execute** real XLM transactions on Stellar Testnet
- **Deploy & manage** AI Agents via Soroban smart contracts
- **Track** transaction results with explorer links

---

## Screenshots

### 1. Wallet Selector — Multi-Wallet Options
> HUD-styled modal showing all available wallets: Freighter, Albedo, and Rabet. Detected/Not Found badges, install links.

<!-- TODO: Replace with actual wallet selector screenshot -->
`📸 Screenshot: Wallet selector modal with Freighter, Albedo, Rabet options`

### 2. Wallet Connected — Dashboard View
> HUD terminal interface showing connected wallet, balance display, navigation sidebar, and system status panel.

<img width="1920" height="963" alt="image" src="https://github.com/user-attachments/assets/591a7685-a31c-46ba-b293-521b41135a80" />

### 3. AI Command Parsing — Natural Language Input
> User types "Send 10 XLM to GDAT..." and the AI agent parses the command, extracts destination and amount.

<img width="1920" height="963" alt="image" src="https://github.com/user-attachments/assets/5bef5a28-4a8e-4eba-a596-59dd5f1bd879" />

### 4. Transaction Execution — Success with Hash
> Transaction signed via Freighter, submitted to Stellar Testnet, success message displayed with TX hash.

<img width="1423" height="154" alt="image" src="https://github.com/user-attachments/assets/f9ddb63b-9a05-4ad6-8b6b-e655ff8a3440" />


### 5. Transaction on Stellar Explorer
> Verified on stellar.expert showing the transaction details on testnet.

<img width="1918" height="963" alt="image" src="https://github.com/user-attachments/assets/0f090df1-a403-4a39-93bc-07aad1172943" />

[view](https://stellar.expert/explorer/testnet/tx/dc40915f1460db18cd7d70b0a8545af69f7fdaffc278d7b477b53cd44ea52371)

---

## Features

### Level 1 — White Belt ✅

| # | Requirement | Status |
|---|------------|--------|
| 1 | Wallet Setup — Freighter integration | ✅ Done |
| 2 | Wallet Connection — Connect / Disconnect | ✅ Done |
| 3 | Balance Handling — Fetch & display XLM balance | ✅ Done |
| 4 | Transaction Flow — Send XLM on testnet | ✅ Done |
| 5 | Transaction Feedback — Success/failure with hash | ✅ Done |
| 6 | Development Standards — Clean code, error handling | ✅ Done |

### Level 2 — Yellow Belt ✅

| # | Requirement | Status |
|---|------------|--------|
| 1 | Multi-Wallet Support — Freighter, Albedo, Rabet | ✅ Done |
| 2 | Wallet Selector UI — Detection, install links | ✅ Done |
| 3 | Smart Contract — Soroban AIAgent contract (Rust) | ✅ Done |
| 4 | Contract Deployment — Testnet with 5+ passing tests | ✅ Done |
| 5 | Contract Integration — Create/execute agents from UI | ✅ Done |
| 6 | Error Handling — Contract-specific + improved validation | ✅ Done |

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
| Wallets | Freighter / Albedo / Rabet | Multi-provider |
| Wallet SDKs | @stellar/freighter-api, @albedo-link/intent | 6.0.1, latest |
| Smart Contracts | Soroban (Rust) + soroban-sdk | 21.0.0 |
| AI Engine | Google Gemini (generative-ai) | 0.24.1 |
| State | React hooks + Zustand | 5.0.11 |
| Validation | Zod | 4.3.6 |
| Icons | Lucide React | 0.563.0 |
| Theme | next-themes | 0.4.6 |

---

## Setup Instructions

### Prerequisites

- **Node.js** 20+ ([download](https://nodejs.org))
- **Wallet** — at least one of: [Freighter](https://freighter.app), [Albedo](https://albedo.link), or [Rabet](https://rabet.io)
- **Gemini API Key** — free at [aistudio.google.com](https://aistudio.google.com/apikey)
- **Testnet XLM** — fund your wallet at [friendbot](https://friendbot.stellar.org/?addr=YOUR_ADDRESS)
- **Rust** (optional, for contract development) — [rustup.rs](https://rustup.rs)
- **Stellar CLI** (optional) — `cargo install --locked stellar-cli`

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

# ── Soroban Contract (already deployed) ──
NEXT_PUBLIC_AGENT_CONTRACT_ID=CAGIKMTM5ZGZZLYDHFI3EOI6GTJX7ODAJN2PW4JXNMNXKOFD5FBTQJKB
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

### Smart Contract (Optional — already deployed)

```bash
# Run contract tests
cd contracts && bash scripts/test.sh

# Build WASM
bash scripts/build.sh

# Deploy to testnet (requires stellar CLI + funded identity)
bash scripts/deploy.sh
```

---

## Architecture

```
stellar-ai-network/
├── app/
│   ├── page.tsx                      # Main HUD — wallet + chat + transactions
│   ├── layout.tsx                    # Root layout with ThemeProvider
│   ├── globals.css                   # Tailwind v4 theme tokens + HUD styles
│   ├── dashboard/page.tsx            # Agent dashboard
│   ├── agents/
│   │   ├── create/page.tsx           # Create agent via Soroban deploy
│   │   └── [id]/page.tsx             # Agent detail — execute, toggle, config
│   └── api/
│       ├── ai/parse/route.ts         # Gemini AI command parsing
│       ├── agents/
│       │   ├── route.ts              # POST — initialize agent contract
│       │   └── execute/route.ts      # POST — execute agent action
│       └── stellar/
│           ├── balance/route.ts      # Fetch XLM balance
│           ├── send/route.ts         # Build unsigned TX XDR
│           ├── submit/route.ts       # Submit signed TX to network
│           └── submit-soroban/route.ts # Submit Soroban TX + poll result
│
├── components/
│   ├── layout/
│   │   ├── HudShell.tsx              # Shared HUD layout (header, sidebar, footer)
│   │   └── RightSidebar.tsx          # System status, wallet, activity log
│   ├── wallet/
│   │   └── WalletSelector.tsx        # Multi-wallet selector modal
│   └── theme/
│       ├── ThemeProvider.tsx          # next-themes wrapper
│       └── ThemeToggle.tsx           # Dark/Light toggle
│
├── lib/
│   ├── hooks/
│   │   ├── useWallet.ts              # Multi-wallet store (Zustand)
│   │   ├── useAI.ts                  # AI command parsing hook
│   │   └── useStellar.ts             # Build + sign + submit transactions
│   ├── stellar/
│   │   ├── client.ts                 # Horizon server, buildSendXLM, submitTx
│   │   ├── contracts.ts              # Soroban RPC wrapper (build, submit, read)
│   │   └── types.ts                  # ChatMessage, TransactionResult, ParsedCommand
│   ├── wallets/
│   │   ├── types.ts                  # WalletProvider interface
│   │   ├── freighter.ts              # Freighter adapter
│   │   ├── albedo.ts                 # Albedo adapter
│   │   ├── rabet.ts                  # Rabet adapter
│   │   └── index.ts                  # Wallet registry
│   └── utils/
│       ├── constants.ts              # Network URLs, explorer links
│       ├── errors.ts                 # Error types & messages
│       ├── formatting.ts             # truncateAddress, formatXLM, timestamp
│       └── validation.ts             # Zod schemas for API input
│
├── contracts/
│   ├── agent/
│   │   ├── Cargo.toml                # Soroban contract dependencies
│   │   └── src/
│   │       ├── lib.rs                # AIAgent contract (Rust)
│   │       └── test.rs               # 5 unit tests
│   └── scripts/
│       ├── build.sh                  # Build WASM binary
│       ├── deploy.sh                 # Deploy to testnet
│       └── test.sh                   # Run cargo test
│
├── .env.example                      # Environment template
├── tailwind.config.ts                # Tailwind v4 content paths
├── postcss.config.mjs                # @tailwindcss/postcss plugin
├── eslint.config.mjs                 # ESLint 9 flat config
└── tsconfig.json                     # TypeScript configuration
```

### Data Flow — XLM Transfer

```
User types command
  → useAI.parseCommand()
    → POST /api/ai/parse
      → Gemini AI extracts { action, destination, amount }
  → useStellar.sendXLM()
    → POST /api/stellar/send (build unsigned XDR)
    → Wallet signs XDR (Freighter/Albedo/Rabet)
    → POST /api/stellar/submit (submit to Stellar Testnet)
  → Result displayed in chat + right sidebar updated
```

### Data Flow — Smart Contract Call

```
User creates/executes agent
  → POST /api/agents (or /api/agents/execute)
    → buildContractCall() simulates + assembles Soroban TX
  → Wallet signs the assembled XDR
  → POST /api/stellar/submit-soroban
    → submitSorobanTx() sends + polls for result (up to 30s)
  → Result displayed with TX hash + explorer link
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

## Deployed Contract

| Field | Value |
|-------|-------|
| **Contract ID** | `CAGIKMTM5ZGZZLYDHFI3EOI6GTJX7ODAJN2PW4JXNMNXKOFD5FBTQJKB` |
| **Network** | Stellar Testnet |
| **WASM Hash** | `ae10842b73ace338593291757e010ccbc8cf2bcd55192895789346883ff445eb` |
| **Explorer** | [View on Stellar Lab](https://lab.stellar.org/r/testnet/contract/CAGIKMTM5ZGZZLYDHFI3EOI6GTJX7ODAJN2PW4JXNMNXKOFD5FBTQJKB) |

### Contract Functions

| Function | Description |
|----------|-------------|
| `initialize` | Set up agent with name, strategy, owner |
| `execute` | Execute agent action (recipient + amount) |
| `get_config` | Read agent configuration |
| `get_executions` | Get total execution count |
| `get_history` | Get execution history (last 10) |
| `toggle_active` | Enable/disable agent |

### Verifiable Contract Call Transactions

| Action | TX Hash | Explorer |
|--------|---------|----------|
| Initialize Agent | `c413e624...15785150` | [View on stellar.expert](https://stellar.expert/explorer/testnet/tx/c413e6242c588ea71f630c6ca0e1538ac39bbbe243af9b53f824823b15785150) |
| Execute Agent | `00b7cda0...26dbedf6` | [View on stellar.expert](https://stellar.expert/explorer/testnet/tx/00b7cda0cccb9fc81a35c7f4063a39e6d68108d09a643bf39fd6c74326dbedf6) |
| Toggle Active | `455a6b4d...69288380` | [View on stellar.expert](https://stellar.expert/explorer/testnet/tx/455a6b4def3880fce12ad9ff4d70dda5bf00815bdce5c328e5f72cf269288380) |
| Execute Agent (2nd) | `ea12d845...356213f8` | [View on stellar.expert](https://stellar.expert/explorer/testnet/tx/ea12d845a1f5d4eb3cfdd1827486d52af40eb59b1a5aed6ea7d1ca39356213f8) |

### XLM Transaction Examples

| Action | TX Hash | Explorer |
|--------|---------|----------|
| Send XLM | `dc409151...ea52371` | [View on stellar.expert](https://stellar.expert/explorer/testnet/tx/dc40915f1460db18cd7d70b0a8545af69f7fdaffc278d7b477b53cd44ea52371) |

---

## Error Handling

| Error Type | Trigger | User Message |
|-----------|---------|-------------|
| Wallet Not Found | No wallet extension | "Please install a supported wallet extension" |
| Connection Rejected | User declines connection | "Wallet connection was declined" |
| Insufficient Balance | Amount > balance | "Insufficient XLM balance" |
| Transaction Rejected | User declines signing | "Transaction was rejected by wallet" |
| AI Parse Failure | Ambiguous command | "Could not extract destination or amount" |
| Network Error | Horizon API down | "Failed to connect to Stellar network" |
| Contract Not Initialized | Agent not set up | "Contract has not been initialized" |
| Agent Inactive | Toggled off | "Agent is currently inactive" |
| Invalid Contract Amount | Amount ≤ 0 | "Invalid amount for contract call" |
| Contract Call Failed | Soroban RPC error | "Contract invocation failed" |

---

---

## Roadmap

| Level | Status | Features |
|-------|--------|----------|
| **1 — White Belt** | ✅ Complete | Wallet, AI commands, transactions |
| **2 — Yellow Belt** | ✅ Complete | Multi-wallet, Soroban contract, contract integration |
| 3 — Orange Belt | 🔜 Next | Agent templates, dashboard, testing |
| 4 — Green Belt | ⏳ Planned | Advanced agents, E2E tests |
| 5 — Blue Belt | ⏳ Planned | Database, multi-agent management |
| 6 — Black Belt | ⏳ Planned | Analytics, leaderboard, mainnet |

---

## License

[MIT](https://github.com/n4bi10p/stellar-ai-network/blob/main/LICENSE)

---

<div align="center">

**Built with ✦ on Stellar by @n4bi10p**

</div>
