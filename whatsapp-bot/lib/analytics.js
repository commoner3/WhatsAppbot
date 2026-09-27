// lib/analytics.js
// Dependency-free event logging for the analytics dashboard.
// Events are kept in memory and persisted to data/analytics.json (no database needed).

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'analytics.json');

let events = [];

function load() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      events = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    }
  } catch (err) {
    console.error('Could not load analytics data, starting fresh:', err);
    events = [];
  }
}
load();

function persist() {
  try {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(events));
  } catch (err) {
    console.error('Could not persist analytics data:', err);
  }
}

// type: 'message' | 'command'
function logEvent(type, { jid, isGroup, command } = {}) {
  events.push({
    type,
    jid: jid || null,
    isGroup: !!isGroup,
    command: command || null,
    timestamp: Date.now(),
  });

  // Keep the log from growing unbounded — trim anything older than 90 days, checked periodically
  if (events.length % 50 === 0) {
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    events = events.filter((e) => e.timestamp >= cutoff);
  }

  persist();
}

function dayKey(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 10); // YYYY-MM-DD
}

function getStats() {
  const messages = events.filter((e) => e.type === 'message');
  const commands = events.filter((e) => e.type === 'command');

  const uniqueUsers = new Set(messages.filter((e) => !e.isGroup && e.jid).map((e) => e.jid)).size;
  const uniqueGroups = new Set(messages.filter((e) => e.isGroup).map((e) => e.jid)).size;

  // Messages per day for the last 14 days
  const days = [];
  for (let i = 13; i >= 0; i -= 1) {
    days.push(dayKey(Date.now() - i * 24 * 60 * 60 * 1000));
  }
  const byDay = Object.fromEntries(days.map((d) => [d, 0]));
  messages.forEach((e) => {
    const key = dayKey(e.timestamp);
    if (key in byDay) byDay[key] += 1;
  });

  // Command usage counts
  const commandCounts = {};
  commands.forEach((e) => {
    commandCounts[e.command] = (commandCounts[e.command] || 0) + 1;
  });

  // Top 5 most active senders (by JID)
  const userCounts = {};
  messages.forEach((e) => {
    if (!e.jid) return;
    userCounts[e.jid] = (userCounts[e.jid] || 0) + 1;
  });
  const topUsers = Object.entries(userCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([jid, count]) => ({ jid, count }));

  return {
    totalMessages: messages.length,
    totalCommands: commands.length,
    uniqueUsers,
    uniqueGroups,
    messagesByDay: days.map((d) => ({ day: d, count: byDay[d] })),
    commandCounts,
    topUsers,
  };
}

module.exports = { logEvent, getStats };
