// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint32, inEuint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title AccessControlExample
 * @notice Demonstrates FHE permission patterns and access control
 * @dev Complete guide to FHE.allow() and FHE.allowTransient()
 */
contract AccessControlExample is ZamaEthereumConfig {
    // Encrypted data with different permission patterns
    mapping(address => euint32) private userBalances;
    mapping(address => bool) private hasBalance;

    // Admin role
    address private admin;

    // Authorized viewers
    mapping(address => mapping(address => bool)) private authorizedViewers;

    // Events
    event BalanceStored(address indexed user, uint256 timestamp);
    event PermissionGranted(address indexed owner, address indexed viewer, uint256 timestamp);
    event PermissionRevoked(address indexed owner, address indexed viewer, uint256 timestamp);

    constructor() {
        admin = msg.sender;
    }

    /**
     * @notice Store encrypted balance with proper permissions
     * @dev Demonstrates the standard permission pattern
     *
     * @param inputHandle Encrypted balance input
     * @param inputProof Proof of valid encryption
     */
    function storeBalance(inEuint32 calldata inputHandle, bytes calldata inputProof) external {
        euint32 balance = FHE.asEuint32(inputHandle, inputProof);

        userBalances[msg.sender] = balance;
        hasBalance[msg.sender] = true;

        // ✅ PERMISSION PATTERN 1: Standard persistent permissions
        // These permissions persist across transactions

        // Grant contract permission to work with the value
        FHE.allowThis(balance);

        // Grant user permission to decrypt their own balance
        FHE.allow(balance, msg.sender);

        emit BalanceStored(msg.sender, block.timestamp);
    }

    /**
     * @notice Get your encrypted balance
     * @dev Only returns encrypted value; decryption happens client-side
     *
     * @return Your encrypted balance
     */
    function getMyBalance() external view returns (euint32) {
        require(hasBalance[msg.sender], "No balance stored");
        return userBalances[msg.sender];
    }

    /**
     * @notice Grant permission to another user to view your balance
     * @dev Demonstrates explicit permission granting
     *
     * @param viewer Address to grant permission to
     */
    function grantViewPermission(address viewer) external {
        require(hasBalance[msg.sender], "No balance stored");
        require(viewer != address(0), "Invalid viewer address");

        // Grant persistent permission to viewer
        FHE.allow(userBalances[msg.sender], viewer);

        // Track authorization
        authorizedViewers[msg.sender][viewer] = true;

        emit PermissionGranted(msg.sender, viewer, block.timestamp);
    }

    /**
     * @notice Check if an address can view your balance
     * @dev This only checks on-chain authorization tracking
     *      Actual FHE permission is enforced by FHEVM
     *
     * @param owner Balance owner
     * @param viewer Address to check
     * @return True if viewer is authorized
     */
    function isAuthorizedViewer(address owner, address viewer) external view returns (bool) {
        return authorizedViewers[owner][viewer];
    }

    /**
     * @notice Revoke view permission (conceptual)
     * @dev Note: FHE permissions cannot be revoked once granted
     *      This only updates on-chain tracking
     *      Real revocation requires creating a new encrypted value
     *
     * @param viewer Address to revoke permission from
     */
    function revokeViewPermission(address viewer) external {
        authorizedViewers[msg.sender][viewer] = false;
        emit PermissionRevoked(msg.sender, viewer, block.timestamp);
    }

    /**
     * @notice Rotate balance to revoke all permissions
     * @dev The CORRECT way to revoke FHE permissions:
     *      Create a new encrypted value with new permissions
     *
     * @param newInputHandle New encrypted balance
     * @param newInputProof Proof for new balance
     */
    function rotateBalance(inEuint32 calldata newInputHandle, bytes calldata newInputProof)
        external
    {
        require(hasBalance[msg.sender], "No balance stored");

        // Create new encrypted value (old permissions don't apply)
        euint32 newBalance = FHE.asEuint32(newInputHandle, newInputProof);

        // Replace old balance
        userBalances[msg.sender] = newBalance;

        // Grant fresh permissions (only to contract and user)
        FHE.allowThis(newBalance);
        FHE.allow(newBalance, msg.sender);

        // Clear all viewer authorizations
        // (They can no longer decrypt the new value)
    }

    /**
     * @notice Example of transient permission (for temporary operations)
     * @dev Demonstrates FHE.allowTransient() for single-transaction operations
     *
     * @param other Address to compare balance with
     * @return Encrypted comparison result
     */
    function compareBalanceWithTransientPermission(address other)
        external
        view
        returns (ebool)
    {
        require(hasBalance[msg.sender], "No balance stored");
        require(hasBalance[other], "Other has no balance");

        euint32 myBalance = userBalances[msg.sender];
        euint32 otherBalance = userBalances[other];

        // Perform comparison (result is new encrypted value)
        ebool result = FHE.gt(myBalance, otherBalance);

        // ✅ PERMISSION PATTERN 2: Transient permissions
        // allowTransient grants permission only for current transaction
        // More gas-efficient when permission not needed afterwards
        FHE.allowTransient(result, msg.sender);

        return result;
    }

    /**
     * @notice Add to balance with automatic permission management
     * @dev Shows permission handling for computed values
     *
     * @param inputHandle Encrypted amount to add
     * @param inputProof Proof for the amount
     */
    function addToBalance(inEuint32 calldata inputHandle, bytes calldata inputProof) external {
        require(hasBalance[msg.sender], "No balance stored");

        euint32 amount = FHE.asEuint32(inputHandle, inputProof);

        // Perform encrypted addition
        euint32 newBalance = FHE.add(userBalances[msg.sender], amount);

        // Update storage
        userBalances[msg.sender] = newBalance;

        // ✅ Grant permissions for the new computed value
        FHE.allowThis(newBalance);
        FHE.allow(newBalance, msg.sender);

        // Note: Old permissions don't automatically transfer to new value
        // Viewers need to be re-authorized if desired
    }
}

/**
 * @dev FHE ACCESS CONTROL PATTERNS - COMPLETE GUIDE
 *
 * ==============================================================================
 * 1. BASIC PERMISSION PATTERN
 * ==============================================================================
 *
 * ```solidity
 * function store(inEuint32 input, bytes proof) external {
 *     euint32 value = FHE.asEuint32(input, proof);
 *
 *     // ✅ ALWAYS grant both permissions:
 *     FHE.allowThis(value);           // Contract can operate on value
 *     FHE.allow(value, msg.sender);   // User can decrypt value
 * }
 * ```
 *
 * WHY BOTH ARE NEEDED:
 * - `FHE.allowThis(value)`: Allows contract to perform FHE operations (add, sub, etc.)
 * - `FHE.allow(value, user)`: Allows user to decrypt the value client-side
 *
 * ==============================================================================
 * 2. PERMISSION TYPES
 * ==============================================================================
 *
 * FHE.allow(value, address):
 * - Persistent permission
 * - Survives across transactions
 * - Higher gas cost (~30k gas)
 * - Use when address needs ongoing access
 *
 * FHE.allowTransient(value, address):
 * - Temporary permission
 * - Only valid in current transaction
 * - Lower gas cost (~10k gas)
 * - Use for one-time operations
 *
 * ==============================================================================
 * 3. PERMISSION CANNOT BE REVOKED
 * ==============================================================================
 *
 * ❌ WRONG: Trying to revoke permissions
 * ```solidity
 * FHE.revoke(value, address);  // ❌ Does not exist!
 * ```
 *
 * ✅ CORRECT: Create new encrypted value
 * ```solidity
 * function rotateSecret() external {
 *     // Old value: viewers have permission
 *     euint32 newValue = FHE.asEuint32(newInput, newProof);
 *
 *     // New value: only owner has permission
 *     FHE.allowThis(newValue);
 *     FHE.allow(newValue, msg.sender);
 *
 *     // Viewers cannot decrypt new value
 * }
 * ```
 *
 * ==============================================================================
 * 4. COMPUTED VALUES NEED NEW PERMISSIONS
 * ==============================================================================
 *
 * ```solidity
 * euint32 a = ...; // Has permissions
 * euint32 b = ...; // Has permissions
 *
 * euint32 sum = FHE.add(a, b);
 *
 * // ✅ sum is a NEW value and needs its own permissions
 * FHE.allowThis(sum);
 * FHE.allow(sum, msg.sender);
 * ```
 *
 * ==============================================================================
 * 5. PERMISSION GRANT SCENARIOS
 * ==============================================================================
 *
 * Scenario A: Private data (owner only)
 * ```solidity
 * FHE.allowThis(value);
 * FHE.allow(value, owner);
 * // Only owner can decrypt
 * ```
 *
 * Scenario B: Shared data (multiple viewers)
 * ```solidity
 * FHE.allowThis(value);
 * FHE.allow(value, owner);
 * FHE.allow(value, viewer1);
 * FHE.allow(value, viewer2);
 * // Owner, viewer1, and viewer2 can all decrypt
 * ```
 *
 * Scenario C: Temporary computation result
 * ```solidity
 * ebool result = FHE.gt(a, b);
 * FHE.allowTransient(result, msg.sender);
 * // msg.sender can decrypt in this transaction only
 * ```
 *
 * ==============================================================================
 * 6. COMMON MISTAKES
 * ==============================================================================
 *
 * ❌ MISTAKE 1: Forgetting allowThis
 * ```solidity
 * FHE.allow(value, msg.sender);  // ❌ Missing allowThis!
 * // Contract cannot perform operations on value
 * ```
 *
 * ❌ MISTAKE 2: Not granting permission for computed values
 * ```solidity
 * euint32 sum = FHE.add(a, b);
 * return sum;  // ❌ No one can decrypt this!
 * ```
 *
 * ❌ MISTAKE 3: Using view function with allowThis
 * ```solidity
 * function compute() external view returns (euint32) {
 *     euint32 result = FHE.add(a, b);
 *     FHE.allowThis(result);  // ❌ Cannot modify state in view function!
 * }
 * ```
 *
 * ❌ MISTAKE 4: Assuming permissions transfer
 * ```solidity
 * mapping(address => euint32) balances;
 * balances[user1] = balances[user2];  // ❌ Permissions don't copy!
 * // Need to grant new permissions for balances[user1]
 * ```
 *
 * ==============================================================================
 * 7. BEST PRACTICES
 * ==============================================================================
 *
 * ✅ Always grant both allowThis and allow(user)
 * ✅ Use allowTransient for temporary results
 * ✅ Grant permissions immediately after creating/computing values
 * ✅ Document which addresses need access
 * ✅ Use value rotation instead of revocation
 * ✅ Test permission scenarios thoroughly
 * ✅ Consider gas costs of permission grants
 *
 * ==============================================================================
 * 8. GAS COST REFERENCE
 * ==============================================================================
 *
 * Operation                    | Gas Cost (approx)
 * -----------------------------|------------------
 * FHE.allowThis()             | ~30,000
 * FHE.allow(value, address)   | ~30,000
 * FHE.allowTransient()        | ~10,000
 * FHE.asEuint32() with proof  | ~100,000
 * FHE.add/sub/mul             | ~50,000
 * FHE.gt/lt/eq                | ~50,000
 *
 * TIP: Use allowTransient for one-time operations to save ~20k gas
 */
