function movaCreateTransport(payload) {
  movaRequire(payload.name, "El nombre del transportista es obligatorio.");
  movaRequire(payload.whatsapp, "El WhatsApp del transportista es obligatorio.");
  payload.rating = movaClampRating(payload.rating);
  return movaCreate("Transports", payload);
}

function movaUpdateTransport(payload) {
  movaRequire(payload.id, "Falta id de transporte.");
  movaRequire(payload.name, "El nombre del transportista es obligatorio.");
  payload.rating = movaClampRating(payload.rating);
  return movaUpdate("Transports", payload);
}

function movaDeleteTransport(id) {
  if (movaList("Services").some(function(service) { return service.transportId === id; })) {
    return movaHideEntity("Transports", id, true);
  }
  return movaDeleteEntity("Transports", id);
}
