// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint32, euint16, euint8, inEuint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title FHEConditionalOperations
 * @notice Demonstrates FHE conditional operations (select, min, max)
 * @dev Shows how to implement if-then-else logic on encrypted values
 */
contract FHEConditionalOperations is ZamaEthereumConfig {
    // Storage for demonstration
    mapping(address => euint32) private userValues;
    mapping(address => bool) private hasValue;

    // Event
    event ValueStored(address indexed user, uint256 timestamp);

    /**
     * @notice Store an encrypted value
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
     * @notice SELECT operation (if-then-else)
     * @dev Returns trueValue if condition is true, falseValue otherwise
     *
     * OPERATION: FHE.select(condition, trueValue, falseValue)
     * EQUIVALENT TO: condition ? trueValue : falseValue
     * RESULT: euint32
     *
     * PATTERN:
     * ```solidity
     * ebool condition = FHE.gt(a, b);
     * euint32 result = FHE.select(condition, valueIfTrue, valueIfFalse);
     * ```
     *
     * @param threshold Threshold to compare against
     * @param highReward Reward if value >= threshold
     * @param lowReward Reward if value < threshold
     * @return The selected reward (encrypted)
     */
    function getConditionalReward(
        uint32 threshold,
        uint32 highReward,
        uint32 lowReward
    ) external view returns (euint32) {
        require(hasValue[msg.sender], "No value stored");

        // Create condition: value >= threshold
        ebool qualified = FHE.gte(
            userValues[msg.sender],
            FHE.asEuint32(threshold)
        );

        // ✅ FHE.select: if (qualified) return highReward else return lowReward
        euint32 reward = FHE.select(
            qualified,
            FHE.asEuint32(highReward),
            FHE.asEuint32(lowReward)
        );

        return reward;
    }

    /**
     * @notice MIN operation
     * @dev Returns the minimum of two encrypted values
     *
     * OPERATION: FHE.min(a, b)
     * EQUIVALENT TO: (a < b) ? a : b
     * RESULT: euint32
     *
     * @param other Value to compare with
     * @return The minimum value (encrypted)
     */
    function getMin(uint32 other) external view returns (euint32) {
        require(hasValue[msg.sender], "No value stored");

        euint32 otherEnc = FHE.asEuint32(other);

        // ✅ FHE.min: Returns smaller of two values
        return FHE.min(userValues[msg.sender], otherEnc);
    }

    /**
     * @notice MAX operation
     * @dev Returns the maximum of two encrypted values
     *
     * OPERATION: FHE.max(a, b)
     * EQUIVALENT TO: (a > b) ? a : b
     * RESULT: euint32
     *
     * @param other Value to compare with
     * @return The maximum value (encrypted)
     */
    function getMax(uint32 other) external view returns (euint32) {
        require(hasValue[msg.sender], "No value stored");

        euint32 otherEnc = FHE.asEuint32(other);

        // ✅ FHE.max: Returns larger of two values
        return FHE.max(userValues[msg.sender], otherEnc);
    }

    /**
     * @notice Clamp value to range [min, max]
     * @dev Demonstrates combining min and max operations
     *
     * PATTERN: max(min, min(value, max))
     *
     * @param min Minimum allowed value
     * @param max Maximum allowed value
     * @return Value clamped to [min, max] (encrypted)
     */
    function clampToRange(uint32 min, uint32 max) external view returns (euint32) {
        require(hasValue[msg.sender], "No value stored");
        require(min <= max, "Invalid range");

        euint32 value = userValues[msg.sender];
        euint32 encMin = FHE.asEuint32(min);
        euint32 encMax = FHE.asEuint32(max);

        // Clamp: max(min, min(value, max))
        euint32 clamped = FHE.max(encMin, FHE.min(value, encMax));

        return clamped;
    }

    /**
     * @notice Multi-tier reward system
     * @dev Uses nested select operations for multiple tiers
     *
     * Tiers:
     * - >= 1000: Premium (300 reward)
     * - >= 500:  Standard (150 reward)
     * - < 500:   Basic (50 reward)
     *
     * @return Reward amount based on value tier (encrypted)
     */
    function getTieredReward() external view returns (euint32) {
        require(hasValue[msg.sender], "No value stored");

        euint32 value = userValues[msg.sender];

        // Check if premium tier (>= 1000)
        ebool isPremium = FHE.gte(value, FHE.asEuint32(1000));

        // Check if standard tier (>= 500)
        ebool isStandard = FHE.gte(value, FHE.asEuint32(500));

        // Nested select: if (isPremium) 300 else if (isStandard) 150 else 50
        euint32 standardOrBasic = FHE.select(
            isStandard,
            FHE.asEuint32(150),  // Standard
            FHE.asEuint32(50)    // Basic
        );

        euint32 reward = FHE.select(
            isPremium,
            FHE.asEuint32(300),   // Premium
            standardOrBasic       // Standard or Basic
        );

        return reward;
    }

    /**
     * @notice Absolute difference between two values
     * @dev Returns |a - b| using conditional logic
     *
     * PATTERN: if (a > b) { a - b } else { b - a }
     *
     * @param other Value to compare with
     * @return Absolute difference (encrypted)
     */
    function getAbsoluteDifference(uint32 other) external view returns (euint32) {
        require(hasValue[msg.sender], "No value stored");

        euint32 value = userValues[msg.sender];
        euint32 otherEnc = FHE.asEuint32(other);

        // Check if value > other
        ebool valueGreater = FHE.gt(value, otherEnc);

        // If value > other: (value - other), else: (other - value)
        euint32 diff1 = FHE.sub(value, otherEnc);
        euint32 diff2 = FHE.sub(otherEnc, value);

        return FHE.select(valueGreater, diff1, diff2);
    }

    /**
     * @notice Apply bonus multiplier based on condition
     * @dev Demonstrates conditional arithmetic
     *
     * If value >= threshold: value * 2
     * Else: value * 1
     *
     * @param threshold Threshold for bonus
     * @return Value with conditional bonus applied (encrypted)
     */
    function applyConditionalBonus(uint32 threshold) external view returns (euint32) {
        require(hasValue[msg.sender], "No value stored");

        euint32 value = userValues[msg.sender];
        ebool qualified = FHE.gte(value, FHE.asEuint32(threshold));

        // Calculate doubled value
        euint32 doubled = FHE.mul(value, FHE.asEuint32(2));

        // Return doubled if qualified, original otherwise
        return FHE.select(qualified, doubled, value);
    }

    /**
     * @notice Min of three values
     * @dev Demonstrates chaining min operations
     *
     * @param value2 Second value
     * @param value3 Third value
     * @return Minimum of three values (encrypted)
     */
    function getMinOfThree(uint32 value2, uint32 value3) external view returns (euint32) {
        require(hasValue[msg.sender], "No value stored");

        euint32 val1 = userValues[msg.sender];
        euint32 val2 = FHE.asEuint32(value2);
        euint32 val3 = FHE.asEuint32(value3);

        // Chain min: min(min(val1, val2), val3)
        return FHE.min(FHE.min(val1, val2), val3);
    }

    /**
     * @notice Median of three values
     * @dev Calculates median using conditional operations
     *
     * LOGIC: max(min(a,b), min(max(a,b), c))
     *
     * @param value2 Second value
     * @param value3 Third value
     * @return Median value (encrypted)
     */
    function getMedianOfThree(uint32 value2, uint32 value3) external view returns (euint32) {
        require(hasValue[msg.sender], "No value stored");

        euint32 a = userValues[msg.sender];
        euint32 b = FHE.asEuint32(value2);
        euint32 c = FHE.asEuint32(value3);

        // Median = max(min(a,b), min(max(a,b), c))
        return FHE.max(
            FHE.min(a, b),
            FHE.min(FHE.max(a, b), c)
        );
    }
}

/**
 * @dev FHE CONDITIONAL OPERATIONS - COMPLETE GUIDE
 *
 * ============================================================================
 * OPERATION SUMMARY
 * ============================================================================
 *
 * | Operation | Signature | Equivalent | Use Case |
 * |-----------|-----------|------------|----------|
 * | **select** | FHE.select(ebool, a, b) | cond ? a : b | If-then-else |
 * | **min** | FHE.min(a, b) | a < b ? a : b | Minimum value |
 * | **max** | FHE.max(a, b) | a > b ? a : b | Maximum value |
 *
 * ============================================================================
 * FHE.SELECT - DETAILED EXPLANATION
 * ============================================================================
 *
 * **Purpose**: Encrypted if-then-else logic
 *
 * **Syntax**:
 * ```solidity
 * euint32 result = FHE.select(condition, trueValue, falseValue);
 * ```
 *
 * **Parameters**:
 * - condition: ebool (encrypted boolean from comparison)
 * - trueValue: Value to return if condition is true
 * - falseValue: Value to return if condition is false
 *
 * **Example 1: Conditional Reward**
 * ```solidity
 * ebool highScore = FHE.gte(score, FHE.asEuint32(100));
 * euint32 reward = FHE.select(
 *     highScore,
 *     FHE.asEuint32(1000),  // High reward
 *     FHE.asEuint32(100)    // Low reward
 * );
 * ```
 *
 * **Example 2: Tier Selection**
 * ```solidity
 * ebool isVIP = FHE.gte(membershipLevel, FHE.asEuint8(5));
 * euint32 discount = FHE.select(
 *     isVIP,
 *     FHE.asEuint32(20),   // 20% for VIP
 *     FHE.asEuint32(5)     // 5% for regular
 * );
 * ```
 *
 * **Example 3: Penalty System**
 * ```solidity
 * ebool overLimit = FHE.gt(usage, limit);
 * euint32 cost = FHE.select(
 *     overLimit,
 *     highCost,    // Penalty rate
 *     normalCost   // Normal rate
 * );
 * ```
 *
 * ============================================================================
 * FHE.MIN - DETAILED EXPLANATION
 * ============================================================================
 *
 * **Purpose**: Get smaller of two encrypted values
 *
 * **Syntax**:
 * ```solidity
 * euint32 smaller = FHE.min(value1, value2);
 * ```
 *
 * **Use Cases**:
 *
 * 1. **Cap Maximum Value**
 *    ```solidity
 *    euint32 capped = FHE.min(userInput, maxAllowed);
 *    ```
 *
 * 2. **Limit Spending**
 *    ```solidity
 *    euint32 actualSpend = FHE.min(requestedAmount, accountBalance);
 *    ```
 *
 * 3. **Find Best Price**
 *    ```solidity
 *    euint32 bestPrice = FHE.min(price1, FHE.min(price2, price3));
 *    ```
 *
 * ============================================================================
 * FHE.MAX - DETAILED EXPLANATION
 * ============================================================================
 *
 * **Purpose**: Get larger of two encrypted values
 *
 * **Syntax**:
 * ```solidity
 * euint32 larger = FHE.max(value1, value2);
 * ```
 *
 * **Use Cases**:
 *
 * 1. **Enforce Minimum**
 *    ```solidity
 *    euint32 safeValue = FHE.max(userValue, minimumRequired);
 *    ```
 *
 * 2. **Track High Score**
 *    ```solidity
 *    highScore = FHE.max(highScore, newScore);
 *    ```
 *
 * 3. **Winner Selection**
 *    ```solidity
 *    euint32 winningBid = FHE.max(bid1, FHE.max(bid2, bid3));
 *    ```
 *
 * ============================================================================
 * COMPLEX PATTERNS
 * ============================================================================
 *
 * **Pattern 1: Range Clamping**
 * ```solidity
 * function clamp(euint32 value, euint32 min, euint32 max)
 *     returns (euint32)
 * {
 *     return FHE.max(min, FHE.min(value, max));
 * }
 * // Ensures: min <= result <= max
 * ```
 *
 * **Pattern 2: Multi-Tier System**
 * ```solidity
 * function getTier(euint32 score) returns (euint8) {
 *     ebool isPlatinum = FHE.gte(score, FHE.asEuint32(1000));
 *     ebool isGold = FHE.gte(score, FHE.asEuint32(500));
 *     ebool isSilver = FHE.gte(score, FHE.asEuint32(100));
 *
 *     euint8 tier = FHE.select(isPlatinum, FHE.asEuint8(4), FHE.asEuint8(0));
 *     tier = FHE.select(isGold, FHE.asEuint8(3), tier);
 *     tier = FHE.select(isSilver, FHE.asEuint8(2), tier);
 *
 *     return tier;  // 0=Basic, 2=Silver, 3=Gold, 4=Platinum
 * }
 * ```
 *
 * **Pattern 3: Progressive Tax**
 * ```solidity
 * function calculateTax(euint32 income) returns (euint32) {
 *     ebool highBracket = FHE.gte(income, FHE.asEuint32(100000));
 *     ebool midBracket = FHE.gte(income, FHE.asEuint32(50000));
 *
 *     // 30% for high, 20% for mid, 10% for low
 *     euint32 rate = FHE.select(highBracket, FHE.asEuint32(30), FHE.asEuint32(10));
 *     rate = FHE.select(midBracket, FHE.asEuint32(20), rate);
 *
 *     return FHE.div(FHE.mul(income, rate), FHE.asEuint32(100));
 * }
 * ```
 *
 * **Pattern 4: Absolute Value**
 * ```solidity
 * function abs(euint32 a, euint32 b) returns (euint32) {
 *     ebool aGreater = FHE.gt(a, b);
 *     return FHE.select(
 *         aGreater,
 *         FHE.sub(a, b),
 *         FHE.sub(b, a)
 *     );
 * }
 * ```
 *
 * ============================================================================
 * PERFORMANCE CONSIDERATIONS
 * ============================================================================
 *
 * **Gas Costs (Approximate)**:
 * - FHE.select: ~60,000 gas
 * - FHE.min/max: ~55,000 gas
 * - Nested operations: Multiply costs
 *
 * **Optimization Tips**:
 * 1. Reuse intermediate results
 * 2. Minimize nesting depth
 * 3. Use min/max instead of select when possible
 * 4. Consider alternative logic patterns
 *
 * **Example Optimization**:
 * ```solidity
 * // ❌ Less efficient
 * ebool cond = FHE.gt(a, b);
 * euint32 result = FHE.select(cond, a, b);
 *
 * // ✅ More efficient
 * euint32 result = FHE.max(a, b);  // Same result, less gas
 * ```
 *
 * ============================================================================
 * COMMON MISTAKES
 * ============================================================================
 *
 * ❌ **Mistake 1: Using Regular If-Else**
 * ```solidity
 * if (encryptedValue > 100) {  // ❌ DOESN'T WORK
 *     // Can't use encrypted values in if statements
 * }
 * ```
 *
 * ❌ **Mistake 2: Type Mismatch**
 * ```solidity
 * ebool cond = ...;
 * euint32 result = FHE.select(cond, euint16Value, euint32Value);  // ❌ ERROR
 * ```
 *
 * ❌ **Mistake 3: Forgetting Permissions**
 * ```solidity
 * euint32 result = FHE.select(cond, val1, val2);
 * // ❌ Missing: FHE.allowThis(result); FHE.allow(result, user);
 * ```
 *
 * ============================================================================
 * BEST PRACTICES
 * ============================================================================
 *
 * ✅ Use select for conditional logic on encrypted values
 * ✅ Use min/max for bounds checking
 * ✅ Chain operations for multi-tier systems
 * ✅ Document the logic clearly
 * ✅ Test all branches thoroughly
 * ✅ Consider gas costs for complex logic
 * ✅ Grant permissions for result values
 *
 * ❌ Don't use regular if-else on encrypted values
 * ❌ Don't forget to match types in select
 * ❌ Don't nest too deeply (gas costs!)
 * ❌ Don't decrypt unless result should be public
 *
 * ============================================================================
 * SUMMARY
 * ============================================================================
 *
 * FHE conditional operations enable complex logic on encrypted data:
 * - **select**: If-then-else logic
 * - **min**: Find smaller value
 * - **max**: Find larger value
 *
 * Use these to build:
 * - Reward systems
 * - Tier mechanisms
 * - Bounds checking
 * - Progressive calculations
 * - Many more privacy-preserving features!
 */
