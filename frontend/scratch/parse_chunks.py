import json
import re

with open("scratch/step_313_args.json", "r", encoding="utf-8") as f:
    args = json.load(f)

chunks = args.get("ReplacementChunks")
print("Type of chunks:", type(chunks))

# If chunks is a string, it might have escape issues. Let's fix them.
if isinstance(chunks, str):
    # Sometimes it has invalid escapes like \x or similar, or double backslashes
    # Let's replace backslashes that are not valid JSON escapes
    # We can try to evaluate it as python literal using ast.literal_eval if it's a python dict string
    import ast
    try:
        chunks_eval = ast.literal_eval(chunks)
        print("Literal eval succeeded!")
        chunks = chunks_eval
    except Exception as e:
        print("Literal eval failed:", e)
        # Try raw json loads
        try:
            chunks = json.loads(chunks)
            print("Standard JSON loads succeeded!")
        except Exception as err:
            print("Standard JSON loads failed:", err)
            # Let's try to print the error character region
            pos = re.search(r'char (\d+)', str(err))
            if pos:
                char_idx = int(pos.group(1))
                print("Error context:", chunks[max(0, char_idx-50):min(len(chunks), char_idx+50)])

if isinstance(chunks, list):
    with open("scratch/step_313_chunks.txt", "w", encoding="utf-8") as out:
        for idx, chunk in enumerate(chunks):
            out.write(f"=== Chunk {idx} ===\n")
            out.write(f"StartLine: {chunk.get('StartLine')}, EndLine: {chunk.get('EndLine')}\n")
            out.write(f"TargetContent:\n{chunk.get('TargetContent')}\n")
            out.write("-" * 30 + "\n")
            out.write(f"ReplacementContent:\n{chunk.get('ReplacementContent')}\n")
            out.write("=" * 60 + "\n\n")
    print("Successfully parsed and wrote to scratch/step_313_chunks.txt")
