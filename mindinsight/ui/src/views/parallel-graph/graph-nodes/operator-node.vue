<template>
  <g v-animate:opacity="1" @mouseenter="mouseenterListener" @mouseleave="mouseleaveListener">
    <!-- Stacked operator -->
    <!-- <g v-if="outline" :transform="`translate(${x + width + 6}, ${y - 12})`" class="data-parallel-info">
      <rect :width="outline.length * 5" height="10"></rect>
      <text dy="12" dx="1">{{ outline }}</text>
    </g> -->

    <template v-if="type === nodeType.aggregate_scope">
      <ellipse
        :transform="`translate(${x + 20}, ${y + height / 2 + 8})`"
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
        rx="20"
        ry="8"
        @click="emitClickOperatorNode($event)"
        @mouseenter="emitMouseEnterOperatorNode($event)"
        @mouseleave="emitMouseLeaveOperatorNode($event)"
      >
      </ellipse>
      <ellipse
        :transform="`translate(${x + 20}, ${y + height / 2 + 4})`"
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
        rx="20"
        ry="8"
        @click="emitClickOperatorNode($event)"
        @mouseenter="emitMouseEnterOperatorNode($event)"
        @mouseleave="emitMouseLeaveOperatorNode($event)"
      >
      </ellipse>
      <ellipse
        :transform="`translate(${x + 20}, ${y + height / 2})`"
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
        rx="20"
        ry="8"
        @click="emitClickOperatorNode($event)"
        @mouseenter="emitMouseEnterOperatorNode($event)"
        @mouseleave="emitMouseLeaveOperatorNode($event)"
      >
      </ellipse>
      <foreignObject width="40" height="16" v-animate:x="x" v-animate:y="y">
        <div class="graph-scope-label graph-operator-label">
          {{ stackedCount }}
        </div>
      </foreignObject>
    </template>
    <!-- Single operator -->
    <template v-else>
      <ellipse
        :transform="`translate(${x + 20}, ${y + height / 2})`"
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
        rx="20"
        ry="8"
        @dblclick="emitDblClickOperatorNode($event)"
        @mouseenter="emitMouseEnterOperatorNode($event)"
        @mouseleave="emitMouseLeaveOperatorNode($event)"
      >
      </ellipse>
    </template>
    <foreignObject width="80" height="16" v-animate:x="x - 20" v-animate:y="y + height / 2 - 24">
      <div class="graph-scope-label graph-operator-label" :title="label">
        {{ label.split('/').pop() }}
      </div>
    </foreignObject>

    <g :transform="`translate(${x + HALF_SIDE_PADDING}, ${y + 3})`" class="model-parallel" v-if="rects">
      <rect
        v-for="i in rects"
        :key="i"
        :transform="`translate(${(i - 1) * (rectWidth + PADDING)},0)`"
        :width="rectWidth"
        :height="height - 6"
        fill="#a47b73"
      />
    </g>
  </g>
</template>

<script>
import graphNodeMixin from './graph-node-mixin';
import {NODE_TYPE} from '../../../js/const';

const SIDE_PADDING = 12;
const PADDING = 1;

export default {
  mixins: [graphNodeMixin],
  props: {
    stackedCount: Number,
    outline: [String, Number],
    rects: Number,
  },
  data: function() {
    return {
      nodeType: NODE_TYPE,
      HALF_SIDE_PADDING: SIDE_PADDING / 2,
      PADDING,
    };
  },
  methods: {
    emitDblClickOperatorNode(event) {
      // console.log("click operator node");
      this.$emit('dblclickoperatornode', event, {id: this.id});
    },

    emitMouseEnterOperatorNode(event) {
      this.$emit('mouseenteroperatornode', event, {id: this.id});
    },

    emitMouseLeaveOperatorNode(event) {
      this.$emit('mouseleaveoperatornode', event, {id: this.id});
    },
  },
  computed: {
    rectWidth() {
      if (this.rects) {
        return (this.width - SIDE_PADDING - (this.rects - 1) * PADDING) / this.rects;
      }

      return 0;
    },
  },
};
</script>

<style scoped>
.data-parallel-info circle {
  fill: #fff;
}

.data-parallel-info rect {
  /* fill: #5294c2; */
  filter: none;

  fill: #fff;
  stroke: #5294c2;
}
.data-parallel-info text {
  font-size: 14px;
  transform: scale(0.7);
  user-select: none;
}

.model-parallel rect {
  filter: none;
}
</style>
