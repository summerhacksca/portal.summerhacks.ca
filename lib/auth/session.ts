export type ShSession = {
  access_token: string;
  refresh_token: string;
  email?: string;
  user_id?: string;
};

export function parseShSession(cookieValue: string | undefined): ShSession | null {
  if (!cookieValue) return null;

  try {
    const parsed = JSON.parse(cookieValue) as Partial<ShSession>;
    if (!parsed.access_token) return null;
    return parsed as ShSession;
  } catch {
    return null;
  }
}
