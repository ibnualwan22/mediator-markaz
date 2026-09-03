"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { useRouter } from 'next/navigation';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  Filler
);

interface DataPoint {
  name: string;
  count: number;
}

interface DashboardChartsProps {
  gelombangData: DataPoint[];
  globalData: DataPoint[];
  periodes: {id: string, nama: string}[];
  selectedPeriodeId: string;
  selectedPeriodeName: string;
}

export default function DashboardCharts({
  gelombangData, 
  globalData,
  periodes,
  selectedPeriodeId, 
  selectedPeriodeName
}: DashboardChartsProps) {
  const router = useRouter();

  const handlePeriodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPeriodeId = e.target.value;
    const params = new URLSearchParams(window.location.search);
    if (newPeriodeId) {
      params.set('periodeId', newPeriodeId);
    } else {
      params.delete('periodeId');
    }
    router.push(`/admin?${params.toString()}`);
  };

  const barChartData = {
    labels: gelombangData.map(d => d.name),
    datasets: [
      {
        label: 'Jumlah Camaba',
        data: gelombangData.map(d => d.count),
        backgroundColor: 'rgba(14, 165, 233, 0.8)', // Primary color
        borderRadius: 8,
      }
    ]
  };

  const lineChartData = {
    labels: globalData.map(d => d.name),
    datasets: [
      {
        fill: true,
        label: 'Total Camaba',
        data: globalData.map(d => d.count),
        borderColor: 'rgba(139, 92, 246, 1)',
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        tension: 0.4,
        pointBackgroundColor: 'rgba(139, 92, 246, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
      }
    ]
  };

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 12,
        titleFont: { size: 14, family: "'Inter', sans-serif" },
        bodyFont: { size: 14, family: "'Inter', sans-serif" },
        cornerRadius: 8,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: 0 },
        grid: {
          color: 'rgba(0,0,0,0.05)',
        }
      },
      x: {
        grid: {
          display: false,
        }
      }
    }
  };

  return (
    <div className="space-y-6 mt-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-heading font-bold text-text-primary dark:text-gray-100">Statistik Visual</h2>
        
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-text-secondary dark:text-gray-400">Filter Grafik:</label>
          <select
            value={selectedPeriodeId}
            onChange={handlePeriodeChange}
            className="px-4 py-2 rounded-xl border border-primary-light/30 dark:border-gray-700 text-sm outline-none bg-white dark:bg-gray-900 font-bold text-primary focus:border-primary shadow-sm"
          >
            {periodes.map(p => (
              <option key={p.id} value={p.id}>{p.nama}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Chart 1 */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-primary-light/20 dark:border-gray-700 flex flex-col h-[400px]">
          <h3 className="font-heading font-bold text-text-primary dark:text-gray-100 text-lg mb-1">Sebaran Camaba per Gelombang</h3>
          <p className="text-sm text-text-secondary dark:text-gray-400 mb-6 font-medium">Periode {selectedPeriodeName}</p>
          <div className="flex-1 relative">
            <Bar data={barChartData} options={commonOptions} />
          </div>
        </div>

        {/* Chart 2 */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-primary-light/20 dark:border-gray-700 flex flex-col h-[400px]">
          <h3 className="font-heading font-bold text-text-primary dark:text-gray-100 text-lg mb-1">Tren Pendaftaran Global</h3>
          <p className="text-sm text-text-secondary dark:text-gray-400 mb-6 font-medium">Semua Periode Pendaftaran</p>
          <div className="flex-1 relative">
            <Line data={lineChartData} options={commonOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}
