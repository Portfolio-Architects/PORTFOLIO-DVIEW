import json

conv = "7cac87be-11cd-4cad-a740-06c422a9c041"
log_path = f"C:\\Users\\ocs56\\.gemini\\antigravity\\brain\\{conv}\\.system_generated\\logs\\transcript.jsonl"

with open(log_path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        try:
            data = json.loads(line)
            tcs = data.get('tool_calls', [])
            for tc in tcs:
                name = tc.get('name') or tc.get('ToolName')
                if name in ['write_to_file', 'replace_file_content', 'multi_replace_file_content']:
                    args = tc.get('args') or tc.get('arguments') or {}
                    if isinstance(args, str):
                        try:
                            args = json.loads(args)
                        except:
                            pass
                    target = args.get('TargetFile') or ''
                    content = args.get('CodeContent') or args.get('ReplacementContent') or ''
                    chunks = args.get('ReplacementChunks') or []
                    print(f"Step {data.get('step_index')}: {name} -> {target} (content_size: {len(str(content))}, chunks: {len(chunks)})")
                    if 'MacroDashboardClient' in target or 'recovered' in target:
                        print(f"    Snippet: {str(content)[:150]}")
        except Exception as e:
            pass
