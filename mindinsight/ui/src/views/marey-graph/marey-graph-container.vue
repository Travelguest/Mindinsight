<template>
  <div class="parallel-page">
    <div class="communication-view">
      <communication-view-graph />
    </div>
    <div class="strategy-view">
      <profile-graph />
    </div>
    <div class="configuration-view"><configure-view /></div>
    <div class="performance-view">
      <!-- <marey-graph-container /> -->
      <PerformanceView />
    </div>
  </div>
</template>

<script>
// import GraphContainer from './ELKGraph/graph-container.vue';
import MareyGraphContainer from "./marey-graph.vue";
import ProfileGraph from "../profile-graph/profile-graph.vue";
import PerformanceView from "../PerformanceView/PerformanceViewContainder.vue";
import CommunicationViewGraph from "../communication-view/communication-view-graph.vue";
import ConfigureView from "../configure-view/configure-view.vue";

export default {
  components: {
    // GraphContainer,
    MareyGraphContainer,
    ProfileGraph,
    PerformanceView,
    CommunicationViewGraph,
    ConfigureView,
  },

  data() {
    return {
      margin: { left: 100, top: 20, right: 30, bottom: 20 },
    };
  },
};
</script>

<style scoped>
.parallel-page {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template:
    "communication parallel-strategy" 1fr
    "configuration parallel-strategy" 1fr
    "configuration performance" 1fr
    "configuration performance" 1fr
    /20% 80%;
  grid-gap: 3px;
}

.communication-view {
  background: #fff;
  grid-area: communication;
}
.strategy-view {
  background: #fff;
  grid-area: parallel-strategy;
}
.configuration-view {
  background: #fff;
  grid-area: configuration;
}
.performance-view {
  background: #fff;
  grid-area: performance;
}
</style>
