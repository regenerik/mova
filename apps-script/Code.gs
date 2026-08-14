function doPost(e) {
  try {
    const body = JSON.parse(e.postData && e.postData.contents ? e.postData.contents : "{}");
    const action = body.action;
    const payload = body.payload || {};
    const token = body.token || "";

    if (!action) throw movaError("BAD_REQUEST", "Falta action.");
    if (MOVA_PUBLIC_ACTIONS.indexOf(action) === -1) movaValidateSession(token);

    const data = movaDispatch(action, payload, token);
    return movaJson({ ok: true, data: data, error: null });
  } catch (err) {
    return movaJson({
      ok: false,
      data: null,
      error: {
        code: err.code || "SERVER_ERROR",
        message: err.message || "No se pudo completar la operacion."
      }
    });
  }
}

function doGet() {
  return movaJson({ ok: true, data: { app: "MOVA Apps Script API", status: "ready" }, error: null });
}

function movaDispatch(action, payload, token) {
  switch (action) {
    case "auth.login": return movaLogin(payload.username, payload.password);
    case "auth.validate": return movaValidateSession(token);
    case "bootstrap": return movaBootstrap();
    case "clients.create": return movaCreateClient(payload);
    case "clients.update": return movaUpdateClient(payload);
    case "clients.hide": return movaHideEntity("Clients", payload.id, payload.hidden);
    case "clients.delete": return movaDeleteClient(payload.id);
    case "transports.create": return movaCreateTransport(payload);
    case "transports.update": return movaUpdateTransport(payload);
    case "transports.hide": return movaHideEntity("Transports", payload.id, payload.hidden);
    case "transports.delete": return movaDeleteTransport(payload.id);
    case "services.create": return movaCreateService(payload);
    case "services.update": return movaUpdateService(payload);
    case "services.finalize": return movaFinalizeService(payload.id, payload.resultStatus, payload.cancellationResponsibility);
    case "payments.add": return movaAddPayment(payload);
    case "payments.update": return movaUpdatePayment(payload);
    case "payments.delete": return movaDeleteEntity("Payments", payload.id);
    case "notes.upsert": return movaUpsertNote(payload);
    case "notes.delete": return movaDeleteEntity("ServiceNotes", payload.id);
    case "ai.parseService": return movaParseServiceWithGroq(payload.text);
    case "cloudinary.uploadBase64": return movaCloudinaryUploadBase64(payload);
    default: throw movaError("UNKNOWN_ACTION", "Accion no soportada: " + action);
  }
}

function movaBootstrap() {
  return {
    clients: movaList("Clients"),
    transports: movaList("Transports"),
    services: movaList("Services"),
    payments: movaList("Payments"),
    notes: movaList("ServiceNotes")
  };
}

function movaJson(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function movaError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}
