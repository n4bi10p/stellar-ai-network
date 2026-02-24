import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

export type EncryptedSecretBlob = {
  alg: "aes-256-gcm";
  v: 1;
  iv: string;
  tag: string;
  ciphertext: string;
};

function decodeMasterKey(): Buffer {
  const keyB64 = process.env.AUTO_SIGNING_MASTER_KEY;
  if (!keyB64) {
    throw new Error("AUTO_SIGNING_MASTER_KEY is not configured");
  }

  const key = Buffer.from(keyB64, "base64");
  if (key.length !== 32) {
    throw new Error("AUTO_SIGNING_MASTER_KEY must decode to 32 bytes");
  }

  return key;
}

export function encryptSecret(plaintext: string): EncryptedSecretBlob {
  const key = decodeMasterKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return {
    alg: "aes-256-gcm",
    v: 1,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

export function decryptSecret(blob: EncryptedSecretBlob): string {
  if (blob.alg !== "aes-256-gcm" || blob.v !== 1) {
    throw new Error("Unsupported encrypted secret format");
  }

  const key = decodeMasterKey();
  const iv = Buffer.from(blob.iv, "base64");
  const tag = Buffer.from(blob.tag, "base64");
  const ciphertext = Buffer.from(blob.ciphertext, "base64");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}
