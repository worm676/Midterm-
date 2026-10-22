// Cafe Sol tests — run in Solana Playground (globals: pg, web3, assert).
describe("cafe_sol", () => {
  const pid = () => pg.program.programId;
  const ucPda = (batchId: string) =>
    web3.PublicKey.findProgramAddressSync(
      [Buffer.from("use_case"), pg.wallet.publicKey.toBuffer(), Buffer.from(batchId)],
      pid()
    )[0];
  const stepPda = (useCase: web3.PublicKey, i: number) =>
    web3.PublicKey.findProgramAddressSync(
      [Buffer.from("step"), useCase.toBuffer(), Buffer.from([i])],
      pid()
    )[0];

  const register = async (batchId: string, answers: boolean[]) => {
    const useCase = ucPda(batchId);
    await pg.program.methods
      .registerUseCase(batchId, "Cafe Sol", "Coffee provenance", answers)
      .accounts({ useCase, authority: pg.wallet.publicKey })
      .rpc({ commitment: "confirmed" });
    return useCase;
  };
  const record = (useCase: web3.PublicKey, i: number) =>
    pg.program.methods
      .recordTransaction(i, `Actor ${i}`)
      .accounts({ useCase, step: stepPda(useCase, i), recorder: pg.wallet.publicKey })
      .rpc({ commitment: "confirmed" });
  const expectError = async (p: Promise<unknown>, code: string) => {
    try {
      await p;
      assert.fail(`expected ${code}`);
    } catch (e) {
      assert.include(String(e), code);
    }
  };

  const run = Date.now();
  const strongId = `T-${run}`;
  let strong: web3.PublicKey;

  it("classifies 5 YES answers as Strong", async () => {
    strong = await register(strongId, [true, true, true, true, true]);
    const uc = await pg.program.account.useCase.fetch(strong, "confirmed");
    assert.equal(Object.keys(uc.classification)[0], "strong");
    assert.equal(uc.batchId, strongId);
  });

  it("rejects an out-of-order step", async () => {
    await expectError(record(strong, 2), "OutOfOrder");
  });

  it("records all 6 steps in order", async () => {
    for (let i = 0; i < 6; i++) await record(strong, i);
    const uc = await pg.program.account.useCase.fetch(strong, "confirmed");
    assert.equal(uc.nextStage, 6);
    const last = await pg.program.account.step.fetch(stepPda(strong, 5), "confirmed");
    assert.equal(last.stage, 5);
    assert.equal(last.batchId, strongId);
  });

  it("classifies 4 YES as Weak", async () => {
    const uc = await register(`W-${run}`, [true, true, true, false, true]);
    const acc = await pg.program.account.useCase.fetch(uc, "confirmed");
    assert.equal(Object.keys(acc.classification)[0], "weak");
  });

  it("classifies no-multi-party as UseDatabase and blocks recording", async () => {
    const uc = await register(`D-${run}`, [false, true, true, true, true]);
    const acc = await pg.program.account.useCase.fetch(uc, "confirmed");
    assert.equal(Object.keys(acc.classification)[0], "useDatabase");
    await expectError(record(uc, 0), "NotSuitable");
  });
});
