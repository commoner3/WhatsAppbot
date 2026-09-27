// lib/broadcast.js
// Lets the bot owner(s) — numbers listed in OWNER_NUMBERS — send an announcement to
// every group the bot is currently in.

function isOwner(jid) {
  const owners = (process.env.OWNER_NUMBERS || '')
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);
  const number = jid.split('@')[0];
  return owners.includes(number);
}

async function handleBroadcast(sock, msg, text) {
  const replyJid = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (!isOwner(sender)) {
    await sock.sendMessage(replyJid, { text: 'Only the bot owner can broadcast.' });
    return;
  }

  if (!text) {
    await sock.sendMessage(replyJid, { text: 'Usage: !broadcast <message>' });
    return;
  }

  const groups = await sock.groupFetchAllParticipating();
  const groupIds = Object.keys(groups);

  let sent = 0;
  for (const gid of groupIds) {
    try {
      await sock.sendMessage(gid, { text: `📢 Announcement:\n${text}` });
      sent += 1;
    } catch (err) {
      console.error(`Broadcast failed for ${gid}:`, err);
    }
  }

  await sock.sendMessage(replyJid, { text: `Broadcast sent to ${sent}/${groupIds.length} groups.` });
}

module.exports = { handleBroadcast, isOwner };
