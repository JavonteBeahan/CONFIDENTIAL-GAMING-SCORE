# FHEVM Examples Documentation

Complete guide to privacy-preserving smart contracts using Fully Homomorphic Encryption on Zama FHEVM.

## Quick Navigation

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Examples by Category](#examples-by-category)
- [Learning Path](#learning-path)
- [Resources](#resources)

## Overview

This documentation covers a comprehensive collection of FHEVM example implementations demonstrating:

✅ **Encrypted Data Storage** - Store and manage encrypted values on-chain
✅ **Privacy-Preserving Computation** - Perform calculations without revealing data
✅ **Confidential Comparisons** - Compare encrypted values without decryption
✅ **User-Only Decryption** - Let users decrypt only their own data
✅ **FHE Permissions** - Manage access to encrypted values
✅ **Real-World Applications** - Gaming, auctions, voting, and more

## Getting Started

### Quick Start

```bash
# Clone template
git clone <repository-url>
cd example-name

# Install and compile
npm install
npm run compile

# Run tests
npm run test

# Deploy to Zama devnet
npm run deploy:zama
```

### Environment Setup

```bash
# Create .env file
cp .env.example .env

# Add your private key (for deployment)
PRIVATE_KEY=0x...

# Deploy
npm run deploy:zama
```

## Examples by Category

### 🎮 Gaming Applications

#### [Confidential Gaming Score](confidential-gaming-score.md)

**Concept**: Privacy-preserving gaming achievement system

- Encrypted score storage
- Confidential leaderboards
- Achievement system with encrypted verification
- Network statistics without exposing individual scores

**Key Concepts**:
- `euint32` encrypted integers
- `FHE.allow()` and `FHE.allowThis()` permissions
- Encrypted comparisons for rankings
- Privacy-preserving aggregations

**Use Cases**:
- Anonymous gaming tournaments
- Private performance tracking
- Confidential achievement unlocking
- Privacy-first leaderboards

---

### 📊 Basic Concepts

#### [FHE Counter](fhe-counter.md)

**Concept**: Simple encrypted counter demonstrating FHE fundamentals

- Basic encrypted arithmetic
- Increment and decrement operations
- FHE permission system
- Encrypted value storage

**Key Concepts**:
- `euint32` encrypted unsigned integers
- `FHE.fromExternal()` for input conversion
- `FHE.add()` and `FHE.sub()` operations
- Permission management

**Learning Focus**:
- FHE type system
- Basic encrypted operations
- Permission requirements
- Common patterns

---

### 🔨 Auction Systems

#### [Blind Auction with FHE](blind-auction.md)

**Concept**: Sealed-bid auction using Fully Homomorphic Encryption

- Encrypted bid submission
- Confidential bid storage
- Encrypted bid comparisons
- Privacy-preserving winner determination

**Key Concepts**:
- Encrypted bid management
- `FHE.gt()` for encrypted comparisons
- Auction state management
- Confidential bid privacy

**Use Cases**:
- Fair procurement auctions
- Sealed-bid procurement
- Privacy-preserving trading
- Confidential negotiations

---

## Learning Path

### Beginner: Start Here

1. **[FHE Counter](fhe-counter.md)** - Learn FHE basics
   - Understand encrypted data types
   - Learn permission system
   - Practice basic operations

2. **[Confidential Gaming Score](confidential-gaming-score.md)** - See practical application
   - Understand real-world use case
   - Learn user-only decryption
   - Study privacy guarantees

### Intermediate: Explore Deeper

3. **[Blind Auction](blind-auction.md)** - Advanced comparisons
   - Learn encrypted comparisons
   - Understand sealed-bid mechanics
   - Study auction patterns

### Advanced: Build Applications

4. Review contract implementations
5. Study test patterns
6. Modify examples for your use case
7. Deploy to production

## Core Concepts Reference

### Encrypted Data Types

```solidity
// Encrypted integers
euint8 small;      // 8-bit encrypted unsigned
euint16 medium;    // 16-bit encrypted unsigned
euint32 normal;    // 32-bit encrypted unsigned
euint64 large;     // 64-bit encrypted unsigned

// Other encrypted types
ebool condition;   // Encrypted boolean
eaddress account;  // Encrypted address
```

### Common Operations

```solidity
// Convert plaintext to encrypted
euint32 encrypted = FHE.asEuint32(plainValue);

// Convert external encrypted input
euint32 input = FHE.fromExternal(encryptedInput, proof);

// Arithmetic operations
euint32 sum = FHE.add(a, b);
euint32 diff = FHE.sub(a, b);
euint32 product = FHE.mul(a, b);

// Comparison operations
ebool isGreater = FHE.gt(a, b);
ebool isEqual = FHE.eq(a, b);
ebool isLess = FHE.lt(a, b);

// Permission system (CRITICAL)
FHE.allowThis(encryptedValue);        // Grant contract access
FHE.allow(encryptedValue, msg.sender); // Grant user decryption right
```

### Permission System

**Critical Pattern**: Always use both permissions together

```solidity
// ✅ CORRECT
euint32 value = FHE.fromExternal(input, proof);
FHE.allowThis(value);           // Contract can access
FHE.allow(value, msg.sender);   // User can decrypt

// ❌ WRONG - Will fail without allowThis
FHE.allow(value, msg.sender);   // Missing allowThis!

// ❌ WRONG - Won't allow user decryption
FHE.allowThis(value);           // Missing allow!
```

## Documentation Structure

Each example includes:

- **Contract**: Main smart contract with FHEVM operations
- **Tests**: Comprehensive test suite with 40+ test cases
- **Documentation**: Detailed explanation and concepts
- **Deployment**: Scripts and guides for Zama networks
- **Integration**: Frontend integration examples

## Key Files

In each example repository:

```
.
├── contracts/                  # Solidity contracts
│   └── Example.sol            # Main contract
│
├── test/                       # Test files
│   └── Example.ts             # Test suite
│
├── deploy/                     # Deployment scripts
│   └── deploy.ts              # Deploy contract
│
├── scripts/                    # Utility scripts
│   └── example-usage.ts       # Usage examples
│
├── README.md                   # Quick reference
├── hardhat.config.ts          # Hardhat configuration
├── package.json               # Dependencies
└── .env.example               # Environment template
```

## Network Configuration

### Zama FHEVM Devnet
```
Network: Zama FHEVM Devnet
Chain ID: 8009
RPC: https://devnet.zama.ai/
Faucet: https://devnet.faucet.zama.ai/
Best for: Development and testing
```

### Zama FHEVM Testnet
```
Network: Zama FHEVM Testnet
Chain ID: 8008
RPC: https://testnet.zama.ai/
Best for: Pre-production testing
```

### Zama FHEVM Mainnet
```
Network: Zama FHEVM Mainnet
Chain ID: 8007
RPC: https://mainnet.zama.ai/
Best for: Production deployment
```

## Command Reference

```bash
# Compile contracts
npm run compile

# Run tests
npm run test

# Watch mode
npm run test:watch

# Generate coverage
npm run coverage

# Lint code
npm run lint

# Format code
npm run format

# Deploy to devnet
npm run deploy:zama

# Deploy to testnet
npm run deploy:zamaTestnet

# Local node
npx hardhat node
```

## Best Practices

### Security

1. **Always use both permissions**
   ```solidity
   FHE.allowThis(value);
   FHE.allow(value, msg.sender);
   ```

2. **Validate all inputs**
   ```solidity
   require(encryptedInput.length > 0, "Invalid input");
   require(proof.length > 0, "Invalid proof");
   ```

3. **Verify encryption binding**
   - Ensure inputs encrypted for correct contract and user

### Code Quality

1. **Add comprehensive comments**
   - Document FHE operations
   - Explain privacy guarantees
   - Note encryption binding requirements

2. **Use meaningful names**
   - Prefix encrypted values: `encryptedScore`, `euintBalance`
   - Example: `euint32 encryptedScore` not `euint32 x`

3. **Keep functions focused**
   - One responsibility per function
   - Separate concerns clearly

### Testing

1. **Test success and failure cases**
   - Valid inputs and operations
   - Invalid inputs and access violations
   - Edge cases and boundaries

2. **Test FHE-specific behavior**
   - Permission system
   - Encrypted operations
   - Privacy guarantees

## Integration Guide

### Web3.js Integration

```typescript
import { createInstance } from 'fhevmjs';
import { ethers } from 'ethers';

// Initialize FHE client
const fhevm = await createInstance({
  chainId: 8009,
  networkUrl: 'https://devnet.zama.ai/',
});

// Encrypt value
const plainValue = 1500;
const encrypted = fhevm.encrypt32(plainValue);

// Submit to contract
const tx = await contract.submitValue(
  encrypted.handles[0],
  encrypted.inputProof
);
```

## Troubleshooting

### "Invalid proof"
- Ensure proof generated alongside encrypted input
- Check encryption binding (contract address, user address)

### "Cannot decrypt"
- Verify `FHE.allow()` permission was granted
- Check user address matches encryption binding

### "Missing allowThis"
- Always pair `FHE.allow()` with `FHE.allowThis()`
- Both permissions are required

## Resources

### Official Documentation
- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [FHEVM Solidity Library](https://github.com/zama-ai/fhevm/tree/main/solidity)
- [Hardhat Documentation](https://hardhat.org/docs)

### Development Tools
- [fhevmjs Client Library](https://github.com/zama-ai/fhevmjs)
- [Zama GitHub](https://github.com/zama-ai)
- [Example Repository](https://github.com/zama-ai/fhevm-hardhat-template)

### Community
- [Zama Discord](https://discord.gg/zama)
- [Zama Forum](https://www.zama.ai/community)
- [Zama Twitter](https://twitter.com/zama)

## Contributing

Contributions are welcome! Please:

1. Follow existing code style
2. Add tests for new functionality
3. Update documentation
4. Ensure all tests pass
5. Lint code with solhint

## License

All examples are licensed under BSD-3-Clause-Clear.

See LICENSE file in each repository for details.

---

## Next Steps

1. **Start with [FHE Counter](fhe-counter.md)** to learn basics
2. **Explore [Confidential Gaming Score](confidential-gaming-score.md)** for real-world example
3. **Study [Blind Auction](blind-auction.md)** for advanced patterns
4. **Review contracts and tests** for implementation details
5. **Deploy to Zama networks** and build your own examples

---

**Built with ❤️ using [FHEVM](https://github.com/zama-ai/fhevm) by Zama**

Last Updated: December 2025
FHEVM Version: 0.9.1+
Solidity: ^0.8.24
