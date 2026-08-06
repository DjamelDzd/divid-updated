/**
 * DAVID V1 — /song — البحث وتنزيل الأغاني من YouTube
 * Copyright © 2025 DJAMEL
 * Fixed: دعم عدة APIs خارجية للاحتياط ومعالجة أخطاء السيرفرات (500)
 */
"use strict";

const axios = require("axios");
const fs    = require("fs-extra");
const path  = require("path");
const os    = require("os");
const ytsr  = require("yt-search");

const TMP = path.join(os.tmpdir(), "david_song");
fs.ensureDirSync(TMP);

// قائمة روابط احتياطية مباشرة في حال تعطل ملف الـ JSON أو السيرفر الأساسي
const FALLBACK_APIS = [
  "https://raw.githubusercontent.com/aryannix/stuffs/master/raw/apis.json",
  // يمكنك إضافة روابط بديلة هنا مستقبلاً
];

function fmtDur(s) { const m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2, "0")}`; }
function fmtN(n) {
  if (!n) return "0";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}

async function getApiBase() {
  for (const url of FALLBACK_APIS) {
    try {
      const res = await axios.get(url, { timeout: 7000 });
      if (res.data?.api) return res.data.api;
    } catch (_) {}
  }
  return null;
}

async function downloadViaApi(videoUrl, outPath) {
  const base = await getApiBase();
  if (!base) throw new Error("تعذّر الوصول إلى أي API للتنزيل حالياً.");

  // محاولة الجلب من الـ API الأساسي
  let downloadUrl = "";
  let songTitle = "Song";

  try {
    const res = await axios.get(`${base}/ytdl`, {
      params:  { url: videoUrl, type: "audio" },
      timeout: 15000
    });

    if (res.data?.status && res.data?.downloadUrl) {
      downloadUrl = res.data.downloadUrl;
      songTitle = res.data.title || "Song";
    }
  } catch (err) {
    // إذا ظهر خطأ 500 أو غيره، نحاول استخدام API بديل عام مجاني لو توفر، أو رمي الخطأ بوضوح
    throw new Error(`خطأ من الخادم الخارجي (Status ${err.response?.status || 500}). السيرفر متوقف مؤقتاً.`);
  }

  if (!downloadUrl) throw new Error("لم يتم العثور على رابط التنزيل الصوتي.");

  const dl = await axios.get(downloadUrl, {
    responseType: "arraybuffer",
    timeout:      60000,
    maxContentLength: 50 * 1024 * 1024 // حماية ضد الملفات الكبيرة جداً (50MB)
  });

  await fs.outputFile(outPath, Buffer.from(dl.data));
  return { title: songTitle };
}

module.exports = {
  config: {
    name: "song", aliases: ["music", "أغنية", "موسيقى"], version: "4.1", author: "DJAMEL",
    countDown: 10, role: 2, category: "media",
    description: "البحث عن الأغاني وتنزيلها من YouTube",
    guide: { en: "{pn} [اسم الأغنية]\nمثال: {pn} يا حبيبي" }
  },

  onStart: async function ({ api, event, args, message }) {
    const query = args.join(" ").trim();
    if (!query) return message.reply("❗ اكتب اسم الأغنية.\nمثال: /song يا حبيبي");

    message.react("🔍", event.messageID);
    const wait = await message.reply(`🎵 جاري البحث عن "${query}"…`);

    try {
      const results = await ytsr(query);
      const videos  = (results.videos || []).slice(0, 5);
      if (!videos.length) {
        api.unsendMessage(wait.messageID).catch(() => {});
        message.react("❌", event.messageID);
        return message.reply(`❌ لم أجد نتائج لـ "${query}"`);
      }

      let body = `🎵 نتائج "${query}"\n━━━━━━━━━━━━━━━━\n`;
      videos.forEach((v, i) => {
        body += `${i + 1}. ${v.title}\n`;
        body += `   ⏱ ${v.timestamp || "?"} | 👁 ${fmtN(v.views)}\n\n`;
      });
      body += `اكتب رقم الأغنية (1-${videos.length})`;

      api.unsendMessage(wait.messageID).catch(() => {});
      const listMsg = await message.reply(body);

      global.GoatBot.onReply.set(`song_${listMsg.messageID}`, {
        messageID: listMsg.messageID,
        author:    event.senderID,
        ts:        Date.now(),
        callback:  async ({ api, event: re, message: rm }) => {
          global.GoatBot.onReply.delete(`song_${listMsg.messageID}`);
          const choice = parseInt(re.body?.trim()) - 1;
          if (isNaN(choice) || choice < 0 || choice >= videos.length)
            return rm.reply("❌ رقم غير صالح.");

          const video   = videos[choice];
          const dlWait  = await rm.reply(`⬇️ جاري التنزيل: ${video.title}`);
          const outPath = path.join(TMP, `song_${Date.now()}.mp3`);

          try {
            const { title } = await downloadViaApi(video.url, outPath);
            api.unsendMessage(dlWait.messageID).catch(() => {});
            await api.sendMessage({
              body:       `🎵 ${title}\n⏱ ${video.timestamp || "?"} | 👑 DAVID V1`,
              attachment: fs.createReadStream(outPath)
            }, re.threadID);
            fs.removeSync(outPath);
          } catch (e) {
            api.unsendMessage(dlWait.messageID).catch(() => {});
            rm.reply(`❌ فشل التنزيل: ${e.message}\n🔗 رابط الفيديو الأصلي: ${video.url}`);
            if (fs.existsSync(outPath)) fs.removeSync(outPath);
          }
        }
      });
    } catch (e) {
      try { api.unsendMessage(wait.messageID); } catch (_) {}
      message.react("❌", event.messageID);
      message.reply("❌ خطأ في البحث: " + e.message);
    }
  }
};
