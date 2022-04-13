import Vue from 'vue'
import App from './App.vue'
import { UGanttChart, UGanttRow } from '../lib'

Vue.component('UGanttChart', UGanttChart)
Vue.component('UGanttRow', UGanttRow)

Vue.config.productionTip = false

new Vue({
  render: h => h(App)
}).$mount('#app')
