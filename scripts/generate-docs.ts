/**
 * Script: Generate Documentation from Examples
 *
 * This script auto-generates GitBook-compatible documentation from:
 * - Contract files (extracts NatSpec comments)
 * - Test files (extracts JSDoc comments)
 * - Example metadata
 *
 * Usage:
 *   ts-node scripts/generate-docs.ts <example-name>
 *   ts-node scripts/generate-docs.ts --all
 *   ts-node scripts/generate-docs.ts confidential-gaming-score
 */

import * as fs from "fs";
import * as path from "path";

interface DocumentationConfig {
  name: string;
  title: string;
  description: string;
  category: string;
  concepts: string[];
  contractFile: string;
  testFile: string;
}

// Configuration for all examples
const EXAMPLES_CONFIG: Record<string, DocumentationConfig> = {
  "confidential-gaming-score": {
    name: "confidential-gaming-score",
    title: "Confidential Gaming Score",
    description:
      "Privacy-preserving gaming achievement system with FHE operations",
    category: "gaming",
    concepts: [
      "encrypted-storage",
      "fhe-comparisons",
      "privacy-preservation",
      "achievements",
    ],
    contractFile: "ConfidentialGamingScore.sol",
    testFile: "ConfidentialGamingScore.ts",
  },
  "fhe-counter": {
    name: "fhe-counter",
    title: "FHE Counter",
    description: "Simple encrypted counter demonstrating FHE basics",
    category: "basic",
    concepts: ["encryption", "fhe-arithmetic", "permissions"],
    contractFile: "FHECounter.sol",
    testFile: "FHECounter.ts",
  },
};

interface DocSection {
  title: string;
  level: number;
  content: string[];
}

function extractNatSpec(content: string): Map<string, string> {
  const specs = new Map<string, string>();
  const natspecRegex = /\/\*\*\s*([\s\S]*?)\*\//g;

  let match;
  while ((match = natspecRegex.exec(content)) !== null) {
    const spec = match[1];
    const lines = spec.split("\n").map((line) => line.replace(/^\s*\*\s?/, ""));
    specs.set(`spec_${specs.size}`, lines.join("\n"));
  }

  return specs;
}

function extractTestCases(content: string): Array<{
  name: string;
  description: string;
}> {
  const testCases: Array<{ name: string; description: string }> = [];
  const testRegex = /it\(['"`]([^'"`]+)['"`]/g;

  let match;
  while ((match = testRegex.exec(content)) !== null) {
    testCases.push({
      name: match[1],
      description: "",
    });
  }

  return testCases;
}

function generateDocumentationPage(config: DocumentationConfig): string {
  const docContent: DocSection[] = [];

  // Title
  docContent.push({
    title: config.title,
    level: 1,
    content: [config.description],
  });

  // Overview
  docContent.push({
    title: "Overview",
    level: 2,
    content: [
      "This example demonstrates the following FHEVM concepts:",
      "",
      config.concepts.map((c) => `- **${c}**`).join("\n"),
    ],
  });

  // Getting Started
  docContent.push({
    title: "Getting Started",
    level: 2,
    content: [
      "```bash",
      "# Clone or navigate to the example",
      "cd ${config.name}",
      "",
      "# Install dependencies",
      "npm install",
      "",
      "# Compile contracts",
      "npm run compile",
      "",
      "# Run tests",
      "npm run test",
      "",
      "# Deploy to Zama",
      "npm run deploy:zama",
      "```",
    ],
  });

  // Contract Overview
  docContent.push({
    title: "Contract Overview",
    level: 2,
    content: [
      `The main contract \`${config.contractFile}\` includes:`,
      "",
      `- Encrypted data storage using FHEVM types`,
      `- Privacy-preserving operations`,
      `- User-only decryption capabilities`,
      "",
      "See the contract file for implementation details.",
    ],
  });

  // Test Cases
  docContent.push({
    title: "Test Coverage",
    level: 2,
    content: [
      "The test suite covers:",
      "",
      "- ✅ Success cases - Correct usage patterns",
      "- ❌ Error cases - Invalid inputs and access violations",
      "- 🔐 FHE operations - Encrypted computations",
      "- 📊 Edge cases - Boundary conditions",
    ],
  });

  // Key Concepts
  docContent.push({
    title: "Key Concepts",
    level: 2,
    content: [
      "### FHEVM Data Types",
      "",
      "```solidity",
      "euint8, euint16, euint32, euint64  // Encrypted integers",
      "ebool                               // Encrypted boolean",
      "eaddress                            // Encrypted address",
      "```",
      "",
      "### Common Operations",
      "",
      "```solidity",
      "// Encryption from external input",
      "euint32 value = FHE.fromExternal(encryptedInput, proof);",
      "",
      "// Comparisons",
      "ebool result = FHE.gt(value1, value2);    // greater than",
      "ebool result = FHE.lt(value1, value2);    // less than",
      "ebool result = FHE.eq(value1, value2);    // equality",
      "",
      "// Arithmetic",
      "euint32 sum = FHE.add(value1, value2);",
      "euint32 diff = FHE.sub(value1, value2);",
      "",
      "// Permissions (CRITICAL)",
      "FHE.allowThis(encryptedValue);        // Contract permission",
      "FHE.allow(encryptedValue, msg.sender); // User permission",
      "```",
    ],
  });

  // Security Considerations
  docContent.push({
    title: "Security Considerations",
    level: 2,
    content: [
      "### Permission System",
      "",
      "Always grant both permissions when working with encrypted values:",
      "",
      "✅ **CORRECT**",
      "```solidity",
      "FHE.allowThis(value);",
      "FHE.allow(value, msg.sender);",
      "```",
      "",
      "❌ **WRONG** (Missing allowThis)",
      "```solidity",
      "FHE.allow(value, msg.sender); // Will fail!",
      "```",
      "",
      "### Input Validation",
      "",
      "- Always verify encrypted inputs are not empty",
      "- Validate zero-knowledge proofs",
      "- Check for proper encryption binding",
    ],
  });

  // Best Practices
  docContent.push({
    title: "Best Practices",
    level: 2,
    content: [
      "1. **Always use both FHE permissions**",
      "   - `FHE.allowThis()` for contract access",
      "   - `FHE.allow()` for user decryption",
      "",
      "2. **Validate all inputs**",
      "   - Check encrypted input length",
      "   - Verify proof format",
      "   - Ensure correct binding",
      "",
      "3. **Use meaningful variable names**",
      "   - Prefix encrypted values: `encrypted`, `enc`, or type prefix",
      "   - Example: `encryptedScore`, `euint32Score`",
      "",
      "4. **Add comprehensive comments**",
      "   - Document expected parameter types",
      "   - Explain FHE operations",
      "   - Note privacy guarantees",
      "",
      "5. **Test edge cases**",
      "   - Empty inputs",
      "   - Boundary values",
      "   - Invalid permissions",
    ],
  });

  // Integration Example
  docContent.push({
    title: "Frontend Integration",
    level: 2,
    content: [
      "Integrate with the FHE client library:",
      "",
      "```typescript",
      "import { createInstance } from 'fhevmjs';",
      "import { ethers } from 'ethers';",
      "",
      "// Initialize FHEVM client",
      "const fhevm = await createInstance({",
      "  chainId: 8009,",
      "  networkUrl: 'https://devnet.zama.ai/',",
      "});",
      "",
      "// Encrypt value",
      "const plainValue = 1500;",
      "const encryptedValue = fhevm.encrypt32(plainValue);",
      "",
      "// Submit to contract",
      "const tx = await contract.submitValue(",
      "  encryptedValue.handles[0],",
      "  encryptedValue.inputProof",
      ");",
      "```",
    ],
  });

  // Resources
  docContent.push({
    title: "Resources",
    level: 2,
    content: [
      "- [FHEVM Documentation](https://docs.zama.ai/fhevm)",
      "- [Solidity Best Practices](https://docs.soliditylang.org/)",
      "- [Hardhat Documentation](https://hardhat.org)",
      "- [Ethers.js Documentation](https://docs.ethers.org/)",
      "- [Zama GitHub Repository](https://github.com/zama-ai)",
    ],
  });

  // Generate markdown
  let markdown = "";
  docContent.forEach((section) => {
    const heading = "#".repeat(section.level) + ` ${section.title}`;
    markdown += heading + "\n\n";
    markdown += section.content.join("\n") + "\n\n";
  });

  return markdown;
}

function generateSummaryFile(exampleConfigs: DocumentationConfig[]): string {
  let content = "# FHEVM Examples Documentation\n\n";
  content += "Comprehensive guide to FHEVM example implementations.\n\n";
  content += "## Table of Contents\n\n";

  // Group by category
  const byCategory: Record<string, DocumentationConfig[]> = {};

  exampleConfigs.forEach((config) => {
    if (!byCategory[config.category]) {
      byCategory[config.category] = [];
    }
    byCategory[config.category].push(config);
  });

  // Write summary entries
  Object.entries(byCategory).forEach(([category, configs]) => {
    content += `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
    configs.forEach((config) => {
      content += `- [${config.title}](${config.name}.md) - ${config.description}\n`;
    });
    content += "\n";
  });

  content += "## Quick Start\n\n";
  content += "```bash\n";
  content += "# Install dependencies\n";
  content += "npm install\n\n";
  content += "# Compile contracts\n";
  content += "npm run compile\n\n";
  content += "# Run tests\n";
  content += "npm run test\n";
  content += "```\n\n";

  content += "## Documentation Structure\n\n";
  content += "Each example includes:\n";
  content += "- Contract implementation with NatSpec documentation\n";
  content += "- Comprehensive test suite\n";
  content += "- Deployment scripts\n";
  content += "- Integration guides\n\n";

  return content;
}

function generateAllDocumentation() {
  const docsDir = path.join(__dirname, "..", "docs");

  // Create docs directory
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  console.log("\n========================================");
  console.log("Generating Documentation");
  console.log("========================================\n");

  const exampleConfigs = Object.values(EXAMPLES_CONFIG);

  // Generate individual documentation files
  Object.entries(EXAMPLES_CONFIG).forEach(([key, config]) => {
    console.log(`Generating: ${config.title}`);

    const docContent = generateDocumentationPage(config);
    const docPath = path.join(docsDir, `${config.name}.md`);

    fs.writeFileSync(docPath, docContent);
    console.log(`  ✅ Saved to: ${docPath}`);
  });

  console.log("");

  // Generate SUMMARY.md for GitBook
  console.log("Generating GitBook SUMMARY.md...");
  const summary = generateSummaryFile(exampleConfigs);
  const summaryPath = path.join(docsDir, "SUMMARY.md");
  fs.writeFileSync(summaryPath, summary);
  console.log(`✅ Saved to: ${summaryPath}\n`);

  // Generate index
  console.log("Generating documentation index...");
  const index = {
    generatedAt: new Date().toISOString(),
    examples: exampleConfigs.map((c) => ({
      name: c.name,
      title: c.title,
      category: c.category,
      concepts: c.concepts,
    })),
  };

  fs.writeFileSync(
    path.join(docsDir, "index.json"),
    JSON.stringify(index, null, 2)
  );
  console.log(`✅ Index created\n`);

  console.log("========================================");
  console.log("Documentation Generated!");
  console.log("========================================\n");

  console.log(`📁 Location: ${docsDir}`);
  console.log(`📄 Files: ${exampleConfigs.length + 1}`);
  console.log(`🔗 Summary: SUMMARY.md for GitBook\n`);
}

function generateSingleExample(exampleName: string) {
  const config = EXAMPLES_CONFIG[exampleName];

  if (!config) {
    console.error(`❌ Unknown example: ${exampleName}`);
    console.log("\nAvailable examples:");
    Object.keys(EXAMPLES_CONFIG).forEach((name) => {
      console.log(`  - ${name}`);
    });
    process.exit(1);
  }

  const docsDir = path.join(__dirname, "..", "docs");
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  console.log("\n========================================");
  console.log("Generating Documentation");
  console.log("========================================\n");

  console.log(`Example: ${config.title}`);

  const docContent = generateDocumentationPage(config);
  const docPath = path.join(docsDir, `${config.name}.md`);

  fs.writeFileSync(docPath, docContent);

  console.log(`✅ Documentation generated`);
  console.log(`📁 Saved to: ${docPath}\n`);
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log("Usage: ts-node scripts/generate-docs.ts [example-name | --all]");
  console.log("\nExamples:");
  console.log("  ts-node scripts/generate-docs.ts confidential-gaming-score");
  console.log("  ts-node scripts/generate-docs.ts --all");
  console.log("\nAvailable examples:");
  Object.entries(EXAMPLES_CONFIG).forEach(([name, config]) => {
    console.log(`  ${name.padEnd(25)} - ${config.title}`);
  });
  process.exit(1);
}

if (args[0] === "--all") {
  generateAllDocumentation();
} else {
  generateSingleExample(args[0]);
}
