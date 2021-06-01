const { ethers } = require("ethers");

const FlipCoin = artifacts.require("FlipCoin");

module.exports = async function (deployer, _, accounts) {
  const [owner, player1, player2] = accounts;

  await deployer.deploy(FlipCoin);
  const flipcoin = await FlipCoin.deployed();
  await flipcoin.fundContract({from: owner, value: ethers.utils.parseUnits('0.001', 18)})

};