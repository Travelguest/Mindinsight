<template>
  <div class="parallel-page">
    <div></div>
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
import MareyGraphContainer from './marey-graph.vue';
import ProfileGraph from '../profile-graph/profile-graph.vue';

export default {
  components: {
    // GraphContainer,
    MareyGraphContainer,
    ProfileGraph,
  },

  data() {
    return {
      margin: {left: 100, top: 20, right: 30, bottom: 20},
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
    grid-template-rows: 40% auto;
  }
</style>
