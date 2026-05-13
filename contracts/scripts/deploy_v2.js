const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const bal = await ethers.provider.getBalance(deployer.address);
  console.log("ETH Balance:", ethers.formatEther(bal));

  // USDC & EURC on ARC Testnet
  const USDC = "0x5b217E2168353e264f433D654499b76c6c32626c";
  const EURC = "0x1111111111111111111111111111111111111111"; // placeholder

  console.log("\n=== Deploying ArcticToken ===");
  const ArcticToken = await ethers.getContractFactory("ArcticToken");
  const token = await ArcticToken.deploy();
  await token.waitForDeployment();
  const tokenAddr = await token.getAddress();
  console.log("ArcticToken:", tokenAddr);

  console.log("\n=== Deploying ArcticBeasts ===");
  const ArcticBeasts = await ethers.getContractFactory("ArcticBeasts");
  const beasts = await ArcticBeasts.deploy();
  await beasts.waitForDeployment();
  const beastsAddr = await beasts.getAddress();
  console.log("ArcticBeasts:", beastsAddr);

  console.log("\n=== Deploying ArcticStaking ===");
  const ArcticStaking = await ethers.getContractFactory("ArcticStaking");
  const staking = await ArcticStaking.deploy(beastsAddr, tokenAddr);
  await staking.waitForDeployment();
  const stakingAddr = await staking.getAddress();
  console.log("ArcticStaking:", stakingAddr);

  console.log("\n=== Deploying ArcticMarket ===");
  const ArcticMarket = await ethers.getContractFactory("ArcticMarket");
  const market = await ArcticMarket.deploy(beastsAddr, USDC);
  await market.waitForDeployment();
  const marketAddr = await market.getAddress();
  console.log("ArcticMarket:", marketAddr);

  console.log("\n=== Deploying ArcticDEX ===");
  const ArcticDEX = await ethers.getContractFactory("ArcticDEX");
  const dex = await ArcticDEX.deploy(USDC, tokenAddr);
  await dex.waitForDeployment();
  const dexAddr = await dex.getAddress();
  console.log("ArcticDEX:", dexAddr);

  // Setup
  console.log("\n=== Setup ===");
  const tx1 = await token.setStakingContract(stakingAddr);
  await tx1.wait();
  console.log("Staking contract set");

  const tx2 = await token.setDexContract(dexAddr);
  await tx2.wait();
  console.log("DEX contract set");

  // Add initial liquidity to DEX
  // 1000 USDC + 100,000 ARCTIC (starting price: 1 USDC = 100 ARCTIC)
  const usdcAmount = ethers.parseUnits("1000", 6); // 1000 USDC
  const arcticAmount = ethers.parseUnits("100000", 18); // 100,000 ARCTIC

  const tx3 = await token.approve(dexAddr, arcticAmount);
  await tx3.wait();
  console.log("ARCTIC approved for DEX");

  // Note: USDC needs to be transferred separately since it's an external contract
  // For now, add ARCTIC liquidity only — USDC will be added when users swap
  // Actually, let's add both. Owner needs USDC in wallet.
  try {
    const tx4 = await dex.addLiquidity(usdcAmount, arcticAmount);
    await tx4.wait();
    console.log("Initial liquidity added: 1000 USDC + 100,000 ARCTIC");
  } catch(e) {
    console.log("Could not add initial liquidity (need USDC in wallet):", e.message);
    // Add ARCTIC-only and let first swap provide USDC
    try {
      const tx4 = await dex.addLiquidity(1, arcticAmount);
      await tx4.wait();
      console.log("Partial liquidity added: 1 wei USDC + 100,000 ARCTIC");
    } catch(e2) {
      console.log("Partial liquidity also failed:", e2.message);
    }
  }

  // Save addresses
  const addresses = {
    ArcticToken: tokenAddr,
    ArcticBeasts: beastsAddr,
    ArcticStaking: stakingAddr,
    ArcticMarket: marketAddr,
    ArcticDEX: dexAddr,
    USDC: USDC,
  };

  fs.writeFileSync(
    __dirname + "/../contracts.json",
    JSON.stringify(addresses, null, 2)
  );

  console.log("\n=== DONE ===");
  console.log(JSON.stringify(addresses, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
