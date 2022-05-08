import Vue from 'vue';
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import { VuePlugin } from 'vuera'
import Web3 from 'web3'

import App from './App.vue';

Vue.use(ElementUI);
Vue.use(VuePlugin)

Vue.config.productionTip = false
Vue.prototype.Web3 = Web3
new Vue({
  render: h => h(App),
}).$mount('#app')
