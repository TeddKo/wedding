import { app } from "./app";
import { sweep } from "./cron";
import type { Env } from "./env";

export default {
  fetch: app.fetch,
  scheduled: async (_c: ScheduledController, env: Env) => {
    await sweep(env);
  },
} satisfies ExportedHandler<Env>;
