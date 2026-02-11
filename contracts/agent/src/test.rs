#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn test_initialize() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, AIAgent);
    let client = AIAgentClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let name = String::from_str(&env, "Test Agent");
    let strategy = symbol_short!("simple");

    client.initialize(&owner, &name, &strategy);

    let config = client.get_config();
    assert_eq!(config.name, name);
    assert_eq!(config.owner, owner);
    assert!(config.active);
    assert_eq!(config.executions, 0);
}

#[test]
fn test_execute() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, AIAgent);
    let client = AIAgentClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let recipient = Address::generate(&env);
    let name = String::from_str(&env, "Test Agent");

    client.initialize(&owner, &name, &symbol_short!("simple"));
    client.execute(&recipient, &100_i128);

    assert_eq!(client.get_executions(), 1);

    let history = client.get_history();
    assert_eq!(history.len(), 1);
}

#[test]
fn test_toggle_active() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, AIAgent);
    let client = AIAgentClient::new(&env, &contract_id);

    let owner = Address::generate(&env);

    client.initialize(
        &owner,
        &String::from_str(&env, "Toggle Test"),
        &symbol_short!("simple"),
    );

    // Initially active
    assert!(client.get_config().active);

    // Toggle off
    let active = client.toggle_active();
    assert!(!active);

    // Toggle on
    let active = client.toggle_active();
    assert!(active);
}

#[test]
#[should_panic]
fn test_execute_when_inactive() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, AIAgent);
    let client = AIAgentClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let recipient = Address::generate(&env);

    client.initialize(
        &owner,
        &String::from_str(&env, "Inactive Test"),
        &symbol_short!("simple"),
    );
    client.toggle_active(); // Deactivate
    client.execute(&recipient, &100_i128); // Should panic
}

#[test]
#[should_panic]
fn test_execute_invalid_amount() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, AIAgent);
    let client = AIAgentClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let recipient = Address::generate(&env);

    client.initialize(
        &owner,
        &String::from_str(&env, "Amount Test"),
        &symbol_short!("simple"),
    );
    client.execute(&recipient, &0_i128); // Should panic — invalid amount
}
