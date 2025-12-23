import { expect } from "chai";
import { ethers } from "hardhat";
import { PublicDecryptMultipleValues } from "../../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("PublicDecryptMultipleValues", function () {
  let contract: PublicDecryptMultipleValues;
  let owner: any;
  let addr1: any;
  let addr2: any;
  let addr3: any;

  before(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    const PublicDecryptMultipleValues = await ethers.getContractFactory(
      "PublicDecryptMultipleValues"
    );
    contract = await PublicDecryptMultipleValues.deploy();
    await contract.waitForDeployment();
  });

  describe("Store Stats", function () {
    it("Should store encrypted game statistics", async function () {
      const scoreHandle = ethers.toBeHex("0x1000", 32);
      const levelHandle = ethers.toBeHex("0x0050", 16);
      const achievementsHandle = ethers.toBeHex("0x0A", 8);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await expect(
        contract.storeStats(
          scoreHandle,
          mockProof,
          levelHandle,
          mockProof,
          achievementsHandle,
          mockProof
        )
      ).to.emit(contract, "StatsStored");
    });

    it("Should prevent storing after game ended", async function () {
      await contract.endGame();

      const scoreHandle = ethers.toBeHex("0x1000", 32);
      const levelHandle = ethers.toBeHex("0x0050", 16);
      const achievementsHandle = ethers.toBeHex("0x0A", 8);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await expect(
        contract.storeStats(
          scoreHandle,
          mockProof,
          levelHandle,
          mockProof,
          achievementsHandle,
          mockProof
        )
      ).to.be.revertedWith("Game has ended");
    });
  });

  describe("Game State Management", function () {
    let gameContract: PublicDecryptMultipleValues;

    beforeEach(async function () {
      const PublicDecryptMultipleValues = await ethers.getContractFactory(
        "PublicDecryptMultipleValues"
      );
      gameContract = await PublicDecryptMultipleValues.deploy();
      await gameContract.waitForDeployment();
    });

    it("Should allow owner to end game", async function () {
      await expect(gameContract.endGame()).to.emit(gameContract, "GameEnded");

      const gameEnded = await gameContract.gameEnded();
      expect(gameEnded).to.be.true;
    });

    it("Should prevent non-owner from ending game", async function () {
      await expect(
        gameContract.connect(addr1).endGame()
      ).to.be.revertedWith("Only owner can end game");
    });

    it("Should prevent ending game twice", async function () {
      await gameContract.endGame();

      await expect(gameContract.endGame()).to.be.revertedWith(
        "Game already ended"
      );
    });

    it("Should track game end time", async function () {
      const beforeTime = await time.latest();
      await gameContract.endGame();
      const afterTime = await time.latest();

      const gameEndTime = await gameContract.gameEndTime();
      expect(gameEndTime).to.be.at.least(beforeTime);
      expect(gameEndTime).to.be.at.most(afterTime);
    });
  });

  describe("Reveal Stats", function () {
    let gameContract: PublicDecryptMultipleValues;

    beforeEach(async function () {
      const PublicDecryptMultipleValues = await ethers.getContractFactory(
        "PublicDecryptMultipleValues"
      );
      gameContract = await PublicDecryptMultipleValues.deploy();
      await gameContract.waitForDeployment();

      // Store stats for player
      const scoreHandle = ethers.toBeHex("0x1000", 32);
      const levelHandle = ethers.toBeHex("0x0050", 16);
      const achievementsHandle = ethers.toBeHex("0x0A", 8);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await gameContract.storeStats(
        scoreHandle,
        mockProof,
        levelHandle,
        mockProof,
        achievementsHandle,
        mockProof
      );

      // End game
      await gameContract.endGame();
    });

    it("Should reveal stats after game ends", async function () {
      await expect(gameContract.revealStats()).to.emit(
        gameContract,
        "StatsRevealed"
      );
    });

    it("Should prevent reveal before game ends", async function () {
      const PublicDecryptMultipleValues = await ethers.getContractFactory(
        "PublicDecryptMultipleValues"
      );
      const newContract = await PublicDecryptMultipleValues.deploy();
      await newContract.waitForDeployment();

      const scoreHandle = ethers.toBeHex("0x1000", 32);
      const levelHandle = ethers.toBeHex("0x0050", 16);
      const achievementsHandle = ethers.toBeHex("0x0A", 8);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await newContract.storeStats(
        scoreHandle,
        mockProof,
        levelHandle,
        mockProof,
        achievementsHandle,
        mockProof
      );

      // Game not ended
      await expect(newContract.revealStats()).to.be.revertedWith(
        "Game not ended yet"
      );
    });

    it("Should prevent double revelation", async function () {
      await gameContract.revealStats();

      await expect(gameContract.revealStats()).to.be.revertedWith(
        "Already revealed"
      );
    });

    it("Should reject reveal without stored stats", async function () {
      await expect(
        gameContract.connect(addr1).revealStats()
      ).to.be.revertedWith("No stats stored");
    });
  });

  describe("Get Public Stats", function () {
    let gameContract: PublicDecryptMultipleValues;

    beforeEach(async function () {
      const PublicDecryptMultipleValues = await ethers.getContractFactory(
        "PublicDecryptMultipleValues"
      );
      gameContract = await PublicDecryptMultipleValues.deploy();
      await gameContract.waitForDeployment();

      const scoreHandle = ethers.toBeHex("0x2000", 32);
      const levelHandle = ethers.toBeHex("0x0064", 16);
      const achievementsHandle = ethers.toBeHex("0x14", 8);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await gameContract.storeStats(
        scoreHandle,
        mockProof,
        levelHandle,
        mockProof,
        achievementsHandle,
        mockProof
      );
      await gameContract.endGame();
      await gameContract.revealStats();
    });

    it("Should retrieve publicly revealed stats", async function () {
      const stats = await gameContract.getPublicStats(owner.address);
      expect(stats).to.be.an("array");
      expect(stats.length).to.equal(3);
    });

    it("Should allow anyone to read revealed stats", async function () {
      const stats = await gameContract
        .connect(addr1)
        .getPublicStats(owner.address);
      expect(stats).to.be.an("array");
    });

    it("Should reject reading unrevealed stats", async function () {
      await expect(
        gameContract.getPublicStats(addr1.address)
      ).to.be.revertedWith("Stats not revealed");
    });
  });

  describe("Get Encrypted Stats", function () {
    let gameContract: PublicDecryptMultipleValues;

    beforeEach(async function () {
      const PublicDecryptMultipleValues = await ethers.getContractFactory(
        "PublicDecryptMultipleValues"
      );
      gameContract = await PublicDecryptMultipleValues.deploy();
      await gameContract.waitForDeployment();

      const scoreHandle = ethers.toBeHex("0x1500", 32);
      const levelHandle = ethers.toBeHex("0x003C", 16);
      const achievementsHandle = ethers.toBeHex("0x05", 8);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await gameContract.storeStats(
        scoreHandle,
        mockProof,
        levelHandle,
        mockProof,
        achievementsHandle,
        mockProof
      );
    });

    it("Should retrieve encrypted stats", async function () {
      const stats = await gameContract.getEncryptedStats();
      expect(stats).to.be.an("array");
      expect(stats.length).to.equal(3);
    });

    it("Should reject retrieval without stats", async function () {
      await expect(
        gameContract.connect(addr1).getEncryptedStats()
      ).to.be.revertedWith("No stats stored");
    });
  });

  describe("Revelation Status", function () {
    let gameContract: PublicDecryptMultipleValues;

    beforeEach(async function () {
      const PublicDecryptMultipleValues = await ethers.getContractFactory(
        "PublicDecryptMultipleValues"
      );
      gameContract = await PublicDecryptMultipleValues.deploy();
      await gameContract.waitForDeployment();

      const scoreHandle = ethers.toBeHex("0x1000", 32);
      const levelHandle = ethers.toBeHex("0x0050", 16);
      const achievementsHandle = ethers.toBeHex("0x0A", 8);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await gameContract.connect(addr1).storeStats(
        scoreHandle,
        mockProof,
        levelHandle,
        mockProof,
        achievementsHandle,
        mockProof
      );
      await gameContract.endGame();
    });

    it("Should return false before revelation", async function () {
      const hasRevealed = await gameContract.hasRevealed(addr1.address);
      expect(hasRevealed).to.be.false;
    });

    it("Should return true after revelation", async function () {
      await gameContract.connect(addr1).revealStats();

      const hasRevealed = await gameContract.hasRevealed(addr1.address);
      expect(hasRevealed).to.be.true;
    });

    it("Should return false for users without stats", async function () {
      const hasRevealed = await gameContract.hasRevealed(addr2.address);
      expect(hasRevealed).to.be.false;
    });
  });

  describe("Calculate Total Score", function () {
    let gameContract: PublicDecryptMultipleValues;

    beforeEach(async function () {
      const PublicDecryptMultipleValues = await ethers.getContractFactory(
        "PublicDecryptMultipleValues"
      );
      gameContract = await PublicDecryptMultipleValues.deploy();
      await gameContract.waitForDeployment();

      const scoreHandle = ethers.toBeHex("0x1000", 32);
      const levelHandle = ethers.toBeHex("0x0050", 16);
      const achievementsHandle = ethers.toBeHex("0x0A", 8);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await gameContract.storeStats(
        scoreHandle,
        mockProof,
        levelHandle,
        mockProof,
        achievementsHandle,
        mockProof
      );
    });

    it("Should compute encrypted total score", async function () {
      const totalScore = await gameContract.calculateTotalScore();
      expect(totalScore).to.not.be.null;
    });

    it("Should reject calculation without stats", async function () {
      await expect(
        gameContract.connect(addr1).calculateTotalScore()
      ).to.be.revertedWith("No stats stored");
    });
  });

  describe("Batch Reveal", function () {
    let gameContract: PublicDecryptMultipleValues;
    const players: any[] = [];

    beforeEach(async function () {
      const PublicDecryptMultipleValues = await ethers.getContractFactory(
        "PublicDecryptMultipleValues"
      );
      gameContract = await PublicDecryptMultipleValues.deploy();
      await gameContract.waitForDeployment();

      players.push(addr1, addr2, addr3);

      // Store stats for multiple players
      for (const player of players) {
        const scoreHandle = ethers.toBeHex("0x1000", 32);
        const levelHandle = ethers.toBeHex("0x0050", 16);
        const achievementsHandle = ethers.toBeHex("0x0A", 8);
        const mockProof = ethers.toBeHex("0xdeadbeef");

        await gameContract.connect(player).storeStats(
          scoreHandle,
          mockProof,
          levelHandle,
          mockProof,
          achievementsHandle,
          mockProof
        );
      }

      // End game
      await gameContract.endGame();
    });

    it("Should batch reveal multiple players", async function () {
      const playerAddresses = players.map((p) => p.address);

      // Batch reveal should complete without error
      await gameContract.batchReveal(playerAddresses);

      // Verify all were revealed
      for (const address of playerAddresses) {
        const hasRevealed = await gameContract.hasRevealed(address);
        expect(hasRevealed).to.be.true;
      }
    });

    it("Should prevent non-owner from batch reveal", async function () {
      const playerAddresses = players.map((p) => p.address);

      await expect(
        gameContract.connect(addr1).batchReveal(playerAddresses)
      ).to.be.revertedWith("Only owner");
    });

    it("Should prevent batch reveal before game ends", async function () {
      const PublicDecryptMultipleValues = await ethers.getContractFactory(
        "PublicDecryptMultipleValues"
      );
      const newContract = await PublicDecryptMultipleValues.deploy();
      await newContract.waitForDeployment();

      const scoreHandle = ethers.toBeHex("0x1000", 32);
      const levelHandle = ethers.toBeHex("0x0050", 16);
      const achievementsHandle = ethers.toBeHex("0x0A", 8);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await newContract.connect(addr1).storeStats(
        scoreHandle,
        mockProof,
        levelHandle,
        mockProof,
        achievementsHandle,
        mockProof
      );

      await expect(
        newContract.batchReveal([addr1.address])
      ).to.be.revertedWith("Game not ended");
    });

    it("Should handle empty player list", async function () {
      await gameContract.batchReveal([]);
      expect(true).to.be.true;
    });

    it("Should handle single player batch", async function () {
      await gameContract.batchReveal([addr1.address]);

      const hasRevealed = await gameContract.hasRevealed(addr1.address);
      expect(hasRevealed).to.be.true;
    });

    it("Should skip already revealed players", async function () {
      // Reveal addr1 manually
      await gameContract.connect(addr1).revealStats();

      // Batch reveal including addr1 (should skip)
      const playerAddresses = players.map((p) => p.address);
      await gameContract.batchReveal(playerAddresses);

      // All should be revealed
      for (const address of playerAddresses) {
        const hasRevealed = await gameContract.hasRevealed(address);
        expect(hasRevealed).to.be.true;
      }
    });
  });

  describe("Tournament Leaderboard Pattern", function () {
    let gameContract: PublicDecryptMultipleValues;

    beforeEach(async function () {
      const PublicDecryptMultipleValues = await ethers.getContractFactory(
        "PublicDecryptMultipleValues"
      );
      gameContract = await PublicDecryptMultipleValues.deploy();
      await gameContract.waitForDeployment();

      // Store different scores for players
      const players = [
        { signer: addr1, score: 0x2710 }, // 10000
        { signer: addr2, score: 0x1388 }, // 5000
        { signer: addr3, score: 0x0FA0 }, // 4000
      ];

      const mockProof = ethers.toBeHex("0xdeadbeef");
      const levelHandle = ethers.toBeHex("0x0050", 16);
      const achievementsHandle = ethers.toBeHex("0x0A", 8);

      for (const player of players) {
        const scoreHandle = ethers.toBeHex(player.score, 32);

        await gameContract.connect(player.signer).storeStats(
          scoreHandle,
          mockProof,
          levelHandle,
          mockProof,
          achievementsHandle,
          mockProof
        );
      }

      await gameContract.endGame();
    });

    it("Should support final leaderboard generation", async function () {
      const playerAddresses = [addr1.address, addr2.address, addr3.address];

      // Batch reveal all players
      await gameContract.batchReveal(playerAddresses);

      // Verify leaderboard is ready
      for (const address of playerAddresses) {
        const hasRevealed = await gameContract.hasRevealed(address);
        expect(hasRevealed).to.be.true;

        const stats = await gameContract.getPublicStats(address);
        expect(stats).to.be.an("array");
      }
    });
  });

  describe("Edge Cases", function () {
    let gameContract: PublicDecryptMultipleValues;

    beforeEach(async function () {
      const PublicDecryptMultipleValues = await ethers.getContractFactory(
        "PublicDecryptMultipleValues"
      );
      gameContract = await PublicDecryptMultipleValues.deploy();
      await gameContract.waitForDeployment();
    });

    it("Should handle zero values in stats", async function () {
      const scoreHandle = ethers.toBeHex("0x0000", 32);
      const levelHandle = ethers.toBeHex("0x0000", 16);
      const achievementsHandle = ethers.toBeHex("0x00", 8);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await gameContract.storeStats(
        scoreHandle,
        mockProof,
        levelHandle,
        mockProof,
        achievementsHandle,
        mockProof
      );

      await gameContract.endGame();
      await gameContract.revealStats();

      const stats = await gameContract.getPublicStats(owner.address);
      expect(stats).to.be.an("array");
    });

    it("Should handle maximum values in stats", async function () {
      const scoreHandle = ethers.toBeHex("0xFFFFFFFF", 32);
      const levelHandle = ethers.toBeHex("0xFFFF", 16);
      const achievementsHandle = ethers.toBeHex("0xFF", 8);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await gameContract.storeStats(
        scoreHandle,
        mockProof,
        levelHandle,
        mockProof,
        achievementsHandle,
        mockProof
      );

      await gameContract.endGame();
      await gameContract.revealStats();

      const stats = await gameContract.getPublicStats(owner.address);
      expect(stats).to.be.an("array");
    });

    it("Should maintain multiple independent player records", async function () {
      const mockProof = ethers.toBeHex("0xdeadbeef");

      // Store stats for multiple players
      for (const player of [addr1, addr2, addr3]) {
        const scoreHandle = ethers.toBeHex("0x1000", 32);
        const levelHandle = ethers.toBeHex("0x0050", 16);
        const achievementsHandle = ethers.toBeHex("0x0A", 8);

        await gameContract.connect(player).storeStats(
          scoreHandle,
          mockProof,
          levelHandle,
          mockProof,
          achievementsHandle,
          mockProof
        );
      }

      await gameContract.endGame();

      // Reveal selectively
      await gameContract.connect(addr1).revealStats();
      await gameContract.connect(addr2).revealStats();

      // Only addr1 and addr2 are revealed
      expect(await gameContract.hasRevealed(addr1.address)).to.be.true;
      expect(await gameContract.hasRevealed(addr2.address)).to.be.true;
      expect(await gameContract.hasRevealed(addr3.address)).to.be.false;
    });
  });
});
