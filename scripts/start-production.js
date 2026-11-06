// Operational mode uses the same database and disables demo reset server-side.
process.env.ABC_DEMO_MODE = "false";
await import("../server/index.js");
