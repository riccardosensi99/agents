const API_URL = process.env.SMOKE_API_URL ?? "http://localhost:4000/api";
const HEALTH_URL = process.env.SMOKE_HEALTH_URL ?? API_URL.replace(/\/api\/?$/, "/health");
const email = process.env.SMOKE_EMAIL ?? "owner@example.com";
const password = process.env.SMOKE_PASSWORD ?? "changeme123";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers ?? {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`${options.method ?? "GET"} ${path} failed: ${response.status} ${JSON.stringify(payload)}`);
  }

  return payload;
}

async function healthcheck() {
  const response = await fetch(HEALTH_URL);
  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.ok !== true) {
    throw new Error(`GET ${HEALTH_URL} failed: ${response.status} ${JSON.stringify(payload)}`);
  }

  console.log("healthcheck ok");
}

await healthcheck();

const auth = await request("/auth/login", {
  method: "POST",
  body: { email, password }
});
const token = auth.token;

const brand = await request("/settings/brand-profile", { token });
console.log("brand profile", brand.data.ownerName || "configured");

const agents = await request("/agents", { token });
const agent = agents.data.find((item) => item.slug === "instaspark") ?? agents.data[0];

if (!agent) {
  throw new Error("No agent found");
}

const created = await request(`/agents/${agent.id}/tasks`, {
  method: "POST",
  token,
  body: {
    title: "Smoke Instagram draft",
    prompt: "Genera una bozza Instagram concreta per promuovere servizi full-stack freelance.",
    platform: "instagram",
    priority: "normal"
  }
});

const run = await request(`/tasks/${created.data.id}/run`, {
  method: "POST",
  token
});

if (!run.data.draft?.id) {
  throw new Error("Draft was not created");
}

if (!run.data.supervisorReview?.recommendedAction) {
  throw new Error("Supervisor evaluation was not created");
}

await request(`/drafts/${run.data.draft.id}`, {
  method: "PATCH",
  token,
  body: {
    content: `${run.data.draft.content}\n\nSmoke note: bozza verificata prima dell'approvazione.`
  }
});

await request(`/drafts/${run.data.draft.id}/approve`, {
  method: "POST",
  token
});

console.log(
  JSON.stringify(
    {
      ok: true,
      taskId: created.data.id,
      draftId: run.data.draft.id,
      supervisorAction: run.data.supervisorReview.recommendedAction,
      approvalFlow: "edited_and_approved"
    },
    null,
    2
  )
);
