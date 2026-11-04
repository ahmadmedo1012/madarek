/**
 * R334 B8 — the connectivity layer under a controlled NetInfo mock:
 * the useNetworkStatus subscription (resolve + transitions) and the
 * NetworkBanner seats (offline / «عاد الاتصال») + the onlineManager
 * bridge that makes queries pause while offline.
 *
 * NOTE (React 19 + RNTL 14): every post-render state push runs through
 * `await act(async () => …)` — the module-scope NetInfo mock dispatches
 * synchronously into a still-open act scope otherwise.
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Text } from "react-native";
import { render, waitFor, act } from "@testing-library/react-native";
import { onlineManager } from "@tanstack/react-query";
import { NetworkBanner, useNetworkStatus } from "../network";
import * as NetInfoModule from "@react-native-community/netinfo";

/* ── the controlled NetInfo mock ─────────────────────────────────────── */

type MockState = { isConnected: boolean; isInternetReachable: boolean; type: string };
type MockListener = (s: MockState) => void;

jest.mock("@react-native-community/netinfo", () => {
  // Real NetInfo supports MULTIPLE simultaneous listeners — <NetworkBanner/>
  // registers two (the status hook + the onlineManager bridge), so the mock
  // must be a set, not a single slot.
  const listeners = new Set<MockListener>();
  let current: MockState = { isConnected: true, isInternetReachable: true, type: "wifi" };
  return {
    __esModule: true,
    addEventListener: jest.fn((cb: MockListener) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    }),
    fetch: jest.fn(() => Promise.resolve(current)),
    __setState: (patch: Partial<MockState>) => {
      current = { ...current, ...patch };
      listeners.forEach((l) => l(current));
    },
  };
});

const NetInfoMock = NetInfoModule as unknown as {
  __setState: (patch: Partial<MockState>) => void;
};

/** A probe rendering the hook's resolved state as text. */
function Probe() {
  const s = useNetworkStatus();
  return <Text>{`${s.isOnline}|${s.isResolved}|${s.type}`}</Text>;
}

beforeEach(() => {
  jest.clearAllMocks();
  NetInfoMock.__setState({ isConnected: true, isInternetReachable: true, type: "wifi" });
});

describe("useNetworkStatus", () => {
  it("resolves online via fetch — no false offline flash at cold start", async () => {
    const { getByText } = await render(<Probe />);
    await waitFor(() => getByText("true|true|wifi"));
  });

  it("goes offline when connectivity drops (isConnected false)", async () => {
    const { getByText } = await render(<Probe />);
    await waitFor(() => getByText("true|true|wifi"));
    await act(async () => {
      NetInfoMock.__setState({ isConnected: false });
    });
    await waitFor(() => getByText("false|true|wifi"));
  });

  it("treats unreachable internet as offline even when a link exists", async () => {
    const { getByText } = await render(<Probe />);
    await waitFor(() => getByText("true|true|wifi"));
    await act(async () => {
      NetInfoMock.__setState({ isInternetReachable: false });
    });
    await waitFor(() => getByText("false|true|wifi"));
  });
});

describe("NetworkBanner", () => {
  it("renders nothing while online", async () => {
    const { toJSON } = await render(<NetworkBanner />);
    await waitFor(() => {
      /* let connectivity resolve */
    });
    expect(toJSON()).toBeNull();
  });

  it("shows the offline banner with the auto-retry promise", async () => {
    const { getByText, toJSON } = await render(<NetworkBanner />);
    await act(async () => {
      NetInfoMock.__setState({ isConnected: false });
    });
    await waitFor(() => getByText("لا يوجد اتصال بالإنترنت — سيتم إعادة المحاولة تلقائيًا"));
    expect(toJSON()).not.toBeNull();
  });

  it("flashes «عاد الاتصال» when the connection returns", async () => {
    const { getByText, queryByText } = await render(<NetworkBanner />);
    await act(async () => {
      NetInfoMock.__setState({ isConnected: false });
    });
    await waitFor(() => getByText(/لا يوجد اتصال بالإنترنت/));
    await act(async () => {
      NetInfoMock.__setState({ isConnected: true });
    });
    await waitFor(() => getByText("عاد الاتصال"));
    expect(queryByText(/سيتم إعادة المحاولة تلقائيًا/)).toBeNull();
  });

  it("bridges NetInfo into TanStack onlineManager (queries pause offline)", async () => {
    const setOnline = jest.spyOn(onlineManager, "setOnline");
    await render(<NetworkBanner />);
    await act(async () => {
      NetInfoMock.__setState({ isConnected: false });
    });
    await waitFor(() => expect(setOnline).toHaveBeenCalledWith(false));
    await act(async () => {
      NetInfoMock.__setState({ isConnected: true });
    });
    await waitFor(() => expect(setOnline).toHaveBeenCalledWith(true));
    setOnline.mockRestore();
  });
});
