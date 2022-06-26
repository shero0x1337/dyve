// deploy/00_deploy_your_contract.js

const START_NFT_PRICE = 10;

const { ethers } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();

  await deploy("TestToken", {
    from: deployer,
    log: true,
  });
  const TestToken = await ethers.getContract("TestToken", deployer);

  await deploy("TestNFT", {
    from: deployer,
    log: true,
  });
  const TestNFT = await ethers.getContract("TestNFT", deployer);

  await deploy("Marketplace", {
    from: deployer,
    log: true,
  });
  const Marketplace = await ethers.getContract("Marketplace", deployer);
  await Marketplace.changePrice(TestNFT.address, START_NFT_PRICE);
  console.log((await TestToken.totalSupply()).toString());

  await TestToken.mintMe();
  await TestToken.transfer(Marketplace.address, ethers.utils.parseEther('100'));

  console.log((await TestToken.balanceOf(Marketplace.address)).toString());
  await deploy("Dyve", {
    from: deployer,
    args:[TestToken.address, Marketplace.address],
    log: true,
  });
  const Dyve = await ethers.getContract("Dyve", deployer);

  await Dyve.testSetup();
  // Getting a previously deployed contract
  // const yourCollectible = await ethers.getContract("YourCollectible", deployer);

  // ToDo: Verify your contract with Etherscan for public chains
  // if (chainId !== "31337") {
  //   try {
  //     console.log(" 🎫 Verifing Contract on Etherscan... ");
  //     await sleep(3000); // wait 3 seconds for deployment to propagate bytecode
  //     await run("verify:verify", {
  //       address: yourCollectible.address,
  //       contract: "contracts/YourCollectible.sol:YourCollectible",
  //       // contractArguments: [yourToken.address],
  //     });
  //   } catch (e) {
  //     console.log(" ⚠️ Failed to verify contract on Etherscan ");
  //   }
  // }
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports.tags = ["Dyve"];
