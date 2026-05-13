// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ArcticMarket
 * @dev Simple P2P NFT marketplace for Arctic Beasts on ARC Testnet.
 * Listings stored with sequential IDs. Active listing enumeration supported.
 */
contract ArcticMarket is Ownable {
    struct Listing {
        address seller;
        uint256 tokenId;
        uint256 price;
        bool active;
    }

    IERC721 public nftContract;
    IERC20 public paymentToken; // USDC

    mapping(uint256 => Listing) public listings;
    uint256 public listingCount;
    uint256 public feeBasisPoints = 0; // 0% fee
    mapping(uint256 => bool) public isListed;

    // Enumerate active listings
    uint256[] private activeIds;
    mapping(uint256 => uint256) private activeIdIndex; // listingId => index in activeIds

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
        paymentToken = IERC20(_token);
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

        // Add to active list
        activeIdIndex[listingId] = activeIds.length;
        activeIds.push(listingId);

        nftContract.transferFrom(msg.sender, address(this), tokenId);

        emit Listed(listingId, msg.sender, tokenId, price);
    }

    function buy(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        require(listing.active, "Not active");
        require(msg.sender != listing.seller, "Cannot buy own");

        listing.active = false;
        isListed[listing.tokenId] = false;
        _removeActive(listingId);

        uint256 fee = (listing.price * feeBasisPoints) / 10000;
        uint256 sellerProceeds = listing.price - fee;

        require(
            paymentToken.transferFrom(msg.sender, listing.seller, sellerProceeds),
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
        _removeActive(listingId);

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

    // ===== VIEW =====

    function getActiveListingIds() external view returns (uint256[] memory) {
        return activeIds;
    }

    function getActiveListingCount() external view returns (uint256) {
        return activeIds.length;
    }

    function getListing(uint256 listingId) external view returns (
        address seller,
        uint256 tokenId,
        uint256 price,
        bool active
    ) {
        Listing storage l = listings[listingId];
        return (l.seller, l.tokenId, l.price, l.active);
    }

    function getActiveListings(uint256 offset, uint256 limit) external view returns (
        uint256[] memory ids,
        address[] memory sellers,
        uint256[] memory tokenIds,
        uint256[] memory prices
    ) {
        uint256 total = activeIds.length;
        if (offset >= total) return (new uint256[](0), new address[](0), new uint256[](0), new uint256[](0));
        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 count = end - offset;

        ids = new uint256[](count);
        sellers = new address[](count);
        tokenIds = new uint256[](count);
        prices = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            uint256 lid = activeIds[offset + i];
            Listing storage l = listings[lid];
            ids[i] = lid;
            sellers[i] = l.seller;
            tokenIds[i] = l.tokenId;
            prices[i] = l.price;
        }
    }

    // ===== INTERNAL =====

    function _removeActive(uint256 listingId) internal {
        uint256 idx = activeIdIndex[listingId];
        uint256 lastIdx = activeIds.length - 1;
        if (idx != lastIdx) {
            uint256 lastId = activeIds[lastIdx];
            activeIds[idx] = lastId;
            activeIdIndex[lastId] = idx;
        }
        activeIds.pop();
        delete activeIdIndex[listingId];
    }
}
