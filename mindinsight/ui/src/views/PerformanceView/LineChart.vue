<template>
  <div class="line-chart-container" ref='line-chart-container'>
    <div id="line-chart">123123211321</div>
  </div>
</template>

<script>
import * as d3 from "d3";

export default {
  name: "LineChart",
  props: {
    overViewData: Object,
  },
  components: {},
  data() {
    return {
      svg: null,
      margin: { top: 52, right: 40, bottom: 20, left: 35 },
      width: 0,
      height: 0,
    };
  },
  watch: {
    overViewData: function() {
    console.log('overViewData2:',this.overViewData);
      // this.renderUpdate();
    },
  },
  mounted() {
    console.log('overViewData1:',this.overViewData);
    console.log('line-chart-container',this.$refs['line-chart-container']);
    // this.renderInit();
    // this.renderUpdate();
  },
  computed: {
    innerWidth() {
      return this.width - this.margin.left - this.margin.right;
    },
    innerHeight() {
      return this.height - this.margin.top - this.margin.bottom;
    },
    xScale() {
      return d3
        .scaleTime()
        .domain([this.date[0], this.date[this.date.length - 1]])
        .range([0, this.innerWidth])
        .nice();
    },
    yScale() {
      return d3
        .scaleLinear()
        .range([this.innerHeight, 0])
        .nice();
    },
    linePath() {
      let path = d3
        .line()
        .curve(d3.curveCatmullRom)
        .x((d, i) => this.xScale(this.date[i]));
      if (this.nowTag[0] === "close") {
        return path.y((d) => this.yScale(d.close));
      } else if (this.nowTag[0] === "pct") {
        return path.y((d) => this.yScale(d.pct));
      } else {
        return path.y((d) => this.yScale(d.pct));
      }
    },
    colorScale() {
      return d3
        .scaleOrdinal()
        .domain(this.keys)
        .range(["rgba(80,161,255,0.30)", "#FE6AAC"]);
    },
  },
  methods: {
    renderInit() {
      this.svg = d3
        .select('line-chart')
        .append("svg")
        .attr("width", this.width)
        .attr("height", this.height)
        .attr("viewBox", [0, 0, this.width, this.height])
        .append("g")
        .attr("transform", `translate(${this.margin.left},${this.margin.top})`);
    },

    renderUpdate() {
      //date数据处理
      this.date = this.preprocessedData.date.map((d) => new Date(d));
      console.log("preprocessedData:", this.preprocessedData);
      if (this.title === "Stock") {
        this.keys = [this.stockA, this.stockB];
        this.dataA = this.preprocessedData[this.stockA];
        this.dataB = this.preprocessedData[this.stockB];
      } else {
        this.keys = [
          this.preprocessedData.index_name,
          this.preprocessedData.stock_name,
        ];
        this.dataA = this.preprocessedData.index; //其余的dataA存储index
        this.dataB = this.preprocessedData.stock; //其余的dataB存储stock

        this.dataA = this.dataA.map((d) => {
          return {
            close: d["close"],
            pct: d["pct"] * 100,
          };
        });
        // console.log("index:", this.dataA);
      }
      this.svg.selectAll("g").remove();
      // Add X axis
      this.svg
        .append("g")
        .attr("class", "xAxis")
        .call(
          d3.axisBottom(this.xScale)
          // .ticks(10)
        )
        .attr("transform", `translate(0,${this.innerHeight})`);
      // .select(".domain")
      // .remove();
      this.svg
        .select(".xAxis")
        .selectAll(".tick text")
        .style("font-size", "13px")
        .style("font-family", "PingFangSC-Regular")
        .style("letter-spacing", "-0.08px")
        .style("color", "#546E7A");

      //画y轴——左边dataA的

      if (this.nowTag[0] === "close") {
        // this.yScale.domain(d3.extent(this.dataA, (d) => d.close));
        this.yScale.domain([
          d3.min(this.dataA, (d) => d.close) * 0.8,
          d3.max(this.dataA, (d) => d.close) * 1.2,
        ]);
      } else if (this.nowTag[0] === "pct") {
        // this.yScale.domain(d3.extent(this.dataA, (d) => d.pct));

        let min = d3.min(this.dataA, (d) => d.pct);
        if (min < 0) {
          this.yScale.domain([
            min * 1.2,
            d3.max(this.dataA, (d) => d.pct) * 1.2,
          ]);
        } else {
          this.yScale.domain([
            min * 0.8,
            d3.max(this.dataA, (d) => d.pct) * 1.2,
          ]);
        }
      } else {
        //只要左边的轴——指数和股票评选得到的
        let min = Math.min(
          d3.min(this.dataA, (d) => d.pct),
          d3.min(this.dataB, (d) => d.pct)
        );
        let max = Math.max(
          d3.max(this.dataA, (d) => d.pct),
          d3.max(this.dataB, (d) => d.pct)
        );
        if (min < 0) {
          this.yScale.domain([min * 1.2, max * 1.2]);
        } else {
          this.yScale.domain([min * 0.8, max * 1.2]);
        }
      }

      this.svg
        .append("g")
        .attr("id", "yAxis_A")
        .call(
          d3.axisLeft(this.yScale).tickSizeOuter(0)
          // .tickFormat(d3.format("~s"))
          //.ticks(6)
          // .tickFormat(d3.format(".0%")).ticks(5)
          // .ticks(d3.timeYear.every(2))
          // .tickValues([2010,2020])
          // .tickSize(this.innerHeight / 2 - 3)
        );
      // .select(".domain")
      // .remove();
      this.svg
        .select("#yAxis_A")
        .selectAll(".tick text")
        .style("font-family", "Helvetica")
        .style("font-size", "10px")
        .style("color", "#546E7A");

      let curveChart = this.svg.append("g");
      curveChart
        .append("g")
        .append("path")
        .attr("class", "line_path_A")
        .attr("d", this.linePath(this.dataA))
        .attr("fill", "none")
        .attr("stroke-width", 1.5)
        .attr("stroke", "#7D5BB2");

      //右侧的Y轴
      if (this.nowTag[0] === "close") {
        // this.yScale.domain(d3.extent(this.dataB, (d) => d.close));
        this.yScale.domain([
          d3.min(this.dataB, (d) => d.close) * 0.8,
          d3.max(this.dataB, (d) => d.close) * 1.2,
        ]);
      } else if (this.nowTag[0] === "pct") {
        // this.yScale.domain(d3.extent(this.dataB, (d) => d.pct));\
        let min = d3.min(this.dataB, (d) => d.pct);
        if (min < 0) {
          this.yScale.domain([
            min * 1.2,
            d3.max(this.dataB, (d) => d.pct) * 1.2,
          ]);
        } else {
          this.yScale.domain([
            min * 0.8,
            d3.max(this.dataB, (d) => d.pct) * 1.2,
          ]);
        }
      }
      
      if (this.nowTag[0] === "close" || this.nowTag[0] === "pct") {
        this.svg
          .append("g")
          .attr("id", "yAxis_B")
          .call(
            d3.axisRight(this.yScale).tickSizeOuter(0)
            //  .ticks(6)
          )
          .attr("transform", `translate(${this.innerWidth},0)`);
        // .select(".domain")
        // .remove();

        this.svg
          .select("#yAxis_B")
          .selectAll(".tick text")
          .style("font-family", "Helvetica")
          .style("font-size", "10px")
          .style("color", "#546E7A");
      }

      if (this.nowTag[0] === "log" || this.nowTag[0] === "pct") {
        curveChart
          .append("line")
          .attr("x1", 15)
          .attr("y1", this.yScale(0))
          .attr("x2", this.innerWidth - 15)
          .attr("y2", this.yScale(0))
          .style("stroke", "#D4D4D4")
          .style("stroke-width", 1.5);
        // .attr("stroke-dasharray", "1,1");
      }
      // curveChart
      //   .append("rect")
      //   .attr("class", "zero")
      //   .attr("x", 15)
      //   .attr("y", this.yScale(0))
      //   .attr("width", this.innerWidth -15)
      //   .attr("height", 1)
      //   // .attr("stroke", "#D4D4D4")
      //   .attr("opacity", 0.2)
      //  .attr("stroke-dasharray", "1,1")

      curveChart
        .append("g")
        .append("path")
        .attr("class", "line_path_B")
        .attr("d", this.linePath(this.dataB))
        .attr("fill", "none")
        .attr("stroke-width", 2)
        .attr("stroke", "#B25B65");

      // legend
      this.svg
        .append("g")
        .selectAll(".legend")
        .data(this.keys)
        .enter()
        .append("rect")
        .attr("class", "legend")
        .attr("x", (d, i) => 335 + i * 200)
        .attr("y", -27)
        .attr("height", "3px")
        .attr("width", "30px")
        .style("fill", function(d, i) {
          if (i == 0) return "#7D5BB2";
          //左配色
          else return "#B25B65"; //右配色
          // if (i == 0) return "red";
          // else return "blue";
        });

      this.svg
        .selectAll(".labels")
        .data(this.keys)
        .enter()
        .append("text")
        .attr("class", "labels")
        .attr("x", (d, i) => 375 + i * 200)
        .attr("y", -24)
        .style("fill", "#9F9F9F")
        .style("font-family", "PingFangSC-Medium")
        .style("font-size", "14px")
        .style("letter-spacing", "-0.18px")
        .text((d) => d)
        .attr("text-anchor", "left")
        .style("alignment-baseline", "middle");

      //删除刻度线
      // this.svg.selectAll(".tick line").remove();

      //timebrush
      // let brush = d3
      //   .brushX()
      //   .extent([
      //     [0, -this.margin.top + 65],
      //     [this.innerWidth, this.innerHeight],
      //   ])
      //   .on("end", this.updateDate);
      // this.svg.append("g").attr("class", "brush").call(brush);
    },
  },
};
</script>

<style scoped>
.line-chart-container {
  height: 100%;
  width: 100%;
  /* border: 1px solid red; */
}
/* #line_chart {
  height: 253px;
  width: 100%;
} */
</style>
