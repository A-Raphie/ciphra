import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // For local dev: deployer acts as both admin and signer.
  // For Sepolia: override via EXCHANGE_ADMIN / EXCHANGE_SIGNER env vars.
  const exchangeAdmin = process.env.EXCHANGE_ADMIN ?? deployer;
  const exchangeSigner = process.env.EXCHANGE_SIGNER ?? deployer;

  const deployed = await deploy("ProofOfReserves", {
    from: deployer,
    args: [exchangeAdmin, exchangeSigner],
    log: true,
    waitConfirmations: 1,
  });

  console.log(`ProofOfReserves deployed at: ${deployed.address}`);
  console.log(`  exchangeAdmin : ${exchangeAdmin}`);
  console.log(`  exchangeSigner: ${exchangeSigner}`);
};

export default func;
func.id = "deploy_proofOfReserves";
func.tags = ["ProofOfReserves"];
