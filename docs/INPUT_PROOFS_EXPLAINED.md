## Input Proofs in FHEVM: Complete Guide

**What are input proofs and why do they matter?**

---

## Table of Contents

1. [Overview](#overview)
2. [Why Input Proofs Are Needed](#why-input-proofs-are-needed)
3. [How Input Proofs Work](#how-input-proofs-work)
4. [Creating Input Proofs](#creating-input-proofs)
5. [Using Input Proofs in Contracts](#using-input-proofs-in-contracts)
6. [Common Mistakes](#common-mistakes)
7. [Security Considerations](#security-considerations)
8. [Best Practices](#best-practices)

---

## Overview

**Input proofs** are zero-knowledge proofs that validate encrypted inputs to FHEVM smart contracts. They prove that:

1. The client correctly encrypted the data
2. The encryption is bound to the specific contract and user
3. The encrypted value matches what the client claims

Without input proofs, a malicious user could send invalid encrypted data that could break the FHE system or leak information.

---

## Why Input Proofs Are Needed

### The Problem

When a user sends encrypted data to a contract:

```javascript
// Client encrypts locally
const encryptedValue = fhevm.encrypt32(mySecret);
// Sends to contract
await contract.store(encryptedValue);
```

**Without proofs, attacks are possible:**

❌ **Attack 1: Wrong Encryption**
```javascript
// Send random data pretending it's encrypted
const fakeData = "0x" + "ff".repeat(32);
await contract.store(fakeData);  // Could break FHE operations
```

❌ **Attack 2: Wrong Binding**
```javascript
// Encrypt for different contract/user
const encForDifferentContract = fhevm.encrypt32(value, wrongContract);
await contract.store(encForDifferentContract);  // Security violation
```

❌ **Attack 3: Replay Attack**
```javascript
// Reuse old encrypted value
const oldEncryption = getPreviousEncryption();
await contract.store(oldEncryption);  // Could leak information
```

### The Solution: Input Proofs

Input proofs prevent these attacks by cryptographically proving:

✅ The data was encrypted correctly using FHEVM
✅ The encryption is bound to this specific contract
✅ The encryption is bound to this specific user
✅ The proof is fresh and not replayed

---

## How Input Proofs Work

### High-Level Flow

```
┌─────────────┐
│   Client    │
│             │
│ 1. Encrypt  │──────────┐
│    value    │          │
│             │          ▼
│ 2. Generate │    ┌──────────┐
│    proof    │───▶│  Proof   │
└─────────────┘    └──────────┘
                        │
                        ▼
              ┌──────────────────┐
              │  Smart Contract  │
              │                  │
              │ 3. Verify proof  │
              │ 4. Accept value  │
              └──────────────────┘
```

### Technical Details

The proof is a **SNARK (Succinct Non-Interactive Argument of Knowledge)** that proves:

**Statement:** "I know a value `v` such that:"
- `encrypted = Encrypt(v, contract, user, nonce)`
- `nonce` is fresh and unique
- Encryption used correct FHE public key

**Without revealing:** The actual value `v`

---

## Creating Input Proofs

### Client-Side with fhevmjs

```javascript
import { createInstance } from 'fhevmjs';
import { ethers } from 'ethers';

// 1. Initialize FHEVM instance
const fhevm = await createInstance({
  chainId: 8009,                      // Zama devnet
  networkUrl: "https://devnet.zama.ai/",
});

// 2. Get contract and user addresses
const contractAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";
const userAddress = await signer.getAddress();

// 3. Create encrypted input with proof
const mySecretValue = 1337;

const encryptedInput = fhevm.createEncryptedInput(
  contractAddress,  // Bind to this contract
  userAddress       // Bind to this user
);

// Add value to encrypt
encryptedInput.add32(mySecretValue);

// Generate encryption + proof
const { handles, inputProof } = encryptedInput.encrypt();

// 4. Send to contract
await contract.storeValue(
  handles[0],    // Encrypted value handle
  inputProof     // Zero-knowledge proof
);
```

### What Gets Generated

```javascript
{
  handles: [
    "0x8f3b7e2a...",  // Encrypted value handle (32 bytes)
  ],
  inputProof: "0x4a8f..."  // Zero-knowledge proof (~200-400 bytes)
}
```

---

## Using Input Proofs in Contracts

### Basic Pattern

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint32, inEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract MyContract is ZamaEthereumConfig {
    euint32 private storedValue;

    function storeValue(
        inEuint32 calldata inputHandle,  // Encrypted value
        bytes calldata inputProof         // Proof of valid encryption
    ) external {
        // ✅ This validates the proof automatically
        euint32 value = FHE.asEuint32(inputHandle, inputProof);

        // Proof validation checks:
        // 1. Proof is valid SNARK
        // 2. Encryption bound to this contract
        // 3. Encryption bound to msg.sender
        // 4. Nonce is fresh
        // 5. Correct FHE public key used

        storedValue = value;

        // Grant permissions
        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }
}
```

### What Happens During Validation

When you call `FHE.asEuint32(inputHandle, inputProof)`:

1. **Proof Structure Validation**
   - Check proof has correct format
   - Verify SNARK proof cryptographically

2. **Binding Validation**
   - Verify encryption bound to `address(this)`
   - Verify encryption bound to `msg.sender`
   - Check nonce hasn't been used before

3. **Encryption Validation**
   - Verify correct FHE public key was used
   - Confirm encrypted data is valid

If any check fails: **Transaction reverts**

---

## Common Mistakes

### ❌ Mistake 1: Empty Proof

```solidity
function store(inEuint32 calldata input, bytes calldata proof) external {
    // ❌ Not checking if proof is empty
    euint32 value = FHE.asEuint32(input, proof);
}
```

**Problem:** In testing environments, empty proofs might be accepted. In production on FHEVM, this will revert.

**✅ Fix:**
```solidity
function store(inEuint32 calldata input, bytes calldata proof) external {
    require(proof.length > 0, "Empty proof not allowed");
    euint32 value = FHE.asEuint32(input, proof);
}
```

---

### ❌ Mistake 2: Wrong Signer

```javascript
// Client-side
const encrypted = fhevm.createEncryptedInput(contractAddress, alice.address)
    .add32(100)
    .encrypt();

// ❌ Sending from different address
await contract.connect(bob).store(encrypted.handles[0], encrypted.inputProof);
// REVERTS: Proof bound to alice, but msg.sender is bob
```

**✅ Fix:**
```javascript
// Encrypt for the address that will send the transaction
const encrypted = fhevm.createEncryptedInput(contractAddress, bob.address)
    .add32(100)
    .encrypt();

await contract.connect(bob).store(encrypted.handles[0], encrypted.inputProof);
// ✅ Works: Proof bound to bob, msg.sender is bob
```

---

### ❌ Mistake 3: Reusing Proofs

```javascript
// Generate proof once
const encrypted = fhevm.createEncryptedInput(contract, user)
    .add32(100)
    .encrypt();

// Use first time
await contract.store(encrypted.handles[0], encrypted.inputProof);

// ❌ Try to reuse
await contract.store(encrypted.handles[0], encrypted.inputProof);
// REVERTS: Nonce already used
```

**✅ Fix:**
```javascript
// Generate fresh proof each time
const encrypted1 = fhevm.createEncryptedInput(contract, user).add32(100).encrypt();
await contract.store(encrypted1.handles[0], encrypted1.inputProof);

const encrypted2 = fhevm.createEncryptedInput(contract, user).add32(200).encrypt();
await contract.store(encrypted2.handles[0], encrypted2.inputProof);
```

---

### ❌ Mistake 4: Wrong Contract Binding

```javascript
// ❌ Encrypt for wrong contract
const encrypted = fhevm.createEncryptedInput(
    "0xWrongContract...",  // Different contract!
    userAddress
).add32(100).encrypt();

await correctContract.store(encrypted.handles[0], encrypted.inputProof);
// REVERTS: Proof bound to wrong contract
```

**✅ Fix:**
```javascript
// ✅ Encrypt for the contract you're calling
const contractAddress = await correctContract.getAddress();
const encrypted = fhevm.createEncryptedInput(
    contractAddress,  // Correct contract
    userAddress
).add32(100).encrypt();

await correctContract.store(encrypted.handles[0], encrypted.inputProof);
```

---

## Security Considerations

### 1. Proof Binding Prevents Impersonation

```solidity
// User A cannot submit proof generated by User B
// Proof bound to specific address

// User A creates proof
// proof_A = generate_proof(value, contract, addressA)

// ❌ User B cannot use proof_A
// contract.connect(userB).store(encrypted, proof_A)  // REVERTS
```

### 2. Contract Binding Prevents Cross-Contract Attacks

```solidity
// Proof for Contract A cannot be used on Contract B
// Even if same user and same value

// proof = generate_proof(value, contractA, user)

// ❌ Cannot use on different contract
// contractB.store(encrypted, proof)  // REVERTS
```

### 3. Nonce Prevents Replay Attacks

```solidity
// Each proof has unique nonce
// Cannot reuse same proof twice

// First use: SUCCESS
contract.store(encrypted, proof);

// Second use: REVERTS (nonce already used)
contract.store(encrypted, proof);
```

### 4. Freshness Guarantees

Proofs include timestamp/nonce ensuring:
- Cannot replay old transactions
- Cannot front-run with stale data
- Each encryption is unique

---

## Best Practices

### ✅ 1. Always Validate Inputs

```solidity
function store(inEuint32 calldata input, bytes calldata proof) external {
    // Validate before processing
    require(input.length > 0, "Invalid input");
    require(proof.length > 0, "Invalid proof");

    euint32 value = FHE.asEuint32(input, proof);
    // ...
}
```

### ✅ 2. Handle Errors Gracefully

```solidity
function store(inEuint32 calldata input, bytes calldata proof) external {
    try this.validateAndStore(input, proof) {
        // Success
    } catch Error(string memory reason) {
        // Handle specific errors
        if (keccak256(bytes(reason)) == keccak256("Invalid proof")) {
            revert("Please regenerate proof and try again");
        }
        revert(reason);
    }
}
```

### ✅ 3. Document Requirements

```solidity
/**
 * @notice Store encrypted value
 * @dev Requires valid input proof from fhevmjs
 *
 * Generate proof client-side:
 * ```javascript
 * const encrypted = fhevm.createEncryptedInput(contractAddr, userAddr)
 *     .add32(value)
 *     .encrypt();
 * await contract.store(encrypted.handles[0], encrypted.inputProof);
 * ```
 *
 * @param inputHandle Encrypted value handle from fhevmjs
 * @param inputProof Zero-knowledge proof of valid encryption
 */
function store(inEuint32 calldata inputHandle, bytes calldata inputProof) external;
```

### ✅ 4. Test with Real Proofs

```typescript
// ❌ Don't test with mock data only
const mockHandle = "0x" + "00".repeat(32);
const mockProof = "0x" + "00".repeat(64);
await contract.store(mockHandle, mockProof);

// ✅ Test with real fhevmjs proofs
const fhevm = await createInstance({ chainId: 8009 });
const encrypted = fhevm.createEncryptedInput(contractAddr, userAddr)
    .add32(testValue)
    .encrypt();
await contract.store(encrypted.handles[0], encrypted.inputProof);
```

### ✅ 5. Handle Multiple Values

```javascript
// Encrypt multiple values with one proof
const encrypted = fhevm.createEncryptedInput(contractAddr, userAddr)
    .add32(value1)
    .add32(value2)
    .add32(value3)
    .encrypt();

// Proof covers all three values
await contract.storeMultiple(
    encrypted.handles[0],  // value1
    encrypted.handles[1],  // value2
    encrypted.handles[2],  // value3
    encrypted.inputProof   // One proof for all
);
```

---

## Summary

### Key Takeaways

1. **Input proofs are mandatory** for encrypted inputs in FHEVM
2. **Proofs bind encryption** to specific contract and user
3. **Generate proofs client-side** using fhevmjs
4. **Validation happens automatically** in `FHE.asEuint32()`
5. **Proofs cannot be reused** due to nonce
6. **Always match** proof generator and transaction sender

### Quick Reference

| Component | Purpose | Generated By |
|-----------|---------|--------------|
| **inputHandle** | Encrypted value | fhevmjs |
| **inputProof** | Validity proof | fhevmjs |
| **Validation** | Verify proof | FHEVM (automatic) |
| **Binding** | Contract + User | Proof generation |
| **Nonce** | Prevent replay | Proof generation |

### Next Steps

1. Study example contracts in `contracts/basic/`
2. Practice with fhevmjs in test environment
3. Deploy to Zama devnet for testing
4. Read anti-patterns guide: `docs/FHE_ANTI_PATTERNS.md`

---

**Remember:** Input proofs are your first line of defense for encrypted data integrity. Always generate them properly using fhevmjs!
