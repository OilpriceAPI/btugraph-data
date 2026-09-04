# Contributing

Thank you for helping improve the BTU Graph public dataset mirror.

## Factual corrections

Use the [BTU Graph correction process](https://btugraph.com/corrections/) for changes to company facts, classifications, relationships, or evidence. Include the exact canonical profile URL, the requested change, and a public supporting source. The canonical dataset is maintained upstream, so direct edits to generated files in `data/` cannot be accepted as factual corrections.

## Repository improvements

Pull requests are welcome for documentation, query examples, JSON Schema, validation, and accessibility improvements. Before opening a pull request:

1. Run `npm run check`.
2. Run both examples with `npm run example:javascript` and `npm run example:python`.
3. Keep examples dependency-free where practical.
4. Do not add API keys, private data, copied third-party material, company logos, or promotional link exchanges.
5. Preserve canonical entity links and dataset attribution.

## Updating the snapshot

Run `npm run sync` to retrieve the three canonical public exports and rebuild snapshot metadata and checksums. Commit all generated changes together. Maintainers publish an immutable tag and release for each accepted edition.

