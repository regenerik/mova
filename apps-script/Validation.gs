function movaRequire(value, message) {
  if (value === null || value === undefined || value === "") throw movaError("VALIDATION_ERROR", message);
}

function movaClampRating(value) {
  const rating = Number(value || 3);
  if (rating < 1 || rating > 5) throw movaError("VALIDATION_ERROR", "La valoracion debe estar entre 1 y 5.");
  return rating;
}
