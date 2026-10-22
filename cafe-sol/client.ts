// Cafe Sol client — run in Solana Playground (globals: pg, web3).
const STEPS: [string, string][] = [
  ["Harvest certified", "Medellin Farm Cooperative"],
  ["Export cleared", "Freight Forwarder (Colombia)"],
  ["Shipped to US", "US Importer"],
  ["Customs cleared", "US Customs"],
  ["Roaster certified", "Boca Raton Roaster"],
  ["Consumer QR scan", "Consumer"],
];
const link = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;

const batchId = `CS-${Date.now()}`; // unique per run so re-runs never collide
const [useCase] = web3.PublicKey.findProgramAddressSync(
  [Buffer.from("use_case"), pg.wallet.publicKey.toBuffer(), Buffer.from(batchId)],
  pg.program.programId
);

console.log(`Wallet: ${pg.wallet.publicKey.toBase58()}`);
console.log(`Batch:  ${batchId}`);

const regSig = await pg.program.methods
  .registerUseCase(
    batchId,
    "Cafe Sol Provenance",
    "Colombia-to-Florida coffee provenance across 6 untrusted parties",
    [true, true, true, true, true]
  )
  .accounts({ useCase, authority: pg.wallet.publicKey })
  .rpc();
await pg.connection.confirmTransaction(regSig, "confirmed");

const uc = await pg.program.account.useCase.fetch(useCase);
console.log(`Registered use case -> ${Object.keys(uc.classification)[0]}`);
console.log(`  ${link(regSig)}`);

for (let i = 0; i < STEPS.length; i++) {
  const [label, actor] = STEPS[i];
  const [step] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("step"), useCase.toBuffer(), Buffer.from([i])],
    pg.program.programId
  );
  const sig = await pg.program.methods
    .recordTransaction(i, actor)
    .accounts({ useCase, step, recorder: pg.wallet.publicKey })
    .rpc();
  await pg.connection.confirmTransaction(sig, "confirmed");
  console.log(`Step ${i + 1}/6 ${label} (${actor})`);
  console.log(`  ${link(sig)}`);
}

console.log("Provenance chain complete.");
