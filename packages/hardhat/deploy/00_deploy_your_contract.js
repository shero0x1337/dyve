// deploy/00_deploy_your_contract.js

const { ethers } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();

  await deploy("YourCollectible", {
    // Learn more about args here: https://www.npmjs.com/package/hardhat-deploy#deploymentsdeploy
    from: deployer,
    // args: [ "Hello", ethers.utils.parseEther("1.5") ],
    log: true,
  });

  await deploy("TestToken", {
    from: deployer,
    log: true,
  });
  const TestToken = await ethers.getContract("TestToken", deployer);

  await deploy("Marketplace", {
    from: deployer,
    log: true,
  });
  const Marketplace = await ethers.getContract("Marketplace", deployer);

  await deploy("Dyve", {
    from: deployer,
    args:[TestToken.address, Marketplace.address],
    log: true,
  });
  const Dyve = await ethers.getContract("Dyve", deployer);

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
