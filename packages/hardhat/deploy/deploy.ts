import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import * as fs from 'fs';
import * as path from 'path';

async function writeAbiToFrontend(hre: HardhatRuntimeEnvironment, contractName: string, outRelPath: string) {
  const artifact = await hre.artifacts.readArtifact(contractName);
  fs.writeFileSync(outRelPath, JSON.stringify(artifact.abi, null, 2));
}

 const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
   const { deployer } = await hre.getNamedAccounts();
   const { deploy } = hre.deployments;

   console.log('Deploying FHEWordle with the account:', deployer);

   const deployedFHEWordle = await deploy('FHEWordle', {
     from: deployer,
     log: true,
   });

   console.log(`FHEWordle contract deployed to: ${deployedFHEWordle.address}`);
   console.log(`Transaction hash: ${deployedFHEWordle.transactionHash}`);

   // Deploy the DailyPuzzleNFT contract
   const deployedNFT = await deploy('DailyPuzzleNFT', {
     from: deployer,
     args: [deployer],
     log: true,
   });
   console.log(`DailyPuzzleNFT contract deployed to: ${deployedNFT.address}`);

   // Set authorized signer
   const authSignerEnv =
     process.env.AUTH_SIGNER || process.env.SIGNER_ADDRESS || deployer;
   const nft = await hre.ethers.getContractAt(
     'DailyPuzzleNFT',
     deployedNFT.address
   );
   const txSetSigner = await nft
     .connect(await hre.ethers.getSigner(deployer))
     .setAuthSigner(authSignerEnv);
   await txSetSigner.wait();
   console.log(`Auth signer set to: ${authSignerEnv}`);

   // Read current network Chain ID
   const networkInfo = await hre.ethers.provider.getNetwork();
   const currentChainId = Number(
     networkInfo.chainId || hre.network.config.chainId
   );

   // Update hardhat .env with contract addresses and chain ID
   const hardhatEnvPath = path.join(__dirname, '../.env');
   let envContent = fs.readFileSync(hardhatEnvPath, 'utf8');

   // Update or add CONTRACT_ADDRESS
   if (envContent.includes('CONTRACT_ADDRESS=')) {
     envContent = envContent.replace(
       /CONTRACT_ADDRESS=.*/,
       `CONTRACT_ADDRESS=${deployedFHEWordle.address}`
     );
   } else {
     envContent += `\nCONTRACT_ADDRESS=${deployedFHEWordle.address}`;
   }
   // Add or update NFT contract address
   if (envContent.includes('NFT_ADDRESS=')) {
     envContent = envContent.replace(
       /NFT_ADDRESS=.*/,
       `NFT_ADDRESS=${deployedNFT.address}`
     );
   } else {
     envContent += `\nNFT_ADDRESS=${deployedNFT.address}`;
   }
   // Update or add CHAIN_ID
   if (envContent.includes('CHAIN_ID=')) {
     envContent = envContent.replace(
       /CHAIN_ID=.*/,
       `CHAIN_ID=${currentChainId}`
     );
   } else {
     envContent += `\nCHAIN_ID=${currentChainId}`;
   }
   // Update or add AUTH_SIGNER
   if (envContent.includes('AUTH_SIGNER=')) {
     envContent = envContent.replace(
       /AUTH_SIGNER=.*/,
       `AUTH_SIGNER=${authSignerEnv}`
     );
   } else {
     envContent += `\nAUTH_SIGNER=${authSignerEnv}`;
   }

   fs.writeFileSync(hardhatEnvPath, envContent);
   console.log(`Contract address and chain id updated in: ${hardhatEnvPath}`);

   // Update frontend .env.local with addresses
   const frontendEnvPath = path.join(__dirname, '../../nextjs/.env.local');
   const frontendEnvContent = `NEXT_PUBLIC_CONTRACT_ADDRESS=${deployedFHEWordle.address}\nNEXT_PUBLIC_NFT_ADDRESS=${deployedNFT.address}\nNEXT_PUBLIC_CHAIN_ID=${currentChainId}\n`;

   fs.writeFileSync(frontendEnvPath, frontendEnvContent);
   console.log(
     `Contract address and chain id saved to frontend: ${frontendEnvPath}`
   );

   // Sync ABI to frontend
   const nftArtifact = await hre.artifacts.readArtifact('DailyPuzzleNFT');
   const frontendAbiPathNFT = path.join(
     __dirname,
     '../../nextjs/contracts/DailyPuzzleNFT.json'
   );
   fs.writeFileSync(frontendAbiPathNFT, JSON.stringify(nftArtifact.abi, null, 2));
   console.log(`Synced DailyPuzzleNFT ABI to frontend: ${frontendAbiPathNFT}`);

   const frontendAbiPathWordle = path.join(
     __dirname,
     '../../nextjs/contracts/FHEWordle.json'
   );
   await writeAbiToFrontend(hre, 'FHEWordle', frontendAbiPathWordle);
   console.log('Synced FHEWordle ABI to frontend (includes resetGame & GameReset): ' + frontendAbiPathWordle);
 };

 export default func;
 func.id = 'deploy_fheWordle'; // id required to prevent reexecution
 func.tags = ['FHEWordle'];
