import React from 'react'
import { motion } from 'framer-motion'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js'
import { Line, Pie } from 'react-chartjs-2'
import PortfolioSummary from './PortfolioSummary'
import PositionsList from './PositionsList'
import '../styles/Portfolio.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

const Portfolio = ({ data }) => {
  const { totalValue, currency, positions, performance } = data

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: 'easeOut'
      }
    }
  }

  // Pie chart data for portfolio allocation
  const pieChartData = {
    labels: positions.map(pos => pos.symbol),
    datasets: [
      {
        data: positions.map(pos => pos.value),
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }
    ]
  }

  // Mock performance data for line chart
  const performanceData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    datasets: [
      {
        label: 'Portfolio Value (EUR)',
        data: [12000, 13200, 12800, 14500, totalValue],
        borderColor: '#36A2EB',
        backgroundColor: 'rgba(54, 162, 235, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top'
      },
      title: {
        display: true,
        text: 'Portfolio Performance'
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: function(value) {
            return '€' + value.toLocaleString()
          }
        }
      }
    }
  }

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right'
      },
      title: {
        display: true,
        text: 'Portfolio Allocation'
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.parsed
            const total = context.dataset.data.reduce((a, b) => a + b, 0)
            const percentage = ((value / total) * 100).toFixed(1)
            return `${context.label}: €${value.toLocaleString()} (${percentage}%)`
          }
        }
      }
    }
  }

  return (
    <motion.div
      className="row"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Portfolio Summary */}
      <motion.div className="col-12 mb-4" variants={itemVariants}>
        <PortfolioSummary
          totalValue={totalValue}
          currency={currency}
          performance={performance}
        />
      </motion.div>

      {/* Charts Row */}
      <motion.div className="col-lg-8 mb-4" variants={itemVariants}>
        <div className="card chart-card h-100">
          <div className="card-header">
            <h5 className="card-title mb-0">Portfolio Performance</h5>
          </div>
          <div className="card-body chart-container">
            <Line data={performanceData} options={chartOptions} />
          </div>
        </div>
      </motion.div>

      <motion.div className="col-lg-4 mb-4" variants={itemVariants}>
        <div className="card chart-card h-100">
          <div className="card-header">
            <h5 className="card-title mb-0">Allocation</h5>
          </div>
          <div className="card-body chart-container">
            <Pie data={pieChartData} options={pieOptions} />
          </div>
        </div>
      </motion.div>

      {/* Positions List */}
      <motion.div className="col-12" variants={itemVariants}>
        <PositionsList positions={positions} />
      </motion.div>
    </motion.div>
  )
}

export default Portfolio
