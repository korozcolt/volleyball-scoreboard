<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useMatchScope } from '@/composables/useMatchScope'
import { useBroadcastConfigStore } from '@/stores/broadcastConfig'
import { useMatchStore } from '@/stores/match'
import { useOverlayControlStore } from '@/stores/overlayControl'
import type { MatchTeamPlayer, Team, TeamSide } from '@/types/game.types'

// ─── Design canvas ───────────────────────────────────────────────────────────
const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 1080

// ─── Stores ──────────────────────────────────────────────────────────────────
const match = useMatchStore()
const broadcast = useBroadcastConfigStore()
const overlay = useOverlayControlStore()

useMatchScope()

// ─── Scale ───────────────────────────────────────────────────────────────────
const scale = ref(1)
const updateScale = () => {
  scale.value = Math.min(window.innerWidth / DESIGN_WIDTH, window.innerHeight / DESIGN_HEIGHT)
}
onMounted(() => {
  updateScale()
  window.addEventListener('resize', updateScale)
})
onUnmounted(() => window.removeEventListener('resize', updateScale))

// ─── Visibility / mode (driven by the controller through the overlay store) ──
const isVisible = computed(() => overlay.state.lineupVisible)
const lineupMode = computed(() => overlay.state.lineupMode || 'court')

// ─── Header data ─────────────────────────────────────────────────────────────
const meta = computed(() => match.gameState.metadata)
const leagueLogo = computed(() => match.gameState.leagueLogo || broadcast.config.leagueLogoUrl)
const sponsorLogo = computed(() => broadcast.config.sponsorLogoUrl)
const subtitle = computed(() =>
  [meta.value.phase, meta.value.court, `Set ${match.gameState.currentSet}`].filter(Boolean).join(' · '),
)

const ROLE_LABELS: Record<string, string> = {
  S: 'Armadora', OH: 'Punta', MB: 'Central', OPP: 'Opuesta', L: 'Líbero', DS: 'Defensa',
}
const roleLabel = (role?: string) => (role ? ROLE_LABELS[role] ?? role : '')

// ─── Per-team view model ─────────────────────────────────────────────────────
// Court zones (coach view, net at top): 4 3 2 / 5 6 1 ; rotation[i] = jersey at position i+1.
const ZONES = [
  { zone: 4, idx: 3 }, { zone: 3, idx: 2 }, { zone: 2, idx: 1 },
  { zone: 5, idx: 4 }, { zone: 6, idx: 5 }, { zone: 1, idx: 0 },
] as const

const firstLast = (full: string) => {
  const parts = full.trim().split(/\s+/)
  if (parts.length <= 2) return full
  return `${parts[0]} ${parts[parts.length - 1]}`
}

const buildTeam = (side: TeamSide) => {
  const team: Team = match.gameState[side]
  const roster: MatchTeamPlayer[] = team.roster ?? []
  const byNumber = new Map(roster.map((p) => [String(p.number), p]))
  const onCourtNumbers = team.rotation.map(String)
  const onCourt = new Set(onCourtNumbers)

  const court = ZONES.map(({ zone, idx }) => {
    const number = onCourtNumbers[idx] ?? String(zone)
    const p = byNumber.get(number)
    return {
      zone,
      number,
      name: p ? firstLast(p.name) : '',
      role: roleLabel(p?.role),
      isLibero: !!p?.isLibero,
      isServer: zone === 1 && team.serving,
    }
  })

  const starters = onCourtNumbers
    .map((n) => byNumber.get(n))
    .filter((p): p is MatchTeamPlayer => !!p)
  const rest = roster
    .filter((p) => !onCourt.has(String(p.number)))
    .sort((a, b) => Number(a.number) - Number(b.number))
  const liberos = rest.filter((p) => p.isLibero)
  const bench = rest.filter((p) => !p.isLibero)

  return {
    side,
    name: team.name,
    code: team.shortCode,
    logo: team.logoUrl || team.logo,
    color: team.primaryColor || (side === 'local' ? '#1a8f3c' : '#7bd0ff'),
    serving: team.serving,
    coach: team.headCoach,
    court,
    starters,
    liberos,
    bench,
    count: roster.length,
  }
}

const local = computed(() => buildTeam('local'))
const visitor = computed(() => buildTeam('visitor'))

// List mode: shrink the row height so 12–18 players always fit the canvas.
const rowHeight = (count: number, groups: number) => {
  const available = 700
  return Math.max(38, Math.min(64, Math.floor(available / (count + groups * 0.75))))
}
const rowStyle = (t: ReturnType<typeof buildTeam>) => {
  const groups = 1 + (t.liberos.length ? 1 : 0) + (t.bench.length ? 1 : 0)
  const h = rowHeight(t.count, groups)
  return { '--row-h': `${h}px`, '--row-font': `${Math.round(h * 0.42)}px`, '--row-num': `${Math.round(h * 0.62)}px` }
}
</script>

<template>
  <div class="lu-stage">
    <div class="lu-viewport" :style="{ transform: `translate(-50%, -50%) scale(${scale})` }">
      <transition name="lu-fade">
        <div v-if="isVisible" class="lu-root" :style="{ '--c-local': local.color, '--c-visitor': visitor.color }">
          <div class="lu-glow lu-glow--l" /><div class="lu-glow lu-glow--r" /><div class="lu-hex" />

          <!-- ═════ HEADER ═════ -->
          <header class="lu-header">
            <div class="lu-header__side"><img v-if="leagueLogo" :src="leagueLogo" alt="" /></div>
            <div class="lu-header__center">
              <div class="lu-kicker">Alineación</div>
              <div class="lu-tournament">{{ meta.tournament }}</div>
              <div class="lu-subtitle">{{ subtitle }}</div>
            </div>
            <div class="lu-header__side lu-header__side--r"><img v-if="sponsorLogo" :src="sponsorLogo" alt="" /></div>
          </header>

          <!-- ═════ TEAMS ═════ -->
          <main class="lu-teams">
            <section
              v-for="t in [local, visitor]"
              :key="t.side"
              class="lu-team"
              :class="`lu-team--${t.side}`"
              :style="{ '--tc': t.color, ...rowStyle(t) }"
            >
              <div class="lu-team__head">
                <img v-if="t.logo" :src="t.logo" class="lu-team__logo" alt="" />
                <div v-else class="lu-team__code-badge">{{ t.code }}</div>
                <div class="lu-team__titles">
                  <div class="lu-team__name">{{ t.name }}</div>
                  <div v-if="t.coach" class="lu-team__coach">DT · {{ t.coach }}</div>
                  <div v-else class="lu-team__coach">{{ t.code }}</div>
                </div>
              </div>

              <!-- COURT MODE -->
              <template v-if="lineupMode !== 'list'">
                <div class="lu-court">
                  <div class="lu-court__net" />
                  <div class="lu-court__attack" />
                  <div
                    v-for="c in t.court"
                    :key="c.zone"
                    class="lu-token"
                    :class="[`lu-token--z${c.zone}`, { 'lu-token--libero': c.isLibero }]"
                  >
                    <div class="lu-token__ball">
                      <span>{{ c.number }}</span>
                      <i v-if="c.isServer" class="lu-token__serve" title="Saque" />
                    </div>
                    <div class="lu-token__name">{{ c.name }}</div>
                    <div class="lu-token__role">{{ c.isLibero ? 'Líbero' : c.role }}</div>
                  </div>
                </div>

                <div class="lu-extra">
                  <div v-if="t.liberos.length" class="lu-extra__row">
                    <span class="lu-extra__label lu-extra__label--libero">Líberos</span>
                    <span v-for="p in t.liberos" :key="p.id" class="lu-chip lu-chip--libero"><b>{{ p.number }}</b>{{ firstLast(p.name) }}</span>
                  </div>
                  <div v-if="t.bench.length" class="lu-extra__row">
                    <span class="lu-extra__label">Banca</span>
                    <span v-for="p in t.bench" :key="p.id" class="lu-chip"><b>{{ p.number }}</b>{{ firstLast(p.name) }}</span>
                  </div>
                </div>
              </template>

              <!-- LIST MODE -->
              <template v-else>
                <div class="lu-list">
                  <div class="lu-group">Titulares</div>
                  <div v-for="(p, i) in t.starters" :key="p.id" class="lu-row lu-row--starter">
                    <span class="lu-row__pos">P{{ i + 1 }}</span>
                    <span class="lu-row__num">{{ p.number }}</span>
                    <span class="lu-row__name">{{ p.name }}</span>
                    <span class="lu-row__role">{{ p.isLibero ? 'Líbero' : roleLabel(p.role) }}</span>
                  </div>

                  <template v-if="t.liberos.length">
                    <div class="lu-group lu-group--libero">Líberos</div>
                    <div v-for="p in t.liberos" :key="p.id" class="lu-row lu-row--libero">
                      <span class="lu-row__pos">L</span>
                      <span class="lu-row__num">{{ p.number }}</span>
                      <span class="lu-row__name">{{ p.name }}</span>
                      <span class="lu-row__role">Líbero</span>
                    </div>
                  </template>

                  <template v-if="t.bench.length">
                    <div class="lu-group lu-group--bench">Banca</div>
                    <div v-for="p in t.bench" :key="p.id" class="lu-row">
                      <span class="lu-row__pos" />
                      <span class="lu-row__num">{{ p.number }}</span>
                      <span class="lu-row__name">{{ p.name }}</span>
                      <span class="lu-row__role">{{ roleLabel(p.role) }}</span>
                    </div>
                  </template>
                </div>
              </template>
            </section>
          </main>
        </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
.lu-stage { position: fixed; inset: 0; overflow: hidden; background: transparent; }
.lu-viewport { position: absolute; top: 50%; left: 50%; width: 1920px; height: 1080px; transform-origin: center center; }
.lu-fade-enter-active, .lu-fade-leave-active { transition: opacity .45s ease, transform .45s ease; }
.lu-fade-enter-from, .lu-fade-leave-to { opacity: 0; transform: translateY(18px); }

.lu-root { position: absolute; inset: 0; display: flex; flex-direction: column; overflow: hidden; color: #fff;
  background: linear-gradient(170deg, #04101f 0%, #050b1a 55%, #03070f 100%); font-family: 'Inter', system-ui, sans-serif; }
.lu-glow { position: absolute; width: 1100px; height: 900px; filter: blur(90px); opacity: .32; pointer-events: none; }
.lu-glow--l { left: -260px; top: -120px; background: radial-gradient(closest-side, var(--c-local), transparent); }
.lu-glow--r { right: -260px; top: -120px; background: radial-gradient(closest-side, var(--c-visitor), transparent); }
.lu-hex { position: absolute; inset: 0; opacity: .07; pointer-events: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='56' height='97'><path d='M28 2 54 17v30L28 62 2 47V17z M28 62v33 M2 47 28 62 M54 47 28 62' fill='none' stroke='white' stroke-width='1.2'/></svg>");
  background-size: 56px 97px; }

/* header */
.lu-header { position: relative; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 26px 56px 18px; height: 168px; }
.lu-header__side img { max-height: 92px; max-width: 320px; object-fit: contain; }
.lu-header__side--r { display: flex; justify-content: flex-end; }
.lu-header__center { text-align: center; }
.lu-kicker { font-size: 20px; font-weight: 800; letter-spacing: .6em; color: rgba(255,255,255,.55); text-transform: uppercase; margin-right: -.6em; }
.lu-tournament { font-size: 46px; font-weight: 900; letter-spacing: .02em; text-transform: uppercase; line-height: 1.1; margin-top: 4px; text-shadow: 0 4px 18px rgba(0,0,0,.6); }
.lu-subtitle { font-size: 24px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: rgba(255,255,255,.7); margin-top: 6px; }

/* teams */
.lu-teams { position: relative; flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; padding: 0 56px 40px; min-height: 0; }
.lu-team { position: relative; display: flex; flex-direction: column; min-height: 0; padding: 22px 28px 20px; border-radius: 22px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--tc) 18%, rgba(8,14,30,.92)), rgba(5,9,20,.94));
  border: 1px solid color-mix(in srgb, var(--tc) 55%, transparent);
  box-shadow: 0 0 0 1px rgba(255,255,255,.04) inset, 0 18px 50px rgba(0,0,0,.45); }
.lu-team::before { content: ''; position: absolute; left: 28px; right: 28px; top: 0; height: 4px; border-radius: 0 0 4px 4px; background: var(--tc); box-shadow: 0 0 22px var(--tc); }
.lu-team__head { display: flex; align-items: center; gap: 22px; padding-bottom: 14px; }
.lu-team__logo { width: 96px; height: 64px; object-fit: contain; border-radius: 10px; filter: drop-shadow(0 4px 12px rgba(0,0,0,.5)); }
.lu-team__code-badge { min-width: 96px; height: 64px; display: grid; place-items: center; font-size: 34px; font-weight: 900; border-radius: 12px; background: var(--tc); }
.lu-team__name { font-size: 54px; font-weight: 900; text-transform: uppercase; line-height: 1; letter-spacing: .01em; }
.lu-team__coach { font-size: 20px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: rgba(255,255,255,.6); margin-top: 6px; }

/* court mode */
.lu-court { position: relative; margin: 14px auto 0; width: 800px; height: 500px; border-radius: 10px;
  background:
    repeating-linear-gradient(90deg, rgba(255,255,255,.05) 0 2px, transparent 2px 100px),
    linear-gradient(180deg, color-mix(in srgb, var(--tc) 35%, #0a1a33), color-mix(in srgb, var(--tc) 14%, #07122a));
  border: 4px solid rgba(255,255,255,.85); box-shadow: 0 20px 40px rgba(0,0,0,.55), 0 0 0 6px color-mix(in srgb, var(--tc) 40%, transparent); }
.lu-court__net { position: absolute; left: -22px; right: -22px; top: -20px; height: 14px; border-radius: 7px; background: repeating-linear-gradient(90deg, #fff 0 6px, #cfd8e6 6px 12px); box-shadow: 0 6px 12px rgba(0,0,0,.5); }
.lu-court__attack { position: absolute; left: 0; right: 0; top: 40%; height: 4px; background: rgba(255,255,255,.85); }
.lu-token { position: absolute; transform: translateX(-50%); width: 230px; display: flex; flex-direction: column; align-items: center; text-align: center; }
.lu-token--z4 { left: 18%; top: 3%; } .lu-token--z3 { left: 50%; top: 3%; } .lu-token--z2 { left: 82%; top: 3%; }
.lu-token--z5 { left: 18%; top: 54%; } .lu-token--z6 { left: 50%; top: 54%; } .lu-token--z1 { left: 82%; top: 54%; }
.lu-token__ball { position: relative; width: 84px; height: 84px; border-radius: 50%; display: grid; place-items: center; font-size: 44px; font-weight: 900;
  background: linear-gradient(135deg, color-mix(in srgb, var(--tc) 70%, #fff), var(--tc)); border: 4px solid #fff; box-shadow: 0 8px 18px rgba(0,0,0,.6); }
.lu-token--libero .lu-token__ball { background: linear-gradient(135deg, #fff2cc, #ffcf4a); color: #1a1a1a; border-color: #1a1a1a; }
.lu-token__serve { position: absolute; right: -14px; bottom: -8px; width: 30px; height: 30px; border-radius: 50%; background: #ffd34d; border: 3px solid #fff; box-shadow: 0 0 14px #ffd34d; }
.lu-token__name { margin-top: 10px; font-size: 24px; font-weight: 800; text-transform: uppercase; line-height: 1.05; text-shadow: 0 3px 8px rgba(0,0,0,.8); }
.lu-token__role { margin-top: 3px; font-size: 16px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; color: rgba(255,255,255,.7); }
.lu-extra { margin-top: 22px; display: flex; flex-direction: column; gap: 10px; }
.lu-extra__row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; }
.lu-extra__label { min-width: 92px; font-size: 16px; font-weight: 900; letter-spacing: .2em; text-transform: uppercase; color: rgba(255,255,255,.6); }
.lu-extra__label--libero { color: #ffcf4a; }
.lu-chip { display: inline-flex; align-items: center; gap: 8px; padding: 5px 14px 5px 6px; border-radius: 999px; font-size: 20px; font-weight: 700; text-transform: uppercase;
  background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.14); }
.lu-chip b { display: grid; place-items: center; min-width: 32px; height: 32px; border-radius: 50%; font-size: 18px; background: color-mix(in srgb, var(--tc) 75%, #000); }
.lu-chip--libero { border-color: rgba(255,207,74,.55); background: rgba(255,207,74,.1); }
.lu-chip--libero b { background: #ffcf4a; color: #1a1a1a; }

/* list mode */
.lu-list { display: flex; flex-direction: column; gap: 6px; min-height: 0; }
.lu-group { margin-top: 6px; font-size: 17px; font-weight: 900; letter-spacing: .3em; text-transform: uppercase; color: var(--tc); filter: brightness(1.5); display: flex; align-items: center; gap: 14px; }
.lu-group::after { content: ''; flex: 1; height: 2px; background: linear-gradient(90deg, color-mix(in srgb, var(--tc) 70%, transparent), transparent); }
.lu-group--libero { color: #ffcf4a; filter: none; } .lu-group--libero::after { background: linear-gradient(90deg, rgba(255,207,74,.6), transparent); }
.lu-group--bench { color: rgba(255,255,255,.6); filter: none; } .lu-group--bench::after { background: linear-gradient(90deg, rgba(255,255,255,.25), transparent); }
.lu-row { height: var(--row-h); display: grid; grid-template-columns: 52px calc(var(--row-num) * 1.7) 1fr auto; align-items: center; gap: 12px; padding: 0 20px 0 10px; border-radius: 10px;
  background: rgba(255,255,255,.04); border-left: 5px solid color-mix(in srgb, var(--tc) 35%, transparent); }
.lu-row--starter { background: linear-gradient(90deg, color-mix(in srgb, var(--tc) 30%, rgba(0,0,0,.35)), rgba(0,0,0,.25)); border-left-color: var(--tc); }
.lu-row--libero { border-left-color: #ffcf4a; background: linear-gradient(90deg, rgba(255,207,74,.14), rgba(0,0,0,.25)); }
.lu-row__pos { font-size: calc(var(--row-font) * .75); font-weight: 900; letter-spacing: .08em; color: rgba(255,255,255,.55); text-align: center; }
.lu-row__num { font-size: var(--row-num); font-weight: 900; font-variant-numeric: tabular-nums; text-align: center; color: #fff; text-shadow: 0 2px 8px rgba(0,0,0,.5); }
.lu-row__name { font-size: var(--row-font); font-weight: 800; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lu-row__role { font-size: calc(var(--row-font) * .62); font-weight: 900; letter-spacing: .16em; text-transform: uppercase; color: rgba(255,255,255,.72); padding: 3px 12px; border-radius: 999px; background: rgba(255,255,255,.08); }
.lu-row__role:empty { display: none; }
</style>
