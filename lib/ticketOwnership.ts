export function normalizeAccountEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized || null;
}

export async function resolveOrderOwnerId(
  sessionEmail: string | null | undefined,
  findUser: (email: string) => Promise<{ id: string } | null>,
): Promise<string | null> {
  const email = normalizeAccountEmail(sessionEmail);
  if (!email) return null;

  const user = await findUser(email);
  return user?.id ?? null;
}

export function buildMyTicketsWhere(userId: string, accountEmail: string) {
  const email = normalizeAccountEmail(accountEmail);
  if (!email) throw new Error("Account email is required");

  return {
    status: "confirmed",
    OR: [{ userId }, { email }],
  };
}