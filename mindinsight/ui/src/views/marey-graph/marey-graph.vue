<template>
  <div class="marey-graph">
    <svg-wrapper :ref="SVG_NAME">
      <template v-slot:image>
        <defs>
          <clipPath id="myClip">
            <rect x="-3" y="-3" width="100%" height="100%" />
          </clipPath>
        </defs>
        <g class="marey-graph" :transform="`translate(${margin.left}, ${margin.top})`">
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

           <g clip-path="url(#myClip)">
              <template v-for="(path, i) in pathArr">
                <path 
                  :key="i"
                  :d="path"
                  fill="none"
                  stroke="#ccc"
                />
              </template>

              <!-- <g v-for="(value, key) in data" :key="key">
                <circle
                  v-for="{ts, i} in value"
                  :key="i"
                  :cx="zoomedXScale(ts)"
                  :cy="yScale(key)"
                  r="3"
                  fill="#ffcd42"
                  opacity="0.2"
                />
              </g> -->
            </g> 
          </g>
        </g>
      </template>
    </svg-wrapper>

    <!-- <canvas
      ref="$canvas"
      :width="width"
      :height="height"
    /> -->
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
    maxValue = Math.max(maxValue, data[data.length-1].ts);
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
  mixins: [getBound],

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
      dataByName: {},
      pathArr: [],
      mousePos: 70,
      zoomedXScale: null
    };
  },

  mounted() {
    RequestService.getTimelineData()
      .then(
        (res) => {
          if(res && res.data) {
            const data = res.data.data;

            const yScale = d3.scaleBand()
              .domain(Object.keys(data).sort((a,b) => a < b ? -1: 1))
              .range([0, this.heightMap]);
            const xScale = d3.scaleLinear()
              .domain([minTime(Object.values(data)), maxTime(Object.values(data))])
              .range([0, this.widthMap])
            
            this.zoomedXScale = xScale;

            this.xScale = xScale;
            this.yScale = yScale;
            this.data = data;
            this.dataByName = this.getItemsByName(data);

            const modify = debounce(this.modifyTransfrom, 200);
            const that = this;

            this.$nextTick(() => {
              this.transformToPath()

              d3.select(this.$refs[SVG_NAME].$refs.$svg)
                .call(
                  d3.zoom().scaleExtent([1,100])
                  .on('zoom', function() {
                    const transform = d3.event.transform;
                    
                    modify(transform);
                    that.mousePos = d3.event.sourceEvent.offsetX;
                  })
                );

              // this.draw()
            })
          }
        },
        (err) => {
          console.log(err);
        },
      )
  },

  watch: {
    transform() {
      this.transformToPath();
      // this.draw()
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

    // ctx() {
    //   return this.$refs.$canvas.getContext('2d');
    // }
  },

  methods: {
    // modify transform and update xScale
    modifyTransfrom(v) {
      const {zoomedXScale, transform, mousePos, margin: {left}, xScale} = this;
      let updateScale = v.rescaleX(xScale);

      if(transform.k === v.k) {
        this.zoomedXScale = updateScale;
      } else {
        let value = zoomedXScale.invert(mousePos-left);
        let updateValue = updateScale.invert(mousePos-left);

        this.zoomedXScale = d3.scaleLinear()
          .range([0, this.widthMap])
          .domain(updateScale.domain().map(d => d+(-updateValue+value) ))
      }
      this.transform = v;
    },
    getItemsByName(data) {
      const nameMap = {};
      const keys = this.yScale.domain();

      for(let key of keys) {
        let value = data[key];

        for(let {ts, name} of value) {
          if(name.indexOf('AllReduce') > -1 || name.indexOf('AllGather') > -1 
            || name.indexOf('ReduceScatter') > -1 || name.indexOf('BroadCast') > -1
          ) {
            if(nameMap[name]) {
              if(nameMap[name][key]) {
                nameMap[name][key].push({
                  x: ts,
                  y: key
                })
              } else {
                nameMap[name][key] = [{
                  x: ts,
                  y: key
                }]
              }
             
            } else {
              nameMap[name] = {
                [key]: [{
                  x: ts,
                  y: key
                }]
              }
            }
          }
        }
      }

      // console.log(nameMap)

      let resultArr = [];
      for(let key in nameMap) {
        let value = nameMap[key];

        if(Object.keys(value).length > 1) {
          const valuesArr = Object.values(value);
          const v = valuesArr.reduce((acc, cur) => Math.min(acc, cur.length), Number.MAX_VALUE);
          for(let i=0; i<v; ++i) {
            resultArr.push(valuesArr.map(arr => arr[i]))
          }
          // console.log(valuesArr);
        }
      }
      // return Object.values(nameMap).filter(valueArr => Object.keys(valueArr).length > 1);
      return resultArr
    },
    
    transformToPath() {
      const {dataByName, zoomedXScale, yScale} = this;

      this.pathArr = dataByName.map(arr => {
        let {x: startX, y:startY} = arr[0];
        let path = `M ${zoomedXScale(startX)} ${yScale(startY)}`;

        for(let i=1; i < arr.length; i++) {
          let {x,y} = arr[i];
          path += `L ${zoomedXScale(x)} ${yScale(y)}`
        }

        return path;
      })
    },

    draw() {
      this.ctx.clearRect(0,0,this.width, this.height);

      this.drawLines();
      this.drawPoints();
    },
    drawPoints() {
      const {ctx, data, zoomedXScale, yScale, margin, width, height} = this;

      ctx.save();

      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';

      for(let key in data) {
        let value = data[key];

        let y =yScale(key) +yScale.bandwidth()/2 + margin.top-1;
        for(let {ts} of value) {
          let x = zoomedXScale(ts)+margin.left-1;
          ctx.moveTo(x, y);

          ctx.beginPath();
          ctx.arc(x,y,3,0,2*Math.PI);
          ctx.closePath();

          ctx.fill();
          ctx.stroke();
        }
      }
      ctx.restore();
    },
    drawLines() {
      const {ctx, dataByName, zoomedXScale, yScale, margin} = this;
      ctx.strokeStyle = 'rgba(128,128,128,0.5)';
      // ctx.translate(0.5, 0.5);
      for(let item of dataByName) {
        let {x: startX, y:startY} = item[0];
        ctx.moveTo(zoomedXScale(startX) + margin.left, yScale(startY) + margin.top +yScale.bandwidth()/2);

        for(let i=1; i < item.length; i++) {
          let {x,y} = item[i];
          ctx.lineTo(
            zoomedXScale(x) + margin.left,
            yScale(y) + margin.top +yScale.bandwidth()/2
          )
        }
        ctx.stroke();
      }
    }
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