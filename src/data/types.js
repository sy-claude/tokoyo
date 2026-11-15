// 共通の型（正本。docs/09_tech.md 3章・3.1 の写し。RigDef などは 07 6.1 の写し）。
// 型だけのファイル。読む側は /** @import {InputFrame} from '../data/types.js' */ で読み込む。
// ここに無い型名・イベント名を使うときは、先に 09 とこのファイルに足す。
export {};

/** @typedef {[number,number,number]} V3 */
/** @typedef {'wood'|'fire'|'earth'|'metal'|'water'} Elem */
/** @typedef {'strike'|'shot'|'spell'} DmgType  打/射/術 */
/** @typedef {'attack'|'dodge'|'jump'|'ougi'|'kekkai'|'fu'|'focus'} BtnId */
/** @typedef {'ikketsu'|'jou'|'mamori'|'metsu'|'sei'} FuKind  一穴/浄/守/滅/醒 */
/** @typedef {'geki'|'e'|'fuu'} Glyph  撃/穢/封 */
/** @typedef {'shu'|'ki'|'ao'} EsekiColor */

/**
 * ageF：押下の実時刻がこのtickより何tick前か（0〜4。テストとキーボードは0）
 * @typedef {{down:boolean, pressed:boolean, released:boolean, ageF:number}} BtnState
 */

/**
 * 正本はこの定義（01 2.10 は参照のみ）。組み立て規則は 09 5.3
 * @typedef {Object} InputFrame
 * @property {number} tick
 * @property {[number,number]} stick   x=右+、y=前+、長さ≤1（デッドゾーン適用後）
 * @property {[number,number]} camDeg  このtickの回転量 [yaw 右+, pitch 上+]（度）。入力層が指の移動px に
 *           02 の基準感度 `camYawDegPerPx`/`camPitchDegPerPx` × `camSensPct`/100（× 攻撃ドラッグ `attackDragCamMul`）を掛け、反転を適用した後の値
 * @property {boolean} camHeld  カメラ系の指（camera・attackDragCamera）が1本以上触れている（02 の自動回り込み・注視ずらし用）
 * @property {Record<BtnId,BtnState>} btn
 * @property {boolean} ougiOut  奥義の溜めを消費なしで取り消す指示。奥義の指が押下点から `ougiOutPx`(72) 以上の間は真（`ougiBackPx`(56) 以内で偽に戻る）。
 *           さらに、奥義の指が奥義でなくなった tick（回避への滑らせ・静かな解放＝pointercancel/blur/符の構えへの移行/メニュー）は1tickだけ真
 * @property {-1|0|1} flick     注目の標的切替（左/なし/右）
 * @property {[number,number][]} taps  注目用のタップ（条件を満たしたものだけ、CSS px）
 * @property {{touching:boolean, first:Elem|null, edges:[Elem,Elem][], commit:boolean, cancel:boolean}|null} fu
 *           符の構え中のみ非null。first＝始点（一度決まったら構えの終わりまで同じ値）。edges はこのtickに確定した辺（通常0〜1本、簡易モードは一度に n 本）。
 *           commit＝簡易モードの数字タップ・キーボード Enter（即発動）。cancel＝描き始める前のスティック範囲のタップ・キーボード Esc（取消、01 3.5）
 * @property {[number,number]} viewPx  画面の幅・高さ（CSS px）
 */

/** @typedef {{kind:'sphere', c:V3, rM:number}|{kind:'capsule', a:V3, b:V3, rM:number}} HitShape  キャラ原点基準、+Z が前 */
/** @typedef {'none'|'small'|'mid'|'blow'|'launch'|'spike'|'pull'} Rx  反応（なし/小/中/吹/打上/叩落/引寄。03 5.3） */

/**
 * data には rx だけを書き、hMps・vMps・kind は読み込み時に 03 5.3 の表（config/combat.js）から埋める
 * @typedef {{rx:Rx, hMps:number, vMps:number, kind:'flinch'|'launch'|'down'}} Knockback
 */

/**
 * @typedef {Object} MoveDef
 * @property {string} id
 * @property {'ground'|'air'|'airDash'|'dodge'|'ougi'|'enemy'|'boss'} kind
 * @property {number} startupF
 * @property {number} activeF
 * @property {number} recoveryF
 * @property {{into:string[], fromF:number, toF?:number, onHitOnly?:boolean}[]} cancels
 * @property {{fromF:number, toF:number, shape:HitShape, hitGroup?:number,
 *   damage?:number, hitstopF?:number, knockback?:Knockback, breakDmg?:number, rehitF?:number, attackerStops?:boolean}[]} hitboxes
 *   hitGroup 毎に1回命中。damage〜attackerStops は省略時に技の値（attackerStops の既定：strike=true、shot・spell=false。03 2.1・2.6）
 * @property {{fromF:number, toF:number, fwdMps:number, upMps?:number}[]} motion
 * @property {number} damage  基礎値（ヒットストップ式に使う）
 * @property {DmgType} dmgType
 * @property {Elem} [element]  省略時は使用者の属性
 * @property {number} [hitstopF]  省略時は式（00 7.2）
 * @property {Knockback} knockback
 * @property {number} breakDmg
 * @property {[number,number]} [armorF]
 * @property {[number,number]} [invulnF]
 * @property {boolean} [superArmor]
 * @property {boolean} [heavy]  重い一撃。swing・hit の heavy に写す（奥義は常に真）
 * @property {boolean} [ignoreInvuln]  敵の技のみ。無敵を貫き見切り不可（ボスの「封」だけ真。03 2.1・6.1）
 * @property {{defId:string, atF:number, offset:V3, yawDeg?:number}[]} [projectiles]
 * @property {{f:number, joints:Record<string,V3>, ease?:'linear'|'in'|'out'|'inOut'}[]} pose  関節角は度
 * @property {{bone:string, fromF:number, toF:number, widthMul?:number}} [trail]  見た目のみ
 */

/**
 * @typedef {Object} ProjectileDef
 * @property {string} id
 * @property {'player'|'enemy'} side
 * @property {number} rM
 * @property {number} speedMps
 * @property {number} gravityMps2
 * @property {number} lifeS
 * @property {number} damage
 * @property {DmgType} dmgType
 * @property {Elem} [element]
 * @property {boolean} pierce
 * @property {number} [pierceMaxCount]  pierce=true のとき貫く体数（省略＝無制限）
 * @property {number} [homingDegPs]
 * @property {boolean} breaksEseki
 * @property {number} [esekiMul]
 * @property {boolean} blockedByMamori
 * @property {string} vfx
 * @property {{rM:number, hM:number, delayF:number, rehitF:number, hitCount:number, finalDamage?:number, durF?:number}} [area]
 *           場（速度0の弾。03 2.6）。durF がある場は delayF 後の durF f の間、円柱に触れた相手へ各1回だけ当てる（持続する範囲。04 1.1）
 * @property {boolean} [cuttable]  敵の弾のみ。プレイヤーの打の判定が触れたら消える（`projectileEnd{reason:'cut'}`、04 3.2）
 */

/** @typedef {{type:'box'|'cyl'|'cone'|'sphere'|'ico'|'lathe'|'extrude'|'tube'|'torus', p:Record<string,number|number[]>}} GeoDef */
/** @typedef {{geo:GeoDef, color:string, pos:V3, rotDeg:V3, scale?:V3, bone?:string, outline?:boolean}} PartDef  小道具（PropDef）の部品 */

// ---- RigDef（人物・敵・ボスの剛体スキン）。07 6.1 の定義の写し ----
/** @typedef {{name:string, parent:string|null, posM:[number,number,number]}} BoneDef */
/**
 * color は palette のキーまたは16進。dims は lathe が [半径,高さ] の列、extrude が先頭に形名の文字列。
 * 形の原点は骨の関節：cyl・cone・extrude は関節から −Y へ伸ばす。box・sphere・cap は中心が原点。lathe は書いた高さのまま。
 * dims（07 6.1）：lathe＝[[半径,高さ]…]／cyl＝[上半径,下半径,高さ]／cone＝[半径,高さ]／box＝[幅,高さ,奥行]／sphere＝[半径,sx,sy,sz]／
 *   cap＝[半径,開き角(軸からの角度),sx,sy,sz]（+Z 向き。sx〜sz は省略可。M1a の追加）／extrude＝[形名,長さ,先端の細り倍率,幅,反り]（幅・反りは省略可。形は data/rigs/shapes.js）／ico＝[半径,分割,ノイズ振幅]。
 * rotDeg は [x,y,z]（度）で、Z（ひねり）→ X（傾け）→ Y（向き）の順に回す（three の Euler 'YXZ'。M1a で決定）。offsetM はその後に足す。
 *   sphere・cap の sx〜sz は、回した後に骨の座標の軸に沿って掛ける
 * @typedef {{name:string, shape:'lathe'|'cyl'|'cone'|'box'|'sphere'|'cap'|'extrude'|'ico'|'tube',
 *  dims:(number|string|number[])[], bone:string, offsetM:[number,number,number], rotDeg:[number,number,number],
 *  color:string, faceCell?:number}} RigPartDef
 */
/**
 * restDeg（M1a の追加）＝ばねの釣り合いの角度 [x,z]（07 6.5 の式の θ0。省略は 0）
 * @typedef {{bone:string, axes:'xz'|'x', gainMul:number, limitDeg:number, restDeg?:[number,number]}} SpringDef
 */
/**
 * stance（M1a の追加）＝待機の基本姿勢。関節名 → [x,y,z]（度、Euler 'XYZ'、バインド姿勢からの相対。07 6.7 のキーと同じ書き方）
 * @typedef {{scaleMul:number, bones:BoneDef[], parts:RigPartDef[], springs:SpringDef[],
 *  weapon?:{socket:string, parts:RigPartDef[], bones:BoneDef[]}, stance?:Record<string,V3>}} RigDef
 */

/**
 * @typedef {Object} CharacterDef
 * @property {string} id
 * @property {string} name
 * @property {Elem} element
 * @property {number} hpMax
 * @property {number} fuMax
 * @property {number} kekkaiMax
 * @property {{rM:number, hM:number}} capsule
 * @property {{canAirDash:boolean, canFlip:boolean, canKekkai:boolean, canBreakEseki:boolean,
 *   rangedOnly:boolean, moveWhileShooting:boolean}} flags   値は 06 1.2
 * @property {number} softLockRangeM
 * @property {number} kekkaiRangeM
 * @property {number} damageTakenMul
 * @property {{combo:string[], air:string[], airDash:string|null, step:string, flip:string|null, ougi:[string,string,string]}} moveset
 * @property {Record<string,MoveDef>} moves
 * @property {RigDef} rig  武器は `rig.weapon`（07 6.1）
 * @property {{boss:'◎'|'◯'|'△', road:'◎'|'◯'|'△', explore:'◎'|'◯'|'△', line:string}|null} affinity
 *           data には書かない（null）。場面の読込時に 06 2章の `computeAffinity` の結果を入れる
 * @property {string[]} upgrades
 * @property {string} kana
 * @property {boolean} playable  false＝選択画面で「封」
 * @property {string} weaponName
 * @property {string} lackText
 * @property {number} esekiDamageMul  穢石への打・射の倍率（白雪0.5）
 * @property {number[]} armorComboSteps  怯まない連撃段（岩丈[2,3]）
 * @property {number} magatamaStart
 * @property {{'◎':string[], '◯':string[], '△':string[]}} lines  一言（06 3.3）
 */

/**
 * 予兆の地面の印（04 1.1）。描画は `telegraph.moveId` から EnemyAttackDef を引いてこの形を描く（イベントに形は載せない）
 * @typedef {{kind:'none'|'circle'|'fan'|'band'|'pillars', rM?:number, deg?:number, widthM?:number, lenM?:number}} TelegraphMarker
 */

/**
 * @typedef {Object} EnemyAttackDef
 * @property {string} moveId  技ID。敵は `<敵ID>.<名>`（例 inu.bite）、ボスは `boss.<名>`（例 boss.slam）
 * @property {number} telegraphF
 * @property {'normal'|'heavy'|'special'} kind
 * @property {Glyph|null} glyph
 * @property {0|1|2} tokenCost
 * @property {[number,number]} rangeM
 * @property {number} cooldownS
 * @property {number} [weight]  使える技が複数のときの重み（04 2.5。ボスは config/boss.js の bossWeights が正）
 * @property {number} [aimLockBeforeHitF]  判定開始のこのf前に狙いを固定（既定 config `aimLockBeforeHitF`）
 * @property {TelegraphMarker} marker
 * @property {number} [crushBreak]  予兆中に受けた崩しがこれ以上で潰れる（穢を作る技）
 * @property {{rM:number, fwdM:number}} [makesEiki]  完了時に穢域を作る
 * @property {number} [introTelegraphF]  導入の旗が立った個体だけ使う予兆
 */

/**
 * @typedef {Object} EnemyDef
 * @property {string} id
 * @property {string} name
 * @property {Elem|null} element  null は testOnly の木偶のみ（五行×1.0）
 * @property {'small'|'large'} size
 * @property {'inu'|'tomoshi'|'karakasa'|'menoni'|'ishikori'|'dummy'} ai  'dummy'＝試験用の木偶（攻撃なし）
 * @property {boolean} [testOnly]  試験用（木偶）。ステージには置かない。`element` が null でよいのはこれが真のときだけ
 * @property {number} hpMax
 * @property {number} breakMax
 * @property {{rM:number, hM:number}} capsule
 * @property {boolean} flying
 * @property {number} hoverM
 * @property {number} speedMps
 * @property {number} runSpeedMps  追う速さ（speedMps は歩き・周回）
 * @property {number} turnDegPs
 * @property {number} aggroRangeM
 * @property {number} leashM
 * @property {number} gaugeOnKill
 * @property {boolean} sealable  false なら結界の対象外（03 7.1。値は04）
 * @property {{viewDeg:number, viewM:number, hearM:number, heightTolM:number}} perception
 * @property {number} pushWeight  02 2.4・04 2.8 の押し重み
 * @property {[number,number]} circleRM  攻撃権待ちの周回半径の範囲
 * @property {number} breakStunS  崩れの長さ（小型は0）
 * @property {{arcDeg:number, backArcDeg:number, blocks:DmgType[]}|null} guard  面鬼の正面ガード（04 3.5）
 * @property {{magatamaCount:number, fudaCount:number, soulPct:number, soulCount:number}} drops  写し（正本は03・06）
 * @property {EnemyAttackDef[]} attacks
 * @property {Record<string,MoveDef>} moves
 * @property {RigDef} rig
 */

/**
 * phases は段階ごとに使う技IDの列だけを持つ（順・重み・冷却の数値は config/boss.js、04 4.3）。
 * hurtParts はボスの被弾部位（04 4.1。同じ攻撃が複数部位に触れても1回）。kuzushiDyM は崩れ中の上下のずれ
 * @typedef {EnemyDef & {
 *  phases:{untilHpPct:number, order:'fixed'|'weighted', attacks:string[]}[],
 *  kaname:{count:number, hp:number, breakGainMul:number}, breakRecoverS:number, stunS:number,
 *  resealCooldownS:number, arenaRM:number, prefDistM:number,
 *  hurtParts:{id:string, shape:HitShape, kuzushiDyM?:number}[]}} BossDef
 */

/** @typedef {{kind:'cyl', rM:number, hM:number} | {kind:'box', half:V3, yawDeg:number} | {kind:'sphere', rM:number}} ShapeKind */
/** @typedef {ShapeKind & {offset:V3, walkable:boolean, camBlock:boolean, projBlock:boolean}} ShapeDef */

/**
 * @typedef {Object} PropDef
 * @property {string} id
 * @property {PartDef[]} parts
 * @property {ShapeDef[]} colliders
 * @property {'baked'|'toon'} mat
 * @property {'always'|'landmark'|'none'} outline
 * @property {boolean} instanced
 */

/**
 * @typedef {Object} StageDef
 * @property {string} id
 * @property {string} name
 * @property {number} seed
 * @property {[number,number]} sizeM  [x幅, z奥行]。座標は **原点＝地図の北西の角（海面の高さ）、+X＝東、+Z＝南、+Y＝上**（05 1.1）
 * @property {number} cellM  0.5
 * @property {{gen:string, params:Record<string,unknown>}} terrain  gen/terrain.js の関数名と引数（中身は05 1.3〜1.5・8章）
 * @property {{id:string, points:[number,number][], widthM:number, shoulderM:number, hM:[number,number], surface:'sand'|'stone'}[]} paths
 *           hM＝[始点の高さ, 終点の高さ]（弧長で線形）、shoulderM＝路肩のぼかし幅（05 1.3）
 * @property {number} seaLevelM
 * @property {{id:number, name:string, rect:[number,number,number,number], home:V3}[]} zones  rect=[x0,z0,x1,z1]
 * @property {{id:string, prop:string, pos?:V3, yawDeg?:number, scale?:number|V3, zone:number, variant?:number, walkable?:boolean,
 *   rule?:{path:string, s:[number,number][], stepM:number}}[]} props
 *           scale は数1つなら [s,s,s]。pos.y 省略は地形の高さ。variant は小道具の型（岩 0〜5）。walkable は PropDef の当たりの上書き。
 *           rule は道に沿った並べ置き（千本鳥居。gen/props.js が展開し、id は `${id}${2桁の通し番号}`。05 2.4）
 * @property {{id:string, enemy:string, pos:V3, yawDeg:number, zone:number, group:string,
 *   wake:'always'|'afterTut'|`tut:${string}`,
 *   intro?:{passive?:boolean, minHp1?:boolean, attacks?:string[], dmgMul?:number, noEiki?:boolean}}[]} spawns
 *           group＝気づきを共有する群れ、wake＝起動条件、intro＝導入中だけ有効な旗（05 4章、04 2.2）
 * @property {{id:string, color:EsekiColor, pos:V3, hp:number,
 *   access:{ground:boolean, airDash:boolean, shootFromM:number|null}}[]} eseki  access は06 2.4の相性計算用（05が記入）
 * @property {{id:string, pos:V3, rM:number, coreHp:number, tutorialCoreLock?:boolean}[]} eiki  tutorialCoreLock＝導入中は穢核が壊れない
 * @property {{id:string, pos:V3, rM:number, element:Elem|'cycle', cycleS:number}[]} ryuketsu
 * @property {string} bossId  BossDef の id（06 2.2 の相性計算・04）
 * @property {{pos:V3, yawDeg:number, gaugeReq:number}} bossGate
 * @property {{center:V3, rM:number}} bossArena
 * @property {{id:string, pos:V3, yawDeg:number}[]} checkpoints
 * @property {{pos:V3, yawDeg:number}} playerStart
 */

/**
 * ref はステージ物の文字列ID（spawn・prop・eiki・eseki の id）。シムが実体へ引く
 * @typedef {{kind:'btn', id:BtnId} | {kind:'stick'} | {kind:'camera'} | {kind:'star', elems:Elem[]}
 *  | {kind:'world', ref:string}} HighlightTarget
 */
/**
 * @typedef {{kind:'tap'|'hold'|'drag'|'flick'|'starPath', at:HighlightTarget,
 *  pathPx?:[number,number][], holdS?:number}} HandHint
 */

/**
 * 導入の台本の1手順（data/tutorial.js。中身は05 7章、表示は01 7章）
 * @typedef {Object} TutorialStep
 * @property {string} id
 * @property {string} text  白雪で変わる文は `textByChar:{shirayuki:string}` で上書き
 * @property {Record<string,string>} [textByChar]
 * @property {BtnId[]} unlock  この手順で解放するボタン（累積）
 * @property {HighlightTarget|null} highlight
 * @property {HandHint|null} hand
 * @property {number} timeMul  世界倍率に掛ける導入の倍率（0〜1、core 4章）。0 の間は符の構えの制限時間を止める（03 9.1）
 * @property {number} [timeMulInFu]  符の構え中だけ timeMul の代わりに使う倍率（05 手順10は0）
 * @property {{afterStep:string|null, delayF?:number, nearRef?:string, nearM?:number}} startWhen
 *           前の手順の完了（null＝ステージ開始）から delayF 実t後、かつ nearRef から nearM 以内に入ったら始める
 * @property {{wake?:string[], minRes?:{kekkai?:number, magatama?:number, fuda?:number},
 *   slowOnTelegraph?:{ref:string, leftF:number, mul:number, untilBtn:BtnId}}} [onStart]
 *           wake＝起動する spawn の id、minRes＝資源を max(現在, 値) にする、slowOnTelegraph＝ref の敵の予兆の残りが leftF になった tick に timeMul=mul、untilBtn を押した次の tick に1へ
 * @property {{kind:'stickHoldS'|'camDragPx'|'btnPress'|'simEvent'|'standOn'|'near', n?:number, id?:BtnId,
 *   event?:{type:string} & Record<string,unknown>, ref?:string, m?:number}[]} waitFor
 *           全て満たしたら完了。simEvent は type と、指定したペイロードの値（ステージ物は文字列ID）の一致。standOn＝ref の小道具の上に接地、near＝ref から m 以内
 */

/**
 * @typedef {Object} SaveDataV1
 * @property {1} v
 * @property {number} updatedAt  保存時刻（platform 側で付与）
 * @property {number} tamakake
 * @property {Record<string,Record<string,number>>} upgrades  キャラID→強化ID→段
 * @property {string[]} esekiTaken  初回満額を受け取った穢石ID
 * @property {boolean} tutorialDone  最上位に置く（settings の中ではない）
 * @property {Record<string,{count:number, bestTimeS:number, bestPurityPct:number}>} clears  キーは `${stageId}/${charId}`
 * @property {RetryV1|null} retry  記録地点からの再開（06 8章）
 * @property {Record<string,number|boolean|string|object>} settings  キーは config/settings.js の表（01 6.1 が定義）
 * @property {string} [lastCharId]  前回選んだキャラ（無ければ 'fuma'）。v1 のまま任意項目として足す
 */

/**
 * 中身の意味は06 6.1・8章
 * @typedef {{stageId:string, charId:string, kind:'checkpoint'|'bossGate', checkpointId:string,
 *  snap:{gauge:number, gaugeMax:number, magatama:number, timeTicks:number,
 *        killedSpawnIds:string[], brokenEsekiIds:string[], purifiedEikiIds:string[],
 *        runBrokenEsekiIds:string[], runDropRolledSpawnIds:string[],
 *        stats:{kills:number, mikiri:number, maxCombo:number, tamakake:number}}}} RetryV1
 */

/**
 * 配列・オブジェクトの値も持てる（例 `hitstopMultiMul`・`charMove`・設定の `btnLayout`）。品質の3列の表（09 8.9）は `v:{high, mid, low}`
 * @typedef {{v:number|boolean|string|number[]|string[]|Record<string,unknown>, min?:number, max?:number, step?:number, choices?:string[], desc:string}} ConfigEntry
 */
/** @typedef {Record<string,ConfigEntry>} ConfigTable */

// ---- SimEvent（09 3.1 の全一覧）。pos は V3、id は数値のエンティティID（穢石・穢域などステージ物は文字列ID） ----
/**
 * @typedef {Object} SimEventMap
 * @property {{actorId:number, moveId:string, element:Elem, heavy:boolean}} swing  攻撃判定の開始
 * @property {{attackerId:number, targetId:number, attackInstanceId:number, moveId:string, damage:number, dmgType:DmgType,
 *   element:Elem, affinity:'adv'|'dis'|'none', seal:'none'|'sealed'|'fuhou', pos:V3, hitstopF:number, heavy:boolean}} hit
 * @property {{attackerId:number, targetId:number, pos:V3}} guard  面鬼の正面で弾かれた
 * @property {{id:number, enemy:string, pos:V3, byId:number}} kill
 * @property {{id:number, on:boolean}} kuzushi  崩れの開始/回復
 * @property {{targetId:number, attackInstanceId:number}} hitRevoked  見切りの遡り（03 6.2）で命中を取り消した
 * @property {{actorId:number, attackInstanceId:number, moveId:string, glyph:Glyph|null, durF:number, offscreen:boolean, pos:V3}} telegraph
 * @property {{id:number, defId:string, ownerId:number, pos:V3}} projectileSpawn
 * @property {{id:number, reason:'hit'|'terrain'|'shape'|'life'|'mamori'|'cut', pos:V3}} projectileEnd  cut＝プレイヤーの打で斬られた
 * @property {{pos:V3, attackInstanceId:number, fuGain:0|1}} mikiri
 * @property {{kind:'step'|'airDash'|'flip'}} dodge
 * @property {{}} jump
 * @property {{fallM:number}} land
 * @property {{actorId:number, surface:'grass'|'sand'|'stone'|'rock'}} footstep
 * @property {{targetId:number|null, pos:V3, trap:boolean}} kekkaiPlace
 * @property {{targetId:number, pos:V3}} kekkaiTrapTrigger
 * @property {{targetId:number|null, reason:'expire'|'hits'|'fuhou'|'trapTimeout'}} kekkaiBreak
 * @property {{count:number}} kekkaiCharge  1回分回復
 * @property {{reason:'trapLimit'|'cooldown'|'noCharge'|'range'}} kekkaiFail  消費なしの失敗（03 7.1）
 * @property {{targetId:number, pos:V3, big:boolean}} fuhou
 * @property {{stage:0|1|2|3}} ougiCharge  0=溜め開始
 * @property {{reason:'out'|'slide'|'hurt'|'short'|'air'}} ougiCancel  short＝0.6s未満の不発
 * @property {{stage:1|2|3, moveId:string}} ougiRelease
 * @property {{}} fuStart
 * @property {{from:Elem, to:Elem, index:number}} fuStroke
 * @property {{kind:FuKind, element:Elem, strokes:number}} fuCast
 * @property {{reason:'noTouch'|'noStroke'|'hurt'|'button'}} fuCancel
 * @property {{id:string, pos:V3, rM:number, byEnemy:boolean}} eikiSpawn
 * @property {{id:string, pos:V3, byEnemy:boolean}} eikiPurify
 * @property {{eikiId:string, pos:V3}} ekakuBreak
 * @property {{on:boolean}} infect
 * @property {{id:string, color:EsekiColor, pos:V3, hpLeft:number}} esekiHit  壊れない命中（hitGroup ごと）
 * @property {{id:string, color:EsekiColor, pos:V3, first:boolean}} esekiBreak
 * @property {{amount:number, total:number, chain:number}} tamakakePickup
 * @property {{value:number, delta:number, source:'kill'|'eiki'|'eseki'}} gaugeChange
 * @property {{stage:1|2|3|4, value:number}} gaugeStage  25/50/75/100
 * @property {{pos:V3}} bossGateOpen
 * @property {{id:string, relation:'heal'|'curse'|'neutral'}} ryuketsuEnter
 * @property {{id:string}} ryuketsuExit
 * @property {{id:string}} ryuketsuDeplete
 * @property {{kind:'sei'|'ryuketsuCurse'|'mamori', on:boolean}} buff
 * @property {{damage:number, kind:'flinch'|'down', attackerId:number, element:Elem, pos:V3}} playerHurt
 * @property {{on:boolean}} playerSealed  ボスの「封」
 * @property {{}} playerDeath
 * @property {{pos:V3}} seaFall
 * @property {{reason:'sea'|'restart'|'retryCheckpoint'|'retryBoss', pos:V3}} respawn
 * @property {{id:string}} checkpoint
 * @property {{zone:number}} zoneEnter
 * @property {{targetId:number|null}} lockOn  null=解除
 * @property {{}} camReset
 * @property {{on:boolean}} combatMode
 * @property {{}} bossIntro
 * @property {{phase:1|2}} bossPhase
 * @property {{id:number, pos:V3}} kanameBreak
 * @property {{pos:V3}} bossDefeat
 * @property {{timeS:number, purityPct:number, tamakake:number}} stageClear
 * @property {{step:string}} tutorialStep  台本の step id（05）。導入の終わりは `step:'done'`
 */
/** @typedef {{[K in keyof SimEventMap]: {type:K, tick:number} & SimEventMap[K]}[keyof SimEventMap]} SimEvent */
