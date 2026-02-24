import { updateAgent, getAgentById } from "@/lib/store/agents";
import type { EncryptedSecretBlob } from "@/lib/security/crypto";
import { encryptSecret, decryptSecret } from "@/lib/security/crypto";

function assertSecretFormat(secretKey: string): void {
  if (!/^S[A-Z2-7]{55}$/.test(secretKey)) {
    throw new Error("Invalid Stellar secret key format");
  }
}

export async function setKeyConsent(options: {
  agentId: string;
  accepted: boolean;
  policyVersion?: string;
}): Promise<void> {
  const { agentId, accepted, policyVersion } = options;
  const agent = await getAgentById(agentId);
  if (!agent) throw new Error("Agent not found");

  const now = new Date().toISOString();
  await updateAgent(agentId, {
    fullAuto: {
      ...(agent.fullAuto ?? {}),
      consentAcceptedAt: accepted ? now : null,
      consentVersion: accepted ? policyVersion ?? "v1" : null,
    },
  });
}

export async function storeEncryptedKey(options: {
  agentId: string;
  secretKey: string;
}): Promise<void> {
  const { agentId, secretKey } = options;
  const agent = await getAgentById(agentId);
  if (!agent) throw new Error("Agent not found");
  if (!agent.fullAuto?.consentAcceptedAt) {
    throw new Error("Missing full-auto consent");
  }

  assertSecretFormat(secretKey);

  const encrypted = encryptSecret(secretKey);
  const now = new Date().toISOString();

  await updateAgent(agentId, {
    fullAuto: {
      ...(agent.fullAuto ?? {}),
      encryptedSecret: encrypted,
      keyStoredAt: now,
      keyRevokedAt: null,
    },
  });
}

export async function revokeEncryptedKey(agentId: string): Promise<void> {
  const agent = await getAgentById(agentId);
  if (!agent) throw new Error("Agent not found");

  await updateAgent(agentId, {
    fullAuto: {
      ...(agent.fullAuto ?? {}),
      encryptedSecret: null,
      keyRevokedAt: new Date().toISOString(),
    },
  });
}

export function decryptAgentSecret(
  encryptedSecret: EncryptedSecretBlob | null | undefined
): string {
  if (!encryptedSecret) {
    throw new Error("No encrypted secret available");
  }
  return decryptSecret(encryptedSecret);
}
