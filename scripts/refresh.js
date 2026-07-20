#!/usr/bin/env node
/**
 * refresh.js — fetches the latest open KVM team bugs from Bugzilla and
 * rewrites the BUGS array inside index.html, then exits 0.
 *
 * Usage:
 *   node scripts/refresh.js              # writes us-kvm-status/index.html in place
 *   BUGZILLA_API_KEY=xxx node scripts/refresh.js
 *
 * Note: Bugzilla uses an IBM internal CA. Set NODE_TLS_REJECT_UNAUTHORIZED=0
 * or install the IBM root CA on the runner.
 */

// Allow IBM's internal CA-signed cert in environments that don't have it installed
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_HTML = path.resolve(__dirname, "../index.html");

const BUGZILLA_BASE = "https://bugzilla.linux.ibm.com";
const API_KEY = process.env.BUGZILLA_API_KEY ?? "";

const TEAM_EMAILS = [
  "Aaron.M.Brown@ibm.com",
  "aekrowia@us.ibm.com",
  "Boris.mail@de.ibm.com",
  "cam@ibm.com",
  "Collin.Walling@ibm.com",
  "dmfreim@us.ibm.com",
  "dmjudkov@us.ibm.com",
  "farman@us.ibm.com",
  "Farhan.Ali4@ibm.com",
  "hanli11@ibm.com",
  "jaredros@us.ibm.com",
  "jdaley@ibm.com",
  "jh.kim@ibm.com",
  "jjherne@us.ibm.com",
  "Konstantin.Shkolnyy@ibm.com",
  "mjrosato@us.ibm.com",
  "mjwebber@us.ibm.com",
  "Nitya.Khamar@ibm.com",
  "Omar.Elghoul@ibm.com",
  "Peter.Jin@ibm.com",
  "Ramesh.Errabolu@ibm.com",
  "rreyes@us.ibm.com",
  "Vineeth.Vijayan@ibm.com",
  "Will.Bezenah@ibm.com",
  "Zhuoying.Cai@ibm.com",
];

const OPEN_STATUSES = ["UNCONFIRMED", "NEW", "ASSIGNED", "REOPENED", "IN_PROGRESS"];
const INCLUDE_FIELDS = "id,summary,status,resolution,assigned_to,creator,component,product,priority,is_open";

async function fetchBugs(field) {
  const params = new URLSearchParams();
  for (const email of TEAM_EMAILS) params.append(field, email);
  for (const s of OPEN_STATUSES) params.append("status", s);
  params.append("include_fields", INCLUDE_FIELDS);
  if (API_KEY) params.append("Bugzilla_api_key", API_KEY);

  const url = `${BUGZILLA_BASE}/rest/bug?${params.toString()}`;
  console.log(`[bugzilla] GET ${field} ...`);

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const data = await res.json();
  if (data.error) throw new Error(`Bugzilla API error ${data.code}: ${data.message}`);
  return data.bugs ?? [];
}

function mergeBugs(a, b) {
  const map = new Map();
  for (const bug of [...a, ...b]) map.set(bug.id, bug);
  return Array.from(map.values()).sort((x, y) => y.id - x.id);
}

function escJs(s) {
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
}

async function main() {
  console.log("Fetching bugs from Bugzilla...");
  const [assigned, created] = await Promise.all([
    fetchBugs("assigned_to"),
    fetchBugs("creator"),
  ]);

  const bugs = mergeBugs(assigned, created);
  console.log(`Found ${bugs.length} open bugs.`);

  // Build the JS array literal
  const lines = bugs.map((b) =>
    `    { id: ${b.id}, summary: "${escJs(b.summary)}", status: "${b.status}", ` +
    `assignee: "${escJs(b.assigned_to)}", product: "${escJs(b.product)}", ` +
    `component: "${escJs(b.component)}", priority: "${b.priority}" },`
  );
  const newArray = `  const BUGS = [\n${lines.join("\n")}\n  ];`;

  // Replace the BUGS array in index.html
  let html = fs.readFileSync(INDEX_HTML, "utf8");
  const updated = html.replace(
    /\/\/ AUTO-GENERATED-BUGS-START[\s\S]*?\/\/ AUTO-GENERATED-BUGS-END|const BUGS = \[[\s\S]*?\];/,
    newArray
  );

  if (updated === html) {
    console.error("ERROR: Could not find BUGS array in index.html to replace.");
    process.exit(1);
  }

  fs.writeFileSync(INDEX_HTML, updated, "utf8");
  console.log(`index.html updated with ${bugs.length} bugs.`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
