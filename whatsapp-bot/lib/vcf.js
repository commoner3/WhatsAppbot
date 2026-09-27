// lib/vcf.js
// Exports all members of a group as a single .vcf (vCard) file, so an admin can bulk-import
// them as contacts (e.g. to see their WhatsApp Status updates). Admin-only, same as other
// group management commands.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { isSenderAdmin } = require('./groupManager');

function numberFromJid(jid) {
  return jid.split('@')[0].split(':')[0]; // strips the @server.us part and any :device suffix
}

function buildVCard(name, number) {
  return ['BEGIN:VCARD', 'VERSION:3.0', `FN:${name}`, `TEL;TYPE=CELL:+${number}`, 'END:VCARD'].join('\n');
}

async function handleVcfCommand(sock, msg) {
  const groupId = msg.key.remoteJid;
  if (!groupId.endsWith('@g.us')) {
    await sock.sendMessage(groupId, { text: 'This command only works inside a group.' });
    return;
  }

  const sender = msg.key.participant || msg.key.remoteJid;
  const senderIsAdmin = await isSenderAdmin(sock, groupId, sender);
  if (!senderIsAdmin) {
    await sock.sendMessage(groupId, { text: 'Only group admins can use this command.' });
    return;
  }

  const metadata = await sock.groupMetadata(groupId);
  const botNumber = numberFromJid(sock.user.id);

  const cards = metadata.participants
    .map((p) => numberFromJid(p.id))
    .filter((number) => number !== botNumber)
    .map((number) => buildVCard(`+${number}`, number));

  if (!cards.length) {
    await sock.sendMessage(groupId, { text: 'No contacts to export.' });
    return;
  }

  const vcfContent = cards.join('\n');
  const safeName = (metadata.subject || 'group').replace(/[^\w-]+/g, '_');
  const filePath = path.join(os.tmpdir(), `${safeName}-contacts-${Date.now()}.vcf`);

  try {
    fs.writeFileSync(filePath, vcfContent);
    await sock.sendMessage(groupId, {
      document: fs.readFileSync(filePath),
      fileName: `${metadata.subject || 'group'} contacts.vcf`,
      mimetype: 'text/vcard',
    });
  } catch (err) {
    console.error('Could not build/send vcf:', err);
    await sock.sendMessage(groupId, { text: 'Could not export contacts.' });
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}

module.exports = { handleVcfCommand, numberFromJid, buildVCard };
