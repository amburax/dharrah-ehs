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

function normalizeList(list) {
  return Array.isArray(list) ? list : [];
}

function normalizeTechnicalPayload(payload) {
  const primary = payload.primaryContact || {};
  const boilerEngineer = payload.boilerEngineer || {};
  const plantContext = payload.plantContext || {};
  const mdc = payload.mdc || {};
  const scrubber = payload.scrubber || {};

  return {
    requestType: "technical_assessment",
    factoryName: normalizeField(payload.factoryName),
    nearestStation: normalizeField(payload.nearestStation),
    trainAccess: normalizeField(payload.trainAccess),
    busAccess: normalizeField(payload.busAccess),
    primaryContact: {
      role: normalizeField(primary.role) || "GMT / WM / CE",
      name: normalizeField(primary.name),
      phone: normalizeField(primary.phone),
      email: normalizeField(primary.email),
    },
    boilerEngineer: {
      role: normalizeField(boilerEngineer.role) || "Boiler Engineer",
      name: normalizeField(boilerEngineer.name),
      phone: normalizeField(boilerEngineer.phone),
      email: normalizeField(boilerEngineer.email),
    },
    boilers: normalizeList(payload.boilers).map((boiler, index) => ({
      label: normalizeField(boiler?.label) || `Boiler ${index + 1}`,
      make: normalizeField(boiler?.make),
      capacity: normalizeField(boiler?.capacity),
      steamPressure: normalizeField(boiler?.steamPressure),
      fuel: normalizeField(boiler?.fuel),
      fuelAnalysis: normalizeField(boiler?.fuelAnalysis),
      fuelConsumption: normalizeField(boiler?.fuelConsumption),
      superHeatedTemp: normalizeField(boiler?.superHeatedTemp),
    })),
    heatingSurfaces: {
      furnace: normalizeTechnicalRow(plantContext.furnace, "Furnace"),
      bank: normalizeTechnicalRow(plantContext.bank, "Bank"),
      economizer: normalizeTechnicalRow(plantContext.economizer, "Economizer"),
      superHeater: normalizeTechnicalRow(plantContext.superHeater, "Super Heater"),
      airHeater: normalizeTechnicalRow(plantContext.airHeater, "Air Heater"),
      flueGasVolume: normalizeTechnicalRow(plantContext.flueGasVolume, "Flue Gas Volume"),
      flueGasTemp: normalizeTechnicalRow(plantContext.flueGasTemp, "Flue Gas Temp"),
    },
    mdc: {
      cycloneCount: normalizeField(mdc.cycloneCount),
      cycloneSize: normalizeField(mdc.cycloneSize),
      areaUsed: normalizeField(mdc.areaUsed),
    },
    scrubber: {
      make: normalizeField(scrubber.make),
      dimensions: normalizeField(scrubber.dimensions),
      areaUsed: normalizeField(scrubber.areaUsed),
      pumpMotor: normalizeField(scrubber.pumpMotor),
      ductInlet: normalizeField(scrubber.ductInlet),
      ductOutlet: normalizeField(scrubber.ductOutlet),
      ashPitSize: normalizeField(scrubber.ashPitSize),
    },
    problemSummary: normalizeField(payload.problemSummary),
  };
}

function normalizeTechnicalRow(row, label) {
  const data = row || {};
  return {
    label,
    boiler1: normalizeField(data.boiler1),
    boiler2: normalizeField(data.boiler2),
    boiler3: normalizeField(data.boiler3),
  };
}

function renderContactBlock(title, contact) {
  return `
    <div style="padding: 18px; border: 1px solid #e2e8f0; border-radius: 10px; background: #ffffff;">
      <div style="font-size: 12px; letter-spacing: 1.2px; text-transform: uppercase; color: #c2410c; font-weight: 700; margin-bottom: 10px;">${escapeHtml(title)}</div>
      <p style="margin: 0 0 8px;"><strong>Name:</strong> ${toSafeHtml(contact.name, "Not provided")}</p>
      <p style="margin: 0 0 8px;"><strong>Phone:</strong> ${toSafeHtml(contact.phone, "Not provided")}</p>
      <p style="margin: 0;"><strong>Email:</strong> ${toSafeHtml(contact.email, "Not provided")}</p>
    </div>
  `;
}

function renderSimpleRows(rows) {
  return rows.map(([label, value]) => `
    <tr>
      <td style="padding: 11px 12px; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: 700; width: 38%;">${escapeHtml(label)}</td>
      <td style="padding: 11px 12px; border: 1px solid #e2e8f0;">${toSafeHtml(value, "Not provided")}</td>
    </tr>
  `).join("");
}

function renderBoilerRows(boilers) {
  return [
    ["Boiler Make", "make"],
    ["Boiler Capacity", "capacity"],
    ["Steam Pressure (kg/cm2)", "steamPressure"],
    ["Boiler Fuel", "fuel"],
    ["Fuel Analysis (NCV / %Ash / %C)", "fuelAnalysis"],
    ["Fuel Consumption", "fuelConsumption"],
    ["Super Heated Steam Temp (deg C)", "superHeatedTemp"],
  ].map(([label, key]) => `
    <tr>
      <td style="padding: 11px 12px; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: 700;">${escapeHtml(label)}</td>
      ${boilers.map((boiler) => `<td style="padding: 11px 12px; border: 1px solid #e2e8f0;">${toSafeHtml(boiler[key], "—")}</td>`).join("")}
    </tr>
  `).join("");
}

function renderTechnicalRows(rows) {
  return rows.map((row) => `
    <tr>
      <td style="padding: 11px 12px; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: 700;">${escapeHtml(row.label)}</td>
      <td style="padding: 11px 12px; border: 1px solid #e2e8f0;">${toSafeHtml(row.boiler1, "—")}</td>
      <td style="padding: 11px 12px; border: 1px solid #e2e8f0;">${toSafeHtml(row.boiler2, "—")}</td>
      <td style="padding: 11px 12px; border: 1px solid #e2e8f0;">${toSafeHtml(row.boiler3, "—")}</td>
    </tr>
  `).join("");
}

function buildLeadEmailHtml(data) {
  return `
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
}

function buildTechnicalAssessmentHtml(data) {
  const heatingRows = [
    data.heatingSurfaces.furnace,
    data.heatingSurfaces.bank,
    data.heatingSurfaces.economizer,
    data.heatingSurfaces.superHeater,
    data.heatingSurfaces.airHeater,
    data.heatingSurfaces.flueGasVolume,
    data.heatingSurfaces.flueGasTemp,
  ];

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; padding: 30px 15px; margin: 0;">
      <div style="max-width: 980px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 8px 24px rgba(15,23,42,0.08);">
        <div style="background: linear-gradient(135deg, #1e293b, #334155); color: #ffffff; padding: 28px 24px;">
          <div style="font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; opacity: 0.8; margin-bottom: 10px;">Technical Assessment Request</div>
          <h2 style="margin: 0; font-size: 28px; line-height: 1.2;">${toSafeHtml(data.factoryName, "Factory / Plant Assessment")}</h2>
          <p style="margin: 12px 0 0; opacity: 0.88;">Advanced boiler, MDC, and scrubber intake submitted from the Dharrah EHS website.</p>
        </div>
        <div style="padding: 24px; color: #334155;">
          <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 18px;">
            ${renderContactBlock(data.primaryContact.role, data.primaryContact)}
            ${renderContactBlock(data.boilerEngineer.role, data.boilerEngineer)}
          </div>

          <table style="width: 100%; border-collapse: collapse; margin: 0 0 20px;">
            <tbody>
              ${renderSimpleRows([
                ["Factory Name", data.factoryName],
                ["Nearest Station", data.nearestStation],
                ["Train Access", data.trainAccess],
                ["Bus Access", data.busAccess],
              ])}
            </tbody>
          </table>

          <div style="font-size: 18px; color: #1e293b; font-weight: 700; margin: 24px 0 12px;">Boiler Details</div>
          <table style="width: 100%; border-collapse: collapse; margin: 0 0 20px;">
            <thead>
              <tr>
                <th style="padding: 11px 12px; border: 1px solid #cbd5e1; background: #1e293b; color: #ffffff; text-align: left;">Field</th>
                ${data.boilers.map((boiler) => `<th style="padding: 11px 12px; border: 1px solid #cbd5e1; background: #1e293b; color: #ffffff; text-align: left;">${escapeHtml(boiler.label)}</th>`).join("")}
              </tr>
            </thead>
            <tbody>${renderBoilerRows(data.boilers)}</tbody>
          </table>

          <div style="font-size: 18px; color: #1e293b; font-weight: 700; margin: 24px 0 12px;">Heating Surfaces</div>
          <table style="width: 100%; border-collapse: collapse; margin: 0 0 20px;">
            <thead>
              <tr>
                <th style="padding: 11px 12px; border: 1px solid #cbd5e1; background: #1e293b; color: #ffffff; text-align: left;">Surface / Metric</th>
                <th style="padding: 11px 12px; border: 1px solid #cbd5e1; background: #1e293b; color: #ffffff; text-align: left;">Boiler 1</th>
                <th style="padding: 11px 12px; border: 1px solid #cbd5e1; background: #1e293b; color: #ffffff; text-align: left;">Boiler 2</th>
                <th style="padding: 11px 12px; border: 1px solid #cbd5e1; background: #1e293b; color: #ffffff; text-align: left;">Boiler 3</th>
              </tr>
            </thead>
            <tbody>${renderTechnicalRows(heatingRows)}</tbody>
          </table>

          <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; margin-bottom: 20px;">
            <div>
              <div style="font-size: 18px; color: #1e293b; font-weight: 700; margin: 0 0 12px;">Existing MDC</div>
              <table style="width: 100%; border-collapse: collapse;">
                <tbody>
                  ${renderSimpleRows([
                    ["No. of Cyclones", data.mdc.cycloneCount],
                    ["Cyclone Dia x Length", data.mdc.cycloneSize],
                    ["Area Used (W x L)", data.mdc.areaUsed],
                  ])}
                </tbody>
              </table>
            </div>
            <div>
              <div style="font-size: 18px; color: #1e293b; font-weight: 700; margin: 0 0 12px;">Existing Wet Scrubber</div>
              <table style="width: 100%; border-collapse: collapse;">
                <tbody>
                  ${renderSimpleRows([
                    ["Scrubber Make", data.scrubber.make],
                    ["Dia x Height", data.scrubber.dimensions],
                    ["Area Used", data.scrubber.areaUsed],
                    ["Pump Cap x Motor HP", data.scrubber.pumpMotor],
                    ["Duct Size Inlet", data.scrubber.ductInlet],
                    ["Duct Size Outlet", data.scrubber.ductOutlet],
                    ["Ash Pit Size", data.scrubber.ashPitSize],
                  ])}
                </tbody>
              </table>
            </div>
          </div>

          <div style="font-size: 18px; color: #1e293b; font-weight: 700; margin: 24px 0 12px;">Problem Faced</div>
          <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; white-space: pre-wrap;">${toSafeHtml(data.problemSummary, "Not provided")}</div>
        </div>
      </div>
    </div>
  `;
}

async function handleContact(request, env) {
  const corsHeaders = getCorsHeaders(request, env);

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405, corsHeaders);
  }

  if (!env.RESEND_API_KEY) {
    return jsonResponse({ success: false, error: "Pages Function not configured" }, 500, corsHeaders);
  }

  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.includes("application/json")) {
    return jsonResponse({ success: false, error: "Expected JSON body" }, 415, corsHeaders);
  }

  try {
    const payload = await request.json();
    const requestType = normalizeField(payload.requestType);
    const data = {
      name: normalizeField(payload.name),
      company: normalizeField(payload.company),
      phone: normalizeField(payload.phone),
      email: normalizeField(payload.email),
      subject: normalizeField(payload.subject),
      message: normalizeField(payload.message),
    };
    const technicalAssessment = requestType === "technical_assessment"
      ? normalizeTechnicalPayload(payload)
      : null;

    const emailHTML = technicalAssessment
      ? buildTechnicalAssessmentHtml(technicalAssessment)
      : buildLeadEmailHtml(data);
    const subject = technicalAssessment
      ? `Technical Assessment: ${technicalAssessment.factoryName || technicalAssessment.primaryContact.name || "Website Visitor"}`
      : `New Lead: ${data.name || "Website Visitor"}`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.FROM_EMAIL || "Website Form <contact@dharrahehs.com>",
        to: [env.CONTACT_RECIPIENT || "care@dharrahehs.com"],
        subject,
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
}

export async function onRequest(context) {
  return handleContact(context.request, context.env);
}
