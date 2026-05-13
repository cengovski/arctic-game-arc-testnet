const { ethers } = require("hardhat");

async function main() {
  const USDC = '0x3600000000000000000000000000000000000000';
  const ARCTIC_TOKEN = '0xe0Bb97b4A6fF64f2873a377E5eFE01Ab393029Cf';
  const DEX = '0x6536BA62CF325F3ca98ab31Fd6029E13Bb83E837';

  const [signer] = await ethers.getSigners();

  const usdcC = await ethers.getContractAt('IERC20', USDC);
  const arcticC = await ethers.getContractAt('IERC20', ARCTIC_TOKEN);

  const usdcBal = await usdcC.balanceOf(signer.address);
  const arcticBal = await arcticC.balanceOf(signer.address);
  console.log('USDC balance:', ethers.formatUnits(usdcBal, 6));
  console.log('ARCTIC balance:', ethers.formatUnits(arcticBal, 18));

  // Add liquidity: 10 USDC + 1000 ARCTIC (1 USDC = 100 ARCTIC starting price)
  const usdcAmount = ethers.parseUnits('10', 6);
  const arcticAmount = ethers.parseUnits('1000', 18);

  const tx1 = await usdcC.approve(DEX, usdcAmount);
  await tx1.wait();
  const tx2 = await arcticC.approve(DEX, arcticAmount);
  await tx2.wait();
  console.log('Approved');

  const dexC = await ethers.getContractAt('ArcticDEX', DEX);
  const tx3 = await dexC.addLiquidity(usdcAmount, arcticAmount);
  await tx3.wait();
  console.log('Liquidity added: 10 USDC + 1000 ARCTIC');

  const info = await dexC.getPoolInfo();
  console.log('Pool USDC:', ethers.formatUnits(info.usdcBalance, 6));
  console.log('Pool ARCTIC:', ethers.formatUnits(info.arcticBalance, 18));

  // Test quote
  const quote = await dexC.getUsdcToArcticQuote(ethers.parseUnits('1', 6));
  console.log('1 USDC =', ethers.formatUnits(quote.arcticOut, 18), 'ARCTIC');
}

main().catch(e => console.error(e.message));
