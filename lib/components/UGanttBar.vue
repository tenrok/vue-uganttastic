<template>
  <div>
    <div
      ref="u-gantt-bar"
      :class="[
        'u-gantt-bar',
        { 'u-gantt-bar-immobile': barConfig.immobile },
        { 'u-gantt-bar-resizable': barConfig.handles }
      ]"
      :style="barStyle"
      @mouseenter.stop="onMouseenter($event)"
      @mouseleave.stop="onMouseleave($event)"
      @mousedown.stop="onMousedown($event)"
      @click.stop="onClick($event)"
      @dblclick="onDblclick($event)"
      @contextmenu="onContextmenu($event)"
    >
      <div class="u-gantt-bar__label">
        <slot name="bar-label" :bar="localBar">{{ barConfig.label }}</slot>
      </div>
      <template v-if="barConfig.handles">
        <div class="u-gantt-bar__handle-left" />
        <div class="u-gantt-bar__handle-right" />
      </template>
    </div>

    <transition name="fade" mode="out-in">
      <div
        v-if="!noTooltip && !barConfig.noTooltip && showTooltip"
        class="u-gantt-bar__tooltip"
        :style="tooltipStyle"
      >
        <div
          class="color-indicator"
          :style="{
            background: this.barStyle.background || this.barStyle.backgroundColor
          }"
        />
        <div>
          <div>{{ localBar.tooltip }}</div>
          <div>{{ tooltipContent }}</div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
String.prototype.formatUnicorn =
  String.prototype.formatUnicorn ||
  function () {
    'use strict'
    let str = this /*.toString()*/
    if (arguments.length) {
      const notSeenInNature = '#$%#$%' // or whatever
      const t = typeof arguments[0]
      let args = 'string' === t || 'number' === t ? Array.prototype.slice.call(arguments) : arguments[0]
      for (let key in args) {
        let rv = String(args[key]).replace('{', notSeenInNature)
        str = str.replace(new RegExp('\\{' + key + '\\}', 'gi'), rv)
      }
      str = str.replace(notSeenInNature, '{')
    }
    return str
  }

export default {
  name: 'UGanttBar',

  props: {
    allBarsInRow: { type: Array },
    bar: { type: Object },
    barsContainer: [Object, DOMRect]
  },

  inject: [
    'getAllUnits',
    'getChartProps',
    'globToText',
    'initDragOfBarsFromBundle',
    'moveBarsFromBundleOfPushedBar',
    'onBarEvent',
    'onDragendBar',
    'setDragLimitsOfGanttBar',
    'textToGlob',
     'moveBarToOtherRow',
     'getMovedBars',
     'checkBarMoving'
  ],

  data() {
    return {
      barStartBeforeDrag: null,
      barEndBeforeDrag: null,
      cursorOffsetX: 0,
      cursorOffsetY:0,
      dragLimitLeft: null,
      dragLimitRight: null,
      isDragging: false,
      isMainBarOfDrag: false, // is this the bar that was clicked on when starting to drag or is it dragged along some other bar from the same bundle
      localBar: this.bar,
      mousemoveCallback: null, // gets initialized when starting to drag, possible values: drag, dragByHandleLeft, dragByHandleRight,
      showTooltip: false,
      tooltipTimeout: null,
      offsetY:0
    }
  },

  computed: {
    movedBars(){
      return this.getMovedBars()
    },
    allUnits() {
      return this.getAllUnits()
    },

    chartProps() {
      return this.getChartProps()
    },

    barConfigKey() {
      return this.chartProps.barConfigKey
    },

    barStartKey() {
      return this.chartProps.barStartKey
    },

    barEndKey() {
      return this.chartProps.barEndKey
    },

    noTooltip() {
      return this.chartProps.noTooltip
    },

    minGapBetweenBars() {
      return this.chartProps.minGapBetweenBars
    },

    barStartGlob: {
      get() {
        return this.textToGlob(this.localBar[this.barStartKey])
      },
      set(value) {
        this.localBar[this.barStartKey] = this.globToText(value, 'start')
      }
    },

    barEndGlob: {
      get() {
        return this.textToGlob(this.localBar[this.barEndKey])
      },
      set(value) {
        this.localBar[this.barEndKey] = this.globToText(value, 'end')
      }
    },

    barStartText() {
      return this.localBar[this.barStartKey]
    },

    barEndText() {
      return this.localBar[this.barEndKey]
    },

    barDurationText() {
      const start = this.textToGlob(this.localBar[this.barStartKey])
      const end = this.textToGlob(this.localBar[this.barEndKey])
      const res = end - start
      return res.toFixed(res % 1 === 0 ? 0 : 2)
    },

    barConfig() {
      if (this.localBar[this.barConfigKey]) {
        return {
          ...this.localBar[this.barConfigKey],
          background: this.localBar[this.barConfigKey].isShadow
            ? 'grey'
            : this.localBar[this.barConfigKey].background || this.localBar[this.barConfigKey].backgroundColor,
          opacity: this.localBar[this.barConfigKey].isShadow ? '0.3' : this.localBar[this.barConfigKey].opacity
        }
      }
      return {}
    },

    barStyle() {
      if (!this.barsContainer.width) return
      const xStart = this.mapGlobToPosition(this.barStartGlob)
      const xEnd = this.mapGlobToPosition(this.barEndGlob)
      return {
        ...(this.barConfig || {}),
        left: `${xStart}px`,
        width: `${xEnd - xStart}px`,
        height: `${this.chartProps.rowHeight - 6}px`,
        zIndex: this.barConfig.zIndex || (this.isDragging ? 2 : 1)
      }
    },

    tooltipContent() {
      return this.chartProps.tooltipFormat.formatUnicorn({
        start: this.barStartText,
        end: this.barEndText,
        duration: this.barDurationText
      })
    },

    tooltipStyle() {
      return {
        left: this.barStyle.left,
        top: `${this.chartProps.rowHeight}px`
      }
    }
  },

  watch: {
    bar(value) {
      this.localBar = value
    }
  },

  methods: {
    onMouseenter(e) {
      if (!this.noTooltip) {
        if (this.tooltipTimeout) {
          clearTimeout(this.tooltipTimeout)
        }
        this.tooltipTimeout = setTimeout(() => (this.showTooltip = true), 800)
      }
      this.onBarEvent({ event: e, type: e.type }, this)
    },

    onMouseleave(e) {
      if (!this.noTooltip) {
        clearTimeout(this.tooltipTimeout)
        this.showTooltip = false
      }
      this.onBarEvent({ event: e, type: e.type }, this)
    },

    onContextmenu(e) {
      const time = this.mapPositionToGlob(e.clientX - this.barsContainer.left)
      this.onBarEvent({ event: e, type: e.type, time }, this)
    },

    onClick(e) {
      const time = this.mapPositionToGlob(e.clientX - this.barsContainer.left)
      this.onBarEvent({ event: e, type: e.type, time }, this)
    },

    onDblclick(e) {
      const time = this.mapPositionToGlob(e.clientX - this.barsContainer.left)
      this.onBarEvent({ event: e, type: e.type, time }, this)
    },

    onMousedown(e) {
      e.preventDefault()
      if (e.button === 2) {
        return
      }

      if (!this.barConfig.immobile && !this.barConfig.isShadow) {
        this.setDragLimitsOfGanttBar(this)
        // initialize the dragging on next mousemove event:
        window.addEventListener('mousemove', this.onFirstMousemove, { once: true })
        // if next mousemove happens after mouse up (if user just presses mouse button down, then up, without moving):
        window.addEventListener('mouseup', () => window.removeEventListener('mousemove', this.onFirstMousemove), {
          once: true
        })
      }
      const time = this.mapPositionToGlob(e.clientX - this.barsContainer.left)
      this.onBarEvent({ event: e, type: e.type, time }, this)
    },

    onFirstMousemove(e) {
      this.isMainBarOfDrag = true
      // this method is injected here by UGanttChart.vue, and calls initDrag()
      // for all UGanttBars that belong to the same bundle as this bar:
      this.initDragOfBarsFromBundle(this, e)
    },

    initDrag(e) {
      // "e" must be the mousedown event
      document.body.style.cursor = 'move'
      //this.barConfig.noTooltip=true;

      this.isDragging = true
      this.barStartBeforeDrag = this.textToGlob(this.localBar[this.barStartKey])
      this.barEndBeforeDrag = this.textToGlob(this.localBar[this.barEndKey])
      
      let barX = this.$refs['u-gantt-bar'].getBoundingClientRect().left
      let barY = this.$refs['u-gantt-bar'].getBoundingClientRect().top

      this.cursorOffsetX = e.clientX - barX
      this.cursorOffsetY = e.clientY - barY

      let mousedownType = e.target.className
      switch (mousedownType) {
        case 'u-gantt-bar__handle-left':
          document.body.style.cursor = 'w-resize'
          this.mousemoveCallback = this.dragByHandleLeft
          break
        case 'u-gantt-bar__handle-right':
          document.body.style.cursor = 'e-resize'
          this.mousemoveCallback = this.dragByHandleRight
          break
        default:
          this.mousemoveCallback = this.drag
      }
      window.addEventListener('mousemove', this.mousemoveCallback)
      window.addEventListener('mouseup', this.endDrag)
    },

    getBarWidth(bar) {
      const xStart = this.mapGlobToPosition(this.textToGlob(bar[this.barStartKey]))
      const xEnd = this.mapGlobToPosition(this.textToGlob(bar[this.barEndKey]))
      return xEnd - xStart
    },

    drag(e) {
      const chart = e.target.closest('.u-gantt-chart')
      if (!chart) return
      const barWidth = this.$refs['u-gantt-bar'].getBoundingClientRect().width
      const newXStart = chart.scrollLeft + e.clientX - this.barsContainer.left - this.cursorOffsetX
      const newXEnd = newXStart + barWidth

      if(this.isMainBarOfDrag)
        document.body.style.cursor=this.checkBarMoving(this,e)
      if (this.isPosOutOfDragRange(newXStart, newXEnd)) {
        return
      }
      this.barStartGlob = this.mapPositionToGlob(newXStart)
      this.barEndGlob = this.mapPositionToGlob(newXEnd)
      //this.bar
      this.manageOverlapping()
      this.onBarEvent({ event: e, type: 'drag' }, this)
    },

    dragByHandleLeft(e) {
      const chart = e.target.closest('.u-gantt-chart')
      if (!chart) return
      let newXStart = chart.scrollLeft + e.clientX - this.barsContainer.left
      let newStart = this.mapPositionToGlob(newXStart)
      //console.log(this.barEndGlob - newStart)
      if (this.barEndGlob - newStart <this.chartProps.defaultBarLength || this.isPosOutOfDragRange(newXStart, null)) {
        return
      }
      this.barStartGlob = newStart
      this.manageOverlapping()
    },

    dragByHandleRight(e) {
      const chart = e.target.closest('.u-gantt-chart')
      if (!chart) return
      let newXEnd = chart.scrollLeft + e.clientX - this.barsContainer.left
      let newEnd = this.mapPositionToGlob(newXEnd)
      //console.log(newEnd-this.barStartGlob)
      if (newEnd - this.barStartGlob<this.chartProps.defaultBarLength || this.isPosOutOfDragRange(null, newXEnd)) {
        return
      }
      this.barEndGlob = newEnd
      this.manageOverlapping()
    },

    isPosOutOfDragRange(newXStart, newXEnd) {
      if (newXStart && newXStart < 0) {
        return true
      }
      if (newXEnd > this.barsContainer.width) {
        return true
      }
      if (newXStart && this.dragLimitLeft !== null && newXStart < this.dragLimitLeft + this.minGapBetweenBars) {
        return true
      }
      if (newXEnd && this.dragLimitRight !== null && newXEnd > this.dragLimitRight - this.minGapBetweenBars) {
        return true
      }

      if (!this.chartProps.pushOnOverlap || this.barConfig.pushOnOverlap === false) {
        return false
      }

      const isSqueezeToLeft = newXStart && this.textToGlob(this.localBar[this.barStartKey]) < this.barStartBeforeDrag
      const isSqueezeToRight = newXEnd && this.textToGlob(this.localBar[this.barEndKey]) > this.barEndBeforeDrag

      const currentIndex = this.allBarsInRow.findIndex(bar => bar == this.localBar)

      let otherBars = []
      if (isSqueezeToRight) {
        otherBars = this.allBarsInRow.slice(currentIndex + 1)
        if (otherBars.length) {
          let otherBarTotalWidth = otherBars
            .map(bar =>
              bar[this.barConfigKey] && bar[this.barConfigKey].pushOnOverlap === false ? 0 : this.getBarWidth(bar)
            )
            .reduce((accumulator, currentValue) => accumulator + currentValue)
          if (newXEnd > this.barsContainer.width - otherBarTotalWidth) {
            return true
          }
        }
      } else if (isSqueezeToLeft) {
        otherBars = this.allBarsInRow.slice(0, currentIndex)
        if (otherBars.length) {
          let otherBarTotalWidth = otherBars
            .map(bar =>
              bar[this.barConfigKey] && bar[this.barConfigKey].pushOnOverlap === false ? 0 : this.getBarWidth(bar)
            )
            .reduce((accumulator, currentValue) => accumulator + currentValue)
          if (newXStart < otherBarTotalWidth) {
            return true
          }
        }
      }

      return false
    },

    endDrag(e) {
      //this.barConfig.noTooltip=false;
      let left = false,
        right = false,
        move = false
      switch (document.body.style.cursor) {
        case 'e-resize':
          right = true
          break
        case 'w-resize':
          left = true
          break
        default:
          move = true
          break
      }
       //console.log('endDrag', { left, right, move })
       //console.log(Array.from(this.movedBars.values()))
      //if(Array.from(this.movedBars.values()).includes(this.bar))
      this.moveBarToOtherRow(this,e)
      
      this.offsetY=0
      this.isDragging = false
      this.dragLimitLeft = null
      this.dragLimitRight = null
      document.body.style.cursor = 'auto'
      window.removeEventListener('mousemove', this.mousemoveCallback)
      window.removeEventListener('mouseup', this.endDrag)
      if (this.isMainBarOfDrag) {
        this.onDragendBar(e, this, { left, right, move })
        this.isMainBarOfDrag = false
      }
    },

    snapBack() {
      this.barStartGlob = this.barStartBeforeDrag
      this.barEndGlob = this.barEndBeforeDrag
    },

    manageOverlapping() {
      if (!this.chartProps.pushOnOverlap || this.barConfig.pushOnOverlap === false) {
        return
      }
      let currentBar = this.localBar
      let { overlapBar, overlapType } = this.getOverlapBarAndType(currentBar)
      while (overlapBar) {
        let diff
        const currentStartGlob = this.textToGlob(currentBar[this.barStartKey])
        const currentEndGlob = this.textToGlob(currentBar[this.barEndKey])
        const overlapStartGlob = this.textToGlob(overlapBar[this.barStartKey])
        const overlapEndGlob = this.textToGlob(overlapBar[this.barEndKey])
        switch (overlapType) {
          case 'left':
            diff = overlapEndGlob - currentStartGlob + this.minGapBetweenBars
            overlapBar[this.barEndKey] = this.globToText(currentStartGlob - this.minGapBetweenBars, 'end')
            overlapBar[this.barStartKey] = this.globToText(overlapStartGlob - diff, 'start')
            break
          case 'right':
            diff = currentEndGlob - overlapStartGlob + this.minGapBetweenBars
            overlapBar[this.barStartKey] = this.globToText(currentEndGlob + this.minGapBetweenBars, 'start')
            overlapBar[this.barEndKey] = this.globToText(overlapEndGlob + diff, 'end')
            break
          default:
            // eslint-disable-next-line
            console.warn('One bar is inside of the other one! This should never occur while push-on-overlap is active!')
            return
        }
        this.moveBarsFromBundleOfPushedBar(overlapBar, diff, overlapType)
        currentBar = overlapBar
        ;({ overlapBar, overlapType } = this.getOverlapBarAndType(overlapBar))
      }
    },

    getOverlapBarAndType(bar) {
      const barStartGlob = this.textToGlob(bar[this.barStartKey])
      const barEndGlob = this.textToGlob(bar[this.barEndKey])
      let overlapLeft, overlapRight, overlapInBetween
      let overlapBar = this.allBarsInRow.find(otherBar => {
        if (otherBar === bar || (otherBar[this.barConfigKey] && otherBar[this.barConfigKey].pushOnOverlap === false)) {
          return false
        }
        const otherBarStartGlob = this.textToGlob(otherBar[this.barStartKey])
        const otherBarEndGlob = this.textToGlob(otherBar[this.barEndKey])

        overlapLeft = barStartGlob > otherBarStartGlob && barStartGlob < otherBarEndGlob
        overlapRight = barEndGlob > otherBarStartGlob && barEndGlob < otherBarEndGlob
        overlapInBetween =
          (otherBarStartGlob > barStartGlob && otherBarStartGlob < barEndGlob) ||
          (otherBarEndGlob > barStartGlob && otherBarEndGlob < barEndGlob)
        return overlapLeft || overlapRight || overlapInBetween
      })
      const overlapType = overlapLeft ? 'left' : overlapRight ? 'right' : overlapInBetween ? 'between' : null
      return { overlapBar, overlapType }
    },

    // this is used in UGanttChart, when a bar from a bundle is pushed so that bars from its bundle also get pushed
    moveBarByChildPointsAndPush(childPointCount, direction) {
      switch (direction) {
        case 'left':
          this.barStartGlob = this.barStartGlob - childPointCount
          this.barEndGlob = this.barEndGlob - childPointCount
          break
        case 'right':
          this.barStartGlob = this.barStartGlob + childPointCount
          this.barEndGlob = this.barEndGlob + childPointCount
          break
        default:
          // eslint-disable-next-line
          console.warn('wrong direction in moveBarByChildPointsAndPush')
          return
      }
      this.manageOverlapping()
    },

    mapGlobToPosition(glob) {
      return (glob / this.allUnits.length) * this.barsContainer.width
    },

    mapPositionToGlob(xPos) {
      return (xPos / this.barsContainer.width) * this.allUnits.length
    }
  }
}
</script>
