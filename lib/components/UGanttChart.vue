<template>
  <div class="u-gantt-chart-container" :data-theme="theme" :style="{ width, height }">
    <div class="u-gantt-chart" @scroll="onScroll($event)">
      <u-gantt-timeaxis v-if="!hideTimeaxis" :all-units="allUnits" :axis="axis" :grid-size="gridSize" :row-label-width="rowLabelWidth" :timemarker-offset="timemarkerOffset" />
      <div class="u-gantt-rows-container" :style="{ width: `${rowLabelWidth + allUnits.length * gridSize}px` }">
        <u-gantt-grid v-if="grid" :all-units="allUnits" :axis="axis" :grid-size="gridSize" :highlighted="highlighted" :row-label-width="rowLabelWidth" />
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
    bundles: { type: Array, default: () => [] },
    defaultBarLength: { type: Number, default: 1 },
    grid: { type: Boolean, default: false },
    gridSize: { type: Number, default: 30 },
    globalBundles: { type: String, default: 'fixed' },
    height: { type: String, default: '100%' },
    hideTimeaxis: { type: Boolean, default: false },
    highlighted: { type: Array, default: () => [] },
    isMagnetic: { type: Boolean },
    minGapBetweenBars: { type: Number, default: 0 },
    noTooltip: { type: Boolean, default: false },
    pushOnOverlap: { type: Boolean },
    rowHeight: { type: Number, default: 40 },
    rowLabelWidth: { type: Number, default: 200 },
    startThreadId: { type: String, default: '1' },
    snapBackOnOverlap: { type: Boolean },
    theme: { type: String, default: 'default' },
    tooltipFormat: { type: String, default: '{start} - {end} duration: {duration}' },
    width: { type: String, default: '100%' } // the total width of the entire ganttastic component in %
  },

  data: () => ({
    movedBarsInDrag: new Set(),
    timemarkerOffset: 0,
    rowOffset: 0,
    showHiddenRows: null
  }),

  updated() {
    this.onScroll()
  },

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
    onScroll() {
      this.$children.filter(childComp => childComp.$options.name === UGanttRow.name).forEach(row => row.onWindowResize())
      // It is necessary for avoiding bug with disposition cursor and moving bar
    },

    checkBarMoving(gGanttBar, e) {
      let isFixed
      if (gGanttBar.barConfig.bundle) {
        let type
        if (this.bundles.length !== 0) {
          type = this.bundles.find(bundle => bundle.key === gGanttBar.barConfig.bundle).value
        }
        if (!type) {
          type = this.globalBundles
        }
        switch (type) {
          case 'fixed':
            isFixed = true
            break
          case 'relative':
            isFixed = false
            break
        }
      }

      // bundleRelation type defining
      const parent = this.getGanttBarChildrenList().find(childComp => childComp.localBar === gGanttBar.localBar).$parent
      const ganttRowChildrenList = this.$children.filter(childComp => childComp.$options.name === UGanttRow.name)
      this.rowOffset = 0
      const selectedRow = ganttRowChildrenList.find(el => {
        const rect = el.$refs['u-gantt-row'].getBoundingClientRect()
        return rect.top <= e.clientY && rect.left <= e.clientX && rect.top + rect.height >= e.clientY && rect.left + rect.width >= e.clientX
      })

      // defining row that contains cursor
      if (!selectedRow) return 'not-allowed'

      this.rowOffset = ganttRowChildrenList.findIndex(el => el === selectedRow) - ganttRowChildrenList.findIndex(el => el === parent)

      // computing common row offset
      if (isFixed === undefined) {
        const barNewRowIndex = ganttRowChildrenList.findIndex(el => el === parent) + this.rowOffset
        if (barNewRowIndex < ganttRowChildrenList.length && barNewRowIndex >= 0 && selectedRow.groupThreadId === parent.groupThreadId) {
          return 'grabbing'
        }
      } else if (isFixed) {
        const confirmBarsRowMoving = Array.from(this.movedBarsInDrag.values()).every(bar => {
          const barParent = this.getGanttBarChildrenList().find(childComp => childComp.localBar === bar).$parent
          const barNewRowIndex = ganttRowChildrenList.findIndex(el => el === barParent) + this.rowOffset
          return barNewRowIndex < ganttRowChildrenList.length && barNewRowIndex >= 0 && barParent.groupThreadId === ganttRowChildrenList[barNewRowIndex].groupThreadId
        })
        if (confirmBarsRowMoving) {
          return 'grabbing'
        }
        // approving value if fixed
      } else {
        const confirmBarsRowMoving = Array.from(this.movedBarsInDrag).every(bar => {
          const barParent = this.getGanttBarChildrenList().find(childComp => childComp.localBar === bar).$parent
          return barParent !== selectedRow || barParent === parent
        })
        if (confirmBarsRowMoving && selectedRow.groupThreadId === parent.groupThreadId) {
          return 'grabbing'
        }
      }
      return 'not-allowed'
    },

    moveBarToOtherRow(gGanttBar, e) {
      let isFixed
      if (gGanttBar.barConfig.bundle) {
        let type
        if (this.bundles.length !== 0) {
          type = this.bundles.find(bundle => bundle.key === gGanttBar.barConfig.bundle).value
        }
        if (!type) {
          type = this.globalBundles
        }
        switch (type) {
          case 'fixed':
            isFixed = true
            break
          case 'relative':
            isFixed = false
            break
        }
      }

      // bundleRelation type defining
      const parent = this.getGanttBarChildrenList().find(childComp => childComp === gGanttBar).$parent
      const ganttRowChildrenList = this.$children.filter(childComp => childComp.$options.name === UGanttRow.name)
      this.rowOffset = 0
      const selectedRow = ganttRowChildrenList.find(el => {
        const rect = el.$refs['u-gantt-row'].getBoundingClientRect()
        return rect.top < e.clientY && rect.left < e.clientX && rect.top + rect.height > e.clientY && rect.left + rect.width > e.clientX
      })

      // defining row that contains cursor
      if (!selectedRow) {
        this.snapBackBundle(gGanttBar)
        return
      }

      this.rowOffset = ganttRowChildrenList.findIndex(el => el === selectedRow) - ganttRowChildrenList.findIndex(el => el === parent)

      // computing common row offset
      if (isFixed === undefined) {
        const barNewRowIndex = ganttRowChildrenList.findIndex(el => el === parent) + this.rowOffset
        if (
          barNewRowIndex < ganttRowChildrenList.length &&
          barNewRowIndex >= 0 &&
          selectedRow.groupThreadId === parent.groupThreadId &&
          !gGanttBar.isPosOutOfDragRange(gGanttBar.phantomX, gGanttBar.phantomX + gGanttBar.getBarWidth(gGanttBar.bar))
        ) {
          gGanttBar.bar[this.barStartKey] = this.globToText(gGanttBar.phantomNewStart)
          gGanttBar.bar[this.barEndKey] = this.globToText(gGanttBar.phantomNewEnd)
          this.magnetize(gGanttBar)
          if (gGanttBar.getOverlapBarAndType(gGanttBar.localBar, ganttRowChildrenList[barNewRowIndex].localBars).overlapBar === undefined || gGanttBar.barConfig.pushOnOverlap === false) {
            this.invokeBarTransition(gGanttBar, ganttRowChildrenList, parent)
            return
          } else {
            this.snapBackBundle(gGanttBar)
            return
          }
        } else {
          this.snapBackBundle(gGanttBar)
          return
        }
      } else if (isFixed) {
        const outOfRangeCheck = !gGanttBar.isPosOutOfDragRange(gGanttBar.phantomX, gGanttBar.phantomX + gGanttBar.getBarWidth(gGanttBar.bar))
        gGanttBar.bar[this.barStartKey] = this.globToText(gGanttBar.phantomNewStart)
        gGanttBar.bar[this.barEndKey] = this.globToText(gGanttBar.phantomNewEnd)
        this.magnetize(gGanttBar)

        const confirmBarsRowMoving =
          gGanttBar.bundleBars.every(bundleBar => {
            const barParent = this.getGanttBarChildrenList().find(childComp => childComp.localBar === bundleBar.localBar).$parent
            const barNewRowIndex = ganttRowChildrenList.findIndex(el => el === barParent) + this.rowOffset
            this.magnetize(bundleBar)
            return (
              barNewRowIndex < ganttRowChildrenList.length &&
              barNewRowIndex >= 0 &&
              barParent.groupThreadId === ganttRowChildrenList[barNewRowIndex].groupThreadId &&
              bundleBar.getOverlapBarAndType(
                bundleBar.localBar,
                ganttRowChildrenList[barNewRowIndex].localBars.filter(el => el.config.bundle !== gGanttBar.barConfig.bundle) || gGanttBar.barConfig.pushOnOverlap === false
              ).overlapBar === undefined &&
              !bundleBar.isPosOutOfDragRange(bundleBar.phantomX, bundleBar.phantomX + bundleBar.getBarWidth(bundleBar.bar))
            )
          }) && outOfRangeCheck
        if (confirmBarsRowMoving) {
          this.invokeFixedBundleBarsTransition(gGanttBar.bundleBars, ganttRowChildrenList)
          return
        } else {
          this.snapBackBundle(gGanttBar)
          return
        }
      } else {
        const outOfRangeCheck = !gGanttBar.isPosOutOfDragRange(gGanttBar.phantomX, gGanttBar.phantomX + gGanttBar.getBarWidth(gGanttBar.bar))
        gGanttBar.bar[this.barStartKey] = this.globToText(gGanttBar.phantomNewStart)
        gGanttBar.bar[this.barEndKey] = this.globToText(gGanttBar.phantomNewEnd)
        gGanttBar.bundleBars.forEach(el => this.magnetize(el))
        const confirmBarsRowMoving = gGanttBar.bundleBars.every(bundleBar => {
          const barParent = this.getGanttBarChildrenList().find(childComp => childComp.localBar === bundleBar.bar).$parent
          return (
            bundleBar === gGanttBar ||
            gGanttBar.getOverlapBarAndType(bundleBar.bar, ganttRowChildrenList[ganttRowChildrenList.findIndex(el => el === barParent)].localBars).overlapBar === undefined ||
            gGanttBar.barConfig.pushOnOverlap === false
          )
        })
        if (
          confirmBarsRowMoving &&
          selectedRow.groupThreadId === parent.groupThreadId &&
          gGanttBar.getOverlapBarAndType(gGanttBar.bar, ganttRowChildrenList[ganttRowChildrenList.findIndex(el => el === parent) + this.rowOffset].localBars).overlapBar === undefined &&
          outOfRangeCheck
        ) {
          this.invokeBarTransition(gGanttBar, ganttRowChildrenList, parent)
          return
        } else {
          this.snapBackBundle(gGanttBar)
          return
        }
      }
    },

    invokeBarTransition(gGanttBar, ganttRowChildrenList, parent) {
      // bar to move, row-array, bar-parent; new-row computes by this.rowOffset
      const newRowIndex = ganttRowChildrenList.findIndex(el => el === parent) + this.rowOffset
      if (ganttRowChildrenList[newRowIndex] === parent) {
        return
      }
      parent.localBars.sort(function comp(a, b) {
        if (a === gGanttBar.localBar) return 1
        else if (b === gGanttBar.localBar) return -1
        else return 0
      })
      parent.localBars.pop()
      ganttRowChildrenList[newRowIndex].localBars.push(gGanttBar.localBar)
      ganttRowChildrenList[newRowIndex].localBars.sort((first, second) => this.textToGlob(first[this.barStartKey]) - this.textToGlob(second[this.barStartKey]))
      gGanttBar.newRowThreadId = ganttRowChildrenList[newRowIndex].threadId
    },

    invokeFixedBundleBarsTransition(gGanttBundle, ganttRowChildrenList) {
      // moving fixed bars alltogether to avoid bug with incorrect work
      gGanttBundle.forEach(gGanttBar => {
        const parent = gGanttBar.$parent
        parent.localBars.sort(function comp(a, b) {
          if (a === gGanttBar.localBar) return 1
          else if (b === gGanttBar.localBar) return -1
          else return 0
        })
        parent.localBars.pop()
      })
      gGanttBundle.forEach(gGanttBar => {
        const parent = gGanttBar.$parent
        const newRowIndex = ganttRowChildrenList.findIndex(el => el === parent) + this.rowOffset
        ganttRowChildrenList[newRowIndex].localBars.push(gGanttBar.localBar)
        ganttRowChildrenList[newRowIndex].localBars.sort((first, second) => this.textToGlob(first[this.barStartKey]) - this.textToGlob(second[this.barStartKey]))
      })
    },

    getGanttBarChildrenList() {
      const ganttBarChildren = []
      const ganttRowChildrenList = this.$children.filter(childComp => childComp.$options.name === UGanttRow.name)
      ganttRowChildrenList.forEach(row => {
        let ganttBarChildrenOfRow = row.$children.filter(childComp => childComp.$options.name === UGanttBar.name)
        ganttBarChildren.push(...ganttBarChildrenOfRow)
      })
      return ganttBarChildren
    },

    getBarsFromBundle(bundleId) {
      if (!bundleId) {
        return []
      }
      return this.getGanttBarChildrenList().filter(ganttBarChild => ganttBarChild.barConfig.bundle === bundleId)
    },

    initDragOfBarsFromBundle(gGanttBar, e) {
      this.movedBarsInDrag = new Set()
      const bundle = []
      gGanttBar.initDrag(e)
      this.movedBarsInDrag.add(gGanttBar.bar)
      bundle.push(gGanttBar)
      if (gGanttBar.barConfig.bundle) {
        this.getGanttBarChildrenList().forEach(ganttBarChild => {
          if (ganttBarChild.barConfig.bundle === gGanttBar.barConfig.bundle && ganttBarChild !== gGanttBar) {
            ganttBarChild.initDrag(e)
            this.movedBarsInDrag.add(ganttBarChild.bar)
            bundle.push(ganttBarChild)
          }
        })
      }
      return bundle
    },

    moveBarsFromBundleOfPushedBar(pushedBar, diff, overlapType) {
      this.movedBarsInDrag.add(pushedBar)
      const bundleId = pushedBar[this.barConfigKey] ? pushedBar[this.barConfigKey].bundle : null
      if (!bundleId) {
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
        const { overlapBar } = ganttBar.getOverlapBarAndType(ganttBar.bar)
        return !!overlapBar
      }
      return false
    },

    snapBackBundleIfNeeded(ganttBar) {
      if (this.shouldSnapBackBar(ganttBar) || ganttBar.bundleBars.some(gBar => this.shouldSnapBackBar(gBar))) {
        ganttBar.bundleBars.forEach(gBar => gBar.snapBack())
        this.movedBarsInDrag = new Set()
      }
    },

    snapBackBundle(gGanttBar) {
      gGanttBar.bundleBars.forEach(gBar => gBar.snapBack())
      this.movedBarsInDrag = new Set()
    },

    onBarEvent({ event, type, time }, ganttBar) {
      this.$emit(`${type}-bar`, { event, bar: ganttBar.bar, time })
    },

    onDragendBar(e, ganttBar, action) {
      const movedBars = this.movedBarsInDrag
      if (!ganttBar.phantomMode && !ganttBar.phantomChild) {
        ganttBar.bundleBars.forEach(bar => this.magnetize(bar, action))
        this.snapBackBundleIfNeeded(ganttBar)
      } else {
        ganttBar.phantomMode = false
        ganttBar.phantomChild = false
      }
      ganttBar.bundleBars = null

      if (movedBars.size !== 0) this.$emit('dragend-bar', { event: e, bar: ganttBar.bar, movedBars: null, barMoveToThread: ganttBar.newRowThreadId })
      this.movedBarsInDrag = new Set()
    },

    magnetize(magnetBar, action) {
      if (this.isMagnetic) {
        if (action) {
          const { left, right } = action
          if (left) {
            if (this.textToGlob(magnetBar.bar[this.barStartKey]) % 1 < 0.5) {
              magnetBar.bar[this.barStartKey] = this.globToText(Math.floor(this.textToGlob(magnetBar.bar[this.barStartKey])), 'start')
            } else {
              magnetBar.bar[this.barStartKey] = this.globToText(Math.round(this.textToGlob(magnetBar.bar[this.barStartKey])), 'start')
            }
            return
          } else if (right) {
            if (this.textToGlob(magnetBar.bar[this.barEndKey]) % 1 < 0.5) {
              magnetBar.bar[this.barEndKey] = this.globToText(Math.floor(this.textToGlob(magnetBar.bar[this.barEndKey])), 'end')
            } else {
              magnetBar.bar[this.barEndKey] = this.globToText(Math.round(this.textToGlob(magnetBar.bar[this.barEndKey])), 'end')
            }
            return
          }
        }
        if (this.textToGlob(magnetBar.bar[this.barStartKey]) % 1 < 0.5) {
          magnetBar.bar[this.barStartKey] = this.globToText(Math.floor(this.textToGlob(magnetBar.bar[this.barStartKey])), 'start')
          magnetBar.bar[this.barEndKey] = this.globToText(Math.floor(this.textToGlob(magnetBar.bar[this.barEndKey])), 'end')
        } else {
          magnetBar.bar[this.barStartKey] = this.globToText(Math.round(this.textToGlob(magnetBar.bar[this.barStartKey])), 'start')
          magnetBar.bar[this.barEndKey] = this.globToText(Math.round(this.textToGlob(magnetBar.bar[this.barEndKey])), 'end')
        }
      }
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
          let otherBarsFromBundle = this.getBarsFromBundle(barFromBundle.barConfig.bundle).filter(otherBar => otherBar !== barFromBundle)
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
          bar.dragLimitRight = bar.$refs['u-gantt-bar'].offsetLeft + bar.$refs['u-gantt-bar'].offsetWidth + totalGapDistance
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
      const bundleBarsAndGapDist = bar.barConfig.bundle ? [{ bar, gapDistance: gapDistanceSoFar }] : []
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
          let currentBarOffsetRight = currentBar.$refs['u-gantt-bar'].offsetLeft + currentBar.$refs['u-gantt-bar'].offsetWidth
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
    },
    invokeShowHiddenRows(groupThreadId) {
      if (!this.showHiddenRows) {
        this.showHiddenRows = groupThreadId
        this.$nextTick(() => this.onScroll())
      }
    },
    invokeHideHiddenRows() {
      if (this.showHiddenRows) {
        this.showHiddenRows = null
        this.$nextTick(() => this.onScroll())
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
      getMovedBars: () => this.movedBarsInDrag,
      globToText: (glob, edge) => this.globToText(glob, edge),
      initDragOfBarsFromBundle: (bundleId, e) => this.initDragOfBarsFromBundle(bundleId, e),
      moveBarsFromBundleOfPushedBar: (bar, diff, overlapType) => this.moveBarsFromBundleOfPushedBar(bar, diff, overlapType),
      onBarEvent: (e, ganttBar) => this.onBarEvent(e, ganttBar),
      onDragendBar: (e, ganttBar, action) => this.onDragendBar(e, ganttBar, action),
      setDragLimitsOfGanttBar: ganttBar => this.setDragLimitsOfGanttBar(ganttBar),
      textToGlob: abbr => this.textToGlob(abbr),
      moveBarToOtherRow: (gGanttBar, e) => this.moveBarToOtherRow(gGanttBar, e),
      checkBarMoving: (gGanttBar, e) => this.checkBarMoving(gGanttBar, e),
      invokeShowHiddenRows: groupThreadId => this.invokeShowHiddenRows(groupThreadId),
      invokeHideHiddenRows: () => this.invokeHideHiddenRows()
    }
  }
}
</script>
