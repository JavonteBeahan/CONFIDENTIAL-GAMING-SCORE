# FHE Anti-Patterns: Common Mistakes and How to Avoid Them

This document catalogs common mistakes when working with FHEVM and provides correct implementations.

---

## Table of Contents

1. [Permission Mistakes](#permission-mistakes)
2. [Decryption Errors](#decryption-errors)
3. [Storage Issues](#storage-issues)
4. [View Function Problems](#view-function-problems)
5. [Input Validation](#input-validation)
6. [Event Logging](#event-logging)
7. [Type Confusion](#type-confusion)
8. [Gas Optimization](#gas-optimization)

---

## 1. Permission Mistakes

### ❌ Anti-Pattern 1.1: Missing `FHE.allowThis()`

**Wrong:**
```solidity
function storeValue(inEuint32 calldata input, bytes calldata proof) external {
    euint32 value = FHE.asEuint32(input, proof);

    // ❌ Only granting user permission
    FHE.allow(value, msg.sender);
}
```

**Why it's wrong:**
- Contract cannot perform operations on the value
- Any FHE operation (add, sub, gt, etc.) will fail
- Contract needs `allowThis` to work with encrypted values

**✅ Correct:**
```solidity
function storeValue(inEuint32 calldata input, bytes calldata proof) external {
    euint32 value = FHE.asEuint32(input, proof);

    // ✅ Grant both permissions
    FHE.allowThis(value);        // Contract can operate
    FHE.allow(value, msg.sender); // User can decrypt
}
```

---

### ❌ Anti-Pattern 1.2: Forgetting Permissions for Computed Values

**Wrong:**
```solidity
function addValues(address user) external view returns (euint32) {
    euint32 sum = FHE.add(balances[user], balances[msg.sender]);

    // ❌ Returning value without permissions
    return sum;  // No one can decrypt this!
}
```

**Why it's wrong:**
- `sum` is a new encrypted value
- No permissions granted for the new value
- Users cannot decrypt the result

**✅ Correct:**
```solidity
function addValues(address user) external returns (euint32) {
    euint32 sum = FHE.add(balances[user], balances[msg.sender]);

    // ✅ Grant permissions for computed value
    FHE.allowThis(sum);
    FHE.allow(sum, msg.sender);

    return sum;
}
```

---

### ❌ Anti-Pattern 1.3: Assuming Permission Transfer

**Wrong:**
```solidity
function transferBalance(address to) external {
    // ❌ Thinking permissions transfer with value
    balances[to] = balances[msg.sender];
    // to cannot decrypt balances[to]!
}
```

**Why it's wrong:**
- Permissions don't automatically copy
- Original permissions still apply to old owner
- New owner has no decryption capability

**✅ Correct:**
```solidity
function transferBalance(address to) external {
    euint32 amount = balances[msg.sender];
    balances[to] = amount;

    // ✅ Grant new permissions
    FHE.allow(balances[to], to);
}
```

---

## 2. Decryption Errors

### ❌ Anti-Pattern 2.1: On-Chain Decryption

**Wrong:**
```solidity
function getBalancePlaintext() external view returns (uint32) {
    // ❌ NEVER decrypt on-chain!
    return FHE.decrypt(balances[msg.sender]);
}
```

**Why it's wrong:**
- Exposes plaintext to all nodes
- Anyone can read transaction data
- Defeats entire purpose of encryption
- Visible in blockchain explorer

**✅ Correct:**
```solidity
// Contract: Return encrypted value
function getBalance() external view returns (euint32) {
    return balances[msg.sender];  // Still encrypted
}

// Client-side: Decrypt with fhevmjs
const encrypted = await contract.getBalance();
const decrypted = await fhevm.decrypt(encrypted, userPrivateKey);
```

---

### ❌ Anti-Pattern 2.2: Emitting Decrypted Values

**Wrong:**
```solidity
event BalanceUpdated(address user, uint32 newBalance); // ❌ Plaintext!

function updateBalance(inEuint32 calldata input, bytes calldata proof) external {
    euint32 value = FHE.asEuint32(input, proof);
    balances[msg.sender] = value;

    // ❌ Decrypting for event
    emit BalanceUpdated(msg.sender, FHE.decrypt(value));
}
```

**Why it's wrong:**
- Events are publicly visible
- Exposes encrypted data as plaintext
- Anyone monitoring events sees the value

**✅ Correct:**
```solidity
event BalanceUpdated(address user, uint256 timestamp); // ✅ No value

function updateBalance(inEuint32 calldata input, bytes calldata proof) external {
    euint32 value = FHE.asEuint32(input, proof);
    balances[msg.sender] = value;

    // ✅ Don't emit the value
    emit BalanceUpdated(msg.sender, block.timestamp);
}
```

---

## 3. Storage Issues

### ❌ Anti-Pattern 3.1: Storing Encrypted and Plaintext Together

**Wrong:**
```solidity
struct UserData {
    euint32 encryptedBalance;
    uint32 plaintextBalance;  // ❌ Why have both?
}
```

**Why it's wrong:**
- Plaintext defeats encryption purpose
- Inconsistency between values
- Confusion about which to use

**✅ Correct:**
```solidity
struct UserData {
    euint32 encryptedBalance;  // ✅ Only encrypted
}
```

---

### ❌ Anti-Pattern 3.2: Using `private` Thinking It Hides Data

**Wrong:**
```solidity
// ❌ "private" doesn't provide privacy!
uint32 private secretValue;  // Anyone can read storage

function storeSecret(uint32 value) external {
    secretValue = value;  // Visible to everyone
}
```

**Why it's wrong:**
- `private` only prevents external getter function
- Storage is still readable by anyone
- Blockchain data is always public

**✅ Correct:**
```solidity
// ✅ Use encryption for real privacy
euint32 private secretValue;

function storeSecret(inEuint32 calldata input, bytes calldata proof) external {
    secretValue = FHE.asEuint32(input, proof);
    FHE.allowThis(secretValue);
    FHE.allow(secretValue, msg.sender);
}
```

---

## 4. View Function Problems

### ❌ Anti-Pattern 4.1: Modifying Permissions in View Function

**Wrong:**
```solidity
function computeSum() external view returns (euint32) {
    euint32 sum = FHE.add(value1, value2);

    // ❌ Cannot modify state in view function!
    FHE.allowThis(sum);  // COMPILATION ERROR

    return sum;
}
```

**Why it's wrong:**
- View functions cannot modify state
- Permission grants modify blockchain state
- Will not compile

**✅ Correct:**
```solidity
// Option 1: Make it non-view
function computeSum() external returns (euint32) {
    euint32 sum = FHE.add(value1, value2);
    FHE.allowThis(sum);
    FHE.allow(sum, msg.sender);
    return sum;
}

// Option 2: Use allowTransient in view (if available)
function computeSum() external view returns (euint32) {
    euint32 sum = FHE.add(value1, value2);
    FHE.allowTransient(sum, msg.sender);  // Temporary permission
    return sum;
}
```

---

## 5. Input Validation

### ❌ Anti-Pattern 5.1: Not Validating Proof

**Wrong:**
```solidity
function store(inEuint32 calldata input, bytes calldata proof) external {
    // ❌ No validation of inputs
    euint32 value = FHE.asEuint32(input, proof);
}
```

**Why it's wrong:**
- Empty proof might be accepted in testing
- Invalid proof should be caught early
- Better error messages

**✅ Correct:**
```solidity
function store(inEuint32 calldata input, bytes calldata proof) external {
    // ✅ Validate inputs
    require(proof.length > 0, "Invalid proof");

    euint32 value = FHE.asEuint32(input, proof);
    // FHE.asEuint32 also validates internally
}
```

---

### ❌ Anti-Pattern 5.2: Mixing Encrypted and Plaintext Operations

**Wrong:**
```solidity
function compare(uint32 plaintext) external view returns (bool) {
    // ❌ Comparing encrypted with plaintext directly
    return encryptedValue > plaintext;  // TYPE ERROR
}
```

**Why it's wrong:**
- Cannot compare encrypted and plaintext directly
- Type mismatch error
- Need to encrypt plaintext first

**✅ Correct:**
```solidity
function compare(uint32 plaintext) external view returns (ebool) {
    // ✅ Convert plaintext to encrypted
    euint32 encPlaintext = FHE.asEuint32(plaintext);
    return FHE.gt(encryptedValue, encPlaintext);
}
```

---

## 6. Event Logging

### ❌ Anti-Pattern 6.1: Logging Sensitive Computation Results

**Wrong:**
```solidity
event ComparisonResult(address user, bool result); // ❌ Reveals result

function compareValues(uint32 threshold) external returns (bool) {
    ebool result = FHE.gte(secretValue, FHE.asEuint32(threshold));
    bool plainResult = FHE.decrypt(result);  // ❌ Decrypting!

    emit ComparisonResult(msg.sender, plainResult);  // ❌ Public!
    return plainResult;
}
```

**Why it's wrong:**
- Reveals comparison result publicly
- Anyone can see if value >= threshold
- Leaks information about encrypted value

**✅ Correct:**
```solidity
event ComparisonPerformed(address user, uint256 timestamp); // ✅ No result

function compareValues(uint32 threshold) external view returns (ebool) {
    ebool result = FHE.gte(secretValue, FHE.asEuint32(threshold));

    // ✅ Return encrypted result
    emit ComparisonPerformed(msg.sender, block.timestamp);
    return result;  // User decrypts client-side
}
```

---

## 7. Type Confusion

### ❌ Anti-Pattern 7.1: Wrong Encrypted Type Size

**Wrong:**
```solidity
function store(inEuint32 calldata input, bytes calldata proof) external {
    // ❌ Value is uint8 but using euint32
    euint32 value = FHE.asEuint32(input, proof);  // Wastes gas
}
```

**Why it's wrong:**
- Using larger type than needed
- Higher gas costs
- Wasted storage

**✅ Correct:**
```solidity
function store(inEuint8 calldata input, bytes calldata proof) external {
    // ✅ Use appropriate size
    euint8 value = FHE.asEuint8(input, proof);  // Saves gas
}
```

---

### ❌ Anti-Pattern 7.2: Type Mismatch in Operations

**Wrong:**
```solidity
euint8 small = FHE.asEuint8(5);
euint32 large = FHE.asEuint32(100);

// ❌ Cannot operate on different encrypted types
euint32 result = FHE.add(small, large);  // TYPE ERROR
```

**Why it's wrong:**
- FHE operations require same types
- Compilation error

**✅ Correct:**
```solidity
euint8 small = FHE.asEuint8(5);
euint32 large = FHE.asEuint32(100);

// ✅ Convert to same type first
euint32 smallAs32 = FHE.asEuint32(small);
euint32 result = FHE.add(smallAs32, large);
```

---

## 8. Gas Optimization

### ❌ Anti-Pattern 8.1: Unnecessary Persistent Permissions

**Wrong:**
```solidity
function quickCheck() external returns (ebool) {
    ebool result = FHE.gt(value1, value2);

    // ❌ Using persistent permission for one-time use
    FHE.allow(result, msg.sender);  // Costs ~30k gas

    return result;
}
```

**Why it's wrong:**
- Persistent permission not needed
- Wastes ~20k gas
- Result only used once

**✅ Correct:**
```solidity
function quickCheck() external view returns (ebool) {
    ebool result = FHE.gt(value1, value2);

    // ✅ Use transient permission
    FHE.allowTransient(result, msg.sender);  // Costs ~10k gas

    return result;
}
```

---

### ❌ Anti-Pattern 8.2: Redundant Encryption

**Wrong:**
```solidity
function checkMultiple(uint32[] calldata thresholds) external view {
    for (uint i = 0; i < thresholds.length; i++) {
        // ❌ Re-encrypting same type repeatedly
        euint32 enc = FHE.asEuint32(thresholds[i]);
        FHE.gte(secretValue, enc);
    }
}
```

**Why it's wrong:**
- Encryption is expensive
- Doing it in loop multiplies cost

**✅ Correct:**
```solidity
function checkMultiple(
    inEuint32[] calldata encrypted,
    bytes[] calldata proofs
) external view {
    // ✅ Encrypt client-side, send encrypted values
    for (uint i = 0; i < encrypted.length; i++) {
        euint32 enc = FHE.asEuint32(encrypted[i], proofs[i]);
        FHE.gte(secretValue, enc);
    }
}
```

---

## Summary Checklist

Before deploying FHE contracts, verify:

### Permissions
- [ ] ✅ Grant `FHE.allowThis()` for all encrypted values
- [ ] ✅ Grant `FHE.allow(value, user)` for all users who need access
- [ ] ✅ Grant permissions for computed values
- [ ] ✅ Use `allowTransient` for one-time operations

### Decryption
- [ ] ✅ Never decrypt on-chain
- [ ] ✅ Return encrypted values from functions
- [ ] ✅ Decrypt client-side with fhevmjs
- [ ] ✅ Don't emit decrypted values in events

### Storage
- [ ] ✅ Use encrypted types for sensitive data
- [ ] ✅ Don't mix encrypted and plaintext
- [ ] ✅ Use appropriate type sizes

### Operations
- [ ] ✅ Use FHE operations for encrypted values
- [ ] ✅ Match types in operations
- [ ] ✅ Validate inputs and proofs
- [ ] ✅ Handle view function restrictions

### Gas Optimization
- [ ] ✅ Use `allowTransient` when possible
- [ ] ✅ Minimize encryption operations
- [ ] ✅ Use smallest appropriate type
- [ ] ✅ Batch operations when feasible

---

**Remember:** FHE provides cryptographic privacy, but only if used correctly. Following these patterns ensures your encrypted data remains truly private!
