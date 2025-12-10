# Guide: Adding New FHEVM Examples

This guide explains how to create and add new FHEVM example repositories to the collection.

## Overview

The FHEVM Examples system uses automation scripts to:
1. Generate standalone repositories from templates
2. Create comprehensive test suites
3. Auto-generate GitBook documentation
4. Manage multiple examples in categories

## Step 1: Plan Your Example

Before implementing, answer these questions:

1. **What concept does this teach?**
   - Basic encryption? Advanced comparisons? Application pattern?
   - Single concept or multiple related concepts?

2. **What category does it belong to?**
   - `basic` - FHE fundamentals (encryption, arithmetic, comparisons)
   - `gaming` - Gaming-related examples
   - `auction` - Auction and bidding mechanisms
   - `privacy` - Privacy-preserving patterns
   - Create new category if needed

3. **Who is the target audience?**
   - Beginners learning FHE?
   - Intermediate developers?
   - Advanced users exploring patterns?

4. **What should the test cover?**
   - Success cases
   - Error handling
   - Edge cases
   - FHE-specific behavior

## Step 2: Create the Smart Contract

### File Location
```
contracts/[category]/YourExample.sol
```

### Template Structure

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title Your Example Title
 * @dev Clear description of what this contract does
 * @notice Explain the concept being demonstrated
 *
 * This example demonstrates:
 * - Concept 1
 * - Concept 2
 * - Concept 3
 *
 * chapter: category-name
 * concepts: concept1, concept2, concept3
 */
contract YourExample is ZamaEthereumConfig {
    // State variables
    euint32 private encryptedData;

    // Events
    event ExampleEvent(address indexed user, uint256 timestamp);

    // Constructor
    constructor() {
        encryptedData = FHE.asEuint32(0);
    }

    /**
     * @dev Main function demonstrating FHE operations
     * @param encryptedInput Encrypted input value
     * @param inputProof Zero-knowledge proof of correct encryption
     *
     * Note: Explain what this function does and why it's useful
     *
     * Example: ✅ Correct usage
     * - Shows proper pattern
     * - Explains FHE operations
     *
     * Example: ❌ Common pitfall
     * - Shows what NOT to do
     * - Explains why it fails
     */
    function mainFunction(bytes calldata encryptedInput, bytes calldata inputProof)
        external
    {
        require(encryptedInput.length > 0, "Invalid input");
        require(inputProof.length > 0, "Invalid proof");

        // Convert external encrypted input
        euint32 input = FHE.fromExternal(encryptedInput, inputProof);

        // Perform FHE operations
        encryptedData = FHE.add(encryptedData, input);

        // Grant permissions (CRITICAL)
        FHE.allowThis(encryptedData);        // ✅ Contract permission
        FHE.allow(encryptedData, msg.sender); // ✅ User permission

        emit ExampleEvent(msg.sender, block.timestamp);
    }

    /**
     * @dev Query function showing best practices
     * @return Result of query
     */
    function queryFunction() external view returns (euint32) {
        return encryptedData;
    }
}
```

### Documentation Requirements

1. **NatSpec Comments for All Public Functions**
   ```solidity
   /**
    * @dev Brief description
    * @param name Parameter description
    * @return Description of return value
    * @notice Important usage notes
    */
   ```

2. **Include Examples and Pitfalls**
   ```solidity
   // Example: ✅ Correct usage
   // Shows best practices

   // Example: ❌ Common pitfall
   // Shows what NOT to do
   ```

3. **Explain FHE Concepts**
   ```solidity
   // Document why FHE operations are needed
   // Explain privacy implications
   // Note encryption binding requirements
   ```

## Step 3: Write Comprehensive Tests

### File Location
```
test/[category]/YourExample.ts
```

### Test Structure

```typescript
/**
 * Test Suite: Your Example
 *
 * This test suite demonstrates:
 * - Success cases
 * - Error handling
 * - FHE-specific behavior
 * - Edge cases
 *
 * chapter: category-name
 */

import { expect } from "chai";
import { ethers } from "hardhat";
import { YourExample } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Your Example", function () {
  let contract: YourExample;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("YourExample");
    contract = await Factory.deploy();
    await contract.waitForDeployment();
  });

  describe("Functionality", function () {
    /**
     * ✅ Test: Main functionality works correctly
     */
    it("Should perform main operation", async function () {
      const mockInput = ethers.toBeHex(100, 32);
      const mockProof = "0x" + "00".repeat(32);

      const tx = await contract.connect(user1).mainFunction(mockInput, mockProof);
      await tx.wait();

      const result = await contract.queryFunction();
      expect(result).to.not.be.null;
    });

    /**
     * ❌ Test: Invalid input is rejected
     */
    it("Should reject invalid input", async function () {
      const emptyInput = "0x";
      const mockProof = "0x" + "00".repeat(32);

      await expect(
        contract.connect(user1).mainFunction(emptyInput, mockProof)
      ).to.be.revertedWith("Invalid input");
    });
  });

  describe("Events", function () {
    /**
     * ✅ Test: Events are emitted correctly
     */
    it("Should emit ExampleEvent", async function () {
      const mockInput = ethers.toBeHex(100, 32);
      const mockProof = "0x" + "00".repeat(32);

      const tx = await contract.connect(user1).mainFunction(mockInput, mockProof);
      const receipt = await tx.wait();

      const events = receipt?.logs.filter((log) => {
        try {
          return contract.interface.parseLog(log)?.name === "ExampleEvent";
        } catch {
          return false;
        }
      });

      expect(events?.length).to.be.greaterThan(0);
    });
  });
});
```

### Test Coverage Guidelines

- **Success cases**: 50% of tests
- **Error handling**: 30% of tests
- **Edge cases**: 15% of tests
- **FHE-specific**: 5% of tests

## Step 4: Register the Example

### Update `scripts/create-fhevm-example.ts`

Add your example to `EXAMPLES_MAP`:

```typescript
const EXAMPLES_MAP: Record<string, ExampleConfig> = {
  // ... existing examples ...

  "your-example-name": {
    name: "your-example-name",
    title: "Your Example Title",
    description: "Brief description of what it demonstrates",
    contractFile: "YourExample.sol",
    testFile: "YourExample.ts",
    category: "category-name",
    concepts: [
      "concept1",
      "concept2",
      "concept3",
    ],
  },
};
```

### Update `scripts/generate-docs.ts`

Add your example to `EXAMPLES_CONFIG`:

```typescript
const EXAMPLES_CONFIG: Record<string, DocumentationConfig> = {
  // ... existing examples ...

  "your-example-name": {
    name: "your-example-name",
    title: "Your Example Title",
    description: "Brief description",
    category: "category-name",
    concepts: ["concept1", "concept2"],
    contractFile: "YourExample.sol",
    testFile: "YourExample.ts",
  },
};
```

## Step 5: Generate Documentation

### Run Documentation Generator

```bash
# Generate docs for your example
npx ts-node scripts/generate-docs.ts your-example-name

# Or generate all
npx ts-node scripts/generate-docs.ts --all
```

This creates:
- `docs/your-example-name.md` - Example documentation
- `docs/SUMMARY.md` - Updated index (if --all)
- `docs/index.json` - Metadata

## Step 6: Test the Complete Example

### Compile and Test

```bash
# Compile your contract
npm run compile

# Run your tests
npm run test

# Generate coverage
npm run coverage
```

### Create Standalone Repository

```bash
# Generate standalone example repository
npx ts-node scripts/create-fhevm-example.ts your-example-name ./test-output/my-example

# Test standalone repository
cd test-output/my-example
npm install
npm run compile
npm run test
```

## Step 7: Verify Documentation

### Check Generated Documentation

```bash
# View generated markdown
cat docs/your-example-name.md

# Verify SUMMARY.md updates
cat docs/SUMMARY.md
```

### GitBook Compatibility

Documentation should be compatible with GitBook:

- ✅ Use standard markdown
- ✅ Link other examples with `[title](example-name.md)`
- ✅ Include code blocks with language specification
- ✅ Use proper heading hierarchy (# ## ###)

## Best Practices for Examples

### 1. Keep It Focused

Each example should teach ONE clear concept:

- ❌ DON'T: "Everything about FHE"
- ✅ DO: "How to perform encrypted comparisons"

### 2. Use Clear Naming

```solidity
// ✅ Good
euint32 encryptedPlayerScore;
euint32 encryptedHighestScore;

// ❌ Bad
euint32 x;
euint32 y;
```

### 3. Add Lots of Comments

```solidity
// ✅ Good
/**
 * @dev FHE comparison explaining why it's needed
 * The comparison returns encrypted result to preserve privacy
 */
ebool isHigherScore = FHE.gt(playerScore, highestScore);

// ❌ Bad
ebool result = FHE.gt(a, b);
```

### 4. Demonstrate Both Correct and Incorrect Usage

```solidity
// Example: ✅ CORRECT
euint32 value = FHE.fromExternal(input, proof);
FHE.allowThis(value);
FHE.allow(value, msg.sender);

// Example: ❌ WRONG - Missing allowThis
euint32 value = FHE.fromExternal(input, proof);
FHE.allow(value, msg.sender); // Will fail!
```

### 5. Test Edge Cases

```typescript
// Test with zero values
it("Should handle zero input", async () => { ... });

// Test with maximum values
it("Should handle maximum value", async () => { ... });

// Test with invalid inputs
it("Should reject empty input", async () => { ... });
```

## Testing Locally

### Before Submitting

1. ✅ All tests pass: `npm run test`
2. ✅ Code compiles: `npm run compile`
3. ✅ Coverage is adequate: `npm run coverage`
4. ✅ Code is linted: `npm run lint`
5. ✅ Documentation generates: `npm run generate-docs`
6. ✅ Standalone works: Create and test standalone repo

## Checklist for New Example

- [ ] Contract file in correct directory
- [ ] Test file in correct directory
- [ ] Contract has NatSpec comments
- [ ] Test suite has 20+ test cases
- [ ] Includes success, error, and edge cases
- [ ] FHE operations demonstrated correctly
- [ ] Both permissions (allowThis, allow) shown
- [ ] Examples of correct and incorrect usage
- [ ] All tests pass
- [ ] Documentation generates successfully
- [ ] Standalone repository works
- [ ] Code is linted and formatted

## Example Categories

### Basic
Focus on FHE fundamentals:
- Encryption and decryption
- Arithmetic operations
- Comparison operations
- Permission system

### Gaming
Gaming-related applications:
- Score systems
- Leaderboards
- Achievements
- Tournaments

### Auction
Bidding and auction systems:
- Sealed-bid auctions
- Confidential bidding
- Bid comparison
- Winner determination

### Privacy
Privacy-preserving patterns:
- Access control
- Data encryption
- User-only decryption
- Confidential aggregation

### Finance
Financial applications:
- Confidential payments
- Encrypted balances
- Private trading
- Confidential swaps

## Maintenance

### Updating FHEVM Version

When FHEVM updates:

1. Update base-template
2. Regenerate all examples
3. Test all examples compile
4. Update documentation

```bash
# Regenerate all
npm install @fhevm/solidity@latest
npm run compile
npm run test
```

## Getting Help

- **Questions about FHEVM?** Check [FHEVM docs](https://docs.zama.ai/fhevm)
- **Hardhat issues?** See [Hardhat docs](https://hardhat.org)
- **Example questions?** Review other examples
- **Community?** Join [Zama Discord](https://discord.gg/zama)

## Example Template

Full template available at: `base-template/`

Use this to start your example:

```bash
# Copy base template
cp -r base-template my-example

# Add your contract
cp contracts/MyExample.sol my-example/contracts/

# Add your tests
cp test/MyExample.ts my-example/test/

# Install and test
cd my-example
npm install
npm run test
```

---

**Happy creating! Remember: Clear examples help the whole community learn FHE.**
