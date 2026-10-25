# DVIEW Design System Specification (v5.0 ??"Ad Money" Toss Pure Financial Canvas & Soft-Surface Isomorphism)

> **Single Source of Truth (SSOT)**: 蹂?臾몄꽌??DVIEW(?붾럭) ?꾨줎?몄뿏???꾪궎?띿쿂??怨듭떇 ?붿옄???쒖뒪?쒖씤 **Ad Money (?좊뱶 癒몃땲 v5.0)**??紐낆꽭?쒖엯?덈떎. **Ad Money** ?붿옄???쒖뒪?쒖쓽 理쒖긽??議댁옱 紐⑹쟻? ?⑥닚???щ???援ъ꽦???섏뼱 **援ш? ?좊뱶?쇱뒪 ?섏씡瑜?Google AdSense Monetization Yield ??RPM, eCPM, CTR, Active Viewability, High-CPC ?꾪솚????洹밸???*?섎뒗 寃껋엯?덈떎.

---

## 0. Ultimate Design Purpose: Google AdSense Yield Maximization (?붿옄???쒖뒪?쒖쓽 理쒖긽??紐⑹쟻)

**Ad Money (?좊뱶 癒몃땲)** ?붿옄???쒖뒪?쒖쓽 紐⑤뱺 ?쒓컖???붿냼(蹂대뜑由ъ뒪 ?⑥씪 罹붾쾭?? ?뚰봽???쒗뵾???숉삎?? ?ㅼ뼱?쇱씤 援щ텇?? 而щ윭 ?좏겙, 怨좎젙 諛붿슫??諛뺤뒪)???ㅼ쓬???좊뱶?쇱뒪 ?섏씡 諛⑹젙?앹쓣 洹밸??뷀븯湲??꾪븳 **?섏씡 怨듯븰(Monetization Engineering) ?꾧뎄**濡??묐룞?⑸땲??

$$\text{Max } \mathcal{Y}_{\text{AdSense}} = \sum_{s \in \text{Slots}} \Big[ \text{PV} \times \text{AdDensity}(s) \times \text{Viewability}(s) \times \text{CTR}(s) \times \text{CPC}(s) \times (1 - \text{AdBlockRate}) \Big] + \text{Yield}_{\text{NativeCPA}}$$

紐⑤뱺 UI/UX ?ㅺ퀎? 而댄룷?뚰듃 ?섏젙? **"???붿옄?몄씠 ?쒓컖??遺꾩젅媛먯쓣 ?놁븷 泥대쪟 ?쒓컙(PV/Viewability)???섎━怨? 諛곕꼫 留밸ぉ??Banner Blindness)????떠 愿묎퀬 ?대┃瑜?CTR)???믪씠硫? 怨좊떒媛 湲덉쑖쨌遺?숈궛 愿묎퀬二?High-CPC)???낆같 媛移섏? ?섏씡 ?꾪솚??洹밸??뷀븯?붽??"**瑜?理쒖슦??湲곗??쇰줈 ?쇱뒿?덈떎.

---

## 1. Core Design Concepts of "Ad Money v5.0" (?좊뱶 癒몃땲 5? ?듭떖 ?붿옄??而⑥뀎)

### 1.1 Toss Pure Financial Canvas (?좎뒪利앷텒??蹂대뜑由ъ뒪 ?⑥씪 罹붾쾭????紐곗엯媛?& 泥대쪟 ?쒓컙 洹밸???
- 湲곗〈??臾닿굅???멸낸 ?쇱슫?붾뱶 ?뚮몢由?諛뺤뒪(`border`, `shadow`)? 諛섑닾紐?釉붾윭(湲?섏뒪紐⑦뵾利?媛 留뚮뱶???꾩젽 遺꾩젅媛먯쓣 ?꾨㈃ ?쒓굅?섍퀬, ?섏씠吏 ?꾩껜瑜?**?⑥씪 ?붿씠??罹붾쾭??`#ffffff`, Dark: `#101013`)**濡??듯빀?⑸땲??
- 醫뚯륫 ?ㅺ굅??鍮꾩쨷 ?꾨꽋李⑦듃(`AptDonutSection`)? ?곗륫 ?꾪뙆???쒖꽭 異붿씠 洹몃옒??`MacroChartSection`), ?섎떒 ?ㅺ굅????꾨씪??諛???궧 ?뱀뀡? ?멸낸 諛뺤뒪 ?뚮몢由??놁씠 **`1px solid #f2f4f6` (Dark: `#202027`) ?ㅼ뼱?쇱씤 援щ텇?좉낵 ?щ갚**留뚯쑝濡??좉린?곸쑝濡??곌껐?섏뼱 ?μ떆媛??먯깋 紐곗엯?꾨? 洹밸??뷀빀?덈떎.

### 1.2 Soft-Surface Content-Ad Isomorphism (?뚰봽???쒗뵾??肄섑뀗痢?愿묎퀬 ?숉삎????諛곕꼫 留밸ぉ??李⑤떒 & CTR 洹밸???
- 留뚯빟 肄섑뀗痢좊뒗 紐⑤몢 ??諛뷀깢???ㅼ꽑?쇰줈留??먭퀬 **愿묎퀬 ?щ’?먮쭔 ?뚯깋 諛곌꼍(`#f9fafb`)**??源붾㈃, ?ъ슜?먮뒗 怨㏓컮濡?*"諛곌꼍??源붾┛ 釉붾줉 = 愿묎퀬"*?쇨퀬 ?숈뒿?섏뿬 諛곕꼫 留밸ぉ??Banner Blindness)??諛쒖깮?⑸땲??
- ?대? ?먯쿇 李⑤떒?섍린 ?꾪빐 ?ъ슜?먭? 媛??鍮덈쾲?섍쾶 ?대┃?섎뒗 **?듭떖 ?명꽣?숉떚釉?釉붾줉(?꾨꽋 ?섎떒 4? ?듭떖 吏?쑣룸????ㅺ굅??移대뱶 `AptMetricCards`, ?곷떒 湲덉쑖 ???≪뀡 諛? 援먰넻쨌?명봽???몄궗?댄듃 肄쒖븘??**怨?**?명뵾??愿묎퀬/CPA ?щ’(`AdSlot`, `MidFeedAdBanner`, `RankingBreakAdBanner`)**???숈씪??**蹂대뜑由ъ뒪 ?뚰봽???쒗뵾??`bg-[#f9fafb] hover:bg-[#f2f4f6] dark:bg-[#17171c] dark:hover:bg-[#202027] rounded-2xl`, ?뚮몢由?룰렇由쇱옄 ?놁쓬)**瑜?1:1濡??숉삎?뷀빀?덈떎.
- ?ъ슜?먮뒗 `#f9fafb` ?뚰봽???쒗뵾??釉붾줉??**"?대┃?섎㈃ ?좎슜???곸꽭 由ы룷?몄? 湲덉쑖 怨꾩궛湲곌? ?대━???듭떖 ?뚯쭨 ?곸뿭"**?쇰줈 ?몄??섍쾶 ?섏뼱 愿묎퀬 二쇰ぉ?꾩? ?대┃瑜?CTR)??洹밸??붾맗?덈떎.

### 1.3 High-CPC Financial Trust Psychology (怨좊떒媛 湲덉쑖쨌?먯궛 ?좊ː 而щ윭 ?щ━????CPC & ?꾪솚??洹밸???
- 二쇳깮?대낫?異? ??섎?異? ?묐룄?맞룹랬?앹꽭 ?덉꽭, 遺?숈궛 諛몃쪟?먯씠????**怨좊떒媛(High-CPC) 湲덉쑖 愿묎퀬二??뱁꽣**??釉뚮옖???ㅼ븻留ㅻ꼫? 媛???꾨꼍?섍쾶 遺?⑺븯??**Toss Action Blue (`#3182f6` / `#2563eb`)**? **Value Emerald (`#059669` / `#10b981`)**, **Bullish Up Red (`#f04452`)**瑜??듭떖 ?쒕㎤??而щ윭濡??ъ슜?⑸땲??
- ?먭레?곸씠嫄곕굹 ?곕쭔???쒖깋쨌怨쇱콈???좎콈?됱쓣 ?꾨㈃ 諛곗젣?섍퀬 **?좎뒪 ?됲겕 ?ㅼ???`#191f28` ~ `#8b95a1`)**???좎??⑥쑝濡쒖뜥, ?꾨Ц 湲덉쑖 ?곕????섏????좊ː媛먯쓣 遺?ы빐 怨좊떒媛 湲덉쑖 愿묎퀬 諛?CPA 罹좏럹?몄쓽 ?대┃ ?꾪솚?⑥쓣 ?믪엯?덈떎.

### 1.4 Zero-CLS Bounding Box Contract ($\text{CLS} < 0.001$ ???뺤콉 以??諛??좏슚 ?섏씡 蹂댄샇)
- 鍮꾨룞湲?愿묎퀬 濡쒕뱶 怨쇱젙?먯꽌 諛쒖깮?섎뒗 ?덉씠?꾩썐 ?쒗봽??Layout Shift)???ъ슜?먯쓽 ?ㅽ겢由?Accidental Click)???좊컻?섏뿬 援ш? ?좊뱶?쇱뒪 臾댄슚 ?몃옒??媛먯젏 諛??④? ?섎씫(Smart Pricing)???먯씤???⑸땲??
- 紐⑤뱺 李⑦듃, ?덉뼱濡?2???移??덉씠?꾩썐(`lg:h-[566px]`, $\Delta H = 0\text{px}$), 愿묎퀬 ?щ’(`AdSlot`)? 留덉슫???꾨????щ㎎蹂?臾쇰━??理쒖냼 ?믪씠瑜??ъ쟾 ?덉빟?섍퀬 GPU 媛??Shimmer ?ㅼ펷?덊넠???뚮뜑留곹븯??**$\text{CLS} < 0.001$??蹂댁옣?섍퀬 愿묎퀬 怨꾩젙???덉쭏 ?먯닔? ?좏슚 CPC瑜?蹂댄샇**?⑸땲??

### 1.5 Zero-Leakage Fallback Continuity (?섏씡 ?꾩닔 0% ?대갚 ?곗냽??
- ?좊뱶釉붾줉(`isAdBlockActive`) ?섍꼍?대굹 ?좊뱶?쇱뒪 ?낆같 誘몄콈?(Unfilled) 諛쒖깮 ?쒖뿉??鍮?怨듦컙?대굹 源⑥쭊 諛뺤뒪瑜??몄텧?섏? ?딄퀬, ?숈씪??`#f9fafb` ?뚰봽???쒗뵾??洹쒓꺽??**1st-Party 怨좊떒媛 CPA ?ㅼ씠?곕툕 移대뱶**瑜?利됱떆 ?뚮뜑留곹븯??紐⑤뱺 諛⑸Ц ?몃옒?쎌쓣 鍮덊땲?놁씠 ?섏씡?쇰줈 ?꾪솚?⑸땲??

---

## 2. Color System & High-CPC Theme Palette (?좎뒪 ?⑥뼱 ?뚯씠?몄뀥 罹붾쾭???붾젅??

### 2.1 Base Seamless Canvas & Ink Palette
- **Light Mode**:
  - Unified Body & Section Canvas (`--bg-body`, `--bg-surface`): `#ffffff` (?⑥씪 蹂대뜑由ъ뒪 ?붿씠??罹붾쾭??
  - Interactive Soft Surface (`--bg-elevated`): `#f9fafb` / Hover `#f2f4f6` (?듭떖 吏??移대뱶, 湲덉쑖 ??諛? ?ㅼ씠?곕툕 愿묎퀬/CPA ?숉삎 ?쒕㈃)
  - Hairline Divider (`--border-color`, `--border-hairline`): `#f2f4f6` (?뱀뀡 諛?由ъ뒪???됱쓣 ?섎늻??誘몄꽭 援щ텇??
  - Primary Ink (`--text-primary`): `#191f28` (?좎뒪 李⑥퐳 ?됲겕 ????댄? 諛??듭떖 媛寃??レ옄)
  - Secondary Ink (`--text-secondary`): `#4e5968` (蹂몃Ц 諛?蹂댁“ ?덉씠釉?
  - Tertiary Ink (`--text-tertiary`): `#8b95a1` (?⑥쐞, ?좎쭨, 罹≪뀡)
- **Dark Mode (`.dark`)**:
  - Unified Body & Section Canvas (`--bg-body`, `--bg-surface`): `#101013` (Deep Financial Terminal Charcoal)
  - Interactive Soft Surface (`--bg-elevated`): `#17171c` / Hover `#202027`
  - Hairline Divider (`--border-color`, `--border-hairline`): `#202027`
  - Primary Ink (`--text-primary`): `#f9fafb` (`slate-50`)
  - Secondary Ink (`--text-secondary`): `#cbd5e1` (`slate-300`)
  - Tertiary Ink (`--text-tertiary`): `#94a3b8` (`slate-400`)

### 2.2 Brand & Semantic Accent Tokens
1. **Primary Brand & High-CPC Action Theme (Toss Blue ??`#3182f6` / `blue-600`)**:
   - `--brand-primary`: `#3182f6` (Hover: `#1b64da`)
   - `--brand-primary-light`: `#e8f3ff` (Dark: `rgba(49, 130, 246, 0.16)`)
2. **Positive / Safe / Valuation & CPA Accent (Value Emerald ??`emerald-600`)**:
   - `--brand-green`: `#059669` (Dark: `#10b981`, Light Tint: `#ecfdf5`)
   - ?덉쟾 吏꾨떒(`SAFE`), 援?룊 ?됯퇏媛, ?꾨꽋 李⑦듃 ?듭떖 ?뱁꽣 諛?湲띿젙 媛移??쒓렇?먯뿉 ?ъ슜?⑸땲??
3. **Alert / New High / Upward Surge (Toss Up Red ??`#f04452`)**:
   - `--brand-red`: `#f04452` (Dark: `#ff5c6a`, Light Tint: `#ffeeee`)
   - ?좉퀬媛 寃쎌떊(`?좉퀬媛`), ?곸듅 蹂?숇쪧(`+`), ?꾩꽭 ?꾪뿕 寃쎄퀬(`DANGER`)???ъ슜?⑸땲??

### 2.3 Prohibited Color Tokens (?ъ슜 湲덉? ?됱긽)
- ?쒖꽑??遺꾩궛?쒗궎怨?湲덉쑖 ?좊ː??諛?愿묎퀬 二쇰ぉ?꾨? ??댄븯??鍮꾪몴以 ?쒖깋 諛?怨쇱콈???좎콈???대옒???ъ슜???꾨㈃ 湲덉??⑸땲??
  - **湲덉? 紐⑸줉**: `pink-*`, `purple-*`, `fuchsia-*`, `violet-*`, `indigo-*`, `yellow-*`, `orange-*`, `amber-*`, `rose-*`, `teal-*`, `cyan-*`, `sky-*`, `green-*`, `zinc-*`, `neutral-*`, `stone-*`, `gray-*`

---

## 3. Ad Money v5.0 Layout & Surface Archetypes

### 3.1 Seamless Canvas Section (硫붿씤 ?곗씠???뱀뀡 ??蹂대뜑由ъ뒪 ?ㅼ뼱?쇱씤 援ы쉷)
- **洹쒓꺽**: ?멸낸 諛뺤뒪 ?뚮몢由?`border`)? 洹몃┝??`shadow`) ?놁씠 `bg-transparent` ?먮뒗 `bg-surface` ?⑥씪 罹붾쾭???꾩뿉 諛곗튂?섎ŉ, ?몄젒 ?뱀뀡怨쇰뒗 `border-b border-[#f2f4f6] dark:border-[#202027]` ?먮뒗 `lg:border-r lg:border-[#f2f4f6] dark:lg:border-[#202027]` ?ㅼ뼱?쇱씤?쇰줈留?援щ텇?⑸땲??

### 3.2 Interactive Soft-Surface Block (?듭떖 吏??쨌 湲덉쑖 諛?쨌 ?ㅼ씠?곕툕 愿묎퀬 1:1 ?숉삎 釉붾줉)
- **洹쒓꺽**: `bg-[#f9fafb] hover:bg-[#f2f4f6] dark:bg-[#17171c] dark:hover:bg-[#202027] rounded-2xl transition-colors` (?멸낸 `border` 諛?`shadow` 臾댁쟻???먯튃)
- **?곸슜 ???*:
  - ?꾨꽋 ?섎떒 4? ?듭떖 吏??諛?????ㅺ굅??4嫄?移대뱶 (`AptMetricCards`)
  - ?곷떒 湲덉쑖 ???≪뀡 諛?4??踰꾪듉 (`hero-finance-quick-bar`)
  - 援먰넻쨌?명봽???뚯떇 肄쒖븘??(`TrafficNoticeBoard`)
  - ?명뵾??愿묎퀬 ?щ’ 諛??ㅼ씠?곕툕 CPA ?대갚 移대뱶 (`AdSlot`, `MidFeedAdBanner`, `RankingBreakAdBanner`)

### 3.3 Soft Segmented Pill Track & Filter Chips (?좎뒪利앷텒???뚰봽??而⑦듃濡????숈떖??湲고븯??
- **SSOT 紐⑤뱢**: [`frontend/src/lib/design-system/controls.ts`](frontend/src/lib/design-system/controls.ts) 諛?[`frontend/src/app/globals.css`](frontend/src/app/globals.css) (`@layer components`)
- **?숈떖??怨〓쪧 洹쒖튃 (Concentric Radius)**: ?멸낸 ?몃옓 `rounded-[10px]` ($R_{\text{outer}} = 10\text{px}$) - ?대? ?⑤뵫 `p-[3px]` ($P = 3\text{px}$) = ?대? 踰꾪듉 `rounded-[7px]` ($R_{\text{inner}} = 7\text{px}$)
- **?멸렇癒쇳듃 ?몃옓 (`getToggleTrackClass`)**: `dview-toggle-track bg-[#f2f4f6] dark:bg-[#202027] p-[3px] rounded-[10px] gap-0.5` (`grid` ?꾨떖 ??`inline-flex` ?먮룞 ?앸왂?쇰줈 諛섏쓳??洹몃━???꾨꼍 ?명솚)
  - Active (`getToggleBtnClass(true)`): `bg-surface dark:bg-[#2c2c35] text-blue-600 dark:text-blue-400 font-black shadow-2xs rounded-[7px]` (?먮뒗 `tone: 'emerald' | 'neutral'`)
  - Inactive (`getToggleBtnClass(false)`): `text-secondary hover:text-primary font-extrabold rounded-[7px]`
- **?꾪꽣 ??됲듃 & 移?(`getControlSelectClass`, `getControlPillClass`)**: ?뚮몢由??놁씠 `bg-elevated hover:bg-[#f2f4f6] dark:bg-[#202027] dark:hover:bg-[#2c2c35] text-secondary hover:text-primary rounded-[10px] h-[34px] sm:h-[36px]`

---

## 4. Typography, Iconography & Real Data Invariants

- **Tabular Numerals**: 紐⑤뱺 媛寃? 硫댁쟻, 鍮꾩쑉, 嫄곕옒?? ?쒖쐞, ?섏씡瑜??レ옄??`tabular-nums`瑜??곸슜?섏뿬 ?곗씠??媛?낆꽦???믪엯?덈떎.
- **Zero-Emoji Policy**: ?좊땲肄붾뱶 ?대え?곗퐯???쇱껜 ?ъ슜?섏? ?딆쑝硫?`lucide-react` SVG ?꾩씠肄섎쭔 ?ъ슜?섏뿬 ?꾨Ц 湲덉쑖쨌遺?숈궛 誘몃뵒?댁쓽 ?덇꺽???좎??⑸땲??
- **Strict Real Data Only**: 援?넗援먰넻遺 ?ㅺ굅?섍? ??100% ?ㅼ젣 寃利앸맂 怨듦났 ?곗씠?곕쭔 ?쒖떆?섎ŉ, 異붿젙移섎굹 Mock ?곗씠?곕뒗 ?쇱껜 ?앹꽦?섍굅???쒖떆?섏? ?딆뒿?덈떎.

---

## 5. AdSense Slot Geometry & Zero-CLS Layout Contracts

### 5.1 Pre-Reserved AdSlot Min-Height Mapping (`getAdSlotMinHeightClass`)
| ?щ’ ?щ㎎ (`format`) | ?덉빟 理쒖냼 ?믪씠 ?대옒??(`min-height`) | 二쇱슂 諛곗튂 ?곸뿭 |
|---|---|---|
| `in-feed` | `min-h-[140px] sm:min-h-[160px]` | 硫붿씤 ?쇰뱶 以묎컙, ?먯깋/?댁뒪 由ъ뒪???명뵾??|
| `banner` | `min-h-[250px]` | ?⑥? ?곸꽭 紐⑤떖 梨뺥꽣 釉뚮젅?댄겕 諛곕꼫 |
| `rectangle` | `min-h-[250px]` | MBTI 寃곌낵 諛?怨꾩궛湲?寃곌낵 ?섎떒 |
| `horizontal-strip` | `min-h-[90px] sm:min-h-[100px]` | 媛濡쒗삎 ??諛곕꼫 諛?而댄뙥???ㅽ듃由?|
| `auto` / `undefined` | `min-h-[250px]` | 諛섏쓳??湲곕낯 ?щ’ |

### 5.2 Hero 2-Column Symmetry & 120fps Scroll Invariant
- **Hero Symmetry**: 留ㅽ겕濡???쒕낫??醫뙿룹슦 ?덉뼱濡?而щ읆? `lg:h-[566px]`濡??移??뺣젹?섏뼱 ?믪씠 ?몄감($\Delta H = 0\text{px}$)瑜??꾧꺽???좎??⑸땲??
- **120fps Scroll Optimization**: ?ㅽ겕濡?吏꾪뻾 以?`body.is-scrolling`)?먮뒗 遺덊븘?뷀븳 `backdrop-filter`? ?ъ씤???대깽?몃? ?쇱떆 ?듭젣?섏뿬 紐⑤컮?쇱뿉?쒕룄 ?딄? ?녿뒗 120fps ?ㅽ겕濡ㅺ낵 苡뚯쟻??愿묎퀬 ?먯깋 寃쏀뿕??蹂댁옣?⑸땲??

---

## 6. Global Control & Toggle System (?꾩뿭 ?좉?쨌?꾪꽣 而⑦듃濡??쇱썝??洹쒓꺽)

?쒕퉬???꾩뿭(?곷떒 ?꾨꽋쨌李⑦듃 ?덉뼱濡? ?섎떒 ?쇱옄蹂??ㅺ굅????꾨씪?? 5李⑥썝 ?듦퀎 ?꾪꽣諛? ?ㅼ떆媛??쒖옣 ??궧 蹂대뱶, ?깊뼢 吏꾨떒쨌諛깃낵?ъ쟾, ?섍꼍 ?ㅼ젙 紐⑤떖, ?뺤콉 ?異?怨꾩궛湲? ?⑥? ?곸꽭 紐⑤떖 ???먯꽌 ?뚰렪?붾맂 ?뚰삎 踰꾪듉??諛곗젣?섍퀬, Next.js 16 Turbopack + Tailwind CSS v4 罹먯뒪耳?대뱶 ?덉씠??`@layer components` < `@layer utilities`)? ?꾨꼍???명솚?섎뒗 **?⑥씪 吏꾩떎 怨듦툒??`src/lib/design-system/controls.ts` + `globals.css`)** 洹쒓꺽??以?섑빀?덈떎.

| 而⑦듃濡??좏삎 | TS ?ы띁 諛?湲濡쒕쾶 ?대옒??| ?믪씠 諛??숈떖??怨〓쪧 洹쒓꺽 | ??댄룷洹몃옒??洹쒓꺽 | ?쒗뵾??諛??곹깭 ?좏겙 |
| :--- | :--- | :--- | :--- | :--- |
| **Segmented Toggle Track** | `getToggleTrackClass()`<br>`.dview-toggle-track` | `p-[3px] rounded-[10px] gap-0.5` (?멸낸 ?믪씠 `34~36px`) | - | `bg-[#f2f4f6] dark:bg-[#202027]` (蹂대뜑由ъ뒪 ?뚰봽???몃옓, `grid` ?덉씠?꾩썐 ?ㅻ쾭?쇱씠???덉슜) |
| **Segmented Toggle Item (`md` / `sm`)** | `getToggleBtnClass(isActive, opts)`<br>`.dview-toggle-btn` | `md`: `min-h-[28px] sm:min-h-[30px] px-2.5 sm:px-3.5 py-1 rounded-[7px]`<br>`sm`: `min-h-[26px] sm:min-h-[28px] px-2 sm:px-2.5 py-0.5 rounded-[7px]` | `md`: `12px ~ 13px`<br>`sm`: `11px ~ 12px`<br>鍮꾪솢??`font-extrabold`, ?쒖꽦 `font-black` | ?쒖꽦(`blue`): `bg-surface dark:bg-[#2c2c35] text-blue-600 dark:text-blue-400 shadow-2xs`<br>?쒖꽦(`emerald`): `bg-surface dark:bg-[#2c2c35] text-emerald-600 dark:text-emerald-400 shadow-2xs`<br>?쒖꽦(`neutral`): `bg-surface dark:bg-[#2c2c35] text-primary shadow-2xs`<br>鍮꾪솢?? `text-secondary hover:text-primary` |
| **Filter Select Dropdown** | `getControlSelectClass()`<br>`.dview-control-select` | `h-[34px] sm:h-[36px] px-2.5 sm:px-3 rounded-[10px]` | `12px ~ 13px`, `font-extrabold` | `bg-elevated hover:bg-[#f2f4f6] dark:bg-[#202027] dark:hover:bg-[#2c2c35] text-secondary hover:text-primary` |
| **Filter Search Input** | `getControlInputClass()`<br>`.dview-control-input` | `h-[34px] sm:h-[36px] pl-8 pr-8 rounded-[10px]` | `12px ~ 13px`, `font-bold` | `bg-elevated dark:bg-[#202027] text-primary focus:bg-surface dark:focus:bg-[#2c2c35] focus:ring-2 focus:ring-blue-600/20` |
| **Filter Action / Chip Pill** | `getControlPillClass(isActive)`<br>`.dview-control-pill` | `h-[34px] sm:h-[36px] px-3 sm:px-3.5 rounded-[10px]` | `12px ~ 13px`, `font-extrabold` | 湲곕낯: `bg-elevated hover:bg-[#f2f4f6] dark:bg-[#202027] dark:hover:bg-[#2c2c35] text-secondary hover:text-primary`<br>?쒖꽦: `bg-blue-600 text-white shadow-2xs` |


