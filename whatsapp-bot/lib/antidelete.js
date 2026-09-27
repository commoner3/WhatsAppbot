// lib/antidelete.js
// Keeps a small in-memory cache of recent text messages so that if someone deletes one
// "for everyone", the bot can repost it. Media isn't cached to keep this simple/lightweight —
// extend storeMessage to also stash media buffers if you want that too.

const recentMessages = new Map(); // messageId -> { jid, sender, text, timestamp }
const MAX_STORE = 1000;

function storeMessage(msg) {
  const id = msg.key.id;
  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const text =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    '';

  if (!text) return; // nothing text-based to cache

  recentMessages.set(id, { jid, sender, text, timestamp: Date.now() });

  if (recentMessages.size > MAX_STORE) {
    const oldestKey = recentMessages.keys().next().value;
    recentMessages.delete(oldestKey);
  }
}

// Returns true if this message WAS a "delete for everyone" notification (handled either way),
// false if it's an ordinary message that the caller should continue processing normally.
async function handlePossibleDelete(sock, msg) {
  const protocolMsg = msg.message?.protocolMessage;
  if (!protocolMsg || protocolMsg.type !== 0) return false; // 0 = REVOKE

  const deletedId = protocolMsg.key?.id;
  const original = recentMessages.get(deletedId);
  if (!original) return true; // was a delete, but we never had the original cached

  const senderNumber = original.sender.split('@')[0];
  await sock.sendMessage(original.jid, {
    text: `🗑️ Deleted message from @${senderNumber}:\n${original.text}`,
    mentions: [original.sender],
  });
  recentMessages.delete(deletedId);
  return true;
}

module.exports = { storeMessage, handlePossibleDelete };
