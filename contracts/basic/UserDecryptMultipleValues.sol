// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint32, euint16, euint8, inEuint32, inEuint16, inEuint8 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title UserDecryptMultipleValues
 * @notice Demonstrates user decryption of multiple encrypted values
 * @dev Shows patterns for managing and decrypting multiple user secrets
 */
contract UserDecryptMultipleValues is ZamaEthereumConfig {
    /**
     * @dev User data structure with multiple encrypted values
     */
    struct UserSecrets {
        euint32 value1;
        euint16 value2;
        euint8 value3;
        bool initialized;
    }

    // Mapping from user address to their encrypted secrets
    mapping(address => UserSecrets) private userSecrets;

    // Events (no sensitive data exposed)
    event SecretsStored(address indexed user, uint256 timestamp);
    event SecretUpdated(address indexed user, uint8 valueIndex, uint256 timestamp);
    event SecretsCleared(address indexed user, uint256 timestamp);

    /**
     * @notice Store multiple encrypted values at once
     * @dev Demonstrates batch storage with different encrypted types
     *
     * @param input1 First encrypted value (euint32)
     * @param proof1 Proof for first value
     * @param input2 Second encrypted value (euint16)
     * @param proof2 Proof for second value
     * @param input3 Third encrypted value (euint8)
     * @param proof3 Proof for third value
     */
    function storeSecrets(
        inEuint32 calldata input1,
        bytes calldata proof1,
        inEuint16 calldata input2,
        bytes calldata proof2,
        inEuint8 calldata input3,
        bytes calldata proof3
    ) external {
        // Convert all inputs to encrypted values
        euint32 secret1 = FHE.asEuint32(input1, proof1);
        euint16 secret2 = FHE.asEuint16(input2, proof2);
        euint8 secret3 = FHE.asEuint8(input3, proof3);

        // Store all secrets
        userSecrets[msg.sender] = UserSecrets({
            value1: secret1,
            value2: secret2,
            value3: secret3,
            initialized: true
        });

        // ✅ CRITICAL: Grant permissions for ALL values
        // Each encrypted value needs both allowThis and allow
        FHE.allowThis(secret1);
        FHE.allow(secret1, msg.sender);

        FHE.allowThis(secret2);
        FHE.allow(secret2, msg.sender);

        FHE.allowThis(secret3);
        FHE.allow(secret3, msg.sender);

        emit SecretsStored(msg.sender, block.timestamp);
    }

    /**
     * @notice Get all encrypted secrets
     * @dev Returns all three encrypted values in one call
     *
     * DECRYPTION PATTERN (client-side):
     * ```javascript
     * const [val1, val2, val3] = await contract.getAllSecrets();
     *
     * const decrypted1 = await fhevm.decrypt(val1, privateKey);
     * const decrypted2 = await fhevm.decrypt(val2, privateKey);
     * const decrypted3 = await fhevm.decrypt(val3, privateKey);
     * ```
     *
     * @return value1 First encrypted secret (euint32)
     * @return value2 Second encrypted secret (euint16)
     * @return value3 Third encrypted secret (euint8)
     */
    function getAllSecrets()
        external
        view
        returns (euint32 value1, euint16 value2, euint8 value3)
    {
        require(userSecrets[msg.sender].initialized, "No secrets stored");
        UserSecrets memory secrets = userSecrets[msg.sender];
        return (secrets.value1, secrets.value2, secrets.value3);
    }

    /**
     * @notice Get a specific encrypted secret by index
     * @dev Returns one of the three values based on index
     *
     * @param index Which value to retrieve (1, 2, or 3)
     * @return secret The requested encrypted value
     */
    function getSecret(uint8 index) external view returns (bytes memory secret) {
        require(userSecrets[msg.sender].initialized, "No secrets stored");
        require(index >= 1 && index <= 3, "Invalid index");

        UserSecrets memory secrets = userSecrets[msg.sender];

        if (index == 1) {
            // Return euint32 as bytes
            return abi.encode(secrets.value1);
        } else if (index == 2) {
            // Return euint16 as bytes
            return abi.encode(secrets.value2);
        } else {
            // Return euint8 as bytes
            return abi.encode(secrets.value3);
        }
    }

    /**
     * @notice Update a single secret without affecting others
     * @dev Demonstrates selective updates
     *
     * @param index Which value to update (1, 2, or 3)
     * @param input32 New value (if updating value1)
     * @param input16 New value (if updating value2)
     * @param input8 New value (if updating value3)
     * @param proof Proof for the new value
     */
    function updateSecret(
        uint8 index,
        inEuint32 calldata input32,
        inEuint16 calldata input16,
        inEuint8 calldata input8,
        bytes calldata proof
    ) external {
        require(userSecrets[msg.sender].initialized, "No secrets stored");
        require(index >= 1 && index <= 3, "Invalid index");

        if (index == 1) {
            euint32 newValue = FHE.asEuint32(input32, proof);
            userSecrets[msg.sender].value1 = newValue;
            FHE.allowThis(newValue);
            FHE.allow(newValue, msg.sender);
        } else if (index == 2) {
            euint16 newValue = FHE.asEuint16(input16, proof);
            userSecrets[msg.sender].value2 = newValue;
            FHE.allowThis(newValue);
            FHE.allow(newValue, msg.sender);
        } else {
            euint8 newValue = FHE.asEuint8(input8, proof);
            userSecrets[msg.sender].value3 = newValue;
            FHE.allowThis(newValue);
            FHE.allow(newValue, msg.sender);
        }

        emit SecretUpdated(msg.sender, index, block.timestamp);
    }

    /**
     * @notice Compute sum of all secrets (result is encrypted)
     * @dev Demonstrates FHE arithmetic across different types
     *
     * @return Encrypted sum of all three values (as euint32)
     */
    function computeSum() external view returns (euint32) {
        require(userSecrets[msg.sender].initialized, "No secrets stored");

        UserSecrets memory secrets = userSecrets[msg.sender];

        // Convert smaller types to euint32 for addition
        euint32 val2As32 = FHE.asEuint32(secrets.value2);
        euint32 val3As32 = FHE.asEuint32(secrets.value3);

        // Add all values
        euint32 sum = FHE.add(secrets.value1, val2As32);
        sum = FHE.add(sum, val3As32);

        return sum;
    }

    /**
     * @notice Check if user has secrets stored
     * @return True if user has initialized secrets
     */
    function hasSecrets() external view returns (bool) {
        return userSecrets[msg.sender].initialized;
    }

    /**
     * @notice Clear all secrets
     * @dev Deletes all stored encrypted values
     */
    function clearSecrets() external {
        require(userSecrets[msg.sender].initialized, "No secrets stored");
        delete userSecrets[msg.sender];
        emit SecretsCleared(msg.sender, block.timestamp);
    }

    /**
     * @notice Grant permission to another address to decrypt all secrets
     * @dev SECURITY: Only grant to trusted addresses!
     *
     * @param account Address to grant decryption permissions
     */
    function grantPermissionToAll(address account) external {
        require(userSecrets[msg.sender].initialized, "No secrets stored");
        require(account != address(0), "Invalid address");

        UserSecrets memory secrets = userSecrets[msg.sender];

        // Grant permission for each value
        FHE.allow(secrets.value1, account);
        FHE.allow(secrets.value2, account);
        FHE.allow(secrets.value3, account);
    }
}

/**
 * @dev COMPLETE CLIENT-SIDE DECRYPTION FLOW
 *
 * ============================================================================
 * STEP 1: STORE ENCRYPTED VALUES
 * ============================================================================
 *
 * ```javascript
 * import { createInstance } from 'fhevmjs';
 * import { ethers } from 'ethers';
 *
 * // Initialize FHEVM
 * const fhevm = await createInstance({ chainId: 8009 });
 * const contractAddress = await contract.getAddress();
 * const userAddress = await signer.getAddress();
 *
 * // Create encrypted inputs
 * const input = fhevm.createEncryptedInput(contractAddress, userAddress);
 * input.add32(1000);    // First secret (euint32)
 * input.add16(500);     // Second secret (euint16)
 * input.add8(50);       // Third secret (euint8)
 *
 * const encrypted = input.encrypt();
 *
 * // Store on-chain
 * await contract.storeSecrets(
 *     encrypted.handles[0], encrypted.inputProof,
 *     encrypted.handles[1], encrypted.inputProof,
 *     encrypted.handles[2], encrypted.inputProof
 * );
 * ```
 *
 * ============================================================================
 * STEP 2: RETRIEVE ENCRYPTED VALUES
 * ============================================================================
 *
 * ```javascript
 * // Get all encrypted secrets
 * const [enc1, enc2, enc3] = await contract.getAllSecrets();
 *
 * console.log("Encrypted values retrieved");
 * // Still encrypted at this point!
 * ```
 *
 * ============================================================================
 * STEP 3: DECRYPT CLIENT-SIDE
 * ============================================================================
 *
 * ```javascript
 * // Generate public key for decryption
 * const publicKey = await fhevm.generatePublicKey({
 *     verifyingContract: contractAddress,
 *     userAddress: userAddress
 * });
 *
 * // Decrypt each value
 * const secret1 = await fhevm.decrypt(enc1, publicKey.privateKey);
 * const secret2 = await fhevm.decrypt(enc2, publicKey.privateKey);
 * const secret3 = await fhevm.decrypt(enc3, publicKey.privateKey);
 *
 * console.log("Decrypted secrets:", secret1, secret2, secret3);
 * // Output: 1000, 500, 50
 * ```
 *
 * ============================================================================
 * BATCH DECRYPTION (MORE EFFICIENT)
 * ============================================================================
 *
 * ```javascript
 * // Decrypt multiple values in one operation
 * const [enc1, enc2, enc3] = await contract.getAllSecrets();
 *
 * const decrypted = await Promise.all([
 *     fhevm.decrypt(enc1, publicKey.privateKey),
 *     fhevm.decrypt(enc2, publicKey.privateKey),
 *     fhevm.decrypt(enc3, publicKey.privateKey)
 * ]);
 *
 * console.log("All secrets:", decrypted);
 * ```
 *
 * ============================================================================
 * PRIVACY GUARANTEES
 * ============================================================================
 *
 * ✅ Secrets never exposed as plaintext on-chain
 * ✅ Only user with private key can decrypt
 * ✅ Contract can perform operations without seeing plaintext
 * ✅ Other users cannot decrypt even if they call getAllSecrets()
 * ✅ Each value has independent encryption and permissions
 *
 * ============================================================================
 * COMMON USE CASES
 * ============================================================================
 *
 * 1. **Multi-factor Authentication Secrets**
 *    - Store password hash, PIN, and security question answer
 *
 * 2. **Financial Portfolio**
 *    - Balance, investment amount, and credit score
 *
 * 3. **Health Records**
 *    - Blood pressure, cholesterol, and glucose levels
 *
 * 4. **Gaming Stats**
 *    - Score, level, and experience points
 *
 * 5. **Identity Attributes**
 *    - Age, income bracket, and credit rating
 *
 * ============================================================================
 * SECURITY BEST PRACTICES
 * ============================================================================
 *
 * ✅ Store different data types appropriately (euint8, euint16, euint32)
 * ✅ Grant permissions immediately after storage
 * ✅ Use batch operations to save gas
 * ✅ Never decrypt on-chain
 * ✅ Validate all inputs before encryption
 * ✅ Be careful with permission grants to other addresses
 * ✅ Consider gas costs when storing multiple values
 *
 * ❌ Don't store all values as euint32 (wastes gas)
 * ❌ Don't forget permissions for any value
 * ❌ Don't emit decrypted values in events
 * ❌ Don't grant permissions to address(0)
 * ❌ Don't assume permissions transfer automatically
 */
