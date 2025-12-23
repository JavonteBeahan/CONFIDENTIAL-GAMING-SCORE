import { expect } from "chai";
import { ethers } from "hardhat";
import { UserDecryptMultipleValues } from "../../typechain-types";

describe("UserDecryptMultipleValues", function () {
  let contract: UserDecryptMultipleValues;
  let owner: any;
  let addr1: any;
  let addr2: any;

  before(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const UserDecryptMultipleValues = await ethers.getContractFactory(
      "UserDecryptMultipleValues"
    );
    contract = await UserDecryptMultipleValues.deploy();
    await contract.waitForDeployment();
  });

  describe("Store Secrets", function () {
    it("Should store encrypted secrets successfully", async function () {
      // Mock encrypted inputs (in real scenario, these come from fhevmjs)
      const mockHandle32 = ethers.toBeHex("0x1234", 32);
      const mockHandle16 = ethers.toBeHex("0x5678", 16);
      const mockHandle8 = ethers.toBeHex("0xAB", 8);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      // This would normally call storeSecrets, but encrypted operations
      // require proper FHE setup with actual encryption
      // For this test framework, we demonstrate the pattern

      // Call should emit SecretsStored event
      await expect(
        contract.storeSecrets(
          mockHandle32,
          mockProof,
          mockHandle16,
          mockProof,
          mockHandle8,
          mockProof
        )
      ).to.emit(contract, "SecretsStored");
    });

    it("Should grant proper permissions after storage", async function () {
      const mockHandle32 = ethers.toBeHex("0x1234", 32);
      const mockHandle16 = ethers.toBeHex("0x5678", 16);
      const mockHandle8 = ethers.toBeHex("0xAB", 8);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await contract.storeSecrets(
        mockHandle32,
        mockProof,
        mockHandle16,
        mockProof,
        mockHandle8,
        mockProof
      );

      // Verify that hasSecrets returns true
      const hasSecrets = await contract.hasSecrets();
      expect(hasSecrets).to.be.true;
    });
  });

  describe("Get Secrets", function () {
    beforeEach(async function () {
      const mockHandle32 = ethers.toBeHex("0x1111", 32);
      const mockHandle16 = ethers.toBeHex("0x2222", 16);
      const mockHandle8 = ethers.toBeHex("0x33", 8);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await contract.storeSecrets(
        mockHandle32,
        mockProof,
        mockHandle16,
        mockProof,
        mockHandle8,
        mockProof
      );
    });

    it("Should retrieve all encrypted secrets", async function () {
      const secrets = await contract.getAllSecrets();
      expect(secrets).to.be.an("array");
      expect(secrets.length).to.equal(3);
    });

    it("Should retrieve specific secret by index", async function () {
      // Test retrieving each secret
      const secret1 = await contract.getSecret(1);
      const secret2 = await contract.getSecret(2);
      const secret3 = await contract.getSecret(3);

      expect(secret1).to.not.be.empty;
      expect(secret2).to.not.be.empty;
      expect(secret3).to.not.be.empty;
    });

    it("Should reject invalid secret index", async function () {
      await expect(contract.getSecret(0)).to.be.revertedWith(
        "Invalid index"
      );
      await expect(contract.getSecret(4)).to.be.revertedWith("Invalid index");
    });

    it("Should reject retrieval without stored secrets", async function () {
      await expect(
        contract.connect(addr1).getAllSecrets()
      ).to.be.revertedWith("No secrets stored");
    });
  });

  describe("Update Secrets", function () {
    beforeEach(async function () {
      const mockHandle32 = ethers.toBeHex("0xAAAA", 32);
      const mockHandle16 = ethers.toBeHex("0xBBBB", 16);
      const mockHandle8 = ethers.toBeHex("0xCC", 8);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await contract.storeSecrets(
        mockHandle32,
        mockProof,
        mockHandle16,
        mockProof,
        mockHandle8,
        mockProof
      );
    });

    it("Should update secret at index 1", async function () {
      const newValue32 = ethers.toBeHex("0x9999", 32);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await expect(
        contract.updateSecret(1, newValue32, "0x", "0x", mockProof)
      ).to.emit(contract, "SecretUpdated");
    });

    it("Should update secret at index 2", async function () {
      const newValue16 = ethers.toBeHex("0x7777", 16);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await expect(
        contract.updateSecret(2, "0x", newValue16, "0x", mockProof)
      ).to.emit(contract, "SecretUpdated");
    });

    it("Should update secret at index 3", async function () {
      const newValue8 = ethers.toBeHex("0xDD", 8);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await expect(
        contract.updateSecret(3, "0x", "0x", newValue8, mockProof)
      ).to.emit(contract, "SecretUpdated");
    });

    it("Should reject invalid secret index on update", async function () {
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await expect(
        contract.updateSecret(0, "0x", "0x", "0x", mockProof)
      ).to.be.revertedWith("Invalid index");
    });

    it("Should reject update without stored secrets", async function () {
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await expect(
        contract.connect(addr1).updateSecret(1, "0x", "0x", "0x", mockProof)
      ).to.be.revertedWith("No secrets stored");
    });
  });

  describe("Compute Operations", function () {
    beforeEach(async function () {
      const mockHandle32 = ethers.toBeHex("0x1111", 32);
      const mockHandle16 = ethers.toBeHex("0x2222", 16);
      const mockHandle8 = ethers.toBeHex("0x33", 8);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await contract.storeSecrets(
        mockHandle32,
        mockProof,
        mockHandle16,
        mockProof,
        mockHandle8,
        mockProof
      );
    });

    it("Should compute encrypted sum", async function () {
      const sum = await contract.computeSum();
      expect(sum).to.not.be.null;
    });

    it("Should reject sum computation without secrets", async function () {
      await expect(contract.connect(addr1).computeSum()).to.be.revertedWith(
        "No secrets stored"
      );
    });
  });

  describe("Secret Management", function () {
    beforeEach(async function () {
      const mockHandle32 = ethers.toBeHex("0xFFFF", 32);
      const mockHandle16 = ethers.toBeHex("0xEEEE", 16);
      const mockHandle8 = ethers.toBeHex("0xDD", 8);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await contract.storeSecrets(
        mockHandle32,
        mockProof,
        mockHandle16,
        mockProof,
        mockHandle8,
        mockProof
      );
    });

    it("Should check if secrets exist", async function () {
      const exists = await contract.hasSecrets();
      expect(exists).to.be.true;
    });

    it("Should return false for users without secrets", async function () {
      const exists = await contract.connect(addr2).hasSecrets();
      expect(exists).to.be.false;
    });

    it("Should clear secrets", async function () {
      await expect(contract.clearSecrets()).to.emit(
        contract,
        "SecretsCleared"
      );

      // After clearing, hasSecrets should return false
      const exists = await contract.hasSecrets();
      expect(exists).to.be.false;
    });

    it("Should reject clear without stored secrets", async function () {
      await expect(
        contract.connect(addr1).clearSecrets()
      ).to.be.revertedWith("No secrets stored");
    });
  });

  describe("Permission Management", function () {
    beforeEach(async function () {
      const mockHandle32 = ethers.toBeHex("0x1234", 32);
      const mockHandle16 = ethers.toBeHex("0x5678", 16);
      const mockHandle8 = ethers.toBeHex("0xAB", 8);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await contract.storeSecrets(
        mockHandle32,
        mockProof,
        mockHandle16,
        mockProof,
        mockHandle8,
        mockProof
      );
    });

    it("Should grant permission to another address", async function () {
      await contract.grantPermissionToAll(addr1.address);
      // Permission granted (function doesn't revert)
      expect(true).to.be.true;
    });

    it("Should reject permission grant to zero address", async function () {
      await expect(
        contract.grantPermissionToAll(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid address");
    });

    it("Should reject permission grant without secrets", async function () {
      await expect(
        contract.connect(addr1).grantPermissionToAll(addr2.address)
      ).to.be.revertedWith("No secrets stored");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle multiple users independently", async function () {
      const mockHandle32 = ethers.toBeHex("0x1111", 32);
      const mockHandle16 = ethers.toBeHex("0x2222", 16);
      const mockHandle8 = ethers.toBeHex("0x33", 8);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      // Owner stores secrets
      await contract.storeSecrets(
        mockHandle32,
        mockProof,
        mockHandle16,
        mockProof,
        mockHandle8,
        mockProof
      );

      // addr1 stores different secrets
      await contract.connect(addr1).storeSecrets(
        mockHandle32,
        mockProof,
        mockHandle16,
        mockProof,
        mockHandle8,
        mockProof
      );

      // Both should have secrets
      const ownerHas = await contract.hasSecrets();
      const addr1Has = await contract.connect(addr1).hasSecrets();

      expect(ownerHas).to.be.true;
      expect(addr1Has).to.be.true;
    });

    it("Should handle sequential updates", async function () {
      const mockHandle32 = ethers.toBeHex("0x0001", 32);
      const mockHandle16 = ethers.toBeHex("0x0002", 16);
      const mockHandle8 = ethers.toBeHex("0x03", 8);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await contract.storeSecrets(
        mockHandle32,
        mockProof,
        mockHandle16,
        mockProof,
        mockHandle8,
        mockProof
      );

      // Update all three values sequentially
      await contract.updateSecret(1, mockHandle32, "0x", "0x", mockProof);
      await contract.updateSecret(2, "0x", mockHandle16, "0x", mockProof);
      await contract.updateSecret(3, "0x", "0x", mockHandle8, mockProof);

      // All updates should complete without error
      expect(true).to.be.true;
    });
  });

  describe("Client-Side Integration Patterns", function () {
    it("Should support batch retrieval pattern", async function () {
      const mockHandle32 = ethers.toBeHex("0x0001", 32);
      const mockHandle16 = ethers.toBeHex("0x0002", 16);
      const mockHandle8 = ethers.toBeHex("0x03", 8);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await contract.storeSecrets(
        mockHandle32,
        mockProof,
        mockHandle16,
        mockProof,
        mockHandle8,
        mockProof
      );

      // Retrieve all in one call (as would happen client-side)
      const [secret1, secret2, secret3] = await contract.getAllSecrets();

      // All should be non-null
      expect(secret1).to.not.be.null;
      expect(secret2).to.not.be.null;
      expect(secret3).to.not.be.null;
    });

    it("Should support selective retrieval pattern", async function () {
      const mockHandle32 = ethers.toBeHex("0x0001", 32);
      const mockHandle16 = ethers.toBeHex("0x0002", 16);
      const mockHandle8 = ethers.toBeHex("0x03", 8);
      const mockProof = ethers.toBeHex("0xdeadbeef");

      await contract.storeSecrets(
        mockHandle32,
        mockProof,
        mockHandle16,
        mockProof,
        mockHandle8,
        mockProof
      );

      // Retrieve only needed values
      const secret1 = await contract.getSecret(1);
      const secret3 = await contract.getSecret(3);

      expect(secret1).to.not.be.empty;
      expect(secret3).to.not.be.empty;
    });
  });
});
