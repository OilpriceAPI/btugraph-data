import { readFile } from "node:fs/promises";

const graphUrl = new URL("../../data/graph.json", import.meta.url);
const graph = JSON.parse(await readFile(graphUrl, "utf8"));
const nodes = new Map(graph.nodes.map((node) => [node.id, node]));

for (const edge of graph.edges) {
  if (!nodes.has(edge.from) || !nodes.has(edge.to)) {
    throw new Error(`Broken edge: ${edge.from} -> ${edge.to}`);
  }
}

const counts = Object.groupBy
  ? Object.groupBy(graph.nodes, (node) => node.type)
  : graph.nodes.reduce((groups, node) => {
      (groups[node.type] ??= []).push(node);
      return groups;
    }, {});

console.log(`BTU Graph edition ${graph.edition}`);
console.log(`${graph.nodes.length} nodes, ${graph.edges.length} relationships`);
console.log(
  Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, items]) => `${type}: ${items.length}`)
    .join("\n"),
);

const productLinks = graph.edges
  .filter((edge) => edge.relationship === "offers_software_product")
  .map((edge) => `${nodes.get(edge.from).name} -> ${nodes.get(edge.to).name}`)
  .sort();

console.log("\nCompany-to-software relationships:");
console.log(productLinks.join("\n"));

