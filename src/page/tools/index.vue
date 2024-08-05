<script setup lang="ts">
import { reactive } from "vue";
import ImageToText from "/@/components/ImageToText.vue"
import HandleCSV from "/@/components/HandleCSV.vue"


</script>
    
<template>
    <div id="tools">
        <HandleCSV></HandleCSV>
        <ImageToText></ImageToText>
    </div>
</template>
    
<style>
#tools {
    padding: 10px;
    display:flex;
}
#tools div{
    margin:10px;
}
</style>
    