import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Decimation,
} from 'chart.js';
import { applyChartJsGlobalFont } from './chartTheme';

let registered = false;

export function ensureChartsRegistered() {
  if (registered) return;
  ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    Decimation
  );
  applyChartJsGlobalFont(ChartJS);
  registered = true;
}

ensureChartsRegistered();

export { ChartJS };
