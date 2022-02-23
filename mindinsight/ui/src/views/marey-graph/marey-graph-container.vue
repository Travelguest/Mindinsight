<template>
  <div class="parallel-page">
    <div class="left-configure-view">
      <communication-view-graph />
      <configure-view />
    </div>
    <div class="strategy-view">
      <profile-graph />
      <marey-graph-container />
    </div>
    <div></div>
    <div></div>
  </div>
</template>

<script>
// import GraphContainer from './ELKGraph/graph-container.vue';
import MareyGraphContainer from "./marey-graph.vue";
import ProfileGraph from "../profile-graph/profile-graph.vue";
// import CommunicationView from '../communication-view/communication-view-graph.vue';
import CommunicationViewGraph from "../communication-view/communication-view-graph.vue";
import ConfigureView from "../configure-view/configure-view.vue";

export default {
  components: {
    // GraphContainer,
    MareyGraphContainer,
    ProfileGraph,
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
  display: grid;
  grid-template-rows: 80% auto;
  grid-template-columns: 20% auto;
  grid-gap: 7px;
  width: 100%;
  height: 100%;
}

.parallel-page div {
  background: #fff;
}

.strategy-view {
  display: grid;
  grid-template-rows: 50% auto;
}

.left-configure-view {
  display: grid;
  grid-template-rows: 30% auto;
}
</style>
