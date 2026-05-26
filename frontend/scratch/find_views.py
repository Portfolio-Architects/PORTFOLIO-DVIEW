import json
import os

conv = "24ea87ea-e93b-4027-8523-44d96b85336a"
log_path = f"C:\\Users\\ocs56\\.gemini\\antigravity\\brain\\{conv}\\.system_generated\\logs\\transcript.jsonl"

with open(log_path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        try:
            data = json.loads(line)
            if data.get('type') == 'VIEW_FILE':
                # Check if this view_file was for MacroDashboardClient.tsx
                # Some logs have the tool call arguments in the model turn, and the file contents in the VIEW_FILE type step
                content = data.get('content', '')
                if 'MacroDashboardClient' in content:
                    print(f"VIEW_FILE at step {data.get('step_index')} (Line {i}): length {len(content)}")
                    # Let's write the first 100 and last 100 characters
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
