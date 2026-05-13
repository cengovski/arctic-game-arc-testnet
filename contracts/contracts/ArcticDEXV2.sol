// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ArcticDEX V2
 * @dev Constant product AMM (x*y=k) with LP tokens.
 * Anyone can add/remove liquidity. 0.3% swap fee.
 * Supports USDC/ARCTIC pair on ARC Testnet.
 */
contract ArcticDEXV2 is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    IERC20 public immutable arctic;

    uint256 public constant FEE_BP = 30; // 0.3%
    uint256 public constant BP_DENOMINATOR = 10000;

    // LP token balances (simple shares tracking)
    mapping(address => uint256) public lpBalances;
    uint256 public totalLPSupply;

    // Cumulative fee tracking
    uint256 public accumulatedFeesUSDC;
    uint256 public accumulatedFeesARCTIC;

    event LiquidityAdded(address indexed provider, uint256 usdcIn, uint256 arcticIn, uint256 lpMinted);
    event LiquidityRemoved(address indexed provider, uint256 usdcOut, uint256 arcticOut, uint256 lpBurned);
    event Swapped(address indexed trader, bool usdcToArctic, uint256 amountIn, uint256 amountOut);
    event FeesCollected(uint256 usdcFees, uint256 arcticFees);

    constructor(address _usdc, address _arctic) Ownable() {
        require(_usdc != address(0) && _arctic != address(0), "Zero address");
        usdc = IERC20(_usdc);
        arctic = IERC20(_arctic);
    }

    // ===== VIEW FUNCTIONS =====

    function getUSDCReserve() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    function getARCTICReserve() external view returns (uint256) {
        return arctic.balanceOf(address(this));
    }

    function getPoolInfo() external view returns (
        uint256 usdcBal,
        uint256 arcticBal,
        uint256 k,
        uint256 lpSupply
    ) {
        usdcBal = usdc.balanceOf(address(this));
        arcticBal = arctic.balanceOf(address(this));
        k = usdcBal * arcticBal;
        lpSupply = totalLPSupply;
    }

    /**
     * @dev Get output amount for a swap
     * @param amountIn Input amount (with decimals of input token)
     * @param usdcToArctic true = USDC→ARCTIC, false = ARCTIC→USDC
     */
    function getOutputAmount(uint256 amountIn, bool usdcToArctic) external view returns (uint256 amountOut) {
        if (amountIn == 0) return 0;
        uint256 usdcBal = usdc.balanceOf(address(this));
        uint256 arcticBal = arctic.balanceOf(address(this));
        if (usdcBal == 0 || arcticBal == 0) return 0;

        uint256 fee = (amountIn * FEE_BP) / BP_DENOMINATOR;
        uint256 amountInAfterFee = amountIn - fee;

        if (usdcToArctic) {
            // USDC in, ARCTIC out
            amountOut = (amountInAfterFee * arcticBal) / (usdcBal + amountInAfterFee);
            if (amountOut > arcticBal) amountOut = 0;
        } else {
            // ARCTIC in, USDC out
            amountOut = (amountInAfterFee * usdcBal) / (arcticBal + amountInAfterFee);
            if (amountOut > usdcBal) amountOut = 0;
        }
    }

    /**
     * @dev Get LP tokens minted for initial liquidity
     */
    function getInitialLPAmount(uint256 usdcAmount, uint256 arcticAmount) external pure returns (uint256 lpAmount) {
        // For first liquidity: LP = sqrt(usdc * arctic)
        lpAmount = _sqrt(usdcAmount * arcticAmount);
    }

    /**
     * @dev Get LP tokens minted for subsequent liquidity
     */
    function getLPAmount(
        uint256 usdcAmount,
        uint256 arcticAmount
    ) external view returns (uint256 lpAmount) {
        if (totalLPSupply == 0) {
            lpAmount = _sqrt(usdcAmount * arcticAmount);
        } else {
            uint256 usdcBal = usdc.balanceOf(address(this));
            uint256 arcticBal = arctic.balanceOf(address(this));
            if (usdcBal == 0 || arcticBal == 0) return 0;
            // LP = min(usdcAmount/usdcBal, arcticAmount/arcticBal) * totalLPSupply
            uint256 lp1 = (usdcAmount * totalLPSupply) / usdcBal;
            uint256 lp2 = (arcticAmount * totalLPSupply) / arcticBal;
            lpAmount = lp1 < lp2 ? lp1 : lp2;
        }
    }

    /**
     * @dev Get amounts received when removing LP tokens
     */
    function getRemoveAmount(uint256 lpAmount) external view returns (uint256 usdcOut, uint256 arcticOut) {
        if (totalLPSupply == 0 || lpAmount == 0) return (0, 0);
        uint256 usdcBal = usdc.balanceOf(address(this));
        uint256 arcticBal = arctic.balanceOf(address(this));
        usdcOut = (lpAmount * usdcBal) / totalLPSupply;
        arcticOut = (lpAmount * arcticBal) / totalLPSupply;
    }

    // ===== LIQUIDITY =====

    /**
     * @dev Add liquidity to the pool. Returns LP tokens minted.
     */
    function addLiquidity(uint256 usdcAmount, uint256 arcticAmount) external nonReentrant returns (uint256 lpMinted) {
        require(usdcAmount > 0 && arcticAmount > 0, "Zero amounts");

        uint256 usdcBal = usdc.balanceOf(address(this));
        uint256 arcticBal = arctic.balanceOf(address(this));

        if (totalLPSupply == 0) {
            // First liquidity provider sets the ratio
            lpMinted = _sqrt(usdcAmount * arcticAmount);
            require(lpMinted > 0, "Insufficient initial liquidity");
        } else {
            // Maintain current ratio
            // usdcAmount / arcticAmount should ≈ usdcBal / arcticBal
            uint256 lp1 = (usdcAmount * totalLPSupply) / usdcBal;
            uint256 lp2 = (arcticAmount * totalLPSupply) / arcticBal;
            lpMinted = lp1 < lp2 ? lp1 : lp2;
            require(lpMinted > 0, "Insufficient liquidity");
        }

        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);
        arctic.safeTransferFrom(msg.sender, address(this), arcticAmount);

        lpBalances[msg.sender] += lpMinted;
        totalLPSupply += lpMinted;

        emit LiquidityAdded(msg.sender, usdcAmount, arcticAmount, lpMinted);
    }

    /**
     * @dev Remove liquidity from the pool. Burns LP tokens.
     */
    function removeLiquidity(uint256 lpAmount) external nonReentrant returns (uint256 usdcOut, uint256 arcticOut) {
        require(lpAmount > 0, "Zero LP");
        require(lpBalances[msg.sender] >= lpAmount, "Insufficient LP balance");

        uint256 usdcBal = usdc.balanceOf(address(this));
        uint256 arcticBal = arctic.balanceOf(address(this));

        usdcOut = (lpAmount * usdcBal) / totalLPSupply;
        arcticOut = (lpAmount * arcticBal) / totalLPSupply;
        require(usdcOut > 0 && arcticOut > 0, "Insufficient pool balance");

        lpBalances[msg.sender] -= lpAmount;
        totalLPSupply -= lpAmount;

        usdc.safeTransfer(msg.sender, usdcOut);
        arctic.safeTransfer(msg.sender, arcticOut);

        emit LiquidityRemoved(msg.sender, usdcOut, arcticOut, lpAmount);
    }

    // ===== SWAPS =====

    /**
     * @dev Swap USDC → ARCTIC
     */
    function swapUSDCToARCTIC(uint256 usdcIn, uint256 minArcticOut) external nonReentrant {
        require(usdcIn > 0, "Zero input");
        uint256 usdcBal = usdc.balanceOf(address(this));
        uint256 arcticBal = arctic.balanceOf(address(this));
        require(usdcBal > 0 && arcticBal > 0, "No liquidity");

        uint256 fee = (usdcIn * FEE_BP) / BP_DENOMINATOR;
        uint256 usdcInAfterFee = usdcIn - fee;

        uint256 arcticOut = (usdcInAfterFee * arcticBal) / (usdcBal + usdcInAfterFee);
        require(arcticOut >= minArcticOut, "Slippage exceeded");
        require(arcticOut <= arcticBal, "Insufficient ARCTIC liquidity");

        accumulatedFeesUSDC += fee;
        usdc.safeTransferFrom(msg.sender, address(this), usdcIn);
        arctic.safeTransfer(msg.sender, arcticOut);

        emit Swapped(msg.sender, true, usdcIn, arcticOut);
    }

    /**
     * @dev Swap ARCTIC → USDC
     */
    function swapARCTICToUSDC(uint256 arcticIn, uint256 minUsdcOut) external nonReentrant {
        require(arcticIn > 0, "Zero input");
        uint256 usdcBal = usdc.balanceOf(address(this));
        uint256 arcticBal = arctic.balanceOf(address(this));
        require(usdcBal > 0 && arcticBal > 0, "No liquidity");

        uint256 fee = (arcticIn * FEE_BP) / BP_DENOMINATOR;
        uint256 arcticInAfterFee = arcticIn - fee;

        uint256 usdcOut = (arcticInAfterFee * usdcBal) / (arcticBal + arcticInAfterFee);
        require(usdcOut >= minUsdcOut, "Slippage exceeded");
        require(usdcOut <= usdcBal, "Insufficient USDC liquidity");

        accumulatedFeesARCTIC += fee;
        arctic.safeTransferFrom(msg.sender, address(this), arcticIn);
        usdc.safeTransfer(msg.sender, usdcOut);

        emit Swapped(msg.sender, false, arcticIn, usdcOut);
    }

    // ===== ADMIN =====

    function collectFees() external onlyOwner {
        uint256 usdcFees = accumulatedFeesUSDC;
        uint256 arcticFees = accumulatedFeesARCTIC;
        accumulatedFeesUSDC = 0;
        accumulatedFeesARCTIC = 0;
        if (usdcFees > 0) usdc.safeTransfer(msg.sender, usdcFees);
        if (arcticFees > 0) arctic.safeTransfer(msg.sender, arcticFees);
        emit FeesCollected(usdcFees, arcticFees);
    }

    // ===== INTERNAL =====

    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}
