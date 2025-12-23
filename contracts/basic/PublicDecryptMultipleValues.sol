// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint32, euint16, euint8, inEuint32, inEuint16, inEuint8 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title PublicDecryptMultipleValues
 * @notice Demonstrates public decryption of multiple encrypted values
 * @dev Shows batch revelation patterns for end-of-process scenarios
 *
 * ⚠️  WARNING: Public decryption exposes ALL data to everyone!
 * Only use when results SHOULD be publicly visible.
 */
contract PublicDecryptMultipleValues is ZamaEthereumConfig {
    /**
     * @dev Game statistics structure with encrypted values
     */
    struct GameStats {
        euint32 score;
        euint16 level;
        euint8 achievements;
        bool initialized;
    }

    /**
     * @dev Publicly revealed game statistics
     */
    struct PublicGameStats {
        uint32 score;
        uint16 level;
        uint8 achievements;
        bool revealed;
    }

    // Private encrypted stats
    mapping(address => GameStats) private encryptedStats;

    // Public revealed stats
    mapping(address => PublicGameStats) public publicStats;

    // Game state
    bool public gameEnded;
    uint256 public gameEndTime;
    address public gameOwner;

    // Events
    event StatsStored(address indexed player, uint256 timestamp);
    event StatsRevealed(
        address indexed player,
        uint32 score,
        uint16 level,
        uint8 achievements,
        uint256 timestamp
    );
    event GameEnded(uint256 timestamp);

    constructor() {
        gameOwner = msg.sender;
        gameEnded = false;
    }

    /**
     * @notice Store encrypted game statistics
     * @dev Stats remain private until game ends
     *
     * @param scoreInput Encrypted score
     * @param scoreProof Proof for score
     * @param levelInput Encrypted level
     * @param levelProof Proof for level
     * @param achievementsInput Encrypted achievements count
     * @param achievementsProof Proof for achievements
     */
    function storeStats(
        inEuint32 calldata scoreInput,
        bytes calldata scoreProof,
        inEuint16 calldata levelInput,
        bytes calldata levelProof,
        inEuint8 calldata achievementsInput,
        bytes calldata achievementsProof
    ) external {
        require(!gameEnded, "Game has ended");

        // Convert all inputs
        euint32 score = FHE.asEuint32(scoreInput, scoreProof);
        euint16 level = FHE.asEuint16(levelInput, levelProof);
        euint8 achievements = FHE.asEuint8(achievementsInput, achievementsProof);

        // Store encrypted
        encryptedStats[msg.sender] = GameStats({
            score: score,
            level: level,
            achievements: achievements,
            initialized: true
        });

        // Grant permissions
        FHE.allowThis(score);
        FHE.allow(score, msg.sender);

        FHE.allowThis(level);
        FHE.allow(level, msg.sender);

        FHE.allowThis(achievements);
        FHE.allow(achievements, msg.sender);

        emit StatsStored(msg.sender, block.timestamp);
    }

    /**
     * @notice End the game (only owner)
     * @dev After this, players can reveal their stats
     */
    function endGame() external {
        require(msg.sender == gameOwner, "Only owner can end game");
        require(!gameEnded, "Game already ended");

        gameEnded = true;
        gameEndTime = block.timestamp;

        emit GameEnded(block.timestamp);
    }

    /**
     * @notice Reveal all game statistics publicly
     * @dev ⚠️  EXPOSES ALL STATS TO EVERYONE!
     *      Only allowed after game ends.
     *
     * PATTERN: Batch revelation after deadline
     *
     * USE CASES:
     * - Final leaderboard generation
     * - Tournament results
     * - Competition standings
     * - Game over statistics
     */
    function revealStats() external {
        require(gameEnded, "Game not ended yet");
        require(encryptedStats[msg.sender].initialized, "No stats stored");
        require(!publicStats[msg.sender].revealed, "Already revealed");

        GameStats memory stats = encryptedStats[msg.sender];

        // ⚠️  DECRYPT ALL VALUES - EXPOSES TO EVERYONE!
        uint32 revealedScore = FHE.decrypt(stats.score);
        uint16 revealedLevel = FHE.decrypt(stats.level);
        uint8 revealedAchievements = FHE.decrypt(stats.achievements);

        // Store publicly
        publicStats[msg.sender] = PublicGameStats({
            score: revealedScore,
            level: revealedLevel,
            achievements: revealedAchievements,
            revealed: true
        });

        emit StatsRevealed(
            msg.sender,
            revealedScore,
            revealedLevel,
            revealedAchievements,
            block.timestamp
        );
    }

    /**
     * @notice Get publicly revealed stats for any player
     * @dev Anyone can call this after player reveals
     *
     * @param player Address to query
     * @return score Player's score
     * @return level Player's level
     * @return achievements Player's achievements count
     */
    function getPublicStats(address player)
        external
        view
        returns (uint32 score, uint16 level, uint8 achievements)
    {
        require(publicStats[player].revealed, "Stats not revealed");
        PublicGameStats memory stats = publicStats[player];
        return (stats.score, stats.level, stats.achievements);
    }

    /**
     * @notice Get encrypted stats (for owner only, before revelation)
     * @dev Returns encrypted values that only owner can decrypt
     *
     * @return score Encrypted score
     * @return level Encrypted level
     * @return achievements Encrypted achievements
     */
    function getEncryptedStats()
        external
        view
        returns (euint32 score, euint16 level, euint8 achievements)
    {
        require(encryptedStats[msg.sender].initialized, "No stats stored");
        GameStats memory stats = encryptedStats[msg.sender];
        return (stats.score, stats.level, stats.achievements);
    }

    /**
     * @notice Check if player has revealed their stats
     * @param player Address to check
     * @return True if stats are publicly visible
     */
    function hasRevealed(address player) external view returns (bool) {
        return publicStats[player].revealed;
    }

    /**
     * @notice Calculate total score across all stats (encrypted)
     * @dev Result remains encrypted until decrypted
     *
     * @return Total encrypted score
     */
    function calculateTotalScore() external view returns (euint32) {
        require(encryptedStats[msg.sender].initialized, "No stats stored");

        GameStats memory stats = encryptedStats[msg.sender];

        // Convert all to euint32 and sum
        euint32 levelAs32 = FHE.asEuint32(stats.level);
        euint32 achievementsAs32 = FHE.asEuint32(stats.achievements);

        euint32 total = FHE.add(stats.score, levelAs32);
        total = FHE.add(total, achievementsAs32);

        return total;
    }

    /**
     * @notice Batch reveal for multiple players (owner only)
     * @dev Owner can trigger revelation for all players
     *
     * ⚠️  HIGH GAS COST for large player counts!
     *
     * @param players Array of player addresses to reveal
     */
    function batchReveal(address[] calldata players) external {
        require(msg.sender == gameOwner, "Only owner");
        require(gameEnded, "Game not ended");

        for (uint256 i = 0; i < players.length; i++) {
            address player = players[i];

            if (
                encryptedStats[player].initialized &&
                !publicStats[player].revealed
            ) {
                GameStats memory stats = encryptedStats[player];

                uint32 score = FHE.decrypt(stats.score);
                uint16 level = FHE.decrypt(stats.level);
                uint8 achievements = FHE.decrypt(stats.achievements);

                publicStats[player] = PublicGameStats({
                    score: score,
                    level: level,
                    achievements: achievements,
                    revealed: true
                });

                emit StatsRevealed(player, score, level, achievements, block.timestamp);
            }
        }
    }
}

/**
 * @dev BATCH PUBLIC DECRYPTION PATTERNS
 *
 * ============================================================================
 * USE CASE 1: TOURNAMENT LEADERBOARD
 * ============================================================================
 *
 * Scenario: Gaming tournament with encrypted scores during play
 *
 * ```solidity
 * contract Tournament {
 *     mapping(address => euint32) private scores;
 *     mapping(address => uint32) public finalScores;
 *     bool public tournamentEnded;
 *
 *     // During tournament: encrypted
 *     function submitScore(inEuint32 score, bytes proof) external {
 *         require(!tournamentEnded, "Tournament ended");
 *         // Store encrypted...
 *     }
 *
 *     // After tournament: batch reveal
 *     function revealLeaderboard(address[] calldata players) external {
 *         require(tournamentEnded, "Tournament ongoing");
 *         for (uint i = 0; i < players.length; i++) {
 *             finalScores[players[i]] = FHE.decrypt(scores[players[i]]);
 *         }
 *     }
 * }
 * ```
 *
 * ============================================================================
 * USE CASE 2: VOTING RESULTS
 * ============================================================================
 *
 * Scenario: Election with encrypted votes, public results after
 *
 * ```solidity
 * contract Voting {
 *     mapping(uint8 => euint32) private voteCounts;  // Encrypted totals
 *     mapping(uint8 => uint32) public finalCounts;   // Revealed totals
 *
 *     function revealResults(uint8[] calldata candidates) external {
 *         require(block.timestamp > votingEnd, "Voting ongoing");
 *
 *         for (uint i = 0; i < candidates.length; i++) {
 *             uint8 candidate = candidates[i];
 *             finalCounts[candidate] = FHE.decrypt(voteCounts[candidate]);
 *         }
 *     }
 * }
 * ```
 *
 * ============================================================================
 * USE CASE 3: SEALED-BID AUCTION RESULTS
 * ============================================================================
 *
 * ```solidity
 * contract Auction {
 *     mapping(address => euint32) private bids;
 *     mapping(address => uint32) public revealedBids;
 *
 *     function revealAllBids(address[] calldata bidders) external {
 *         require(block.timestamp > auctionEnd, "Auction ongoing");
 *
 *         for (uint i = 0; i < bidders.length; i++) {
 *             revealedBids[bidders[i]] = FHE.decrypt(bids[bidders[i]]);
 *         }
 *     }
 * }
 * ```
 *
 * ============================================================================
 * GAS OPTIMIZATION STRATEGIES
 * ============================================================================
 *
 * 1. **Batch Size Limits**
 *    ```solidity
 *    function batchReveal(address[] calldata players) external {
 *        require(players.length <= 50, "Batch too large");  // Limit size
 *        // Process batch...
 *    }
 *    ```
 *
 * 2. **Progressive Revelation**
 *    ```solidity
 *    uint256 public revealIndex;
 *    address[] public players;
 *
 *    function revealNext(uint256 count) external {
 *        uint256 end = min(revealIndex + count, players.length);
 *        for (uint i = revealIndex; i < end; i++) {
 *            // Reveal players[i]
 *        }
 *        revealIndex = end;
 *    }
 *    ```
 *
 * 3. **User-Triggered Revelation**
 *    ```solidity
 *    function revealMyStats() external {
 *        // User pays their own gas
 *        publicStats[msg.sender] = decrypt(encryptedStats[msg.sender]);
 *    }
 *    ```
 *
 * ============================================================================
 * SECURITY CONSIDERATIONS
 * ============================================================================
 *
 * ✅ **Time-Lock Revelation**
 *    - Only allow after process completion
 *    - Use block.timestamp or block.number checks
 *    - Prevent premature revelation
 *
 * ✅ **Access Control**
 *    - Who can trigger revelation?
 *    - Owner-only? Anyone? User-only?
 *    - Document access patterns clearly
 *
 * ✅ **One-Time Revelation**
 *    - Prevent re-revelation
 *    - Lock after first reveal
 *    - Avoid unnecessary gas costs
 *
 * ✅ **Partial Revelation**
 *    - Consider revealing only summaries
 *    - Top 10 instead of all players
 *    - Aggregates instead of individuals
 *
 * ============================================================================
 * COMPARISON: DIFFERENT APPROACHES
 * ============================================================================
 *
 * | Approach | Pros | Cons | Use When |
 * |----------|------|------|----------|
 * | **Batch Reveal All** | Complete, transparent | High gas, slow | Small datasets |
 * | **Progressive Reveal** | Lower gas per tx | Multiple txs needed | Large datasets |
 * | **User-Triggered** | User pays gas | Requires user action | Optional reveal |
 * | **Top-N Only** | Most gas efficient | Incomplete data | Rankings only |
 *
 * ============================================================================
 * GAS COST ESTIMATES
 * ============================================================================
 *
 * Per-value decryption costs (approximate):
 * - euint32: ~150,000 gas
 * - euint16: ~120,000 gas
 * - euint8:  ~100,000 gas
 *
 * Example batch costs:
 * - 10 players × 3 values × 120k gas = ~3.6M gas
 * - 50 players × 3 values × 120k gas = ~18M gas (near block limit!)
 * - 100 players: Would require multiple transactions
 *
 * **RECOMMENDATION**: Limit batches to 20-30 players per transaction
 *
 * ============================================================================
 * BEST PRACTICES
 * ============================================================================
 *
 * ✅ Implement time-locks before revelation
 * ✅ Limit batch sizes to prevent gas issues
 * ✅ Allow users to self-reveal (they pay gas)
 * ✅ Consider progressive revelation for large datasets
 * ✅ Document why public decryption is necessary
 * ✅ Emit events for transparency
 * ✅ Implement access controls
 * ✅ Test gas costs thoroughly
 *
 * ❌ Don't reveal during ongoing processes
 * ❌ Don't process unlimited batch sizes
 * ❌ Don't reveal private data unnecessarily
 * ❌ Don't forget to check game/process end state
 * ❌ Don't allow re-revelation (wastes gas)
 *
 * ============================================================================
 * ALTERNATIVE: KEEP DATA ENCRYPTED
 * ============================================================================
 *
 * Instead of public decryption, consider:
 *
 * 1. **Encrypted Leaderboard**
 *    - Compare encrypted values on-chain
 *    - Users decrypt own rank client-side
 *    - No public revelation needed
 *
 * 2. **Merkle Proofs**
 *    - Compute rankings off-chain
 *    - Publish Merkle root
 *    - Users prove their ranking
 *
 * 3. **ZK-SNARKs**
 *    - Prove properties without revealing values
 *    - "I'm in top 10" without revealing score
 *
 * **Default to user-only decryption. Use public only when transparency required.**
 */
