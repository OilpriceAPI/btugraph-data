import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFile(resolve(root, path), "utf8");
const fail = (message) => { throw new Error(message); };
const assert = (condition, message) => { if (!condition) fail(message); };
const digest = (value) => createHash("sha256").update(value).digest("hex");

function parseCsv(csv) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (character === '"') {
      if (quoted && csv[index + 1] === '"') {
        field += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if (character === "\n" && !quoted) {
      row.push(field.replace(/\r$/, ""));
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  assert(!quoted, "companies.csv has an unterminated quoted field");
  return rows;
}

const graphText = await read("data/graph.json");
const csvText = await read("data/companies.csv");
const openapiText = await read("data/openapi.json");
const metadataText = await read("data/metadata.json");
const graph = JSON.parse(graphText);
const openapi = JSON.parse(openapiText);
const metadata = JSON.parse(metadataText);

assert(Number.isInteger(graph.schemaVersion) && graph.schemaVersion > 0, "Invalid schemaVersion");
assert(/^\d{4}-\d{2}-\d{2}$/.test(graph.edition), "Invalid edition date");
assert(graph.license?.url === "https://btugraph.com/data/#license", "Unexpected license URL");
assert(graph.license?.scope?.includes("third-party marks and source materials are excluded"), "License exclusion is missing");
assert(graph.provenance?.canonicalDataset === "https://btugraph.com/data/", "Canonical dataset URL is missing");
assert(Array.isArray(graph.nodes) && graph.nodes.length > 0, "No graph nodes");
assert(Array.isArray(graph.edges) && graph.edges.length > 0, "No graph edges");

const ids = new Set();
for (const node of graph.nodes) {
  assert(typeof node.id === "string" && /^[a-z_-]+:[a-z0-9][a-z0-9-]*$/.test(node.id), `Invalid node ID: ${node.id}`);
  assert(!ids.has(node.id), `Duplicate node ID: ${node.id}`);
  ids.add(node.id);
  assert(typeof node.name === "string" && node.name.trim(), `Missing name: ${node.id}`);
  if (node.url !== undefined) {
    const url = new URL(node.url);
    assert(url.protocol === "https:", `Non-HTTPS canonical URL: ${node.id}`);
    assert(url.hostname === "btugraph.com", `Non-canonical node host: ${node.id}`);
  }
}

const edgeKeys = new Set();
for (const edge of graph.edges) {
  assert(ids.has(edge.from), `Unknown edge source: ${edge.from}`);
  assert(ids.has(edge.to), `Unknown edge target: ${edge.to}`);
  assert(/^[a-z][a-z0-9_]*$/.test(edge.relationship), `Invalid relationship: ${edge.relationship}`);
  const key = `${edge.from}\u0000${edge.to}\u0000${edge.relationship}`;
  assert(!edgeKeys.has(key), `Duplicate edge: ${edge.from} -> ${edge.to} (${edge.relationship})`);
  edgeKeys.add(key);
}

const rows = parseCsv(csvText);
const expectedHeaders = [
  "name", "profile_url", "official_website", "company_type", "primary_sector",
  "sectors", "capabilities", "capability_ids", "markets", "regions",
  "value_chain_stages", "date_published", "last_materially_updated", "last_reviewed",
  "evidence_urls",
];
assert(JSON.stringify(rows[0]) === JSON.stringify(expectedHeaders), "Unexpected companies.csv headers");
for (const [index, row] of rows.slice(1).entries()) {
  assert(row.length === expectedHeaders.length, `CSV row ${index + 2} has ${row.length} columns`);
  const profile = new URL(row[1]);
  assert(profile.hostname === "btugraph.com" && profile.pathname.startsWith("/companies/"), `Invalid profile URL on CSV row ${index + 2}`);
}
const companyNodes = graph.nodes.filter((node) => node.type === "company");
assert(rows.length - 1 === companyNodes.length, "CSV/company node count mismatch");

assert(openapi.openapi === "3.1.0", "Expected OpenAPI 3.1.0");
assert(openapi.info?.license?.url === "https://btugraph.com/data/#license", "OpenAPI license URL mismatch");
assert(openapi.servers?.some((server) => server.url === "https://btugraph.com"), "Canonical OpenAPI server missing");
for (const endpoint of ["/graph.json", "/companies.csv", "/openapi.json", "/llms.txt", "/llms-full.txt", "/feed.xml"]) {
  if (endpoint !== "/openapi.json") assert(openapi.paths?.[endpoint], `OpenAPI path missing: ${endpoint}`);
}

assert(metadata.edition === graph.edition, "Metadata edition mismatch");
assert(metadata.schemaVersion === graph.schemaVersion, "Metadata schema version mismatch");
assert(metadata.counts.companies === companyNodes.length, "Metadata company count mismatch");
assert(metadata.counts.nodes === graph.nodes.length, "Metadata node count mismatch");
assert(metadata.counts.edges === graph.edges.length, "Metadata edge count mismatch");
for (const [name, body] of Object.entries({ "graph.json": graphText, "companies.csv": csvText, "openapi.json": openapiText })) {
  assert(metadata.files[name].bytes === Buffer.byteLength(body), `${name} byte count mismatch`);
  assert(metadata.files[name].sha256 === digest(body), `${name} metadata checksum mismatch`);
}

const checksums = (await read("SHA256SUMS")).trim().split("\n");
const expectedFiles = { "data/graph.json": graphText, "data/companies.csv": csvText, "data/openapi.json": openapiText, "data/metadata.json": metadataText };
assert(checksums.length === Object.keys(expectedFiles).length, "Unexpected checksum manifest length");
for (const line of checksums) {
  const match = line.match(/^([a-f0-9]{64})  (data\/[a-z.]+)$/);
  assert(match, `Malformed checksum line: ${line}`);
  assert(expectedFiles[match[2]], `Unexpected checksummed file: ${match[2]}`);
  assert(digest(expectedFiles[match[2]]) === match[1], `Checksum mismatch: ${match[2]}`);
}

console.log(`Verified BTU Graph edition ${graph.edition}: ${companyNodes.length} companies, ${graph.nodes.length} nodes, ${graph.edges.length} relationships.`);
