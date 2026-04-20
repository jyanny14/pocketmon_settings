# 번역 검토 필요 항목

이 문서는 **임의로 채우거나 신뢰도가 낮게 번역된 필드**들을 정리한 체크리스트입니다.
실제 게임(한국어판 Scarlet/Violet, Champions) 에서 공식 명칭을 확인한 뒤 해당 `data/manual/*.json`
파일의 값을 갱신하고 `python scripts/build.py && python scripts/build_moves.py && python scripts/build_corpus.py`
를 재실행하세요.

상태 표기:
- 🔴 **비어 있음** — 번역 안 함. 영문 폴백 중.
- 🟡 **추정 번역** — 제가 보편 규칙·장르 관례로 채웠으나 공식 확인 전.
- 🟢 **확신** — 공식 SV/이전 세대에서 명확히 확인된 값 (검토 불필요).

---

## A. 비어 있음 — 공식 한국어명 미확정으로 남겨둠

### T4b · 어빌리티 `nameKo` 14건 🔴 — `data/manual/ability_names_ko.json`

| slug | nameEn | 비고 |
|---|---|---|
| armortail | Armor Tail | Gen 9, SV 공식 한국어명 확인 필요 |
| cudchew | Cud Chew | Gen 9, SV 공식 |
| dragonize | Dragonize | **Champions 신규** — 공식 번역 없을 가능성 |
| eartheater | Earth Eater | Gen 9, SV 공식 |
| electromorphosis | Electromorphosis | Gen 9, SV 공식 |
| megasol | Mega Sol | **Champions 신규** — 공식 번역 없을 가능성 |
| opportunist | Opportunist | Gen 9, SV 공식 |
| piercingdrill | Piercing Drill | **Champions 신규** — 공식 번역 없을 가능성 |
| purifyingsalt | Purifying Salt | Gen 9, SV 공식 |
| sharpness | Sharpness | Gen 9, SV 공식 |
| spicyspray | Spicy Spray | **Champions 신규** — 공식 번역 없을 가능성 |
| supremeoverlord | Supreme Overlord | Gen 9, SV 공식 |
| toxicdebris | Toxic Debris | Gen 9, SV 공식 |
| zerotohero | Zero to Hero | Gen 9, SV 공식 |

### T8b · 도구 `nameKo` 24건 🔴 — `data/manual/item_names_ko.json`

| slug | nameEn | 비고 |
|---|---|---|
| fairy-feather | Fairy Feather | 페어리 강화 도구 |
| chandelurite | Chandelurite | Champions 신규 메가스톤 |
| chesnaughtite | Chesnaughtite | Champions 신규 메가스톤 |
| chimechite | Chimechite | Champions 신규 메가스톤 |
| clefablite | Clefablite | Champions 신규 메가스톤 |
| crabominite | Crabominite | Champions 신규 메가스톤 |
| delphoxite | Delphoxite | Champions 신규 메가스톤 |
| dragoninite | Dragoninite | Champions 신규 메가스톤 |
| drampanite | Drampanite | Champions 신규 메가스톤 |
| emboarite | Emboarite | Champions 신규 메가스톤 |
| excadrite | Excadrite | Champions 신규 메가스톤 |
| feraligite | Feraligite | Champions 신규 메가스톤 |
| floettite | Floettite | Champions 신규 메가스톤 (영원의꽃) |
| froslassite | Froslassite | Champions 신규 메가스톤 |
| glimmoranite | Glimmoranite | Champions 신규 메가스톤 |
| golurkite | Golurkite | Champions 신규 메가스톤 |
| greninjite | Greninjite | Champions 신규 메가스톤 |
| hawluchanite | Hawluchanite | Champions 신규 메가스톤 |
| meganiumite | Meganiumite | Champions 신규 메가스톤 |
| meowsticite | Meowsticite | Champions 신규 메가스톤 |
| scovillainite | Scovillainite | Champions 신규 메가스톤 |
| skarmorite | Skarmorite | Champions 신규 메가스톤 |
| starminite | Starminite | Champions 신규 메가스톤 |
| victreebelite | Victreebelite | Champions 신규 메가스톤 |

---

## B. 추정 번역 — 공식 확인 후 수정 권장

### T18 · 어빌리티 `gameTextKo` (2026-04-20 본인 작문) — `data/manual/ability_descriptions_ko.json`

Gen 9 특성은 SV 공식 텍스트를 **기억·참조**해 작성했으나 문장 구조까지 1:1 일치한다고 보장할 수 없음. Champions 신규 4건은 100% 본인 작문.

| slug | 현재 gameTextKo (축약) | 신뢰도 | 비고 |
|---|---|---|---|
| armortail | 신비한 꼬리가 머리를 덮고 있어 자신과 같은편에 대한 선제공격 기술을 받지 않는다. | 🟡 | SV 공식과 어순 다를 수 있음 |
| cudchew | 나무열매를 먹으면 다음 턴의 마지막에 한 번 더 되새김질해 먹는다. | 🟡 | SV 공식 참조 |
| dragonize | 자신의 노말타입 기술이 드래곤타입이 되고 위력이 20% 올라간다. | 🟡 | **Champions 신규** — 공식 없음, 본인 작문 |
| eartheater | 땅타입 기술을 받으면 대미지를 받지 않고 HP 를 회복한다. | 🟡 | SV 공식 참조 |
| electromorphosis | 대미지를 받으면 차지 상태가 되어 다음에 쓸 전기타입 기술 위력이 올라간다. | 🟡 | SV 공식 참조 |
| hospitality | 등장했을 때 같은편을 대접해서 HP 를 조금 회복한다. | 🟡 | SV DLC 공식 참조 |
| megasol | 햇살이 강해지지 않아도 햇살이 강하다로 간주해 기술을 쓸 수 있다. | 🟡 | **Champions 신규** — 공식 없음, 본인 작문 |
| opportunist | 상대의 능력이 올라가면 자신도 편승해 같은 능력을 올린다. | 🟡 | SV 공식 참조 |
| piercingdrill | 접촉 기술로 공격할 때 방어 중인 상대에게도 닿으며… | 🟡 | **Champions 신규** — 공식 없음, 본인 작문 (긴 문장) |
| purifyingsalt | 깨끗한 소금이 상태 이상으로부터 지켜주며 고스트타입 기술로 받는 대미지가 반감된다. | 🟡 | SV 공식 참조 |
| sharpness | 베는 기술의 위력이 올라간다. | 🟡 | SV 공식 참조 |
| spicyspray | 기술로 대미지를 받으면 상대를 화상 상태로 만든다. | 🟡 | **Champions 신규** — 공식 없음, 본인 작문 |
| supersweetsyrup | 등장했을 때 달콤한 향기가 처음 한 번만 퍼져 나가 상대의 회피율을 낮춘다. | 🟡 | SV DLC 공식 참조 |
| supremeoverlord | 등장했을 때 쓰러진 같은편 포켓몬의 수만큼 자신의 공격과 특수공격이 10% 씩 올라간다. | 🟡 | SV 공식 참조 |
| toxicdebris | 물리 기술로 대미지를 받으면 상대 발밑에 독압정을 뿌린다. | 🟡 | SV 공식 참조 |
| zerotohero | 교대해서 물러나면 영웅의 모습으로 변한다. | 🟡 | SV 공식 참조 |

### T19 · 기술 `nameKo` 35건 — `data/manual/move_names_ko.json`

SV 공식 이름을 기반으로 채웠으나 개인 기억 의존 부분이 있음. Champions 에서 이름이 바뀐 기술이 있다면 이 파일만 수정.

| slug | 현재 nameKo | 신뢰도 | 비고 |
|---|---|---|---|
| aquacutter | 아쿠아커터 | 🟢 | 외래어 가타카나 관례 확실 |
| aquastep | 아쿠아스텝 | 🟢 | 외래어 |
| armorcannon | 아머캐논 | 🟢 | 외래어 |
| axekick | 액스킥 | 🟢 | 외래어 |
| bitterblade | 애절한칼날 | 🟡 | **원작 일본어 くるいぎり 기반 — 공식 한국어명 이중 확인 필요** |
| chillingwater | 찬물 | 🟡 | 공식이 "냉수" 일 가능성도 있음. 확인 필요 |
| chillyreception | 썰렁한말장난 | 🟢 | SV 공식 |
| comeuppance | 앙갚음 | 🟢 | SV 공식 |
| direclaw | 모진손톱 | 🟡 | 공식 맞는지 재확인 |
| flowertrick | 트릭플라워 | 🟢 | SV 공식 |
| gigatonhammer | 대왕해머 | 🟢 | SV 공식 |
| headlongrush | 정면돌파 | 🟢 | SV 공식 |
| icespinner | 아이스스피너 | 🟢 | 외래어 |
| jetpunch | 제트펀치 | 🟢 | 외래어 |
| kowtowcleave | 굽신굽신베기 | 🟡 | **본인 번역 추정** — 공식명 확인 필요 |
| lastrespects | 애도 | 🟡 | 공식명 확인 필요 |
| luminacrash | 루미나충격 | 🟡 | **Champions 신규** — 공식명 미확정 가능성 |
| matchagotcha | 말차샷 | 🟢 | SV DLC 공식 |
| mortalspin | 목숨걸고회전 | 🟡 | 공식명 확인 필요 |
| populationbomb | 대발생 | 🟡 | 공식이 "대량발생" 일 가능성 |
| pounce | 덤벼들기 | 🟡 | 공식 확인 필요 |
| psyshieldbash | 사이코실드배쉬 | 🟡 | 공식 표기(배쉬 vs 배시) 확인 |
| ragingbull | 난폭한황소 | 🟡 | 공식 확인 필요 |
| ragingfury | 광란 | 🟡 | 공식 확인 필요 |
| saltcure | 소금뿌리기 | 🟡 | 공식 확인 필요 |
| shedtail | 꼬리분리 | 🟡 | 공식 확인 필요 |
| snowscape | 눈경치 | 🟡 | 공식 확인 필요 (설경 가능성) |
| spicyextract | 매콤추출물 | 🟡 | 공식 확인 필요 |
| stoneaxe | 바위도끼 | 🟢 | Legends: Arceus 공식 |
| syrupbomb | 시럽폭탄 | 🟡 | 공식 확인 필요 |
| tidyup | 대청소 | 🟢 | SV 공식 |
| torchsong | 횃불노래 | 🟡 | 공식 확인 필요 |
| trailblaze | 수풀가르기 | 🟡 | 공식 확인 필요 |
| twinbeam | 트윈빔 | 🟢 | 외래어 |
| wavecrash | 파도격돌 | 🟡 | 공식 확인 필요 |

### T20 · 기술 `flavorTextKo` 44건 (본인 작문) — `data/manual/move_flavors_ko.json`

**전부 본인 작문**. 영문 flavor 를 한국어 게임 톤(`~한다/~된다`) 으로 옮겼고 공식 SV 한국어 flavor 와 어순·단어 선택이 다를 가능성 매우 큼. 내용상 오류는 없도록 주의했으나 **한 문장 단위로 공식 텍스트와 대조 후 교체 권장**.

대상 44 slug 전체:
`alluringvoice`, `aquacutter`, `aquastep`, `armorcannon`, `axekick`, `bitterblade`, `chillingwater`, `chillyreception`, `comeuppance`, `direclaw`, `dragoncheer`, `electroshot`, `ficklebeam`, `flowertrick`, `gigatonhammer`, `hardpress`, `headlongrush`, `icespinner`, `jetpunch`, `kowtowcleave`, `lastrespects`, `luminacrash`, `matchagotcha`, `mortalspin`, `populationbomb`, `pounce`, `psychicnoise`, `psyshieldbash`, `ragingbull`, `ragingfury`, `saltcure`, `shedtail`, `snowscape`, `spicyextract`, `stoneaxe`, `supercellslam`, `syrupbomb`, `temperflare`, `tidyup`, `torchsong`, `trailblaze`, `twinbeam`, `upperhand`, `wavecrash`.

파일 확인: `data/manual/move_flavors_ko.json` 을 열어 slug 마다 한 줄씩 수정.

### 도구 `effectKo` 117건 (T16) 중 확인 필요 항목

대부분 확립된 Gen 3+ 표현으로 번역했으나 다음 메가스톤은 T8b 와 연동해서 포켓몬 한국어명이 확정되면 **effect 안의 포켓몬 이름도 같이 수정**해야 합니다:

| slug | 현재 effectKo 안 포켓몬명 | 비고 |
|---|---|---|
| chandelurite | 샹델라에게 | 포켓몬명 자체는 본편 기준 확정이지만 메가스톤명(T8b) 이 미확정 |
| crabominite | 모단단게에게 | 본편 확정 |
| feraligite | 장크로다일에게 | 본편 확정 |
| (나머지 24개 메가스톤 전부 동일 패턴) | | effect 는 포켓몬명 기준이라 OK, 스톤명(T8b)만 미확정 |

---

## 수정 후 재빌드 절차

```bash
python scripts/build.py            # pokemon/items/abilities + manifest
python scripts/build_moves.py      # moves
python scripts/build_corpus.py     # corpus 묶음
```

각 manual 파일 편집 후 위 3개를 순서대로 실행하면 `web/data/*.json` 과 `corpus.json` 에 반영됩니다. 개별 manual 파일만 고쳐도 되며 코드 변경은 필요 없음.

---

## 이 문서의 유지·보수

- 번역을 확정해 manual 파일에 반영했다면 **해당 항목을 이 문서에서 제거**하거나 🟢 로 바꾸기.
- 새로 추가된 추정 번역(다른 Tx 에서 생길 경우) 은 본 문서 상단에 추가.
- 색인: `docs/TODO.md` 의 T4b / T8b / T18 / T19 / T20 각 항목에서 이 문서 참조.
