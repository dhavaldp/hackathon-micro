import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  createRideSchemaAt,
  discoveryQuerySchema,
  type Activity,
  type CreateRideRequest,
  type DemoUser,
  type DiscoveryQuery,
  type Ride,
} from "@carpool/contracts";
import { CarpoolApiError, createLiveCarpoolApi } from "./api";

type Tab = "rides" | "offer" | "activity";
type DataState = {
  users: DemoUser[];
  rides: Ride[];
  activity: Activity;
};

const liveCarpoolApi = createLiveCarpoolApi(process.env.EXPO_PUBLIC_API_BASE_URL);
const ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || "local time";

function formatDeparture(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

function toInstant(localDateTime: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(localDateTime);
  if (!match) throw new Error("Enter a departure as YYYY-MM-DDTHH:mm in your local time.");

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const date = new Date(year, month - 1, day, hour, minute);
  if (
    date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day
    || date.getHours() !== hour || date.getMinutes() !== minute
  ) {
    throw new Error("Enter a valid local departure date and time.");
  }
  return date.toISOString();
}

function defaultDepartureInput(): string {
  const date = new Date(Date.now() + 86_400_000);
  date.setSeconds(0, 0);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:00`;
}

function displayError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function fieldErrors(error: unknown): Record<string, string[]> {
  return error instanceof CarpoolApiError ? error.fieldErrors ?? {} : {};
}

function Button({
  label,
  onPress,
  disabled = false,
  selected = false,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        selected && styles.selectedButton,
        disabled && styles.disabledButton,
        pressed && !disabled && styles.pressedButton,
      ]}
    >
      <Text style={[styles.buttonText, selected && styles.selectedButtonText]}>{label}</Text>
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  keyboardType = "default",
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  error?: string;
  keyboardType?: "default" | "numeric";
  maxLength?: number;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        maxLength={maxLength}
        style={styles.input}
      />
      {error ? <Text accessibilityLiveRegion="polite" style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

function RideCard({
  ride,
  driverName,
  currentUserId,
  busy,
  onBook,
  onCancel,
}: {
  ride: Ride;
  driverName: string;
  currentUserId: string;
  busy: boolean;
  onBook?: () => void;
  onCancel?: () => void;
}) {
  const isDriver = ride.driverId === currentUserId;
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.cardEyebrow}>TRIP DETAILS</Text>
        <Text style={styles.seatBadge}>
          {ride.status === "CANCELLED" ? "Cancelled" : `${ride.remainingSeats} / ${ride.seatCapacity} seats`}
        </Text>
      </View>
      <Text accessibilityRole="header" style={styles.cardTitle}>{ride.origin} <Text style={styles.routeArrow}>→</Text> {ride.destination}</Text>
      <Text style={styles.cardDetail}>{formatDeparture(ride.departureTime)} ({ZONE})</Text>
      <Text style={styles.cardDetail}>Driver: {driverName}</Text>
      <Text style={styles.secondary}>
        {ride.status === "CANCELLED"
          ? "Cancelled"
          : `${ride.remainingSeats} of ${ride.seatCapacity} seats available`}
      </Text>
      {isDriver ? <Text>You are the driver of this ride.</Text> : null}
      {onBook ? <Button
        label="Book one seat"
        accessibilityLabel={`Book a seat from ${ride.origin} to ${ride.destination}`}
        disabled={busy || ride.remainingSeats < 1}
        onPress={onBook}
      /> : null}
      {onCancel ? <Button
        label="Cancel ride"
        disabled={busy || ride.status === "CANCELLED"}
        onPress={onCancel}
      /> : null}
    </View>
  );
}

export default function HomeScreen() {
  const client = liveCarpoolApi;
  const [actorId, setActorId] = useState("");
  const [tab, setTab] = useState<Tab>("rides");
  const [filters, setFilters] = useState<DiscoveryQuery>({});
  const [searchOrigin, setSearchOrigin] = useState("");
  const [searchDestination, setSearchDestination] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [data, setData] = useState<DataState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departure, setDeparture] = useState(defaultDepartureInput);
  const [capacity, setCapacity] = useState("1");
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let current = true;
    setLoading(true);
    setData(null);
    setError("");
    client.listUsers().then(async (users) => {
      if (!current) return;
      if (!users.some((user) => user.id === actorId)) {
        if (users.length === 0) throw new Error("No demo users are available.");
        setActorId(users[0].id);
        return;
      }
      const [rides, activity] = await Promise.all([
        client.listRides(filters),
        client.getActivity(actorId),
      ]);
      if (current) setData({ users, rides, activity });
    }).catch((failure: unknown) => {
      if (current) setError(displayError(failure));
    }).finally(() => {
      if (current) setLoading(false);
    });
    return () => {
      current = false;
    };
  }, [client, actorId, filters, refreshVersion]);

  const userNames = useMemo(
    () => new Map((data?.users ?? []).map((user) => [user.id, user.displayName])),
    [data?.users],
  );

  async function runAction(action: () => Promise<string>): Promise<void> {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      setNotice(await action());
      setRefreshVersion((version) => version + 1);
    } catch (failure) {
      setError(displayError(failure));
      setFormErrors(fieldErrors(failure));
    } finally {
      setBusy(false);
    }
  }

  function submitSearch(): void {
    const result = discoveryQuerySchema.safeParse({
      ...(searchOrigin.trim() ? { origin: searchOrigin } : {}),
      ...(searchDestination.trim() ? { destination: searchDestination } : {}),
      ...(searchDate.trim() ? { date: searchDate.trim() } : {}),
    });
    if (!result.success) {
      setError(result.error.issues.map((issue) => issue.message).join(" "));
      setNotice("");
      return;
    }
    setError("");
    setNotice("");
    setFilters(result.data);
  }

  async function submitRide(): Promise<void> {
    setFormErrors({});
    let departureTime: string;
    try {
      departureTime = toInstant(departure.trim());
    } catch (failure) {
      const message = displayError(failure);
      setError(message);
      setFormErrors({ departureTime: [message] });
      return;
    }
    const candidate: CreateRideRequest = {
      origin: origin.trim(),
      destination: destination.trim(),
      departureTime,
      seatCapacity: Number(capacity),
    };
    const parsed = createRideSchemaAt(new Date()).safeParse(candidate);
    if (!parsed.success) {
      const nextErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "ride");
        nextErrors[key] = [...(nextErrors[key] ?? []), issue.message];
      }
      setFormErrors(nextErrors);
      setError("Check the highlighted ride details.");
      return;
    }
    await runAction(async () => {
      const ride = await client.createRide(actorId, parsed.data);
      setTab("activity");
      setOrigin("");
      setDestination("");
      return `Ride offered: ${ride.origin} to ${ride.destination}, ${formatDeparture(ride.departureTime)} (${ZONE}).`;
    });
  }

  const selectedUser = data?.users.find((user) => user.id === actorId);

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>ROGERS  /  CARPOOL DEMO</Text>
          <Text accessibilityRole="header" style={styles.title}>Better trips, together.</Text>
          <Text style={styles.heroText}>Find a ride, share a seat, and make the journey a little easier.</Text>
          <Text style={styles.disclaimer}>
            Fictional demo only. Switching users is not authentication; contact details are unverified.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Who&apos;s riding?</Text>
          <Text style={styles.secondary}>Switch between fictional people to try the full journey.</Text>
          <View style={styles.row}>
            {(data?.users ?? []).map((user) => <Button
              key={user.id}
              label={user.displayName}
              selected={user.id === actorId}
              onPress={() => {
                setActorId(user.id);
                setNotice("");
              }}
            />)}
          </View>
          {selectedUser?.contactDetails
            ? <Text style={styles.secondary}>
              Fictional, unverified contact: {selectedUser.contactDetails}
            </Text>
            : null}
        </View>

        <View style={styles.tabs}>
          {([
            ["rides", "Find rides"],
            ["offer", "Offer a ride"],
            ["activity", "My activity"],
          ] as const).map(([key, label]) => <Button
            key={key}
            label={label}
            selected={tab === key}
            onPress={() => {
              setTab(key);
              setError("");
              setNotice("");
            }}
          />)}
        </View>

        {notice ? <Text accessibilityLiveRegion="polite" role="status" style={styles.success}>{notice}</Text> : null}
        {error ? <Text accessibilityLiveRegion="assertive" role="alert" style={styles.error}>{error}</Text> : null}
        {loading ? <View style={styles.loading}>
          <ActivityIndicator accessibilityLabel="Loading rides and activity" />
          <Text>Loading rides and activity…</Text>
        </View> : null}

        {!loading && data && tab === "rides" ? <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Search (date uses UTC)</Text>
            <Field label="Origin" value={searchOrigin} onChangeText={setSearchOrigin} placeholder="e.g. Toronto" maxLength={100} />
            <Field label="Destination" value={searchDestination} onChangeText={setSearchDestination} placeholder="e.g. Brampton" maxLength={100} />
            <Field label="UTC date" value={searchDate} onChangeText={setSearchDate} placeholder="YYYY-MM-DD" maxLength={10} />
            <View style={styles.row}>
              <Button label="Search rides" onPress={submitSearch} />
              <Button label="Clear search" onPress={() => {
                setSearchOrigin("");
                setSearchDestination("");
                setSearchDate("");
                setFilters({});
                setError("");
              }} />
            </View>
          </View>
          <View style={styles.listHeading}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Upcoming rides</Text>
            <Text style={styles.secondary}>{data.rides.length} upcoming {data.rides.length === 1 ? "trip" : "trips"}</Text>
          </View>
          {data.rides.length === 0
            ? <Text style={styles.empty}>{Object.keys(filters).length
              ? "No upcoming rides match those filters."
              : "No upcoming rides yet. Be the first to offer a ride."}</Text>
            : data.rides.map((ride) => <RideCard
              key={ride.id}
              ride={ride}
              driverName={userNames.get(ride.driverId) ?? "Demo driver"}
              currentUserId={actorId}
              busy={busy}
              onBook={ride.driverId !== actorId && ride.status === "ACTIVE"
                ? () => void runAction(async () => {
                  const result = await client.book(ride.id, actorId);
                  return `Booking confirmed for ${result.ride.origin} to ${result.ride.destination}. ${result.ride.remainingSeats} seat(s) remain, as reported by the API.`;
                })
                : undefined}
            />)}
        </> : null}

        {!loading && data && tab === "offer" ? <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Offer a ride</Text>
          <Text style={styles.secondary}>Enter a city or neighborhood; no exact address is needed.</Text>
          <Field label="Origin" value={origin} onChangeText={setOrigin} placeholder="e.g. Toronto" error={formErrors.origin?.join(" ")} maxLength={100} />
          <Field label="Destination" value={destination} onChangeText={setDestination} placeholder="e.g. Brampton" error={formErrors.destination?.join(" ")} maxLength={100} />
          <Field label="Departure (local time)" value={departure} onChangeText={setDeparture} placeholder="YYYY-MM-DDTHH:mm" error={formErrors.departureTime?.join(" ")} />
          <Field label="Seat capacity" value={capacity} onChangeText={setCapacity} placeholder="1-8" error={formErrors.seatCapacity?.join(" ")} keyboardType="numeric" />
          <Text style={styles.secondary}>Departure is interpreted as {ZONE} and sent as an ISO timestamp.</Text>
          <Button label="Offer ride" disabled={busy} onPress={() => void submitRide()} />
        </View> : null}

        {!loading && data && tab === "activity" ? <>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Rides you offered</Text>
          {data.activity.offeredRides.length === 0
            ? <Text style={styles.empty}>You have not offered any rides yet.</Text>
            : data.activity.offeredRides.map((ride) => <RideCard
              key={ride.id}
              ride={ride}
              driverName={userNames.get(ride.driverId) ?? "You"}
              currentUserId={actorId}
              busy={busy}
              onCancel={ride.status === "ACTIVE" ? () => void runAction(async () => {
                const result = await client.cancelRide(ride.id, actorId);
                return `Ride cancelled. ${result.cancelledBookingIds.length} active booking(s) were cancelled.`;
              }) : undefined}
            />)}
          <Text accessibilityRole="header" style={styles.sectionTitle}>Your bookings</Text>
          {data.activity.bookings.length === 0
            ? <Text style={styles.empty}>You have no bookings yet.</Text>
            : data.activity.bookings.map((booking) => <View style={styles.card} key={booking.id}>
              <Text accessibilityRole="header" style={styles.cardTitle}>
                {booking.ride.origin} to {booking.ride.destination}
              </Text>
              <Text>{formatDeparture(booking.ride.departureTime)} ({ZONE})</Text>
              <Text>Booking status: {booking.status === "ACTIVE" ? "Active" : "Cancelled"}</Text>
              <Text>
                Driver: {userNames.get(booking.ride.driverId) ?? "Demo driver"} ·
                {" "}{booking.ride.remainingSeats} seat(s) currently available
              </Text>
              {booking.status === "ACTIVE" ? <Button
                label="Cancel booking"
                disabled={busy}
                onPress={() => void runAction(async () => {
                  const result = await client.cancelBooking(booking.id, actorId);
                  return `Booking cancelled. ${result.ride.remainingSeats} seat(s) are now available, as reported by the API.`;
                })}
              /> : null}
            </View>)}
        </> : null}

        {!loading && error ? <Button label="Retry" onPress={() => setRefreshVersion((version) => version + 1)} /> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, padding: 20, paddingTop: 32, paddingBottom: 48, backgroundColor: "#f4f4f1" },
  content: { width: "100%", maxWidth: 840, alignSelf: "center", gap: 16 },
  hero: { backgroundColor: "#192d2b", borderRadius: 24, padding: 26, gap: 10 },
  eyebrow: { color: "#b9e6d3", fontSize: 11, fontWeight: "800", letterSpacing: 1.6 },
  title: { color: "#ffffff", fontSize: 34, fontWeight: "800", letterSpacing: -1 },
  heroText: { color: "#e1eee8", fontSize: 16, lineHeight: 24 },
  disclaimer: { color: "#bfd1c8", fontSize: 12, lineHeight: 18, marginTop: 4 },
  section: { backgroundColor: "#ffffff", borderColor: "#e2e8e2", borderRadius: 18, borderWidth: 1, gap: 12, padding: 20 },
  sectionTitle: { color: "#1d332e", fontSize: 20, fontWeight: "700" },
  secondary: { color: "#586c63", lineHeight: 21 },
  row: { alignItems: "stretch", flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 6, backgroundColor: "#e7eee8", borderRadius: 16 },
  button: { alignItems: "center", backgroundColor: "#f3f7f3", borderColor: "#cbdacf", borderRadius: 12, borderWidth: 1, justifyContent: "center", minHeight: 44, paddingHorizontal: 16, paddingVertical: 9 },
  selectedButton: { backgroundColor: "#225a43", borderColor: "#225a43" },
  disabledButton: { opacity: 0.5 },
  pressedButton: { opacity: 0.75 },
  buttonText: { color: "#225a43", fontSize: 15, fontWeight: "700" },
  selectedButtonText: { color: "#ffffff" },
  field: { gap: 5 },
  label: { color: "#294238", fontWeight: "600" },
  input: { backgroundColor: "#fbfcfa", borderColor: "#bdcfc2", borderRadius: 10, borderWidth: 1, fontSize: 16, minHeight: 48, paddingHorizontal: 12, paddingVertical: 9 },
  fieldError: { color: "#9d1c1c" },
  card: { backgroundColor: "#ffffff", borderColor: "#dce7df", borderRadius: 18, borderWidth: 1, gap: 10, padding: 20 },
  cardTop: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8 },
  cardEyebrow: { color: "#698274", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  seatBadge: { backgroundColor: "#e7f4e9", color: "#225a43", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, fontSize: 12, fontWeight: "700", overflow: "hidden" },
  routeArrow: { color: "#468b66" },
  cardDetail: { color: "#40574b", lineHeight: 21 },
  listHeading: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8 },
  cardTitle: { color: "#1d332e", fontSize: 20, fontWeight: "700" },
  empty: { backgroundColor: "#ffffff", borderRadius: 14, color: "#586c63", padding: 20 },
  loading: { alignItems: "center", flexDirection: "row", gap: 10, paddingVertical: 8 },
  success: { backgroundColor: "#e6f4ea", borderRadius: 7, color: "#175b2b", padding: 12 },
  error: { backgroundColor: "#fdeaea", borderRadius: 7, color: "#8d1b1b", padding: 12 },
});
