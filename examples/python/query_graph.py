#!/usr/bin/env python3
"""Inspect the checked-in BTU Graph snapshot without third-party packages."""

import json
from collections import Counter
from pathlib import Path


graph_path = Path(__file__).resolve().parents[2] / "data" / "graph.json"
graph = json.loads(graph_path.read_text(encoding="utf-8"))
nodes = {node["id"]: node for node in graph["nodes"]}

for edge in graph["edges"]:
    if edge["from"] not in nodes or edge["to"] not in nodes:
        raise ValueError(f"Broken edge: {edge['from']} -> {edge['to']}")

print(f"BTU Graph edition {graph['edition']}")
print(f"{len(nodes)} nodes, {len(graph['edges'])} relationships")

for node_type, count in sorted(Counter(node["type"] for node in nodes.values()).items()):
    print(f"{node_type}: {count}")

print("\nCompany-to-software relationships:")
product_links = sorted(
    f"{nodes[edge['from']]['name']} -> {nodes[edge['to']]['name']}"
    for edge in graph["edges"]
    if edge["relationship"] == "offers_software_product"
)
print("\n".join(product_links))

