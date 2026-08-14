function movaLogin(username, password) {
  if (!username || !password) throw movaError("BAD_CREDENTIALS", "Usuario o contrasena invalidos.");
  const authConfig = movaAuthConfig();
  if (String(username) !== authConfig.username) throw movaError("BAD_CREDENTIALS", "Usuario o contrasena invalidos.");

  const receivedHash = movaSha256Hex(authConfig.salt + String(password));
  if (receivedHash !== authConfig.passwordHash) throw movaError("BAD_CREDENTIALS", "Usuario o contrasena invalidos.");

  const ttlHours = Number(authConfig.ttlHours || "12");
  const expiresAtMs = Date.now() + ttlHours * 60 * 60 * 1000;
  const token = movaSignSessionToken(authConfig.username, expiresAtMs, authConfig);
  return { token: token, username: authConfig.username, expiresAt: new Date(expiresAtMs).toISOString() };
}

function movaValidateSession(token) {
  if (!token) throw movaError("UNAUTHORIZED", "Sesion no valida.");
  const authConfig = movaAuthConfig();
  const parts = String(token).split(".");
  if (parts.length !== 3) throw movaError("UNAUTHORIZED", "Sesion no valida.");

  const username = movaBase64Decode(parts[0]);
  const expiresAtMs = Number(parts[1]);
  if (username !== authConfig.username || !expiresAtMs || expiresAtMs <= Date.now()) {
    throw movaError("UNAUTHORIZED", "Sesion vencida o no valida. Volve a iniciar sesion.");
  }

  const expected = movaSessionSignature(username, expiresAtMs, authConfig);
  if (parts[2] !== expected) throw movaError("UNAUTHORIZED", "Sesion no valida.");
  return { token: token, username: username, expiresAt: new Date(expiresAtMs).toISOString() };
}

function movaSignSessionToken(username, expiresAtMs, authConfig) {
  return [movaBase64Encode(username), String(expiresAtMs), movaSessionSignature(username, expiresAtMs, authConfig)].join(".");
}

function movaSessionSignature(username, expiresAtMs, authConfig) {
  const secret = authConfig.passwordHash + "." + authConfig.salt;
  return movaSha256Hex(secret + "." + username + "." + expiresAtMs);
}

function movaAuthConfig() {
  const props = PropertiesService.getScriptProperties().getProperties();
  const username = props.ADMIN_USERNAME;
  const salt = props.ADMIN_PASSWORD_SALT;
  const passwordHash = props.ADMIN_PASSWORD_HASH;
  if (!username) throw movaError("CONFIG_MISSING", "Falta configurar Script Property: ADMIN_USERNAME");
  if (!salt) throw movaError("CONFIG_MISSING", "Falta configurar Script Property: ADMIN_PASSWORD_SALT");
  if (!passwordHash) throw movaError("CONFIG_MISSING", "Falta configurar Script Property: ADMIN_PASSWORD_HASH");
  return { username: username, salt: salt, passwordHash: passwordHash, ttlHours: props.SESSION_TTL_HOURS || "12" };
}

function movaBase64Encode(value) {
  return Utilities.base64EncodeWebSafe(String(value), Utilities.Charset.UTF_8).replace(/=+$/, "");
}

function movaBase64Decode(value) {
  let input = String(value);
  while (input.length % 4) input += "=";
  return Utilities.newBlob(Utilities.base64DecodeWebSafe(input)).getDataAsString();
}

function movaSha256Hex(input) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input, Utilities.Charset.UTF_8);
  return bytes.map(function(byte) {
    const value = byte < 0 ? byte + 256 : byte;
    return ("0" + value.toString(16)).slice(-2);
  }).join("");
}

function movaGeneratePasswordHash(password, salt) {
  return movaSha256Hex(String(salt) + String(password));
}
