import { ethers } from "hardhat";

/**
 * Deployment Script: ConfidentialGamingScore
 *
 * This script handles the deployment of the ConfidentialGamingScore contract
 * to the configured network (Zama FHEVM, local testnet, etc.)
 *
 * Usage:
 *   npx hardhat run deploy/deploy.ts --network zama
 *   npx hardhat run deploy/deploy.ts --network hardhat
 */

async function main() {
  console.log("========================================");
  console.log("Deploying ConfidentialGamingScore Contract");
  console.log("========================================\n");

  // Get network information
  const network = await ethers.provider.getNetwork();
  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer Address: ${deployer.address}`);

  // Get account balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer Balance: ${ethers.formatEther(balance)} ETH\n`);

  // Verify contract factory is available
  const ConfidentialGamingScore = await ethers.getContractFactory(
    "ConfidentialGamingScore"
  );

  console.log("Deploying ConfidentialGamingScore...");
  const startTime = Date.now();

  try {
    // Deploy contract
    const contract = await ConfidentialGamingScore.deploy();
    const deployTx = contract.deploymentTransaction();

    console.log(`Transaction Hash: ${deployTx?.hash}`);

    // Wait for deployment confirmation
    const receipt = await contract.waitForDeployment();
    const address = await contract.getAddress();

    const deploymentTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n✅ Deployment Successful!`);
    console.log(`Contract Address: ${address}`);
    console.log(`Deployment Time: ${deploymentTime}s`);
    console.log(`Gas Used: ${receipt?.gasUsed}`);

    // Initialize contract
    console.log(`\nInitializing contract...`);

    try {
      const contractInfo = await contract.getContractInfo();
      console.log(`Contract Info: ${contractInfo}`);

      const minThreshold = await contract.getMinScoreThreshold();
      console.log(`Min Score Threshold: ${minThreshold}`);

      const totalPlayers = await contract.getTotalPlayers();
      console.log(`Initial Total Players: ${totalPlayers}`);
    } catch (error) {
      console.warn("Note: Some initialization checks may not be available in this environment");
    }

    // Display deployment information
    console.log(`\n========================================`);
    console.log("Deployment Information");
    console.log(`========================================`);
    console.log(`Contract Name: ConfidentialGamingScore`);
    console.log(`Network: ${network.name}`);
    console.log(`Chain ID: ${network.chainId}`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Contract Address: ${address}`);
    console.log(`Deployment Block: ${receipt?.blockNumber}`);
    console.log(`Deployment Hash: ${deployTx?.hash}`);

    // Save deployment information
    const deploymentInfo = {
      network: network.name,
      chainId: network.chainId,
      contractName: "ConfidentialGamingScore",
      contractAddress: address,
      deployer: deployer.address,
      deploymentBlock: receipt?.blockNumber,
      deploymentHash: deployTx?.hash,
      deploymentTime: deploymentTime,
      timestamp: new Date().toISOString(),
    };

    console.log(`\nDeployment Info (JSON):`);
    console.log(JSON.stringify(deploymentInfo, null, 2));

    // Generate next steps
    console.log(`\n========================================`);
    console.log("Next Steps");
    console.log(`========================================`);
    console.log(`1. Update frontend with contract address: ${address}`);
    console.log(`2. Register players: await contract.registerPlayer()`);
    console.log(`3. Submit encrypted scores: await contract.submitScore(encryptedScore, proof)`);
    console.log(`4. Query results using FHE client library`);
    console.log(`5. Verify contract: npx hardhat verify --network ${network.name} ${address}`);

    return address;
  } catch (error) {
    console.error("\n❌ Deployment Failed!");
    console.error(error);
    process.exitCode = 1;
  }
}

// Execute deployment
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
