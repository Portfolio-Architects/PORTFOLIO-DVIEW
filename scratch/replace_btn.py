import os

filepath = 'frontend/src/components/ApartmentModal.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_str = 'className="shrink-0 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[13px] px-4.5 py-3 rounded-xl transition-all shadow-md shadow-emerald-500/10 active:scale-98 flex items-center gap-1 border-none cursor-pointer"'
new_str = 'className="w-full sm:w-auto shrink-0 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[13px] px-4.5 py-3 rounded-xl transition-all shadow-md shadow-emerald-500/10 active:scale-98 flex items-center justify-center gap-1 border-none cursor-pointer"'

if old_str in content:
    content = content.replace(old_str, new_str)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Success: Replaced button class")
else:
    print("Error: Target string not found")
