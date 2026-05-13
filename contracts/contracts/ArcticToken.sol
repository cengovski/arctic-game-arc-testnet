// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ArcticToken is ERC20, Ownable {
    address public stakingContract;
    address public dexContract;

    event StakingContractUpdated(address indexed staking);
    event DexContractUpdated(address indexed dex);

    constructor() ERC20("Arctic", "ARCTIC") Ownable() {
        // Mint 1B to owner — owner will distribute to staking rewards and DEX liquidity
        _mint(msg.sender, 1_000_000_000 * 10 ** decimals());
    }

    function setStakingContract(address _staking) external onlyOwner {
        require(_staking != address(0), "Zero address");
        stakingContract = _staking;
        emit StakingContractUpdated(_staking);
    }

    function setDexContract(address _dex) external onlyOwner {
        require(_dex != address(0), "Zero address");
        dexContract = _dex;
        emit DexContractUpdated(_dex);
    }

    function mintRewards(address to, uint256 amount) external {
        require(msg.sender == stakingContract || msg.sender == dexContract, "Not authorized");
        require(to != address(0), "Zero address");
        _mint(to, amount);
    }
}
