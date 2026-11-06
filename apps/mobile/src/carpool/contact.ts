export type ContactAudience = "driver" | "riders";

export function contactDraftCopy(audience: ContactAudience) {
  return {
    label: audience === "driver" ? "Contact driver" : "Contact riders",
    description: "Demo draft only. Messaging is not available and nothing will be sent or saved.",
  };
}
