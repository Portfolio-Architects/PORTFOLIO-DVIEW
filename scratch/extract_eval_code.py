import re

path = r"c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\scratch\recovered_raw.js"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Let's find the eval content
# Webpack uses eval(...) inside the module definition.
# Let's search for "eval(__webpack_require__.ts(" or "eval("
start_idx = content.find("eval(__webpack_require__.ts(")
if start_idx != -1:
    # Find the first quote
    quote_idx = content.find('"', start_idx)
    if quote_idx != -1:
        # Find the ending quote of this string literal
        # We need to skip escaped quotes \"
        end_idx = quote_idx + 1
        while end_idx < len(content):
            if content[end_idx] == '"' and content[end_idx-1] != '\\':
                break
            end_idx += 1
        
        raw_str = content[quote_idx+1:end_idx]
        
        # Now let's unescape this string!
        # It has standard JS escape sequences like \n, \t, \", \\, \uXXXX
        # We can decode it using codecs escape_decode
        import codecs
        try:
            # We need to convert it to bytes and decode using unicode_escape
            # Before doing unicode_escape, let's ensure we handle double escapes correctly
            bytes_str = raw_str.encode('utf-8')
            decoded = codecs.escape_decode(bytes_str)[0].decode('utf-8')
            # Replace escaped newlines and tabs
            decoded = decoded.replace('\\n', '\n').replace('\\t', '\t').replace('\\"', '"').replace('\\\\', '\\')
            
            with open("scratch/recovered_typescript.js", "w", encoding="utf-8") as out:
                out.write(decoded)
            print("Successfully extracted and wrote to scratch/recovered_typescript.js")
        except Exception as e:
            print("Error decoding:", e)
else:
    print("Could not find eval( in the file.")
