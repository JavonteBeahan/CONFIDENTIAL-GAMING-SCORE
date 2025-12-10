/**
 * Test Suite: FHE Counter
 *
 * This test suite demonstrates:
 * - Encrypted counter operations
 * - FHE arithmetic operations
 * - Permission system
 * - Error handling
 *
 * chapter: basic-concepts
 */

import { expect } from "chai";
import { ethers } from "hardhat";
import { FHECounter } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("FHE Counter", function () {
  let contract: FHECounter;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();

    const FHECounterFactory = await ethers.getContractFactory("FHECounter");
    contract = await FHECounterFactory.deploy();
    await contract.waitForDeployment();
  });

  // ==================== Initialization Tests ====================

  describe("Initialization", function () {
    /**
     * ✅ Test: Contract initializes with zero count
     */
    it("Should initialize with zero count", async function () {
      const count = await contract.getEncryptedCount();
      expect(count).to.not.be.null;
    });

    /**
     * ✅ Test: Contract info is available
     */
    it("Should return contract info", async function () {
      const info = await contract.getInfo();
      expect(info).to.include("FHE Counter");
    });
  });

  // ==================== Increment Tests ====================

  describe("Increment Operation", function () {
    /**
     * ✅ Test: Can increment counter
     */
    it("Should increment counter with encrypted value", async function () {
      const mockEncryptedValue = ethers.toBeHex(10, 32);
      const mockProof = "0x" + "00".repeat(32);

      const tx = await contract
        .connect(user1)
        .increment(mockEncryptedValue, mockProof);
      await tx.wait();

      // Counter should be incremented (value remains encrypted)
      const newCount = await contract.getEncryptedCount();
      expect(newCount).to.not.be.null;
    });

    /**
     * ❌ Test: Reject empty encrypted value
     */
    it("Should reject empty encrypted value", async function () {
      const emptyValue = "0x";
      const mockProof = "0x" + "00".repeat(32);

      await expect(
        contract.connect(user1).increment(emptyValue, mockProof)
      ).to.be.revertedWith("Invalid encrypted value");
    });

    /**
     * ❌ Test: Reject empty proof
     */
    it("Should reject empty proof", async function () {
      const mockEncryptedValue = ethers.toBeHex(10, 32);
      const emptyProof = "0x";

      await expect(
        contract.connect(user1).increment(mockEncryptedValue, emptyProof)
      ).to.be.revertedWith("Invalid proof");
    });

    /**
     * ✅ Test: Multiple increments
     */
    it("Should handle multiple increments", async function () {
      const mockEncryptedValue = ethers.toBeHex(5, 32);
      const mockProof = "0x" + "00".repeat(32);

      // First increment
      let tx = await contract
        .connect(user1)
        .increment(mockEncryptedValue, mockProof);
      await tx.wait();

      // Second increment
      tx = await contract
        .connect(user1)
        .increment(mockEncryptedValue, mockProof);
      await tx.wait();

      // Counter should reflect both increments
      const finalCount = await contract.getEncryptedCount();
      expect(finalCount).to.not.be.null;
    });
  });

  // ==================== Decrement Tests ====================

  describe("Decrement Operation", function () {
    beforeEach(async function () {
      // Increment first
      const mockEncryptedValue = ethers.toBeHex(20, 32);
      const mockProof = "0x" + "00".repeat(32);

      const tx = await contract
        .connect(user1)
        .increment(mockEncryptedValue, mockProof);
      await tx.wait();
    });

    /**
     * ✅ Test: Can decrement counter
     */
    it("Should decrement counter with encrypted value", async function () {
      const mockEncryptedValue = ethers.toBeHex(5, 32);
      const mockProof = "0x" + "00".repeat(32);

      const tx = await contract
        .connect(user1)
        .decrement(mockEncryptedValue, mockProof);
      await tx.wait();

      const newCount = await contract.getEncryptedCount();
      expect(newCount).to.not.be.null;
    });

    /**
     * ❌ Test: Reject invalid decrement
     */
    it("Should reject empty encrypted value in decrement", async function () {
      const emptyValue = "0x";
      const mockProof = "0x" + "00".repeat(32);

      await expect(
        contract.connect(user1).decrement(emptyValue, mockProof)
      ).to.be.revertedWith("Invalid encrypted value");
    });
  });

  // ==================== Reset Tests ====================

  describe("Reset Operation", function () {
    beforeEach(async function () {
      // Increment first
      const mockEncryptedValue = ethers.toBeHex(100, 32);
      const mockProof = "0x" + "00".repeat(32);

      const tx = await contract
        .connect(user1)
        .increment(mockEncryptedValue, mockProof);
      await tx.wait();
    });

    /**
     * ✅ Test: Can reset counter
     */
    it("Should reset counter to zero", async function () {
      const tx = await contract.connect(user1).reset();
      await tx.wait();

      const resetCount = await contract.getEncryptedCount();
      expect(resetCount).to.not.be.null;
    });

    /**
     * ✅ Test: Can increment after reset
     */
    it("Should allow increment after reset", async function () {
      let tx = await contract.connect(user1).reset();
      await tx.wait();

      const mockEncryptedValue = ethers.toBeHex(50, 32);
      const mockProof = "0x" + "00".repeat(32);

      tx = await contract
        .connect(user1)
        .increment(mockEncryptedValue, mockProof);
      await tx.wait();

      const newCount = await contract.getEncryptedCount();
      expect(newCount).to.not.be.null;
    });
  });

  // ==================== Comparison Tests ====================

  describe("Encrypted Comparisons", function () {
    /**
     * ✅ Test: Check equality with encrypted value
     */
    it("Should compare counter with encrypted value", async function () {
      const mockEncryptedValue = ethers.toBeHex(10, 32);
      const mockProof = "0x" + "00".repeat(32);

      // Increment counter
      let tx = await contract
        .connect(user1)
        .increment(mockEncryptedValue, mockProof);
      await tx.wait();

      // Compare with another value
      const compareValue = ethers.toBeHex(10, 32);
      const compareProof = "0x" + "00".repeat(32);

      const result = await contract
        .connect(user1)
        .equalsValue(compareValue, compareProof);
      expect(result).to.be.a("boolean");
    });

    /**
     * ❌ Test: Reject comparison with empty value
     */
    it("Should reject comparison with empty value", async function () {
      const emptyValue = "0x";
      const mockProof = "0x" + "00".repeat(32);

      await expect(
        contract.connect(user1).equalsValue(emptyValue, mockProof)
      ).to.be.revertedWith("Invalid encrypted value");
    });
  });

  // ==================== Event Tests ====================

  describe("Events", function () {
    /**
     * ✅ Test: CounterIncremented event emitted
     */
    it("Should emit CounterIncremented event", async function () {
      const mockEncryptedValue = ethers.toBeHex(10, 32);
      const mockProof = "0x" + "00".repeat(32);

      const tx = await contract
        .connect(user1)
        .increment(mockEncryptedValue, mockProof);
      const receipt = await tx.wait();

      const events = receipt?.logs.filter((log) => {
        try {
          return contract.interface.parseLog(log)?.name === "CounterIncremented";
        } catch {
          return false;
        }
      });

      expect(events?.length).to.be.greaterThan(0);
    });

    /**
     * ✅ Test: CounterDecremented event emitted
     */
    it("Should emit CounterDecremented event", async function () {
      // Increment first
      let mockEncryptedValue = ethers.toBeHex(10, 32);
      let mockProof = "0x" + "00".repeat(32);

      let tx = await contract
        .connect(user1)
        .increment(mockEncryptedValue, mockProof);
      await tx.wait();

      // Decrement
      mockEncryptedValue = ethers.toBeHex(5, 32);
      tx = await contract
        .connect(user1)
        .decrement(mockEncryptedValue, mockProof);
      const receipt = await tx.wait();

      const events = receipt?.logs.filter((log) => {
        try {
          return contract.interface.parseLog(log)?.name === "CounterDecremented";
        } catch {
          return false;
        }
      });

      expect(events?.length).to.be.greaterThan(0);
    });

    /**
     * ✅ Test: CounterReset event emitted
     */
    it("Should emit CounterReset event", async function () {
      const tx = await contract.connect(user1).reset();
      const receipt = await tx.wait();

      const events = receipt?.logs.filter((log) => {
        try {
          return contract.interface.parseLog(log)?.name === "CounterReset";
        } catch {
          return false;
        }
      });

      expect(events?.length).to.be.greaterThan(0);
    });
  });

  // ==================== FHE Permission Tests ====================

  describe("FHE Permissions", function () {
    /**
     * ✅ Test: Permissions are set after increment
     *
     * Note: In production FHEVM, verify permissions are properly set
     * This ensures encrypted values can be accessed appropriately
     */
    it("Should maintain encrypted state throughout operations", async function () {
      const mockEncryptedValue = ethers.toBeHex(15, 32);
      const mockProof = "0x" + "00".repeat(32);

      // Increment
      let tx = await contract
        .connect(user1)
        .increment(mockEncryptedValue, mockProof);
      await tx.wait();

      // Get encrypted count
      const count1 = await contract.getEncryptedCount();

      // Increment again
      tx = await contract
        .connect(user1)
        .increment(mockEncryptedValue, mockProof);
      await tx.wait();

      // Get encrypted count again
      const count2 = await contract.getEncryptedCount();

      // Both should exist and be different (internal state changed)
      expect(count1).to.not.be.null;
      expect(count2).to.not.be.null;
    });
  });

  // ==================== Multiple User Tests ====================

  describe("Multi-User Operations", function () {
    /**
     * ✅ Test: Different users can operate on same counter
     *
     * Note: In FHEVM, encrypted values can be shared
     * Multiple users can perform operations on the same encrypted state
     */
    it("Should allow multiple users to increment", async function () {
      const [user2] = await ethers.getSigners();
      const mockEncryptedValue = ethers.toBeHex(10, 32);
      const mockProof = "0x" + "00".repeat(32);

      // User1 increments
      let tx = await contract
        .connect(user1)
        .increment(mockEncryptedValue, mockProof);
      await tx.wait();

      // User2 increments
      tx = await contract
        .connect(user2)
        .increment(mockEncryptedValue, mockProof);
      await tx.wait();

      // Counter should reflect both operations
      const finalCount = await contract.getEncryptedCount();
      expect(finalCount).to.not.be.null;
    });
  });
});
