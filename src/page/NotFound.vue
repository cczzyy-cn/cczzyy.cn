<script setup lang="ts">

</script>

<template>
    <div id="NotFound">
        <div class="NotFound_box">
            <div id="top_box">
                <div class="top_title">
                    <a href="/">cczzyy.cn</a>
                </div>

            </div>
            <div class="top_title">
                <span style="font-size: 6rem;">404</span> 没有找到页面
            </div>
        </div>

    </div>
</template>

<style scoped>
#NotFound {
    width: 100%;
    height: 100%;
    display: flex;
    padding: 10px;
    justify-content: center;
}

.NotFound_box {
    width: 1080px;
    height: 100%;
}

#top_box {
    display: flex;
    margin-bottom: 20px;
}

.top_title {
    font-size: 3rem;
    color: #708090;
    font-family: Consolas, Monaco, Andale Mono, Ubuntu Mono, monospace;
}
</style>
