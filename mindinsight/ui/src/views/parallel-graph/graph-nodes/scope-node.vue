<template>
  <g :opacity="opacity" @mouseenter="mouseenterListener" @mouseleave="mouseleaveListener">
    <rect
      rx="5"
      ry="5"
      v-animate:width="width"
      v-animate:height="height"
      v-animate:x="x"
      v-animate:y="y"
      class="graph-common"
      :class="{
        'graph-stroke-click': click,
        'graph-stroke-hover': hover,
        'graph-stroke-search': selected,
        'graph-stroke-focused': focused,
      }"
      :style="{
        fill: fill,
      }"
      @dblclick="emitDBClickScopeNode($event)"
    />
    <!-- TODO change node type -->
    <rect
      v-if="type === 'computation'"
      v-animate:width="width - PADDING"
      v-animate:height="height"
      v-animate:x="x + PADDING / 2"
      v-animate:y="y"
      class="graph-common"
      :class="{
        'graph-stroke-click': click,
        'graph-stroke-hover': hover,
        'graph-stroke-search': selected,
        'graph-stroke-focused': focused,
      }"
      :style="{
        fill: fill,
        pointerEvents: 'none',
      }"
    />
    <foreignObject v-animate:width="width" height="16" v-animate:x="x" v-animate:y="y">
      <div class="graph-scope-label" :title="label">
        {{ label.split('/').pop() }}
      </div>
    </foreignObject>
  </g>
</template>

<script>
import graphNodeMixin from './graph-node-mixin';

export default {
  mixins: [graphNodeMixin],
  data() {
    return {
      PADDING: 15,
    };
  },
  methods: {
    emitDBClickScopeNode(event) {
      this.$emit('dblscopenode', event, {id: this.id});
    },
  },
};
</script>

<style scoped>
.graph-scope-label {
  font-size: 14px;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: none;
  padding: 0 4px;
}

.graph-common {
  stroke: #000000;
  stroke-width: 1;
}
.graph-stroke-hover {
  stroke: #fd9629;
  stroke-width: 2;
}
.graph-marker-hover {
  stroke: #fd9629;
  fill: #fd9629;
}
.graph-stroke-click {
  stroke: #ff0000;
  stroke-width: 2;
}
.graph-stroke-search {
  stroke: #bd39c2;
  stroke-width: 2;
}
.graph-marker-search {
  stroke: #bd39c2;
  fill: #bd39c2;
}
.graph-stroke-focused {
  stroke: #3952c2;
  stroke-width: 2;
}
</style>
