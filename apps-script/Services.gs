function movaCreateService(payload) {
  movaValidateService(payload);
  return movaCreate("Services", movaServiceDefaults(payload));
}

function movaUpdateService(payload) {
  movaValidateService(payload);
  return movaUpdate("Services", movaServiceDefaults(payload));
}

function movaFinalizeService(id, resultStatus, cancellationResponsibility) {
  if (["completed", "cancelled"].indexOf(resultStatus) === -1) throw movaError("BAD_REQUEST", "Resultado invalido.");
  if (resultStatus === "cancelled" && ["client", "transport", "both"].indexOf(cancellationResponsibility) === -1) {
    throw movaError("BAD_REQUEST", "Debe indicar quien fue responsable de la cancelacion.");
  }
  const service = movaGetById("Services", id);
  service.resultStatus = resultStatus;
  service.cancellationResponsibility = resultStatus === "cancelled" ? cancellationResponsibility : "";
  return movaUpdate("Services", service);
}

function movaValidateService(payload) {
  movaRequire(payload.title, "El titulo del servicio es obligatorio.");
  movaRequire(payload.clientId, "Debe seleccionar un cliente.");
  movaRequire(payload.transportId, "Debe seleccionar un transporte.");
  if (!movaExistsById("Clients", payload.clientId)) throw movaError("NOT_FOUND", "Cliente no encontrado.");
  if (!movaExistsById("Transports", payload.transportId)) throw movaError("NOT_FOUND", "Transporte no encontrado.");
  if (payload.startAt && payload.estimatedEndAt && new Date(payload.estimatedEndAt).getTime() <= new Date(payload.startAt).getTime()) {
    throw movaError("VALIDATION_ERROR", "La finalizacion estimada debe ser posterior al inicio.");
  }
  if (payload.operationalStatus && ["on_track", "delayed", "early", "accident", "no_contact"].indexOf(payload.operationalStatus) === -1) {
    throw movaError("VALIDATION_ERROR", "Estado operativo invalido.");
  }
  ["distanceKm", "weightKg", "packageCount", "finalPriceArs", "finalPriceUsd"].forEach(function(field) {
    if (payload[field] !== null && payload[field] !== undefined && payload[field] !== "" && Number(payload[field]) < 0) {
      throw movaError("VALIDATION_ERROR", "El campo " + field + " no puede ser negativo.");
    }
  });
  if (Number(payload.commissionPercent) < 0) throw movaError("VALIDATION_ERROR", "La comision no puede ser negativa.");
}

function movaServiceDefaults(payload) {
  return Object.assign({
    commissionPercent: 10,
    commissionCurrencies: ["ARS"],
    clientConfirmation: "pending",
    transportConfirmation: "pending",
    resultStatus: "open",
    operationalStatus: "",
    cancellationResponsibility: "",
    chargeTiming: "after_delivery",
    chargeStatus: "pending",
    hidden: false
  }, payload);
}
