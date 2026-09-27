// lib/greetings.js
// Sends a welcome message when someone joins a group, and a goodbye when they leave.

async function handleGroupParticipantsUpdate(sock, update) {
  const { id: groupId, participants, action } = update;

  try {
    const metadata = await sock.groupMetadata(groupId);
    const groupName = metadata.subject || 'the group';

    for (const participantJid of participants) {
      const number = participantJid.split('@')[0];

      if (action === 'add') {
        await sock.sendMessage(groupId, {
          text: `👋 Welcome @${number} to ${groupName}!`,
          mentions: [participantJid],
        });
      } else if (action === 'remove') {
        await sock.sendMessage(groupId, {
          text: `👋 @${number} has left ${groupName}.`,
          mentions: [participantJid],
        });
      }
    }
  } catch (err) {
    console.error('Error handling group-participants.update:', err);
  }
}

module.exports = { handleGroupParticipantsUpdate };
