const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

/**
 * Custom Error class for HTTP API errors
 */
export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Helper to build full URL with query parameters
 */
function buildUrl(endpoint, params) {
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = new URL(`${BASE_URL}${normalizedEndpoint}`);

  if (params && typeof params === "object") {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });
  }

  return url.toString();
}

/**
 * Core HTTP client function
 */
async function request(endpoint, options = {}) {
  const { method = "GET", data, params, headers = {}, ...customOptions } = options;

  const url = buildUrl(endpoint, params);

  const config = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    // Allows sending and receiving session cookies (express-session)
    credentials: "include",
    ...customOptions,
  };

  if (data !== undefined && data !== null) {
    config.body = JSON.stringify(data);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (error) {
    throw new ApiError(error.message || "Network Error: Failed to connect to server", 0, null);
  }

  // Parse JSON response if present
  let responseData;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }
  } else {
    try {
      responseData = await response.text();
    } catch {
      responseData = null;
    }
  }

  if (!response.ok) {
    const errorMessage =
      responseData?.message ||
      responseData?.error ||
      response.statusText ||
      `Request failed with status ${response.status}`;

    throw new ApiError(errorMessage, response.status, responseData);
  }

  return responseData;
}

/**
 * Reusable API Service providing GET, POST, PUT, DELETE methods
 */
export const api = {
  get(endpoint, options = {}) {
    return request(endpoint, { ...options, method: "GET" });
  },

  post(endpoint, data = {}, options = {}) {
    return request(endpoint, { ...options, method: "POST", data });
  },

  put(endpoint, data = {}, options = {}) {
    return request(endpoint, { ...options, method: "PUT", data });
  },

  delete(endpoint, data = null, options = {}) {
    return request(endpoint, { ...options, method: "DELETE", ...(data ? { data } : {}) });
  },

  request,
};

export default api;
