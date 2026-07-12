import Sidebar from './Sidebar.jsx'

export default function Layout({ children }) {
  return (
    <div>
      <Sidebar />
      <main className="ml-60 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        {children}
      </main>
    </div>
  )
}