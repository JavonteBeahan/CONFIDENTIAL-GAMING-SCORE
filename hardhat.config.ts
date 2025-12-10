import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "hardhat-deploy";
import "solidity-coverage";
import { config as dotenvConfig } from "dotenv";

dotenvConfig();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },

    // Zama FHEVM Devnet Configuration
    zama: {
      url: "https://devnet.zama.ai/",
      chainId: 8009,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },

    // Zama FHEVM Sepolia Testnet Configuration
    zamaTestnet: {
      url: "https://testnet.zama.ai/",
      chainId: 8008,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },

    // Zama FHEVM Mainnet Configuration (when available)
    zamaMainnet: {
      url: "https://mainnet.zama.ai/",
      chainId: 8007,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },

    // Local Development Network
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
    deploy: "./deploy",
    deployments: "./deployments",
  },

  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "unknown",
  },

  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY || "unknown",
  },

  mocha: {
    timeout: 120000,
  },

  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};

export default config;
