// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

/**
 * @title SimpleCounter
 * @notice A traditional counter contract WITHOUT encryption
 * @dev This contract demonstrates a standard counter for comparison with FHE version
 *
 * PURPOSE: Compare this with FHECounter.sol to understand the benefits of FHE
 */
contract SimpleCounter {
    // ⚠️  PUBLIC STORAGE: Anyone can see this value
    uint32 private counter;

    // Owner of the counter
    address private owner;

    // Events
    event CounterIncremented(address indexed by, uint32 newValue, uint256 timestamp);
    event CounterDecremented(address indexed by, uint32 newValue, uint256 timestamp);
    event CounterReset(address indexed by, uint256 timestamp);

    /**
     * @notice Constructor initializes counter to zero
     */
    constructor() {
        counter = 0;
        owner = msg.sender;
    }

    /**
     * @notice Increment counter by a value
     * @dev ⚠️  PRIVACY ISSUE: The value is visible to everyone
     *
     * @param value Amount to increment (plaintext, visible to all)
     */
    function increment(uint32 value) external {
        counter += value;
        emit CounterIncremented(msg.sender, counter, block.timestamp);
    }

    /**
     * @notice Decrement counter by a value
     * @dev ⚠️  PRIVACY ISSUE: The value is visible to everyone
     *
     * @param value Amount to decrement (plaintext, visible to all)
     */
    function decrement(uint32 value) external {
        require(counter >= value, "Counter: underflow");
        counter -= value;
        emit CounterDecremented(msg.sender, counter, block.timestamp);
    }

    /**
     * @notice Get current counter value
     * @dev ⚠️  PRIVACY ISSUE: Anyone can see the current value
     *
     * @return Current counter value (plaintext)
     */
    function getCount() external view returns (uint32) {
        // ⚠️  Returns plaintext value visible to everyone
        return counter;
    }

    /**
     * @notice Reset counter to zero
     * @dev Only owner can reset
     */
    function reset() external {
        require(msg.sender == owner, "Only owner can reset");
        counter = 0;
        emit CounterReset(msg.sender, block.timestamp);
    }

    /**
     * @notice Check if counter is above threshold
     * @dev ⚠️  PRIVACY ISSUE: Result is visible to everyone
     *
     * @param threshold Value to compare against
     * @return True if counter >= threshold
     */
    function isAboveThreshold(uint32 threshold) external view returns (bool) {
        return counter >= threshold;
    }
}

/**
 * @dev COMPARISON: SimpleCounter vs FHECounter
 *
 * ==================================================================================
 * FEATURE                  | SimpleCounter        | FHECounter (Encrypted)
 * ==================================================================================
 * Storage Privacy          | ❌ Public           | ✅ Encrypted
 * Input Privacy            | ❌ Visible          | ✅ Encrypted
 * Operation Privacy        | ❌ All visible      | ✅ Private operations
 * Result Privacy           | ❌ Anyone can read  | ✅ Permission-based
 * Event Data               | ❌ Exposes values   | ✅ No value exposure
 * Gas Costs                | ✅ Lower (~50k)     | ❌ Higher (~150k)
 * Implementation           | ✅ Simpler          | ⚠️  More complex
 * Security                 | ⚠️  No privacy      | ✅ Cryptographic privacy
 * ==================================================================================
 *
 * PRIVACY ISSUES IN SimpleCounter:
 *
 * 1. STORAGE IS PUBLIC:
 *    ```solidity
 *    uint32 private counter;  // ⚠️ "private" only means no external getter
 *                              // Anyone can read storage directly
 *    ```
 *    Solution: Use `euint32` in FHECounter
 *
 * 2. FUNCTION PARAMETERS ARE VISIBLE:
 *    ```solidity
 *    function increment(uint32 value) {  // ⚠️ value visible in transaction
 *        counter += value;
 *    }
 *    ```
 *    Solution: Use encrypted inputs in FHECounter
 *
 * 3. EVENTS EXPOSE DATA:
 *    ```solidity
 *    emit CounterIncremented(msg.sender, counter, timestamp);
 *                                      // ⚠️ Exposes new value
 *    ```
 *    Solution: Don't emit values in FHECounter events
 *
 * 4. RETURN VALUES ARE PUBLIC:
 *    ```solidity
 *    function getCount() returns (uint32) {
 *        return counter;  // ⚠️ Anyone can call and see value
 *    }
 *    ```
 *    Solution: Return encrypted value in FHECounter
 *
 * WHY USE FHE INSTEAD?
 *
 * Use FHECounter when:
 * ✅ Value privacy is critical
 * ✅ Operations should be confidential
 * ✅ Only specific users should decrypt results
 * ✅ Compliance requires data privacy
 * ✅ Competitive advantage from privacy
 *
 * Use SimpleCounter when:
 * ✅ Transparency is required
 * ✅ Gas costs are critical concern
 * ✅ Public auditability is needed
 * ✅ No privacy requirements
 *
 * REAL-WORLD EXAMPLES:
 *
 * SimpleCounter appropriate for:
 * - Public vote counts
 * - Total supply of tokens
 * - Nonce counters
 * - Public statistics
 *
 * FHECounter necessary for:
 * - Private voting tallies (until reveal)
 * - Confidential user scores
 * - Secret inventory counts
 * - Hidden bid amounts
 * - Private financial data
 *
 * MIGRATION PATH:
 *
 * Converting SimpleCounter to FHECounter:
 * 1. Replace `uint32` with `euint32`
 * 2. Use `inEuint32` for function inputs
 * 3. Add proof validation with `FHE.asEuint32()`
 * 4. Add permission grants with `FHE.allow()`
 * 5. Remove value data from events
 * 6. Update client code to use fhevmjs
 *
 * See FHECounter.sol for the encrypted implementation!
 */
