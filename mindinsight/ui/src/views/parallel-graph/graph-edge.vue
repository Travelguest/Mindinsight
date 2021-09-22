<template>
  <g :class="parentClass" class="no-fill" :opacity="edgeOpacity">
    <g v-for="edge in edges" :key="edge.id" :class="edge.outline ? 'outline' : ''">
      <polyline :points="edge.points" :marker-end="`url(#${markerEndId})`" v-animate:opacity="1" />
    </g>
  </g>
</template>

<script>
import {animateDirective} from '@/views/parallel-graph/graph-nodes/animate-directive';

export default {
  props: {
    parentClass: String,
    edges: Array,
    markerEndId: String,
    edgeOpacity: {
      type: Number,
      default: 1,
    },
  },

  directives: {
    animate: animateDirective,
  },
};
</script>

<style scoped>
.graph-stroke-search {
  stroke: var(--search-graph-color);
  stroke-width: var(--active-stroke-width);
}

.graph-stroke-hover {
  stroke: var(--hightlight-graph-color);
  stroke-width: var(--active-stroke-width);
}

.no-fill {
  fill: none;
}
</style>
