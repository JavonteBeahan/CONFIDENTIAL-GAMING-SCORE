// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title Blind Auction with FHE
 * @dev Sealed-bid auction using Fully Homomorphic Encryption
 * @notice Bidders can submit encrypted bids that remain confidential until reveal phase
 *
 * This example demonstrates:
 * - Confidential auction mechanism
 * - Encrypted bid storage
 * - Privacy-preserving bid comparison
 * - Sealed bid resolution
 *
 * chapter: auctions
 * concepts: encrypted-auction, confidential-bidding, fhe-comparisons
 */
contract BlindAuction is Ownable, ZamaEthereumConfig {
    /**
     * @dev Bid structure
     */
    struct Bid {
        euint32 encryptedAmount;
        address bidder;
        bool revealed;
        uint256 biddingTime;
    }

    /**
     * @dev Auction state
     */
    enum AuctionState {
        Bidding,    // Accepting bids
        Revealing,  // Bids can be revealed
        Ended       // Auction finished
    }

    // State variables
    address public auctioneer;
    uint256 public auctionEndTime;
    uint256 public revealEndTime;
    AuctionState public currentState = AuctionState.Bidding;

    // Bid tracking
    Bid[] public bids;
    mapping(address => uint256) public bidCount;
    mapping(address => bool) public hasBid;

    euint32 public highestEncryptedBid;
    address public highestBidder;

    // Events
    event BidSubmitted(address indexed bidder, uint256 bidIndex, uint256 time);
    event AuctionEnded(address indexed winner, uint256 timestamp);
    event StateChanged(AuctionState newState);

    /**
     * @dev Initialize auction
     * @param biddingDuration Duration of bidding phase in seconds
     * @param revealDuration Duration of reveal phase in seconds
     */
    constructor(uint256 biddingDuration, uint256 revealDuration) {
        auctioneer = msg.sender;
        auctionEndTime = block.timestamp + biddingDuration;
        revealEndTime = auctionEndTime + revealDuration;
        highestEncryptedBid = FHE.asEuint32(0);
    }

    /**
     * @dev Update auction state based on time
     */
    modifier updateState() {
        if (
            block.timestamp > auctionEndTime &&
            currentState == AuctionState.Bidding
        ) {
            currentState = AuctionState.Revealing;
            emit StateChanged(AuctionState.Revealing);
        }
        if (
            block.timestamp > revealEndTime &&
            currentState == AuctionState.Revealing
        ) {
            currentState = AuctionState.Ended;
            emit StateChanged(AuctionState.Ended);
        }
        _;
    }

    /**
     * @dev Submit encrypted bid
     * @param encryptedBid Encrypted bid amount
     * @param proof Zero-knowledge proof of correct encryption
     *
     * ✅ Example: Private bid submission
     * - Bid remains encrypted on-chain
     * - No one (including owner) can see bid amount
     * - Only bidder knows their own bid value
     */
    function submitBid(bytes calldata encryptedBid, bytes calldata proof)
        external
        updateState
    {
        require(currentState == AuctionState.Bidding, "Bidding phase ended");
        require(encryptedBid.length > 0, "Invalid bid");
        require(proof.length > 0, "Invalid proof");

        // Convert external encrypted input
        euint32 bid = FHE.fromExternal(encryptedBid, proof);

        // Store encrypted bid
        bids.push(
            Bid({
                encryptedAmount: bid,
                bidder: msg.sender,
                revealed: false,
                biddingTime: block.timestamp
            })
        );

        bidCount[msg.sender]++;
        hasBid[msg.sender] = true;

        // Grant permissions
        FHE.allowThis(bid);
        FHE.allow(bid, msg.sender);

        emit BidSubmitted(msg.sender, bids.length - 1, block.timestamp);
    }

    /**
     * @dev Check if a bid is higher than current highest (encrypted comparison)
     * @param bidIndex Index of bid to check
     * @return Encrypted boolean result
     *
     * ✅ Encrypted comparison example
     * - Compares encrypted bids
     * - Result remains encrypted
     * - No plaintext values exposed
     */
    function isBidHigher(uint256 bidIndex)
        external
        view
        returns (ebool)
    {
        require(bidIndex < bids.length, "Invalid bid index");

        return FHE.gt(bids[bidIndex].encryptedAmount, highestEncryptedBid);
    }

    /**
     * @dev Get total number of bids submitted
     * @return Count of bids (public information)
     */
    function getBidCount() external view returns (uint256) {
        return bids.length;
    }

    /**
     * @dev Check if address has submitted bid
     * @param bidder Address to check
     * @return True if bidder has submitted at least one bid
     */
    function hasSubmittedBid(address bidder) external view returns (bool) {
        return hasBid[bidder];
    }

    /**
     * @dev Get number of bids from address
     * @param bidder Address to query
     * @return Number of bids submitted by address
     */
    function getBidCountByAddress(address bidder)
        external
        view
        returns (uint256)
    {
        return bidCount[bidder];
    }

    /**
     * @dev Get encrypted bid (owner only)
     * @param bidIndex Index of bid
     * @return The encrypted bid amount
     */
    function getEncryptedBid(uint256 bidIndex)
        external
        view
        onlyOwner
        returns (euint32)
    {
        require(bidIndex < bids.length, "Invalid bid index");
        return bids[bidIndex].encryptedAmount;
    }

    /**
     * @dev Auction timeline information
     * @return biddingTime Time until bidding ends
     * @return revealTime Time until reveal ends
     * @return state Current auction state
     */
    function getAuctionTiming()
        external
        view
        returns (
            uint256 biddingTime,
            uint256 revealTime,
            AuctionState state
        )
    {
        return (
            auctionEndTime > block.timestamp ? auctionEndTime - block.timestamp : 0,
            revealEndTime > block.timestamp ? revealEndTime - block.timestamp : 0,
            currentState
        );
    }

    /**
     * @dev Get contract info
     * @return Description and version
     */
    function getInfo() external pure returns (string memory) {
        return "Blind Auction v1.0 - FHE-based sealed bid auction system";
    }
}
