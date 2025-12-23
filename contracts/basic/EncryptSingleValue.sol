// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint32, inEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title EncryptSingleValue
 * @notice Demonstrates how to encrypt a single value and store it on-chain
 * @dev This example shows the basic pattern for accepting encrypted input
 */
contract EncryptSingleValue is ZamaEthereumConfig {
    // Storage for encrypted value
    euint32 private encryptedValue;

    // Track the owner of the encrypted value
    address private valueOwner;

    // Event emitted when value is stored
    event ValueStored(address indexed owner, uint256 timestamp);

    /**
     * @notice Store an encrypted value
     * @dev This function demonstrates the correct pattern for accepting encrypted input:
     *      1. Accept encrypted input handle and proof
     *      2. Convert to internal encrypted type using FHE.asEuint32
     *      3. Grant permissions using FHE.allowThis and FHE.allow
     *
     * @param inputHandle The encrypted input handle from client
     * @param inputProof Zero-knowledge proof that the encryption is valid
     */
    function storeValue(inEuint32 calldata inputHandle, bytes calldata inputProof) external {
        // Convert external encrypted input to internal encrypted value
        // This validates the input proof and binds the value to this contract
        euint32 value = FHE.asEuint32(inputHandle, inputProof);

        // Store the encrypted value
        encryptedValue = value;
        valueOwner = msg.sender;

        // ✅ CRITICAL: Always grant both permissions
        // Without these, the contract cannot perform operations on the value
        FHE.allowThis(encryptedValue);

        // Grant permission to the sender to decrypt the value
        FHE.allow(encryptedValue, msg.sender);

        emit ValueStored(msg.sender, block.timestamp);
    }

    /**
     * @notice Retrieve the encrypted value
     * @dev The returned value is still encrypted and can only be decrypted
     *      by addresses that have been granted permission
     * @return The encrypted value
     */
    function getValue() external view returns (euint32) {
        return encryptedValue;
    }

    /**
     * @notice Get the owner of the stored value
     * @return The address that stored the value
     */
    function getOwner() external view returns (address) {
        return valueOwner;
    }

    /**
     * @notice Grant permission to another address to decrypt the value
     * @dev Only the owner can grant permissions to others
     * @param account The address to grant permission to
     */
    function grantPermission(address account) external {
        require(msg.sender == valueOwner, "Only owner can grant permissions");
        FHE.allow(encryptedValue, account);
    }
}

/**
 * @dev Key Concepts Demonstrated:
 *
 * 1. ENCRYPTION INPUT:
 *    - Client encrypts data locally using fhevmjs
 *    - Sends encrypted handle + proof to contract
 *    - Contract validates proof and stores encrypted value
 *
 * 2. PERMISSION SYSTEM:
 *    - FHE.allowThis() - Contract needs this to perform operations
 *    - FHE.allow(value, address) - Grants decryption permission to address
 *    - Both permissions are required for proper functionality
 *
 * 3. PRIVACY GUARANTEES:
 *    - Original plaintext value never exposed on-chain
 *    - Only addresses with explicit permission can decrypt
 *    - Contract can perform operations without seeing plaintext
 *
 * COMMON MISTAKES TO AVOID:
 * ❌ Forgetting FHE.allowThis() - Operations will fail
 * ❌ Not validating input proof - Security vulnerability
 * ❌ Exposing decrypted values in events - Privacy leak
 * ❌ Missing permission grants - Users cannot decrypt results
 */
