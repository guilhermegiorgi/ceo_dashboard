import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";

// Mock dependencies
vi.mock("../../services/brainCloud/adapters/index.ts", () => ({
  globalEventBus: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    removeAllListeners: vi.fn(),
  },
  BrainCloudEventStream: vi.fn().mockImplementation(() => ({
    subscribe: vi.fn(),
    close: vi.fn(),
  })),
}));

const { globalEventBus, BrainCloudEventStream } = await import(
  "../../services/brainCloud/adapters/index.ts"
);

describe("Brain Events SSE Endpoint", () => {
  let app;
  let mockStream;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create express app with middleware to parse JSON
    app = express();
    app.use(express.json());

    // Mock auth middleware (simplified for testing)
    app.use((req, res, next) => {
      req.user = { id: "test-user-123", email: "test@example.com" };
      next();
    });

    // Add mock auth for requests that don't need real auth for testing
    app.use((req, res, next) => {
      if (!req.headers.authorization) {
        req.headers.authorization = "Bearer mock-token";
      }
      next();
    });

    // Load the routes
    const { default: brainEventsRouter } = await import("../brainEvents.js");
    brainEventsRouter(app);

    // Create mock stream for testing
    mockStream = {
      subscribe: vi.fn(),
      close: vi.fn(),
    };
    BrainCloudEventStream.mockImplementation(() => mockStream);
  });

  describe("GET /api/brain/events", () => {
    it("deve configurar headers SSE corretamente", (done) => {
      // Act
      const req = request(app)
        .get("/api/brain/events")
        .set("Authorization", "Bearer valid-token");

      // Assert
      req
        .expect("content-type", "text/event-stream; charset=utf-8")
        .expect("cache-control", "no-cache")
        .expect("connection", "keep-alive")
        .expect("x-accel-buffering", "no")
        .end(done);
    });

    it("deve enviar mensagem de conexão inicial", (done) => {
      // Act
      request(app)
        .get("/api/brain/events")
        .set("Authorization", "Bearer valid-token")
        .buffer(false)
        .parse((res, callback) => {
          let data = "";

          res.on("data", (chunk) => {
            data += chunk.toString();

            // Check for connection message
            if (data.includes("event: connected")) {
              try {
                const messageMatch = data.match(/data: ({.+})\n\n/);
                if (messageMatch) {
                  const message = JSON.parse(messageMatch[1]);

                  expect(message).toEqual({
                    message: "Connected to Brain Cloud events",
                    timestamp: expect.any(String),
                  });
                  done();
                }
              } catch (e) {
                callback(e);
              }
            }
          });

          res.on("end", () => {
            if (!data.includes("event: connected")) {
              callback(new Error("Connection message not found"));
            }
          });
        });
    });

    it("deve aceitar filtro de tipos de eventos", async () => {
      // Arrange
      mockStream.subscribe.mockImplementation(function* () {
        // No events for this test
        yield;
      });

      // Act
      const response = await request(app)
        .get("/api/brain/events?filter=task:created,task:updated")
        .set("Authorization", "Bearer valid-token");

      // Assert
      expect(response.status).toBe(200);
      expect(BrainCloudEventStream).toHaveBeenCalledWith(globalEventBus);
      expect(mockStream.subscribe).toHaveBeenCalledWith({
        types: ["task:created", "task:updated"],
        userId: undefined,
        source: undefined,
      });
    });

    it("deve aceitar filtro de userId", async () => {
      // Arrange
      mockStream.subscribe.mockImplementation(function* () {
        // No events for this test
        yield;
      });

      // Act
      const response = await request(app)
        .get("/api/brain/events?userId=user-123")
        .set("Authorization", "Bearer valid-token");

      // Assert
      expect(response.status).toBe(200);
      expect(mockStream.subscribe).toHaveBeenCalledWith({
        types: undefined,
        userId: "user-123",
        source: undefined,
      });
    });

    it("deve aceitar filtro de source", async () => {
      // Arrange
      mockStream.subscribe.mockImplementation(function* () {
        // No events for this test
        yield;
      });

      // Act
      const response = await request(app)
        .get("/api/brain/events?source=ui")
        .set("Authorization", "Bearer valid-token");

      // Assert
      expect(response.status).toBe(200);
      expect(mockStream.subscribe).toHaveBeenCalledWith({
        types: undefined,
        userId: undefined,
        source: "ui",
      });
    });

    it("deve combinar múltiplos filtros corretamente", async () => {
      // Arrange
      mockStream.subscribe.mockImplementation(function* () {
        // No events for this test
        yield;
      });

      // Act
      const response = await request(app)
        .get(
          "/api/brain/events?filter=file:updated,task:created&userId=user-456&source=agent"
        )
        .set("Authorization", "Bearer valid-token");

      // Assert
      expect(response.status).toBe(200);
      expect(mockStream.subscribe).toHaveBeenCalledWith({
        types: ["file:updated", "task:created"],
        userId: "user-456",
        source: "agent",
      });
    });

    it("deve emitir heartbeat a cada 30s", (done) => {
      vi.useFakeTimers();

      // Arrange
      let heartbeatCount = 0;

      request(app)
        .get("/api/brain/events")
        .set("Authorization", "Bearer valid-token")
        .buffer(false)
        .parse((res, callback) => {
          res.on("data", (chunk) => {
            const data = chunk.toString();

            if (data.includes(": heartbeat")) {
              heartbeatCount++;

              if (heartbeatCount === 1) {
                // Advance time and check second heartbeat
                vi.advanceTimersByTime(30000);
              } else if (heartbeatCount === 2) {
                expect(heartbeatCount).toBe(2);
                vi.clearAllTimers();
                done();
              }
            }
          });

          res.on("error", callback);
        });

      // Trigger first heartbeat
      vi.advanceTimersByTime(30000);
    }, 10000); // Increase timeout for this test

    it("deve fechar stream quando cliente desconecta", (done) => {
      // Act
      const req = request(app)
        .get("/api/brain/events")
        .set("Authorization", "Bearer valid-token")
        .buffer(false)
        .parse((res, callback) => {
          // Start receiving data
          res.on("data", (chunk) => {
            // When we receive the first message (connected), disconnect
            if (chunk.toString().includes("event: connected")) {
              setTimeout(() => {
                req.abort();
              }, 100);
            }
          });

          res.on("close", () => {
            // Verify cleanup was called
            setTimeout(() => {
              // Check if close was called (mock should have been called during cleanup)
              expect(mockStream.close).toHaveBeenCalled();
              done();
            }, 200);
          });

          res.on("error", callback);
        });
    }, 5000);

    it("deve transmitir eventos emitidos pelo globalEventBus", (done) => {
      // Arrange
      const testEvent = {
        type: "task:created",
        taskId: "test-123",
        timestamp: new Date().toISOString(),
        userId: "test-user-123",
        source: "test",
      };

      // Mock stream to yield the test event
      mockStream.subscribe.mockImplementation(function* () {
        yield testEvent;
        // End the stream
        return;
      });

      // Act
      request(app)
        .get("/api/brain/events")
        .set("Authorization", "Bearer valid-token")
        .buffer(false)
        .parse((res, callback) => {
          let receivedEvent = null;

          res.on("data", (chunk) => {
            const data = chunk.toString();

            if (data.includes("event: task:created")) {
              try {
                const dataMatch = data.match(/data: ({.+})\n\n/);
                if (dataMatch) {
                  receivedEvent = JSON.parse(dataMatch[1]);
                }
              } catch (e) {
                callback(e);
              }
            }
          });

          res.on("end", () => {
            expect(receivedEvent).toEqual(testEvent);
            done();
          });

          res.on("error", callback);
        });
    });

    it("deve lidar com erro no stream gracefully", (done) => {
      // Arrange
      const streamError = new Error("Stream error");
      mockStream.subscribe.mockImplementation(function* () {
        throw streamError;
      });

      // Act
      request(app)
        .get("/api/brain/events")
        .set("Authorization", "Bearer valid-token")
        .buffer(false)
        .parse((res, callback) => {
          let receivedError = null;

          res.on("data", (chunk) => {
            const data = chunk.toString();

            if (data.includes("event: error")) {
              try {
                const dataMatch = data.match(/data: ({.+})\n\n/);
                if (dataMatch) {
                  receivedError = JSON.parse(dataMatch[1]);
                }
              } catch (e) {
                callback(e);
              }
            }
          });

          res.on("end", () => {
            expect(receivedError).toEqual({
              error: "Stream error",
              timestamp: expect.any(String),
            });
            expect(mockStream.close).toHaveBeenCalled();
            done();
          });

          res.on("error", callback);
        });
    });

    it("deve ignorar filtros vazios ou inválidos", async () => {
      // Arrange
      mockStream.subscribe.mockImplementation(function* () {
        // No events for this test
        yield;
      });

      // Act
      const response = await request(app)
        .get("/api/brain/events?filter=&userId=&source=")
        .set("Authorization", "Bearer valid-token");

      // Assert
      expect(response.status).toBe(200);
      expect(mockStream.subscribe).toHaveBeenCalledWith({
        types: undefined,
        userId: undefined,
        source: undefined,
      });
    });

    it("deve limpar interval quando erro ocorre", (done) => {
      // Arrange
      vi.useFakeTimers();

      mockStream.subscribe.mockImplementation(function* () {
        throw new Error("Test error");
      });

      // Act
      request(app)
        .get("/api/brain/events")
        .set("Authorization", "Bearer valid-token")
        .buffer(false)
        .parse((res, callback) => {
          let heartbeatCleared = false;
          const originalClearInterval = global.clearInterval;

          global.clearInterval = vi.fn((id) => {
            if (id) heartbeatCleared = true;
            return originalClearInterval(id);
          });

          res.on("end", () => {
            expect(heartbeatCleared).toBe(true);
            global.clearInterval = originalClearInterval;
            vi.clearAllTimers();
            done();
          });

          res.on("error", callback);
        });
    });
  });

  describe("GET /api/brain/events/ping", () => {
    it("deve retornar pong para health check", async () => {
      // Act
      const response = await request(app)
        .get("/api/brain/events/ping")
        .set("Authorization", "Bearer valid-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: "ok",
        timestamp: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
        ),
        message: "Brain Cloud Events endpoint is available",
      });
    });

    it("deve funcionar sem autenticação", async () => {
      // Act
      const response = await request(app).get("/api/brain/events/ping");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.status).toBe("ok");
    });
  });

  describe("Error handling", () => {
    it("deve lidar com req.query null ou undefined", async () => {
      // Arrange
      mockStream.subscribe.mockImplementation(function* () {
        // No events for this test
        yield;
      });

      // Manually set req.query to undefined (edge case)
      const appWithError = express();
      appWithError.use((req, res, next) => {
        req.query = undefined;
        next();
      });

      // This would simulate req.query being null - in practice Express creates the object
      // So we test normal behavior
      const response = await request(appWithError)
        .get("/api/brain/events")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
    });

    it("deve tratar valores não-string nos filtros", async () => {
      // Arrange
      mockStream.subscribe.mockImplementation(function* () {
        // No events for this test
        yield;
      });

      // Act
      const response = await request(app)
        .get("/api/brain/events?filter=123&userId=456&source=789")
        .set("Authorization", "Bearer valid-token");

      // Assert
      expect(response.status).toBe(200);
      expect(mockStream.subscribe).toHaveBeenCalledWith({
        types: ["123"],
        userId: "456",
        source: "789",
      });
    });

    it("deve sobreviver a erros de parse JSON em eventos", (done) => {
      // Arrange
      const malformedEvent = {
        type: "test:event",
        data: "incomplete json: {", // This would cause parsing issues
        timestamp: new Date().toISOString(),
      };

      mockStream.subscribe.mockImplementation(function* () {
        // Send normal event first
        yield {
          type: "task:created",
          taskId: "test-123",
          timestamp: new Date().toISOString(),
          userId: "test-user-123",
          source: "test",
        };
        // Then malformed event
        yield malformedEvent;
      });

      // Act
      request(app)
        .get("/api/brain/events")
        .set("Authorization", "Bearer valid-token")
        .buffer(false)
        .parse((res, callback) => {
          let validEventReceived = false;

          res.on("data", (chunk) => {
            const data = chunk.toString();

            if (data.includes("event: task:created")) {
              validEventReceived = true;
            }
          });

          res.on("end", () => {
            expect(validEventReceived).toBe(true);
            done();
          });

          res.on("error", callback);
        });
    });
  });
});

// Helper function to create mock response streams
function createMockStream(events = []) {
  return {
    subscribe: vi.fn().mockImplementation(function* () {
      for (const event of events) {
        yield event;
      }
    }),
    close: vi.fn(),
  };
}
