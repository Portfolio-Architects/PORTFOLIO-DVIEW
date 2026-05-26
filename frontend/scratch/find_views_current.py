import json
import os

conv = "7cac87be-11cd-4cad-a740-06c422a9c041"
log_path = f"C:\\Users\\ocs56\\.gemini\\antigravity\\brain\\{conv}\\.system_generated\\logs\\transcript.jsonl"

with open(log_path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        try:
            data = json.loads(line)
            if data.get('type') == 'VIEW_FILE':
                content = data.get('content', '')
                if 'MacroDashboardClient' in content:
                    print(f"VIEW_FILE at step {data.get('step_index')} (Line {i}): length {len(content)}")
                    print(f"Start: {content[:100]}")
                    print(f"End: {content[-100:]}")
                    print("-" * 50)
            elif data.get('type') == 'PLANNER_RESPONSE':
                tcs = data.get('tool_calls', [])
                for tc in tcs:
                    if (tc.get('name') or tc.get('ToolName')) == 'view_file':
                        args = tc.get('args') or tc.get('arguments') or {}
                        if isinstance(args, str):
                            args = json.loads(args)
                        if 'MacroDashboardClient.tsx' in str(args):
                            print(f"Planner viewed file at step {data.get('step_index')} (Line {i})")
                            print(f"Args: {json.dumps(args, indent=2, ensure_ascii=False)}")
                            print("=" * 60)
        except Exception as e:
            pass
