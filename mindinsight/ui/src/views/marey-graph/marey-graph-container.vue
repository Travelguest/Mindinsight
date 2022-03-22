<template>
  <div class="parallel-page">
    <div class="strategy-view">
      <div class="view-header">
        <div class="view-title-bg">
          <h1 class="view-title-name" id="parallel-title">
            Parallel Strategy View
          </h1>
        </div>
        <LegendStrategy />
      </div>
      <profile-graph />
      <AttributePanel />
    </div>
    <div class="configuration-view">
      <configure-view />
    </div>
    <div class="performance-view">
      <PerformanceView />
    </div>
  </div>
</template>

<script>
// import GraphContainer from './ELKGraph/graph-container.vue';
import ProfileGraph from "../profile-graph/profile-graph.vue";
import AttributePanel from "../profile-graph/attribute-panel.vue";
import PerformanceView from "../PerformanceView/PerformanceViewContainder.vue";
import ConfigureView from "../configure-view/configure-view.vue";
import LegendStrategy from "../profile-graph/legend-strategy.vue";

export default {
  components: {
    // GraphContainer,
    ProfileGraph,
    PerformanceView,
    ConfigureView,
    LegendStrategy,
    AttributePanel,
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
    "configuration parallel-strategy" 1fr
    "performance performance" 1fr
    /16% 84%;
  grid-gap: 3px;
}

/* .communication-view {
  background: #fff;
  grid-area: communication;
  height: 340px;
} */
.strategy-view {
  background: #fff;
  grid-area: parallel-strategy;
  height: 100%;
}
.configuration-view {
  background: #fff;
  grid-area: configuration;
}
.performance-view {
  background: #fff;
  grid-area: performance;
}
.view-title-bg {
  border-top: 35px solid #838383;
  border-right: 50px solid transparent;
  width: 220px;
  /* position: relative;
    float: left; */
}
.view-title-name {
  color: #ffffff;
  font-size: 16px;
  line-height: 35px;
  margin-top: -35px;
  padding-left: 10px;
  margin-bottom: 0;
}
.view-header {
  display: flex;
}
</style>
