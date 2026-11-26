# Eldoria Online — inventário visual e plano para iniciar a substituição

Auditoria do código e dos assets em `client/public`, `client/src` e `shared/src/gameData.ts`. O projeto já tem boa cobertura de conteúdo: há **47 GLBs (14 MB)** carregados pelo `World3DView`, incluindo todos os 5 heróis e 22 monstros. O que falta não é “colocar os primeiros modelos”: é elevar a qualidade/consistência e substituir os ícones genéricos por uma direção de arte coerente.

## Diagnóstico: o que é visual hoje

| Área | Implementação atual | Trabalho visual recomendado | Prioridade |
|---|---|---|---|
| Personagens | 5 GLBs; concepts de heróis em `references`; preview GLB | Atualizar modelos com brief técnico `hero_glb_generation_brief.md`; validar silhuetas e clips | P1 |
| Monstros | 22 GLBs, já registrados no preload e ligados aos `modelId` | Revisar/substituir os 22 com identidade legível em vista isométrica; começar com 4 protótipos | P0 |
| Itens | 84 templates; antes 14 famílias genéricas de SVG inline | 84 SVGs individuais agora gerados em `client/public/icons/items` e carregados pelo HUD; revisar leitura em 32 px e refinar os itens de destaque | P0 iniciado |
| Montarias/pet | 5 montarias e 1 pet GLB | Afinar silhueta, sela/arreios e leitura em escala pequena; manter 3D real | P2 |
| Mundo/ambiente | 4 tiles GLB, árvores, rochas, obelisco, portal, pilares, braseiro, fogueira e baú | Criar linguagem visual por bioma, kits modulares, variação de props e texturas | P1 |
| HUD/UI | HUD CSS/HTML; skills e símbolos de combate/settings usavam texto/emoji | 30 ícones de skill, 20 glyphs HUD e portraits de monstros integrados em skill bar, navegação, quest, auto, pet, boss, evento e recursos; revisar legibilidade móvel | P1 iniciado |
| VFX | efeitos principalmente criados em código/Three.js | Kit VFX por escola elemental/raridade, com paleta e orçamento de partículas | P2 |
| Portraits | preview GLB de herói; nenhum retrato dedicado para inimigos | 22 crops de concept de monstro integrados aos quadros de alvo e boss; portraits de item/bestiário ainda pendentes | P2 iniciado |
| Branding | `icon.svg`, `concept-bg.jpg`, manifest | Definir marca final, ícone PWA e tela de carregamento depois da paleta final | P3 |

**Observação importante:** o jogo já carrega os GLBs reais — não se deve apagar nem substituir modelos sem passar pelo viewer e pela build. Nomes/caminhos GLB atuais devem permanecer estáveis para que o carregador continue funcionando.

## Catálogo de monstros — especificação artística para IA/Blender

As descrições abaixo definem a silhueta e os materiais que tornam cada criatura distinguível. Todos devem ser malhas tridimensionais completas (frente/lado/costas), não sprites, com rig/animação e escala coerentes com o contrato do documento de heróis: origem nos pés, +Y glTF para cima, frente -Z no Blender, materiais empacotados, clips `Idle`, `Walk`, `Attack`; bosses também `Hit` opcional. Proporção e detalhes adequados para câmera isométrica; usar emissão apenas para focos mágicos. Manter cada `modelId` e filename listado.

### Vale e Floresta — primeiros protótipos sugeridos

1. **`slime` — Slime Esmeralda (Lv.1):** pequeno corpo de gel translúcido verde-esmeralda, base larga e mole, dois olhos escuros grandes, núcleo verde-lima visível dentro do volume. Sem membros ou armadura. Idle pulsa/respira; Walk comprime e salta; Attack faz bote curto.
2. **`wolf` — Lobo Cinzento (Lv.4):** quadrúpede cinza-ardósia, focinho claro, orelhas triangulares, patas fortes, cauda espessa, olhos âmbar. Silhueta de lobo real estilizado, não raposa; sem armadura. Walk em quadrúpede; Attack com bote e mordida.
3. **`bandit` — Bandido do Vale (Lv.5):** humanoide leve, couro gasto marrom/oliva, lenço vinho cobrindo parte inferior do rosto, capuz aberto, cinto de saqueador, adaga curta e escudo de madeira irregular. Não usar caveira; deve contrastar com o Assassin jogador. Rig bípede.
4. **`treant` — Ente Corrompido (Lv.18):** guardião arbóreo grande, tronco em forma de torso, galhos assimétricos como chifres, casca marrom, musgo verde-escuro, olhos âmbar entre raízes. Mãos de galho grossas; evitar parecer árvore decorativa. Attack com pancada de braço/galho.

### Ruínas e criaturas sobrenaturais

5. **`spider` — Aranha Sombria (Lv.9):** aranha roxo-carvão, oito pernas articuladas longas com pontas claras, abdômen violeta com marca em ampulheta lilás, dois olhos luminosos pequenos. Legibilidade das pernas é prioridade; sem humanoide/capa.
6. **`wraith` — Espectro da Névoa (Lv.14):** espírito flutuante azul-petróleo/ciano, torso encapuzado sem pernas (cauda de névoa em malha sólida estilizada), braços longos e mãos com dedos, rosto sem feições com dois olhos frios. Transparência moderada; silhouette não pode sumir contra o mapa.
7. **`skeleton_knight` — Guardião da Cripta (Lv.23):** esqueleto bípede de osso marfim envelhecido, armadura de cripta oxidada, elmo rachado e espada curta enferrujada com escudo de osso/metal. Olhos azul espectral. Leitura de caveira e costelas clara sem gore.
8. **`ancient_lich` — Lich Soberano (boss, Lv.26):** chefe alto e magro, vestes reais de ameixa/preto, coroa óssea dourada, face esquelética, ombreiras cerimoniais, cajado com núcleo roxo. Distinguir do skeleton knight pela escala, coroa, manto e magia; animação flutuante lenta.

### Acampamento Orc e Santuário de Magma

9. **`orc` — Orc Saqueador (Lv.19):** corpo humanoide baixo e muito musculoso, pele oliva, presas inferiores, couro cru e placas de metal, ombreira grande, machado curto. Sem magia nem adornos de xamã.
10. **`orc_shaman` — Xamã de Krag (Lv.22):** orc mais esguio, máscara/ornamento tribal assimétrico, tecido ocre/verde, ossos e talismãs, cajado bifurcado com pedra verde. Diferenciar do orc comum por postura, cajado, máscara e emissivo verde sutil.
11. **`magma_elem` — Elemental de Magma (Lv.31):** criatura elemental compacta feita de rocha vulcânica negra em placas, fendas internas laranja-avermelhadas, cabeça sem rosto com fenda de lava; ombros e braços de basalto com pontas. Não usar corpo humano de armadura.
12. **`boss_golem` — Golem Ancestral (boss, Lv.35):** golem de pedra/metal colossal, silhueta quadrada, placas de templo, runas douradas discretas e núcleo âmbar no peito. Pernas e punhos muito volumosos, cabeça pequena encaixada. Attack com slam legível e antecipação.

### Deserto e Pico Gelado

13. **`scarab` — Escaravelho Dourado (Lv.36):** besouro quadrúpede/inseto baixo, carapaça dourada segmentada, élitros com linhas gravadas, seis pernas curtas, mandíbulas e antenas visíveis. Não parecer moeda ou baú.
14. **`sand_golem` — Colosso de Areia (boss, Lv.39):** gigante de arenito ocre com placas erodidas e areia desprendendo-se como volumes sólidos, ombros largos, braços pesados, runas antigas escuras; núcleo de pedra azul-pálida. Distinguir do golem ancestral com silhueta mais alta e erosão/areia.
15. **`frost_yeti` — Yeti Glacial (Lv.43):** besta bípede robusta coberta de pelo branco-azulado, braços longos, garras cinza, rosto azul e olhos ciano, placas de gelo nos ombros. Sem roupas humanas; walk pesado e ataque de golpe duplo.
16. **`ice_dragon` — Drakkar de Gelo (boss, Lv.46):** dragão quadrúpede de gelo azul-pálido, quatro patas, duas asas membranosas, chifres para trás, cauda longa, cristais no dorso e mandíbula clara. Asa e cauda com rig simples; preservar contorno reconhecível mesmo em miniatura.

### Abismo e planos celestiais

17. **`abyss_fiend` — Demônio Abissal (Lv.52):** demônio médio de pele carvão, chifres curtos recurvados, braços longos, placas ósseas, garras e fissuras púrpura. Sem asas grandes; não competir com boss.
18. **`abyss_lord` — Senhor do Abismo (boss, Lv.55):** entidade alta e aristocrática, armadura obsidiana, chifres longos simétricos, capa em placas, núcleo magenta no peito, arma pesada. Silhueta larga e coroa de chifres — chefe reconhecível como versão superior do fiend.
19. **`seraph_fallen` — Serafim Caído (Lv.58):** humanoide alado de armadura clara manchada/escurecida, halo quebrado atrás da cabeça (geometria presa ao rig), penas cinza e dourado apagado, espada cerimonial. Contraste claro/escuro, não demônio vermelho.
20. **`celestial_warden` — Guardião Astral (boss, Lv.61):** sentinela celestial com armadura branca/prata, grandes ombreiras, duas asas geométricas de penas, halo circular dourado e lança/espada de luz. Forma simétrica, nobre; luz emissiva restrita.
21. **`void_stalker` — Caçador do Vazio (Lv.66):** caçador esguio quase negro com placas segmentadas, capuz/face sem feições, garras longas e linhas ciano-violeta. Silhueta inclinada e furtiva; sem olhos grandes ou armadura luminosa contínua.
22. **`eternal_emperor` — Imperador Eterno (boss, Lv.70):** chefe final de presença régia, armadura negro-azulada com ouro antigo, coroa flutuante? (se usada, presa por osso/objeto animado e não partícula), ombreiras em forma de trono/raios, manto longo dividido, arma monumental. Deve parecer a culminação do catálogo, não um Void Stalker ampliado. Paleta azul-noite/ouro, núcleo branco-azulado.

## Itens e ícones — escopo real

`ITEM_TEMPLATES` contém **84 templates**; `ItemIcons.ts` desenha apenas **14 famílias genéricas** (`sword`, `staff`, `armor`, `helm`, `gloves`, `boots`, `ring`, `cloak`, `amulet`, `mount`, `pot_hp`, `pot_mp`, `mat`, `elixir`). Antes da atualização, vários equipamentos diferentes compartilhavam o mesmo pictograma básico. Agora o gerador cria e o HUD carrega **84 arquivos SVG individuais**, com silhuetas por família e variações determinísticas por item/tier. Eles são a primeira tranche funcional — ainda precisam de revisão artística em tela e podem ser substituídos por pinturas/ícones 3D feitos à mão para os itens de maior destaque.

### IDs dos 84 ícones por categoria

- **Consumíveis (15):** `pot_hp_small`, `pot_hp_med`, `pot_hp_large`, `pot_mp_small`, `pot_mp_med`, `pot_mp_large`, `pot_hp_mythic`, `pot_mp_mythic`, `mat_essence`, `mat_fang`, `mat_core`, `mat_shard`, `elixir_fury`, `elixir_wisdom`, `elixir_crit`.
- **Armas (16):** `sword_iron`, `sword_steel`, `sword_runic`, `sword_crypt`, `sword_volcanic`, `sword_frost`, `sword_abyss`, `sword_celestial`, `sword_eternal`, `staff_oak`, `staff_astral`, `staff_lich`, `staff_frost`, `staff_eternity`, `staff_celestial`, `staff_omni`.
- **Armaduras, elmos, luvas e botas (30):** `armor_leather`, `armor_shadow`, `armor_knight`, `armor_astral`, `armor_crypt`, `armor_dragon`, `armor_frost`, `armor_abyss`, `armor_celestial`, `armor_eternal`; `helm_iron`, `helm_archmage`, `helm_crypt`, `helm_frost`, `helm_immortal`, `helm_celestial`, `helm_eternal`; `gloves_leather`, `gloves_scout`, `gloves_warlord`, `gloves_abyss`, `gloves_celestial`, `gloves_eternal`; `boots_swift`, `boots_titan`, `boots_volcanic`, `boots_frost`, `boots_abyss`, `boots_celestial`, `boots_eternal`.
- **Acessórios e montarias (23):** anéis `ring_dusk`, `ring_ember`, `ring_legend`, `ring_frost`, `ring_abyss`, `ring_celestial`, `ring_eternal`, `ring_jade`, `ring_titan`; capas `cloak_traveler`, `cloak_crimson`, `cloak_seraph`, `cloak_abyss`; amuletos `amulet_jade`, `amulet_templar`, `amulet_magma`, `amulet_astral`, `amulet_infinity`; montarias `mount_horse`, `mount_wolf`, `mount_lava`, `mount_griffin`, `mount_dragon`.

> Soma verificada: 15 + 16 + 30 + 23 = 84 templates. A auditoria encontrou `gloves_warlord` sem `iconKey` (o que fazia o renderizador cair no fallback de espada); já corrigi o template para `iconKey: 'gloves'`. Raridade deve continuar como overlay/borda UI, não deve ser a única diferença entre dois objetos da mesma família.

### Brief para geração de ícones

- Canvas quadrado 128×128 (ou 256×256 para render downsample), fundo totalmente transparente; objeto central com respiro de 8–12%, silhueta legível a 32 px. Uma única peça, sem personagem segurando, sem texto, sem moldura e sem sombra fora do canvas.
- Render ortográfico 3/4 superior, câmera e iluminação idênticas para o conjunto; luz suave superior esquerda, sombra de contato curta; estilo 3D stylized premium, materiais coerentes com os GLBs.
- Exportar PNG/WebP transparentes com nome determinístico `<templateId>.jpg`; gerar atlas de sprites opcional, mas preservar arquivos individuais e mapear `templateId -> URL` em `ItemIcons.ts`. Bordas de raridade/upgrade continuam implementadas pelo HUD.
- Fazer silhuetas distintas por item: acabamento, runa, cristal e material podem mudar por tier, sem depender apenas de cor. Manter contraste alto em fundos escuros e detalhes não inferiores a 2–3 px no tamanho final.
- **Exemplos de direção:** `sword_iron` ferro bruto simples; `sword_runic` aço com ranhuras azuis; `sword_crypt` aço negro com guarda óssea; `sword_frost` lâmina translúcida azul-clara; `sword_abyss` lâmina obsidiana com núcleo magenta; `staff_lich` osso/coroa púrpura; `mat_shard` fragmento irregular violeta; `pot_hp_*` frasco vermelho com forma/selo diferente por tier; `mount_griffin` medalhão/silhueta de grifo, não cabeça genérica de cavalo.

## Outros assets para revisão

### Modelos 3D já existentes (47 arquivos GLB)

**Heróis (5):** `warrior`, `mage`, `archer`, `assassin`, `paladin`.

**Monstros (22):** `slime`, `wolf`, `spider`, `wraith`, `orc`, `orc_shaman`, `skeleton_knight`, `ancient_lich`, `magma_elem`, `boss_golem`, `frost_yeti`, `ice_dragon`, `abyss_fiend`, `abyss_lord`, `bandit`, `treant`, `scarab`, `sand_golem`, `seraph_fallen`, `celestial_warden`, `void_stalker`, `eternal_emperor`.

**Montarias e pet (6):** `mount_horse`, `mount_wolf`, `mount_lava`, `mount_griffin`, `mount_dragon`, `pet_fairy`.

**Ambiente, props e drops (14):** `pine_tree`, `oak_tree`, `brazier`, `campfire`, `obelisk`, `portal`, `pillar`, `rock_spire`, `chest`, `coin`, `tile_plaza`, `tile_arena`, `tile_grove`, `tile_ruins`.

Esses modelos são assets runtime. Há também PNGs `preview_*` e `wire_*` em `references` que são imagens de revisão/renderização, não modelos usados como entidades. Os tiles são apenas quatro temas; verificar se o mundo procedural monta esses tiles corretamente em todos os 10 mapas e se faltam props por bioma.

### HUD, elementos e UI

- Glyphs principais do HUD (CP, economia de bateria, settings, evento, buff, boss e onda) já foram trocados por SVG; busca atual não encontra os emojis que estavam nesses controles. Resta validar em telas móveis e desenhar ícones próprios para estados adicionais.
- 30 ícones SVG de skills por classe foram gerados em `client/public/icons/skills` e integrados na skill bar; galeria em `/skill-icons-preview.html`. 20 glyphs comuns foram feitos em `client/public/icons/ui` e aplicados em navegação, quest, pet, auto, boss, evento, buff, recursos e settings; galeria em `/ui-icons-preview.html`. Próximos: ampliar estados/status e revisar sprites de radar/target/HP.
- Rever sprites de radar/target/HP, indicação de boss e cores de grupo; esses overlays precisam sobreviver em tela móvel. UI já é CSS/HTML, não precisa ser reconstruída como imagem.

## Plano inicial — começar sem quebrar o jogo

1. **Fechar direção de arte:** usar os 5 hero concepts e este catálogo; acordar estilo stylized premium (não fotografia), proporções e paleta por bioma. Não substituir produção antes do aceite do viewer.
2. **Ícones P0 — tranche inicial pronta:** 84 SVGs individuais foram gerados, validados como XML e integrados no HUD; fazer revisão visual em 32 px e iterar nos ícones que não leem bem.
3. **Prova de pipeline (P0):** `tools/build_monsters_all.py` organiza os builders Blender para 22 modelos e envia os resultados para `build/monster_glb_staging` sem sobrescrever produção. Gerar/revisar primeiro `slime`, `wolf`, `bandit`, `treant` com rig e três clips; validar no `viewer.html` e jogo. Confirmar arte/escala/animação pequena, quadrúpede, humanoide e grande.
4. **Lote restante de monstros (P1):** com os quatro protótipos aprovados, gerar os outros 18 GLBs em sublotes por bioma; bosses em escala própria; gerar previews/wireframes.
5. **Ambiente/props (P1):** concepts dos 10 mapas e briefs de props/montarias estão prontos em `environment_asset_brief.md`; falta gerar/revisar modelos Blender, montar kits e validar navegação.
6. **HUD/VFX (P1–P2):** ícones de item/skills/HUD estão integrados; revisar em dispositivo móvel, produzir portraits/status adicionais e padronizar paleta de efeitos.
7. **Integração segura:** manter nomes dos assets, fazer cópia de backup, comparar polycount, checar shaders/animations, rodar `npm run typecheck`, `npm run build` e abrir viewer antes de substituir qualquer GLB em runtime.

## Pronto para iniciar a produção

Briefs de heróis: `references/hero_glb_generation_brief.md`. Concepts ilustrados dos 22 monstros estão listados em `references/monster_concept_image_status.md`; concepts panorâmicos dos 10 mapas estão listados em `references/environment_concept_status.md`, com briefs de props/montarias em `references/environment_asset_brief.md`. Há 84 ícones de item, 30 de skills, 20 glyphs UI, 22 portraits de monstro integrados ao alvo/boss e bestiário, e 10 thumbnails de mapas integradas aos cards de viagem. Os thumbnails podem ser regenerados com `python tools/generate_map_preview_manifest.py`. Pendência de produção: GLBs de revisão/substituição, kit de ambiente, montarias/props, VFX e portraits de itens/bestiário; o pipeline de monstros está preparado, mas não executável neste ambiente sem Blender funcional.