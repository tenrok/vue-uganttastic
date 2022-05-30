import { createApp } from 'vue'
import App from './App.vue'
import { UGanttChart } from '../lib'

//Vue.config.productionTip = false

createApp(App).component('UGanttChart', UGanttChart).mount('#app')

