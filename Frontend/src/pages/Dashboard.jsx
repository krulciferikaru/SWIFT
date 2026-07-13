import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import subscriberApi from '../api/subscribers'
import api from '../api/axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Users2,
  ClipboardCheck,
  Wifi,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

const STATUS_COLORS = {
  Active: '#305CDE',
  Unpaid: '#f59e0b',
  Disconnected: '#9ca3af',
}

function daysAgo(dateString) {
  const diff = Date.now() - new Date(dateString).getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

export default function Dashboard() {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [pendingList, setPendingList] = useState([])
  const [unpaidList, setUnpaidList] = useState([])
  const [loading, setLoading] = useState(true)

  const isStaff = user?.role === 'admin' || user?.role === 'secretary'

  useEffect(() => {
    if (!isStaff) {
      setLoading(false)
      return
    }
    Promise.all([
      subscriberApi.getSummary(),
      api.get('/subscribers/pending'),
      subscriberApi.getAll({ status: 'Unpaid', per_page: 5 }),
    ])
      .then(([summaryRes, pendingRes, unpaidRes]) => {
        setSummary(summaryRes.data.data)
        setPendingList(pendingRes.data ?? [])
        const unpaidData = unpaidRes.data.data
        setUnpaidList(Array.isArray(unpaidData) ? unpaidData : (unpaidData?.data ?? []))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isStaff])

  const chartData = summary
    ? [
        { name: 'Active', value: summary.active },
        { name: 'Unpaid', value: summary.unpaid },
        { name: 'Disconnected', value: summary.disconnected },
      ].filter((d) => d.value > 0)
    : []

  const oldestPendingDays = pendingList.length > 0
    ? Math.max(...pendingList.map((p) => daysAgo(p.created_at)))
    : 0

  const needsAttention = (summary?.pending > 0) || (summary?.unpaid > 0)

  if (!isStaff) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Welcome, {user?.name}. Your account dashboard is coming soon.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-24 w-full rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6 space-y-3">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-1">
            <CardContent className="pt-6">
              <Skeleton className="h-55 w-full rounded-full mx-auto max-w-55" />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-md" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="text-center py-16 text-sm text-gray-400 dark:text-gray-500">
        Unable to load dashboard data.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Jubal Brothers Cable TV Corporation — Palayan Branch
          </p>
        </div>
      </div>

      {/* Needs Attention — decision-oriented, not just descriptive */}
      {needsAttention && (
        <Card className="border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-800 dark:text-amber-400">
              <AlertTriangle className="size-4" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {summary.pending > 0 && (
              <Link
                to="/approvals"
                className="flex items-center justify-between p-3 rounded-md bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-900 hover:border-amber-400 dark:hover:border-amber-700 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {summary.pending} application{summary.pending === 1 ? '' : 's'} awaiting approval
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {oldestPendingDays > 0
                      ? `Oldest submitted ${oldestPendingDays} day${oldestPendingDays === 1 ? '' : 's'} ago`
                      : 'Submitted today'}
                  </p>
                </div>
                <ArrowRight className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
              </Link>
            )}

            {summary.unpaid > 0 && (
              <Link
                to="/subscribers"
                className="flex items-center justify-between p-3 rounded-md bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-900 hover:border-amber-400 dark:hover:border-amber-700 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {summary.unpaid} subscriber{summary.unpaid === 1 ? '' : 's'} marked Unpaid
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {unpaidList.length > 0
                      ? unpaidList.slice(0, 2).map((s) => s.name).join(', ') + (summary.unpaid > 2 ? ', …' : '')
                      : 'Review status and follow up'}
                  </p>
                </div>
                <ArrowRight className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/subscribers">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Users2 className="size-5 text-primary" />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Subscribers</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{summary.total}</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/approvals">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <ClipboardCheck className="size-5 text-amber-500" />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pending Approvals</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{summary.pending}</p>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="size-5 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Active</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{summary.active}</p>
          </CardContent>
        </Card>

        <Link to="/subscribers">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Wifi className="size-5 text-gray-400" />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Unpaid</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{summary.unpaid}</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Status breakdown + quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Subscriber Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button asChild variant="outline" className="justify-start h-auto py-4">
              <Link to="/subscribers">
                <div className="text-left">
                  <p className="font-medium">Manage Subscribers</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-normal">View, add, or edit subscriber records</p>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start h-auto py-4">
              <Link to="/approvals">
                <div className="text-left">
                  <p className="font-medium">Review Approvals</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                    {summary.pending > 0 ? `${summary.pending} application${summary.pending === 1 ? '' : 's'} waiting` : 'No pending applications'}
                  </p>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start h-auto py-4">
              <Link to="/plans">
                <div className="text-left">
                  <p className="font-medium">Service Plans</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-normal">Manage available plans and pricing</p>
                </div>
              </Link>
            </Button>
            {user?.role === 'admin' && (
              <Button asChild variant="outline" className="justify-start h-auto py-4">
                <Link to="/users">
                  <div className="text-left">
                    <p className="font-medium">Manage Roles</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-normal">Control staff account access</p>
                  </div>
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/*
        FUTURE ENHANCEMENT (requires a Payments table + PaymentController):
        - Days-since-last-payment / aging balance per subscriber
        - Revenue trend (this month vs. last month)
        - Churn risk signals (e.g. Unpaid for N+ days without resolution)
        These need real billing history data that doesn't exist in the schema yet.
        Worth raising with your adviser as the next dashboard iteration once
        the Payments feature is built.
      */}
    </div>
  )
}