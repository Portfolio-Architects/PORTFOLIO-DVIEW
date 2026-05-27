import json

with open("scratch/step_313_args.json", "r", encoding="utf-8") as f:
    args = json.load(f)

chunks_str = args.get("ReplacementChunks")

# Let's fix the invalid backslashes. A backslash followed by a character that is not a valid JSON escape sequence.
fixed_str = ""
i = 0
n = len(chunks_str)
while i < n:
    if chunks_str[i] == '\\':
        if i + 1 < n:
            next_char = chunks_str[i+1]
            if next_char in ['"', '\\', '/', 'b', 'f', 'n', 'r', 't', 'u']:
                fixed_str += '\\' + next_char
                i += 2
            else:
                fixed_str += '\\\\' + next_char
                i += 2
        else:
            fixed_str += '\\\\'
            i += 1
    else:
        fixed_str += chunks_str[i]
        i += 1

try:
    # Use strict=False to allow raw newlines/tabs inside JSON strings
    chunks = json.loads(fixed_str, strict=False)
    print("SUCCESSFULLY PARSED CHUNKS!")
    with open("scratch/step_313_chunks.txt", "w", encoding="utf-8") as out:
        for idx, chunk in enumerate(chunks):
            out.write(f"=== Chunk {idx} ===\n")
            out.write(f"StartLine: {chunk.get('StartLine')}, EndLine: {chunk.get('EndLine')}\n")
            out.write(f"TargetContent:\n{chunk.get('TargetContent')}\n")
            out.write("-" * 30 + "\n")
            out.write(f"ReplacementContent:\n{chunk.get('ReplacementContent')}\n")
            out.write("=" * 60 + "\n\n")
    print("Wrote parsed chunks to scratch/step_313_chunks.txt")
except Exception as e:
    print("Failed to parse fixed string:", e)
