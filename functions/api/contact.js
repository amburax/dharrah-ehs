const DEFAULT_ALLOWED_ORIGINS = new Set([
  "https://www.dharrahehs.com",
  "https://dharrahehs.com",
]);
const MAX_ATTACHMENT_COUNT = 5;
const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_BYTES = 15 * 1024 * 1024;
const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "jpg",
  "jpeg",
  "png",
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

function getFileExtension(name) {
  const safeName = (name || "").toLowerCase();
  const parts = safeName.split(".");
  return parts.length > 1 ? parts.pop() : "";
}

function formatBytes(bytes) {
  if (!bytes) return "0 MB";
  if (bytes < 1024 * 1024) {
    return `${Math.round((bytes / 1024) * 10) / 10} KB`;
  }
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function normalizeAttachments(files) {
  const validFiles = normalizeList(files).filter((file) => file && typeof file.arrayBuffer === "function" && typeof file.name === "string");

  if (validFiles.length > MAX_ATTACHMENT_COUNT) {
    throw new Error(`You can upload up to ${MAX_ATTACHMENT_COUNT} files.`);
  }

  let totalBytes = 0;
  const attachments = [];

  for (const file of validFiles) {
    const size = Number(file.size || 0);
    const extension = getFileExtension(file.name);
    totalBytes += size;

    if (!ALLOWED_ATTACHMENT_EXTENSIONS.has(extension)) {
      throw new Error(`${file.name} is not an allowed file type.`);
    }

    if (size > MAX_ATTACHMENT_BYTES) {
      throw new Error(`${file.name} is larger than ${formatBytes(MAX_ATTACHMENT_BYTES)}.`);
    }

    if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
      throw new Error(`The combined attachment size must stay under ${formatBytes(MAX_TOTAL_ATTACHMENT_BYTES)}.`);
    }

    attachments.push({
      filename: file.name,
      content: arrayBufferToBase64(await file.arrayBuffer()),
      size,
    });
  }

  return attachments;
}

async function parseRequestPayload(request) {
  const contentType = request.headers.get("Content-Type") || "";

  if (contentType.includes("application/json")) {
    return {
      payload: await request.json(),
      attachments: [],
    };
  }

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const payloadRaw = formData.get("payload");
    if (typeof payloadRaw !== "string" || !payloadRaw.trim()) {
      throw new Error("Missing payload");
    }

    return {
      payload: JSON.parse(payloadRaw),
      attachments: await normalizeAttachments(formData.getAll("attachments")),
    };
  }

  throw new Error("Unsupported content type");
}

function normalizeGpcbConsentPayload(payload) {
  return {
    requestType: "gpcb_consent",
    caseType: normalizeField(payload.caseType),
    legalEntity: normalizeField(payload.legalEntity),
    plantName: normalizeField(payload.plantName),
    contactName: normalizeField(payload.contactName),
    phone: normalizeField(payload.phone),
    email: normalizeField(payload.email),
    unitStage: normalizeField(payload.unitStage),
    district: normalizeField(payload.district),
    location: normalizeField(payload.location),
    industrySector: normalizeField(payload.industrySector),
    installedCapacity: normalizeField(payload.installedCapacity),
    productSummary: normalizeField(payload.productSummary),
    rawMaterialSummary: normalizeField(payload.rawMaterialSummary),
    fuelAndBoilers: normalizeField(payload.fuelAndBoilers),
    projectCost: normalizeField(payload.projectCost),
    landArea: normalizeField(payload.landArea),
    waterSource: normalizeField(payload.waterSource),
    waterConsumption: normalizeField(payload.waterConsumption),
    wastewaterGeneration: normalizeField(payload.wastewaterGeneration),
    etpStpDetails: normalizeField(payload.etpStpDetails),
    emissionSources: normalizeField(payload.emissionSources),
    apcdDetails: normalizeField(payload.apcdDetails),
    hazardousWaste: normalizeField(payload.hazardousWaste),
    linkedCompliance: normalizeField(payload.linkedCompliance),
    existingConsentNumber: normalizeField(payload.existingConsentNumber),
    existingConsentValidity: normalizeField(payload.existingConsentValidity),
    changeAreas: normalizeList(payload.changeAreas).map(normalizeField).filter(Boolean),
    changeSummary: normalizeField(payload.changeSummary),
    docsReady: normalizeList(payload.docsReady).map(normalizeField).filter(Boolean),
    docsPending: normalizeField(payload.docsPending),
    helpNeeded: normalizeField(payload.helpNeeded),
    urgency: normalizeField(payload.urgency),
    responsePreference: normalizeField(payload.responsePreference),
  };
}

function normalizeEcEiaPayload(payload) {
  return {
    requestType: "ec_eia_intake",
    caseType: normalizeField(payload.caseType),
    proponentName: normalizeField(payload.proponentName),
    projectName: normalizeField(payload.projectName),
    contactName: normalizeField(payload.contactName),
    phone: normalizeField(payload.phone),
    email: normalizeField(payload.email),
    sector: normalizeField(payload.sector),
    scheduleItem: normalizeField(payload.scheduleItem),
    categoryExpectation: normalizeField(payload.categoryExpectation),
    state: normalizeField(payload.state),
    district: normalizeField(payload.district),
    siteLocation: normalizeField(payload.siteLocation),
    locationSensitivity: normalizeField(payload.locationSensitivity),
    capacitySummary: normalizeField(payload.capacitySummary),
    landArea: normalizeField(payload.landArea),
    waterDemand: normalizeField(payload.waterDemand),
    pollutionSummary: normalizeField(payload.pollutionSummary),
    existingEcNumber: normalizeField(payload.existingEcNumber),
    pariveshStatus: normalizeField(payload.pariveshStatus),
    consultantStatus: normalizeField(payload.consultantStatus),
    publicHearingStatus: normalizeField(payload.publicHearingStatus),
    studyStatus: normalizeField(payload.studyStatus),
    docsReady: normalizeList(payload.docsReady).map(normalizeField).filter(Boolean),
    docsPending: normalizeField(payload.docsPending),
    helpNeeded: normalizeField(payload.helpNeeded),
    urgency: normalizeField(payload.urgency),
    responsePreference: normalizeField(payload.responsePreference),
  };
}

function normalizeEprPayload(payload) {
  return {
    requestType: "epr_intake",
    wasteStream: normalizeField(payload.wasteStream),
    applicantRole: normalizeField(payload.applicantRole),
    registrationType: normalizeField(payload.registrationType),
    legalEntity: normalizeField(payload.legalEntity),
    brandName: normalizeField(payload.brandName),
    contactName: normalizeField(payload.contactName),
    phone: normalizeField(payload.phone),
    email: normalizeField(payload.email),
    gstOrState: normalizeField(payload.gstOrState),
    productCategory: normalizeField(payload.productCategory),
    annualQuantity: normalizeField(payload.annualQuantity),
    operatingStates: normalizeField(payload.operatingStates),
    portalStatus: normalizeField(payload.portalStatus),
    channelSummary: normalizeField(payload.channelSummary),
    docsReady: normalizeList(payload.docsReady).map(normalizeField).filter(Boolean),
    currentStatus: normalizeField(payload.currentStatus),
    docsPending: normalizeField(payload.docsPending),
    helpNeeded: normalizeField(payload.helpNeeded),
    urgency: normalizeField(payload.urgency),
    responsePreference: normalizeField(payload.responsePreference),
  };
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

function renderEmailShell({ eyebrow, title, subtitle, body, maxWidth = 920 }) {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f6f1ea; padding: 32px 14px; margin: 0; color: #24344f;">
      <div style="max-width: ${maxWidth}px; margin: 0 auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #eadfd1; box-shadow: 0 10px 30px rgba(36,52,79,0.08);">
        <div style="padding: 24px 24px 20px; background: #fff7ef; border-bottom: 1px solid #eadfd1;">
          <div style="font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; color: #c2410c; font-weight: 700; margin-bottom: 8px;">${escapeHtml(eyebrow)}</div>
          <h2 style="margin: 0; font-size: 30px; line-height: 1.18; color: #1a2d5a;">${toSafeHtml(title, "Dharrah Inquiry")}</h2>
          <p style="margin: 10px 0 0; color: #556887; font-size: 14px; line-height: 1.7;">${toSafeHtml(subtitle, "")}</p>
        </div>
        <div style="padding: 24px; color: #334155;">${body}</div>
      </div>
    </div>
  `;
}

function renderSectionHeading(title, marginTop = 24) {
  return `<div style="font-size: 18px; color: #1a2d5a; font-weight: 700; margin: ${marginTop}px 0 12px;">${escapeHtml(title)}</div>`;
}

function renderContactBlock(title, contact) {
  return `
    <div style="padding: 18px; border: 1px solid #eadfd1; border-radius: 12px; background: #fffdfa;">
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
      <td style="padding: 11px 12px; border: 1px solid #eadfd1; background: #fff7ef; font-weight: 700; width: 38%; color: #1a2d5a;">${escapeHtml(label)}</td>
      <td style="padding: 11px 12px; border: 1px solid #eadfd1; color: #334155;">${toSafeHtml(value, "Not provided")}</td>
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
      <td style="padding: 11px 12px; border: 1px solid #eadfd1; background: #fff7ef; font-weight: 700; color: #1a2d5a;">${escapeHtml(label)}</td>
      ${boilers.map((boiler) => `<td style="padding: 11px 12px; border: 1px solid #eadfd1; color: #334155;">${toSafeHtml(boiler[key], "Not provided")}</td>`).join("")}
    </tr>
  `).join("");
}

function renderTechnicalRows(rows) {
  return rows.map((row) => `
    <tr>
      <td style="padding: 11px 12px; border: 1px solid #eadfd1; background: #fff7ef; font-weight: 700; color: #1a2d5a;">${escapeHtml(row.label)}</td>
      <td style="padding: 11px 12px; border: 1px solid #eadfd1; color: #334155;">${toSafeHtml(row.boiler1, "Not provided")}</td>
      <td style="padding: 11px 12px; border: 1px solid #eadfd1; color: #334155;">${toSafeHtml(row.boiler2, "Not provided")}</td>
      <td style="padding: 11px 12px; border: 1px solid #eadfd1; color: #334155;">${toSafeHtml(row.boiler3, "Not provided")}</td>
    </tr>
  `).join("");
}

function renderTagList(items, fallback) {
  if (!items || items.length === 0) {
    return `<span style="display:inline-block;padding:8px 12px;border-radius:999px;background:#fffdfa;border:1px solid #eadfd1;color:#64748b;font-size:12px;">${escapeHtml(fallback)}</span>`;
  }

  return items.map((item) => `
    <span style="display:inline-block;margin:0 8px 8px 0;padding:8px 12px;border-radius:999px;background:#fff7ef;border:1px solid #f5c9ad;color:#9a3412;font-size:12px;font-weight:600;">${escapeHtml(item)}</span>
  `).join("");
}

function renderAttachmentSection(attachments) {
  if (!attachments || attachments.length === 0) {
    return "";
  }

  return `
    ${renderSectionHeading("Attached Files")}
    <div style="display:grid;gap:10px;">
      ${attachments.map((file) => `
        <div style="padding:12px 14px;border-radius:12px;border:1px solid #eadfd1;background:#fffdfa;color:#334155;">
          <strong style="color:#1a2d5a;">${escapeHtml(file.filename)}</strong>
          <div style="font-size:12px;color:#64748b;margin-top:4px;">${escapeHtml(formatBytes(file.size || 0))}</div>
        </div>
      `).join("")}
    </div>
  `;
}

function buildLeadEmailHtml(data) {
  return renderEmailShell({
    eyebrow: "Lead Inquiry",
    title: data.name || "New Website Lead",
    subtitle: data.subject || "General inquiry received from the Dharrah EHS website.",
    maxWidth: 640,
    body: `
      <table style="width: 100%; border-collapse: collapse; margin: 0 0 18px;">
        <tbody>
          ${renderSimpleRows([
            ["Name", data.name],
            ["Company", data.company],
            ["Phone", data.phone],
            ["Email", data.email],
            ["Service", data.subject || "General Inquiry"],
          ])}
        </tbody>
      </table>
      ${renderSectionHeading("Message", 0)}
      <div style="background-color: #fffdfa; padding: 16px; border-radius: 10px; border: 1px solid #eadfd1; white-space: pre-wrap; color: #334155;">${toSafeHtml(data.message, "No message provided.")}</div>
      ${renderAttachmentSection(data.attachments)}
    `,
  });
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

  return renderEmailShell({
    eyebrow: "Technical Assessment Request",
    title: data.factoryName || "Factory / Plant Assessment",
    subtitle: "Advanced boiler, MDC, and scrubber intake submitted from the Dharrah EHS website.",
    maxWidth: 980,
    body: `
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
      ${renderSectionHeading("Boiler Details")}
      <table style="width: 100%; border-collapse: collapse; margin: 0 0 20px;">
        <thead>
          <tr>
            <th style="padding: 11px 12px; border: 1px solid #eadfd1; background: #fff0e3; color: #1a2d5a; text-align: left;">Field</th>
            ${data.boilers.map((boiler) => `<th style="padding: 11px 12px; border: 1px solid #eadfd1; background: #fff0e3; color: #1a2d5a; text-align: left;">${escapeHtml(boiler.label)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>${renderBoilerRows(data.boilers)}</tbody>
      </table>
      ${renderSectionHeading("Heating Surfaces")}
      <table style="width: 100%; border-collapse: collapse; margin: 0 0 20px;">
        <thead>
          <tr>
            <th style="padding: 11px 12px; border: 1px solid #eadfd1; background: #fff0e3; color: #1a2d5a; text-align: left;">Surface / Metric</th>
            <th style="padding: 11px 12px; border: 1px solid #eadfd1; background: #fff0e3; color: #1a2d5a; text-align: left;">Boiler 1</th>
            <th style="padding: 11px 12px; border: 1px solid #eadfd1; background: #fff0e3; color: #1a2d5a; text-align: left;">Boiler 2</th>
            <th style="padding: 11px 12px; border: 1px solid #eadfd1; background: #fff0e3; color: #1a2d5a; text-align: left;">Boiler 3</th>
          </tr>
        </thead>
        <tbody>${renderTechnicalRows(heatingRows)}</tbody>
      </table>
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; margin-bottom: 20px;">
        <div>
          ${renderSectionHeading("Existing MDC", 0)}
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
          ${renderSectionHeading("Existing Wet Scrubber", 0)}
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
      ${renderSectionHeading("Problem Faced")}
      <div style="background-color: #fffdfa; padding: 16px; border-radius: 10px; border: 1px solid #eadfd1; white-space: pre-wrap; color: #334155;">${toSafeHtml(data.problemSummary, "Not provided")}</div>
      ${renderAttachmentSection(data.attachments)}
    `,
  });
}

function buildGpcbConsentHtml(data) {
  const caseTypeLabels = {
    cte_fresh: "CTE / NOC Fresh",
    cte_amendment: "CTE / NOC Amendment",
    cca_fresh: "CCA Fresh",
    cca_amendment: "CCA Amendment",
    cca_renewal: "CCA Renewal / Continuity",
  };

  return renderEmailShell({
    eyebrow: "GPCB Consent Intake",
    title: data.plantName || data.legalEntity || "GPCB Consent Case",
    subtitle: `Consent route selected: ${caseTypeLabels[data.caseType] || data.caseType || "Not provided"}`,
    body: `
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 20px;">
        <div style="padding: 18px; border: 1px solid #eadfd1; border-radius: 12px; background: #fffdfa;">
          <div style="font-size: 12px; letter-spacing: 1.2px; text-transform: uppercase; color: #c2410c; font-weight: 700; margin-bottom: 10px;">Applicant Profile</div>
          <p style="margin: 0 0 8px;"><strong>Legal Entity:</strong> ${toSafeHtml(data.legalEntity, "Not provided")}</p>
          <p style="margin: 0 0 8px;"><strong>Plant Name:</strong> ${toSafeHtml(data.plantName, "Not provided")}</p>
          <p style="margin: 0 0 8px;"><strong>Unit Stage:</strong> ${toSafeHtml(data.unitStage, "Not provided")}</p>
          <p style="margin: 0;"><strong>Location:</strong> ${toSafeHtml([data.district, data.location].filter(Boolean).join(" / "), "Not provided")}</p>
        </div>
        <div style="padding: 18px; border: 1px solid #eadfd1; border-radius: 12px; background: #fffdfa;">
          <div style="font-size: 12px; letter-spacing: 1.2px; text-transform: uppercase; color: #c2410c; font-weight: 700; margin-bottom: 10px;">Primary Contact</div>
          <p style="margin: 0 0 8px;"><strong>Name:</strong> ${toSafeHtml(data.contactName, "Not provided")}</p>
          <p style="margin: 0 0 8px;"><strong>Phone:</strong> ${toSafeHtml(data.phone, "Not provided")}</p>
          <p style="margin: 0;"><strong>Email:</strong> ${toSafeHtml(data.email, "Not provided")}</p>
        </div>
      </div>
      ${renderSectionHeading("Products, Raw Materials, and Utilities")}
      <table style="width: 100%; border-collapse: collapse; margin: 0 0 20px;"><tbody>${renderSimpleRows([
        ["Industry Sector", data.industrySector],
        ["Installed Capacity", data.installedCapacity],
        ["Project Cost", data.projectCost],
        ["Land Area", data.landArea],
        ["Products", data.productSummary],
        ["Raw Materials", data.rawMaterialSummary],
        ["Fuel / Boilers", data.fuelAndBoilers],
      ])}</tbody></table>
      ${renderSectionHeading("Water, Air, and Waste Profile")}
      <table style="width: 100%; border-collapse: collapse; margin: 0 0 20px;"><tbody>${renderSimpleRows([
        ["Water Source", data.waterSource],
        ["Water Consumption", data.waterConsumption],
        ["Wastewater Generation", data.wastewaterGeneration],
        ["ETP / STP / CETP Status", data.etpStpDetails],
        ["Emission Sources", data.emissionSources],
        ["APCD Details", data.apcdDetails],
        ["Hazardous / Solid Waste", data.hazardousWaste],
        ["Linked Compliance", data.linkedCompliance],
      ])}</tbody></table>
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 20px;">
        <div style="padding: 18px; border: 1px solid #eadfd1; border-radius: 12px; background: #fffdfa;">
          ${renderSectionHeading("Existing Approval Status", 0)}
          <p style="margin: 0 0 8px;"><strong>Existing Consent Number:</strong> ${toSafeHtml(data.existingConsentNumber, "Not provided")}</p>
          <p style="margin: 0;"><strong>Existing Consent Validity:</strong> ${toSafeHtml(data.existingConsentValidity, "Not provided")}</p>
        </div>
        <div style="padding: 18px; border: 1px solid #eadfd1; border-radius: 12px; background: #fffdfa;">
          ${renderSectionHeading("Change Areas", 0)}
          <div>${renderTagList(data.changeAreas, "No specific change area marked")}</div>
        </div>
      </div>
      ${renderSectionHeading("Change Summary")}
      <div style="background-color: #fffdfa; padding: 16px; border-radius: 10px; border: 1px solid #eadfd1; white-space: pre-wrap; color: #334155;">${toSafeHtml(data.changeSummary, "Not provided")}</div>
      ${renderSectionHeading("Documents Ready")}
      <div style="margin-bottom: 16px;">${renderTagList(data.docsReady, "No documents marked yet")}</div>
      <table style="width: 100%; border-collapse: collapse; margin: 0 0 20px;"><tbody>${renderSimpleRows([
        ["Documents Pending", data.docsPending],
        ["Support Needed", data.helpNeeded],
        ["Urgency", data.urgency],
        ["Preferred Response", data.responsePreference],
      ])}</tbody></table>
      ${renderAttachmentSection(data.attachments)}
    `,
  });
}

function buildEcEiaHtml(data) {
  const caseTypeLabels = {
    ec_fresh: "Fresh Project Screening",
    ec_expansion: "Expansion / Modernization",
    ec_existing_update: "Existing EC Update Support",
  };
  const categoryLabels = {
    category_a: "Category A",
    category_b1: "Category B1",
    category_b2: "Category B2",
    screening_needed: "Need Dharrah to screen",
  };

  return renderEmailShell({
    eyebrow: "EC / EIA Screening Intake",
    title: data.projectName || data.proponentName || "EC / EIA Project Screening",
    subtitle: `Route selected: ${caseTypeLabels[data.caseType] || data.caseType || "Not provided"} | Category clue: ${categoryLabels[data.categoryExpectation] || data.categoryExpectation || "Not provided"}`,
    body: `
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 20px;">
        <div style="padding: 18px; border: 1px solid #eadfd1; border-radius: 12px; background: #fffdfa;">
          <div style="font-size: 12px; letter-spacing: 1.2px; text-transform: uppercase; color: #c2410c; font-weight: 700; margin-bottom: 10px;">Project Identity</div>
          <p style="margin: 0 0 8px;"><strong>Proponent:</strong> ${toSafeHtml(data.proponentName, "Not provided")}</p>
          <p style="margin: 0 0 8px;"><strong>Project:</strong> ${toSafeHtml(data.projectName, "Not provided")}</p>
          <p style="margin: 0 0 8px;"><strong>Sector:</strong> ${toSafeHtml(data.sector, "Not provided")}</p>
          <p style="margin: 0;"><strong>Schedule Item:</strong> ${toSafeHtml(data.scheduleItem, "Not provided")}</p>
        </div>
        <div style="padding: 18px; border: 1px solid #eadfd1; border-radius: 12px; background: #fffdfa;">
          <div style="font-size: 12px; letter-spacing: 1.2px; text-transform: uppercase; color: #c2410c; font-weight: 700; margin-bottom: 10px;">Primary Contact</div>
          <p style="margin: 0 0 8px;"><strong>Name:</strong> ${toSafeHtml(data.contactName, "Not provided")}</p>
          <p style="margin: 0 0 8px;"><strong>Phone:</strong> ${toSafeHtml(data.phone, "Not provided")}</p>
          <p style="margin: 0;"><strong>Email:</strong> ${toSafeHtml(data.email, "Not provided")}</p>
        </div>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin: 0 0 20px;"><tbody>${renderSimpleRows([
        ["Expected Category", categoryLabels[data.categoryExpectation] || data.categoryExpectation],
        ["State / District", [data.state, data.district].filter(Boolean).join(" / ")],
        ["Site Location", data.siteLocation],
        ["Location Sensitivity", data.locationSensitivity],
        ["Capacity / Configuration", data.capacitySummary],
        ["Land Area", data.landArea],
        ["Water & Utilities", data.waterDemand],
        ["Pollution Summary", data.pollutionSummary],
        ["Existing EC / ToR Number", data.existingEcNumber],
        ["PARIVESH Status", data.pariveshStatus],
        ["Consultant Status", data.consultantStatus],
        ["Public Hearing / Baseline Status", data.publicHearingStatus],
        ["Study Notes", data.studyStatus],
      ])}</tbody></table>
      ${renderSectionHeading("Documents Ready")}
      <div style="margin-bottom: 16px;">${renderTagList(data.docsReady, "No documents marked yet")}</div>
      <table style="width: 100%; border-collapse: collapse;"><tbody>${renderSimpleRows([
        ["Documents Pending", data.docsPending],
        ["Support Needed", data.helpNeeded],
        ["Urgency", data.urgency],
        ["Preferred Response", data.responsePreference],
      ])}</tbody></table>
      ${renderAttachmentSection(data.attachments)}
    `,
  });
}

function buildEprHtml(data) {
  const wasteStreamLabels = {
    plastic_waste: "Plastic Waste EPR",
    e_waste: "E-Waste EPR",
    other_stream: "Battery / Tyre / Used Oil Route",
  };
  const roleLabels = {
    producer: "Producer",
    manufacturer: "Manufacturer",
    importer: "Importer",
    brand_owner: "Brand Owner",
    seller_or_trader: "Seller / Trader",
    recycler_or_dismantler: "Recycler / Dismantler",
  };

  return renderEmailShell({
    eyebrow: "EPR Role & Category Intake",
    title: data.legalEntity || data.brandName || "EPR Screening",
    subtitle: `Waste stream: ${wasteStreamLabels[data.wasteStream] || data.wasteStream || "Not provided"} | Role: ${roleLabels[data.applicantRole] || data.applicantRole || "Not provided"}`,
    body: `
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 20px;">
        <div style="padding: 18px; border: 1px solid #eadfd1; border-radius: 12px; background: #fffdfa;">
          <div style="font-size: 12px; letter-spacing: 1.2px; text-transform: uppercase; color: #c2410c; font-weight: 700; margin-bottom: 10px;">Applicant Profile</div>
          <p style="margin: 0 0 8px;"><strong>Legal Entity:</strong> ${toSafeHtml(data.legalEntity, "Not provided")}</p>
          <p style="margin: 0 0 8px;"><strong>Brand / Trade Name:</strong> ${toSafeHtml(data.brandName, "Not provided")}</p>
          <p style="margin: 0 0 8px;"><strong>GST / State:</strong> ${toSafeHtml(data.gstOrState, "Not provided")}</p>
          <p style="margin: 0;"><strong>Registration Type:</strong> ${toSafeHtml(data.registrationType, "Not provided")}</p>
        </div>
        <div style="padding: 18px; border: 1px solid #eadfd1; border-radius: 12px; background: #fffdfa;">
          <div style="font-size: 12px; letter-spacing: 1.2px; text-transform: uppercase; color: #c2410c; font-weight: 700; margin-bottom: 10px;">Primary Contact</div>
          <p style="margin: 0 0 8px;"><strong>Name:</strong> ${toSafeHtml(data.contactName, "Not provided")}</p>
          <p style="margin: 0 0 8px;"><strong>Phone:</strong> ${toSafeHtml(data.phone, "Not provided")}</p>
          <p style="margin: 0;"><strong>Email:</strong> ${toSafeHtml(data.email, "Not provided")}</p>
        </div>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin: 0 0 20px;"><tbody>${renderSimpleRows([
        ["Product / Category", data.productCategory],
        ["Annual Quantity", data.annualQuantity],
        ["Operating States", data.operatingStates],
        ["Portal Status", data.portalStatus],
        ["Sales / Channel Summary", data.channelSummary],
        ["Current Registration / Filing Status", data.currentStatus],
        ["Compliance Gaps / Missing Inputs", data.docsPending],
      ])}</tbody></table>
      ${renderSectionHeading("Documents Ready")}
      <div style="margin-bottom: 16px;">${renderTagList(data.docsReady, "No documents marked yet")}</div>
      <table style="width: 100%; border-collapse: collapse;"><tbody>${renderSimpleRows([
        ["Support Needed", data.helpNeeded],
        ["Urgency", data.urgency],
        ["Preferred Response", data.responsePreference],
      ])}</tbody></table>
      ${renderAttachmentSection(data.attachments)}
    `,
  });
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

  try {
    const { payload, attachments } = await parseRequestPayload(request);
    const requestType = normalizeField(payload.requestType);
    const data = {
      name: normalizeField(payload.name),
      company: normalizeField(payload.company),
      phone: normalizeField(payload.phone),
      email: normalizeField(payload.email),
      subject: normalizeField(payload.subject),
      message: normalizeField(payload.message),
      attachments,
    };
    const technicalAssessment = requestType === "technical_assessment"
      ? { ...normalizeTechnicalPayload(payload), attachments }
      : null;
    const gpcbConsent = requestType === "gpcb_consent"
      ? { ...normalizeGpcbConsentPayload(payload), attachments }
      : null;
    const ecEiaIntake = requestType === "ec_eia_intake"
      ? { ...normalizeEcEiaPayload(payload), attachments }
      : null;
    const eprIntake = requestType === "epr_intake"
      ? { ...normalizeEprPayload(payload), attachments }
      : null;

    const emailHTML = technicalAssessment
      ? buildTechnicalAssessmentHtml(technicalAssessment)
      : gpcbConsent
        ? buildGpcbConsentHtml(gpcbConsent)
        : ecEiaIntake
          ? buildEcEiaHtml(ecEiaIntake)
          : eprIntake
            ? buildEprHtml(eprIntake)
        : buildLeadEmailHtml(data);
    const subject = technicalAssessment
      ? `Technical Assessment: ${technicalAssessment.factoryName || technicalAssessment.primaryContact.name || "Website Visitor"}`
      : gpcbConsent
        ? `GPCB Consent Intake: ${gpcbConsent.plantName || gpcbConsent.legalEntity || "Website Visitor"} - ${gpcbConsent.caseType || "Route Pending"}`
        : ecEiaIntake
          ? `EC / EIA Intake: ${ecEiaIntake.projectName || ecEiaIntake.proponentName || "Website Visitor"} - ${ecEiaIntake.categoryExpectation || "Screening Pending"}`
          : eprIntake
            ? `EPR Intake: ${eprIntake.legalEntity || eprIntake.brandName || "Website Visitor"} - ${eprIntake.wasteStream || "Role Pending"}`
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
        attachments: attachments.length > 0
          ? attachments.map((file) => ({
            filename: file.filename,
            content: file.content,
          }))
          : undefined,
      }),
    });

    if (!resendResponse.ok) {
      return jsonResponse({ success: false, error: "Email delivery failed" }, 502, corsHeaders);
    }

    return jsonResponse({ success: true }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : "Invalid request" }, 400, corsHeaders);
  }
}

export async function onRequest(context) {
  return handleContact(context.request, context.env);
}
