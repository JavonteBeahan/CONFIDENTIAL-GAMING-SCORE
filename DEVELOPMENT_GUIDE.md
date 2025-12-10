# Development Guide: Confidential Gaming Score

This guide provides detailed instructions for developers working on the Confidential Gaming Score project.

## Table of Contents

1. [Setup and Installation](#setup-and-installation)
2. [Development Workflow](#development-workflow)
3. [Testing](#testing)
4. [Deployment](#deployment)
5. [Debugging](#debugging)
6. [Contributing](#contributing)
7. [Best Practices](#best-practices)

## Setup and Installation

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

### Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd AnonymousGamingScore

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your settings
# IMPORTANT: Never commit .env file containing real private keys
```

### Verify Installation

```bash
# Compile contracts
npm run compile

# Run tests
npm run test

# Check hardhat is working
npx hardhat --version
```

## Development Workflow

### File Structure

```
AnonymousGamingScore/
├── contracts/
│   ├── ConfidentialGamingScore.sol     # Main FHEVM contract
│   └── AnonymousGamingScore.sol        # Legacy version
│
├── test/
│   └── ConfidentialGamingScore.ts      # Test suite
│
├── deploy/
│   └── deploy.ts                        # Deployment script
│
├── scripts/
│   └── example-usage.ts                 # Usage examples
│
├── hardhat.config.ts                    # Hardhat config
├── package.json                         # Dependencies
├── tsconfig.json                        # TypeScript config
├── COMPETITION_README.md                # Main documentation
└── DEVELOPMENT_GUIDE.md                 # This file
```

### Code Style

#### Solidity

- Use 4 spaces for indentation
- Follow [Solidity Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html)
- Add NatSpec comments for all public functions
- Use UPPER_CASE for constants

**Example:**

```solidity
/**
 * @dev Submit an encrypted gaming score
 * @param encryptedScoreInput Encrypted score value
 * @param inputProof Zero-knowledge proof
 * @notice Requires prior player registration
 */
function submitScore(
    bytes calldata encryptedScoreInput,
    bytes calldata inputProof
) external onlyRegisteredPlayer {
    // Implementation
}
```

#### TypeScript

- Use 2 spaces for indentation
- Use `const` by default, `let` when needed
- Add JSDoc comments for complex functions
- Use descriptive variable names

**Example:**

```typescript
/**
 * Deploy and initialize the contract
 * @returns Contract address
 */
async function deployContract(): Promise<string> {
  const factory = await ethers.getContractFactory("ConfidentialGamingScore");
  const contract = await factory.deploy();
  return await contract.getAddress();
}
```

### Adding New Features

#### Step 1: Write Tests First (TDD Approach)

Create test cases in `test/ConfidentialGamingScore.ts`:

```typescript
describe("New Feature", function () {
  it("Should do something", async function () {
    // Arrange
    await contract.connect(player).registerPlayer();

    // Act
    const tx = await contract.connect(player).newFunction();
    await tx.wait();

    // Assert
    expect(await contract.checkResult()).to.equal(expectedValue);
  });
});
```

#### Step 2: Implement Feature

Add implementation to `contracts/ConfidentialGamingScore.sol`:

```solidity
/**
 * @dev New feature implementation
 * @param param Description
 * @return Result description
 */
function newFunction(uint256 param) external returns (bool) {
    // Implementation
    return true;
}
```

#### Step 3: Run Tests

```bash
npm run test

# Or specific test file
npx hardhat test test/ConfidentialGamingScore.ts

# With detailed output
npm run test -- --verbose
```

#### Step 4: Document Changes

Update `COMPETITION_README.md`:

```markdown
### New Feature

Describe what the feature does and why it's useful.

### Usage Example

```solidity
function example() external {
    // Show how to use
}
```

#### Step 5: Lint and Format

```bash
npm run lint
npm run format
npm run lint:fix
```

## Testing

### Running Tests

```bash
# Run all tests
npm run test

# Run specific test file
npx hardhat test test/ConfidentialGamingScore.ts

# Run tests matching a pattern
npx hardhat test --grep "registration"

# Run with watch mode (reruns on file change)
npm run test:watch
```

### Test Coverage

```bash
# Generate coverage report
npm run coverage

# Open coverage report
open coverage/index.html
```

### Test Structure

Tests follow the Arrange-Act-Assert pattern:

```typescript
describe("Feature", function () {
  let contract: ConfidentialGamingScore;
  let player: SignerWithAddress;

  // Setup before each test
  beforeEach(async function () {
    const factory = await ethers.getContractFactory("ConfidentialGamingScore");
    contract = await factory.deploy();
    [, player] = await ethers.getSigners();
  });

  // Test case
  it("Should perform action correctly", async function () {
    // Arrange: Set up preconditions
    await contract.connect(player).registerPlayer();

    // Act: Execute the feature
    const tx = await contract.connect(player).submitScore(encScore, proof);
    await tx.wait();

    // Assert: Verify results
    expect(await contract.hasPlayerSubmitted(player.address)).to.be.true;
  });
});
```

### Debugging Tests

```bash
# Run with verbose output
npm run test -- --verbose

# Run single test
npx hardhat test test/ConfidentialGamingScore.ts --grep "specific test"

# Debug with additional logging
DEBUG=* npm run test

# Check hardhat console
npx hardhat console
> const contract = await ethers.getContractAt("ConfidentialGamingScore", address);
> console.log(await contract.getTotalPlayers());
```

## Deployment

### Local Development

```bash
# Start local hardhat node
npx hardhat node

# In another terminal, deploy to local node
npx hardhat run deploy/deploy.ts --network localhost

# Interact with contract in console
npx hardhat console --network localhost
> const contract = await ethers.getContractAt("ConfidentialGamingScore", "0x...");
```

### Test Network Deployment

```bash
# Set private key in .env
export PRIVATE_KEY="your-private-key"

# Deploy to Zama testnet
npm run deploy:zamaTestnet

# Check deployment
npx hardhat run scripts/check-deployment.ts --network zamaTestnet
```

### Mainnet Deployment

```bash
# ⚠️ CAUTION: Mainnet deployment uses real funds
# Only deploy after thorough testing

# Verify private key is correct
export PRIVATE_KEY="your-mainnet-private-key"

# Deploy
npm run deploy:zama

# Verify contract on block explorer (if supported)
npx hardhat verify --network zama <CONTRACT_ADDRESS>
```

### Deployment Checklist

- [ ] All tests pass: `npm run test`
- [ ] Coverage is acceptable: `npm run coverage`
- [ ] Code is linted: `npm run lint`
- [ ] Contract is compiled: `npm run compile`
- [ ] No console.log statements in production code
- [ ] Private key is in .env (never committed)
- [ ] Network is correct (verify 3x)
- [ ] Gas limit is appropriate
- [ ] Account has sufficient balance
- [ ] Deployment transaction confirmed
- [ ] Contract verified on block explorer
- [ ] Frontend updated with new address

## Debugging

### Enable Debug Logging

```bash
# Enable all logs
DEBUG=* npm run test

# Enable specific logs
DEBUG=hardhat:* npm run test

# Enable with grep filter
DEBUG=hardhat:* npm run test -- --grep "registration"
```

### Hardhat Console

```bash
# Open interactive console
npx hardhat console --network hardhat

# In console:
> const contract = await ethers.getContractAt(...)
> await contract.getContractInfo()
> await contract.getTotalPlayers()
```

### Print Debug Information

```typescript
// In tests or scripts
console.log("Debug info:", JSON.stringify(data, null, 2));
console.table(arrayOfObjects);

// In contracts (if needed)
emit DebugEvent(value); // Define custom event
```

### Common Issues and Solutions

#### "Contract not found"
```bash
# Recompile contracts
npm run compile
npm run clean && npm run compile
```

#### "Insufficient gas"
```bash
# Check gas limit in hardhat.config.ts
# Increase gasLimit in transaction options
```

#### "Signer not connected"
```typescript
// Verify signer is connected
const contract = contractInstance.connect(signer);
const tx = await contract.someFunction();
```

#### "FHE operations failing"
```typescript
// Ensure permissions are set
FHE.allowThis(encryptedValue);
FHE.allow(encryptedValue, msg.sender);
```

## Contributing

### Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes and commit**
   ```bash
   git add .
   git commit -m "feat: Add new feature"
   ```

3. **Push to branch**
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Create pull request** with description

5. **Ensure CI passes**
   - All tests pass
   - Coverage maintained
   - No linting errors

### Commit Message Format

```
<type>: <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `test`: Test additions
- `refactor`: Code refactoring
- `perf`: Performance improvement

**Examples:**
```
feat: Add user score reset functionality
fix: Correct FHE permission handling
docs: Update FHEVM documentation
test: Add comprehensive test suite for achievements
```

## Best Practices

### Security

1. **Never expose private keys**
   ```bash
   # ✅ Good
   export PRIVATE_KEY=... (only in secure environments)

   # ❌ Bad
   hardhat.config.ts: PRIVATE_KEY = "0x..."
   ```

2. **Always verify encrypted inputs**
   ```solidity
   // ✅ Good
   require(encryptedInput.length > 0, "Invalid input");
   euint32 value = FHE.fromExternal(encryptedInput, proof);

   // ❌ Bad
   euint32 value = FHE.fromExternal(encryptedInput, "");
   ```

3. **Grant both FHE permissions**
   ```solidity
   // ✅ Good
   FHE.allowThis(encryptedValue);
   FHE.allow(encryptedValue, msg.sender);

   // ❌ Bad (missing allowThis)
   FHE.allow(encryptedValue, msg.sender);
   ```

### Gas Optimization

1. **Use view/pure functions for queries**
   ```solidity
   // ✅ Good - doesn't modify state
   function getTotalPlayers() external view returns (uint256) {
       return totalPlayersCount;
   }

   // ❌ Bad - unnecessary state modification
   function getTotalPlayers() external returns (uint256) {
       totalPlayersCount = totalPlayersCount; // pointless
       return totalPlayersCount;
   }
   ```

2. **Batch operations when possible**
   ```solidity
   // ✅ Good - single transaction
   function submitMultipleScores(bytes[] calldata scores) external {
       for (uint i = 0; i < scores.length; i++) {
           // Process each score
       }
   }
   ```

### Code Quality

1. **Add comprehensive comments**
   ```solidity
   /**
    * @dev Clear description of what this does
    * @param paramName What this parameter means
    * @return What this returns and what it means
    * @notice Important usage notes
    */
   ```

2. **Use meaningful variable names**
   ```solidity
   // ✅ Good
   euint32 playerEncryptedScore = FHE.asEuint32(score);

   // ❌ Bad
   euint32 x = FHE.asEuint32(s);
   ```

3. **Keep functions small and focused**
   ```solidity
   // ✅ Good - single responsibility
   function registerPlayer() external { ... }
   function submitScore() external { ... }

   // ❌ Bad - doing multiple things
   function registerAndSubmit(bytes calldata score) external { ... }
   ```

### Testing Best Practices

1. **Test both success and failure cases**
   ```typescript
   // ✅ Good
   it("Should succeed with valid input", async () => { ... });
   it("Should fail with invalid input", async () => { ... });

   // ❌ Bad - only happy path
   it("Should work", async () => { ... });
   ```

2. **Use descriptive test names**
   ```typescript
   // ✅ Good
   it("Should prevent unregistered player from submitting score", async () => { ... });

   // ❌ Bad
   it("Should work", async () => { ... });
   ```

3. **Group related tests with describe blocks**
   ```typescript
   describe("Score Submission", function () {
       describe("With registered player", function () { ... });
       describe("With unregistered player", function () { ... });
   });
   ```

## Performance Monitoring

### Gas Analysis

```bash
# Generate gas report
REPORT_GAS=true npm run test

# Expected gas usage (approximate):
# registerPlayer:       ~50,000 gas
# submitScore:         ~150,000 gas
# getMyScore (view):   ~30,000 gas
```

### Optimization Tips

1. Reduce state writes
2. Use efficient data types
3. Batch similar operations
4. Cache frequently accessed values
5. Use events instead of storage for logs

## Additional Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [Solidity Documentation](https://docs.soliditylang.org/)
- [Ethers.js Documentation](https://docs.ethers.org/v6/)
- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

## Getting Help

- Check existing issues and discussions
- Review test cases for usage examples
- Consult contract comments for implementation details
- Ask in community forums
- Open an issue with detailed information

---

**Happy developing! Remember: Write tests first, commit often, and always review changes before deployment.**
