function movaUpsertNote(payload) {
  if (payload.id) {
    payload = Object.assign({}, movaGetById("ServiceNotes", payload.id), payload);
  }
  movaRequire(payload.serviceId, "Falta servicio.");
  movaGetById("Services", payload.serviceId);
  movaRequire(payload.title, "La nota necesita titulo.");
  payload.width = Number(payload.width || 240);
  payload.height = Number(payload.height || 150);
  payload.order = Number(payload.order || 1);
  payload.x = Number(payload.x || 0);
  payload.y = Number(payload.y || 0);
  payload.color = payload.color || "amber";
  return payload.id ? movaUpdate("ServiceNotes", payload) : movaCreate("ServiceNotes", payload);
}
