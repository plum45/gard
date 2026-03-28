const axios = require('axios');
const path = require('path');
const fs = require('fs');

function isSensitiveQuery(query) {
    const q = String(query).toLowerCase();
    const sensitiveWords = ['18+', 'sex', 'porn', 'adult', 'nude', 'เซ็กส์', 'โป๊', 'ทางเพศ', 'การพนัน', 'คาสิโน', 'ผิดกฎหมาย', 'illegal', 'hack', 'แฮก'];
    return sensitiveWords.some(word => q.includes(word));
}

/**
 * Serper.dev Search (Primary)
 */
async function performSerperSearch(query) {
    try {
        const serperKey = process.env.SERPER_API_KEY || '5d4ed8c8b92c3b8d7bf424e2137041ce1073b916';
        const data = JSON.stringify({ "q": query, "hl": "th", "gl": "th" });
        
        console.log(`🔍 [Serper Search] Query: ${query}`);
        const response = await axios.request({
            method: 'post',
            url: 'https://google.serper.dev/search',
            headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
            data: data,
            timeout: 15000
        });

        const res = response.data;
        let summary = `🔎 **ผลการค้นหาจาก Google (Update: 2569/2026):**\n\n`;
        
        if (res.answerBox) {
            summary += `💡 **คำตอบด่วน:** ${res.answerBox.answer || res.answerBox.snippet}\n\n`;
        }

        if (res.organic && res.organic.length > 0) {
            summary += res.organic.slice(0, 5).map(o => `• **${o.title}**\n  🔗 ${o.link}\n  📝 ${o.snippet}`).join('\n\n');
        }

        return (res.organic && res.organic.length > 0) ? summary : null;
    } catch (e) {
        console.error('[Serper Error]:', e.message);
        return null;
    }
}

async function googleSearch(query) {
    try {
        let q = typeof query === 'string' ? query : (query?.query || query?.q || "");
        if (!q || String(q).trim() === "") return "ไม่พบข้อมูลเนื่องจากคำค้นหาว่างเปล่าค่ะ";
        
        const serperApiKey = process.env.SERPER_API_KEY;
        console.log(`🔍 [GOOGLE_SEARCH] Query: ${q}`);

        const response = await axios.post('https://google.serper.dev/search', {
            q: q,
            gl: 'th',
            hl: 'th',
            autocorrect: true
        }, {
            headers: { 'X-API-KEY': serperApiKey, 'Content-Type': 'application/json' }
        });

        const data = response.data;
        let summary = `🔎 **ผลการค้นหาจาก Google:**\n\n`;
        if (data.answerBox) summary += `💡 **คำตอบด่วน:** ${data.answerBox.answer || data.answerBox.snippet}\n\n`;
        if (data.organic && data.organic.length > 0) {
            summary += data.organic.slice(0, 5).map(o => `• **${o.title}**\n  🔗 ${o.link}\n  📝 ${o.snippet}`).join('\n\n');
        }
        return summary || "ไม่พบข้อมูลที่ต้องการค่ะ";
    } catch (e) { return "เกิดข้อผิดพลาดในการค้นหา Google ค่ะ"; }
}

async function performSearch(query) {
    try {
        let q = typeof query === 'string' ? query : (query?.query || query?.q || "");
        if (!q || String(q).trim() === "") return "ไม่พบข้อมูลเนื่องจากคำค้นหาว่างเปล่าค่ะ";
        
        const isSensitive = isSensitiveQuery(q);
        const searchYear = " วันนี้ ล่าสุด ปี พ.ศ. 2569 (2026) ในประเทศไทย";
        const finalQuery = (isSensitive || String(q).includes("256") || String(q).includes("202")) ? String(q) : String(q) + searchYear;
        
        // --- STEP 1: TRY SERPER (Reliable & Fast) ---
        const serperResult = await performSerperSearch(finalQuery);
        if (serperResult) return serperResult;

        // --- STEP 2: TRY TAVILY (FALLBACK) ---
        const tavilyApiKey = process.env.TAVILY_API_KEY;
        console.log(`[Tavily Search Fallback] Query: ${finalQuery}`);
        const response = await axios.post('https://api.tavily.com/search', {
            api_key: tavilyApiKey,
            query: finalQuery,
            search_depth: 'advanced',
            include_answer: true,
            include_raw_content: isSensitive,
            max_results: 10
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 20000
        }).catch(() => null);

        if (!response) return "ขออภัยค่ะ ระบบค้นหาขัดข้องชั่วคราว เจ้านายลองพิมพ์ใหม่อีกครั้งนะคะ หรือลองพิมพ์คำว่า /ping เพื่อเช็คสถานะค่ะ";

        const data = response.data || { results: [], answer: null };
        let summary = `✨ **สรุปข้อมูลงานวิจัย (Update: 2569/2026):**\n\n`;
        if (data.answer) summary += `💡 **AI Analyst:**\n${data.answer}\n\n`;
        
        if (data.results && data.results.length > 0) {
            summary += `🔎 **แหล่งข้อมูลอ้างอิง:**\n`;
            summary += data.results.map(r => `• **${r.title}**\n  🔗 ${r.url}\n  📝 ${r.content}`).join('\n\n');
        }

        return (data.answer || (data.results && data.results.length > 0)) ? summary : "ไม่พบข้อมูลที่ต้องการค้นหาค่ะ";
    } catch (e) {
        console.error('Search Engine Failed:', e.message);
        return "เกิดข้อผิดพลาดในการค้นหาข้อมูลค่ะเจ้านาย";
    }
}

async function handleImageSearch(ctx, query) {
    try {
        await ctx.sendChatAction('upload_photo');
        console.log(`🔍 [IMAGE_SEARCH] Finding real images via Serper for: ${query}`);
        
        const serperApiKey = process.env.SERPER_API_KEY;
        const response = await axios.post('https://google.serper.dev/images', {
            q: query,
            gl: 'th',
            hl: 'th',
            safe: false // 🔓 Explicitly Unfiltered Images
        }, {
            headers: { 'X-API-KEY': serperApiKey, 'Content-Type': 'application/json' }
        });

        if (response.data.images && response.data.images.length > 0) {
            const images = response.data.images.slice(0, 3);
            for (const img of images) {
                await ctx.replyWithPhoto(img.imageUrl, { caption: `📸 **${img.title}**\n🔗 จาก: ${img.source}` }).catch(() => {});
            }
        } else { await ctx.reply('❌ หนูหารูปภาพที่ต้องการไม่พบเลยค่ะเจ้านาย'); }
    } catch (e) { ctx.reply('❌ ระบบค้นหารูปภาพขัดข้องค่ะ'); }
}

async function handleNewsSearch(ctx, query) {
    try {
        await ctx.sendChatAction('typing');
        const serperApiKey = process.env.SERPER_API_KEY;
        const response = await axios.post('https://google.serper.dev/news', {
            q: query,
            gl: 'th',
            hl: 'th',
            autocorrect: true
        }, {
            headers: { 'X-API-KEY': serperApiKey, 'Content-Type': 'application/json' }
        });

        const news = response.data.news;
        if (news && news.length > 0) {
            let text = `📰 **ข่าวล่าสุดเกี่ยวกับ "${query}":**\n\n`;
            text += news.slice(0, 5).map(n => `• **${n.title}**\n  🕒 ${n.date}\n  🔗 ${n.link}`).join('\n\n');
            await ctx.reply(text, { disable_web_page_preview: true });
        } else { await ctx.reply('❌ หนูหาข่าวที่คุณระบุไม่พบค่ะ'); }
    } catch (e) { ctx.reply('❌ ระบบค้นหาข่าวขัดข้องค่ะ'); }
}

async function smartReply(ctx, text, autoDeleteMs = 0) {
    try {
        const msg = await ctx.reply(text, { parse_mode: 'Markdown' });
        if (autoDeleteMs > 0) {
            setTimeout(() => {
                ctx.telegram.deleteMessage(ctx.chat.id, msg.message_id).catch(() => {});
            }, autoDeleteMs);
        }
        return msg;
    } catch (e) {
        return ctx.reply(text).catch(() => {});
    }
}

function logToTerminal(msg) {
    console.log(`[TERMINAL] ${msg}`);
}

module.exports = {
    isSensitiveQuery,
    performSearch,
    googleSearch,
    handleImageSearch,
    handleNewsSearch,
    smartReply,
    logToTerminal
};
