// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ArcticToken is ERC20, Ownable {
    address public stakingContract;

    event StakingContractUpdated(address indexed staking);

    constructor() ERC20("Arctic", "ARCTIC") Ownable() {
        _mint(msg.sender, 1_000_000_000 * 10 ** decimals());
    }

    function setStakingContract(address _staking) external onlyOwner {
        require(_staking != address(0), "Zero address");
        stakingContract = _staking;
        emit StakingContractUpdated(_staking);
    }

    function mintRewards(address to, uint256 amount) external {
        require(msg.sender == stakingContract, "Only staking");
        require(to != address(0), "Zero address");
        _mint(to, amount);
    }
}
