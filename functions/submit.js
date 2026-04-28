const REQUIRED_FIELDS = ["name", "email", "whatsapp", "subject", "message"];
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Allow": "POST"
    }
  });

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return map[char] || char;
  });
}

async function parsePayload(request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return request.json();
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const formData = await request.formData();
    return Object.fromEntries(formData.entries());
  }

  return null;
}

function normalizePayload(payload) {
  const normalized = {};
  for (const field of REQUIRED_FIELDS) {
    normalized[field] = String(payload?.[field] || "").trim();
  }
  return normalized;
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object") {
    return "Invalid request body.";
  }

  for (const field of REQUIRED_FIELDS) {
    if (!payload[field]) {
      return `The ${field} field is required.`;
    }
  }

  if (!emailPattern.test(payload.email)) {
    return "Please provide a valid email address.";
  }

  if (payload.message.length < 20) {
    return "Please provide a more detailed message.";
  }

  return null;
}

function createInquiryKey(record) {
  return `inquiry:${record.timestamp}:${record.id}`;
}

async function saveInquiryToKv(env, key, record) {
  if (!env.INQUIRY_KV) {
    return { ok: false, reason: "KV binding INQUIRY_KV is missing." };
  }

  await env.INQUIRY_KV.put(key, JSON.stringify(record));
  return { ok: true };
}

async function verifyTurnstile(env, token, request) {
  if (!env.TURNSTILE_SECRET_KEY) {
    return { ok: false, reason: "Turnstile secret key is missing." };
  }

  if (!token) {
    return { ok: false, reason: "Turnstile verification token is missing." };
  }

  const ip = request.headers.get("CF-Connecting-IP") || "";

  const formData = new FormData();
  formData.append("secret", env.TURNSTILE_SECRET_KEY);
  formData.append("response", token);

  if (ip) {
    formData.append("remoteip", ip);
  }

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    body: formData
  });

  const result = await response.json();

  if (!result.success) {
    return {
      ok: false,
      reason: "Turnstile verification failed."
    };
  }

  return { ok: true };
}

async function sendInquiryEmail(env, record) {
  if (!env.RESEND_API_KEY || !env.DESTINATION_EMAIL || !env.EMAIL_FROM) {
    return {
      ok: false,
      reason: "Missing RESEND_API_KEY, DESTINATION_EMAIL, or EMAIL_FROM."
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [env.DESTINATION_EMAIL],
      reply_to: record.email,
      subject: `[XTech Algo] ${record.subject} | Website Inquiry`,
      html: `
        <h2>New Website Inquiry - XTech Algo Trading Solutions</h2>
        <p><strong>Name:</strong> ${escapeHtml(record.name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(record.email)}</p>
        <p><strong>WhatsApp:</strong> ${escapeHtml(record.whatsapp)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(record.subject)}</p>
        <p><strong>Submitted At:</strong> ${escapeHtml(record.timestamp)}</p>
        <hr>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(record.message).replace(/\n/g, "<br>")}</p>
      `
    })
  });

  if (!response.ok) {
    const details = await response.text();
    return {
      ok: false,
      reason: `Resend error ${response.status}: ${details}`
    };
  }

  return { ok: true };
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let payload;

  try {
    payload = await parsePayload(request);
  } catch {
    return json({ error: "Unable to parse submitted form data." }, 400);
  }
  
const turnstileToken = payload?.["cf-turnstile-response"];

const turnstileResult = await verifyTurnstile(env, turnstileToken, request);

if (!turnstileResult.ok) {
  return json({ error: turnstileResult.reason }, 400);
}

  const normalizedPayload = normalizePayload(payload);
  const validationError = validatePayload(normalizedPayload);

  if (validationError) {
    return json({ error: validationError }, 400);
  }

  const inquiryRecord = {
    id: crypto.randomUUID(),
    ...normalizedPayload,
    timestamp: new Date().toISOString(),
    source: "xtechalgo.com"
  };

  const inquiryKey = createInquiryKey(inquiryRecord);

  try {
    const kvResult = await saveInquiryToKv(env, inquiryKey, inquiryRecord);
    const emailResult = await sendInquiryEmail(env, inquiryRecord);

    if (!kvResult.ok && !emailResult.ok) {
      return json(
        {
          error: "Inquiry could not be processed.",
          details: {
            kv: kvResult.reason,
            email: emailResult.reason
          }
        },
        500
      );
    }

    if (!emailResult.ok) {
      return json(
        {
          message: "Inquiry stored successfully, but email notification failed.",
          warning: emailResult.reason,
          inquiryId: inquiryRecord.id
        },
        202
      );
    }

    return json({
      message: "Your inquiry has been received successfully.",
      inquiryId: inquiryRecord.id
    });
  } catch (error) {
    return json(
      {
        error: "Unexpected server error while processing inquiry.",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      500
    );
  }
}

export function onRequest(context) {
  if (context.request.method !== "POST") {
    return json({ error: "Method not allowed. Use POST." }, 405);
  }

  return onRequestPost(context);
}