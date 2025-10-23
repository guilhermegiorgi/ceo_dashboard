const { act, renderHook, waitFor } = require("@testing-library/react");
const { useBrainCloudEvents } = require("../useBrainCloudEvents");

class MockEventSource {
  static instances = [];

  constructor(url, init) {
    this.url = url;
    this.withCredentials = Boolean(init && init.withCredentials);
    this.listeners = new Map();
    this.onmessage = null;
    this.onerror = null;
    MockEventSource.instances.push(this);
  }

  addEventListener(type, listener) {
    const entry = this.listeners.get(type) || new Set();
    entry.add(listener);
    this.listeners.set(type, entry);
  }

  removeEventListener(type, listener) {
    const entry = this.listeners.get(type);
    if (!entry) return;
    entry.delete(listener);
    if (entry.size === 0) {
      this.listeners.delete(type);
    }
  }

  close() {
    this.listeners.clear();
  }

  emit(type, payload) {
    const entry = this.listeners.get(type);
    if (!entry) return;
    entry.forEach((listener) => {
      listener(payload ? { data: JSON.stringify(payload) } : {});
    });
  }

  emitError() {
    if (this.onerror) {
      this.onerror();
    }
  }

  static reset() {
    MockEventSource.instances = [];
  }
}

describe("useBrainCloudEvents", () => {
  beforeEach(() => {
    MockEventSource.reset();
    // @ts-expect-error override EventSource for tests
    global.EventSource = MockEventSource;
  });

  afterEach(() => {
    // @ts-expect-error cleanup mock EventSource
    delete global.EventSource;
  });

  it("should open SSE connection when enabled", async () => {
    const { result } = renderHook(() => useBrainCloudEvents());

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));
    const source = MockEventSource.instances[0];
    expect(source.url).toBe("/api/brain/events");
    expect(source.withCredentials).toBe(true);

    await act(async () => {
      source.emit("open");
    });

    await waitFor(() => expect(result.current.connected).toBe(true));
  });

  it("should append incoming events to state", async () => {
    const { result } = renderHook(() => useBrainCloudEvents());
    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));
    const source = MockEventSource.instances[0];

    const payload = {
      type: "task:created",
      timestamp: new Date().toISOString(),
      title: "Test task",
    };

    await act(async () => {
      source.emit("task:created", payload);
    });

    await waitFor(() => expect(result.current.events).toHaveLength(1));
    expect(result.current.lastEvent).toMatchObject(payload);
  });

  it("should invoke onEvent callback", async () => {
    const onEvent = jest.fn();
    renderHook(() => useBrainCloudEvents({ onEvent }));
    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));
    const source = MockEventSource.instances[0];

    const payload = {
      type: "note:updated",
      timestamp: new Date().toISOString(),
      title: "Meeting notes",
    };

    await act(async () => {
      source.emit("note:updated", payload);
    });

    await waitFor(() => expect(onEvent).toHaveBeenCalled());
    expect(onEvent.mock.calls[0][0]).toMatchObject(payload);
  });

  it("should clear events with clear()", async () => {
    const { result } = renderHook(() => useBrainCloudEvents());
    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));
    const source = MockEventSource.instances[0];

    const payload = {
      type: "conversation:saved",
      timestamp: new Date().toISOString(),
      conversationId: "abc123",
    };

    await act(async () => {
      source.emit("conversation:saved", payload);
    });

    await waitFor(() => expect(result.current.events).toHaveLength(1));

    act(() => {
      result.current.clear();
    });

    expect(result.current.events).toHaveLength(0);
    expect(result.current.lastEvent).toBeNull();
  });

  it("should attempt reconnection after errors when allowed", async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() =>
      useBrainCloudEvents({ reconnectInterval: 1000 })
    );

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));
    const source = MockEventSource.instances[0];

    act(() => {
      source.emitError();
    });

    expect(result.current.connected).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(MockEventSource.instances).toHaveLength(1);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(2));
    jest.useRealTimers();
  });

  it("should not reconnect when reconnect=false", async () => {
    jest.useFakeTimers();
    renderHook(() => useBrainCloudEvents({ reconnect: false }));
    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));
    const source = MockEventSource.instances[0];

    act(() => {
      source.emitError();
    });

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(MockEventSource.instances).toHaveLength(1);
    jest.useRealTimers();
  });

  it("respects enabled flag", async () => {
    const { rerender } = renderHook(
      ({ enabled }) => useBrainCloudEvents({ enabled }),
      { initialProps: { enabled: false } }
    );

    expect(MockEventSource.instances).toHaveLength(0);

    rerender({ enabled: true });

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));
  });
});
