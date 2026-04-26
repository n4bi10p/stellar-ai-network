# 🚀 **STELLAR AI AGENT NETWORK - COMPLETE PRD**
## **Product Requirements Document v1.0**

---

# 📋 **TABLE OF CONTENTS**

1. [Project Overview](#project-overview)
2. [Technical Stack](#technical-stack)
3. [Project Structure](#project-structure)
4. [Level 1 - White Belt Requirements](#level-1-white-belt)
5. [Level 2 - Yellow Belt Requirements](#level-2-yellow-belt)
6. [Level 3 - Orange Belt Requirements](#level-3-orange-belt)
7. [Level 4 - Green Belt Requirements](#level-4-green-belt)
8. [Level 5 - Blue Belt Requirements](#level-5-blue-belt)
9. [Level 6 - Black Belt Requirements](#level-6-black-belt)
10. [API Specifications](#api-specifications)
11. [Smart Contract Specifications](#smart-contract-specifications)
12. [Database Schema](#database-schema)
13. [UI/UX Requirements](#uiux-requirements)
14. [Testing Requirements](#testing-requirements)
15. [Deployment Instructions](#deployment-instructions)

---

# 🎯 **PROJECT OVERVIEW**

## **Vision**
Build the first AI-powered autonomous agent infrastructure on Stellar blockchain, enabling users to deploy smart contracts that execute transactions automatically based on natural language commands and predefined conditions.

## **Problem Statement**
Current blockchain interactions require manual transaction execution. Users cannot automate complex financial operations, recurring payments, or conditional trades without writing code. Stellar lacks AI-driven automation infrastructure that other chains are developing.

## **Solution**
Stellar AI Agent Network - A platform where users can:
1. Create AI agents using natural language
2. Deploy agents as Soroban smart contracts
3. Agents execute Stellar transactions automatically
4. Manage multiple agents from a single dashboard
5. Share and discover agent templates

## **Target Users**
- Stellar developers building dApps
- DAO treasury managers
- DeFi traders wanting automation
- Businesses needing recurring payments
- Crypto users wanting "set and forget" operations

## **Success Metrics**
- Level 5: 5+ active agents deployed
- Level 6: 30+ active agents managing transactions
- Transaction volume: $10k+ in automated transactions
- User retention: 70%+ weekly active agents

---

# 🛠️ **TECHNICAL STACK**

## **Frontend**
```typescript
Framework: Next.js 14 (App Router)
Language: TypeScript 5+
Styling: Tailwind CSS 3.4 + shadcn/ui
State Management: Zustand 4.5
Form Handling: React Hook Form + Zod
Icons: Lucide React
Animations: Framer Motion
```

## **Blockchain**
```typescript
Network: Stellar Testnet → Mainnet
SDK: @stellar/stellar-sdk ^11.2.0
Wallet Integration: @stellar/freighter-api ^2.0.0
Smart Contracts: Soroban (Rust)
RPC: https://soroban-testnet.stellar.org
Horizon API: https://horizon-testnet.stellar.org
```

## **AI**
```typescript
Primary: Google Gemini 2.5 Flash (FREE)
Fallback: Groq Llama 3.1 70B (FREE)
Production: OpenAI GPT-4o-mini (Optional)
Package: @google/generative-ai ^0.21.0
```

## **Backend**
```typescript
Runtime: Node.js 20+
API: Next.js API Routes (initially)
Validation: Zod
Environment: dotenv
```

## **Database (Level 5+)**
```typescript
Database: PostgreSQL 16
ORM: Prisma 5
Caching: Redis (Upstash)
Migrations: Prisma Migrate
```

## **DevOps**
```typescript
Hosting: Vercel (frontend)
API Hosting: Railway (backend - Level 5+)
Database: Supabase (free tier)
CI/CD: GitHub Actions
Monitoring: Sentry
Analytics: Vercel Analytics
```

## **Testing**
```typescript
Unit Tests: Jest
Contract Tests: Soroban Test Framework
E2E Tests: Playwright (Level 4+)
Coverage: Jest Coverage
```

---

# 📁 **PROJECT STRUCTURE**

```
stellar-agent-network/
├── README.md
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── .env.local
├── .env.example
├── .gitignore
│
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Home/landing
│   ├── globals.css
│   │
│   ├── dashboard/
│   │   ├── page.tsx               # Agent dashboard
│   │   └── layout.tsx
│   │
│   ├── agents/
│   │   ├── create/
│   │   │   └── page.tsx           # Create new agent
│   │   ├── [id]/
│   │   │   ├── page.tsx           # Agent detail view
│   │   │   └── edit/
│   │   │       └── page.tsx       # Edit agent
│   │   └── templates/
│   │       └── page.tsx           # Agent templates gallery
│   │
│   ├── analytics/
│   │   └── page.tsx               # Analytics dashboard (Level 6)
│   │
│   └── api/
│       ├── ai/
│       │   ├── parse/route.ts     # AI command parsing
│       │   └── generate/route.ts  # AI code generation
│       ├── stellar/
│       │   ├── balance/route.ts   # Get wallet balance
│       │   ├── send/route.ts      # Send transaction
│       │   └── deploy/route.ts    # Deploy contract
│       ├── agents/
│       │   ├── route.ts           # GET/POST agents
│       │   └── [id]/route.ts      # GET/PUT/DELETE agent
│       └── webhooks/
│           └── stellar/route.ts   # Stellar event webhooks
│
├── components/
│   ├── ui/                        # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   ├── badge.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   │
│   ├── wallet/
│   │   ├── WalletConnect.tsx      # Wallet connection component
│   │   ├── WalletBalance.tsx      # Display balance
│   │   └── WalletStatus.tsx       # Connection status
│   │
│   ├── agents/
│   │   ├── AgentCard.tsx          # Agent preview card
│   │   ├── AgentList.tsx          # List of agents
│   │   ├── AgentForm.tsx          # Create/edit form
│   │   ├── AgentChat.tsx          # Chat interface for agent
│   │   ├── AgentExecutionLog.tsx  # Execution history
│   │   └── AgentTemplates.tsx     # Template selector
│   │
│   ├── transactions/
│   │   ├── TransactionResult.tsx  # Transaction feedback
│   │   ├── TransactionHistory.tsx # Transaction list
│   │   └── TransactionStatus.tsx  # Status indicator
│   │
│   └── analytics/
│       ├── MetricsCard.tsx        # Metric display
│       ├── ActivityChart.tsx      # Chart component
│       └── LeaderboardTable.tsx   # Agent leaderboard
│
├── lib/
│   ├── stellar/
│   │   ├── client.ts              # Stellar SDK wrapper
│   │   ├── transactions.ts        # Transaction builders
│   │   ├── contracts.ts           # Soroban contract interactions
│   │   ├── utils.ts               # Helper functions
│   │   └── types.ts               # Stellar types
│   │
│   ├── ai/
│   │   ├── providers/
│   │   │   ├── index.ts           # Provider factory
│   │   │   ├── gemini.ts          # Gemini implementation
│   │   │   ├── groq.ts            # Groq implementation
│   │   │   └── openai.ts          # OpenAI implementation
│   │   ├── prompts.ts             # AI prompts
│   │   └── types.ts               # AI types
│   │
│   ├── db/
│   │   ├── client.ts              # Prisma client (Level 5+)
│   │   └── queries.ts             # Database queries
│   │
│   ├── utils/
│   │   ├── validation.ts          # Zod schemas
│   │   ├── formatting.ts          # Format helpers
│   │   └── constants.ts           # App constants
│   │
│   └── hooks/
│       ├── useWallet.ts           # Wallet hook
│       ├── useAgent.ts            # Agent CRUD hook
│       ├── useStellar.ts          # Stellar operations hook
│       └── useAI.ts               # AI operations hook
│
├── contracts/                     # Soroban smart contracts
│   ├── agent/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs             # Main contract
│   │       ├── agent.rs           # Agent logic
│   │       ├── strategy.rs        # Strategy types
│   │       ├── execution.rs       # Execution logic
│   │       └── test.rs            # Contract tests
│   │
│   ├── templates/
│   │   ├── rebalancer/            # Auto-rebalancing agent
│   │   ├── scheduler/             # Scheduled payment agent
│   │   └── arbitrage/             # Arbitrage trading agent
│   │
│   └── scripts/
│       ├── build.sh               # Build contracts
│       ├── deploy.sh              # Deploy to testnet
│       └── test.sh                # Run contract tests
│
├── prisma/                        # Database (Level 5+)
│   ├── schema.prisma
│   └── migrations/
│
├── public/
│   ├── logo.svg
│   └── images/
│
├── tests/
│   ├── unit/
│   │   ├── stellar.test.ts
│   │   ├── ai.test.ts
│   │   └── utils.test.ts
│   ├── integration/
│   │   ├── agent-creation.test.ts
│   │   └── transaction-flow.test.ts
│   └── e2e/
│       └── full-flow.spec.ts
│
├── .github/
│   └── workflows/
│       ├── test.yml               # Run tests on PR
│       ├── deploy.yml             # Deploy to Vercel
│       └── contracts.yml          # Build/deploy contracts
│
└── docs/
    ├── ARCHITECTURE.md
    ├── API.md
    ├── SETUP.md
    └── DEMO.md
```

---

# 🎯 **LEVEL 1 - WHITE BELT**

## **Timeline**: Week 1 (7 days)

## **Requirements**
1. ✅ Wallet Setup: Freighter integration
2. ✅ Wallet Connection: Connect/disconnect functionality
3. ✅ Balance Handling: Fetch and display XLM balance
4. ✅ Transaction Flow: Send XLM transaction on testnet
5. ✅ Transaction Feedback: Success/failure state with hash
6. ✅ Development Standards: Clean code, error handling

## **User Stories**

### **US-1.1: Wallet Connection**
```
AS A user
I WANT TO connect my Freighter wallet
SO THAT I can interact with the Stellar blockchain
```

**Acceptance Criteria:**
- [ ] "Connect Wallet" button is visible
- [ ] Clicking button triggers Freighter popup
- [ ] After connection, wallet address is displayed
- [ ] "Disconnect" button appears when connected
- [ ] Connection state persists during session
- [ ] Error shown if Freighter not installed

### **US-1.2: Balance Display**
```
AS A connected user
I WANT TO see my XLM balance
SO THAT I know how much I can send
```

**Acceptance Criteria:**
- [ ] Balance fetched from Stellar Horizon API
- [ ] Balance displayed in XLM format (e.g., "150.50 XLM")
- [ ] Balance updates after transactions
- [ ] Loading state shown while fetching
- [ ] Error handling for API failures

### **US-1.3: AI Command Interface**
```
AS A user
I WANT TO type natural language commands
SO THAT I can create transactions easily
```

**Acceptance Criteria:**
- [ ] Chat-like input interface
- [ ] User can type: "Send 10 XLM to GXXX..."
- [ ] AI parses command and extracts: destination, amount
- [ ] Parsed data shown to user for confirmation
- [ ] Error shown if command cannot be parsed

### **US-1.4: Send Transaction**
```
AS A user
I WANT TO send XLM to another address
SO THAT I can transfer funds
```

**Acceptance Criteria:**
- [ ] After AI parses command, "Confirm" button appears
- [ ] Clicking confirm creates Stellar transaction
- [ ] Freighter popup for signature
- [ ] Transaction submitted to Stellar testnet
- [ ] Success message with transaction hash shown
- [ ] Hash is clickable link to Stellar Explorer
- [ ] Balance updates after successful transaction

## **Technical Implementation**

### **File: `app/page.tsx`**
```typescript
import { WalletConnect } from '@/components/wallet/WalletConnect'
import { AgentChat } from '@/components/agents/AgentChat'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Stellar AI Agent Network
          </h1>
          <p className="text-gray-400">
            Deploy autonomous agents on Stellar blockchain
          </p>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AgentChat />
          </div>
          
          <div>
            <WalletConnect />
          </div>
        </div>
      </div>
    </main>
  )
}
```

### **File: `components/wallet/WalletConnect.tsx`**
```typescript
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useWallet } from '@/lib/hooks/useWallet'

export function WalletConnect() {
  const { 
    connected, 
    address, 
    balance, 
    connect, 
    disconnect, 
    loading,
    error 
  } = useWallet()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wallet</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!connected ? (
          <Button 
            onClick={connect} 
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Connecting...' : 'Connect Freighter'}
          </Button>
        ) : (
          <>
            <div>
              <p className="text-sm text-gray-500 mb-1">Address</p>
              <Badge variant="secondary" className="font-mono text-xs">
                {address?.slice(0, 8)}...{address?.slice(-8)}
              </Badge>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 mb-1">Balance</p>
              <p className="text-2xl font-bold">
                {balance || '0'} XLM
              </p>
            </div>
            
            <Button 
              onClick={disconnect} 
              variant="outline"
              className="w-full"
            >
              Disconnect
            </Button>
          </>
        )}
        
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </CardContent>
    </Card>
  )
}
```

### **File: `lib/hooks/useWallet.ts`**
```typescript
import { useState, useEffect } from 'react'
import { isConnected, getPublicKey, signTransaction } from '@stellar/freighter-api'
import { Server } from '@stellar/stellar-sdk'

const server = new Server('https://horizon-testnet.stellar.org')

export function useWallet() {
  const [connected, setConnected] = useState(false)
  const [address, setAddress] = useState<string>('')
  const [balance, setBalance] = useState<string>('0')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  // Check if wallet is already connected
  useEffect(() => {
    checkConnection()
  }, [])

  // Fetch balance when address changes
  useEffect(() => {
    if (address) {
      fetchBalance()
    }
  }, [address])

  async function checkConnection() {
    try {
      const walletConnected = await isConnected()
      if (walletConnected) {
        const publicKey = await getPublicKey()
        setAddress(publicKey)
        setConnected(true)
      }
    } catch (err) {
      console.error('Failed to check connection:', err)
    }
  }

  async function connect() {
    setLoading(true)
    setError('')
    
    try {
      const publicKey = await getPublicKey()
      setAddress(publicKey)
      setConnected(true)
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet')
      console.error('Connection error:', err)
    } finally {
      setLoading(false)
    }
  }

  function disconnect() {
    setConnected(false)
    setAddress('')
    setBalance('0')
  }

  async function fetchBalance() {
    try {
      const account = await server.loadAccount(address)
      const xlmBalance = account.balances.find(
        (b: any) => b.asset_type === 'native'
      )
      setBalance(xlmBalance?.balance || '0')
    } catch (err) {
      console.error('Failed to fetch balance:', err)
      setError('Failed to fetch balance')
    }
  }

  return {
    connected,
    address,
    balance,
    connect,
    disconnect,
    loading,
    error,
    fetchBalance
  }
}
```

### **File: `components/agents/AgentChat.tsx`**
```typescript
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { TransactionResult } from '@/components/transactions/TransactionResult'
import { useAI } from '@/lib/hooks/useAI'
import { useStellar } from '@/lib/hooks/useStellar'

export function AgentChat() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<any[]>([])
  const { parseCommand, loading: aiLoading } = useAI()
  const { sendXLM, loading: txLoading } = useStellar()
  const [txResult, setTxResult] = useState<any>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: input }])

    try {
      // Parse with AI
      const parsed = await parseCommand(input)
      
      // Add AI response
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `I'll send ${parsed.amount} XLM to ${parsed.destination.slice(0, 8)}...` 
      }])

      // Execute transaction
      const result = await sendXLM(parsed.destination, parsed.amount)
      setTxResult(result)
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Transaction successful! Hash: ${result.hash}` 
      }])
      
    } catch (err: any) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${err.message}` 
      }])
    }

    setInput('')
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle>AI Agent Command</CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.map((msg, i) => (
            <div 
              key={i} 
              className={`p-3 rounded-lg ${
                msg.role === 'user' 
                  ? 'bg-blue-500 text-white ml-12' 
                  : 'bg-gray-100 mr-12'
              }`}
            >
              {msg.content}
            </div>
          ))}
          
          {txResult && <TransactionResult result={txResult} />}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Send 10 XLM to GXXX..."
            disabled={aiLoading || txLoading}
          />
          <Button 
            type="submit" 
            disabled={aiLoading || txLoading}
          >
            {aiLoading || txLoading ? 'Processing...' : 'Send'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

### **File: `lib/hooks/useAI.ts`**
```typescript
import { useState } from 'react'

interface ParsedCommand {
  action: 'send_xlm' | 'check_balance' | 'create_agent'
  destination?: string
  amount?: string
}

export function useAI() {
  const [loading, setLoading] = useState(false)

  async function parseCommand(input: string): Promise<ParsedCommand> {
    setLoading(true)
    
    try {
      const response = await fetch('/api/ai/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input })
      })

      if (!response.ok) {
        throw new Error('Failed to parse command')
      }

      const data = await response.json()
      return data.parsed
    } finally {
      setLoading(false)
    }
  }

  return { parseCommand, loading }
}
```

### **File: `app/api/ai/parse/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-exp" })

export async function POST(request: NextRequest) {
  try {
    const { input } = await request.json()

    const prompt = `
You are a Stellar blockchain agent parser. Parse this command into JSON.

User command: "${input}"

Return ONLY valid JSON with this structure:
{
  "action": "send_xlm" | "check_balance" | "create_agent",
  "destination": "GXXX..." (if sending),
  "amount": "100" (if sending)
}

Examples:
"Send 10 XLM to GABC..." → {"action":"send_xlm","destination":"GABC...","amount":"10"}
"Check my balance" → {"action":"check_balance"}
    `

    const result = await model.generateContent(prompt)
    const text = result.response.text()
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Invalid response from AI')
    }
    
    const parsed = JSON.parse(jsonMatch[0])

    return NextResponse.json({ parsed })
  } catch (error: any) {
    console.error('AI parsing error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

### **File: `lib/hooks/useStellar.ts`**
```typescript
import { useState } from 'react'
import { useWallet } from './useWallet'

export function useStellar() {
  const [loading, setLoading] = useState(false)
  const { address, fetchBalance } = useWallet()

  async function sendXLM(destination: string, amount: string) {
    setLoading(true)

    try {
      const response = await fetch('/api/stellar/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          source: address,
          destination, 
          amount 
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Transaction failed')
      }

      const result = await response.json()
      
      // Refresh balance
      await fetchBalance()
      
      return result
    } finally {
      setLoading(false)
    }
  }

  return { sendXLM, loading }
}
```

### **File: `app/api/stellar/send/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import {
  Server,
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  BASE_FEE
} from '@stellar/stellar-sdk'
import { signTransaction } from '@stellar/freighter-api'

const server = new Server('https://horizon-testnet.stellar.org')

export async function POST(request: NextRequest) {
  try {
    const { source, destination, amount } = await request.json()

    // Validate inputs
    if (!source || !destination || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Load source account
    const sourceAccount = await server.loadAccount(source)

    // Build transaction
    const transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET
    })
      .addOperation(Operation.payment({
        destination,
        asset: Asset.native(),
        amount: amount.toString()
      }))
      .setTimeout(30)
      .build()

    // Sign with Freighter (client-side)
    // For now, return unsigned transaction
    const xdr = transaction.toXDR()

    return NextResponse.json({ 
      success: true,
      xdr,
      message: 'Transaction built successfully'
    })

  } catch (error: any) {
    console.error('Send XLM error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

### **File: `components/transactions/TransactionResult.tsx`**
```typescript
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle } from 'lucide-react'

interface TransactionResultProps {
  result: {
    success: boolean
    hash?: string
    error?: string
  }
}

export function TransactionResult({ result }: TransactionResultProps) {
  return (
    <Card className={result.success ? 'border-green-500' : 'border-red-500'}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          {result.success ? (
            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
          )}
          
          <div className="flex-1">
            <p className="font-medium mb-2">
              {result.success ? 'Transaction Successful' : 'Transaction Failed'}
            </p>
            
            {result.hash && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Transaction Hash</p>
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${result.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:underline font-mono"
                >
                  {result.hash.slice(0, 16)}...
                </a>
              </div>
            )}
            
            {result.error && (
              <p className="text-sm text-red-500">{result.error}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

### **File: `.env.example`**
```bash
# Gemini AI
GEMINI_API_KEY=your_gemini_key_here

# Stellar Network
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## **Level 1 Deliverables**

### **README.md Requirements**
```markdown
# Stellar AI Agent Network

## Overview
AI-powered autonomous agent infrastructure on Stellar blockchain.

## Features (Level 1)
- ✅ Freighter wallet integration
- ✅ XLM balance display
- ✅ Natural language transaction commands
- ✅ AI-powered command parsing
- ✅ Testnet transaction execution

## Setup Instructions

### Prerequisites
- Node.js 20+
- Freighter wallet extension
- Gemini API key (free at aistudio.google.com)

### Installation
```bash
git clone <repo-url>
cd stellar-agent-network
npm install
```

### Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Add your Gemini API key to `.env.local`

### Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Screenshots

### 1. Wallet Connected
[Screenshot showing connected wallet with balance]

### 2. AI Command Interface
[Screenshot showing chat interface with user typing command]

### 3. Successful Transaction
[Screenshot showing transaction success with hash]

### 4. Transaction on Explorer
[Screenshot from stellar.expert showing the transaction]

## Tech Stack
- Next.js 14
- TypeScript
- Tailwind CSS
- Stellar SDK
- Google Gemini AI
- Freighter Wallet

## License
MIT
```

## **Testing Checklist for Level 1**
- [ ] Can connect Freighter wallet
- [ ] Balance displays correctly
- [ ] Can type natural language command
- [ ] AI correctly parses "Send X XLM to GXXX..."
- [ ] Transaction executes on testnet
- [ ] Transaction hash is displayed
- [ ] Hash links to Stellar Explorer
- [ ] Balance updates after transaction
- [ ] Error shown if insufficient balance
- [ ] Error shown if Freighter not installed
- [ ] Can disconnect wallet
- [ ] README has all required screenshots
- [ ] Code is clean and commented

---

# 🟡 **LEVEL 2 - YELLOW BELT**

## **Timeline**: Week 2-3 (14 days)

## **Requirements**
1. ✅ Multi-wallet support (3+ wallets)
2. ✅ Smart contract deployed on testnet
3. ✅ Contract called from frontend
4. ✅ 3 error types handled
5. ✅ Transaction status visible
6. ✅ Minimum 2+ meaningful commits

## **User Stories**

### **US-2.1: Multi-Wallet Support**
```
AS A user
I WANT TO choose between multiple wallets
SO THAT I can use my preferred wallet
```

**Acceptance Criteria:**
- [ ] Support Freighter, Albedo, xBull wallets
- [ ] Wallet selector UI shown before connection
- [ ] Can switch between wallets
- [ ] Each wallet shows correct balance
- [ ] Connection state saved per wallet

### **US-2.2: Deploy Agent Contract**
```
AS A user
I WANT TO deploy my first AI agent as a smart contract
SO THAT it can execute automatically
```

**Acceptance Criteria:**
- [ ] "Create Agent" button in UI
- [ ] Form to configure agent (name, strategy)
- [ ] AI generates agent configuration
- [ ] Contract deployed to Stellar testnet
- [ ] Contract address displayed
- [ ] Contract visible on Stellar Explorer

### **US-2.3: Invoke Contract**
```
AS A user with a deployed agent
I WANT TO execute my agent's function
SO THAT it performs the configured action
```

**Acceptance Criteria:**
- [ ] "Execute Agent" button for deployed agents
- [ ] Contract function called via Soroban RPC
- [ ] Transaction status shown (pending/success/fail)
- [ ] Contract events displayed
- [ ] Execution history logged

### **US-2.4: Error Handling**
```
AS A user
I WANT TO see clear error messages
SO THAT I know what went wrong
```

**Acceptance Criteria:**
- [ ] Wallet not found error
- [ ] Transaction rejected error
- [ ] Insufficient balance error
- [ ] Each error has helpful message
- [ ] Errors shown in UI, not just console

## **Technical Implementation**

### **File: `contracts/agent/Cargo.toml`**
```toml
[package]
name = "stellar-ai-agent"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
soroban-sdk = "21.0.0"

[dev-dependencies]
soroban-sdk = { version = "21.0.0", features = ["testutils"] }

[profile.release]
opt-level = "z"
overflow-checks = true
debug = 0
strip = "symbols"
lto = true
panic = "abort"
codegen-units = 1

[profile.release-with-logs]
inherits = "release"
debug-assertions = true
```

### **File: `contracts/agent/src/lib.rs`**
```rust
#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, 
    Address, Env, String, Symbol, Vec
};

// Agent configuration stored on-chain
#[contracttype]
#[derive(Clone)]
pub struct AgentConfig {
    pub owner: Address,
    pub name: String,
    pub strategy: Symbol,
    pub active: bool,
    pub executions: u32,
}

// Execution record
#[contracttype]
#[derive(Clone)]
pub struct Execution {
    pub timestamp: u64,
    pub recipient: Address,
    pub amount: i128,
    pub success: bool,
}

#[contract]
pub struct AIAgent;

#[contractimpl]
impl AIAgent {
    /// Initialize a new agent
    pub fn initialize(
        env: Env,
        owner: Address,
        name: String,
        strategy: Symbol
    ) {
        // Verify caller is owner
        owner.require_auth();

        let config = AgentConfig {
            owner: owner.clone(),
            name: name.clone(),
            strategy,
            active: true,
            executions: 0,
        };

        // Store config
        env.storage()
            .instance()
            .set(&symbol_short!("config"), &config);

        // Emit initialization event
        env.events().publish(
            (symbol_short!("init"), owner),
            name
        );
    }

    /// Execute agent action
    pub fn execute(
        env: Env,
        recipient: Address,
        amount: i128
    ) -> Result<(), Error> {
        // Get config
        let mut config: AgentConfig = env
            .storage()
            .instance()
            .get(&symbol_short!("config"))
            .ok_or(Error::NotInitialized)?;

        // Verify owner
        config.owner.require_auth();

        // Check if active
        if !config.active {
            return Err(Error::AgentInactive);
        }

        // Check amount is positive
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        // Record execution
        let execution = Execution {
            timestamp: env.ledger().timestamp(),
            recipient: recipient.clone(),
            amount,
            success: true,
        };

        // Get execution history
        let mut history: Vec<Execution> = env
            .storage()
            .instance()
            .get(&symbol_short!("history"))
            .unwrap_or(Vec::new(&env));

        history.push_back(execution);
        
        // Update config
        config.executions += 1;
        
        // Store updated data
        env.storage()
            .instance()
            .set(&symbol_short!("config"), &config);
        env.storage()
            .instance()
            .set(&symbol_short!("history"), &history);

        // Emit execution event
        env.events().publish(
            (symbol_short!("executed"), config.owner),
            (recipient, amount)
        );

        Ok(())
    }

    /// Get agent configuration
    pub fn get_config(env: Env) -> Result<AgentConfig, Error> {
        env.storage()
            .instance()
            .get(&symbol_short!("config"))
            .ok_or(Error::NotInitialized)
    }

    /// Get execution count
    pub fn get_executions(env: Env) -> u32 {
        let config: AgentConfig = env
            .storage()
            .instance()
            .get(&symbol_short!("config"))
            .unwrap_or_else(|| panic!("Not initialized"));
        
        config.executions
    }

    /// Toggle agent active status
    pub fn toggle_active(env: Env) -> Result<bool, Error> {
        let mut config: AgentConfig = env
            .storage()
            .instance()
            .get(&symbol_short!("config"))
            .ok_or(Error::NotInitialized)?;

        config.owner.require_auth();

        config.active = !config.active;
        
        env.storage()
            .instance()
            .set(&symbol_short!("config"), &config);

        Ok(config.active)
    }
}

// Error types
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    AgentInactive = 2,
    InvalidAmount = 3,
}
```

### **File: `contracts/agent/src/test.rs`**
```rust
#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn test_initialize() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AIAgent);
    let client = AIAgentClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let name = String::from_str(&env, "Test Agent");
    let strategy = symbol_short!("simple");

    client.initialize(&owner, &name, &strategy);

    let config = client.get_config();
    assert_eq!(config.name, name);
    assert_eq!(config.owner, owner);
    assert_eq!(config.active, true);
    assert_eq!(config.executions, 0);
}

#[test]
fn test_execute() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AIAgent);
    let client = AIAgentClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let recipient = Address::generate(&env);
    let name = String::from_str(&env, "Test Agent");

    client.initialize(&owner, &name, &symbol_short!("simple"));
    client.execute(&recipient, &100);

    assert_eq!(client.get_executions(), 1);
}

#[test]
#[should_panic(expected = "AgentInactive")]
fn test_execute_inactive() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AIAgent);
    let client = AIAgentClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let recipient = Address::generate(&env);

    client.initialize(&owner, &String::from_str(&env, "Test"), &symbol_short!("simple"));
    client.toggle_active(); // Deactivate
    client.execute(&recipient, &100); // Should panic
}
```

### **File: `contracts/scripts/build.sh`**
```bash
#!/bin/bash

echo "Building Stellar AI Agent contract..."

cd "$(dirname "$0")/.."

# Build the contract
stellar contract build

echo "✅ Contract built successfully!"
echo "WASM location: target/wasm32-unknown-unknown/release/stellar_ai_agent.wasm"
```

### **File: `contracts/scripts/deploy.sh`**
```bash
#!/bin/bash

echo "Deploying Stellar AI Agent to testnet..."

cd "$(dirname "$0")/.."

# Build first
stellar contract build

# Deploy to testnet
CONTRACT_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/stellar_ai_agent.wasm \
  --source agent-deployer \
  --network testnet)

echo "✅ Contract deployed!"
echo "Contract ID: $CONTRACT_ID"
echo ""
echo "Add this to your .env.local:"
echo "NEXT_PUBLIC_AGENT_CONTRACT_ID=$CONTRACT_ID"
```

### **File: `lib/stellar/contracts.ts`**
```typescript
import {
  SorobanRpc,
  Contract,
  xdr,
  Address,
  nativeToScVal,
  scValToNative
} from '@stellar/stellar-sdk'

const rpc = new SorobanRpc.Server(
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL!
)

export class AgentContract {
  private contract: Contract

  constructor(contractId: string) {
    this.contract = new Contract(contractId)
  }

  async initialize(
    owner: string,
    name: string,
    strategy: string
  ) {
    // Build contract call
    const operation = this.contract.call(
      'initialize',
      Address.fromString(owner).toScVal(),
      nativeToScVal(name, { type: 'string' }),
      nativeToScVal(strategy, { type: 'symbol' })
    )

    return operation
  }

  async execute(
    recipient: string,
    amount: string
  ) {
    const operation = this.contract.call(
      'execute',
      Address.fromString(recipient).toScVal(),
      nativeToScVal(parseInt(amount) * 10000000, { type: 'i128' })
    )

    return operation
  }

  async getConfig() {
    try {
      const result = await rpc.getContractData(
        this.contract.contractId(),
        nativeToScVal('config', { type: 'symbol' })
      )

      return scValToNative(result.val)
    } catch (error) {
      console.error('Failed to get config:', error)
      return null
    }
  }

  async getExecutions() {
    try {
      const result = await rpc.getContractData(
        this.contract.contractId(),
        nativeToScVal('executions', { type: 'symbol' })
      )

      return scValToNative(result.val)
    } catch (error) {
      console.error('Failed to get executions:', error)
      return 0
    }
  }
}
```

### **File: `app/agents/create/page.tsx`**
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useWallet } from '@/lib/hooks/useWallet'

export default function CreateAgentPage() {
  const router = useRouter()
  const { address } = useWallet()
  const [loading, setLoading] = useState(false)
  const [contractId, setContractId] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    strategy: 'simple'
  })

  async function handleDeploy() {
    setLoading(true)
    
    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: address,
          ...formData
        })
      })

      const result = await response.json()
      setContractId(result.contractId)
      
      // Redirect to agent page
      setTimeout(() => {
        router.push(`/agents/${result.contractId}`)
      }, 2000)
      
    } catch (error) {
      console.error('Deployment failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Create New Agent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Agent Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                name: e.target.value 
              }))}
              placeholder="My Trading Agent"
            />
          </div>

          <div>
            <Label htmlFor="strategy">Strategy</Label>
            <select
              id="strategy"
              value={formData.strategy}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                strategy: e.target.value 
              }))}
              className="w-full p-2 border rounded"
            >
              <option value="simple">Simple Executor</option>
              <option value="scheduled">Scheduled Payments</option>
              <option value="conditional">Conditional Execution</option>
            </select>
          </div>

          <Button 
            onClick={handleDeploy} 
            className="w-full"
            disabled={loading || !address}
          >
            {loading ? 'Deploying Contract...' : 'Deploy Agent'}
          </Button>

          {contractId && (
            <div className="p-4 bg-green-50 border border-green-200 rounded">
              <p className="text-sm font-medium text-green-800 mb-2">
                ✅ Agent Deployed Successfully!
              </p>
              <p className="text-xs text-green-600 font-mono break-all">
                {contractId}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

### **File: `app/api/agents/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { AgentContract } from '@/lib/stellar/contracts'

export async function POST(request: NextRequest) {
  try {
    const { owner, name, strategy } = await request.json()

    // For demo, use pre-deployed contract
    const contractId = process.env.NEXT_PUBLIC_AGENT_CONTRACT_ID!

    const agent = new AgentContract(contractId)
    
    // Initialize contract
    const operation = await agent.initialize(owner, name, strategy)

    // In production, this would submit the transaction
    // For now, return the contract ID
    
    return NextResponse.json({
      success: true,
      contractId,
      message: 'Agent created successfully'
    })

  } catch (error: any) {
    console.error('Agent creation failed:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

### **File: `lib/utils/errors.ts`**
```typescript
export enum ErrorType {
  WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
  TRANSACTION_REJECTED = 'TRANSACTION_REJECTED',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONTRACT_ERROR = 'CONTRACT_ERROR'
}

export const ERROR_MESSAGES = {
  [ErrorType.WALLET_NOT_FOUND]: 'Wallet extension not found. Please install Freighter wallet.',
  [ErrorType.TRANSACTION_REJECTED]: 'Transaction was rejected. Please try again.',
  [ErrorType.INSUFFICIENT_BALANCE]: 'Insufficient XLM balance to complete this transaction.',
  [ErrorType.NETWORK_ERROR]: 'Network error. Please check your connection.',
  [ErrorType.CONTRACT_ERROR]: 'Smart contract error. Please contact support.'
}

export function getErrorMessage(error: any): string {
  if (error.message?.includes('User declined')) {
    return ERROR_MESSAGES[ErrorType.TRANSACTION_REJECTED]
  }
  
  if (error.message?.includes('insufficient')) {
    return ERROR_MESSAGES[ErrorType.INSUFFICIENT_BALANCE]
  }
  
  if (error.message?.includes('Network')) {
    return ERROR_MESSAGES[ErrorType.NETWORK_ERROR]
  }
  
  return error.message || 'An unknown error occurred'
}
```

## **Level 2 Deliverables**

### **README Updates**
```markdown
## Features (Level 2)
- ✅ Multi-wallet support (Freighter, Albedo, Rabet)
- ✅ Soroban smart contract deployment
- ✅ Contract invocation from frontend
- ✅ Real-time transaction status
- ✅ Comprehensive error handling

## Contract Details
**Contract Address:** CXXX...
**Network:** Stellar Testnet
**View on Explorer:** [Link to stellarchain.io]

## Transaction Examples
1. **Contract Deployment:** [TX hash link]
2. **Agent Initialization:** [TX hash link]
3. **Agent Execution:** [TX hash link]

## Error Handling
- Wallet not found
- Transaction rejected
- Insufficient balance
```

---

# 🟠 **LEVEL 3 - ORANGE BELT**

## **Timeline**: Week 4-5 (14 days)

## **Requirements**
1. ✅ Mini-dApp fully functional
2. ✅ Minimum 3 tests passing
3. ✅ README complete with documentation
4. ✅ Demo video (1 minute)
5. ✅ Minimum 3+ meaningful commits

## **New Features**

### **Agent Templates**
Pre-built agent configurations:
1. **Auto-Rebalancer**: Maintains asset ratio
2. **Bill Scheduler**: Recurring payments
3. **Price Alert**: Execute when price threshold met

### **Agent Dashboard**
- List all deployed agents
- View agent status (active/inactive)
- See execution history
- Agent analytics (execution count, success rate)

### **Testing Suite**
- Unit tests for Stellar functions
- Unit tests for AI parsing
- Integration test for full flow
- Contract tests with Soroban test utils

## **Technical Implementation**

### **File: `tests/unit/stellar.test.ts`**
```typescript
import { describe, it, expect, beforeAll } from '@jest/globals'
import { Keypair, Server } from '@stellar/stellar-sdk'

const server = new Server('https://horizon-testnet.stellar.org')

describe('Stellar Operations', () => {
  let testKeypair: Keypair
  
  beforeAll(async () => {
    // Create test account
    testKeypair = Keypair.random()
    
    // Fund with friendbot
    await fetch(
      `https://friendbot.stellar.org?addr=${testKeypair.publicKey()}`
    )
    
    // Wait for account creation
    await new Promise(resolve => setTimeout(resolve, 5000))
  })

  it('should fetch account balance', async () => {
    const account = await server.loadAccount(testKeypair.publicKey())
    
    expect(account).toBeDefined()
    expect(account.balances).toHaveLength(1)
    expect(account.balances[0].asset_type).toBe('native')
  })

  it('should create and submit payment transaction', async () => {
    const destination = Keypair.random().publicKey()
    const account = await server.loadAccount(testKeypair.publicKey())

    const transaction = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: Networks.TESTNET
    })
      .addOperation(Operation.payment({
        destination,
        asset: Asset.native(),
        amount: '10'
      }))
      .setTimeout(30)
      .build()

    transaction.sign(testKeypair)
    
    const result = await server.submitTransaction(transaction)
    
    expect(result.successful).toBe(true)
    expect(result.hash).toBeDefined()
  })

  it('should handle insufficient balance error', async () => {
    const destination = Keypair.random().publicKey()
    const account = await server.loadAccount(testKeypair.publicKey())

    const transaction = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: Networks.TESTNET
    })
      .addOperation(Operation.payment({
        destination,
        asset: Asset.native(),
        amount: '999999999' // More than available
      }))
      .setTimeout(30)
      .build()

    transaction.sign(testKeypair)
    
    await expect(
      server.submitTransaction(transaction)
    ).rejects.toThrow()
  })
})
```

### **File: `tests/unit/ai.test.ts`**
```typescript
import { describe, it, expect } from '@jest/globals'
import { parseCommandWithAI } from '@/lib/ai/providers/gemini'

describe('AI Command Parsing', () => {
  it('should parse send XLM command', async () => {
    const input = 'Send 50 XLM to GABC123...'
    const result = await parseCommandWithAI(input)
    
    expect(result.action).toBe('send_xlm')
    expect(result.amount).toBe('50')
    expect(result.destination).toContain('GABC')
  })

  it('should parse create agent command', async () => {
    const input = 'Create a rebalancing agent'
    const result = await parseCommandWithAI(input)
    
    expect(result.action).toBe('create_agent')
    expect(result.strategy).toBeDefined()
  })

  it('should handle invalid commands gracefully', async () => {
    const input = 'Hello world'
    
    await expect(
      parseCommandWithAI(input)
    ).rejects.toThrow()
  })
})
```

### **File: `tests/integration/agent-creation.test.ts`**
```typescript
import { describe, it, expect, beforeAll } from '@jest/globals'
import { Keypair } from '@stellar/stellar-sdk'

describe('Agent Creation Flow', () => {
  let testKeypair: Keypair
  
  beforeAll(async () => {
    testKeypair = Keypair.random()
    await fetch(
      `https://friendbot.stellar.org?addr=${testKeypair.publicKey()}`
    )
    await new Promise(resolve => setTimeout(resolve, 5000))
  })

  it('should complete full agent creation flow', async () => {
    // 1. Parse AI command
    const command = 'Create a new agent named Test'
    const parsed = await parseCommandWithAI(command)
    expect(parsed.action).toBe('create_agent')
    
    // 2. Deploy contract
    const contractId = await deployAgentContract(
      testKeypair.publicKey(),
      'Test Agent',
      'simple'
    )
    expect(contractId).toBeDefined()
    expect(contractId).toMatch(/^C[A-Z0-9]+$/)
    
    // 3. Verify contract on-chain
    const config = await getAgentConfig(contractId)
    expect(config.name).toBe('Test Agent')
    expect(config.active).toBe(true)
  })
})
```

### **File: `app/dashboard/page.tsx`**
```typescript
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AgentCard } from '@/components/agents/AgentCard'
import { useWallet } from '@/lib/hooks/useWallet'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default function DashboardPage() {
  const { address } = useWallet()
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (address) {
      fetchAgents()
    }
  }, [address])

  async function fetchAgents() {
    try {
      const response = await fetch(`/api/agents?owner=${address}`)
      const data = await response.json()
      setAgents(data.agents)
    } catch (error) {
      console.error('Failed to fetch agents:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!address) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500">
              Please connect your wallet to view your agents
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Agent Dashboard</h1>
          <p className="text-gray-500">
            Manage your autonomous agents
          </p>
        </div>
        
        <Link href="/agents/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Agent
          </Button>
        </Link>
      </div>

      {loading ? (
        <p>Loading agents...</p>
      ) : agents.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 mb-4">
              You don't have any agents yet
            </p>
            <Link href="/agents/create">
              <Button>Create Your First Agent</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent: any) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  )
}
```

### **File: `components/agents/AgentCard.tsx`**
```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Activity, Clock, CheckCircle2 } from 'lucide-react'

interface AgentCardProps {
  agent: {
    id: string
    name: string
    strategy


# Stellar AI Agent Network — Level 5 & 6 Roadmap

## Overview

Stellar AI Agent Network is building the first agentic automation platform on Stellar, uniquely powered by AI and natural language. Our goal is to empower any user to create, schedule, and manage advanced on-chain tasks simply by describing them in plain English—no scripts or coding required. Agents automatically translate user intents into secure programmable workflows, making DeFi, DAO ops, and programmable money truly accessible.

---

## Level 5 (Blue Belt): MVP with Real Users & NLP Workflows

### Objectives

- Launch a Minimum Viable Product (MVP) usable by at least 5 real testnet users
- Enable agent and automation creation through natural language instructions
- Gather actionable user feedback and iterate quickly

### Planned Features

1. **Natural Language Agent Creation**
   - Users type (or speak) task descriptions like:
     - “Send 10 XLM to my savings every Monday”
     - “Notify me if my wallet falls below 50 XLM, and buy more”
   - System uses NLP to convert requests into smart contract cron jobs or event-based actions

2. **Conversational Interface**
   - Interactive chat-based UI for agent setup, status, modifications, and audit
   - Help and onboarding flows powered by AI

3. **Self-Serve Agent Marketplace**
   - Browse and activate pre-built agent templates for common tasks
   - Ratings and feedback for agents/templates

4. **Multi-User Collaboration**
   - Shared agents with multi-signature spending/approvals
   - Role-based access controls

5. **On-Chain Agent Execution**
   - Agents as Soroban smart contracts or wallets—all transactions visible on Stellar testnet explorer

6. **User Feedback Collection**
   - In-app surveys, interviews, and usage analytics to guide next improvements

---

## Level 6 (Black Belt): Scaling, Advanced Automation, & Ecosystem

### Objectives

- Scale platform to 30+ active real users with robust feedback
- Deliver advanced agentic and secure automation features
- Prepare for production-readiness and ecosystem impact

### Planned Features

1. **Advanced NLP & Workflow Composition**
   - Support for more complex, multi-stage and conditional requests
     - e.g., “If XLM drops below 0.1 USDC, alert me and move half my balance”
     - Chain workflows with “if X, then Y” logic

2. **Comprehensive Dashboards & Analytics**
   - Live reporting of agent activity, transaction stats, DAU/WAU, and retention
   - Error monitoring and recovery insights

3. **Agent Governance & Security**
   - Role/permission management, multi-signature controls, spend limits
   - Emergency stop (“pause agent”) and audit tools
   - Security checklist with automated CI/CD checks

4. **Community Contribution & API**
   - Public API for developers to build or extend AI-driven agents
   - Documentation, open-source releases, and community engagement

5. **Demo Day & Production Prep**
   - Live deployment (e.g., Vercel), demo scripts, user guides
   - Showcase production-caliber UX, onboarding, and agent transparency

---

## Future Scope (Beyond Level 6)

- Mainnet deployment, fiat-in/out integrations via Stellar anchors
- Marketplace for open agent “apps”
- More AI workflows: eg. cross-chain triggers, social finance, nonprofit automations
- Expansion to other blockchains and real-world partnerships
- Pursuing ecosystem grants, open innovation, and community showcases

---

## Success Criteria

- **Level 5:** At least 5 real users have set up and used agents via natural language
- **Level 6:** 30+ users, advanced workflow adoption, dashboard analytics live, security features in place, and public demo day showcase

---

_This plan will serve as the strategic guide for all development activities through Level 5 and 6, ensuring our vision of easy, powerful, and accessible programmable money on Stellar becomes a reality._