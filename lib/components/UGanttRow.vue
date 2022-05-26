<template>
  <div>
    <div
      v-show="threadId === chartProps.startThreadId || bars.length > 0 || $parent.showHiddenRows === groupThreadId"
      ref="u-gantt-row"
      class="u-gantt-row"
      :style="{ height: `${chartProps.rowHeight}px` }"
      v-on="$listeners"
    >
      <div class="u-gantt-row__label" :style="rowLabelStyle">
        <span :title="label">
          <slot name="label">{{ label }}</slot>
        </span>
      </div>
      <div
        ref="bars-container"
        class="u-gantt-row__bars-container"
        :style="rowStyle"
        @click.self="$emit('click', $event)"
        @dblclick.self="onDoubleClick($event)"
        @mouseover.self="onMouseOver()"
        @mouseleave="onMouseLeave()"
        @mouseout="onMouseOut($event)"
      >
        <u-gantt-bar v-for="(bar, index) in localBars" :key="`bar-${index}`" :all-bars-in-row="localBars" :bar="bar" :bars-container="barsContainer">
          <template #bar-label="{ bar }">
            <slot name="bar-label" :bar="bar" />
          </template>
        </u-gantt-bar>
      </div>
    </div>
  </div>
</template>

<script>
import UGanttBar from './UGanttBar.vue'

export default {
  name: 'UGanttRow',

  components: {
    UGanttBar
  },

  props: {
    bars: { type: Array, default: () => [] },
    highlightOnHover: { type: Boolean },
    label: { type: String, default: 'Row' },
    labelStyle: { type: Object },
    rowStyle: { type: Object },
    groupThreadId: { type: String, default: '0' },
    threadId: { type: String, default: '0' }
  },

  inject: ['getAllUnits', 'getChartProps', 'globToText', 'textToGlob'],

  data() {
    return {
      barsContainer: {},
      localBars: this.bars
    }
  },

  computed: {
    allUnits() {
      return this.getAllUnits()
    },

    chartProps() {
      return this.getChartProps()
    },

    defaultBarLength() {
      return this.chartProps.defaultBarLength
    },

    barConfigKey() {
      return this.chartProps.barConfigKey
    },

    rowLabelStyle() {
      return {
        width: `${this.chartProps.rowLabelWidth}px`,
        ...this.labelStyle
      }
    }
  },

  watch: {
    'chartProps.axis'() {
      this.barsContainer = this.$refs['bars-container'].getBoundingClientRect()
    },

    'chartProps.rowLabelWidth'() {
      this.barsContainer = this.$refs['bars-container'].getBoundingClientRect()
    },

    'chartProps.gridSize'() {
      this.barsContainer = this.$refs['bars-container'].getBoundingClientRect()
    },

    bars(value) {
      this.localBars = value
    }
  },

  mounted() {
    this.barsContainer = this.$refs['bars-container'].getBoundingClientRect()
    window.addEventListener('resize', this.onWindowResize)
    window.addEventListener('scroll', this.onWindowResize)
  },

  destroyed() {
    window.removeEventListener('resize', this.onWindowResize)
    window.removeEventListener('scroll', this.onWindowResize)
  },

  methods: {
    // onDragover(e) {
    //   e.preventDefault()
    //   // enables dropping content on row
    //   if (this.highlightOnHover) {
    //     this.$refs['u-gantt-row'].classList.add('u-gantt-row-highlighted')
    //   }
    // },

    // onDragleave() {
    //   this.$refs['u-gantt-row'].classList.remove('u-gantt-row-highlighted')
    // },

    // onDrop(e) {
    //   const barsContainer = this.$refs['bars-container'].getBoundingClientRect()
    //   const xPos = e.clientX - barsContainer.left
    //   const timeDiffFromStart = (xPos / barsContainer.width) * this.allUnits.length
    //   const time = timeDiffFromStart
    //   const bar = this.localBars.find(
    //     bar =>
    //       time >= this.textToGlob(bar[this.chartProps.barStartKey]) &&
    //       time <= this.textToGlob(bar[this.chartProps.barEndKey])
    //   )
    //   //this.$emit('drop', { event: e, bar, time })
    // },

    onDoubleClick(e) {
      if (this.chartProps.allowAdd) {
        const barsContainer = this.$refs['bars-container'].getBoundingClientRect()
        const xPos = e.clientX - barsContainer.left
        const timeDiffFromStart = Math.floor((xPos / barsContainer.width) * this.allUnits.length)
        const time = timeDiffFromStart
        let bar = {}
        bar[this.chartProps.barStartKey] = this.globToText(time, 'start')
        bar[this.chartProps.barEndKey] = this.globToText(time + this.defaultBarLength, 'end')
        bar[this.barConfigKey] = { handles: true }
        this.localBars.push(bar)
        this.localBars.sort((first, second) => this.textToGlob(first[this.chartProps.barStartKey]) - this.textToGlob(second[this.chartProps.barStartKey]))
      }
      this.$emit('dblclick', e)
    },

    onMouseOver() {
      if (this.highlightOnHover) {
        this.$refs['u-gantt-row'].classList.add('u-gantt-row-highlighted')
      }
    },

    onMouseLeave() {
      this.$refs['u-gantt-row'].classList.remove('u-gantt-row-highlighted')
    },

    onMouseOut(e) {
      if (e.relatedTarget !== null) {
        e.relatedTarget.classList.contains('u-gantt-bar__tooltip') ? this.$refs['u-gantt-row'].classList.remove('u-gantt-row-highlighted') : NaN
      }
    },
    onWindowResize() {
      // re-initialize the barsContainer DOMRect variable, which will trigger re-rendering in the gantt bars
      if (this.$refs['bars-container']) {
        this.barsContainer = this.$refs['bars-container'].getBoundingClientRect()
      }
    }
  }
}
</script>
