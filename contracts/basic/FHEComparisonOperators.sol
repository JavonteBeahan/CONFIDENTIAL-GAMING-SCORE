// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint32, inEuint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title FHEComparisonOperators
 * @notice Demonstrates all FHE comparison operations
 * @dev Complete guide to encrypted comparisons (gt, gte, lt, lte, eq, ne)
 */
contract FHEComparisonOperators is ZamaEthereumConfig {
    // Storage for demonstration
    mapping(address => euint32) private userValues;
    mapping(address => bool) private hasValue;

    // Events
    event ValueStored(address indexed user, uint256 timestamp);
    event ComparisonPerformed(address indexed user, string operation, uint256 timestamp);

    /**
     * @notice Store an encrypted value for comparison testing
     * @param inputHandle Encrypted value
     * @param inputProof Proof of valid encryption
     */
    function storeValue(inEuint32 calldata inputHandle, bytes calldata inputProof) external {
        euint32 value = FHE.asEuint32(inputHandle, inputProof);

        userValues[msg.sender] = value;
        hasValue[msg.sender] = true;

        FHE.allowThis(value);
        FHE.allow(value, msg.sender);

        emit ValueStored(msg.sender, block.timestamp);
    }

    /**
     * @notice Greater Than (GT) comparison
     * @dev Tests if user's value > threshold
     *
     * OPERATION: FHE.gt(a, b)
     * RESULT: ebool (encrypted boolean)
     * MEANING: a > b (strictly greater)
     *
     * @param threshold Value to compare against
     * @return Encrypted boolean result
     */
    function isGreaterThan(uint32 threshold) external view returns (ebool) {
        require(hasValue[msg.sender], "No value stored");

        euint32 encThreshold = FHE.asEuint32(threshold);

        // ✅ FHE.gt: Greater than
        ebool result = FHE.gt(userValues[msg.sender], encThreshold);

        return result;
    }

    /**
     * @notice Greater Than or Equal (GTE) comparison
     * @dev Tests if user's value >= threshold
     *
     * OPERATION: FHE.gte(a, b)
     * RESULT: ebool
     * MEANING: a >= b (greater or equal)
     *
     * USE CASE: "Do I qualify for this tier?"
     *
     * @param threshold Value to compare against
     * @return Encrypted boolean result
     */
    function isGreaterOrEqual(uint32 threshold) external view returns (ebool) {
        require(hasValue[msg.sender], "No value stored");

        euint32 encThreshold = FHE.asEuint32(threshold);

        // ✅ FHE.gte: Greater than or equal
        ebool result = FHE.gte(userValues[msg.sender], encThreshold);

        return result;
    }

    /**
     * @notice Less Than (LT) comparison
     * @dev Tests if user's value < threshold
     *
     * OPERATION: FHE.lt(a, b)
     * RESULT: ebool
     * MEANING: a < b (strictly less)
     *
     * @param threshold Value to compare against
     * @return Encrypted boolean result
     */
    function isLessThan(uint32 threshold) external view returns (ebool) {
        require(hasValue[msg.sender], "No value stored");

        euint32 encThreshold = FHE.asEuint32(threshold);

        // ✅ FHE.lt: Less than
        ebool result = FHE.lt(userValues[msg.sender], encThreshold);

        return result;
    }

    /**
     * @notice Less Than or Equal (LTE) comparison
     * @dev Tests if user's value <= threshold
     *
     * OPERATION: FHE.lte(a, b)
     * RESULT: ebool
     * MEANING: a <= b (less or equal)
     *
     * @param threshold Value to compare against
     * @return Encrypted boolean result
     */
    function isLessOrEqual(uint32 threshold) external view returns (ebool) {
        require(hasValue[msg.sender], "No value stored");

        euint32 encThreshold = FHE.asEuint32(threshold);

        // ✅ FHE.lte: Less than or equal
        ebool result = FHE.lte(userValues[msg.sender], encThreshold);

        return result;
    }

    /**
     * @notice Equal (EQ) comparison
     * @dev Tests if user's value == target
     *
     * OPERATION: FHE.eq(a, b)
     * RESULT: ebool
     * MEANING: a == b (exactly equal)
     *
     * USE CASE: "Did I hit the target exactly?"
     *
     * @param target Value to compare against
     * @return Encrypted boolean result
     */
    function isEqual(uint32 target) external view returns (ebool) {
        require(hasValue[msg.sender], "No value stored");

        euint32 encTarget = FHE.asEuint32(target);

        // ✅ FHE.eq: Equal
        ebool result = FHE.eq(userValues[msg.sender], encTarget);

        return result;
    }

    /**
     * @notice Not Equal (NE) comparison
     * @dev Tests if user's value != target
     *
     * OPERATION: FHE.ne(a, b)
     * RESULT: ebool
     * MEANING: a != b (not equal)
     *
     * @param target Value to compare against
     * @return Encrypted boolean result
     */
    function isNotEqual(uint32 target) external view returns (ebool) {
        require(hasValue[msg.sender], "No value stored");

        euint32 encTarget = FHE.asEuint32(target);

        // ✅ FHE.ne: Not equal
        ebool result = FHE.ne(userValues[msg.sender], encTarget);

        return result;
    }

    /**
     * @notice Compare with another user's value
     * @dev Encrypted comparison between two users
     *
     * @param otherUser Address of user to compare with
     * @return True if msg.sender's value > otherUser's value
     */
    function isGreaterThanUser(address otherUser) external view returns (ebool) {
        require(hasValue[msg.sender], "You have no value");
        require(hasValue[otherUser], "Other user has no value");

        // Compare two encrypted values
        return FHE.gt(userValues[msg.sender], userValues[otherUser]);
    }

    /**
     * @notice Range check: is value between min and max?
     * @dev Demonstrates combining multiple comparisons
     *
     * PATTERN: (value >= min) AND (value <= max)
     *
     * @param min Minimum value (inclusive)
     * @param max Maximum value (inclusive)
     * @return Encrypted boolean (true if in range)
     */
    function isInRange(uint32 min, uint32 max) external view returns (ebool) {
        require(hasValue[msg.sender], "No value stored");
        require(min <= max, "Invalid range");

        euint32 encMin = FHE.asEuint32(min);
        euint32 encMax = FHE.asEuint32(max);

        // value >= min
        ebool aboveMin = FHE.gte(userValues[msg.sender], encMin);

        // value <= max
        ebool belowMax = FHE.lte(userValues[msg.sender], encMax);

        // Combine with AND
        return FHE.and(aboveMin, belowMax);
    }

    /**
     * @notice Multi-threshold check
     * @dev Check against multiple thresholds simultaneously
     *
     * @param threshold1 First threshold
     * @param threshold2 Second threshold
     * @param threshold3 Third threshold
     * @return result1 value >= threshold1
     * @return result2 value >= threshold2
     * @return result3 value >= threshold3
     */
    function checkMultipleThresholds(
        uint32 threshold1,
        uint32 threshold2,
        uint32 threshold3
    ) external view returns (ebool result1, ebool result2, ebool result3) {
        require(hasValue[msg.sender], "No value stored");

        euint32 value = userValues[msg.sender];

        result1 = FHE.gte(value, FHE.asEuint32(threshold1));
        result2 = FHE.gte(value, FHE.asEuint32(threshold2));
        result3 = FHE.gte(value, FHE.asEuint32(threshold3));

        return (result1, result2, result3);
    }
}

/**
 * @dev FHE COMPARISON OPERATORS - COMPLETE REFERENCE
 *
 * ============================================================================
 * OPERATOR SUMMARY
 * ============================================================================
 *
 * | Operator | Solidity | FHE Equivalent | Returns | Meaning |
 * |----------|----------|----------------|---------|---------|
 * | >        | a > b    | FHE.gt(a, b)   | ebool   | Greater than |
 * | >=       | a >= b   | FHE.gte(a, b)  | ebool   | Greater or equal |
 * | <        | a < b    | FHE.lt(a, b)   | ebool   | Less than |
 * | <=       | a <= b   | FHE.lte(a, b)  | ebool   | Less or equal |
 * | ==       | a == b   | FHE.eq(a, b)   | ebool   | Equal |
 * | !=       | a != b   | FHE.ne(a, b)   | ebool   | Not equal |
 *
 * ============================================================================
 * USAGE PATTERNS
 * ============================================================================
 *
 * **Pattern 1: Compare with Plaintext**
 * ```solidity
 * euint32 encrypted = userValue;
 * uint32 threshold = 100;
 *
 * ebool result = FHE.gte(encrypted, FHE.asEuint32(threshold));
 * ```
 *
 * **Pattern 2: Compare Two Encrypted Values**
 * ```solidity
 * euint32 value1 = userValues[user1];
 * euint32 value2 = userValues[user2];
 *
 * ebool result = FHE.gt(value1, value2);
 * ```
 *
 * **Pattern 3: Chain Comparisons**
 * ```solidity
 * ebool isAbove = FHE.gte(value, threshold);
 * ebool isBelow = FHE.lte(value, max);
 * ebool inRange = FHE.and(isAbove, isBelow);
 * ```
 *
 * ============================================================================
 * REAL-WORLD EXAMPLES
 * ============================================================================
 *
 * **Example 1: Age Verification**
 * ```solidity
 * function isAdult() external view returns (ebool) {
 *     return FHE.gte(encryptedAge, FHE.asEuint8(18));
 * }
 * ```
 *
 * **Example 2: Credit Score Tiers**
 * ```solidity
 * function getCreditTier() external view returns (ebool, ebool, ebool) {
 *     ebool excellent = FHE.gte(score, FHE.asEuint32(750));
 *     ebool good = FHE.gte(score, FHE.asEuint32(700));
 *     ebool fair = FHE.gte(score, FHE.asEuint32(650));
 *     return (excellent, good, fair);
 * }
 * ```
 *
 * **Example 3: Leaderboard Ranking**
 * ```solidity
 * function amIAhead(address opponent) external view returns (ebool) {
 *     return FHE.gt(myScore, scores[opponent]);
 * }
 * ```
 *
 * **Example 4: Auction Winner**
 * ```solidity
 * function isHighestBidder(address bidder) external view returns (ebool) {
 *     return FHE.eq(bids[bidder], highestBid);
 * }
 * ```
 *
 * ============================================================================
 * TYPE COMPATIBILITY
 * ============================================================================
 *
 * ❌ **WRONG: Mismatched Types**
 * ```solidity
 * euint32 large = ...;
 * euint8 small = ...;
 * ebool result = FHE.gt(large, small);  // TYPE ERROR!
 * ```
 *
 * ✅ **CORRECT: Convert to Same Type**
 * ```solidity
 * euint32 large = ...;
 * euint8 small = ...;
 * euint32 smallAs32 = FHE.asEuint32(small);
 * ebool result = FHE.gt(large, smallAs32);  // ✅ Works
 * ```
 *
 * **Supported Types:**
 * - euint8, euint16, euint32, euint64
 * - Both operands must be same type
 * - Convert using FHE.asEuint{N}()
 *
 * ============================================================================
 * WORKING WITH RESULTS
 * ============================================================================
 *
 * **Option 1: Return Encrypted (Recommended)**
 * ```solidity
 * function check() external view returns (ebool) {
 *     return FHE.gte(value, threshold);  // ✅ User decrypts client-side
 * }
 * ```
 *
 * **Option 2: Use in Contract Logic**
 * ```solidity
 * function conditionalAction() external {
 *     ebool qualified = FHE.gte(userScore, minScore);
 *     euint32 reward = FHE.select(qualified, highReward, lowReward);
 * }
 * ```
 *
 * **Option 3: Public Decryption (Careful!)**
 * ```solidity
 * function revealResult() external returns (bool) {
 *     ebool result = FHE.gte(value, threshold);
 *     return FHE.decrypt(result);  // ⚠️  Exposes result!
 * }
 * ```
 *
 * ============================================================================
 * GAS COSTS (APPROXIMATE)
 * ============================================================================
 *
 * Operation             | Gas Cost
 * ----------------------|----------
 * FHE.gt/lt             | ~50,000
 * FHE.gte/lte           | ~50,000
 * FHE.eq/ne             | ~45,000
 * FHE.asEuint32()       | ~30,000
 * Multiple comparisons  | ~50k × count
 *
 * **Optimization Tips:**
 * - Reuse converted values
 * - Combine conditions with FHE.and/or
 * - Use appropriate type sizes
 *
 * ============================================================================
 * COMMON MISTAKES
 * ============================================================================
 *
 * ❌ **Mistake 1: Comparing with Non-Encrypted**
 * ```solidity
 * euint32 encrypted = ...;
 * uint32 plain = 100;
 * ebool result = FHE.gt(encrypted, plain);  // ❌ TYPE ERROR
 * ```
 *
 * ❌ **Mistake 2: Using Solidity Operators**
 * ```solidity
 * euint32 a = ...;
 * euint32 b = ...;
 * bool result = (a > b);  // ❌ DOESN'T WORK
 * ```
 *
 * ❌ **Mistake 3: Treating ebool as bool**
 * ```solidity
 * ebool result = FHE.gt(a, b);
 * if (result) { ... }  // ❌ DOESN'T WORK
 * ```
 *
 * ❌ **Mistake 4: Decrypting in View**
 * ```solidity
 * function check() external view returns (bool) {
 *     ebool result = FHE.gte(value, threshold);
 *     return FHE.decrypt(result);  // ❌ Can't modify state in view
 * }
 * ```
 *
 * ============================================================================
 * BEST PRACTICES
 * ============================================================================
 *
 * ✅ Always use FHE comparison functions
 * ✅ Match encrypted types before comparing
 * ✅ Return encrypted results when possible
 * ✅ Document what comparisons mean for users
 * ✅ Use appropriate bit widths
 * ✅ Consider gas costs for multiple comparisons
 * ✅ Test with various edge cases
 *
 * ❌ Don't use Solidity operators on encrypted values
 * ❌ Don't decrypt unless result should be public
 * ❌ Don't compare mismatched types
 * ❌ Don't assume ebool works like bool
 *
 * ============================================================================
 * SUMMARY
 * ============================================================================
 *
 * FHE comparison operators enable privacy-preserving conditional logic:
 * - All 6 comparison operators supported
 * - Results are encrypted (ebool)
 * - Can be used in contract logic or returned to users
 * - Enable complex privacy-preserving applications
 *
 * **Use comparisons to build:**
 * - Qualification checks
 * - Tier systems
 * - Rankings
 * - Conditional rewards
 * - Access control
 * - Many more privacy-preserving features!
 */
