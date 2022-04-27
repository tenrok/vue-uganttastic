<template>
  <div ref="u-gantt-timeaxis" class="u-gantt-timeaxis" :style="{ width: `${rowLabelWidth + allUnits.length * gridSize}px` }">
    <div class="u-gantt-timeaxis__empty-space" :style="{ minWidth: `${rowLabelWidth}px` }" />
    <div class="u-gantt-timeaxis__points">
      <div v-for="(point, index) in axisPoints" :key="`point-${index}`" class="u-gantt-timeaxis__point">
        <div :style="{ maxWidth: `${gridSize * point.units.length}px` }">
          <span :title="point.label">{{ point.label }}</span>
        </div>
        <div class="u-gantt-timeaxis__units">
          <div v-for="(unit, index) in point.units" :key="`unit-${index}`" class="u-gantt-timeaxis__unit" :style="{ width: `${gridSize}px` }">
            <span :style="{ fontSize: unitFontSize }">{{ unit.label }}</span>
            <div class="u-gantt-timeaxis__unit-pin" />
          </div>
        </div>
      </div>
    </div>
    <div ref="u-gantt-timeaxis-marker" class="u-gantt-timeaxis__marker" />
  </div>
</template>

<script>
export default {
  name: 'UGanttTimeaxis',

  props: {
    allUnits: { type: Array, default: () => [] },
    axis: { type: Array, default: () => [] },
    gridSize: { type: Number },
    rowLabelWidth: { type: Number },
    timemarkerOffset: { type: Number, default: 0 }
  },

  data: () => ({
    unitFontSize: '11px',
    timemarker: null
  }),

  computed: {
    axisPoints() {
      const res = []
      this.axis.forEach(entry => {
        let point = {
          label: entry.label,
          units: []
        }
        for (let i = 0; i <= entry.units - 1; i++) {
          let unit = {
            label: i
          }
          point.units.push(unit)
        }
        res.push(point)
      })
      return res
    }
  },

  watch: {
    gridSize() {
      this.onWindowResize()
    }
  },

  mounted() {
    this.timemarker = this.$refs['u-gantt-timeaxis-marker']
    this.onWindowResize()
    window.addEventListener('resize', this.onWindowResize)
    window.addEventListener('mousemove', this.moveTimemarker)
    window.addEventListener('dragover', this.moveTimemarker)
  },

  destroyed() {
    window.removeEventListener('resize', this.onWindowResize)
    window.removeEventListener('mousemove', this.moveTimemarker)
    window.removeEventListener('dragover', this.moveTimemarker)
  },

  methods: {
    moveTimemarker(event) {
      const chart = this.timemarker.closest('.u-gantt-chart')
      if (!chart) return
      let pos = chart.scrollLeft + event.clientX - this.timemarkerOffset - this.horizontalAxisContainer.left
      if (pos > this.horizontalAxisContainer.width) pos = this.horizontalAxisContainer.width
      this.timemarker.style.left = `${pos}px`
    },

    onWindowResize() {
      if (!this.$refs['u-gantt-timeaxis']) return
      this.horizontalAxisContainer = this.$refs['u-gantt-timeaxis'].getBoundingClientRect()
      this.unitFontSize = Math.min(9.5, 0.75 * (this.horizontalAxisContainer.width / this.allUnits.length)) + 'px'
    }
  }
}
</script>
