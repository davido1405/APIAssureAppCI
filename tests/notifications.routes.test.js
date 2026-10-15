const request = require("supertest");
const express = require("express");

jest.mock("../controllers/controller.notifications", () => ({
  getToutesLesNotifications: jest.fn((req, res) => res.status(200).json({ success: true })),
  LireNotification: jest.fn((req, res) => res.status(200).json({ success: true })),
  supprimerNotification: jest.fn((req, res) => res.status(200).json({ success: true })),
}));

const routesNotifications = require("../routes/routes.notifications");

describe("Notifications routes", () => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use("/api/notifications", routesNotifications);

  it("GET / responds", async () => {
    const res = await request(app).get("/api/notifications");
    expect(res.status).toBe(200);
  });
  it("PUT /lireNotifications responds", async () => {
    const res = await request(app).put("/api/notifications/lireNotifications").send({ code_utilisateur: "U1" });
    expect(res.status).toBe(200);
  });
  it("DELETE /supprimerNotification responds", async () => {
    const res = await request(app).delete("/api/notifications/supprimerNotification").send({ code_utilisateur: "U1" });
    expect(res.status).toBe(200);
  });
});
