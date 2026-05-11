// PATH: app/app/faucet/page.tsx — server route for the Faucet page.
// Fix: route config stays in this server file; wagmi/RainbowKit hooks live in ./FaucetClient.

import FaucetClient from "./FaucetClient";

export const dynamic = "force-dynamic";

export default function FaucetPage() {
  return <FaucetClient />;
}
