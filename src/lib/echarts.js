/* Shared ECharts instance for Meridian's Kumo charts.
   Kumo's TimeseriesChart and custom Chart take the ECharts core as a
   prop so the consumer controls which modules are bundled. Register
   only what Meridian's three charts use: line (Requests over time),
   pie (Device donut), bar (Event distribution), plus the grid and
   tooltip components and the canvas renderer. No legend, dataZoom,
   or visualMap modules: Meridian uses its own custom legends and
   no brush selection or maps. */
import * as echarts from 'echarts/core';
import { LineChart, BarChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  LineChart,
  BarChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  CanvasRenderer,
]);

export default echarts;
