const DEFAULT_ALLOWED_ORIGINS = new Set([
  "https://www.dharrahehs.com",
  "https://dharrahehs.com",
]);

function getAllowedOrigins(env) {
  const configured = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return configured.length > 0 ? new Set(configured) : DEFAULT_ALLOWED_ORIGINS;
}

function getCorsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const allowedOrigins = getAllowedOrigins(env);
  const allowOrigin = origin && allowedOrigins.has(origin)
    ? origin
    : "https://www.dharrahehs.com";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function jsonResponse(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizeField(value) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toSafeHtml(value, fallback) {
  return value ? escapeHtml(value) : fallback;
}

export default {
  async fetch(request, env) {
    const corsHeaders = getCorsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405, corsHeaders);
    }

    if (!env.RESEND_API_KEY) {
      return jsonResponse({ success: false, error: "Worker not configured" }, 500, corsHeaders);
    }

    const contentType = request.headers.get("Content-Type") || "";
    if (!contentType.includes("application/json")) {
      return jsonResponse({ success: false, error: "Expected JSON body" }, 415, corsHeaders);
    }

    try {
      const payload = await request.json();
      const data = {
        name: normalizeField(payload.name),
        company: normalizeField(payload.company),
        phone: normalizeField(payload.phone),
        email: normalizeField(payload.email),
        subject: normalizeField(payload.subject),
        message: normalizeField(payload.message),
      };

      const emailHTML = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; padding: 30px 15px; margin: 0;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <div style="background-color: #1e293b; color: #ffffff; padding: 25px 20px; text-align: center;">
              <h2 style="margin: 0; font-size: 24px; font-weight: 600;">New Lead Received</h2>
            </div>
            <div style="padding: 30px; color: #334155;">
              <p><strong>Name:</strong> ${toSafeHtml(data.name, "Not provided")}</p>
              <p><strong>Company:</strong> ${toSafeHtml(data.company, "Not provided")}</p>
              <p><strong>Phone:</strong> ${toSafeHtml(data.phone, "Not provided")}</p>
              <p><strong>Email:</strong> ${toSafeHtml(data.email, "Not provided")}</p>
              <p><strong>Service:</strong> ${toSafeHtml(data.subject, "General Inquiry")}</p>
              <p><strong>Message:</strong></p>
              <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; white-space: pre-wrap;">${toSafeHtml(data.message, "No message provided.")}</div>
            </div>
          </div>
        </div>
      `;

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.FROM_EMAIL || "Website Form <contact@dharrahehs.com>",
          to: [env.CONTACT_RECIPIENT || "care@dharrahehs.com"],
          subject: `New Lead: ${data.name || "Website Visitor"}`,
          html: emailHTML,
        }),
      });

      if (!resendResponse.ok) {
        return jsonResponse({ success: false, error: "Email delivery failed" }, 502, corsHeaders);
      }

      return jsonResponse({ success: true }, 200, corsHeaders);
    } catch (error) {
      return jsonResponse({ success: false, error: "Invalid request" }, 400, corsHeaders);
    }
  },
};
