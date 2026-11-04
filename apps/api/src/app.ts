import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { ORIGIN } from "@wedding/shared";
import type { AppEnv, Env } from "./env";
import { fail, onError } from "./errors";
import { auth } from "./routes/auth";
import { entries } from "./routes/entries";
import { images } from "./routes/images";
import { photos } from "./routes/photos";
import { poll } from "./routes/poll";

const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1):\d{1,5}$/;

export const allowedOrigin = (o: string, env: Env) => (o === ORIGIN || (env.ALLOW_LOCAL === "1" && LOCAL_ORIGIN.test(o)) ? o : null);

export const app = new Hono<AppEnv>({ strict: false })
  .use(async (c, next) => {
    await next();
    if (!c.res.headers.has("Cache-Control")) c.header("Cache-Control", "no-store");
  })
  .use(
    secureHeaders({
      crossOriginResourcePolicy: "cross-origin",
      crossOriginOpenerPolicy: false,
      contentSecurityPolicy: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], sandbox: [] },
      permissionsPolicy: { camera: [], microphone: [], geolocation: [] },
    }),
  )
  .use(
    cors({
      origin: (o, c) => allowedOrigin(o, c.env),
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "X-Device", "Authorization"],
      maxAge: 86400,
    }),
  )
  .route("/", entries)
  .route("/", photos)
  .route("/", images)
  .route("/", poll)
  .route("/", auth)
  .notFound(() => fail(404, "not found"))
  .onError(onError);
