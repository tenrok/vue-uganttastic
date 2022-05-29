import { createApp } from 'vue'
import App from './App.vue'
import { UGanttChart, UGanttRow } from '../lib'

//Vue.config.productionTip = false

createApp(App).component('UGanttChart', UGanttChart).component('UGanttRow', UGanttRow).mount('#app')

