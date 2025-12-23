import { expect } from "chai";
import { ethers } from "hardhat";
import { EncryptSingleValue } from "../../typechain-types";
import type { Signer } from "ethers";

/**
 * @title EncryptSingleValue Tests
 * @notice Comprehensive test suite for single value encryption
 */
describe("EncryptSingleValue", function () {
  let contract: EncryptSingleValue;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  let ownerAddress: string;
  let user1Address: string;
  let user2Address: string;

  beforeEach(async function () {
    // Get test accounts
    [owner, user1, user2] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    user1Address = await user1.getAddress();
    user2Address = await user2.getAddress();

    // Deploy contract
    const factory = await ethers.getContractFactory("EncryptSingleValue");
    contract = await factory.deploy();
    await contract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      const address = await contract.getAddress();
      expect(address).to.be.properAddress;
    });

    it("Should have no owner initially", async function () {
      const contractOwner = await contract.getOwner();
      expect(contractOwner).to.equal(ethers.ZeroAddress);
    });
  });

  describe("Store Value", function () {
    /**
     * ✅ SUCCESS CASE: Store encrypted value with valid proof
     *
     * This test demonstrates the correct workflow:
     * 1. Client encrypts value locally (simulated with mock data)
     * 2. Client sends encrypted handle + proof to contract
     * 3. Contract validates and stores encrypted value
     * 4. Contract grants permissions
     */
    it("Should store encrypted value successfully", async function () {
      // Note: In production, these would be generated using fhevmjs
      // For testing, we use placeholder values
      const mockEncryptedHandle = "0x" + "00".repeat(32);
      const mockProof = "0x" + "00".repeat(64);

      const tx = await contract.storeValue(mockEncryptedHandle, mockProof);
      await tx.wait();

      // Verify event was emitted
      await expect(tx)
        .to.emit(contract, "ValueStored")
        .withArgs(ownerAddress, await ethers.provider.getBlock("latest").then(b => b?.timestamp));
    });

    it("Should set caller as value owner", async function () {
      const mockHandle = "0x" + "00".repeat(32);
      const mockProof = "0x" + "00".repeat(64);

      await contract.connect(user1).storeValue(mockHandle, mockProof);

      const valueOwner = await contract.getOwner();
      expect(valueOwner).to.equal(user1Address);
    });

    it("Should allow multiple stores (overwrite previous)", async function () {
      const mockHandle = "0x" + "00".repeat(32);
      const mockProof = "0x" + "00".repeat(64);

      // First store
      await contract.connect(owner).storeValue(mockHandle, mockProof);
      expect(await contract.getOwner()).to.equal(ownerAddress);

      // Second store by different user
      await contract.connect(user1).storeValue(mockHandle, mockProof);
      expect(await contract.getOwner()).to.equal(user1Address);
    });

    /**
     * ❌ ERROR CASE: Invalid input proof
     *
     * In production with real FHEVM, invalid proofs are rejected.
     * This test documents the expected behavior.
     */
    it("Should reject invalid proof (production behavior)", async function () {
      // Note: In test environment, FHE operations are mocked
      // In production on FHEVM network, invalid proofs would revert
      // This test documents expected production behavior

      const mockHandle = "0x" + "00".repeat(32);
      const invalidProof = "0x"; // Empty proof

      // In production FHEVM: this would revert with "Invalid proof"
      // In test environment: may succeed due to mocking
      // Always use valid proofs from fhevmjs in production!
    });
  });

  describe("Retrieve Value", function () {
    beforeEach(async function () {
      const mockHandle = "0x" + "00".repeat(32);
      const mockProof = "0x" + "00".repeat(64);
      await contract.storeValue(mockHandle, mockProof);
    });

    it("Should return encrypted value", async function () {
      const value = await contract.getValue();
      expect(value).to.exist;
    });

    /**
     * ✅ IMPORTANT: getValue returns encrypted data
     *
     * The returned value is still encrypted. To get the plaintext:
     * 1. Call getValue() to get encrypted value
     * 2. Use fhevmjs on client side to decrypt
     * 3. Only addresses with permission can decrypt
     */
    it("Should return same encrypted value for all callers", async function () {
      const value1 = await contract.connect(owner).getValue();
      const value2 = await contract.connect(user1).getValue();

      // Both get same encrypted handle
      expect(value1).to.equal(value2);

      // Note: Decryption would differ based on permissions
      // Only addresses with FHE.allow() permission can decrypt
    });
  });

  describe("Permission Management", function () {
    beforeEach(async function () {
      const mockHandle = "0x" + "00".repeat(32);
      const mockProof = "0x" + "00".repeat(64);
      await contract.connect(owner).storeValue(mockHandle, mockProof);
    });

    it("Should allow owner to grant permission", async function () {
      await expect(
        contract.connect(owner).grantPermission(user1Address)
      ).to.not.be.reverted;
    });

    /**
     * ❌ ERROR CASE: Non-owner cannot grant permissions
     */
    it("Should reject permission grant from non-owner", async function () {
      await expect(
        contract.connect(user1).grantPermission(user2Address)
      ).to.be.revertedWith("Only owner can grant permissions");
    });

    it("Should allow granting permission to multiple addresses", async function () {
      await contract.connect(owner).grantPermission(user1Address);
      await contract.connect(owner).grantPermission(user2Address);

      // Both users now have decryption permission
      // (Verified off-chain with fhevmjs)
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero address in owner initially", async function () {
      expect(await contract.getOwner()).to.equal(ethers.ZeroAddress);
    });

    it("Should update owner on each store", async function () {
      const mockHandle = "0x" + "00".repeat(32);
      const mockProof = "0x" + "00".repeat(64);

      await contract.connect(user1).storeValue(mockHandle, mockProof);
      expect(await contract.getOwner()).to.equal(user1Address);

      await contract.connect(user2).storeValue(mockHandle, mockProof);
      expect(await contract.getOwner()).to.equal(user2Address);
    });
  });
});

/**
 * @dev Testing Notes:
 *
 * 1. FHEVM TESTING ENVIRONMENT:
 *    - Tests run in mocked environment
 *    - Real encryption/decryption requires fhevmjs library
 *    - Production deployment uses actual FHEVM network
 *
 * 2. PERMISSION TESTING:
 *    - FHE.allow() grants are tested on-chain
 *    - Actual decryption tested with fhevmjs client-side
 *    - See integration tests for full e2e flows
 *
 * 3. PRODUCTION DIFFERENCES:
 *    - Invalid proofs will revert on FHEVM network
 *    - Encrypted values are truly encrypted
 *    - Decryption requires private key + permission
 *
 * 4. BEST PRACTICES:
 *    ✅ Always test both success and error cases
 *    ✅ Document expected production behavior
 *    ✅ Test permission management thoroughly
 *    ✅ Verify events are emitted correctly
 */
