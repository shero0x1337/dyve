import Portis from "@portis/web3";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { Alert, Button, LinkButton, Card, Col, Input, List, Menu, Row } from "antd";
import "antd/dist/antd.css";
import Authereum from "authereum";
import {
  useBalance,
  useContractLoader,
  useContractReader,
  useGasPrice,
  useOnBlock,
  useUserProviderAndSigner,
} from "eth-hooks";
import { useExchangeEthPrice } from "eth-hooks/dapps/dex";
import { useEventListener } from "eth-hooks/events/useEventListener";
import Fortmatic from "fortmatic";
// https://www.npmjs.com/package/ipfs-http-client
// import { create } from "ipfs-http-client";
import React, { useCallback, useEffect, useState } from "react";
import ReactJson from "react-json-view";
import { BrowserRouter, Link, Route, Switch } from "react-router-dom";
//import Torus from "@toruslabs/torus-embed"
import WalletLink from "walletlink";
import Web3Modal from "web3modal";
import "./App.css";
import { Account, Address, AddressInput, Contract, Faucet, GasGauge, Header, Ramp, ThemeSwitch } from "./components";
import { INFURA_ID, NETWORK, NETWORKS } from "./constants";
import { Transactor } from "./helpers";
import { useContractConfig } from "./hooks";
// import Hints from "./Hints";

const { BufferList } = require("bl");
const ipfsAPI = require("ipfs-http-client");
const ipfs = ipfsAPI({ host: "ipfs.infura.io", port: "5001", protocol: "https" });

const { ethers } = require("ethers");

/*
    Welcome to 🏗 scaffold-eth !

    Code:
    https://github.com/scaffold-eth/scaffold-eth

    Support:
    https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA
    or DM @austingriffith on twitter or telegram

    You should get your own Infura.io ID and put it in `constants.js`
    (this is your connection to the main Ethereum network for ENS etc.)


    🌏 EXTERNAL CONTRACTS:
    You can also bring in contract artifacts in `constants.js`
    (and then use the `useExternalContractLoader()` hook!)
*/

/// 📡 What chain are your contracts deployed to?
const targetNetwork = NETWORKS.localhost; // <------- select your target frontend network (localhost, rinkeby, xdai, mainnet)

// 😬 Sorry for all the console logging
const DEBUG = true;
const NETWORKCHECK = true;

// EXAMPLE STARTING JSON:
const STARTING_JSON = {
  description: "It's actually a bison?",
  external_url: "https://austingriffith.com/portfolio/paintings/", // <-- this can link to a page for the specific file too
  image: "https://austingriffith.com/images/paintings/buffalo.jpg",
  name: "BAYC",
  attributes: [
    {
      trait_type: "BackgroundColor",
      value: "green",
    },
    {
      trait_type: "Eyes",
      value: "googly",
    },
  ],
};

// helper function to "Get" from IPFS
// you usually go content.toString() after this...
const getFromIPFS = async hashToGet => {
  for await (const file of ipfs.get(hashToGet)) {
    console.log(file.path);
    if (!file.content) continue;
    const content = new BufferList();
    for await (const chunk of file.content) {
      content.append(chunk);
    }
    console.log(content);
    return content;
  }
};

// 🛰 providers
if (DEBUG) console.log("📡 Connecting to Mainnet Ethereum");
// const mainnetProvider = getDefaultProvider("mainnet", { infura: INFURA_ID, etherscan: ETHERSCAN_KEY, quorum: 1 });
// const mainnetProvider = new InfuraProvider("mainnet",INFURA_ID);
//
// attempt to connect to our own scaffold eth rpc and if that fails fall back to infura...
// Using StaticJsonRpcProvider as the chainId won't change see https://github.com/ethers-io/ethers.js/issues/901
const scaffoldEthProvider = navigator.onLine
  ? new ethers.providers.StaticJsonRpcProvider("https://rpc.scaffoldeth.io:48544")
  : null;
const poktMainnetProvider = navigator.onLine
  ? new ethers.providers.StaticJsonRpcProvider(
      "https://eth-mainnet.gateway.pokt.network/v1/lb/611156b4a585a20035148406",
    )
  : null;
const mainnetInfura = navigator.onLine
  ? new ethers.providers.StaticJsonRpcProvider("https://mainnet.infura.io/v3/" + INFURA_ID)
  : null;
// ( ⚠️ Getting "failed to meet quorum" errors? Check your INFURA_ID

// 🏠 Your local provider is usually pointed at your local blockchain
const localProviderUrl = targetNetwork.rpcUrl;
// as you deploy to other networks you can set REACT_APP_PROVIDER=https://dai.poa.network in packages/react-app/.env
const localProviderUrlFromEnv = process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : localProviderUrl;
if (DEBUG) console.log("🏠 Connecting to provider:", localProviderUrlFromEnv);
const localProvider = new ethers.providers.StaticJsonRpcProvider(localProviderUrlFromEnv);

// 🔭 block explorer URL
const blockExplorer = targetNetwork.blockExplorer;

// Coinbase walletLink init
const walletLink = new WalletLink({
  appName: "coinbase",
});

// WalletLink provider
const walletLinkProvider = walletLink.makeWeb3Provider(`https://mainnet.infura.io/v3/${INFURA_ID}`, 1);

// Portis ID: 6255fb2b-58c8-433b-a2c9-62098c05ddc9
/*
  Web3 modal helps us "connect" external wallets:
*/
const web3Modal = new Web3Modal({
  network: "mainnet", // Optional. If using WalletConnect on xDai, change network to "xdai" and add RPC info below for xDai chain.
  cacheProvider: true, // optional
  theme: "light", // optional. Change to "dark" for a dark theme.
  providerOptions: {
    walletconnect: {
      package: WalletConnectProvider, // required
      options: {
        bridge: "https://polygon.bridge.walletconnect.org",
        infuraId: INFURA_ID,
        rpc: {
          1: `https://mainnet.infura.io/v3/${INFURA_ID}`, // mainnet // For more WalletConnect providers: https://docs.walletconnect.org/quick-start/dapps/web3-provider#required
          42: `https://kovan.infura.io/v3/${INFURA_ID}`,
          100: "https://dai.poa.network", // xDai
        },
      },
    },
    portis: {
      display: {
        logo: "https://user-images.githubusercontent.com/9419140/128913641-d025bc0c-e059-42de-a57b-422f196867ce.png",
        name: "Portis",
        description: "Connect to Portis App",
      },
      package: Portis,
      options: {
        id: "6255fb2b-58c8-433b-a2c9-62098c05ddc9",
      },
    },
    fortmatic: {
      package: Fortmatic, // required
      options: {
        key: "pk_live_5A7C91B2FC585A17", // required
      },
    },
    "custom-walletlink": {
      display: {
        logo: "https://play-lh.googleusercontent.com/PjoJoG27miSglVBXoXrxBSLveV6e3EeBPpNY55aiUUBM9Q1RCETKCOqdOkX2ZydqVf0",
        name: "Coinbase",
        description: "Connect to Coinbase Wallet (not Coinbase App)",
      },
      package: walletLinkProvider,
      connector: async (provider, _options) => {
        await provider.enable();
        return provider;
      },
    },
    authereum: {
      package: Authereum, // required
    },
  },
});

function App(props) {
  const mainnetProvider =
    poktMainnetProvider && poktMainnetProvider._isProvider
      ? poktMainnetProvider
      : scaffoldEthProvider && scaffoldEthProvider._network
      ? scaffoldEthProvider
      : mainnetInfura;

  const [injectedProvider, setInjectedProvider] = useState();
  const [address, setAddress] = useState();

  const logoutOfWeb3Modal = async () => {
    await web3Modal.clearCachedProvider();
    if (injectedProvider && injectedProvider.provider && typeof injectedProvider.provider.disconnect == "function") {
      await injectedProvider.provider.disconnect();
    }
    setTimeout(() => {
      window.location.reload();
    }, 1);
  };

  /* 💵 This hook will get the price of ETH from 🦄 Uniswap: */
  const price = useExchangeEthPrice(targetNetwork, mainnetProvider);

  /* 🔥 This hook will get the price of Gas from ⛽️ EtherGasStation */
  const gasPrice = useGasPrice(targetNetwork, "fast");
  // Use your injected provider from 🦊 Metamask or if you don't have it then instantly generate a 🔥 burner wallet.
  const userProviderAndSigner = useUserProviderAndSigner(injectedProvider, localProvider);
  const userSigner = userProviderAndSigner.signer;

  useEffect(() => {
    async function getAddress() {
      if (userSigner) {
        const newAddress = await userSigner.getAddress();
        setAddress(newAddress);
      }
    }
    getAddress();
  }, [userSigner]);

  // You can warn the user if you would like them to be on a specific network
  const localChainId = localProvider && localProvider._network && localProvider._network.chainId;
  const selectedChainId =
    userSigner && userSigner.provider && userSigner.provider._network && userSigner.provider._network.chainId;

  // For more hooks, check out 🔗eth-hooks at: https://www.npmjs.com/package/eth-hooks

  // The transactor wraps transactions and provides notificiations
  const tx = Transactor(userSigner, gasPrice);

  // Faucet Tx can be used to send funds from the faucet
  const faucetTx = Transactor(localProvider, gasPrice);

  // 🏗 scaffold-eth is full of handy hooks like this one to get your balance:
  const yourLocalBalance = useBalance(localProvider, address);

  // Just plug in different 🛰 providers to get your balance on different chains:
  const yourMainnetBalance = useBalance(mainnetProvider, address);

  const contractConfig = useContractConfig();

  // Load in your local 📝 contract and read a value from it:
  const readContracts = useContractLoader(localProvider, contractConfig);

  // If you want to make 🔐 write transactions to your contracts, use the userSigner:
  const writeContracts = useContractLoader(userSigner, contractConfig, localChainId);

  // EXTERNAL CONTRACT EXAMPLE:
  //
  // If you want to bring in the mainnet DAI contract it would look like:
  const mainnetContracts = useContractLoader(mainnetProvider, contractConfig);

  // If you want to call a function on a new block
  useOnBlock(mainnetProvider, () => {
    console.log(`⛓ A new mainnet block is here: ${mainnetProvider._lastBlockNumber}`);
  });

  // Then read your DAI balance like:
  const myMainnetDAIBalance = useContractReader(mainnetContracts, "DAI", "balanceOf", [
    "0x34aA3F359A9D614239015126635CE7732c18fDF3",
  ]);

  // keep track of a variable from the contract in the local React state:
  // const balance = useContractReader(readContracts, "YourCollectible", "balanceOf", [address]);
  // console.log("🤗 balance:", balance);

  // 📟 Listen for broadcast events
  // const transferEvents = useEventListener(readContracts, "YourCollectible", "Transfer", localProvider, 1);
  // console.log("📟 Transfer events:", transferEvents);

  //
  // 🧠 This effect will update yourCollectibles by polling when your balance changes
  //
  // const yourBalance = balance && balance.toNumber && balance.toNumber();
  // const [yourCollectibles, setYourCollectibles] = useState();
    const testData = [1,2,3,4,5];

  // useEffect(() => {
  //   const updateLists = async()=>{
  //     testData.forEach(x=>{
  //       x=x+1;
  //     })
  //   }
  //   const updateYourCollectibles = async () => {
  //     const collectibleUpdate = [];
  //     for (let tokenIndex = 0; tokenIndex < balance; tokenIndex++) {
  //       try {
  //         console.log("GEtting token index", tokenIndex);
  //         const tokenId = await readContracts.YourCollectible.tokenOfOwnerByIndex(address, tokenIndex);
  //         console.log("tokenId", tokenId);
  //         const tokenURI = await readContracts.YourCollectible.tokenURI(tokenId);
  //         console.log("tokenURI", tokenURI);

  //         const ipfsHash = tokenURI.replace("https://ipfs.io/ipfs/", "");
  //         console.log("ipfsHash", ipfsHash);

  //         const jsonManifestBuffer = await getFromIPFS(ipfsHash);

  //         try {
  //           const jsonManifest = JSON.parse(jsonManifestBuffer.toString());
  //           console.log("jsonManifest", jsonManifest);
  //           collectibleUpdate.push({ id: tokenId, uri: tokenURI, owner: address, ...jsonManifest });
  //         } catch (e) {
  //           console.log(e);
  //         }
  //       } catch (e) {
  //         console.log(e);
  //       }
  //     }
  //     setYourCollectibles(collectibleUpdate);
  //   };
  //   updateYourCollectibles();
  // }, [address, yourBalance]);

  /*
  const addressFromENS = useResolveName(mainnetProvider, "austingriffith.eth");
  console.log("🏷 Resolved austingriffith.eth as:",addressFromENS)
  */

  //
  // 🧫 DEBUG 👨🏻‍🔬
  //
  useEffect(() => {
    if (
      DEBUG &&
      mainnetProvider &&
      address &&
      selectedChainId &&
      yourLocalBalance &&
      yourMainnetBalance &&
      readContracts &&
      writeContracts &&
      mainnetContracts
    ) {
      console.log("_____________________________________ 🏗 scaffold-eth _____________________________________");
      console.log("🌎 mainnetProvider", mainnetProvider);
      console.log("🏠 localChainId", localChainId);
      console.log("👩‍💼 selected address:", address);
      console.log("🕵🏻‍♂️ selectedChainId:", selectedChainId);
      console.log("💵 yourLocalBalance", yourLocalBalance ? ethers.utils.formatEther(yourLocalBalance) : "...");
      console.log("💵 yourMainnetBalance", yourMainnetBalance ? ethers.utils.formatEther(yourMainnetBalance) : "...");
      console.log("📝 readContracts", readContracts);
      console.log("🌍 DAI contract on mainnet:", mainnetContracts);
      console.log("💵 yourMainnetDAIBalance", myMainnetDAIBalance);
      console.log("🔐 writeContracts", writeContracts);
    }
  }, [
    mainnetProvider,
    address,
    selectedChainId,
    yourLocalBalance,
    yourMainnetBalance,
    readContracts,
    writeContracts,
    mainnetContracts,
  ]);

  let networkDisplay = "";
  if (NETWORKCHECK && localChainId && selectedChainId && localChainId !== selectedChainId) {
    const networkSelected = NETWORK(selectedChainId);
    const networkLocal = NETWORK(localChainId);
    if (selectedChainId === 1337 && localChainId === 31337) {
      networkDisplay = (
        <div style={{ zIndex: 2, position: "absolute", right: 0, top: 60, padding: 16 }}>
          <Alert
            message="⚠️ Wrong Network ID"
            description={
              <div>
                You have <b>chain id 1337</b> for localhost and you need to change it to <b>31337</b> to work with
                HardHat.
                <div>(MetaMask -&gt; Settings -&gt; Networks -&gt; Chain ID -&gt; 31337)</div>
              </div>
            }
            type="error"
            closable={false}
          />
        </div>
      );
    } else {
      networkDisplay = (
        <div style={{ zIndex: 2, position: "absolute", right: 0, top: 60, padding: 16 }}>
          <Alert
            message="⚠️ Wrong Network"
            description={
              <div>
                You have <b>{networkSelected && networkSelected.name}</b> selected and you need to be on{" "}
                <Button
                  onClick={async () => {
                    const ethereum = window.ethereum;
                    const data = [
                      {
                        chainId: "0x" + targetNetwork.chainId.toString(16),
                        chainName: targetNetwork.name,
                        nativeCurrency: targetNetwork.nativeCurrency,
                        rpcUrls: [targetNetwork.rpcUrl],
                        blockExplorerUrls: [targetNetwork.blockExplorer],
                      },
                    ];
                    console.log("data", data);

                    let switchTx;
                    // https://docs.metamask.io/guide/rpc-api.html#other-rpc-methods
                    try {
                      switchTx = await ethereum.request({
                        method: "wallet_switchEthereumChain",
                        params: [{ chainId: data[0].chainId }],
                      });
                    } catch (switchError) {
                      // not checking specific error code, because maybe we're not using MetaMask
                      try {
                        switchTx = await ethereum.request({
                          method: "wallet_addEthereumChain",
                          params: data,
                        });
                      } catch (addError) {
                        // handle "add" error
                      }
                    }

                    if (switchTx) {
                      console.log(switchTx);
                    }
                  }}
                >
                  <b>{networkLocal && networkLocal.name}</b>
                </Button>
              </div>
            }
            type="error"
            closable={false}
          />
        </div>
      );
    }
  } else {
    networkDisplay = (
      <div style={{ zIndex: -1, position: "absolute", right: 154, top: 28, padding: 16, color: targetNetwork.color }}>
        {targetNetwork.name}
      </div>
    );
  }

  const loadWeb3Modal = useCallback(async () => {
    const provider = await web3Modal.connect();
    setInjectedProvider(new ethers.providers.Web3Provider(provider));

    provider.on("chainChanged", chainId => {
      console.log(`chain changed to ${chainId}! updating providers`);
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    provider.on("accountsChanged", () => {
      console.log(`account changed!`);
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    // Subscribe to session disconnection
    provider.on("disconnect", (code, reason) => {
      console.log(code, reason);
      logoutOfWeb3Modal();
    });
  }, [setInjectedProvider]);

  useEffect(() => {
    if (web3Modal.cachedProvider) {
      loadWeb3Modal();
    }
  }, [loadWeb3Modal]);

  const [route, setRoute] = useState();
  useEffect(() => {
    setRoute(window.location.pathname);
  }, [setRoute]);

  let faucetHint = "";
  const faucetAvailable = localProvider && localProvider.connection && targetNetwork.name.indexOf("local") !== -1;

  // const [faucetClicked, setFaucetClicked] = useState(false);
  // if (
  //   !faucetClicked &&
  //   localProvider &&
  //   localProvider._network &&
  //   localProvider._network.chainId == 31337 &&
  //   yourLocalBalance &&
  //   ethers.utils.formatEther(yourLocalBalance) <= 0
  // ) {
  //   // faucetHint = (
  //   //   return;
  //   //   // <div style={{ padding: 16 }}>
  //   //   //   <Button
  //   //   //     type="primary"
  //   //   //     onClick={() => {
  //   //   //       faucetTx({
  //   //   //         to: address,
  //   //   //         value: ethers.utils.parseEther("0.01"),
  //   //   //       });
  //   //   //       setFaucetClicked(true);
  //   //   //     }}
  //   //   //   >
  //   //   //     💰 Grab funds from the faucet ⛽️
  //   //   //   </Button>
  //   //   // </div>
  //   // );
  // }

  const [yourJSON, setYourJSON] = useState(STARTING_JSON);
  const [sending, setSending] = useState();
  const [ipfsHash, setIpfsHash] = useState();
  const [ipfsDownHash, setIpfsDownHash] = useState();
  const [downloading, setDownloading] = useState();
  const [ipfsContent, setIpfsContent] = useState();
  const [transferToAddresses, setTransferToAddresses] = useState({});
  const [minting, setMinting] = useState(false);
  const [count, setCount] = useState(1);

  // the json for the nfts
  const json = {
    1: {
      description: "The Bored Apes Yacht Club",
      external_url: "https://austingriffith.com/portfolio/paintings/", // <-- this can link to a page for the specific file too
      image: "bayv.png",
      name: "BAYC",
      attributes: [
        {
          trait_type: "BackgroundColor",
          value: "green",
        },
        {
          trait_type: "Eyes",
          value: "googly",
        },
        {
          trait_type: "Stamina",
          value: 42,
        },
      ],
    },
    2: {
      description: "Azuki NFT Collection",
      external_url: "https://austingriffith.com/portfolio/paintings/", // <-- this can link to a page for the specific file too
      image: "azuki.svg",
      name: "Azuki",
      attributes: [
        {
          trait_type: "BackgroundColor",
          value: "blue",
        },
        {
          trait_type: "Eyes",
          value: "googly",
        },
        {
          trait_type: "Stamina",
          value: 38,
        },
      ],
    },
    3: {
      description: "What a horn!",
      external_url: "https://austingriffith.com/portfolio/paintings/", // <-- this can link to a page for the specific file too
      image: "https://austingriffith.com/images/paintings/rhino.jpg",
      name: "Rhino",
      attributes: [
        {
          trait_type: "BackgroundColor",
          value: "pink",
        },
        {
          trait_type: "Eyes",
          value: "googly",
        },
        {
          trait_type: "Stamina",
          value: 22,
        },
      ],
    },
    4: {
      description: "Is that an underbyte?",
      external_url: "https://austingriffith.com/portfolio/paintings/", // <-- this can link to a page for the specific file too
      image: "https://austingriffith.com/images/paintings/fish.jpg",
      name: "Fish",
      attributes: [
        {
          trait_type: "BackgroundColor",
          value: "blue",
        },
        {
          trait_type: "Eyes",
          value: "googly",
        },
        {
          trait_type: "Stamina",
          value: 15,
        },
      ],
    },
    5: {
      description: "So delicate.",
      external_url: "https://austingriffith.com/portfolio/paintings/", // <-- this can link to a page for the specific file too
      image: "https://austingriffith.com/images/paintings/flamingo.jpg",
      name: "Flamingo",
      attributes: [
        {
          trait_type: "BackgroundColor",
          value: "black",
        },
        {
          trait_type: "Eyes",
          value: "googly",
        },
        {
          trait_type: "Stamina",
          value: 6,
        },
      ],
    },
    6: {
      description: "Raaaar!",
      external_url: "https://austingriffith.com/portfolio/paintings/", // <-- this can link to a page for the specific file too
      image: "https://austingriffith.com/images/paintings/godzilla.jpg",
      name: "Godzilla",
      attributes: [
        {
          trait_type: "BackgroundColor",
          value: "orange",
        },
        {
          trait_type: "Eyes",
          value: "googly",
        },
        {
          trait_type: "Stamina",
          value: 99,
        },
      ],
    },
  };

  // const getCollectionOrders = async() =>{
  //   const result = tx
  //   (writeContracts &&
  //     writeContracts.dyve.
  //     )
  // }
  // const mintItem = async () => {
  //   // upload to ipfs
  //   const uploaded = await ipfs.add(JSON.stringify(json[count]));
  //   setCount(count + 1);
  //   console.log("Uploaded Hash: ", uploaded);
  //   const result = tx(
  //     writeContracts &&
  //       writeContracts.YourCollectible &&
  //       writeContracts.YourCollectible.mintItem(address, uploaded.path),
  //     update => {
  //       console.log("📡 Transaction Update:", update);
  //       if (update && (update.status === "confirmed" || update.status === 1)) {
  //         console.log(" 🍾 Transaction " + update.hash + " finished!");
  //         console.log(
  //           " ⛽️ " +
  //             update.gasUsed +
  //             "/" +
  //             (update.gasLimit || update.gas) +
  //             " @ " +
  //             parseFloat(update.gasPrice) / 1000000000 +
  //             " gwei",
  //         );
  //       }
  //     },
  //   );
  // };

  return (
    <div className="App">
      {/* ✏️ Edit the header and change the title to your project name */}
      <Header />
      {networkDisplay}
      <BrowserRouter>
        <Menu style={{ textAlign: "center" }} selectedKeys={[route]} mode="horizontal">
          {/* <Menu.Item key="/">
            <Link
              onClick={() => {
                setRoute("/");
              }}
              to="/"
            >
              Home
            </Link>
          </Menu.Item> */}
          {/* <Menu.Item key="/transfers">
            <Link
              onClick={() => {
                setRoute("/transfers");
              }}
              to="/transfers"
            >
              Transfers
            </Link>
          </Menu.Item> */}
          {/*
          <Menu.Item key="/ipfsup">
            <Link
              onClick={() => {
                setRoute("/ipfsup");
              }}
              to="/ipfsup"
            >
              IPFS Upload
            </Link>
          </Menu.Item>
          <Menu.Item key="/ipfsdown">
            <Link
              onClick={() => {
                setRoute("/ipfsdown");
              }}
              to="/ipfsdown"
            >
              IPFS Download
            </Link>
          </Menu.Item>
          <Menu.Item key="/debugcontracts">
            <Link
              onClick={() => {
                setRoute("/debugcontracts");
              }}
              to="/debugcontracts"
            >
              Debug Contracts
            </Link>
          </Menu.Item> */}
        </Menu>
        <Switch>
          <Route exact path="/">
            <div style={{ width: 640, margin: "auto", marginTop: 200, paddingBottom: 32 }}>
              <Button
                shape="round"
                size="large"
                style={{height:'100px', width:'400px', alignItems: 'center'}}
                href="/collections"
                >
                  <span style={{ marginRight: 8 }} role="img" aria-label="LEND!">
                💰
              </span>
                LEND & EARN
              </Button>
            </div>
            <div style={{ width: 640, margin: "auto", marginTop: 32, paddingBottom: 32 }}>
            <Button
                disabled={minting}
                shape="round"
                size="large"
                style={{height:'100px',width:'400px'}}
                href="/exShortPage"
              >
                    <span style={{ marginRight: 8 }} role="img" aria-label="Borrow">
                    📉
              </span>
                SHORT
              </Button>
            </div>
          </Route>

          {/* <Route path="/transfers">



            <div style={{ width: 600, margin: "auto", marginTop: 32, paddingBottom: 32 }}>
              <List
                bordered
                dataSource={transferEvents}
                renderItem={item => {
                  return (
                    <List.Item key={item[0] + "_" + item[1] + "_" + item.blockNumber + "_" + item.args[2].toNumber()}>
                      <span style={{ fontSize: 16, marginRight: 8 }}>#{item.args[2].toNumber()}</span>
                      <Address address={item.args[0]} ensProvider={mainnetProvider} fontSize={16} /> =&gt;
                      <Address address={item.args[1]} ensProvider={mainnetProvider} fontSize={16} />
                    </List.Item>
                  );
                }}
              />
            </div>
          </Route> */}

          {/* <Route path="/collections">
          <div style={{ width: 640, margin: "auto", marginTop: 32, paddingBottom: 32 }}>
              <List
                bordered
                dataSource={yourCollectibles}
                renderItem={item => {
                  const id = item.id.toNumber();
                  return (
                    <List.Item key={id + "_" + item.uri + "_" + item.owner}>
                      <Card
                        title={
                          <div>
                            {item.name}
                          </div>
                        }
                      >
                        <div>
                          <img src={item.image} style={{ maxWidth: 150 }} />
                        </div>
                        <div>{item.description}</div>
                      </Card>

                      <div>
                        <Button
                          href="/collection_details"
                        >
                          Explore Collection
                        </Button>
                      </div>
                    </List.Item>
                  );
                }}
              />
            </div>
          
          </Route> */}
        {/**  const test = useContractReader(readContracts, "Dyve",  "token", []);
  console.log(test);
 */}
          <Route path="/exShortPage">
            <div style={{ width: 640, margin: "auto", marginTop: 32, paddingBottom: 32 }}>
              <h1>Name of Project</h1>
              <h3>Highest Bid</h3>
              <img src="data:image/png;base64,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" alt="" />
              <List
              bordered
              dataSource={testData}
              renderItem={item => {
                return(
                  <p>{item}</p>
                )
              }}>

              </List>
              {/* <table>
                <tr>
                  <th>ID</th>
                  <th>Required Collateral</th>
                  <th>Expire Date</th>
                  <th>Short</th>
                </tr>
                  {for(let i = 0; i < 10; i++){
                  return<tr>
                    <td>5</td>
                    <td>1.2 ETH</td>
                    <td>10/05/22</td>
                    <td>[x]</td>
                  </tr>;
                  }}

              </table> */}
            </div>
          </Route>

          {/* <Route path="/collection_details">
          <div style={{ width: 640, margin: "auto", marginTop: 32, paddingBottom: 32 }}>
              <List
                bordered
                dataSource={yourCollectibles}
                renderItem={item => {
                  const id = item.id.toNumber();
                  return (
                    <List.Item key={id + "_" + item.uri + "_" + item.owner}>
                      <Card
                        title={
                          <div>
                            {item.name}
                          </div>
                        }
                      >
                        <div>
                          <img src={item.image} style={{ maxWidth: 150 }} />
                        </div>
                        <div>{item.description}</div>
                      </Card>

                      <div>
                        <Button danger>
                          Short
                        </Button>
                      </div>
                    </List.Item>
                  );
                }}
              />
            </div>
          
          </Route>

          <Route path="/ipfsup">
            <div style={{ paddingTop: 32, width: 740, margin: "auto", textAlign: "left" }}>
              <ReactJson
                style={{ padding: 8 }}
                src={yourJSON}
                theme="pop"
                enableClipboard={false}
                onEdit={(edit, a) => {
                  setYourJSON(edit.updated_src);
                }}
                onAdd={(add, a) => {
                  setYourJSON(add.updated_src);
                }}
                onDelete={(del, a) => {
                  setYourJSON(del.updated_src);
                }}
              />
            </div> */}

            {/* <Button
              style={{ margin: 8 }}
              loading={sending}
              size="large"
              shape="round"
              type="primary"
              onClick={async () => {
                console.log("UPLOADING...", yourJSON);
                setSending(true);
                setIpfsHash();
                const result = await ipfs.add(JSON.stringify(yourJSON)); // addToIPFS(JSON.stringify(yourJSON))
                if (result && result.path) {
                  setIpfsHash(result.path);
                }
                setSending(false);
                console.log("RESULT:", result);
              }}
            >
              Upload to IPFS
            </Button>

            <div style={{ padding: 16, paddingBottom: 150 }}>{ipfsHash}</div>
          </Route> */}
          <Route path="/ipfsdown">
            <div style={{ paddingTop: 32, width: 740, margin: "auto" }}>
              <Input
                value={ipfsDownHash}
                placeHolder="IPFS hash (like QmadqNw8zkdrrwdtPFK1pLi8PPxmkQ4pDJXY8ozHtz6tZq)"
                onChange={e => {
                  setIpfsDownHash(e.target.value);
                }}
              />
            </div>
            <Button
              style={{ margin: 8 }}
              loading={sending}
              size="large"
              shape="round"
              type="primary"
              onClick={async () => {
                console.log("DOWNLOADING...", ipfsDownHash);
                setDownloading(true);
                setIpfsContent();
                const result = await getFromIPFS(ipfsDownHash); // addToIPFS(JSON.stringify(yourJSON))
                if (result && result.toString) {
                  setIpfsContent(result.toString());
                }
                setDownloading(false);
              }}
            >
              Download from IPFS
            </Button>

            <pre style={{ padding: 16, width: 500, margin: "auto", paddingBottom: 150 }}>{ipfsContent}</pre>
          </Route>
          <Route path="/debugcontracts">
            <Contract
              name="YourCollectible"
              signer={userSigner}
              provider={localProvider}
              address={address}
              blockExplorer={blockExplorer}
              contractConfig={contractConfig}
            />
          </Route>
        </Switch>
      </BrowserRouter>

      <ThemeSwitch />

      {/* 👨‍💼 Your account is in the top right with a wallet at connect options */}
      <div style={{ position: "fixed", textAlign: "right", right: 0, top: 0, padding: 10 }}>
        <Account
          address={address}
          localProvider={localProvider}
          userSigner={userSigner}
          mainnetProvider={mainnetProvider}
          price={price}
          web3Modal={web3Modal}
          loadWeb3Modal={loadWeb3Modal}
          logoutOfWeb3Modal={logoutOfWeb3Modal}
          blockExplorer={blockExplorer}
        />
        {faucetHint}
      </div>

      {/* 🗺 Extra UI like gas price, eth price, faucet, and support: */}
      <div style={{ position: "fixed", textAlign: "left", left: 0, bottom: 20, padding: 10 }}>
        <Row align="middle" gutter={[4, 4]}>
          {/* <Col span={8}>
            <Ramp price={price} address={address} networks={NETWORKS} />
          </Col> */}

          {/* <Col span={8} style={{ textAlign: "center", opacity: 0.8 }}>
            <GasGauge gasPrice={gasPrice} />
          </Col> */}
          <Col span={8} style={{ textAlign: "center", opacity: 1 }}>
            {/* <Button
              onClick={() => {
                window.open("https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA");
              }}
              size="large"
              shape="round"
            >
              <span style={{ marginRight: 8 }} role="img" aria-label="support">
                💬
              </span>
              Support
            </Button> */}
          </Col>
        </Row>

        <Row align="middle" gutter={[4, 4]}>
          <Col span={24}>
            {
              /*  if the local provider has a signer, let's show the faucet:  */
              faucetAvailable ? (
                <Faucet localProvider={localProvider} price={price} ensProvider={mainnetProvider} />
              ) : (
                ""
              )
            }
          </Col>
        </Row>
      </div>
    </div>
  );
}

export default App;
