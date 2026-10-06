<script setup lang="ts">
/**
 * Marco del marcador (alas inclinadas, núcleo central, cinta superior y tema Sucre) reutilizado por los
 * demás overlays — historial, estadísticas y líderes — para que se vean como una misma familia.
 * Mismo alto (126px) y ancho máximo (1180px) que el marcador, así el marco no "salta" al cambiar de modo.
 */
withDefaults(
  defineProps<{
    ribbon: string
    localColor: string
    visitorColor: string
    theme?: string
    /** Ancho del núcleo central en px (el marcador usa 330). */
    coreWidth?: number
    compact?: boolean
  }>(),
  { coreWidth: 330 },
)
</script>

<template>
  <div
    class="vnl-scorebug relative mx-auto grid h-[126px] w-full max-w-[1180px] overflow-visible shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
    :class="[compact ? 'scale-[0.88]' : '', theme === 'sucre' ? 'theme-sucre' : '']"
    :style="{ gridTemplateColumns: `minmax(0, 1fr) ${coreWidth}px minmax(0, 1fr)` }"
  >
    <div class="scorebug-rim scorebug-rim-left"></div>
    <div class="scorebug-rim scorebug-rim-right"></div>

    <section
      class="team-wing team-wing-left relative flex min-w-0 items-center gap-4 overflow-hidden pl-8 pr-8"
      :style="{ '--team-color': localColor }"
    >
      <div class="energy-lines energy-lines-left"></div>
      <slot name="left" />
    </section>

    <section class="score-core relative flex items-center justify-center">
      <slot name="center" />
      <div class="status-ribbon">{{ ribbon }}</div>
    </section>

    <section
      class="team-wing team-wing-right relative flex min-w-0 items-center gap-4 overflow-hidden pl-8 pr-8"
      :style="{ '--team-color': visitorColor }"
    >
      <div class="energy-lines energy-lines-right"></div>
      <slot name="right" />
    </section>
  </div>
</template>
