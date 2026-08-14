function movaCloudinaryUploadBase64(payload) {
  const cloudName = movaRequiredProperty("CLOUDINARY_CLOUD_NAME");
  const apiKey = movaRequiredProperty("CLOUDINARY_API_KEY");
  const apiSecret = movaRequiredProperty("CLOUDINARY_API_SECRET");
  movaRequire(payload.dataUrl, "Falta imagen.");
  if (String(payload.dataUrl).length > 5 * 1024 * 1024) throw movaError("FILE_TOO_LARGE", "La imagen supera el limite permitido.");
  const timestamp = String(Math.floor(Date.now() / 1000));
  const folder = movaOptionalProperty("CLOUDINARY_FOLDER", "mova");
  const signatureBase = "folder=" + folder + "&timestamp=" + timestamp + apiSecret;
  const signature = movaSha1Hex(signatureBase);
  const response = UrlFetchApp.fetch("https://api.cloudinary.com/v1_1/" + cloudName + "/image/upload", {
    method: "post",
    muteHttpExceptions: true,
    payload: {
      file: payload.dataUrl,
      api_key: apiKey,
      timestamp: timestamp,
      folder: folder,
      signature: signature
    }
  });
  const status = response.getResponseCode();
  const body = response.getContentText();
  if (status < 200 || status >= 300) throw movaError("CLOUDINARY_ERROR", "Cloudinary devolvio error " + status + ": " + body.slice(0, 220));
  const parsed = JSON.parse(body);
  return { secureUrl: parsed.secure_url, publicId: parsed.public_id };
}

function movaSha1Hex(input) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1, input, Utilities.Charset.UTF_8);
  return bytes.map(function(byte) {
    const value = byte < 0 ? byte + 256 : byte;
    return ("0" + value.toString(16)).slice(-2);
  }).join("");
}
