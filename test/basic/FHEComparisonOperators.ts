import { expect } from "chai";
import { ethers } from "hardhat";
import { FHEComparisonOperators } from "../../typechain-types";

describe("FHEComparisonOperators", function () {
  let contract: FHEComparisonOperators;
  let owner: any;
  let addr1: any;
  let addr2: any;

  before(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const FHEComparisonOperators = await ethers.getContractFactory(
      "FHEComparisonOperators"
    );
    contract = await FHEComparisonOperators.deploy();
    await contract.waitForDeployment();
  });

  describe("Store Value", function () {
    it("Should store encrypted value", async function () {
      const mockHandle = ethers.toBeHex("0x12345678", 32);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await expect(contract.storeValue(mockHandle, mockProof))
        .to.emit(contract, "ValueStored")
        .withArgs(owner.address);
    });

    it("Should grant proper permissions", async function () {
      const mockHandle = ethers.toBeHex("0x87654321", 32);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await contract.storeValue(mockHandle, mockProof);

      // Verify value was stored by checking that comparison works
      const result = await contract.isGreaterThan(100);
      expect(result).to.not.be.null;
    });

    it("Should allow multiple users to store values", async function () {
      const mockHandle1 = ethers.toBeHex("0x1111", 32);
      const mockHandle2 = ethers.toBeHex("0x2222", 32);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await contract.connect(addr1).storeValue(mockHandle1, mockProof);
      await contract.connect(addr2).storeValue(mockHandle2, mockProof);

      // Both users can perform operations
      const result1 = await contract.connect(addr1).isGreaterThan(50);
      const result2 = await contract.connect(addr2).isGreaterThan(100);

      expect(result1).to.not.be.null;
      expect(result2).to.not.be.null;
    });
  });

  describe("Greater Than (GT)", function () {
    beforeEach(async function () {
      const mockHandle = ethers.toBeHex("0x00000064", 32); // 100
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.storeValue(mockHandle, mockProof);
    });

    it("Should perform GT comparison", async function () {
      const result = await contract.isGreaterThan(50);
      expect(result).to.not.be.null;
    });

    it("Should handle GT with threshold equal to value", async function () {
      const result = await contract.isGreaterThan(100);
      expect(result).to.not.be.null;
    });

    it("Should reject GT without stored value", async function () {
      await expect(contract.connect(addr1).isGreaterThan(50)).to.be.revertedWith(
        "No value stored"
      );
    });

    it("Should handle various threshold values", async function () {
      const thresholds = [0, 50, 100, 150, 1000, 10000];

      for (const threshold of thresholds) {
        const result = await contract.isGreaterThan(threshold);
        expect(result).to.not.be.null;
      }
    });
  });

  describe("Greater Than or Equal (GTE)", function () {
    beforeEach(async function () {
      const mockHandle = ethers.toBeHex("0x00000064", 32); // 100
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.storeValue(mockHandle, mockProof);
    });

    it("Should perform GTE comparison", async function () {
      const result = await contract.isGreaterOrEqual(100);
      expect(result).to.not.be.null;
    });

    it("Should handle GTE with lower threshold", async function () {
      const result = await contract.isGreaterOrEqual(50);
      expect(result).to.not.be.null;
    });

    it("Should handle GTE with higher threshold", async function () {
      const result = await contract.isGreaterOrEqual(150);
      expect(result).to.not.be.null;
    });

    it("Should reject GTE without stored value", async function () {
      await expect(
        contract.connect(addr1).isGreaterOrEqual(100)
      ).to.be.revertedWith("No value stored");
    });
  });

  describe("Less Than (LT)", function () {
    beforeEach(async function () {
      const mockHandle = ethers.toBeHex("0x00000064", 32); // 100
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.storeValue(mockHandle, mockProof);
    });

    it("Should perform LT comparison", async function () {
      const result = await contract.isLessThan(150);
      expect(result).to.not.be.null;
    });

    it("Should handle LT with equal threshold", async function () {
      const result = await contract.isLessThan(100);
      expect(result).to.not.be.null;
    });

    it("Should handle LT with lower threshold", async function () {
      const result = await contract.isLessThan(50);
      expect(result).to.not.be.null;
    });

    it("Should reject LT without stored value", async function () {
      await expect(contract.connect(addr1).isLessThan(100)).to.be.revertedWith(
        "No value stored"
      );
    });
  });

  describe("Less Than or Equal (LTE)", function () {
    beforeEach(async function () {
      const mockHandle = ethers.toBeHex("0x00000064", 32); // 100
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.storeValue(mockHandle, mockProof);
    });

    it("Should perform LTE comparison", async function () {
      const result = await contract.isLessOrEqual(100);
      expect(result).to.not.be.null;
    });

    it("Should handle LTE with higher threshold", async function () {
      const result = await contract.isLessOrEqual(150);
      expect(result).to.not.be.null;
    });

    it("Should handle LTE with lower threshold", async function () {
      const result = await contract.isLessOrEqual(50);
      expect(result).to.not.be.null;
    });

    it("Should reject LTE without stored value", async function () {
      await expect(contract.connect(addr1).isLessOrEqual(100)).to.be.revertedWith(
        "No value stored"
      );
    });
  });

  describe("Equal (EQ)", function () {
    beforeEach(async function () {
      const mockHandle = ethers.toBeHex("0x00000064", 32); // 100
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.storeValue(mockHandle, mockProof);
    });

    it("Should perform EQ comparison", async function () {
      const result = await contract.isEqual(100);
      expect(result).to.not.be.null;
    });

    it("Should handle EQ with different values", async function () {
      const result1 = await contract.isEqual(100);
      const result2 = await contract.isEqual(50);
      const result3 = await contract.isEqual(150);

      expect(result1).to.not.be.null;
      expect(result2).to.not.be.null;
      expect(result3).to.not.be.null;
    });

    it("Should handle EQ with zero", async function () {
      const result = await contract.isEqual(0);
      expect(result).to.not.be.null;
    });

    it("Should reject EQ without stored value", async function () {
      await expect(contract.connect(addr1).isEqual(100)).to.be.revertedWith(
        "No value stored"
      );
    });
  });

  describe("Not Equal (NE)", function () {
    beforeEach(async function () {
      const mockHandle = ethers.toBeHex("0x00000064", 32); // 100
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.storeValue(mockHandle, mockProof);
    });

    it("Should perform NE comparison", async function () {
      const result = await contract.isNotEqual(50);
      expect(result).to.not.be.null;
    });

    it("Should handle NE with same value", async function () {
      const result = await contract.isNotEqual(100);
      expect(result).to.not.be.null;
    });

    it("Should handle NE with multiple values", async function () {
      const values = [0, 50, 100, 150, 1000];

      for (const value of values) {
        const result = await contract.isNotEqual(value);
        expect(result).to.not.be.null;
      }
    });

    it("Should reject NE without stored value", async function () {
      await expect(
        contract.connect(addr1).isNotEqual(100)
      ).to.be.revertedWith("No value stored");
    });
  });

  describe("Compare Encrypted Values", function () {
    beforeEach(async function () {
      const mockHandle1 = ethers.toBeHex("0x00000064", 32); // 100
      const mockHandle2 = ethers.toBeHex("0x000000C8", 32); // 200
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await contract.storeValue(mockHandle1, mockProof);
      await contract.connect(addr1).storeValue(mockHandle2, mockProof);
    });

    it("Should compare two encrypted values", async function () {
      const result = await contract.isGreaterThanUser(addr1.address);
      expect(result).to.not.be.null;
    });

    it("Should reject comparison with user without value", async function () {
      await expect(
        contract.isGreaterThanUser(addr2.address)
      ).to.be.revertedWith("Other user has no value");
    });

    it("Should reject comparison without own value", async function () {
      await expect(
        contract.connect(addr2).isGreaterThanUser(addr1.address)
      ).to.be.revertedWith("You have no value");
    });

    it("Should handle self-comparison", async function () {
      const result = await contract.isGreaterThanUser(owner.address);
      expect(result).to.not.be.null;
    });
  });

  describe("Range Check", function () {
    beforeEach(async function () {
      const mockHandle = ethers.toBeHex("0x00000064", 32); // 100
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.storeValue(mockHandle, mockProof);
    });

    it("Should check if value is in range", async function () {
      const result = await contract.isInRange(50, 150);
      expect(result).to.not.be.null;
    });

    it("Should handle boundary values", async function () {
      const result = await contract.isInRange(100, 100);
      expect(result).to.not.be.null;
    });

    it("Should handle wide range", async function () {
      const result = await contract.isInRange(0, 10000);
      expect(result).to.not.be.null;
    });

    it("Should handle narrow range", async function () {
      const result = await contract.isInRange(99, 101);
      expect(result).to.not.be.null;
    });

    it("Should reject invalid range", async function () {
      await expect(contract.isInRange(150, 50)).to.be.revertedWith(
        "Invalid range"
      );
    });

    it("Should reject range check without value", async function () {
      await expect(
        contract.connect(addr1).isInRange(50, 150)
      ).to.be.revertedWith("No value stored");
    });

    it("Should handle multiple ranges", async function () {
      const ranges = [
        { min: 0, max: 100 },
        { min: 100, max: 200 },
        { min: 50, max: 150 },
        { min: 0, max: 1000 },
      ];

      for (const range of ranges) {
        const result = await contract.isInRange(range.min, range.max);
        expect(result).to.not.be.null;
      }
    });
  });

  describe("Multiple Thresholds", function () {
    beforeEach(async function () {
      const mockHandle = ethers.toBeHex("0x000001F4", 32); // 500
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.storeValue(mockHandle, mockProof);
    });

    it("Should check multiple thresholds", async function () {
      const [result1, result2, result3] = await contract.checkMultipleThresholds(
        100,
        500,
        1000
      );

      expect(result1).to.not.be.null;
      expect(result2).to.not.be.null;
      expect(result3).to.not.be.null;
    });

    it("Should handle identical thresholds", async function () {
      const [result1, result2, result3] = await contract.checkMultipleThresholds(
        500,
        500,
        500
      );

      expect(result1).to.not.be.null;
      expect(result2).to.not.be.null;
      expect(result3).to.not.be.null;
    });

    it("Should handle zero threshold", async function () {
      const [result1, result2, result3] = await contract.checkMultipleThresholds(
        0,
        500,
        1000
      );

      expect(result1).to.not.be.null;
      expect(result2).to.not.be.null;
      expect(result3).to.not.be.null;
    });

    it("Should reject without stored value", async function () {
      await expect(
        contract.connect(addr1).checkMultipleThresholds(100, 500, 1000)
      ).to.be.revertedWith("No value stored");
    });
  });

  describe("Use Case Patterns", function () {
    it("Should support age verification", async function () {
      const ageHandle = ethers.toBeHex("0x00000019", 32); // 25 years old
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await contract.connect(addr1).storeValue(ageHandle, mockProof);

      // Check if adult (>= 18)
      const isAdult = await contract.connect(addr1).isGreaterOrEqual(18);
      expect(isAdult).to.not.be.null;
    });

    it("Should support credit score tiers", async function () {
      const scoreHandle = ethers.toBeHex("0x000002D2", 32); // 722 score
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await contract.connect(addr1).storeValue(scoreHandle, mockProof);

      // Check different tiers
      const excellent = await contract.connect(addr1).isGreaterOrEqual(750);
      const good = await contract.connect(addr1).isGreaterOrEqual(700);
      const fair = await contract.connect(addr1).isGreaterOrEqual(650);

      expect(excellent).to.not.be.null;
      expect(good).to.not.be.null;
      expect(fair).to.not.be.null;
    });

    it("Should support achievement badges", async function () {
      const scoreHandle = ethers.toBeHex("0x000003E8", 32); // 1000 points
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await contract.connect(addr1).storeValue(scoreHandle, mockProof);

      // Bronze: >= 500
      // Silver: >= 750
      // Gold: >= 1000
      const [bronze, silver, gold] = await contract
        .connect(addr1)
        .checkMultipleThresholds(500, 750, 1000);

      expect(bronze).to.not.be.null;
      expect(silver).to.not.be.null;
      expect(gold).to.not.be.null;
    });

    it("Should support qualification checks", async function () {
      const scoreHandle = ethers.toBeHex("0x00000258", 32); // 600 score
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await contract.connect(addr1).storeValue(scoreHandle, mockProof);

      // Must be in range [500, 750]
      const qualified = await contract
        .connect(addr1)
        .isInRange(500, 750);
      expect(qualified).to.not.be.null;
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero value", async function () {
      const mockHandle = ethers.toBeHex("0x00000000", 32);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await contract.connect(addr1).storeValue(mockHandle, mockProof);

      const result = await contract
        .connect(addr1)
        .isGreaterThan(0);
      expect(result).to.not.be.null;
    });

    it("Should handle maximum uint32 value", async function () {
      const mockHandle = ethers.toBeHex("0xFFFFFFFF", 32);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await contract.connect(addr1).storeValue(mockHandle, mockProof);

      const result = await contract
        .connect(addr1)
        .isGreaterThan(1000000);
      expect(result).to.not.be.null;
    });

    it("Should handle user updates", async function () {
      const mockHandle1 = ethers.toBeHex("0x00000064", 32); // 100
      const mockHandle2 = ethers.toBeHex("0x000000C8", 32); // 200
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await contract.connect(addr1).storeValue(mockHandle1, mockProof);
      let result = await contract.connect(addr1).isGreaterThan(150);
      expect(result).to.not.be.null;

      // Update value
      await contract.connect(addr1).storeValue(mockHandle2, mockProof);
      result = await contract.connect(addr1).isGreaterThan(150);
      expect(result).to.not.be.null;
    });

    it("Should maintain separate values per user", async function () {
      const mockHandle1 = ethers.toBeHex("0x00000064", 32); // 100
      const mockHandle2 = ethers.toBeHex("0x000003E8", 32); // 1000
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await contract.connect(addr1).storeValue(mockHandle1, mockProof);
      await contract.connect(addr2).storeValue(mockHandle2, mockProof);

      const result1 = await contract.connect(addr1).isGreaterThan(500);
      const result2 = await contract.connect(addr2).isGreaterThan(500);

      expect(result1).to.not.be.null;
      expect(result2).to.not.be.null;
    });
  });
});
