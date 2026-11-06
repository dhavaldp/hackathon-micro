import { CONTRACT_VERSION } from "@carpool/contracts";

export default function FoundationPage() {
  return <main>
    <h1>Carpool API foundation</h1>
    <p>Contract {CONTRACT_VERSION}. Fictional demo only; no authentication or privacy protection.</p>
    <p>Fictional demo rides and bookings are available through the API.</p>
  </main>;
}
