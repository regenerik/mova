function movaAddPayment(payload) {
  movaValidatePayment(payload);
  return movaCreate("Payments", payload);
}

function movaUpdatePayment(payload) {
  movaValidatePayment(payload);
  return movaUpdate("Payments", payload);
}

function movaValidatePayment(payload) {
  movaRequire(payload.serviceId, "Falta servicio.");
  movaGetById("Services", payload.serviceId);
  if (["ARS", "USD"].indexOf(payload.currency) === -1) throw movaError("VALIDATION_ERROR", "Moneda invalida.");
  if (!payload.amount || Number(payload.amount) <= 0) throw movaError("VALIDATION_ERROR", "El pago debe ser mayor a cero.");
  movaRequire(payload.paidAt, "Falta fecha de pago.");
}
