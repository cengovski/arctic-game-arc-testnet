// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ArcticDEX
 * @dev Constant product AMM for USDC/ARCTIC pair on ARC Testnet.
 * - No fee on swaps (0.3% optional, default 0)
 * - Max market cap: 10,000 USDC worth of ARCTIC in pool
 * - Owner provides initial liquidity at ratio 1:1 (or any starting ratio)
 * - Price discovered by constant product formula x*y=k
 */
contract ArcticDEX is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    IERC20 public immutable arctic;

    uint256 public constant USDC_DECIMALS = 6;
    uint256 public constant ARCTIC_DECIMALS = 18;
    uint256 public constant MAX_USDC_POOL = 10_000 * 10**USDC_DECIMALS; // 10,000 USDC max
    uint256 public constant PRECISION = 1e18;

    uint256 public totalUsdcDeposited; // track total USDC ever deposited (cap)
    uint256 public swapFeeBP = 30; // 0.3% default, in basis points

    event LiquidityAdded(address indexed provider, uint256 usdcAmount, uint256 arcticAmount);
    event LiquidityRemoved(address indexed provider, uint256 usdcAmount, uint256 arcticAmount);
    event Swapped(address indexed trader, bool usdcToArctic, uint256 amountIn, uint256 amountOut);
    event FeeUpdated(uint256 newFeeBP);

    constructor(address _usdc, address _arctic) Ownable() {
        require(_usdc != address(0) && _arctic != address(0), "Zero address");
        usdc = IERC20(_usdc);
        arctic = IERC20(_arctic);
    }

    // ===== LIQUIDITY =====

    function addLiquidity(uint256 usdcAmount, uint256 arcticAmount) external nonReentrant {
        require(usdcAmount > 0 && arcticAmount > 0, "Zero amounts");
        require(totalUsdcDeposited + usdcAmount <= MAX_USDC_POOL, "Exceeds max USDC cap");

        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);
        arctic.safeTransferFrom(msg.sender, address(this), arcticAmount);

        totalUsdcDeposited += usdcAmount;
        emit LiquidityAdded(msg.sender, usdcAmount, arcticAmount);
    }

    function removeLiquidity(uint256 usdcAmount, uint256 arcticAmount) external onlyOwner nonReentrant {
        usdc.safeTransfer(msg.sender, usdcAmount);
        arctic.safeTransfer(msg.sender, arcticAmount);
        if (totalUsdcDeposited >= usdcAmount) totalUsdcDeposited -= usdcAmount;
        else totalUsdcDeposited = 0;
        emit LiquidityRemoved(msg.sender, usdcAmount, arcticAmount);
    }

    // ===== SWAPS =====

    /**
     * @dev Swap USDC → ARCTIC
     * @param usdcIn Amount of USDC to swap (6 decimals)
     * @param minArcticOut Minimum ARCTIC to receive (slippage protection)
     */
    function swapUsdcToArctic(uint256 usdcIn, uint256 minArcticOut) external nonReentrant {
        require(usdcIn > 0, "Zero input");

        uint256 usdcBal = usdc.balanceOf(address(this));
        uint256 arcticBal = arctic.balanceOf(address(this));
        require(usdcBal > 0 && arcticBal > 0, "No liquidity");

        uint256 fee = (usdcIn * swapFeeBP) / 10000;
        uint256 usdcInAfterFee = usdcIn - fee;

        // Constant product: (usdcBal + usdcInAfterFee) * (arcticBal - arcticOut) = usdcBal * arcticBal
        // arcticOut = (usdcInAfterFee * arcticBal) / (usdcBal + usdcInAfterFee)
        uint256 arcticOut = (usdcInAfterFee * arcticBal) / (usdcBal + usdcInAfterFee);
        require(arcticOut >= minArcticOut, "Slippage exceeded");
        require(arcticOut <= arcticBal, "Insufficient ARCTIC liquidity");

        usdc.safeTransferFrom(msg.sender, address(this), usdcIn);
        arctic.safeTransfer(msg.sender, arcticOut);

        emit Swapped(msg.sender, true, usdcIn, arcticOut);
    }

    /**
     * @dev Swap ARCTIC → USDC
     * @param arcticIn Amount of ARCTIC to swap (18 decimals)
     * @param minUsdcOut Minimum USDC to receive (slippage protection)
     */
    function swapArcticToUsdc(uint256 arcticIn, uint256 minUsdcOut) external nonReentrant {
        require(arcticIn > 0, "Zero input");

        uint256 usdcBal = usdc.balanceOf(address(this));
        uint256 arcticBal = arctic.balanceOf(address(this));
        require(usdcBal > 0 && arcticBal > 0, "No liquidity");

        uint256 fee = (arcticIn * swapFeeBP) / 10000;
        uint256 arcticInAfterFee = arcticIn - fee;

        // usdcOut = (arcticInAfterFee * usdcBal) / (arcticBal + arcticInAfterFee)
        uint256 usdcOut = (arcticInAfterFee * usdcBal) / (arcticBal + arcticInAfterFee);
        require(usdcOut >= minUsdcOut, "Slippage exceeded");
        require(usdcOut <= usdcBal, "Insufficient USDC liquidity");

        arctic.safeTransferFrom(msg.sender, address(this), arcticIn);
        usdc.safeTransfer(msg.sender, usdcOut);

        emit Swapped(msg.sender, false, arcticIn, usdcOut);
    }

    // ===== VIEW =====

    function getPoolInfo() external view returns (
        uint256 usdcBalance,
        uint256 arcticBalance,
        uint256 k
    ) {
        usdcBalance = usdc.balanceOf(address(this));
        arcticBalance = arctic.balanceOf(address(this));
        k = usdcBalance * arcticBalance;
    }

    /**
     * @dev Get expected output for USDC → ARCTIC swap
     */
    function getUsdcToArcticQuote(uint256 usdcIn) external view returns (uint256 arcticOut, uint256 pricePerUsdc) {
        uint256 usdcBal = usdc.balanceOf(address(this));
        uint256 arcticBal = arctic.balanceOf(address(this));
        if (usdcBal == 0 || arcticBal == 0 || usdcIn == 0) return (0, 0);

        uint256 fee = (usdcIn * swapFeeBP) / 10000;
        uint256 usdcInAfterFee = usdcIn - fee;
        arcticOut = (usdcInAfterFee * arcticBal) / (usdcBal + usdcInAfterFee);
        pricePerUsdc = (arcticOut * PRECISION) / usdcIn;
    }

    /**
     * @dev Get expected output for ARCTIC → USDC swap
     */
    function getArcticToUsdcQuote(uint256 arcticIn) external view returns (uint256 usdcOut, uint256 pricePerArctic) {
        uint256 usdcBal = usdc.balanceOf(address(this));
        uint256 arcticBal = arctic.balanceOf(address(this));
        if (usdcBal == 0 || arcticBal == 0 || arcticIn == 0) return (0, 0);

        uint256 fee = (arcticIn * swapFeeBP) / 10000;
        uint256 arcticInAfterFee = arcticIn - fee;
        usdcOut = (arcticInAfterFee * usdcBal) / (arcticBal + arcticInAfterFee);
        pricePerArctic = (usdcOut * PRECISION) / arcticIn;
    }

    function getUsdcToArcticPrice() external view returns (uint256 price) {
        uint256 usdcBal = usdc.balanceOf(address(this));
        uint256 arcticBal = arctic.balanceOf(address(this));
        if (usdcBal == 0) return 0;
        // Price of 1 USDC in ARCTIC (with 18 decimals)
        price = (arcticBal * PRECISION) / usdcBal;
    }

    function getArcticToUsdcPrice() external view returns (uint256 price) {
        uint256 usdcBal = usdc.balanceOf(address(this));
        uint256 arcticBal = arctic.balanceOf(address(this));
        if (arcticBal == 0) return 0;
        // Price of 1 ARCTIC in USDC (with 6 decimals)
        price = (usdcBal * 1e6) / arcticBal;
    }

    // ===== ADMIN =====

    function setSwapFee(uint256 newFeeBP) external onlyOwner {
        require(newFeeBP <= 1000, "Max 10%");
        swapFeeBP = newFeeBP;
        emit FeeUpdated(newFeeBP);
    }

    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
    }
}
