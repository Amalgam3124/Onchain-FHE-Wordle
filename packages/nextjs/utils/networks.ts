// Define Sepolia network configuration
export const sepoliaNetwork = {
  id: 11155111,
  name: 'Sepolia',
  network: 'sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Sepolia Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://sepolia.infura.io/v3/'],
    },
    public: {
      http: ['https://sepolia.infura.io/v3/'],
    },
  },
  blockExplorers: {
    default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
  },
  testnet: true,
};

// Define supported networks
export const supportedNetworks = [sepoliaNetwork];

// Check if current network is supported
export const isSupportedNetwork = (chainId: number): boolean => {
  return supportedNetworks.some((network) => network.id === chainId);
};

// Get network switch params
export const getNetworkSwitchParams = (network: typeof sepoliaNetwork) => {
  return {
    chainId: `0x${network.id.toString(16)}`,
    chainName: network.name,
    nativeCurrency: network.nativeCurrency,
    rpcUrls: network.rpcUrls.default.http,
    blockExplorerUrls: [network.blockExplorers.default.url],
  };
};
