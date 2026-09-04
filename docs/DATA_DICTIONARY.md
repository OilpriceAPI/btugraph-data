# Data dictionary

## Graph document

`data/graph.json` is the canonical graph snapshot. Its top-level fields identify the schema and edition, explain provenance and licensing, and contain `nodes` and `edges` arrays.

### Nodes

Every node has a stable namespaced `id`, a `type`, and a human-readable `name`. Addressable entities such as companies, sectors, workflows, products, categories, and decisions also have a canonical `url`; taxonomy-only nodes may not. Most nodes include a slug and editorial description. Entity types in the current schema are:

- `company`
- `sector`
- `capability`
- `market`
- `region`
- `value_chain_stage`
- `workflow`
- `software_product`
- `category`
- `market_data_requirement`
- `decision`

Company nodes carry source-review fields such as `sources`, `lastReviewed`, `datePublished`, and `lastMateriallyUpdated`. Additional fields vary by type and are preserved in the snapshot.

### Edges

An edge is a directed relationship with three required strings:

```json
{
  "from": "company:eog-resources",
  "to": "sector:exploration-production",
  "relationship": "has_primary_sector"
}
```

Both endpoint IDs must exist in `nodes`. Relationship types include company classifications (`has_primary_sector`, `operates_in_sector`, `has_capability`, `serves_market`, `operates_in_region`, `participates_in_value_chain_stage`, and `participates_in_workflow`) and software/data-decision relationships (`offers_software_product`, `belongs_to_category`, `evaluated_through_workflow`, `requires_market_data`, `informs_decision`, and `supports_decision`).

## Company table

`data/companies.csv` provides one row per company. Multi-value fields use ` | ` as the delimiter. `profile_url` is the canonical BTU Graph profile; `official_website` and `evidence_urls` point to third-party public sources.

Dates use ISO 8601 `YYYY-MM-DD`. CSV consumers must support quoted fields because values may contain commas.

## Stability

Node IDs are the stable join key. Display labels and descriptions can change as evidence or taxonomy improves. Consumers should pin a tagged release for reproducible work and use the edition and schema version to detect changes.
