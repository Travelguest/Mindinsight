<!--
Copyright 2019-2021 Huawei Technologies Co., Ltd.All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->
<template>
  <div class="min-map-container">
    <div id="min-map"
         ref="miniMap"
         :style="{width: `${container.width}px`, height: `${container.height}px`}">
      <svg>
        <g>
          <rect :width="container.width"
                :height="container.height"
                :transform="`translate(${maskPosition.x},${maskPosition.y}) scale(${maskPosition.k})`">
          </rect>
        </g>
      </svg>
      <canvas ref="canvas"
              :width="container.width"
              :height="container.height"></canvas>
    </div>
  </div>
</template>
<script>
import {GRAPH_STYLE, MARKER} from '../js/const';
export default {
  props: {
    graph: Object,
  },
  data() {
    return {
      container: {
        width: 0,
        height: 0,
      },
      resourceSvgSize: {
        width: 0,
        height: 0,
      },
      miniMapSize: {
        width: 0,
        height: 0,
        scale: 1,
        x: 0,
        y: 0,
      },
      mappingScale: 4, // 大图和小图的比例
      maskPosition: {
        x: 0,
        y: 0,
        k: 1,
      },
      configPadding: 12, // elk插件默认设置的偏移量
      boxPadding: 4,
      scaleParam: 1, // 大小图scale的关联参数
    };
  },
  mounted() {
    this.$bus.$on('zooming', this.setMaskPosition);
  },
  methods: {
    init() {
      this.initMap();
      this.setMaskPosition();
      this.initEvents();
    },
    setTransSvg() {
      const outputSvg = this.graph.$el.querySelector('svg>svg');
      const svgDom = outputSvg.cloneNode(true);
      const {width, height} = outputSvg.getBoundingClientRect();
      const svgSize = {width: width / this.graph.scale, height: height / this.graph.scale};
      this.resourceSvgSize = svgSize;

      const scale = Math.max(svgSize.width / this.container.width, svgSize.height / this.container.height);
      this.miniMapSize.width = svgSize.width / scale;
      this.miniMapSize.height = svgSize.height / scale;
      this.miniMapSize.scale = scale;
      this.miniMapSize.x = Math.max(0, (this.container.width - this.miniMapSize.width + this.boxPadding) / 2);
      this.miniMapSize.y = Math.max(0, (this.container.height - this.miniMapSize.height + this.boxPadding) / 2);
      // 通过大小图比例等式简化来的
      this.scaleParam = this.mappingScale / this.miniMapSize.scale;

      const style = document.createElement('style');
      style.innerHTML = GRAPH_STYLE;
      svgDom.append(style);
      const marker = document.createElement('marker');
      svgDom.insertBefore(marker, svgDom.querySelector('*'));
      marker.outerHTML = MARKER;

      svgDom.setAttribute('width', svgSize.width + this.boxPadding * 2);
      svgDom.setAttribute('height', svgSize.height + this.boxPadding * 2);
      const transform = `translate(${-this.configPadding},${-this.configPadding}) scale(1)`;
      svgDom.querySelector('g').setAttribute('transform', transform);

      const labelDoms = Array.from(svgDom.querySelectorAll('foreignObject'));
      for (let obj of labelDoms) {
        obj.parentNode.removeChild(obj);
        obj = null;
      }
      return svgDom;
    },
    initMap() {
      if (!this.container.width || !this.container.height) {
        const container = this.graph.$el.querySelector('svg');
        const {width, height} = container.getBoundingClientRect();
        this.container = {width: width / this.mappingScale, height: height / this.mappingScale};
      }

      const svgDom = this.setTransSvg();
      const svgXml = new XMLSerializer().serializeToString(svgDom);
      const svg = new Blob([svgXml], {type: 'image/svg+xml;charset=utf-8'});

      const domUrl = self.URL || self;
      const url = domUrl.createObjectURL(svg);

      const image = new Image();
      image.onload = () => {
        const canvas = this.$refs.canvas;
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, this.container.width, this.container.height);
        context.drawImage(
            image,
            0,
            0,
            this.resourceSvgSize.width,
            this.resourceSvgSize.height,
            this.miniMapSize.x,
            this.miniMapSize.y,
            this.miniMapSize.width - this.boxPadding,
            this.miniMapSize.height - this.boxPadding,
        );
      };
      image.src = url;
    },

    setMaskPosition() {
      /**
       * 1、小图的宽高为this.miniMapSize.width和this.miniMapSize.height
       *    (宽度等于this.container.width或高度this.container.height)，
       *    大图与小图的长宽比例为this.miniMapSize.scale（在大图没放大缩小的情况下）;
       * 2、当大图没放大缩小时，小图蒙层的初始k值为this.scaleParam；
       * 3、大图里svg的偏移量为this.graph.x，放大倍数为this.graph.scale,
       *    则相当于大图没放大时偏移 this.graph.x/this.graph.scale，记为x1;
       * 4、当大图偏移x1时，小图蒙层的偏移量为x1/this.miniMapSize.scale
       * 5、再算上大图初始偏移量和小图初始偏移量
       */
      this.maskPosition.k = this.scaleParam / this.graph.scale;
      this.maskPosition.x =
        -(this.graph.x / this.graph.scale + this.configPadding) / this.miniMapSize.scale + this.miniMapSize.x;
      this.maskPosition.y =
        -(this.graph.y / this.graph.scale + this.configPadding) / this.miniMapSize.scale + this.miniMapSize.y;
    },
    initEvents() {
      const miniMap = this.$refs.miniMap;
      const mapRect = miniMap.getBoundingClientRect();
      const position = {start: {x: 0, y: 0}};
      const change = {x: 0, y: 0};
      let enableDraged = false;
      let eventTimer = null;
      const delay = 200;
      const moveFun = this.$parent.$refs.graphContainer.move;
      const moveGraph = () => {
        const x =
          ((-this.maskPosition.x + this.miniMapSize.x) * this.miniMapSize.scale - this.configPadding) *
            this.graph.scale -
          this.graph.x;
        const y =
          ((-this.maskPosition.y + this.miniMapSize.y) * this.miniMapSize.scale - this.configPadding) *
            this.graph.scale -
          this.graph.y;

        moveFun(x, y);
      };

      miniMap.onmousedown = (event) => {
        enableDraged = true;
        position.start.x = event.x;
        position.start.y = event.y;
        const maskCenter = {
          x: this.maskPosition.x + (this.container.width * this.maskPosition.k) / 2,
          y: this.maskPosition.y + (this.container.height * this.maskPosition.k) / 2,
        };
        this.maskPosition.x += event.x - mapRect.x - maskCenter.x;
        this.maskPosition.y += event.y - mapRect.y - maskCenter.y;
        moveGraph();
      };
      miniMap.onmouseup = () => {
        enableDraged = false;
      };
      miniMap.onmouseleave = () => {
        enableDraged = false;
      };
      miniMap.onmousemove = (event) => {
        if (enableDraged) {
          change.x = event.x - position.start.x;
          change.y = event.y - position.start.y;
          position.start.x = event.x;
          position.start.y = event.y;
          this.maskPosition.x += change.x;
          this.maskPosition.y += change.y;

          if (eventTimer) clearTimeout(eventTimer);
          eventTimer = setTimeout(moveGraph, delay);
        }
      };
    },
  },
  destroyed() {
    this.$bus.$off('zooming');
    const miniMap = this.$refs.miniMap;
    if (miniMap) {
      miniMap.onmousedown = miniMap.onmouseup = miniMap.onmouseleave = miniMap.onmousemove = null;
    }
  },
};
</script>
<style scoped>
.min-map-container {
  border: 1px solid black;
  position: absolute;
  bottom: 12px;
  right: 264px;
}
.min-map-container #min-map {
  background-color: white;
  position: relative;
}
.min-map-container #min-map svg {
  position: absolute;
  width: 100%;
  height: 100%;
}

.min-map-container #min-map svg g rect {
  fill: #5b88f1;
  fill-opacity: 0.3;
  stroke-width: 0;
  cursor: move;
}
</style>
