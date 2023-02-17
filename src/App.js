import { useEffect, useState } from "react";
import { SignClient } from "@walletconnect/sign-client";
import { Web3Modal } from "@web3modal/standalone";
import "./App.css";

const web3Modal = new Web3Modal({
  projectId: process.env.REACT_APP_PROJECT_ID,
  standaloneChains: ["eip155:5"],
});

function App() {
  const [signClient, setSignClient] = useState();
  const [sessions, setSessions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [txnHash, setTxnHash] = useState();

  async function createClient() {
    try {
      const client = await SignClient.init({
        projectId: process.env.REACT_APP_PROJECT_ID,
      });
      setSignClient(client);
      await subscribeToEvents(client);
    } catch (e) {
      console.log(e);
    }
  }

  async function handleConnect() {
    if (!signClient) throw Error("Cannot connect. Sign Client is not created");
    try {
      // dapp is going to send a proposal namespace
      const proposalNamespace = {
        eip155: {
          chains: ["eip155:5"],
          methods: ["eth_sendTransaction"],
          events: ["connect", "disconnect"],
        },
      };

      const { uri, approval } = await signClient.connect({
        requiredNamespaces: proposalNamespace,
      });

      if (uri) {
        web3Modal.openModal({ uri });
        const sessionNamespace = await approval();
        onSessionConnect(sessionNamespace);
        web3Modal.closeModal();
      }
    } catch (e) {
      console.log(e);
    }
  }

  async function onSessionConnect(session) {
    if (!session) throw Error("session doesn't exist");
    try {
      setSessions(session);
      setAccounts(session.namespaces.eip155.accounts[0].slice(9));
    } catch (e) {
      console.log(e);
    }
  }

  async function handleDisconnect() {
    try {
      await signClient.disconnect({
        topic: sessions.topic,
        code: 6000,
        message: "User disconnected",
      });
      reset();
    } catch (e) {
      console.log(e);
    }
  }

  async function subscribeToEvents(client) {
    if (!client)
      throw Error("No events to subscribe to b/c the client does not exist");

    try {
      client.on("session_delete", () => {
        console.log("user disconnected the session from their wallet");
        reset();
      });
    } catch (e) {
      console.log(e);
    }
  }

  async function handleSend() {
    try {
      const tx = {
        from: accounts,
        to: "0xBDE1EAE59cE082505bB73fedBa56252b1b9C60Ce",
        data: "0x",
        gasPrice: "0x029104e28c",
        gasLimit: "0x5208",
        value: "0x00",
      };
      const result = await signClient.request({
        topic: sessions.topic,
        request: {
          method: "eth_sendTransaction",
          params: [tx]
        },
        chainId: "eip155:5"
      })
      setTxnHash(result)
    } catch (e) {
      console.log(e);
    }
  }

  const reset = () => {
    setAccounts([]);
    setSessions([]);
  };

  useEffect(() => {
    if (!signClient) {
      createClient();
    }
  }, [signClient]);

  return (
    <div className="App">
      <h1>Youtube Tutorial</h1>
      {accounts.length ? (
        <>
          <p>{accounts}</p>
          <button onClick={handleDisconnect}>Disconnect</button>
          <button onClick={handleSend}>Send</button>
          { txnHash && <p>View your transaction <a href={`https://goerli.etherscan.io/tx/${txnHash}`} target="_blank" rel="noreferrer">here</a>!</p>}
        </>
      ) : (
        <button onClick={handleConnect} disabled={!signClient}>
          Connect
        </button>
      )}
    </div>
  );
}

export default App;
