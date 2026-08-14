function movaCreateClient(payload) {
  movaRequire(payload.name, "El nombre del cliente es obligatorio.");
  movaRequire(payload.whatsapp, "El WhatsApp del cliente es obligatorio.");
  payload.rating = movaClampRating(payload.rating);
  return movaCreate("Clients", payload);
}

function movaUpdateClient(payload) {
  movaRequire(payload.id, "Falta id de cliente.");
  movaRequire(payload.name, "El nombre del cliente es obligatorio.");
  payload.rating = movaClampRating(payload.rating);
  return movaUpdate("Clients", payload);
}

function movaDeleteClient(id) {
  if (movaList("Services").some(function(service) { return service.clientId === id; })) {
    return movaHideEntity("Clients", id, true);
  }
  return movaDeleteEntity("Clients", id);
}
