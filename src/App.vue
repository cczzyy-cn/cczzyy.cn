<script setup lang="ts">
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup
import { NMessageProvider } from 'naive-ui'
import Layout from "/@/layout/index.vue";

document.body.style.fontSize = '12px'

</script>
  
<template>
  <NMessageProvider>
    <Layout></Layout>
  </NMessageProvider>
</template>
  
<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: 'Consolas', 'Monaco', 'Andale Mono', 'Ubuntu Mono', 'monospace';
}

#app {
  width: 100%;
  height: 100vh;
}

a {
  text-decoration: none;
  color: #708090;
}

a:hover {
  color: cornflowerblue;
}

img {
  box-shadow: 2px 2px 8px rgba(20, 20, 20, 0.4);
}

img:hover {
  box-shadow: 2px 2px 10px rgba(20, 20, 20, 0.6);
}
</style>
  