# Eldoria Online — briefs técnicos para gerar GLBs dos cinco heróis

Este documento é a fonte de produção para gerar modelos 3D no Blender a partir dos concepts (`concept_*_detailed.jpg`). **São cinco personagens completos, um GLB por classe.** Não converter a ilustração em plano/cartão 2D: construir malha 3D real, com volume, lados e costas, rig e animações.

## Requisitos comuns de exportação (obrigatórios para todos)

- **Arquivos finais:** substituir/exportar `client/public/models/warrior.glb`, `mage.glb`, `archer.glb`, `assassin.glb`, `paladin.glb`. Não alterar os nomes: `World3DView.ts` e `HeroPreview3D.ts` já carregam `/models/<classe>.glb`.
- **Unidades/eixos:** Blender em metros, personagem em pé, eixo Z do Blender para cima antes da exportação; no glTF, +Y para cima. Frente do personagem voltada para -Z local do Blender antes de exportar, consistente em todos os cinco modelos. Origem do objeto raiz no centro entre os pés, chão em Z=0.
- **Enquadramento:** altura de corpo sem arma entre 1,70 e 1,90 m; arma/ornamento pode elevar a altura total até 2,05 m. Largura máxima sem arma 0,85 m; com escudo/arco/arma até 1,25 m. Pose neutra com pés separados ~0,22 m, braços relaxados e afastados do torso (T/A-pose leve), sem peças atravessando a silhueta. Evitar base, pedestal, cenário, partículas soltas e texto.
- **Malha:** personagem fechado e tridimensional, volumes legíveis de frente, lado e costas. Preferir malha quad para superfícies orgânicas e triangulação limpa na exportação; normais consistentes; sem faces internas, z-fighting ou partes flutuantes acidentais. Alvo 12k–25k triângulos por personagem (limite absoluto 35k, contando armas). Aplicar transforms; nomes úteis nos objetos.
- **Detalhe:** silhueta e grandes massas primeiro; costuras, rebites e runas somente onde continuam legíveis à distância de câmera isométrica. Nada de microdetalhe que desapareça no jogo. Materiais PBR distintos para metal, couro, tecido, pele e emissivos; valores Metallic/Roughness plausíveis. Use no máximo 2 materiais 2K ou 4 materiais 1K por personagem; empacotar todas as imagens dentro do GLB. Não depender de fontes, caminhos externos ou addons no cliente.
- **Materiais/paleta:** albedo sem iluminação pintada, sem sombras baked na cor base. Metal: metallic 0,65–0,9, roughness 0,25–0,45; couro/tecido: metallic 0–0,1, roughness 0,55–0,85. Emissivo bem moderado e só em runas, visor/cristal. Preservar aparência fantasy stylized/low-poly premium compatível com os GLBs atuais; não produzir um render fotográfico humano impossível de ler em escala pequena.
- **Rig comum:** armature `Root` > `Pelvis` > `Spine` > `Chest` > `Neck` > `Head`; ossos `Shoulder.L/R`, `UpperArm.L/R`, `Forearm.L/R`, `Hand.L/R`, `Thigh.L/R`, `Shin.L/R`, `Foot.L/R`, `Toe.L/R`. Armas, escudos, aljava, capa e acessórios devem ser presos ao osso adequado ou ao torso; usar pesos suaves e sem deformação visível nas juntas. Mãos livres para armas devem ter grip correto.
- **Clipes GLB:** exportar NLA strips/ações nomeadas exatamente `Idle`, `Walk`, `Attack`. `Idle` ~2 s em loop com respiração discreta; `Walk` ~0,8 s em loop com passada alternada e balanço de braços; `Attack` ~0,5–0,8 s, ação específica da classe, sem deslocar o root. Sem root motion. Incluir ações como animações glTF (NLA strips) e garantir que Idle seja o primeiro fallback.
- **Export Blender:** glTF 2.0, formato GLB, `+Y Up`, transforms aplicados, animações/NLA incluídas, imagens empacotadas. Validar cada arquivo abrindo em cena limpa e no `viewer.html`; confirmar altura, orientação, textura, clip names, sem magenta/rosa e sem dependências externas.
- **Conferência no jogo:** `World3DView.preloadGlb` normaliza o maior eixo para 1,95 unidades. Manter o humano em proporção vertical, não exportar modelo já escalado para tamanho de monstro. Preview em `HeroPreview3D` toca Idle. Os demais sinais de combate continuam no código do cliente.

## Brief 1 — Guerreiro (`warrior.glb`)

**Leitura imediata:** defensor de linha de frente, mais largo e pesado que as outras classes; espada longa e escudo kite. Conceito: `references/concept_warrior_detailed.jpg` e `references/concept_warrior.jpg`.

- Proporção: 7,5 cabeças de altura; ombros 2,4 cabeças de largura; torso largo, pernas robustas, luvas e botas grandes, pescoço curto. Face visível, expressão firme e amigável, cabelo curto escuro; não usar elmo fechado.
- Construção: couraça de aço gunmetal em placas sobre gambeson escuro; duas ombreiras articuladas (direita um pouco maior), braçadeiras, cotoveleiras, cinturão de couro com fivela solar simples, faldão de placas dividido para permitir as pernas, joelheiras e grevas. Manto curto vermelho escuro preso sob as ombreiras, com rasgos discretos na borda.
- Cores: aço frio `#566575`, ferro escuro `#252D38`, couro `#392920`, tecido carmesim `#8F2532`, detalhes latão velho `#B58A3A`. O vermelho não deve cobrir toda a armadura.
- Equipamento: espada de uma mão/longsword, lâmina larga de aço, fuller central, guarda simples e cabo de couro; escudo kite de madeira revestida de aço, borda reforçada, boss central e pequeno emblema solar sem letras. Espada na mão direita, escudo no antebraço esquerdo.
- Costas: manto visível, tiras de suporte do escudo, placas traseiras da couraça; não deixar costas vazias ou arma desconectada.
- Attack: golpe diagonal controlado da direita para a esquerda, com leve rotação do tronco e retorno à pose; escudo estabiliza o corpo.

**Prompt para o gerador 3D (copiar como instrução do personagem):** `Create a complete stylized low-poly premium fantasy MMORPG Warrior character as a real watertight 3D model, not an image or a flat card. Use the supplied Warrior concept as visual guidance. Broad human frontline defender, visible friendly stern face, short dark hair, layered gunmetal plate armor over charcoal gambeson, asymmetrical articulated steel pauldrons, forearm guards, divided plate fauld, knee guards, greaves, worn dark leather belt and a short deep-crimson battle cloak. Antique brass trim only on selected edges. Right hand grips a broad single-handed longsword with steel fuller, clear crossguard and wrapped grip; left forearm carries a real three-dimensional reinforced kite shield with central boss and simple sunburst relief. Model the front, sides and back; credible joints and attachment points; no scenery, no base, no text. Respect the shared Eldoria GLB technical/export contract.`

## Brief 2 — Mago (`mage.glb`)

**Leitura imediata:** conjurador leve, vertical e misterioso, staff cristalino; nada de armadura pesada. Conceito: `references/concept_mage_detailed.jpg` e `references/concept_mage.jpg`.

- Proporção: 7,5 cabeças, ombros estreitos, robe alongado com abertura frontal/traseira para passos; rosto e mãos visíveis. Capuz baixo repousa nos ombros, não cobre a face toda.
- Construção: túnica azul-noite de duas camadas, painéis de robe azul índigo, gola alta macia, manto assimétrico curto, punhos reforçados, costuras e faixas douradas finas. Cinto com dois frascos pequenos de vidro verde-azul e bolsas; botas leves. Bordados rúnicos geométricos em áreas limitadas do peito e bainha.
- Cores: robe `#17264D`, painel `#293B78`, azul profundo `#101A34`, teal arcano `#27B9C8`, ouro velho `#C1A45D`, pele natural. Cristal cyan translúcido com brilho emissivo pequeno.
- Staff na mão direita: haste de madeira de freixo escura com nós esculpidos, pega envolta em couro, encaixe metálico em gaiola aberta e cristal facetado real no topo. Mão esquerda livre com pequena runa/cristal entre os dedos (geometria discreta presa à mão, sem partículas).
- Costas: capuz dobrado, costura central, pequena capa/ombro assimétrico, alças da bolsa; robe com painéis distintos.
- Attack: ergue staff e mão livre, inclina tronco, conjura gesto arcano; cristal tem emissive estático apenas, animação pelo movimento dos braços.

**Prompt 3D:** `Create a complete real 3D stylized fantasy MMORPG Mage, guided by the supplied concept, not a 2D illustration. Slim human caster with readable face, hood resting back on shoulders, layered midnight-blue and indigo cloth robes with a front/back split for leg motion, fitted leather underlayer, restrained antique-gold piping, cyan geometric runes on chest and hem, high soft collar, asymmetric short mantle, leather belt with two tiny potion vials and pouches, light reinforced boots. Right hand holds a full 3D carved dark ashwood staff with wrapped grip, open metal crystal cage and a small faceted cyan crystal. Left hand is open in a spellcasting pose. Build complete back and side surfaces, credible garment thickness and joints; keep glow subtle; no backdrop, base, text or particles. Follow shared Eldoria GLB contract.`

## Brief 3 — Arqueiro (`archer.glb`)

**Leitura imediata:** batedor ágil e prático; curva do arco, aljava e verde musgo precisam ler mesmo em miniatura. Conceito: `references/concept_archer_detailed.jpg` e `references/concept_archer.jpg`.

- Proporção: 7,5 cabeças; corpo atlético estreito, ombros medianos; capuz curto/aberto com face totalmente legível. Sem túnica comprida que esconda as pernas.
- Construção: roupa de viagem verde floresta sobre couro castanho, peitoral leve com painéis sobrepostos, uma ombreira pequena, braçadeira de puxada reforçada, luvas sem dedos, faixa de tecido âmbar, cinto utilitário, três bolsas, joelheiras e botas de caminhada. Folhas são detalhes de bordado/recorte, não folhagem cobrindo a silhueta.
- Paleta: verde musgo `#3B6248`, verde profundo `#233D32`, couro `#69462D`, tecido âmbar `#B07B38`, metal bronze `#8F713E`, madeira `#765033`.
- Arco recurvo de madeira de teixo na mão esquerda, com membros curvos modelados (não um torus circular), corda fina, grip de couro e entalhes discretos. Aljava tridimensional na diagonal das costas, aberta no topo com 4–6 flechas visíveis; penas simples, pontas sem emissivo. Mão direita relaxada perto da corda; sem flecha atravessando o corpo.
- Costas: aljava bem presa por tira sobre o ombro, capa curta, costura e painéis de couro; conferir que as flechas não cortem o capuz.
- Attack: puxada da corda em pose lateral breve, cotovelo direito recua, ombro esquerdo aponta; retorno sem disparo/projétil animado.

**Prompt 3D:** `Create a complete real 3D stylized fantasy MMORPG Archer character guided by the supplied concept. Agile athletic human ranger, visible face and short open hood, forest-moss green travel cloth over layered brown leather light armor, restrained amber stitching, small asymmetrical shoulder guard, reinforced drawing bracer, fingerless gloves, utility belt with exactly three compact pouches, knee guards and practical boots. A real recurved yew bow in the left hand: two curved limbs, grip wrap, thin string; diagonal 3D quiver secured to the back with 4–6 simple feathered arrows visible above it. Maintain a clean compact silhouette and freedom of shoulder/elbow movement. Model front, sides and back; no extra foliage, scenery, base, text or projectile. Follow shared Eldoria GLB contract.`

## Brief 4 — Assassino (`assassin.glb`)

**Leitura imediata:** silhueta estreita e baixa, duas adagas, carvão/plum; não confundir com arqueiro ou mago. Conceito: `references/concept_assassin_detailed.jpg` e `references/concept_assassin.jpg`.

- Proporção: 7,25 cabeças; postura levemente inclinada, ombros estreitos, joelhos flexionáveis; o rig ainda deve suportar pose neutra vertical para Idle/Walk.
- Construção: couro preto-carvão em placas flexíveis, roupa interna ameixa escura, cowl/capuz curto sobre cabelo, lenço roxo profundo cruzando o ombro e caindo apenas até a cintura; placas pequenas assimétricas no ombro e antebraços, braçadeiras, cinto duplo estreito com bainhas, duas bolsas compactas, joelheiras suaves e botas sem salto rígido. Olhos visíveis, sem máscara cobrindo toda a face.
- Paleta: carvão `#272832`, preto-violeta `#211B2D`, ameixa `#493148`, detalhe carmesim `#7C3444`, aço escuro `#515664`, runa violeta `#8C62B8` com emissão baixa.
- Duas adagas curvas diferentes apenas no detalhe, uma em cada mão: lâmina curta de aço escuro com bisel legível, guarda compacta, cabo enrolado, pequena runa violeta no ricasso. Pontas direcionadas para baixo/fora na pose neutral; nunca atravessar coxa ou cowl.
- Costas: lenço, correias cruzadas e bainhas de reserva; modelo deve ser completo em 360°, sem face traseira vazia.
- Attack: combinação curta de dois cortes alternados com torção de tronco e passo no lugar; manter root fixo.

**Prompt 3D:** `Create a complete real 3D stylized fantasy MMORPG Assassin, not a flat image, guided by the supplied concept. Compact agile human with visible eyes and readable lower face, short charcoal cowl, fitted charcoal-black leather armor over deep-plum cloth, a restrained dark-crimson scarf crossing one shoulder and ending at the waist, asymmetric small shoulder and forearm guards, double narrow belt with two visible dagger sheaths, two compact pouches, flexible knee guards and soft boots. Hold one real curved short dagger in each hand, dark steel bevel, compact guard, wrapped grip and tiny low-glow violet rune near the hilt. Keep a slim silhouette, articulation and clear gap between both blades and legs. Fully model front, profile and back. No smoke, particles, scenery, base, text. Follow shared Eldoria GLB contract.`

## Brief 5 — Paladino (`paladin.glb`)

**Leitura imediata:** guardião sagrado; armadura clara, azul real, ouro e martelo/escudo; robusto, mas menos agressivo que o Guerreiro. Conceito: `references/concept_paladin_detailed.jpg` (gerar no mesmo estilo/paleta descrita aqui) e `references/concept_paladin.jpg`.

- Proporção: 7,5 cabeças, ombros largos moderados, postura ereta; armadura encorpada mas menos massiva que o Guerreiro. Rosto visível sob elmo aberto/diadema simples; expressão serena.
- Construção: placas de marfim sobre cota de malha dourada discreta, peitoral com relevo de sol abstrato, ombreiras arredondadas, braceletes, saia curta de tecido azul real com painéis laterais, grevas claras, botas protegidas, capa azul curta presa por dois broches. Evitar grandes asas/halo suspenso: deve ser equipamento vestível, não VFX.
- Paleta: marfim `#D9D2B9`, prata clara `#B8C0C7`, ouro `#B69143`, azul real `#274A83`, couro `#55402B`, emissivo dourado `#E5BB55` limitado ao emblema.
- Mão esquerda com escudo heater de metal claro, contorno dourado e emblema solar em relevo; direita com martelo de guerra funcional, haste revestida, cabeça retangular compacta de duas faces, detalhes dourados sem ponta excessiva. Armas claramente presas às mãos.
- Costas: capa azul com forro claro, placa traseira, tiras de escudo; silhueta continua limpa por trás.
- Attack: martelo sobe e desce num golpe vertical controlado, brilho emissivo não deve aumentar/desvanecer via shader animação.

**Prompt 3D:** `Create a complete real 3D stylized fantasy MMORPG Paladin, guided by the supplied concept. Upright calm human holy guardian with visible serene face beneath an open simple circlet/helm, moderately broad build, layered ivory plate over subtle mail, rounded pauldrons, bracers, short royal-blue split tabard, light greaves, protected boots and a short royal-blue cape with pale lining. Add a small raised abstract sun emblem on the chest and restrained antique-gold edges; no giant wings or floating halo. Left hand grips a three-dimensional heater shield in pale steel with gold rim and embossed sun relief; right hand grips a practical compact two-faced warhammer with wrapped haft. Fully modeled 360 degrees with clear joints, cloth thickness and attached equipment. Subtle gold emissive only in chest emblem. No scenery, base, text, UI or particles. Follow shared Eldoria GLB contract.`

## Entrega ao agente Blender

Gere primeiro cada personagem em cena isolada, em seguida exporte os cinco GLBs com os nomes e caminhos indicados. Não altere os scripts da lógica do jogo nem retire os GLBs existentes até que cada arquivo novo tenha passado no viewer e no preview do jogo. Salve também um render de validação por classe em `references/preview_<classe>.jpg`. Se o gerador não conseguir criar armature/animação, não invente arquivos: entregue o modelo estático e informe explicitamente quais clipes faltaram para que sejam corrigidos antes da integração.