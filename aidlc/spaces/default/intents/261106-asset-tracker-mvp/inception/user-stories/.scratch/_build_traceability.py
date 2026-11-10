import json, pathlib, re

base = pathlib.Path("aidlc/spaces/default/intents/261106-asset-tracker-mvp/inception/user-stories")
req = (base.parent / "requirements-analysis" / "requirements.md").read_text()

# --- extract upstream ids exactly as the sensor's \bFR\d+(?:\.\d+)?\b pattern does ---
pattern = re.compile(r"\bFR\d+(?:\.\d+)?\b|\bNFR\d+(?:\.\d+)?\b")
found = []
for m in pattern.finditer(req):
    if m.group(0) not in found:
        found.append(m.group(0))
print("extracted:", len(found))
print(found)

groups = [i for i in found if "." not in i]
leaves = [i for i in found if "." in i]
print("groups:", len(groups), groups)
print("leaves:", len(leaves))

# group heading followed by its leaves, in document order
leaves_by_group = {}
for l in leaves:
    g = l.split(".")[0]
    leaves_by_group.setdefault(g, []).append(l)
final = []
for g in groups:
    final.append(g)
    for l in leaves_by_group.get(g, []):
        final.append(l)
print("final count:", len(final))

# --- coverage map: leaf id -> (status, target) ---
OK = {
 # FR1
 "FR1.1":"US1.1", "FR1.2":"US1.1", "FR1.3":"US1.1, US6.4", "FR1.4":"US1.2, US1.3", "FR1.5":"US1.2",
 "FR1.6":"US1.2", "FR1.6a":"US1.2", "FR1.7":"US1.3, US6.3", "FR1.8":"US6.2, US6.1",
 "FR1.9":"US6.1, US6.2",
 # FR2
 "FR2.1":"US7.1, US4.2", "FR2.2":"US7.1", "FR2.3":"US7.1", "FR2.4":"US7.1",
 "FR2.5":"US7.1", "FR2.6":"US4.2", "FR2.7":"US4.2", "FR2.8":"US3.6",
 # FR3
 "FR3.1":"US3.1", "FR3.2":"US3.1", "FR3.3":"US3.1, US3.6", "FR3.4":"US2.1",
 "FR3.5":"US2.2", "FR3.6":"US3.2", "FR3.6a":"US3.2, US3.3", "FR3.7":"US3.5",
 "FR3.8":"US3.5, US3.3", "FR3.9":"US3.4", "FR3.10":"US3.4, US3.3", "FR3.11":"US3.4",
 "FR3.12":"US3.6",
 # FR4
 "FR4.1":"US4.1", "FR4.2":"US4.1", "FR4.3":"US4.3", "FR4.4":"US4.1", "FR4.5":"US4.1",
 # FR5
 "FR5.1":"US5.6", "FR5.2":"US5.6", "FR5.3":"US5.3",
 # FR6
 "FR6.1":"US5.1", "FR6.2":"US5.1, US5.2", "FR6.3":"US5.1", "FR6.4":"US5.4",
 "FR6.5":"US5.1, US5.3", "FR6.6":"US5.1, US5.3", "FR6.7":"US5.1, US5.2",
 "FR6.8":"US5.1",
 # FR7
 "FR7.1":"US5.2", "FR7.2":"US5.2", "FR7.3":"US5.2",
 # FR8
 "FR8.1":"US5.3", "FR8.2":"US5.3", "FR8.3":"US5.3", "FR8.4":"US5.3",
 # FR9
 "FR9.1":"US5.5", "FR9.2":"US5.5", "FR9.3":"US5.5", "FR9.4":"US5.5", "FR9.5":"US5.5",
 "FR9.6":"US5.5", "FR9.7":"US5.5",
 # FR10
 "FR10.1":"US6.1", "FR10.2":"US6.1", "FR10.3":"US6.1", "FR10.4":"US6.2",
 "FR10.5":"US6.3", "FR10.6":"US6.2", "FR10.7":"US6.4",
 # FR11
 "FR11.1":"US7.2", "FR11.2":"US7.2", "FR11.3":"US7.2",
 # NFR1
 "NFR1.1":"US5.7", "NFR1.2":"US5.7", "NFR1.3":"US5.7",
 # NFR2
 "NFR2.1":"US7.1", "NFR2.2":"US1.1, US4.2", "NFR2.3":"US7.2", "NFR2.4":"US7.1",
 "NFR2.5":"US7.1", "NFR2.6":"US7.2", "NFR2.7":"US4.2",
 # NFR3
 "NFR3.1":"US7.1", "NFR3.2":"US1.4",
 # NFR3.3 - NFR3.6 are the migration's own acceptance criteria, carried by
 # US0.1 (AC0.1.8 - AC0.1.10). They are OK, not Deferred: a criterion that
 # exists has something for the affirmed test-first exception to attach to.
 "NFR3.3":"US0.1", "NFR3.4":"US0.1", "NFR3.5":"US0.1", "NFR3.5a":"US0.1", "NFR3.6":"US0.1",
 # NFR4
 "NFR4.1":"US7.2",
 # NFR5
 "NFR5.1":"US5.1", "NFR5.2":"US5.1", "NFR5.3":"US5.4",
 # NFR6
 "NFR6.1":"US1.1, US6.1", "NFR6.2":"US1.1", "NFR6.3":"US1.1",
 "NFR6.4":"US1.2", "NFR6.5":"US4.2", "NFR6.6":"US1.1",
}

# group heading -> the stories covering its area
GROUP_MAP = {
 "FR1":"US1.1, US1.2, US1.3, US1.4, US6.2, US6.3, US6.4",
 "FR2":"US7.1, US4.2",
 "FR3":"US3.1, US3.2, US3.3, US3.4, US3.5, US3.6, US3.7, US2.1, US2.2",
 "FR4":"US4.1, US4.2, US4.3",
 "FR5":"US5.6, US5.3",
 "FR6":"US5.1, US5.2, US5.4",
 "FR7":"US5.2",
 "FR8":"US5.3",
 "FR9":"US5.5",
 "FR10":"US6.1, US6.2, US6.3, US6.4",
 "FR11":"US7.2",
 "NFR1":"US5.7",
 "NFR2":"US7.1, US7.2, US1.1, US4.2",
 "NFR3":"US7.1, US1.4, US0.1",
 "NFR4":"US7.2",
 "NFR5":"US5.1, US5.4",
 "NFR6":"US1.1, US1.2, US4.2",
}

# deferred -> named downstream stage
DEFERRED = {}

coverage = []
for i in final:
    if "." in i:
        if i in DEFERRED:
            coverage.append({"id": i, "status": "Deferred", "target": DEFERRED[i]})
        else:
            coverage.append({"id": i, "status": "OK", "target": OK[i]})
    else:
        coverage.append({"id": i, "status": "OK", "target": GROUP_MAP[i]})

out = {
  "stage": "user-stories",
  "upstream_ids": final,
  "coverage": coverage,
}
(base / "traceability.json").write_text(json.dumps(out, indent=2) + "\n")
print("wrote traceability.json:", len(final), "ids,", len(coverage), "rows")
missing = [i for i in leaves if i not in OK and i not in DEFERRED]
print("unmapped leaves:", missing)
