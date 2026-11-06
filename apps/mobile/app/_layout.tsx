import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { API_PATHS, CONTRACT_VERSION, healthSchema, successSchema } from "@carpool/contracts";

// Module 5 replaces this bootstrap-only panel with its navigation exports.
export default function FoundationLayout() {
  const [result, setResult] = useState("API connectivity has not been checked.");
  const [loading, setLoading] = useState(false);
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  async function checkApi() {
    setLoading(true);
    try {
      if (!baseUrl) throw new Error("Set EXPO_PUBLIC_API_BASE_URL and restart Expo.");
      const url = new URL(baseUrl);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("API URL must use HTTP or HTTPS.");
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}${API_PATHS.health}`, {
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`API returned HTTP ${response.status}.`);
      const { data } = successSchema(healthSchema).parse(await response.json());
      setResult(`API connected. Contract ${data.contractVersion}; foundation only, no database check.`);
    } catch (error) {
      setResult(`API check failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  }

  return <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 32, paddingTop: 64 }}>
    <View style={{ width: "100%", maxWidth: 640, alignSelf: "center", gap: 20 }}>
      <Text accessibilityRole="header" style={{ fontSize: 28, fontWeight: "bold" }}>Carpool foundation</Text>
      <Text>Contract {CONTRACT_VERSION}. Ride, booking, and user screens are not implemented yet.</Text>
      <Text>Fictional demo only. No real authentication, identity protection, or verified contact details.</Text>
      <Text>API: {baseUrl || "Not configured"}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Check API connectivity"
        disabled={loading} onPress={checkApi}
        style={{ padding: 16, minHeight: 48, backgroundColor: "#123d63", borderRadius: 6 }}>
        <Text style={{ color: "#ffffff" }}>{loading ? "Checking API..." : "Check API connectivity"}</Text>
      </Pressable>
      {loading && <ActivityIndicator accessibilityLabel="Checking API" />}
      <Text accessibilityLiveRegion="polite" role="status">{result}</Text>
    </View>
  </ScrollView>;
}
