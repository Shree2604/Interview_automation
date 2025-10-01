const API_BASE_URL = "https://futuregenautomation.com/api/";

const getToken = () => localStorage.getItem("jwtToken");


const showLogoutPopup = () => {
  alert("Your session has expired. Please log in again.");
                localStorage.removeItem("refresh");
                localStorage.removeItem("jwtToken");
                localStorage.removeItem("userInfo");

  window.location.href = "/"; 
};


const apiFetch = async (endpoint, options = {}) => {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    showLogoutPopup();
    throw new Error("Unauthorized - Session expired");
  }

  if (!response.ok) {
    let errorMsg = "API request failed";
    try {
      const errorData = await response.json();
      errorMsg = errorData.message || errorMsg;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  return response.json();
};

// Special function for downloading files
const apiDownload = async (endpoint, body) => {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body),
  });

  if (response.status === 401) {
    showLogoutPopup();
    throw new Error("Unauthorized - Session expired");
  }

  if (!response.ok) {
    throw new Error("File download failed");
  }

  return response.blob(); // <-- Return blob instead of JSON
};

export const api = {
  get: (endpoint) => apiFetch(endpoint, { method: "GET" }),
  post: (endpoint, body) => apiFetch(endpoint, { method: "POST", body: JSON.stringify(body) }),
  put: (endpoint, body) => apiFetch(endpoint, { method: "PUT", body: JSON.stringify(body) }),
  delete: (endpoint) => apiFetch(endpoint, { method: "DELETE" }),
  download: (endpoint, body) => apiDownload(endpoint, body),
};
