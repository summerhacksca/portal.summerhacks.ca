# scripts/data/

Email lists consumed by `scripts/`. **Everything here except this file and
`*.example.json` is gitignored** — these are real applicant addresses.

Each file is a JSON array of addresses:

```json
["a@uwaterloo.ca", "b@uwaterloo.ca"]
```

`scripts/promote-hackers.mjs` reads every `*.json` in this folder when run with
no arguments, or one file when given a name:

```bash
node scripts/promote-hackers.mjs                  # every scripts/data/*.json
node scripts/promote-hackers.mjs accepted         # scripts/data/accepted.json
node scripts/promote-hackers.mjs --dry-run        # resolve only, write nothing
```

`--failed-out <name>` writes the addresses that failed back into this folder, so
that file is gitignored too.

See `accepted.example.json` for a working file.
