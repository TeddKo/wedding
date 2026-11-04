import type { PhotoExt } from "@wedding/shared";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const entries = sqliteTable(
  "entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    message: text("message").notNull(),
    pwHash: text("pw_hash").notNull(),
    salt: text("salt").notNull(),
    ipHash: text("ip_hash"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("idx_entries_created").on(t.createdAt, t.id), index("idx_entries_ip").on(t.ipHash, t.createdAt)],
);

export const photos = sqliteTable(
  "photos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    uuid: text("uuid").notNull().unique(),
    ext: text("ext").$type<PhotoExt>().notNull(),
    w: integer("w"),
    h: integer("h"),
    size: integer("size"),
    pwHash: text("pw_hash"),
    salt: text("salt"),
    ipHash: text("ip_hash").notNull(),
    deviceId: text("device_id"),
    hidden: integer("hidden").notNull().default(0),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("photos_ip").on(t.ipHash, t.createdAt), index("photos_created").on(t.hidden, t.createdAt), index("photos_device").on(t.deviceId)],
);

export const pollOptions = sqliteTable(
  "poll_options",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    text: text("text").notNull(),
    norm: text("norm").notNull().unique(),
    creatorKey: text("creator_key").notNull(),
    ipHash: text("ip_hash").notNull(),
    createdAt: integer("created_at").notNull(),
    hidden: integer("hidden").notNull().default(0),
  },
  (t) => [index("poll_options_ip").on(t.ipHash, t.createdAt)],
);

export const pollVotes = sqliteTable(
  "poll_votes",
  {
    voterKey: text("voter_key").primaryKey(),
    optionId: integer("option_id")
      .notNull()
      .references(() => pollOptions.id, { onDelete: "cascade" }),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("poll_votes_option").on(t.optionId)],
);

export const uploads = sqliteTable(
  "uploads",
  {
    uuid: text("uuid").primaryKey(),
    ext: text("ext").$type<PhotoExt>().notNull(),
    ipHash: text("ip_hash").notNull(),
    deviceId: text("device_id"),
    fw: integer("fw"),
    fh: integer("fh"),
    tw: integer("tw"),
    th: integer("th"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("uploads_ip").on(t.ipHash, t.createdAt), index("uploads_device").on(t.deviceId), index("uploads_created").on(t.createdAt)],
);

export const pwFails = sqliteTable(
  "pw_fails",
  {
    ipHash: text("ip_hash").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("pw_fails_ip").on(t.ipHash, t.createdAt)],
);
