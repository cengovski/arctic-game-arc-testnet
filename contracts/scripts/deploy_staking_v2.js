const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const ARCTIC_BEASTS = "0xbe655D9Dda083608B52dDdC158b6F28bdEbfc16E";
  const ARCTIC_TOKEN = "0xe0Bb97b4A6fF64f2873a377E5eFE01Ab393029Cf";

  console.log("Deploying ArcticStakingV2...");
  const Staking = await ethers.getContractFactory("ArcticStakingV2");
  const staking = await Staking.deploy(ARCTIC_BEASTS, ARCTIC_TOKEN);
  await staking.waitForDeployment();
  const addr = await staking.getAddress();
  console.log("ArcticStakingV2 deployed to:", addr);

  // Deposit some reward tokens
  const token = await ethers.getContractAt("ArcticToken", ARCTIC_TOKEN);
  const rewardAmount = ethers.parseEther("100000"); // 100k ARCTIC for rewards
  console.log("Depositing 100,000 ARCTIC as rewards...");
  const tx = await token.approve(addr, rewardAmount);
  await tx.wait();
  const tx2 = await staking.depositRewards(rewardAmount);
  await tx2.wait();
  console.log("Rewards deposited!");

  // Verify
  const bal = await ethers.provider.getBalance(addr);
  console.log("Staking contract ETH balance:", ethers.formatEther(bal));
  
  const tokenBal = await ethers.provider.getBalance(addr);
  console.log("Done!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
