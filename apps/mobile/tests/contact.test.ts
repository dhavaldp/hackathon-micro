import assert from "node:assert/strict";
import test from "node:test";
import { contactDraftCopy } from "../src/carpool/contact";

test("contact drafts explicitly disclose that messages are not delivered or saved", () => {
  for (const audience of ["driver", "riders"] as const) {
    const copy = contactDraftCopy(audience);
    assert.equal(copy.label, `Contact ${audience}`);
    assert.match(copy.description, /not available/);
    assert.match(copy.description, /nothing will be sent or saved/);
  }
});
