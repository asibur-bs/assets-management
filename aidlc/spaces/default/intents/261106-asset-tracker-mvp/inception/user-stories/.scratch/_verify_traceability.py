import json, pathlib, re

base = pathlib.Path("aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/user-stories")
stories = (base / "stories.md").read_text()
trace = json.loads((base / "traceability.json").read_text())

# story ids actually defined in stories.md (headings like "### US1.1 — ")
defined = set(re.findall(r"(?m)^### (US\d+\.\d+)", stories))
# also the Won't-Have table rows "**US8.1**"
defined |= set(re.findall(r"\*\*(US\d+\.\d+)\*\*", stories))
print("defined story ids:", len(defined), sorted(defined))

missing = set()
for row in trace["coverage"]:
    if row["status"] == "OK":
        for t in re.split(r",\s*", row["target"]):
            t = t.strip()
            if t.startswith("US"):
                if t not in defined:
                    missing.add((row["id"], t))
print("OK targets not found in stories.md:", missing if missing else "none")

# ids in upstream_ids but not covered
ids = set(trace["upstream_ids"])
cov = set(r["id"] for r in trace["coverage"])
print("in upstream_ids not in coverage:", ids - cov)
print("in coverage not in upstream_ids:", cov - ids)
print("rows:", len(trace["coverage"]), "unique:", len(cov))

# every defined story referenced?
referenced = set()
for row in trace["coverage"]:
    for t in re.split(r",\s*", row["target"]):
        t = t.strip()
        if t.startswith("US"):
            referenced.add(t)
print("defined but never referenced:", sorted(defined - referenced))

# every acceptance criterion id referenced by a story is unique
acs = re.findall(r"\*\*(AC\d+\.\d+\.\d+)\*\*", stories)
print("criterion ids:", len(acs), "unique:", len(set(acs)))
dupes = [a for a in set(acs) if acs.count(a) > 1]
print("duplicate criterion ids:", dupes if dupes else "none")

# every story has an INVEST note and a Priority
for sid in sorted(defined):
    if sid.startswith("US8"):
        continue
    # find the section for this story
    m = re.search(r"(?m)^### " + re.escape(sid) + r" .*?(?=^### |^## |\Z)", stories, re.S)
    if not m:
        print("NO SECTION for", sid)
        continue
    body = m.group(0)
    if "**Priority**" not in body:
        print("NO PRIORITY for", sid)
    if "**INVEST**" not in body:
        print("NO INVEST for", sid)
print("story section check done")

# acceptance criteria per story (AC{group}.{seq}.{n} belongs to US{group}.{seq})
from collections import Counter
per_story = Counter("US" + a.split(".")[1] + "." + a.split(".")[2] for a in acs)
for sid in sorted(defined):
    if sid.startswith("US8"):
        continue
    if per_story.get(sid, 0) == 0:
        print("NO CRITERIA for", sid)
print("criteria-per-story check done")
print("criteria counts:", dict(sorted(per_story.items())))
