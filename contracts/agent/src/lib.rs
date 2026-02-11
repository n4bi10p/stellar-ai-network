#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror,
    symbol_short, Address, Env, String, Symbol, Vec,
};

// ── Error types ──
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    AgentInactive = 2,
    InvalidAmount = 3,
}

// ── Agent configuration stored on-chain ──
#[contracttype]
#[derive(Clone)]
pub struct AgentConfig {
    pub owner: Address,
    pub name: String,
    pub strategy: Symbol,
    pub active: bool,
    pub executions: u32,
}

// ── Execution record ──
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
    /// Initialize a new agent with owner, name, and strategy.
    pub fn initialize(
        env: Env,
        owner: Address,
        name: String,
        strategy: Symbol,
    ) {
        // Verify caller is the owner
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
        env.events().publish((symbol_short!("init"), owner), name);
    }

    /// Execute agent action — records an execution entry.
    pub fn execute(
        env: Env,
        recipient: Address,
        amount: i128,
    ) -> Result<(), Error> {
        // Get config
        let mut config: AgentConfig = env
            .storage()
            .instance()
            .get(&symbol_short!("config"))
            .ok_or(Error::NotInitialized)?;

        // Only owner can execute
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
            (symbol_short!("exec"), config.owner),
            (recipient, amount),
        );

        Ok(())
    }

    /// Get agent configuration.
    pub fn get_config(env: Env) -> Result<AgentConfig, Error> {
        env.storage()
            .instance()
            .get(&symbol_short!("config"))
            .ok_or(Error::NotInitialized)
    }

    /// Get execution count.
    pub fn get_executions(env: Env) -> u32 {
        let config: AgentConfig = env
            .storage()
            .instance()
            .get(&symbol_short!("config"))
            .unwrap_or_else(|| panic!("Not initialized"));

        config.executions
    }

    /// Get execution history.
    pub fn get_history(env: Env) -> Vec<Execution> {
        env.storage()
            .instance()
            .get(&symbol_short!("history"))
            .unwrap_or(Vec::new(&env))
    }

    /// Toggle agent active status. Returns new `active` value.
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

mod test;
