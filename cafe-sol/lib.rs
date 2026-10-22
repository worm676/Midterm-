use anchor_lang::prelude::*;

// Leave as-is: Solana Playground replaces this with your program ID on Build.
declare_id!("11111111111111111111111111111111");

pub const STAGES: u8 = 6; // harvest, export, shipped, customs, roaster, consumer scan

#[program]
pub mod cafe_sol {
    use super::*;

    /// Stores the NAAT use case on-chain and classifies it from the 5 decision-test answers:
    /// [multi_party, no_trust_or_middleman, immutable, finality_ok, middleman_removal_value]
    pub fn register_use_case(
        ctx: Context<RegisterUseCase>,
        batch_id: String,
        name: String,
        description: String,
        answers: [bool; 5],
    ) -> Result<()> {
        require!(batch_id.len() <= 32, CafeError::TooLong);
        require!(name.len() <= 40, CafeError::TooLong);
        require!(description.len() <= 128, CafeError::TooLong);

        let yes = answers.iter().filter(|a| **a).count();
        // No shared data or a trusted middleman already exists -> a database wins.
        let classification = if !answers[0] || !answers[1] || yes <= 2 {
            Classification::UseDatabase
        } else if yes == 5 {
            Classification::Strong
        } else {
            Classification::Weak
        };

        let uc = &mut ctx.accounts.use_case;
        uc.authority = ctx.accounts.authority.key();
        uc.batch_id = batch_id.clone();
        uc.name = name;
        uc.description = description;
        uc.answers = answers;
        uc.classification = classification;
        uc.next_stage = 0;
        uc.created_at = Clock::get()?.unix_timestamp;
        uc.last_ts = uc.created_at;

        emit!(UseCaseRegistered { use_case: uc.key(), batch_id, classification });
        Ok(())
    }

    /// Records one supply-chain step. Steps must arrive in order 0..=5.
    pub fn record_transaction(ctx: Context<RecordTransaction>, stage: u8, actor: String) -> Result<()> {
        require!(actor.len() <= 48, CafeError::TooLong);
        let uc = &mut ctx.accounts.use_case;
        require!(uc.classification != Classification::UseDatabase, CafeError::NotSuitable);
        require!(uc.next_stage < STAGES, CafeError::ChainComplete);
        require!(stage == uc.next_stage, CafeError::OutOfOrder);

        let now = Clock::get()?.unix_timestamp;
        require!(now >= uc.last_ts, CafeError::OutOfOrder);

        let step = &mut ctx.accounts.step;
        step.use_case = uc.key();
        step.batch_id = uc.batch_id.clone();
        step.stage = stage;
        step.actor = actor.clone();
        step.recorder = ctx.accounts.recorder.key();
        step.timestamp = now;

        uc.next_stage += 1;
        uc.last_ts = now;

        emit!(StepRecorded {
            use_case: uc.key(),
            batch_id: uc.batch_id.clone(),
            stage,
            actor,
            recorder: step.recorder,
            timestamp: now,
        });
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(batch_id: String)]
pub struct RegisterUseCase<'info> {
    #[account(
        init,
        payer = authority,
        space = UseCase::SPACE,
        seeds = [b"use_case", authority.key().as_ref(), batch_id.as_bytes()],
        bump
    )]
    pub use_case: Account<'info, UseCase>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(stage: u8)]
pub struct RecordTransaction<'info> {
    #[account(mut)]
    pub use_case: Account<'info, UseCase>,
    // One immutable account per stage: a stage can never be recorded twice.
    #[account(
        init,
        payer = recorder,
        space = Step::SPACE,
        seeds = [b"step", use_case.key().as_ref(), &[stage]],
        bump
    )]
    pub step: Account<'info, Step>,
    #[account(mut)]
    pub recorder: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct UseCase {
    pub authority: Pubkey,
    pub batch_id: String,
    pub name: String,
    pub description: String,
    pub answers: [bool; 5],
    pub classification: Classification,
    pub next_stage: u8,
    pub created_at: i64,
    pub last_ts: i64,
}

impl UseCase {
    pub const SPACE: usize = 8 + 32 + (4 + 32) + (4 + 40) + (4 + 128) + 5 + 1 + 1 + 8 + 8;
}

#[account]
pub struct Step {
    pub use_case: Pubkey,
    pub batch_id: String,
    pub stage: u8,
    pub actor: String,
    pub recorder: Pubkey,
    pub timestamp: i64,
}

impl Step {
    pub const SPACE: usize = 8 + 32 + (4 + 32) + 1 + (4 + 48) + 32 + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum Classification {
    Strong,
    Weak,
    UseDatabase,
}

#[event]
pub struct UseCaseRegistered {
    pub use_case: Pubkey,
    pub batch_id: String,
    pub classification: Classification,
}

#[event]
pub struct StepRecorded {
    pub use_case: Pubkey,
    pub batch_id: String,
    pub stage: u8,
    pub actor: String,
    pub recorder: Pubkey,
    pub timestamp: i64,
}

#[error_code]
pub enum CafeError {
    #[msg("Step is out of order")]
    OutOfOrder,
    #[msg("All 6 steps already recorded")]
    ChainComplete,
    #[msg("Use case classified UseDatabase; blockchain not justified")]
    NotSuitable,
    #[msg("Input string too long")]
    TooLong,
}
