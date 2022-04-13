<template>
  <div class="u-gantt-chart-container" :data-theme="theme" :style="{ width, height }">
    <div class="u-gantt-chart">
      <u-gantt-timeaxis
        v-if="!hideTimeaxis"
        :all-units="allUnits"
        :axis="axis"
        :grid-size="gridSize"
        :row-label-width="rowLabelWidth"
        :timemarker-offset="timemarkerOffset"
      />
      <div class="u-gantt-rows-container" :style="{ width: `${rowLabelWidth + allUnits.length * gridSize}px` }">
        <u-gantt-grid
          v-if="grid"
          :all-units="allUnits"
          :axis="axis"
          :grid-size="gridSize"
          :highlighted="highlighted"
          :row-label-width="rowLabelWidth"
        />
        <slot />
      </div>
    </div>
  </div>
</template>

<script>
import UGanttTimeaxis from './UGanttTimeaxis.vue'
import UGanttGrid from './UGanttGrid.vue'
import UGanttRow from './UGanttRow.vue'
import UGanttBar from './UGanttBar.vue'

export default {
  name: 'UGanttChart',

  components: {
    UGanttTimeaxis,
    UGanttGrid
  },

  props: {
    allowAdd: { type: Boolean, default: true },
    axis: { type: Array, default: () => [] },
    barConfigKey: { type: String, default: 'config' },
    barEndKey: { type: String, default: 'end' }, // property name of the bar objects that represents the end datetime
    barStartKey: { type: String, default: 'start' }, // property name of the bar objects that represents the start datetime
    defaultBarLength: { type: Number, default: 1 },
    grid: { type: Boolean, default: false },
    gridSize: { type: Number, default: 30 },
    height: { type: String, default: '100%' },
    hideTimeaxis: { type: Boolean, default: false },
    highlighted: { type: Array, default: () => [] },
    isMagnetic: { type: Boolean },
    minGapBetweenBars: { type: Number, default: 0 },
    noTooltip: { type: Boolean, default: false },
    pushOnOverlap: { type: Boolean },
    rowHeight: { type: Number, default: 40 },
    rowLabelWidth: { type: Number, default: 200 },
    snapBackOnOverlap: { type: Boolean },
    theme: { type: String, default: 'default' },
    tooltipFormat: { type: String, default: '{start} - {end} duration: {duration}' },
    width: { type: String, default: '100%' } // the total width of the entire ganttastic component in %
  },

  data: () => ({
    movedBarsInDrag: new Set(),
    timemarkerOffset: 0
  }),

  computed: {
    allUnits() {
      const res = []
      this.axis.forEach(entry => {
        for (let i = 0; i <= entry.units - 1; i++) {
          const unit = {
            groupKey: entry.key,
            groupLabel: entry.label,
            index: i
          }
          res.push(unit)
        }
      })
      return res
    }
  },

  methods: {
    getGanttBarChildrenList() {
      let ganttBarChildren = []
      let ganttRowChildrenList = this.$children.filter(childComp => childComp.$options.name === UGanttRow.name)
      ganttRowChildrenList.forEach(row => {
        let ganttBarChildrenOfRow = row.$children.filter(childComp => childComp.$options.name === UGanttBar.name)
        ganttBarChildren.push(...ganttBarChildrenOfRow)
      })
      return ganttBarChildren
    },

    getBarsFromBundle(bundleId) {
      if (bundleId === undefined || bundleId === null) {
        return []
      }
      return this.getGanttBarChildrenList().filter(ganttBarChild => ganttBarChild.barConfig.bundle === bundleId)
    },

    initDragOfBarsFromBundle(gGanttBar, e) {
      gGanttBar.initDrag(e)
      this.movedBarsInDrag.add(gGanttBar.bar)
      if (gGanttBar.barConfig.bundle !== null && gGanttBar.barConfig.bundle !== undefined) {
        this.getGanttBarChildrenList().forEach(ganttBarChild => {
          if (ganttBarChild.barConfig.bundle === gGanttBar.barConfig.bundle && ganttBarChild !== gGanttBar) {
            ganttBarChild.initDrag(e)
            this.movedBarsInDrag.add(ganttBarChild.bar)
          }
        })
      }
    },

    moveBarsFromBundleOfPushedBar(pushedBar, diff, overlapType) {
      this.movedBarsInDrag.add(pushedBar)
      let bundleId = pushedBar[this.barConfigKey] ? pushedBar[this.barConfigKey].bundle : null
      if (bundleId === undefined || bundleId === null) {
        return
      }
      this.getGanttBarChildrenList().forEach(ganttBarChild => {
        if (ganttBarChild.barConfig.bundle === bundleId && ganttBarChild.bar !== pushedBar) {
          ganttBarChild.moveBarByChildPointsAndPush(diff, overlapType)
          this.movedBarsInDrag.add(ganttBarChild.bar)
        }
      })
    },

    shouldSnapBackBar(ganttBar) {
      if (this.snapBackOnOverlap && ganttBar.barConfig.pushOnOverlap !== false) {
        let { overlapBar } = ganttBar.getOverlapBarAndType(ganttBar.bar)
        return !!overlapBar
      }
      return false
    },

    snapBackBundleIfNeeded(ganttBar) {
      let barsFromBundle = this.getBarsFromBundle(ganttBar.barConfig.bundle)
      if (this.shouldSnapBackBar(ganttBar) || barsFromBundle.some(gBar => this.shouldSnapBackBar(gBar))) {
        ganttBar.snapBack()
        barsFromBundle.forEach(gBar => gBar.snapBack())
        return true
      }
      return false
    },

    onBarEvent({ event, type, time }, ganttBar) {
      this.$emit(`${type}-bar`, { event, bar: ganttBar.bar, time })
    },

    onDragendBar(e, ganttBar, action) {
      const didSnapBack = this.snapBackBundleIfNeeded(ganttBar)
      const movedBars = didSnapBack ? new Set() : this.movedBarsInDrag

      // Magnetic suction
      if (movedBars.size && this.isMagnetic) {
        const { left, right } = action
        movedBars.forEach(bar => {
          if (left && bar == ganttBar.bar) {
            if (this.textToGlob(bar[this.barStartKey]) % 1 < 0.5) {
              bar[this.barStartKey] = this.globToText(Math.floor(this.textToGlob(bar[this.barStartKey])), 'start')
            } else {
              bar[this.barStartKey] = this.globToText(Math.round(this.textToGlob(bar[this.barStartKey])), 'start')
            }
          } else if (right && bar == ganttBar.bar) {
            if (this.textToGlob(bar[this.barEndKey]) % 1 < 0.5) {
              bar[this.barEndKey] = this.globToText(Math.floor(this.textToGlob(bar[this.barEndKey])), 'end')
            } else {
              bar[this.barEndKey] = this.globToText(Math.round(this.textToGlob(bar[this.barEndKey])), 'end')
            }
          } else {
            if (this.textToGlob(bar[this.barStartKey]) % 1 < 0.5) {
              bar[this.barStartKey] = this.globToText(Math.floor(this.textToGlob(bar[this.barStartKey])), 'start')
              bar[this.barEndKey] = this.globToText(Math.floor(this.textToGlob(bar[this.barEndKey])), 'end')
            } else {
              bar[this.barStartKey] = this.globToText(Math.round(this.textToGlob(bar[this.barStartKey])), 'start')
              bar[this.barEndKey] = this.globToText(Math.round(this.textToGlob(bar[this.barEndKey])), 'end')
            }
          }
        })
      }

      this.movedBarsInDrag = new Set()
      this.$emit('dragend-bar', { event: e, bar: ganttBar.bar, movedBars })
    },

    /**
     *
     */
    textToGlob(text) {
      let [groupKey, index] = text.split(',')
      const num = parseFloat(index)
      const integ = Math.trunc(num)
      const fract = num % 1
      let idx = this.allUnits.findIndex(unit => unit.groupKey === groupKey && unit.index === integ)
      if (idx === -1)
        if (fract === 0) {
          idx = this.allUnits.findIndex(unit => unit.groupKey === groupKey && unit.index + 1 === integ)
          if (idx !== -1) {
            idx++
          }
        } else {
          idx = this.allUnits.length
        }
      return idx + fract
    },

    /**
     *
     */
    globToText(glob, edge) {
      const integ = Math.trunc(glob)
      const fract = glob % 1
      let unit, index
      if (integ >= this.allUnits.length) {
        unit = this.allUnits[this.allUnits.length - 1]
        index = unit.index + 1
      } else if (integ < 0) {
        unit = this.allUnits[0]
        index = integ
      } else {
        unit = this.allUnits[integ]
        index = unit.index
        if (index === 0 && edge === 'end' && integ > 0 && fract === 0) {
          unit = this.allUnits[integ - 1]
          index = unit.index + 1
        }
      }
      const str = (index + fract).toFixed(fract === 0 ? 0 : 2)
      return `${unit.groupKey}, ${str}`
    },

    // ------------------------------------------------------------------------
    // --------  METHODS FOR SETTING THE DRAG LIMIT OF A BAR   ----------------
    // ------------------------------------------------------------------------

    // how far you can drag a bar depends on the position of the closest immobile bar
    // note that if a bar from the same row belongs to a bundle
    // other rows might need to be taken into consideration, too
    setDragLimitsOfGanttBar(bar) {
      if (!this.pushOnOverlap || bar.barConfig.pushOnOverlap === false) {
        return
      }
      for (let side of ['left', 'right']) {
        let [totalGapDistance, bundleBarsOnPath] = this.countGapDistanceToNextImmobileBar(bar, null, side, false)
        for (let i = 0; i < bundleBarsOnPath.length; i++) {
          let barFromBundle = bundleBarsOnPath[i].bar
          let gapDist = bundleBarsOnPath[i].gapDistance
          let otherBarsFromBundle = this.getBarsFromBundle(barFromBundle.barConfig.bundle).filter(
            otherBar => otherBar !== barFromBundle
          )
          otherBarsFromBundle.forEach(otherBar => {
            let [newGapDistance, newBundleBars] = this.countGapDistanceToNextImmobileBar(otherBar, gapDist, side)
            if (newGapDistance !== null && (newGapDistance < totalGapDistance || !totalGapDistance)) {
              totalGapDistance = newGapDistance
            }
            newBundleBars.forEach(newBundleBar => {
              if (!bundleBarsOnPath.find(barAndGap => barAndGap.bar === newBundleBar.bar)) {
                bundleBarsOnPath.push(newBundleBar)
              }
            })
          })
        }
        if (totalGapDistance != null && side === 'left') {
          bar.dragLimitLeft = bar.$refs['u-gantt-bar'].offsetLeft - totalGapDistance
        } else if (totalGapDistance != null && side === 'right') {
          bar.dragLimitRight =
            bar.$refs['u-gantt-bar'].offsetLeft + bar.$refs['u-gantt-bar'].offsetWidth + totalGapDistance
        }
      }
      // all bars from the bundle of the clicked bar need to have the same drag limit:
      let barsFromBundleOfClickedBar = this.getBarsFromBundle(bar.barConfig.bundle)
      barsFromBundleOfClickedBar.forEach(barFromBundle => {
        barFromBundle.dragLimitLeft = bar.dragLimitLeft
        barFromBundle.dragLimitRight = bar.dragLimitRight
      })
    },

    // returns the gap distance to the next immobile bar
    // in the row where the given bar (parameter) is (added to gapDistanceSoFar)
    // and a list of all bars on that path that belong to a bundle
    countGapDistanceToNextImmobileBar(bar, gapDistanceSoFar, side = 'left', ignoreShadows = true) {
      let bundleBarsAndGapDist = bar.barConfig.bundle ? [{ bar, gapDistance: gapDistanceSoFar }] : []
      let currentBar = bar
      let nextBar = this.getNextGanttBar(currentBar, side)
      // left side:
      if (side === 'left') {
        while (nextBar) {
          let nextBarOffsetRight = nextBar.$refs['u-gantt-bar'].offsetLeft + nextBar.$refs['u-gantt-bar'].offsetWidth
          gapDistanceSoFar += currentBar.$refs['u-gantt-bar'].offsetLeft - nextBarOffsetRight
          if (nextBar.barConfig.immobile || (nextBar.barConfig.isShadow && !ignoreShadows)) {
            return [gapDistanceSoFar, bundleBarsAndGapDist]
          } else if (nextBar.barConfig.bundle) {
            bundleBarsAndGapDist.push({
              bar: nextBar,
              gapDistance: gapDistanceSoFar
            })
          }
          currentBar = nextBar
          nextBar = this.getNextGanttBar(nextBar, 'left')
        }
      }
      if (side === 'right') {
        while (nextBar) {
          let currentBarOffsetRight =
            currentBar.$refs['u-gantt-bar'].offsetLeft + currentBar.$refs['u-gantt-bar'].offsetWidth
          gapDistanceSoFar += nextBar.$refs['u-gantt-bar'].offsetLeft - currentBarOffsetRight
          if (nextBar.barConfig.immobile || (nextBar.barConfig.isShadow && !ignoreShadows)) {
            return [gapDistanceSoFar, bundleBarsAndGapDist]
          } else if (nextBar.barConfig.bundle) {
            bundleBarsAndGapDist.push({
              bar: nextBar,
              gapDistance: gapDistanceSoFar
            })
          }
          currentBar = nextBar
          nextBar = this.getNextGanttBar(nextBar, 'right')
        }
      }
      return [null, bundleBarsAndGapDist]
    },

    getNextGanttBar(bar, side = 'left') {
      let allBarsLeftOrRight = []
      if (side === 'left') {
        allBarsLeftOrRight = bar.$parent.$children.filter(gBar => {
          return (
            gBar.$options.name === UGanttBar.name &&
            gBar.$parent === bar.$parent &&
            gBar.$refs['u-gantt-bar'] &&
            gBar.$refs['u-gantt-bar'].offsetLeft < bar.$refs['u-gantt-bar'].offsetLeft &&
            gBar.barConfig.pushOnOverlap !== false
          )
        })
      } else {
        allBarsLeftOrRight = bar.$parent.$children.filter(gBar => {
          return (
            gBar.$options.name === UGanttBar.name &&
            gBar.$parent === bar.$parent &&
            gBar.$refs['u-gantt-bar'] &&
            gBar.$refs['u-gantt-bar'].offsetLeft > bar.$refs['u-gantt-bar'].offsetLeft &&
            gBar.barConfig.pushOnOverlap !== false
          )
        })
      }
      if (allBarsLeftOrRight.length > 0) {
        return allBarsLeftOrRight.reduce((bar1, bar2) => {
          let bar1Dist = Math.abs(bar1.$refs['u-gantt-bar'].offsetLeft - bar.$refs['u-gantt-bar'].offsetLeft)
          let bar2Dist = Math.abs(bar2.$refs['u-gantt-bar'].offsetLeft - bar.$refs['u-gantt-bar'].offsetLeft)
          return bar1Dist < bar2Dist ? bar1 : bar2
        }, allBarsLeftOrRight[0])
      } else {
        return null
      }
    }

    // ------------------------------------------------------------------------
    // ------------------------------------------------------------------------
    // ------------------------------------------------------------------------
  },

  provide() {
    return {
      getAllUnits: () => this.allUnits,
      getChartProps: () => this.$props,
      globToText: (glob, edge) => this.globToText(glob, edge),
      initDragOfBarsFromBundle: (bundleId, e) => this.initDragOfBarsFromBundle(bundleId, e),
      moveBarsFromBundleOfPushedBar: (bar, diff, overlapType) =>
        this.moveBarsFromBundleOfPushedBar(bar, diff, overlapType),
      onBarEvent: (e, ganttBar) => this.onBarEvent(e, ganttBar),
      onDragendBar: (e, ganttBar, action) => this.onDragendBar(e, ganttBar, action),
      setDragLimitsOfGanttBar: ganttBar => this.setDragLimitsOfGanttBar(ganttBar),
      textToGlob: abbr => this.textToGlob(abbr)
    }
  }
}
</script>
