const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Account:", deployer.address);

  const USDC = "0x3600000000000000000000000000000000000000";
  const ARCTIC = "0xe0Bb97b4A6fF64f2873a377E5eFE01Ab393029Cf";
  const DEX = "0x2f56CFE29373B6d7563c6F0fd28E4E620F94a8C4";

  const usdcContract = await ethers.getContractAt("IERC20", USDC);
  const arcticContract = await ethers.getContractAt("IERC20", ARCTIC);
  const dex = await ethers.getContractAt("ArcticDEXV2", DEX);

  // Check balances
  const usdcBal = await usdcContract.balanceOf(deployer.address);
  const arcticBal = await arcticContract.balanceOf(deployer.address);
  console.log("USDC balance:", ethers.formatUnits(usdcBal, 6));
  console.log("ARCTIC balance:", ethers.formatUnits(arcticBal, 18));

  // Check allowances
  const usdcAllow = await usdcContract.allowance(deployer.address, DEX);
  const arcticAllow = await arcticContract.allowance(deployer.address, DEX);
  console.log("USDC allowance:", ethers.formatUnits(usdcAllow, 6));
  console.log("ARCTIC allowance:", ethers.formatUnits(arcticAllow, 18));

  // Try adding liquidity with smaller amounts first
  const usdcAmount = ethers.parseUnits("5", 6); // 5 USDC
  const arcticAmount = ethers.parseUnits("500", 18); // 500 ARCTIC

  console.log("\nTrying addLiquidity(5 USDC, 500 ARCTIC)...");
  
  try {
    // Estimate gas first
    const gas = await dex.addLiquidity.estimateGas(usdcAmount, arcticAmount);
    console.log("Estimated gas:", gas.toString());
  } catch(e) {
    console.log("Estimate gas failed:", e.message);
  }

  try {
    const tx = await dex.addLiquidity(usdcAmount, arcticAmount, { gasLimit: 500000 });
    console.log("TX:", tx.hash);
    const r = await tx.wait();
    console.log("Status:", r.status);
    if (r.status === 1) {
      console.log("Liquidity added!");
      const pool = await dex.getPoolInfo();
      console.log("Pool USDC:", ethers.formatUnits(pool.usdcBal, 6));
      console.log("Pool ARCTIC:", ethers.formatUnits(pool.arcticBal, 18));
      console.log("LP Supply:", pool.lpSupply.toString());
    }
  } catch(e) {
    console.log("addLiquidity failed:", e.shortMessage || e.message);
    
    // Try to simulate
    try {
      await dex.addLiquidity.staticCall(usdcAmount, arcticAmount);
    } catch(e2) {
      console.log("Static call error:", e2.reason || e2.message);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
