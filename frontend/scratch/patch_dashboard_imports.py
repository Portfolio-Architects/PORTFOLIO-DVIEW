import re

file_path = r"c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend\src\components\MacroDashboardClient.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Replace Recharts import with dynamic import of MacroTrendChart
recharts_import_pattern = r"""import {\s*PieChart,\s*Pie,\s*Cell,\s*ResponsiveContainer,\s*LineChart,\s*Line,\s*XAxis,\s*YAxis,\s*Tooltip as RechartsTooltip,\s*CartesianGrid,\s*Legend,\s*} from "recharts";"""
dynamic_import_replacement = """import dynamic from "next/dynamic";
const MacroTrendChart = dynamic(() => import("./MacroTrendChart"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[200px] flex items-center justify-center bg-body/50 rounded-2xl animate-pulse">
      <span className="text-tertiary text-[13px] font-bold">차트 로드 중...</span>
    </div>
  )
});"""

content_replaced = re.sub(recharts_import_pattern, dynamic_import_replacement, content, flags=re.DOTALL)

# 2. Find and delete CustomTooltip definition
tooltip_pattern = r"""interface TooltipPayloadEntry {.*?const CustomTooltip = \(\{ active, payload, label \}: CustomTooltipProps\) => \{.*?return null;\s*\};"""
content_replaced = re.sub(tooltip_pattern, "", content_replaced, flags=re.DOTALL)

# Also let's clean it if it is CRLF vs LF
content_replaced_normalized = content_replaced.replace("\r\n", "\n")

# Remove CustomTooltip & interfaces with more general regex if previous failed
content_replaced_normalized = re.sub(r'interface TooltipPayloadEntry.*?const CustomTooltip =.*?return null;\s*\n\s*\};', "", content_replaced_normalized, flags=re.DOTALL)

with open(file_path, "w", encoding="utf-8", newline="\r\n") as f:
    f.write(content_replaced_normalized)

print("Successfully updated imports and cleaned up tooltip code!")
