<template>
  <div>
    <select v-model="theme">
      <option v-for="option in themes" :key="option" :value="option">{{ option }}</option>
    </select>
    <u-gantt-chart
      :axis="axis"
      bar-start-key="start"
      bar-end-key="end"
      bar-config-key="config"
      :bundles="bundles"
      :globalBundles="globalBundles"
      :no-tooltip="noTooltip"
      :grid="grid"
      :grid-size="gridSize"
      :highlighted="highlighted"
      :is-magnetic="isMagnetic"
      :height="height"
      :hide-timeaxis="hideTimeaxis"
      :push-on-overlap="pushOnOverlap"
      :row-height="rowHeight"
      :row-label-width="rowLabelWidth"
      snap-back-on-overlap
      :theme="theme"
      @dragend-bar="onDragend($event)"
    >
      <u-gantt-row
        v-for="row in rows"
        :key="row.label"
        :bars="row.bars"
        :highlight-on-hover="highlightOnHover"
        :label="row.label"
        :label-style="row.labelStyle"
        :row-style="row.style"
        :threadID="row.threadID"
      >
        <template #bar-label="{ bar }">
          <span>{{ bar.label }}</span>
        </template>
      </u-gantt-row>
    </u-gantt-chart>
  </div>
</template>

<script>
export default {
  data: () => ({
    axis: [
      {
        key: 'group1',
        label: 'пн 18 апреля',
        units: 8
      },
      {
        key: 'group2',
        label: 'вт 19 апреля',
        units: 8
      },
      {
        key: 'group3',
        label: 'ср 20 апреля',
        units: 8
      },
      {
        key: 'group4',
        label: 'чт 21 апреля',
        units: 8
      },
      {
        key: 'group5',
        label: 'пт 22 апреля',
        units: 5
      }
    ],
    bundles: [
      {
        key: 'blueBundle',
        value: 'fixed'
      },
      {
        key: 'redBundle',
        value: 'relative'
      }
    ],
    noTooltip: false,
    grid: true,
    gridSize: 30,
    globalBundles: 'fixed',
    isMagnetic: true,
    height: '50vh',
    hideTimeaxis: false,
    highlightOnHover: true,
    highlighted: [0],
    pushOnOverlap: false,
    rowHeight: 40,
    rowLabelWidth: 200,
    rows: [
      {
        label: 'Group 0',

        bars: [
          {
            start: 'group1, 3',
            end: 'group1, 6',
            label: 'Immobile',
            tooltip: 'Bar tooltip',
            config: {
              color: 'white',
              backgroundColor: '#404040',
              opacity: 0.5,
              immobile: true
            }
          },
          {
            start: 'group2, 2',
            end: 'group2, 7',
            label: 'With handles!',
            tooltip: 'Bar tooltip',
            config: {
              color: 'white',
              backgroundColor: '#a23def',
              handles: true
            }
          }
        ]
      },
      {
        label: 'Group 1',
        bars: [
          {
            start: 'group1, 0',
            end: 'group1, 8',
            label: 'Bar',
            tooltip: 'Bar tooltip',
            config: {
              color: 'white',
              backgroundColor: '#de3b26',
              bundle: 'redBundle'
            }
          },
          {
            start: 'group2, 2',
            end: 'group3, 0',
            label: 'Bar',
            tooltip: 'Bar tooltip',
            config: {
              color: 'white',
              backgroundColor: '#2e74a3',
              bundle: 'blueBundle'
            }
          },
          {
            start: 'group3, 5',
            end: 'group4, 3',
            label: 'Bar',
            tooltip: 'Bar tooltip',
            config: { color: 'white', backgroundColor: '#aa34a3' }
          }
        ],
        threadID: '1'
      },
      {
        label: '2/3',
        labelStyle: {
          justifyContent: 'end'
        },
        bars: [
          {
            start: 'group1, 1',
            end: 'group2, 1',
            label: 'We belong together (h)',
            tooltip: 'Bar tooltip',
            config: {
              color: 'white',
              backgroundColor: '#de3b26',
              bundle: 'redBundle'
            }
          },
          {
            start: 'group2, 2',
            end: 'group3, 0',
            label: 'We belong together (v&h)',
            tooltip: 'Bar tooltip',
            config: {
              color: 'white',
              backgroundColor: '#2e74a3',
              bundle: 'blueBundle'
            }
          },
          {
            start: 'group3, 2',
            end: 'group3, 5',
            label: 'Bar',
            tooltip: 'Bar tooltip',
            config: {
              color: 'white',
              backgroundColor: '#5effad',
              pushOnOverlap: false,
              zIndex: 2
            }
          }
        ],
        threadID: '1'
      },
      {
        label: '3/3',
        labelStyle: {
          justifyContent: 'end'
        },
        bars: [
          {
            start: 'group1, 4',
            end: 'group2, 2',
            label: 'Bar',
            tooltip: 'Bar tooltip',
            config: {
              color: 'white',
              backgroundColor: '#d18aaf',
              handles: true
            }
          },
          {
            start: 'group3, 3',
            end: 'group4, 5',
            label: 'Rectangular',
            tooltip: 'Bar tooltip',
            config: {
              color: 'white',
              backgroundColor: '#f2840f',
              borderRadius: 0
            }
          }
        ],
        threadID: '1'
      },
      {
        label: 'Group 2',
        bars: [],
        style: {
          background: 'linear-gradient(-45deg, rgba(0, 0, 0, 0) 48%, rgba(0, 0, 0, 0.2) 50%, rgba(0, 0, 0, 0) 52%)',
          backgroundSize: '1em 1em'
        },
        threadID: '2'
      },
      {
        label: '2/2',
        labelStyle: {
          justifyContent: 'end'
        },
        bars: [],
        threadID: '2'
      }
    ],
    theme: 'default',
    themes: ['creamy', 'crimson', 'dark', 'default', 'flare', 'fuchsia', 'grove', 'material-blue', 'sky', 'slumber', 'vue']
  }),

  methods: {
    onDragend(e) {
      const { event, bar, movedBars } = e
      // eslint-disable-next-line
      console.log('onDragend', { event: event.type, bar, movedBars })
    }
  }
}
</script>

<style lang="scss" src="../lib/scss/index.scss" />
