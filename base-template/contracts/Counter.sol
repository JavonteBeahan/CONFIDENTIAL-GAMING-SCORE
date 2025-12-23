// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title Simple Encrypted Counter
 * @notice A basic example contract demonstrating encrypted counter operations
 */
contract Counter is ZamaEthereumConfig {
    euint32 private encryptedValue;

    event ValueUpdated(uint256 timestamp);

    /**
     * @notice Initialize the counter with an encrypted value
     */
    constructor() {
        encryptedValue = FHE.asEuint32(0);
    }

    /**
     * @notice Get the encrypted counter value
     * @return The encrypted counter value
     */
    function getValue() external view returns (euint32) {
        return encryptedValue;
    }
}
