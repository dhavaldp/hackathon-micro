import { CONTRACT_VERSION } from "@carpool/contracts";

export default function FoundationPage() {
  return <main>
    <h1>Carpool API foundation</h1>
    <p>Contract {CONTRACT_VERSION}. Fictional demo only; no authentication or privacy protection.</p>
    <p>Ride and booking endpoints will be supplied by Modules 3 and 4.</p>
  </main>;
}
