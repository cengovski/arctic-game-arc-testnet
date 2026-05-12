const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("========================================");
  console.log("Arctic Game - ARC Testnet Deploy");
  console.log("========================================");
  console.log(`Deployer: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} USDC`);
  console.log("========================================\n");

  // 1. Deploy ArcticToken
  console.log("[1/4] Deploying ArcticToken...");
  const ArcticToken = await ethers.getContractFactory("ArcticToken");
  const token = await ArcticToken.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log(`  ArcticToken: ${tokenAddress}`);

  // 2. Deploy ArcticBeasts NFT
  console.log("[2/4] Deploying ArcticBeasts NFT...");
  const ArcticBeasts = await ethers.getContractFactory("ArcticBeasts");
  const nft = await ArcticBeasts.deploy();
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log(`  ArcticBeasts: ${nftAddress}`);

  // 3. Deploy ArcticStaking
  console.log("[3/4] Deploying ArcticStaking...");
  const ArcticStaking = await ethers.getContractFactory("ArcticStaking");
  const staking = await ArcticStaking.deploy(nftAddress, tokenAddress);
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log(`  ArcticStaking: ${stakingAddress}`);

  // 4. Deploy ArcticMarket
  console.log("[4/4] Deploying ArcticMarket...");
  const ArcticMarket = await ethers.getContractFactory("ArcticMarket");
  const market = await ArcticMarket.deploy(nftAddress, tokenAddress);
  await market.waitForDeployment();
  const marketAddress = await market.getAddress();
  console.log(`  ArcticMarket: ${marketAddress}`);

  // 5. Configure contracts
  console.log("\n[Config] Setting up contract permissions...");
  
  // Set staking contract in token
  const tx1 = await token.setStakingContract(stakingAddress);
  await tx1.wait();
  console.log("  ArcticToken: staking contract set ✓");

  // Set NFT approval for staking
  const tx2 = await nft.setApprovalForAll(stakingAddress, true);
  console.log("  Note: Users must call setApprovalForAll(staking, true) before staking");

  // Set market approval for market  
  console.log("  Note: Sellers must call setApprovalForAll(market, true) before listing");

  console.log("\n========================================");
  console.log("DEPLOYMENT COMPLETE");
  console.log("========================================");
  console.log(`
Contract Addresses (ARC Testnet):
{
  "ArcticToken":   "${tokenAddress}",
  "ArcticBeasts":  "${nftAddress}",
  "ArcticStaking": "${stakingAddress}",
  "ArcticMarket":  "${marketAddress}"
}
`);

  // Save addresses to file for frontend
  const fs = require("fs");
  const addresses = {
    ArcticToken: tokenAddress,
    ArcticBeasts: nftAddress,
    ArcticStaking: stakingAddress,
    ArcticMarket: marketAddress,
    chainId: 5042002,
    network: "arcTestnet",
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
  };
  
  fs.writeFileSync(
    "../frontend/src/lib/contracts.json",
    JSON.stringify(addresses, null, 2)
  );
  console.log("Addresses saved to frontend/src/lib/contracts.json");

  // Also save ABI files for frontend
  const tokenArtifact = await readArtifact("ArcticToken");
  const nftArtifact = await readArtifact("ArcticBeasts");
  const stakingArtifact = await readArtifact("ArcticStaking");
  const marketArtifact = await readArtifact("ArcticMarket");

  fs.writeFileSync(
    "../frontend/src/lib/abis.json",
    JSON.stringify({
      ArcticToken: tokenArtifact.abi,
      ArcticBeasts: nftArtifact.abi,
      ArcticStaking: stakingArtifact.abi,
      ArcticMarket: marketArtifact.abi,
    }, null, 2)
  );
  console.log("ABIs saved to frontend/src/lib/abis.json");

  console.log("\nNext steps:");
  console.log("1. Update frontend/src/lib/contracts.json if needed");
  console.log("2. Upload NFT metadata to IPFS (Pinata)");
  console.log("3. Call ArcticBeasts.setBaseURI(ipfs://...)");
  console.log("4. Deploy frontend to Vercel/Netlify");
  console.log("========================================");
}

async function readArtifact(name) {
  const fs = require("fs");
  const path = `./artifacts/contracts/${name}.sol/${name}.json`;
  if (!fs.existsSync(path)) {
    throw new Error(`Artifact not found: ${path}. Run npx hardhat compile first.`);
  }
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
