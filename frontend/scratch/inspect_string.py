with open("scratch/step_313_args.json", "r", encoding="utf-8") as f:
    import json
    args = json.load(f)

chunks_str = args.get("ReplacementChunks")
print(chunks_str[1800:2200])
