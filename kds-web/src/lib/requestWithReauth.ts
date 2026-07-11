import { ApiError } from "./api";

export async function requestWithReauth<T>(
  accessToken: string,
  onUnauthorized: () => Promise<string | null>,
  request: (token: string) => Promise<T>,
): Promise<T> {
  try {
    return await request(accessToken);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) {
      throw error;
    }
    const nextAccessToken = await onUnauthorized();
    if (!nextAccessToken) {
      throw error;
    }
    return request(nextAccessToken);
  }
}
