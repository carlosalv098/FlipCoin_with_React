import { ethers } from 'ethers';
import FlipCoin from './contracts/FlipCoin.json';

const getBlockchain = () =>
  new Promise((resolve, reject) => {
    window.addEventListener("load", async () => {
      if (window.ethereum) {
        await window.ethereum.enable();
        // conection with the ethereum blockchain
        const provider = new ethers.providers.Web3Provider(window.ethereum);

        const signer = provider.getSigner();
        const signerAddress = await signer.getAddress();
        //const contractAddress = FlipCoin.networks[window.ethereum.networkVersion].address;

        // instantiate an ethers contract object 
        const flipCoin = new ethers.Contract (
          FlipCoin.networks[window.ethereum.networkVersion].address,
          FlipCoin.abi,
          signer
        )

        resolve({ signerAddress, flipCoin, provider, signer })
      }
      resolve({ signerAddress: undefined, flipCoin: undefined, provider: undefined });
    });
  });

export default getBlockchain;