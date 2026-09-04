# Query examples

These examples use the checked-in snapshot and require only tools commonly available on developer systems.

## Count nodes by type

```bash
jq -r '.nodes[].type' data/graph.json | sort | uniq -c | sort -nr
```

## Resolve graph IDs to company names

```bash
jq -r '
  (.nodes | map({key: .id, value: .name}) | from_entries) as $names
  | .edges[]
  | select(.relationship == "offers_software_product")
  | [$names[.from], $names[.to]]
  | @tsv
' data/graph.json
```

## Find companies in a market

```bash
jq -r '
  (.nodes | map({key: .id, value: .name}) | from_entries) as $names
  | .edges[]
  | select(.relationship == "serves_market" and .to == "market:crude-oil")
  | $names[.from]
' data/graph.json
```

## Python and JavaScript

The repository includes dependency-free programs that validate referential integrity, summarize the graph, and print company-to-software relationships:

```bash
npm run example:javascript
npm run example:python
```

