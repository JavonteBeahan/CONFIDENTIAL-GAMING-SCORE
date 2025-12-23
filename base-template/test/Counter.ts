import { expect } from "chai";
import { ethers } from "hardhat";
import { Counter } from "../typechain-types";

describe("Counter", function () {
  let counter: Counter;

  before(async function () {
    const counterFactory = await ethers.getContractFactory("Counter");
    counter = await counterFactory.deploy();
    await counter.waitForDeployment();
  });

  it("Should initialize with value 0", async function () {
    const value = await counter.getValue();
    expect(value).to.exist;
  });
});
