# Deployment Guide: Confidential Gaming Score

This guide covers deploying the Confidential Gaming Score contract to various networks.

## Network Configurations

### Zama FHEVM Devnet

**Best for:** Testing and development

```
Network Name: Zama FHEVM Devnet
Chain ID: 8009
RPC URL: https://devnet.zama.ai/
Currency: ETH
Block Explorer: https://devnet.explorer.zama.ai/
```

**Getting Test ETH:**
1. Visit [Zama Devnet Faucet](https://devnet.faucet.zama.ai/)
2. Enter your wallet address
3. Receive test ETH within minutes

### Zama FHEVM Testnet

**Best for:** Pre-production testing

```
Network Name: Zama FHEVM Testnet
Chain ID: 8008
RPC URL: https://testnet.zama.ai/
Currency: ETH
Block Explorer: https://testnet.explorer.zama.ai/
```

### Zama FHEVM Mainnet

**Best for:** Production deployment (when available)

```
Network Name: Zama FHEVM Mainnet
Chain ID: 8007
RPC URL: https://mainnet.zama.ai/
Currency: ETH
Block Explorer: https://explorer.zama.ai/
```

## Pre-Deployment Checklist

- [ ] All tests pass locally
- [ ] Code is linted and formatted
- [ ] Documentation is up to date
- [ ] Private key is secure
- [ ] Network is correct
- [ ] Account has sufficient balance
- [ ] Contract address is not already deployed

## Deployment Steps

### Step 1: Prepare Environment

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your settings
nano .env
```

### Step 2: Set Private Key

Edit `.env` file:

```
PRIVATE_KEY=0x... (your private key without 0x prefix, 64 hex characters)
```

**Security Warning:**
- Never commit `.env` file
- Never share your private key
- Use dedicated deployment accounts
- Consider hardware wallets for mainnet

### Step 3: Verify Settings

```bash
# Check hardhat config
cat hardhat.config.ts | grep -A 5 "networks"

# Verify network is correct
npx hardhat config:view

# Check account balance
npx hardhat run scripts/check-balance.ts --network zama
```

### Step 4: Deploy Contract

#### To Zama Devnet (Recommended First)

```bash
npm run deploy:zama
```

**Output:**
```
========================================
Deploying ConfidentialGamingScore Contract
========================================

Network: zama (Chain ID: 8009)
Deployer Address: 0x...
Deployer Balance: 1.5 ETH

Deploying ConfidentialGamingScore...
Transaction Hash: 0x...

✅ Deployment Successful!
Contract Address: 0x1234567890123456789012345678901234567890
Deployment Time: 23.45s
Gas Used: 2500000
```

#### To Zama Testnet

```bash
npm run deploy:zamaTestnet
```

#### To Local Network (For Testing)

```bash
# Terminal 1: Start local node
npx hardhat node

# Terminal 2: Deploy
npx hardhat run deploy/deploy.ts --network localhost
```

### Step 5: Verify Deployment

```bash
# Check contract on explorer (if available)
# https://devnet.explorer.zama.ai/address/0x...

# Check contract state
npx hardhat console --network zama
> const contract = await ethers.getContractAt("ConfidentialGamingScore", "0x...");
> await contract.getContractInfo()
> await contract.getTotalPlayers()
```

### Step 6: Save Deployment Info

Create `deployments.json`:

```json
{
  "zama-devnet": {
    "network": "zama",
    "chainId": 8009,
    "contractAddress": "0x1234567890123456789012345678901234567890",
    "deployer": "0x...",
    "deploymentBlock": 12345,
    "deploymentHash": "0x...",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Post-Deployment Setup

### 1. Initialize Contract (Optional)

Create achievements or set parameters:

```bash
npx hardhat console --network zama

> const contract = await ethers.getContractAt(
    "ConfidentialGamingScore",
    "0x..."
  );

> // Create initial achievements
> await contract.createAchievement("Bronze Player", 1000);
> await contract.createAchievement("Silver Player", 1500);
> await contract.createAchievement("Gold Player", 2000);

> // Verify
> await contract.getAchievement(0)
```

### 2. Update Frontend

Update your frontend with the contract address:

```typescript
const CONTRACT_ADDRESS = "0x1234567890123456789012345678901234567890";
const CONTRACT_ABI = [...]; // Import ABI from artifacts
```

### 3. Monitor Deployment

```bash
# Watch contract activity
npx hardhat run scripts/monitor.ts --network zama

# Check gas usage
npx hardhat run scripts/analyze-gas.ts --network zama
```

### 4. Document Deployment

Create `DEPLOYMENT.md`:

```markdown
# Deployment Record

## Zama Devnet - January 15, 2024

**Contract Address:** 0x...
**Deployer:** 0x...
**Block:** 12345
**Transaction:** 0x...
**Explorer:** https://devnet.explorer.zama.ai/address/0x...

### Verified Functions
- [x] registerPlayer()
- [x] submitScore()
- [x] getNetworkStats()
- [x] createAchievement()

### Initialization
- Created 3 achievements
- No initial players
- Min threshold: 100
```

## Upgrade Procedure (If Needed)

### Strategy 1: Proxy Pattern

Deploy through proxy contract:

```solidity
// Create proxy contract
contract GamingScoreProxy is Proxy {
    address implementation;

    function upgradeTo(address newImplementation) external {
        implementation = newImplementation;
    }
}
```

### Strategy 2: New Deployment

1. Deploy new contract to new address
2. Migrate data if needed
3. Update frontend with new address
4. Announce migration to users

## Troubleshooting

### Issue: "Insufficient funds"

```bash
# Check balance
npx hardhat run scripts/check-balance.ts --network zama

# Get test ETH from faucet
# https://devnet.faucet.zama.ai/
```

### Issue: "Network unreachable"

```bash
# Check RPC URL
cat hardhat.config.ts | grep "url:"

# Test connectivity
curl -X POST https://devnet.zama.ai/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"web3_clientVersion","id":1}'
```

### Issue: "Invalid private key"

```bash
# Verify private key format
# Should be 64 hex characters (32 bytes)
# PRIVATE_KEY=0x1234...5678 (no 0x is also OK)

# Generate new key if needed
npx hardhat accounts | head -1
```

### Issue: "Contract already exists"

The contract address is already deployed. Options:

1. Use existing contract (get address from explorer)
2. Deploy to testnet instead
3. Clear network state (if local)

```bash
# For local network
npx hardhat clean
```

## Verification

### Manual Verification

```bash
# Connect to contract
npx hardhat console --network zama

> const contract = await ethers.getContractAt(
    "ConfidentialGamingScore",
    "0x..."
  );

> // Test functions
> await contract.getContractInfo()
> await contract.getTotalPlayers()
> await contract.getMinScoreThreshold()

> // Create test achievement
> await contract.createAchievement("Test", 500)
```

### Automated Verification

```bash
npx hardhat run scripts/verify-deployment.ts --network zama
```

## Security Audit Checklist

Before mainnet deployment:

- [ ] All tests pass
- [ ] Code reviewed by team
- [ ] No security vulnerabilities
- [ ] Gas optimization done
- [ ] Upgrade path defined
- [ ] Emergency procedures documented
- [ ] Access controls verified
- [ ] Input validation checked
- [ ] Events logged correctly
- [ ] Documentation complete

## Monitoring and Maintenance

### Monitor Contract

```bash
# Set up monitoring script
npx hardhat run scripts/monitor.ts --network zama

# Track:
# - New player registrations
# - Score submissions
# - Achievement creations
# - Network statistics changes
```

### Update Dependencies

```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Update major versions (with testing)
npm install @fhevm/solidity@latest
npm run test
npm run compile
```

### Backup and Recovery

```bash
# Export deployment info
npx hardhat run scripts/export-deployment.ts --network zama

# Save to safe location
cp deployments.json backups/deployments-$(date +%Y%m%d).json
```

## Multi-Network Deployment

Deploy to multiple networks simultaneously:

```bash
#!/bin/bash

NETWORKS=("zama" "zamaTestnet")

for network in "${NETWORKS[@]}"; do
    echo "Deploying to $network..."
    npm run deploy:$network
    echo "Waiting 30 seconds..."
    sleep 30
done

echo "All deployments complete!"
```

## Rollback Procedure

If deployment has issues:

```bash
# 1. Stop all transactions
# (Set up manual transaction blocking if needed)

# 2. Document the issue
echo "Deployment issue on devnet at $(date)" >> incident.log

# 3. Redeploy (optional)
npm run deploy:zama

# 4. Update frontend with new address
# Update environment variable

# 5. Notify users if needed
```

## Common Deployment Commands

```bash
# Deploy to devnet
npm run deploy:zama

# Deploy to testnet
npm run deploy:zamaTestnet

# Deploy to local node
npm run deploy:local

# Check balance before deployment
npx hardhat run scripts/check-balance.ts --network zama

# Run example usage
npx hardhat run scripts/example-usage.ts --network zama

# Get deployment info
npx hardhat run scripts/get-deployment-info.ts --network zama
```

## Final Steps

1. ✅ Deployment successful
2. ✅ Contract verified on explorer
3. ✅ Frontend updated
4. ✅ Documentation updated
5. ✅ Team notified
6. ✅ Monitoring enabled
7. ✅ Backup created
8. ✅ Ready for production

---

**Remember: Test thoroughly before mainnet deployment. Always keep backups of deployment information.**
