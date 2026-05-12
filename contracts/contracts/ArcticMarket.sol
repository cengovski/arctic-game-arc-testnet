// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ArcticMarket
 * @dev Simple P2P NFT marketplace for Arctic Beasts on ARC Testnet.
 */
contract ArcticMarket is Ownable {
    struct Listing {
        address seller;
        uint256 tokenId;
        uint256 price;
        bool active;
    }

    IERC721 public nftContract;
    IERC20 public tokenContract;

    mapping(uint256 => Listing) public listings;
    uint256 public listingCount;
    uint256 public feeBasisPoints = 0;
    mapping(uint256 => bool) public isListed;

    event Listed(uint256 indexed listingId, address indexed seller, uint256 tokenId, uint256 price);
    event Sold(uint256 indexed listingId, address indexed buyer, uint256 price);
    event Cancelled(uint256 indexed listingId);
    event PriceUpdated(uint256 indexed listingId, uint256 newPrice);

    modifier onlySeller(uint256 listingId) {
        require(listings[listingId].seller == msg.sender, "Not seller");
        _;
    }

    constructor(address _nft, address _token) Ownable() {
        require(_nft != address(0) && _token != address(0), "Zero address");
        nftContract = IERC721(_nft);
        tokenContract = IERC20(_token);
    }

    function list(uint256 tokenId, uint256 price) external {
        require(nftContract.ownerOf(tokenId) == msg.sender, "Not owner");
        require(price > 0, "Price must be > 0");
        require(!isListed[tokenId], "Already listed");

        uint256 listingId = listingCount++;
        listings[listingId] = Listing({
            seller: msg.sender,
            tokenId: tokenId,
            price: price,
            active: true
        });
        isListed[tokenId] = true;

        nftContract.transferFrom(msg.sender, address(this), tokenId);

        emit Listed(listingId, msg.sender, tokenId, price);
    }

    function buy(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        require(listing.active, "Not active");
        require(msg.sender != listing.seller, "Cannot buy own");

        listing.active = false;
        isListed[listing.tokenId] = false;

        uint256 fee = (listing.price * feeBasisPoints) / 10000;
        uint256 sellerProceeds = listing.price - fee;

        require(
            tokenContract.transferFrom(msg.sender, listing.seller, sellerProceeds),
            "Transfer to seller failed"
        );

        nftContract.transferFrom(address(this), msg.sender, listing.tokenId);

        emit Sold(listingId, msg.sender, listing.price);
    }

    function cancel(uint256 listingId) external onlySeller(listingId) {
        Listing storage listing = listings[listingId];
        require(listing.active, "Not active");

        listing.active = false;
        isListed[listing.tokenId] = false;

        nftContract.transferFrom(address(this), msg.sender, listing.tokenId);

        emit Cancelled(listingId);
    }

    function updatePrice(uint256 listingId, uint256 newPrice) external onlySeller(listingId) {
        require(listings[listingId].active, "Not active");
        require(newPrice > 0, "Price must be > 0");

        listings[listingId].price = newPrice;
        emit PriceUpdated(listingId, newPrice);
    }

    function setFee(uint256 newFeeBP) external onlyOwner {
        require(newFeeBP <= 1000, "Max 10%");
        feeBasisPoints = newFeeBP;
    }
}
