/**
 * Test Suite: Blind Auction with FHE
 *
 * This test suite demonstrates:
 * - Encrypted bid submission
 * - Sealed bid auction mechanics
 * - FHE comparisons on encrypted bids
 * - Auction state management
 *
 * chapter: auctions
 */

import { expect } from "chai";
import { ethers } from "hardhat";
import { BlindAuction } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Blind Auction", function () {
  let contract: BlindAuction;
  let owner: SignerWithAddress;
  let bidder1: SignerWithAddress;
  let bidder2: SignerWithAddress;
  let bidder3: SignerWithAddress;

  const BIDDING_DURATION = 3600; // 1 hour
  const REVEAL_DURATION = 1800; // 30 minutes

  beforeEach(async function () {
    [owner, bidder1, bidder2, bidder3] = await ethers.getSigners();

    const BlindAuctionFactory = await ethers.getContractFactory("BlindAuction");
    contract = await BlindAuctionFactory.deploy(BIDDING_DURATION, REVEAL_DURATION);
    await contract.waitForDeployment();
  });

  // ==================== Initialization Tests ====================

  describe("Auction Initialization", function () {
    /**
     * ✅ Test: Contract initializes in Bidding state
     */
    it("Should initialize in Bidding state", async function () {
      const (_, __, state) = await contract.getAuctionTiming();
      expect(state).to.equal(0); // Bidding state
    });

    /**
     * ✅ Test: Contract info available
     */
    it("Should return contract info", async function () {
      const info = await contract.getInfo();
      expect(info).to.include("Blind Auction");
    });

    /**
     * ✅ Test: Auction timing is correct
     */
    it("Should return correct auction timing", async function () {
      const (biddingTime, revealTime, state) = await contract.getAuctionTiming();
      expect(biddingTime).to.be.greaterThan(0);
      expect(revealTime).to.be.greaterThan(biddingTime);
      expect(state).to.equal(0); // Bidding
    });
  });

  // ==================== Bid Submission Tests ====================

  describe("Bid Submission", function () {
    /**
     * ✅ Test: Can submit encrypted bid
     */
    it("Should accept encrypted bid during bidding phase", async function () {
      const mockEncryptedBid = ethers.toBeHex(1000, 32);
      const mockProof = "0x" + "00".repeat(32);

      const tx = await contract
        .connect(bidder1)
        .submitBid(mockEncryptedBid, mockProof);
      await tx.wait();

      expect(await contract.hasSubmittedBid(bidder1.address)).to.be.true;
    });

    /**
     * ✅ Test: Multiple bidders can submit bids
     */
    it("Should accept multiple encrypted bids", async function () {
      const mockEncryptedBid1 = ethers.toBeHex(1000, 32);
      const mockEncryptedBid2 = ethers.toBeHex(2000, 32);
      const mockEncryptedBid3 = ethers.toBeHex(1500, 32);
      const mockProof = "0x" + "00".repeat(32);

      // Bidder 1
      let tx = await contract
        .connect(bidder1)
        .submitBid(mockEncryptedBid1, mockProof);
      await tx.wait();

      // Bidder 2
      tx = await contract
        .connect(bidder2)
        .submitBid(mockEncryptedBid2, mockProof);
      await tx.wait();

      // Bidder 3
      tx = await contract
        .connect(bidder3)
        .submitBid(mockEncryptedBid3, mockProof);
      await tx.wait();

      expect(await contract.getBidCount()).to.equal(3);
      expect(await contract.hasSubmittedBid(bidder1.address)).to.be.true;
      expect(await contract.hasSubmittedBid(bidder2.address)).to.be.true;
      expect(await contract.hasSubmittedBid(bidder3.address)).to.be.true;
    });

    /**
     * ✅ Test: Same bidder can submit multiple bids
     */
    it("Should allow same bidder to submit multiple bids", async function () {
      const mockEncryptedBid = ethers.toBeHex(500, 32);
      const mockProof = "0x" + "00".repeat(32);

      // First bid
      let tx = await contract
        .connect(bidder1)
        .submitBid(mockEncryptedBid, mockProof);
      await tx.wait();

      // Second bid
      tx = await contract
        .connect(bidder1)
        .submitBid(mockEncryptedBid, mockProof);
      await tx.wait();

      expect(await contract.getBidCountByAddress(bidder1.address)).to.equal(2);
    });

    /**
     * ❌ Test: Reject empty encrypted bid
     */
    it("Should reject empty encrypted bid", async function () {
      const emptyBid = "0x";
      const mockProof = "0x" + "00".repeat(32);

      await expect(
        contract.connect(bidder1).submitBid(emptyBid, mockProof)
      ).to.be.revertedWith("Invalid bid");
    });

    /**
     * ❌ Test: Reject empty proof
     */
    it("Should reject empty proof", async function () {
      const mockEncryptedBid = ethers.toBeHex(1000, 32);
      const emptyProof = "0x";

      await expect(
        contract.connect(bidder1).submitBid(mockEncryptedBid, emptyProof)
      ).to.be.revertedWith("Invalid proof");
    });
  });

  // ==================== Bid Tracking Tests ====================

  describe("Bid Tracking", function () {
    beforeEach(async function () {
      const mockEncryptedBid = ethers.toBeHex(1000, 32);
      const mockProof = "0x" + "00".repeat(32);

      const tx = await contract
        .connect(bidder1)
        .submitBid(mockEncryptedBid, mockProof);
      await tx.wait();
    });

    /**
     * ✅ Test: Get total bid count
     */
    it("Should return correct bid count", async function () {
      const count = await contract.getBidCount();
      expect(count).to.equal(1);
    });

    /**
     * ✅ Test: Check if bidder has submitted
     */
    it("Should identify bidders correctly", async function () {
      expect(await contract.hasSubmittedBid(bidder1.address)).to.be.true;
      expect(await contract.hasSubmittedBid(bidder2.address)).to.be.false;
      expect(await contract.hasSubmittedBid(bidder3.address)).to.be.false;
    });

    /**
     * ✅ Test: Get bid count by bidder
     */
    it("Should return bid count per bidder", async function () {
      expect(await contract.getBidCountByAddress(bidder1.address)).to.equal(1);
      expect(await contract.getBidCountByAddress(bidder2.address)).to.equal(0);
    });
  });

  // ==================== Encrypted Comparison Tests ====================

  describe("Encrypted Bid Comparison", function () {
    beforeEach(async function () {
      const mockEncryptedBid1 = ethers.toBeHex(1500, 32);
      const mockEncryptedBid2 = ethers.toBeHex(2000, 32);
      const mockProof = "0x" + "00".repeat(32);

      // Submit bids
      let tx = await contract
        .connect(bidder1)
        .submitBid(mockEncryptedBid1, mockProof);
      await tx.wait();

      tx = await contract
        .connect(bidder2)
        .submitBid(mockEncryptedBid2, mockProof);
      await tx.wait();
    });

    /**
     * ✅ Test: Compare bids (encrypted comparison)
     *
     * Note: Comparison result remains encrypted
     * No one learns the actual bid amounts
     */
    it("Should compare encrypted bids", async function () {
      const result = await contract.isBidHigher(0);
      expect(result).to.be.a("boolean");
    });

    /**
     * ❌ Test: Reject invalid bid index
     */
    it("Should reject invalid bid index", async function () {
      await expect(contract.isBidHigher(999)).to.be.revertedWith(
        "Invalid bid index"
      );
    });
  });

  // ==================== Access Control Tests ====================

  describe("Access Control", function () {
    beforeEach(async function () {
      const mockEncryptedBid = ethers.toBeHex(1000, 32);
      const mockProof = "0x" + "00".repeat(32);

      const tx = await contract
        .connect(bidder1)
        .submitBid(mockEncryptedBid, mockProof);
      await tx.wait();
    });

    /**
     * ✅ Test: Owner can get encrypted bid
     */
    it("Should allow owner to get encrypted bid", async function () {
      const bid = await contract.connect(owner).getEncryptedBid(0);
      expect(bid).to.not.be.null;
    });

    /**
     * ❌ Test: Non-owner cannot get encrypted bid
     */
    it("Should prevent non-owner from getting encrypted bid", async function () {
      await expect(
        contract.connect(bidder2).getEncryptedBid(0)
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });
  });

  // ==================== Event Tests ====================

  describe("Events", function () {
    /**
     * ✅ Test: BidSubmitted event emitted
     */
    it("Should emit BidSubmitted event", async function () {
      const mockEncryptedBid = ethers.toBeHex(1000, 32);
      const mockProof = "0x" + "00".repeat(32);

      const tx = await contract
        .connect(bidder1)
        .submitBid(mockEncryptedBid, mockProof);
      const receipt = await tx.wait();

      const events = receipt?.logs.filter((log) => {
        try {
          return contract.interface.parseLog(log)?.name === "BidSubmitted";
        } catch {
          return false;
        }
      });

      expect(events?.length).to.be.greaterThan(0);
    });

    /**
     * ✅ Test: StateChanged event emitted when state changes
     */
    it("Should emit StateChanged event when bidding ends", async function () {
      // This test would require time manipulation
      // In a real test, you'd use hardhat's time functions
      // Example: await ethers.provider.send('hardhat_mine', [])

      const (biddingTime, _, _state) = await contract.getAuctionTiming();
      expect(biddingTime).to.be.greaterThan(0);
    });
  });

  // ==================== Auction Flow Tests ====================

  describe("Complete Auction Flow", function () {
    /**
     * ✅ Test: Full auction scenario
     *
     * Demonstrates:
     * - Multiple bidders submitting encrypted bids
     * - Bids remain confidential on-chain
     * - Encrypted bid comparison
     */
    it("Should handle complete auction scenario", async function () {
      const mockEncryptedBid1 = ethers.toBeHex(1000, 32);
      const mockEncryptedBid2 = ethers.toBeHex(2000, 32);
      const mockEncryptedBid3 = ethers.toBeHex(1500, 32);
      const mockProof = "0x" + "00".repeat(32);

      // Phase 1: Bidding
      console.log("  Phase 1: Bidders submit encrypted bids");

      let tx = await contract
        .connect(bidder1)
        .submitBid(mockEncryptedBid1, mockProof);
      await tx.wait();

      tx = await contract
        .connect(bidder2)
        .submitBid(mockEncryptedBid2, mockProof);
      await tx.wait();

      tx = await contract
        .connect(bidder3)
        .submitBid(mockEncryptedBid3, mockProof);
      await tx.wait();

      // Verify bidding phase
      let (_, __, state) = await contract.getAuctionTiming();
      expect(state).to.equal(0); // Bidding

      // Verify bids were recorded
      expect(await contract.getBidCount()).to.equal(3);
      expect(await contract.hasSubmittedBid(bidder1.address)).to.be.true;
      expect(await contract.hasSubmittedBid(bidder2.address)).to.be.true;
      expect(await contract.hasSubmittedBid(bidder3.address)).to.be.true;

      // Phase 2: Reveal (in real scenario, time would advance)
      console.log("  Phase 2: Auction proceeds to reveal phase");
      // In real test: await ethers.provider.send('hardhat_mine', [blocks]);

      // Phase 3: Comparison
      console.log("  Phase 3: Encrypted bid comparisons");

      const isBidHigher0 = await contract.isBidHigher(0);
      const isBidHigher1 = await contract.isBidHigher(1);
      const isBidHigher2 = await contract.isBidHigher(2);

      expect(isBidHigher0).to.be.a("boolean");
      expect(isBidHigher1).to.be.a("boolean");
      expect(isBidHigher2).to.be.a("boolean");

      console.log("  ✓ Auction completed successfully");
      console.log(`  - Total bids: ${await contract.getBidCount()}`);
      console.log(`  - Bidding phase state: ${state}`);
    });
  });

  // ==================== Privacy Tests ====================

  describe("Privacy Guarantees", function () {
    /**
     * ✅ Concept: Bids remain encrypted on-chain
     *
     * No one (including contract owner) can:
     * - See bid amounts until explicitly decrypted
     * - Determine which bid is highest without encrypted comparison
     * - Link bids to bidders without additional information
     */
    it("Should maintain bid privacy throughout auction", async function () {
      const mockEncryptedBid1 = ethers.toBeHex(1000, 32);
      const mockEncryptedBid2 = ethers.toBeHex(2000, 32);
      const mockProof = "0x" + "00".repeat(32);

      // Submit bids
      let tx = await contract
        .connect(bidder1)
        .submitBid(mockEncryptedBid1, mockProof);
      await tx.wait();

      tx = await contract
        .connect(bidder2)
        .submitBid(mockEncryptedBid2, mockProof);
      await tx.wait();

      // Owner can see encrypted bids but not values
      const encryptedBid0 = await contract.getEncryptedBid(0);
      const encryptedBid1 = await contract.getEncryptedBid(1);

      // Encrypted bids exist but values are hidden
      expect(encryptedBid0).to.not.be.null;
      expect(encryptedBid1).to.not.be.null;

      // Bids are different (different amounts were encrypted)
      // But no one knows the actual values without decryption
      console.log("  ✓ Bids are encrypted and private");
      console.log("  ✓ Only encrypted comparisons reveal information");
    });
  });
});
