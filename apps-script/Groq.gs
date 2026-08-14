function movaParseServiceWithGroq(text) {
  movaRequire(text, "El texto para analizar esta vacio.");
  const apiKey = movaRequiredProperty("GROQ_API_KEY");
  const model = movaOptionalProperty("GROQ_MODEL", "openai/gpt-oss-20b");
  const preparedText = movaPrepareAIText(text);
  let result = movaGroqCompletion(apiKey, model, preparedText, true, false);

  if (result.status < 200 || result.status >= 300) {
    const canRetryPlainJson = result.status === 400;
    if (!canRetryPlainJson) {
      throw movaError("GROQ_ERROR", "Groq devolvio error " + result.status + ": " + result.body.slice(0, 240));
    }
    result = movaGroqCompletion(apiKey, model, preparedText, false, false);
  }

  if (result.status === 400) {
    result = movaGroqCompletion(apiKey, model, preparedText, false, true);
  }

  if (result.status < 200 || result.status >= 300) {
    throw movaError("GROQ_ERROR", "Groq devolvio error " + result.status + ": " + result.body.slice(0, 240));
  }

  const parsed = JSON.parse(result.body);
  const content = parsed.choices && parsed.choices[0] && parsed.choices[0].message && parsed.choices[0].message.content;
  if (!content) throw movaError("GROQ_EMPTY", "Groq no devolvio contenido.");
  try {
    return movaNormalizeAIDraft(movaParseJsonObject(content));
  } catch (err) {
    throw movaError("GROQ_BAD_JSON", "Groq devolvio JSON invalido incluso despues del retry.");
  }
}

function movaGroqCompletion(apiKey, model, text, structured, compactRetry) {
  const payload = {
    model: model,
    temperature: 0,
    max_completion_tokens: 1800,
    messages: [
      { role: "system", content: compactRetry ? movaGroqCompactPrompt() : movaGroqSystemPrompt(structured) },
      { role: "user", content: String(text).slice(0, 18000) }
    ]
  };
  if (structured) payload.response_format = movaGroqResponseFormat(model);

  const response = UrlFetchApp.fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "post",
    contentType: "application/json",
    muteHttpExceptions: true,
    headers: { Authorization: "Bearer " + apiKey },
    payload: JSON.stringify(payload)
  });
  return { status: response.getResponseCode(), body: response.getContentText() };
}

function movaGroqSystemPrompt(structured) {
  return [
    "Sos un extractor de datos para MOVA, una operacion logistica.",
    "Devolve exclusivamente JSON valido. No uses markdown.",
    structured ? "Respeta exactamente el schema indicado por response_format." : "Devolve un unico objeto JSON con el schema indicado, sin texto antes ni despues.",
    "Todos los campos del schema deben existir siempre. Si falta un dato, el valor debe ser null o [] segun corresponda.",
    "No uses undefined, NaN, comentarios, trailing commas ni strings vacios para representar datos faltantes.",
    "Extrae solamente informacion presente o razonablemente inequivoca.",
    "No completes direcciones, telefonos, precios, pesos, fechas o nombres por imaginacion.",
    "Si un dato no existe o es ambiguo, devolve null.",
    "Si aparece una fecha relativa junto con una fecha absoluta, usa la fecha absoluta. Fechas y horas deben volver como ISO 8601 cuando sean inequívocas.",
    "No hagas conversiones de moneda. No inventes kilometros.",
    "No inventes clientes ni transportistas. No guardes nada automaticamente.",
    "commissionAppliesTo debe ser [\"ARS\"], [\"USD\"], [\"ARS\",\"USD\"] o null.",
    "generalNotes siempre debe ser un array de strings.",
    "Schema exacto:",
    JSON.stringify(movaEmptyAIDraft())
  ].join("\n");
}

function movaGroqCompactPrompt() {
  return [
    "Return only valid minified JSON. No markdown. No prose.",
    "Extract a MOVA logistics service draft from the Spanish text.",
    "Every key in this exact object must be present. Missing or ambiguous values must be null. generalNotes must be an array.",
    "Do not invent data. Do not convert currencies. Do not invent distance.",
    "Object shape:",
    JSON.stringify(movaEmptyAIDraft())
  ].join("\n");
}

function movaPrepareAIText(text) {
  return String(text)
    .replace(/\r/g, "\n")
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function movaGroqResponseFormat(model) {
  if (String(model).indexOf("openai/gpt-oss-") === 0) {
    return {
      type: "json_schema",
      json_schema: {
        name: "mova_service_draft",
        strict: true,
        schema: movaAIDraftJsonSchema()
      }
    };
  }
  return { type: "json_object" };
}

function movaAIDraftJsonSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "title", "client", "transport", "contractDate", "startAt", "estimatedEndAt", "route", "cargo",
      "pricing", "clientInstructions", "transportInstructions", "generalNotes"
    ],
    properties: {
      title: { type: ["string", "null"] },
      client: {
        type: "object",
        additionalProperties: false,
        required: ["name", "whatsapp", "cuitCuil"],
        properties: {
          name: { type: ["string", "null"] },
          whatsapp: { type: ["string", "null"] },
          cuitCuil: { type: ["string", "null"] }
        }
      },
      transport: {
        type: "object",
        additionalProperties: false,
        required: ["name", "whatsapp", "vehicleModel", "plate"],
        properties: {
          name: { type: ["string", "null"] },
          whatsapp: { type: ["string", "null"] },
          vehicleModel: { type: ["string", "null"] },
          plate: { type: ["string", "null"] }
        }
      },
      contractDate: { type: ["string", "null"] },
      startAt: { type: ["string", "null"] },
      estimatedEndAt: { type: ["string", "null"] },
      route: {
        type: "object",
        additionalProperties: false,
        required: ["origin", "destination", "distanceKm"],
        properties: {
          origin: { type: ["string", "null"] },
          destination: { type: ["string", "null"] },
          distanceKm: { type: ["number", "null"] }
        }
      },
      cargo: {
        type: "object",
        additionalProperties: false,
        required: ["description", "weightKg", "packageCount"],
        properties: {
          description: { type: ["string", "null"] },
          weightKg: { type: ["number", "null"] },
          packageCount: { type: ["number", "null"] }
        }
      },
      pricing: {
        type: "object",
        additionalProperties: false,
        required: ["ars", "usd", "commissionPercent", "commissionAppliesTo"],
        properties: {
          ars: { type: ["number", "null"] },
          usd: { type: ["number", "null"] },
          commissionPercent: { type: ["number", "null"] },
          commissionAppliesTo: {
            type: ["array", "null"],
            items: { type: "string", enum: ["ARS", "USD"] }
          }
        }
      },
      clientInstructions: { type: ["string", "null"] },
      transportInstructions: { type: ["string", "null"] },
      generalNotes: { type: "array", items: { type: "string" } }
    }
  };
}

function movaParseJsonObject(content) {
  try {
    return JSON.parse(content);
  } catch (err) {
    const text = String(content);
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) throw err;
    return JSON.parse(text.slice(start, end + 1));
  }
}

function movaEmptyAIDraft() {
  return {
    title: null,
    client: { name: null, whatsapp: null, cuitCuil: null },
    transport: { name: null, whatsapp: null, vehicleModel: null, plate: null },
    contractDate: null,
    startAt: null,
    estimatedEndAt: null,
    route: { origin: null, destination: null, distanceKm: null },
    cargo: { description: null, weightKg: null, packageCount: null },
    pricing: { ars: null, usd: null, commissionPercent: null, commissionAppliesTo: null },
    clientInstructions: null,
    transportInstructions: null,
    generalNotes: []
  };
}

function movaNormalizeAIDraft(input) {
  const draft = movaEmptyAIDraft();
  input = input || {};
  draft.title = movaStringOrNull(input.title);
  draft.client.name = movaStringOrNull(input.client && input.client.name);
  draft.client.whatsapp = movaStringOrNull(input.client && input.client.whatsapp);
  draft.client.cuitCuil = movaStringOrNull(input.client && input.client.cuitCuil);
  draft.transport.name = movaStringOrNull(input.transport && input.transport.name);
  draft.transport.whatsapp = movaStringOrNull(input.transport && input.transport.whatsapp);
  draft.transport.vehicleModel = movaStringOrNull(input.transport && input.transport.vehicleModel);
  draft.transport.plate = movaStringOrNull(input.transport && input.transport.plate);
  draft.contractDate = movaDateOrNull(input.contractDate);
  draft.startAt = movaDateOrNull(input.startAt);
  draft.estimatedEndAt = movaDateOrNull(input.estimatedEndAt);
  draft.route.origin = movaStringOrNull(input.route && input.route.origin);
  draft.route.destination = movaStringOrNull(input.route && input.route.destination);
  draft.route.distanceKm = movaNumberOrNull(input.route && input.route.distanceKm);
  draft.cargo.description = movaStringOrNull(input.cargo && input.cargo.description);
  draft.cargo.weightKg = movaNumberOrNull(input.cargo && input.cargo.weightKg);
  draft.cargo.packageCount = movaNumberOrNull(input.cargo && input.cargo.packageCount);
  draft.pricing.ars = movaNumberOrNull(input.pricing && input.pricing.ars);
  draft.pricing.usd = movaNumberOrNull(input.pricing && input.pricing.usd);
  draft.pricing.commissionPercent = movaNumberOrNull(input.pricing && input.pricing.commissionPercent);
  const applies = input.pricing && input.pricing.commissionAppliesTo;
  draft.pricing.commissionAppliesTo = Array.isArray(applies) ? applies.filter(function(v) { return ["ARS", "USD"].indexOf(v) !== -1; }) : null;
  draft.clientInstructions = movaStringOrNull(input.clientInstructions);
  draft.transportInstructions = movaStringOrNull(input.transportInstructions);
  draft.generalNotes = Array.isArray(input.generalNotes) ? input.generalNotes.map(String) : [];
  return draft;
}

function movaStringOrNull(value) {
  return value === null || value === undefined || value === "" ? null : String(value);
}

function movaNumberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return isFinite(n) ? n : null;
}

function movaDateOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date.toISOString();
}
