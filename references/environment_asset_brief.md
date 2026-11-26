# Eldoria Online — ambiente, montarias, pet e props: brief de produção

Este documento complementa `hero_glb_generation_brief.md` e `visual_replacement_inventory.md`. Os conceitos visuais panorâmicos de mapa estão em `references/concept_map_*.jpg`. São referências 2D para a IA de modelagem, não assets runtime nem substitutos de GLB.

## Convenções dos mapas

O jogo tem 10 `MapId`s e quatro tiles reutilizáveis (`tile_plaza`, `tile_arena`, `tile_grove`, `tile_ruins`). Usar o concept de cada mapa para composição, paleta e landmarks; não copiar a imagem inteira para uma textura. Montar tiles, paredes, árvores, rochas, props e iluminação como módulos 3D separados. Manter área central e caminhos livres para movimento e combate; não deixar VFX ou props sobrepondo os pontos de spawn. As rotas/caminhos devem contrastar com o piso e permanecer legíveis na câmera isométrica.

| MapId | Nome | Referência visual | Kit/landmark prioritário |
|---|---|---|---|
| `vale_eldoria` | Vale de Eldoria | `concept_map_vale_eldoria.jpg` | Praça de pedra e fonte/portal, prado, carvalho/pinheiro, cerca/lanternas |
| `floresta_sombria` | Bosque Crepuscular | `concept_map_floresta_sombria.jpg` | Pinheiros retorcidos, raízes, teias ocasionais, fungos teal, neblina baixa |
| `acampamento_orc` | Terras de Krag | `concept_map_acampamento_orc.jpg` | Cânion ferrugem, paliçada, tendas de couro, plataformas, caixas e fogueira |
| `ruinas_antigas` | Cripta dos Antigos | `concept_map_ruinas_antigas.jpg` | Colunas quebradas, entrada de tumba, sarcófagos, pedra azul-cinza, brasas frias |
| `deserto_escaravelho` | Dunas de Solari | `concept_map_deserto_escaravelho.jpg` | Duna ocre, templo semi-enterrado, marcador de pedra, rocha e oasis distante |
| `santuario_golem` | Santuário Vulcânico | `concept_map_santuario_golem.jpg` | Arena limpa de basalto, canais de lava nas bordas, arcos e dais do boss |
| `pico_gelido` | Pico Glacial | `concept_map_pico_gelido.jpg` | Prateleira de geleira, pinheiro nevado, cristais e cachoeira congelada |
| `abismo_eterno` | Abismo Eterno | `concept_map_abismo_eterno.jpg` | Fortaleza roxo-negra, pontes largas seguras, torres quebradas, void legível |
| `cidadela_celestial` | Cidadela Celestial | `concept_map_cidadela_celestial.jpg` | Mármore claro, arcos partidos, obeliscos de cristal e pontes conectadas |
| `torre_eterna` | Torre da Eternidade | `concept_map_torre_eterna.jpg` | Arena concêntrica azul-noite, costelas verticais, anéis celestes e sigilo imperial |

## Montarias e mascote (6 modelos runtime)

Manter `modelId` e filename; Y up no glTF, origem sob os pés, escala compatível com herói (o carregador normaliza para cerca de 1,95 unidades). Modelos quadrúpedes devem incluir assento/sela e pontos de attachment; rigs com movimento simples `Idle`/`Walk`/`Run` quando cabível.

- **`mount_horse` — Cavalo de Guerra:** cavalo castanho escuro com crina preta, sela de couro marrom, peitoral simples e ferragens bronze; quadrúpede de proporção robusta, sem armadura pesada.
- **`mount_wolf` — Lobo das Sombras:** lobo grande cinza-carvão, olhos azul frio discretos, sela baixa de couro e alforjes pequenos; não confundir com o monstro Lobo Cinzento.
- **`mount_lava` — Corcel Vulcânico:** cavalo negro de basalto/couro escuro, crina e fissuras laranja em baixa emissão, sela de couro queimado e placas de proteção.
- **`mount_griffin` — Grifo Celestial:** corpo de leão dourado-pálido, cabeça/bico e asas de águia, sela real azul/dourada; quatro pernas e duas asas articuladas, silhueta 3D funcional.
- **`mount_dragon` — Dragão do Abismo:** dragão montável de corpo alongado, quatro pernas, asas e cauda articuladas, escamas obsidianas roxo-violeta, sela integrada ao dorso; leitura amigável/transportável, não boss hostil.
- **`pet_fairy` — Fada Auto-Loot:** pequena fada com corpo legível, asas translúcidas em geometria com alpha moderado, paleta verde-dourado, bolsa/lanterna de loot; idle flutuante em loop, evitar partículas dependentes de shader.

## Props, drops e tiles (14 modelos existentes)

- **`pine_tree` / `oak_tree`:** criar variações de escala/rotação sem alterar pivô; copa stylized em camadas; base de tronco centrada; pinheiro identifica biomas frios, carvalho bosques temperados.
- **`brazier` / `campfire`:** braseiro metálico reutilizável e fogueira baixa com pedras/lenha; chama pode ser malha emissiva simples, não depender de simulação.
- **`obelisk`:** marco vertical de rota/portal; faces facetadas e runas sem texto legível; variações de cristal por região.
- **`portal`:** aro vertical com espessura e suporte real, núcleo transparente ou emissivo leve; abertura central vazia para câmera e colisão.
- **`pillar`:** coluna modular neutra, inteira e quebrada; manter base/tampa separados por material quando necessário.
- **`rock_spire`:** grupo de rochas com silhueta escalonada; UV/material rochoso simples, sem pontas invisíveis em hitbox.
- **`chest`:** baú madeira/metal, tampa articulável no pivô traseiro, proporção consistente com drop; sem texto/símbolo de raridade embutido.
- **`coin`:** moeda dourada com espessura e relevo simples; eixo/pivô central para rotação de coleta.
- **`tile_plaza`:** pavimento seguro com borda modular e detalhes de fonte/sigilo fora da faixa transitável.
- **`tile_arena`:** piso amplo com leitura de boss arena, borda bem definida e material contrastante.
- **`tile_grove`:** terreno de bosque com grama, pequenas pedras e raiz decorativa em bordas; manter centro navegável.
- **`tile_ruins`:** lajes de ruína, rachaduras e blocos soltos, sem degraus falsos que pareçam colisão.

## Export e revisão

- Respeitar as regras GLB compartilhadas do brief dos heróis: PBR embutido, malha real, transforms aplicados, frente consistente, sem paths absolutos, animações nomeadas quando presentes.
- Props estáticos não precisam de armature; montarias/pet precisam de rig simples para não deslizarem como mesh rígida.
- Testar montaria/pet sobre o terreno, conferir foot plant aproximado, clipping de sela e escala ao lado de personagem padrão.
- Revisar todos os mapas em 10 mapas reais; evitar duplicar o mesmo conjunto de props em sequência e não encobrir monstros, drops, paths ou target labels.
- Guardar renders e GLBs experimentais fora do runtime até aprovação. Os concepts panorâmicos não substituem tile/kit 3D.

## Estado

- **Conceitos panorâmicos:** 10/10 mapas gerados.
- **GLBs atuais:** já existem e carregam em jogo; revisão/substituição de qualidade ainda pendente.
- **Novas montarias/props:** os briefs estão prontos; não houve exportação nova de GLBs neste ambiente por falta de Blender funcional.
