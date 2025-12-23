// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint32, inEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title EncryptMultipleValues
 * @notice Demonstrates how to encrypt and store multiple values
 * @dev This example shows patterns for managing multiple encrypted values per user
 */
contract EncryptMultipleValues is ZamaEthereumConfig {
    // Structure to hold multiple encrypted values for a user
    struct UserData {
        euint32 value1;
        euint32 value2;
        euint32 value3;
        bool initialized;
    }

    // Mapping from user address to their encrypted data
    mapping(address => UserData) private userData;

    // Events
    event ValuesStored(address indexed user, uint256 timestamp);
    event ValueUpdated(address indexed user, uint8 indexed valueIndex, uint256 timestamp);

    /**
     * @notice Store three encrypted values at once
     * @dev Demonstrates batching multiple encrypted inputs
     *
     * @param input1 First encrypted value handle
     * @param proof1 Proof for first value
     * @param input2 Second encrypted value handle
     * @param proof2 Proof for second value
     * @param input3 Third encrypted value handle
     * @param proof3 Proof for third value
     */
    function storeMultipleValues(
        inEuint32 calldata input1,
        bytes calldata proof1,
        inEuint32 calldata input2,
        bytes calldata proof2,
        inEuint32 calldata input3,
        bytes calldata proof3
    ) external {
        // Convert all inputs to encrypted values
        euint32 encValue1 = FHE.asEuint32(input1, proof1);
        euint32 encValue2 = FHE.asEuint32(input2, proof2);
        euint32 encValue3 = FHE.asEuint32(input3, proof3);

        // Store all values
        userData[msg.sender] = UserData({
            value1: encValue1,
            value2: encValue2,
            value3: encValue3,
            initialized: true
        });

        // ✅ CRITICAL: Grant permissions for ALL encrypted values
        // Each encrypted value needs its own permission grants
        FHE.allowThis(encValue1);
        FHE.allow(encValue1, msg.sender);

        FHE.allowThis(encValue2);
        FHE.allow(encValue2, msg.sender);

        FHE.allowThis(encValue3);
        FHE.allow(encValue3, msg.sender);

        emit ValuesStored(msg.sender, block.timestamp);
    }

    /**
     * @notice Update a single value without affecting others
     * @dev Demonstrates selective updates in multi-value storage
     *
     * @param valueIndex Which value to update (1, 2, or 3)
     * @param inputHandle New encrypted value handle
     * @param inputProof Proof for new value
     */
    function updateSingleValue(
        uint8 valueIndex,
        inEuint32 calldata inputHandle,
        bytes calldata inputProof
    ) external {
        require(userData[msg.sender].initialized, "No data stored yet");
        require(valueIndex >= 1 && valueIndex <= 3, "Invalid value index");

        euint32 newValue = FHE.asEuint32(inputHandle, inputProof);

        // Update specific value based on index
        if (valueIndex == 1) {
            userData[msg.sender].value1 = newValue;
        } else if (valueIndex == 2) {
            userData[msg.sender].value2 = newValue;
        } else {
            userData[msg.sender].value3 = newValue;
        }

        // Grant permissions for new value
        FHE.allowThis(newValue);
        FHE.allow(newValue, msg.sender);

        emit ValueUpdated(msg.sender, valueIndex, block.timestamp);
    }

    /**
     * @notice Get all three encrypted values
     * @dev Returns all encrypted values in a single call
     * @return value1 First encrypted value
     * @return value2 Second encrypted value
     * @return value3 Third encrypted value
     */
    function getAllValues()
        external
        view
        returns (euint32 value1, euint32 value2, euint32 value3)
    {
        require(userData[msg.sender].initialized, "No data stored");
        UserData memory data = userData[msg.sender];
        return (data.value1, data.value2, data.value3);
    }

    /**
     * @notice Get a specific encrypted value
     * @param valueIndex Which value to retrieve (1, 2, or 3)
     * @return The requested encrypted value
     */
    function getSingleValue(uint8 valueIndex) external view returns (euint32) {
        require(userData[msg.sender].initialized, "No data stored");
        require(valueIndex >= 1 && valueIndex <= 3, "Invalid value index");

        UserData memory data = userData[msg.sender];

        if (valueIndex == 1) {
            return data.value1;
        } else if (valueIndex == 2) {
            return data.value2;
        } else {
            return data.value3;
        }
    }

    /**
     * @notice Calculate sum of all three values
     * @dev Demonstrates FHE operations on multiple encrypted values
     * @return The encrypted sum of all three values
     */
    function calculateSum() external view returns (euint32) {
        require(userData[msg.sender].initialized, "No data stored");

        UserData memory data = userData[msg.sender];

        // ✅ FHE operations work on encrypted values without decryption
        euint32 sum = FHE.add(data.value1, data.value2);
        sum = FHE.add(sum, data.value3);

        return sum;
    }

    /**
     * @notice Check if user has stored data
     * @param user Address to check
     * @return True if user has initialized data
     */
    function hasData(address user) external view returns (bool) {
        return userData[user].initialized;
    }

    /**
     * @notice Grant permission to another address to decrypt all values
     * @param account Address to grant permissions to
     */
    function grantPermissionToAll(address account) external {
        require(userData[msg.sender].initialized, "No data stored");

        UserData memory data = userData[msg.sender];

        // Grant permission for each encrypted value
        FHE.allow(data.value1, account);
        FHE.allow(data.value2, account);
        FHE.allow(data.value3, account);
    }
}

/**
 * @dev Key Concepts Demonstrated:
 *
 * 1. MULTIPLE VALUE MANAGEMENT:
 *    - Store multiple encrypted values per user
 *    - Update individual values independently
 *    - Retrieve all values or specific ones
 *
 * 2. BATCH OPERATIONS:
 *    - Accept multiple encrypted inputs in one transaction
 *    - Grant permissions for each value
 *    - Reduce transaction costs vs multiple calls
 *
 * 3. FHE ARITHMETIC:
 *    - Perform operations on encrypted values
 *    - Results remain encrypted
 *    - No plaintext exposure during computation
 *
 * 4. PERMISSION PATTERNS:
 *    - Each encrypted value needs its own permissions
 *    - Can grant batch permissions to addresses
 *    - Permissions are per-value, not per-struct
 *
 * BEST PRACTICES:
 * ✅ Grant permissions for ALL encrypted values
 * ✅ Use structs to organize related encrypted data
 * ✅ Provide both batch and individual access methods
 * ✅ Document gas costs for batch operations
 *
 * COMMON MISTAKES:
 * ❌ Forgetting to grant permissions for some values
 * ❌ Not checking initialization before operations
 * ❌ Assuming struct assignment copies permissions (it doesn't)
 */
