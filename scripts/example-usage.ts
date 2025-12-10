/**
 * Example Usage Script: ConfidentialGamingScore
 *
 * This script demonstrates how to interact with the ConfidentialGamingScore contract
 * for both testing and production environments.
 *
 * Usage:
 *   npx hardhat run scripts/example-usage.ts --network hardhat
 *   npx hardhat run scripts/example-usage.ts --network zama
 */

import { ethers } from "hardhat";
import { ConfidentialGamingScore } from "../typechain-types";

/**
 * Main example workflow demonstrating:
 * - Contract deployment
 * - Player registration
 * - Score submission
 * - Achievement creation
 * - Network statistics
 */
async function main() {
  console.log("\n========================================");
  console.log("ConfidentialGamingScore - Example Usage");
  console.log("========================================\n");

  // ==================== Setup ====================

  console.log("Step 1: Getting signers...");
  const [deployer, player1, player2, player3] = await ethers.getSigners();

  console.log(`  Deployer: ${deployer.address}`);
  console.log(`  Player 1: ${player1.address}`);
  console.log(`  Player 2: ${player2.address}`);
  console.log(`  Player 3: ${player3.address}\n`);

  // ==================== Deployment ====================

  console.log("Step 2: Deploying contract...");
  const ConfidentialGamingScore = await ethers.getContractFactory(
    "ConfidentialGamingScore"
  );
  const contract: ConfidentialGamingScore =
    await ConfidentialGamingScore.deploy();
  const address = await contract.getAddress();
  console.log(`  ✅ Contract deployed to: ${address}\n`);

  // ==================== Initialization ====================

  console.log("Step 3: Checking initial state...");
  const initialPlayers = await contract.getTotalPlayers();
  const contractInfo = await contract.getContractInfo();
  const minThreshold = await contract.getMinScoreThreshold();

  console.log(`  Total Players: ${initialPlayers}`);
  console.log(`  Contract Info: ${contractInfo}`);
  console.log(`  Min Score Threshold: ${minThreshold}\n`);

  // ==================== Registration ====================

  console.log("Step 4: Registering players...");
  const registerTx1 = await contract.connect(player1).registerPlayer();
  await registerTx1.wait();
  console.log(`  ✅ Player 1 registered`);

  const registerTx2 = await contract.connect(player2).registerPlayer();
  await registerTx2.wait();
  console.log(`  ✅ Player 2 registered`);

  const registerTx3 = await contract.connect(player3).registerPlayer();
  await registerTx3.wait();
  console.log(`  ✅ Player 3 registered\n`);

  // Verify registration
  console.log("Step 5: Verifying registrations...");
  const isPlayer1Registered = await contract.isPlayerRegistered(player1.address);
  const isPlayer2Registered = await contract.isPlayerRegistered(player2.address);
  const isPlayer3Registered = await contract.isPlayerRegistered(player3.address);

  console.log(`  Player 1 Registered: ${isPlayer1Registered}`);
  console.log(`  Player 2 Registered: ${isPlayer2Registered}`);
  console.log(`  Player 3 Registered: ${isPlayer3Registered}\n`);

  // Get registry
  const registry = await contract.getPlayerRegistry();
  console.log(`Step 6: Player registry contains ${registry.length} addresses\n`);

  // ==================== Score Submission ====================

  console.log("Step 7: Submitting encrypted scores...");
  console.log("  Note: In production, scores would be encrypted by FHE client\n");

  // Create mock encrypted scores (in real app, use fhevmjs library)
  const mockScore1 = ethers.toBeHex(1500, 32);
  const mockScore2 = ethers.toBeHex(2000, 32);
  const mockScore3 = ethers.toBeHex(1200, 32);
  const mockProof = "0x" + "00".repeat(32);

  console.log("  Submitting Player 1 score (1500 points)...");
  const submitTx1 = await contract
    .connect(player1)
    .submitScore(mockScore1, mockProof);
  await submitTx1.wait();
  console.log(`    ✅ Score submitted`);

  console.log("  Submitting Player 2 score (2000 points)...");
  const submitTx2 = await contract
    .connect(player2)
    .submitScore(mockScore2, mockProof);
  await submitTx2.wait();
  console.log(`    ✅ Score submitted`);

  console.log("  Submitting Player 3 score (1200 points)...");
  const submitTx3 = await contract
    .connect(player3)
    .submitScore(mockScore3, mockProof);
  await submitTx3.wait();
  console.log(`    ✅ Score submitted\n`);

  // ==================== Network Statistics ====================

  console.log("Step 8: Checking network statistics...");
  const totalPlayers = await contract.getTotalPlayers();
  console.log(`  Total Players with Scores: ${totalPlayers}`);
  console.log(`  All players submitted: ${totalPlayers === 3}\n`);

  // ==================== Score Verification ====================

  console.log("Step 9: Verifying score submissions...");
  const hasScore1 = await contract.hasPlayerSubmitted(player1.address);
  const hasScore2 = await contract.hasPlayerSubmitted(player2.address);
  const hasScore3 = await contract.hasPlayerSubmitted(player3.address);

  console.log(`  Player 1 Has Score: ${hasScore1}`);
  console.log(`  Player 2 Has Score: ${hasScore2}`);
  console.log(`  Player 3 Has Score: ${hasScore3}\n`);

  // ==================== Achievement System ====================

  console.log("Step 10: Creating achievements...");

  const createAchievementTx1 = await contract
    .connect(deployer)
    .createAchievement("Bronze Player", 1000);
  await createAchievementTx1.wait();
  console.log(`  ✅ Achievement 1 Created: 'Bronze Player' (1000 points)`);

  const createAchievementTx2 = await contract
    .connect(deployer)
    .createAchievement("Silver Player", 1500);
  await createAchievementTx2.wait();
  console.log(`  ✅ Achievement 2 Created: 'Silver Player' (1500 points)`);

  const createAchievementTx3 = await contract
    .connect(deployer)
    .createAchievement("Gold Player", 2000);
  await createAchievementTx3.wait();
  console.log(`  ✅ Achievement 3 Created: 'Gold Player' (2000 points)\n`);

  // Get achievement details
  console.log("Step 11: Retrieving achievement details...");
  const achievement1 = await contract.getAchievement(0);
  const achievement2 = await contract.getAchievement(1);
  const achievement3 = await contract.getAchievement(2);

  console.log(`  Achievement 1: "${achievement1.title}" - ${achievement1.requiredScore} points`);
  console.log(`  Achievement 2: "${achievement2.title}" - ${achievement2.requiredScore} points`);
  console.log(`  Achievement 3: "${achievement3.title}" - ${achievement3.requiredScore} points\n`);

  // ==================== Encrypted Queries ====================

  console.log("Step 12: Performing encrypted queries...");
  console.log(
    "  Note: These queries return encrypted results\n"
  );

  // Player 1 checks if they meet achievement threshold
  console.log("  Player 1 checking if score >= 1000...");
  const meetsThreshold1 = await contract
    .connect(player1)
    .meetsAchievementThreshold(1000);
  console.log(`    ✅ Query executed (encrypted result)`);

  console.log("  Player 2 checking if score >= 2000...");
  const meetsThreshold2 = await contract
    .connect(player2)
    .meetsAchievementThreshold(2000);
  console.log(`    ✅ Query executed (encrypted result)`);

  // Score comparison
  console.log("\n  Player 1 comparing score with Player 2...");
  const comparisonResult = await contract
    .connect(player1)
    .isScoreHigherThan(player2.address);
  console.log(`    ✅ Comparison executed (encrypted result)\n`);

  // ==================== Score Viewing ====================

  console.log("Step 13: Viewing encrypted scores...");
  console.log(
    "  Note: Encrypted scores require client-side FHE decryption\n"
  );

  console.log("  Player 1 viewing their encrypted score...");
  const encryptedScore1 = await contract.connect(player1).getMyScore();
  console.log(`    ✅ Encrypted score retrieved (requires FHE client to decrypt)`);

  console.log("  Player 1 viewing their encrypted timestamp...");
  const encryptedTimestamp1 = await contract
    .connect(player1)
    .getMyTimestamp();
  console.log(`    ✅ Encrypted timestamp retrieved\n`);

  // ==================== Leaderboard ====================

  console.log("Step 14: Getting approximate leaderboard positions...");
  console.log(
    "  Note: Leaderboard positions are encrypted\n"
  );

  const position1 = await contract
    .connect(player1)
    .getApproximateLeaderboardPosition();
  console.log(`  ✅ Player 1 position retrieved (encrypted)`);

  const position2 = await contract
    .connect(player2)
    .getApproximateLeaderboardPosition();
  console.log(`  ✅ Player 2 position retrieved (encrypted)`);

  const position3 = await contract
    .connect(player3)
    .getApproximateLeaderboardPosition();
  console.log(`  ✅ Player 3 position retrieved (encrypted)\n`);

  // ==================== Score Update ====================

  console.log("Step 15: Updating a player's score...");
  const newScore = ethers.toBeHex(2500, 32);
  const updateTx = await contract
    .connect(player1)
    .submitScore(newScore, mockProof);
  await updateTx.wait();
  console.log(`  ✅ Player 1 score updated to 2500 points`);
  console.log(`  Total Players remains: ${await contract.getTotalPlayers()}\n`);

  // ==================== Score Reset ====================

  console.log("Step 16: Resetting a player's score...");
  const initialCountBeforeReset = await contract.getTotalPlayers();
  console.log(`  Initial count: ${initialCountBeforeReset}`);

  const resetTx = await contract.connect(player3).resetMyScore();
  await resetTx.wait();
  console.log(`  ✅ Player 3 score reset`);

  const countAfterReset = await contract.getTotalPlayers();
  console.log(`  Count after reset: ${countAfterReset}`);
  console.log(`  Count decreased: ${countAfterReset.lt(initialCountBeforeReset)}\n`);

  // ==================== Resubmission ====================

  console.log("Step 17: Player 3 resubmitting score...");
  const resubmitTx = await contract
    .connect(player3)
    .submitScore(mockScore3, mockProof);
  await resubmitTx.wait();
  console.log(`  ✅ Player 3 resubmitted score`);

  const hasScoreAgain = await contract.hasPlayerSubmitted(player3.address);
  console.log(`  Player 3 Has Score Again: ${hasScoreAgain}\n`);

  // ==================== Final State ====================

  console.log("Step 18: Final contract state...");
  const finalPlayers = await contract.getTotalPlayers();
  const finalRegistry = await contract.getPlayerRegistry();

  console.log(`  Final Total Players: ${finalPlayers}`);
  console.log(`  Registry Count: ${finalRegistry.length}`);
  console.log(`  Min Threshold: ${await contract.getMinScoreThreshold()}\n`);

  // ==================== Summary ====================

  console.log("========================================");
  console.log("Example Execution Complete!");
  console.log("========================================\n");

  console.log("Key Concepts Demonstrated:");
  console.log("✅ Player registration");
  console.log("✅ Encrypted score submission");
  console.log("✅ Achievement system");
  console.log("✅ Network statistics");
  console.log("✅ Encrypted comparisons");
  console.log("✅ Encrypted queries");
  console.log("✅ Score updates");
  console.log("✅ Score reset and resubmission");
  console.log("✅ FHE permission system");
  console.log("✅ Privacy preservation\n");

  console.log("Next Steps:");
  console.log("1. Review the test suite: test/ConfidentialGamingScore.ts");
  console.log("2. Check contract implementation: contracts/ConfidentialGamingScore.sol");
  console.log("3. Integrate with FHE client library (fhevmjs)");
  console.log("4. Deploy to Zama FHEVM network");
  console.log("5. Build frontend UI for players\n");
}

// Execute main function
main().catch((error) => {
  console.error("Script failed:", error);
  process.exitCode = 1;
});
