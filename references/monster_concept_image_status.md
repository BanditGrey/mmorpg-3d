# Concepts ilustrados de monstros — completo

Gerados como PNGs individuais (sem grade ou collage), seguindo os briefs de `references/visual_replacement_inventory.md`:

1. Slime Esmeralda — `references/concept_monster_slime.jpg`
2. Lobo Cinzento — `references/concept_monster_wolf.jpg`
3. Aranha Sombria — `references/concept_monster_spider.jpg`
4. Espectro da Névoa — `references/concept_monster_wraith.jpg`
5. Bandido do Vale — `references/concept_monster_bandit.jpg`
6. Ente Corrompido — `references/concept_monster_treant.jpg`
7. Orc Saqueador — `references/concept_monster_orc.jpg`
8. Xamã de Krag — `references/concept_monster_orc_shaman.jpg`
9. Guardião da Cripta — `references/concept_monster_skeleton_knight.jpg`
10. Lich Soberano — `references/concept_monster_ancient_lich.jpg`
11. Elemental de Magma — `references/concept_monster_magma_elem.jpg`
12. Golem Ancestral — `references/concept_monster_boss_golem.jpg`
13. Escaravelho Dourado — `references/concept_monster_scarab.jpg`
14. Colosso de Areia — `references/concept_monster_sand_golem.jpg`
15. Yeti Glacial — `references/concept_monster_frost_yeti.jpg`
16. Drakkar de Gelo — `references/concept_monster_ice_dragon.jpg`
17. Demônio Abissal — `references/concept_monster_abyss_fiend.jpg`
18. Senhor do Abismo — `references/concept_monster_abyss_lord.jpg`
19. Serafim Caído — `references/concept_monster_seraph_fallen.jpg`
20. Guardião Astral — `references/concept_monster_celestial_warden.jpg`
21. Caçador do Vazio — `references/concept_monster_void_stalker.jpg`
22. Imperador Eterno — `references/concept_monster_eternal_emperor.jpg`

**Os 22 concepts estão completos.** Os 84 ícones de item estão em `client/public/icons/items` e integrados no HUD. As imagens são referências 2D, não GLBs; crops dos 22 portraits estão em `client/public/portraits/monsters` e são usados nos quadros de alvo/boss. Os briefs técnicos estão em `references/visual_replacement_inventory.md`; o lote Blender está preparado em `tools/build_monsters_all.py` para saída em staging ignorado pelo Git (`build/monster_glb_staging`), revisar antes de trocar modelos runtime.