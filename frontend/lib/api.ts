const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

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
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to create mission");
  }

  return response.json();
}

export async function getMissions() {
  const response = await fetch(`${API_BASE_URL}/missions`);
  if (!response.ok) {
    throw new Error("Failed to fetch missions");
  }
  return response.json();
}

export async function createSession(missionId: string) {
  const response = await fetch(`${API_BASE_URL}/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ missionId }),
  });

  if (!response.ok) {
    throw new Error("Failed to create session");
  }

  return response.json();
}
