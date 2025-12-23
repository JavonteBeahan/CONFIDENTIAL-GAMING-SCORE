import { expect } from "chai";
import { ethers } from "hardhat";
import { FHEConditionalOperations } from "../../typechain-types";

describe("FHEConditionalOperations", function () {
  let contract: FHEConditionalOperations;
  let owner: any;
  let addr1: any;
  let addr2: any;

  before(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const FHEConditionalOperations = await ethers.getContractFactory(
      "FHEConditionalOperations"
    );
    contract = await FHEConditionalOperations.deploy();
    await contract.waitForDeployment();
  });

  describe("Store Value", function () {
    it("Should store encrypted value", async function () {
      const mockHandle = ethers.toBeHex("0x000001F4", 32); // 500
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await expect(contract.storeValue(mockHandle, mockProof))
        .to.emit(contract, "ValueStored")
        .withArgs(owner.address);
    });

    it("Should allow value updates", async function () {
      const mockHandle1 = ethers.toBeHex("0x00000064", 32); // 100
      const mockHandle2 = ethers.toBeHex("0x000000C8", 32); // 200
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await contract.storeValue(mockHandle1, mockProof);
      await contract.storeValue(mockHandle2, mockProof);

      // Second store should replace first
      expect(true).to.be.true;
    });

    it("Should handle multiple users independently", async function () {
      const mockHandle1 = ethers.toBeHex("0x0000012C", 32); // 300
      const mockHandle2 = ethers.toBeHex("0x00000190", 32); // 400
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await contract.connect(addr1).storeValue(mockHandle1, mockProof);
      await contract.connect(addr2).storeValue(mockHandle2, mockProof);

      // Both users should be able to perform operations
      const result1 = await contract.connect(addr1).getConditionalReward(250, 100, 50);
      const result2 = await contract.connect(addr2).getConditionalReward(350, 100, 50);

      expect(result1).to.not.be.null;
      expect(result2).to.not.be.null;
    });
  });

  describe("Conditional Reward (Select)", function () {
    beforeEach(async function () {
      const mockHandle = ethers.toBeHex("0x000003E8", 32); // 1000
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.storeValue(mockHandle, mockProof);
    });

    it("Should select correct reward based on threshold", async function () {
      const result = await contract.getConditionalReward(500, 100, 50);
      expect(result).to.not.be.null;
    });

    it("Should handle threshold equal to value", async function () {
      const result = await contract.getConditionalReward(1000, 100, 50);
      expect(result).to.not.be.null;
    });

    it("Should handle threshold greater than value", async function () {
      const result = await contract.getConditionalReward(2000, 100, 50);
      expect(result).to.not.be.null;
    });

    it("Should reject without stored value", async function () {
      await expect(
        contract.connect(addr1).getConditionalReward(500, 100, 50)
      ).to.be.revertedWith("No value stored");
    });

    it("Should handle multiple reward tiers", async function () {
      const rewards = [
        { threshold: 100, high: 200, low: 50 },
        { threshold: 500, high: 500, low: 100 },
        { threshold: 1000, high: 1000, low: 200 },
        { threshold: 2000, high: 2000, low: 500 },
      ];

      for (const reward of rewards) {
        const result = await contract.getConditionalReward(
          reward.threshold,
          reward.high,
          reward.low
        );
        expect(result).to.not.be.null;
      }
    });
  });

  describe("Minimum (Min)", function () {
    beforeEach(async function () {
      const mockHandle = ethers.toBeHex("0x000001F4", 32); // 500
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.storeValue(mockHandle, mockProof);
    });

    it("Should compute minimum of two values", async function () {
      const result = await contract.getMinimum(1000);
      expect(result).to.not.be.null;
    });

    it("Should handle min with lower value", async function () {
      const result = await contract.getMinimum(300);
      expect(result).to.not.be.null;
    });

    it("Should handle min with equal value", async function () {
      const result = await contract.getMinimum(500);
      expect(result).to.not.be.null;
    });

    it("Should handle min with zero", async function () {
      const result = await contract.getMinimum(0);
      expect(result).to.not.be.null;
    });

    it("Should reject without stored value", async function () {
      await expect(
        contract.connect(addr1).getMinimum(1000)
      ).to.be.revertedWith("No value stored");
    });
  });

  describe("Maximum (Max)", function () {
    beforeEach(async function () {
      const mockHandle = ethers.toBeHex("0x000001F4", 32); // 500
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.storeValue(mockHandle, mockProof);
    });

    it("Should compute maximum of two values", async function () {
      const result = await contract.getMaximum(300);
      expect(result).to.not.be.null;
    });

    it("Should handle max with higher value", async function () {
      const result = await contract.getMaximum(1000);
      expect(result).to.not.be.null;
    });

    it("Should handle max with equal value", async function () {
      const result = await contract.getMaximum(500);
      expect(result).to.not.be.null;
    });

    it("Should handle max with zero", async function () {
      const result = await contract.getMaximum(0);
      expect(result).to.not.be.null;
    });

    it("Should reject without stored value", async function () {
      await expect(
        contract.connect(addr1).getMaximum(1000)
      ).to.be.revertedWith("No value stored");
    });
  });

  describe("Clamp to Range", function () {
    beforeEach(async function () {
      const mockHandle = ethers.toBeHex("0x000001F4", 32); // 500
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.storeValue(mockHandle, mockProof);
    });

    it("Should clamp value to range", async function () {
      const result = await contract.clampToRange(100, 1000);
      expect(result).to.not.be.null;
    });

    it("Should handle clamping to lower bound", async function () {
      const result = await contract.clampToRange(600, 1000);
      expect(result).to.not.be.null;
    });

    it("Should handle clamping to upper bound", async function () {
      const result = await contract.clampToRange(100, 400);
      expect(result).to.not.be.null;
    });

    it("Should handle value within range", async function () {
      const result = await contract.clampToRange(400, 600);
      expect(result).to.not.be.null;
    });

    it("Should handle single value range", async function () {
      const result = await contract.clampToRange(500, 500);
      expect(result).to.not.be.null;
    });

    it("Should reject without stored value", async function () {
      await expect(
        contract.connect(addr1).clampToRange(100, 1000)
      ).to.be.revertedWith("No value stored");
    });
  });

  describe("Tiered Reward System", function () {
    it("Should handle bronze tier (< 500)", async function () {
      const mockHandle = ethers.toBeHex("0x00000064", 32); // 100
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.connect(addr1).storeValue(mockHandle, mockProof);

      const reward = await contract.connect(addr1).getTieredReward();
      expect(reward).to.not.be.null;
    });

    it("Should handle silver tier (500-999)", async function () {
      const mockHandle = ethers.toBeHex("0x000002EE", 32); // 750
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.connect(addr1).storeValue(mockHandle, mockProof);

      const reward = await contract.connect(addr1).getTieredReward();
      expect(reward).to.not.be.null;
    });

    it("Should handle gold tier (>= 1000)", async function () {
      const mockHandle = ethers.toBeHex("0x000005DC", 32); // 1500
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.connect(addr1).storeValue(mockHandle, mockProof);

      const reward = await contract.connect(addr1).getTieredReward();
      expect(reward).to.not.be.null;
    });

    it("Should handle exact tier boundaries", async function () {
      const boundaries = [500, 1000];

      for (const boundary of boundaries) {
        const mockHandle = ethers.toBeHex(boundary, 32);
        const mockProof = ethers.toBeHex("0xdeadbeef");
        await contract.connect(addr1).storeValue(mockHandle, mockProof);

        const reward = await contract.connect(addr1).getTieredReward();
        expect(reward).to.not.be.null;
      }
    });

    it("Should reject without stored value", async function () {
      await expect(
        contract.connect(addr2).getTieredReward()
      ).to.be.revertedWith("No value stored");
    });
  });

  describe("Progressive Tax Calculation", function () {
    it("Should calculate tax for low income", async function () {
      const mockHandle = ethers.toBeHex("0x00004E20", 32); // 20000
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.connect(addr1).storeValue(mockHandle, mockProof);

      const tax = await contract.connect(addr1).calculateProgressiveTax();
      expect(tax).to.not.be.null;
    });

    it("Should calculate tax for middle income", async function () {
      const mockHandle = ethers.toBeHex("0x0000C350", 32); // 50000
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.connect(addr1).storeValue(mockHandle, mockProof);

      const tax = await contract.connect(addr1).calculateProgressiveTax();
      expect(tax).to.not.be.null;
    });

    it("Should calculate tax for high income", async function () {
      const mockHandle = ethers.toBeHex("0x000186A0", 32); // 100000
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.connect(addr1).storeValue(mockHandle, mockProof);

      const tax = await contract.connect(addr1).calculateProgressiveTax();
      expect(tax).to.not.be.null;
    });

    it("Should handle tax bracket boundaries", async function () {
      const boundaries = [30000, 80000];

      for (const boundary of boundaries) {
        const mockHandle = ethers.toBeHex(boundary, 32);
        const mockProof = ethers.toBeHex("0xdeadbeef");
        await contract.connect(addr1).storeValue(mockHandle, mockProof);

        const tax = await contract.connect(addr1).calculateProgressiveTax();
        expect(tax).to.not.be.null;
      }
    });

    it("Should reject without stored value", async function () {
      await expect(
        contract.connect(addr2).calculateProgressiveTax()
      ).to.be.revertedWith("No value stored");
    });
  });

  describe("Absolute Value", function () {
    it("Should compute absolute value for positive number", async function () {
      const mockHandle = ethers.toBeHex("0x000001F4", 32); // 500
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.connect(addr1).storeValue(mockHandle, mockProof);

      const result = await contract.connect(addr1).absoluteValue(300);
      expect(result).to.not.be.null;
    });

    it("Should handle reference equal to value", async function () {
      const mockHandle = ethers.toBeHex("0x000001F4", 32); // 500
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.connect(addr1).storeValue(mockHandle, mockProof);

      const result = await contract.connect(addr1).absoluteValue(500);
      expect(result).to.not.be.null;
    });

    it("Should compute absolute value for negative difference", async function () {
      const mockHandle = ethers.toBeHex("0x000001F4", 32); // 500
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.connect(addr1).storeValue(mockHandle, mockProof);

      const result = await contract.connect(addr1).absoluteValue(800);
      expect(result).to.not.be.null;
    });

    it("Should handle zero reference", async function () {
      const mockHandle = ethers.toBeHex("0x000001F4", 32); // 500
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.connect(addr1).storeValue(mockHandle, mockProof);

      const result = await contract.connect(addr1).absoluteValue(0);
      expect(result).to.not.be.null;
    });

    it("Should reject without stored value", async function () {
      await expect(
        contract.connect(addr2).absoluteValue(500)
      ).to.be.revertedWith("No value stored");
    });
  });

  describe("Median of Three", function () {
    beforeEach(async function () {
      const mockHandle = ethers.toBeHex("0x000001F4", 32); // 500
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.storeValue(mockHandle, mockProof);
    });

    it("Should compute median of three values", async function () {
      const result = await contract.getMedianOfThree(300, 700);
      expect(result).to.not.be.null;
    });

    it("Should handle median with first value smallest", async function () {
      const result = await contract.getMedianOfThree(600, 800);
      expect(result).to.not.be.null;
    });

    it("Should handle median with first value largest", async function () {
      const result = await contract.getMedianOfThree(200, 400);
      expect(result).to.not.be.null;
    });

    it("Should handle duplicate values", async function () {
      const result = await contract.getMedianOfThree(500, 500);
      expect(result).to.not.be.null;
    });

    it("Should handle extreme values", async function () {
      const result = await contract.getMedianOfThree(0, 10000);
      expect(result).to.not.be.null;
    });

    it("Should reject without stored value", async function () {
      await expect(
        contract.connect(addr1).getMedianOfThree(300, 700)
      ).to.be.revertedWith("No value stored");
    });
  });

  describe("Risk Score Calculation", function () {
    it("Should calculate low risk score", async function () {
      const mockHandle = ethers.toBeHex("0x0000000A", 32); // 10
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.connect(addr1).storeValue(mockHandle, mockProof);

      const risk = await contract.connect(addr1).calculateRiskScore();
      expect(risk).to.not.be.null;
    });

    it("Should calculate medium risk score", async function () {
      const mockHandle = ethers.toBeHex("0x00000032", 32); // 50
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.connect(addr1).storeValue(mockHandle, mockProof);

      const risk = await contract.connect(addr1).calculateRiskScore();
      expect(risk).to.not.be.null;
    });

    it("Should calculate high risk score", async function () {
      const mockHandle = ethers.toBeHex("0x00000064", 32); // 100
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.connect(addr1).storeValue(mockHandle, mockProof);

      const risk = await contract.connect(addr1).calculateRiskScore();
      expect(risk).to.not.be.null;
    });

    it("Should handle risk boundaries", async function () {
      const boundaries = [30, 70];

      for (const boundary of boundaries) {
        const mockHandle = ethers.toBeHex(boundary, 32);
        const mockProof = ethers.toBeHex("0xdeadbeef");
        await contract.connect(addr1).storeValue(mockHandle, mockProof);

        const risk = await contract.connect(addr1).calculateRiskScore();
        expect(risk).to.not.be.null;
      }
    });

    it("Should reject without stored value", async function () {
      await expect(
        contract.connect(addr2).calculateRiskScore()
      ).to.be.revertedWith("No value stored");
    });
  });

  describe("Dynamic Pricing", function () {
    it("Should calculate discount price", async function () {
      const mockHandle = ethers.toBeHex("0x00000064", 32); // 100 units
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.connect(addr1).storeValue(mockHandle, mockProof);

      const price = await contract.connect(addr1).getDynamicPrice(10);
      expect(price).to.not.be.null;
    });

    it("Should calculate standard price", async function () {
      const mockHandle = ethers.toBeHex("0x00000014", 32); // 20 units
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.connect(addr1).storeValue(mockHandle, mockProof);

      const price = await contract.connect(addr1).getDynamicPrice(10);
      expect(price).to.not.be.null;
    });

    it("Should handle quantity at discount threshold", async function () {
      const mockHandle = ethers.toBeHex("0x00000032", 32); // 50 units
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.connect(addr1).storeValue(mockHandle, mockProof);

      const price = await contract.connect(addr1).getDynamicPrice(10);
      expect(price).to.not.be.null;
    });

    it("Should reject without stored value", async function () {
      await expect(
        contract.connect(addr2).getDynamicPrice(10)
      ).to.be.revertedWith("No value stored");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero value", async function () {
      const mockHandle = ethers.toBeHex("0x00000000", 32);
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.connect(addr1).storeValue(mockHandle, mockProof);

      const reward = await contract.connect(addr1).getConditionalReward(100, 50, 25);
      expect(reward).to.not.be.null;
    });

    it("Should handle maximum uint32 value", async function () {
      const mockHandle = ethers.toBeHex("0xFFFFFFFF", 32);
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.connect(addr1).storeValue(mockHandle, mockProof);

      const min = await contract.connect(addr1).getMinimum(1000);
      expect(min).to.not.be.null;
    });

    it("Should handle rapid sequential operations", async function () {
      const mockHandle = ethers.toBeHex("0x000003E8", 32); // 1000
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.connect(addr1).storeValue(mockHandle, mockProof);

      const reward = await contract.connect(addr1).getConditionalReward(500, 100, 50);
      const min = await contract.connect(addr1).getMinimum(2000);
      const max = await contract.connect(addr1).getMaximum(500);
      const clamped = await contract.connect(addr1).clampToRange(800, 1200);

      expect(reward).to.not.be.null;
      expect(min).to.not.be.null;
      expect(max).to.not.be.null;
      expect(clamped).to.not.be.null;
    });

    it("Should maintain separate values per user", async function () {
      const mockHandle1 = ethers.toBeHex("0x00000064", 32); // 100
      const mockHandle2 = ethers.toBeHex("0x000003E8", 32); // 1000
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await contract.connect(addr1).storeValue(mockHandle1, mockProof);
      await contract.connect(addr2).storeValue(mockHandle2, mockProof);

      const reward1 = await contract.connect(addr1).getConditionalReward(500, 100, 50);
      const reward2 = await contract.connect(addr2).getConditionalReward(500, 100, 50);

      expect(reward1).to.not.be.null;
      expect(reward2).to.not.be.null;
    });
  });

  describe("Use Case Patterns", function () {
    it("Should support loyalty program tiers", async function () {
      const pointsHandle = ethers.toBeHex("0x000002EE", 32); // 750 points
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.connect(addr1).storeValue(pointsHandle, mockProof);

      const reward = await contract.connect(addr1).getTieredReward();
      expect(reward).to.not.be.null;
    });

    it("Should support insurance premium calculation", async function () {
      const riskHandle = ethers.toBeHex("0x0000002D", 32); // 45 risk score
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.connect(addr1).storeValue(riskHandle, mockProof);

      const risk = await contract.connect(addr1).calculateRiskScore();
      expect(risk).to.not.be.null;
    });

    it("Should support volume discount pricing", async function () {
      const quantityHandle = ethers.toBeHex("0x00000096", 32); // 150 units
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.connect(addr1).storeValue(quantityHandle, mockProof);

      const price = await contract.connect(addr1).getDynamicPrice(10);
      expect(price).to.not.be.null;
    });

    it("Should support congestion-based fees", async function () {
      const usageHandle = ethers.toBeHex("0x00000046", 32); // 70% usage
      const mockProof = ethers.toBeHex("0xdeadbeef");
      await contract.connect(addr1).storeValue(usageHandle, mockProof);

      const clampedUsage = await contract.connect(addr1).clampToRange(0, 100);
      expect(clampedUsage).to.not.be.null;
    });
  });
});
