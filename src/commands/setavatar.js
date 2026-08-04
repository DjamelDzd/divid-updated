/**
 * DAVID V1 — /changeavatar — تغيير صورة حساب البوت
 * Copyright © 2025 DJAMEL
 * يعمل عبر HTTP مباشرةً باستخدام كوكيز الجلسة
 */
"use strict";
const axios  = require("axios");
const fs     = require("fs-extra");
const path   = require("path");
const os     = require("os");
const FormData = require("form-data");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function isBotAdmin(id) {
  const cfg = global.GoatBot?.config || {};
  const sid = String(id);
  return [cfg.ownerID, ...(cfg.superAdminBot || []), ...(cfg.adminBot || [])]
    .filter(Boolean).map(String).includes(sid);
}

// ── استخراج كوكيز الجلسة كنص ────────────────────────────────────────────────
function getCookieStr(api) {
  return (api.getAppState() || [])
    .filter(c => c.key && c.value)
    .map(c => `${c.key}=${c.value}`)
    .join("; ");
}

// ── جلب رمز fb_dtsg من صفحة فيسبوك ─────────────────────────────────────────
async function getDtsg(cookieStr) {
  try {
    const res = await axios.get("https://www.facebook.com/", {
      headers: { Cookie: cookieStr, "User-Agent": UA },
      timeout: 15000, maxRedirects: 3,
    });
    const m1 = res.data.match(/"DTSGInitData"[^}]*?"token"\s*:\s*"([^"]+)"/);
    if (m1) return m1[1];
    const m2 = res.data.match(/name="fb_dtsg"\s+value="([^"]+)"/);
    if (m2) return m2[1];
    const m3 = res.data.match(/\["DTSGInitialData",[^\]]*\],\{"token":"([^"]+)"/);
    if (m3) return m3[1];
  } catch (_) {}
  return "";
}

// ── الطريقة 1: api.changeAvatar الرسمية ─────────────────────────────────────
async function tryApiMethod(api, imgPath) {
  if (typeof api.changeAvatar === "function") {
    await new Promise((res, rej) =>
      api.changeAvatar(fs.createReadStream(imgPath), (e) => e ? rej(e) : res())
    );
    return true;
  }
  if (typeof api.setProfilePicture === "function") {
    await new Promise((res, rej) =>
      api.setProfilePicture(fs.createReadStream(imgPath), (e) => e ? rej(e) : res())
    );
    return true;
  }
  return false;
}

// ── الطريقة 2: HTTP مباشر إلى Facebook ──────────────────────────────────────
async function tryHttpMethod(api, imgPath) {
  const cookieStr = getCookieStr(api);
  const dtsg      = await getDtsg(cookieStr);
  const uid       = api.getCurrentUserID();

  const form = new FormData();
  if (dtsg) form.append("fb_dtsg", dtsg);
  form.append("profile_id",         uid);
  form.append("av",                  uid);
  form.append("profile_pic_method",  "upload");
  form.append("picture_source",      "2");
  form.append("croppedPhotoLeft",    "0");
  form.append("croppedPhotoTop",     "0");
  form.append("croppedPhotoWidth",   "800");
  form.append("croppedPhotoHeight",  "800");
  form.append("file", fs.createReadStream(imgPath), {
    filename: "avatar.jpg", contentType: "image/jpeg",
  });

  const res = await axios.post(
    "https://www.facebook.com/ajax/profile/picture/upload.php",
    form,
    {
      headers: {
        Cookie:       cookieStr,
        "User-Agent": UA,
        Referer:      "https://www.facebook.com/",
        Origin:       "https://www.facebook.com",
        ...form.getHeaders(),
      },
      timeout: 30000,
      maxRedirects: 5,
    }
  );

  // Facebook ترجع نصاً يبدأ بـ for(;;); ثم JSON — نتحقق من غياب "error"
  const body = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
  if (body.includes('"error"') && !body.includes('"errorCode":0')) {
    throw new Error("Facebook رفضت الطلب: " + body.slice(0, 200));
  }
  return true;
}

// ── جلب الصورة من URL أو مرفق ───────────────────────────────────────────────
async function fetchImage(imageUrl) {
  const tmp = path.join(os.tmpdir(), `david_avatar_${Date.now()}.jpg`);
  const res = await axios.get(imageUrl, {
    responseType: "arraybuffer",
    timeout: 25000,
    headers: { "User-Agent": UA },
  });
  fs.writeFileSync(tmp, Buffer.from(res.data));
  return tmp;
}

// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  config: {
    name: "setavatar",
    aliases: ["changeavatar", "avatar", "صورة-البوت", "تغيير-الصورة"],
    version: "2.0",
    author: "DJAMEL",
    countDown: 15,
    role: 3,
    category: "management",
    description: "تغيير صورة البروفايل لحساب البوت",
    guide: {
      en: "{pn} [رابط] — أو رد على صورة بـ {pn}",
    },
  },

  onStart: async function ({ api, event, args, message }) {
    if (!isBotAdmin(event.senderID))
      return message.reply("⛔ هذا الأمر للمالك فقط.");

    // ── استخراج رابط الصورة ────────────────────────────────────────────
    let imageUrl = null;
    const attach =
      event.messageReply?.attachments?.[0] || event.attachments?.[0];
    if (attach?.type === "photo")
      imageUrl = attach.url || attach.previewUrl || null;
    if (!imageUrl)
      for (const a of args)
        if (a?.startsWith("http")) { imageUrl = a; break; }

    if (!imageUrl) {
      return message.reply(
        "╔══════════════════════════╗\n" +
        "║  📸  تغيير صورة البوت   ║\n" +
        "╠══════════════════════════╣\n" +
        "║  الاستخدام:              ║\n" +
        "║  • /changeavatar [رابط]  ║\n" +
        "║  • رد على صورة بالأمر   ║\n" +
        "╚══════════════════════════╝"
      );
    }

    message.react("⏳", event.messageID);
    let tmpPath = null;

    try {
      // تنزيل الصورة مؤقتاً
      tmpPath = await fetchImage(imageUrl);

      let success = false;

      // المحاولة 1: دالة API المدمجة
      try {
        success = await tryApiMethod(api, tmpPath);
      } catch (_) {
        success = false;
      }

      // المحاولة 2: HTTP مباشر
      if (!success) {
        success = await tryHttpMethod(api, tmpPath);
      }

      if (tmpPath) fs.removeSync(tmpPath);
      message.react("✅", event.messageID);
      return message.reply(
        "╔═══════════════════════════╗\n" +
        "║  ✅ تم بنجاح              ║\n" +
        "╠═══════════════════════════╣\n" +
        "║  تم تغيير صورة البوت 🎉  ║\n" +
        "║  قد تحتاج لإعادة تحميل   ║\n" +
        "║  الصفحة لرؤية التغيير    ║\n" +
        "╚═══════════════════════════╝"
      );
    } catch (err) {
      if (tmpPath) try { fs.removeSync(tmpPath); } catch (_) {}
      message.react("❌", event.messageID);
      return message.reply(
        "╔═══════════════════════════╗\n" +
        "║  ❌ فشل تغيير الصورة      ║\n" +
        "╠═══════════════════════════╣\n" +
        "║  السبب: " + String(err.message || err).slice(0, 35) + "\n" +
        "╠═══════════════════════════╣\n" +
        "║  ⚠️ قد يكون السبب:        ║\n" +
        "║  • الكوكيز منتهية الصلاحية║\n" +
        "║  • فيسبوك حظر الطلب مؤقتاً║\n" +
        "║  • رابط الصورة غير صالح  ║\n" +
        "╚═══════════════════════════╝"
      );
    }
  },
};
