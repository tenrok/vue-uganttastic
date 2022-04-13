import UGanttChart from './components/UGanttChart.vue'
import UGanttRow from './components/UGanttRow.vue'
import './scss/index.scss'

const UGantt = { UGanttChart, UGanttRow }

const install = Vue => {
  Object.keys(UGantt).forEach(name => {
    Vue.component(name, UGantt[name])
  })
}

if (typeof window !== 'undefined' && window.Vue) {
  install(window.Vue)
}

export default UGantt

export { UGanttChart, UGanttRow }
