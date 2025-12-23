// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint32, inEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title UserDecryptSingleValue
 * @notice Demonstrates user-only decryption pattern
 * @dev Shows how to create encrypted values that only the user can decrypt
 */
contract UserDecryptSingleValue is ZamaEthereumConfig {
    // Each user has their own encrypted secret value
    mapping(address => euint32) private userSecrets;

    // Track if user has set a secret
    mapping(address => bool) private hasSecret;

    // Events (note: do NOT emit decrypted values!)
    event SecretStored(address indexed user, uint256 timestamp);
    event SecretAccessed(address indexed user, uint256 timestamp);

    /**
     * @notice Store a secret encrypted value
     * @dev Only the user who stores the value can decrypt it
     *
     * @param inputHandle Encrypted input handle
     * @param inputProof Zero-knowledge proof
     */
    function storeSecret(inEuint32 calldata inputHandle, bytes calldata inputProof) external {
        // Convert to encrypted value
        euint32 secret = FHE.asEuint32(inputHandle, inputProof);

        // Store the secret
        userSecrets[msg.sender] = secret;
        hasSecret[msg.sender] = true;

        // ✅ CRITICAL FOR DECRYPTION:
        // Grant contract permission to work with the value
        FHE.allowThis(secret);

        // Grant ONLY the user permission to decrypt
        // This ensures only msg.sender can decrypt this value
        FHE.allow(secret, msg.sender);

        emit SecretStored(msg.sender, block.timestamp);
    }

    /**
     * @notice Retrieve your own encrypted secret
     * @dev Returns encrypted value that only the caller can decrypt
     *
     * @return The encrypted secret value
     *
     * USAGE PATTERN:
     * 1. Call this function to get encrypted handle
     * 2. Use fhevmjs client-side to decrypt:
     *    const encrypted = await contract.getMySecret();
     *    const decrypted = await fhevm.decrypt(encrypted, userPrivateKey);
     */
    function getMySecret() external view returns (euint32) {
        require(hasSecret[msg.sender], "No secret stored");

        emit SecretAccessed(msg.sender, block.timestamp);

        return userSecrets[msg.sender];
    }

    /**
     * @notice Check if you have a secret stored
     * @return True if caller has stored a secret
     */
    function haveSecret() external view returns (bool) {
        return hasSecret[msg.sender];
    }

    /**
     * @notice Compare your secret with a threshold (result is encrypted)
     * @dev Demonstrates encrypted comparison without revealing the secret
     *
     * @param threshold Plaintext threshold to compare against
     * @return Encrypted boolean result (true if secret >= threshold)
     */
    function isSecretAboveThreshold(uint32 threshold) external view returns (ebool) {
        require(hasSecret[msg.sender], "No secret stored");

        // Convert threshold to encrypted value
        euint32 encThreshold = FHE.asEuint32(threshold);

        // Compare (result is encrypted)
        return FHE.gte(userSecrets[msg.sender], encThreshold);
    }

    /**
     * @notice Add to your secret value
     * @dev Demonstrates FHE arithmetic while maintaining privacy
     *
     * @param inputHandle Encrypted value to add
     * @param inputProof Proof for the value
     */
    function addToSecret(inEuint32 calldata inputHandle, bytes calldata inputProof) external {
        require(hasSecret[msg.sender], "No secret stored");

        // Convert input to encrypted value
        euint32 toAdd = FHE.asEuint32(inputHandle, inputProof);

        // Add to existing secret (all operations on encrypted values)
        userSecrets[msg.sender] = FHE.add(userSecrets[msg.sender], toAdd);

        // Grant permissions for the new result
        FHE.allowThis(userSecrets[msg.sender]);
        FHE.allow(userSecrets[msg.sender], msg.sender);
    }

    /**
     * ❌ ANTI-PATTERN: DO NOT DO THIS
     * @dev This function demonstrates what NOT to do
     *
     * function getSecretPlaintext() external view returns (uint32) {
     *     // ❌ WRONG: Never decrypt on-chain
     *     // This would expose the secret to everyone
     *     return FHE.decrypt(userSecrets[msg.sender]);
     * }
     *
     * WHY THIS IS WRONG:
     * - Decryption on-chain exposes plaintext to all nodes
     * - Anyone can read transaction data and see the decrypted value
     * - Defeats the entire purpose of encryption
     *
     * CORRECT APPROACH:
     * - Return encrypted value from contract
     * - Decrypt client-side using fhevmjs
     * - Only user with private key can decrypt
     */

    /**
     * @notice Delete your secret
     * @dev Clears the stored encrypted value
     */
    function deleteSecret() external {
        require(hasSecret[msg.sender], "No secret stored");

        // Clear storage
        delete userSecrets[msg.sender];
        delete hasSecret[msg.sender];
    }

    /**
     * ❌ ANTI-PATTERN: DO NOT GRANT PERMISSION TO EVERYONE
     * @dev This demonstrates a security mistake
     *
     * function badPermissionPattern() external {
     *     // ❌ WRONG: Granting permission to address(0) or everyone
     *     FHE.allow(userSecrets[msg.sender], address(0));
     *
     *     // This would allow anyone to decrypt the value
     *     // Only grant permissions to specific, trusted addresses
     * }
     */
}

/**
 * @dev User Decryption Pattern - Complete Flow:
 *
 * 1. ON-CHAIN (SMART CONTRACT):
 *    ```solidity
 *    function storeSecret(inEuint32 input, bytes proof) {
 *        euint32 secret = FHE.asEuint32(input, proof);
 *        FHE.allowThis(secret);
 *        FHE.allow(secret, msg.sender);  // ← Only user can decrypt
 *    }
 *
 *    function getMySecret() returns (euint32) {
 *        return userSecrets[msg.sender];  // ← Returns encrypted
 *    }
 *    ```
 *
 * 2. CLIENT-SIDE (JAVASCRIPT):
 *    ```javascript
 *    // Store encrypted secret
 *    const fhevm = await createInstance({ chainId: 8009 });
 *    const encrypted = fhevm.encrypt32(mySecretValue);
 *    await contract.storeSecret(encrypted.handles[0], encrypted.inputProof);
 *
 *    // Retrieve and decrypt
 *    const encryptedResult = await contract.getMySecret();
 *    const publicKey = await fhevm.generatePublicKey({
 *        verifyingContract: contractAddress,
 *        userAddress: myAddress
 *    });
 *    const decrypted = fhevm.decrypt(encryptedResult, publicKey.privateKey);
 *    console.log("My secret:", decrypted);
 *    ```
 *
 * 3. PRIVACY GUARANTEES:
 *    ✅ Secret never exposed as plaintext on-chain
 *    ✅ Only user with private key can decrypt
 *    ✅ Contract can perform operations without seeing plaintext
 *    ✅ Other users cannot decrypt even if they call getMySecret()
 *
 * 4. COMMON USE CASES:
 *    - Private balances
 *    - Secret voting choices
 *    - Confidential health data
 *    - Personal financial information
 *    - Private game scores
 *    - Hidden auction bids
 *
 * SECURITY NOTES:
 * ⚠️  Never decrypt on-chain (exposes to all nodes)
 * ⚠️  Never log decrypted values in events
 * ⚠️  Be careful with permission grants
 * ⚠️  Client-side decryption requires user's private key
 * ⚠️  Validate all inputs before encryption
 */
