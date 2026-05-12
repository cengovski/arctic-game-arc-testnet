// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IArcticToken {
    function mintRewards(address to, uint256 amount) external;
}

/**
 * @title ArcticStaking
 * @dev Stake Arctic Beasts NFTs to earn $ARCTIC tokens passively.
 */
contract ArcticStaking is Ownable, ReentrancyGuard {
    struct StakeInfo {
        uint256[] stakedTokens;
        uint256 lastClaimTime;
        uint256 totalStakingPower;
    }

    mapping(address => StakeInfo) public stakes;
    mapping(uint256 => address) public tokenOwner;
    mapping(uint256 => bool) public isStaked;

    IERC721 public nftContract;
    IArcticToken public tokenContract;

    uint256 public baseRewardPerHour = 1e18;
    uint256 public totalStaked;
    uint256 public totalStakingPower;

    event Staked(address indexed user, uint256[] tokenIds, uint256 totalPower);
    event Unstaked(address indexed user, uint256[] tokenIds, uint256 totalPower);
    event RewardsClaimed(address indexed user, uint256 amount);

    constructor(address _nft, address _token) Ownable() {
        require(_nft != address(0) && _token != address(0), "Zero address");
        nftContract = IERC721(_nft);
        tokenContract = IArcticToken(_token);
    }

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

            uint256 power = _getDefaultPower(tokenId);
            info.totalStakingPower += power;
            totalStakingPower += power;
            totalStaked++;
        }

        emit Staked(msg.sender, tokenIds, info.totalStakingPower);
    }

    function unstake(uint256[] calldata tokenIds) external nonReentrant {
        require(tokenIds.length > 0, "Empty array");

        StakeInfo storage info = stakes[msg.sender];
        require(info.stakedTokens.length > 0, "Nothing staked");

        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            require(isStaked[tokenId] && tokenOwner[tokenId] == msg.sender, "Not your staked");

            uint256[] storage arr = info.stakedTokens;
            for (uint256 j = 0; j < arr.length; j++) {
                if (arr[j] == tokenId) {
                    arr[j] = arr[arr.length - 1];
                    arr.pop();
                    break;
                }
            }

            uint256 power = _getDefaultPower(tokenId);
            info.totalStakingPower -= power;
            totalStakingPower -= power;
            totalStaked--;

            isStaked[tokenId] = false;
            tokenOwner[tokenId] = address(0);

            nftContract.transferFrom(address(this), msg.sender, tokenId);
        }

        emit Unstaked(msg.sender, tokenIds, info.totalStakingPower);
    }

    function claim() external nonReentrant {
        StakeInfo storage info = stakes[msg.sender];
        require(info.stakedTokens.length > 0, "Nothing staked");

        uint256 pending = _calculateRewards(msg.sender);
        require(pending > 0, "No rewards");

        info.lastClaimTime = block.timestamp;
        tokenContract.mintRewards(msg.sender, pending);

        emit RewardsClaimed(msg.sender, pending);
    }

    function pendingRewards(address user) external view returns (uint256) {
        return _calculateRewards(user);
    }

    function _calculateRewards(address user) internal view returns (uint256) {
        StakeInfo storage info = stakes[user];
        if (info.stakedTokens.length == 0 || info.totalStakingPower == 0) return 0;

        uint256 elapsed = block.timestamp - info.lastClaimTime;
        return (elapsed * info.totalStakingPower * baseRewardPerHour) / 3600;
    }

    function getStakedTokens(address user) external view returns (uint256[] memory) {
        return stakes[user].stakedTokens;
    }

    function setBaseReward(uint256 newRate) external onlyOwner {
        baseRewardPerHour = newRate;
    }

    function _getDefaultPower(uint256 tokenId) internal pure returns (uint256) {
        uint256 roll = (tokenId * 2654435761) % 100;
        if (roll < 5) return 20;
        if (roll < 20) return 8;
        if (roll < 50) return 3;
        return 1;
    }
}
