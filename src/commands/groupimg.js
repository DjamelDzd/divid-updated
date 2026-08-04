/**
 * DAVID V1 — /groupimg — تغيير وقفل صورة الغروب
 * Copyright © 2025 DJAMEL — v4.0 Fixed
 * الإصلاحات:
 *  - حفظ حالة القفل في ملف (لا تضيع عند إعادة التشغيل أو hot-reload)
 *  - كشف أحداث تغيير الصورة بطريقة أكثر موثوقية
 *  - إعادة تطبيق الصورة بشكل صحيح مع إنشاء stream جديد دائماً
 *  - تحسين شامل في معالجة الأخطاء
 */
"use strict";
const axios  = require("axios");
const fs     = require("fs-extra");
const path   = require("path");
const os     = require("os");

// ── مسارات الملفات ────────────────────────────────────────────────────────────
const CACHE      = path.join(process.cwd(), "data", "groupimg_locks");
const STATE_FILE = path.join(process.cwd(), "database", "data", "groupImgLocks.json");
fs.ensureDirSync(CACHE);
fs.ensureDirSync(path.dirname(STATE_FILE));

// ── تحميل حالة الأقفال من الملف (يعيشون بين الـ restarts) ──────────────────
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE))
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch (_) {}
  return {};
}
function saveState(state) {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2)); } catch (_) {}
}

// حالة الأقفال: { [tid]: true/false }
// نستخدم global لمنع فقدانها عند hot-reload
if (!global._groupImgState) global._groupImgState = loadState();
const locks = global._groupImgState;

function lockFile(tid) {
  return path.join(CACHE, `lock_${String(tid).replace(/[^0-9]/g, "")}.jpg`);
}

function isAdmin(id) {
  const cfg = global.GoatBot?.config || {};
  const sid = String(id);
  const owners = [cfg.ownerID, ...(cfg.superAdminBot || [])].filter(Boolean).map(String);
  const admins = (cfg.adminBot || []).map(String);
  return owners.includes(sid) || admins.includes(sid);
}

async function isGroupAdmin(api, uid, tid) {
  try {
    const info = await new Promise((res, rej) =>
      api.getThreadInfo(tid, (e, d) => e ? rej(e) : res(d))
    );
    return (info?.adminIDs || []).some(a => String(a.id || a) === String(uid));
  } catch (_) { return false; }
}

// ── تنزيل الصورة من URL ───────────────────────────────────────────────────────
async function downloadImage(url) {
  const tmpFile = path.join(CACHE, `tmp_${Date.now()}.jpg`);
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 25000,
    maxRedirects: 5,
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36",
      "Accept": "image/*,*/*;q=0.8",
    },
  });
  fs.writeFileSync(tmpFile, Buffer.from(res.data));
  return tmpFile;
}

// ── تطبيق صورة القفل على الغروب ─────────────────────────────────────────────
async function applyImage(api, tid) {
  const lf = lockFile(tid);
  if (!fs.existsSync(lf)) return;
  try {
    await new Promise((resolve, reject) => {
      // يجب إنشاء stream جديد في كل مرة
      const stream = fs.createReadStream(lf);
      stream.on("error", reject);
      api.changeGroupImage(stream, String(tid), (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } catch (e) {
    if (global.log) global.log.warn("GROUPIMG", `فشل إعادة تطبيق الصورة: ${e.message}`);
  }
}

// ── الكشف عن حدث تغيير صورة الغروب (متعدد الصيغ) ──────────────────────────
function isImageChangeEvent(event) {
  return (
    event.logMessageType === "log:thread-image" ||
    event.type           === "log:thread-image" ||
    (event.type === "event" && event.logMessageType === "log:thread-image") ||
    (event.logMessageData?.image !== undefined && !event.logMessageData?.leftParticipantFbId)
  );
}

// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  config: {
    name: "groupimg",
    aliases: ["gcimg", "صورة", "img"],
    version: "4.0",
    author: "DJAMEL",
    countDown: 5,
    role: 2,
    category: "management",
    description: "تغيير وقفل صورة الغروب تلقائياً",
    guide: {
      en: "{pn} [رابط أو صورة] — تغيير وقفل\n{pn} off — فك القفل\n{pn} status — الحالة",
    },
  },

  onStart: async function ({ api, event, args, message }) {
    const tid = String(event.threadID);
    const uid = event.senderID;

    if (!isAdmin(uid) && !(await isGroupAdmin(api, uid, tid)))
      return message.reply("⛔ هذا الأمر للأدمن فقط.");

    const sub = (args[0] || "").toLowerCase();

    // ── /groupimg off ────────────────────────────────────────────────────
    if (sub === "off" || sub === "إيقاف") {
      locks[tid] = false;
      saveState(locks);
      const lf = lockFile(tid);
      if (fs.existsSync(lf)) try { fs.removeSync(lf); } catch (_) {}
      return message.reply(
        "╔══════════════════════════════╗\n" +
        "║  🔓 تم فك قفل صورة الغروب  ║\n" +
        "║  يمكن الآن تغييرها بحرية   ║\n" +
        "╚══════════════════════════════╝"
      );
    }

    // ── /groupimg status ─────────────────────────────────────────────────
    if (sub === "status" || sub === "حالة") {
      const locked = locks[tid] === true && fs.existsSync(lockFile(tid));
      return message.reply(
        locked
          ? "╔══════════════════════════════╗\n" +
            "║  🔒 صورة الغروب مقفلة       ║\n" +
            "║  /groupimg off لفك القفل    ║\n" +
            "╚══════════════════════════════╝"
          : "╔══════════════════════════════╗\n" +
            "║  🔓 صورة الغروب غير مقفلة  ║\n" +
            "╚══════════════════════════════╝"
      );
    }

    // ── جلب رابط الصورة ──────────────────────────────────────────────────
    let imageUrl = null;
    const replyAttach = event.messageReply?.attachments?.[0];
    if (replyAttach?.type === "photo")
      imageUrl = replyAttach.url || replyAttach.previewUrl || replyAttach.thumbnailUrl;

    if (!imageUrl) {
      const direct = (event.attachments || []).find(a => a.type === "photo");
      if (direct) imageUrl = direct.url || direct.previewUrl || direct.thumbnailUrl;
    }

    if (!imageUrl) {
      for (const a of args)
        if (a?.startsWith("http://") || a?.startsWith("https://")) { imageUrl = a; break; }
    }

    if (!imageUrl) {
      return message.reply(
        "╔═══════════════════════════════╗\n" +
        "║  🖼️  تغيير صورة الغروب       ║\n" +
        "╠═══════════════════════════════╣\n" +
        "║  الاستخدام:                  ║\n" +
        "║  • /groupimg [رابط صورة]    ║\n" +
        "║  • أرسل صورة مع الأمر       ║\n" +
        "║  • رد على صورة بالأمر       ║\n" +
        "╠═══════════════════════════════╣\n" +
        "║  /groupimg off   — فك القفل ║\n" +
        "║  /groupimg status — الحالة  ║\n" +
        "╚═══════════════════════════════╝"
      );
    }

    message.react("⏳", event.messageID);

    try {
      // تنزيل الصورة وحفظها كملف القفل
      const tmpPath = await downloadImage(imageUrl);
      const lf = lockFile(tid);
      fs.copySync(tmpPath, lf);
      try { fs.removeSync(tmpPath); } catch (_) {}

      // تطبيق الصورة على الغروب
      await new Promise((resolve, reject) => {
        const stream = fs.createReadStream(lf);
        stream.on("error", reject);
        api.changeGroupImage(stream, tid, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // حفظ حالة القفل
      locks[tid] = true;
      saveState(locks);

      message.react("✅", event.messageID);
      return message.reply(
        "╔═══════════════════════════════╗\n" +
        "║  ✅ تم تغيير الصورة وقفلها  ║\n" +
        "╠═══════════════════════════════╣\n" +
        "║  🔒 الصورة محمية الآن       ║\n" +
        "║  ستُعاد تلقائياً عند التغيير║\n" +
        "║  /groupimg off لفك القفل    ║\n" +
        "╚═══════════════════════════════╝"
      );
    } catch (e) {
      message.react("❌", event.messageID);
      return message.reply(
        "╔═══════════════════════════════╗\n" +
        "║  ❌ فشل تغيير الصورة         ║\n" +
        "╠═══════════════════════════════╣\n" +
        "║  " + String(e.message || e).slice(0, 32) + "\n" +
        "╠═══════════════════════════════╣\n" +
        "║  تأكد من:                    ║\n" +
        "║  • أن البوت أدمن في الغروب ║\n" +
        "║  • أن رابط الصورة صحيح     ║\n" +
        "╚═══════════════════════════════╝"
      );
    }
  },

  onEvent: async function ({ api, event }) {
    if (!isImageChangeEvent(event)) return;
    const tid = String(event.threadID);
    if (locks[tid] !== true) return;
    if (!fs.existsSync(lockFile(tid))) return;
    // تأخير 2.5 ثانية ثم إعادة تطبيق صورة القفل
    setTimeout(() => applyImage(api, tid), 2500);
  },
};
