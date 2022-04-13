<template>
  <div
    ref="u-gantt-grid"
    class="u-gantt-grid"
    :style="{ left: `${rowLabelWidth}px`, width: `${allUnits.length * gridSize}px` }"
  >
    <div
      v-for="(unit, index) in allUnits"
      :key="index"
      :class="[
        'u-gantt-grid__line',
        { 'u-gantt-grid-line-last': index === allUnits.length - 1 },
        { 'u-gantt-grid-line-highlighted': isHighlighted(unit) }
      ]"
      :style="{ width: `${gridSize}px` }"
    />
  </div>
</template>

<script>
export default {
  name: 'UGanttGrid',

  props: {
    allUnits: { type: Array, default: () => [] },
    axis: { type: Array, default: () => [] },
    gridSize: { type: Number },
    highlighted: { type: Array, default: () => [] },
    rowLabelWidth: { type: Number }
  },

  methods: {
    isHighlighted(unit) {
      return this.highlighted.includes(unit.index)
    }
  }
}
</script>
