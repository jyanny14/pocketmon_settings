// Prompts are emitted in the user's current UI language. Each template
// carries ko/en/ja/zh body variants; prompts.js picks the right one via
// getLang() at substitute() time. Rule blocks and the shared disclaimer
// are likewise split into ko/en/ja/zh variants and baked in at module-load.

// Disclaimer about Champions vs main series is embedded in the data
// bundle's _readme field (see prompts.js bundleReadme), so prompt bodies
// no longer need to repeat it per-message.

// ── Footer fallback (appended to every prompt by substitute()) ──
// Rescue message for users who skipped the data-file attach step.

export const FOOTER_FALLBACK_KO =
  "첨부 파일이 없다면 {{DATA_BUNDLE_PAGE_URL}} 에서 Champions 데이터 파일을 받아 이 챗에 첨부 후 다시 물어주세요 — Champions 데이터 없이는 정확한 답이 불가합니다.";

export const FOOTER_FALLBACK_EN =
  "If there's no attachment yet, grab the Champions data file at {{DATA_BUNDLE_PAGE_URL}}, attach it to this chat, and ask again — without the data an accurate answer isn't possible.";

export const FOOTER_FALLBACK_JA =
  "添付ファイルがない場合は {{DATA_BUNDLE_PAGE_URL}} から Champions データファイルを取得してこのチャットに添付し、再度お尋ねください — Champions データなしに正確な回答はできません。";

export const FOOTER_FALLBACK_ZH =
  "如果还没有附件，请在 {{DATA_BUNDLE_PAGE_URL}} 获取 Champions 数据文件并附加到本对话后再询问 — 没有 Champions 数据无法准确回答。";

// ── Strict pool constraint (ko) ──────────────────────────────────

export const STRICT_POOL_RULES_KO = `첨부된 champions-data JSON 을 진실의 소스로 사용하세요. 해당 파일 최상단 \`_rules\` 필드(상세 규칙·부재 예시·자기검증 체크리스트)를 먼저 읽고 전부 준수하세요. 모든 추천 항목은 slug+출처 병기 (예: \`아머까오 (slug: corviknight, 출처: pokemon.json)\`). 파티의 상세 수치·효과는 champions-data 의 해당 배열에서 조회하세요. 불확실하면 \`_rules\` 지침대로 대체 항목을 찾거나 유저에게 재확인을 요청하세요.`;

// ── Detailed rules (embedded into champions-data JSON `_rules` field) ──
// These ship inside the data bundle so the AI reads them alongside the
// data. The prompt body keeps only the slim CORE RULE + a pointer to
// this block, saving per-turn tokens while preserving strictness.

export const DETAILED_RULES_KO = `**데이터 제약 · 상세 규칙 (champions-data JSON 내장 규칙집)**

이 \`_rules\` 는 첨부된 champions-data JSON 에 내장된 상세 규칙입니다. 프롬프트 본문의 CORE RULE 과 함께 반드시 지키세요. 검증 대상은 이 JSON 내부 배열의 \`slug\` 필드입니다.

1. **검증 원칙 — 매 답변마다 직접 조회**
   - 포켓몬: \`pokemon[]\` 의 \`slug\` 필드 (186종 / 267 폼)
   - 특성: \`abilities[]\` 의 \`slug\` 필드 (192종; \`isNewInChampions: true\` 인 항목은 Champions 신규)
   - 도구: \`items[]\` 의 \`slug\` 필드 (117종)
   - 기술: \`moves[]\` 의 \`slug\` 필드 (481종; \`updatedInChampions\` 필드가 있는 16개는 본편과 수치 상이)
   - 대화 요약본·이전 턴 기억에 의존하지 말고, 매번 이 파일을 다시 열어 조회하세요. 긴 대화에서는 클라이언트가 내용을 압축하며 값이 손실될 수 있습니다.

2. **Champions 와 본편 라인업 차이**
   - **부재 포켓몬 예시** (pokemon[] 에 없음): urshifu · rillaboom · salamence · metagross · iron-hands · iron-valiant · flutter-mane · roaring-moon · chi-yu · great-tusk · ferrothorn. 본편 VGC 메타여도 Champions 에 없음.
   - **존재 포켓몬 예시**: garchomp · dragapult · hydreigon · tyranitar · kingambit · tinkaton.
   - **부재 도구 예시** (items[] 에 없음): assault-vest · life-orb · choice-band · choice-specs · rocky-helmet · heavy-duty-boots · eviolite.
   - **존재 도구 예시**: leftovers · focus-sash · choice-scarf.
   - "본편에 있으니까" / "유명하니까" / "VGC 강자이니까" 식 추측 **절대 금지.** 본편 인기·메타 위상·팬덤 인지도는 Champions 포함 여부의 증거가 아닙니다.

3. **특성/기술의 폼 매칭**: 특성이나 기술을 특정 포켓몬에 붙일 때 해당 폼의 \`forms[].abilities\` / \`forms[].moves\` 배열에 **실제로 존재**해야 합니다. 폼 외 특성 또는 비배움 기술 추천 금지.

4. **불확실 시 대체 또는 재확인**
   - (a) 기능적으로 유사한 대체가 이 JSON 내에 있으면 그것으로 답하세요 (예: 돌격조끼 부재 → items[] 내 유사 효과 도구).
   - (b) 대체 불가능하거나 질문의 상당 부분이 JSON 으로 커버 안 되면, 사전 지식으로 메우지 말고: **"Champions 데이터에서 '{항목명}' 을(를) 찾지 못했습니다. 데이터 파일을 다시 확인해주세요."** 로 답변.

5. **자기 검증 (답변 전송 직전 · 필수)**
   - (a) **포켓몬 패스**: 답변 내 모든 포켓몬 이름의 slug 가 pokemon[] 에 있는지 확인. 폼 언급 시 \`forms[].name\` 도 확인. 하나라도 누락 = 해당 문단 전체 삭제 + 규칙 4 에 따라 재확인 요청.
   - (b) **특성/도구/기술 패스**: abilities[] / items[] / moves[] 의 slug 와 동일 검증.
   - 제거 후 답변이 완전히 비면: **"Champions 데이터 내에서 조건을 만족하는 항목을 찾지 못했습니다."** 로 응답.
   - **확신 없는 이름을 하나라도 출력하면 전체 답변 무효.**`;

// ── Strict pool constraint (en) ──────────────────────────────────

export const STRICT_POOL_RULES_EN = `Use the attached champions-data JSON as the source of truth. Read its top-level \`_rules\` field (detailed rules, missing-entry examples, self-verification checklist) in full and follow everything there before writing. Every recommendation must carry slug + source (e.g. \`Corviknight (slug: corviknight, source: pokemon.json)\`). Look up per-move/ability/item numerics in the matching array of champions-data — the party JSON below gives you only identifiers. If unsure, follow \`_rules\` guidance to pick a similar alternative or ask the user to re-check the data.`;

export const DETAILED_RULES_EN = `**Data constraints · Detailed rules (embedded in champions-data JSON)**

This \`_rules\` block is embedded inside the attached champions-data JSON. Obey it together with the CORE RULE in the prompt. Verification targets are the \`slug\` fields in the arrays of this JSON.

1. **Verification principle — look it up every answer**
   - Pokémon: \`slug\` in \`pokemon[]\` (186 species / 267 forms)
   - Abilities: \`slug\` in \`abilities[]\` (192 entries; entries with \`isNewInChampions: true\` are Champions-exclusive)
   - Items: \`slug\` in \`items[]\` (117 entries)
   - Moves: \`slug\` in \`moves[]\` (481 entries; entries with an \`updatedInChampions\` field differ numerically from the main games)
   - Never rely on conversation summaries or earlier-turn memory. Long chats get compressed by the client and values get lost — re-open the file each answer.

2. **Champions vs main-series lineup differences**
   - **Pokémon missing from pokemon[]** (examples): urshifu · rillaboom · salamence · metagross · iron-hands · iron-valiant · flutter-mane · roaring-moon · chi-yu · great-tusk · ferrothorn. Not in Champions regardless of main-series VGC relevance.
   - **Pokémon present** (examples): garchomp · dragapult · hydreigon · tyranitar · kingambit · tinkaton.
   - **Items missing from items[]** (examples): assault-vest · life-orb · choice-band · choice-specs · rocky-helmet · heavy-duty-boots · eviolite.
   - **Items present** (examples): leftovers · focus-sash · choice-scarf.
   - "It's in the main games" / "it's famous" / "it's VGC-strong" are **strictly not evidence** of Champions inclusion.

3. **Form-level ability/move matching**: When attaching an ability or move to a specific Pokémon, it must actually exist in that form's \`forms[].abilities\` / \`forms[].moves\` array. No abilities outside the form; no moves the form can't learn.

4. **When unsure — substitute or re-request**
   - (a) If a functionally similar alternative exists in this JSON, use that (e.g. no assault-vest → pick a similar item from items[]).
   - (b) If no alternative works or a large part of the request isn't covered, **don't fill the gap from prior knowledge**. Respond: **"I couldn't find '{item}' in the Champions data. Please re-check the data file."**

5. **Self-verification (mandatory before sending)**
   - (a) **Pokémon pass**: confirm every Pokémon name's slug is present in pokemon[]. If a form was mentioned, also check \`forms[].name\`. Any miss = delete the paragraph depending on that Pokémon + substitute a re-check request per rule 4.
   - (b) **Ability/item/move pass**: same verification against abilities[] / items[] / moves[].
   - If nothing survives: **"No matches found in the Champions data for this request."**
   - **Leaking a single unverified name invalidates the entire answer.**`;

// ── Strict pool constraint (ja) ──────────────────────────────────

export const STRICT_POOL_RULES_JA = `添付された champions-data JSON を真実の情報源として使用してください。ファイル最上部の \`_rules\` フィールド（詳細ルール・不在例・自己検証チェックリスト）を最後まで読み、すべて遵守してから回答してください。すべての推薦項目に slug + 出典を併記 (例: \`アーマーガア (slug: corviknight, 出典: pokemon.json)\`)。特性・道具・技の詳細数値や効果は champions-data の該当配列で検索してください — 下のパーティ JSON には識別子のみ含まれます。不確かな場合は \`_rules\` の指針に従い類似代替品を探すか、ユーザーにデータの再確認を依頼してください。`;

export const DETAILED_RULES_JA = `**データ制約・詳細ルール（champions-data JSON 内蔵規則集）**

この \`_rules\` は添付された champions-data JSON に内蔵された詳細ルールです。プロンプト本文の CORE RULE と合わせて必ず遵守してください。検証対象はこの JSON 内部配列の \`slug\` フィールドです。

1. **検証原則 — 毎回答ごとに直接検索**
   - ポケモン：\`pokemon[]\` の \`slug\` フィールド（186種 / 267フォルム）
   - 特性：\`abilities[]\` の \`slug\` フィールド（192種、\`isNewInChampions: true\` の項目は Champions 新規）
   - 道具：\`items[]\` の \`slug\` フィールド（117種）
   - 技：\`moves[]\` の \`slug\` フィールド（481種、\`updatedInChampions\` フィールドがある16個は本編と数値相異）
   - 会話要約・過去ターン記憶に依存せず、毎回このファイルを再度開いて検索してください。長い会話ではクライアントが内容を圧縮し、値が失われる可能性があります。

2. **Champions と本編のラインナップ差**
   - **不在ポケモンの例**（pokemon[] にない）：urshifu · rillaboom · salamence · metagross · iron-hands · iron-valiant · flutter-mane · roaring-moon · chi-yu · great-tusk · ferrothorn。本編 VGC メタでも Champions にはいません。
   - **存在ポケモンの例**：garchomp · dragapult · hydreigon · tyranitar · kingambit · tinkaton。
   - **不在道具の例**（items[] にない）：assault-vest · life-orb · choice-band · choice-specs · rocky-helmet · heavy-duty-boots · eviolite。
   - **存在道具の例**：leftovers · focus-sash · choice-scarf。
   - 「本編にあるから」/「有名だから」/「VGCで強いから」という推測は**絶対禁止**。本編人気・メタ地位・ファン認知度は Champions 収録の根拠になりません。

3. **特性・技のフォルム照合**：特性や技を特定のポケモンに割り当てる場合、そのフォルムの \`forms[].abilities\` / \`forms[].moves\` 配列に**実際に存在**していなければなりません。フォルム外の特性や習得不可の技の推薦禁止。

4. **不確かな場合は代替または再確認**
   - (a) 機能的に類似した代替品がこの JSON 内にあれば、それで回答（例：とつげきチョッキ不在 → items[] 内の類似効果の道具）。
   - (b) 代替不可能、または質問の大部分が JSON でカバーされていない場合、事前知識で補わず：**「Championsデータで『{項目名}』が見つかりませんでした。データファイルを再確認してください。」** と回答。

5. **自己検証（送信直前・必須）**
   - (a) **ポケモンパス**：回答中のすべてのポケモン名の slug が pokemon[] にあるか確認。フォルム言及時は \`forms[].name\` も確認。一つでも不一致 = そのポケモンに依存する段落全体を削除 + ルール4に従い再確認要求に置き換え。
   - (b) **特性・道具・技パス**：abilities[] / items[] / moves[] の slug と同様に検証。
   - 削除後に回答が完全に空になった場合：**「Championsデータ内で条件を満たす項目が見つかりませんでした。」** と回答。
   - **確認できない名前を一つでも出力すると、回答全体が無効。**`;

// ── Strict pool constraint (zh) ──────────────────────────────────

export const STRICT_POOL_RULES_ZH = `请以附件的 champions-data JSON 作为真实来源。撰写回答前，完整阅读并遵守该文件顶层的 \`_rules\` 字段（详细规则·不在示例·自我核验清单）。所有推荐项目须附 slug + 出处（例：\`铁甲鸦 (slug: corviknight, 出处: pokemon.json)\`）。特性·道具·招式的详细数值或效果请在 champions-data 的对应数组中查询 — 下方队伍 JSON 中仅包含识别符。不确定时请按 \`_rules\` 的指引寻找功能类似的替代项，或请用户重新核对数据。`;

export const DETAILED_RULES_ZH = `**数据约束·详细规则（champions-data JSON 内置规则集）**

本 \`_rules\` 为附件 champions-data JSON 内置的详细规则，必须与提示本文的 CORE RULE 一同遵守。验证对象为本 JSON 内各数组的 \`slug\` 字段。

1. **验证原则 — 每次回答都直接查询**
   - 宝可梦：\`pokemon[]\` 的 \`slug\` 字段（186种 / 267形态）
   - 特性：\`abilities[]\` 的 \`slug\` 字段（192种；带 \`isNewInChampions: true\` 的为 Champions 新增）
   - 道具：\`items[]\` 的 \`slug\` 字段（117种）
   - 招式：\`moves[]\` 的 \`slug\` 字段（481种；含 \`updatedInChampions\` 字段的16个与本传数值相异）
   - 不要依赖会话摘要或历史对话记忆，每次都重新打开此文件查询。长对话可能被客户端压缩导致数据丢失。

2. **Champions 与本传阵容差异**
   - **不在宝可梦示例**（pokemon[] 中没有）：urshifu · rillaboom · salamence · metagross · iron-hands · iron-valiant · flutter-mane · roaring-moon · chi-yu · great-tusk · ferrothorn。本传 VGC 常用与否不影响，Champions 中没有。
   - **存在宝可梦示例**：garchomp · dragapult · hydreigon · tyranitar · kingambit · tinkaton。
   - **不在道具示例**（items[] 中没有）：assault-vest · life-orb · choice-band · choice-specs · rocky-helmet · heavy-duty-boots · eviolite。
   - **存在道具示例**：leftovers · focus-sash · choice-scarf。
   - 「本传有所以 Champions 也有」/「知名所以在」/「VGC 强所以当然在」等推测**绝对禁止**。本传人气·对战地位·粉丝认知度**不是** Champions 收录依据。

3. **特性/招式的形态匹配**：将特性或招式配给特定宝可梦时，该形态的 \`forms[].abilities\` / \`forms[].moves\` 数组中**必须实际存在**。禁止推荐形态外特性或不可习得招式。

4. **不确定时的替代或重新核对**
   - (a) 若本 JSON 中有功能类似的替代项，使用该替代项作答（例如突击背心不在 → 从 items[] 中选择效果类似的道具）。
   - (b) 若难以替代或问题大部分内容不在 JSON 中，不得以已有知识填补，请回应：**「Champions 数据中未找到『{项目名}』。请重新核对数据文件。」**

5. **自我核验（发送前·必须）**
   - (a) **宝可梦核验**：回答中每个宝可梦名称的 slug 是否存在于 pokemon[]。若提及形态，还需核对 \`forms[].name\`。任一不符 = 删除依赖该宝可梦的整段 + 按规则4替换为重新核对请求。
   - (b) **特性/道具/招式核验**：对照 abilities[] / items[] / moves[] 的 slug 做同样验证。
   - 若删除后回答完全为空：**「Champions 数据中未找到满足此请求的项目。」**
   - **只要输出一个无法确认的名称，整个回答即无效。**`;

// ── Templates ────────────────────────────────────────────────────

export const TEMPLATES = [
  {
    id: "weakness",
    titleKey: "prompts.tmpl.weakness.title",
    descKey: "prompts.tmpl.weakness.desc",
    requiresPokemonPool: false,
    body: {
      ko: `${STRICT_POOL_RULES_KO}

---

아래 파티의 **방어적 약점**을 분석해주세요. (배틀 모드: **싱글 1대1**)

- 파티 URL: {{PARTY_URL}}
- 사이트 가이드: {{LLMS_TXT_URL}}

분석 요청:
1. 6마리 전부에게 2배 이상 대미지를 주는 공격 타입이 있는지 (있다면 그 타입과 몇 마리가 약한지).
2. 파티 전체가 내성(0.5배 이하)을 공유하는 타입 / 그 반대로 누구도 내성이 없는 타입.
3. 위험한 약점을 가장 잘 메울 수 있는 **현 파티 내의 스위칭 전략** 제안.
4. 교체가 아니라 **도구/특성 조정**으로 완화할 수 있는 부분이 있다면 함께 (제안하는 도구·특성은 items.json / abilities.json 에 실존 + 해당 폼이 쓸 수 있는 것만).

파티 구성 (참고용 인라인 데이터):
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      koDouble: `${STRICT_POOL_RULES_KO}

---

아래 파티의 **방어적 약점**을 **더블 배틀(2대2)** 관점에서 분석해주세요. 동시에 2마리가 필드에 서 있는다는 전제로.

- 파티 URL: {{PARTY_URL}}
- 사이트 가이드: {{LLMS_TXT_URL}}

분석 요청 (더블 맥락):
1. 6마리 중 **3마리 이상이 같은 타입에 2배 이상** 취약한가? — 더블에서는 한 턴에 2마리가 동시에 노출되므로 3마리 공유 약점이 치명적.
2. 스프레드 공격(Earthquake / Surf / Heat Wave / Rock Slide / Muddy Water / Dazzling Gleam / Hyper Voice / Discharge 등) 에 **리드 조합 시너지로 취약한 페어** 가 있는지. 예: 지면 약점 2마리가 함께 리드 → 상대 Earthquake 한 방에 괴멸.
3. 아무도 저항 못 하는 공격 타입 / 파티 전체가 공유 내성을 가진 타입.
4. 리드 페어로 **가장 많이 세울 수 있는 2마리 조합** 이 약점 면에서 안전한가? — 리드 2마리의 방어 프로필이 서로를 보완해야 함.
5. 교체·도구·특성 조정으로 완화 제안 (items.json / abilities.json 실존 한정). 특히 Intimidate 같은 더블에서 유효한 특성 / Sitrus Berry 같이 pinch 서포트 도구 우선 고려.

파티 구성 (참고용 인라인 데이터):
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      en: `${STRICT_POOL_RULES_EN}

---

Please analyze the **defensive weaknesses** of the party below. (Battle mode: **Singles 1v1**)

- Party URL: {{PARTY_URL}}
- Site guide: {{LLMS_TXT_URL}}

Analysis requests:
1. Any attacking type that deals 2× or more damage to all 6 members (if so: the type and how many members are weak).
2. Types the whole party resists (0.5× or less) / conversely, types no one resists.
3. The best **switching strategy inside the current party** to cover the most dangerous weaknesses.
4. Any gaps that can be mitigated with **item/ability tweaks** instead of swapping (only items/abilities that actually exist in items.json / abilities.json and are legal for the form).

Party (inline reference data):
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      enDouble: `${STRICT_POOL_RULES_EN}

---

Please analyze the **defensive weaknesses** of the party below from a **Doubles (2v2)** perspective. Assume two Pokémon are on the field at a time.

- Party URL: {{PARTY_URL}}
- Site guide: {{LLMS_TXT_URL}}

Analysis requests (doubles context):
1. Do **3+ members share a 2× weakness** to the same attacking type? — with two Pokémon exposed per turn, a 3-way shared weakness is critical.
2. Are there any **lead pairs that get blown up by spread moves** (Earthquake / Surf / Heat Wave / Rock Slide / Muddy Water / Dazzling Gleam / Hyper Voice / Discharge)? Example: two Ground-weak leads + opposing Earthquake = both KO'd.
3. Any attacking type no one resists / any type the whole team resists.
4. Is the **most natural lead pair** defensively safe? The two leads' defensive profiles should complement each other.
5. Mitigation via swaps, items, or abilities (must exist in items.json / abilities.json). Prioritise doubles-relevant abilities like Intimidate and pinch-support items like Sitrus Berry.

Party (inline reference data):
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      ja: `${STRICT_POOL_RULES_JA}

---

以下のパーティの**防御的弱点**を分析してください。（バトルモード：**シングル1対1**）

- パーティURL：{{PARTY_URL}}
- サイトガイド：{{LLMS_TXT_URL}}

分析リクエスト：
1. 6匹すべてに2倍以上のダメージを与える攻撃タイプがあるか（ある場合：そのタイプと何匹が弱点を持つか）。
2. パーティ全体が耐性（0.5倍以下）を共有するタイプ / 逆に誰も耐性を持たないタイプ。
3. 最も危険な弱点をカバーできる**現在のパーティ内でのスイッチング戦略**を提案。
4. 交代ではなく**道具・特性の調整**で軽減できる部分があれば合わせて（提案する道具・特性はitems.json / abilities.jsonに実在＋そのフォルムが使えるものに限る）。

パーティ構成（参考インラインデータ）：
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      jaDouble: `${STRICT_POOL_RULES_JA}

---

以下のパーティの**防御的弱点**を**ダブルバトル（2対2）**の観点から分析してください。2匹が同時にフィールドに立つ前提で。

- パーティURL：{{PARTY_URL}}
- サイトガイド：{{LLMS_TXT_URL}}

分析リクエスト（ダブル文脈）：
1. 6匹中**3匹以上が同じタイプに2倍以上の弱点**を持つか？ — ダブルでは1ターンに2匹が同時に露出するため、3匹共有弱点は致命的。
2. スプレッド技（Earthquake / Surf / Heat Wave / Rock Slide / Muddy Water / Dazzling Gleam / Hyper Voice / Discharge等）に**リードペア出し時に脆弱なペア**があるか。例：地面弱点2匹がリードに立つ→相手のEarthquake一発で壊滅。
3. 誰も耐性を持てない攻撃タイプ / パーティ全体が共有耐性を持つタイプ。
4. **最も自然なリード2匹の組み合わせ**は弱点面で安全か？ — リード2匹の防御プロファイルが互いを補完すべき。
5. 交代・道具・特性調整による軽減提案（items.json / abilities.json実在に限る）。特にダブルで有効なIntimidateのような特性 / Sitrus Berryのようなピンチサポート道具を優先考慮。

パーティ構成（参考インラインデータ）：
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      zh: `${STRICT_POOL_RULES_ZH}

---

请分析以下队伍的**防御弱点**。（对战模式：**单打1对1**）

- 队伍URL：{{PARTY_URL}}
- 网站指南：{{LLMS_TXT_URL}}

分析请求：
1. 是否存在对全部6只宝可梦造成2倍以上伤害的攻击属性（若有：该属性及有几只存在弱点）。
2. 全队共有耐性（0.5倍以下）的属性 / 反之无任何成员有耐性的属性。
3. 提出**利用现有队伍应对最危险弱点的换场策略**。
4. 若有能通过**道具·特性调整**而非换人来缓解的弱点，请一并说明（建议的道具·特性须在items.json / abilities.json中实际存在且该形态可用）。

队伍构成（参考内联数据）：
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      zhDouble: `${STRICT_POOL_RULES_ZH}

---

请从**双打（2对2）**角度分析以下队伍的**防御弱点**，以2只宝可梦同时上场为前提。

- 队伍URL：{{PARTY_URL}}
- 网站指南：{{LLMS_TXT_URL}}

分析请求（双打视角）：
1. 6只中是否有**3只以上对同一属性存在2倍以上弱点**？ — 双打中每回合同时有2只暴露，3只共有弱点将是致命的。
2. 扩散招式（Earthquake / Surf / Heat Wave / Rock Slide / Muddy Water / Dazzling Gleam / Hyper Voice / Discharge等）是否存在**特定先发组合时的脆弱配对**。例：2只地面弱点宝可梦先发→对方一个Earthquake双倒。
3. 无任何成员有耐性的攻击属性 / 全队共有耐性的属性。
4. **最自然的先发2只组合**在防御面是否安全？ — 先发2只的防御分布应相互补充。
5. 通过换场·道具·特性调整来缓解（须在items.json / abilities.json中实际存在）。重点考虑双打有效特性如Intimidate / 救援道具如Sitrus Berry。

队伍构成（参考内联数据）：
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
    },
  },

  {
    id: "swap",
    titleKey: "prompts.tmpl.swap.title",
    descKey: "prompts.tmpl.swap.desc",
    requiresPokemonPool: true,
    body: {
      ko: `${STRICT_POOL_RULES_KO}

---

아래 파티에서 **한 마리만 바꾼다면 누구를, 무엇으로** 바꾸는 게 좋을지 추천해주세요. (배틀 모드: **싱글 1대1**)

- 파티 URL: {{PARTY_URL}}
- 사이트 가이드: {{LLMS_TXT_URL}}
- 후보 풀: {{POKEMON_JSON_URL}} (위 제약 1~5 참고)

분석 요청:
1. 현 파티에서 가장 약한 고리(역할 중복·약점 공유·속도 밀림 등)를 한 슬롯 지목.
2. 해당 슬롯을 대체할 **3후보** 제시. 각 후보에 대해:
   - \`종족명 (slug: …)\` · 폼 · 추천 특성 · 추천 도구 (전부 pokemon.json / items.json 에 실제 존재하는 것만).
   - 교체 이유(파티 전체 관점에서 어떤 구멍을 메우는지).
3. 세 후보 중 최선을 고르고 이유 한 줄.

현 파티 인라인 데이터:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      koDouble: `${STRICT_POOL_RULES_KO}

---

아래 파티에서 **한 마리만 바꾼다면 누구를, 무엇으로** 바꾸는 게 좋을지 **더블 배틀(2대2)** 관점에서 추천해주세요.

- 파티 URL: {{PARTY_URL}}
- 사이트 가이드: {{LLMS_TXT_URL}}
- 후보 풀: {{POKEMON_JSON_URL}} (위 제약 1~5 참고)

분석 요청 (더블 맥락):
1. 현 파티의 더블 약한 고리 한 슬롯 지목 — 기준:
   - 파트너 시너지가 떨어지는 슬롯 (아무와도 리드 페어로 잘 안 맞는지)
   - 스프레드 공격에 공유 취약한 슬롯
   - 더블에서 흔한 핵심 역할(redirect / 날씨 setter / TR setter / Tailwind / Intimidate / Fake Out 선제)이 비어 있는데 그 슬롯으로 메꿀 수 있는지
2. 해당 슬롯을 대체할 **3후보** 제시. 각 후보에 대해:
   - \`종족명 (slug: …)\` · 폼 · 추천 특성 · 추천 도구 (pokemon.json / items.json 실존 + 해당 폼이 쓸 수 있는 것만)
   - 이 후보가 **어떤 파트너와 리드 페어** 가 되는지 (예: "이 XX 와 Tailwind 시너지", "Follow Me 로 YY 를 보호" 등)
   - 더블 특화 기여 (스프레드 / 서포트 / 스피드 조절 / redirect / 날씨 / TR 등)
3. 세 후보 중 최선을 고르고 **리드 조합 예시 (이 후보 + 기존 멤버 1명)** 한 줄.

현 파티 인라인 데이터:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      en: `${STRICT_POOL_RULES_EN}

---

Please recommend **which single member to swap, and what to swap in**. Change exactly one slot. (Battle mode: **Singles 1v1**)

- Party URL: {{PARTY_URL}}
- Site guide: {{LLMS_TXT_URL}}
- Candidate pool: {{POKEMON_JSON_URL}} (see constraints 1–5 above)

Analysis requests:
1. Point out the weakest link in the current party (role overlap, shared weakness, outsped, etc.) — pick one slot.
2. Propose **3 replacement candidates** for that slot. For each:
   - \`Name (slug: …)\` · form · recommended ability · recommended item (all must actually exist in pokemon.json / items.json).
   - Reason for the swap (what hole it patches from a whole-team view).
3. Pick the best of the three with a one-line rationale.

Current party inline data:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      enDouble: `${STRICT_POOL_RULES_EN}

---

Please recommend **which single member to swap, and what to swap in** from a **Doubles (2v2)** perspective.

- Party URL: {{PARTY_URL}}
- Site guide: {{LLMS_TXT_URL}}
- Candidate pool: {{POKEMON_JSON_URL}} (see constraints 1–5 above)

Analysis requests (doubles context):
1. Point out the weakest link for doubles. Criteria:
   - A slot with poor partner synergy (doesn't pair well with anyone as a lead)
   - A slot that shares spread-move vulnerabilities with too many teammates
   - A doubles-essential role the team is missing (redirect / weather setter / TR setter / Tailwind / Intimidate / Fake Out priority) that this slot could fill
2. Propose **3 replacement candidates**. For each:
   - \`Name (slug: …)\` · form · recommended ability · recommended item (must exist in pokemon.json / items.json and be legal for the form)
   - **Who on the team this candidate pairs with as a lead** (e.g. "pairs with XX for Tailwind synergy", "Follow Me to protect YY")
   - Doubles-specific contribution (spread / support / speed control / redirect / weather / TR, etc.)
3. Pick the best of the three with a **lead-pair example (this candidate + one existing member)** in one line.

Current party inline data:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      ja: `${STRICT_POOL_RULES_JA}

---

以下のパーティから**1匹だけ交代するとすれば誰を、何と交代するか**を推薦してください。1スロットのみ変更。（バトルモード：**シングル1対1**）

- パーティURL：{{PARTY_URL}}
- サイトガイド：{{LLMS_TXT_URL}}
- 候補プール：{{POKEMON_JSON_URL}}（上記制約1〜5参照）

分析リクエスト：
1. 現在のパーティで最も弱いリンク（役割重複・弱点共有・速度不足等）を1スロット指摘。
2. そのスロットの代替として**3候補**を提示。各候補について：
   - \`種族名（slug: …）\`・フォルム・推薦特性・推薦道具（全てpokemon.json / items.jsonに実在するものに限る）。
   - 交代理由（パーティ全体の観点でどの穴を埋めるか）。
3. 3候補の中から最善を選び理由を一言で。

現在のパーティインラインデータ：
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      jaDouble: `${STRICT_POOL_RULES_JA}

---

以下のパーティから**1匹だけ交代するとすれば誰を、何と交代するか**を**ダブルバトル（2対2）**の観点から推薦してください。

- パーティURL：{{PARTY_URL}}
- サイトガイド：{{LLMS_TXT_URL}}
- 候補プール：{{POKEMON_JSON_URL}}（上記制約1〜5参照）

分析リクエスト（ダブル文脈）：
1. ダブルにおける最弱リンクを1スロット指摘 — 基準：
   - パートナーシナジーが弱いスロット（誰ともリードペアとして上手くマッチしない）
   - スプレッド技の共有弱点が多すぎるスロット
   - ダブルで重要な役割（redirect / 天候setter / TR setter / Tailwind / Intimidate / Fake Out先制）が不足しており、そのスロットで補える場合
2. そのスロットの代替として**3候補**を提示。各候補について：
   - \`種族名（slug: …）\`・フォルム・推薦特性・推薦道具（pokemon.json / items.json実在＋そのフォルムが使えるものに限る）
   - この候補が**どのパートナーとリードペアを組むか**（例：「このXXとTailwindシナジー」「Follow MeでYYを守護」等）
   - ダブル特化の貢献（スプレッド / サポート / 速度調整 / redirect / 天候 / TR等）
3. 3候補の中から最善を選び**リード組み合わせ例（この候補＋既存メンバー1名）**を一言で。

現在のパーティインラインデータ：
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      zh: `${STRICT_POOL_RULES_ZH}

---

请推荐在以下队伍中**只换一只宝可梦，换谁以及换成什么**。仅更改一个槽位。（对战模式：**单打1对1**）

- 队伍URL：{{PARTY_URL}}
- 网站指南：{{LLMS_TXT_URL}}
- 候选池：{{POKEMON_JSON_URL}}（参见上述约束1–5）

分析请求：
1. 指出现有队伍中最弱的环节（角色重叠·共有弱点·速度不足等）— 指定一个槽位。
2. 为该槽位提出**3个替换候选**。对每个候选：
   - \`种族名（slug: …）\`·形态·推荐特性·推荐道具（须全部实际存在于pokemon.json / items.json）。
   - 替换理由（从整队角度补足哪处空缺）。
3. 从3个候选中选出最佳并给出一句理由。

当前队伍内联数据：
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      zhDouble: `${STRICT_POOL_RULES_ZH}

---

请从**双打（2对2）**角度推荐在以下队伍中**只换一只宝可梦，换谁以及换成什么**。

- 队伍URL：{{PARTY_URL}}
- 网站指南：{{LLMS_TXT_URL}}
- 候选池：{{POKEMON_JSON_URL}}（参见上述约束1–5）

分析请求（双打视角）：
1. 指出双打中最弱的环节，指定一个槽位 — 标准：
   - 搭档协同较弱的槽位（与任何成员配对时先发效果均不理想）
   - 与多名队友共享扩散技弱点的槽位
   - 缺少双打关键角色（redirect / 天气setter / TR setter / Tailwind / Intimidate / Fake Out先制）而该槽位可补足的情况
2. 为该槽位提出**3个替换候选**。对每个候选：
   - \`种族名（slug: …）\`·形态·推荐特性·推荐道具（须在pokemon.json / items.json中实际存在且该形态可用）
   - **与队中哪位成员搭档先发**（例："与XX形成Tailwind协同"、"用Follow Me保护YY"等）
   - 双打专属贡献（扩散 / 辅助 / 速度调控 / redirect / 天气 / TR等）
3. 从3个候选中选出最佳，并附一句**先发组合示例（该候选＋现有一名成员）**。

当前队伍内联数据：
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
    },
  },

  {
    id: "moveset",
    titleKey: "prompts.tmpl.moveset.title",
    descKey: "prompts.tmpl.moveset.desc",
    requiresPokemonPool: false,
    body: {
      ko: `${STRICT_POOL_RULES_KO}

---

아래 파티 **각 포켓몬의 4기술 세팅**을 제안해주세요. (배틀 모드: **싱글 1대1**)

- 파티 URL: {{PARTY_URL}}
- 사이트 가이드: {{LLMS_TXT_URL}}

규칙 (위 제약 1~5 와 중복되지만 재강조):
- 각 포켓몬의 추천 기술은 **pokemon.json 에서 해당 포켓몬의 \`moves\` 배열에 있는 slug** 만 쓸 수 있습니다. 없는 기술은 제안 불가.
- 각 기술의 수치는 **moves.json 에서 조회한 실제 값** 으로 표기 (사전 지식으로 지어내지 말 것).
- STAB(자속) 1–2 + 커버리지 + 보조/회복/상태이상 균형을 고려.
- 각 기술 옆에 타입·분류·위력·명중 을 괄호로 적어주세요 (예: \`Flamethrower (Fire / Special / 90 / 100)\`).
- Champions 에서 수치가 바뀐 기술(\`updatedInChampions: true\`)은 **그 수정된 수치** 기준으로 평가해주세요.

파티 인라인 데이터 (선택된 기술·특성·도구 포함. learnable 풀은 pokemon.json 참조):
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

출력 형식:
- 포켓몬 1: 기술 네 줄 + 선택 이유 한 줄
- 포켓몬 2: …
- …
`,
      koDouble: `${STRICT_POOL_RULES_KO}

---

아래 파티 **각 포켓몬의 4기술 세팅**을 **더블 배틀(2대2)** 관점에서 제안해주세요.

- 파티 URL: {{PARTY_URL}}
- 사이트 가이드: {{LLMS_TXT_URL}}

더블 맥락에서 기술 선택 기준 (+ 위 제약 1~5 준수):
- **Protect / Detect 는 사실상 필수** 에 가까움 (한 슬롯 서포트 + 생존 + 상대 템포 파악). 대부분의 포켓몬에 포함 강추.
- **스프레드 공격** (target: all-opponents / all-other-pokemon) 는 보정 0.75배지만 상대 2마리 동시 타격이라 가치 높음 — 싱글 타깃 기술보다 우선도 고려 (단 아군 피해 체크).
- **아군 지원 기술** 적극 고려: Follow Me / Rage Powder (redirect) / Helping Hand / Fake Out / Wide Guard / Quick Guard / Tailwind / Trick Room 등. 해당 포켓몬의 \`moves\` 배열에 있을 때만.
- STAB 2개는 과함 — **STAB 1 + 스프레드 1 + 서포트/Protect 1 + 커버리지 1** 이 표준 배분.
- 각 기술 옆에 **타입 · 분류 · 위력 · 명중 · (단일/스프레드/아군/자신) 타깃** 표기. 예: \`Heat Wave (Fire / Special / 95 / 90 / 스프레드)\` · \`Protect (Normal / Status / — / — / 자신)\`.
- Champions 에서 수치가 바뀐 기술(\`updatedInChampions: true\`)은 **수정된 수치** 기준.

파티 인라인 데이터 (선택된 기술·특성·도구 포함. learnable 풀은 pokemon.json 참조):
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

출력 형식:
- 포켓몬 1: 기술 네 줄 (타깃 표기) + 선택 이유 한 줄 (**어떤 파트너와 시너지** 인지 명시)
- 포켓몬 2: …
- …
`,
      en: `${STRICT_POOL_RULES_EN}

---

Please propose a **4-move set for each Pokémon** in the party below. (Battle mode: **Singles 1v1**)

- Party URL: {{PARTY_URL}}
- Site guide: {{LLMS_TXT_URL}}

Rules (overlapping with constraints 1–5 but emphasized):
- Each Pokémon's suggested moves must come from **the slug list in that Pokémon's \`moves\` array in pokemon.json**. Moves outside that list are forbidden.
- Each move's numbers must be the **actual values looked up in moves.json** (don't fabricate from prior knowledge).
- Balance STAB (1–2) + coverage + support/recovery/status.
- Write type · category · power · accuracy in parentheses next to each move (e.g. \`Flamethrower (Fire / Special / 90 / 100)\`).
- Moves rebalanced in Champions (\`updatedInChampions: true\`) must be evaluated with **their updated numbers**.

Party inline data (selected moves/ability/item included; learnable pool is in pokemon.json):
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

Output format:
- Pokémon 1: four move lines + one reason line
- Pokémon 2: …
- …
`,
      enDouble: `${STRICT_POOL_RULES_EN}

---

Please propose a **4-move set for each Pokémon** from a **Doubles (2v2)** perspective.

- Party URL: {{PARTY_URL}}
- Site guide: {{LLMS_TXT_URL}}

Doubles-specific move-selection criteria (+ constraints 1–5):
- **Protect / Detect is nearly mandatory** (one-slot support + survival + reads opponent's tempo). Include on most Pokémon by default.
- **Spread moves** (target: all-opponents / all-other-pokemon) are at 0.75× but hit both enemies — often outvalue single-target moves (watch for ally damage).
- Actively consider **ally-support moves**: Follow Me / Rage Powder (redirect) / Helping Hand / Fake Out / Wide Guard / Quick Guard / Tailwind / Trick Room. Only if present in the Pokémon's \`moves\` array.
- Two STAB moves is often overkill — standard split is **1 STAB + 1 spread + 1 Protect/support + 1 coverage**.
- Next to each move include **type · category · power · accuracy · (single/spread/ally/self) target**. Example: \`Heat Wave (Fire / Special / 95 / 90 / spread)\` · \`Protect (Normal / Status / — / — / self)\`.
- Moves rebalanced in Champions (\`updatedInChampions: true\`) use the updated numbers.

Party inline data (selected moves/ability/item included; learnable pool is in pokemon.json):
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

Output format:
- Pokémon 1: four move lines (with target tag) + one reason line (**name the partner synergy** this set enables)
- Pokémon 2: …
- …
`,
      ja: `${STRICT_POOL_RULES_JA}

---

以下のパーティの**各ポケモンの4技セット**を提案してください。（バトルモード：**シングル1対1**）

- パーティURL：{{PARTY_URL}}
- サイトガイド：{{LLMS_TXT_URL}}

ルール（上記制約1〜5と重複しますが再強調）：
- 各ポケモンの推薦技は**pokemon.jsonの該当ポケモンの\`moves\`配列内にあるslugのみ**使用可能。
- 各技の数値は**moves.jsonから調べた実際の値**で表記（事前知識で作り出さないこと）。
- STAB（一致）1〜2 + 範囲 + 補助/回復/状態異常のバランスを考慮。
- 各技の横にタイプ・分類・威力・命中率を括弧で記載（例：\`Flamethrower（Fire / Special / 90 / 100）\`）。
- Championsで数値が変更された技（\`updatedInChampions: true\`）は**変更後の数値**で評価してください。

パーティインラインデータ（選択済み技・特性・道具含む。習得可能プールはpokemon.json参照）：
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

出力形式：
- ポケモン1：技4行 + 選択理由1行
- ポケモン2：…
- …
`,
      jaDouble: `${STRICT_POOL_RULES_JA}

---

以下のパーティの**各ポケモンの4技セット**を**ダブルバトル（2対2）**の観点から提案してください。

- パーティURL：{{PARTY_URL}}
- サイトガイド：{{LLMS_TXT_URL}}

ダブル文脈での技選択基準（+ 上記制約1〜5準拠）：
- **Protect / Detectはほぼ必須** — ほとんどのポケモンに採用推奨。
- **スプレッド技**（target: all-opponents / all-other-pokemon）は0.75倍補正ですが相手2匹同時ヒットのため価値が高い（味方へのダメージに注意）。
- **味方サポート技**を積極考慮：Follow Me / Rage Powder / Helping Hand / Fake Out / Wide Guard / Quick Guard / Tailwind / Trick Room等。該当ポケモンの\`moves\`配列にある場合のみ。
- STAB2個は過多 — **STAB1 + スプレッド1 + サポート/Protect1 + 範囲1**が標準配分。
- 各技の横に**タイプ・分類・威力・命中率・（単体/スプレッド/味方/自分）ターゲット**を記載。例：\`Heat Wave（Fire / Special / 95 / 90 / スプレッド）\`。
- Championsで数値が変更された技（\`updatedInChampions: true\`）は変更後の数値基準。

パーティインラインデータ（選択済み技・特性・道具含む。習得可能プールはpokemon.json参照）：
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

出力形式：
- ポケモン1：技4行（ターゲット記載） + 選択理由1行（**どのパートナーとシナジーになるか**明示）
- ポケモン2：…
- …
`,
      zh: `${STRICT_POOL_RULES_ZH}

---

请为以下队伍的**每只宝可梦提出4招式配置**。（对战模式：**单打1对1**）

- 队伍URL：{{PARTY_URL}}
- 网站指南：{{LLMS_TXT_URL}}

规则（与约束1–5重叠但再次强调）：
- 每只宝可梦的推荐招式必须来自**pokemon.json中该宝可梦\`moves\`数组的slug**。
- 每个招式的数值必须使用**从moves.json查询的实际值**（不要凭已有知识捏造）。
- 兼顾本系属性（1–2个）+ 覆盖面 + 辅助/回复/状态异常的平衡。
- 每个招式旁请用括号注明属性·分类·威力·命中率（例：\`Flamethrower（Fire / Special / 90 / 100）\`）。
- Champions中数值已变更的招式（\`updatedInChampions: true\`）请以**变更后的数值**评估。

队伍内联数据（含已选招式·特性·道具；可学习招式池参见pokemon.json）：
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

输出格式：
- 宝可梦1：4行招式 + 1行选择理由
- 宝可梦2：…
- …
`,
      zhDouble: `${STRICT_POOL_RULES_ZH}

---

请从**双打（2对2）**角度为以下队伍的**每只宝可梦提出4招式配置**。

- 队伍URL：{{PARTY_URL}}
- 网站指南：{{LLMS_TXT_URL}}

双打视角的招式选择标准（+ 约束1–5）：
- **Protect / Detect几乎是必备** — 大多数宝可梦默认推荐携带。
- **扩散招式**（target: all-opponents / all-other-pokemon）虽有0.75倍修正，但同时命中对方2只，价值通常高于单体招式（注意对队友的伤害）。
- 积极考虑**队友辅助招式**：Follow Me / Rage Powder / Helping Hand / Fake Out / Wide Guard / Quick Guard / Tailwind / Trick Room等。仅在该宝可梦的\`moves\`数组中存在时适用。
- 2个本系属性招式往往过多 — 标准分配为**1个本系 + 1个扩散 + 1个Protect/辅助 + 1个覆盖**。
- 每个招式旁注明**属性·分类·威力·命中率·（单体/扩散/队友/自身）目标**。例：\`Heat Wave（Fire / Special / 95 / 90 / 扩散）\`。
- Champions中数值已变更的招式（\`updatedInChampions: true\`）使用变更后数值。

队伍内联数据（含已选招式·特性·道具；可学习招式池参见pokemon.json）：
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

输出格式：
- 宝可梦1：4行招式（含目标标注）+ 1行选择理由（**注明与哪位搭档形成协同**）
- 宝可梦2：…
- …
`,
    },
  },

  {
    id: "fill",
    titleKey: "prompts.tmpl.fill.title",
    descKey: "prompts.tmpl.fill.desc",
    requiresPokemonPool: true,
    body: {
      ko: `${STRICT_POOL_RULES_KO}

---

현재 파티의 **남은 {{EMPTY_COUNT}}칸**을 채울 포켓몬을 추천해주세요. (배틀 모드: **싱글 1대1**)

- 파티 URL: {{PARTY_URL}}
- 사이트 가이드: {{LLMS_TXT_URL}}
- 후보 풀: {{POKEMON_JSON_URL}} (위 제약 1~5 참고)
- 기술 상세(type / power / accuracy / pp): {{MOVES_JSON_URL}} — 추천할 4기술의 수치는 여기서 조회한 실제 값으로 표기하세요.

분석 요청:
1. 현재 파티({{FILLED_COUNT}}마리)의 약점·역할 공백을 한 줄로 진단.
2. 남은 {{EMPTY_COUNT}}칸 각각에 대해 아래 포맷으로 제안:
   - **슬롯 N**: \`종족명 (slug: …)\` (폼) — 역할 태그 (선봉 / 피봇 / 물리 어태커 / 특수 어태커 / 내구 벽 / 스위퍼 / 서포터 등 중 택1)
   - 추천 특성 · 도구 · 성격 (전부 fetched 데이터에 존재하는 것만)
   - 4기술 — 이름 옆에 (타입 / 분류 / 위력 / 명중) 괄호 표기. 해당 폼의 \`moves\` 배열에 있는 기술만.
   - Stat Points 배분 — \`hp/atk/def/spAtk/spDef/speed\` 형식. 각 스탯 0~32, 총합 ≤66.
   - 선택 이유 1~2문장 (현 파티 관점에서 어떤 구멍을 메우는지).
3. 마지막에 6마리 완성 시 **팀 컨셉 한 줄** 요약.

추가 제약:
- Champions 에서 수치가 바뀐 기술(\`updatedInChampions: true\`)은 수정된 수치 기준.
- 성격은 25종 표준 성격 중 하나.

현 파티 인라인 데이터 ({{FILLED_COUNT}}마리, 빈 슬롯 제외):
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      koDouble: `${STRICT_POOL_RULES_KO}

---

현재 파티의 **남은 {{EMPTY_COUNT}}칸**을 **더블 배틀(2대2)** 기준으로 채울 포켓몬을 추천해주세요.

- 파티 URL: {{PARTY_URL}}
- 사이트 가이드: {{LLMS_TXT_URL}}
- 후보 풀: {{POKEMON_JSON_URL}} (위 제약 1~5 참고)
- 기술 상세: {{MOVES_JSON_URL}}

분석 요청 (더블 맥락):
1. 현재 파티({{FILLED_COUNT}}마리)의 **더블 관점** 약점·역할 공백 진단 (한 줄). 특히 아래 역할 중 누락된 것 지목:
   - **Fake Out** 선제 + 1턴차 방해
   - **Redirect** (Follow Me / Rage Powder)
   - **날씨 / TR / Tailwind** 세터
   - **Intimidate** 물공 약화
   - **스프레드 어태커** (Earthquake / Surf / Heat Wave 등 담당)
   - **Protect 없는 슬롯 채움** (대부분 포켓몬이 Protect 채용)
2. 남은 {{EMPTY_COUNT}}칸 각각에 대해:
   - **슬롯 N**: \`종족명 (slug: …)\` (폼) — **더블 역할 태그** (예: "리다이렉터" · "TR setter" · "Intimidate 서포트" · "스프레드 어태커" · "Fake Out 리드" 등)
   - 추천 특성 · 도구 · 성격
   - 4기술 — 타깃 표기(단일/스프레드/아군/자신). 해당 폼의 \`moves\` 에 있는 것만.
   - Stat Points 배분 (각 0~32, 총합 ≤66). 더블은 대체로 스피드보다 내구·화력 우선 (Tailwind / TR 에 의존 가능).
   - **기존 멤버 중 누구와 리드 페어를 이루는지 한 줄** (가장 중요).
3. 마지막에 완성 6마리의 **팀 아키타입** 한 줄 (예: "Tailwind 공세팟", "Trick Room 저속팟", "날씨 (일) 팟", "스탠다드 밸런스" 등).

추가 제약: Champions 재밸런스 기술은 updated 수치. 성격 25종 중 하나.

현 파티 인라인 데이터 ({{FILLED_COUNT}}마리, 빈 슬롯 제외):
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      en: `${STRICT_POOL_RULES_EN}

---

Please recommend Pokémon to fill **the {{EMPTY_COUNT}} remaining slots** in the current party. (Battle mode: **Singles 1v1**)

- Party URL: {{PARTY_URL}}
- Site guide: {{LLMS_TXT_URL}}
- Candidate pool: {{POKEMON_JSON_URL}} (see constraints 1–5 above)
- Move details (type / power / accuracy / pp): {{MOVES_JSON_URL}} — report the 4 moves' numbers from the actual values here.

Analysis requests:
1. Diagnose the current party's ({{FILLED_COUNT}} members) weaknesses and role gaps in one line.
2. For each of the {{EMPTY_COUNT}} remaining slots, propose in this format:
   - **Slot N**: \`Name (slug: …)\` (form) — role tag (one of: lead / pivot / physical attacker / special attacker / defensive wall / sweeper / support / etc.)
   - Recommended ability · item · nature (all must exist in the fetched data).
   - 4 moves — with (type / category / power / accuracy) in parentheses. Only moves in the form's \`moves\` array.
   - Stat Points allocation — \`hp/atk/def/spAtk/spDef/speed\` format. Each stat 0–32, total ≤66.
   - 1–2 sentence reason (what gap it fills from the current party's perspective).
3. End with a **one-line team concept** summary for the completed 6-member team.

Extra constraints:
- Moves rebalanced in Champions (\`updatedInChampions: true\`) use the updated numbers.
- Natures must be one of the 25 standard natures.

Current party inline data ({{FILLED_COUNT}} members, empty slots excluded):
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      enDouble: `${STRICT_POOL_RULES_EN}

---

Please recommend Pokémon to fill **the {{EMPTY_COUNT}} remaining slots** from a **Doubles (2v2)** perspective.

- Party URL: {{PARTY_URL}}
- Site guide: {{LLMS_TXT_URL}}
- Candidate pool: {{POKEMON_JSON_URL}} (see constraints 1–5 above)
- Move details: {{MOVES_JSON_URL}}

Analysis requests (doubles context):
1. Diagnose **doubles-specific** weaknesses/role gaps of the current {{FILLED_COUNT}}-member team in one line. Call out which of these roles is missing:
   - **Fake Out** priority + turn-1 disruption
   - **Redirect** (Follow Me / Rage Powder)
   - **Weather / Trick Room / Tailwind** setter
   - **Intimidate** physical dampener
   - **Spread attacker** (Earthquake / Surf / Heat Wave, etc.)
   - **Protect** coverage (most members should run Protect)
2. For each of the {{EMPTY_COUNT}} remaining slots:
   - **Slot N**: \`Name (slug: …)\` (form) — **doubles role tag** (e.g. "redirector", "TR setter", "Intimidate support", "spread attacker", "Fake Out lead")
   - Recommended ability · item · nature
   - 4 moves — with target tag (single/spread/ally/self). Only moves in the form's \`moves\` list.
   - Stat Points allocation (each 0–32, total ≤66). Doubles usually prioritises bulk/power over raw speed (you can depend on Tailwind / TR).
   - **Which existing member it pairs with as a lead** — one line (most important).
3. End with the completed team's **doubles archetype** in one line (e.g. "Tailwind offense", "Trick Room low-speed", "Sun weather", "Standard balance").

Extra constraints: rebalanced-in-Champions moves use the updated numbers; natures must be one of the 25 standard natures.

Current party inline data ({{FILLED_COUNT}} members, empty slots excluded):
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      ja: `${STRICT_POOL_RULES_JA}

---

現在のパーティの**残り{{EMPTY_COUNT}}枠**を埋めるポケモンを推薦してください。（バトルモード：**シングル1対1**）

- パーティURL：{{PARTY_URL}}
- サイトガイド：{{LLMS_TXT_URL}}
- 候補プール：{{POKEMON_JSON_URL}}（上記制約1〜5参照）
- 技詳細（type / power / accuracy / pp）：{{MOVES_JSON_URL}} — 推薦する4技の数値はここから調べた実際の値で表記してください。

分析リクエスト：
1. 現在のパーティ（{{FILLED_COUNT}}匹）の弱点・役割空白を一言で診断。
2. 残り{{EMPTY_COUNT}}枠それぞれについて、以下の形式で提案：
   - **スロットN**：\`種族名（slug: …）\`（フォルム）— 役割タグ（先発 / ピボット / 物理アタッカー / 特殊アタッカー / 耐久壁 / スイーパー / サポート等）
   - 推薦特性・道具・性格（全てfetchしたデータに実在するものに限る）
   - 4技 — 名称横に（タイプ / 分類 / 威力 / 命中率）を括弧表記。該当フォルムの\`moves\`配列にある技のみ。
   - Stat Points配分 — \`hp/atk/def/spAtk/spDef/speed\`形式。各スタット0〜32、合計≤66。
   - 選択理由1〜2文（現在のパーティ観点でどの穴を埋めるか）。
3. 最後に6匹完成時の**チームコンセプト一言**要約。

追加制約：Championsで数値が変更された技は変更後の数値基準。性格は25種の標準性格のいずれか。

現在のパーティインラインデータ（{{FILLED_COUNT}}匹、空スロット除く）：
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      jaDouble: `${STRICT_POOL_RULES_JA}

---

現在のパーティの**残り{{EMPTY_COUNT}}枠**を**ダブルバトル（2対2）**基準で埋めるポケモンを推薦してください。

- パーティURL：{{PARTY_URL}}
- サイトガイド：{{LLMS_TXT_URL}}
- 候補プール：{{POKEMON_JSON_URL}}（上記制約1〜5参照）
- 技詳細：{{MOVES_JSON_URL}}

分析リクエスト（ダブル文脈）：
1. 現在のパーティ（{{FILLED_COUNT}}匹）の**ダブル観点**での弱点・役割空白を一言で診断。特に以下の役割で不足しているものを指摘：
   - **Fake Out**先制 + 1ターン妨害
   - **Redirect**（Follow Me / Rage Powder）
   - **天候 / TR / Tailwind**セッター
   - **Intimidate**物理攻撃弱体化
   - **スプレッドアタッカー**（Earthquake / Surf / Heat Wave等）
   - **Protect採用**（ほとんどのポケモンがProtect採用）
2. 残り{{EMPTY_COUNT}}枠それぞれについて：
   - **スロットN**：\`種族名（slug: …）\`（フォルム）— **ダブル役割タグ**（例：「redirector」・「TR setter」・「Intimidateサポート」・「スプレッドアタッカー」・「Fake Outリード」等）
   - 推薦特性・道具・性格
   - 4技 — ターゲット表記（単体/スプレッド/味方/自分）。該当フォルムの\`moves\`にあるものに限る。
   - Stat Points配分（各0〜32、合計≤66）。ダブルは耐久・火力優先（Tailwind / TRに依存可能）。
   - **既存メンバーの誰とリードペアを組むか一言**（最重要）。
3. 最後に完成6匹の**チームアーキタイプ一言**（例：「Tailwind攻めパ」「Trick Room低速パ」「晴れパ」「スタンダードバランス」等）。

追加制約：Championsリバランス技は変更後の数値。性格は25種のいずれか。

現在のパーティインラインデータ（{{FILLED_COUNT}}匹、空スロット除く）：
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      zh: `${STRICT_POOL_RULES_ZH}

---

请推荐填满当前队伍**剩余{{EMPTY_COUNT}}个空位**的宝可梦。（对战模式：**单打1对1**）

- 队伍URL：{{PARTY_URL}}
- 网站指南：{{LLMS_TXT_URL}}
- 候选池：{{POKEMON_JSON_URL}}（参见上述约束1–5）
- 招式详情（type / power / accuracy / pp）：{{MOVES_JSON_URL}} — 推荐的4个招式数值请从此处查询实际值。

分析请求：
1. 用一句话诊断当前队伍（{{FILLED_COUNT}}只）的弱点和角色空缺。
2. 对剩余{{EMPTY_COUNT}}个空位分别按以下格式提出建议：
   - **槽位N**：\`种族名（slug: …）\`（形态）— 角色标签（先发 / 枢纽 / 物理攻击手 / 特殊攻击手 / 防御壁 / 清场手 / 辅助等）
   - 推荐特性·道具·性格（须全部在获取的数据中实际存在）
   - 4个招式 — 名称旁用括号注明（属性 / 分类 / 威力 / 命中率）。仅限该形态\`moves\`数组中的招式。
   - Stat Points分配 — \`hp/atk/def/spAtk/spDef/speed\`格式。各属性0–32，总和≤66。
   - 1–2句选择理由（从现有队伍角度补足哪处空缺）。
3. 最后用一句话总结完成后6只队伍的**队伍理念**。

额外约束：Champions中数值已变更的招式使用变更后数值。性格须为25种标准性格之一。

当前队伍内联数据（{{FILLED_COUNT}}只，不含空槽位）：
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      zhDouble: `${STRICT_POOL_RULES_ZH}

---

请从**双打（2对2）**角度推荐填满当前队伍**剩余{{EMPTY_COUNT}}个空位**的宝可梦。

- 队伍URL：{{PARTY_URL}}
- 网站指南：{{LLMS_TXT_URL}}
- 候选池：{{POKEMON_JSON_URL}}（参见上述约束1–5）
- 招式详情：{{MOVES_JSON_URL}}

分析请求（双打视角）：
1. 用一句话诊断当前{{FILLED_COUNT}}只队伍的**双打视角**弱点和角色空缺。重点指出以下哪些角色缺失：
   - **Fake Out**先制 + 第1回合干扰
   - **Redirect**（Follow Me / Rage Powder）
   - **天气 / TR / Tailwind** setter
   - **Intimidate**物理削弱
   - **扩散攻击手**（Earthquake / Surf / Heat Wave等）
   - **Protect覆盖**（大多数宝可梦应携带Protect）
2. 对剩余{{EMPTY_COUNT}}个空位分别提出：
   - **槽位N**：\`种族名（slug: …）\`（形态）— **双打角色标签**（例："引导手"·"TR setter"·"Intimidate辅助"·"扩散攻击手"·"Fake Out先发"等）
   - 推荐特性·道具·性格
   - 4个招式 — 含目标标注（单体/扩散/队友/自身）。仅限该形态\`moves\`中存在的招式。
   - Stat Points分配（各0–32，总和≤66）。双打通常优先耐久·火力而非速度（可依赖Tailwind / TR）。
   - **与现有哪名成员搭档先发** — 一句话（最重要）。
3. 最后用一句话总结完成后6只队伍的**双打风格**（例："Tailwind攻势阵"·"Trick Room低速阵"·"晴天天气阵"·"标准平衡"等）。

额外约束：Champions重平衡招式使用变更后数值；性格须为25种标准性格之一。

当前队伍内联数据（{{FILLED_COUNT}}只，不含空槽位）：
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
    },
  },

  {
    id: "counter",
    titleKey: "prompts.tmpl.counter.title",
    descKey: "prompts.tmpl.counter.desc",
    requiresPokemonPool: false,
    body: {
      ko: `${STRICT_POOL_RULES_KO}

---

상대 파티에 맞춘 **대응 전략**을 짜주세요. (배틀 모드: **싱글 1대1**)

- 내 파티 URL: {{PARTY_URL}}
- 상대 파티 URL: (아래 "OPPONENT_URL" 자리에 붙여넣으세요)
  OPPONENT_URL =
- 사이트 가이드: {{LLMS_TXT_URL}}

분석 요청:
1. 상대 6마리 중 내 파티에 **가장 위험한 2마리**를 꼽고 이유.
2. 각 위험 대상을 상대할 내 **1순위·2순위 담당자**와 기술 (내 파티 인라인 데이터 안에서만, moves 배열에 있는 기술만).
3. 내 파티가 **먼저 내밀면 안 되는 포켓몬** 과 그 이유.
4. 선봉으로 추천하는 포켓몬 한 마리 + 첫 턴 플랜.

내 파티 인라인 데이터:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

(상대 파티 데이터가 필요하면 위 OPPONENT_URL 을 fetch 하거나, 내가 JSON 으로 같이 붙여드릴게요. 상대 포켓몬도 pokemon.json 에 존재하는 종만 언급하세요.)
`,
      koDouble: `${STRICT_POOL_RULES_KO}

---

상대 파티에 맞춘 **대응 전략**을 **더블 배틀(2대2)** 로 짜주세요. 리드 2마리 동시 출전.

- 내 파티 URL: {{PARTY_URL}}
- 상대 파티 URL: (아래 "OPPONENT_URL" 자리에 붙여넣으세요)
  OPPONENT_URL =
- 사이트 가이드: {{LLMS_TXT_URL}}

분석 요청 (더블 맥락):
1. 상대 6마리 중 **가장 위협적인 리드 페어 2개** 예상 (상대가 어떤 2마리를 함께 내밀 가능성이 높은가 + 그 조합이 왜 위협적인가).
2. 각 위협 리드 페어에 대해 내 **카운터 리드 페어** 제안 — 2마리 조합으로 답변. 예: "내 A + B 로 시작, A 는 Fake Out 으로 상대 C 막고 B 는 Protect 후 다음 턴 ...".
3. 각 상대 포켓몬에 대해 **내 담당자 + 기술 + 타깃** (스프레드로 한 번에 / 단일로 집중 공격 / redirect 로 보호 등).
4. 내 파티에서 **절대 같이 내밀면 안 되는 2마리** 조합 (스프레드 공유 취약 / 시너지 없음 등).
5. 추천 **리드 페어 1개 + 첫 턴 플랜** (내 두 마리 각각의 기술 + 타깃).

내 파티 인라인 데이터:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

(상대 파티 데이터가 필요하면 OPPONENT_URL 을 fetch 하거나 JSON 을 같이 붙여드릴게요. 상대 포켓몬도 pokemon.json 실존 종만.)
`,
      en: `${STRICT_POOL_RULES_EN}

---

Please draft a **counter plan** tailored to an opponent's party. (Battle mode: **Singles 1v1**)

- My party URL: {{PARTY_URL}}
- Opponent party URL: (paste it in the "OPPONENT_URL" slot below)
  OPPONENT_URL =
- Site guide: {{LLMS_TXT_URL}}

Analysis requests:
1. Pick the **2 most dangerous opponents** out of their 6 against my party and explain why.
2. For each threat, name my **primary and secondary responder** and the move to use (only from my party's inline data, moves must be in each member's \`moves\` array).
3. Which of my Pokémon **must not be led with** and why.
4. One recommended lead + first-turn plan.

My party inline data:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

(If you need the opponent's data, fetch the OPPONENT_URL above or I'll paste the JSON. Only mention opposing Pokémon that exist in pokemon.json.)
`,
      enDouble: `${STRICT_POOL_RULES_EN}

---

Please draft a **counter plan** for **Doubles (2v2)** — two leads on the field at once.

- My party URL: {{PARTY_URL}}
- Opponent party URL: (paste it in the "OPPONENT_URL" slot below)
  OPPONENT_URL =
- Site guide: {{LLMS_TXT_URL}}

Analysis requests (doubles context):
1. Predict the opponent's **2 most threatening lead pairs** (which pair they're most likely to send out together + why it's threatening).
2. For each threatening lead pair, propose my **counter-lead pair** — answer as a 2-Pokémon combination. Example: "Lead my A + B, A uses Fake Out on their C while B Protects and sets up next turn...".
3. For each opposing Pokémon, identify my **responder + move + target** (spread to hit both / single-target focus / redirect protection, etc.).
4. Name the **two Pokémon I must not lead together** (shared spread weakness, zero synergy, etc.).
5. Recommend **one lead pair + a first-turn plan** — moves and targets for each of the two leads.

My party inline data:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

(If you need the opponent's data, fetch OPPONENT_URL or I'll paste JSON. Opposing Pokémon must also exist in pokemon.json.)
`,
      ja: `${STRICT_POOL_RULES_JA}

---

相手パーティに合わせた**対策戦略**を立ててください。（バトルモード：**シングル1対1**）

- 自分のパーティURL：{{PARTY_URL}}
- 相手のパーティURL：（下記「OPPONENT_URL」の箇所に貼り付けてください）
  OPPONENT_URL =
- サイトガイド：{{LLMS_TXT_URL}}

分析リクエスト：
1. 相手の6匹の中で自分のパーティに対して**最も危険な2匹**を選び理由を述べてください。
2. 各脅威に対して自分の**第1・第2担当者と技**（自分のパーティインラインデータ内のみ、各ポケモンの\`moves\`配列にある技のみ）。
3. 自分のパーティで**先発すべきでないポケモン**とその理由。
4. 先発として推薦する1匹 + 初ターンプラン。

自分のパーティインラインデータ：
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

（相手のデータが必要な場合はOPPONENT_URLをfetchするか、JSONを貼り付けてください。相手のポケモンもpokemon.jsonに実在する種のみ言及してください。）
`,
      jaDouble: `${STRICT_POOL_RULES_JA}

---

相手パーティに合わせた**対策戦略**を**ダブルバトル（2対2）**で立ててください。リード2匹が同時出場。

- 自分のパーティURL：{{PARTY_URL}}
- 相手のパーティURL：（下記「OPPONENT_URL」の箇所に貼り付けてください）
  OPPONENT_URL =
- サイトガイド：{{LLMS_TXT_URL}}

分析リクエスト（ダブル文脈）：
1. 相手の6匹の中で**最も脅威的なリードペア2組**を予想（相手がどの2匹を一緒に出してきやすいか + その組み合わせがなぜ脅威か）。
2. 各脅威リードペアに対して自分の**カウンターリードペア**を提案 — 2匹の組み合わせで回答。例：「自分のA + Bで先発、AはFake OutでCを妨害し、BはProtectで次ターン...」。
3. 各相手ポケモンに対して**自分の担当者 + 技 + ターゲット**（スプレッドで一度に / 単体に集中 / redirectで保護等）。
4. 自分のパーティで**絶対に一緒に先発すべきでない2匹**の組み合わせ（スプレッド共有弱点 / シナジー皆無等）。
5. 推薦する**リードペア1組 + 初ターンプラン**（自分の2匹それぞれの技とターゲット）。

自分のパーティインラインデータ：
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

（相手のデータが必要な場合はOPPONENT_URLをfetchするか、JSONを貼り付けてください。相手のポケモンもpokemon.json実在種のみ。）
`,
      zh: `${STRICT_POOL_RULES_ZH}

---

请为对方队伍制定**应对策略**。（对战模式：**单打1对1**）

- 我的队伍URL：{{PARTY_URL}}
- 对方队伍URL：（请粘贴在下方"OPPONENT_URL"处）
  OPPONENT_URL =
- 网站指南：{{LLMS_TXT_URL}}

分析请求：
1. 从对方6只中挑出对我方队伍**最具威胁的2只**并说明原因。
2. 针对每个威胁，指出我方的**第1·第2应对宝可梦及招式**（仅从我方队伍内联数据中选，招式须在各成员的\`moves\`数组中）。
3. 我方**不应先发的宝可梦**及其原因。
4. 推荐先发的一只 + 第1回合计划。

我的队伍内联数据：
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

（若需要对方数据，请fetch上方OPPONENT_URL，或将JSON一并粘贴。对方宝可梦也仅限pokemon.json中存在的种类。）
`,
      zhDouble: `${STRICT_POOL_RULES_ZH}

---

请为对方队伍制定**双打（2对2）应对策略**，2只宝可梦同时先发。

- 我的队伍URL：{{PARTY_URL}}
- 对方队伍URL：（请粘贴在下方"OPPONENT_URL"处）
  OPPONENT_URL =
- 网站指南：{{LLMS_TXT_URL}}

分析请求（双打视角）：
1. 预测对方6只中**最具威胁的先发组合2组**（对方最可能同时出哪2只 + 该组合威胁性原因）。
2. 针对每组威胁先发，提出我方的**反制先发组合** — 以2只宝可梦的组合作答。例："我方A+B先发，A用Fake Out干扰对方C，B用Protect探路然后下回合..."。
3. 针对对方每只宝可梦，指出我方**应对者+招式+目标**（扩散一次性打两只 / 单体集中 / redirect保护等）。
4. 我方**绝对不能同时先发的2只**组合（共享扩散弱点·零协同等）。
5. 推荐**1组先发组合 + 第1回合计划**（我方两只各自的招式+目标）。

我的队伍内联数据：
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

（若需对方数据，请fetch OPPONENT_URL或粘贴JSON。对方宝可梦也仅限pokemon.json实际存在的种类。）
`,
    },
  },

  {
    id: "free",
    titleKey: "prompts.tmpl.free.title",
    descKey: "prompts.tmpl.free.desc",
    requiresPokemonPool: false,
    body: {
      ko: `${STRICT_POOL_RULES_KO}

---

아래는 제 Pokémon Champions 파티입니다. 이 컨텍스트 위에서 질문드릴게요. (배틀 모드: **싱글 1대1**)

- 파티 URL: {{PARTY_URL}}
- 사이트 가이드: {{LLMS_TXT_URL}}

파티 인라인 데이터:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

---

내 질문:
`,
      koDouble: `${STRICT_POOL_RULES_KO}

---

아래는 제 Pokémon Champions 파티입니다. **더블 배틀(2대2)** 을 전제로 답해주세요 — 리드 2마리 동시 출전, 스프레드·시너지·파트너 지원 기술 모두 고려.

- 파티 URL: {{PARTY_URL}}
- 사이트 가이드: {{LLMS_TXT_URL}}

파티 인라인 데이터:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

---

내 질문:
`,
      en: `${STRICT_POOL_RULES_EN}

---

Below is my Pokémon Champions party. I'll ask a question on top of this context. (Battle mode: **Singles 1v1**)

- Party URL: {{PARTY_URL}}
- Site guide: {{LLMS_TXT_URL}}

Party inline data:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

---

My question:
`,
      enDouble: `${STRICT_POOL_RULES_EN}

---

Below is my Pokémon Champions party. Please answer assuming **Doubles (2v2)** — two leads on the field at once, consider spread, partner synergy, and ally-support moves throughout.

- Party URL: {{PARTY_URL}}
- Site guide: {{LLMS_TXT_URL}}

Party inline data:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

---

My question:
`,
      ja: `${STRICT_POOL_RULES_JA}

---

以下は私のPokémon Championsパーティです。このコンテキストの上で質問します。（バトルモード：**シングル1対1**）

- パーティURL：{{PARTY_URL}}
- サイトガイド：{{LLMS_TXT_URL}}

パーティインラインデータ：
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

---

私の質問：
`,
      jaDouble: `${STRICT_POOL_RULES_JA}

---

以下は私のPokémon Championsパーティです。**ダブルバトル（2対2）**を前提として回答してください — リード2匹の同時出場、スプレッド・シナジー・パートナーサポート技を全て考慮。

- パーティURL：{{PARTY_URL}}
- サイトガイド：{{LLMS_TXT_URL}}

パーティインラインデータ：
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

---

私の質問：
`,
      zh: `${STRICT_POOL_RULES_ZH}

---

以下是我的Pokémon Champions队伍。我将在此背景下提问。（对战模式：**单打1对1**）

- 队伍URL：{{PARTY_URL}}
- 网站指南：{{LLMS_TXT_URL}}

队伍内联数据：
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

---

我的问题：
`,
      zhDouble: `${STRICT_POOL_RULES_ZH}

---

以下是我的Pokémon Champions队伍。请以**双打（2对2）**为前提作答 — 2只宝可梦同时先发，全程考虑扩散、搭档协同和队友辅助招式。

- 队伍URL：{{PARTY_URL}}
- 网站指南：{{LLMS_TXT_URL}}

队伍内联数据：
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

---

我的问题：
`,
    },
  },

  // ── Double-only templates ─────────────────────────────────────
  {
    id: "leads",
    mode: "double",
    titleKey: "prompts.tmpl.leads.title",
    descKey: "prompts.tmpl.leads.desc",
    requiresPokemonPool: false,
    body: {
      koDouble: `${STRICT_POOL_RULES_KO}

---

**더블 배틀(2대2)** 에서 이 파티의 **리드 2마리 조합**을 추천해주세요.

- 파티 URL: {{PARTY_URL}}
- 사이트 가이드: {{LLMS_TXT_URL}}

분석 요청:
1. 6마리 중에서 **유력한 리드 페어 2개**를 제안. 각 페어마다:
   - \`A (slug) + B (slug)\` 형식으로 조합 이름
   - **시너지 유형** — Fake Out 템포 · Redirect (Follow Me/Rage Powder) · 날씨 세팅·어뷰즈 · Trick Room · Tailwind · Intimidate + 물공 어태커 · 기타
   - 이 페어가 **어떤 상대에게 강한지** (한 줄)
   - 이 페어의 **약점** (스프레드 공유 취약 / 둘 다 느림 / 스피드 밀림 등, 한 줄)
2. 첫 턴 플랜 — 각 리드의 **기술 + 타깃** 명시. 예: "A 는 Fake Out → 상대 C 막기. B 는 Protect 로 상대 반응 파악." 기술은 해당 포켓몬의 \`moves\` 배열에 있는 것만.
3. 2번째 턴 전개 예상 (상대가 보수적으로 Protect / 공격적으로 스프레드 / 백 교체 3가지 시나리오 각 한 줄).
4. 리드 페어로 **절대 쓰지 말아야 할 2마리 조합** 1개 (공유 약점 · 시너지 전무 등).

파티 인라인 데이터:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      enDouble: `${STRICT_POOL_RULES_EN}

---

Recommend the best **lead pair (2 Pokémon)** for this party in **Doubles (2v2)**.

- Party URL: {{PARTY_URL}}
- Site guide: {{LLMS_TXT_URL}}

Analysis requests:
1. Propose **2 viable lead pairs** from the 6 members. For each pair:
   - \`A (slug) + B (slug)\` as the combo label
   - **Synergy type** — Fake Out tempo · Redirect (Follow Me/Rage Powder) · Weather setter+abuser · Trick Room · Tailwind · Intimidate + physical attacker · other
   - **Who this pair is strong against** (one line)
   - **Weaknesses** of this pair (shared spread weakness / both slow / outsped, etc. — one line)
2. First-turn plan — specify each lead's **move + target**. Example: "A uses Fake Out → opposing C to interrupt. B Protects to read their response." Moves must be in each Pokémon's \`moves\` array.
3. Turn-2 branches (opponent plays conservatively with Protect / aggressively with spread / swaps in backline — one line per scenario).
4. Name **one lead pair that should never be used together** (shared weakness, no synergy, etc.).

Party inline data:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      jaDouble: `${STRICT_POOL_RULES_JA}

---

**ダブルバトル（2対2）**でこのパーティの**リード2匹の組み合わせ**を推薦してください。

- パーティURL：{{PARTY_URL}}
- サイトガイド：{{LLMS_TXT_URL}}

分析リクエスト：
1. 6匹の中から**有力なリードペア2組**を提案。各ペアについて：
   - \`A（slug） + B（slug）\`形式で組み合わせ名
   - **シナジータイプ** — Fake Outテンポ · Redirect（Follow Me/Rage Powder）· 天候セッティング/悪用 · Trick Room · Tailwind · Intimidate + 物理アタッカー · その他
   - このペアが**どんな相手に強いか**（一言）
   - このペアの**弱点**（スプレッド共有弱点 / 両方遅い / 速度不足等 — 一言）
2. 初ターンプラン — 各リードの**技 + ターゲット**を明記。例：「AはFake Out → 相手Cを妨害。BはProtectで相手の反応を様子見。」技は該当ポケモンの\`moves\`配列にあるものに限る。
3. 第2ターン展開の予想（相手が慎重にProtect / 攻撃的にスプレッド / バック交代の3シナリオ各一言）。
4. リードペアとして**絶対に使ってはいけない2匹の組み合わせ**1組（共有弱点・シナジー皆無等）。

パーティインラインデータ：
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      zhDouble: `${STRICT_POOL_RULES_ZH}

---

请为此队伍推荐**双打（2对2）**中最佳的**先发2只宝可梦组合**。

- 队伍URL：{{PARTY_URL}}
- 网站指南：{{LLMS_TXT_URL}}

分析请求：
1. 从6只中提出**2组可行的先发组合**。对每组：
   - 以\`A（slug）+ B（slug）\`形式命名组合
   - **协同类型** — Fake Out节奏 · Redirect（Follow Me/Rage Powder）· 天气setter+abuser · Trick Room · Tailwind · Intimidate+物理攻击手 · 其他
   - 此组合**克制哪类对手**（一句话）
   - 此组合的**弱点**（共享扩散弱点/两只都慢/速度不足等 — 一句话）
2. 第1回合计划 — 指明每只先发的**招式+目标**。例："A用Fake Out→干扰对方C。B用Protect探对方反应。"招式须在各宝可梦\`moves\`数组中。
3. 第2回合走向预测（对方保守用Protect / 激进用扩散 / 换入后排 三种情景各一句）。
4. 指出1组**绝对不应先发的2只组合**（共享弱点·零协同等）。

队伍内联数据：
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
    },
  },

  {
    id: "spread",
    mode: "double",
    titleKey: "prompts.tmpl.spread.title",
    descKey: "prompts.tmpl.spread.desc",
    requiresPokemonPool: false,
    body: {
      koDouble: `${STRICT_POOL_RULES_KO}

---

**더블 배틀(2대2)** 관점에서 이 파티의 **스프레드 공격 효율**을 점검해주세요.

- 파티 URL: {{PARTY_URL}}
- 사이트 가이드: {{LLMS_TXT_URL}}
- 기술 상세: {{MOVES_JSON_URL}}

맥락: 더블에서 스프레드 공격(상대 2마리 동시 타격)은 0.75배 보정되지만, 누적 데미지와 템포 측면에서 핵심. 대신 **아군 피해 위험** 이 있어 파트너 조합을 신중히 골라야 함.

대표 스프레드 기술 (target: all-opponents / all-other-pokemon): Earthquake / Surf / Muddy Water / Heat Wave / Rock Slide / Dazzling Gleam / Hyper Voice / Discharge / Blizzard / Eruption / Water Spout / Icy Wind / Bulldoze / Razor Leaf 등.

분석 요청:
1. 파티원의 **실제 선택된 기술 중 스프레드 기술 목록** (moves.json 기준). 각 기술에 대해:
   - 누구의 기술인지 + \`기술명 (slug, 타입/위력/명중)\`
   - **아군 피해 위험**: 같은 필드에 나올 수 있는 아군이 이 기술에 취약한지 (예: Earthquake + 비행·부유 아군은 안전, 지면 아군은 위험)
   - 이 기술을 **안전하게 쓸 수 있는 파트너 조합** (기존 6마리 중)
2. **스프레드 커버리지 빵꾸** 진단 — 흔히 필요한 스프레드 타입(물/불/땅/바위/얼음/페어리) 중 이 파티에 없는 건 무엇? 기존 learnable 중 채워넣을 수 있는 후보가 있는지 제안 (해당 포켓몬의 \`moves\` 배열에 있을 때만).
3. **리드 페어 + 스프레드 조합 1가지 예시** — "A 리드 + B 리드, A 가 X 스프레드 쓸 때 B 는 Protect 로 회피" 같은 한 턴 콤보.

파티 인라인 데이터:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      enDouble: `${STRICT_POOL_RULES_EN}

---

Evaluate this party's **spread-move efficiency** in **Doubles (2v2)**.

- Party URL: {{PARTY_URL}}
- Site guide: {{LLMS_TXT_URL}}
- Move details: {{MOVES_JSON_URL}}

Context: in doubles, spread moves (hit both opponents) are at 0.75× but their cumulative damage and tempo are central to most strategies. The tradeoff is **ally damage risk** — partner pairings have to be chosen carefully.

Representative spread moves (target: all-opponents / all-other-pokemon): Earthquake / Surf / Muddy Water / Heat Wave / Rock Slide / Dazzling Gleam / Hyper Voice / Discharge / Blizzard / Eruption / Water Spout / Icy Wind / Bulldoze / Razor Leaf, etc.

Analysis requests:
1. **List the spread moves currently selected** across the party (from moves.json). For each:
   - Who owns it + \`Move name (slug, type/power/accuracy)\`
   - **Ally-damage risk**: is any teammate that can share the field with this user vulnerable to it? (e.g. Earthquake is safe with Flying/Levitate allies, lethal with Ground allies)
   - **Which partner pairings make this move safe** (from the existing 6)
2. Diagnose **spread-coverage gaps** — among the commonly needed spread types (Water/Fire/Ground/Rock/Ice/Fairy), which is missing? Suggest slugs the existing roster could add (only if present in that Pokémon's \`moves\` array).
3. Provide **one example lead pair + spread combo** — a single turn like "A leads + B leads; A fires X (spread) while B Protects to dodge its side-splash."

Party inline data:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      jaDouble: `${STRICT_POOL_RULES_JA}

---

**ダブルバトル（2対2）**の観点からこのパーティの**スプレッド技効率**を点検してください。

- パーティURL：{{PARTY_URL}}
- サイトガイド：{{LLMS_TXT_URL}}
- 技詳細：{{MOVES_JSON_URL}}

背景：ダブルではスプレッド技（相手2匹同時ヒット）は0.75倍補正がかかりますが、累積ダメージとテンポの観点で核心です。ただし**味方へのダメージリスク**があるため、パートナーの組み合わせを慎重に選ぶ必要があります。

代表的なスプレッド技（target: all-opponents / all-other-pokemon）：Earthquake / Surf / Muddy Water / Heat Wave / Rock Slide / Dazzling Gleam / Hyper Voice / Discharge / Blizzard / Eruption / Water Spout / Icy Wind / Bulldoze / Razor Leaf等。

分析リクエスト：
1. パーティメンバーの**実際に選択されている技の中のスプレッド技一覧**（moves.json基準）。各技について：
   - 誰の技か + \`技名（slug, タイプ/威力/命中率）\`
   - **味方ダメージリスク**：同じフィールドに出られる味方がこの技に弱いか（例：Earthquake + 飛行・浮遊の味方は安全、地面の味方は危険）
   - この技を**安全に使えるパートナーの組み合わせ**（既存6匹の中から）
2. **スプレッドカバレッジの穴**診断 — よく必要とされるスプレッドタイプ（水/火/地/岩/氷/フェアリー）のうち、このパーティにないものは？既存の習得可能技の中で補えそうな候補があれば提案（該当ポケモンの\`moves\`配列にある場合のみ）。
3. **リードペア + スプレッド組み合わせ例1つ** — 「Aリード + Bリード、AがXスプレッドを使う時BはProtectで回避」のような1ターンコンボ。

パーティインラインデータ：
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      zhDouble: `${STRICT_POOL_RULES_ZH}

---

请从**双打（2对2）**角度评估此队伍的**扩散招式效率**。

- 队伍URL：{{PARTY_URL}}
- 网站指南：{{LLMS_TXT_URL}}
- 招式详情：{{MOVES_JSON_URL}}

背景：双打中，扩散招式（同时命中对方2只）有0.75倍修正，但其累积伤害和节奏掌控是大多数战术的核心。代价是**可能伤及队友** — 必须谨慎选择搭档组合。

代表性扩散招式（target: all-opponents / all-other-pokemon）：Earthquake / Surf / Muddy Water / Heat Wave / Rock Slide / Dazzling Gleam / Hyper Voice / Discharge / Blizzard / Eruption / Water Spout / Icy Wind / Bulldoze / Razor Leaf等。

分析请求：
1. **列出队伍中当前已选的扩散招式**（基于moves.json）。对每个招式：
   - 属于谁 + \`招式名（slug，属性/威力/命中率）\`
   - **队友伤害风险**：可能与该宝可梦同时上场的队友是否对此招式有弱点？（例：Earthquake与飞行/飘浮队友同场安全，与地面队友同场危险）
   - **与哪个搭档组合使用此招式是安全的**（从现有6只中选）
2. 诊断**扩散属性覆盖空缺** — 常见的扩散属性（水/火/地/岩/冰/妖精）中此队伍缺哪些？现有可学招式中是否有可补充的候选（仅限该宝可梦\`moves\`数组中存在时）。
3. 给出**1个先发组合+扩散配合示例** — 如"A先发+B先发，A使用X（扩散）时B用Protect躲避溅射"的一回合组合。

队伍内联数据：
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
    },
  },

  {
    id: "synergy",
    mode: "double",
    titleKey: "prompts.tmpl.synergy.title",
    descKey: "prompts.tmpl.synergy.desc",
    requiresPokemonPool: false,
    body: {
      koDouble: `${STRICT_POOL_RULES_KO}

---

**더블 배틀(2대2)** 관점에서 이 파티의 **시너지·역할 구성** 을 점검해주세요.

- 파티 URL: {{PARTY_URL}}
- 사이트 가이드: {{LLMS_TXT_URL}}

맥락: 더블의 주요 팀 아키타입 — **Fake Out 리드 / Redirect / 날씨 (일·비·모래·눈) / Trick Room / Tailwind / Intimidate + 물공 / Screens / 스탠다드 밸런스**. 좋은 팀은 보통 1~2개 코어 시너지 축이 뚜렷하고, 이를 지원·백업할 역할이 짜여 있음.

분석 요청:
1. 이 파티의 **아키타입 식별** 한 줄 — 가장 유력한 코어는? (예: "Tailwind 공세팟", "Trick Room 저속팟", "스탠다드 밸런스 (뚜렷한 축 없음)", "Intimidate 서포트 + 물리 어태커")
2. 파티에 실제 존재하는 **시너지 페어** 3개 이하로 짚어줘 (능력·특성·기술 기준으로 검증 — abilities.json / moves.json 실존 확인):
   - \`A + B\` — "A 의 XX 특성/기술 이 B 의 YY 를 지원" 한 줄
3. **빠진 더블 핵심 역할** (redirect / 속도 조절 / Fake Out / Protect 미보유 등) 나열.
4. **보완 제안** — 기존 6마리의 **특성·도구·기술만 조정해서** 채울 수 있는 시너지가 있는지 (추가 포켓몬 교체 없이). 예: "현재 A 의 특성을 XX 로 바꾸면 B 와 redirect 시너지 성립" (해당 포켓몬의 \`abilities\` / \`moves\` 에 있을 때만).
5. 교체까지 고려한 **최우선 보강 포인트** 1가지 (AI 의 교체 후보 제안은 이 프롬프트에서 강요하지 않음 — swap 템플릿 몫).

파티 인라인 데이터:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      enDouble: `${STRICT_POOL_RULES_EN}

---

Evaluate this party's **synergy and role composition** in **Doubles (2v2)**.

- Party URL: {{PARTY_URL}}
- Site guide: {{LLMS_TXT_URL}}

Context: common doubles archetypes — **Fake Out leads / Redirect / Weather (sun/rain/sand/snow) / Trick Room / Tailwind / Intimidate + physical / Screens / Standard balance**. Good teams usually have 1–2 clear synergy cores plus backing roles.

Analysis requests:
1. **Archetype call** in one line — what's the most likely core? (e.g. "Tailwind offense", "Trick Room low-speed", "Standard balance (no strong axis)", "Intimidate support + physical attackers")
2. Name up to **3 actual synergy pairs** in this party (verified against abilities.json / moves.json):
   - \`A + B\` — "A's XX ability/move supports B's YY" (one line each)
3. List **missing doubles-core roles** (redirect / speed control / Fake Out / no Protect, etc.).
4. **Adjustment suggestions** — any synergy that can be unlocked by only **changing abilities/items/moves of the existing 6** (no swaps). Example: "If A switches ability to XX, it pairs with B for redirect" (only if that ability/move is actually in A's \`abilities\` / \`moves\`).
5. Name the **single highest-priority reinforcement point** (this template does not require suggesting a swap candidate — that's the swap template's job).

Party inline data:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      jaDouble: `${STRICT_POOL_RULES_JA}

---

**ダブルバトル（2対2）**の観点からこのパーティの**シナジーと役割構成**を点検してください。

- パーティURL：{{PARTY_URL}}
- サイトガイド：{{LLMS_TXT_URL}}

背景：ダブルの主要チームアーキタイプ — **Fake Out リード / Redirect / 天候（晴れ・雨・砂嵐・雪）/ Trick Room / Tailwind / Intimidate + 物理 / Screens / スタンダードバランス**。優れたチームは通常1〜2個の明確なシナジーの軸があり、それをサポート・バックアップする役割が組まれています。

分析リクエスト：
1. このパーティの**アーキタイプ特定**を一言で — 最も有力なコアは？（例：「Tailwind攻めパ」「Trick Room低速パ」「スタンダードバランス（明確な軸なし）」「Intimidateサポート + 物理アタッカー」）
2. パーティに実際に存在する**シナジーペア**を3個以内で挙げてください（abilities.json / moves.jsonで検証済みのもの）：
   - \`A + B\` — 「AのXX特性/技がBのYYをサポート」一言
3. **不足しているダブルの核心役割**（redirect / 速度調整 / Fake Out / Protect未採用等）を列挙。
4. **補完提案** — 既存6匹の**特性・道具・技の調整だけで**解決できるシナジーがあるか（ポケモン交代なし）。例：「現在Aの特性をXXに変えるとBとredirectシナジーが成立」（該当ポケモンの\`abilities\` / \`moves\`にある場合のみ）。
5. 交代まで考慮した場合の**最優先強化ポイント**1つ（このプロンプトではswap候補提案は強制しない — swapテンプレートの役割）。

パーティインラインデータ：
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      zhDouble: `${STRICT_POOL_RULES_ZH}

---

请从**双打（2对2）**角度评估此队伍的**协同与角色构成**。

- 队伍URL：{{PARTY_URL}}
- 网站指南：{{LLMS_TXT_URL}}

背景：常见双打队伍风格 — **Fake Out先发 / Redirect / 天气（晴/雨/沙/雪）/ Trick Room / Tailwind / Intimidate+物理 / Screens / 标准平衡**。优秀的队伍通常有1–2个清晰的核心协同轴，辅以支撑和备份角色。

分析请求：
1. 用一句话**判断此队伍的风格** — 最可能的核心是什么？（例："Tailwind攻势"·"Trick Room低速阵"·"标准平衡（无明显核心）"·"Intimidate辅助+物理攻击手"）
2. 指出队伍中实际存在的**协同配对**，最多3组（须经abilities.json / moves.json验证）：
   - \`A + B\` — "A的XX特性/招式辅助B的YY"（各一句）
3. 列出**缺失的双打核心角色**（redirect / 速度调控 / Fake Out / 无Protect等）。
4. **调整建议** — 仅通过**调整现有6只的特性·道具·招式**（不换队员）能否解锁协同？例："若将A的特性换为XX，则与B形成redirect协同"（仅限该特性/招式在A的\`abilities\`/\`moves\`中时适用）。
5. 若考虑换队员，**最优先的强化点**1个（此模板不要求提出换人候选 — 那是换人模板的职责）。

队伍内联数据：
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
    },
  },
];
