# WhatsApp Bot (Baileys)

A WhatsApp bot built with [Baileys](https://github.com/WhiskeySockets/Baileys), with group
management, media saving, games, AI chat, and a web page for linking your number.

## Setup

```bash
npm install
cp .env.example .env   # then fill in ANTHROPIC_API_KEY if you want AI features
npm start
```

By default the bot uses the **pairing-code** flow: it starts a small web server (at
`http://localhost:3000` locally) where you enter your phone number (with country code) and get
back an 8-character code to enter in WhatsApp under **Settings → Linked Devices → Link a device →
Link with phone number instead**.

To use QR scanning in the terminal instead, open `index.js` and set:

```js
const USE_PAIRING_CODE = false;
```

Your session is saved to `./auth_info/` so you won't need to link again on future runs, unless you
delete that folder or unlink from your phone.

## Bot profile picture

Drop an image at `data/profile.jpg` before starting the bot. On the first successful connection,
it's set as the linked account's WhatsApp profile picture automatically (only once — delete
`data/.profile-set` if you want it to re-apply after changing the image).

## Commands

**General**
- `!ping` — test the bot
- `!help` — list commands

**Group management** (sender must be a group admin, unless noted)
- `!kick` — reply to or @mention a member to remove them
- `!add <phone_number>` — add a member by number (with country code, digits only)
- `!promote` / `!demote` — reply to or @mention a member to change admin status
- `!tagall [message]` — mention every member of the group in one message
- `!vcf` — export every group member as a single `.vcf` contact file (handy for bulk-saving
  numbers so you can see their WhatsApp Status updates, since WhatsApp only shows Status from
  saved contacts)
- `!broadcast <message>` — **owner only** (numbers listed in `OWNER_NUMBERS` in `.env`), sends an
  announcement to every group the bot is currently in

There's also a **warn-then-kick rule** built in (`lib/groupManager.js` → `autoModerate`): any
non-admin who posts a WhatsApp group invite link gets 2 warnings, then is removed on the 3rd
(persisted to `data/warnings.json`, so counts survive a restart). Swap the condition or the warning
threshold for whatever behavior you actually want to police.

The bot also **greets new members and says goodbye when someone leaves** (`lib/greetings.js`) —
no command needed, it reacts to WhatsApp's own group-membership events.

**Anti-delete**: if someone deletes a text message "for everyone", the bot reposts what it said
(`lib/antidelete.js`). It only re-sends text — media isn't cached, to avoid holding every
attachment in memory.

**Media**
- `!save` — reply to a photo/video/voice note/sticker to save it to `data/media/` on the server

This saves media that's shared *in the chat*. It does not fetch music or videos from YouTube,
Spotify, or similar — pulling copyrighted media from those platforms breaks their terms of service
and copyright law, so that's intentionally not included.

**Games**
- `!numguess` — starts a 1–100 number-guessing game (7 tries)
- `!guess <number>` — make a guess
- `!rps rock|paper|scissors` — play rock-paper-scissors

**AI & language** (needs `ANTHROPIC_API_KEY` in `.env` — get one at https://console.anthropic.com)
- `!ai <message>` — chat with the AI (short, casual replies tuned for a chat app)
- `!joke` — get an AI-generated joke
- `!lang <language>` — set the reply language for `!ai`/`!joke` in this chat. Supported:
  `english`, `twi`, `ga`, `ewe`, `fante`, `dagbani`, `hausa`, `dagaare`, `nzema`, `pidgin`
  (Ghanaian Pidgin English). Run `!lang` with no argument to see the current setting.
- `!translate <language> <text>` — one-off translation into any of the languages above

Each user gets a 10-second cooldown across `!ai`/`!joke`/`!translate` (`lib/ratelimit.js`), so one
person can't burn through your API budget or spam the bot. Adjust `AI_COOLDOWN_MS` in `index.js` if
you want it looser or stricter.

`lib/ai.js` is a small wrapper around the Anthropic API — extend it for things like per-chat
conversation memory or a custom persona by editing the system prompt. Add more languages by adding
them to `SUPPORTED_LANGUAGES` in `lib/language.js`. Language preferences are persisted to
`data/languages.json`, so they survive a restart.

## Analytics dashboard

Every incoming message and command is logged (no database needed — it's a flat JSON file at
`data/analytics.json`, capped to the last 90 days). View the dashboard at `/dashboard.html`
(linked from the pairing page) for:
- Total messages, commands run, active users, active groups
- A 14-day message volume chart
- A command usage breakdown
- A table of the most active senders

The raw numbers are also available as JSON at `/api/stats` if you want to pull them into something
else. To log more than messages/commands (e.g. errors, game outcomes), call `logEvent(type, data)`
from `lib/analytics.js` anywhere in the codebase.

## Tests

```bash
npm test
```

Runs Node's built-in test runner (`node --test`, no extra dependency needed) over `test/`. Covers
the pure logic that doesn't need a live WhatsApp connection: game rules, language validation, and
vCard building. Add more `*.test.js` files under `test/` following the same pattern as you add
features.

## Project structure

```
index.js                  — connects to WhatsApp, routes commands
lib/groupManager.js       — kick/add/promote/demote/tagall + warn-then-kick rule
lib/greetings.js          — welcome/goodbye messages on group join/leave
lib/antidelete.js         — reposts deleted text messages
lib/broadcast.js          — !broadcast to every group (owner only)
lib/ratelimit.js          — per-user cooldown for AI commands
lib/media.js              — saving media to disk
lib/games.js              — number guessing, rock-paper-scissors
lib/ai.js                 — Anthropic API wrapper for !ai / !joke / !translate
lib/language.js           — per-chat language preference (English + Ghanaian languages)
lib/vcf.js                — !vcf group contact export
lib/analytics.js          — event logging + stats for the dashboard
lib/profile.js            — sets the bot's profile picture on first connect
lib/store.js              — generic JSON-file key/value store used by language/warnings
web/server.js             — Express server for the pairing page + /api/stats
web/public/index.html     — pairing page UI
web/public/dashboard.html — analytics dashboard UI
test/                     — unit tests (games, language, vcf) — run with `npm test`
data/media/               — saved media lands here
data/analytics.json       — logged events (auto-created)
data/languages.json       — per-chat language preferences (auto-created)
data/warnings.json        — per-chat warning counts (auto-created)
data/profile.jpg          — put your bot's picture here (not included)
auth_info/                — WhatsApp session credentials (do not commit)
.env                      — your API key and config (not committed — see .env.example)
```

## Deploying

**In a terminal (keep it running after you disconnect)**
```bash
npm install -g pm2
pm2 start index.js --name whatsapp-bot
pm2 logs whatsapp-bot   # view logs
pm2 save && pm2 startup # optional: survive server reboots
```
Or plain `nohup node index.js &` if you don't want to install anything extra.

**With Docker (works on most cloud platforms)**
```bash
docker build -t whatsapp-bot .
docker run -d -p 3000:3000 \
  -v $(pwd)/auth_info:/app/auth_info \
  -v $(pwd)/data:/app/data \
  --env-file .env \
  --name whatsapp-bot whatsapp-bot
```
The volume mounts matter: without them, your WhatsApp session and saved media disappear every time
the container restarts or redeploys.

**On a platform like Railway, Render, or Fly.io**
1. Push this project to a Git repo and connect it — most of these platforms auto-detect the
   `Dockerfile`.
2. Set `ANTHROPIC_API_KEY`, `OWNER_NUMBERS` (for `!broadcast`), and `CLAUDE_MODEL` if you want to
   override it, as environment variables in the platform's dashboard — never commit `.env`.
3. Attach a **persistent volume** mounted at `/app/auth_info` (and `/app/data` if you want saved
   media/profile picture to survive redeploys). Most of these platforms have ephemeral filesystems
   by default, so without a volume you'll have to re-link your WhatsApp number on every deploy.
4. The pairing page needs to be reachable to link your number the first time — expose the port the
   platform assigns via the `PORT` env var (already wired up in `web/server.js`).

**Rate limits / bans**: WhatsApp can flag automated accounts, especially ones auto-kicking or
auto-adding members. Test with a secondary number, not your primary one.

## Contact / credits

Built by **Hawking Tec**.
- Contact: 233542625388
- Follow the Hawking Tec WhatsApp channel: https://whatsapp.com/channel/0029Vb8pMKh5q08fyglEMA0i

## Notes

Baileys is an unofficial library reverse-engineered from WhatsApp Web — it's widely used but not
supported by WhatsApp/Meta, and functionality can break when WhatsApp changes its protocol.
