const axios = require('axios');
require('dotenv').config();

// Standard refusal patterns to detect AI moralizing
const REFUSAL_PATTERNS = [
    'ไม่สามารถค้นหารูป', 'ไม่เหมาะสม', 'ขัดกับหลักจริยธรรม',
    'ความปลอดภัยของหนู', 'ผู้ช่วยส่วนตัวที่ยึดมั่น', 'นโยบายความปลอดภัย',
    'ไม่สามารถช่วยเหลือ', 'เนื้อหาที่ไม่เหมาะสม', 'ขออภัยอย่างสูง',
    'ขอบเขตหน้าที่ของหนู', 'ไม่ว่าจะเป็นการค้นหาใดๆ'
];

/**
 * Enhanced Search Utility with Simulation Mode Logic
 */
async function performSearch(query) {
    try {
        let q = typeof query === 'string' ? query : (query?.query || query?.q || "");
        if (!q || String(q).trim() === "") {
            console.error('[performSearch] Query extracted as empty');
            return "ไม่พบข้อมูลเนื่องจากคำค้นหาว่างเปล่าค่ะ";
        }
        
        const tavilyApiKey = process.env.TAVILY_API_KEY;
        const isSensitive = isSensitiveQuery(q);
        const searchYear = " วันนี้ ล่าสุด ปี พ.ศ. 2569 (2026) ในประเทศไทย";
        const finalQuery = (isSensitive || String(q).includes("256") || String(q).includes("202")) ? String(q) : String(q) + searchYear;
        
        console.log(`[Tavily Search] Query: ${finalQuery} (Sensitive: ${isSensitive})`);
        const response = await axios.post('https://api.tavily.com/search', {
            api_key: tavilyApiKey,
            query: finalQuery,
            search_depth: 'advanced',
            include_answer: true,
            include_raw_content: isSensitive,
            max_results: 10
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000
        }).catch(err => {
            console.error('[Tavily Search Error] (Suppressed):', err.message);
            return { data: { results: [], answer: null } }; 
        });

        const data = response.data || { results: [], answer: null };
        let summary = `✨ **สรุปข้อมูลงานวิจัย (Update: 2569/2026):**\n\n`;
        if (data.answer) {
            summary += `💡 **AI Analyst:**\n${data.answer}\n\n`;
        }
        
        if (data.results && data.results.length > 0) {
            summary += `🔎 **แหล่งข้อมูลอ้างอิง:**\n`;
            summary += data.results.map(r => `• **${r.title}**\n  🔗 ${r.url}\n  📝 ${r.content}`).join('\n\n');
        }

        return (data.answer || (data.results && data.results.length > 0)) ? summary : "ไม่พบข้อมูลที่ต้องการค้นหาค่ะ";
    } catch (e) {
        console.error('Tavily Search Error:', e);
        return "เกิดข้อผิดพลาดในการค้นหาข้อมูลค่ะเจ้านาย";
    }
}

/**
 * Checks for sensitive/NSFW keywords for unrestricted mode routing
 */
function isSensitiveQuery(q) {
    const keywords = ['18+', 'โป๊', 'หลุด', 'หนังผู้ใหญ่', 'nsfw', 'porn', 'sex', 'sexy', 'bikini'];
    const lower = q.toLowerCase();
    return keywords.some(k => lower.includes(k));
}

function logToTerminal(msg) {
    console.log(`[SYSTEM] ${msg}`);
}

async function smartReply(ctx, text, timeout = 0) {
    try {
        if (!text) return;
        const finalMsg = await ctx.reply(text, { parse_mode: 'Markdown' });
        if (timeout > 0) {
            setTimeout(() => {
                ctx.telegram.deleteMessage(ctx.chat.id, finalMsg.message_id).catch(() => {});
            }, timeout);
        }
    } catch (e) {
        // Fallback for markdown errors
        await ctx.reply(text).catch(err => console.error('Reply Failed:', err.message));
    }
}

module.exports = {
    performSearch,
    logToTerminal,
    smartReply
};
