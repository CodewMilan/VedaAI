import type {
  Assignment,
  BulkSaveLibraryResponse,
  CreateGroupInput,
  CreateLibraryQuestionInput,
  Group,
  GroupWithAssignments,
  LibraryListResponse,
  LibraryQuery,
  LibraryQuestion,
} from "./types";

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

/* ─────────── Groups ─────────── */

export async function listGroups(): Promise<Group[]> {
  const res = await fetch(`${API_BASE}/api/groups`, { cache: "no-store" });
  return jsonOrThrow<Group[]>(res);
}

export async function getGroup(id: string): Promise<GroupWithAssignments> {
  const res = await fetch(`${API_BASE}/api/groups/${id}`, {
    cache: "no-store",
  });
  return jsonOrThrow<GroupWithAssignments>(res);
}

export async function createGroup(input: CreateGroupInput): Promise<Group> {
  const res = await fetch(`${API_BASE}/api/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return jsonOrThrow<Group>(res);
}

export async function updateGroup(
  id: string,
  input: Partial<CreateGroupInput>
): Promise<Group> {
  const res = await fetch(`${API_BASE}/api/groups/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return jsonOrThrow<Group>(res);
}

export async function deleteGroup(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/groups/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
}

export async function assignAssignmentsToGroup(
  groupId: string,
  assignmentIds: string[]
): Promise<{ groupId: string; assignments: Assignment[] }> {
  const res = await fetch(`${API_BASE}/api/groups/${groupId}/assignments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assignmentIds }),
  });
  return jsonOrThrow<{ groupId: string; assignments: Assignment[] }>(res);
}

export async function unassignAssignmentFromGroup(
  groupId: string,
  assignmentId: string
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/groups/${groupId}/assignments/${assignmentId}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error(`Unassign failed: ${res.status}`);
}

/* ─────────── Library (Question Bank) ─────────── */

export async function listLibraryQuestions(
  query: LibraryQuery = {}
): Promise<LibraryListResponse> {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.subject) params.set("subject", query.subject);
  if (query.type) params.set("type", query.type);
  if (query.difficulty) params.set("difficulty", query.difficulty);
  const qs = params.toString();
  const res = await fetch(
    `${API_BASE}/api/library${qs ? `?${qs}` : ""}`,
    { cache: "no-store" }
  );
  return jsonOrThrow<LibraryListResponse>(res);
}

export async function createLibraryQuestion(
  input: CreateLibraryQuestionInput
): Promise<LibraryQuestion> {
  const res = await fetch(`${API_BASE}/api/library`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return jsonOrThrow<LibraryQuestion>(res);
}

export async function bulkSaveLibraryQuestions(
  questions: CreateLibraryQuestionInput[]
): Promise<BulkSaveLibraryResponse> {
  const res = await fetch(`${API_BASE}/api/library/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questions }),
  });
  return jsonOrThrow<BulkSaveLibraryResponse>(res);
}

export async function updateLibraryQuestion(
  id: string,
  input: Partial<CreateLibraryQuestionInput>
): Promise<LibraryQuestion> {
  const res = await fetch(`${API_BASE}/api/library/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return jsonOrThrow<LibraryQuestion>(res);
}

export async function deleteLibraryQuestion(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/library/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
}

export const API = { API_BASE };
