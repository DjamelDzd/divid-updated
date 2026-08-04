/**
 * DAVID V1 — /help — قائمة الأوامر بتصميم فخم
 * Copyright © 2025 DJAMEL
 */
"use strict";

// ── تصنيفات الأوامر ───────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    icon: "🛡️",
    title: "الإدارة والتحكم",
    cmds: [
      { name: "nm",            icon: "🔒", desc: "قفل اسم الغروب ومنع تغييره" },
      { name: "nick",          icon: "✍️", desc: "قفل كنيات الأعضاء باستمرار" },
      { name: "groupimg",      icon: "🖼️", desc: "تغيير وقفل صورة الغروب" },
      { name: "changeavatar",  icon: "📸", desc: "تغيير صورة حساب البوت" },
    ],
  },
  {
    icon: "💬",
    title: "الرسائل التلقائية",
    cmds: [
      { name: "angel", icon: "👼", desc: "رسائل تلقائية دورية للغروبات" },
      { name: "divel", icon: "🌀", desc: "رسائل دورية بانتظار عشوائي" },
    ],
  },
  {
    icon: "🎭",
    title: "الترفيه والوسائط",
    cmds: [
      { name: "song",   icon: "🎵", desc: "تنزيل أغاني من YouTube" },
      { name: "tiktok", icon: "🎬", desc: "تنزيل فيديو TikTok بدون علامة مائية" },
    ],
  },
  {
    icon: "⚙️",
    title: "النظام والمعلومات",
    cmds: [
      { name: "uptime", icon: "⏱️", desc: "وقت التشغيل والإحصائيات" },
      { name: "chats",  icon: "💬", desc: "إدارة المحادثات والغروبات" },
      { name: "help",   icon: "❓", desc: "عرض قائمة الأوامر" },
    ],
  },
];

// ── بيانات تفصيلية لكل أمر ────────────────────────────────────────────────────
const CMD_DETAILS = {
  nm:           { usage: "/nm [اسم] / off / time [min] [max] / status", role: "🔑 Admin",  cat: "الإدارة" },
  nick:         { usage: "/nick [اسم] / off / status / حدف",            role: "🔑 Admin",  cat: "الإدارة" },
  groupimg:     { usage: "/groupimg [رابط أو صورة] / off / status",     role: "🔑 Admin",  cat: "الإدارة" },
  setavatar:    { usage: "/changeavatar [رابط] — أو رد على صورة",       role: "👑 Owner",  cat: "الإدارة" },
  changeavatar: { usage: "/changeavatar [رابط] — أو رد على صورة",       role: "👑 Owner",  cat: "الإدارة" },
  angel:        { usage: "/angel [رسالة] [min-max ثانية] / off / status",role: "🔑 Admin",  cat: "الرسائل" },
  divel:        { usage: "/divel [رسالة] [min-max] / off / status",      role: "🔑 Admin",  cat: "الرسائل" },
  song:         { usage: "/song [اسم الأغنية أو كلمات]",                role: "👤 User",   cat: "الترفيه" },
  tiktok:       { usage: "/tiktok [بحث أو رابط]",                       role: "👤 User",   cat: "الترفيه" },
  tik:          { usage: "/tiktok [بحث أو رابط]",                       role: "👤 User",   cat: "الترفيه" },
  uptime:       { usage: "/uptime",                                       role: "👤 User",   cat: "النظام"  },
  chats:        { usage: "/chats count / list / dm on|off / angel",       role: "🔑 Admin",  cat: "النظام"  },
  help:         { usage: "/help — /help [اسم الأمر]",                    role: "👤 User",   cat: "النظام"  },
};

// ── خط فاصل ──────────────────────────────────────────────────────────────────
const LINE = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

// ── بناء رسالة كل الأوامر ────────────────────────────────────────────────────
function buildHelpAll(prefix) {
  const allCmds = global.GoatBot?.commands;
  let totalCmds = 0;
  if (allCmds?.size) {
    const seen = new Set();
    for (const [, cmd] of allCmds) { if (cmd.config?.name) seen.add(cmd.config.name); }
    totalCmds = seen.size;
  } else {
    for (const cat of CATEGORIES) totalCmds += cat.cmds.length;
  }

  const lines = [];

  // ── رأس الرسالة ──────────────────────────────────────────────────────
  lines.push(LINE);
  lines.push("  ✦  D A V I D  V 1  ✦");
  lines.push("  🤖 مساعدك الذكي على ماسنجر");
  lines.push(`  ⚡ by DJAMEL  •  Prefix: ${prefix}`);
  lines.push(LINE);
  lines.push("");

  // ── كل تصنيف ─────────────────────────────────────────────────────────
  for (const cat of CATEGORIES) {
    lines.push(` ╔═ ${cat.icon} ${cat.title} ${"═".repeat(Math.max(1, 24 - cat.title.length))}╗`);
    for (const cmd of cat.cmds) {
      // الاسم الفعلي في البوت (setavatar بدل changeavatar)
      const realName = cmd.name === "changeavatar" ? "setavatar" : cmd.name;
      const exists   = !allCmds || allCmds.has(realName);
      const status   = exists ? "" : " ⚠️";
      lines.push(` ║  ${cmd.icon}  ${prefix}${cmd.name.padEnd(13)}${cmd.desc}${status}`);
    }
    lines.push(` ╚${"═".repeat(35)}╝`);
    lines.push("");
  }

  // ── ذيل الرسالة ──────────────────────────────────────────────────────
  lines.push(LINE);
  lines.push(`  📦 الأوامر: ${totalCmds}  •  🛡 الحماية: 20 طبقة`);
  lines.push(`  ❓ ${prefix}help [اسم الأمر] ← للتفاصيل الكاملة`);
  lines.push(LINE);

  return lines.join("\n");
}

// ── بناء رسالة أمر واحد ──────────────────────────────────────────────────────
function buildHelpOne(rawName, prefix) {
  const name    = rawName.toLowerCase().replace(/^\//, "");
  const allCmds = global.GoatBot?.commands;

  // ابحث في الأوامر المحمّلة أولاً
  let cmd = allCmds?.get(name);
  if (!cmd && allCmds) {
    for (const [, c] of allCmds) {
      if ((c.config?.aliases || []).map(a => String(a).toLowerCase()).includes(name)) {
        cmd = c; break;
      }
    }
  }

  const info    = CMD_DETAILS[name] || CMD_DETAILS[cmd?.config?.name] || {};
  const config  = cmd?.config || {};
  const cmdName = config.name || name;
  const desc    = config.description || config.longDescription || "لا يوجد وصف";
  const usage   = (config.guide?.en?.replace(/\{p[n]?\}/g, prefix)) || info.usage || `${prefix}${cmdName}`;
  const role    = info.role || (config.role === 3 ? "👑 Owner" : config.role === 2 ? "🔑 Admin" : "👤 User");
  const cat     = info.cat  || config.category || "عام";
  const aliases = (config.aliases || []).filter(Boolean);

  // إيجاد الأيقونة
  let icon = "•";
  outer: for (const c of CATEGORIES)
    for (const cm of c.cmds)
      if (cm.name === cmdName || cm.name === name) { icon = cm.icon; break outer; }

  const lines = [];
  lines.push(LINE);
  lines.push(`  ${icon}  ${prefix}${cmdName.toUpperCase()}`);
  lines.push(LINE);
  lines.push("");
  lines.push(`  📝 الوصف:`);
  lines.push(`     ${desc}`);
  lines.push("");
  lines.push(`  📌 الاستخدام:`);
  for (const l of usage.split("\n")) lines.push(`     ${l}`);
  lines.push("");
  lines.push(`  🏷  الفئة    : ${cat}`);
  lines.push(`  🔑 الصلاحية : ${role}`);
  if (aliases.length) {
    lines.push(`  🔀 اختصارات : ${aliases.join("، ")}`);
  }
  lines.push("");
  lines.push(LINE);

  return lines.join("\n");
}

// ── Module ────────────────────────────────────────────────────────────────────
module.exports = {
  config: {
    name: "help",
    aliases: ["h", "مساعدة", "أوامر", "commands"],
    version: "3.0",
    author: "DJAMEL",
    countDown: 3,
    role: 0,
    category: "info",
    description: "عرض قائمة الأوامر بتصميم فخم",
    guide: {
      en: "{pn} — عرض كل الأوامر\n{pn} [اسم الأمر] — تفاصيل أمر محدد",
    },
  },

  onStart: async function ({ args, message, prefix }) {
    if (args[0]) {
      message.reply(buildHelpOne(args[0], prefix));
    } else {
      message.reply(buildHelpAll(prefix));
    }
  },
};
