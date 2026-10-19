const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
).replace(/\/+$/, '')

type ApiRequestInit = RequestInit & {
  accessToken?: string
}

export class ApiError extends Error {
  public readonly status: number

  constructor(
    message: string,
    status: number,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiFetch<T>(
  path: string,
  { accessToken, headers, ...init }: ApiRequestInit = {},
): Promise<T> {
  const requestHeaders = new Headers(headers)
  requestHeaders.set('Accept', 'application/json')

  if (accessToken) {
    requestHeaders.set('Authorization', `Bearer ${accessToken}`)
  }

  const response = await fetch(
    `${API_BASE_URL}/${path.replace(/^\/+/, '')}`,
    {
      ...init,
      headers: requestHeaders,
    },
  )

  if (response.status === 204 || response.status === 205) {
    return undefined as T
  }

  const responseText = await response.text()
  const contentType = response.headers.get('content-type') ?? ''
  let responseBody: unknown = responseText

  if (responseText && contentType.includes('application/json')) {
    try {
      responseBody = JSON.parse(responseText) as unknown
    } catch {
      throw new ApiError('The API returned invalid JSON.', response.status)
    }
  }

  if (!response.ok) {
    const message =
      typeof responseBody === 'object' &&
      responseBody !== null &&
      'detail' in responseBody
        ? String(responseBody.detail)
        : `API request failed with status ${response.status}.`

    throw new ApiError(message, response.status)
  }

  if (!responseText) {
    throw new ApiError(
      'The API returned an empty response where JSON was expected.',
      response.status,
    )
  }

  if (!contentType.includes('application/json')) {
    throw new ApiError('The API returned a non-JSON response.', response.status)
  }

  return responseBody as T
}
