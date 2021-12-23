<template>
  <div class="marey-graph">
    <svg-wrapper :ref="SVG_NAME" id="marey-svg">
      <template v-slot:image>
        <defs>
          <clipPath id="myClip">
            <rect x="-3" y="-3" width="100%" height="100%" />
          </clipPath>
        </defs>
        <g class="marey-graph" id="polygon-g" :transform="`translate(${margin.left}, ${margin.top})`">
          <!-- gridline -->
          <g 
            v-if="gridlineOptions!==null"
            v-axis:left="gridlineOptions"
            class="gridline"
          />
          <g :transform="`translate(0, ${yScale ? yScale.bandwidth()/2: 0})`">
            <g>
              <text v-for="key in Object.keys(data)" :key="key"
                :transform="`translate(${-margin.left + 15}, ${yScale(key)})`"
                dominant-baseline="middle"
              >
                {{key}}
              </text>
            </g>

            <g class="marey-container" clip-path="url(#myClip)">
              <template v-for="(points, key) in polygonData" >
                <polygon  
                  :key="key"
                  :points="points"
                  fill="#92BAD7"
                  stroke="#ccc"
                  stroke-width="0.1"
                />
              </template>
            </g> 
          </g>
        </g>
      </template>
    </svg-wrapper>
  </div>
</template>

<script>
import * as d3 from 'd3';
import {debounce} from 'lodash';
import getBound, { SVG_NAME } from '@/mixins/basic-operation-of-charts/get-bound';
import { axisDirective } from '../directives/axis';
import RequestService from '@/services/request-service';
import svgWrapper from '../svg-wrapper.vue';

const maxTime = (dataArr => {
  let maxValue = 0;
  dataArr.forEach(data => {
    // the last item's timestap
    const {ts, dur} = data[data.length-1];
    maxValue = Math.max(maxValue, ts + dur);
  });

  return maxValue;
})

const minTime = (dataArr => {
  let minValue = Infinity;
  dataArr.forEach(data => {
    // the last item's timestap
    minValue = Math.min(minValue, data[0].ts);
  });
  
  return minValue;
})

export default {
  mixins: [getBound], // 用来获取画布的大小

  directives: {
    axis: axisDirective
  },

  components: {
    svgWrapper,
  },

  data() {
    return {
      SVG_NAME: SVG_NAME,
      margin: {left: 70, top: 10, right: 10, bottom: 10},
      data: {},
      xScale: null,
      yScale: null,
      transform: d3.zoomIdentity,
      pathArr: [],
      polygonData: [],
      displayedData: {},
      mousePos: 70,
      xScale: null
    };
  },

  mounted() {
    RequestService.getTimelineData()
      .then(
        (res) => {
          if(res && res.data) {
            const minT = res.data.minT;
            const maxT = res.data.maxT;
            const operator_time_maps = res.data.maps; 
            console.log(res.data)
            const yScale = d3.scaleBand()
              .domain(Object.keys(operator_time_maps).sort((a,b) => a < b ? -1: 1))
              .range([0, this.heightMap]);
            const xScale = d3.scaleLinear()
              .domain([minT, maxT])
              .range([0, this.widthMap])

            const stepNum = 1;
            
            const displayedData = {};
            Object.keys(operator_time_maps).forEach(deviceName => {
              const curDeviceData = operator_time_maps[deviceName];
              Object.keys(curDeviceData).forEach(op => { // 这里op是算子名
                if (!displayedData[op]) displayedData[op] = [];
                const curOp = curDeviceData[op];
                displayedData[op].push({x1: curOp.st, x2: curOp.ed, y: deviceName});
              })
            })
            console.log(displayedData)
            this.displayedData = displayedData;
            this.xScale = xScale;
            this.yScale = yScale;

            const modify = this.modifyTransfrom;
            const that = this;
            window.d3 = d3;
            window.that = this;
            this.transformToRect()

            // this.$nextTick(() => {
              
              const svgPart = d3.select('#marey-svg');
              const g = d3.select('#polygon-g');

              svgPart.call(
                  d3.zoom()
                  .on('zoom', function() {
                    const transform = d3.event.transform;
                    g.attr("transform", `translate(${transform.x}, 0) scale(${transform.k}, 1)`);
                  })
                );
            // })
          }
        },
        (err) => {
          console.log(err);
        },
      )
  },

  watch: {
    transform() {
      this.transformToRect()
    }
  },

  computed: {
    gridlineOptions() {
      if(this.yScale !== null) {
        return {
          scale: this.yScale,
          inner: -this.widthMap,
          tickFormat: ''
        }
      }
      return null;
    },
  },

  methods: {
    transformToRect() {
      const {displayedData, xScale, yScale} = this;
      Object.keys(displayedData).forEach(op => {
        let points = "";
        const curOpDeviceData = displayedData[op];
        for (let i = 0; i < curOpDeviceData.length; i++) {
          const dt = curOpDeviceData[i];
          points += `${xScale(dt.x1)},${yScale(dt.y)} `;
        }
        for (let i = curOpDeviceData.length - 1; i >= 0; i--) {
          const dt = curOpDeviceData[i];
          points += `${xScale(dt.x2)},${yScale(dt.y)} `;
        }
        this.polygonData.push(points);
      })
    },

    draw() {
      this.ctx.clearRect(0,0,this.width, this.height);
    },
  }
}
</script>

<style>
  .marey-graph {
    border-top: 2px solid #ccc;
    position: relative;
  }

  .marey-graph svg, .marey-graph canvas {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    right: 0;
  }

  #polygon-g {
    width: 100%;
    height: 100%;
  }

  .marey-graph canvas {
    border: 1px solid;
    pointer-events: none;
  }

  /* grid line */
  .marey-graph .gridline .tick line{
    stroke: #ccc;
  }

  .marey-graph .gridline .domain {
    display: none;
  }
</style>