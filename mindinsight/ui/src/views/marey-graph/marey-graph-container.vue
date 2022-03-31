<template>
  <div class="parallel-page">
    <div class="strategy-view">
      <div class="view-header">
        <div class="title">Parallelism Strategy View</div>
        <LegendStrategy />
      </div>
      <profile-graph />
      <AttributePanel />
    </div>
    <div class="configuration-view">
      <configure-view />
      <svg
        style="position: absolute; top: 0; right: 0"
        width="1px"
        height="100%"
      >
        <line
          x1="0"
          y1="45"
          x2="0"
          y2="98%"
          z-index="99"
          stroke="#ccc"
          stroke-width="1"
          stroke-dasharray="4"
          stroke-dashoffset="22"
        ></line>
      </svg>
    </div>
    <div class="performance-view">
      <PerformanceView />
    </div>
  </div>
</template>

<script>
import ProfileGraph from "../profile-graph/profile-graph.vue";
import AttributePanel from "../profile-graph/attribute-panel.vue";
import PerformanceView from "../PerformanceView/PerformanceViewContainder.vue";
import ConfigureView from "../configure-view/configure-view.vue";
import LegendStrategy from "../profile-graph/legend-strategy.vue";
import DataMap from "../train-manage/data-map.vue";

export default {
  components: {
    ProfileGraph,
    PerformanceView,
    ConfigureView,
    LegendStrategy,
    AttributePanel,
    DataMap,
  },

  data() {
    return {
      margin: { left: 100, top: 20, right: 30, bottom: 20 },
    };
  },
  created() {
    this.$store.dispatch("getGraphData"); //调用vuex 中的 getGraphData 异步方法
  },
};
</script>

<style scoped>
.parallel-page {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template:
    "configuration parallel-strategy" 50%
    "performance performance" 50%
    /20% 80%;
  /* grid-gap: 1px; */
}

/* .communication-view {
  background: #fff;
  grid-area: communication;
  height: 340px;
} */
.strategy-view {
  position: relative;
  height: 100%;
  background: #fff;
  grid-area: parallel-strategy;
}
.configuration-view {
  position: relative;
  width: 100%;
  height: 100%;
  background: #fff;
  grid-area: configuration;
}
.performance-view {
  background: #fff;
  grid-area: performance;
}

.view-header {
  display: flex;
  justify-content: center;
  align-items: center;
}
.view-header .title {
  width: 300px;
  font-size: 16px;
  font-weight: 500;
  margin-left: 32px;
}
</style>
