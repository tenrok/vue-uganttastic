# vue-uganttastic

![screenshot](https://user-images.githubusercontent.com/4740535/143441452-386dbe75-2ce7-44c6-a0a4-b749a52d361d.png)

A simple and easy-to-use Gantt chart component for Vue.js based on `Vue-Ganttastic`

[DEMO](https://solodyagin.github.io/vue-uganttastic/)

## Installation

You can install and use Vue-UGanttastic in your project using <kbd>npm</kbd>:

```
npm install vue-uganttastic
```

## Basic Usage

Import the components `UGanttChart` and `UGanttRow`.
Use `u-gantt-chart` in your template, pass the desired chart axis as prop (`axis`) and add `u-gantt-row`s
to the default template slot.
Pass an array containing your bar objects to every row using the `bars` prop, while specifying the name of the properties in your bar objects
that stand for the bar start and bar end time using the props `bar-start` and `bar-end`

The following code showcases a simple usage example in a .vue SFC (Single File Component)

```html
<template>
  ...

  <u-gantt-chart :axis="axis" :highlighted="highlighted" :is-magnetic="true">
    <u-gantt-row
      v-for="row in rows"
      :key="row.label"
      :label="row.label"
      :label-style="row.labelStyle"
      :bars="row.bars"
      bar-start="myStart"
      bar-end="myEnd"
    />
  </u-gantt-chart>

  ...
</template>

<script>
  import { UGanttChart, UGanttRow } from 'vue-uganttastic'

  export default {

    ...

    components: {
      UGanttChart,
      UGanttRow
    },

    data() {
      return {
        axis: [
          {
            key: 'day1',
            label: 'Day #1',
            units: 8,
          },
          {
            key: 'day2',
            label: 'Day #2',
            units: 8,
          },
          {
            key: 'day3',
            label: 'Day #3',
            units: 8,
          },
          {
            key: 'day4',
            label: 'Day #4',
            units: 8,
          },
          {
            key: 'day5',
            label: 'Day #5',
            units: 5,
          },
        ],
        highlighted: [7],
        rows: [
          {
            label: "My row #1",
            labelStyle: {
              justifyContent: "end"
            },
            bars: [
              {
                myStart: "day1, 1",
                myEnd: "day1, 3"
              }
            ]
          },
          {
            label: "My row #2",
            bars: [
              {
                myStart: "day2, 4",
                myEnd: "day2, 8"
              },
              {
                myStart: "day3, 9",
                myEnd: "day3, 12"
              }
            ]
          }
        ]
      }
    }

    ...

  }
</script>

<style lang="scss">
  @import '~vue-uganttastic/dist/vue-uganttastic.css';

  /* Custom */
  .u-grid-line-highlighted {
    background: #ffb0b0 !important;
  }
</style>
```

## Props

| Prop                 | Type            | Default                                | Description                                                      |
| -------------------- | --------------- | -------------------------------------- | ---------------------------------------------------------------- |
| allow-add            | `Boolean`       | `true`                                 | allow to add new bar on double click                             |
| axis                 | `Array<Object>` | `[]`                                   | axis                                                             |
| bar-config-key       | `String`        | `config`                               |                                                                  |
| bar-start-key        | `String`        | `start`                                | property name of the bar objects that represents the start units |
| bar-end-key          | `String`        | `end`                                  | property name of the bar objects that represents the end units   |
| grid                 | `Boolean`       | `false`                                | hide/show grid                                                   |
| grid-size            | `Number`        | `30`                                   | horizontal cell width in pixels                                  |
| default-bar-length   | `Number`        | `1`                                    |                                                                  |
| height               | `String`        | -                                      | the total height of the entire Vue-Ganttastic component          |
| hide-timeaxis        | `Boolean`       | `false`                                | hide timeaxis                                                    |
| highlighted          | `Array<Number>` | `[]`                                   |                                                                  |
| is-magnetic          | `Boolean`       | -                                      | magnetic effect                                                  |
| min-gap-between-bars | `Number`        | `0`                                    |                                                                  |
| no-tooltip           | `Boolean`       | `false`                                | hide/show bar tooltip                                            |
| push-on-overlap      | `Boolean`       | -                                      |                                                                  |
| row-height           | `Number`        | `40`                                   |                                                                  |
| row-label-width      | `Number`        | `200`                                  | label width in pixels                                            |
| snap-back-on-overlap | `Boolean`       | -                                      |                                                                  |
| theme                | `String`        | `default`                              |                                                                  |
| tooltip-format       | `String`        | `{start} - {end} duration: {duration}` |                                                                  |
| width                | `String`        | `100%`                                 | the total width of the entire Vue-Ganttastic component           |

## Contributing

Pull requests are warmly welcomed, while every major change or proposal ought to be discussed in an issue first.
As the project is still new, I will gladly accept suggestions, proposals, contributions etc.

### Contributing - How to run the project

1. Clone the project
2. Install the Vue CLI service, if you don't already have it installed:
   ```
   npm install -g @vue/cli
   ```
3. `App.vue` is a dedicated Vue SFC where all Vue-UGanttastic features can be
   played around with and tested out. Get it running using:
   ```
   npm run serve
   ```

## License

[MIT](https://choosealicense.com/licenses/mit/)
