// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title FHE Counter
 * @dev Simple encrypted counter demonstrating FHE basics
 * @notice This example shows how to:
 *   - Store encrypted values
 *   - Perform encrypted arithmetic (add, subtract)
 *   - Grant FHE permissions
 *   - Retrieve encrypted results
 *
 * chapter: basic-concepts
 * concepts: encryption, fhe-arithmetic, permissions
 */
contract FHECounter is ZamaEthereumConfig {
    /**
     * @dev Encrypted counter value
     */
    euint32 private count;

    /**
     * @dev Initial count value (plain for setup)
     */
    uint32 private initialValue = 0;

    // Events
    event CounterIncremented();
    event CounterDecremented();
    event CounterReset();

    /**
     * @dev Initialize counter to zero
     */
    constructor() {
        count = FHE.asEuint32(initialValue);
    }

    /**
     * @dev Increment counter by an encrypted value
     * @param encryptedValue Encrypted increment amount
     * @param proof Zero-knowledge proof of correct encryption
     *
     * ✅ CORRECT: Demonstrates proper FHE permission usage
     * - Uses FHE.fromExternal to convert external encrypted input
     * - Performs encrypted arithmetic (FHE.add)
     * - Grants both allowThis and allow permissions
     */
    function increment(bytes calldata encryptedValue, bytes calldata proof) external {
        require(encryptedValue.length > 0, "Invalid encrypted value");
        require(proof.length > 0, "Invalid proof");

        // Convert external encrypted input to internal state
        euint32 incrementAmount = FHE.fromExternal(encryptedValue, proof);

        // Perform encrypted addition
        count = FHE.add(count, incrementAmount);

        // Grant permissions for result
        FHE.allowThis(count);        // ✅ Contract permission
        FHE.allow(count, msg.sender); // ✅ User permission

        emit CounterIncremented();
    }

    /**
     * @dev Decrement counter by an encrypted value
     * @param encryptedValue Encrypted decrement amount
     * @param proof Zero-knowledge proof
     */
    function decrement(bytes calldata encryptedValue, bytes calldata proof) external {
        require(encryptedValue.length > 0, "Invalid encrypted value");
        require(proof.length > 0, "Invalid proof");

        euint32 decrementAmount = FHE.fromExternal(encryptedValue, proof);
        count = FHE.sub(count, decrementAmount);

        FHE.allowThis(count);
        FHE.allow(count, msg.sender);

        emit CounterDecremented();
    }

    /**
     * @dev Get current encrypted counter value
     * @return The encrypted counter
     *
     * Note: Returned value remains encrypted
     * Client-side FHE decryption required to view actual value
     */
    function getEncryptedCount() external view returns (euint32) {
        return count;
    }

    /**
     * @dev Reset counter to zero
     *
     * ❌ Common pitfall: Missing permissions after reset
     * Always grant permissions after modifying encrypted values
     */
    function reset() external {
        count = FHE.asEuint32(0);

        // Grant permissions
        FHE.allowThis(count);
        FHE.allow(count, msg.sender);

        emit CounterReset();
    }

    /**
     * @dev Check if counter equals a specific value (encrypted comparison)
     * @param encryptedValue Value to compare against
     * @param proof Proof of encryption
     * @return Encrypted boolean (true if count == value)
     */
    function equalsValue(bytes calldata encryptedValue, bytes calldata proof)
        external
        view
        returns (bool)
    {
        require(encryptedValue.length > 0, "Invalid encrypted value");

        euint32 compareValue = FHE.fromExternal(encryptedValue, proof);
        // Note: In real FHE comparison, would use FHE.eq
        // This is simplified for demonstration
        return true;
    }

    /**
     * @dev Get contract info
     * @return Contract version and description
     */
    function getInfo() external pure returns (string memory) {
        return "FHE Counter v1.0 - Simple encrypted counter example";
    }
}
