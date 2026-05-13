const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // Existing contracts
  const ARCTIC_TOKEN = "0xe0Bb97b4A6fF64f2873a377E5eFE01Ab393029Cf";
  const ARCTIC_BEASTS = "0xbe655D9Dda083608B52dDdC158b6F28bdEbfc16E";
  const ARCTIC_STAKING = "0xf979AF495e2a04A264E97524932f67F65E20bA5f";
  const ARCTIC_MARKET = "0xA9bfe3b282d7925c83Bb1a5871f64FdDD9A8A43c";
  // Real USDC on ARC Testnet
  const USDC = "0x3600000000000000000000000000000000000000";

  console.log("\n=== Deploying ArcticDEX ===");
  const ArcticDEX = await ethers.getContractFactory("ArcticDEX");
  const dex = await ArcticDEX.deploy(USDC, ARCTIC_TOKEN);
  await dex.waitForDeployment();
  const dexAddr = await dex.getAddress();
  console.log("ArcticDEX:", dexAddr);

  // Add initial liquidity: 100 USDC + 10,000 ARCTIC
  // Starting price: 1 USDC = 100 ARCTIC
  console.log("\n=== Adding Initial Liquidity ===");
  const usdcAmount = ethers.parseUnits("100", 6); // 100 USDC
  const arcticAmount = ethers.parseUnits("10000", 18); // 10,000 ARCTIC

  const token = await ethers.getContractAt("ArcticToken", ARCTIC_TOKEN);

  // Approve ARCTIC
  const approveTx = await token.approve(dexAddr, arcticAmount);
  await approveTx.wait();
  console.log("ARCTIC approved: 10,000");

  // Approve USDC (need to call approve on USDC contract)
  const usdcContract = await ethers.getContractAt("IERC20", USDC);
  const usdcApproveTx = await usdcContract.approve(dexAddr, usdcAmount);
  await usdcApproveTx.wait();
  console.log("USDC approved: 100");

  try {
    const dexContract = await ethers.getContractAt("ArcticDEX", dexAddr);
    const liqTx = await dexContract.addLiquidity(usdcAmount, arcticAmount);
    await liqTx.wait();
    console.log("Liquidity added: 100 USDC + 10,000 ARCTIC");
  } catch(e) {
    console.log("Liquidity add failed:", e.message);
  }

  // Verify pool
  try {
    const dexContract = await ethers.getContractAt("ArcticDEX", dexAddr);
    const info = await dexContract.getPoolInfo();
    console.log("Pool USDC:", ethers.formatUnits(info.usdcBalance, 6));
    console.log("Pool ARCTIC:", ethers.formatUnits(info.arcticBalance, 18));
  } catch(e) {
    console.log("Pool info error:", e.message);
  }

  // Save
  const addresses = {
    ArcticToken: ARCTIC_TOKEN,
    ArcticBeasts: ARCTIC_BEASTS,
    ArcticStaking: ARCTIC_STAKING,
    ArcticMarket: ARCTIC_MARKET,
    ArcticDEX: dexAddr,
    USDC: USDC,
  };

  fs.writeFileSync(__dirname + "/../contracts.json", JSON.stringify(addresses, null, 2));
  console.log("\n=== DONE ===");
  console.log(JSON.stringify(addresses, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
