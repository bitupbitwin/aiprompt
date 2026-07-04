// Vercel 无服务函数：/api/generate
// 作用：前端把分类信息发到这里，本函数持有 xAI(Grok) 的 API Key，
// 在服务端调用 Grok 生成新提问，再把结果返回前端。Key 永远不暴露到浏览器。
//
// 需要在 Vercel 项目里配置环境变量：
//   XAI_API_KEY   （必填）你的 xAI API Key
//   XAI_MODEL     （可选）默认 grok-4，可改成 grok-3 / grok-2-1212 等
//
// xAI 接口为 OpenAI 兼容格式：POST https://api.x.ai/v1/chat/completions

const XAI_URL = "https://api.x.ai/v1/chat/completions";

export default async function handler(req, res) {
  // 允许跨域（前端若与本函数不同源时也能用）
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "服务端未配置 XAI_API_KEY" });
    return;
  }
  const model = process.env.XAI_MODEL || "grok-4";

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const name = String(body.name || "").slice(0, 40);
    const principle = String(body.principle || "").slice(0, 800);
    const examples = Array.isArray(body.examples) ? body.examples.slice(0, 3).map(String) : [];
    const count = Math.min(Math.max(parseInt(body.count, 10) || 4, 1), 8);

    if (!name || !principle) {
      res.status(400).json({ error: "缺少 name 或 principle" });
      return;
    }

    const prompt = `你是一个"AI 深度提问"设计师。请按以下分类要求，生成 ${count} 条全新的中文提问。

分类名：${name}
设计要点：${principle}
已有示例（不要重复，只参考风格）：
${examples.map(q => "- " + q).join("\n")}

要求：
1. 每条都要新颖，不能是示例的换皮
2. 口语化，像真人会问的话
3. 只输出 JSON 数组，格式 ["问题1","问题2",...]，不要任何其他文字、不要 markdown 代码块`;

    const upstream = await fetch(XAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        // grok-4 属推理模型，思考 token 计入上限，给足余量避免 JSON 被截断
        max_tokens: 2000,
        temperature: 1.0,
        messages: [
          { role: "system", content: "你是一个精于设计'能逼出 AI 深度、非常规回答'的中文提问的设计师。只输出 JSON 数组，不要任何多余文字。" },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      res.status(502).json({ error: `xAI 返回 ${upstream.status}`, detail: detail.slice(0, 300) });
      return;
    }

    const data = await upstream.json();
    const text = data?.choices?.[0]?.message?.content || "";
    const cleaned = String(text).replace(/```json|```/g, "").trim();

    let questions;
    try {
      questions = JSON.parse(cleaned);
    } catch (e) {
      // 兜底：尝试从文本里截取第一个 JSON 数组
      const match = cleaned.match(/\[[\s\S]*\]/);
      questions = match ? JSON.parse(match[0]) : null;
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      res.status(502).json({ error: "模型未返回有效的题目数组" });
      return;
    }

    const clean = questions.map(String).map(s => s.trim()).filter(Boolean).slice(0, count);
    res.status(200).json({ questions: clean, model });
  } catch (e) {
    res.status(500).json({ error: "生成失败", detail: String(e && e.message || e).slice(0, 300) });
  }
}
