# FHEVM Example Template

This is the base template for standalone FHEVM example repositories.

## Quick Start

```bash
# Install dependencies
npm install

# Compile contracts
npm run compile

# Run tests
npm run test

# Deploy to Zama devnet
npm run deploy:zama
```

## Project Structure

```
.
├── contracts/           # Solidity contracts
├── test/               # Test files
├── deploy/             # Deployment scripts
├── hardhat.config.ts   # Hardhat configuration
├── package.json        # Dependencies
└── tsconfig.json       # TypeScript config
```

## Available Commands

- `npm run compile` - Compile smart contracts
- `npm run test` - Run test suite
- `npm run coverage` - Generate test coverage report
- `npm run lint` - Check code style
- `npm run format` - Format code
- `npm run deploy:zama` - Deploy to Zama devnet

## Documentation

See the README in the contracts or test directories for concept explanations.

## Resources

- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [Zama GitHub](https://github.com/zama-ai)
- [Hardhat Documentation](https://hardhat.org)

## License

BSD-3-Clause-Clear
