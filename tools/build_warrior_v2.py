import os
import sys
import bpy

sys.path.insert(0, r"d:\MMORPG\tools")
from blender_sculpt_lib import (
    clear_scene,
    make_pbr_mat,
    make_joint,
    sculpt_cross_section,
    sculpt_shield,
    sculpt_greatsword,
    animate_biped,
    render_studio_preview,
)

OUT_DIR = r"d:\MMORPG\client\public\models"


def build_warrior():
    clear_scene()
    root = make_joint("hero_warrior", (0, 0, 0))
    pelvis = make_joint("Pelvis", (0, 0, 0.78), root)

    m_steel = make_pbr_mat("WarriorSteel", (0.28, 0.34, 0.44), (0.68, 0.74, 0.84), metallic=0.78, roughness=0.32, pattern="plate", seed=11)
    m_dark_iron = make_pbr_mat("WarriorDarkIron", (0.12, 0.14, 0.18), (0.24, 0.28, 0.34), metallic=0.7, roughness=0.42, pattern="plate", seed=16)
    m_gold = make_pbr_mat("WarriorGold", (0.72, 0.50, 0.10), (0.98, 0.82, 0.28), metallic=0.88, roughness=0.25, pattern="plate", seed=12)
    m_cape = make_pbr_mat("WarriorCape", (0.45, 0.04, 0.07), (0.78, 0.10, 0.14), metallic=0.05, roughness=0.82, pattern="fbm", seed=13)
    m_visor = make_pbr_mat("WarriorVisor", (1.0, 0.28, 0.05), (1.0, 0.7, 0.2), emission=(1.0, 0.3, 0.05), emission_strength=4.0, seed=14)
    m_leather = make_pbr_mat("WarriorLeather", (0.16, 0.10, 0.07), (0.28, 0.18, 0.12), metallic=0.08, roughness=0.7, pattern="fbm", seed=15)

    # Hard-surface Beveled Chestplate (sharp heroic V-taper)
    sculpt_cross_section(
        "Chestplate",
        [(0.17, 0.12, 0, 0.0), (0.20, 0.14, 0, 0.16), (0.27, 0.18, -0.02, 0.36), (0.29, 0.19, -0.01, 0.48), (0.15, 0.13, 0, 0.56)],
        segments=10,
        mat=m_steel,
        parent=pelvis,
        subsurf=0,
    )
    sculpt_cross_section(
        "GoldCollar",
        [(0.24, 0.16, -0.01, 0.47), (0.25, 0.17, -0.01, 0.53), (0.15, 0.12, 0, 0.57)],
        segments=10,
        mat=m_gold,
        parent=pelvis,
        subsurf=0,
    )
    sculpt_cross_section(
        "WaistBelt",
        [(0.19, 0.13, 0, -0.03), (0.21, 0.14, 0, 0.06), (0.19, 0.13, 0, 0.10)],
        segments=10,
        mat=m_gold,
        parent=pelvis,
        subsurf=0,
    )

    # Flared Armor Tassets (hip skirts)
    for sx in (-0.18, 0.18):
        sculpt_cross_section(
            f"Tasset_{sx}",
            [(0.11, 0.13, 0, -0.24), (0.09, 0.11, 0, 0.0)],
            segments=6,
            mat=m_dark_iron,
            parent=pelvis,
            loc=(sx, 0.0, 0.02),
            rot=(0.0, -sx * 1.1, 0),
            subsurf=0,
        )

    # Angular Greathelm + Recessed Visor Slit + Outward Flared Horns
    sculpt_cross_section(
        "Greathelm",
        [(0.12, 0.13, 0, 0.58), (0.16, 0.17, 0, 0.68), (0.16, 0.17, 0, 0.86), (0.10, 0.11, 0, 0.95)],
        segments=8,
        mat=m_steel,
        parent=pelvis,
        subsurf=0,
    )
    sculpt_cross_section(
        "BrowGuard",
        [(0.15, 0.06, -0.13, 0.78), (0.16, 0.06, -0.14, 0.84)],
        segments=6,
        mat=m_gold,
        parent=pelvis,
        subsurf=0,
    )
    sculpt_cross_section(
        "VisorGlow",
        [(0.075, 0.02, -0.155, 0.74), (0.08, 0.02, -0.155, 0.77)],
        segments=6,
        mat=m_visor,
        parent=pelvis,
        subsurf=0,
    )
    for sx, rz in [(-0.14, -0.65), (0.14, 0.65)]:
        sculpt_cross_section(
            f"Horn_{sx}",
            [(0.045, 0.045, 0, 0.0), (0.028, 0.028, -0.02, 0.16), (0.008, 0.008, -0.06, 0.30)],
            segments=8,
            mat=m_gold,
            parent=pelvis,
            loc=(sx, 0.0, 0.86),
            rot=(0.15, rz, 0),
            subsurf=1,
        )

    # Layered Angular Pauldrons
    for sx, rz in [(-0.32, 0.32), (0.32, -0.32)]:
        sculpt_cross_section(
            f"Pauldron_{sx}",
            [(0.16, 0.15, 0, 0.0), (0.18, 0.16, 0, 0.07), (0.09, 0.09, 0, 0.15)],
            segments=8,
            mat=m_steel,
            parent=pelvis,
            loc=(sx, 0.0, 0.45),
            rot=(0, rz, 0),
            subsurf=0,
        )
        sculpt_cross_section(
            f"PauldronTrim_{sx}",
            [(0.165, 0.155, 0, 0.0), (0.17, 0.16, 0, 0.025)],
            segments=8,
            mat=m_gold,
            parent=pelvis,
            loc=(sx, 0.0, 0.44),
            rot=(0, rz, 0),
            subsurf=0,
        )

    # Flowing Pleated Crimson Cape
    sculpt_cross_section(
        "CrimsonCape",
        [(0.38, 0.025, 0.0, -0.70), (0.32, 0.025, 0.0, -0.25), (0.25, 0.025, 0.0, 0.18), (0.18, 0.025, 0.0, 0.48)],
        segments=10,
        mat=m_cape,
        parent=pelvis,
        loc=(0, 0.21, 0.0),
        rot=(0.18, 0, 0),
        subsurf=1,
    )

    # Articulated Arms & Gauntlets (angled outward: +Y on Arm.L (-X) flares -Z outward)
    arm_l = make_joint("Arm.L", (-0.32, 0, 0.46), pelvis, (0, 0.24, 0))
    arm_r = make_joint("Arm.R", (0.32, 0, 0.46), pelvis, (0, -0.24, 0))
    for j, n in [(arm_l, "L"), (arm_r, "R")]:
        sculpt_cross_section(
            f"Arm_{n}",
            [(0.07, 0.07, 0, -0.46), (0.088, 0.088, 0, -0.24), (0.078, 0.078, 0, -0.10), (0.088, 0.088, 0, 0.02)],
            segments=8,
            mat=m_dark_iron,
            parent=j,
            subsurf=0,
        )

    # Heroic A-Stance Legs & Greaves
    leg_l = make_joint("Leg.L", (-0.15, 0, -0.02), pelvis)
    leg_r = make_joint("Leg.R", (0.15, 0, -0.02), pelvis)
    for j, n in [(leg_l, "L"), (leg_r, "R")]:
        sculpt_cross_section(
            f"Leg_{n}",
            [(0.095, 0.11, -0.01, -0.60), (0.105, 0.105, 0, -0.32), (0.115, 0.115, 0, -0.04)],
            segments=8,
            mat=m_steel,
            parent=j,
            subsurf=0,
        )
        sculpt_cross_section(
            f"Boot_{n}",
            [(0.10, 0.15, -0.04, -0.76), (0.095, 0.11, -0.01, -0.58)],
            segments=8,
            mat=m_leather,
            parent=j,
            subsurf=0,
        )

    # Heraldic Kite Shield (left) + Runic Greatsword pointing FORWARD (right)
    sculpt_shield("KiteShield", m_steel, m_gold, parent=arm_l, loc=(-0.10, -0.10, -0.30))
    sculpt_greatsword("RunicGreatsword", m_steel, m_gold, parent=arm_r, loc=(0.02, -0.08, -0.40), rot=(1.15, 0, 0))

    animate_biped(pelvis, arm_l, arm_r, leg_l, leg_r)
    render_studio_preview(r"d:\MMORPG\references\preview_warrior.png")
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(OUT_DIR, "warrior.glb"),
        export_format="GLB",
        export_animations=True,
        export_nla_strips=True,
        export_apply=True,
    )
    print("[Blender 5.2 MaxQuality] Exported warrior.glb + preview_warrior.png")


if __name__ == "__main__":
    build_warrior()
