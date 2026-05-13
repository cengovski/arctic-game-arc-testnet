const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying ArcticDEXV2 with:", deployer.address);

  const USDC = "0x3600000000000000000000000000000000000000";
  const ARCTIC = "0xe0Bb97b4A6fF64f2873a377E5eFE01Ab393029Cf";

  const DEX = await ethers.getContractFactory("ArcticDEXV2");
  const dex = await DEX.deploy(USDC, ARCTIC);
  await dex.waitForDeployment();

  const addr = await dex.getAddress();
  console.log("ArcticDEXV2 deployed to:", addr);

  // Add initial liquidity: 10 USDC + 1000 ARCTIC
  console.log("Adding initial liquidity...");
  
  const usdcAmount = ethers.parseUnits("10", 6); // 10 USDC (6 decimals)
  const arcticAmount = ethers.parseUnits("1000", 18); // 1000 ARCTIC (18 decimals)

  // Approve USDC
  const usdcContract = await ethers.getContractAt("IERC20", USDC);
  const arcticContract = await ethers.getContractAt("IERC20", ARCTIC);

  const usdcBal = await usdcContract.balanceOf(deployer.address);
  console.log("USDC balance:", ethers.formatUnits(usdcBal, 6));

  const arcticBal = await arcticContract.balanceOf(deployer.address);
  console.log("ARCTIC balance:", ethers.formatUnits(arcticBal, 18));

  // Check allowances
  const usdcAllowance = await usdcContract.allowance(deployer.address, addr);
  const arcticAllowance = await arcticContract.allowance(deployer.address, addr);
  console.log("USDC allowance:", ethers.formatUnits(usdcAllowance, 6));
  console.log("ARCTIC allowance:", ethers.formatUnits(arcticAllowance, 18));

  if (usdcAllowance < usdcAmount) {
    console.log("Approving USDC...");
    const tx1 = await usdcContract.approve(addr, ethers.MaxUint256);
    await tx1.wait();
    console.log("USDC approved");
  }

  if (arcticAllowance < arcticAmount) {
    console.log("Approving ARCTIC...");
    const tx2 = await arcticContract.approve(addr, ethers.MaxUint256);
    await tx2.wait();
    console.log("ARCTIC approved");
  }

  // Add liquidity
  console.log("Adding liquidity: 10 USDC + 1000 ARCTIC...");
  const tx3 = await dex.addLiquidity(usdcAmount, arcticAmount, { gasLimit: 500000 });
  await tx3.wait();
  console.log("Liquidity added!");

  // Verify pool
  const poolInfo = await dex.getPoolInfo();
  console.log("Pool USDC:", ethers.formatUnits(poolInfo.usdcBal, 6));
  console.log("Pool ARCTIC:", ethers.formatUnits(poolInfo.arcticBal, 18));
  console.log("LP Supply:", poolInfo.lpSupply.toString());
  console.log("LP Balance:", (await dex.lpBalances(deployer.address)).toString());

  console.log("\n=== DONE ===");
  console.log("DEX V2 Address:", addr);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
