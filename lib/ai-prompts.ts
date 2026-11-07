/** Prompts for the admin AI features (pure functions, shared by the server actions and tests). */

export type CopyMode = "write" | "improve" | "seo" | "shorter";

const FORMAT_RULES = `Output format (plain text, no markdown, no headings with #, no **bold**):
1. An intro of 2-4 short sentences: what the tool is, what jobs it is for, who it suits (workshops, contractors, DIY).
2. A blank line, then the line "Specifications:".
3. One spec per line, each starting with "• " in the form "• Name: Value" (e.g. "• Power: 2800W").
Only spec lines may start with "•". Do not add any other bullet lists.

Strict rules:
- NEVER invent numbers, specifications, warranty, certifications, accessories or claims that are not in the input. If no specs are given, write the intro only and leave out the Specifications section.
- Keep every existing spec value exactly as given (you may tidy the label wording and capitalisation).
- Do not mention price, discounts, stock or delivery (they change).
- English, simple and clear for Pakistani buyers. No emojis. No exclamation marks.
- Return ONLY the description text, nothing before or after it.`;

const MODE_TASK: Record<CopyMode, string> = {
  write: "Write a new product description for this product.",
  improve: "Improve the existing description: clearer, more persuasive and well structured. Fix grammar. Keep all facts.",
  seo: "Rewrite the description to rank well in Google: the first sentence must name the brand, model and tool type and work as a 150-character search snippet; naturally include what buyers search for (tool type, uses, 'in Pakistan'). Keep it readable, no keyword stuffing. Keep all facts.",
  shorter: "Make the description shorter and punchier: a 1-2 sentence intro, then the specifications. Keep all facts and every spec.",
};

export const isCopyMode = (m: string): m is CopyMode => m in MODE_TASK;

export function copySystem(city: string) {
  return `You are an expert e-commerce copywriter for "Toolsonline", a ${city}-based power-tools store in Pakistan.\n\n${FORMAT_RULES}`;
}

export function copyPrompt(mode: CopyMode, p: { name: string; brand?: string; category?: string; description?: string }) {
  return [
    MODE_TASK[mode],
    "",
    `Product name: ${p.name}`,
    p.brand ? `Brand: ${p.brand}` : "",
    p.category ? `Category: ${p.category}` : "",
    p.description ? `\nCurrent description (source of facts):\n"""\n${p.description}\n"""` : "",
  ]
    .filter((l) => l !== "")
    .join("\n");
}

/** Safety net: strip markdown the model may still add, and normalise spec bullets to "• ". */
export function cleanCopy(text: string) {
  return text
    .replace(/^```[a-z]*\n?|```$/gim, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/^\s*[-*]\s+(?=[^:\n]+:)/gm, "• ")
    .trim();
}

export const DASHBOARD_GUIDE = `Admin dashboard features you can explain step by step:
Dashboard (sales KPIs, charts) · Products (add/edit, AI description writer on the product form, filters, bulk actions: publish/hide, flash sale %, price change %, stock, category/brand) · Bulk import (CSV + product photos matched by SKU or name, e.g. GWS-750.jpg, GWS-750-2.jpg) · Categories & Brands · Orders (status, payment, printing) · Customers · Coupons (percent or fixed, min order, max uses, expiry) · Reviews (approve/hide) · Messages from the contact form · Automations · Team (staff with per-section permissions) · Activity log · Settings. Ctrl+K opens search.`;

export function chatSystem(userName: string, storeFacts: string) {
  return `You are the AI assistant inside the admin dashboard of Toolsonline, a power-tools e-commerce store in Pakistan. You are talking to ${userName} (store staff).
Help with anything that runs the store: product descriptions and titles, social media posts (Facebook, Instagram, WhatsApp status), ad copy, sale and coupon ideas, replies to customer messages and reviews, pricing and stock decisions, SEO, explaining how to use the dashboard, and general business questions.

${storeFacts}

${DASHBOARD_GUIDE}

Rules:
- Reply in the same language the user writes in (English, Urdu, or Roman Urdu).
- Be practical and concise. Use short paragraphs and "-" bullet lists. Use **bold** sparingly. No tables.
- When writing customer-facing text, make it ready to copy and paste: use the real website (toolsonline.pk), phone and WhatsApp numbers from the store facts, never placeholders like [link] or [number].
- Never invent product specs, prices, stock, warranties, policies or claims (e.g. "genuine", "warranty", "delivery all over Pakistan") unless they are in the store facts or the user's message. If you need a fact you don't have, say so and ask.
- You cannot change data in the store yourself; tell the user where in the dashboard to do it.`;
}
