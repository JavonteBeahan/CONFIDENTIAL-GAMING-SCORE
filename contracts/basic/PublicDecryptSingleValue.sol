// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint32, inEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title PublicDecryptSingleValue
 * @notice Demonstrates public decryption where results become visible on-chain
 * @dev Shows when and how to use public decryption responsibly
 *
 * ⚠️  WARNING: Public decryption exposes data to everyone!
 * Only use when the result SHOULD be public.
 */
contract PublicDecryptSingleValue is ZamaEthereumConfig {
    // Encrypted values (private)
    mapping(address => euint32) private encryptedBalances;
    mapping(address => bool) private hasBalance;

    // Publicly decrypted results
    mapping(address => uint32) public publicBalances;
    mapping(address => bool) public hasPublicBalance;

    // Events
    event BalanceStored(address indexed user, uint256 timestamp);
    event BalanceRevealed(address indexed user, uint32 amount, uint256 timestamp);

    /**
     * @notice Store an encrypted balance
     * @dev Balance remains private until explicitly revealed
     *
     * @param inputHandle Encrypted balance input
     * @param inputProof Proof of valid encryption
     */
    function storeBalance(inEuint32 calldata inputHandle, bytes calldata inputProof) external {
        euint32 balance = FHE.asEuint32(inputHandle, inputProof);

        encryptedBalances[msg.sender] = balance;
        hasBalance[msg.sender] = true;

        // Grant permissions
        FHE.allowThis(balance);
        FHE.allow(balance, msg.sender);

        emit BalanceStored(msg.sender, block.timestamp);
    }

    /**
     * @notice Get encrypted balance (still private)
     * @dev Returns encrypted value that only owner can decrypt
     *
     * @return Encrypted balance
     */
    function getEncryptedBalance() external view returns (euint32) {
        require(hasBalance[msg.sender], "No balance stored");
        return encryptedBalances[msg.sender];
    }

    /**
     * @notice Reveal balance publicly
     * @dev ⚠️  MAKES BALANCE VISIBLE TO EVERYONE!
     *
     * USE CASES FOR PUBLIC DECRYPTION:
     * - Final auction winner amount (after auction ends)
     * - Voting results (after voting period)
     * - Lottery winner (after draw)
     * - Game final score (after game ends)
     * - Tournament leaderboard (after competition)
     *
     * DON'T USE FOR:
     * - Private user balances
     * - Ongoing game scores
     * - Hidden bids (before reveal)
     * - Personal financial data
     * - Any data that should remain private
     */
    function revealBalance() external {
        require(hasBalance[msg.sender], "No balance stored");
        require(!hasPublicBalance[msg.sender], "Already revealed");

        // ⚠️  PUBLIC DECRYPTION: This exposes the plaintext value!
        uint32 revealedBalance = FHE.decrypt(encryptedBalances[msg.sender]);

        // Store publicly visible result
        publicBalances[msg.sender] = revealedBalance;
        hasPublicBalance[msg.sender] = true;

        // ⚠️  This event exposes the decrypted value to everyone!
        emit BalanceRevealed(msg.sender, revealedBalance, block.timestamp);
    }

    /**
     * @notice Get publicly revealed balance
     * @dev Anyone can call this after revelation
     *
     * @param user Address to query
     * @return The revealed balance (plaintext)
     */
    function getPublicBalance(address user) external view returns (uint32) {
        require(hasPublicBalance[user], "Balance not revealed");
        return publicBalances[user];
    }

    /**
     * @notice Check if balance has been revealed
     * @param user Address to check
     * @return True if balance is publicly visible
     */
    function isRevealed(address user) external view returns (bool) {
        return hasPublicBalance[user];
    }

    /**
     * @notice Compare encrypted balance with threshold and reveal result
     * @dev Reveals only the comparison result, not the actual value
     *
     * USE CASE: "Prove I have at least X without revealing exact amount"
     *
     * @param threshold Amount to compare against
     * @return True if balance >= threshold
     */
    function revealAboveThreshold(uint32 threshold) external returns (bool) {
        require(hasBalance[msg.sender], "No balance stored");

        // Compare encrypted value with threshold
        ebool result = FHE.gte(
            encryptedBalances[msg.sender],
            FHE.asEuint32(threshold)
        );

        // ⚠️  Decrypt and reveal the comparison result (not the actual balance)
        bool isAbove = FHE.decrypt(result);

        return isAbove;
    }

    /**
     * @notice Example: Conditional revelation based on time
     * @dev Shows pattern for reveal-after-deadline scenarios
     *
     * @param deadline Block timestamp after which revelation is allowed
     */
    function timedReveal(uint256 deadline) external returns (uint32) {
        require(hasBalance[msg.sender], "No balance stored");
        require(block.timestamp >= deadline, "Deadline not reached");
        require(!hasPublicBalance[msg.sender], "Already revealed");

        // Decrypt after deadline
        uint32 revealedBalance = FHE.decrypt(encryptedBalances[msg.sender]);

        publicBalances[msg.sender] = revealedBalance;
        hasPublicBalance[msg.sender] = true;

        emit BalanceRevealed(msg.sender, revealedBalance, block.timestamp);

        return revealedBalance;
    }
}

/**
 * @dev PUBLIC DECRYPTION - WHEN TO USE
 *
 * ============================================================================
 * APPROPRIATE USE CASES
 * ============================================================================
 *
 * 1. **SEALED-BID AUCTIONS**
 *    ```solidity
 *    // During auction: bids are encrypted
 *    function placeBid(inEuint32 bid, bytes proof) external;
 *
 *    // After auction ends: reveal winning bid
 *    function revealWinner() external returns (uint32 winningBid) {
 *        require(block.timestamp > auctionEnd, "Auction ongoing");
 *        return FHE.decrypt(highestBid);  // ✅ OK: Auction ended
 *    }
 *    ```
 *
 * 2. **VOTING RESULTS**
 *    ```solidity
 *    // During voting: votes encrypted
 *    function vote(inEuint8 choice, bytes proof) external;
 *
 *    // After voting: reveal totals
 *    function revealResults() external returns (uint32[]) {
 *        require(block.timestamp > votingEnd, "Voting ongoing");
 *        // ✅ OK: Voting period ended
 *        return decryptAllTotals();
 *    }
 *    ```
 *
 * 3. **LOTTERY DRAWINGS**
 *    ```solidity
 *    // Encrypted random selection
 *    function draw() external returns (address winner) {
 *        euint32 randomIndex = generateRandom();
 *        // ✅ OK: Result should be public
 *        return FHE.decrypt(randomIndex);
 *    }
 *    ```
 *
 * 4. **GAME FINAL SCORES**
 *    ```solidity
 *    // During game: scores encrypted
 *    // After game: reveal final standings
 *    function revealFinalScore() external returns (uint32) {
 *        require(gameEnded, "Game ongoing");
 *        // ✅ OK: Game ended, scores should be public
 *        return FHE.decrypt(playerScores[msg.sender]);
 *    }
 *    ```
 *
 * 5. **THRESHOLD CHECKS**
 *    ```solidity
 *    // Reveal only IF condition met
 *    function revealIfQualified(uint32 threshold) external returns (bool) {
 *        ebool qualified = FHE.gte(score, FHE.asEuint32(threshold));
 *        // ✅ OK: Only revealing yes/no, not actual score
 *        return FHE.decrypt(qualified);
 *    }
 *    ```
 *
 * ============================================================================
 * INAPPROPRIATE USE CASES (DON'T DO THIS!)
 * ============================================================================
 *
 * ❌ **USER BALANCES**
 *    ```solidity
 *    function getBalance() external view returns (uint32) {
 *        return FHE.decrypt(balances[msg.sender]);  // ❌ WRONG!
 *    }
 *    // Problem: Exposes user balance to everyone
 *    ```
 *
 * ❌ **ONGOING GAME SCORES**
 *    ```solidity
 *    function getCurrentScore() external returns (uint32) {
 *        return FHE.decrypt(scores[msg.sender]);  // ❌ WRONG!
 *    }
 *    // Problem: Reveals score before game ends
 *    ```
 *
 * ❌ **ACTIVE AUCTION BIDS**
 *    ```solidity
 *    function viewBid(address bidder) external returns (uint32) {
 *        return FHE.decrypt(bids[bidder]);  // ❌ WRONG!
 *    }
 *    // Problem: Defeats purpose of sealed bids
 *    ```
 *
 * ❌ **PERSONAL DATA**
 *    ```solidity
 *    function getAge() external view returns (uint32) {
 *        return FHE.decrypt(ages[msg.sender]);  // ❌ WRONG!
 *    }
 *    // Problem: Should remain private
 *    ```
 *
 * ============================================================================
 * SECURITY GUIDELINES
 * ============================================================================
 *
 * ✅ DO:
 * - Use public decryption for results that SHOULD be public
 * - Implement time-locks or conditions before revelation
 * - Decrypt only after process completion (auction end, vote end, etc.)
 * - Document why public decryption is necessary
 * - Consider revealing only partial information (yes/no vs exact value)
 *
 * ❌ DON'T:
 * - Decrypt user balances publicly
 * - Decrypt during ongoing processes
 * - Decrypt personal/private information
 * - Decrypt without access control checks
 * - Assume decryption is free (gas costs!)
 *
 * ============================================================================
 * ALTERNATIVE PATTERNS
 * ============================================================================
 *
 * Instead of public decryption, consider:
 *
 * 1. **USER-ONLY DECRYPTION**
 *    ```solidity
 *    function getBalance() external view returns (euint32) {
 *        return balances[msg.sender];  // ✅ Return encrypted
 *    }
 *    // User decrypts client-side with their private key
 *    ```
 *
 * 2. **ENCRYPTED COMPARISONS**
 *    ```solidity
 *    function isAboveThreshold(uint32 t) external view returns (ebool) {
 *        return FHE.gte(balance, FHE.asEuint32(t));  // ✅ Result encrypted
 *    }
 *    // Comparison result stays encrypted
 *    ```
 *
 * 3. **ZERO-KNOWLEDGE PROOFS**
 *    ```solidity
 *    // Prove property without revealing value
 *    function proveEligibility() external view returns (bool) {
 *        // Use ZK proof instead of decryption
 *    }
 *    ```
 *
 * ============================================================================
 * GAS COSTS
 * ============================================================================
 *
 * Operation                    | Gas Cost (approx)
 * -----------------------------|------------------
 * FHE.decrypt(euint32)        | ~100,000 - 200,000
 * FHE.decrypt(euint16)        | ~80,000 - 150,000
 * FHE.decrypt(euint8)         | ~60,000 - 120,000
 * FHE.decrypt(ebool)          | ~50,000 - 100,000
 *
 * Public decryption is EXPENSIVE! Use sparingly.
 *
 * ============================================================================
 * SUMMARY
 * ============================================================================
 *
 * Public decryption is a powerful tool but must be used responsibly:
 *
 * ✅ Use when: Result SHOULD be public (auction winners, vote results)
 * ✅ Use when: Process has completed (after deadline, after game)
 * ✅ Use when: Transparency is required
 *
 * ❌ Don't use: For private user data
 * ❌ Don't use: During ongoing processes
 * ❌ Don't use: When user-only decryption would work
 *
 * **Default to user-only decryption. Use public decryption only when necessary.**
 */
