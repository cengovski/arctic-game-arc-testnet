// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ArcticStakingV2
 * @dev Stake Arctic Beasts NFTs to earn $ARCTIC tokens passively.
 * Rewards are transferred from the owner's balance (pre-minted reward pool).
 * No dependency on ArcticToken.mintRewards — works with any ERC20.
 */
contract ArcticStakingV2 is Ownable, ReentrancyGuard {
    struct StakeInfo {
        uint256[] stakedTokens;
        uint256 lastClaimTime;
        uint256 totalStakingPower;
    }

    mapping(address => StakeInfo) public stakes;
    mapping(uint256 => address) public tokenOwner;
    mapping(uint256 => bool) public isStaked;

    IERC721 public nftContract;
    IERC20 public rewardToken;

    uint256 public baseRewardPerHour = 1e18; // 1 token/hour per power unit
    uint256 public totalStaked;
    uint256 public totalStakingPower;

    // Rarity-based staking power (deterministic from tokenId)
    // Legendary: 20x (3%), Epic: 8x (12%), Rare: 3x (25%), Common: 1x (60%)

    event Staked(address indexed user, uint256[] tokenIds, uint256 totalPower);
    event Unstaked(address indexed user, uint256[] tokenIds, uint256 totalPower);
    event RewardsClaimed(address indexed user, uint256 amount);

    constructor(address _nft, address _rewardToken) Ownable() {
        require(_nft != address(0) && _rewardToken != address(0), "Zero address");
        nftContract = IERC721(_nft);
        rewardToken = IERC20(_rewardToken);
    }

    /**
     * @dev Stake NFTs. User must approve this contract first.
     */
    function stake(uint256[] calldata tokenIds) external nonReentrant {
        require(tokenIds.length > 0, "Empty array");
        require(tokenIds.length <= 20, "Too many tokens");

        StakeInfo storage info = stakes[msg.sender];
        if (info.lastClaimTime == 0) {
            info.lastClaimTime = block.timestamp;
        }

        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            require(nftContract.ownerOf(tokenId) == msg.sender, "Not owner");
            require(!isStaked[tokenId], "Already staked");

            nftContract.transferFrom(msg.sender, address(this), tokenId);
            info.stakedTokens.push(tokenId);
            tokenOwner[tokenId] = msg.sender;
            isStaked[tokenId] = true;

            uint256 power = _getPower(tokenId);
            info.totalStakingPower += power;
            totalStakingPower += power;
            totalStaked++;
        }

        emit Staked(msg.sender, tokenIds, info.totalStakingPower);
    }

    /**
     * @dev Unstake NFTs. Also claims pending rewards.
     */
    function unstake(uint256[] calldata tokenIds) external nonReentrant {
        require(tokenIds.length > 0, "Empty array");

        StakeInfo storage info = stakes[msg.sender];
        require(info.stakedTokens.length > 0, "Nothing staked");

        // First calculate and send rewards
        uint256 pending = _calculateRewards(msg.sender);
        if (pending > 0) {
            info.lastClaimTime = block.timestamp;
            rewardToken.transfer(msg.sender, pending);
            emit RewardsClaimed(msg.sender, pending);
        }

        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            require(isStaked[tokenId] && tokenOwner[tokenId] == msg.sender, "Not your staked");

            // Remove from array (swap with last)
            uint256[] storage arr = info.stakedTokens;
            for (uint256 j = 0; j < arr.length; j++) {
                if (arr[j] == tokenId) {
                    arr[j] = arr[arr.length - 1];
                    arr.pop();
                    break;
                }
            }

            uint256 power = _getPower(tokenId);
            info.totalStakingPower -= power;
            totalStakingPower -= power;
            totalStaked--;

            isStaked[tokenId] = false;
            tokenOwner[tokenId] = address(0);

            nftContract.transferFrom(address(this), msg.sender, tokenId);
        }

        emit Unstaked(msg.sender, tokenIds, info.totalStakingPower);
    }

    /**
     * @dev Claim pending rewards without unstaking.
     */
    function claim() external nonReentrant {
        StakeInfo storage info = stakes[msg.sender];
        require(info.stakedTokens.length > 0, "Nothing staked");

        uint256 pending = _calculateRewards(msg.sender);
        require(pending > 0, "No rewards");

        info.lastClaimTime = block.timestamp;
        rewardToken.transfer(msg.sender, pending);

        emit RewardsClaimed(msg.sender, pending);
    }

    /**
     * @dev View pending rewards for a user.
     */
    function pendingRewards(address user) external view returns (uint256) {
        return _calculateRewards(user);
    }

    /**
     * @dev Get staked tokens for a user.
     */
    function getStakedTokens(address user) external view returns (uint256[] memory) {
        return stakes[user].stakedTokens;
    }

    /**
     * @dev Get staking power for a token.
     */
    function getStakingPower(uint256 tokenId) external pure returns (uint256) {
        return _getPower(tokenId);
    }

    /**
     * @dev Get full stake info for a user.
     */
    function getStakeInfo(address user) external view returns (
        uint256[] memory tokenIds,
        uint256 lastClaimTime,
        uint256 stakingPower,
        uint256 pendingReward
    ) {
        StakeInfo storage info = stakes[user];
        tokenIds = info.stakedTokens;
        lastClaimTime = info.lastClaimTime;
        stakingPower = info.totalStakingPower;
        pendingReward = _calculateRewards(user);
    }

    /**
     * @dev Owner deposits reward tokens into the staking contract.
     */
    function depositRewards(uint256 amount) external onlyOwner {
        rewardToken.transferFrom(msg.sender, address(this), amount);
    }

    /**
     * @dev Owner can withdraw accidentally sent tokens.
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
    }

    function setBaseReward(uint256 newRate) external onlyOwner {
        baseRewardPerHour = newRate;
    }

    function _calculateRewards(address user) internal view returns (uint256) {
        StakeInfo storage info = stakes[user];
        if (info.stakedTokens.length == 0 || info.totalStakingPower == 0) return 0;

        uint256 elapsed = block.timestamp - info.lastClaimTime;
        return (elapsed * info.totalStakingPower * baseRewardPerHour) / 3600;
    }

    function _getPower(uint256 tokenId) internal pure returns (uint256) {
        uint256 roll = (tokenId * 2654435761) % 100;
        if (roll < 3) return 20;   // Legendary 3%
        if (roll < 15) return 8;   // Epic 12%
        if (roll < 40) return 3;   // Rare 25%
        return 1;                   // Common 60%
    }
}
