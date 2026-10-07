export const logger = {
  info(event: string, details: Record<string, unknown> = {}) {
    console.log(JSON.stringify({ level: "info", event, time: new Date().toISOString(), ...details }));
  },
  error(event: string, details: Record<string, unknown> = {}) {
    console.error(JSON.stringify({ level: "error", event, time: new Date().toISOString(), ...details }));
  },
};
