//! Commitment anchor for ZEC Perps shielded orders.
//!
//! A minimal, auditable record that an order commitment existed (and in which
//! batch) before it was revealed. Store the SHA-256 commitment when an order is
//! sealed; mark it revealed when the batch executes. Anyone can later verify the
//! revealed order against the stored commitment, and see that it was committed
//! before execution — making relayer withholding/tampering detectable.
//!
//! Injective mainnet CosmWasm uploads are governance-gated, so deploy this on
//! testnet; the relayer's `memo` anchor is the zero-deploy mainnet fallback.
use cosmwasm_schema::{cw_serde, QueryResponses};
use cosmwasm_std::{
    entry_point, to_json_binary, Binary, Deps, DepsMut, Env, MessageInfo, Response, StdResult,
};
use cw_storage_plus::Map;
use thiserror::Error;

#[cw_serde]
pub struct CommitmentRecord {
    pub batch_id: String,
    pub height: u64,
    pub revealed: bool,
}

pub const COMMITMENTS: Map<&str, CommitmentRecord> = Map::new("commitments");

#[cw_serde]
pub struct InstantiateMsg {}

#[cw_serde]
pub enum ExecuteMsg {
    StoreCommitment { hash: String, batch_id: String },
    Reveal { hash: String },
}

#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    #[returns(Option<CommitmentRecord>)]
    Commitment { hash: String },
}

#[derive(Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] cosmwasm_std::StdError),
    #[error("commitment already stored")]
    AlreadyStored {},
    #[error("commitment not found")]
    NotFound {},
}

#[entry_point]
pub fn instantiate(
    _deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    _msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    Ok(Response::new().add_attribute("action", "instantiate"))
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    env: Env,
    _info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::StoreCommitment { hash, batch_id } => {
            if COMMITMENTS.may_load(deps.storage, &hash)?.is_some() {
                return Err(ContractError::AlreadyStored {});
            }

            COMMITMENTS.save(
                deps.storage,
                &hash,
                &CommitmentRecord {
                    batch_id: batch_id.clone(),
                    height: env.block.height,
                    revealed: false,
                },
            )?;

            Ok(Response::new()
                .add_attribute("action", "store_commitment")
                .add_attribute("hash", hash)
                .add_attribute("batch_id", batch_id))
        }
        ExecuteMsg::Reveal { hash } => {
            let mut record = COMMITMENTS
                .may_load(deps.storage, &hash)?
                .ok_or(ContractError::NotFound {})?;

            record.revealed = true;
            COMMITMENTS.save(deps.storage, &hash, &record)?;

            Ok(Response::new()
                .add_attribute("action", "reveal")
                .add_attribute("hash", hash))
        }
    }
}

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::Commitment { hash } => {
            to_json_binary(&COMMITMENTS.may_load(deps.storage, &hash)?)
        }
    }
}
