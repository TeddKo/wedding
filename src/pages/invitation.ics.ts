import type { APIRoute } from "astro";
import { wedding } from "../data/wedding";
import { icsUtc, venueLine } from "../lib/format";

const esc = (s: string) => s.replace(/[\\;,]/g, "\\$&").replace(/\n/g, "\\n");

export const GET: APIRoute = () => {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//wedding//invitation//KO",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:wedding-${wedding.date}@teddko.github.io`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `DTSTART:${icsUtc(0)}`,
    `DTEND:${icsUtc(wedding.durationMinutes)}`,
    `SUMMARY:${esc(`${wedding.groom} ♥ ${wedding.bride} 결혼식`)}`,
    `LOCATION:${esc(`${venueLine} ${wedding.venue.address}`.trim())}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: { "Content-Type": "text/calendar; charset=utf-8" },
  });
};
