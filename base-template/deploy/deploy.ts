import { ethers } from "hardhat";

/**
 * Base deployment script for FHEVM examples
 *
 * This script should be customized per example:
 * - Update CONTRACT_NAME to match your contract
 * - Update initialization logic as needed
 */

async function main() {
  console.log("========================================");
  console.log("Deploying FHEVM Example Contract");
  console.log("========================================\n");

  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH\n`);

  // TODO: Update CONTRACT_NAME to match your contract
  const CONTRACT_NAME = "YourContractName";

  console.log(`Deploying ${CONTRACT_NAME}...`);
  const ContractFactory = await ethers.getContractFactory(CONTRACT_NAME);
  const contract = await ContractFactory.deploy();

  const address = await contract.getAddress();
  const receipt = await contract.deploymentTransaction()?.wait();

  console.log(`\n✅ Deployment successful!`);
  console.log(`Contract: ${CONTRACT_NAME}`);
  console.log(`Address: ${address}`);
  console.log(`Block: ${receipt?.blockNumber}`);
  console.log(`Hash: ${receipt?.transactionHash}\n`);

  return address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
