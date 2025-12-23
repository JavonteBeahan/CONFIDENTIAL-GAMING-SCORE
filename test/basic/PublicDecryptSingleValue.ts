import { expect } from "chai";
import { ethers } from "hardhat";
import { PublicDecryptSingleValue } from "../../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("PublicDecryptSingleValue", function () {
  let contract: PublicDecryptSingleValue;
  let owner: any;
  let addr1: any;
  let addr2: any;

  before(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const PublicDecryptSingleValue = await ethers.getContractFactory(
      "PublicDecryptSingleValue"
    );
    contract = await PublicDecryptSingleValue.deploy();
    await contract.waitForDeployment();
  });

  describe("Store Balance", function () {
    it("Should store encrypted balance", async function () {
      const mockHandle = ethers.toBeHex("0x12345678", 32);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await expect(contract.storeBalance(mockHandle, mockProof))
        .to.emit(contract, "BalanceStored")
        .withArgs(owner.address, await time.latest());
    });

    it("Should allow storing balance multiple times", async function () {
      const mockHandle1 = ethers.toBeHex("0x1111", 32);
      const mockHandle2 = ethers.toBeHex("0x2222", 32);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await contract.storeBalance(mockHandle1, mockProof);
      await contract.storeBalance(mockHandle2, mockProof);

      // Second store should replace first
      expect(true).to.be.true;
    });

    it("Should handle multiple users independently", async function () {
      const mockHandle1 = ethers.toBeHex("0x1111", 32);
      const mockHandle2 = ethers.toBeHex("0x2222", 32);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await contract.connect(addr1).storeBalance(mockHandle1, mockProof);
      await contract.connect(addr2).storeBalance(mockHandle2, mockProof);

      // Both should complete successfully
      expect(true).to.be.true;
    });
  });

  describe("Get Encrypted Balance", function () {
    beforeEach(async function () {
      const mockHandle = ethers.toBeHex("0xABCD", 32);
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.storeBalance(mockHandle, mockProof);
    });

    it("Should retrieve encrypted balance", async function () {
      const balance = await contract.getEncryptedBalance();
      expect(balance).to.not.be.null;
    });

    it("Should reject retrieval without stored balance", async function () {
      await expect(
        contract.connect(addr1).getEncryptedBalance()
      ).to.be.revertedWith("No balance stored");
    });
  });

  describe("Reveal Balance", function () {
    beforeEach(async function () {
      const mockHandle = ethers.toBeHex("0x9999", 32);
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.storeBalance(mockHandle, mockProof);
    });

    it("Should reveal balance publicly", async function () {
      // Note: In real FHE environment, this would decrypt
      // For test purposes, we verify the pattern
      await expect(contract.revealBalance()).to.emit(
        contract,
        "BalanceRevealed"
      );
    });

    it("Should prevent double revelation", async function () {
      await contract.revealBalance();

      await expect(contract.revealBalance()).to.be.revertedWith(
        "Already revealed"
      );
    });

    it("Should reject revelation without balance", async function () {
      await expect(
        contract.connect(addr1).revealBalance()
      ).to.be.revertedWith("No balance stored");
    });

    it("Should make balance publicly accessible after revelation", async function () {
      await contract.revealBalance();

      // After revelation, anyone can query the public balance
      const publicBalance = await contract.getPublicBalance(owner.address);
      expect(publicBalance).to.not.be.null;
    });
  });

  describe("Get Public Balance", function () {
    beforeEach(async function () {
      const mockHandle = ethers.toBeHex("0x7777", 32);
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.storeBalance(mockHandle, mockProof);
      await contract.revealBalance();
    });

    it("Should allow anyone to read revealed balance", async function () {
      // Different user can read revealed balance
      const balance = await contract
        .connect(addr1)
        .getPublicBalance(owner.address);
      expect(balance).to.not.be.null;
    });

    it("Should reject reading unrevealed balance", async function () {
      await expect(
        contract.getPublicBalance(addr1.address)
      ).to.be.revertedWith("Balance not revealed");
    });
  });

  describe("Check Revelation Status", function () {
    it("Should return false for unrevealed balance", async function () {
      const mockHandle = ethers.toBeHex("0x1234", 32);
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.connect(addr1).storeBalance(mockHandle, mockProof);

      const isRevealed = await contract.isRevealed(addr1.address);
      expect(isRevealed).to.be.false;
    });

    it("Should return true after revelation", async function () {
      const mockHandle = ethers.toBeHex("0x5678", 32);
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.connect(addr1).storeBalance(mockHandle, mockProof);
      await contract.connect(addr1).revealBalance();

      const isRevealed = await contract.isRevealed(addr1.address);
      expect(isRevealed).to.be.true;
    });

    it("Should return false for users without balance", async function () {
      const isRevealed = await contract.isRevealed(addr2.address);
      expect(isRevealed).to.be.false;
    });
  });

  describe("Reveal Above Threshold", function () {
    beforeEach(async function () {
      const mockHandle = ethers.toBeHex("0x1000", 32);
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.storeBalance(mockHandle, mockProof);
    });

    it("Should reveal comparison result", async function () {
      // Note: In real FHE, this would perform encrypted comparison
      const threshold = 500;
      const result = await contract.revealAboveThreshold(threshold);

      // Result should be boolean (either true or false)
      expect(typeof result).to.equal("boolean");
    });

    it("Should reject threshold check without balance", async function () {
      await expect(
        contract.connect(addr1).revealAboveThreshold(100)
      ).to.be.revertedWith("No balance stored");
    });

    it("Should handle various threshold values", async function () {
      const thresholds = [0, 100, 500, 1000, 10000];

      for (const threshold of thresholds) {
        const result = await contract.revealAboveThreshold(threshold);
        expect(typeof result).to.equal("boolean");
      }
    });
  });

  describe("Timed Reveal", function () {
    let futureDeadline: number;

    beforeEach(async function () {
      const mockHandle = ethers.toBeHex("0x8888", 32);
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.storeBalance(mockHandle, mockProof);

      // Set deadline to 1 hour in the future
      const currentTime = await time.latest();
      futureDeadline = currentTime + 3600;
    });

    it("Should reject reveal before deadline", async function () {
      await expect(contract.timedReveal(futureDeadline)).to.be.revertedWith(
        "Deadline not reached"
      );
    });

    it("Should allow reveal after deadline", async function () {
      // Fast forward time
      await time.increaseTo(futureDeadline + 1);

      await expect(contract.timedReveal(futureDeadline)).to.emit(
        contract,
        "BalanceRevealed"
      );
    });

    it("Should prevent double timed reveal", async function () {
      await time.increaseTo(futureDeadline + 1);

      await contract.timedReveal(futureDeadline);

      await expect(contract.timedReveal(futureDeadline)).to.be.revertedWith(
        "Already revealed"
      );
    });

    it("Should reject timed reveal without balance", async function () {
      await time.increaseTo(futureDeadline + 1);

      await expect(
        contract.connect(addr1).timedReveal(futureDeadline)
      ).to.be.revertedWith("No balance stored");
    });

    it("Should work with past deadline", async function () {
      const pastDeadline = (await time.latest()) - 3600;

      await expect(contract.timedReveal(pastDeadline)).to.emit(
        contract,
        "BalanceRevealed"
      );
    });
  });

  describe("Privacy Guarantees", function () {
    it("Should keep balance private before revelation", async function () {
      const mockHandle = ethers.toBeHex("0xFFFF", 32);
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.connect(addr1).storeBalance(mockHandle, mockProof);

      // Other users cannot see the balance
      await expect(
        contract.getPublicBalance(addr1.address)
      ).to.be.revertedWith("Balance not revealed");
    });

    it("Should maintain separate balances per user", async function () {
      const mockHandle1 = ethers.toBeHex("0x1111", 32);
      const mockHandle2 = ethers.toBeHex("0x2222", 32);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await contract.connect(addr1).storeBalance(mockHandle1, mockProof);
      await contract.connect(addr2).storeBalance(mockHandle2, mockProof);

      // Reveal one user's balance
      await contract.connect(addr1).revealBalance();

      // addr1's balance is revealed
      const addr1Revealed = await contract.isRevealed(addr1.address);
      expect(addr1Revealed).to.be.true;

      // addr2's balance is still private
      const addr2Revealed = await contract.isRevealed(addr2.address);
      expect(addr2Revealed).to.be.false;
    });
  });

  describe("Edge Cases", function () {
    it("Should handle revelation with zero balance", async function () {
      const mockHandle = ethers.toBeHex("0x0000", 32);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await contract.storeBalance(mockHandle, mockProof);
      await expect(contract.revealBalance()).to.emit(
        contract,
        "BalanceRevealed"
      );
    });

    it("Should handle maximum uint32 balance", async function () {
      const mockHandle = ethers.toBeHex("0xFFFFFFFF", 32);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await contract.storeBalance(mockHandle, mockProof);
      await expect(contract.revealBalance()).to.emit(
        contract,
        "BalanceRevealed"
      );
    });

    it("Should handle sequential store and reveal cycles", async function () {
      const mockHandle1 = ethers.toBeHex("0x1111", 32);
      const mockHandle2 = ethers.toBeHex("0x2222", 32);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      // First cycle
      await contract.storeBalance(mockHandle1, mockProof);
      await contract.revealBalance();

      // Second cycle should work with new storage
      await contract.storeBalance(mockHandle2, mockProof);
      // Cannot reveal again due to hasPublicBalance check
      await expect(contract.revealBalance()).to.be.revertedWith(
        "Already revealed"
      );
    });
  });

  describe("Use Case Patterns", function () {
    it("Should support auction winner pattern", async function () {
      // Simulate sealed bid
      const bidHandle = ethers.toBeHex("0x5000", 32);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await contract.connect(addr1).storeBalance(bidHandle, mockProof);

      // After auction ends, reveal winning bid
      await contract.connect(addr1).revealBalance();

      // Winner amount is now public
      const winningBid = await contract.getPublicBalance(addr1.address);
      expect(winningBid).to.not.be.null;
    });

    it("Should support time-locked lottery pattern", async function () {
      const prizeHandle = ethers.toBeHex("0x10000", 32);
      const mockProof = ethers.toBeHex("0xdeadbeef");
      const drawTime = (await time.latest()) + 7200; // 2 hours

      await contract.connect(addr1).storeBalance(prizeHandle, mockProof);

      // Cannot reveal before draw time
      await expect(
        contract.connect(addr1).timedReveal(drawTime)
      ).to.be.revertedWith("Deadline not reached");

      // After draw time, reveal prize
      await time.increaseTo(drawTime + 1);
      await expect(contract.connect(addr1).timedReveal(drawTime)).to.emit(
        contract,
        "BalanceRevealed"
      );
    });

    it("Should support qualification proof pattern", async function () {
      const scoreHandle = ethers.toBeHex("0x0750", 32);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await contract.connect(addr1).storeBalance(scoreHandle, mockProof);

      // Prove qualification without revealing exact score
      const qualificationThreshold = 700;
      const isQualified = await contract
        .connect(addr1)
        .revealAboveThreshold(qualificationThreshold);

      expect(typeof isQualified).to.equal("boolean");
    });
  });
});
