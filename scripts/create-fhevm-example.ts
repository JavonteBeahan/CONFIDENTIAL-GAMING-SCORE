/**
 * Script: Create FHEVM Example Repository
 *
 * This script generates a standalone FHEVM example repository by:
 * 1. Cloning the base template
 * 2. Copying contract and test files
 * 3. Updating configuration
 * 4. Generating documentation
 *
 * Usage:
 *   ts-node scripts/create-fhevm-example.ts <example-name> <output-path>
 *   ts-node scripts/create-fhevm-example.ts confidential-gaming-score ./examples/confidential-gaming
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

interface ExampleConfig {
  name: string;
  title: string;
  description: string;
  contractFile: string;
  testFile: string;
  category: string;
  concepts: string[];
}

// Map of available examples
const EXAMPLES_MAP: Record<string, ExampleConfig> = {
  "confidential-gaming-score": {
    name: "confidential-gaming-score",
    title: "Confidential Gaming Score",
    description:
      "Privacy-preserving gaming achievement system with FHE operations",
    contractFile: "ConfidentialGamingScore.sol",
    testFile: "ConfidentialGamingScore.ts",
    category: "gaming",
    concepts: [
      "encrypted-storage",
      "fhe-comparisons",
      "privacy-preservation",
      "user-decryption",
    ],
  },
  "fhe-counter": {
    name: "fhe-counter",
    title: "FHE Counter",
    description: "Simple encrypted counter demonstrating FHE basics",
    contractFile: "FHECounter.sol",
    testFile: "FHECounter.ts",
    category: "basic",
    concepts: ["encryption", "fhe-arithmetic", "permissions"],
  },
  "encrypted-value": {
    name: "encrypted-value",
    title: "Encrypted Value Storage",
    description: "Store and retrieve encrypted values with proper permissions",
    contractFile: "EncryptedValue.sol",
    testFile: "EncryptedValue.ts",
    category: "basic",
    concepts: ["encryption", "permissions", "user-decryption"],
  },
  "comparison-operator": {
    name: "comparison-operator",
    title: "FHE Comparison Operations",
    description: "Demonstrate encrypted comparison operations",
    contractFile: "ComparisonOperator.sol",
    testFile: "ComparisonOperator.ts",
    category: "basic",
    concepts: ["encrypted-comparisons", "fhe-logic"],
  },
  "blind-auction": {
    name: "blind-auction",
    title: "Blind Auction with FHE",
    description: "Sealed-bid auction with encrypted bids",
    contractFile: "BlindAuction.sol",
    testFile: "BlindAuction.ts",
    category: "auction",
    concepts: ["encrypted-auction", "confidential-bidding"],
  },
};

function getExampleConfig(exampleName: string): ExampleConfig {
  const config = EXAMPLES_MAP[exampleName];
  if (!config) {
    console.error(`❌ Unknown example: ${exampleName}`);
    console.log(`\nAvailable examples:`);
    Object.keys(EXAMPLES_MAP).forEach((name) => {
      console.log(`  - ${name}`);
    });
    process.exit(1);
  }
  return config;
}

function copyDirectory(source: string, destination: string) {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  const files = fs.readdirSync(source);
  files.forEach((file) => {
    const sourcePath = path.join(source, file);
    const destPath = path.join(destination, file);

    if (
      file === "node_modules" ||
      file === ".git" ||
      file === "artifacts" ||
      file === "cache"
    ) {
      return;
    }

    if (fs.statSync(sourcePath).isDirectory()) {
      copyDirectory(sourcePath, destPath);
    } else {
      fs.copyFileSync(sourcePath, destPath);
    }
  });
}

function createExampleRepository(
  exampleName: string,
  outputPath: string
): void {
  const config = getExampleConfig(exampleName);

  console.log("\n========================================");
  console.log(`Creating FHEVM Example Repository`);
  console.log("========================================\n");

  console.log(`Example: ${config.title}`);
  console.log(`Category: ${config.category}`);
  console.log(`Output: ${outputPath}\n`);

  // Step 1: Copy base template
  console.log("Step 1: Copying base template...");
  const baseTemplatePath = path.join(__dirname, "..", "base-template");

  if (!fs.existsSync(baseTemplatePath)) {
    console.error("❌ Base template not found at:", baseTemplatePath);
    process.exit(1);
  }

  copyDirectory(baseTemplatePath, outputPath);
  console.log("✅ Template copied\n");

  // Step 2: Copy contract and test files
  console.log("Step 2: Adding contract and test files...");

  const contractSource = path.join(
    __dirname,
    "..",
    "contracts",
    config.contractFile
  );
  const contractDest = path.join(outputPath, "contracts", config.contractFile);

  const testSource = path.join(__dirname, "..", "test", config.testFile);
  const testDest = path.join(outputPath, "test", config.testFile);

  if (fs.existsSync(contractSource)) {
    fs.copyFileSync(contractSource, contractDest);
    console.log(`  ✅ Copied contract: ${config.contractFile}`);
  } else {
    console.warn(
      `  ⚠️  Contract not found: ${config.contractFile} (will need to be added manually)`
    );
  }

  if (fs.existsSync(testSource)) {
    fs.copyFileSync(testSource, testDest);
    console.log(`  ✅ Copied test: ${config.testFile}`);
  } else {
    console.warn(
      `  ⚠️  Test not found: ${config.testFile} (will need to be added manually)`
    );
  }

  console.log("");

  // Step 3: Create example-specific README
  console.log("Step 3: Generating README...");

  const readmeContent = generateReadme(config);
  const readmePath = path.join(outputPath, "README.md");
  fs.writeFileSync(readmePath, readmeContent);
  console.log("✅ README generated\n");

  // Step 4: Create environment file
  console.log("Step 4: Creating environment file...");
  const envContent = fs.readFileSync(path.join(outputPath, ".env.example"), "utf-8");
  fs.writeFileSync(path.join(outputPath, ".env.example"), envContent);
  console.log("✅ Environment template created\n");

  // Step 5: Generate documentation metadata
  console.log("Step 5: Creating documentation metadata...");
  const docsMetadata = {
    name: config.name,
    title: config.title,
    description: config.description,
    category: config.category,
    concepts: config.concepts,
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(outputPath, ".example-metadata.json"),
    JSON.stringify(docsMetadata, null, 2)
  );
  console.log("✅ Metadata created\n");

  // Final summary
  console.log("========================================");
  console.log("Example Repository Created!");
  console.log("========================================\n");

  console.log(`📁 Location: ${path.resolve(outputPath)}`);
  console.log(`📄 Contract: ${config.contractFile}`);
  console.log(`🧪 Test: ${config.testFile}`);
  console.log(`🏷️  Concepts: ${config.concepts.join(", ")}\n`);

  console.log("Next steps:");
  console.log(`1. cd ${outputPath}`);
  console.log(`2. npm install`);
  console.log(`3. npm run compile`);
  console.log(`4. npm run test`);
  console.log(`5. npm run deploy:zama\n`);
}

function generateReadme(config: ExampleConfig): string {
  return `# ${config.title}

${config.description}

## Overview

This is a standalone FHEVM example repository demonstrating ${config.concepts.join(", ")}.

## Quick Start

\`\`\`bash
# Install dependencies
npm install

# Compile contracts
npm run compile

# Run tests
npm run test

# Deploy to Zama devnet
npm run deploy:zama
\`\`\`

## Learning Concepts

This example teaches:

${config.concepts.map((concept) => `- **${concept}** - Learn about ${concept}`).join("\n")}

## Project Structure

\`\`\`
.
├── contracts/${config.contractFile}    # Main contract
├── test/${config.testFile}             # Test suite
├── deploy/deploy.ts                     # Deployment script
├── hardhat.config.ts                    # Hardhat configuration
└── README.md                            # This file
\`\`\`

## Contract Walkthrough

The main contract \`${config.contractFile}\` demonstrates:

- Privacy-preserving operations using FHE
- Encrypted data storage and retrieval
- Secure computation on encrypted values
- User-only decryption capabilities

See the contract file for detailed documentation.

## Testing

Run the comprehensive test suite:

\`\`\`bash
npm run test
\`\`\`

Tests include:
- Success cases
- Error handling
- Edge cases
- FHE-specific operations

## Deployment

Deploy to Zama FHEVM:

\`\`\`bash
# Set private key in .env
npm run deploy:zama
\`\`\`

## Resources

- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [Solidity Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html)
- [Hardhat Documentation](https://hardhat.org)
- [Zama GitHub Examples](https://github.com/zama-ai)

## License

BSD-3-Clause-Clear

---

Generated from FHEVM Example Template
`;
}

// Main execution
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log("Usage: ts-node scripts/create-fhevm-example.ts <example-name> <output-path>");
  console.log("\nExample:");
  console.log(
    "  ts-node scripts/create-fhevm-example.ts confidential-gaming-score ./my-example"
  );
  console.log("\nAvailable examples:");
  Object.entries(EXAMPLES_MAP).forEach(([name, config]) => {
    console.log(`  ${name.padEnd(25)} - ${config.title}`);
  });
  process.exit(1);
}

const exampleName = args[0];
const outputPath = path.resolve(args[1]);

createExampleRepository(exampleName, outputPath);
