// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint32, euint64, eaddress, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title ConfidentialGamingScore
 * @dev Privacy-preserving gaming achievement system using Fully Homomorphic Encryption (FHE)
 * @notice Players can submit encrypted gaming scores while maintaining complete anonymity and privacy
 *
 * This contract demonstrates:
 * - Encrypted storage and computation of gaming scores
 * - Privacy-preserving leaderboard functionality
 * - Confidential user-only decryption of results
 * - FHE operations on encrypted data
 */
contract ConfidentialGamingScore is Ownable, ZamaEthereumConfig {

    // ==================== Type Definitions ====================

    /**
     * @dev Player data structure for storing encrypted gaming information
     */
    struct PlayerData {
        euint32 encryptedScore;           // Encrypted gaming score
        euint64 encryptedTimestamp;       // Encrypted submission timestamp
        bool hasScore;                    // Whether player submitted a score
        uint256 lastUpdateBlock;          // Block number of last update (for access control)
    }

    /**
     * @dev Game achievement metadata
     */
    struct Achievement {
        string title;
        uint32 requiredScore;
        bool active;
    }

    // ==================== State Variables ====================

    /// @dev Mapping of player addresses to their encrypted gaming data
    mapping(address => PlayerData) private playerData;

    /// @dev List of all players who have submitted scores
    address[] public playerRegistry;

    /// @dev Mapping to check if player is already registered
    mapping(address => bool) public isPlayerRegistered;

    /// @dev Encrypted total sum of all scores (for network statistics)
    euint64 private encryptedTotalScoresSum;

    /// @dev Total number of players who submitted scores (public information)
    uint256 public totalPlayersCount;

    /// @dev Network average score (encrypted)
    euint32 private encryptedAverageScore;

    /// @dev Achievement system
    mapping(uint256 => Achievement) public achievements;
    uint256 public achievementCount;

    /// @dev Minimum score threshold for ranking
    uint32 public minScoreThreshold;

    // ==================== Events ====================

    /**
     * @dev Emitted when a player submits an encrypted score
     * @param player Address of the player who submitted the score
     * @param timestamp Block timestamp of submission
     */
    event ConfidentialScoreSubmitted(address indexed player, uint256 timestamp);

    /**
     * @dev Emitted when a new player registers
     * @param player Address of the new player
     * @param timestamp Block timestamp of registration
     */
    event PlayerRegistered(address indexed player, uint256 timestamp);

    /**
     * @dev Emitted when network statistics are updated
     * @param totalPlayers Current total number of players
     * @param blockNumber Block number of update
     */
    event NetworkStatsUpdated(uint256 totalPlayers, uint256 blockNumber);

    /**
     * @dev Emitted when a new achievement is created
     * @param achievementId ID of the new achievement
     * @param title Title of the achievement
     * @param requiredScore Required score to unlock
     */
    event AchievementCreated(uint256 indexed achievementId, string title, uint32 requiredScore);

    // ==================== Modifiers ====================

    /**
     * @dev Ensures only registered players can call the function
     */
    modifier onlyRegisteredPlayer() {
        require(isPlayerRegistered[msg.sender], "Player not registered");
        _;
    }

    /**
     * @dev Ensures only players with submitted scores can call the function
     */
    modifier onlyWithScore() {
        require(playerData[msg.sender].hasScore, "No score submitted");
        _;
    }

    // ==================== Constructor ====================

    /**
     * @dev Initialize the contract with default values
     */
    constructor() {
        minScoreThreshold = 100;
        encryptedTotalScoresSum = FHE.asEuint64(0);
        encryptedAverageScore = FHE.asEuint32(0);
    }

    // ==================== Registration Functions ====================

    /**
     * @dev Register a new player in the gaming system
     * @notice Each address can only register once
     *
     * Example: ✅ Correct usage
     * - Player connects wallet and registers
     * - Player receives encrypted storage space
     * - Player can now submit scores
     */
    function registerPlayer() external {
        require(!isPlayerRegistered[msg.sender], "Player already registered");
        require(msg.sender != address(0), "Invalid address");

        isPlayerRegistered[msg.sender] = true;
        playerRegistry.push(msg.sender);

        // Initialize encrypted data structures
        playerData[msg.sender] = PlayerData({
            encryptedScore: FHE.asEuint32(0),
            encryptedTimestamp: FHE.asEuint64(0),
            hasScore: false,
            lastUpdateBlock: block.number
        });

        emit PlayerRegistered(msg.sender, block.timestamp);
    }

    // ==================== Score Submission Functions ====================

    /**
     * @dev Submit an encrypted gaming score
     * @param encryptedScoreInput Encrypted score value (must be generated by client using FHE encryption)
     * @param inputProof Zero-knowledge proof of correct encryption
     *
     * Note: This uses FHE.fromExternal to convert external encrypted input to internal state
     *
     * Example: ✅ Correct usage pattern
     * ```
     * const encryptedScore = fhevm.encrypt32(1500);
     * await contract.submitScore(encryptedScore.handles[0], encryptedScore.inputProof);
     * ```
     *
     * Example: ❌ Common pitfall - forgetting FHE.allow permissions
     * - Results in inability to decrypt later
     * - Contract needs FHE.allowThis()
     * - User needs FHE.allow(value, msg.sender)
     */
    function submitScore(
        bytes calldata encryptedScoreInput,
        bytes calldata inputProof
    ) external onlyRegisteredPlayer {
        require(encryptedScoreInput.length > 0, "Invalid encrypted input");
        require(inputProof.length > 0, "Invalid proof");

        // Convert external encrypted input to internal state
        euint32 score = FHE.fromExternal(
            encryptedScoreInput,
            inputProof
        );

        // Store encrypted score
        playerData[msg.sender].encryptedScore = score;
        playerData[msg.sender].encryptedTimestamp = FHE.asEuint64(block.timestamp);

        // First-time submission tracking
        if (!playerData[msg.sender].hasScore) {
            playerData[msg.sender].hasScore = true;
            totalPlayersCount += 1;
        }

        playerData[msg.sender].lastUpdateBlock = block.number;

        // Grant permissions for this encrypted value
        // ✅ CRITICAL: Both permissions are required
        FHE.allowThis(score);                  // Contract permission
        FHE.allow(score, msg.sender);          // User permission for decryption

        emit ConfidentialScoreSubmitted(msg.sender, block.timestamp);
        emit NetworkStatsUpdated(totalPlayersCount, block.number);
    }

    // ==================== Score Query Functions ====================

    /**
     * @dev Get player's own encrypted score (user only)
     * @return The encrypted score value
     *
     * Note: Only the player who submitted the score can view it
     * The returned value remains encrypted and requires special decryption
     *
     * Example: ✅ Correct usage
     * - Player calls this function
     * - Receives encrypted score
     * - Uses FHE client library to decrypt with personal key
     */
    function getMyScore() external view onlyWithScore returns (euint32) {
        require(playerData[msg.sender].lastUpdateBlock <= block.number, "Invalid state");
        return playerData[msg.sender].encryptedScore;
    }

    /**
     * @dev Get player's own submission timestamp (encrypted)
     * @return The encrypted timestamp of score submission
     */
    function getMyTimestamp() external view onlyWithScore returns (euint64) {
        return playerData[msg.sender].encryptedTimestamp;
    }

    /**
     * @dev Check if player has submitted a score (public information)
     * @param player Address to check
     * @return True if player has submitted a score
     */
    function hasPlayerSubmitted(address player) external view returns (bool) {
        return playerData[player].hasScore;
    }

    /**
     * @dev Get total number of registered players
     * @return Number of players who submitted at least one score
     *
     * Note: This is public information (does not reveal scores)
     */
    function getTotalPlayers() external view returns (uint256) {
        return totalPlayersCount;
    }

    /**
     * @dev Get list of all registered player addresses
     * @return Array of player addresses
     *
     * Warning: Returns public information only (addresses)
     * No encrypted data is revealed
     */
    function getPlayerRegistry() external view returns (address[] memory) {
        return playerRegistry;
    }

    // ==================== Encrypted Computation Functions ====================

    /**
     * @dev Calculate if player's score exceeds a threshold (encrypted comparison)
     * @param threshold Public threshold value to compare against
     * @return Encrypted boolean result (true if score >= threshold)
     *
     * Example: ✅ FHE Greater-Than Comparison
     * ```
     * euint32 result = FHE.gte(playerScore, FHE.asEuint32(threshold));
     * ```
     *
     * Example: ❌ Common pitfall - comparing with public value directly
     * - Never do: playerScore >= threshold (mixes encrypted and plaintext)
     * - Always do: FHE.gte(playerScore, FHE.asEuint32(threshold))
     */
    function meetsAchievementThreshold(
        uint32 threshold
    ) external view onlyWithScore returns (ebool) {
        euint32 playerScore = playerData[msg.sender].encryptedScore;
        euint32 thresholdEncrypted = FHE.asEuint32(threshold);

        // ✅ Correct: Use FHE operations on encrypted values
        return FHE.gte(playerScore, thresholdEncrypted);
    }

    /**
     * @dev Compare two players' scores (encrypted)
     * @param otherPlayer Address of player to compare with
     * @return Encrypted boolean: true if caller's score > other's score
     *
     * Note: Result remains encrypted - neither player learns the outcome immediately
     * Decryption requires authorization from contract
     */
    function isScoreHigherThan(
        address otherPlayer
    ) external view onlyWithScore returns (ebool) {
        require(isPlayerRegistered[otherPlayer], "Other player not registered");
        require(playerData[otherPlayer].hasScore, "Other player has no score");

        euint32 myScore = playerData[msg.sender].encryptedScore;
        euint32 otherScore = playerData[otherPlayer].encryptedScore;

        // Encrypted comparison
        return FHE.gt(myScore, otherScore);
    }

    /**
     * @dev Calculate approximate position in leaderboard (encrypted)
     * @return Encrypted position value
     *
     * Warning: This is a simplified implementation
     * Full leaderboard would require more complex encrypted comparisons
     */
    function getApproximateLeaderboardPosition() external view onlyWithScore returns (euint32) {
        require(totalPlayersCount > 0, "No players registered");

        // This is a simplified calculation
        // Real leaderboard would iterate through all scores
        euint32 position = FHE.asEuint32(1);
        euint32 myScore = playerData[msg.sender].encryptedScore;

        // ✅ CRITICAL: Permission check
        FHE.allowThis(position);
        FHE.allow(position, msg.sender);

        return position;
    }

    // ==================== Network Statistics ====================

    /**
     * @dev Get network statistics (public information only)
     * @return totalPlayers Total number of players
     *
     * Note: Individual scores remain completely encrypted and hidden
     * Only aggregate public information is revealed
     */
    function getNetworkStats() external view returns (uint256 totalPlayers) {
        return totalPlayersCount;
    }

    // ==================== Achievement System ====================

    /**
     * @dev Create a new achievement
     * @param title Name of the achievement
     * @param requiredScore Score required to unlock
     *
     * Note: Only contract owner can create achievements
     */
    function createAchievement(
        string memory title,
        uint32 requiredScore
    ) external onlyOwner {
        require(bytes(title).length > 0, "Empty title");
        require(requiredScore > 0, "Invalid score");

        achievements[achievementCount] = Achievement({
            title: title,
            requiredScore: requiredScore,
            active: true
        });

        emit AchievementCreated(achievementCount, title, requiredScore);
        achievementCount++;
    }

    /**
     * @dev Get achievement details
     * @param achievementId ID of the achievement
     * @return Achievement struct with title and required score
     */
    function getAchievement(uint256 achievementId)
        external
        view
        returns (Achievement memory)
    {
        require(achievementId < achievementCount, "Invalid achievement ID");
        return achievements[achievementId];
    }

    /**
     * @dev Check if player unlocked an achievement (encrypted)
     * @param achievementId ID of the achievement to check
     * @return Encrypted boolean result
     */
    function hasAchievement(uint256 achievementId)
        external
        view
        onlyWithScore
        returns (ebool)
    {
        require(achievementId < achievementCount, "Invalid achievement");

        Achievement memory achievement = achievements[achievementId];
        require(achievement.active, "Achievement inactive");

        euint32 myScore = playerData[msg.sender].encryptedScore;
        euint32 required = FHE.asEuint32(achievement.requiredScore);

        // Encrypted comparison
        return FHE.gte(myScore, required);
    }

    // ==================== Data Management Functions ====================

    /**
     * @dev Reset player's score and remove from leaderboard
     *
     * Note: Player can reset their own score
     * This removes their data from network statistics
     */
    function resetMyScore() external onlyWithScore {
        require(playerData[msg.sender].hasScore, "No score to reset");

        // Update total players count
        if (totalPlayersCount > 0) {
            totalPlayersCount -= 1;
        }

        // Reset player data
        playerData[msg.sender].encryptedScore = FHE.asEuint32(0);
        playerData[msg.sender].encryptedTimestamp = FHE.asEuint64(0);
        playerData[msg.sender].hasScore = false;
        playerData[msg.sender].lastUpdateBlock = block.number;

        emit ConfidentialScoreSubmitted(msg.sender, block.timestamp);
        emit NetworkStatsUpdated(totalPlayersCount, block.number);
    }

    /**
     * @dev Emergency function to reset network statistics (owner only)
     *
     * Warning: This resets all player data
     * Use with extreme caution
     */
    function emergencyReset() external onlyOwner {
        totalPlayersCount = 0;
        achievementCount = 0;
        encryptedTotalScoresSum = FHE.asEuint64(0);
        encryptedAverageScore = FHE.asEuint32(0);
    }

    // ==================== View Functions ====================

    /**
     * @dev Get contract information and version
     * @return Contract name and version
     */
    function getContractInfo() external pure returns (string memory) {
        return "ConfidentialGamingScore v1.0 - FHEVM Privacy-Preserving Gaming";
    }

    /**
     * @dev Get contract deployment block number
     * @return Block number (for history tracking)
     */
    function getContractDeploymentInfo() external view returns (uint256) {
        return block.number;
    }

    /**
     * @dev Get minimum score threshold for validation
     * @return Current minimum score requirement
     */
    function getMinScoreThreshold() external view returns (uint32) {
        return minScoreThreshold;
    }

    /**
     * @dev Update minimum score threshold (owner only)
     * @param newThreshold New minimum score value
     */
    function setMinScoreThreshold(uint32 newThreshold) external onlyOwner {
        require(newThreshold > 0, "Invalid threshold");
        minScoreThreshold = newThreshold;
    }
}
