import type { Assignment } from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j.error ?? JSON.stringify(j);
    } catch {
      detail = await res.text();
    }
    throw new Error(`${res.status} ${res.statusText} — ${detail.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export async function listAssignments(): Promise<Assignment[]> {
  const res = await fetch(`${API_BASE}/api/assignments`, { cache: "no-store" });
  return jsonOrThrow<Assignment[]>(res);
}

export async function getAssignment(id: string): Promise<Assignment> {
  const res = await fetch(`${API_BASE}/api/assignments/${id}`, {
    cache: "no-store",
  });
  return jsonOrThrow<Assignment>(res);
}

export async function createAssignment(
  formData: FormData
): Promise<Assignment> {
  const res = await fetch(`${API_BASE}/api/assignments`, {
    method: "POST",
    body: formData,
  });
  return jsonOrThrow<Assignment>(res);
}

export async function regenerateAssignment(id: string): Promise<Assignment> {
  const res = await fetch(`${API_BASE}/api/assignments/${id}/regenerate`, {
    method: "POST",
  });
  return jsonOrThrow<Assignment>(res);
}

export async function deleteAssignment(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/assignments/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
}

export const API = { API_BASE };
