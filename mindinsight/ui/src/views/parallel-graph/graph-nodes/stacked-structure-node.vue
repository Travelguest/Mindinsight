<template>
  <g :opacity="opacity" @mouseenter="mouseenterListener" @mouseleave="mouseleaveListener">
    <template v-if="type === nodeType.aggregate_structure_scope">
      <path
        :transform="`translate(${x}, ${y})`"
        :d="`M${width / 2} 0 L${width} ${height / 2} L${width / 2} ${height} L0 ${height / 2} Z`"
        class="graph-common"
        :class="{
          'graph-stroke-click': click,
          'graph-stroke-hover': hover,
          'graph-stroke-search': selected,
          'graph-stroke-focused': focused,
        }"
        fill="#fff"
        v-animate:opacity="1"
        @dblclick="emitDBClickScopeNode($event)"
      />

      <foreignObject
        v-animate:width="width"
        v-animate:height="height"
        v-animate:x="x"
        v-animate:y="y + height / 2 - 8"
        @dblclick="emitDBClickScopeNode($event)"
      >
        <div class="graph-scope-label" :title="label" @dblclick="emitDBClickScopeNode($event)">
          {{ label.split('/').pop() }}
        </div>
      </foreignObject>
    </template>

    <template v-else>
      <rect
        rx="4"
        ry="4"
        v-animate:width="width - padding * 2"
        v-animate:height="height - padding * 2"
        v-animate:x="x + padding * 2"
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
      />
      <rect
        rx="4"
        ry="4"
        v-animate:width="width - padding * 2"
        v-animate:height="height - padding * 2"
        v-animate:x="x + padding"
        v-animate:y="y - padding"
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
      />
      <rect
        rx="4"
        ry="4"
        v-animate:width="width - padding * 2"
        v-animate:height="height - padding * 2"
        v-animate:x="x"
        v-animate:y="y - padding * 2"
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

      <foreignObject v-animate:width="width" v-animate:height="height" v-animate:x="x" v-animate:y="y - 2">
        <div class="graph-scope-label" :title="label" @dblclick="emitDBClickScopeNode($event)">
          {{ label.split('/').pop() }}
        </div>
      </foreignObject>
    </template>
  </g>
</template>

<script>
import graphNodeMixin from './graph-node-mixin';
import {NODE_TYPE} from '../../../js/const';

export default {
  mixins: [graphNodeMixin],

  data: function() {
    return {
      nodeType: NODE_TYPE,
      padding: 2,
    };
  },

  methods: {
    emitDBClickScopeNode(event) {
      this.$emit('dblscopenode', event, {id: this.id, stacked: true});
    },
  },
};
</script>

<style scoped>
.select {
  user-select: none;
}
</style>
