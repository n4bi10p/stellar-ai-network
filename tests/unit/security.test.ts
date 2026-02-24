import { beforeEach, describe, expect, it } from "vitest";
import { encryptSecret, decryptSecret } from "@/lib/security/crypto";

describe("crypto key vault helpers", () => {
  beforeEach(() => {
    process.env.AUTO_SIGNING_MASTER_KEY = Buffer.alloc(32, 7).toString("base64");
  });

  it("encrypts and decrypts with AES-256-GCM", () => {
    const secret = "SABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const blob = encryptSecret(secret);

    expect(blob.alg).toBe("aes-256-gcm");
    expect(blob.v).toBe(1);

    const plaintext = decryptSecret(blob);
    expect(plaintext).toBe(secret);
  });

  it("throws when master key has wrong size", () => {
    process.env.AUTO_SIGNING_MASTER_KEY = Buffer.alloc(16, 7).toString("base64");
    expect(() => encryptSecret("SABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWXYZ")).toThrow(
      "32 bytes"
    );
  });
});
