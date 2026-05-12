// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title ArcticBeasts
 * @dev ERC-721 NFT collection for Arctic game on ARC Testnet.
 * Free mint, max 10,000 supply. Each token has a rarity tier.
 */
contract ArcticBeasts is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable {
    using Strings for uint256;

    uint256 public constant MAX_SUPPLY = 10000;
    uint256 public constant MAX_PER_TX = 10;

    string private _baseTokenURI;

    // Rarity tiers: 1=Common, 2=Rare, 3=Epic, 4=Legendary
    mapping(uint256 => uint8) public tokenRarity;
    mapping(uint256 => uint256) public tokenStakingPower;

    string[4] private rarityNames = ["Common", "Rare", "Epic", "Legendary"];
    uint256[4] private rarityPowers = [1, 3, 8, 20];

    event BeastMinted(address indexed to, uint256 indexed tokenId, uint8 rarity);
    event BaseURIUpdated(string newURI);

    constructor() ERC721("Arctic Beasts", "ARCTICBEAST") Ownable() {}

    function mint(uint256 quantity) external {
        require(quantity > 0 && quantity <= MAX_PER_TX, "Invalid quantity");
        require(totalSupply() + quantity <= MAX_SUPPLY, "Exceeds max supply");

        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = totalSupply() + 1;
            _safeMint(msg.sender, tokenId);

            uint8 rarity = _determineRarity(tokenId);
            tokenRarity[tokenId] = rarity;
            tokenStakingPower[tokenId] = rarityPowers[rarity - 1];

            emit BeastMinted(msg.sender, tokenId, rarity);
        }
    }

    function freeMint(address to, uint256 quantity) external onlyOwner {
        require(to != address(0), "Zero address");
        require(totalSupply() + quantity <= MAX_SUPPLY, "Exceeds max supply");

        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = totalSupply() + 1;
            _safeMint(to, tokenId);

            uint8 rarity = _determineRarity(tokenId);
            tokenRarity[tokenId] = rarity;
            tokenStakingPower[tokenId] = rarityPowers[rarity - 1];

            emit BeastMinted(to, tokenId, rarity);
        }
    }

    function _determineRarity(uint256 tokenId) internal pure returns (uint8) {
        uint256 roll = (tokenId * 2654435761) % 100;
        if (roll < 5) return 4;       // Legendary: 5%
        if (roll < 20) return 3;      // Epic: 15%
        if (roll < 50) return 2;      // Rare: 30%
        return 1;                      // Common: 50%
    }

    function getRarityName(uint256 tokenId) external view returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        return rarityNames[tokenRarity[tokenId] - 1];
    }

    function getStakingPower(uint256 tokenId) external view returns (uint256) {
        require(_exists(tokenId), "Token does not exist");
        return tokenStakingPower[tokenId];
    }

    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
        emit BaseURIUpdated(baseURI);
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    // Required overrides for ERC721 + ERC721Enumerable + ERC721URIStorage (OZ v4)
    function _beforeTokenTransfer(address from, address to, uint256 firstTokenId, uint256 batchSize)
        internal override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public view override(ERC721, ERC721URIStorage) returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721Enumerable, ERC721URIStorage) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
