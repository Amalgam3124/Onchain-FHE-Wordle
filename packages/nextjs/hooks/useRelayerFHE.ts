import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useRelayerFHE
 * Lightweight wrapper around Zama Relayer SDK for:
 * - Creating an SDK instance
 * - Encrypting 5-letter guesses (euint8), returning encryptedGuess and proofs
 * - Decrypting on-chain euint8[] and ebool results
 */
export type EncryptGuessResult = { encryptedGuess: string[]; proofs: string[] } | null;

export const useRelayerFHE = (networkProvider?: any) => {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sdkRef = useRef<any>(null);
  const lastProviderRef = useRef<any>(null);
  const lastChainIdRef = useRef<number | undefined>(undefined);
  const isEip1193 = (p: any) => !!p && typeof p.request === 'function';


  const initSdk = useCallback(async () => {
    try {

      const provider = isEip1193(networkProvider)
        ? networkProvider
        : typeof window !== 'undefined'
        ? (window as any).ethereum
        : null;


      if (sdkRef.current && lastProviderRef.current === provider) {

        let existingChainId = lastChainIdRef.current;
        try {
          const result = await provider?.request?.({ method: 'eth_chainId' });
          const hex = typeof result === 'string' ? result : undefined;
          if (hex) existingChainId = parseInt(hex, 16);
        } catch {
          // ignore
        }
        if (existingChainId && existingChainId === lastChainIdRef.current) {
          return true;
        }

        sdkRef.current = null;
        setReady(false);
      }

      if (typeof globalThis !== 'undefined') {
        const g: any = globalThis as any;
        if (typeof g.global === 'undefined') {
          g.global = g;
        }
      }

      const relayerMod: any = await import('@zama-fhe/relayer-sdk/web');
      const relayer = relayerMod?.default ?? relayerMod ?? {};
      const createInstance = relayer?.createInstance ?? relayerMod?.createInstance;
      const initSDK =
        typeof relayer?.initSDK === 'function'
          ? relayer.initSDK
          : typeof relayerMod?.initSDK === 'function'
          ? relayerMod.initSDK
          : undefined;
      const SepoliaConfig = relayer?.SepoliaConfig ?? relayerMod?.SepoliaConfig;
      if (!createInstance) throw new Error('Relayer SDK createInstance is not available');

      if (typeof initSDK === 'function') {
        try {
          await initSDK();
        } catch (e) {
          console.warn('Relayer SDK initSDK error:', e);
        }
      }


      let chainIdHex: string | undefined;
      try {
        const result = await provider?.request?.({ method: 'eth_chainId' });
        chainIdHex = typeof result === 'string' ? result : undefined;
      } catch {
        chainIdHex = undefined;
      }
      const chainIdFromWallet = chainIdHex ? parseInt(chainIdHex, 16) : undefined;
      const chainIdFromEnv =
        typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_CHAIN_ID
          ? Number(process.env.NEXT_PUBLIC_CHAIN_ID)
          : undefined;
      const finalChainId = chainIdFromEnv || chainIdFromWallet || 11155111;

      const relayerRpcUrlEnv = typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_RELAYER_RPC_URL : undefined;
      const genericRpcUrlEnv = typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_RPC_URL : undefined;
      const relayerUrl = typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_RELAYER_URL : undefined;
      const rpcUrl = relayerRpcUrlEnv || genericRpcUrlEnv || 'https://rpc.sepolia.org';

      const config: any = {
        ...(SepoliaConfig || {}),
        chainId: finalChainId,
      };

      if (provider) config.network = provider;
      else if (rpcUrl) config.rpcUrl = rpcUrl;
      if (relayerUrl) config.relayerUrl = relayerUrl;


      if (!config.network && !config.rpcUrl) {
        setReady(false);
        setError('Missing provider/rpcUrl, waiting for wallet or env setup');
        return false;
      }

      const instance = await createInstance(config);
      sdkRef.current = instance;
      lastProviderRef.current = provider;
      lastChainIdRef.current = finalChainId;
      setReady(true);
      setError(null);
      return true;
    } catch (e: any) {
      console.warn('Failed to initialize Relayer SDK, will fall back:', e);
      setError(e?.message || String(e));
      setReady(false);
      return false;
    }
  }, [networkProvider]);

  useEffect(() => {
  
    initSdk();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initSdk]);

  useEffect(() => {
    const provider = isEip1193(networkProvider)
      ? networkProvider
      : typeof window !== 'undefined'
      ? (window as any).ethereum
      : null;
    if (!provider || typeof provider.on !== 'function') return;

    const onChainChanged = (hex: string) => {
      try {
        lastChainIdRef.current = parseInt(hex, 16);
      } catch {
        // ignore
      }
      sdkRef.current = null;
      setReady(false);
      setError(null);
      initSdk();
    };
    const onAccountsChanged = (_accounts: string[]) => {
      sdkRef.current = null;
      setReady(false);
      setError(null);
      initSdk();
    };

    provider.on('chainChanged', onChainChanged);
    provider.on('accountsChanged', onAccountsChanged);
    return () => {
      provider.removeListener?.('chainChanged', onChainChanged);
      provider.removeListener?.('accountsChanged', onAccountsChanged);
    };
  }, [networkProvider, initSdk]);

  // Encrypt 5-letter guess into euint8[5]
  const encryptGuess = useCallback(
    async (
      guess: string,
      contractAddress: string,
      userAddress: string,
    ): Promise<EncryptGuessResult> => {
      try {

        const ok = await initSdk();
        if (!ok || !sdkRef.current) return null;
        const sdk = sdkRef.current;

        const letters = guess.toUpperCase().split('');
        if (letters.length !== 5) throw new Error('Guess must be 5 letters');


        const { hexlify, getAddress } = await import('ethers');
        const toHex = (u: ArrayLike<number>) => {
          return hexlify(u as any);
        };

        const toHex32 = (handle: any): string => {
          let hex: string;
          if (handle && typeof handle.length === 'number') {
            hex = toHex(handle as any);
          } else if (typeof handle === 'string') {
            hex = handle;
          } else {
            throw new Error('Unknown handle type');
          }
          if (!hex || !hex.startsWith('0x')) throw new Error('Handle must be 0x hex');
          const byteLen = (hex.length - 2) / 2;
          if (byteLen !== 32) throw new Error(`Invalid handle byte length: ${byteLen}, expected 32`);
          return hex;
        };


        const dappAddr = getAddress(String(contractAddress).trim());
        const userAddr = getAddress(String(userAddress).trim());


        const builder = sdk.createEncryptedInput?.(dappAddr, userAddr);
        if (!builder) throw new Error('Relayer SDK does not support createEncryptedInput');

        for (let i = 0; i < 5; i++) {
          const ascii = letters[i].charCodeAt(0);

          if (typeof builder.add8 === 'function') {
            builder.add8(BigInt(ascii));
          } else if (typeof builder.add === 'function') {
            builder.add('externalEuint8', BigInt(ascii));
          } else {
            throw new Error('Relayer SDK does not support add8/add encryption methods');
          }
        }

        const enc = await builder.encrypt();
        const handles: ArrayLike<number>[] = enc?.handles;
        const inputProof: ArrayLike<number> = enc?.inputProof;
        if (!handles || handles.length !== 5 || !inputProof)
          throw new Error('encrypt() returned incomplete data');

        const encryptedGuess: string[] = handles.map((h) => toHex32(h));
        const proofHex = toHex(inputProof);
        const proofs: string[] = Array.from({ length: 5 }, () => proofHex);

        return { encryptedGuess, proofs };
      } catch (e) {
        console.warn('encryptGuess failed, falling back:', e);
        return null;
      }
    },
    [initSdk],
  );

  // Decrypt euint8 array results (each position 0/1/2)
  const userDecryptEuint8Array = useCallback(
    async (
      handles: Array<any>,
      contractAddress?: string,
      userAddress?: string,
    ): Promise<number[] | null> => {
      try {
        const ok = await initSdk();
        if (!ok || !sdkRef.current) return null;
        const sdk = sdkRef.current;

        if (!networkProvider) throw new Error('Missing wallet provider for user decryption');


        const { BrowserProvider, getAddress } = await import('ethers');
        const dappAddrRaw = (contractAddress ||
          (typeof process !== 'undefined'
            ? process.env?.NEXT_PUBLIC_CONTRACT_ADDRESS
            : undefined)) as string | undefined;
        if (!dappAddrRaw) throw new Error('Missing contract address for user decryption');
        const dappAddr = getAddress(String(dappAddrRaw).trim());

        const provider = new BrowserProvider(networkProvider);
        const signer = await provider.getSigner();
        const userAddrRaw = userAddress || (await signer.getAddress());
        const userAddr = getAddress(String(userAddrRaw).trim());


        const { publicKey, privateKey } = sdk.generateKeypair();
        const startTimestamp = Math.floor(Date.now() / 1000) - 60; // Shift back 60s to avoid "future time" validation
        const durationDays = 1; // Authorization valid for 1 day
        const eip712 = sdk.createEIP712(publicKey, [dappAddr], startTimestamp, durationDays);


        const domainForSign: any = { ...eip712.domain };
        if (typeof domainForSign.chainId === 'string')
          domainForSign.chainId = Number(domainForSign.chainId);
        const cleanedTypes: any = {
          UserDecryptRequestVerification: eip712.types?.UserDecryptRequestVerification,
        };
        const signature = await signer.signTypedData(domainForSign, cleanedTypes, eip712.message);


        const pairs = handles.map((h) => ({ handle: h, contractAddress: dappAddr }));


        const resultsMap = await sdk.userDecrypt(
          pairs,
          privateKey,
          publicKey,
          signature,
          [dappAddr],
          userAddr,
          startTimestamp,
          durationDays,
        );


        const out: number[] = [];
        for (const h of handles) {
          const key = typeof h === 'string' ? h : undefined;
          const v = key ? (resultsMap as any)[key] : undefined;
          const num = Number(v);
          if (!Number.isFinite(num)) return null;
          out.push(num);
        }
        return out;
      } catch (e) {
        console.warn('userDecryptEuint8Array failed:', e);
        return null;
      }
    },
    [initSdk, networkProvider],
  );


  const userDecryptBool = useCallback(
    async (handle: any): Promise<boolean | null> => {
      try {
        const ok = await initSdk();
        if (!ok || !sdkRef.current) return null;
        const sdk = sdkRef.current;
        let value: any;
        if (typeof sdk.userDecrypt === 'function') {
          value = await sdk.userDecrypt(handle);
        } else if (typeof sdk.decrypt === 'function') {
          value = await sdk.decrypt(handle);
        } else {
          throw new Error('Relayer SDK does not provide a decryption method');
        }
        return Boolean(value);
      } catch (e) {
        console.warn('userDecryptBool failed:', e);
        return null;
      }
    },
    [initSdk],
  );

  return {
    relayerReady: ready,
    relayerError: error,
    encryptGuess,
    userDecryptEuint8Array,
    userDecryptBool,
  };
};
