import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = resolve(root, "data");
const endpoints = {
  "graph.json": "https://btugraph.com/graph.json",
  "companies.csv": "https://btugraph.com/companies.csv",
  "openapi.json": "https://btugraph.com/openapi.json",
};

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function countCsvRecords(csv) {
  let records = 0;
  let quoted = false;
  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (character === '"') {
      if (quoted && csv[index + 1] === '"') index += 1;
      else quoted = !quoted;
    } else if (character === "\n" && !quoted) {
      records += 1;
    }
  }
  if (quoted) throw new Error("companies.csv contains an unterminated quoted field");
  return records - 1;
}

async function writeAtomic(path, value) {
  const temporary = `${path}.tmp`;
  await writeFile(temporary, value);
  await rename(temporary, path);
}

await mkdir(dataDir, { recursive: true });

const files = {};
for (const [name, url] of Object.entries(endpoints)) {
  const response = await fetch(url, {
    headers: { "user-agent": "OilpriceAPI/btugraph-data snapshot sync" },
  });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (name.endsWith(".json") && !contentType.includes("json")) {
    throw new Error(`${url} returned unexpected content-type ${contentType}`);
  }
  const body = `${(await response.text()).trimEnd()}\n`;
  files[name] = body;
  await writeAtomic(resolve(dataDir, name), body);
}

const graph = JSON.parse(files["graph.json"]);
const openapi = JSON.parse(files["openapi.json"]);
const metadata = {
  title: "BTU Graph energy company knowledge graph",
  edition: graph.edition,
  schemaVersion: graph.schemaVersion,
  sourceGeneratedAt: graph.generatedAt,
  publisher: graph.publisher,
  license: graph.license,
  canonicalDataset: "https://btugraph.com/data/",
  repository: "https://github.com/OilpriceAPI/btugraph-data",
  counts: {
    companies: countCsvRecords(files["companies.csv"]),
    nodes: graph.nodes.length,
    edges: graph.edges.length,
    apiPaths: Object.keys(openapi.paths).length,
  },
  files: Object.fromEntries(
    Object.entries(endpoints).map(([name, source]) => [
      name,
      { source, bytes: Buffer.byteLength(files[name]), sha256: digest(files[name]) },
    ]),
  ),
};
const metadataText = `${JSON.stringify(metadata, null, 2)}\n`;
await writeAtomic(resolve(dataDir, "metadata.json"), metadataText);

const checksummed = { ...files, "metadata.json": metadataText };
const sums = Object.entries(checksummed)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([name, body]) => `${digest(body)}  data/${name}`)
  .join("\n");
await writeAtomic(resolve(root, "SHA256SUMS"), `${sums}\n`);

const readmePath = resolve(root, "README.md");
let readme = await readFile(readmePath, "utf8");
const readmeValues = {
  Edition: `\`${graph.edition}\``,
  "Schema version": `\`${graph.schemaVersion}\``,
  Companies: `\`${metadata.counts.companies}\``,
  "Graph nodes": `\`${metadata.counts.nodes}\``,
  "Graph relationships": `\`${metadata.counts.edges}\``,
};
for (const [label, value] of Object.entries(readmeValues)) {
  const pattern = new RegExp(`^- ${label}: .+$`, "m");
  if (!pattern.test(readme)) throw new Error(`README snapshot field is missing: ${label}`);
  readme = readme.replace(pattern, `- ${label}: ${value}`);
}
await writeAtomic(readmePath, readme);

const citationPath = resolve(root, "CITATION.cff");
let citation = await readFile(citationPath, "utf8");
citation = citation.replace(/^version: ".+"$/m, `version: "${graph.edition}"`);
citation = citation.replace(/^date-released: .+$/m, `date-released: ${graph.edition}`);
await writeAtomic(citationPath, citation);

console.log(
  `Synced edition ${graph.edition}: ${metadata.counts.companies} companies, ${metadata.counts.nodes} nodes, ${metadata.counts.edges} relationships.`,
);
