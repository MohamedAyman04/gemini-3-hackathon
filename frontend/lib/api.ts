export const API_BASE_URL = "/api";

export async function login(data: { email: string; password: string }) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Login failed");
  }
  return response.json();
}

export async function signup(data: { name: string; email: string; password: string }) {
  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Signup failed");
  }
  return response.json();
}

export async function createMission(data: {
  name: string;
  url: string;
  context: string;
}) {
  const response = await fetch(`${API_BASE_URL}/missions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to create mission");
  }

  return response.json();
}

export async function getMissions() {
  const response = await fetch(`${API_BASE_URL}/missions`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch missions");
  }
  return response.json();
}

export async function getMission(id: string) {
  const response = await fetch(`${API_BASE_URL}/missions/${id}`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch mission");
  }
  return response.json();
}

export async function createSession(missionId: string) {
  const response = await fetch(`${API_BASE_URL}/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ missionId }),
  });

  if (!response.ok) {
    throw new Error("Failed to create session");
  }

  return response.json();
}

export async function getSession(id: string) {
  const response = await fetch(`${API_BASE_URL}/sessions/${id}`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch session");
  }
  return response.json();
}

export async function getSessions() {
  const response = await fetch(`${API_BASE_URL}/sessions`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch sessions");
  }
  return response.json();
}

export async function getMe() {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Not authenticated");
  }
  return response.json();
}

export async function logout() {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Logout failed");
  }

  return response.json();
}
